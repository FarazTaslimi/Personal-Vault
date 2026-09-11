import { loadCSS } from '../js/loadCSS.js';
loadCSS("../components/mini-card.css");

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