/**
 * info-tab.js
 * Renders the Info/Runtime tab with system status, last raw JSON, and analytics snapshot
 * Dependencies: coinDataMap, ws, computeATR, getNumeric, calculateRecommendation, etc.
 */

(function () {
    'use strict';

    // ===================== Formatters =====================
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

    // ===================== Helpers =====================
    function meanStd(arr) {
        if (!arr.length) return { mean: 0, std: 0 };
        const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
        const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
        return { mean, std: Math.sqrt(variance) };
    }

    function calcHistoryReturn(history, ms) {
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
    }

    function computeOBVProxy(history) {
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
    }

    function computeVWAP(history) {
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
    }

    // ===================== Main Render Function =====================
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

            const coinDataMap = window.coinDataMap || {};
            const PERSIST_KEY = window.PERSIST_KEY || 'okx_calc_persist_history';

            const wsStateMap = { 0: 'CONNECTING', 1: 'OPEN', 2: 'CLOSING', 3: 'CLOSED' };
            const wsState = (typeof ws !== 'undefined' && ws && ws.readyState !== undefined) 
                ? wsStateMap[ws.readyState] || ws.readyState 
                : 'N/A';
            const coinCount = Object.keys(coinDataMap || {}).length;

            const alerts = typeof loadAlertsFromStore === 'function' ? loadAlertsFromStore() : [];
            const persistStore = (function () { 
                try { return JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}'); } 
                catch (e) { return {}; } 
            })();
            const persistedCoins = Object.keys(persistStore || {}).length;
            const lsKeys = Object.keys(localStorage).filter(k => 
                k.toString().toLowerCase().indexOf('okx_calc') === 0 || k.toString().toLowerCase().includes('okx')
            );

            // Find last update across coins
            let lastTs = 0;
            for (const c of Object.values(coinDataMap)) {
                try {
                    if (c && c._history && c._history.length) {
                        const t = c._history[c._history.length - 1].ts || 0;
                        if (t > lastTs) lastTs = t;
                    }
                } catch (e) { }
            }

            // Prepare last raw JSON and summary info
            const lastRaw = window._lastWsRaw || null;
            const lastCoin = window._lastReceivedCoin || null;
            const lastData = lastRaw || (lastCoin ? (coinDataMap[lastCoin] || null) : null);
            const analytics = (lastData && lastData._analytics) ? lastData._analytics : {};
            const history = (lastData && Array.isArray(lastData._history)) ? lastData._history.slice(-120) : [];
            const priceNow = Number(lastData && lastData.last) || 0;
            const priceHigh = Number(lastData && lastData.high) || priceNow;
            const priceLow = Number(lastData && lastData.low) || priceNow;
            const priceRange = priceHigh - priceLow;
            const pricePosition = priceRange > 0 ? ((priceNow - priceLow) / priceRange) * 100 : 50;

            const histPrices = history.map(h => Number(h.price) || 0).filter(v => v > 0);
            const priceStats = meanStd(histPrices);
            const priceZScore = (histPrices.length >= 6 && priceStats.std > 0 && priceNow)
                ? (priceNow - priceStats.mean) / priceStats.std
                : 0;

            const obvProxy = computeOBVProxy(history);
            const vwapValue = computeVWAP(history);
            const priceVsVwapPct = (vwapValue > 0 && priceNow > 0) ? ((priceNow - vwapValue) / vwapValue) * 100 : 0;
            const atr14 = (history.length && typeof computeATR === 'function') ? computeATR(history, 14) : 0;

            const safeGetLastNumeric = (...keys) => lastData && typeof getNumeric === 'function' 
                ? (getNumeric(lastData, ...keys) || 0) 
                : 0;

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
            const change5m = calcHistoryReturn(history, 5 * 60 * 1000);
            const change15m = calcHistoryReturn(history, 15 * 60 * 1000);
            const sharpInsights = (analytics.sharpInsights && analytics.sharpInsights.length) 
                ? analytics.sharpInsights.join(' • ') 
                : 'No sharp anomalies detected';
            const persistenceVol = analytics.persistenceBuy3 !== undefined ? analytics.persistenceBuy3 : '-';
            const persistenceFreq = analytics.persistenceFreqBuy3 !== undefined ? analytics.persistenceFreqBuy3 : '-';

            let recSnapshot = null;
            try {
                const recTimeframeSelect = document.getElementById('recTimeframe');
                const tf = (recTimeframeSelect && recTimeframeSelect.value) ? recTimeframeSelect.value : '120m';
                recSnapshot = typeof calculateRecommendation === 'function' && lastData 
                    ? calculateRecommendation(lastData, Math.round(pricePosition), tf, false) 
                    : null;
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
            const lastUpdateHuman = (lastData && (lastData.update_time || lastData.update_time_VOLCOIN)) 
                ? (new Date(Number(lastData.update_time) || Number(lastData.update_time_VOLCOIN) || Date.now()).toLocaleString()) 
                : '-';

            const persistHistoryEnabled = window.persistHistoryEnabled !== undefined ? window.persistHistoryEnabled : false;

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

            // Wire buttons
            wireInfoTabButtons(persistStore, lsKeys);

        } catch (e) { console.warn('renderInfoTab error', e); }
    }

    function wireInfoTabButtons(persistStore, lsKeys) {
        const PERSIST_KEY = window.PERSIST_KEY || 'okx_calc_persist_history';
        
        const expBtn = document.getElementById('exportPersistBtn');
        const clrBtn = document.getElementById('clearPersistBtn');
        const expLS = document.getElementById('exportLSBtn');
        const clrLS = document.getElementById('clearLSBtn');

        if (expBtn) expBtn.onclick = function () {
            try {
                const blob = new Blob([JSON.stringify(persistStore || {}, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); 
                a.href = url; 
                a.download = `persisted-history-${Date.now()}.json`; 
                document.body.appendChild(a); 
                a.click(); 
                a.remove(); 
                URL.revokeObjectURL(url);
            } catch (e) { 
                console.warn('exportPersist failed', e); 
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('Export failed', 'Could not export persisted history', 'danger', 4000); 
                }
            }
        };

        if (clrBtn) clrBtn.onclick = function () {
            try {
                if (!confirm('Clear all persisted history? This will remove per-coin stored histories.')) return;
                localStorage.setItem(PERSIST_KEY, JSON.stringify({}));
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('Persist cleared', 'Persisted history removed', 'info', 3000);
                }
            } catch (e) { 
                console.warn('clearPersist failed', e); 
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('Clear failed', 'Could not clear persisted history', 'danger', 4000); 
                }
            }
        };

        if (expLS) expLS.onclick = function () {
            try {
                const dump = {};
                for (const k of lsKeys) dump[k] = localStorage.getItem(k);
                const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); 
                a.href = url; 
                a.download = `okx-calc-localstorage-${Date.now()}.json`; 
                document.body.appendChild(a); 
                a.click(); 
                a.remove(); 
                URL.revokeObjectURL(url);
            } catch (e) { 
                console.warn('exportLS failed', e); 
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('Export failed', 'Could not export localStorage', 'danger', 4000); 
                }
            }
        };

        if (clrLS) clrLS.onclick = function () {
            try {
                if (!confirm('Clear all okx_calc related LocalStorage keys?')) return;
                for (const k of lsKeys) localStorage.removeItem(k);
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('LocalStorage cleared', 'Removed okx_calc keys', 'info', 3000);
                }
                if (typeof renderAlertsList === 'function') {
                    renderAlertsList();
                }
            } catch (e) { 
                console.warn('clearLS failed', e); 
                if (typeof showAlertBanner === 'function') {
                    showAlertBanner('Clear failed', 'Could not clear localStorage', 'danger', 4000); 
                }
            }
        };

        // Wire Run JSON (Paste) button to open test modal
        try {
            const runBtn = document.getElementById('openRunJsonBtn');
            if (runBtn) {
                runBtn.addEventListener('click', () => {
                    try {
                        if (typeof ensureTestJsonModal === 'function') {
                            ensureTestJsonModal();
                        }
                        const modalEl = document.getElementById('testJsonModal');
                        if (!modalEl) return;
                        const bs = new bootstrap.Modal(modalEl);
                        
                        setTimeout(() => {
                            const run = document.getElementById('testJsonRunBtn');
                            const ta = document.getElementById('testJsonTextarea');
                            const err = document.getElementById('testJsonError');
                            if (run && ta) {
                                run.onclick = () => {
                                    try {
                                        const txt = ta.value || '';
                                        if (!txt) { 
                                            if (err) { err.style.display = 'block'; err.textContent = 'Please paste JSON payload.'; } 
                                            return; 
                                        }
                                        let obj = null;
                                        try { 
                                            obj = JSON.parse(txt); 
                                        } catch (parseErr) { 
                                            if (err) { err.style.display = 'block'; err.textContent = 'Invalid JSON: ' + parseErr.message; } 
                                            return; 
                                        }
                                        if (err) { err.style.display = 'none'; err.textContent = ''; }
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
    }

    // ===================== Exports =====================
    window.renderInfoTab = renderInfoTab;
})();
