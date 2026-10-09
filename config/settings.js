/**
 * Binance 短線選幣器 v3 — config
 * Vanilla JavaScript，依 index.html 的 defer 順序載入。
 */

const SPOT = "https://data-api.binance.vision", FUT = "https://fapi.binance.com";
const stableBases = new Set(["USDC", "FDUSD", "TUSD", "USDP", "DAI", "EUR", "AEUR", "TRY", "BRL", "BIDR", "IDRT", "UAH", "RUB"]), excludedSuffixes = ["UP", "DOWN", "BULL", "BEAR"];

// 明確排除穩定幣、法幣及黃金錨定資產；不依價格接近 1 USDT 判斷，避免誤殺一般代幣。
const extraStableBases = new Set(["USDT","USDS","USDE","USD1","USDG","USDD","USDX","USDF","USDB","USDL","USDA","USDT0","RLUSD","PYUSD","GUSD","LUSD","FRAX","FRXUSD","SUSD","CRVUSD","GHO","USD0","USD0++","DOLA","EURI","EURS","EURC","EUROC","EURCV","EURQ","XAUT","PAXG","PAX","USTC","UST","BUSD","HUSD","CUSD","CEUR","ALUSD","MIM","MIMATIC","DUSD","USDY","USDM","FDUSD","TUSD","USDP","DAI","USDC","ZUSD","USDN","USDJ","SDAI","SUSDE","SUSDS","USDZ","USDR","USDQ","USDH","USDB","USDD","USDK","USDS","USDV","USDW","USDX","USDY","USDZ","USDO","USDP","USDR","USDS","USDT","USDU","USDV","USDW","USD1","USD2","USD3","USD4","USD5","USD6","USD7","USD8","USD9","EUR","GBP","AUD","JPY","TRY","BRL","ARS","UAH","RUB","BIDR","IDRT","NGN","ZAR","PLN","RON","CZK","HUF","MXN","COP","VAI","XUSD","SUSD","USDN","USN"]);
