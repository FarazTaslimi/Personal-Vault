// ============================================================
// 🎴 MINI CARD — small stat card used in the hero section
// ============================================================
// Renders an icon + counter + title (e.g. "Movies / 42").
// Used inside home.js to display summary stats under the user's name.

import { loadCSS } from '../js/loadCSS.js';

// Load the matching stylesheet the first time this module runs.
loadCSS('../components/mini-card.css');

export function mini_card(icon, name, count) {
    return (
    `<div class="mini_card">
        <i data-lucide="${icon}" class="mini_card--icon"></i>
        <div class="mini_card--info">
            <span class="mini_card--info--counter">${count}</span>
            <span class="mini_card--info--title">${name}</span>
        </div>
     </div>`
    );
}
