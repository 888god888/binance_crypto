/**
 * Binance 短線選幣器 v3 — scoring
 * Vanilla JavaScript，依 index.html 的 defer 順序載入。
 */

function scoreParts(r, maxLogVol) { const lv = Math.log10(Math.max(r.quoteVolume, 1)), liquidity = clamp((lv - 6) / (maxLogVol - 6 || 1), 0, 1) * 20; let volatility; if (r.amp24 < 3)
    volatility = r.amp24 / 3 * 6;
else if (r.amp24 <= 12)
    volatility = 6 + (r.amp24 - 3) / 9 * 9;
else
    volatility = clamp(15 - (r.amp24 - 12) * .35, 6, 15); const volume = clamp((r.volRatio - .8) / 1.7, 0, 1) * 20, trend = r.emaState === 2 ? 15 : r.emaState === 1 ? 9 : r.emaState === -1 ? 4 : 1; let breakout = 0; if (r.breakDist >= 0 && r.breakDist <= 3)
    breakout = 15;
else if (r.breakDist < 0 && r.breakDist >= -2)
    breakout = 13;
else if (r.breakDist < -2 && r.breakDist >= -5)
    breakout = 7;
else if (r.breakDist > 3)
    breakout = 8; let momentum = 5; if (r.rsi >= 78 || r.rsi <= 25)
    momentum = 1.5;
else if (r.rsi >= 68 || r.rsi <= 32)
    momentum = 3; if (Math.abs(r.change24) > 20)
    momentum = Math.min(momentum, 2); const oi = Number.isFinite(r.oiChange) ? clamp((r.oiChange + 1) / 6, 0, 1) * 10 : 0; let fundingPenalty = 0; if (Number.isFinite(r.funding)) {
    const af = Math.abs(r.funding);
    if (af > .03)
        fundingPenalty = clamp((af - .03) / .07 * 10, 0, 10);
} return { liquidity, volatility, volume, trend, breakout, momentum, oi, fundingPenalty, total: clamp(liquidity + volatility + volume + trend + breakout + momentum + oi - fundingPenalty, 0, 100) }; }
function reasons(r) { const a = []; if (r.volRatio >= 2)
    a.push('<span class="tag good">明顯放量</span>');
else if (r.volRatio >= 1.3)
    a.push('<span class="tag">放量</span>'); if (r.emaState === 2)
    a.push('<span class="tag good">多頭排列</span>'); if (r.breakDist >= 0 && r.breakDist < 2)
    a.push('<span class="tag good">突破20K高</span>');
else if (r.breakDist < 0 && r.breakDist >= -2)
    a.push('<span class="tag">接近突破</span>'); if (r.rsi >= 75)
    a.push('<span class="tag warn">RSI過熱</span>'); if (Math.abs(r.change24) >= 15)
    a.push('<span class="tag warn">24h波動過大</span>'); if (Number.isFinite(r.oiChange) && r.oiChange >= 3)
    a.push('<span class="tag good">OI增加</span>'); if (Number.isFinite(r.funding) && Math.abs(r.funding) > .05)
    a.push('<span class="tag warn">Funding擁擠</span>'); if (!a.length)
    a.push('<span class="tag">中性</span>'); return a.join(""); }
