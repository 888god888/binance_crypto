/** v5 — 獨立幣種頁：History API 導航、返回及保留捲動位置。 */
const SCREEN_KEY = "binance-crypto-screen-v6";
const LEGACY_SCREEN_KEY = "binance-crypto-screen-v5";
const FIELDS = ["interval", "topN", "minVol", "minAmp", "showN", "fx", "fee", "useFutures"];
let lastListY = 0;
let lastTableX = 0;
let viewName = "list";
let touchStart = null;
let pendingScrollRestore = false;
let restoreTicket = 0;
let backGuardTimer = null;
let scrollSaveTimer = null;

function currentCoin() {
  const raw = new URLSearchParams(location.search).get("coin");
  return raw && /^[A-Z0-9]{2,30}USDT$/.test(raw) ? raw : null;
}
function listUrl() {
  const u = new URL(location.href);
  u.searchParams.delete("coin");
  return u.href;
}
function coinUrl(symbol) {
  const u = new URL(location.href);
  u.searchParams.set("coin", symbol);
  return u.href;
}
function readListPosition() {
  if (viewName !== "list") return;
  lastListY = Math.max(0, window.scrollY);
  const table = document.querySelector("#listView .tableWrap");
  lastTableX = table ? table.scrollLeft : 0;
}
function persistScreenState() {
  try {
    const fields = {};
    for (const id of FIELDS) {
      const el = $(id);
      fields[id] = el.type === "checkbox" ? el.checked : el.value;
    }
    const stats = {};
    for (const id of ["status", "sumCandidates", "sumAnalyzed", "sumTop", "sumAmp", "sumTime"]) stats[id] = $(id).textContent;
    const packed = JSON.stringify({ rows, sortState, fields, stats, lastListY, lastTableX, savedAt: Date.now() });
    try { sessionStorage.setItem(SCREEN_KEY, packed); } catch (_) {}
    // 第二份備援：iOS Safari 分頁遭回收或重啟時，盡量找回最後一次掃描。
    try { localStorage.setItem(SCREEN_KEY, packed); } catch (_) {}
  } catch (e) { /* 瀏覽器不允許儲存時，仍以記憶體維持當前分頁狀態 */ }
}
function restoreScreenState() {
  try {
    let raw = null;
    try { raw = sessionStorage.getItem(SCREEN_KEY) || sessionStorage.getItem(LEGACY_SCREEN_KEY); } catch (_) {}
    if (!raw) { try { raw = localStorage.getItem(SCREEN_KEY); } catch (_) {} }
    const saved = JSON.parse(raw || "null");
    if (!saved || !Array.isArray(saved.rows)) return;
    rows = saved.rows;
    if (saved.sortState && typeof saved.sortState.key === "string") sortState = saved.sortState;
    for (const id of FIELDS) {
      if (!saved.fields || !(id in saved.fields)) continue;
      const el = $(id);
      if (el.type === "checkbox") el.checked = !!saved.fields[id];
      else el.value = saved.fields[id];
    }
    for (const [id, value] of Object.entries(saved.stats || {})) {
      if ($(id)) $(id).textContent = value;
    }
    lastListY = Number(saved.lastListY) || 0;
    lastTableX = Number(saved.lastTableX) || 0;
    render();
  } catch (e) { /* 舊資料/儲存被清除時可重新掃描 */ }
}
function restoreListScroll(y = lastListY) {
  const ticket = ++restoreTicket;
  const targetY = Math.max(0, Number(y) || 0);
  // 列表先顯示，再等待完成 layout；Safari 有時會延遲計算捲動高度。
  const attempt = (tries = 0) => {
    if (ticket !== restoreTicket || viewName !== "list") return;
    const table = document.querySelector("#listView .tableWrap");
    if (table) table.scrollLeft = lastTableX;
    window.scrollTo(0, Math.min(targetY, Math.max(0, document.documentElement.scrollHeight - innerHeight)));
    if (tries < 5 && targetY > 0 && Math.abs(window.scrollY - targetY) > 5) {
      setTimeout(() => attempt(tries + 1), 70);
    } else {
      pendingScrollRestore = false;
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(() => attempt()));
}
function showListView(y) {
  viewName = "list";
  $("coinView").hidden = true;
  $("listView").hidden = false;
  document.title = "Binance 短線選幣器 v6";
  // 即使瀏覽器意外重建了 JS 執行環境，也優先恢復最近一次結果。
  if (!rows.length) restoreScreenState();
  if (rows.length && !document.querySelector("#resultTable tbody").children.length) render();
  pendingScrollRestore = true;
  restoreListScroll(y);
}
function showCoinView(symbol) {
  ++restoreTicket;
  viewName = "coin";
  $("listView").hidden = true;
  $("coinView").hidden = false;
  $("detailNavTitle").textContent = symbol.replace(/USDT$/, "/USDT");
  document.title = `${symbol.replace(/USDT$/, "/USDT")}｜Binance 短線選幣器`;
  if (rows.some(r => r.symbol === symbol)) {
    showDetail(symbol);
  } else {
    selectedSymbol = symbol;
    $("detailContent").style.display = "none";
    $("emptyDetail").style.display = "block";
    $("emptyDetail").textContent = "目前沒有這個幣的掃描資料。請返回排行榜按「開始掃描」，再點選幣種查看。";
  }
  window.scrollTo(0, 0);
}
function navigateToCoin(symbol) {
  if (!rows.some(r => r.symbol === symbol)) return;
  if (viewName === "list") {
    readListPosition();
    const state = { ...(history.state || {}), view: "list", scrollY: lastListY, tableX: lastTableX };
    history.replaceState(state, "", listUrl());
    persistScreenState();
  }
  history.pushState({ view: "coin", symbol, listY: lastListY, fromList: true }, "", coinUrl(symbol));
  showCoinView(symbol);
}
function backToRanking() {
  if (viewName !== "coin") return;
  const y = lastListY;
  // 先同步恢復畫面，杜絕 history.back() 尚未完成時留下空白頁。
  showListView(y);
  const before = location.href;
  if (history.state?.view === "coin" && history.state?.fromList) {
    history.back();
    // 部分 iOS WebView 不會回傳 popstate；保底修正網址。
    clearTimeout(backGuardTimer);
    backGuardTimer = setTimeout(() => {
      if (location.href === before && viewName === "list")
        history.replaceState({view: "list", scrollY: y, tableX: lastTableX}, "", listUrl());
    }, 650);
  } else {
    history.replaceState({view: "list", scrollY: y, tableX: lastTableX}, "", listUrl());
  }
  persistScreenState();
}
function onLocationChange(event) {
  clearTimeout(backGuardTimer);
  const symbol = currentCoin();
  if (symbol) {
    showCoinView(symbol);
  } else {
    // 不能把 0 誤當缺失：返回時以歷史快照為主。
    const y = Number.isFinite(event.state?.scrollY) ? event.state.scrollY : lastListY;
    if (Number.isFinite(event.state?.tableX)) lastTableX = event.state.tableX;
    showListView(y);
    persistScreenState();
  }
}

// 僅在幣種頁識別手指向右滑，避免排行榜水平捲動造成誤觸。
function handleTouchStart(e) {
  if (viewName !== "coin" || e.touches.length !== 1) return;
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}
function handleTouchEnd(e) {
  if (viewName !== "coin" || !touchStart || !e.changedTouches.length) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (dx > 95 && Math.abs(dy) < Math.abs(dx) * 0.55) backToRanking();
}

function initNavigation() {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  restoreScreenState();
  const symbol = currentCoin();
  if (symbol) {
    history.replaceState({ ...(history.state || {}), view: "coin", symbol }, "", location.href);
    showCoinView(symbol);
  } else {
    history.replaceState({ ...(history.state || {}), view: "list", scrollY: lastListY, tableX: lastTableX }, "", location.href);
    showListView(lastListY);
  }
  $("backToList").addEventListener("click", backToRanking);
  window.addEventListener("popstate", onLocationChange);
  $("coinView").addEventListener("touchstart", handleTouchStart, {passive:true});
  $("coinView").addEventListener("touchend", handleTouchEnd, {passive:true});
  $("coinView").addEventListener("touchcancel", () => { touchStart = null; }, {passive:true});
  window.addEventListener("pagehide", () => {readListPosition();persistScreenState();});
  window.addEventListener("pageshow", (e) => {
    // 針對 Safari 返回快取（BFCache）的還原。
    if (e.persisted) {
      if (!rows.length) restoreScreenState();
      const symbol = currentCoin();
      if (symbol) showCoinView(symbol);
      else showListView(lastListY);
    }
  });
  window.addEventListener("scroll", () => {
    if (viewName === "list" && !pendingScrollRestore) {
      readListPosition();
      clearTimeout(scrollSaveTimer);
      scrollSaveTimer = setTimeout(persistScreenState, 350);
    }
  }, {passive:true});
  document.querySelectorAll("#listView input, #listView select").forEach(el => el.addEventListener("change", persistScreenState));
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNavigation);
else queueMicrotask(initNavigation);
