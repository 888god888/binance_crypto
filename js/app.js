/**
 * Binance 短線選幣器 v3 — app
 * Vanilla JavaScript，依 index.html 的 defer 順序載入。
 */

let rows = [], sortState = { key: "score", dir: -1 }, selectedSymbol = null;
function setStatus(s) { $("status").textContent = s; }
function valClass(v) { return v > 0 ? "good" : v < 0 ? "bad" : ""; }
function render() { const tbody = document.querySelector("#resultTable tbody"); tbody.innerHTML = ""; const data = [...rows].sort((a, b) => { const k = sortState.key, d = sortState.dir; let av = a[k], bv = b[k]; if (k === "symbol")
    return String(av).localeCompare(String(bv)) * d; av = Number(av); bv = Number(bv); if (!Number.isFinite(av))
    av = -Infinity; if (!Number.isFinite(bv))
    bv = -Infinity; return (av - bv) * d; }); data.forEach(r => { const scoreClass = r.score >= 70 ? "hot" : r.score >= 55 ? "mid" : "", emaText = r.emaState === 2 ? "多頭" : r.emaState === 1 ? "偏多" : r.emaState === -2 ? "空頭" : "偏空", tr = document.createElement("tr"); if (r.symbol === selectedSymbol)
    tr.classList.add("selected"); tr.innerHTML = `<td class="rank">${r.rank}</td><td><span class="symbol">${r.base}</span><span style="color:#7890b8">/USDT</span></td><td><span class="score ${scoreClass}">${r.score.toFixed(0)}</span></td><td>${fmtPrice(r.lastPrice)}</td><td class="${valClass(r.change24)}">${fmtPct(r.change24)}</td><td>${fmtPct(r.amp24)}</td><td>${fmtVol(r.quoteVolume)}</td><td class="${r.volRatio >= 1.5 ? "good" : ""}">${Number.isFinite(r.volRatio) ? r.volRatio.toFixed(2) + "x" : "-"}</td><td class="${r.rsi >= 75 || r.rsi <= 25 ? "warn" : ""}">${Number.isFinite(r.rsi) ? r.rsi.toFixed(1) : "-"}</td><td class="${r.emaState > 0 ? "good" : "bad"}">${emaText}</td><td class="${r.breakDist >= -2 && r.breakDist <= 2 ? "good" : ""}">${fmtPct(r.breakDist)}</td><td class="${Number.isFinite(r.funding) && Math.abs(r.funding) > .05 ? "warn" : ""}">${fmtPct(r.funding, 4)}</td><td class="${valClass(r.oiChange)}">${fmtPct(r.oiChange)}</td><td class="reason">${reasons(r)}</td>`; tr.addEventListener("click", () => showDetail(r.symbol)); tbody.appendChild(tr); }); }
document.querySelectorAll("th[data-key]").forEach(th => th.addEventListener("click", () => { const k = th.dataset.key; if (sortState.key === k)
    sortState.dir *= -1;
else {
    sortState.key = k;
    sortState.dir = k === "symbol" ? 1 : -1;
} render(); }));
$("scanBtn").addEventListener("click", scan);
$("fx").addEventListener("change", () => { if (selectedSymbol)
    showDetail(selectedSymbol); });
$("fee").addEventListener("change", () => { if (selectedSymbol)
    showDetail(selectedSymbol); });
