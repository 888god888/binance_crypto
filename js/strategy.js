/**
 * Binance 短線選幣器 v3 — strategy
 * Vanilla JavaScript，依 index.html 的 defer 順序載入。
 */

function makeSetup(r) {
    if (!Number.isFinite(r.atr14) || r.atr14 <= 0)
        return { state: "wait", label: "資料不足", cls: "warn", note: "ATR 資料不足，先不要用自動價位。" };
    if (r.emaState <= 0)
        return { state: "wait", label: "先觀察", cls: "bad", note: "目前不是現貨做多優先結構，等價格重新站上 EMA20、EMA20 轉強後再看。" };
    if (r.rsi >= 78 || r.change24 >= 20)
        return { state: "wait", label: "過熱不追", cls: "warn", note: "動能已偏熱，先等回踩或整理，不用為了高分追價。" };
    let type, mid;
    if (r.breakDist >= -1.5 && r.breakDist <= 1.5) {
        type = "突破/回踩";
        mid = r.prev20High;
    }
    else if (r.emaState === 2 && r.last > r.e20 && ((r.last - r.e20) / r.e20 * 100) <= 3.5) {
        type = "EMA20 回踩";
        mid = r.e20;
    }
    else
        return { state: "wait", label: "等更好位置", cls: "warn", note: "趨勢不差，但目前離關鍵價位較遠；等接近 EMA20 或前 20 根高點再評估。" };
    const entryLow = Math.max(0, mid - r.atr14 * .18), entryHigh = mid + r.atr14 * .18, entryMid = (entryLow + entryHigh) / 2;
    let stop = Math.max(r.prev10Low * .998, entryMid - r.atr14 * 1.35);
    stop = Math.min(stop, entryLow - r.atr14 * .12);
    const risk = entryMid - stop;
    if (!(risk > 0))
        return { state: "wait", label: "價位不合理", cls: "warn", note: "目前自動停損距離過小，請改用圖表手動判讀。" };
    const t1 = entryMid + risk * 1.5, t2 = entryMid + risk * 2.3;
    return { state: "active", label: type, cls: "good", note: type === "突破/回踩" ? "價格位於前 20 根高點附近，偏向等待突破確認或突破後回踩承接。" : "多頭結構仍在，偏向等待回踩 EMA20 附近而不是追高。", entryLow, entryHigh, entryMid, stop, t1, t2, riskPct: risk / entryMid * 100 };
}
function simulate(capitalTWD, setup) {
    const fx = n($("fx").value || 31.8), fee = n($("fee").value || 0.1) / 100;
    if (setup.state !== "active" || !Number.isFinite(fx) || fx <= 0)
        return null;
    const usdt = capitalTWD / fx, qty = usdt / setup.entryMid;
    const calc = (px) => { const gross = (px / setup.entryMid - 1) * capitalTWD; const feeCost = capitalTWD * fee + capitalTWD * (px / setup.entryMid) * fee; return { gross, feeCost, net: gross - feeCost, ret: (gross - feeCost) / capitalTWD * 100 }; };
    return { capitalTWD, usdt, qty, stop: calc(setup.stop), t1: calc(setup.t1), t2: calc(setup.t2) };
}
function analysisBullets(r, s) { const arr = []; if (r.quoteVolume >= 1e9)
    arr.push("24h 成交額很大，流動性條件佳。");
else if (r.quoteVolume >= 1e8)
    arr.push("24h 成交額足夠，適合列入短線觀察。"); if (r.volRatio >= 2)
    arr.push(`上一根已收 K 成交量約為近 20 根均量的 ${r.volRatio.toFixed(2)} 倍，屬明顯放量。`);
else if (r.volRatio >= 1.3)
    arr.push(`成交量約放大到 ${r.volRatio.toFixed(2)} 倍。`); if (r.emaState === 2)
    arr.push("價格 > EMA20 > EMA50，屬多頭排列。");
else if (r.emaState === 1)
    arr.push("價格在 EMA20 上方，但 EMA20/EMA50 尚未形成完整多頭排列。");
else
    arr.push("目前 EMA 結構偏弱，現貨做多優先度較低。"); if (r.breakDist >= -2 && r.breakDist <= 1)
    arr.push(`距前 20 根 K 高點約 ${fmtPct(r.breakDist)}，接近關鍵突破區。`); if (r.rsi >= 75)
    arr.push(`RSI14=${r.rsi.toFixed(1)}，短線偏熱，不宜只因強勢就追價。`);
else if (r.rsi >= 50 && r.rsi < 70)
    arr.push(`RSI14=${r.rsi.toFixed(1)}，動能偏多但尚未極端。`); if (Number.isFinite(r.oiChange) && r.oiChange >= 3)
    arr.push(`OI 1h 增加 ${fmtPct(r.oiChange)}，槓桿資金正在增加；需要搭配價格方向判讀。`); if (Number.isFinite(r.funding) && Math.abs(r.funding) > .05)
    arr.push(`Funding=${fmtPct(r.funding, 4)}，部位可能偏擁擠，短線要防急拉急殺。`); if (s.state !== "active")
    arr.push(s.note); return arr; }
