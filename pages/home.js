// import { update } from '../js/update.js';
import { icons } from '../js/icons.js';
import { mini_card, song_card } from '../js/components.js';
import { getSongs, updateSongs } from '../api/songs.js';
import { update } from '../js/update.js';

export function home() {
    const header = function() {
        let date = new Date();
        const time = () => {return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;};

        const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000 - new Date().getMilliseconds();

        setTimeout(() => {
            update(() => {
                const timeEl = document.querySelector('.header-timer--time');
                if (!timeEl) return;
                const now = new Date();
                timeEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            }, 60000);  // ← every 60 seconds after the first sync
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

    const hero = function() {
        const timeRange = () => {
            const hour = new Date().getHours();
            let time_range = "";

            if (hour >= 5 && hour <= 11) {time_range = "morning";}
            else if (hour >= 12 && hour <= 16) {time_range = "afternoon";}
            else if (hour >= 17 && hour <= 21) {time_range = "evening";}
            else if (hour >= 22 || hour <= 4) {time_range = "night";}

            return `${time_range}`;
        };

        return (
        `<div class="hero">
            <img src="./assets/images/banner.png" class="hero--background">

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

    const topSongsSection = function() {
        const songs = getSongs();
        let songcards = "";
        
        for (let i = 0; i < songs.length; i++) {
            songcards += `${song_card(songs[i].id, songs[i].cover, songs[i].title, songs[i].artist, i+1, songs[i].plays)}`;
        }

        setTimeout(() => {
            const container = document.querySelector('.top-songs-section--content');
            const nav = document.querySelector('.top-songs-section--header--nav');
            const leftBtn = document.getElementById('top-songs-section--header--nav--btn_left');
            const rightBtn = document.getElementById('top-songs-section--header--nav--btn_right');
        
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
        
            // Update disabled state
            const updateArrows = () => {
                const atStart = container.scrollLeft <= 0;
                const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
                leftBtn.classList.toggle('disabled', atStart);
                rightBtn.classList.toggle('disabled', atEnd);
            };
        
            // Listen to scroll + size changes
            container.addEventListener('scroll', updateArrows);
            window.addEventListener('resize', updateArrows);
        
            // 🔥 Re-run when container size changes (CSS load, content change)
            const ro = new ResizeObserver(updateArrows);
            ro.observe(container);
        
            // Run multiple times to catch late layout
            updateArrows();
            requestAnimationFrame(updateArrows);
            setTimeout(updateArrows, 100);
            setTimeout(updateArrows, 500);
        }, 100);

        document.addEventListener('icons:refresh', () => {icons();});

        setTimeout(() => {
            const container = document.querySelector('.top-songs-section--content');
            if (!container) return;
        
            // Capture state before click toggles the card
            container.addEventListener('mousedown', (e) => {
                const card = e.target.closest('.song_card');
                if (!card) return;
                const isActive =
                    card.classList.contains('playing') ||
                    card.classList.contains('paused');
                container.dataset.wasActive = isActive ? 'true' : 'false';
            });
        
            // Handle play increment
            container.addEventListener('click', async (e) => {
                const card = e.target.closest('.song_card');
                if (!card) return;
        
                // Skip if card was already playing/paused
                if (container.dataset.wasActive === 'true') return;
        
                const id = parseInt(card.dataset.id);
                const currentPlays = parseInt(card.dataset.plays);
                const newPlays = currentPlays + 1;
        
                // 🔥 Immediate UI update via update()
                update(() => {
                    card.dataset.plays = newPlays;
                    const span = card.querySelector('.song_card--controls--totalPlays');
                    if (span) span.textContent = `${newPlays} plays`;
                });
        
                // Server write in background
                try {
                    await updateSongs(id, newPlays);
                } catch (err) {
                    console.error('Failed to save play count:', err);
                    // Rollback using update() too
                    update(() => {
                        card.dataset.plays = currentPlays;
                        const span = card.querySelector('.song_card--controls--total-plays');
                        if (span) span.textContent = `${currentPlays} plays`;
                    });
                }
            });
        }, 100);

        return (
        `<div class="top-songs-section">
            <div class="top-songs-section--header">
                <span class="section--title">top songs</span>
                <div class="top-songs-section--header--nav">
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

    icons();
    return `${header()}${hero()}${topSongsSection()}`;
}