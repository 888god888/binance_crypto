/** v8 — iPhone PWA: copy selected pair before opening Binance in a separate context. */
(function () {
  function notify(text) {
    const el = document.querySelector('#coinView .appLinkStatus');
    if (el) el.textContent = text;
  }
  function validPair(symbol) { return typeof symbol === 'string' && /^[A-Z0-9]{2,30}USDT$/.test(symbol); }

  // Legacy copy command executes synchronously in the original tap gesture.
  // This is particularly useful when iOS leaves the PWA immediately for another app.
  function copyNow(symbol) {
    const input = document.createElement('textarea');
    input.value = symbol;
    input.readOnly = true;
    input.setAttribute('aria-hidden', 'true');
    input.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(input);
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) {}
    input.remove();
    return copied;
  }

  async function copyPair(symbol) {
    if (!validPair(symbol)) return;
    // A separate user tap can await the modern clipboard API without breaking the App launch.
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(symbol);
        notify(`已複製 ${symbol}，切到 Binance App 後貼到交易對搜尋框。`);
        return;
      }
    } catch (_) {}
    const copied = copyNow(symbol);
    notify(copied ? `已複製 ${symbol}，可貼到 Binance App 搜尋。` : `複製失敗，請手動搜尋 ${symbol}。`);
  }

  document.addEventListener('click', event => {
    const copy = event.target.closest('[data-copy-pair]');
    if (copy) {
      event.preventDefault();
      copyPair(copy.getAttribute('data-copy-pair'));
      return;
    }
    const app = event.target.closest('[data-binance-app]');
    if (!app) return;
    const pair = app.getAttribute('data-pair');
    if (!validPair(pair)) { event.preventDefault(); return; }
    // Save both the ranking and the coin page before iOS suspends the PWA.
    if (typeof persistScreenState === 'function') persistScreenState();
    const copied = copyNow(pair);
    // Fire the modern API immediately while the click gesture is still active if needed.
    // Don't await it: asynchronous delays can cause iOS to block the custom URL launch.
    if (!copied && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pair).then(() => {
        notify(`已複製 ${pair}，請在 Binance App 搜尋框貼上。`);
      }).catch(() => {
        notify(`App 可以開啟，但沒有自動選幣。返回後請按「複製 ${pair.slice(0, -4)}/USDT」。`);
      });
    }
    notify(copied
      ? `已複製 ${pair}。開啟 Binance App 後，在交易對搜尋框貼上即可。`
      : `正在開啟 Binance App；如未複製成功，返回後請按「複製交易對」。`);
    // The anchor has target="_blank" so the PWA document is not itself navigated
    // to a bnc:// URL. Leave the default click behavior intact.
  });
})();
