// ==================== Data ====================

// Load vault data once when the module imports
const response = await fetch('/data/vault.json');
const vault = await response.json();
const data = vault.songs;

export function getSongs() {
    return [...data].sort((a, b) => b.plays - a.plays);
}

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

// ==================== Audio Engine ====================

const audio = new Audio();
audio.preload = 'metadata';

let currentSongId = null;
let lastEnded = false;   // true for one emit cycle after a song finishes

// ==================== State ====================

export function getState() {
    return {
        currentSongId,
        isPlaying: !audio.paused && !audio.ended,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
        ended: lastEnded
    };
}

// ==================== Subscribers ====================

const listeners = new Set();

export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function emit() {
    const state = getState();
    listeners.forEach(fn => fn(state));
}

// ==================== Playback Controls ====================

export function playSong(id) {
    // Same song clicked again → toggle play/pause
    if (id === currentSongId) {
        togglePlay();
        return;
    }

    const song = getSongs().find(song => song.id === id);
    if (!song) return;

    audio.src = song.src;
    lastEnded = false;
    currentSongId = id;
    audio.play().catch(err => console.error('Playback failed:', err));
}

export function togglePlay() {
    if (!currentSongId) return;

    // If the song already ended, restart from the beginning
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

export function seekTo(seconds) {
    if (!audio.duration) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
}

// ==================== Audio Events ====================

audio.addEventListener('play', () => {
    lastEnded = false;
    emit();
});

audio.addEventListener('pause', emit);

audio.addEventListener('ended', () => {
    lastEnded = true;
    emit();
});

audio.addEventListener('loadedmetadata', emit);