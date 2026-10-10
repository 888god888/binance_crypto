/** v5 — 獨立幣種頁：History API 導航、返回及保留捲動位置。 */
const SCREEN_KEY = "binance-crypto-screen-v5";
const FIELDS = ["interval", "topN", "minVol", "minAmp", "showN", "fx", "fee", "useFutures"];
let lastListY = 0;
let lastTableX = 0;
let viewName = "list";
let touchStart = null;
let pendingScrollRestore = false;

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
    sessionStorage.setItem(SCREEN_KEY, JSON.stringify({ rows, sortState, fields, stats, lastListY, lastTableX, savedAt: Date.now() }));
  } catch (e) { /* 瀏覽器不允許儲存時，仍以記憶體維持當前分頁狀態 */ }
}
function restoreScreenState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SCREEN_KEY) || "null");
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
  // 兩個繪製影格後再捲回，避免手機瀏覽器在隱藏頁面切換時回到頂部。
  const targetY = Math.max(0, Number(y) || 0);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const table = document.querySelector("#listView .tableWrap");
    if (table) table.scrollLeft = lastTableX;
    window.scrollTo(0, targetY);
    pendingScrollRestore = false;
  }));
}
function showListView(y) {
  viewName = "list";
  $("coinView").hidden = true;
  $("listView").hidden = false;
  document.title = "Binance 短線選幣器 v5";
  pendingScrollRestore = true;
  restoreListScroll(y);
}
function showCoinView(symbol) {
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
  if (history.state?.view === "coin" && history.state?.fromList) {
    history.back(); // popstate 統一負責還原原位置
  } else {
    history.replaceState({view: "list", scrollY: lastListY, tableX: lastTableX}, "", listUrl());
    showListView(lastListY);
  }
}
function onLocationChange(event) {
  const symbol = currentCoin();
  if (symbol) {
    showCoinView(symbol);
  } else {
    const y = Number.isFinite(event.state?.scrollY) ? event.state.scrollY : lastListY;
    if (Number.isFinite(event.state?.tableX)) lastTableX = event.state.tableX;
    showListView(y);
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
  window.addEventListener("scroll", () => {
    if (viewName === "list" && !pendingScrollRestore) {
      readListPosition();
      // 不在每次捲動時寫入 sessionStorage，以避免低階手機卡頓。
    }
  }, {passive:true});
  document.querySelectorAll("#listView input, #listView select").forEach(el => el.addEventListener("change", persistScreenState));
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNavigation);
else queueMicrotask(initNavigation);
