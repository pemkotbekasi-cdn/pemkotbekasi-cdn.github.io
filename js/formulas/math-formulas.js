// Core math formulas shared across the dashboard.

/**
 * Converts a value into a percentage of its average and clamps NaN to 0.
 * Used by spike detection to avoid Infinity when avg volume is zero.
 */
function CheckInfinity(value, avg) {
    const persentase = avg !== 0
        ? Math.round((value / avg) * 100)
        : 0;
    return persentase;
}

/**
 * Returns the mean and population standard deviation for a numeric series.
 * Feeds the z-score logic inside analytics and insight panels.
 */
function meanStd(arr) {
    if (!arr || arr.length === 0) return { mean: 0, std: 0 };
    const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
    const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
    return { mean, std: Math.sqrt(variance) };
}

/**
 * Hyperbolic tangent approximation used to normalize imbalance scores to [-1, 1].
 */
function _tanh(x) {
    if (Math.tanh) return Math.tanh(x);
    const e = Math.exp(2 * x);
    return (e - 1) / (e + 1);
}

/**
 * Computes an ATR-like average absolute price change for the given history window.
 */
function computeATR(history, periods = 14) {
    try {
        if (!history || !Array.isArray(history) || history.length < 2) return 0;
        const arr = history.slice(-Math.max(periods, 2));
        let sum = 0;
        let count = 0;
        for (let i = 1; i < arr.length; i++) {
            const p0 = Number(arr[i - 1].price) || Number(arr[i - 1].last) || 0;
            const p1 = Number(arr[i].price) || Number(arr[i].last) || 0;
            if (p0 > 0 && p1 > 0) {
                sum += Math.abs(p1 - p0);
                count++;
            }
        }
        return count > 0 ? (sum / count) : 0;
    } catch (e) {
        return 0;
    }
}
