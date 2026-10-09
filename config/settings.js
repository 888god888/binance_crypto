/**
 * Binance 短線選幣器 v3 — config
 * Vanilla JavaScript，依 index.html 的 defer 順序載入。
 */

const SPOT = "https://data-api.binance.vision", FUT = "https://fapi.binance.com";
const stableBases = new Set(["USDC", "FDUSD", "TUSD", "USDP", "DAI", "EUR", "AEUR", "TRY", "BRL", "BIDR", "IDRT", "UAH", "RUB"]), excludedSuffixes = ["UP", "DOWN", "BULL", "BEAR"];
