
const { ipcRenderer, Renderer } = require('electron');

document.body.innerHTML = '';
let canvas = document.body.appendChild(document.createElement('canvas'));
canvas.id = 'mainCanvas';
let ctx = canvas.getContext('2d');

const FONT_FAMILY = 'Roboto';

const LOG_MAX = 6 * 300;
let log_entries = [];
function log_add(sensors) {
    log_entries.push(sensors);
    if(log_entries.length > LOG_MAX) log_entries.shift();
}

function temp_y(temp) {
    return canvas.height - (((temp - 25) / 75) * canvas.height);
}


function canvas_clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function background1() {
    const font_size = Math.min(Math.max(canvas.height * 0.08, 8), 20);
    ctx.font = `${font_size}px ${FONT_FAMILY}`;
    function line(val, strokeStyle) {
        const y = temp_y(val);
        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        ctx.fillStyle = strokeStyle;
        ctx.fillText(~~val, Math.min(canvas.width * 0.0001, 5), y);
    }
    ctx.save();
    ctx.lineWidth = 0.5;
    ctx.setLineDash([canvas.width / 200, canvas.width / 200]);
    line(90, '#ff0000'); // red
    line(80, '#ff8000'); // orange
    line(60, '#ffff00'); // yellow
    line(40, '#008000'); // green
    line(30, '#0000ff'); // blue
    ctx.restore();
}

function string_color(str) {
    let hash = 0;
    for(let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `rgb(${(hash + 0x40) & 0xff}, ${(hash >> 8 + 0x40) & 0xff}, ${(hash >> 16 + 0x40) & 0xff})`;
}

let graphLines;
function getGraphLine(component, sensor, output = '') {
    const key = `${component}.${sensor}.${output}`;
    if(!graphLines.hasOwnProperty(key)) {
        return graphLines[key] = {
            component,
            sensor,
            output,
            key,
            strokeStyle: string_color(key),
            ys: [],
        };
    }
    return graphLines[key];
}

function right_aligned_text(text, font = FONT_FAMILY, x, y) {

}

function show_something(entries_per_view = LOG_MAX) {
    canvas_clear();
    background1();
    graphLines = {};
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    let start_x = 0;
    const entry_width = canvas.width / entries_per_view;
    for(let i = log_entries.length - entries_per_view; i < log_entries.length; i++) {
        if(typeof log_entries[i] === 'undefined') {
            start_x += entry_width; // counting oob entries to get right-align
            continue;
        }
        for(const [component_name, sensors] of Object.entries(log_entries[i])) {
            for(const [sensor_name, sensor] of Object.entries(sensors)) {
                if(typeof sensor !== 'object') continue;
                for(const [output_name, output] of Object.entries(sensor)) {
                    if(!['Tdie', 'Tccd1'].includes(sensor_name)) continue;
                    let y = temp_y(output);
                    getGraphLine(component_name, sensor_name, output_name).ys.push(y);
                }
            }
        }
    }
    ctx.lineWidth = Math.min(Math.max(canvas.width * 0.005, 0.5), 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    Object.keys(graphLines).sort().forEach(key => {
        const line = graphLines[key];
        if(start_x > 0) {
            const text = `${line.sensor} ●`;
            const font_size = Math.min(Math.max(canvas.height * 0.08, 8), 30);
            ctx.font = `${font_size}px ${FONT_FAMILY}`;
            const width = ctx.measureText(text).width;
            ctx.fillStyle = line.strokeStyle;
            ctx.fillText(text, start_x - width - (canvas.height * 0.01), line.ys[0]);
        }
        ctx.beginPath();
        ctx.moveTo(start_x, line.ys[0]);
        for(let i = 1, x = start_x; i < line.ys.length; i++) {
            ctx.lineTo(x += entry_width, line.ys[i]);
        }
        ctx.strokeStyle = line.strokeStyle;
        ctx.stroke();
    });
    ctx.restore();
}

function on_resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    show_something();
}
on_resize();
window.addEventListener('resize', on_resize);

ipcRenderer.on('sensors', (event, data) => {
    log_add(data.sensors);
    show_something();
});

ipcRenderer.send('ready');
