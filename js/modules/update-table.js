/**
 * update-table.js
 * Main table update function for the dashboard
 * Dependencies: coinDataMap, getNumeric, calculateRecommendation, computeATR, 
 *               advancedSortState, compareWithComparator, showInsightTab, 
 *               maybeRenderHeavyTab, renderInfoTab, renderSignalLab, etc.
 */

(function () {
    'use strict';

    // ===================== DOM refs (will be cached on first call) =====================
    let summaryBody, volBody, volRatioBody, spikeBody, recsBody, microBody;
    let sortBySelect, recTimeframeSelect;
    let useAtrRecs, tpMinInput, tpMaxInput, slMaxInput, confSensitivity;

    function cacheDOMRefs() {
        if (summaryBody) return; // already cached
        summaryBody = document.getElementById('summaryBody');
        volBody = document.getElementById('volBody');
        volRatioBody = document.getElementById('volRatioBody');
        spikeBody = document.getElementById('spikeBody');
        recsBody = document.getElementById('recsBody');
        microBody = document.getElementById('microBody');
        sortBySelect = document.getElementById('sortBy');
        recTimeframeSelect = document.getElementById('recTimeframe');
        useAtrRecs = document.getElementById('useAtrRecs');
        tpMinInput = document.getElementById('tpMin');
        tpMaxInput = document.getElementById('tpMax');
        slMaxInput = document.getElementById('slMax');
        confSensitivity = document.getElementById('confSensitivity');
    }

    // ===================== Formatters =====================
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

    // ===================== Durability Helpers =====================
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

    function getDurabilityClass(value) {
        if (value >= 67) return 'durability-excellent';
        if (value >= 34) return 'durability-good';
        return 'durability-poor';
    }

    // ===================== Sort Value Computation =====================
    function computeHistoryPercentChange(d, lookbackMs) {
        try {
            if (!d || !d._history || !Array.isArray(d._history) || d._history.length === 0) return 0;
            const now = Date.now();
            if (!lookbackMs) {
                const first = d._history[0];
                const last = d._history[d._history.length - 1];
                if (!first || !last || !first.price) return 0;
                const p0 = Number(first.price) || 0;
                const p1 = Number(last.price) || 0;
                return p0 > 0 ? ((p1 - p0) / p0) * 100 : 0;
            }
            const cutoff = now - lookbackMs;
            let point = null;
            for (let i = d._history.length - 1; i >= 0; i--) {
                if (d._history[i].ts <= cutoff) { point = d._history[i]; break; }
            }
            if (!point) point = d._history[0];
            const last = d._history[d._history.length - 1];
            const p0 = Number(point.price) || 0;
            const p1 = Number(last.price) || 0;
            return p0 > 0 ? ((p1 - p0) / p0) * 100 : 0;
        } catch (e) { return 0; }
    }

    function parseLookbackMs(name) {
        try {
            const re = /(\d+)(sec|min|jam|hour|m)/ig;
            let match, lastMatch = null;
            while ((match = re.exec(name)) !== null) { lastMatch = match; }
            if (!lastMatch) {
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

    function computeVolRatioFor(data, buyAliases = [], sellAliases = [], analyticsBuyKey, analyticsSellKey) {
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

    function getSortValue(data, criteria) {
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
                        const rec = calculateRecommendation(data, 50, null, false);
                        return rec && typeof rec.score === 'number' ? rec.score : 0;
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

            // Volume Ratio (all timeframes)
            case 'vol_ratio_1m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1menit', 'vol_buy_1m', 'vol_buy_1min'],
                    ['count_VOL_minute1_sell', 'vol_sell_1MENIT', 'vol_sell_1menit', 'vol_sell_1m', 'vol_sell_1min']
                );
            case 'vol_ratio_5m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5menit', 'vol_buy_5m', 'vol_buy_5min'],
                    ['count_VOL_minute_5_sell', 'vol_sell_5MENIT', 'vol_sell_5menit', 'vol_sell_5m', 'vol_sell_5min']
                );
            case 'vol_ratio_10m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10menit', 'vol_buy_10m', 'vol_buy_10min'],
                    ['count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10menit', 'vol_sell_10m', 'vol_sell_10min']
                );
            case 'vol_ratio_15m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m'],
                    ['count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m']
                );
            case 'vol_ratio_20m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m'],
                    ['count_VOL_minute_20_sell', 'vol_sell_20MENIT', 'vol_sell_20m']
                );
            case 'vol_ratio_30m':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m'],
                    ['count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m']
                );
            case 'vol_ratio_1h':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT', 'vol_buy_60menit', 'vol_buy_60m'],
                    ['count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT', 'vol_sell_60menit', 'vol_sell_60m']
                );
            case 'vol_ratio':
            case 'vol_ratio_2h':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT', 'vol_buy_2jam'],
                    ['count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT', 'vol_sell_2jam'],
                    'volBuy2h', 'volSell2h'
                );
            case 'vol_ratio_24h':
                return computeVolRatioFor(data,
                    ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24jam', 'vol_buy_24h', 'vol_buy_24H'],
                    ['count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24jam', 'vol_sell_24h', 'vol_sell_24H'],
                    'volBuy24h', 'volSell24h'
                );

            // Volume timeframes
            case 'vol_buy_1h':
                return parseFloat(data.count_VOL_minute_60_buy) || 0;
            case 'vol_sell_1h':
                return parseFloat(data.count_VOL_minute_60_sell) || 0;
            case 'vol_total_1h':
                return (parseFloat(data.count_VOL_minute_60_buy) || 0) + (parseFloat(data.count_VOL_minute_60_sell) || 0);

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
            case 'vol_durability_24h':
            case 'vol_dur_overall':
            case 'vol_dur_24h':
                return getVolDurabilityMetric(data, '24h', ['percent_sum_VOL_overall_buy', 'percent_vol_buy_24h']);

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
                const map = {
                    'change_1min_4': 'percent_change_1Min_4', 'change_5min_20': 'percent_change_5Min_20',
                    'change_10sec_1': 'percent_change_10Second_1', 'change_10min_2': 'percent_change_10Min_2',
                    'change_10sec_2': 'percent_change_10Second_2', 'change_15min_2': 'percent_change_15Min_2',
                    'change_1min_5': 'percent_change_1Min_5', 'change_1jam_18': 'percent_change_1jam_18',
                    'change_20min_2': 'percent_change_20Min_2', 'change_2jam_10': 'percent_change_2jam_10',
                    'change_30min_1': 'percent_change_30Min_1', 'change_5min_25': 'percent_change_5Min_25'
                };
                const key = map[criteria];
                if (key && (data[key] !== undefined && data[key] !== null)) return parseFloat(data[key]) || 0;
                if (key) {
                    const lk = key.toLowerCase();
                    if (data[lk] !== undefined && data[lk] !== null) return parseFloat(data[lk]) || 0;
                }
                const ms = parseLookbackMs(criteria);
                return Number(computeHistoryPercentChange(data, ms || undefined)) || 0;

            // Update Times
            case 'update_activity':
                return parseFloat(data.update_time_FREQ) || 0;
            case 'update_sum':
                return parseFloat(data.sum_update_time) || 0;
            case 'update_general':
                return parseFloat(data.update_time) || 0;

            // Total Volumes
            case 'total_vol_fiat':
            case 'total_vol':
                return parseFloat(data.total_vol) || 0;

            // Delay
            case 'delay_ms':
                return parseFloat(data.delay_ms_aggrade) || 0;

            default:
                return parseFloat(data.percent_sum_VOL_minute_120_buy) || 0;
        }
    }

    // ===================== Main Update Table Function =====================
    function updateTable() {
        cacheDOMRefs();
        const coinDataMap = window.coinDataMap || {};

        // Clear all table bodies
        if (summaryBody) summaryBody.innerHTML = '';
        if (volBody) volBody.innerHTML = '';
        if (volRatioBody) volRatioBody.innerHTML = '';
        if (recsBody) recsBody.innerHTML = '';
        const volDurBody = document.getElementById('volDurBody');
        if (volDurBody) volDurBody.innerHTML = '';
        if (spikeBody) spikeBody.innerHTML = '';
        if (microBody) microBody.innerHTML = '';

        const spikeRows = [];
        const filterText = typeof getActiveFilterValue === 'function' ? getActiveFilterValue() : '';
        const sortBy = sortBySelect ? sortBySelect.value : 'vol_ratio';
        const sortOrder = typeof getSortOrderValue === 'function' ? getSortOrderValue() : 'desc';
        const rowLimit = window.rowLimit !== undefined ? window.rowLimit : 5;

        let rowCount = 0;
        let recsRowCount = 0;

        const advancedSortState = typeof window.getAdvancedSortState === 'function' ? window.getAdvancedSortState() : { enabled: false };
        const advancedSortActive = Boolean(advancedSortState && advancedSortState.enabled);
        const activeFilters = advancedSortActive ? (advancedSortState.filters || {}) : {};
        const sortPipeline = (advancedSortActive && advancedSortState.criteria && advancedSortState.criteria.length)
            ? advancedSortState.criteria
            : [{ metric: sortBy, order: sortOrder }];

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

        // Sort coins
        const sortedCoins = Object.entries(coinDataMap)
            .filter(([coinKey, data]) => {
                if (filterText && !coinKey.toLowerCase().includes(filterText)) return false;
                return passesAdvancedFiltersWrapper(data);
            })
            .sort(([coinKeyA, dataA], [coinKeyB, dataB]) => {
                const diff = compareUsingPipeline(dataA, dataB);
                if (diff !== 0) return diff;
                return coinKeyA.localeCompare(coinKeyB);
            });

        // Render rows
        for (const [coinKey, data] of sortedCoins) {
            if (rowCount >= rowLimit) break;

            const coin = coinKey;
            const price = (data.last || 0).toFixed(4);
            const change = data.percent_change || 0;
            const volBuy = getNumeric(data, 'count_VOL_minute_120_buy', 'vol_buy_2JAM', 'vol_buy_120MENIT');
            const volSell = getNumeric(data, 'count_VOL_minute_120_sell', 'vol_sell_2JAM', 'vol_sell_120MENIT');
            const volBuy24h = getNumeric(data, 'count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24jam', 'vol_buy_24h');
            const volSell24h = getNumeric(data, 'count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24jam', 'vol_sell_24h');

            // Volume for various timeframes
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

            // Price position
            const currentPrice = parseFloat(data.last) || 0;
            const highPrice = parseFloat(data.high) || currentPrice;
            const lowPrice = parseFloat(data.low) || currentPrice;
            const priceRange = highPrice - lowPrice;
            const pricePosition = priceRange > 0 ? Math.round(((currentPrice - lowPrice) / priceRange) * 100) : 50;

            // Render Vol Ratio tab
            if (volRatioBody) {
                try {
                    renderVolRatioRow(volRatioBody, coin, data, volBuy1m, volSell1m, volBuy5m, volSell5m,
                        volBuy10m, volSell10m, volBuy15m, volSell15m, volBuy20m, volSell20m,
                        volBuy30m, volSell30m, volBuy60m, volSell60m, volBuy2h, volSell2h, volBuy24h, volSell24h);
                } catch (e) { console.warn('volRatio row insert failed for', coin, e); }
            }

            // Detect spikes
            detectSpikes(data, coin, spikeRows);

            // Summary row
            if (summaryBody) {
                renderSummaryRow(summaryBody, coin, data, price, change, pricePosition,
                    volBuy2h, volSell2h, volBuy24h, volSell24h);
            }

            // Recs tab
            if (recsBody) {
                recsRowCount = renderRecsRow(recsBody, coin, data, pricePosition, recsRowCount, rowLimit);
            }

            // Vol row
            if (volBody) {
                renderVolRow(volBody, coin, data, volBuy1m, volSell1m, volBuy5m, volSell5m,
                    volBuy10m, volSell10m, volBuy15m, volSell15m, volBuy20m, volSell20m,
                    volBuy30m, volSell30m, volBuy60m, volSell60m, volBuy, volSell, volBuy24h, volSell24h);
            }

            // Vol Durability row
            if (volDurBody) {
                renderVolDurRow(volDurBody, coin, data);
            }

            // Micro row
            if (microBody) {
                renderMicroRow(microBody, coin, data);
            }

            rowCount++;
        }

        // Render spike table
        renderSpikeTable(spikeBody, spikeRows, rowLimit);

        try { window._lastSpikeRows = spikeRows.slice(0, 50); } catch (e) { }

        // Update other tabs
        try { if (typeof renderInfoTab === 'function') renderInfoTab(); } catch (e) { console.warn('renderInfoTab failed', e); }
        if (typeof maybeRenderHeavyTab === 'function') {
            maybeRenderHeavyTab('signalLab', renderSignalLab, { interval: 1500 });
            maybeRenderHeavyTab('backtest', renderBacktestTab, { interval: 6000 });
            maybeRenderHeavyTab('risk', renderRiskMonitorTab, { interval: 3000 });
            maybeRenderHeavyTab('events', renderEventWatchTab, { interval: 2500, requireActive: false });
        }
    }

    // ===================== Row Renderers =====================
    function renderVolRatioRow(body, coin, data, vb1, vs1, vb5, vs5, vb10, vs10, vb15, vs15, vb20, vs20, vb30, vs30, vb60, vs60, vb2h, vs2h, vb24, vs24) {
        const vr = body.insertRow();
        vr.dataset.coin = coin;

        const normalize = (v) => {
            if (v === undefined || v === null) return 0;
            if (typeof v === 'number') return v;
            try {
                const s = String(v).replace(/[^0-9eE+\-.]/g, '');
                const n = parseFloat(s);
                return Number.isFinite(n) ? n : 0;
            } catch (e) { return 0; }
        };

        const fmtRatio = (buy, sell) => {
            const b = normalize(buy);
            const s = normalize(sell);
            if (s > 0) return Math.round((b / s) * 100) + '%';
            if (b > 0) return '∞';
            return '0%';
        };

        vr.insertCell(0).textContent = coin;
        vr.insertCell(1).textContent = fmtRatio(vb1, vs1);
        vr.insertCell(2).textContent = fmtRatio(vb5, vs5);
        vr.insertCell(3).textContent = fmtRatio(vb10, vs10);
        vr.insertCell(4).textContent = fmtRatio(vb15, vs15);
        vr.insertCell(5).textContent = fmtRatio(vb20, vs20);
        vr.insertCell(6).textContent = fmtRatio(vb30, vs30);
        vr.insertCell(7).textContent = fmtRatio(vb60, vs60);
        vr.insertCell(8).textContent = fmtRatio(vb2h, vs2h);
        vr.insertCell(9).textContent = fmtRatio(vb24, vs24);

        // Last Change
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
        if (lastChangeVal === null) lastChangeVal = parseFloat(data.percent_change) || 0;

        const lcCell = vr.insertCell(10);
        lcCell.textContent = (Number.isFinite(lastChangeVal) ? Number(lastChangeVal.toFixed(2)) : 0) + '%';
        lcCell.className = lastChangeVal > 0 ? 'text-success' : lastChangeVal < 0 ? 'text-danger' : 'text-muted';
    }

    function detectSpikes(data, coin, spikeRows) {
        try {
            const spikeThreshold = 2.0;
            const timeframes = [
                { label: '1m', volKeys: ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1min'], avgKeys: ['avg_VOLCOIN_buy_1MENIT'] },
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
    }

    function renderSummaryRow(body, coin, data, price, change, pricePosition, volBuy2h, volSell2h, volBuy24h, volSell24h) {
        let row = body.insertRow();
        row.classList.add('summary-row');
        row.style.cursor = 'pointer';
        row.dataset.coin = coin;
        row.onclick = () => { if (typeof showInsightTab === 'function') showInsightTab(coin, data); };

        const coinCell = row.insertCell(0);
        coinCell.textContent = coin;
        coinCell.className = 'text-primary';
        coinCell.title = 'Click for insights';
        row.insertCell(1).textContent = price;

        let cell = row.insertCell(2);
        cell.textContent = change + '%';
        cell.className = change > 0 ? 'text-success fw-bold' : change < 0 ? 'text-danger fw-bold' : 'text-muted';

        cell = row.insertCell(3);
        cell.textContent = pricePosition + '%';
        cell.className = getDurabilityClass(pricePosition);

        // Recommendation
        const selectedTf = (recTimeframeSelect && recTimeframeSelect.value) ? recTimeframeSelect.value : '120m';
        const recommendation = typeof calculateRecommendation === 'function' ? calculateRecommendation(data, pricePosition, selectedTf, true) : null;
        cell = row.insertCell(4);
        cell.textContent = recommendation && recommendation.recommendation ? `${recommendation.recommendation} (${recommendation.confidence || 0}%)` : 'HOLD';
        cell.className = recommendation && recommendation.className ? recommendation.className : 'recommendation-hold';

        // Risk
        cell = row.insertCell(5);
        const riskScore = data.risk_score || (data._analytics && data._analytics.riskScore) || 0;
        cell.textContent = riskScore + '%';
        cell.className = riskScore >= 67 ? 'text-danger fw-bold' : riskScore >= 40 ? 'text-warning fw-bold' : 'text-success fw-bold';

        // Volume Ratio 2h
        const volumeRatio2h = volSell2h > 0 ? (volBuy2h / volSell2h) * 100 : (volBuy2h > 0 ? 999 : 0);
        cell = row.insertCell(6);
        cell.textContent = Math.round(volumeRatio2h) + '%';
        cell.className = volumeRatio2h > 200 ? 'text-success fw-bold' : volumeRatio2h < 50 ? 'text-danger fw-bold' : 'text-warning fw-bold';

        row.insertCell(7).textContent = volBuy2h;
        row.insertCell(8).textContent = volSell2h;

        // Vol Durability 2h
        let volDur2h = getNumeric(data, 'percent_sum_VOL_minute_120_buy', 'percent_vol_buy_120min', 'percent_vol_buy_2jam');
        if ((!volDur2h || volDur2h === 0) && (volBuy2h || volSell2h)) {
            const total2h = (volBuy2h || 0) + (volSell2h || 0);
            volDur2h = total2h > 0 ? Math.round(((volBuy2h || 0) / total2h) * 100) : 0;
        }
        cell = row.insertCell(9);
        cell.textContent = (isNaN(volDur2h) ? 0 : volDur2h) + '%';
        cell.className = getDurabilityClass(volDur2h);

        row.insertCell(10).textContent = volBuy24h;
        row.insertCell(11).textContent = volSell24h;

        let ts = data.update_time || data.update_time_VOLCOIN || 0;
        if (ts && ts < 1e12) ts = ts * 1000;
        row.insertCell(12).textContent = ts ? new Date(ts).toLocaleString() : '-';
    }

    function renderRecsRow(body, coin, data, pricePosition, recsRowCount, rowLimit) {
        const requestedRecsLimit = isFinite(rowLimit) ? rowLimit : Infinity;
        if (recsRowCount >= requestedRecsLimit) return recsRowCount;

        const selectedTf = (recTimeframeSelect && recTimeframeSelect.value) ? recTimeframeSelect.value : '120m';
        const priceNow = parseFloat(data.last) || 0;
        const recTf = typeof calculateRecommendation === 'function' ? calculateRecommendation(data, pricePosition, selectedTf, true) : { recommendation: 'HOLD', confidence: 0 };
        const conf = (recTf.confidence || 0) / 100;
        const sens = (confSensitivity && Number(confSensitivity.value)) || 1;
        const tpMin = tpMinInput ? Math.max(0, Number(tpMinInput.value) || 2) / 100 : 0.02;
        const tpMax = tpMaxInput ? Math.max(tpMin, Number(tpMaxInput.value) || 0.10) / 100 : 0.10;
        const slMax = slMaxInput ? Math.max(0, Number(slMaxInput.value) || 5) / 100 : 0.05;

        let rangeFactor = Math.min(tpMax, tpMin + conf * (tpMax - tpMin) * sens);
        if (useAtrRecs && useAtrRecs.checked && data._history && typeof computeATR === 'function') {
            const atr = computeATR(data._history, 14);
            if (atr > 0 && priceNow > 0) {
                const atrPct = (atr / priceNow) * sens;
                rangeFactor = Math.min(tpMax, Math.max(tpMin, atrPct));
            }
        }

        let tp = '-', sl = '-';
        if (priceNow > 0 && recTf.recommendation === 'BUY') {
            tp = (priceNow * (1 + rangeFactor)).toFixed(4);
            sl = (priceNow * (1 - Math.min(slMax, Math.max(0.005, rangeFactor / 2)))).toFixed(4);
        } else if (priceNow > 0 && recTf.recommendation === 'SELL') {
            tp = (priceNow * (1 - rangeFactor)).toFixed(4);
            sl = (priceNow * (1 + Math.min(slMax, Math.max(0.005, rangeFactor / 2)))).toFixed(4);
        }

        const r = body.insertRow();
        r.insertCell(0).textContent = coin;
        r.insertCell(1).textContent = selectedTf;
        r.insertCell(2).textContent = recTf.recommendation;
        r.insertCell(3).textContent = `${recTf.confidence || 0}%`;
        r.insertCell(4).textContent = priceNow || '-';
        r.insertCell(5).textContent = tp;
        r.insertCell(6).textContent = sl;

        return recsRowCount + 1;
    }

    function renderVolRow(body, coin, data, vb1, vs1, vb5, vs5, vb10, vs10, vb15, vs15, vb20, vs20, vb30, vs30, vb60, vs60, vb2h, vs2h, vb24, vs24) {
        const row = body.insertRow();
        row.insertCell(0).textContent = coin;
        row.insertCell(1).textContent = vb1;
        row.insertCell(2).textContent = vs1;
        row.insertCell(3).textContent = vb5;
        row.insertCell(4).textContent = vs5;
        row.insertCell(5).textContent = vb10;
        row.insertCell(6).textContent = vs10;
        row.insertCell(7).textContent = vb15;
        row.insertCell(8).textContent = vs15;
        row.insertCell(9).textContent = vb20;
        row.insertCell(10).textContent = vs20;
        row.insertCell(11).textContent = vb30;
        row.insertCell(12).textContent = vs30;
        row.insertCell(13).textContent = vb60;
        row.insertCell(14).textContent = vs60;
        row.insertCell(15).textContent = vb2h;
        row.insertCell(16).textContent = vs2h;

        const volRatio2h = vs2h > 0 ? (vb2h / vs2h) * 100 : (vb2h > 0 ? 999 : 0);
        const cell = row.insertCell(17);
        cell.textContent = Math.round(volRatio2h) + '%';
        cell.className = volRatio2h > 200 ? 'text-success fw-bold' : volRatio2h < 50 ? 'text-danger fw-bold' : 'text-warning fw-bold';

        row.insertCell(18).textContent = vb24;
        row.insertCell(19).textContent = vs24;
        row.insertCell(20).textContent = (vb24 || 0) + (vs24 || 0);
    }

    function renderVolDurRow(body, coin, data) {
        try {
            const vdr = body.insertRow();
            vdr.insertCell(0).textContent = coin;

            // Price change
            const pct = Number(data.percent_change) || 0;
            const ccell = vdr.insertCell(1);
            ccell.textContent = (Math.round(pct * 100) / 100) + '%';
            ccell.className = pct > 0 ? 'text-success fw-bold' : (pct < 0 ? 'text-danger fw-bold' : '');

            function getDurPct(pctKey, buyKeys, sellKeys) {
                let p = getNumeric(data, pctKey);
                if (p && p > 0) return Math.round(p);
                const b = getNumeric(data, ...buyKeys);
                const s = getNumeric(data, ...sellKeys);
                const t = (b || 0) + (s || 0);
                return t > 0 ? Math.round((b / t) * 100) : 0;
            }

            const cells = [
                getDurPct('percent_sum_VOL_minute1_buy', ['count_VOL_minute1_buy', 'vol_buy_1MENIT', 'vol_buy_1m'], ['count_VOL_minute1_sell', 'vol_sell_1MENIT', 'vol_sell_1m']),
                getDurPct('percent_sum_VOL_minute_5_buy', ['count_VOL_minute_5_buy', 'vol_buy_5MENIT', 'vol_buy_5m'], ['count_VOL_minute_5_sell', 'vol_sell_5MENIT', 'vol_sell_5m']),
                getDurPct('percent_sum_VOL_minute_10_buy', ['count_VOL_minute_10_buy', 'vol_buy_10MENIT', 'vol_buy_10m'], ['count_VOL_minute_10_sell', 'vol_sell_10MENIT', 'vol_sell_10m']),
                getDurPct('percent_sum_VOL_minute_15_buy', ['count_VOL_minute_15_buy', 'vol_buy_15MENIT', 'vol_buy_15m'], ['count_VOL_minute_15_sell', 'vol_sell_15MENIT', 'vol_sell_15m']),
                getDurPct('percent_sum_VOL_minute_20_buy', ['count_VOL_minute_20_buy', 'vol_buy_20MENIT', 'vol_buy_20m'], ['count_VOL_minute_20_sell', 'vol_sell_20MENIT', 'vol_sell_20m']),
                getDurPct('percent_sum_VOL_minute_30_buy', ['count_VOL_minute_30_buy', 'vol_buy_30MENIT', 'vol_buy_30m'], ['count_VOL_minute_30_sell', 'vol_sell_30MENIT', 'vol_sell_30m']),
                getDurPct('percent_sum_VOL_minute_60_buy', ['count_VOL_minute_60_buy', 'vol_buy_1JAM', 'vol_buy_60MENIT'], ['count_VOL_minute_60_sell', 'vol_sell_1JAM', 'vol_sell_60MENIT']),
                getDurPct('percent_sum_VOL_overall_buy', ['count_VOL_minute_1440_buy', 'vol_buy_24JAM', 'vol_buy_24h'], ['count_VOL_minute_1440_sell', 'vol_sell_24JAM', 'vol_sell_24h'])
            ];

            for (const cval of cells) {
                const c = vdr.insertCell(-1);
                c.textContent = (isNaN(cval) ? 0 : cval) + '%';
                c.className = getDurabilityClass(cval);
            }
        } catch (e) { console.warn('volDur row error', e); }
    }

    function renderMicroRow(body, coin, data) {
        const analytics = data._analytics || {};
        const row = body.insertRow();
        row.insertCell(0).textContent = coin;
        row.insertCell(1).textContent = fmtPctFromUnit(analytics.multiTfCohesion || 0);
        row.insertCell(2).textContent = fmtNum(analytics.volumeAcceleration || 0, 2);
        row.insertCell(3).textContent = fmtNum(analytics.freqBurstBuy || 0, 2);
        row.insertCell(4).textContent = fmtNum(analytics.orderFlowStabilityIndex || 0, 2);
        row.insertCell(5).textContent = fmtNum(analytics.flowStrengthIndex || 0, 2);
        row.insertCell(6).textContent = fmtNum(analytics.zWeightedPressure || 0, 2);
        row.insertCell(7).textContent = fmtNum(analytics.tradeImbalanceMomentum || 0, 2);
        row.insertCell(8).textContent = fmtNum(analytics.compositeInstitutionalSignal || 0, 2);
        row.insertCell(9).textContent = fmtNum(analytics.liquidityShockIndex || 0, 2);
        row.insertCell(10).textContent = fmtNum(analytics.rangeCompressionIndex || 0, 3);
        row.insertCell(11).textContent = fmtNum(analytics.priceFlowConflictIndex || 0, 2);
    }

    function renderSpikeTable(body, spikeRows, rowLimit) {
        if (!body) return;
        spikeRows.sort((a, b) => b.ratio - a.ratio);
        const maxSpikes = isFinite(rowLimit) ? rowLimit : spikeRows.length;
        const showRows = spikeRows.slice(0, maxSpikes);
        for (const s of showRows) {
            const r = body.insertRow();
            r.insertCell(0).textContent = s.coin;
            r.insertCell(1).textContent = s.timeframe;
            r.insertCell(2).textContent = s.vol;
            r.insertCell(3).textContent = s.avg;
            const cell = r.insertCell(4);
            cell.textContent = s.ratio.toFixed(2) + 'x';
            cell.className = s.ratio >= 4 ? 'text-success fw-bold' : s.ratio >= 2 ? 'text-warning fw-bold' : '';
            const ts = s.update_time && s.update_time < 1e12 ? s.update_time * 1000 : s.update_time;
            r.insertCell(5).textContent = ts ? new Date(ts).toLocaleString() : '-';
        }
    }

    // ===================== Exports =====================
    window.updateTable = updateTable;
    window.getSortValue = getSortValue;
    window.getVolDurabilityMetric = getVolDurabilityMetric;
    window.getDurabilityClass = getDurabilityClass;
})();
