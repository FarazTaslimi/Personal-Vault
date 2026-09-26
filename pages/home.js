// ============================================================
// 🏠 HOME PAGE
// ============================================================
// Assembles the full home view from three sections:
//   1. header()          — title + live clock
//   2. hero()            — greeting + personal info + poem
//   3. topSongsSection() — horizontal song cards + Show All popup
//
// Returns a single HTML string that gets injected into #app.

import { icons } from '../js/icons.js';
import { mini_card, song_card } from '../js/components.js';
import { getSongs, updateSongs, playSong } from '../api/songs.js';
import {
    updateAllSongCards,
    updateAllCardState,
    toggleSongState,
    getCurrentSongState
} from '../components/song-card.js';
import { update } from '../js/update.js';
import { player } from '../components/player.js';


export function home() {

    // ============================================================
    // 📌 HEADER — logo + live clock (updates once per minute)
    // ============================================================
    const header = function() {
        let date = new Date();
        const time = () => {
            return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        };

        // Delay until the next minute boundary so the clock flips
        // exactly on time (e.g. 14:00, 14:01, 14:02…).
        const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000 - new Date().getMilliseconds();

        setTimeout(() => {
            update(() => {
                const timeEl = document.querySelector('.header-timer--time');
                if (!timeEl) return;
                const now = new Date();
                timeEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            }, 60000);
        }, msUntilNextMinute);

        return (
        `<div class="header">
            <div class="header-title">
                <i data-lucide="circle" class="filled-icon header-title--marker"></i>
                <h1 class="header-title--text">Personal Vault</h1>
            </div>
            <div class="header-timer">
                <span class="header-timer--time">${time()}</span>
                <span class="header-timer--time_zone">UTC +3:30</span>
            </div>
         </div>`
        );
    };


    // ============================================================
    // 🦸 HERO — greeting + name + mini stat cards + poem
    // ============================================================
    const hero = function() {

        // Returns "morning" / "afternoon" / "evening" / "night"
        // based on the current hour.
        const timeRange = () => {
            const hour = new Date().getHours();
            let time_range = "";

            if (hour >= 5 && hour <= 11)       { time_range = "morning"; }
            else if (hour >= 12 && hour <= 16) { time_range = "afternoon"; }
            else if (hour >= 17 && hour <= 21) { time_range = "evening"; }
            else if (hour >= 22 || hour <= 4)  { time_range = "night"; }

            return `${time_range}`;
        };

        return (
        `<div class="hero">
            <div class="hero-main">
                <div class="hero-main--personal-information">
                    <span class="hero-main--personal-information--greeting-mesage">
                        <span class="hero-main--personal-information--greeting-message--msg">Good ${timeRange()}, Faraz</span>
                        <i data-lucide="minus" class="hero-main--personal-information--greeting-message--marker"></i> 
                    </span>
                    <h2 class="hero-main--personal-information--name">Faraz</h2>
                    <span class="hero-main--personal-information--jobs">Builder. Storyteller. Developer.</span>
                    <div class="hero-main--personal-information--quick_summary">${mini_card("film", "Movies", "42")} ${mini_card("music", "Songs", "128")} ${mini_card("clock", "Hours", "156")}</div>
                </div>
            </div>
            <div class="hero-poem">
                <p class="hero-poem--content"><span class="hero-poem--content_light">some</span><br><span class="hero-poem--content_dark">stories</span><br><span class="hero-poem--content_dark">are never</span><br><span class="hero-poem--content_light">meant to be</span><br><span class="hero-poem--content_light">found</span></p>
            </div>
         </div>`
        );
    };


    // ============================================================
    // 🎵 TOP SONGS SECTION — horizontal cards + Show All popup
    // ============================================================
    const topSongsSection = function() {
        const songs = getSongs();
        let songcards = "";

        // Build the first 10 song cards (or fewer if there aren't 10).
        // The full list is only rendered when "Show All" is clicked.
        for (let i = 0; i < 10 && i < songs.length; i++) {
            songcards += `${song_card(songs[i].id, songs[i].cover, songs[i].title, songs[i].artist, i+1, songs[i].plays)}`;
        }


        // --------------------------------------------------------
        // ⬅️➡️ ARROW NAVIGATION — scroll the row left / right
        // --------------------------------------------------------
        // setTimeout(100) waits for the HTML returned by this function
        // to actually be in the DOM before querying elements.
        setTimeout(() => {
            const container = document.querySelector('.top-songs-section--content');
            const nav       = document.querySelector('.top-songs-section--header--nav');
            const leftBtn   = document.getElementById('top-songs-section--header--nav--btn_left');
            const rightBtn  = document.getElementById('top-songs-section--header--nav--btn_right');

            if (!container || !nav || !leftBtn || !rightBtn) return;

            const scrollAmount = 524;

            // Arrow clicks
            nav.addEventListener('click', (e) => {
                if (e.target.closest('#top-songs-section--header--nav--btn_left')) {
                    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                } else if (e.target.closest('#top-songs-section--header--nav--btn_right')) {
                    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                }
            });

            // Enable/disable arrows based on scroll position
            const updateArrows = () => {
                const atStart = container.scrollLeft <= 0;
                const atEnd   = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
                leftBtn.classList.toggle('disabled', atStart);
                rightBtn.classList.toggle('disabled', atEnd);
            };

            // React to scroll + resize
            container.addEventListener('scroll', updateArrows);
            window.addEventListener('resize', updateArrows);

            // 🔥 ResizeObserver catches when the container itself resizes
            // (fonts loading, images loading, layout shifts, etc.)
            const ro = new ResizeObserver(updateArrows);
            ro.observe(container);

            // Run multiple times to catch late layout changes
            updateArrows();
            requestAnimationFrame(updateArrows);
            setTimeout(updateArrows, 100);
            setTimeout(updateArrows, 500);
        }, 100);


        // --------------------------------------------------------
        // 🔄 ICON REFRESH — re-render lucide icons on demand
        // --------------------------------------------------------
        document.addEventListener('icons:refresh', () => { icons(); });


        // --------------------------------------------------------
        // 🖱️ MAIN SECTION CLICK HANDLER — click a song card
        // --------------------------------------------------------
        setTimeout(() => {
            const container = document.querySelector('.top-songs-section--content');
            if (!container) return;

            container.addEventListener('click', async (e) => {
                const card = e.target.closest('.song_card');
                if (!card) return;

                const id = parseInt(card.dataset.id);

                // Insert the player component into the page on first click.
                // The guard prevents duplicate players on repeated clicks.
                if (!document.querySelector('.player')) {
                    document.body.insertAdjacentHTML('beforeend', player());
                }

                // Hand the id to the audio engine
                playSong(id);

                // Capture state BEFORE toggling (needed for the wasActive check)
                const before    = getCurrentSongState();
                const wasActive = before.id === id && (before.state === 'playing' || before.state === 'paused');

                // Toggle state + update all cards (main + popup)
                toggleSongState(id);
                updateAllCardState();

                // If the user was pausing/resuming the same song → don't count it
                if (wasActive) return;

                // Otherwise → this is a new play, bump the count
                const currentPlays = parseInt(card.dataset.plays);
                const newPlays     = currentPlays + 1;

                update(() => {
                    updateAllSongCards(id, newPlays);
                });

                try {
                    await updateSongs(id, newPlays);
                } catch (err) {
                    console.error('Failed to save play count:', err);
                    // Roll back the optimistic UI update on failure
                    update(() => {
                        updateAllSongCards(id, currentPlays);
                    });
                }
            });
        }, 100);


        // --------------------------------------------------------
        // 📂 SHOW ALL — popup with every song
        // --------------------------------------------------------
        setTimeout(() => {
            const showAll_btn = document.querySelector('.top-songs-section--header--nav--show_all_btn');
            if (!showAll_btn) return;

            // One popup element reused across openings. It's appended to
            // <body> on click and removed on close.
            const popup = document.createElement('div');
            popup.className = 'section-popup-backdrop';

            showAll_btn.addEventListener('click', () => {

                // Build all cards fresh each time the popup opens
                let allSongcards = "";
                for (let i = 0; i < songs.length; i++) {
                    allSongcards += `${song_card(songs[i].id, songs[i].cover, songs[i].title, songs[i].artist, i+1, songs[i].plays)}`;
                }

                popup.innerHTML =
                `<div class="section-popup">
                    <div class="section-popup--header">
                        <i data-lucide="x" class="section-popup--close_btn"></i>
                    </div>
                    <div class="section-popup--content">
                        ${allSongcards}
                    </div>
                 </div>`;
                document.body.appendChild(popup);

                // Render lucide icons inside the popup
                icons();

                // Apply current playing state to popup cards
                updateAllCardState();


                // ---- Popup card clicks ----
                setTimeout(() => {
                    const container = document.querySelector('.section-popup--content');
                    if (!container) return;

                    container.addEventListener('click', async (e) => {
                        const card = e.target.closest('.song_card');
                        if (!card) return;

                        const id = parseInt(card.dataset.id);

                        // Same guard as main section — insert player if missing
                        if (!document.querySelector('.player')) {
                            document.body.insertAdjacentHTML('beforeend', player());
                        }

                        playSong(id);

                        const before    = getCurrentSongState();
                        const wasActive = before.id === id && (before.state === 'playing' || before.state === 'paused');

                        toggleSongState(id);
                        updateAllCardState();

                        // Pause/resume → don't count as a new play
                        if (wasActive) return;

                        const currentPlays = parseInt(card.dataset.plays);
                        const newPlays     = currentPlays + 1;

                        update(() => {
                            updateAllSongCards(id, newPlays);
                        });

                        try {
                            await updateSongs(id, newPlays);
                        } catch (err) {
                            console.error('Failed to save play count:', err);
                            update(() => {
                                updateAllSongCards(id, currentPlays);
                            });
                        }
                    });
                }, 0);


                // ---- Popup close — click the X button OR the backdrop ----
                setTimeout(() => {
                    const backdrop = document.querySelector('.section-popup-backdrop');
                    if (!backdrop) return;

                    backdrop.addEventListener('click', (e) => {
                        const clickedCloseBtn = e.target.closest('.section-popup--close_btn');
                        const clickedBackdrop = e.target === backdrop;

                        if (clickedCloseBtn || clickedBackdrop) {
                            backdrop.remove();
                        }
                    });
                }, 10);
            });
        }, 100);


        // --------------------------------------------------------
        // 📄 SECTION HTML
        // --------------------------------------------------------
        return (
        `<div class="top-songs-section">
            <div class="top-songs-section--header">
                <span class="section--title">top songs</span>
                <div class="top-songs-section--header--nav">
                    <span class="top-songs-section--header--nav--show_all_btn">Show All</span>
                    <i data-lucide="chevron-left" class="top-songs-section--header--nav--btn" id="top-songs-section--header--nav--btn_left"></i>
                    <i data-lucide="chevron-right" class="top-songs-section--header--nav--btn" id="top-songs-section--header--nav--btn_right"></i>
                </div>
            </div>
            <div class="top-songs-section--content">
                ${songcards}
            </div>
         </div>`
        );
    };


    // ============================================================
    // 🚀 INIT — render icons, then return the full page HTML
    // ============================================================
    icons();
    return `${header()}${hero()}${topSongsSection()}`;
}
