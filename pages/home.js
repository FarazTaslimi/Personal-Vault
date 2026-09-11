// import { update } from '../js/update.js';
import { icons } from '../js/icons.js';
import { mini_card } from '../js/components.js';

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
                    <span class="hero-main--personal-information--jobs>Builder. Storyteller. Developer.</span>
                </div>
                <div class="hero-main--quick_summary">${mini_card("film", "Movies", "42")} ${mini_card("music", "Songs", "128")} ${mini_card("clock", "Hours", "156")}</div>
            </div>
            <div class="hero-poem">
                <p class="hero-poem--content">some<br>stories<br>are never<br>meant to be<br>found</p>
            </div>
         </div>`
        );
    };

    icons();
    return `${header()}${hero()}`;
}