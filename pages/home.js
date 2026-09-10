// import { update } from '../js/update.js';

export function home() {
    const header = function() {
        let date = new Date();
        const time = () => {return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;};

        return (
        `<div class="header">
            <div class="header-title">
                <div class="dot"></div>
                <h1 class="title">Personal Vault</h1>
            </div>
            <div class="header-time">
                <span class="time">${time()}</span>
                <span class="time-zone">UTC +3:30</span>
            </div>
         </div>`
        );
    };

    return `${header()}`;
}