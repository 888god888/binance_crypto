"""v8 offline regression tests for iPhone-style PWA suspend/restart/back."""
import asyncio, json, os
from playwright.async_api import async_playwright
from smoke_test import offline_html

STORAGE_SHIM = '''
(() => {
  const seeds = __SEEDS__;
  function storage(seed) {
    const values = {...seed};
    return {
      getItem(k) { return Object.prototype.hasOwnProperty.call(values,k) ? values[k] : null; },
      setItem(k,v) {values[k]=String(v)},
      removeItem(k) {delete values[k]},
      clear() {for(const k in values)delete values[k]},
      dump() {return {...values}}
    };
  }
  const session = storage(seeds.session), local = storage(seeds.local);
  Object.defineProperty(window, 'sessionStorage', {configurable:true, value:session});
  Object.defineProperty(window, 'localStorage', {configurable:true, value:local});
  window.__dumpStored = () => ({session:session.dump(),local:local.dump()});
})();
'''

def html_with_storage(seeds=None):
    seeds=seeds or {'session':{},'local':{}}
    bootstrap=STORAGE_SHIM.replace('__SEEDS__',json.dumps(seeds))
    return offline_html().replace('<script>', '<script>'+bootstrap+'</script><script>',1)

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':390,'height':780},is_mobile=True,has_touch=True)
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.set_content(html_with_storage(),wait_until='load')
        await page.locator('#useFutures').uncheck()
        await page.locator('#minAmp').fill('0')
        await page.locator('#topN').fill('42')
        await page.locator('#scanBtn').click()
        await page.wait_for_function('document.querySelector("#status").textContent.includes("完成。")',timeout=15000)
        assert await page.locator('#resultTable tbody tr').count()==4
        await page.locator('th[data-key="symbol"]').click()
        await page.evaluate('window.scrollTo(0,500)')
        await page.wait_for_timeout(150)
        y=await page.evaluate('scrollY')
        await page.locator('#resultTable tbody tr').nth(1).click()
        coin_url=page.url
        assert 'coin=' in coin_url,coin_url
        pair=await page.locator('[data-binance-app]').get_attribute('data-pair')
        assert pair.endswith('USDT')
        assert await page.locator('[data-binance-app]').get_attribute('target')=='_blank'
        # Simulate launch without actually leaving the browser.
        await page.evaluate('''() => {
          const app=document.querySelector('[data-binance-app]');
          app.addEventListener('click', e=>e.preventDefault(), {once:true});
          app.click();
          window.dispatchEvent(new Event('pagehide'));
          window.dispatchEvent(new Event('pageshow'));
        }''')
        assert await page.locator('#coinView').is_visible()
        dump=await page.evaluate('__dumpStored()')
        assert len(json.loads(dump['local']['binance-crypto-screen-v8'])['rows'])==4
        assert json.loads(dump['local']['binance-crypto-screen-v8'])['view']=='coin'
        # iPhone PWA process dies: new JS environment with same local cache, URL and lost history state.
        recovered=await browser.new_page(viewport={'width':390,'height':780},is_mobile=True,has_touch=True)
        recovered.on('pageerror', lambda e: errors.append(str(e)))
        # about:blank accepts History API query string in this offline environment.
        await recovered.goto('about:blank?coin='+pair)
        await recovered.set_content(html_with_storage({'session':{},'local':dump['local']}),wait_until='load')
        await recovered.wait_for_function('document.querySelector("#coinView").hidden === false')
        assert await recovered.locator('#detailContent').is_visible()
        assert await recovered.locator('#resultTable tbody tr').count()==4
        await recovered.wait_for_function('document.querySelector("#dailyChart svg") !== null',timeout=5000)
        await recovered.evaluate('history.replaceState(null,"",location.href)')
        await recovered.locator('#backToList').click()
        await recovered.wait_for_function('document.querySelector("#listView").hidden === false')
        assert 'coin=' not in recovered.url,recovered.url
        assert await recovered.locator('#resultTable tbody tr').count()==4
        assert await recovered.locator('#topN').input_value()=='42'
        assert abs((await recovered.evaluate('scrollY'))-y)<15,(y,await recovered.evaluate('scrollY'))
        # App switch during same session then use swipe-back.
        await recovered.locator('#resultTable tbody tr').first.click()
        await recovered.evaluate('''() => {
          window.dispatchEvent(new Event('pagehide'));
          window.dispatchEvent(new Event('pageshow'));
          const el=document.querySelector('#coinView');
          const st=new Event('touchstart');Object.defineProperty(st,'touches',{value:[{clientX:20,clientY:300}]});el.dispatchEvent(st);
          const en=new Event('touchend');Object.defineProperty(en,'changedTouches',{value:[{clientX:160,clientY:302}]});el.dispatchEvent(en);
        }''')
        await recovered.wait_for_function('document.querySelector("#coinView").hidden === true')
        assert await recovered.locator('#resultTable tbody tr').count()==4
        # Native history popstate still works on ordinary navigation.
        await recovered.locator('#resultTable tbody tr').first.click()
        await recovered.go_back()
        await recovered.wait_for_function('document.querySelector("#listView").hidden === false')
        assert await recovered.locator('#resultTable tbody tr').count()==4
        # Valid cached results survive sessionStorage being empty.
        data=await recovered.evaluate('__dumpStored()')
        fresh=await browser.new_page(viewport={'width':390,'height':780},is_mobile=True)
        fresh.on('pageerror', lambda e: errors.append(str(e)))
        await fresh.set_content(html_with_storage({'session':{}, 'local':data['local']}),wait_until='load')
        assert await fresh.locator('#resultTable tbody tr').count()==4
        assert not errors,errors
        print('PASS: app launch state, page reconstruction, missing history, back/swipe/popstate, scroll and local cache restored')
        await browser.close()

if __name__=='__main__':asyncio.run(main())
