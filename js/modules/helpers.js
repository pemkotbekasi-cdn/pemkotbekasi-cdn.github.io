// Helper utilities split from websocket-example.js

// Debounce helper to reduce DOM churn from frequent updates
function debounce(fn, wait) {
    let t = null;
    return function (...args) {
        if (t) clearTimeout(t);
        t = setTimeout(() => { try { fn.apply(this, args); } catch (e) { }; t = null; }, wait);
    };
}

// Draw a simple SVG sparkline from a history array
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

// Comparator helper for advanced filters
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

// Expose helpers globally
window.debounce = debounce;
window.drawSparkline = drawSparkline;
window.normalizeComparatorValue = normalizeComparatorValue;
window.compareWithComparator = compareWithComparator;
