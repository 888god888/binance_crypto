# Binance 短線選幣器 v7 — iPhone 主畫面版 Binance App 入口

保留 v6 的掃描、排除穩定幣、幣種獨立詳細頁、日 K 圖、損益試算、返回位置和搜尋結果備援。

## v7 新增
- 每個幣種詳細頁新增 **嘗試開 Binance App**：使用 `bnc://app.binance.com/markets/markets`。這是實驗性連結，無法保證 iPhone 各版本可啟動，也**不保證會跳到指定 USDT 交易對**。
- **複製 XXXUSDT**：方便在 Binance App 中搜尋正確交易對；iOS HTTPS 環境優先用 Clipboard API，失敗時嘗試傳統複製方式。
- **網頁版現貨**：保留原本的官方現貨交易連結。
- 嘗試離開 PWA 開 App 前儲存排行榜狀態，不自動跳到 App Store 或登入網站，也不自動下單。

## 測試建議
在 iPhone 已加入主畫面的選幣器，點某幣詳細頁→「嘗試開 Binance App」。
1. 如成功開 App，確認開到行情頁還是首頁、是否選對幣。
2. 如沒有反應或報「無法開啟」，回選幣器用「複製 XXXUSDT」，到 Binance App 搜尋。
3. 從 Binance App 返回 PWA，確認結果、捲動位置保留。

## 部署
將此專案根目錄下的 `index.html`、`css/`、`config/` 和 `js/` 完整上傳到 GitHub Pages 的倉庫根目錄。`js/app_links.js` 是新檔，務必一併上傳。

注意：Binance 沒有提供經此處確認的 iOS 現貨逐幣深層連結標準，因此本版不能宣稱保證一鍵開啟指定現貨下單頁。
