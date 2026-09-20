import { home } from './pages/home.js';

const app = document.getElementById('app');

// 1. Render the app
app.innerHTML = home();

// 2. Wait for everything to be ready
async function waitForReady() {
    // Fonts (this usually waits for CSS too)
    await document.fonts.ready;

    // Images
    const images = [...document.querySelectorAll('img')];
    await Promise.all(
        images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;   // don't block on broken images
            });
        })
    );

    // Two frames — one to process DOM, one to paint
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
}

// 3. Safety net — never wait more than 5 seconds
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