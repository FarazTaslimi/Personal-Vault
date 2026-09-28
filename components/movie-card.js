import { loadCSS } from '../js/loadCSS.js';
loadCSS("/components/movie-card.css");

export function movie_card(id, preview, title, year, rating, watches) {
    return (
        `<div class="movie_card" data-id="${id}" data-watches="${watches}">
            <div class="movie_card--preview">
                <div class="movie_card--preview-overlay">
                    <span class="movie_card--preview-overlay--icon-btn">
                        <i data-lucide="play" class="movie_card--preview-overlay--icon filled-icon"></i>
                    </span>
                </div>
                <img src="${preview}" class="movie_card--preview-img" alt="${title}">
                <span class="movie_card--watchStatus"></span>
            </div>

            <div class="movie_card--info">
                <span class="movie_card--info--title">${title}</span>
                <span class="movie_card--info--year">${year}</span>
                <div class="movie_card--info--rating">
                    <i data-lucide="star" class="movie_card--info--rating--icon filled-icon"></i>
                    <span class="movie_card--info--rating--count">${rating}</span>
                </div>
            </div>
         </div>`
    );
}
