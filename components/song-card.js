import { loadCSS } from '../js/loadCSS.js';
loadCSS("/components/song-card.css");

// ============================================================
// 🎵 SHARED STATE — current playing song
// ============================================================
let currentSongId = null;
let currentState = null;   // 'playing' | 'paused' | null

export function getCurrentSongState() {
    return { id: currentSongId, state: currentState };
}

export function toggleSongState(id) {
    if (currentSongId === id) {
        if (currentState === 'playing') {
            currentState = 'paused';
        } else {
            currentState = 'playing';
        }
    } else {
        currentSongId = id;
        currentState = 'playing';
    }
    return currentState;
}

export function clearSongState() {
    currentSongId = null;
    currentState = null;
}

// ============================================================
// 🎨 RENDER — one card
// ============================================================
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
// 🔄 UPDATE ALL CARDS — plays + state (main + popup)
// ============================================================
export function updateAllSongCards(id, plays) {
    document.querySelectorAll(`.song_card[data-id="${id}"]`).forEach(card => {
        card.dataset.plays = plays;
        const span = card.querySelector('.song_card--controls--totalPlays');
        if (span) span.textContent = `${plays} plays`;
    });
}

export function updateAllCardState() {
    // 1. Clear all cards
    document.querySelectorAll('.song_card').forEach(card => {
        card.classList.remove('playing', 'paused');
    });

    // 2. Apply state to matching cards
    if (currentSongId !== null && currentState !== null) {
        document.querySelectorAll(`.song_card[data-id="${currentSongId}"]`).forEach(card => {
            card.classList.add(currentState);
        });
    }

    // 3. Swap icons on all cards
    document.querySelectorAll('.song_card').forEach(card => {
        const isPlaying = card.classList.contains('playing');
        const iconName = isPlaying ? 'pause' : 'play';
        const old = card.querySelector('.song_card--controls--playpauseBTN');
        if (!old) return;

        if (old.getAttribute('data-lucide') === iconName) return;

        const fresh = document.createElement('i');
        fresh.setAttribute('data-lucide', iconName);
        fresh.className = 'song_card--controls--playpauseBTN';
        old.replaceWith(fresh);
    });

    // 4. Re-render Lucide icons
    document.dispatchEvent(new CustomEvent('icons:refresh'));
}