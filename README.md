# Binance 短線選幣器 v3 — 多檔案版

從 v2 **重構成可長期維護的資料夾專案**。保留原先的 USDT 現貨選幣、成交量／振幅／EMA／RSI／ATR、OI／Funding、分數排名、選幣詳細分析、參考進出場與停損，以及 1 萬／3 萬台幣損益試算。

**不需要 Binance API Key、不會讀取帳戶，也不會送出交易。**

## 怎麼用

1. 解壓縮 ZIP；**不要只拿 `index.html`**，旁邊的 `css/`、`js/`、`config/` 必須保留。
2. 雙擊 `index.html` 嘗試直接開啟（若瀏覽器對本機檔案或 API 施加限制，改用 GitHub Pages）。
3. 設定分析週期（預設 15 分）、最低成交額／振幅等，按「開始掃描」。
4. 點排行榜中的幣種，即可看技術指標、規則式現貨觀察點與損益試算。
5. 進場前仍要用交易所 K 線確認價格與深度。評分不是買進建議。

## 專案結構

```text
binance_crypto_screener_v3/
├── index.html           # 畫面骨架（只負責 HTML）
├── css/
│   └── style.css        # 所有介面樣式
├── config/
│   └── settings.js      # API 網址、排除幣種清單
├── js/
│   ├── utils.js         # 價格／百分比／金額格式化與公用函式
│   ├── binance.js       # 公開 API 呼叫、併發與交易對排除
│   ├── indicators.js    # EMA、RSI、ATR、K 線資料計算
│   ├── scoring.js       # 綜合評分與排名理由標籤
│   ├── strategy.js      # 觀察區間、停損、停利及交易損益模擬
│   ├── detail.js        # 幣種詳細資訊、試算畫面
│   ├── screener.js      # 全市場掃描流程、資料彙整與排序
│   └── app.js           # UI 表格與事件綁定
├── tests/
│   └── smoke_test.py    # 使用模擬行情的離線瀏覽器測試（可選）
└── README.md
```

使用傳統 `<script defer>` 依序載入各檔，**不需要 NPM、編譯或打包工具**；這也讓本機雙擊 HTML 在允許網路請求的瀏覽器上仍能運作。修改功能時只需要編輯對應的 `.js`，但請勿隨意改 `index.html` 最下方 script 的載入順序。

## GitHub Pages 部署

1. 新增 GitHub 儲存庫（或放到你既有的儲存庫）。
2. 把本 ZIP 解壓後的 **所有檔案和資料夾** 上傳到儲存庫根目錄，確保 `index.html` 在根目錄。
3. GitHub 儲存庫 → **Settings → Pages**。
4. Source 選擇 **Deploy from a branch**，Branch 選 `main`，資料夾選 `/ (root)`，儲存。
5. 使用 GitHub Pages 產生的網站網址開啟，不需架設後端。

## 現有資料／邏輯

- Binance 公開 Spot API：USDT 現貨交易對、24h 行情與 K 線。
- Binance 公開 USDⓈ-M API（如可用）：Funding Rate、部分交易對的 1h OI 變化。
- 預設 15m／成交額至少 1,000 萬 USDT／24h 振幅至少 3%，掃描成交量前 60 名。
- 交易參考 **只針對現貨做多**。動能過熱或技術結構不足時會顯示「先觀察」。
- 總分用於排列觀察順序，不保證行情方向或交易報酬。

## 測試

本版已以模擬 Binance API 回應測過前端掃描流程。若你有 Python、Playwright 和 Chromium，可以執行：

```bash
python tests/smoke_test.py
```

測試只使用**假行情**，不會下單或呼叫真實交易所。瀏覽器安裝路徑可使用 `CHROMIUM_PATH` 環境變數指定。可透過 `node --check js/xxx.js` 驗證 JavaScript 語法。

## 使用限制與風險

- 本工具是**點擊後掃描**，不是持續訂閱的即時串流／自動交易程式。
- 官方 API 可能有流量限制、地區連線限制、維護時段。若 Funding/OI 失敗，現貨分析會繼續並將其顯示為 `-`；若 Spot 資料失敗，會顯示錯誤提示。
- 買賣成本只粗估手續費，不包含真實滑價、買賣價差、出入金費用、稅與穩定幣匯率變動。
- **不應根據排行分數直接交易或使用槓桿。**
