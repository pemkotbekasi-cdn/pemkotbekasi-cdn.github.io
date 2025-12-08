// WebSocket client extracted from websocket-example.js

var ws = null;

// Attach handlers to a WebSocket instance by binding the named handlers
function attachHandlers(socket) {
    if (!socket) return;
    socket.onopen = function () {
        console.log("WebSocket connected.");
        try { const el = document.getElementById('loading'); if (el) el.style.display = 'none'; } catch (e) { }
        // call external onWsOpen hook if defined
        try { if (typeof window.onWsOpen === 'function') window.onWsOpen(); } catch (e) { }
    };
    socket.onmessage = function (event) {
        // delegate to the main handler in main script
        try { if (typeof window.onWsMessage === 'function') window.onWsMessage(event); } catch (e) { console.error('onWsMessage handler error', e); }
    };
    socket.onclose = function (ev) { console.log('WebSocket closed', ev && ev.code); };
    socket.onerror = function (err) { console.error('WebSocket error', err); };
}

function createAndAttach() {
    try {
        if (ws) try { ws.close(); } catch (e) { }
    } catch (e) { }
    ws = new WebSocket('wss://eofficev2.bekasikota.go.id/okx-ws');
    attachHandlers(ws);
}

// create initial connection
createAndAttach();

// restart connection every 20 seconds
const RESTART_INTERVAL_MS = 20 * 1000;
setInterval(function () {
    try {
        console.log('Restarting WebSocket connection (interval)');
        createAndAttach();
    } catch (e) { console.warn('WebSocket restart failed', e); }
}, RESTART_INTERVAL_MS);

// expose for external use
window.ws = ws;
window.createAndAttach = createAndAttach;
