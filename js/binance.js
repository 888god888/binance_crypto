/**
 * Binance 短線選幣器 v3 — binance
 * Vanilla JavaScript，依 index.html 的 defer 順序載入。
 */

async function fetchJSON(u) { const r = await fetch(u, { cache: "no-store" }); if (!r.ok)
    throw new Error(`${r.status} ${r.statusText}`); return r.json(); }
async function pool(items, limit, fn) { const out = new Array(items.length); let next = 0; async function worker() { while (true) {
    const i = next++;
    if (i >= items.length)
        return;
    try {
        out[i] = await fn(items[i], i);
    }
    catch (e) {
        out[i] = { error: e.message, symbol: items[i].symbol || items[i] };
    }
} } await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker)); return out; }
function isExcludedBase(b) { return stableBases.has(b) || excludedSuffixes.some(s => b.endsWith(s)); }
