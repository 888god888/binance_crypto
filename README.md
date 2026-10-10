# Binance 短線選幣器 v8 — iPhone PWA App 切換與返回修正

## 為何要修正

v7 的 `bnc://app.binance.com/markets/markets` 是行情頁入口，**沒有交易對代號**，因此打開幣安 App 後不會自動選到 ZEC/USDT、ADA/USDT 等現貨交易對。Binance 沒有在這次查證中提供可確認有效的通用 iOS 現貨交易對深層連結，不能承諾一鍵直達。

v7 的返回邏輯使用 `history.back()`。在 iPhone「加入主畫面」網頁切換到其他 App 後，瀏覽器 history 可能被回收或重建，容易造成返回無效、空白。

## v8 修改

1. **返回排行榜不再呼叫 `history.back()`**：直接切換列表畫面並用 `history.replaceState()` 移除 `?coin=`，即使歷史狀態遺失仍可恢復列表。獨立幣種頁的返回按鈕及從左往右滑都走同一條路徑。
2. **保留捲動位置、排序及掃描結果**：在 `sessionStorage` 和 `localStorage` 兩邊儲存。啟動時挑選最近有效的備份，也可讀取 v6/v5 舊備份。
3. **從 Binance App 回來時不亂重置詳細頁**：增加 `pageshow`、`visibilitychange` 的恢復判斷，盡量保留頁面及 K 圖位置。
4. **複製交易對再開 App**：幣種詳情頁的主要按鈕會先嘗試複製如 `ZECUSDT`，再從獨立連結 (`target="_blank"`) 開 Binance App。App 目前可能仍會落在行情頁，須在 Binance 的交易對搜尋框貼上該代號。旁邊保留「複製交易對」與官方現貨網頁入口；不會自動下單。

> iOS 外部 App URL 的開啟行為與剪貼簿權限受裝置版本影響，無法在桌面模擬測試中完全證實。若主要 App 按鈕未順利複製，請先點獨立的「複製交易對」，再開幣安 App。

## 更新 GitHub Pages

將 ZIP 解壓縮，把 `index.html`、`css/`、`config/`、`js/` 完整覆蓋到 `888god888/binance_crypto` 儲存庫根目錄。需一併更新 `js/navigation.js`、`js/app_links.js`、`js/detail.js`，且版本標記為 v8。暫存舊版時可在 Safari 重新載入選幣器。

## 建議實機測試

1. iPhone 主畫面開啟選幣器，掃描並滑到排行榜中段。
2. 點 ZEC →「複製交易對並開 App」，確認 Binance 能開啟（即使沒有自動選中 ZEC/USDT）。
3. 返回選幣器 → 點「← 返回候選排名」，應該能回到原本位置且保留排名。
4. 再選其他幣，重複上述操作，並試從左往右滑。
5. 在幣種頁切回主畫面並重開選幣器，檢查是否仍能返回排行榜。
