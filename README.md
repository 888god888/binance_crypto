# Binance 短線選幣器 v9 — iPhone 返回功能重新實作

## 這次修正的原因

v8 同時使用 `history.pushState`、`history.replaceState`、`popstate` 和分頁儲存控制畫面；iPhone 加入主畫面後可能存在不同的瀏覽器返回行為。v9 停止用 History API 導航幣種：**排行榜和詳細分析同一網頁切換**，點「← 返回候選排名」或從左向右滑動直接顯示排行榜，不需要依賴 `history.back()` 或 URL 是否有 `?coin=`。

> 注意：沒有更動幣安 App 連結的限制；仍然只能嘗試啟動 Binance App，尚不能確認 iOS 會直達指定交易對。

## v9 功能

- 返回按鈕和詳細頁右滑共用同一條直接返回邏輯。
- 返回後保留掃描結果、排序、篩選條件、列表縱向捲動及表格橫向位置。
- 掃描結果仍在 `sessionStorage` + `localStorage` 保留；iPhone 因記憶體回收重啟網頁時會嘗試恢復剛才的頁面和列表。
- 舊 v8/v6/v5 快取可讀；若重新掃描失敗且有上次結果，盡量不將結果清空。
- `index.html` 對 CSS/JS 加版本查詢參數 `?v=9.0.1`，減少 GitHub Pages / Safari 將不同版本檔案混用的情形。
- 不再在點幣種時修改 URL；**不要使用 iOS 系統級瀏覽器返回**來返回排行榜，請用畫面頂部的「← 返回候選排名」或在詳細頁由左向右滑。

## 部署

將 ZIP 內容完整覆蓋到 GitHub Pages 存放庫 `888god888/binance_crypto` 的根目錄（包含 css、js、config）。確認主畫面的版本號顯示 **v9**。如果依然看到 v8，代表 iPhone 尚在使用舊版網頁快取，可先從 Safari 開啟最新版網址確認，必要時移除舊的主畫面圖示再新增。

## 驗證

本專案包含離線 Playwright 模擬測試，模擬排行榜、詳細頁、右滑、無 History、從外部 App 返回、重整後恢復。桌面模擬無法取代實際 iPhone Safari 主畫面測試。
