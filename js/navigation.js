/** v9 — iPhone PWA：單文件雙畫面。返回不呼叫或依賴瀏覽器 History。 */
const SCREEN_KEY = 'binance-crypto-screen-v9';
const OLD_SCREEN_KEYS = ['binance-crypto-screen-v8','binance-crypto-screen-v6','binance-crypto-screen-v5'];
const FIELDS = ['interval','topN','minVol','minAmp','showN','fx','fee','useFutures'];
let lastListY = 0;
let lastTableX = 0;
let viewName = 'list';
let touchStart = null;
let restoreTicket = 0;
let pendingScrollRestore = false;
let scrollSaveTimer = null;
let initializedNavigation = false;

function navEl(id) { return document.getElementById(id); }
function validSymbol(s) { return typeof s === 'string' && /^[A-Z0-9]{2,30}USDT$/.test(s); }
function readListPosition() {
  if(viewName !== 'list' || pendingScrollRestore) return;
  lastListY = Math.max(0, window.scrollY || 0);
  const table = document.querySelector('#listView .tableWrap');
  if(table) lastTableX = Math.max(0, table.scrollLeft || 0);
}
function getSnapshot() {
  const fields = {}, stats = {};
  for(const id of FIELDS) {
    const el = navEl(id); if(!el) continue;
    fields[id] = el.type === 'checkbox' ? el.checked : el.value;
  }
  for(const id of ['status','sumCandidates','sumAnalyzed','sumTop','sumAmp','sumTime']) {
    const el = navEl(id); if(el) stats[id] = el.textContent;
  }
  return { rows, sortState, fields, stats, lastListY, lastTableX, view:viewName,
    selectedSymbol:viewName==='coin'?selectedSymbol:null, savedAt:Date.now() };
}
function persistScreenState() {
  try {
    const snapshot = getSnapshot();
    // Never overwrite the last good screener cache with an accidental empty result.
    if (!Array.isArray(snapshot.rows) || snapshot.rows.length === 0) return;
    const packed = JSON.stringify(snapshot);
    try {sessionStorage.setItem(SCREEN_KEY, packed);} catch(_) {}
    try {localStorage.setItem(SCREEN_KEY, packed);} catch(_) {}
  } catch(e) { console.warn('暫存掃描結果失敗',e); }
}
function loadLatestSnapshot() {
  const found=[];
  for(const store of [sessionStorage,localStorage]) {
    for(const key of [SCREEN_KEY,...OLD_SCREEN_KEYS]) {
      try {
        const item=JSON.parse(store.getItem(key) || 'null');
        if (item && Array.isArray(item.rows) && item.rows.length && item.rows.every(r=>r&&validSymbol(r.symbol))) found.push(item);
      } catch(_) {}
    }
  }
  found.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));
  return found[0] || null;
}
function restoreScreenState() {
  const saved=loadLatestSnapshot();
  if(!saved) return null;
  // Keep usable in-memory rows if cache is temporarily unavailable.
  if (!rows.length) rows=saved.rows;
  if(saved.sortState && typeof saved.sortState.key==='string' && (saved.sortState.dir===1 || saved.sortState.dir===-1))
    sortState=saved.sortState;
  for(const id of FIELDS) {
    const el=navEl(id); if(!el||!saved.fields||!(id in saved.fields)) continue;
    if(el.type==='checkbox') el.checked=!!saved.fields[id]; else el.value=saved.fields[id];
  }
  for(const [id,value] of Object.entries(saved.stats||{})) {
    const el=navEl(id); if(el) el.textContent=value;
  }
  lastListY=Number(saved.lastListY)||0;
  lastTableX=Number(saved.lastTableX)||0;
  try {if(rows.length) render();} catch(e) {console.warn('無法重繪之前的排名',e);}
  return saved;
}
function restoreListScroll(y=lastListY) {
  const ticket=++restoreTicket, goal=Math.max(0,Number(y)||0);
  pendingScrollRestore=true;
  function run(tries=0) {
    if (ticket!==restoreTicket || viewName!=='list') return;
    const t=document.querySelector('#listView .tableWrap'); if(t) t.scrollLeft=lastTableX;
    const maxY=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    window.scrollTo(0,Math.min(maxY,goal));
    if(tries<8 && goal>0 && Math.abs(window.scrollY-Math.min(goal,maxY))>5) setTimeout(()=>run(tries+1),80);
    else pendingScrollRestore=false;
  }
  requestAnimationFrame(()=>requestAnimationFrame(()=>run()));
}
function showListView(y=lastListY) {
  // Change visibility FIRST, regardless of whether storage, chart or History works.
  viewName='list';
  if(navEl('coinView')) navEl('coinView').hidden=true;
  if(navEl('listView')) navEl('listView').hidden=false;
  document.title='Binance 短線選幣器 v9';
  try {
    if(!rows.length) restoreScreenState();
    if(rows.length && !document.querySelector('#resultTable tbody').children.length) render();
  } catch(e) {console.error('排行榜還原遇到問題',e);}
  restoreListScroll(y);
  persistScreenState();
}
function showCoinView(symbol) {
  if(!validSymbol(symbol)) return;
  ++restoreTicket;
  pendingScrollRestore=false;
  viewName='coin';
  navEl('listView').hidden=true;
  navEl('coinView').hidden=false;
  navEl('detailNavTitle').textContent=symbol.replace(/USDT$/,'/USDT');
  document.title=symbol.replace(/USDT$/,'/USDT')+'｜Binance 短線選幣器';
  if(rows.some(r=>r.symbol===symbol)) {
    try {showDetail(symbol);} catch(e) {
      console.error('幣種詳細頁載入錯誤',e);
      navEl('detailContent').style.display='none';
      navEl('emptyDetail').style.display='block';
      navEl('emptyDetail').textContent='幣種詳細資料載入失敗，請返回排行榜再試。';
    }
  } else {
    selectedSymbol=symbol;
    navEl('detailContent').style.display='none';
    navEl('emptyDetail').style.display='block';
    navEl('emptyDetail').textContent='本機沒有此幣種的掃描資料，請返回排行榜重新掃描。';
  }
  window.scrollTo(0,0);
  persistScreenState();
}
function navigateToCoin(symbol) {
  if(!validSymbol(symbol)||!rows.some(r=>r.symbol===symbol)) return;
  if(viewName==='list') {readListPosition();persistScreenState();}
  // Do not push URL/history here: iOS Home Screen PWA may change/recreate the context.
  showCoinView(symbol);
}
function backToRanking() {
  // This works even if iOS lost window.history, navigated from Binance, or reloads the PWA.
  if (viewName==='list' && !navEl('listView').hidden) return;
  showListView(lastListY);
}
function handleTouchStart(e) {
  if(viewName!=='coin'||e.touches.length!==1) return;
  const t=e.touches[0]; touchStart={x:t.clientX,y:t.clientY};
}
function handleTouchEnd(e) {
  if(viewName!=='coin'||!touchStart||!e.changedTouches.length) return;
  const t=e.changedTouches[0], dx=t.clientX-touchStart.x, dy=t.clientY-touchStart.y;
  touchStart=null;
  if(dx>95 && Math.abs(dy)<Math.abs(dx)*0.55) backToRanking();
}
function initNavigation() {
  if(initializedNavigation) return;
  initializedNavigation=true;
  // Attach return listeners before attempting any saved-state restoration.
  navEl('backToList').addEventListener('click',backToRanking);
  const coin=navEl('coinView');
  coin.addEventListener('touchstart',handleTouchStart,{passive:true});
  coin.addEventListener('touchend',handleTouchEnd,{passive:true});
  coin.addEventListener('touchcancel',()=>{touchStart=null;},{passive:true});
  let saved=null;
  try {saved=restoreScreenState();} catch(e) {console.warn('儲存資料還原失敗',e);}
  // Remove OLD ?coin= link once at boot. No History access on tap/back thereafter.
  try {
    if(new URL(location.href).searchParams.has('coin')) {
      const u=new URL(location.href);u.searchParams.delete('coin');
      history.replaceState(null,'',u.href);
    }
  } catch(_) {}
  if(saved?.view==='coin' && validSymbol(saved.selectedSymbol) && rows.some(r=>r.symbol===saved.selectedSymbol)) {
    showCoinView(saved.selectedSymbol);
  } else showListView(lastListY);
  // The browser's native history back event can only mean returning to the ranking.
  window.addEventListener('popstate',()=>{showListView(lastListY);});
  window.addEventListener('pagehide',persistScreenState);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden') persistScreenState();
    // On resume do not navigate or alter URLs: keep the existing view intact.
  });
  window.addEventListener('scroll',()=>{
    if(viewName!=='list'||pendingScrollRestore) return;
    readListPosition();clearTimeout(scrollSaveTimer);
    scrollSaveTimer=setTimeout(persistScreenState,350);
  },{passive:true});
  document.querySelectorAll('#listView input,#listView select').forEach(el=>el.addEventListener('change',persistScreenState));
}
// A click handler still works if a later restore/indicator/chart operation throws.
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initNavigation,{once:true});
else initNavigation();
