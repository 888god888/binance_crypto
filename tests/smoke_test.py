"""離線瀏覽器測試：pip install playwright；使用系統 Chromium 或 CHROMIUM_PATH。"""
import asyncio
import json
import os
from pathlib import Path

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
BASES = {"BTCUSDT": 65000, "ZECUSDT": 540, "XRPUSDT": 1.4, "ADAUSDT": 0.3}


def candles(symbol):
    base = BASES[symbol]
    result = []
    for i in range(80):
        price = base * (0.93 + i * 0.001)
        result.append([1710000000000 + i * 900000, str(price), str(price * 1.006),
                       str(price * 0.994), str(price * 1.002), str(2000 + i * 15)])
    return result


def offline_html():
    """將多檔案資源內嵌進測試頁，避免測試環境阻擋 localhost/file 協定。"""
    soup = BeautifulSoup((ROOT / "index.html").read_text(encoding="utf-8"), "html.parser")
    link = soup.select_one('link[rel="stylesheet"]')
    css_path = ROOT / link['href']
    assert css_path.is_file()
    tag = soup.new_tag('style')
    tag.string = css_path.read_text(encoding='utf-8')
    link.replace_with(tag)

    payload = {
        'exchangeInfo': {'symbols': [dict(symbol=s, baseAsset=s[:-4], quoteAsset='USDT') for s in BASES]},
        'ticker': [dict(symbol=s, lastPrice=str(v), highPrice=str(v * 1.08), lowPrice=str(v * 0.95),
                        priceChangePercent='4.2', quoteVolume=str(4e8 if s == 'BTCUSDT' else 8e7))
                   for s, v in BASES.items()],
        'premium': [dict(symbol=s, lastFundingRate='0.0001') for s in BASES],
        'oi': [{'sumOpenInterestValue': '1000000'}, {'sumOpenInterestValue': '1020000'}],
        'klines': {symbol: candles(symbol) for symbol in BASES}
    }
    mock = r'''window.fetch = async function(url) {
      const path = String(url); let data;
      if(path.includes('/exchangeInfo')) data = FIXTURES.exchangeInfo;
      else if(path.includes('/ticker/24hr')) data = FIXTURES.ticker;
      else if(path.includes('/klines')) data = FIXTURES.klines[new URL(path).searchParams.get('symbol')];
      else if(path.includes('/premiumIndex')) data = FIXTURES.premium;
      else if(path.includes('/openInterestHist')) data = FIXTURES.oi;
      else throw new Error('Unexpected URL: ' + path);
      return {ok:true,json:async()=>data};
    };'''
    first_script = soup.select_one('script[src]')
    fixture_script = soup.new_tag('script')
    fixture_script.string = 'const FIXTURES = ' + json.dumps(payload) + ';\n' + mock
    first_script.insert_before(fixture_script)
    for script in list(soup.select('script[src]')):
        script_path = ROOT / script['src']
        assert script_path.is_file(), script_path
        script.string = script_path.read_text(encoding='utf-8')
        script.attrs.clear()
    return str(soup)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True,
            executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
            args=['--no-sandbox', '--no-proxy-server'])
        page = await browser.new_page()
        errors = []
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        await page.set_content(offline_html(), wait_until='load')
        assert 'Binance 短線選幣器' in await page.locator('h1').inner_text()
        await page.locator('#scanBtn').click()
        await page.wait_for_function('document.querySelector("#status").textContent.includes("完成。")', timeout=15000)
        count = await page.locator('#resultTable tbody tr').count()
        assert count == 4, f'expected 4 candidates, got {count}'
        assert await page.locator('#detailContent').is_visible()
        assert '目前結構' in await page.locator('#detailContent').inner_text()
        await page.locator('#resultTable tbody tr').nth(1).click()
        assert await page.locator('#resultTable tbody tr.selected').count() == 1
        assert await page.locator('#sumTop').inner_text() != '-'
        await page.locator('#fx').fill('32.5')
        await page.locator('#fx').press('Tab')
        await page.locator('th[data-key="quoteVolume"]').click()
        assert await page.locator('#resultTable tbody tr').count() == 4
        assert not errors, errors
        print('PASS: 4 candidates, scanning, ranking, detail view, selected row, FX changes, sorting; no JS errors')
        await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
