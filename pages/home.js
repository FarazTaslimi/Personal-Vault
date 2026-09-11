// import { update } from '../js/update.js';
import { icons } from '../js/icons.js';

export function home() {
    const header = function() {
        let date = new Date();
        const time = () => {return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;};

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

    icons();
    return `${header()}`;
}