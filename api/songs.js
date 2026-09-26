// ============================================================
// 📦 DATA LAYER — loads vault.json once and provides access
// ============================================================

// Top-level await: this module runs ONCE when first imported.
// After it finishes, `data` holds the songs array for the app's lifetime.
// No need to re-fetch on every call — the JSON never changes at runtime.
const response = await fetch('/data/vault.json');
const vault = await response.json();
const data = vault.songs;

// Returns a COPY of the songs, sorted by plays (highest first).
// The spread ([...data]) is intentional — we don't want callers
// mutating the original array when they sort/filter their copy.
export function getSongs() {
    return [...data].sort((a, b) => b.plays - a.plays);
}

// Sends an updated play count to the server AND keeps the local
// in-memory `data` in sync. Without the local update, the popup
// would show stale counts after a card is clicked.
export async function updateSongs(id, plays) {
    const res = await fetch('/api/updateSongs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, plays })
    });
    if (!res.ok) throw new Error('Failed to update play count');

    const song = data.find(s => s.id === id);
    if (song) song.plays = plays;

    return res.json();
}


// ============================================================
// 🎵 AUDIO ENGINE — the actual <audio> element and its state
// ============================================================

// One shared audio element for the whole app. Creating it at module
// level (not inside a function) means every call to playSong reuses
// the same element instead of spawning a new one each time.
const audio = new Audio();

// 'metadata' = load just enough to know duration, but not the whole
// file. Faster startup, less bandwidth. The browser fetches more
// bytes automatically when playback starts.
audio.preload = 'metadata';

// The song currently loaded. null = nothing selected yet.
let currentSongId = null;

// Set to true the moment a song finishes. Reset the next time play/pause
// happens. Lets subscribers know "the song just ended" vs "user paused."
let lastEnded = false;


// ============================================================
// 📊 STATE — read-only snapshot of the engine, used by the UI
// ============================================================

export function getState() {
    return {
        currentSongId,
        // Both checks needed: audio.paused is true after a song ends,
        // so we also check audio.ended to distinguish "paused" from "finished".
        isPlaying: !audio.paused && !audio.ended,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
        ended: lastEnded
    };
}


// ============================================================
// 📡 SUBSCRIBERS — the engine's broadcast system
// ============================================================

// Any module that wants to react to engine changes calls subscribe(fn).
// We store all of them here and run them whenever emit() fires.
const listeners = new Set();

// Returns an "unsubscribe" function so callers can stop listening
// (important for the player UI, which is created/destroyed on demand).
export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// Called internally whenever the engine state changes.
// Fans out the current state to every subscriber.
function emit() {
    const state = getState();
    listeners.forEach(fn => fn(state));
}


// ============================================================
// ▶️ PLAYBACK CONTROLS
// ============================================================

export function playSong(id) {
    // Same song clicked again → behave like a play/pause toggle.
    // This is why clicking a playing song pauses it, and clicking
    // a paused song resumes it.
    if (id === currentSongId) {
        togglePlay();
        return;
    }

    const song = getSongs().find(song => song.id === id);
    if (!song) return;

    audio.src = song.src;
    lastEnded = false;
    currentSongId = id;

    // play() returns a Promise — catching it prevents an "uncaught
    // promise rejection" error if the file is missing or autoplay
    // is blocked by the browser.
    audio.play().catch(err => console.error('Playback failed:', err));
}

export function togglePlay() {
    if (!currentSongId) return;

    // Special case: if the song has ALREADY ended, play() alone would
    // do nothing useful (audio.currentTime is at the end). We reset
    // to 0 first, so clicking a finished song restarts it.
    if (audio.ended) {
        audio.currentTime = 0;
        lastEnded = false;
        audio.play().catch(err => console.error('Playback failed:', err));
        return;
    }

    if (audio.paused) {
        audio.play().catch(err => console.error('Playback failed:', err));
    } else {
        audio.pause();
    }
}

// Jumps to a specific second in the current song.
// Clamped so values outside [0, duration] don't break anything.
export function seekTo(seconds) {
    if (!audio.duration) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
}


// ============================================================
// ⏮️ NEXT / PREVIOUS — cycle through the songs list
// ============================================================

export function playNext() {
    const songs = getSongs();
    if (!songs.length || !currentSongId) return;

    const idx = songs.findIndex(s => s.id === currentSongId);
    // Modulo makes it wrap: last song → first song.
    const next = songs[(idx + 1) % songs.length];
    playSong(next.id);
}

export function playPrev() {
    const songs = getSongs();
    if (!songs.length || !currentSongId) return;

    const idx = songs.findIndex(s => s.id === currentSongId);
    // + songs.length keeps the value positive when idx is 0.
    const prev = songs[(idx - 1 + songs.length) % songs.length];
    playSong(prev.id);
}


// ============================================================
// ⏹️ STOP — used when the player is closed
// ============================================================

export function stopAudio() {
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';           // release the file handle
    currentSongId = null;
    lastEnded = false;
    emit();                   // tell subscribers the engine is now empty
}


// ============================================================
// 🔔 AUDIO EVENT LISTENERS — bridge browser events to emit()
// ============================================================
// These fire when the AUDIO ELEMENT itself changes state,
// not when we call playSong/togglePlay. So they catch things
// like: song ending naturally, browser pausing, metadata loading.

audio.addEventListener('play', () => {
    lastEnded = false;
    emit();
});

audio.addEventListener('pause', emit);

audio.addEventListener('ended', () => {
    lastEnded = true;
    emit();
});

// Fires once the browser knows the duration. Needed so the progress
// bar can calculate percentage from the very first frame.
audio.addEventListener('loadedmetadata', emit);
