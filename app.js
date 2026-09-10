const app = document.getElementById('app');
import { home } from './pages/home.js';

function render() {
    app.innerHTML = `${home()}`;
}

render();