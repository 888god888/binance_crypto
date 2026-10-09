/**
 * Binance 短線選幣器 v3 — screener
 * Vanilla JavaScript，依 index.html 的 defer 順序載入。
 */

async function scan() { $("scanBtn").disabled = true; rows = []; selectedSymbol = null; $("detailContent").style.display = "none"; $("emptyDetail").style.display = "block"; $("emptyDetail").textContent = "掃描中..."; try {
    const interval = $("interval").value, topN = clamp(parseInt($("topN").value || 60), 10, 120), minVol = n($("minVol").value || 0) * 1e6, minAmp = n($("minAmp").value || 0), useFutures = $("useFutures").checked;
    setStatus("1/4 讀取 Binance USDT 現貨市場...");
    const [ex, tickers] = await Promise.all([fetchJSON(`${SPOT}/api/v3/exchangeInfo?permissions=SPOT&symbolStatus=TRADING`), fetchJSON(`${SPOT}/api/v3/ticker/24hr`)]);
    const symbolMap = new Map(ex.symbols.map(s => [s.symbol, s]));
    let candidates = tickers.map(t => { const meta = symbolMap.get(t.symbol); if (!meta)
        return null; const high = n(t.highPrice), low = n(t.lowPrice); return { symbol: t.symbol, base: meta.baseAsset, quote: meta.quoteAsset, lastPrice: n(t.lastPrice), change24: n(t.priceChangePercent), high24: high, low24: low, amp24: low > 0 ? (high - low) / low * 100 : 0, quoteVolume: n(t.quoteVolume) }; }).filter(x => x && x.quote === "USDT" && !isExcludedBase(x.base) && !extraStableBases.has(x.base) && x.quoteVolume >= minVol && x.amp24 >= minAmp).sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, topN);
    $("sumCandidates").textContent = candidates.length;
    setStatus(`2/4 初篩 ${candidates.length} 檔，抓取 ${interval} K 線...`);
    const tech = await pool(candidates, 6, async (c, i) => { const k = await fetchJSON(`${SPOT}/api/v3/klines?symbol=${c.symbol}&interval=${interval}&limit=80`); if (i % 8 === 0)
        await sleep(80); const z = calcTechnical(k); return z ? { ...c, ...z } : { error: "not enough klines", symbol: c.symbol }; });
    rows = tech.filter(x => x && !x.error && Number.isFinite(x.rsi));
    if (useFutures && rows.length) {
        setStatus(`3/4 現貨完成 ${rows.length} 檔，加入 Funding / OI...`);
        let premium = [];
        try {
            premium = await fetchJSON(`${FUT}/fapi/v1/premiumIndex`);
        }
        catch (e) { }
        const pmap = new Map((Array.isArray(premium) ? premium : []).map(x => [x.symbol, n(x.lastFundingRate) * 100]));
        rows.forEach(r => r.funding = pmap.has(r.symbol) ? pmap.get(r.symbol) : NaN);
        const oiTargets = rows.slice().sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, 30);
        const oiResults = await pool(oiTargets, 5, async (r) => { try {
            const h = await fetchJSON(`${FUT}/futures/data/openInterestHist?symbol=${r.symbol}&period=1h&limit=2`);
            if (Array.isArray(h) && h.length >= 2) {
                const a = n(h[0].sumOpenInterestValue), b = n(h.at(-1).sumOpenInterestValue);
                return { symbol: r.symbol, oiChange: a > 0 ? (b - a) / a * 100 : NaN };
            }
        }
        catch (e) { } return { symbol: r.symbol, oiChange: NaN }; });
        const omap = new Map(oiResults.map(x => [x.symbol, x.oiChange]));
        rows.forEach(r => r.oiChange = omap.has(r.symbol) ? omap.get(r.symbol) : NaN);
    }
    else
        rows.forEach(r => { r.funding = NaN; r.oiChange = NaN; });
    setStatus("4/4 計算總分與排序...");
    const maxLog = Math.max(...rows.map(r => Math.log10(Math.max(r.quoteVolume, 1))), 7);
    rows.forEach(r => { r.parts = scoreParts(r, maxLog); r.score = r.parts.total; });
    rows.sort((a, b) => b.score - a.score);
    const showN = clamp(parseInt($("showN").value || 30), 5, 100);
    rows = rows.slice(0, showN);
    rows.forEach((r, i) => r.rank = i + 1);
    render();
    $("sumAnalyzed").textContent = rows.length;
    $("sumTop").textContent = rows.length ? `${rows[0].base} ${rows[0].score.toFixed(0)}` : "-";
    $("sumAmp").textContent = rows.length ? `${(rows.reduce((a, b) => a + b.amp24, 0) / rows.length).toFixed(1)}%` : "-";
    $("sumTime").textContent = new Date().toLocaleString("zh-TW", { hour12: false });
    setStatus("完成。已自動展開最高分標的；也可以點其他列比較。");
    if (rows.length)
        showDetail(rows[0].symbol);
    else {
        $("emptyDetail").textContent = "沒有符合目前條件的幣種，試著降低最低振幅或成交額。";
    }
}
catch (e) {
    console.error(e);
    setStatus(`掃描失敗：${e.message}。若所在地網路限制 Binance 公開行情域名，需改用代理/後端。`);
    $("emptyDetail").textContent = "掃描失敗，請看上方狀態訊息。";
}
finally {
    $("scanBtn").disabled = false;
} }
