// ============================================================
// 🎵 SONG CARD COMPONENT
// ============================================================
// Two responsibilities:
//   1. Render one song card (cover, title, artist, play count).
//   2. Track the "currently active" card state so it stays in
//      sync across the main section AND the popup.

import { loadCSS } from '../js/loadCSS.js';
import { subscribe } from '../api/songs.js';

loadCSS("/components/song-card.css");


// ============================================================
// 🎯 SHARED STATE — which song is currently playing / paused
// ============================================================
// This is the *visual* state for the cards (playing border, icon, etc.).
// The audio engine has its own state in songs.js — these two must be
// kept in sync by whoever triggers playback.

let currentSongId = null;
let currentState  = null;   // 'playing' | 'paused' | null

export function getCurrentSongState() {
    return { id: currentSongId, state: currentState };
}

// Toggles the state for a given song id:
//   - same id + playing → paused
//   - same id + paused  → playing
//   - different id      → switch to that song, state 'playing'
export function toggleSongState(id) {
    if (currentSongId === id) {
        if (currentState === 'playing') {
            currentState = 'paused';
        } else {
            currentState = 'playing';
        }
    } else {
        currentSongId = id;
        currentState  = 'playing';
    }
    return currentState;
}

export function clearSongState() {
    currentSongId = null;
    currentState  = null;
}


// ============================================================
// 🎨 RENDER — one song card
// ============================================================
// Pure function: takes song data, returns an HTML string.
// No listeners attached here — click handling is done via
// event delegation in home.js so it works in the popup too.
export function song_card(id, cover, title, artist, rank, plays) {
    return `
        <div class="song_card" data-id="${id}" data-plays="${plays}">
            <div class="song_card--cover">
                <span class="song_card--cover--rank">#${rank}</span>
                <img class="song_card--cover-img" src="${cover}" alt="${title}">
            </div>
            <div class="song_card--info">
                <span class="song_card--info--title">${title}</span>
                <span class="song_card--info--artist">${artist}</span>
            </div>
            <div class="song_card--controls">
                <i data-lucide="play" class="song_card--controls--playpauseBTN"></i>
                <span class="song_card--controls--totalPlays">${plays} plays</span>
            </div>
        </div>
    `;
}


// ============================================================
// 🔄 UPDATE ALL CARDS — plays count
// ============================================================
// Updates every card with the matching id (main section + popup).
// This is how the play count stays consistent across both views.
export function updateAllSongCards(id, plays) {
    document.querySelectorAll(`.song_card[data-id="${id}"]`).forEach(card => {
        card.dataset.plays = plays;
        const span = card.querySelector('.song_card--controls--totalPlays');
        if (span) span.textContent = `${plays} plays`;
    });
}


// ============================================================
// 🔄 UPDATE ALL CARDS — visual state
// ============================================================
// Syncs every card's border/icon to match the shared state.
// Called after any state change (play/pause/next/prev/close).
export function updateAllCardState() {
    // 1. Wipe state classes from all cards
    document.querySelectorAll('.song_card').forEach(card => {
        card.classList.remove('playing', 'paused');
    });

    // 2. Re-apply the state class to the matching card(s)
    if (currentSongId !== null && currentState !== null) {
        document.querySelectorAll(`.song_card[data-id="${currentSongId}"]`).forEach(card => {
            card.classList.add(currentState);
        });
    }

    // 3. Swap the play/pause icon on every card
    // Lucide replaces <i> with <svg>, so we rebuild the icon when needed.
    document.querySelectorAll('.song_card').forEach(card => {
        const isPlaying = card.classList.contains('playing');
        const iconName  = isPlaying ? 'pause' : 'play';
        const old = card.querySelector('.song_card--controls--playpauseBTN');
        if (!old) return;

        // Skip if it's already the correct icon
        if (old.getAttribute('data-lucide') === iconName) return;

        const fresh = document.createElement('i');
        fresh.setAttribute('data-lucide', iconName);
        fresh.className = 'song_card--controls--playpauseBTN';
        old.replaceWith(fresh);
    });

    // 4. Ask the global icon renderer to refresh (rebuilds <svg> from <i>)
    document.dispatchEvent(new CustomEvent('icons:refresh'));
}


// ============================================================
// 🎧 ENGINE SYNC — reset card state when a song finishes
// ============================================================
// Without this, after a song ends the card would still show
// "playing" or "paused" — and clicking it again would resume
// from the end instead of restarting from 0.
subscribe(state => {
    if (state.ended) {
        clearSongState();
        updateAllCardState();
    }
});
