const app = document.getElementById('app');
let html = "";
let tempHTML = "";

function update() {
    html += tempHTML;
}

function render() {
    html = "";
    appContent.forEach(fn => fn());
    app.innerHTML = html;
}

function header() {
    let date = new Date();
    const time = date.getHours() + ":" + date.getMinutes();
    tempHTML = 
    `<div class="header">
        <div class="header-title">
            <div class="dot"></div>
            <span class="title">Personal Vault</span>
            <input type="text">
        </div>
        <div class="header-time">
            <span class="time">${time}</span>
        </div>
     </div>`;
    update();
}

const appContent = [header];

render();
setInterval(render, 10000);