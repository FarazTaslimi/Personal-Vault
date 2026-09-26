// ============================================================
// 🎧 PLAYER COMPONENT — floating music player
// ============================================================
// Renders the player UI, binds all controls, and manages:
//   - drag-to-move (position persists in sessionStorage)
//   - click + drag seek
//   - play/pause / prev / next
//   - minimize into a floating circle
//   - close (removes the player + mini button + stops audio)

import {
    getSongs, getState, subscribe,
    playSong, togglePlay, seekTo,
    playNext, playPrev, stopAudio
} from '../api/songs.js';
import { toggleSongState, clearSongState, updateAllCardState } from '../components/song-card.js';
import { icons } from '../js/icons.js';
import { loadCSS } from '../js/loadCSS.js';

loadCSS('/components/player.css');

export function player() {

    // setTimeout(0) lets the returned HTML actually reach the DOM
    // before we start querying elements inside it.
    setTimeout(() => {
        const playerUI = document.querySelector('.player');
        if (!playerUI) return;

        // ---------- Cached element references ----------
        const titleEl      = playerUI.querySelector('.player--bar_title');
        const artistEl     = playerUI.querySelector('.player_artist');
        const progressBar  = playerUI.querySelector('.progress_bar');
        const progressFill = playerUI.querySelector('.progress_bar--filled');
        const timeElapsed  = playerUI.querySelector('.time_elapsed');
        const timeTotal    = playerUI.querySelector('.time_total');
        const dragHandle   = playerUI.querySelector('.player--bar');

        // rAF id stored so we can cancel the progress loop on close.
        let rafId = null;


        // ============================================================
        // 🟣 MINI FLOATING BUTTON — the shrunk version of the player
        // ============================================================
        const miniBtn = document.createElement('div');
        miniBtn.className = 'player-mini';
        miniBtn.innerHTML = '<i data-lucide="play"></i>';
        document.body.appendChild(miniBtn);
        icons();


        // ============================================================
        // 💾 RESTORE POSITION — reload saved drag position on open
        // ============================================================
        const savedPos = sessionStorage.getItem('playerPosition');
        if (savedPos) {
            try {
                const { x, y } = JSON.parse(savedPos);
                playerUI.style.left   = `${x}px`;
                playerUI.style.top    = `${y}px`;
                playerUI.style.right  = 'auto';
                playerUI.style.bottom = 'auto';
            } catch {}
        }


        // ============================================================
        // 🖐️ DRAGGING — move the player around by its top bar
        // ============================================================
        let isDraggingPlayer = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        dragHandle.addEventListener('pointerdown', (e) => {
            // Ignore drags that start on the bar's buttons (minimize/close).
            if (e.target.closest('.player--bar_buttons')) return;

            isDraggingPlayer = true;
            const rect = playerUI.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            dragHandle.setPointerCapture(e.pointerId);
            playerUI.classList.add('player--dragging');
        });

        dragHandle.addEventListener('pointermove', (e) => {
            if (!isDraggingPlayer) return;
            playerUI.style.left   = `${e.clientX - dragOffsetX}px`;
            playerUI.style.top    = `${e.clientY - dragOffsetY}px`;
            playerUI.style.right  = 'auto';
            playerUI.style.bottom = 'auto';
        });

        dragHandle.addEventListener('pointerup', (e) => {
            if (!isDraggingPlayer) return;
            isDraggingPlayer = false;
            dragHandle.releasePointerCapture(e.pointerId);
            playerUI.classList.remove('player--dragging');

            // Save new position so the player re-opens where you left it.
            const rect = playerUI.getBoundingClientRect();
            sessionStorage.setItem('playerPosition', JSON.stringify({
                x: rect.left,
                y: rect.top
            }));
        });


        // ============================================================
        // 🎨 RENDER — updates the UI whenever the engine state changes
        // ============================================================
        function render(state) {
            if (!state.currentSongId) return;
            const song = getSongs().find(s => s.id === state.currentSongId);
            if (!song) return;

            // Cover art is set as a CSS background-image on the player.
            playerUI.style.backgroundImage = `url('${song.cover}')`;

            if (titleEl)  titleEl.textContent  = song.title;
            if (artistEl) artistEl.textContent = song.artist;

            const iconName = state.isPlaying ? 'pause' : 'play';

            // ---- Main toggle icon ----
            // Lucide replaces <i> with <svg>, so we can't just set textContent.
            // Build a fresh <i> only when the icon name actually changed.
            const old = playerUI.querySelector('.Toggle_PlayPause');
            if (old && old.getAttribute('data-lucide') !== iconName) {
                const fresh = document.createElement('i');
                fresh.setAttribute('data-lucide', iconName);
                fresh.className = 'filled-icon Toggle_PlayPause';
                old.replaceWith(fresh);
                icons();
            }

            // ---- Mini button icon ----
            if (miniBtn.dataset.icon !== iconName) {
                miniBtn.dataset.icon = iconName;
                miniBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
                icons();
            }
        }


        // ============================================================
        // ⏱️ TIME FORMATTING + PROGRESS LOOP
        // ============================================================
        function formatTime(sec) {
            if (!sec || isNaN(sec)) return '0:00';
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return `${m}:${String(s).padStart(2, '0')}`;
        }

        // rAF loop instead of timeupdate — timeupdate fires ~4x/sec,
        // which makes the progress bar stutter.
        function progressLoop() {
            const state = getState();
            if (state.duration > 0 && progressFill && timeElapsed) {
                const ratio = state.currentTime / state.duration;
                progressFill.style.width = `${ratio * 100}%`;
                timeElapsed.textContent = formatTime(state.currentTime);
                if (timeTotal) timeTotal.textContent = formatTime(state.duration);
            }
            rafId = requestAnimationFrame(progressLoop);
        }


        // ============================================================
        // 🎯 SEEK — click anywhere on the bar OR drag the thumb
        // ============================================================
        let isDraggingSeek = false;

        function seekFromEvent(e) {
            const rect = progressBar.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const duration = getState().duration;
            if (duration) seekTo(ratio * duration);
        }

        progressBar.addEventListener('click', seekFromEvent);

        progressBar.addEventListener('pointerdown', (e) => {
            isDraggingSeek = true;
            progressBar.setPointerCapture(e.pointerId);
            seekFromEvent(e);
        });

        progressBar.addEventListener('pointermove', (e) => {
            if (!isDraggingSeek) return;
            seekFromEvent(e);
        });

        progressBar.addEventListener('pointerup', (e) => {
            isDraggingSeek = false;
            progressBar.releasePointerCapture(e.pointerId);
        });


        // ============================================================
        // 🪟 MINIMIZE / EXPAND
        // ============================================================
        function minimizePlayer() {
            const rect = playerUI.getBoundingClientRect();
            // (kept for reference — mini button position is now fixed in CSS)
            // miniBtn.style.right  = `${window.innerWidth - rect.right}px`;
            // miniBtn.style.bottom = `${window.innerHeight - rect.bottom}px`;
            // miniBtn.style.left = 'auto';
            // miniBtn.style.top = 'auto';

            playerUI.classList.add('player--minimized');
            miniBtn.classList.add('player-mini--visible');
        }

        function expandPlayer() {
            miniBtn.classList.remove('player-mini--visible');
            playerUI.classList.remove('player--minimized');
        }

        miniBtn.addEventListener('click', expandPlayer);


        // ============================================================
        // 🖱️ DELEGATED CLICK HANDLER — all player buttons
        // ============================================================
        // Attached to the container (never replaced), so it survives
        // every icons() swap that rebuilds the inner <svg> nodes.
        playerUI.addEventListener('click', (e) => {
            // ---- Play / pause ----
            if (e.target.closest('.bg_control')) {
                const state = getState();
                if (!state.currentSongId) return;
                togglePlay();
                toggleSongState(state.currentSongId);   // keep cards in sync
                updateAllCardState();
                return;
            }

            // ---- Previous ----
            if (e.target.closest('.Player_Prev')) {
                playPrev();
                const state = getState();
                clearSongState();
                if (state.currentSongId) toggleSongState(state.currentSongId);
                updateAllCardState();
                return;
            }

            // ---- Next ----
            if (e.target.closest('.Player_Next')) {
                playNext();
                const state = getState();
                clearSongState();
                if (state.currentSongId) toggleSongState(state.currentSongId);
                updateAllCardState();
                return;
            }

            // ---- Minimize ----
            if (e.target.closest('.Player_Minimize')) {
                minimizePlayer();
                return;
            }

            // ---- Close ----
            if (e.target.closest('.Player_Close')) {
                // 1. Stop the progress loop
                if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                // 2. Unsubscribe from engine events
                if (typeof unsubscribe === 'function') unsubscribe();
                // 3. Stop audio + clear engine state
                stopAudio();
                // 4. Reset card visuals
                clearSongState();
                updateAllCardState();
                // 5. Remove player + mini button from DOM
                miniBtn.remove();
                playerUI.remove();
                return;
            }
        });


        // ============================================================
        // 🚀 INIT
        // ============================================================
        const unsubscribe = subscribe(render);

        render(getState());   // run once immediately (subscribe alone doesn't)
        progressLoop();

        icons();              // render all lucide icons in the HTML
    }, 0);


    // ============================================================
    // 📄 HTML — structure of the player component
    // ============================================================
    return `
        <div class="player">
            <div class="player--bar">
                <span class="player--bar_title"></span>
                <div class="player--bar_buttons">
                    <i data-lucide="picture-in-picture" class="Player_Minimize"></i>
                    <i data-lucide="x" class="Player_Close"></i>
                </div>
            </div>

            <span class="player_artist"></span>

            <div class="player--main">
                <div class="player--main--FlexHidden"></div>

                <div class="player--main--controls">
                    <div class="controls_main">
                        <i data-lucide="rewind" class="filled-icon Previous_Next Player_Prev"></i>
                        <span class="bg_control"><i data-lucide="play" class="filled-icon Toggle_PlayPause"></i></span>
                        <i data-lucide="fast-forward" class="filled-icon Previous_Next Player_Next"></i>
                    </div>
                    <i data-lucide="repeat" class="Toggle_Repeat"></i>
                </div>

                <div class="player--main--progress">
                    <div class="progress_bar">
                        <div class="progress_bar--filled">
                            <span class="progress_bar--thumb"></span>
                        </div>
                    </div>
                    <div class="duration">
                        <span class="time_elapsed">0:00</span>
                        <span class="time_total">0:00</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
