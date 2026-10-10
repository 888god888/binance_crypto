"""v9 offline browser regressions; Binance fetch replaced with fixtures."""
import asyncio,os,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from fixtures import offline_html
STORAGE_SHIM = r"""(() => {
  const seeds=__SEEDS__;
  const make=seed=>{let d={...seed};return {
    getItem:k=>Object.prototype.hasOwnProperty.call(d,k)?d[k]:null,
    setItem:(k,v)=>{d[k]=String(v)},
    removeItem:k=>{delete d[k]},
    clear:()=>{d={}},
    dump:()=>({...d})
  }};
  const session=make(seeds.session),local=make(seeds.local);
  Object.defineProperty(window,'sessionStorage',{configurable:true,value:session});
  Object.defineProperty(window,'localStorage',{configurable:true,value:local});
  window.__dumpStored=()=>({session:session.dump(),local:local.dump()});
})();"""
def with_storage(seeds=None):
  seeds=seeds or {'session':{},'local':{}}
  return offline_html().replace('<script>','<script>'+STORAGE_SHIM.replace('__SEEDS__',json.dumps(seeds))+'</script><script>',1)
from playwright.async_api import async_playwright

async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    page=await b.new_page(viewport={'width':390,'height':780},is_mobile=True,has_touch=True)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.set_content(with_storage(),wait_until='load')
    await page.locator('#useFutures').uncheck()
    await page.locator('#minAmp').fill('0')
    await page.locator('#scanBtn').click()
    await page.wait_for_function('document.querySelector("#status").textContent.includes("完成。")',timeout=15000)
    assert await page.locator('#resultTable tbody tr').count()==4
    await page.locator('th[data-key="symbol"]').click()
    await page.locator('#topN').fill('42')
    await page.evaluate('document.querySelector("#listView").style.minHeight="3000px"')
    await page.evaluate('window.scrollTo(0,560)')
    await page.wait_for_timeout(450)
    y=await page.evaluate('scrollY')
    for i in range(8):
      await page.locator('#resultTable tbody tr').nth(i%4).click()
      assert await page.locator('#coinView').is_visible(),i
      assert await page.locator('#listView').is_hidden(),i
      assert await page.locator('[data-binance-app]').count()==1
      assert 'coin=' not in page.url
      if i%2:
        await page.evaluate("""() => {
          const el=document.getElementById('coinView');
          const s=new Event('touchstart');Object.defineProperty(s,'touches',{value:[{clientX:14,clientY:300}]});el.dispatchEvent(s);
          const e=new Event('touchend');Object.defineProperty(e,'changedTouches',{value:[{clientX:160,clientY:302}]});el.dispatchEvent(e);
        }""")
      else:
        await page.locator('#backToList').click()
      assert await page.locator('#listView').is_visible(),i
      assert await page.locator('#coinView').is_hidden(),i
      await page.wait_for_timeout(450)
      assert abs((await page.evaluate('scrollY'))-y)<15,(i,y,await page.evaluate('scrollY'))
      assert await page.locator('#resultTable tbody tr').count()==4
      assert await page.locator('#topN').input_value()=='42'
    # Simulate external App leaving page; resume with no history state.
    await page.locator('#resultTable tbody tr').first.click()
    await page.evaluate("""() => {window.dispatchEvent(new Event('pagehide'));
      Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pageshow'));history.replaceState(null,'',location.href); }""")
    # Recreate a full PWA JS process using localStorage snapshot while detail is open.
    backup=await page.evaluate('__dumpStored()')
    restored=await b.new_page(viewport={'width':390,'height':780},is_mobile=True,has_touch=True)
    restored.on('pageerror',lambda e:errors.append(str(e)))
    await restored.set_content(with_storage({'session':{},'local':backup['local']}),wait_until='load')
    assert await restored.locator('#coinView').is_visible()
    assert await restored.locator('#resultTable tbody tr').count()==4
    await restored.evaluate('history.replaceState(null,"",location.href)')
    await restored.locator('#backToList').click()
    assert await restored.locator('#listView').is_visible()
    assert await restored.locator('#resultTable tbody tr').count()==4
    assert await restored.locator('#topN').input_value()=='42'
    await page.locator('#backToList').click()
    assert await page.locator('#listView').is_visible()
    assert await page.locator('#resultTable tbody tr').count()==4
    assert not errors,errors
    print('PASS v9 repeated tap/swipe return, no URL/history reliance, scroll, filters, external App resume')
    await b.close()
if __name__=='__main__': asyncio.run(main())
