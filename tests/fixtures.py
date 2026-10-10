"""v9 fixture for Binance offline responses."""
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
    sty=soup.new_tag('style'); sty.string=(ROOT/link['href'].split('?')[0]).read_text(encoding='utf-8');link.replace_with(sty)
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
        sc.string=(ROOT/sc['src'].split('?')[0]).read_text(encoding='utf-8');sc.attrs.clear()
    return str(soup)

