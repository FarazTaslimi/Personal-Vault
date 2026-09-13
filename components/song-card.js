import { loadCSS } from '../js/loadCSS.js';
loadCSS("/components/song-card.css");

let listenerAttached = false;

export function song_card(cover, title, artist, rank, plays) {
    if (!listenerAttached) {
        listenerAttached = true;

        setTimeout(() => {
            document.addEventListener('click', (e) => {
                const card = e.target.closest('.song_card');
                if (!card) return;

                const wasPlaying = card.classList.contains('playing');

                document.querySelectorAll('.song_card').forEach(c => {
                    c.classList.remove('playing', 'paused');
                });

                if (wasPlaying) {
                    card.classList.add('paused');
                } else {
                    card.classList.add('playing');
                }

                // Swap icons
                document.querySelectorAll('.song_card').forEach(c => {
                    const iconName = c.classList.contains('playing') ? 'pause' : 'play';
                    const old = c.querySelector('.song_card--controls--playpauseBTN');
                    if (!old) return;

                    const fresh = document.createElement('i');
                    fresh.setAttribute('data-lucide', iconName);
                    fresh.className = 'song_card--controls--playpauseBTN';
                    old.replaceWith(fresh);
                });

                // 🔥 Announce: "icons need re-rendering"
                document.dispatchEvent(new CustomEvent('icons:refresh'));
            });
        }, 0);
    }

    return (
    `<div class="song_card">
        <div class="song_card--cover">
            <span class="song_card--cover--rank">#${rank}</span>
            <img class="song_card--cover-img" src="${cover}">
        </div>
        <div class="song_card--info">
            <span class="song_card--info--title">${title}</span>
            <span class="song_card--info--artist">${artist}</span>
        </div>
        <div class="song_card--controls">
            <i data-lucide="play" class="song_card--controls--playpauseBTN"></i>
            <span class="song_card--controls--totalPlays">${plays} plays</span>
        </div>
     </div>`
    );
}