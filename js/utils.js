/**
 * Binance 短線選幣器 v3 — utils
 * Vanilla JavaScript，依 index.html 的 defer 順序載入。
 */

const $ = id => document.getElementById(id), n = v => Number(v), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sleep = ms => new Promise(r => setTimeout(r, ms));
function fmtPrice(v) { if (!Number.isFinite(v))
    return "-"; if (v >= 1000)
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 }); if (v >= 1)
    return v.toLocaleString(undefined, { maximumFractionDigits: 4 }); return v.toLocaleString(undefined, { maximumSignificantDigits: 6 }); }
function fmtPct(v, d = 2) { return Number.isFinite(v) ? `${v.toFixed(d)}%` : "-"; }
function fmtVol(v) { if (!Number.isFinite(v))
    return "-"; if (v >= 1e9)
    return `${(v / 1e9).toFixed(2)}B`; if (v >= 1e6)
    return `${(v / 1e6).toFixed(1)}M`; if (v >= 1e3)
    return `${(v / 1e3).toFixed(0)}K`; return v.toFixed(0); }
function fmtTWD(v) { return Number.isFinite(v) ? `NT$${Math.round(v).toLocaleString()}` : "-"; }
function fmtNum(v, d = 4) { return Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: d }) : "-"; }
