// Alerts, webhook, and persistence utilities split from websocket-example.js
// This file initializes alert UI controls, banner rendering, alert rules, and history persistence helpers.

// Alert UI references and hidden buffer
const compactAlertsToggle = document.getElementById('compactAlertsToggle');
const maxAlertBannersInput = document.getElementById('maxAlertBanners');
const showHiddenAlertsBtn = document.getElementById('showHiddenAlertsBtn');
var hiddenAlertBuffer = window._hiddenAlertBuffer || (window._hiddenAlertBuffer = []);

// load persisted compact preferences
try {
    const savedCompact = localStorage.getItem('okx_compact_alerts');
    if (savedCompact !== null && compactAlertsToggle) compactAlertsToggle.checked = (savedCompact === 'true');
    const savedMax = localStorage.getItem('okx_max_alert_banners');
    if (savedMax !== null && maxAlertBannersInput) maxAlertBannersInput.value = Number(savedMax) || 3;
} catch (e) { /* ignore */ }

// Wire compact alert controls
try {
    if (compactAlertsToggle) compactAlertsToggle.addEventListener('change', (ev) => {
        try { localStorage.setItem('okx_compact_alerts', ev.target.checked ? 'true' : 'false'); } catch (e) { }
    });
    if (maxAlertBannersInput) maxAlertBannersInput.addEventListener('input', (ev) => {
        try { localStorage.setItem('okx_max_alert_banners', String(parseInt(ev.target.value, 10) || 0)); } catch (e) { }
    });
    if (showHiddenAlertsBtn) showHiddenAlertsBtn.addEventListener('click', () => {
        try {
            const modalBody = document.getElementById('hiddenAlertsModalBody');
            if (!modalBody) return;
            modalBody.innerHTML = '';
            if (!hiddenAlertBuffer || hiddenAlertBuffer.length === 0) {
                modalBody.innerHTML = '<div class="small text-muted">No hidden alerts</div>';
            } else {
                for (const a of hiddenAlertBuffer) {
                    const div = document.createElement('div');
                    div.className = 'mb-2 p-2 bg-dark text-light';
                    div.innerHTML = `<strong>${a.title}</strong><div style="font-size:0.9em;">${a.message}</div><div class="text-muted small">${new Date(a.ts).toLocaleString()}</div>`;
                    modalBody.appendChild(div);
                }
            }
            const bs = new bootstrap.Modal(document.getElementById('hiddenAlertsModal'));
            bs.show();
        } catch (e) { console.warn('showHiddenAlerts failed', e); }
    });
} catch (e) { console.warn('wiring compact alert controls failed', e); }

// --- Alerts: banner, sound, webhook ---
const ALERT_ENABLED_KEY = 'okx_calc_alerts_enabled';
let storedAlertEnabled = false;
try {
    storedAlertEnabled = localStorage.getItem(ALERT_ENABLED_KEY) === 'true';
} catch (e) { storedAlertEnabled = false; }
const alertState = {
    enabled: storedAlertEnabled,
    sound: false,
    webhook: ''
};

function syncAlertNotesVisibility() {
    try {
        const col = document.getElementById('alertRulesNotesColumn');
        if (col) col.style.display = alertState.enabled ? '' : 'none';
    } catch (e) { console.warn('alert notes visibility sync failed', e); }
}
const lastAlertAt = {}; // per-coin throttle
// Whether to persist per-coin history to localStorage (default: enabled)
var persistHistoryEnabled = (localStorage.getItem('okx_calc_persist') !== 'false');
function setPersistHistoryEnabled(val) {
    persistHistoryEnabled = !!val;
    window.persistHistoryEnabled = persistHistoryEnabled;
}

// create banner container
(function () {
    const b = document.createElement('div');
    b.id = 'alertBanner';
    b.style.position = 'fixed';
    b.style.left = '12px';
    b.style.top = '12px';
    b.style.zIndex = 3000;
    b.style.maxWidth = 'min(600px, 90vw)';
    document.body.appendChild(b);
})();

// simple sound element
const _alertAudio = document.createElement('audio');
_alertAudio.src = 'data:audio/ogg;base64,T2dnUwACAAAAAAAAAABVDwAAAAAA...'; // tiny placeholder (silent) - replace if needed
_alertAudio.preload = 'auto';
document.body.appendChild(_alertAudio);

