        const limitInput = document.getElementById('limitInput');
        const sortBySelect = document.getElementById('sortBy');
        // radio buttons for sort order
        const sortOrderRadios = document.getElementsByName('sortOrderRad');
        function getSortOrderValue() {
            try { for (const r of sortOrderRadios) if (r.checked) return r.value; } catch (e) { }
            return 'desc';
        }
        let rowLimit = 5; // default rows to display (changed from 20)

        // Per-tab filter inputs
        const filterInputs = {
            summary: document.getElementById('coinFilter_summary'),
            volume: document.getElementById('coinFilter_volume'),
            volDur: document.getElementById('coinFilter_volDur'),
            spikes: document.getElementById('coinFilter_spikes'),
            recs: document.getElementById('coinFilter_recs'),
            alerts: document.getElementById('coinFilter_alerts'),
            micro: document.getElementById('coinFilter_micro')
        };

        // Debounce helper to reduce DOM churn from frequent updates
        function debounce(fn, wait) {
            let t = null;
            return function (...args) {
                if (t) clearTimeout(t);
                t = setTimeout(() => { try { fn.apply(this, args); } catch (e) { }; t = null; }, wait);
            };
        }

        // Schedule updates to the table at most once per 150ms
        // `updateTable` is defined later; debounce will call it when available.
        const scheduleUpdateTable = debounce(function () {
            try { if (typeof updateTable === 'function') updateTable(); }
            catch (e) { /* ignore */ }
        }, 150);
        let activeFilterTab = 'summary';

        function setActiveFilterTab(tab) {
            activeFilterTab = tab || 'summary';
            for (const k in filterInputs) {
                try {
                    const el = filterInputs[k];
                    if (!el) continue;
                    if (k === activeFilterTab) el.classList.remove('d-none'); else el.classList.add('d-none');
                } catch (e) { }
            }
        }

        function getActiveFilterValue() {
            try {
                const el = filterInputs[activeFilterTab];
                if (!el) return '';
                return (el.value || '').toLowerCase();
            } catch (e) { return ''; }
        }

        // Recommendation UI controls
        const useAtrRecs = document.getElementById('useAtrRecs');
        const tpMinInput = document.getElementById('tpMin');
        const tpMaxInput = document.getElementById('tpMax');
        const slMaxInput = document.getElementById('slMax');
        const confSensitivity = document.getElementById('confSensitivity');

        // Alerts compacting + hidden buffer
        const compactAlertsToggle = document.getElementById('compactAlertsToggle');
        const maxAlertBannersInput = document.getElementById('maxAlertBanners');
        const showHiddenAlertsBtn = document.getElementById('showHiddenAlertsBtn');
        // buffer for alerts suppressed while compact mode is on
        const hiddenAlertBuffer = window._hiddenAlertBuffer || (window._hiddenAlertBuffer = []);

        // load persisted compact preferences
        try {
            const savedCompact = localStorage.getItem('okx_compact_alerts');
            if (savedCompact !== null && compactAlertsToggle) compactAlertsToggle.checked = (savedCompact === 'true');
            const savedMax = localStorage.getItem('okx_max_alert_banners');
            if (savedMax !== null && maxAlertBannersInput) maxAlertBannersInput.value = Number(savedMax) || 3;
        } catch (e) { /* ignore */ }

        // Listen for changes to the limit
        limitInput.addEventListener('input', (event) => {
            rowLimit = parseInt(event.target.value, 10) || Infinity;
            scheduleUpdateTable(); // Update table when limit changes (debounced)
        });

        // Wire recommendation controls to refresh table when changed
        try {
            if (useAtrRecs) useAtrRecs.addEventListener('change', () => scheduleUpdateTable());
            if (tpMinInput) tpMinInput.addEventListener('input', () => scheduleUpdateTable());
            if (tpMaxInput) tpMaxInput.addEventListener('input', () => scheduleUpdateTable());
            if (slMaxInput) slMaxInput.addEventListener('input', () => scheduleUpdateTable());
            if (confSensitivity) confSensitivity.addEventListener('input', () => scheduleUpdateTable());
        } catch (e) { console.warn('wiring rec controls failed', e); }

        // Listen for changes in each per-tab filter input
        try {
            for (const k in filterInputs) {
                const el = filterInputs[k];
                if (!el) continue;
                el.addEventListener('input', () => scheduleUpdateTable());
            }
        } catch (e) { console.warn('wiring per-tab filters failed', e); }

        // Tab click handlers to switch active filter
        try {
            const tabMap = {
                'summary-tab': 'summary',
                'volume-tab': 'volume',
                'vol-dur-tab': 'volDur',
                'spike-tab': 'spikes',
                'recs-tab': 'recs',
                'alerts-tab': 'alerts',
                'insight-tab': 'summary',
                'info-tab': 'summary',
                'micro-tab': 'micro'
            };
            for (const tid in tabMap) {
                const btn = document.getElementById(tid);
                if (!btn) continue;
                btn.addEventListener('click', () => setActiveFilterTab(tabMap[tid]));
            }
        } catch (e) { console.warn('wiring tab filter toggles failed', e); }

        // show default filter
        setActiveFilterTab('summary');

        // Wire compact alert controls
        try {
            if (compactAlertsToggle) compactAlertsToggle.addEventListener('change', (ev) => {
                try { localStorage.setItem('okx_compact_alerts', ev.target.checked ? 'true' : 'false'); } catch (e) { }
            });
            if (maxAlertBannersInput) maxAlertBannersInput.addEventListener('input', (ev) => {
                try { localStorage.setItem('okx_max_alert_banners', String(parseInt(ev.target.value, 10) || 0)); } catch (e) { }
            });
            if (showHiddenAlertsBtn) showHiddenAlertsBtn.addEventListener('click', (ev) => {
                try {
                    // populate modal with hidden alerts
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

        // Listen for changes in sort criteria
        sortBySelect.addEventListener('change', () => {
            scheduleUpdateTable(); // Update table when sort criteria is changed (debounced)
        });

        // Listen for changes in sort order (radio buttons)
        try {
            for (const r of sortOrderRadios) { if (r) r.addEventListener('change', () => scheduleUpdateTable()); }
        } catch (e) { console.warn('wiring sort order radios failed', e); }

        const summaryBody = document.getElementById('summaryBody');
        const volBody = document.getElementById('volBody');
        const volRatioBody = document.getElementById('volRatioBody');
        const spikeBody = document.getElementById('spikeBody');
        const recsBody = document.getElementById('recsBody');
        const microBody = document.getElementById('microBody');
        const recTimeframeSelect = document.getElementById('recTimeframe');
        const openRecsBtn = document.getElementById('openRecsBtn');
        const advancedSortStatus = document.getElementById('advancedSortStatus');
        const advancedSortHint = document.getElementById('advancedSortHint');
        const disableAdvancedSortBtn = document.getElementById('disableAdvancedSortBtn');
        const advancedSortModalEl = document.getElementById('advancedSortModal');
        const advancedSortCriteriaContainer = document.getElementById('advancedSortCriteriaContainer');
        const addAdvancedSortRowBtn = document.getElementById('addAdvancedSortRow');
        const applyAdvancedSortBtn = document.getElementById('applyAdvancedSort');
        const clearAdvancedSortBtn = document.getElementById('clearAdvancedSortBtn');
        const advFilterFlowToggle = document.getElementById('advFilterFlowToggle');
        const advFilterFlowControls = document.getElementById('advFilterFlowControls');
        const advFilterFlowMetric = document.getElementById('advFilterFlowMetric');
        const advFilterFlowComparator = document.getElementById('advFilterFlowComparator');
        const advFilterFlowValue = document.getElementById('advFilterFlowValue');
        const advFilterDurToggle = document.getElementById('advFilterDurToggle');
        const advFilterDurControls = document.getElementById('advFilterDurControls');
        const advFilterDurMetric = document.getElementById('advFilterDurMetric');
        const advFilterDurComparator = document.getElementById('advFilterDurComparator');
        const advFilterDurValue = document.getElementById('advFilterDurValue');
        const advFilterPriceToggle = document.getElementById('advFilterPriceToggle');
        const advFilterPriceControls = document.getElementById('advFilterPriceControls');
        const advFilterPriceMin = document.getElementById('advFilterPriceMin');
        const advFilterPriceMax = document.getElementById('advFilterPriceMax');

        if (openRecsBtn) {
            openRecsBtn.addEventListener('click', () => {
                try { const tab = document.getElementById('recs-tab'); if (tab) tab.click(); } catch (e) { console.warn('openRecs click failed', e); }
            });
        }
        if (recTimeframeSelect) recTimeframeSelect.addEventListener('change', () => scheduleUpdateTable());
        let ws = null;

        // Attach handlers to a WebSocket instance by binding the named handlers
        function attachHandlers(socket) {
            if (!socket) return;
            socket.onopen = onWsOpen;
            socket.onmessage = onWsMessage;
            socket.onclose = (ev) => { console.log('WebSocket closed', ev && ev.code); };
            socket.onerror = (err) => { console.error('WebSocket error', err); };
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
        setInterval(() => {
            try {
                console.log('Restarting WebSocket connection (interval)');
                createAndAttach();
            } catch (e) { console.warn('WebSocket restart failed', e); }
        }, RESTART_INTERVAL_MS);

        // --- Insight modal helpers (ensure global functions available) ---
        function ensureInsightModal() {
            if (document.getElementById('insightModal')) return;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `
                        <div class="modal fade" id="insightModal" tabindex="-1" aria-hidden="true">
                            <div class="modal-dialog modal-lg modal-dialog-centered">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title" id="insightModalLabel">Insight</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div class="modal-body" id="insightModalBody">
                                        <!-- populated dynamically -->
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                        <button type="button" class="btn btn-outline-primary" id="insightExportJson">Export JSON</button>
                                        <button type="button" class="btn btn-outline-success" id="insightExportCsv">Export CSV</button>
                                    </div>
                                </div>
                            </div>
                        </div>`;
            document.body.appendChild(wrapper.firstElementChild);
        }

        // --- Test JSON modal helper ---
        function ensureTestJsonModal() {
            if (document.getElementById('testJsonModal')) return;
            const w = document.createElement('div');
            w.innerHTML = `
                                        <div class="modal fade" id="testJsonModal" tabindex="-1" aria-hidden="true">
                                            <div class="modal-dialog modal-lg modal-dialog-centered">
                                                <div class="modal-content">
                                                    <div class="modal-header">
                                                        <h5 class="modal-title">Run JSON (Paste & Run)</h5>
                                                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                                    </div>
                                                    <div class="modal-body">
                                                        <p class="small text-muted">Paste a single JSON payload here and click <strong>Run</strong> to simulate receiving it from WebSocket.</p>
                                                        <textarea id="testJsonTextarea" class="form-control" rows="8" placeholder='Paste JSON here'></textarea>
                                                        <div id="testJsonError" class="text-danger small mt-2" style="display:none"></div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                                        <button type="button" class="btn btn-primary" id="testJsonRunBtn">Run</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>`;
            document.body.appendChild(w.firstElementChild);
        }

        function drawSparkline(history, width = 600, height = 80) {
            if (!history || history.length === 0) return '';
            const vals = history.map(h => Number(h.price || h.volBuy2h || h.volSell2h || 0));
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            const range = (max - min) || 1;
            const step = width / Math.max(1, vals.length - 1);
            const points = vals.map((v, i) => {
                const x = Math.round(i * step);
                const y = Math.round(height - ((v - min) / range) * height);
                return `${x},${y}`;
            }).join(' ');
            return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><polyline fill="none" stroke="#0d6efd" stroke-width="2" points="${points}"/></svg>`;
        }

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
        let persistHistoryEnabled = (localStorage.getItem('okx_calc_persist') !== 'false');

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
                        persistHistoryEnabled = !!ev.target.checked;
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
        // `persistHistoryEnabled` is declared earlier near other state variables to avoid TDZ
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
                    persistHistoryEnabled = !!ev.target.checked;
                    try { localStorage.setItem('okx_calc_persist', persistHistoryEnabled ? 'true' : 'false'); } catch (e) { }
                });
                // Also make the label clickable (some layouts may overlay the checkbox)
                try {
                    const lbl = document.querySelector('label[for="persistHistoryToggle"]');
                    if (lbl) {
                        lbl.style.cursor = 'pointer';
                        lbl.addEventListener('click', (ev) => {
                            // toggle checkbox programmatically and fire change
                            try { t.checked = !t.checked; t.dispatchEvent(new Event('change')); } catch (e) { }
                        });
                    }
                } catch (e) { console.warn('persist label wiring failed', e); }
            }
        } catch (e) { console.warn('persist toggle wiring failed', e); }

        // Global error display for debugging (shows last uncaught error on page)
        window.__displayError = function (err) {
            try {
                console.error('Captured Error:', err);
                let el = document.getElementById('lastError');
                if (!el) {
                    el = document.createElement('div');
                    el.id = 'lastError';
                    el.style.position = 'fixed';
                    el.style.right = '12px';
                    el.style.bottom = '12px';
                    el.style.zIndex = 2000;
                    el.style.background = 'rgba(220,53,69,0.95)';
                    el.style.color = '#fff';
                    el.style.padding = '8px 12px';
                    el.style.borderRadius = '6px';
                    el.style.fontSize = '12px';
                    document.body.appendChild(el);
                }
                el.textContent = typeof err === 'string' ? err : (err && err.stack) ? err.stack.split('\n')[0] : String(err);
            } catch (e) { console.error('Error displaying error', e); }
        };

        window.addEventListener('error', function (ev) { window.__displayError(ev.error || ev.message || 'Unknown error'); });
        window.addEventListener('unhandledrejection', function (ev) { window.__displayError(ev.reason || ev.reason && ev.reason.message || 'Unhandled rejection'); });

        window.exportInsightJSON = function (coin, data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${coin}-insight.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        };

        window.exportInsightCSV = function (coin, data) {
            // export history points and a few summary fields
            const rows = [];
            rows.push(['coin', coin]);
            rows.push(['risk_score', data.risk_score || (data._analytics && data._analytics.riskScore) || 0]);
            rows.push([]);
            rows.push(['ts', 'price', 'volBuy2h', 'volSell2h']);
            const hist = data._history || [];
            for (const h of hist) rows.push([h.ts || '', h.price || '', h.volBuy2h || '', h.volSell2h || '']);
            const csv = rows.map(r => r.map(c => String(c).replace(/"/g, '""')).map(c => `"${c}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${coin}-insight.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        };

        window.showInsightModal = function (coin, data) {
            ensureInsightModal();
            const modalEl = document.getElementById('insightModal');
            const body = document.getElementById('insightModalBody');
            const title = document.getElementById('insightModalLabel');
            title.textContent = `Insights — ${coin}`;

            const risk = data.risk_score || (data._analytics && data._analytics.riskScore) || 0;
            const comp = (data._analytics && data._analytics.components) || {};
            const hist = data._history || [];
            // prepare z-score / persistence diagnostics
            const buySeries = hist.map(h => Number(h.volBuy2h || 0));
            const sellSeries = hist.map(h => Number(h.volSell2h || 0));
            const buyStat = meanStd(buySeries);
            const sellStat = meanStd(sellSeries);
            const currBuy = Number((data._analytics && data._analytics.volBuy2h) || getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM') || 0);
            const currSell = Number((data._analytics && data._analytics.volSell2h) || getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM') || 0);
            const zBuy = (buySeries.length >= 6 && buyStat.std > 0) ? ((currBuy - buyStat.mean) / buyStat.std) : null;
            const zSell = (sellSeries.length >= 6 && sellStat.std > 0) ? ((currSell - sellStat.mean) / sellStat.std) : null;
            // persistence: last 3 buys > mean+std
            let persistBuy = null;
            if (buySeries.length >= 3 && buyStat.std > 0) {
                const recent = buySeries.slice(Math.max(0, buySeries.length - 3));
                persistBuy = recent.filter(v => v > (buyStat.mean + buyStat.std)).length;
            }

            body.innerHTML = `
                                <div class="mb-3">
                                    <strong>Risk Score:</strong> <span class="fw-bold">${risk}%</span>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-12">${drawSparkline(hist, 560, 90)}</div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Components</h6>
                                        <ul>
                                            <li>Imbalance: ${Number(comp.imbalance || 0).toFixed(2)}</li>
                                            <li>Deviation: ${Number(comp.deviation || 0).toFixed(2)}</li>
                                            <li>Price Move: ${Number(comp.priceMove || 0).toFixed(2)}</li>
                                            <li>Liquidity: ${Number(comp.liquidity || 0).toFixed(2)}</li>
                                        </ul>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Summary</h6>
                                        <table class="table table-sm">
                                            <tr><td>Vol Buy (2h)</td><td>${getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM') || 0}</td></tr>
                                            <tr><td>Vol Sell (2h)</td><td>${getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM') || 0}</td></tr>
                                            <tr><td>Vol Dur (2h)</td><td>${getNumeric(data, 'percent_sum_VOL_minute_120_buy') || data.percent_sum_VOL_minute_120_buy || 0}%</td></tr>
                                            <tr><td>Price</td><td>${data.last || 0}</td></tr>
                                        </table>
                                        <div class="small text-muted mt-2">
                                            <strong>Buy z-score (2h):</strong> ${zBuy === null ? 'N/A' : Number(zBuy.toFixed(2))}
                                            <br><small>Samples: ${buySeries.length} | mean: ${Number(buyStat.mean.toFixed(2))} | std: ${Number(buyStat.std.toFixed(2))}</small>
                                            <br><strong>Sell z-score (2h):</strong> ${zSell === null ? 'N/A' : Number(zSell.toFixed(2))}
                                            <br><small>Samples: ${sellSeries.length} | mean: ${Number(sellStat.mean.toFixed(2))} | std: ${Number(sellStat.std.toFixed(2))}</small>
                                            <br><strong>Persistence (last3 buys > mean+std):</strong> ${persistBuy === null ? '-' : persistBuy}
                                        </div>
                                    </div>
                                </div>`;

            // wire export buttons
            const btnJson = document.getElementById('insightExportJson');
            const btnCsv = document.getElementById('insightExportCsv');
            btnJson.onclick = () => window.exportInsightJSON(coin, data);
            btnCsv.onclick = () => window.exportInsightCSV(coin, data);

            // show modal using Bootstrap
            try {
                const bsModal = new bootstrap.Modal(modalEl);
                bsModal.show();
            } catch (e) {
                console.warn('Bootstrap modal not available, falling back to alert', e);
                alert(`${coin} — Risk: ${risk}%`);
            }
        };

        // Show insight in the Insight tab (populate the insight pane and activate the tab)
        window.showInsightTab = function (coin, data) {
            try {
                const pane = document.getElementById('insightPaneBody');
                if (!pane) return showInsightModal(coin, data);
                const risk = data.risk_score || (data._analytics && data._analytics.riskScore) || 0;
                const comp = (data._analytics && data._analytics.components) || {};
                const hist = data._history || [];
                // compute price position
                const currentPrice = parseFloat(data.last) || 0;
                const highPrice = parseFloat(data.high) || currentPrice;
                const lowPrice = parseFloat(data.low) || currentPrice;
                const priceRange = highPrice - lowPrice;
                const pricePos = priceRange > 0 ? Math.round(((currentPrice - lowPrice) / priceRange) * 100) : 50;

                // recommendation breakdown
                const rec = (typeof calculateRecommendation === 'function') ? calculateRecommendation(data, pricePos, null, false) : { recommendation: 'N/A', className: '', score: 0, confidence: 0 };

                // timeframes to show
                const tfs = [
                    { k: '1m', buyKeys: ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1m'], sellKeys: ['count_VOL_minute1_sell', 'vol_sell_1MENIT', 'vol_sell_1m'], avgKeys: ['avg_VOLCOIN_buy_1MENIT'] },
                    { k: '5m', buyKeys: ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5m'], sellKeys: ['count_VOL_minute_5_sell', 'vol_sell_5MENIT', 'vol_sell_5m'], avgKeys: ['avg_VOLCOIN_buy_5MENIT'] },
                    { k: '10m', buyKeys: ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10m'], sellKeys: ['count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10m'], avgKeys: ['avg_VOLCOIN_buy_10MENIT'] },
                    { k: '15m', buyKeys: ['count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m'], sellKeys: ['count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m'], avgKeys: ['avg_VOLCOIN_buy_15MENIT'] },
                    { k: '30m', buyKeys: ['count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m'], sellKeys: ['count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m'], avgKeys: ['avg_VOLCOIN_buy_30MENIT'] },
                    { k: '60m', buyKeys: ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT'], sellKeys: ['count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT'], avgKeys: ['avg_VOLCOIN_buy_1JAM'] },
                    { k: '120m', buyKeys: ['count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT'], sellKeys: ['count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT'], avgKeys: ['avg_VOLCOIN_buy_2JAM'] },
                    { k: '24h', buyKeys: ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24h'], sellKeys: ['count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24h'], avgKeys: ['avg_VOLCOIN_buy_24JAM'] }
                ];

                const tfRows = [];
                const spikes = [];
                for (const t of tfs) {
                    const b = getNumeric(data, ...t.buyKeys);
                    const s = getNumeric(data, ...t.sellKeys);
                    const a = getNumeric(data, ...t.avgKeys);
                    const ratio = a > 0 ? (b / a) : (s > 0 ? (b / (s || 1)) : 0);
                    const buyShare = (b + s) > 0 ? Math.round((b / (b + s)) * 100) : 0;
                    tfRows.push({ k: t.k, buy: b, sell: s, avg: a, buyShare, ratio });
                    if (a > 0 && b / a >= 2) spikes.push({ k: t.k, ratio: b / a, buy: b, avg: a });
                }
                spikes.sort((x, y) => y.ratio - x.ratio);

                // build HTML
                let tfTable = '<table class="table table-sm text-light"><thead><tr><th>TF</th><th>Buy</th><th>Sell</th><th>Avg</th><th>Buy %</th><th>Vol/Avg</th></tr></thead><tbody>';
                for (const r of tfRows) tfTable += `<tr><td>${r.k}</td><td>${r.buy}</td><td>${r.sell}</td><td>${r.avg}</td><td>${r.buyShare}%</td><td>${r.avg > 0 ? (r.buy / r.avg).toFixed(2) + 'x' : '-'}</td></tr>`;
                tfTable += '</tbody></table>';

                const topSpikeHtml = spikes.length > 0 ? `<div class="mb-2"><strong>Top Spike:</strong> ${spikes[0].k} — ${spikes[0].ratio.toFixed(2)}x (buy ${spikes[0].buy} vs avg ${spikes[0].avg})</div>` : '<div class="mb-2 text-muted">No significant spikes (vol >= 2x avg)</div>';

                pane.innerHTML = `
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div><h4 class="mb-0">🔍 ${coin} — Insight</h4><small class="text-muted">Last update: ${data.update_time || data.update_time_VOLCOIN || '-'}</small></div>
                                <div class="text-end"><small>Price: ${data.last || 0} • Change: ${data.percent_change || 0}%</small><div class="mt-1"><strong>Recommendation:</strong> ${rec.recommendation || 'N/A'} (${rec.confidence || 0}%)</div></div>
                            </div>
                            <div class="mb-3">${drawSparkline(hist, 760, 100)}</div>
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <h6>Metrics</h6>
                                    <p><strong>Risk:</strong> ${risk}%</p>
                                    <p><strong>Price Pos:</strong> ${pricePos}%</p>
                                    <p><strong>Vol Buy (2h):</strong> ${getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM') || 0}</p>
                                    <p><strong>Vol Sell (2h):</strong> ${getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM') || 0}</p>
                                    <p><strong>Buy z-score (2h):</strong> ${data._analytics && data._analytics.zScoreBuy2h !== undefined ? data._analytics.zScoreBuy2h : 'N/A'}</p>
                                    <p><strong>Sell z-score (2h):</strong> ${data._analytics && data._analytics.zScoreSell2h !== undefined ? data._analytics.zScoreSell2h : 'N/A'}</p>
                                    <p><strong>Persistence (last3 buys > mean+std):</strong> ${data._analytics && data._analytics.persistenceBuy3 !== undefined ? data._analytics.persistenceBuy3 : '-'}</p>
                                    ${data._analytics && data._analytics.divergence ? `<p class="text-warning"><strong>Divergence:</strong> ${data._analytics.divergence}</p>` : ''}
                                    ${data._analytics && data._analytics.sharpInsights ? `<p><strong>Insight:</strong><br/>${data._analytics.sharpInsights.map(s => `- ${s}`).join('<br/>')}</p>` : ''}
                                </div>
                                <div class="col-md-4">
                                    <h6>Recommendation Breakdown</h6>
                                    <p>Score: ${rec.score !== undefined ? rec.score.toFixed(2) : '0.00'} • Confidence: ${rec.confidence || 0}%</p>
                                    <div class="progress mb-2" style="height:10px"><div class="progress-bar bg-success" role="progressbar" style="width:${rec.score > 0 ? rec.confidence : 0}%"></div><div class="progress-bar bg-danger" role="progressbar" style="width:${rec.score < 0 ? rec.confidence : 0}%"></div></div>
                                    ${topSpikeHtml}
                                </div>
                                <div class="col-md-4">
                                    <h6>Components</h6>
                                    <ul>
                                        <li>Imbalance: ${Number(comp.imbalance || 0).toFixed(2)}</li>
                                        <li>Deviation: ${Number(comp.deviation || 0).toFixed(2)}</li>
                                        <li>Price Move: ${Number(comp.priceMove || 0).toFixed(2)}</li>
                                        <li>Liquidity: ${Number(comp.liquidity || 0).toFixed(2)}</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="mb-3"><h6>Timeframe Comparison</h6>${tfTable}</div>
                            <div class="mb-3"><h6>Raw Data</h6><div class="d-flex gap-2"><button class="btn btn-outline-primary btn-sm" id="insightCopyJson">Copy JSON</button><button class="btn btn-outline-secondary btn-sm" id="insightExportJsonPane">Export JSON</button><button class="btn btn-outline-success btn-sm" id="insightExportCsvPane">Export CSV</button></div><pre id="insightRaw" style="max-height:200px;overflow:auto;margin-top:8px;background:#0b1220;padding:8px;border-radius:6px;color:#9ca3af;">${JSON.stringify(data, null, 2)}</pre></div>
                        `;

                document.getElementById('insightCopyJson').onclick = function () {
                    try { navigator.clipboard.writeText(JSON.stringify(data, null, 2)); } catch (e) { window.__displayError('Clipboard copy failed'); }
                };
                document.getElementById('insightExportJsonPane').onclick = () => window.exportInsightJSON(coin, data);
                document.getElementById('insightExportCsvPane').onclick = () => window.exportInsightCSV(coin, data);

                // activate the tab
                try {
                    const tabEl = document.getElementById('insight-tab');
                    if (tabEl) tabEl.click();
                } catch (e) { console.warn('Could not activate insight tab', e); }

                // Also set the summary coin filter to this coin and refresh table
                try {
                    const filterEl = document.getElementById('coinFilter_summary');
                    if (filterEl) {
                        filterEl.value = coin;
                        // trigger input handlers (if any) and refresh table
                        try { filterEl.dispatchEvent(new Event('input')); } catch (e) { }
                        try { if (typeof scheduleUpdateTable === 'function') scheduleUpdateTable(); } catch (e) { }
                    }
                } catch (e) { console.warn('Could not set summary filter for insight tab', e); }
            } catch (e) { console.error('showInsightTab error', e); window.__displayError(e); }
        };

        // Object to store data by coin
        const coinDataMap = {};

        // Delegated click handler: ensure clicks anywhere in a summary row open the insight tab.
        try {
            const summaryBodyEl = document.getElementById('summaryBody');
            if (summaryBodyEl) {
                summaryBodyEl.addEventListener('click', (ev) => {
                    try {
                        const tr = ev.target.closest && ev.target.closest('tr');
                        if (!tr) return;
                        const coin = tr.dataset && tr.dataset.coin ? tr.dataset.coin : (tr.cells && tr.cells[0] ? tr.cells[0].textContent.trim() : null);
                        if (!coin) return;
                        const data = coinDataMap[coin] || null;
                        // If data is present, show insight tab; otherwise try fallback
                        showInsightTab(coin, data || {});
                    } catch (e) { /* swallow */ }
                }, { passive: true });
            }
        } catch (e) { console.warn('Delegated click wiring failed', e); }

        // Lightweight debug click logger: when clicking inside the summary table area,
        // log the actual event.target and the element at the click coordinates (elementFromPoint).
        // This helps detect invisible overlays or other elements intercepting clicks.
        try {
            document.addEventListener('click', function _dbgClickLogger(ev) {
                try {
                    const summaryEl = document.getElementById('summaryBody');
                    if (!summaryEl) return;
                    const rect = summaryEl.getBoundingClientRect();
                    // only log clicks that occur within the bounding box of the summary table
                    if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
                        const target = ev.target;
                        const atPoint = document.elementFromPoint(ev.clientX, ev.clientY);
                        // Log useful identifying info
                        console.log('[DBG_CLICK] client:', ev.clientX, ev.clientY, 'target:', target, 'tag:', target.tagName, 'classes:', target.className);
                        console.log('[DBG_CLICK] elementFromPoint:', atPoint, 'tag:', atPoint && atPoint.tagName, 'classes:', atPoint && atPoint.className);
                        // If elementFromPoint is not contained inside the summary table, warn
                        if (atPoint && !summaryEl.contains(atPoint)) {
                            console.warn('[DBG_CLICK] Click inside summary bounds but top element is outside summary — possible overlay blocking clicks', atPoint);
                        }
                    }
                } catch (e) { /* swallow */ }
            }, true);
        } catch (e) { /* ignore in old browsers */ }
        // track which coins we've logged (to avoid noisy logs)
        const loggedCoins = new Set();
        const eventWatchBuffer = window._eventWatchBuffer || (window._eventWatchBuffer = []);

        function onWsOpen() {
            console.log("WebSocket connected.");
            try { const el = document.getElementById('loading'); if (el) el.style.display = 'none'; } catch (e) { }
        }

        function onWsMessage(event) {
            const raw = JSON.parse(event.data);
            const coin = raw.coin; // Extract the coin from data
            // store last raw message and coin for UI inspection
            try { window._lastWsRaw = raw; window._lastReceivedCoin = coin; } catch (e) { }
            if (!coin) return; // If there's no coin, skip
            const prevCoinData = coinDataMap[coin] || null;
            const prevAnalytics = prevCoinData && prevCoinData._analytics ? prevCoinData._analytics : null;

            // Debug: log keys and 24h-related fields once per coin (helps find naming mismatches)
            if (!loggedCoins.has(coin)) {
                try {
                    // console.log('[WS] Received keys for', coin, Object.keys(raw));
                } catch (e) { console.error('Logging error', e); }
                loggedCoins.add(coin);
            }

            // Keep only fields that are used by the table to reduce noise
            const keep = [
                // core
                'coin', 'last', 'percent_change', 'open', 'previous', 'high', 'low', 'update_time', 'update_time_VOLCOIN', 'update_time_FREQCOIN',
                // percent/durability fields (various names)
                'percent_vol_buy_1min', 'percent_vol_buy_5min', 'percent_vol_buy_10min', 'percent_vol_buy_15min', 'percent_vol_buy_20min', 'percent_vol_buy_30min', 'percent_vol_buy_60min', 'percent_vol_buy_120min',
                'percent_vol_sell_1min', 'percent_vol_sell_5min', 'percent_vol_sell_10min', 'percent_vol_sell_15min', 'percent_vol_sell_20min', 'percent_vol_sell_30min', 'percent_vol_sell_60min', 'percent_vol_sell_120min',
                'percent_sum_VOL_minute_120_buy', 'percent_sum_VOL_overall_buy',
                // 2h / 120min totals
                'count_VOL_minute_120_buy', 'count_VOL_minute_120_sell', 'vol_buy_2JAM', 'vol_sell_2JAM', 'vol_buy_120MENIT', 'vol_sell_120MENIT',
                // 24h
                'count_VOL_minute_1440_buy', 'count_VOL_minute_1440_sell', 'vol_buy_24JAM', 'vol_sell_24JAM', 'vol_buy_24jam', 'vol_sell_24jam', 'vol_buy_24h', 'vol_sell_24h', 'total_vol', 'total_vol_fiat',
                // smaller timeframes (1m,5m,10m,15m,20m,30m,60m)
                'vol_buy_1MENIT', 'vol_sell_1MENIT', 'vol_buy_5MENIT', 'vol_sell_5MENIT', 'vol_buy_10MENIT', 'vol_sell_10MENIT', 'vol_buy_15MENIT', 'vol_sell_15MENIT', 'vol_buy_20MENIT', 'vol_sell_20MENIT', 'vol_buy_30MENIT', 'vol_sell_30MENIT', 'vol_buy_1JAM', 'vol_sell_1JAM',
                // averages for timeframes
                'avg_VOLCOIN_buy_1MENIT', 'avg_VOLCOIN_sell_1MENIT', 'avg_VOLCOIN_buy_5MENIT', 'avg_VOLCOIN_sell_5MENIT', 'avg_VOLCOIN_buy_10MENIT', 'avg_VOLCOIN_sell_10MENIT', 'avg_VOLCOIN_buy_15MENIT', 'avg_VOLCOIN_sell_15MENIT', 'avg_VOLCOIN_buy_20MENIT', 'avg_VOLCOIN_sell_20MENIT', 'avg_VOLCOIN_buy_30MENIT', 'avg_VOLCOIN_sell_30MENIT', 'avg_VOLCOIN_buy_1JAM', 'avg_VOLCOIN_sell_1JAM', 'avg_VOLCOIN_buy_2JAM', 'avg_VOLCOIN_sell_2JAM', 'avg_VOLCOIN_buy_24JAM', 'avg_VOLCOIN_sell_24JAM'
            ];

            const data = {};
            for (const k of keep) {
                if (raw[k] !== undefined) data[k] = raw[k];
                // also try lowercase variants
                else if (raw[k.toLowerCase()] !== undefined) data[k] = raw[k.toLowerCase()];
            }
            // automatically keep newly introduced freq/avg/update-time fields without listing every variant
            const autoKeepPatterns = [
                /^count_freq_/i,
                /^freq_/i,
                /^avg_freqcoin_/i,
                /^update_time_(?:freq|vol)_/i
            ];
            for (const key in raw) {
                if (data[key] !== undefined || raw[key] === undefined) continue;
                if (autoKeepPatterns.some((rx) => rx.test(key))) {
                    data[key] = raw[key];
                }
            }
            // always keep coin
            data.coin = coin;

            // Compute client-side analytics (risk, ratios, deviation) for recent payload via shared helper

            // attach analytics and maintain short history for sparkline and z-scores
            try {
                data._analytics = computeAnalytics(data);
                data.risk_score = data._analytics.riskScore;
                // keep history; prefer persisted history when available
                if (!data._history || !Array.isArray(data._history) || data._history.length === 0) {
                    // try load persisted
                    const persisted = persistHistoryEnabled ? loadPersistedHistory(coin) : [];
                    data._history = (persisted && persisted.length > 0) ? persisted.slice(-MAX_HISTORY) : [];
                }
                // include frequency fields in persisted history so z-scores can be computed later
                data._history.push({
                    ts: Date.now(),
                    volBuy2h: data._analytics.volBuy2h || 0,
                    volSell2h: data._analytics.volSell2h || 0,
                    freqBuy2h: data._analytics.freqBuy2h || 0,
                    freqSell2h: data._analytics.freqSell2h || 0,
                    price: Number(data.last) || 0,
                    high: Number(data.high || data.last || 0),
                    low: Number(data.low || data.last || 0),
                    liquidity: Number(data._analytics.liquidity_avg_trade_value || 0)
                });
                if (data._history.length > MAX_HISTORY) data._history = data._history.slice(-MAX_HISTORY);
                // save (throttled)
                try { savePersistedHistory(coin, data._history); } catch (e) { }

                // --- Additional sharp insights (z-scores, persistence, divergence) ---
                try {
                    const hist = data._history.map(h => ({
                        buy: Number(h.volBuy2h || 0),
                        sell: Number(h.volSell2h || 0),
                        freqBuy: Number(h.freqBuy2h || 0),
                        freqSell: Number(h.freqSell2h || 0),
                        price: Number(h.price || 0),
                        high: Number(h.high || h.price || 0),
                        low: Number(h.low || h.price || 0),
                        liquidity: Number(h.liquidity || 0)
                    }));
                    const buySeries = hist.map(h => h.buy);
                    const sellSeries = hist.map(h => h.sell);
                    const freqBuySeries = hist.map(h => h.freqBuy);
                    const freqSellSeries = hist.map(h => h.freqSell);
                    const buyStat = meanStd(buySeries);
                    const sellStat = meanStd(sellSeries);
                    const freqBuyStat = meanStd(freqBuySeries);
                    const freqSellStat = meanStd(freqSellSeries);
                    const currBuy = data._analytics.volBuy2h || 0;
                    const currSell = data._analytics.volSell2h || 0;
                    const currFreqBuy = data._analytics.freqBuy2h || 0;
                    const currFreqSell = data._analytics.freqSell2h || 0;

                    // require a minimum number of samples and non-zero std to compute z-scores
                    const MIN_SAMPLES_FOR_Z = 6;
                    let zBuy = null, zSell = null, zFreqBuy = null, zFreqSell = null;
                    if (buySeries.length >= MIN_SAMPLES_FOR_Z && buyStat.std > 0) {
                        zBuy = (currBuy - buyStat.mean) / buyStat.std;
                    }
                    if (sellSeries.length >= MIN_SAMPLES_FOR_Z && sellStat.std > 0) {
                        zSell = (currSell - sellStat.mean) / sellStat.std;
                    }
                    if (freqBuySeries.length >= MIN_SAMPLES_FOR_Z && freqBuyStat.std > 0) {
                        zFreqBuy = (currFreqBuy - freqBuyStat.mean) / freqBuyStat.std;
                    }
                    if (freqSellSeries.length >= MIN_SAMPLES_FOR_Z && freqSellStat.std > 0) {
                        zFreqSell = (currFreqSell - freqSellStat.mean) / freqSellStat.std;
                    }

                    // persistence: count of last 3 points where buy > mean+std, only when stats meaningful
                    const lastN = 3;
                    let persistBuy = null, persistFreqBuy = null;
                    if (buySeries.length >= lastN && buyStat.std > 0) {
                        const recent = buySeries.slice(Math.max(0, buySeries.length - lastN));
                        persistBuy = recent.filter(v => v > (buyStat.mean + buyStat.std)).length;
                    }
                    if (freqBuySeries.length >= lastN && freqBuyStat.std > 0) {
                        const recentF = freqBuySeries.slice(Math.max(0, freqBuySeries.length - lastN));
                        persistFreqBuy = recentF.filter(v => v > (freqBuyStat.mean + freqBuyStat.std)).length;
                    }

                    // divergence: price down but buy durability high
                    const pctChange = Number(data.percent_change) || (data.last && data.previous ? ((Number(data.last) - Number(data.previous)) / Number(data.previous)) * 100 : 0);
                    const volDur2h = data._analytics.volDurability2h_percent || 0;
                    let divergence = null;
                    if (pctChange < -0.5 && volDur2h >= 60 && zBuy > 1) divergence = 'Bullish divergence: price down while buy durability & volume surge';
                    else if (pctChange > 0.5 && volDur2h <= 40 && zSell > 1) divergence = 'Bearish divergence: price up but sell pressure increasing';

                    data._analytics.zScoreBuy2h = (zBuy === null || zBuy === undefined) ? undefined : Number(zBuy.toFixed(2));
                    data._analytics.zScoreSell2h = (zSell === null || zSell === undefined) ? undefined : Number(zSell.toFixed(2));
                    data._analytics.zScoreFreqBuy2h = (zFreqBuy === null || zFreqBuy === undefined) ? undefined : Number(zFreqBuy.toFixed(2));
                    data._analytics.zScoreFreqSell2h = (zFreqSell === null || zFreqSell === undefined) ? undefined : Number(zFreqSell.toFixed(2));
                    data._analytics.persistenceBuy3 = (persistBuy === null || persistBuy === undefined) ? undefined : persistBuy; // 0..3 or undefined
                    data._analytics.persistenceFreqBuy3 = (persistFreqBuy === null || persistFreqBuy === undefined) ? undefined : persistFreqBuy;
                    data._analytics.divergence = divergence;

                    // sharp insight summary
                    let sharp = [];
                    if (zBuy >= 2 && persistBuy >= 2) sharp.push('Strong buy momentum (z>=2 & persistent)');
                    if (zFreqBuy >= 2 && persistFreqBuy >= 2) sharp.push('Strong trade-frequency surge (freq z>=2 & persistent)');
                    if (zBuy >= 1.5 && volDur2h >= 60) sharp.push('Elevated buy interest vs history');
                    if (divergence) sharp.push(divergence);
                    if (sharp.length === 0) sharp.push('No strong anomalies detected');
                    data._analytics.sharpInsights = sharp;
                    const meaningful = sharp.filter(s => s && !/No strong anomalies detected/i.test(s));
                    try {
                        if (meaningful.length > 0) {
                            eventWatchBuffer.push({ ts: Date.now(), coin, type: 'insight', messages: meaningful.slice(0, 3) });
                            if (eventWatchBuffer.length > 200) eventWatchBuffer.splice(0, eventWatchBuffer.length - 200);
                        }
                    } catch (e) { console.warn('event buffer push failed', e); }
                    // trigger alert if sharp insights are meaningful
                    try {
                        if (meaningful.length > 0) {
                            const now = Date.now();
                            const last = lastAlertAt[coin] || 0;
                            // throttle per coin: 60s
                            if (now - last > 60 * 1000) {
                                lastAlertAt[coin] = now;
                                const title = `${coin} — Alert`;
                                const msg = meaningful.join(' • ');
                                showAlertBanner(title, msg, 'warning', 10000);
                                // send webhook if configured
                                sendAlertWebhook(coin, { insights: meaningful, ts: now });
                            }
                        }
                    } catch (e) { console.warn('alert trigger error', e); }

                    const a = data._analytics || {};
                    const priceNow = Number(data.last) || 0;
                    const pricePrev = Number(data.previous) || priceNow;
                    const priceChangePct = Number.isFinite(pctChange) ? pctChange : (pricePrev ? ((priceNow - pricePrev) / pricePrev) * 100 : 0);
                    const volDiff2h = (a.volBuy2h || 0) - (a.volSell2h || 0);
                    const totalVol2h = (a.volBuy2h || 0) + (a.volSell2h || 0);
                    const totalFreq2h = (a.freqBuy2h || 0) + (a.freqSell2h || 0);
                    const priceSeries = hist.map(h => Number(h.price) || 0).filter(v => v > 0);
                    const priceStat = priceSeries.length ? meanStd(priceSeries) : { mean: 0, std: 0 };
                    const priceZ = (priceSeries.length >= MIN_SAMPLES_FOR_Z && priceStat.std > 0 && priceNow)
                        ? Number(((priceNow - priceStat.mean) / priceStat.std).toFixed(2)) : 0;
                    a.priceZScore = priceZ;
                    let atr14 = 0;
                    try {
                        const atrSeries = hist.map(point => ({ high: point.high || point.price || 0, low: point.low || point.price || 0, price: point.price || 0 }));
                        atr14 = (atrSeries.length && typeof computeATR === 'function') ? computeATR(atrSeries, 14) : 0;
                    } catch (atrErr) { atr14 = 0; }
                    a.atr14 = Number.isFinite(atr14) ? Number(atr14) : 0;
                    const currentLiquidity = Number(a.liquidity_avg_trade_value || 0);
                    const liquiditySamples = hist.slice(Math.max(0, hist.length - 6), hist.length - 1).map(h => Number(h.liquidity || 0)).filter(v => v > 0);
                    const avgPrevLiquidity = liquiditySamples.length ? (liquiditySamples.reduce((sum, v) => sum + v, 0) / liquiditySamples.length) : 0;
                    a.liquidityShockIndex = avgPrevLiquidity > 0 ? (currentLiquidity / avgPrevLiquidity) : 1;
                    a.rangeCompressionIndex = (a.atr14 > 0 && a.priceRange24h > 0) ? a.atr14 / a.priceRange24h : 0;
                    a.flowStrengthIndex = (a.atr14 > 0 && priceNow > 0) ? (volDiff2h / (a.atr14 * priceNow)) : 0;
                    a.impactAdjustedOrderFlow = (a.atr14 > 0) ? (volDiff2h * ((priceNow - pricePrev) / Math.max(a.atr14, 1e-6))) : 0;
                    a.flowVolatilityRatio = (a.atr14 > 0 && priceNow > 0) ? (Math.abs(volDiff2h) / (a.atr14 * priceNow)) : 0;
                    a.liquidityHeatRisk = (a.atr14 > 0 && totalVol2h > 0) ? (a.atr14 / totalVol2h) : (a.atr14 || 0);
                    a.orderFlowStabilityIndex = _tanh((((zBuy || 0) + (zFreqBuy || 0)) / 2) || 0);
                    a.orderFlowStabilityIndexSell = _tanh((((zSell || 0) + (zFreqSell || 0)) / 2) || 0);
                    const smoothAboveMean = (series, stat) => {
                        const last5 = series.slice(-5);
                        if (!last5.length || !stat || stat.std <= 0) return 0;
                        let hits = 0;
                        for (const val of last5) {
                            const z = (val - stat.mean) / stat.std;
                            if (z > 1) hits++;
                        }
                        return hits / last5.length;
                    };
                    a.persistenceBuySmooth = smoothAboveMean(buySeries, buyStat);
                    a.persistenceFreqSmooth = smoothAboveMean(freqBuySeries, freqBuyStat);
                    a.zWeightedPressure = _tanh(((((zBuy || 0) + (zFreqBuy || 0)) - ((zSell || 0) + (zFreqSell || 0))) / 4) || 0);
                    const prevImbalance = prevAnalytics && Number.isFinite(prevAnalytics.volImbalance2h) ? prevAnalytics.volImbalance2h : 0;
                    a.tradeImbalanceMomentum = a.volImbalance2h - prevImbalance;
                    const prevCps = prevAnalytics && Number.isFinite(prevAnalytics.cumulativePressure) ? prevAnalytics.cumulativePressure : 0;
                    a.cumulativePressure = prevCps + volDiff2h;
                    const priceSign = priceChangePct === 0 ? 0 : (priceChangePct > 0 ? 1 : -1);
                    const flowSign = volDiff2h === 0 ? 0 : (volDiff2h > 0 ? 1 : -1);
                    a.priceFlowConflictIndex = (priceSign && flowSign) ? priceSign * -flowSign : 0;
                    a.priceEfficiencyIndex = totalVol2h > 0 ? Math.abs(priceChangePct) / Math.max(totalVol2h, 1) : 0;
                    const denomVfd = Math.abs(a.priceZScore || 0) > 0.25 ? Math.abs(a.priceZScore || 0) : 0.25;
                    a.volumeFlowDivergence = ((zBuy || 0) - (zSell || 0)) / denomVfd;
                    a.smartMoneyDivergence = (a.zWeightedPressure || 0) - (a.priceZScore || 0);
                    const prevZBuy = (buySeries.length >= 2 && buyStat.std > 0) ? ((buySeries[buySeries.length - 2] - buyStat.mean) / buyStat.std) : 0;
                    const prevZFreqBuy = (freqBuySeries.length >= 2 && freqBuyStat.std > 0) ? ((freqBuySeries[freqBuySeries.length - 2] - freqBuyStat.mean) / freqBuyStat.std) : 0;
                    a.trendVelocityVol = Number.isFinite(zBuy) && Number.isFinite(prevZBuy) ? Number((zBuy - prevZBuy).toFixed(2)) : 0;
                    a.trendVelocityFreq = Number.isFinite(zFreqBuy) && Number.isFinite(prevZFreqBuy) ? Number((zFreqBuy - prevZFreqBuy).toFixed(2)) : 0;
                    const velocityFactor = (Number(a.trendVelocityVol || 0) + Number(a.trendVelocityFreq || 0)) / 2;
                    const persistenceSmooth = a.persistenceBuySmooth || 0;
                    const fbi = a.freqBurstBuy || 0;
                    const cohesion = a.multiTfCohesion || 0;
                    const accVol = a.volumeAcceleration || 0;
                    const fvr = a.flowVolatilityRatio || 0;
                    a.compositeInstitutionalSignal = (0.25 * cohesion) + (0.20 * accVol) + (0.15 * fbi) + (0.15 * (a.zWeightedPressure || 0)) + (0.10 * fvr) + (0.07 * velocityFactor) + (0.08 * persistenceSmooth);
                    const stabilityWindow = hist.slice(-10);
                    let stabilityScore = 0;
                    let stabilityCount = 0;
                    for (const point of stabilityWindow) {
                        const tot = (point.buy || 0) + (point.sell || 0);
                        if (tot <= 0) continue;
                        stabilityScore += Math.sign((point.buy || 0) - (point.sell || 0));
                        stabilityCount++;
                    }
                    a.directionalStabilityScore = stabilityCount ? (stabilityScore / stabilityCount) : 0;
                    a.freqRatio2h_percent = totalFreq2h > 0 ? (a.freqBuy2h / totalFreq2h) * 100 : 0;
                    a.flowToVolatilityRatio = a.flowVolatilityRatio;
                } catch (e) { console.error('analytics extras error', e); }

            } catch (e) { data._analytics = {}; data.risk_score = 0; }

            // Derive percent_sum_VOL_* fields from volume / avg if backend didn't provide them (localGetNumeric lives in analytics-formulas.js).

            const timeframeMap = [
                { pctKey: 'percent_sum_VOL_minute1_buy', volKeys: ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1m'], avgKeys: ['avg_VOLCOIN_buy_1MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_5_buy', volKeys: ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5m'], avgKeys: ['avg_VOLCOIN_buy_5MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_10_buy', volKeys: ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10m'], avgKeys: ['avg_VOLCOIN_buy_10MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_15_buy', volKeys: ['count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m'], avgKeys: ['avg_VOLCOIN_buy_15MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_20_buy', volKeys: ['count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m'], avgKeys: ['avg_VOLCOIN_buy_20MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_30_buy', volKeys: ['count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m'], avgKeys: ['avg_VOLCOIN_buy_30MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_60_buy', volKeys: ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT'], avgKeys: ['avg_VOLCOIN_buy_1JAM', 'avg_VOLCOIN_buy_60MENIT'] },
                { pctKey: 'percent_sum_VOL_minute_120_buy', volKeys: ['count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT'], avgKeys: ['avg_VOLCOIN_buy_2JAM', 'avg_VOLCOIN_buy_120MENIT'] },
                { pctKey: 'percent_sum_VOL_overall_buy', volKeys: ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24h'], avgKeys: ['avg_VOLCOIN_buy_24JAM'] }
            ];

            for (const tf of timeframeMap) {
                // if backend already provided a value, skip
                if (data[tf.pctKey] !== undefined && data[tf.pctKey] !== null) continue;
                const volBuy = localGetNumeric(data, ...tf.volKeys);
                const avgBuy = localGetNumeric(data, ...tf.avgKeys);
                // If avg present and >0, compute vol/avg*100; else fallback to buy/(buy+sell)*100 when possible
                let pct = 0;
                if (avgBuy > 0) {
                    pct = Math.round((volBuy / avgBuy) * 100);
                } else {
                    // try compute by proportion of buy vs total
                    const volSellKeyGuess = tf.volKeys.map(k => k.replace(/buy/i, 'sell'));
                    const volSell = localGetNumeric(data, ...volSellKeyGuess, 'count_VOL_minute_120_sell');
                    const total = (volBuy || 0) + (volSell || 0);
                    pct = total > 0 ? Math.round((volBuy / total) * 100) : 0;
                }
                data[tf.pctKey] = pct;
            }

            // Store sanitized data by coin
            coinDataMap[coin] = data;

            // Evaluate alert rules for this incoming data (non-blocking)
            try { if (typeof evaluateAlertRulesForData === 'function') evaluateAlertRulesForData(data); } catch (e) { console.warn('evaluateAlertRules call failed', e); }

            scheduleUpdateTable(); // Update table after receiving new data (debounced)
        };

        // onclose/onerror are handled when a socket is (re)created via attachHandlers

        // Function to update table based on filter, row limit, and sort order (relies on shared getNumeric helper).

        // Recommendation engine: normalized, z-score aware, with per-coin cooldown and logging (calculateRecommendation lives in analytics-formulas.js)

        const MAX_ADV_SORT_CRITERIA = 5;
        const defaultAdvancedSortState = () => ({
            enabled: false,
            criteria: [],
            filters: {
                flow: null,
                durability: null,
                priceWindow: null
            }
        });
        let advancedSortState = defaultAdvancedSortState();
        let advancedSortDraft = null;

        function toggleBaseSortControls(disabled) {
            try {
                if (sortBySelect) {
                    sortBySelect.disabled = !!disabled;
                    sortBySelect.classList.toggle('opacity-50', !!disabled);
                }
                if (sortOrderRadios) {
                    for (const r of sortOrderRadios) {
                        if (r) r.disabled = !!disabled;
                    }
                }
            } catch (e) { }
        }

        function updateAdvancedSortStatusUI() {
            if (!advancedSortStatus) return;
            if (advancedSortState.enabled) {
                const sortCount = advancedSortState.criteria ? advancedSortState.criteria.length : 0;
                const filterCount = ['flow', 'durability', 'priceWindow']
                    .filter((key) => advancedSortState.filters && advancedSortState.filters[key])
                    .length;
                const descriptor = [];
                descriptor.push(`${sortCount} sort`);
                if (filterCount) descriptor.push(`${filterCount} filter`);
                advancedSortStatus.textContent = `ON • ${descriptor.join(' + ')}`;
                advancedSortStatus.className = 'badge bg-warning text-dark';
                if (advancedSortHint) advancedSortHint.textContent = 'Advanced sort aktif: prioritas multilayer & filter diterapkan.';
                if (disableAdvancedSortBtn) disableAdvancedSortBtn.classList.remove('d-none');
                toggleBaseSortControls(true);
            } else {
                advancedSortStatus.textContent = 'OFF';
                advancedSortStatus.className = 'badge bg-secondary';
                if (advancedSortHint) advancedSortHint.textContent = 'Pilih beberapa kategori untuk prioritas sorting + filter tambahan.';
                if (disableAdvancedSortBtn) disableAdvancedSortBtn.classList.add('d-none');
                toggleBaseSortControls(false);
            }
        }

        function cloneState(obj) {
            try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return defaultAdvancedSortState(); }
        }

        function ensureAdvancedSortDraft() {
            if (!advancedSortDraft) {
                advancedSortDraft = cloneState(advancedSortState);
                if (!advancedSortDraft.criteria || !Array.isArray(advancedSortDraft.criteria)) advancedSortDraft.criteria = [];
                if (!advancedSortDraft.filters) advancedSortDraft.filters = { flow: null, durability: null, priceWindow: null };
                if (!advancedSortDraft.criteria.length) {
                    advancedSortDraft.criteria.push({ metric: sortBySelect ? sortBySelect.value : 'vol_ratio', order: getSortOrderValue() });
                }
            }
        }

        function renderAdvancedSortRows() {
            if (!advancedSortCriteriaContainer) return;
            ensureAdvancedSortDraft();
            advancedSortCriteriaContainer.innerHTML = '';
            advancedSortDraft.criteria = advancedSortDraft.criteria.slice(0, MAX_ADV_SORT_CRITERIA);
            advancedSortDraft.criteria.forEach((criterion, index) => {
                advancedSortCriteriaContainer.appendChild(buildAdvancedSortRow(criterion, index));
            });
            if (!advancedSortDraft.criteria.length) {
                const empty = document.createElement('div');
                empty.className = 'text-white-50 small';
                empty.textContent = 'Belum ada kriteria. Tambahkan minimal satu untuk mengaktifkan advanced sort.';
                advancedSortCriteriaContainer.appendChild(empty);
            }
        }

        function buildAdvancedSortRow(criterion, index) {
            const row = document.createElement('div');
            row.className = 'advanced-sort-row d-flex flex-wrap align-items-center gap-2 mb-2';
            const badge = document.createElement('span');
            badge.className = 'badge bg-secondary';
            badge.textContent = `#${index + 1}`;
            row.appendChild(badge);

            const metricSelect = document.createElement('select');
            metricSelect.className = 'form-select form-select-sm flex-grow-1';
            if (sortBySelect) metricSelect.innerHTML = sortBySelect.innerHTML;
            metricSelect.value = (criterion && criterion.metric) || (sortBySelect ? sortBySelect.value : 'vol_ratio');
            metricSelect.addEventListener('change', () => {
                if (criterion) criterion.metric = metricSelect.value;
            });
            row.appendChild(metricSelect);

            const orderSelect = document.createElement('select');
            orderSelect.className = 'form-select form-select-sm';
            orderSelect.innerHTML = '<option value="desc">Descending ⬇️</option><option value="asc">Ascending ⬆️</option>';
            orderSelect.value = (criterion && criterion.order === 'asc') ? 'asc' : 'desc';
            orderSelect.addEventListener('change', () => {
                if (criterion) criterion.order = orderSelect.value;
            });
            row.appendChild(orderSelect);

            const upBtn = document.createElement('button');
            upBtn.type = 'button';
            upBtn.className = 'btn btn-sm btn-outline-light';
            upBtn.textContent = '⬆️';
            upBtn.disabled = index === 0;
            upBtn.addEventListener('click', () => {
                if (index === 0) return;
                const tmp = advancedSortDraft.criteria[index - 1];
                advancedSortDraft.criteria[index - 1] = advancedSortDraft.criteria[index];
                advancedSortDraft.criteria[index] = tmp;
                renderAdvancedSortRows();
            });
            row.appendChild(upBtn);

            const downBtn = document.createElement('button');
            downBtn.type = 'button';
            downBtn.className = 'btn btn-sm btn-outline-light';
            downBtn.textContent = '⬇️';
            downBtn.disabled = index === advancedSortDraft.criteria.length - 1;
            downBtn.addEventListener('click', () => {
                if (index >= advancedSortDraft.criteria.length - 1) return;
                const tmp = advancedSortDraft.criteria[index + 1];
                advancedSortDraft.criteria[index + 1] = advancedSortDraft.criteria[index];
                advancedSortDraft.criteria[index] = tmp;
                renderAdvancedSortRows();
            });
            row.appendChild(downBtn);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn-sm btn-outline-danger';
            removeBtn.textContent = '🗑';
            removeBtn.addEventListener('click', () => {
                advancedSortDraft.criteria.splice(index, 1);
                if (!advancedSortDraft.criteria.length) {
                    advancedSortDraft.criteria.push({ metric: sortBySelect ? sortBySelect.value : 'vol_ratio', order: getSortOrderValue() });
                }
                renderAdvancedSortRows();
            });
            row.appendChild(removeBtn);

            return row;
        }

        function syncAdvancedFilterVisibility() {
            if (advFilterFlowControls && advFilterFlowToggle) {
                advFilterFlowControls.classList.toggle('d-none', !advFilterFlowToggle.checked);
            }
            if (advFilterDurControls && advFilterDurToggle) {
                advFilterDurControls.classList.toggle('d-none', !advFilterDurToggle.checked);
            }
            if (advFilterPriceControls && advFilterPriceToggle) {
                advFilterPriceControls.classList.toggle('d-none', !advFilterPriceToggle.checked);
            }
        }

        function hydrateAdvancedFilterControlsFromDraft() {
            ensureAdvancedSortDraft();
            const filters = advancedSortDraft.filters || {};
            if (advFilterFlowToggle) {
                const flow = filters.flow;
                advFilterFlowToggle.checked = !!flow;
                if (advFilterFlowMetric && flow && flow.metric) advFilterFlowMetric.value = flow.metric;
                if (advFilterFlowComparator && flow && flow.comparator) advFilterFlowComparator.value = flow.comparator;
                if (advFilterFlowValue) advFilterFlowValue.value = (flow && flow.value !== undefined) ? flow.value : '';
            }
            if (advFilterDurToggle) {
                const dur = filters.durability;
                advFilterDurToggle.checked = !!dur;
                if (advFilterDurMetric && dur && dur.metric) advFilterDurMetric.value = dur.metric;
                if (advFilterDurComparator && dur && dur.comparator) advFilterDurComparator.value = dur.comparator;
                if (advFilterDurValue) advFilterDurValue.value = (dur && dur.value !== undefined) ? dur.value : '';
            }
            if (advFilterPriceToggle) {
                const win = filters.priceWindow;
                advFilterPriceToggle.checked = !!win;
                if (advFilterPriceMin) advFilterPriceMin.value = (win && win.min !== undefined) ? win.min : '';
                if (advFilterPriceMax) advFilterPriceMax.value = (win && win.max !== undefined) ? win.max : '';
            }
            syncAdvancedFilterVisibility();
        }

        function buildFiltersFromInputs() {
            const filters = { flow: null, durability: null, priceWindow: null };
            if (advFilterFlowToggle && advFilterFlowToggle.checked && advFilterFlowValue) {
                const flowValue = Number(advFilterFlowValue.value);
                if (Number.isFinite(flowValue)) {
                    filters.flow = {
                        metric: (advFilterFlowMetric && advFilterFlowMetric.value) || 'vol_ratio',
                        comparator: (advFilterFlowComparator && advFilterFlowComparator.value) === '<=' ? '<=' : '>=',
                        value: flowValue
                    };
                }
            }
            if (advFilterDurToggle && advFilterDurToggle.checked && advFilterDurValue) {
                const durValue = Number(advFilterDurValue.value);
                if (Number.isFinite(durValue)) {
                    filters.durability = {
                        metric: (advFilterDurMetric && advFilterDurMetric.value) || 'vol_durability',
                        comparator: (advFilterDurComparator && advFilterDurComparator.value) === '<=' ? '<=' : '>=',
                        value: durValue
                    };
                }
            }
            if (advFilterPriceToggle && advFilterPriceToggle.checked) {
                let minVal = advFilterPriceMin ? Number(advFilterPriceMin.value) : NaN;
                let maxVal = advFilterPriceMax ? Number(advFilterPriceMax.value) : NaN;
                if (!Number.isFinite(minVal)) minVal = 0;
                if (!Number.isFinite(maxVal)) maxVal = 100;
                if (minVal > maxVal) {
                    const temp = minVal;
                    minVal = maxVal;
                    maxVal = temp;
                }
                filters.priceWindow = { min: minVal, max: maxVal };
            }
            return filters;
        }

        function resetAdvancedSortState() {
            advancedSortState = defaultAdvancedSortState();
            advancedSortDraft = null;
            updateAdvancedSortStatusUI();
        }

        if (advancedSortModalEl) {
            advancedSortModalEl.addEventListener('show.bs.modal', () => {
                advancedSortDraft = cloneState(advancedSortState);
                if (!advancedSortDraft.criteria || !advancedSortDraft.criteria.length) {
                    advancedSortDraft.criteria = [{ metric: sortBySelect ? sortBySelect.value : 'vol_ratio', order: getSortOrderValue() }];
                }
                if (!advancedSortDraft.filters) advancedSortDraft.filters = { flow: null, durability: null, priceWindow: null };
                renderAdvancedSortRows();
                hydrateAdvancedFilterControlsFromDraft();
            });
            advancedSortModalEl.addEventListener('hidden.bs.modal', () => {
                advancedSortDraft = null;
            });
        }

        if (addAdvancedSortRowBtn) {
            addAdvancedSortRowBtn.addEventListener('click', () => {
                ensureAdvancedSortDraft();
                if (advancedSortDraft.criteria.length >= MAX_ADV_SORT_CRITERIA) {
                    try { showAlertBanner && showAlertBanner('Limit reached', 'Maksimal 5 kriteria sort.', 'warning', 2000); } catch (e) { }
                    return;
                }
                advancedSortDraft.criteria.push({ metric: sortBySelect ? sortBySelect.value : 'vol_ratio', order: getSortOrderValue() });
                renderAdvancedSortRows();
            });
        }

        if (clearAdvancedSortBtn) {
            clearAdvancedSortBtn.addEventListener('click', () => {
                advancedSortDraft = defaultAdvancedSortState();
                advancedSortDraft.criteria = [{ metric: sortBySelect ? sortBySelect.value : 'vol_ratio', order: getSortOrderValue() }];
                renderAdvancedSortRows();
                hydrateAdvancedFilterControlsFromDraft();
            });
        }

        if (applyAdvancedSortBtn) {
            applyAdvancedSortBtn.addEventListener('click', () => {
                ensureAdvancedSortDraft();
                const sanitizedCriteria = (advancedSortDraft.criteria || [])
                    .filter((c) => c && c.metric)
                    .slice(0, MAX_ADV_SORT_CRITERIA)
                    .map((c) => ({ metric: c.metric, order: c.order === 'asc' ? 'asc' : 'desc' }));
                const filters = buildFiltersFromInputs();
                advancedSortState.criteria = sanitizedCriteria;
                advancedSortState.filters = filters;
                advancedSortState.enabled = Boolean(sanitizedCriteria.length) || Boolean(filters.flow || filters.durability || filters.priceWindow);
                updateAdvancedSortStatusUI();
                scheduleUpdateTable();
                try {
                    const modalInstance = bootstrap.Modal.getInstance(advancedSortModalEl);
                    if (modalInstance) modalInstance.hide();
                } catch (e) { }
            });
        }

        if (disableAdvancedSortBtn) {
            disableAdvancedSortBtn.addEventListener('click', () => {
                resetAdvancedSortState();
                scheduleUpdateTable();
            });
        }

        if (advFilterFlowToggle) advFilterFlowToggle.addEventListener('change', syncAdvancedFilterVisibility);
        if (advFilterDurToggle) advFilterDurToggle.addEventListener('change', syncAdvancedFilterVisibility);
        if (advFilterPriceToggle) advFilterPriceToggle.addEventListener('change', syncAdvancedFilterVisibility);
        syncAdvancedFilterVisibility();
        updateAdvancedSortStatusUI();

        // Quick sort function for popular metrics
        function quickSort(criteria) {
            resetAdvancedSortState();
            document.getElementById('sortBy').value = criteria;
            scheduleUpdateTable();

            // Show success message using Alerts tab banner instead of SweetAlert
            try {
                showAlertBanner('Sorted!', `Table sorted by ${criteria.replace('_', ' ').toUpperCase()}`, 'info', 1500);
            } catch (e) {
                console.log('Alert banner failed', e);
            }
        }

        const ADV_COMPARATOR_TOLERANCE = 1e-9;
        function normalizeComparatorValue(raw, fallback = '>') {
            const val = (raw || '').toString().trim();
            if (val === '>' || val === '<' || val === '=') return val;
            if (val === '>=' || val.toLowerCase() === 'gte') return '>';
            if (val === '<=' || val.toLowerCase() === 'lte') return '<';
            if (val.toLowerCase() === 'eq') return '=';
            return fallback;
        }
        function compareWithComparator(value, comparator, target) {
            const comp = normalizeComparatorValue(comparator);
            const val = Number(value);
            const threshold = Number(target);
            const v = Number.isFinite(val) ? val : 0;
            const t = Number.isFinite(threshold) ? threshold : 0;
            switch (comp) {
                case '<':
                    return v < t;
                case '=':
                    return Math.abs(v - t) <= ADV_COMPARATOR_TOLERANCE;
                case '>':
                default:
                    return v > t;
            }
        }

        function updateTable() {
            summaryBody.innerHTML = '';
            volBody.innerHTML = '';
            if (volRatioBody) volRatioBody.innerHTML = '';
            if (recsBody) recsBody.innerHTML = '';
            // clear Vol Dur table as well so row limit applies consistently
            const volDurBody = document.getElementById('volDurBody');
            if (volDurBody) volDurBody.innerHTML = '';
            if (spikeBody) spikeBody.innerHTML = '';
            if (microBody) microBody.innerHTML = '';
            const fmtNum = (val, digits = 2) => {
                const n = Number(val);
                return Number.isFinite(n) ? n.toFixed(digits) : '-';
            };
            const fmtPct = (val, digits = 1) => {
                const n = Number(val);
                return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '-';
            };
            const fmtPctFromUnit = (val, digits = 1) => {
                const n = Number(val);
                return Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : '-';
            };
            const spikeRows = []; // collect spikes across coins

            const filterText = getActiveFilterValue();
            const sortBy = sortBySelect.value;
            const sortOrder = getSortOrderValue();
            // Debugging: log current sort selection (helps diagnose if change events fire)
            // try { console.debug && console.debug('updateTable sortBy=', sortBy, 'order=', sortOrder); } catch(e) {}
            let rowCount = 0;
            // count of rows inserted into the Recommendations table (separate from coin row count)
            let recsRowCount = 0;
            // flag to indicate we've filled the requested recs rows and can stop early
            let doneRecs = false;
            const advancedSortActive = Boolean(advancedSortState && advancedSortState.enabled);
            const activeFilters = advancedSortActive ? (advancedSortState.filters || {}) : {};
            const sortPipeline = (advancedSortActive && advancedSortState.criteria && advancedSortState.criteria.length)
                ? advancedSortState.criteria
                : [{ metric: sortBy, order: sortOrder }];

            function getVolDurabilityMetric(data, timeframeKey, fallbackKeys = []) {
                const analytics = (data && data._analytics) || {};
                if (analytics.volDurabilityByTf && analytics.volDurabilityByTf[timeframeKey] !== undefined && analytics.volDurabilityByTf[timeframeKey] !== null) {
                    return Number(analytics.volDurabilityByTf[timeframeKey]) || 0;
                }
                if (timeframeKey === '120m' && analytics.volDurability2h_percent !== undefined && analytics.volDurability2h_percent !== null) {
                    return Number(analytics.volDurability2h_percent) || 0;
                }
                if (timeframeKey === '24h' && analytics.volDurability24h_percent !== undefined && analytics.volDurability24h_percent !== null) {
                    return Number(analytics.volDurability24h_percent) || 0;
                }
                return (fallbackKeys && fallbackKeys.length) ? (getNumeric(data, ...fallbackKeys) || 0) : 0;
            }

            // Function to get sort value based on selected criteria
            function getSortValue(data, criteria) {
                // Helper: compute percent change from history when specific percent fields are missing
                function computeHistoryPercentChange(d, lookbackMs) {
                    try {
                        if (!d || !d._history || !Array.isArray(d._history) || d._history.length === 0) return 0;
                        const now = Date.now();
                        // If lookbackMs not provided, use full history range
                        if (!lookbackMs) {
                            const first = d._history[0];
                            const last = d._history[d._history.length - 1];
                            if (!first || !last || !first.price) return 0;
                            const p0 = Number(first.price) || 0;
                            const p1 = Number(last.price) || 0;
                            return p0 > 0 ? ((p1 - p0) / p0) * 100 : 0;
                        }
                        // Find the earliest point at or before now - lookbackMs
                        const cutoff = now - lookbackMs;
                        let point = null;
                        for (let i = d._history.length - 1; i >= 0; i--) {
                            if (d._history[i].ts <= cutoff) { point = d._history[i]; break; }
                        }
                        // if not found, use earliest
                        if (!point) point = d._history[0];
                        const last = d._history[d._history.length - 1];
                        const p0 = Number(point.price) || 0;
                        const p1 = Number(last.price) || 0;
                        return p0 > 0 ? ((p1 - p0) / p0) * 100 : 0;
                    } catch (e) { return 0; }
                }

                // Helper: parse lookback from criteria name (e.g., 'change_10sec_1' => 1s, 'change_5min_20' => 20min)
                function parseLookbackMs(name) {
                    try {
                        const re = /(\d+)(sec|min|jam|hour|m)/ig;
                        let match, lastMatch = null;
                        while ((match = re.exec(name)) !== null) { lastMatch = match; }
                        if (!lastMatch) {
                            // fallback: pick last number as minutes
                            const num = name.match(/(\d+)(?!.*\d)/);
                            if (num) return Number(num[0]) * 60 * 1000;
                            return null;
                        }
                        const val = Number(lastMatch[1]);
                        const unit = (lastMatch[2] || '').toLowerCase();
                        if (unit.startsWith('sec')) return val * 1000;
                        if (unit === 'min' || unit === 'm') return val * 60 * 1000;
                        if (unit === 'jam' || unit.startsWith('hour')) return val * 60 * 60 * 1000;
                        return val * 60 * 1000;
                    } catch (e) { return null; }
                }

                function computeVolRatioFor(buyAliases = [], sellAliases = [], analyticsBuyKey, analyticsSellKey) {
                    const analytics = (data && data._analytics) || {};
                    const normalize = (val) => {
                        const n = Number(val);
                        return Number.isFinite(n) ? n : 0;
                    };
                    const buyAliasesArr = Array.isArray(buyAliases) ? buyAliases : [buyAliases].filter(Boolean);
                    const sellAliasesArr = Array.isArray(sellAliases) ? sellAliases : [sellAliases].filter(Boolean);
                    let buy = normalize(getNumeric(data, ...buyAliasesArr));
                    let sell = normalize(getNumeric(data, ...sellAliasesArr));
                    if (buy === 0 && analyticsBuyKey) buy = normalize(analytics[analyticsBuyKey]);
                    if (sell === 0 && analyticsSellKey) sell = normalize(analytics[analyticsSellKey]);
                    if (sell > 0) return (buy / sell) * 100;
                    if (buy > 0) return 999;
                    return 0;
                }

                switch (criteria) {
                    // Durability
                    case 'vol_durability':
                    case 'vol_durability_120m':
                    case 'vol_durability_2h':
                    case 'vol_dur_2h':
                    case 'vol_dur_120m':
                        return getVolDurabilityMetric(data, '120m', ['percent_sum_VOL_minute_120_buy', 'percent_vol_buy_120min', 'percent_vol_buy_2jam']);
                    case 'activity_dur_2h':
                        return getNumeric(data, 'sum_minute_120_buy', 'count_VOL_minute_120_buy') || 0;

                    // Price & Change
                    case 'change':
                        return parseFloat(data.percent_change) || 0;
                    case 'price':
                        return parseFloat(data.last) || 0;
                    case 'price_position':
                        const currentPrice = parseFloat(data.last) || 0;
                        const highPrice = parseFloat(data.high) || currentPrice;
                        const lowPrice = parseFloat(data.low) || currentPrice;
                        const priceRange = highPrice - lowPrice;
                        return priceRange > 0 ? ((currentPrice - lowPrice) / priceRange) * 100 : 50;
                    case 'recommendation':
                        try {
                            if (typeof calculateRecommendation === 'function') {
                                const rec = calculateRecommendation(data, 50, null, false); // Use pure mode for sorting
                                return rec && typeof rec.score === 'number' ? rec.score : 0; // Positive = Buy bias, Negative = Sell bias
                            }
                        } catch (err) {
                            console.error('calculateRecommendation threw when sorting:', err);
                        }
                        return 0;


                    // Volume 24h
                    case 'vol_buy_24h':
                        return parseFloat(data.count_VOL_minute_1440_buy) || 0;
                    case 'vol_sell_24h':
                        return parseFloat(data.count_VOL_minute_1440_sell) || 0;
                    case 'vol_total_24h':
                        return (parseFloat(data.count_VOL_minute_1440_buy) || 0) + (parseFloat(data.count_VOL_minute_1440_sell) || 0);
                    case 'avg_vol_buy_24h':
                        return parseFloat(data.avg_VOLCOIN_buy_24HOUR) || 0;
                    case 'avg_vol_sell_24h':
                        return parseFloat(data.avg_VOLCOIN_sell_24HOUR) || 0;
                    case 'avg_vol_buy_2h':
                        return parseFloat(data.avg_VOLCOIN_buy_2HOUR) || 0;
                    case 'avg_vol_sell_2h':
                        return parseFloat(data.avg_VOLCOIN_sell_2HOUR) || 0;

                    // Volume Ratio (all timeframes)
                    case 'vol_ratio_1m':
                        return computeVolRatioFor(
                            ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1menit', 'vol_buy_1m', 'vol_buy_1min'],
                            ['count_VOL_minute1_sell', 'vol_sell_1MENIT', 'vol_sell_1menit', 'vol_sell_1m', 'vol_sell_1min']
                        );
                    case 'vol_ratio_5m':
                        return computeVolRatioFor(
                            ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5menit', 'vol_buy_5m', 'vol_buy_5min'],
                            ['count_VOL_minute_5_sell', 'vol_sell_5MENIT', 'vol_sell_5menit', 'vol_sell_5m', 'vol_sell_5min']
                        );
                    case 'vol_ratio_10m':
                        return computeVolRatioFor(
                            ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10menit', 'vol_buy_10m', 'vol_buy_10min'],
                            ['count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10menit', 'vol_sell_10m', 'vol_sell_10min']
                        );
                    case 'vol_ratio_15m':
                        return computeVolRatioFor(
                            ['count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m'],
                            ['count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m']
                        );
                    case 'vol_ratio_20m':
                        return computeVolRatioFor(
                            ['count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m'],
                            ['count_VOL_minute_20_sell', 'vol_sell_20MENIT', 'vol_sell_20m']
                        );
                    case 'vol_ratio_30m':
                        return computeVolRatioFor(
                            ['count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m'],
                            ['count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m']
                        );
                    case 'vol_ratio_1h':
                        return computeVolRatioFor(
                            ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT', 'vol_buy_60menit', 'vol_buy_60m'],
                            ['count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT', 'vol_sell_60menit', 'vol_sell_60m']
                        );
                    case 'vol_ratio':
                    case 'vol_ratio_2h':
                        return computeVolRatioFor(
                            ['count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT', 'vol_buy_2jam'],
                            ['count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT', 'vol_sell_2jam'],
                            'volBuy2h',
                            'volSell2h'
                        );
                    case 'vol_ratio_24h':
                        return computeVolRatioFor(
                            ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24jam', 'vol_buy_24h', 'vol_buy_24H'],
                            ['count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24jam', 'vol_sell_24h', 'vol_sell_24H'],
                            'volBuy24h',
                            'volSell24h'
                        );


                    // Volume 1h
                    case 'vol_buy_1h':
                        return parseFloat(data.count_VOL_minute_60_buy) || 0;
                    case 'vol_sell_1h':
                        return parseFloat(data.count_VOL_minute_60_sell) || 0;
                    case 'vol_total_1h':
                        return (parseFloat(data.count_VOL_minute_60_buy) || 0) + (parseFloat(data.count_VOL_minute_60_sell) || 0);
                    case 'avg_vol_buy_1h':
                        return parseFloat(data.avg_VOLCOIN_buy_1HOUR) || 0;
                    case 'avg_vol_sell_1h':
                        return parseFloat(data.avg_VOLCOIN_sell_1HOUR) || 0;



                    // Volume 10m
                    case 'vol_buy_10m':
                        return parseFloat(data.count_VOL_minute_10_buy) || 0;
                    case 'vol_sell_10m':
                        return parseFloat(data.count_VOL_minute_10_sell) || 0;
                    case 'vol_total_10m':
                        return (parseFloat(data.count_VOL_minute_10_buy) || 0) + (parseFloat(data.count_VOL_minute_10_sell) || 0);
                    case 'avg_vol_buy_10m':
                        return parseFloat(data.avg_VOLCOIN_buy_10MENIT) || 0;
                    case 'avg_vol_sell_10m':
                        return parseFloat(data.avg_VOLCOIN_sell_10MENIT) || 0;



                    // Volume 5m
                    case 'vol_buy_5m':
                        return parseFloat(data.count_VOL_minute_5_buy) || 0;
                    case 'vol_sell_5m':
                        return parseFloat(data.count_VOL_minute_5_sell) || 0;
                    case 'vol_total_5m':
                        return (parseFloat(data.count_VOL_minute_5_buy) || 0) + (parseFloat(data.count_VOL_minute_5_sell) || 0);
                    case 'avg_vol_buy_5m':
                        return parseFloat(data.avg_VOLCOIN_buy_5MENIT) || 0;
                    case 'avg_vol_sell_5m':
                        return parseFloat(data.avg_VOLCOIN_sell_5MENIT) || 0;



                    // Volume 30m
                    case 'vol_buy_30m':
                        return parseFloat(data.count_VOL_minute_30_buy) || 0;
                    case 'vol_sell_30m':
                        return parseFloat(data.count_VOL_minute_30_sell) || 0;
                    case 'vol_total_30m':
                        return (parseFloat(data.count_VOL_minute_30_buy) || 0) + (parseFloat(data.count_VOL_minute_30_sell) || 0);
                    case 'avg_vol_buy_30m':
                        return parseFloat(data.avg_VOLCOIN_buy_30MENIT) || 0;
                    case 'avg_vol_sell_30m':
                        return parseFloat(data.avg_VOLCOIN_sell_30MENIT) || 0;



                    // Volume 20m
                    case 'vol_buy_20m':
                        return parseFloat(data.count_VOL_minute_20_buy) || 0;
                    case 'vol_sell_20m':
                        return parseFloat(data.count_VOL_minute_20_sell) || 0;
                    case 'vol_total_20m':
                        return (parseFloat(data.count_VOL_minute_20_buy) || 0) + (parseFloat(data.count_VOL_minute_20_sell) || 0);
                    case 'avg_vol_buy_20m':
                        return parseFloat(data.avg_VOLCOIN_buy_20MENIT) || 0;
                    case 'avg_vol_sell_20m':
                        return parseFloat(data.avg_VOLCOIN_sell_20MENIT) || 0;



                    // Volume 15m
                    case 'vol_buy_15m':
                        return parseFloat(data.count_VOL_minute_15_buy) || 0;
                    case 'vol_sell_15m':
                        return parseFloat(data.count_VOL_minute_15_sell) || 0;
                    case 'vol_total_15m':
                        return (parseFloat(data.count_VOL_minute_15_buy) || 0) + (parseFloat(data.count_VOL_minute_15_sell) || 0);
                    case 'avg_vol_buy_15m':
                        return parseFloat(data.avg_VOLCOIN_buy_15MENIT) || 0;
                    case 'avg_vol_sell_15m':
                        return parseFloat(data.avg_VOLCOIN_sell_15MENIT) || 0;



                    // Volume 1m
                    case 'vol_buy_1m':
                        return parseFloat(data.count_VOL_minute1_buy) || 0;
                    case 'vol_sell_1m':
                        return parseFloat(data.count_VOL_minute1_sell) || 0;
                    case 'vol_total_1m':
                        return (parseFloat(data.count_VOL_minute1_buy) || 0) + (parseFloat(data.count_VOL_minute1_sell) || 0);
                    case 'avg_vol_buy_1m':
                        return parseFloat(data.avg_VOLCOIN_buy_1MENIT) || 0;
                    case 'avg_vol_sell_1m':
                        return parseFloat(data.avg_VOLCOIN_sell_1MENIT) || 0;

                    // Overall 24h
                    case 'activity_dur_24h':
                        return parseFloat(data.sum_overall_buy) || 0;
                    case 'vol_durability_24h':
                    case 'vol_dur_overall':
                    case 'vol_dur_24h':
                        return getVolDurabilityMetric(data, '24h', ['percent_sum_VOL_overall_buy', 'percent_vol_buy_24h']);

                    // Sum Durability
                    case 'sum_min_1_buy':
                        return parseFloat(data.sum_minute1_buy) || 0;
                    case 'sum_min_5_buy':
                        return parseFloat(data.sum_minute_5_buy) || 0;
                    case 'sum_min_10_buy':
                        return parseFloat(data.sum_minute_10_buy) || 0;
                    case 'sum_min_15_buy':
                        return parseFloat(data.sum_minute_15_buy) || 0;
                    case 'sum_min_20_buy':
                        return parseFloat(data.sum_minute_20_buy) || 0;
                    case 'sum_min_30_buy':
                        return parseFloat(data.sum_minute_30_buy) || 0;
                    case 'sum_min_60_buy':
                        return parseFloat(data.sum_minute_60_buy) || 0;
                    case 'sum_min_120_buy':
                        return parseFloat(data.sum_minute_120_buy) || 0;
                    case 'sum_overall_buy':
                        return parseFloat(data.sum_overall_buy) || 0;

                    // Volume Durability (per timeframe)
                    case 'vol_durability_1m':
                    case 'vol_dur_1m':
                        return getVolDurabilityMetric(data, '1m', ['percent_sum_VOL_minute1_buy', 'percent_vol_buy_1min', 'percent_vol_buy_1m']);
                    case 'vol_durability_5m':
                    case 'vol_dur_5m':
                        return getVolDurabilityMetric(data, '5m', ['percent_sum_VOL_minute_5_buy', 'percent_vol_buy_5min', 'percent_vol_buy_5m']);
                    case 'vol_durability_10m':
                    case 'vol_dur_10m':
                        return getVolDurabilityMetric(data, '10m', ['percent_sum_VOL_minute_10_buy', 'percent_vol_buy_10min', 'percent_vol_buy_10m']);
                    case 'vol_durability_15m':
                    case 'vol_dur_15m':
                        return getVolDurabilityMetric(data, '15m', ['percent_sum_VOL_minute_15_buy', 'percent_vol_buy_15m']);
                    case 'vol_durability_20m':
                    case 'vol_dur_20m':
                        return getVolDurabilityMetric(data, '20m', ['percent_sum_VOL_minute_20_buy', 'percent_vol_buy_20m']);
                    case 'vol_durability_30m':
                    case 'vol_dur_30m':
                        return getVolDurabilityMetric(data, '30m', ['percent_sum_VOL_minute_30_buy', 'percent_vol_buy_30m']);
                    case 'vol_durability_60m':
                    case 'vol_dur_60m':
                        return getVolDurabilityMetric(data, '60m', ['percent_sum_VOL_minute_60_buy', 'percent_vol_buy_60m', 'percent_vol_buy_1jam']);

                    // Change Variations
                    case 'change_1min_4':
                    case 'change_5min_20':
                    case 'change_10sec_1':
                    case 'change_10min_2':
                    case 'change_10sec_2':
                    case 'change_15min_2':
                    case 'change_1min_5':
                    case 'change_1jam_18':
                    case 'change_20min_2':
                    case 'change_2jam_10':
                    case 'change_30min_1':
                    case 'change_5min_25':
                        // prefer explicit backend fields if available
                        const direct = (function () {
                            const map = {
                                'change_1min_4': 'percent_change_1Min_4', 'change_5min_20': 'percent_change_5Min_20', 'change_10sec_1': 'percent_change_10Second_1', 'change_10min_2': 'percent_change_10Min_2', 'change_10sec_2': 'percent_change_10Second_2', 'change_15min_2': 'percent_change_15Min_2', 'change_1min_5': 'percent_change_1Min_5', 'change_1jam_18': 'percent_change_1jam_18', 'change_20min_2': 'percent_change_20Min_2', 'change_2jam_10': 'percent_change_2jam_10', 'change_30min_1': 'percent_change_30Min_1', 'change_5min_25': 'percent_change_5Min_25'
                            };
                            const key = map[criteria];
                            if (key && (data[key] !== undefined && data[key] !== null)) return parseFloat(data[key]) || 0;
                            // try lowercase variants
                            if (key) {
                                const lk = key.toLowerCase();
                                if (data[lk] !== undefined && data[lk] !== null) return parseFloat(data[lk]) || 0;
                            }
                            return null;
                        })();
                        if (direct !== null && direct !== undefined) return direct;
                        // fallback: compute from history; try to infer lookback from the criteria name
                        const ms = parseLookbackMs(criteria);
                        const pct = computeHistoryPercentChange(data, ms || undefined);
                        return Number(pct) || 0;

                    // Update Times (note: per-volume update_time fields are not used as a sorting/reference metric)
                    case 'update_activity':
                        return parseFloat(data.update_time_FREQ) || 0;
                    case 'update_sum':
                        return parseFloat(data.sum_update_time) || 0;
                    case 'update_general':
                        return parseFloat(data.update_time) || 0;

                    // Total Volumes
                    case 'total_vol_fiat':
                        // legacy option: prefer coin-only total instead of fiat
                        return parseFloat(data.total_vol) || 0;
                    case 'total_vol':
                        return parseFloat(data.total_vol) || 0;

                    // Delay
                    case 'delay_ms':
                        return parseFloat(data.delay_ms_aggrade) || 0;

                    default:
                        return parseFloat(data.percent_sum_VOL_minute_120_buy) || 0;
                }
            }

            function normalizedNumber(val) {
                const num = Number(val);
                return Number.isFinite(num) ? num : 0;
            }

            function passesAdvancedFiltersWrapper(data) {
                if (!advancedSortActive) return true;
                try {
                    if (activeFilters.flow && Number.isFinite(activeFilters.flow.value)) {
                        const flowVal = normalizedNumber(getSortValue(data, activeFilters.flow.metric || 'vol_ratio'));
                        if (!compareWithComparator(flowVal, activeFilters.flow.comparator, activeFilters.flow.value)) return false;
                    }
                    if (activeFilters.durability && Number.isFinite(activeFilters.durability.value)) {
                        const durVal = normalizedNumber(getSortValue(data, activeFilters.durability.metric || 'vol_dur_2h'));
                        if (!compareWithComparator(durVal, activeFilters.durability.comparator, activeFilters.durability.value)) return false;
                    }
                    if (activeFilters.priceWindow) {
                        const min = Number.isFinite(activeFilters.priceWindow.min) ? activeFilters.priceWindow.min : 0;
                        const max = Number.isFinite(activeFilters.priceWindow.max) ? activeFilters.priceWindow.max : 100;
                        const pricePos = normalizedNumber(getSortValue(data, 'price_position'));
                        if (pricePos < min || pricePos > max) return false;
                    }
                } catch (e) { return false; }
                return true;
            }

            function compareUsingPipeline(dataA, dataB) {
                for (const criterion of sortPipeline) {
                    if (!criterion || !criterion.metric) continue;
                    const order = criterion.order === 'asc' ? 'asc' : 'desc';
                    const valueA = normalizedNumber(getSortValue(dataA, criterion.metric));
                    const valueB = normalizedNumber(getSortValue(dataB, criterion.metric));
                    const diff = order === 'asc' ? (valueA - valueB) : (valueB - valueA);
                    if (diff !== 0 && Number.isFinite(diff)) return diff;
                }
                return 0;
            }

            // Convert coinDataMap to an array for sorting
            const sortedCoins = Object.entries(coinDataMap)
                .filter(([coinKey, data]) => {
                    // Filter coins based on the filter input
                    if (filterText && !coinKey.toLowerCase().includes(filterText)) return false;
                    return passesAdvancedFiltersWrapper(data);
                })
                .sort(([coinKeyA, dataA], [coinKeyB, dataB]) => {
                    const diff = compareUsingPipeline(dataA, dataB);
                    if (diff !== 0) return diff;
                    // tie-breaker: deterministic coin name order (ascending)
                    const nameCmp = coinKeyA.localeCompare(coinKeyB);
                    return nameCmp;
                });

            // Loop through sorted and filtered data
            for (const [coinKey, data] of sortedCoins) {
                if (rowCount >= rowLimit) break; // Stop if row limit is reached

                const coin = coinKey;
                const price = (data.last || 0).toFixed(4);
                const change = data.percent_change || 0;
                const volDur = getNumeric(data, 'percent_sum_VOL_minute_120_buy', 'percent_vol_buy_120min');
                const volBuy = getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT');
                const volSell = getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT');

                // Volume 24h data (support multiple field names)
                const volBuy24h = getNumeric(data, 'count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24jam', 'vol_buy_24h', 'vol_buy_24H');
                const volSell24h = getNumeric(data, 'count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24jam', 'vol_sell_24h', 'vol_sell_24H');

                // Additional data for multiple timeframes
                // activity counts removed upstream; use volume fields below

                const volBuy1m = getNumeric(data, 'count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1menit', 'vol_buy_1m', 'vol_buy_1min');
                const volSell1m = getNumeric(data, 'count_VOL_minute1_sell', 'vol_sell_1MENIT', 'vol_sell_1menit', 'vol_sell_1m', 'vol_sell_1min');
                const volBuy5m = getNumeric(data, 'count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5menit', 'vol_buy_5m', 'vol_buy_5min');
                const volSell5m = getNumeric(data, 'count_VOL_minute_5_sell', 'vol_sell_5MENIT', 'vol_sell_5menit', 'vol_sell_5m', 'vol_sell_5min');
                const volBuy10m = getNumeric(data, 'count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10menit', 'vol_buy_10m', 'vol_buy_10min');
                const volSell10m = getNumeric(data, 'count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10menit', 'vol_sell_10m', 'vol_sell_10min');
                const volBuy15m = getNumeric(data, 'count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m');
                const volSell15m = getNumeric(data, 'count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m');
                const volBuy20m = getNumeric(data, 'count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m');
                const volSell20m = getNumeric(data, 'count_VOL_minute_20_sell', 'vol_sell_20MENIT', 'vol_sell_20m');
                const volBuy30m = getNumeric(data, 'count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m');
                const volSell30m = getNumeric(data, 'count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m');
                const volBuy60m = getNumeric(data, 'count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT', 'vol_buy_60menit', 'vol_buy_60m');
                const volSell60m = getNumeric(data, 'count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT', 'vol_sell_60menit', 'vol_sell_60m');
                const volBuy2h = getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT', 'vol_buy_2jam');
                const volSell2h = getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT', 'vol_sell_2jam');

                // Populate Vol Ratio tab row for this coin (if the tab exists)
                try {
                    if (volRatioBody) {
                        const vr = volRatioBody.insertRow();
                        vr.dataset.coin = coin;

                        // Small helper: normalize various numeric formats (remove commas, percent signs)
                        const normalize = (v) => {
                            if (v === undefined || v === null) return 0;
                            if (typeof v === 'number') return v;
                            try {
                                const s = String(v).replace(/[^0-9eE+\-.]/g, '');
                                const n = parseFloat(s);
                                return Number.isFinite(n) ? n : 0;
                            } catch (e) { return 0; }
                        };

                        // Robust ratio formatter: uses normalized numbers and a fallback to analytics fields
                        const fmtRatio = (buyRaw, sellRaw, buyFallback, sellFallback) => {
                            const buy = normalize(buyRaw || buyFallback);
                            const sell = normalize(sellRaw || sellFallback);
                            if (sell > 0) return Math.round((buy / sell) * 100) + '%';
                            if (buy > 0) return '∞';
                            return '0%';
                        };

                        vr.insertCell(0).textContent = coin;
                        vr.insertCell(1).textContent = fmtRatio(volBuy1m, volSell1m, getNumeric(data, 'count_VOL_minute1_buy'), getNumeric(data, 'count_VOL_minute1_sell'));
                        vr.insertCell(2).textContent = fmtRatio(volBuy5m, volSell5m, getNumeric(data, 'count_VOL_minute_5_buy'), getNumeric(data, 'count_VOL_minute_5_sell'));
                        vr.insertCell(3).textContent = fmtRatio(volBuy10m, volSell10m, getNumeric(data, 'count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10m'), getNumeric(data, 'count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10m'));

                        vr.insertCell(4).textContent = fmtRatio(volBuy15m, volSell15m, volBuy15m, volSell15m);

                        vr.insertCell(5).textContent = fmtRatio(volBuy20m, volSell20m, volBuy20m, volSell20m);

                        vr.insertCell(6).textContent = fmtRatio(volBuy30m, volSell30m, volBuy30m, volSell30m);

                        vr.insertCell(7).textContent = fmtRatio(volBuy60m, volSell60m, getNumeric(data, 'count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT'), getNumeric(data, 'count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT'));

                        // For 2h and 24h use precomputed values (already cover multiple aliases) with analytics fallback
                        vr.insertCell(8).textContent = fmtRatio(volBuy2h, volSell2h, (data._analytics && data._analytics.volBuy2h), (data._analytics && data._analytics.volSell2h));
                        vr.insertCell(9).textContent = fmtRatio(volBuy24h, volSell24h, (data._analytics && data._analytics.volBuy24h), (data._analytics && data._analytics.volSell24h));

                        // Last Change %: parse percent strings robustly, else use history-based computation
                        const parsePercent = (v) => {
                            if (v === undefined || v === null) return null;
                            if (typeof v === 'number') return v;
                            const s = String(v).trim();
                            // remove trailing % if present
                            const cleaned = s.replace(/%/g, '');
                            const n = parseFloat(cleaned.replace(/[^0-9eE+\-.]/g, ''));
                            return Number.isFinite(n) ? n : null;
                        };

                        let lastChangeVal = null;
                        try {
                            if (data._history && Array.isArray(data._history) && data._history.length >= 2) {
                                const len = data._history.length;
                                const latest = data._history[len - 1];
                                const prev = data._history[len - 2];
                                const p0 = normalize(prev && (prev.price ?? prev.last));
                                const p1 = normalize(latest && (latest.price ?? latest.last));
                                if (p0 > 0 && p1 > 0) lastChangeVal = ((p1 - p0) / p0) * 100;
                            }
                        } catch (e) { lastChangeVal = null; }
                        if (lastChangeVal === null) lastChangeVal = parsePercent(data.percent_change);
                        if (lastChangeVal === null) {
                            lastChangeVal = parsePercent(data.percent_change_24h) ?? parsePercent(data.percent_change_1h) ?? parsePercent(data.percent_change_60m) ?? 0;
                        }

                        const lcCell = vr.insertCell(10);
                        lcCell.textContent = (Number.isFinite(lastChangeVal) ? Number(lastChangeVal.toFixed(2)) : 0) + '%';
                        lcCell.className = lastChangeVal > 0 ? 'text-success' : lastChangeVal < 0 ? 'text-danger' : 'text-muted';
                    }
                } catch (e) { console.warn('volRatio row insert failed for', coin, e); }

                // Detect spikes: compare volume vs average for multiple timeframes
                try {
                    const spikeThreshold = 2.0; // spike when vol >= spikeThreshold * avg
                    const timeframes = [
                        { label: '1m', volKeys: ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1min'], avgKeys: ['avg_VOLCOIN_buy_1MENIT', 'avg_VOLCOIN_buy_1MENIT'] },
                        { label: '5m', volKeys: ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5min'], avgKeys: ['avg_VOLCOIN_buy_5MENIT'] },
                        { label: '10m', volKeys: ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10min'], avgKeys: ['avg_VOLCOIN_buy_10MENIT'] },
                        { label: '15m', volKeys: ['vol_buy_15MENIT'], avgKeys: ['avg_VOLCOIN_buy_15MENIT'] },
                        { label: '20m', volKeys: ['vol_buy_20MENIT'], avgKeys: ['avg_VOLCOIN_buy_20MENIT'] },
                        { label: '30m', volKeys: ['vol_buy_30MENIT'], avgKeys: ['avg_VOLCOIN_buy_30MENIT'] },
                        { label: '60m', volKeys: ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT'], avgKeys: ['avg_VOLCOIN_buy_1JAM'] },
                        { label: '120m', volKeys: ['count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT'], avgKeys: ['avg_VOLCOIN_buy_2JAM'] },
                        { label: '24h', volKeys: ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24h'], avgKeys: ['avg_VOLCOIN_buy_24JAM'] }
                    ];

                    for (const tf of timeframes) {
                        const vol = getNumeric(data, ...tf.volKeys);
                        const avg = getNumeric(data, ...tf.avgKeys);
                        if (avg > 0 && vol / avg >= spikeThreshold) {
                            spikeRows.push({ coin, timeframe: tf.label, vol, avg, ratio: vol / avg, update_time: data.update_time || data.update_time_VOLCOIN || 0 });
                        }
                    }
                } catch (e) { console.error('Spike detection error', e); }

                // Helper function for durability color coding (divided into 3 equal parts)
                function getDurabilityClass(value) {
                    if (value >= 67) return 'durability-excellent';  // Top 1/3: 67-100
                    if (value >= 34) return 'durability-good';       // Middle 1/3: 34-66
                    return 'durability-poor';                       // Bottom 1/3: 0-33
                }

                // Summary row (compact) — make the entire row clickable for insights
                let row = summaryBody.insertRow();
                row.classList.add('summary-row');
                row.style.cursor = 'pointer';
                // store coin on the row for delegated clicks
                row.dataset.coin = coin;
                // Clicking anywhere on the row will open insights for the coin (delegation also set up)
                row.onclick = () => showInsightTab(coin, data);
                const coinCell = row.insertCell(0);
                coinCell.textContent = coin;
                coinCell.className = 'text-primary';
                coinCell.title = 'Click for insights';
                row.insertCell(1).textContent = price;
                let cell = row.insertCell(2);
                cell.textContent = change + '%';
                cell.className = change > 0 ? 'text-success fw-bold' : change < 0 ? 'text-danger fw-bold' : 'text-muted';

                // Price Position (scaled 0-100 from low to high)
                const currentPrice = parseFloat(data.last) || 0;
                const highPrice = parseFloat(data.high) || currentPrice;
                const lowPrice = parseFloat(data.low) || currentPrice;
                const priceRange = highPrice - lowPrice;
                const pricePosition = priceRange > 0 ? Math.round(((currentPrice - lowPrice) / priceRange) * 100) : 50;
                cell = row.insertCell(3);
                cell.textContent = pricePosition + '%';
                cell.className = getDurabilityClass(pricePosition);

                // Recommendation Algorithm
                const selectedTf = (typeof recTimeframeSelect !== 'undefined' && recTimeframeSelect && recTimeframeSelect.value) ? recTimeframeSelect.value : '120m';
                const recommendation = calculateRecommendation(data, pricePosition, selectedTf, true);
                cell = row.insertCell(4);
                cell.textContent = recommendation && recommendation.recommendation ? `${recommendation.recommendation} (${recommendation.confidence || 0}%)` : 'HOLD';
                cell.className = recommendation && recommendation.className ? recommendation.className : 'recommendation-hold';

                // Risk column
                cell = row.insertCell(5);
                const riskScore = data.risk_score || (data._analytics && data._analytics.riskScore) || 0;
                cell.textContent = riskScore + '%';
                cell.className = riskScore >= 67 ? 'text-danger fw-bold' : riskScore >= 40 ? 'text-warning fw-bold' : 'text-success fw-bold';

                // Vol Buy/Sell 2h and durability
                // Primary source: percent_sum_VOL_minute_120_buy (if provided by backend)
                let volDur2h = getNumeric(data, 'percent_sum_VOL_minute_120_buy', 'percent_vol_buy_120min', 'percent_vol_buy_2jam');

                // Fallback: if backend doesn't provide percent_sum_VOL_minute_120_buy, compute it from volBuy2h/(volBuy2h+volSell2h)
                if ((!volDur2h || volDur2h === 0) && (volBuy2h || volSell2h)) {
                    const total2h = (volBuy2h || 0) + (volSell2h || 0);
                    volDur2h = total2h > 0 ? Math.round(((volBuy2h || 0) / total2h) * 100) : 0;
                }

                // Volume Ratio % (Buy vs Sell in 2h, scaled to 100)
                const volumeRatio2h = volSell2h > 0 ? (volBuy2h / volSell2h) * 100 : (volBuy2h > 0 ? 999 : 0);
                cell = row.insertCell(6);
                cell.textContent = Math.round(volumeRatio2h) + '%';
                cell.className = volumeRatio2h > 200 ? 'text-success fw-bold' : volumeRatio2h < 50 ? 'text-danger fw-bold' : 'text-warning fw-bold';

                row.insertCell(7).textContent = volBuy2h;
                row.insertCell(8).textContent = volSell2h;

                cell = row.insertCell(9);
                cell.textContent = (isNaN(volDur2h) ? 0 : volDur2h) + '%';
                cell.className = getDurabilityClass(volDur2h);

                // 24h volumes
                row.insertCell(10).textContent = volBuy24h;
                row.insertCell(11).textContent = volSell24h;

                // Update time (handle seconds or milliseconds)
                let ts = data.update_time || data.update_time_VOLCOIN || 0;
                // if ts looks like milliseconds (>= 1e12) use directly, if seconds (<1e12) multiply
                if (ts && ts < 1e12) ts = ts * 1000;
                row.insertCell(12).textContent = ts ? new Date(ts).toLocaleString() : '-';

                // Add per-timeframe recommendations to Recs tab (respect row limit)
                if (recsBody) {
                    // maximum number of rec rows requested by the user (rowLimit comes from `limitInput`)
                    const requestedRecsLimit = isFinite(rowLimit) ? rowLimit : Infinity;
                    // keep previous safety cap on coins processed for performance
                    const perfCoinCap = 50;
                    if (rowCount < perfCoinCap && !doneRecs) {
                        const tfs = [
                            { label: '1m', lookback: 60 },
                            { label: '5m', lookback: 5 * 60 },
                            { label: '10m', lookback: 10 * 60 },
                            { label: '30m', lookback: 30 * 60 },
                            { label: '60m', lookback: 60 * 60 },
                            { label: '120m', lookback: 120 * 60 },
                            { label: '24h', lookback: 24 * 60 * 60 }
                        ];

                        const selectedTf = (typeof recTimeframeSelect !== 'undefined' && recTimeframeSelect && recTimeframeSelect.value) ? recTimeframeSelect.value : 'All';

                        // If 'All' is selected, aggregate scores across timeframes and emit one row per coin
                        if (selectedTf === 'All') {
                            if (recsRowCount < requestedRecsLimit) {
                                const priceNow = parseFloat(data.last) || 0;
                                const pricePosTf = pricePosition;
                                // Aggregate weighted score by confidence
                                let sumWeighted = 0, sumWeight = 0;
                                for (const tf of tfs) {
                                    const recTf = calculateRecommendation(data, pricePosTf, tf.label, false);
                                    const w = (recTf.confidence || 0) / 100;
                                    sumWeighted += (recTf.score || 0) * w;
                                    sumWeight += w;
                                }
                                const aggScore = sumWeight ? (sumWeighted / sumWeight) : 0;
                                const aggConfidence = Math.round(Math.min(100, Math.abs(aggScore) * 100));
                                let aggRecLabel = 'HOLD';
                                if (aggScore >= RECOMMENDATION_THRESHOLD) aggRecLabel = 'BUY';
                                else if (aggScore <= -RECOMMENDATION_THRESHOLD) aggRecLabel = 'SELL';

                                // sensitivity from UI (default 1)
                                const sens = (confSensitivity && Number(confSensitivity.value)) || 1;
                                const tpMin = tpMinInput ? Math.max(0, Number(tpMinInput.value) || 2) / 100 : 0.02;
                                const tpMax = tpMaxInput ? Math.max(tpMin, Number(tpMaxInput.value) || 0.10) / 100 : 0.10;
                                const slMax = slMaxInput ? Math.max(0, Number(slMaxInput.value) || 5) / 100 : 0.05;
                                let rangeFactor = Math.min(tpMax, tpMin + (aggConfidence / 100) * (tpMax - tpMin) * sens);
                                if (useAtrRecs && useAtrRecs.checked && data._history) {
                                    const atr = computeATR(data._history, 14);
                                    if (atr > 0 && priceNow > 0) {
                                        const atrPct = (atr / priceNow) * sens;
                                        rangeFactor = Math.min(tpMax, Math.max(tpMin, atrPct));
                                    }
                                }
                                let tp = '-', sl = '-';
                                if (priceNow > 0 && aggRecLabel === 'BUY') {
                                    tp = (priceNow * (1 + rangeFactor)).toFixed(4);
                                    sl = (priceNow * (1 - Math.min(slMax, Math.max(0.005, rangeFactor / 2)))).toFixed(4);
                                } else if (priceNow > 0 && aggRecLabel === 'SELL') {
                                    tp = (priceNow * (1 - rangeFactor)).toFixed(4);
                                    sl = (priceNow * (1 + Math.min(slMax, Math.max(0.005, rangeFactor / 2)))).toFixed(4);
                                }
                                const r = recsBody.insertRow();
                                r.insertCell(0).textContent = coin;
                                r.insertCell(1).textContent = 'All';
                                r.insertCell(2).textContent = `${aggRecLabel}`;
                                r.insertCell(3).textContent = `${aggConfidence || 0}%`;
                                r.insertCell(4).textContent = priceNow || '-';
                                r.insertCell(5).textContent = tp;
                                r.insertCell(6).textContent = sl;
                                recsRowCount++;
                            }
                        } else {
                            // Single timeframe selected: show per-coin recommendation for that timeframe
                            if (recsRowCount < requestedRecsLimit) {
                                const priceNow = parseFloat(data.last) || 0;
                                const pricePosTf = pricePosition;
                                const recTf = calculateRecommendation(data, pricePosTf, selectedTf, true);
                                const conf = (recTf.confidence || 0) / 100; // 0..1

                                // sensitivity from UI (default 1)
                                const sens = (confSensitivity && Number(confSensitivity.value)) || 1;

                                // base TP/SL from UI
                                const tpMin = tpMinInput ? Math.max(0, Number(tpMinInput.value) || 2) / 100 : 0.02;
                                const tpMax = tpMaxInput ? Math.max(tpMin, Number(tpMaxInput.value) || 0.10) / 100 : 0.10;
                                const slMax = slMaxInput ? Math.max(0, Number(slMaxInput.value) || 5) / 100 : 0.05;

                                // determine rangeFactor either ATR-based or confidence-based
                                let rangeFactor = Math.min(tpMax, tpMin + conf * (tpMax - tpMin) * sens);
                                if (useAtrRecs && useAtrRecs.checked && data._history) {
                                    const atr = computeATR(data._history, 14);
                                    if (atr > 0 && priceNow > 0) {
                                        const atrPct = (atr / priceNow) * sens;
                                        rangeFactor = Math.min(tpMax, Math.max(tpMin, atrPct));
                                    }
                                }

                                let tp = '-';
                                let sl = '-';
                                if (priceNow > 0 && recTf.recommendation === 'BUY') {
                                    tp = (priceNow * (1 + rangeFactor)).toFixed(4);
                                    sl = (priceNow * (1 - Math.min(slMax, Math.max(0.005, rangeFactor / 2)))).toFixed(4);
                                } else if (priceNow > 0 && recTf.recommendation === 'SELL') {
                                    tp = (priceNow * (1 - rangeFactor)).toFixed(4);
                                    sl = (priceNow * (1 + Math.min(slMax, Math.max(0.005, rangeFactor / 2)))).toFixed(4);
                                }
                                const r = recsBody.insertRow();
                                r.insertCell(0).textContent = coin;
                                r.insertCell(1).textContent = selectedTf;
                                r.insertCell(2).textContent = `${recTf.recommendation}`;
                                r.insertCell(3).textContent = `${recTf.confidence || 0}%`;
                                r.insertCell(4).textContent = priceNow || '-';
                                r.insertCell(5).textContent = tp;
                                r.insertCell(6).textContent = sl;
                                recsRowCount++;
                            }
                        }
                    }
                }

                // Continue to render other tables even if recs reached the requested limit
                // Activity rows removed — feed provides only volume-based metrics now

                // Vol row (multiple timeframes)
                row = volBody.insertRow();
                row.insertCell(0).textContent = coin;
                row.insertCell(1).textContent = volBuy1m;
                row.insertCell(2).textContent = volSell1m;
                row.insertCell(3).textContent = volBuy5m;
                row.insertCell(4).textContent = volSell5m;
                row.insertCell(5).textContent = volBuy10m;
                row.insertCell(6).textContent = volSell10m;
                // 15m
                row.insertCell(7).textContent = getNumeric(data, 'count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m');
                row.insertCell(8).textContent = getNumeric(data, 'count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m');
                // 20m
                row.insertCell(9).textContent = getNumeric(data, 'count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m');
                row.insertCell(10).textContent = getNumeric(data, 'count_VOL_minute_20_sell', 'vol_sell_20MENIT', 'vol_sell_20m');
                // 30m
                row.insertCell(11).textContent = getNumeric(data, 'count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m');
                row.insertCell(12).textContent = getNumeric(data, 'count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m');
                // 60m
                row.insertCell(13).textContent = volBuy60m;
                row.insertCell(14).textContent = volSell60m;
                // 120m (2h)
                row.insertCell(15).textContent = volBuy;
                row.insertCell(16).textContent = volSell;

                // Volume Ratio % for 2h timeframe
                const volRatio2h = volSell > 0 ? (volBuy / volSell) * 100 : (volBuy > 0 ? 999 : 0);
                cell = row.insertCell(17);
                cell.textContent = Math.round(volRatio2h) + '%';
                cell.className = volRatio2h > 200 ? 'text-success fw-bold' : volRatio2h < 50 ? 'text-danger fw-bold' : 'text-warning fw-bold';

                // 24h volumes
                row.insertCell(18).textContent = volBuy24h;
                row.insertCell(19).textContent = volSell24h;
                row.insertCell(20).textContent = (volBuy24h || 0) + (volSell24h || 0);

                // Vol Durability row (1m/5m/10m/15m/20m/30m/1h/24h)
                try {
                    const vdr = volDurBody.insertRow();
                    vdr.insertCell(0).textContent = coin;
                    // price change cell
                    try {
                        const pct = (data && (data.percent_change !== undefined)) ? Number(data.percent_change) : (data && data.last && data.previous ? ((Number(data.last) - Number(data.previous)) / Number(data.previous)) * 100 : NaN);
                        const ccell = vdr.insertCell(1);
                        if (!isNaN(pct)) {
                            ccell.textContent = (Math.round(pct * 100) / 100) + '%';
                            ccell.className = pct > 0 ? 'text-success fw-bold' : (pct < 0 ? 'text-danger fw-bold' : '');
                        } else {
                            ccell.textContent = '-';
                        }
                    } catch (e) {
                        try { vdr.insertCell(1).textContent = '-'; } catch (e) { }
                    }
                    // helper to get percent durability or compute from buy/(buy+sell)
                    function getDurPct(pctKey, buyKeys, sellKeys) {
                        let p = getNumeric(data, pctKey);
                        if (p && p > 0) return Math.round(p);
                        const b = getNumeric(data, ...buyKeys);
                        const s = getNumeric(data, ...sellKeys);
                        const t = (b || 0) + (s || 0);
                        return t > 0 ? Math.round((b / t) * 100) : 0;
                    }

                    const d1 = getDurPct('percent_sum_VOL_minute1_buy', ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1m'], ['count_VOL_minute1_sell', 'vol_sell_1MENIT', 'vol_sell_1m']);
                    const d5 = getDurPct('percent_sum_VOL_minute_5_buy', ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5m'], ['count_VOL_minute_5_sell', 'vol_sell_5MENIT', 'vol_sell_5m']);
                    const d10 = getDurPct('percent_sum_VOL_minute_10_buy', ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10m'], ['count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10m']);
                    const d15 = getDurPct('percent_sum_VOL_minute_15_buy', ['count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m'], ['count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m']);
                    const d20 = getDurPct('percent_sum_VOL_minute_20_buy', ['count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m'], ['count_VOL_minute_20_sell', 'vol_sell_20MENIT', 'vol_sell_20m']);
                    const d30 = getDurPct('percent_sum_VOL_minute_30_buy', ['count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m'], ['count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m']);
                    const d60 = getDurPct('percent_sum_VOL_minute_60_buy', ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT'], ['count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT']);
                    const d24 = getDurPct('percent_sum_VOL_overall_buy', ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24h'], ['count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24h']);

                    const cells = [d1, d5, d10, d15, d20, d30, d60, d24];
                    for (const cval of cells) {
                        const c = vdr.insertCell(-1);
                        c.textContent = (isNaN(cval) ? 0 : cval) + '%';
                        c.className = getDurabilityClass(cval);
                    }
                } catch (e) { console.warn('volDur row error', e); }

                if (microBody) {
                    const analytics = data._analytics || {};
                    const microRow = microBody.insertRow();
                    microRow.insertCell(0).textContent = coin;
                    microRow.insertCell(1).textContent = fmtPctFromUnit(analytics.multiTfCohesion || 0);
                    microRow.insertCell(2).textContent = fmtNum(analytics.volumeAcceleration || 0, 2);
                    microRow.insertCell(3).textContent = fmtNum(analytics.freqBurstBuy || 0, 2);
                    microRow.insertCell(4).textContent = fmtNum(analytics.orderFlowStabilityIndex || 0, 2);
                    microRow.insertCell(5).textContent = fmtNum(analytics.flowStrengthIndex || 0, 2);
                    microRow.insertCell(6).textContent = fmtNum(analytics.zWeightedPressure || 0, 2);
                    microRow.insertCell(7).textContent = fmtNum(analytics.tradeImbalanceMomentum || 0, 2);
                    microRow.insertCell(8).textContent = fmtNum(analytics.compositeInstitutionalSignal || 0, 2);
                    microRow.insertCell(9).textContent = fmtNum(analytics.liquidityShockIndex || 0, 2);
                    microRow.insertCell(10).textContent = fmtNum(analytics.rangeCompressionIndex || 0, 3);
                    microRow.insertCell(11).textContent = fmtNum(analytics.priceFlowConflictIndex || 0, 2);
                }

                rowCount++;
            }

            // Render spike table sorted by ratio (descending)
            if (spikeBody) {
                // sort and optionally limit to rowLimit
                spikeRows.sort((a, b) => b.ratio - a.ratio);
                const maxSpikes = isFinite(rowLimit) ? rowLimit : spikeRows.length;
                const showRows = spikeRows.slice(0, maxSpikes);
                for (const s of showRows) {
                    const r = spikeBody.insertRow();
                    r.insertCell(0).textContent = s.coin;
                    r.insertCell(1).textContent = s.timeframe;
                    r.insertCell(2).textContent = s.vol;
                    r.insertCell(3).textContent = s.avg;
                    const cell = r.insertCell(4);
                    cell.textContent = (s.ratio).toFixed(2) + 'x';
                    cell.className = s.ratio >= 4 ? 'text-success fw-bold' : s.ratio >= 2 ? 'text-warning fw-bold' : '';
                    const ts = s.update_time && s.update_time < 1e12 ? s.update_time * 1000 : s.update_time;
                    r.insertCell(5).textContent = ts ? new Date(ts).toLocaleString() : '-';
                }
            }
            try { window._lastSpikeRows = spikeRows.slice(0, 50); } catch (e) { /* ignore */ }
            // update Info tab (keeps runtime info current)
            try { renderInfoTab(); } catch (e) { console.warn('renderInfoTab failed', e); }
            maybeRenderHeavyTab('signalLab', renderSignalLab, { interval: 1500 });
            maybeRenderHeavyTab('backtest', renderBacktestTab, { interval: 6000 });
            maybeRenderHeavyTab('risk', renderRiskMonitorTab, { interval: 3000 });
            maybeRenderHeavyTab('events', renderEventWatchTab, { interval: 2500, requireActive: false });
        }

        // Populate the Info tab with runtime state and quick actions
        function renderInfoTab() {
            try {
                const container = document.getElementById('info');
                if (!container) return;
                // Prefer a dedicated runtime container so we don't overwrite static Info content
                let pane = document.getElementById('infoRuntime');
                if (!pane) {
                    pane = document.createElement('div');
                    pane.id = 'infoRuntime';
                    pane.className = 'mb-3';
                    container.insertBefore(pane, container.firstElementChild);
                }

                // compute some runtime values
                const fmtNum = (val, digits = 2) => {
                    const n = Number(val);
                    return Number.isFinite(n) ? n.toFixed(digits) : '-';
                };
                const fmtPct = (val, digits = 1) => {
                    const n = Number(val);
                    return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '-';
                };
                const fmtInt = (val) => {
                    const n = Number(val);
                    return Number.isFinite(n) ? Math.round(n).toLocaleString() : '-';
                };

                const wsStateMap = { 0: 'CONNECTING', 1: 'OPEN', 2: 'CLOSING', 3: 'CLOSED' };
                const wsState = (typeof ws !== 'undefined' && ws && ws.readyState !== undefined) ? wsStateMap[ws.readyState] || ws.readyState : 'N/A';
                const coinCount = Object.keys(coinDataMap || {}).length;
                // Activity fields intentionally removed upstream — dashboard uses volume-only metrics
                const alerts = loadAlertsFromStore();
                const persistStore = (function () { try { return JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}'); } catch (e) { return {}; } })();
                const persistedCoins = Object.keys(persistStore || {}).length;
                const lsKeys = Object.keys(localStorage).filter(k => k.toString().toLowerCase().indexOf('okx_calc') === 0 || k.toString().toLowerCase().includes('okx'));

                // find last update across coins
                let lastTs = 0;
                for (const c of Object.values(coinDataMap)) {
                    try {
                        if (c && c._history && c._history.length) {
                            const t = c._history[c._history.length - 1].ts || 0;
                            if (t > lastTs) lastTs = t;
                        }
                    } catch (e) { }
                }

                // prepare last raw JSON and summary info
                const lastRaw = (window._lastWsRaw) ? window._lastWsRaw : null;
                const lastCoin = (window._lastReceivedCoin) ? window._lastReceivedCoin : null;
                const lastData = lastRaw || (lastCoin ? (coinDataMap[lastCoin] || null) : null);
                const analytics = (lastData && lastData._analytics) ? lastData._analytics : {};
                const history = (lastData && Array.isArray(lastData._history)) ? lastData._history.slice(-120) : [];
                const priceNow = Number(lastData && lastData.last) || 0;
                const priceHigh = Number(lastData && lastData.high) || priceNow;
                const priceLow = Number(lastData && lastData.low) || priceNow;
                const priceRange = priceHigh - priceLow;
                const pricePosition = priceRange > 0 ? ((priceNow - priceLow) / priceRange) * 100 : 50;

                const histPrices = history.map(h => Number(h.price) || 0).filter(v => v > 0);
                const meanStd = (arr) => {
                    if (!arr.length) return { mean: 0, std: 0 };
                    const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
                    const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
                    return { mean, std: Math.sqrt(variance) };
                };
                const priceStats = meanStd(histPrices);
                const priceZScore = (histPrices.length >= 6 && priceStats.std > 0 && priceNow)
                    ? (priceNow - priceStats.mean) / priceStats.std
                    : 0;

                const calcHistoryReturn = (ms) => {
                    if (!history.length || !ms) return 0;
                    const cutoff = Date.now() - ms;
                    let older = history[0];
                    for (let i = history.length - 1; i >= 0; i--) {
                        if ((history[i].ts || 0) <= cutoff) {
                            older = history[i];
                            break;
                        }
                    }
                    const olderPrice = Number(older && older.price) || 0;
                    const latestPrice = Number(history[history.length - 1] && history[history.length - 1].price) || 0;
                    if (!olderPrice || !latestPrice) return 0;
                    return ((latestPrice - olderPrice) / olderPrice) * 100;
                };

                const obvProxy = (() => {
                    if (history.length < 2) return 0;
                    let obv = 0;
                    for (let i = 1; i < history.length; i++) {
                        const prevPrice = Number(history[i - 1].price) || 0;
                        const currPrice = Number(history[i].price) || 0;
                        if (!prevPrice || !currPrice) continue;
                        const buyVol = Number(history[i].volBuy2h) || 0;
                        const sellVol = Number(history[i].volSell2h) || 0;
                        const delta = Math.abs(buyVol - sellVol);
                        if (currPrice > prevPrice) obv += delta;
                        else if (currPrice < prevPrice) obv -= delta;
                    }
                    return obv;
                })();

                const vwapValue = (() => {
                    if (!history.length) return 0;
                    let num = 0;
                    let den = 0;
                    for (const point of history) {
                        const price = Number(point.price) || 0;
                        const vol = (Number(point.volBuy2h) || 0) + (Number(point.volSell2h) || 0);
                        if (price && vol) {
                            num += price * vol;
                            den += vol;
                        }
                    }
                    return den > 0 ? num / den : 0;
                })();

                const priceVsVwapPct = (vwapValue > 0 && priceNow > 0) ? ((priceNow - vwapValue) / vwapValue) * 100 : 0;
                const atr14 = (history.length && typeof computeATR === 'function') ? computeATR(history, 14) : 0;
                const safeGetLastNumeric = (...keys) => lastData ? (getNumeric(lastData, ...keys) || 0) : 0;
                const freqBuy = (() => {
                    const analyticsVal = Number(analytics.freqBuy2h);
                    if (Number.isFinite(analyticsVal) && analyticsVal > 0) return analyticsVal;
                    return safeGetLastNumeric('count_FREQ_minute_120_buy', 'sum_minute_120_buy', 'freq_buy_2JAM', 'freq_buy_120MENIT');
                })();
                const freqSell = (() => {
                    const analyticsVal = Number(analytics.freqSell2h);
                    if (Number.isFinite(analyticsVal) && analyticsVal > 0) return analyticsVal;
                    return safeGetLastNumeric('count_FREQ_minute_120_sell', 'sum_minute_120_sell', 'freq_sell_2JAM', 'freq_sell_120MENIT');
                })();
                const freqTotal = freqBuy + freqSell;
                const freqRatio = freqTotal > 0 ? (freqBuy / freqTotal) * 100 : 0;
                const freqMomentum = Number((Number(analytics.zScoreFreqBuy2h) || 0) - (Number(analytics.zScoreFreqSell2h) || 0));
                const volMomentum = Number((Number(analytics.zScoreBuy2h) || 0) - (Number(analytics.zScoreSell2h) || 0));
                const change5m = calcHistoryReturn(5 * 60 * 1000);
                const change15m = calcHistoryReturn(15 * 60 * 1000);
                const sharpInsights = (analytics.sharpInsights && analytics.sharpInsights.length) ? analytics.sharpInsights.join(' • ') : 'No sharp anomalies detected';
                const persistenceVol = analytics.persistenceBuy3 !== undefined ? analytics.persistenceBuy3 : '-';
                const persistenceFreq = analytics.persistenceFreqBuy3 !== undefined ? analytics.persistenceFreqBuy3 : '-';
                let recSnapshot = null;
                try {
                    const tf = (typeof recTimeframeSelect !== 'undefined' && recTimeframeSelect && recTimeframeSelect.value) ? recTimeframeSelect.value : '120m';
                    recSnapshot = calculateRecommendation && lastData ? calculateRecommendation(lastData, Math.round(pricePosition), tf, false) : null;
                } catch (e) { recSnapshot = null; }

                const analyticsSnapshot = {
                    pricePosition: fmtPct(pricePosition, 1),
                    priceZ: fmtNum(priceZScore, 2),
                    vwap: fmtNum(vwapValue, 4),
                    priceVsVwap: fmtPct(priceVsVwapPct, 2),
                    obv: fmtInt(obvProxy),
                    atr: fmtNum(atr14, 6),
                    freqRatio: fmtPct(freqRatio, 1),
                    freqVsAvg: fmtPct(analytics.freqBuy_vs_avg_percent, 1),
                    volVsAvg: fmtPct(analytics.volBuy_vs_avg_percent, 1),
                    freqMomentum: fmtNum(freqMomentum, 2),
                    volMomentum: fmtNum(volMomentum, 2),
                    change5m: fmtPct(change5m, 2),
                    change15m: fmtPct(change15m, 2)
                };

                let rawStr = '-';
                try { rawStr = lastRaw ? JSON.stringify(lastRaw, null, 2) : '-'; } catch (e) { rawStr = '-'; }
                const lastUpdateHuman = (lastData && (lastData.update_time || lastData.update_time_VOLCOIN)) ? (new Date(Number(lastData.update_time) || Number(lastData.update_time_VOLCOIN) || Date.now()).toLocaleString()) : '-';

                const html = `
                    <div class="card bg-dark text-light mb-2 p-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="mb-1">Runtime</h5>
                                <div class="small text-muted">WebSocket: <strong>${wsState}</strong></div>
                                <div class="small text-muted">Coins tracked: <strong>${coinCount}</strong></div>
                                <div class="small text-muted">Last update: <strong>${lastTs ? new Date(lastTs).toLocaleString() : '-'}</strong></div>
                            </div>
                            <div class="text-end">
                                <div class="small text-muted">Persist enabled: <strong>${persistHistoryEnabled ? 'Yes' : 'No'}</strong></div>
                                <div class="small text-muted">Persisted coins: <strong>${persistedCoins}</strong></div>
                                <div class="small text-muted">Stored alerts: <strong>${alerts.length}</strong></div>
                            </div>
                        </div>
                        <hr/>
                        <div class="row">
                            <div class="col-md-6">
                                <h6 class="mb-1">Last Raw JSON</h6>
                                <pre id="lastRawJson" style="max-height:220px;overflow:auto;background:rgba(0,0,0,0.6);padding:10px;border-radius:6px;color:#cbd5e1;">${rawStr}</pre>
                            </div>
                            <div class="col-md-6">
                                <h6 class="mb-1">Last Summary</h6>
                                <div class="small text-muted">Coin: <strong>${lastData && lastData.coin ? lastData.coin : '-'}</strong></div>
                                <div class="small text-muted">Last Price: <strong>${lastData && (lastData.last !== undefined) ? lastData.last : '-'}</strong></div>
                                <div class="small text-muted">Change %: <strong>${lastData && (lastData.percent_change !== undefined) ? lastData.percent_change : '-'}</strong></div>
                                <div class="small text-muted">Total Vol: <strong>${lastData && (lastData.total_vol !== undefined) ? lastData.total_vol : '-'}</strong></div>
                                <div class="small text-muted">Update Time: <strong>${lastUpdateHuman}</strong></div>
                                <hr class="my-2"/>
                                <h6 class="mb-1">Analytics Snapshot</h6>
                                <div class="small text-muted row g-2">
                                    <div class="col-sm-6">
                                        <div>Price Position: <strong>${analyticsSnapshot.pricePosition}</strong></div>
                                        <div>Price Z-Score: <strong>${analyticsSnapshot.priceZ}</strong></div>
                                        <div>VWAP (hist): <strong>${analyticsSnapshot.vwap}</strong></div>
                                        <div>Price vs VWAP: <strong>${analyticsSnapshot.priceVsVwap}</strong></div>
                                        <div>ATR(14): <strong>${analyticsSnapshot.atr}</strong></div>
                                        <div>OBV Proxy: <strong>${analyticsSnapshot.obv}</strong></div>
                                        <div>Delta Price 5m: <strong>${analyticsSnapshot.change5m}</strong></div>
                                        <div>Delta Price 15m: <strong>${analyticsSnapshot.change15m}</strong></div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div>Vol Buy (2h): <strong>${fmtInt(analytics.volBuy2h)}</strong></div>
                                        <div>Vol Sell (2h): <strong>${fmtInt(analytics.volSell2h)}</strong></div>
                                        <div>Vol Ratio (2h): <strong>${fmtPct(analytics.volRatioBuySell_percent, 1)}</strong></div>
                                        <div>Vol vs Avg (Buy): <strong>${analyticsSnapshot.volVsAvg}</strong></div>
                                        <div>Freq Ratio (2h): <strong>${analyticsSnapshot.freqRatio}</strong></div>
                                        <div>Freq vs Avg (Buy): <strong>${analyticsSnapshot.freqVsAvg}</strong></div>
                                        <div>Vol Momentum (z): <strong>${analyticsSnapshot.volMomentum}</strong></div>
                                        <div>Freq Momentum (z): <strong>${analyticsSnapshot.freqMomentum}</strong></div>
                                    </div>
                                </div>
                                <div class="small text-muted mt-2">
                                    <div>Persistence (Vol): <strong>${persistenceVol}</strong></div>
                                    <div>Persistence (Freq): <strong>${persistenceFreq}</strong></div>
                                    <div>Risk Score: <strong>${analytics && analytics.riskScore !== undefined ? analytics.riskScore + '%' : '-'}</strong></div>
                                    <div>Sharp Insights: <strong>${sharpInsights}</strong></div>
                                    <div>Recommendation: <strong>${recSnapshot ? recSnapshot.recommendation : 'HOLD'}${recSnapshot ? ` (${recSnapshot.confidence}% | ${fmtNum(recSnapshot.score, 2)})` : ''}</strong></div>
                                </div>
                            </div>
                        </div>
                        <hr/>
                        <div class="d-flex gap-2 mt-2">
                            <button id="exportPersistBtn" class="btn btn-sm btn-outline-primary">Export Persisted History</button>
                            <button id="clearPersistBtn" class="btn btn-sm btn-outline-danger">Clear Persisted History</button>
                            <button id="exportLSBtn" class="btn btn-sm btn-outline-secondary">Export okx_calc LocalStorage</button>
                            <button id="clearLSBtn" class="btn btn-sm btn-outline-dark">Clear okx_calc LocalStorage</button>
                            <button id="openRunJsonBtn" class="btn btn-sm btn-outline-success">Run JSON (Paste)</button>
                        </div>
                        <div class="mt-2 small text-muted">LocalStorage keys: <strong>${lsKeys.length}</strong> (showing keys starting with 'okx_calc' or containing 'okx')</div>
                    </div>`;

                pane.innerHTML = html;

                // No activity tab logic required — using volume-only metrics

                // wire buttons
                const expBtn = document.getElementById('exportPersistBtn');
                const clrBtn = document.getElementById('clearPersistBtn');
                const expLS = document.getElementById('exportLSBtn');
                const clrLS = document.getElementById('clearLSBtn');

                if (expBtn) expBtn.onclick = function () {
                    try {
                        const blob = new Blob([JSON.stringify(persistStore || {}, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `persisted-history-${Date.now()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                    } catch (e) { console.warn('exportPersist failed', e); showAlertBanner('Export failed', 'Could not export persisted history', 'danger', 4000); }
                };

                if (clrBtn) clrBtn.onclick = function () {
                    try {
                        if (!confirm('Clear all persisted history? This will remove per-coin stored histories.')) return;
                        localStorage.setItem(PERSIST_KEY, JSON.stringify({}));
                        showAlertBanner('Persist cleared', 'Persisted history removed', 'info', 3000);
                    } catch (e) { console.warn('clearPersist failed', e); showAlertBanner('Clear failed', 'Could not clear persisted history', 'danger', 4000); }
                };

                if (expLS) expLS.onclick = function () {
                    try {
                        const dump = {};
                        for (const k of lsKeys) dump[k] = localStorage.getItem(k);
                        const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `okx-calc-localstorage-${Date.now()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                    } catch (e) { console.warn('exportLS failed', e); showAlertBanner('Export failed', 'Could not export localStorage', 'danger', 4000); }
                };

                if (clrLS) clrLS.onclick = function () {
                    try {
                        if (!confirm('Clear all okx_calc related LocalStorage keys?')) return;
                        for (const k of lsKeys) localStorage.removeItem(k);
                        showAlertBanner('LocalStorage cleared', 'Removed okx_calc keys', 'info', 3000);
                        renderAlertsList();
                    } catch (e) { console.warn('clearLS failed', e); showAlertBanner('Clear failed', 'Could not clear localStorage', 'danger', 4000); }
                };

                // Wire Run JSON (Paste) button to open test modal
                try {
                    const runBtn = document.getElementById('openRunJsonBtn');
                    if (runBtn) {
                        runBtn.addEventListener('click', () => {
                            try {
                                ensureTestJsonModal();
                                const modalEl = document.getElementById('testJsonModal');
                                const bs = new bootstrap.Modal(modalEl);
                                // wire run action each time to ensure fresh handler
                                setTimeout(() => {
                                    const run = document.getElementById('testJsonRunBtn');
                                    const ta = document.getElementById('testJsonTextarea');
                                    const err = document.getElementById('testJsonError');
                                    if (run && ta) {
                                        run.onclick = () => {
                                            try {
                                                const txt = ta.value || '';
                                                if (!txt) { if (err) { err.style.display = 'block'; err.textContent = 'Please paste JSON payload.'; } return; }
                                                let obj = null;
                                                try { obj = JSON.parse(txt); } catch (parseErr) { if (err) { err.style.display = 'block'; err.textContent = 'Invalid JSON: ' + parseErr.message; } return; }
                                                // hide error
                                                if (err) { err.style.display = 'none'; err.textContent = ''; }
                                                // simulate WebSocket event
                                                if (typeof onWsMessage === 'function') {
                                                    onWsMessage({ data: JSON.stringify(obj) });
                                                    bs.hide();
                                                } else {
                                                    if (err) { err.style.display = 'block'; err.textContent = 'Handler not available.'; }
                                                }
                                            } catch (e) { console.warn('testJson run failed', e); }
                                        };
                                    }
                                }, 10);
                                bs.show();
                            } catch (e) { console.warn('openRunJson failed', e); }
                        });
                    }
                } catch (e) { console.warn('wiring openRunJsonBtn failed', e); }

            } catch (e) { console.warn('renderInfoTab error', e); }
        }

        function renderSignalLab() {
            try {
                const pane = document.getElementById('signalLabPane');
                const coinSelect = document.getElementById('signalLabCoinSelect');
                const tfSelect = document.getElementById('signalLabTfSelect');
                const statusEl = document.getElementById('signalLabStatus');
                if (!pane || !coinSelect || !tfSelect) return;
                const coins = Object.keys(coinDataMap || {});
                if (!coins.length) {
                    coinSelect.innerHTML = '';
                    pane.innerHTML = '<p class="mb-0 text-muted">Waiting for data…</p>';
                    if (statusEl) statusEl.textContent = '-';
                    return;
                }
                if (!coinSelect.dataset.bound) {
                    coinSelect.addEventListener('change', () => {
                        window._signalLabCoin = coinSelect.value;
                        renderSignalLab();
                    });
                    coinSelect.dataset.bound = '1';
                }
                if (!tfSelect.dataset.bound) {
                    tfSelect.addEventListener('change', () => renderSignalLab());
                    tfSelect.dataset.bound = '1';
                }
                const prevCoin = window._signalLabCoin || coinSelect.value || coins[0];
                const currentCoin = coins.includes(prevCoin) ? prevCoin : coins[0];
                coinSelect.innerHTML = coins.map(c => `<option value="${c}" ${c === currentCoin ? 'selected' : ''}>${c}</option>`).join('');
                window._signalLabCoin = currentCoin;
                const data = coinDataMap[currentCoin];
                if (!data) {
                    pane.innerHTML = '<p class="mb-0 text-muted">No data for selected coin.</p>';
                    if (statusEl) statusEl.textContent = '-';
                    return;
                }
                const timeframe = tfSelect.value || '120m';
                const analytics = data._analytics || {};
                const price = Number(data.last) || 0;
                const high = Number(data.high) || price;
                const low = Number(data.low) || price;
                const range = high - low;
                const pricePos = range > 0 ? Math.round(((price - low) / range) * 100) : 50;
                const rec = (typeof calculateRecommendation === 'function') ? calculateRecommendation(data, pricePos, timeframe, false) : null;
                const factors = (rec && rec.factors) ? rec.factors : {};
                const fmtNum = (val, digits = 2) => {
                    const n = Number(val);
                    return Number.isFinite(n) ? n.toFixed(digits) : '-';
                };
                const fmtPct = (val, digits = 1) => {
                    const n = Number(val);
                    return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '-';
                };
                const volRatio = analytics.volRatioBuySell_percent !== undefined ? fmtPct(analytics.volRatioBuySell_percent, 1) : '-';
                const durability = analytics.volDurability2h_percent !== undefined ? fmtPct(analytics.volDurability2h_percent, 1) : '-';
                const freqRatio = (() => {
                    const b = Number(analytics.freqBuy2h) || 0;
                    const s = Number(analytics.freqSell2h) || 0;
                    const tot = b + s;
                    return tot > 0 ? fmtPct((b / tot) * 100, 1) : '-';
                })();
                const insights = (analytics.sharpInsights && analytics.sharpInsights.length)
                    ? analytics.sharpInsights.join(' • ')
                    : 'No sharp anomalies';
                const factorDefs = [
                    { key: 'priceBias', label: 'Price Bias', desc: 'Location within recent range' },
                    { key: 'volDurNorm', label: 'Vol Durability (2h)', desc: 'Buy % dominance in 2h' },
                    { key: 'vol24Norm', label: 'Vol Durability (24h)', desc: 'Daily buy % tilt' },
                    { key: 'zImbalance', label: 'Volume Z-Imbalance', desc: 'z-score buy minus sell' },
                    { key: 'freqImbalance', label: 'Frequency Imbalance', desc: 'Trade count skew' },
                    { key: 'persistenceNorm', label: 'Persistence', desc: 'Streak of buy pressure' },
                    { key: 'divergenceNorm', label: 'Divergence', desc: 'Flow vs price tension' },
                    { key: 'riskPenalty', label: 'Risk Penalty', desc: 'Liquidity/volatility drag', invert: true }
                ];
                const factorHtml = factorDefs.map(def => {
                    const raw = Number(factors[def.key]);
                    const val = Number.isFinite(raw) ? raw : 0;
                    const pct = Math.max(0, Math.min(100, Math.round((val + 1) * 50)));
                    const good = def.invert ? val <= 0 : val >= 0;
                    const barClass = good ? 'bg-success' : 'bg-danger';
                    return `
                        <div class="mb-2">
                            <div class="d-flex justify-content-between">
                                <span>${def.label}</span>
                                <span>${fmtNum(val, 2)}</span>
                            </div>
                            <div class="progress" style="height:6px;">
                                <div class="progress-bar ${barClass}" role="progressbar" style="width:${pct}%"></div>
                            </div>
                            <div class="text-muted">${def.desc}</div>
                        </div>`;
                }).join('');
                if (statusEl) {
                    const text = rec ? `${rec.recommendation} (${rec.confidence || 0}%)` : 'HOLD';
                    statusEl.textContent = text;
                    statusEl.className = `fw-bold ${rec && rec.className ? rec.className : 'text-info'}`;
                }
                pane.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="mb-0">${currentCoin}</h5>
                            <small class="text-muted">${timeframe} · Price ${price ? price.toFixed(4) : '-'}</small>
                        </div>
                        <div class="text-end">
                            <div class="fw-bold ${rec && rec.className ? rec.className : 'text-info'}">${rec ? rec.recommendation : 'HOLD'} (${rec ? rec.confidence : 0}%)</div>
                            <small class="text-muted">Score ${rec && Number.isFinite(rec.score) ? rec.score.toFixed(2) : '0.00'}</small>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-lg-7">
                            ${factorHtml || '<p class="text-muted">No factor data yet.</p>'}
                        </div>
                        <div class="col-lg-5">
                            <h6 class="small text-muted">Flow Snapshot</h6>
                            <ul class="list-unstyled small mb-2">
                                <li>Price Position: <strong>${fmtPct(pricePos, 1)}</strong></li>
                                <li>Vol Ratio (2h): <strong>${volRatio}</strong></li>
                                <li>Vol Durability (2h): <strong>${durability}</strong></li>
                                <li>Freq Ratio (2h): <strong>${freqRatio}</strong></li>
                                <li>Risk Score: <strong>${analytics && analytics.riskScore !== undefined ? analytics.riskScore + '%' : '-'}</strong></li>
                            </ul>
                            <div class="small text-muted">Insights: <strong>${insights}</strong></div>
                        </div>
                    </div>`;
            } catch (e) { console.warn('renderSignalLab error', e); }
        }

        function renderBacktestTab() {
            try {
                const pane = document.getElementById('backtestPane');
                const coinSelect = document.getElementById('backtestCoinSelect');
                const sampleEl = document.getElementById('backtestSampleCount');
                if (!pane || !coinSelect) return;
                const coins = Object.keys(coinDataMap || {});
                if (!coins.length) {
                    coinSelect.innerHTML = '';
                    pane.innerHTML = '<p class="mb-0 text-muted">Waiting for recommendations…</p>';
                    if (sampleEl) sampleEl.textContent = '0';
                    return;
                }
                if (!coinSelect.dataset.bound) {
                    coinSelect.addEventListener('change', () => {
                        window._backtestCoin = coinSelect.value;
                        renderBacktestTab();
                    });
                    coinSelect.dataset.bound = '1';
                }
                const prevCoin = window._backtestCoin || coinSelect.value || coins[0];
                const currentCoin = coins.includes(prevCoin) ? prevCoin : coins[0];
                coinSelect.innerHTML = coins.map(c => `<option value="${c}" ${c === currentCoin ? 'selected' : ''}>${c}</option>`).join('');
                window._backtestCoin = currentCoin;
                const data = coinDataMap[currentCoin];
                const history = (data && Array.isArray(data._history)) ? data._history.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0)) : [];
                const log = (data && data._analytics && Array.isArray(data._analytics.recommendationLog)) ? data._analytics.recommendationLog.slice(-200) : [];
                if (sampleEl) sampleEl.textContent = String(log.length || 0);
                if (!log.length || history.length < 2) {
                    pane.innerHTML = '<p class="mb-0 text-muted">Need more recommendations and history to run backtests.</p>';
                    return;
                }
                const fmtPct = (val, digits = 2) => {
                    const n = Number(val);
                    return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '-';
                };
                const fmtNum = (val, digits = 2) => {
                    const n = Number(val);
                    return Number.isFinite(n) ? n.toFixed(digits) : '-';
                };
                const findPriceAt = (targetTs) => {
                    for (let i = 0; i < history.length; i++) {
                        const point = history[i];
                        if ((point.ts || 0) >= targetTs) return Number(point.price) || 0;
                    }
                    return Number(history.length ? history[history.length - 1].price : 0) || 0;
                };
                const horizons = [
                    { label: '5m', ms: 5 * 60 * 1000 },
                    { label: '15m', ms: 15 * 60 * 1000 },
                    { label: '60m', ms: 60 * 60 * 1000 },
                    { label: '120m', ms: 120 * 60 * 1000 }
                ];
                const computeStats = (horizon) => {
                    const details = [];
                    let wins = 0;
                    const deltas = [];
                    for (const entry of log) {
                        if (!entry || entry.recommendation === 'HOLD') continue;
                        const entryPrice = Number(entry.price) || findPriceAt(entry.ts);
                        if (!entryPrice) continue;
                        const futurePrice = findPriceAt(entry.ts + horizon.ms);
                        if (!futurePrice) continue;
                        const rawChange = ((futurePrice - entryPrice) / entryPrice) * 100;
                        const directional = entry.recommendation === 'SELL' ? -rawChange : rawChange;
                        deltas.push(directional);
                        if (directional >= 0) wins++;
                        details.push({ ts: entry.ts, recommendation: entry.recommendation, confidence: entry.confidence, score: entry.score, outcome: directional, horizonMs: horizon.ms });
                    }
                    const avg = deltas.length ? (deltas.reduce((sum, v) => sum + v, 0) / deltas.length) : 0;
                    const sorted = deltas.slice().sort((a, b) => a - b);
                    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
                    const worst = sorted.length ? sorted[0] : 0;
                    const winRate = deltas.length ? (wins / deltas.length) * 100 : 0;
                    return { label: horizon.label, samples: deltas.length, winRate, avg, median, worst, details };
                };
                const stats = horizons.map(computeStats);
                const rows = stats.map(s => `
                    <tr>
                        <td>${s.label}</td>
                        <td>${s.samples}</td>
                        <td>${fmtPct(s.winRate, 1)}</td>
                        <td>${fmtPct(s.avg, 2)}</td>
                        <td>${fmtPct(s.median, 2)}</td>
                        <td>${fmtPct(s.worst, 2)}</td>
                    </tr>`).join('');
                const primaryDetails = stats.length ? stats[0].details.slice(-5).reverse() : [];
                const recentHtml = primaryDetails.length ? primaryDetails.map(item => {
                    const time = item.ts ? new Date(item.ts).toLocaleTimeString() : '-';
                    return `<li class="list-group-item bg-dark text-light border-secondary">
                        <div class="d-flex justify-content-between">
                            <span>${time}</span>
                            <span>${item.recommendation} · ${item.confidence || 0}%</span>
                        </div>
                        <div>Outcome after 5m: <strong class="${item.outcome >= 0 ? 'text-success' : 'text-danger'}">${fmtPct(item.outcome, 2)}</strong> (score ${fmtNum(item.score, 2)})</div>
                    </li>`;
                }).join('') : '<li class="list-group-item bg-dark text-light border-secondary">No realized trades yet.</li>';
                pane.innerHTML = `
                    <div class="table-responsive">
                        <table class="table table-dark table-striped table-sm mb-0">
                            <thead>
                                <tr>
                                    <th>Horizon</th>
                                    <th>Samples</th>
                                    <th>Win %</th>
                                    <th>Avg Change</th>
                                    <th>Median</th>
                                    <th>Worst</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                    <div class="mt-3">
                        <h6 class="text-info">Recent Outcomes (5m horizon)</h6>
                        <ul class="list-group list-group-flush">${recentHtml}</ul>
                    </div>`;
            } catch (e) { console.warn('renderBacktestTab error', e); }
        }

        function renderRiskMonitorTab() {
            try {
                const pane = document.getElementById('riskPane');
                const coinSelect = document.getElementById('riskCoinSelect');
                const lookbackSelect = document.getElementById('riskLookbackSelect');
                if (!pane || !coinSelect || !lookbackSelect) return;
                const coins = Object.keys(coinDataMap || {});
                if (!coins.length) {
                    coinSelect.innerHTML = '';
                    pane.innerHTML = '<p class="mb-0 text-muted">Waiting for data…</p>';
                    return;
                }
                if (!coinSelect.dataset.bound) {
                    coinSelect.addEventListener('change', () => {
                        window._riskCoin = coinSelect.value;
                        renderRiskMonitorTab();
                    });
                    coinSelect.dataset.bound = '1';
                }
                if (!lookbackSelect.dataset.bound) {
                    lookbackSelect.addEventListener('change', () => renderRiskMonitorTab());
                    lookbackSelect.dataset.bound = '1';
                }
                const prevCoin = window._riskCoin || coinSelect.value || coins[0];
                const currentCoin = coins.includes(prevCoin) ? prevCoin : coins[0];
                coinSelect.innerHTML = coins.map(c => `<option value="${c}" ${c === currentCoin ? 'selected' : ''}>${c}</option>`).join('');
                window._riskCoin = currentCoin;
                const lookback = Number(lookbackSelect.value) || 100;
                const data = coinDataMap[currentCoin];
                const analytics = data && data._analytics ? data._analytics : {};
                const history = (data && Array.isArray(data._history)) ? data._history.slice(-Math.max(20, lookback)) : [];
                if (history.length < 2) {
                    pane.innerHTML = '<p class="mb-0 text-muted">Not enough history to compute risk metrics.</p>';
                    return;
                }
                const fmtNum = (val, digits = 4) => {
                    const n = Number(val);
                    return Number.isFinite(n) ? n.toFixed(digits) : '-';
                };
                const fmtPct = (val, digits = 2) => {
                    const n = Number(val);
                    return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '-';
                };
                const prices = history.map(h => Number(h.price) || 0).filter(v => v > 0);
                if (prices.length < 2) {
                    pane.innerHTML = '<p class="mb-0 text-muted">Price history missing.</p>';
                    return;
                }
                const returns = [];
                for (let i = 1; i < prices.length; i++) {
                    const prev = prices[i - 1];
                    const curr = prices[i];
                    if (prev) returns.push(((curr - prev) / prev) * 100);
                }
                const meanReturn = returns.length ? returns.reduce((s, v) => s + v, 0) / returns.length : 0;
                const variance = returns.length ? returns.reduce((s, v) => s + Math.pow(v - meanReturn, 2), 0) / returns.length : 0;
                const returnStd = Math.sqrt(Math.max(variance, 0));
                const realizedVol = returnStd * Math.sqrt(60);
                const sortedReturns = returns.slice().sort((a, b) => a - b);
                const tailIdx = sortedReturns.length ? Math.max(0, Math.floor(sortedReturns.length * 0.05) - 1) : 0;
                const tailRisk = sortedReturns.length ? sortedReturns[tailIdx] : 0;
                let peak = prices[0];
                let maxDD = 0;
                for (const price of prices) {
                    if (price > peak) peak = price;
                    if (peak > 0) {
                        const dd = ((price - peak) / peak) * 100;
                        if (dd < maxDD) maxDD = dd;
                    }
                }
                const drawdown = Math.abs(maxDD);
                const atr = typeof computeATR === 'function' ? computeATR(history, 14) : 0;
                const riskScore = Number(data.risk_score || analytics.riskScore) || 0;
                const stressIndex = Math.round(Math.min(100, (Math.abs(tailRisk) * 1.5) + (realizedVol * 0.8) + (riskScore * 0.5)));
                const freqBuy = Number(analytics.freqBuy2h) || 0;
                const freqSell = Number(analytics.freqSell2h) || 0;
                const freqTotal = freqBuy + freqSell;
                const freqRatio = freqTotal > 0 ? (freqBuy / freqTotal) * 100 : 0;
                const volBuy = Number(analytics.volBuy2h) || 0;
                const volSell = Number(analytics.volSell2h) || 0;
                const volRatio = volSell > 0 ? (volBuy / volSell) * 100 : (volBuy > 0 ? 999 : 0);
                const stressClass = stressIndex >= 70 ? 'alert-danger' : stressIndex >= 50 ? 'alert-warning' : 'alert-success';
                pane.innerHTML = `
                    <div class="row g-3">
                        <div class="col-md-6">
                            <h6 class="text-info">Volatility & Drawdown</h6>
                            <ul class="list-unstyled small mb-0">
                                <li>ATR (14): <strong>${fmtNum(atr, 6)}</strong></li>
                                <li>Realized Vol (hourly): <strong>${fmtPct(realizedVol, 2)}</strong></li>
                                <li>Tail Risk (5th pct): <strong>${fmtPct(tailRisk, 2)}</strong></li>
                                <li>Max Drawdown: <strong>${fmtPct(drawdown, 2)}</strong></li>
                                <li>Mean Return: <strong>${fmtPct(meanReturn, 2)}</strong></li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-info">Flow & Liquidity</h6>
                            <ul class="list-unstyled small mb-0">
                                <li>Vol Ratio (2h): <strong>${fmtPct(volRatio, 1)}</strong></li>
                                <li>Freq Ratio (2h): <strong>${fmtPct(freqRatio, 1)}</strong></li>
                                <li>Risk Score: <strong>${riskScore}%</strong></li>
                                <li>Liquidity Proxy: <strong>${fmtNum(analytics.liquidity_avg_trade_value || 0, 2)}</strong></li>
                                <li>Sharp Insights: <strong>${(analytics.sharpInsights && analytics.sharpInsights[0]) || 'None'}</strong></li>
                            </ul>
                            <div class="${stressClass} mt-2 py-2 px-3 small">
                                Market Stress Index: <strong>${stressIndex}</strong>/100
                            </div>
                        </div>
                    </div>`;
            } catch (e) { console.warn('renderRiskMonitorTab error', e); }
        }

        function renderEventWatchTab() {
            try {
                const pane = document.getElementById('eventPane');
                if (!pane) return;
                const alerts = typeof loadAlertsFromStore === 'function' ? loadAlertsFromStore().slice(-10).reverse() : [];
                const events = (window._eventWatchBuffer || []).slice(-10).reverse();
                const spikes = (window._lastSpikeRows || []).slice(0, 10);
                if (!alerts.length && !events.length && !spikes.length) {
                    pane.innerHTML = '<p class="mb-0 text-muted">No events captured yet.</p>';
                    return;
                }
                const renderItems = (items, formatter, emptyText) => {
                    if (!items.length) return `<div class="text-muted">${emptyText}</div>`;
                    return items.map(formatter).join('');
                };
                const eventHtml = renderItems(events, (e) => {
                    const time = e.ts ? new Date(e.ts).toLocaleTimeString() : '-';
                    const msg = (e.messages || []).join(' • ');
                    return `<div class="list-group-item bg-dark text-light border-secondary mb-2">
                        <div class="d-flex justify-content-between"><strong>${e.coin || '-'}</strong><small class="text-muted">${time}</small></div>
                        <div>${msg || e.type || ''}</div>
                    </div>`;
                }, 'No sharp-insight events.');
                const alertHtml = renderItems(alerts, (a) => {
                    const time = a.ts ? new Date(a.ts).toLocaleTimeString() : '-';
                    return `<div class="list-group-item bg-dark text-light border-secondary mb-2">
                        <div class="d-flex justify-content-between"><strong>${a.coin || '-'}</strong><small class="text-muted">${time}</small></div>
                        <div>${a.message || ''}</div>
                    </div>`;
                }, 'No stored alerts.');
                const spikeHtml = renderItems(spikes, (s) => {
                    return `<div class="list-group-item bg-dark text-light border-secondary mb-2">
                        <div class="d-flex justify-content-between"><strong>${s.coin}</strong><small class="text-muted">${s.timeframe}</small></div>
                        <div>Volume spike ${s.ratio.toFixed(2)}x</div>
                    </div>`;
                }, 'No spike events.');
                pane.innerHTML = `
                    <div class="row g-3">
                        <div class="col-md-4">
                            <h6 class="text-info">Sharp Insights</h6>
                            <div class="small">${eventHtml}</div>
                        </div>
                        <div class="col-md-4">
                            <h6 class="text-info">Stored Alerts</h6>
                            <div class="small">${alertHtml}</div>
                        </div>
                        <div class="col-md-4">
                            <h6 class="text-info">Recent Spikes</h6>
                            <div class="small">${spikeHtml}</div>
                        </div>
                    </div>`;
            } catch (e) { console.warn('renderEventWatchTab error', e); }
        }

        const TAB_RENDER_INTERVALS = {
            signalLab: 1500,
            backtest: 6000,
            risk: 3000,
            events: 2500
        };
        const lastTabRenderAt = {};

        function maybeRenderHeavyTab(tabId, renderer, options = {}) {
            try {
                const pane = document.getElementById(tabId);
                if (!pane || typeof renderer !== 'function') return;
                const requireActive = options.requireActive !== false;
                const isActive = pane.classList.contains('active') || pane.classList.contains('show');
                if (requireActive && !isActive) return;
                const interval = options.interval || TAB_RENDER_INTERVALS[tabId] || 1500;
                const now = Date.now();
                const last = lastTabRenderAt[tabId] || 0;
                if (now - last < interval) return;
                lastTabRenderAt[tabId] = now;
                renderer();
            } catch (e) { console.warn('maybeRenderHeavyTab error', e); }
        }

        // Open info tab and scroll to Vol Ratio section
        function showVolRatioInfo() {
            try {
                const tab = document.getElementById('info-tab');
                if (tab) tab.click();
                setTimeout(() => {
                    const el = document.getElementById('volRatioSection');
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // highlight briefly
                        const orig = el.style.boxShadow;
                        el.style.boxShadow = '0 0 12px rgba(255,235,59,0.9)';
                        setTimeout(() => { el.style.boxShadow = orig; }, 1600);
                    }
                }, 180);
            } catch (e) { console.warn('showVolRatioInfo failed', e); }
        }
    

        // Restore hidden alerts as banners when modal button clicked
        try {
            const restoreBtn = document.getElementById('restoreHiddenAsBanners');
            if (restoreBtn) restoreBtn.addEventListener('click', () => {
                try {
                    const container = document.getElementById('alertBanner');
                    if (!container) return;
                    while (hiddenAlertBuffer && hiddenAlertBuffer.length) {
                        const a = hiddenAlertBuffer.shift();
                        try { showAlertBanner(a.title, a.message, a.type, 8000); } catch (e) { console.warn('restore show failed', e); }
                    }
                    // hide modal
                    try { const bm = bootstrap.Modal.getInstance(document.getElementById('hiddenAlertsModal')); if (bm) bm.hide(); } catch (e) { }
                } catch (e) { console.warn('restoreHiddenAsBanners failed', e); }
            });
        } catch (e) { console.warn('wiring restore hidden alerts failed', e); }
    
