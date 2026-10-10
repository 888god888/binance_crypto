"""v5 離線瀏覽器測試，使用假行情；無網路/API Key 依賴。"""
import asyncio, json, os
from datetime import datetime,timezone
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
BASES={'BTCUSDT':65000,'ZECUSDT':540,'XRPUSDT':1.4,'ADAUSDT':0.3}

def candles(symbol, daily=False):
    n=111 if daily else 80; gap=86400000 if daily else 900000
    start=(int(datetime.now(timezone.utc).timestamp()*1000)//gap-n)*gap
    return [[start+i*gap,str((p:=BASES[symbol]*(.93+i*.001))),str(p*1.006),str(p*.994),str(p*1.002),str(2000+i*15),start+(i+1)*gap-1] for i in range(n)]

def offline_html():
    soup=BeautifulSoup((ROOT/'index.html').read_text(encoding='utf-8'),'html.parser')
    link=soup.select_one('link[rel=stylesheet]')
    sty=soup.new_tag('style'); sty.string=(ROOT/link['href']).read_text(encoding='utf-8');link.replace_with(sty)
    payload={
      'exchangeInfo':{'symbols':[{'symbol':s,'baseAsset':s[:-4],'quoteAsset':'USDT'} for s in BASES]},
      'ticker':[dict(symbol=s,lastPrice=str(v),highPrice=str(v*1.08),lowPrice=str(v*.95),priceChangePercent='4.2',quoteVolume='400000000') for s,v in BASES.items()],
      'premium':[dict(symbol=s,lastFundingRate='0.0001') for s in BASES],
      'oi':[{'sumOpenInterestValue':'1000000'},{'sumOpenInterestValue':'1020000'}],
      'klines':{s:candles(s) for s in BASES},'daily':{s:candles(s,True) for s in BASES},
    }
    mock='''const FIXTURES=%s; window.fetch=async function(url){const path=String(url);let data;
      if(path.includes('/exchangeInfo'))data=FIXTURES.exchangeInfo;
      else if(path.includes('/ticker/24hr'))data=FIXTURES.ticker;
      else if(path.includes('/klines'))data=(new URL(path)).searchParams.get('interval')==='1d'?FIXTURES.daily[new URL(path).searchParams.get('symbol')]:FIXTURES.klines[new URL(path).searchParams.get('symbol')];
      else if(path.includes('/premiumIndex'))data=FIXTURES.premium;
      else if(path.includes('/openInterestHist'))data=FIXTURES.oi;
      else throw Error('Unexpected: '+path);
      return {ok:true,json:async()=>data};};'''%json.dumps(payload)
    first=soup.select_one('script[src]');fix=soup.new_tag('script');fix.string=mock;first.insert_before(fix)
    for sc in list(soup.select('script[src]')):
        sc.string=(ROOT/sc['src']).read_text(encoding='utf-8');sc.attrs.clear()
    return str(soup)

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':390,'height':780},is_mobile=True,has_touch=True)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        await page.set_content(offline_html(),wait_until='load')
        await page.locator('#useFutures').uncheck()
        await page.locator('#minAmp').fill('0')
        await page.locator('#scanBtn').click()
        await page.wait_for_function('document.querySelector("#status").textContent.includes("完成。")',timeout=15000)
        assert await page.locator('#resultTable tbody tr').count()==4
        assert await page.locator('#coinView').is_hidden()
        await page.locator('#topN').fill('42')
        await page.locator('th[data-key="quoteVolume"]').click()
        await page.evaluate('document.querySelector("#listView").style.minHeight="3000px"')
        await page.evaluate('window.scrollTo(0,600)')
        await page.wait_for_timeout(200)
        y=await page.evaluate('scrollY')
        await page.locator('#resultTable tbody tr').nth(1).click()
        assert 'coin=' in page.url,page.url
        assert await page.locator('#listView').is_hidden()
        assert await page.locator('#detailContent').is_visible()
        await page.wait_for_function('document.querySelector("#dailyChart svg") !== null',timeout=5000)
        await page.locator('#backToList').click()
        await page.wait_for_function('document.querySelector("#coinView").hidden')
        await page.wait_for_timeout(200)
        assert abs((await page.evaluate('scrollY'))-y)<10,(y,await page.evaluate('scrollY'))
        assert await page.locator('#topN').input_value()=='42'
        await page.locator('#resultTable tbody tr').nth(2).click()
        await page.evaluate('''() => { const el=document.getElementById('coinView');
          const e1=new Event('touchstart');Object.defineProperty(e1,'touches',{value:[{clientX:20,clientY:400}]});el.dispatchEvent(e1);
          const e2=new Event('touchend');Object.defineProperty(e2,'changedTouches',{value:[{clientX:180,clientY:405}]});el.dispatchEvent(e2); }''')
        await page.wait_for_function('document.querySelector("#coinView").hidden')
        await page.wait_for_timeout(200)
        assert abs((await page.evaluate('scrollY'))-y)<10
        assert await page.locator('#resultTable tbody tr').count()==4
        assert not errors,errors
        print('PASS: scan → coin page, chart, back and swipe-back restore list position, sort, filters; no JS errors')
        await browser.close()
if __name__=='__main__':asyncio.run(main())
