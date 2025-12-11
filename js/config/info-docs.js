/**
 * info-docs.js
 * Documentation content for the Info tab - rendered dynamically
 * This file contains all feature descriptions, column explanations, and metrics documentation
 */

(function() {
    'use strict';

    window.INFO_DOCS = {
        version: '2.0.0',
        lastUpdated: '2025-12-11',
        
        // ===================== Available Features =====================
        features: [
            { name: 'Live Feed', icon: '📡', desc: 'WebSocket real-time dengan heartbeat monitoring, exponential backoff reconnect, dan adaptive throttling.' },
            { name: 'Summary Tab', icon: '📊', desc: 'Tabel ringkasan per-coin dengan sorting multi-kriteria. Klik baris untuk Insight detail.' },
            { name: 'Smart Analysis', icon: '🧠', desc: 'Tab Smart dengan 12 metrik: SMI, Intensity, Divergence, Accum Score, Whale, R/I Ratio, Pressure, Trend, Breakout%, LSI, Mode, Signal.' },
            { name: 'Recommendations', icon: '🎯', desc: 'Per-timeframe (1m-24h) dengan konsensus All. Termasuk TP/SL berbasis ATR.' },
            { name: 'Microstructure', icon: '🔬', desc: 'Metrik order flow: Cohesion, FBI, OFSI, FSI, Z-Press, TIM, CIS, LSI, Range Comp, PFCI.' },
            { name: 'Worker Pool', icon: '🧵', desc: 'Multi-threaded computation untuk heavy analytics tanpa blocking UI.' },
            { name: 'Alerts System', icon: '🔔', desc: 'Banner alerts dengan sound, webhook, compact mode, dan buffer limit (max 200).' },
            { name: 'Data Persistence', icon: '💾', desc: 'History per-coin (max 300 points) tersimpan di localStorage dengan quota management.' },
            { name: 'Advanced Sort', icon: '🔀', desc: 'Multi-criteria sorting dengan filter min/max dan durability threshold.' },
            { name: 'Export/Import', icon: '📦', desc: 'Export history, alerts, dan settings ke JSON. Import via Run JSON.' }
        ],

        // ===================== Summary Tab Columns =====================
        summaryColumns: [
            { name: 'Coin', icon: '🪙', desc: 'Nama cryptocurrency (BTC, ETH, dll)' },
            { name: 'Price', icon: '💰', desc: 'Harga terakhir dalam USD' },
            { name: 'Change %', icon: '📈', desc: 'Persentase perubahan harga dalam periode terakhir' },
            { name: 'Price Pos', icon: '📍', desc: 'Posisi harga dalam range High-Low (0-100). 0 = di Low, 100 = di High' },
            { name: 'Recommendation', icon: '🎯', desc: 'Rekomendasi BUY/SELL/HOLD dengan confidence percentage' },
            { name: 'Vol Dur', icon: '⚖️', desc: 'Volume Durability - dominasi buyer dalam timeframe tertentu' },
            { name: 'Risk', icon: '⚠️', desc: 'Risk Score berdasarkan volatilitas dan anomali' }
        ],

        // ===================== Smart Tab Metrics =====================
        smartMetrics: [
            { name: 'SMI', fullName: 'Smart Money Index', icon: '💎', desc: 'Mendeteksi dominasi whale vs retail. >150 = WHALE, 100-150 = MIXED, <100 = RETAIL.', range: '0-500' },
            { name: 'Intensity', fullName: 'Trade Intensity', icon: '⚡', desc: 'Intensitas trading vs rata-rata historis. HIGH = >70%, EXTREME = >100%.', range: '0-200%' },
            { name: 'Divergence', fullName: 'Momentum Divergence', icon: '🔀', desc: 'Deteksi divergence harga vs flow. BULL DIV = flow bullish tapi harga turun.', values: 'BULL DIV, BEAR DIV, BULLISH, BEARISH, NEUTRAL' },
            { name: 'Accum Score', fullName: 'Accumulation Score', icon: '📥', desc: 'Skor akumulasi/distribusi. >70 = ACCUMULATION, <30 = DISTRIBUTION.', range: '0-100' },
            { name: 'Whale', fullName: 'Whale Activity', icon: '🐋', desc: 'Indeks aktivitas whale berdasarkan SMI, volume vs avg, dan durability. HIGH >70.', range: '0-100' },
            { name: 'R/I Ratio', fullName: 'Retail/Institutional Ratio', icon: '👥', desc: 'Rasio whale vs intensity. INST = institutional dominan, RETAIL = retail dominan.', values: 'INST, INST+, MIXED, RETAIL+, RETAIL' },
            { name: 'Pressure', fullName: 'Pressure Index', icon: '📊', desc: 'Tekanan beli/jual. Positif = BUY pressure, Negatif = SELL pressure.', range: '-100 to +100' },
            { name: 'Trend', fullName: 'Trend Strength', icon: '📈', desc: 'Kekuatan dan arah tren. STRONG >70%, dengan direction UP/DOWN/SIDEWAYS.', range: '0-100%' },
            { name: 'Breakout%', fullName: 'Breakout Probability', icon: '💥', desc: 'Probabilitas breakout berdasarkan ATR compression, intensity spike, imbalance.', range: '0-100%' },
            { name: 'LSI', fullName: 'Liquidity Stress Index', icon: '💧', desc: 'Stress likuiditas. HIGH = illiquid (big trades move market), LOW = liquid.', range: '0-100' },
            { name: 'Mode', fullName: 'Market Mode', icon: '🎭', desc: 'Klasifikasi regime pasar berdasarkan volatilitas dan bias.', values: 'TREND, TREND_UP, TREND_DOWN, RANGE, SQUEEZE' },
            { name: 'Signal', fullName: 'Smart Signal', icon: '🚦', desc: 'Sinyal trading gabungan dari semua metrik smart.', values: 'BUY, HOLD, SELL' }
        ],

        // ===================== Microstructure Metrics =====================
        microMetrics: [
            { name: 'Cohesion', fullName: 'Cohesion Index', icon: '🔗', desc: 'Skor keselarasan harga, volume, dan frekuensi. Tinggi = buyer dominan konsisten.', range: '0-100' },
            { name: 'Acc Vol', fullName: 'Aggressive Volume', icon: '📊', desc: 'Akumulasi delta volume agresif (market buy vs sell).', unit: 'normalized' },
            { name: 'FBI', fullName: 'Frequency Burst Index', icon: '💨', desc: 'Rasio frekuensi pendek (1m/5m) vs baseline 2h. >1.0 = burst transaksi.', range: '0-5+' },
            { name: 'OFSI', fullName: 'Order Flow Stability', icon: '📏', desc: 'Stabilitas arus order. Tinggi = noise rendah, partisipasi teratur.', range: '0-100' },
            { name: 'FSI', fullName: 'Flow Strength Index', icon: '💪', desc: 'Kekuatan arus modal lintas timeframe. >70 = buyer dominan.', range: '0-100' },
            { name: 'Z-Press', fullName: 'Z-Weighted Pressure', icon: '📐', desc: 'Z-score tekanan volume dan frekuensi. Untuk identifikasi pergerakan signifikan.', range: '-3 to +3' },
            { name: 'TIM', fullName: 'Trade Imbalance Momentum', icon: '⚖️', desc: 'Momentum perubahan imbalance. Positif = buyer taking over.', range: '-100 to +100' },
            { name: 'CIS', fullName: 'Composite Institutional Signal', icon: '🏛️', desc: 'Skor akhir positioning institusi dari Cohesion, FSI, FBI, TIM, LSI.', range: '0-100' },
            { name: 'LSI', fullName: 'Liquidity Shock Index', icon: '⚡', desc: 'Deteksi lonjakan/hilangnya likuiditas. Ekstrem = potensi breakout/slippage.', range: '0-100' },
            { name: 'Range Comp', fullName: 'Range Compression', icon: '🗜️', desc: 'ATR vs rentang harga. Rendah = squeeze (potensi ledakan).', range: '0-100' },
            { name: 'PFCI', fullName: 'Price-Flow Conflict', icon: '⚔️', desc: 'Konflik harga vs order flow. Tinggi = potensi reversal.', range: '-100 to +100' }
        ],

        // ===================== Volume Durability =====================
        durabilityLevels: [
            { range: '67-100%', label: 'Excellent', class: 'bg-success', desc: 'Buyer sangat dominan' },
            { range: '50-66%', label: 'Good', class: 'bg-info', desc: 'Buyer sedikit dominan' },
            { range: '34-49%', label: 'Neutral', class: 'bg-warning', desc: 'Seimbang atau seller sedikit dominan' },
            { range: '0-33%', label: 'Poor', class: 'bg-danger', desc: 'Seller sangat dominan' }
        ],

        // ===================== Recommendation Algorithm =====================
        recommendations: {
            buy: {
                label: 'BUY',
                icon: '🟢',
                class: 'text-success',
                confidence: '≥60%',
                conditions: [
                    'Price Position ≤33% (dekat Low)',
                    'Volume Durability ≥67%',
                    'Buy/Sell Ratio >2.0',
                    'Smart Signal = BUY',
                    'Accumulation Score >60'
                ]
            },
            sell: {
                label: 'SELL',
                icon: '🔴',
                class: 'text-danger',
                confidence: '≥60%',
                conditions: [
                    'Price Position ≥67% (dekat High)',
                    'Volume Durability ≤33%',
                    'Buy/Sell Ratio <0.5',
                    'Smart Signal = SELL',
                    'Accumulation Score <40'
                ]
            },
            hold: {
                label: 'HOLD',
                icon: '🟡',
                class: 'text-warning',
                confidence: '<60%',
                conditions: [
                    'Kondisi pasar netral/mixed',
                    'Tidak ada sinyal kuat',
                    'Smart Signal = HOLD',
                    'Perlu monitoring lebih lanjut'
                ]
            }
        },

        // ===================== Tips =====================
        tips: [
            { category: 'Screening', tip: 'Gunakan Cohesion + CIS untuk screening cepat positioning institusi.' },
            { category: 'Timing', tip: 'Cek LSI dan Range Comp untuk timing entry. Squeeze = potensi breakout.' },
            { category: 'Risk', tip: 'Gunakan PFCI sebagai filter risiko kontra-trend.' },
            { category: 'Smart', tip: 'Kombinasikan SMI + Whale + Accum Score untuk deteksi akumulasi whale.' },
            { category: 'Divergence', tip: 'BULL DIV saat harga turun = potensi reversal bullish.' },
            { category: 'Mode', tip: 'SQUEEZE mode = volatilitas rendah, siap-siap breakout besar.' }
        ],

        // ===================== WebSocket Status =====================
        wsStatus: {
            connected: { icon: '🟢', label: 'Connected', desc: 'WebSocket aktif dan menerima data' },
            connecting: { icon: '🟡', label: 'Connecting', desc: 'Sedang mencoba koneksi...' },
            disconnected: { icon: '🔴', label: 'Disconnected', desc: 'Koneksi terputus, akan reconnect otomatis' },
            heartbeat: {
                healthy: { icon: '💚', label: 'Healthy', desc: 'Aktivitas <20 detik' },
                delayed: { icon: '💛', label: 'Delayed', desc: 'Aktivitas 20-40 detik' },
                stale: { icon: '❤️', label: 'Stale', desc: 'Tidak ada aktivitas >40 detik' }
            }
        }
    };

    console.log('[INFO_DOCS] Loaded v' + window.INFO_DOCS.version);
})();