function showAlertBanner(title, message, type = 'info', timeout = 1500) {
    if (!alertState.enabled) return;
    const container = document.getElementById('alertBanner');
    if (!container) return;
    // Respect compact alerts setting: if compact enabled and visible banners >= max, skip showing banner
    try {
        const compactEl = document.getElementById('compactAlertsToggle');
        const maxEl = document.getElementById('maxAlertBanners');
        const compactEnabled = compactEl ? !!compactEl.checked : false;
        const maxVisible = maxEl ? (parseInt(maxEl.value, 10) || 0) : 3;
        if (compactEnabled && (maxVisible <= 0 || container.children.length >= maxVisible)) {
            // store suppressed alert in buffer, still record in Alerts tab and optionally play sound/webhook
            try { hiddenAlertBuffer.push({ title, message, type, ts: Date.now() }); } catch (e) { }
            try { if (alertState.sound) { _alertAudio.currentTime = 0; _alertAudio.play().catch(() => { }); } } catch (e) { }
            try { let coin = null; if (typeof title === 'string' && title.indexOf('—') !== -1) coin = title.split('—')[0].trim(); addAlertToTab(coin, message, type, Date.now()); } catch (e) { }
            return;
        }
    } catch (e) { /* ignore compact check errors and continue to show banner */ }
    const el = document.createElement('div');
    el.className = 'alert';
    el.style.marginBottom = '8px';
    el.style.cursor = 'pointer';
    el.style.opacity = '0.98';
    el.style.backdropFilter = 'blur(6px)';
    if (type === 'danger') el.classList.add('alert-danger');
    else if (type === 'warning') el.classList.add('alert-warning');
    else el.classList.add('alert-info');
    // include explicit close button to ensure users can dismiss banners
    el.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div style="flex:1;">
                        <strong>${title}</strong>
                        <div style="font-size:0.9em;margin-top:4px;">${message}</div>
                    </div>
                    <button type="button" aria-label="Close" title="Close" class="btn-close btn-close-white" style="margin-left:12px;" />
                </div>
            `;
    try {
        const closeBtn = el.querySelector('.btn-close');
        if (closeBtn) closeBtn.addEventListener('click', (ev) => { try { ev.stopPropagation(); el.remove(); } catch (e) { } });
    } catch (e) { }
    // also allow clicking the banner body to remove it (defensive)
    el.addEventListener('click', (ev) => { try { if (ev && ev.target && ev.target.classList && ev.target.classList.contains('btn-close')) return; el.remove(); } catch (e) { } });
    container.appendChild(el);
    if (alertState.sound) try { _alertAudio.currentTime = 0; _alertAudio.play().catch(() => { }); } catch (e) { }
    setTimeout(() => { try { if (el && el.parentElement) el.remove(); } catch (e) { } }, timeout);
    // Also append this alert into the Alerts tab list for persistence/visibility
    try {
        // derive coin if present in title (format: 'COIN — Alert')
        let coin = null;
        if (typeof title === 'string' && title.indexOf('—') !== -1) coin = title.split('—')[0].trim();
        addAlertToTab(coin, message, type, Date.now());
    } catch (e) { console.warn('addAlertToTab failed', e); }
}

async function sendAlertWebhook(coin, insights) {
    try {
        const url = (document.getElementById('alertWebhookUrl') && document.getElementById('alertWebhookUrl').value) || alertState.webhook || '';
        if (!url) return;
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coin, insights, ts: Date.now() }) });
    } catch (e) { console.warn('Webhook send failed', e); }
}

// wire UI controls (if present)
try {
    const eToggle = document.getElementById('enableAlertsToggle');
    const sToggle = document.getElementById('enableSoundToggle');
    const wInput = document.getElementById('alertWebhookUrl');
    const wTest = document.getElementById('alertWebhookTest');
    if (eToggle) {
        eToggle.checked = !!alertState.enabled;
        alertState.enabled = !!eToggle.checked;
        eToggle.addEventListener('change', (ev) => {
            alertState.enabled = !!ev.target.checked;
            try { localStorage.setItem(ALERT_ENABLED_KEY, alertState.enabled ? 'true' : 'false'); } catch (e) { }
            syncAlertNotesVisibility();
        });
    }
    if (sToggle) { alertState.sound = !!sToggle.checked; sToggle.addEventListener('change', (ev) => alertState.sound = !!ev.target.checked); }
    if (wInput) { wInput.addEventListener('input', (ev) => alertState.webhook = ev.target.value); if (localStorage.getItem('okx_calc_webhook')) { wInput.value = localStorage.getItem('okx_calc_webhook'); alertState.webhook = wInput.value; } }
    if (wTest) wTest.addEventListener('click', () => { showAlertBanner('Webhook test', 'Sending test payload...', 'info', 3000); sendAlertWebhook('TEST', { test: true }); try { localStorage.setItem('okx_calc_webhook', (wInput && wInput.value) || ''); } catch (e) { } });
    // Defensive: ensure toggles and labels accept pointer events (fixes cases where overlays/CSS block clicks)
    try {
        if (eToggle) {
            try { eToggle.style.pointerEvents = 'auto'; if (eToggle.parentElement) eToggle.parentElement.style.pointerEvents = 'auto'; } catch (e) { }
            const lbl = document.querySelector('label[for="enableAlertsToggle"]');
            if (lbl) {
                lbl.style.cursor = 'pointer';
                // ensure clicking the label toggles the checkbox in case implicit label->input isn't working
                lbl.addEventListener('click', (ev) => {
                    try {
                        ev.preventDefault();
                        ev.stopPropagation();
                        eToggle.checked = !eToggle.checked;
                        eToggle.dispatchEvent(new Event('change'));
                    } catch (e) { }
                });
            }
        }
        if (sToggle) { try { sToggle.style.pointerEvents = 'auto'; if (sToggle.parentElement) sToggle.parentElement.style.pointerEvents = 'auto'; } catch (e) { } }
    } catch (e) { console.warn('defensive toggle wiring failed', e); }
    // Alt persist toggle in alerts tab (mirror header control)
    try {
        const alt = document.getElementById('persistHistoryToggleAlt');
        const main = document.getElementById('persistHistoryToggle');
        if (alt) {
            // initialize state from saved preference
            alt.checked = persistHistoryEnabled;
            alt.addEventListener('change', (ev) => {
                setPersistHistoryEnabled(ev.target.checked);
                try { if (main) { main.checked = persistHistoryEnabled; } localStorage.setItem('okx_calc_persist', persistHistoryEnabled ? 'true' : 'false'); } catch (e) { }
            });
        }
        if (main && alt) {
            // also sync main -> alt when main changes
            main.addEventListener('change', (ev) => {
                try { alt.checked = !!ev.target.checked; } catch (e) { }
            });
        }
    } catch (e) { console.warn('alt persist wiring failed', e); }
} catch (e) { console.warn('alert UI wiring error', e); }
syncAlertNotesVisibility();

// Alerts storage and rendering in Alerts tab
const ALERTS_KEY = 'okx_calc_alerts_v1';
const ALERT_RULES_KEY = 'okx_calc_alert_rules_v1';

// Default alert rules seed (applied if no rules found in localStorage)
const DEFAULT_ALERT_RULES = [
    { id: 'vol_ratio_buy_high', name: 'Vol Ratio 2h > 200%', metric: 'vol_ratio_2h', op: '>', threshold: 200, severity: 'warning', enabled: true, message: 'Vol Ratio % (2h) > 200% (strong buy pressure)' },
    { id: 'vol_ratio_sell_low', name: 'Vol Ratio 2h < 30%', metric: 'vol_ratio_2h', op: '<', threshold: 30, severity: 'danger', enabled: true, message: 'Vol Ratio % (2h) < 30% (strong sell pressure)' },
    { id: 'freq_vs_avg_buy', name: 'Freq Buy vs Avg > 200%', metric: 'freq_vs_avg_buy_percent', op: '>', threshold: 200, severity: 'warning', enabled: true, message: 'Frequency buy >> historical average (>=200%)' }
];

function loadAlertRules() {
    try {
        const arr = JSON.parse(localStorage.getItem(ALERT_RULES_KEY) || 'null');
        if (!arr || !Array.isArray(arr) || arr.length === 0) {
            // seed defaults
            try { localStorage.setItem(ALERT_RULES_KEY, JSON.stringify(DEFAULT_ALERT_RULES)); } catch (e) { }
            return DEFAULT_ALERT_RULES.slice();
        }
        return arr;
    } catch (e) { return DEFAULT_ALERT_RULES.slice(); }
}

function saveAlertRules(arr) {
    try { localStorage.setItem(ALERT_RULES_KEY, JSON.stringify(arr || [])); } catch (e) { console.warn('saveAlertRules failed', e); }
}

function renderAlertRules() {
    try {
        const container = document.getElementById('alertsListContainer');
        if (!container) return;
        let panel = document.getElementById('alertRulesPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'alertRulesPanel';
            panel.className = 'mt-3';
            container.appendChild(panel);
        }
        const rules = loadAlertRules();
        let html = '<h6 class="small text-muted mb-1">Alert Rules</h6>';
        if (!rules || rules.length === 0) html += '<div class="small text-muted">No alert rules configured</div>';
        else {
            html += '<div class="list-group list-group-flush small" style="max-height:180px;overflow:auto;">';
            for (const r of rules) {
                const badge = r.severity === 'danger' ? '<span class="badge bg-danger me-1">!</span>' : '<span class="badge bg-warning text-dark me-1">!</span>';
                const enabled = r.enabled ? '' : ' <span class="text-muted">(disabled)</span>';
                html += `<div class="list-group-item bg-dark text-light">${badge}<strong>${r.name}</strong>${enabled}<div class="text-muted small">${r.message || ''} — <em>${r.metric} ${r.op} ${r.threshold}</em></div></div>`;
            }
            html += '</div>';
        }
        panel.innerHTML = html;
    } catch (e) { console.warn('renderAlertRules failed', e); }
}

// in-memory cooldown per coin+rule to prevent spam (ms)
const ALERT_RULE_COOLDOWN_MS = 60 * 1000; // 60s per rule
const lastAlertRuleAt = {};

function evaluateAlertRulesForData(data) {
    try {
        if (!data || !data.coin) return;
        const rules = loadAlertRules();
        if (!rules || rules.length === 0) return;
        const a = data._analytics || {};
        for (const r of rules) {
            try {
                if (!r.enabled) continue;
                // fetch metric value: prefer analytics fields
                let val = null;
                switch (r.metric) {
                    case 'vol_ratio_2h':
                        val = (a.volRatioBuySell_percent !== undefined) ? a.volRatioBuySell_percent : ((getNumeric(data, 'count_VOL_minute_120_buy') || 0) / Math.max((getNumeric(data, 'count_VOL_minute_120_sell') || 0), 1) * 100);
                        break;
                    case 'freq_vs_avg_buy_percent':
                        val = a.freqBuy_vs_avg_percent !== undefined ? a.freqBuy_vs_avg_percent : ((getNumeric(data, 'count_FREQ_minute_120_buy') || a.freqBuy2h || 0) / Math.max((getNumeric(data, 'avg_FREQCOIN_buy_2JAM') || a.avgFreqBuy2h || 1), 1) * 100);
                        break;
                    case 'freq_ratio_2h':
                        val = (a.freqBuy2h !== undefined && a.freqSell2h !== undefined) ? ((Number(a.freqBuy2h) / Math.max(Number(a.freqSell2h), 1)) * 100) : null;
                        break;
                    default:
                        // try direct analytics field
                        val = a[r.metric] !== undefined ? a[r.metric] : null;
                }
                if (val === null || val === undefined) continue;
                let triggered = false;
                if (r.op === '>' && Number(val) > Number(r.threshold)) triggered = true;
                if (r.op === '<' && Number(val) < Number(r.threshold)) triggered = true;
                if (!triggered) continue;
                const key = `${data.coin}::${r.id}`;
                const now = Date.now();
                if (lastAlertRuleAt[key] && (now - lastAlertRuleAt[key] < ALERT_RULE_COOLDOWN_MS)) continue; // cooldown
                lastAlertRuleAt[key] = now;
                // trigger alert
                const title = `${data.coin} — Alert: ${r.name}`;
                const msg = `${r.message || ''} (value: ${Math.round(Number(val) * 100) / 100})`;
                showAlertBanner(title, msg, r.severity === 'danger' ? 'danger' : 'warning', 8000);
                addAlertToTab(data.coin, msg, r.severity === 'danger' ? 'danger' : 'warning', now);
                // optional webhook
                try { sendAlertWebhook(data.coin, { rule: r, value: val, ts: now }); } catch (e) { }
            } catch (e) { console.warn('evaluate rule failed', e); }
        }
    } catch (e) { console.warn('evaluateAlertRulesForData failed', e); }
}

function loadAlertsFromStore() {
    try {
        const arr = JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
}

function saveAlertsToStore(arr) {
    try { localStorage.setItem(ALERTS_KEY, JSON.stringify(arr || [])); } catch (e) { }
}

function formatTs(ts) {
    try { const d = new Date(ts); return d.toLocaleString(); } catch (e) { return String(ts); }
}

function renderAlertsList() {
    try {
        const container = document.getElementById('alertsList');
        if (!container) return;
        const arr = loadAlertsFromStore();
        container.innerHTML = '';
        for (let i = arr.length - 1; i >= 0; i--) {
            const it = arr[i];
            const el = document.createElement('div');
            el.className = 'list-group-item bg-dark text-light small';
            el.style.border = '1px solid rgba(255,255,255,0.04)';
            el.innerHTML = `<div class="d-flex w-100 justify-content-between"><strong>${it.coin ? it.coin + ' — ' : ' '}${it.type && it.type === 'warning' ? '<span class="badge bg-warning text-dark">Alert</span>' : ''}${it.type && it.type === 'danger' ? '<span class="badge bg-danger">Alert</span>' : ''}</strong><small class="text-muted">${formatTs(it.ts)}</small></div><div style="font-size:0.9em;margin-top:4px;color:#cbd5e1;">${it.message}</div>`;
            container.appendChild(el);
        }
    } catch (e) { console.warn('renderAlertsList error', e); }
}

// Clear alerts & wire Clear button
function clearAlerts() {
    try {
        saveAlertsToStore([]);
        renderAlertsList();
        showAlertBanner('Alerts cleared', 'All stored alerts were removed', 'info', 3000);
    } catch (e) { console.warn('clearAlerts failed', e); }
}

try {
    const clearBtn = document.getElementById('clearAlertsBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
        if (!confirm('Clear all stored alerts?')) return;
        clearAlerts();
    });
} catch (e) { console.warn('clearAlerts button wiring failed', e); }

function addAlertToTab(coin, message, type = 'info', ts = Date.now()) {
    try {
        const arr = loadAlertsFromStore();
        arr.push({ coin: coin || null, message: String(message || ''), type: type || 'info', ts: ts || Date.now() });
        // keep recent N alerts
        const MAX_ALERTS = 300;
        if (arr.length > MAX_ALERTS) arr.splice(0, arr.length - MAX_ALERTS);
        saveAlertsToStore(arr);
        renderAlertsList();
    } catch (e) { console.warn('addAlertToTab failed', e); }
}

// render stored alerts and rules on load
try { renderAlertsList(); } catch (e) { }
try { if (typeof renderAlertRules === 'function') renderAlertRules(); } catch (e) { }

// --- Persistence (LocalStorage) helpers ---
const PERSIST_KEY = 'okx_calc_history_v1';
const MAX_HISTORY = 500; // keep up to this many points per coin
const _lastSaveAt = {};

function loadPersistedHistory(coin) {
    try {
        const store = JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}');
        const arr = store && store[coin] ? store[coin] : [];
        return Array.isArray(arr) ? arr.slice(-MAX_HISTORY) : [];
    } catch (e) { console.warn('loadPersistedHistory error', e); return []; }
}

function savePersistedHistory(coin, arr) {
    if (!persistHistoryEnabled) return;
    try {
        const now = Date.now();
        if (_lastSaveAt[coin] && (now - _lastSaveAt[coin]) < 5000) return; // throttle 5s
        _lastSaveAt[coin] = now;
        const store = JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}');
        store[coin] = arr.slice(-MAX_HISTORY);
        localStorage.setItem(PERSIST_KEY, JSON.stringify(store));
    } catch (e) { console.warn('savePersistedHistory error', e); }
}

// Wire the UI toggle
try {
    const t = document.getElementById('persistHistoryToggle');
    if (t) {
        // Ensure toggle reflects saved preference
        t.checked = persistHistoryEnabled;
        // Defensive: make sure the toggle and its parent accept pointer events
        try { t.style.pointerEvents = 'auto'; if (t.parentElement) t.parentElement.style.pointerEvents = 'auto'; } catch (e) { }
        // Wire change handler
        t.addEventListener('change', (ev) => {
            setPersistHistoryEnabled(ev.target.checked);
            try { localStorage.setItem('okx_calc_persist', persistHistoryEnabled ? 'true' : 'false'); } catch (e) { }
        });
        // Also make the label clickable (some layouts may overlay the checkbox)
        try {
            const lbl = document.querySelector('label[for="persistHistoryToggle"]');
            if (lbl) {
                lbl.style.cursor = 'pointer';
                lbl.addEventListener('click', (ev) => {
                    try { t.checked = !t.checked; t.dispatchEvent(new Event('change')); } catch (e) { }
                });
            }
        } catch (e) { console.warn('persist label wiring failed', e); }
    }
} catch (e) { console.warn('persist toggle wiring failed', e); }

// expose selected helpers globally
window.showAlertBanner = showAlertBanner;
window.sendAlertWebhook = sendAlertWebhook;
window.addAlertToTab = addAlertToTab;
window.renderAlertsList = renderAlertsList;
window.renderAlertRules = renderAlertRules;
window.evaluateAlertRulesForData = evaluateAlertRulesForData;
window.loadPersistedHistory = loadPersistedHistory;
window.savePersistedHistory = savePersistedHistory;
window.hiddenAlertBuffer = hiddenAlertBuffer;
window.persistHistoryEnabled = persistHistoryEnabled;
window.MAX_HISTORY = MAX_HISTORY;
window.lastAlertAt = lastAlertAt;
