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
    ``;
    update();
}

const appContent = [header];

render();
setInterval(render, 10000);