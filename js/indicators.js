/**
 * Binance 短線選幣器 v3 — indicators
 * Vanilla JavaScript，依 index.html 的 defer 順序載入。
 */

function ema(a, p) { const k = 2 / (p + 1); let e = a[0]; for (let i = 1; i < a.length; i++)
    e = a[i] * k + e * (1 - k); return e; }
function rsi(a, p = 14) { if (a.length <= p)
    return NaN; let g = 0, l = 0; for (let i = 1; i <= p; i++) {
    const d = a[i] - a[i - 1];
    d >= 0 ? g += d : l -= d;
} let ag = g / p, al = l / p; for (let i = p + 1; i < a.length; i++) {
    const d = a[i] - a[i - 1], gg = Math.max(d, 0), ll = Math.max(-d, 0);
    ag = (ag * (p - 1) + gg) / p;
    al = (al * (p - 1) + ll) / p;
} if (al === 0)
    return 100; return 100 - 100 / (1 + ag / al); }
function atr(highs, lows, closes, p = 14) { if (closes.length <= p)
    return NaN; const tr = []; for (let i = 1; i < closes.length; i++) {
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
} return tr.slice(-p).reduce((a, b) => a + b, 0) / p; }
function calcTechnical(k) { const c = k.slice(0, -1); if (c.length < 55)
    return null; const closes = c.map(x => n(x[4])), highs = c.map(x => n(x[2])), lows = c.map(x => n(x[3])), vols = c.map(x => n(x[5])), last = closes.at(-1), e20 = ema(closes.slice(-50), 20), e50 = ema(closes.slice(-55), 50), rv = rsi(closes.slice(-40), 14), atr14 = atr(highs.slice(-30), lows.slice(-30), closes.slice(-30), 14), lastVol = vols.at(-1), avg20 = vols.slice(-21, -1).reduce((a, b) => a + b, 0) / 20, volRatio = avg20 > 0 ? lastVol / avg20 : NaN, prev20High = Math.max(...highs.slice(-21, -1)), prev10Low = Math.min(...lows.slice(-11, -1)), breakDist = (last - prev20High) / prev20High * 100; let emaState = 0; if (last > e20 && e20 > e50)
    emaState = 2;
else if (last > e20)
    emaState = 1;
else if (last < e20 && e20 < e50)
    emaState = -2;
else
    emaState = -1; return { last, e20, e50, rsi: rv, atr14, prev10Low, volRatio, prev20High, breakDist, emaState }; }
