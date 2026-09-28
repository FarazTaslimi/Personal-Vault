const { createPlayer } = await import('avbridge');

const response = await fetch('/data/vault.json');
const vault = await response.json();
const data = vault.movies;


// ============================================================
// 📽️ DATA ACCESS
// ============================================================

export function getMovies() {
    return [...data].sort((a, b) => {
        if (a.watches !== b.watches) return a.watches - b.watches;
        return b.rating - a.rating;
    });
}

export async function updateMovies(id, watches) {
    const res = await fetch('/api/updateMovies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, watches })
    });
    if (!res.ok) throw new Error('Failed to update watches');

    const movie = data.find(m => m.id === id);
    if (movie) movie.watches = watches;

    return res.json();
}


// ============================================================
// 🎬 VIDEO ELEMENT + PLAYER STATE
// ============================================================

const video = document.createElement('video');
video.preload = 'metadata';

let currentMovieId = null;
let lastEnded = false;
let player = null;            // avbridge player instance

// Watch-time tracking state
let watchedSeconds = 0;
let countingEnabled = true;
let lastTime = 0;


// ============================================================
// 📊 STATE READ
// ============================================================

export function getMovieStates() {
    return {
        currentMovieId,
        isPlaying: !video.paused && !video.ended,
        currentTime: video.currentTime,
        duration: video.duration || 0,
        ended: lastEnded
    };
}


// ============================================================
// 📡 SUBSCRIBERS
// ============================================================

const listeners = new Set();

export function subscribe_movies(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function emit_movies() {
    const state = getMovieStates();
    listeners.forEach(fn => fn(state));
}


// ============================================================
// 💾 PROGRESS PERSISTENCE
// ============================================================

function saveProgress() {
    if (!currentMovieId) return;
    localStorage.setItem(`movie_${currentMovieId}`, JSON.stringify({
        watchedSeconds,
        position: video.currentTime,
        countingEnabled
    }));
}

function loadProgress(id) {
    const raw = localStorage.getItem(`movie_${id}`);
    if (!raw) return { watchedSeconds: 0, position: 0, countingEnabled: true };
    try {
        const saved = JSON.parse(raw);
        return {
            watchedSeconds: saved.watchedSeconds || 0,
            position: saved.position || 0,
            countingEnabled: saved.countingEnabled !== false
        };
    } catch {
        return { watchedSeconds: 0, position: 0, countingEnabled: true };
    }
}


// ============================================================
// ▶️ PLAYBACK CONTROLS
// ============================================================

export async function playMovie(id) {
    const movie = getMovies().find(m => m.id === id);
    if (!movie) return;

    // Destroy any previous player before creating a new one
    if (player) {
        try { await player.destroy(); } catch {}
        player = null;
    }

    // Load saved progress
    const saved = loadProgress(id);
    watchedSeconds = saved.watchedSeconds;
    countingEnabled = saved.countingEnabled;

    // Re-arm if the stored position is at the start
    if (!countingEnabled && saved.position <= 5 * 60) {
        countingEnabled = true;
    }

    currentMovieId = id;
    lastEnded = false;
    lastTime = 0;

    // Create the avbridge player — this handles MKV, AVI, codec detection,
    // and feeds the result into our video element.
    player = await createPlayer({
        source: movie.src,
        target: video
    });

    document.body.appendChild(video);
video.style.width = '800px';


    // Debug: log which strategy avbridge picked
    player.on('strategy', ({ strategy, reason }) => {
        console.log(`🎬 avbridge using "${strategy}": ${reason}`);
    });

    // Seek to saved position once the player is ready
    if (saved.position > 0) {
        try {
            await player.seek(saved.position);
            lastTime = saved.position;
        } catch (err) {
            console.error('Seek failed:', err);
        }
    }

    // Start playback
    try {
        await player.play();
    } catch (err) {
        console.error('Playback failed:', err);
    }
}

export async function togglePlay_movie() {
    if (!player || !currentMovieId) return;

    if (video.paused) {
        try { await player.play(); } catch (err) { console.error(err); }
    } else {
        player.pause();
    }
}

export async function seekTo_movie(seconds) {
    if (!player || !video.duration) return;
    const clamped = Math.max(0, Math.min(seconds, video.duration));
    try {
        await player.seek(clamped);
    } catch (err) {
        console.error('Seek failed:', err);
    }
}


// ============================================================
// 🎬 MOVIE COMPLETION
// ============================================================

async function onMovieCompleted(id) {
    const movie = data.find(m => m.id === id);
    if (!movie) return;

    const newWatches = (movie.watches || 0) + 1;

    try {
        await updateMovies(id, newWatches);
        console.log(`✅ Movie ${id} marked as watched (count: ${newWatches})`);
    } catch (err) {
        console.error('Failed to update watches:', err);
        countingEnabled = true;
    }
}


// ============================================================
// 🔔 VIDEO EVENT LISTENERS
// ============================================================

video.addEventListener('play', () => {
    lastTime = video.currentTime;
    emit_movies();
});

video.addEventListener('pause', () => {
    saveProgress();
    emit_movies();
});

video.addEventListener('ended', () => {
    lastEnded = true;
    saveProgress();
    emit_movies();
});

video.addEventListener('loadedmetadata', emit_movies);

video.addEventListener('timeupdate', () => {
    if (video.paused || video.ended) return;

    const delta = video.currentTime - lastTime;

    if (countingEnabled && delta > 0 && delta < 2) {
        watchedSeconds += delta;
    }

    lastTime = video.currentTime;

    if (!countingEnabled && video.currentTime <= 5 * 60) {
        countingEnabled = true;
    }

    if (Math.floor(video.currentTime) % 5 === 0) {
        saveProgress();
    }

    if (countingEnabled && video.duration > 0) {
        const threshold = Math.max(0, video.duration - 20 * 60);

        if (watchedSeconds >= threshold) {
            watchedSeconds = 0;
            countingEnabled = false;
            saveProgress();
            onMovieCompleted(currentMovieId);
        }
    }
});

video.addEventListener('seeked', () => {
    lastTime = video.currentTime;

    if (!countingEnabled && video.currentTime <= 5 * 60) {
        countingEnabled = true;
    }

    saveProgress();
});

window.addEventListener('beforeunload', saveProgress);


// ============================================================
// 🚪 CLEANUP (for the player component to call on close)
// ============================================================

export async function closeMovie() {
    if (player) {
        try { await player.destroy(); } catch {}
        player = null;
    }
    video.pause();
    video.removeAttribute('src');
    video.load();
    currentMovieId = null;
    lastEnded = false;
    emit_movies();
}
