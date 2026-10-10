/** v7 - Binance iOS App experimental entry and coin-pair copy. */
(function () {
  function notify(text) {
    const el = document.querySelector('#coinView .appLinkStatus');
    if (el) el.textContent = text;
  }
  async function copyPair(symbol) {
    if (!/^[A-Z0-9]{2,30}USDT$/.test(symbol)) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(symbol);
        notify(`已複製 ${symbol}，可以在 Binance App 搜尋交易對。`);
        return;
      }
    } catch (_) {}
    const input = document.createElement('textarea');
    input.value = symbol; input.setAttribute('readonly', '');
    input.style.position = 'fixed'; input.style.left = '-9999px';
    document.body.appendChild(input); input.focus(); input.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    input.remove();
    notify(ok ? `已複製 ${symbol}。` : `複製未成功，請手動搜尋 ${symbol}。`);
  }
  document.addEventListener('click', (event) => {
    const copy = event.target.closest('[data-copy-pair]');
    if (copy) {
      copyPair(copy.getAttribute('data-copy-pair'));
      return;
    }
    if (event.target.closest('[data-binance-app]')) {
      // External-app navigation can suspend the iPhone standalone PWA. Save first.
      if (typeof persistScreenState === 'function') persistScreenState();
      notify('正在嘗試開啟 Binance App；如果沒有反應，請使用複製交易對或網頁版。');
    }
  });
})();
