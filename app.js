import { home } from './pages/home.js';

const app = document.getElementById('app');

// 1. Render the app
app.innerHTML = home();

// CSS background images to preload (add your own here)
const BACKGROUND_IMAGES = [
    './assets/images/banner.png',
];

// 2. Wait for everything to be ready
async function waitForReady() {
    // Fonts (usually covers CSS too)
    await document.fonts.ready;

    // <img> tags
    const images = [...document.querySelectorAll('img')];
    await Promise.all(
        images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        })
    );

    // CSS background images
    await Promise.all(
        BACKGROUND_IMAGES.map(src => new Promise(resolve => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = src;
        }))
    );

    // Two frames — process + paint
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
}

// 3. Safety net — never wait more than 10 seconds
const MAX_WAIT = 10000;
const timeout = new Promise(r => setTimeout(r, MAX_WAIT));

// 4. Race — whichever finishes first
Promise.race([waitForReady(), timeout]).then(() => {
    document.getElementById('loader')?.classList.add('loader-hidden');
    app.classList.add('app-ready');

    // Remove loader from DOM after fade
    setTimeout(() => {
        document.getElementById('loader')?.remove();
    }, 500);
});