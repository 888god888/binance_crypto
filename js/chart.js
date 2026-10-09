/** 純原生 SVG 日 K 圖，無外部圖表套件 */
let dailyChartRequest=0;
async function loadDailyChart(symbol){
 const id=++dailyChartRequest, el=$('dailyChart'); if(!el)return;
 try{
  const raw=await fetchJSON(`${SPOT}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1d&limit=111`);
  if(id!==dailyChartRequest || selectedSymbol!==symbol)return;
  const closed=raw.filter(x=>Number(x[6])<Date.now()).slice(-90);
  if(closed.length<25)throw new Error('日線資料不足');
  const data=closed.map(x=>({t:Number(x[0]),o:+x[1],h:+x[2],l:+x[3],c:+x[4]}));
  const all=data.map(x=>x.c), ma=data.map((_,i)=>i<19?null:all.slice(i-19,i+1).reduce((a,b)=>a+b,0)/20);
  const lo=Math.min(...data.map(x=>x.l)), hi=Math.max(...data.map(x=>x.h));
  const min=lo-(hi-lo)*.08, max=hi+(hi-lo)*.08, W=900,H=350,L=62,R=14,T=15,B=32;
  const plotW=W-L-R, plotH=H-T-B, step=plotW/data.length;
  const y=v=>T+(max-v)/(max-min)*plotH, x=i=>L+(i+.5)*step;
  const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(symbol)} 最近90日 K線圖" style="width:100%;height:auto;display:block">`;
  for(let i=0;i<=4;i++){const v=min+(max-min)*i/4, yy=y(v);svg+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="#2a3856"/><text x="${L-7}" y="${yy+4}" fill="#9fb0d0" text-anchor="end" font-size="11">${fmtPrice(v)}</text>`;}
  data.forEach((d,i)=>{const xx=x(i),up=d.c>=d.o,color=up?'#3bc98a':'#ef6577',top=y(Math.max(d.o,d.c)),bottom=y(Math.min(d.o,d.c));svg+=`<line x1="${xx}" x2="${xx}" y1="${y(d.h)}" y2="${y(d.l)}" stroke="${color}" stroke-width="1.2"/><rect x="${xx-Math.max(1.5,step*.29)}" y="${top}" width="${Math.max(3,step*.58)}" height="${Math.max(1.2,bottom-top)}" fill="${color}"/>`;});
  const pts=ma.map((v,i)=>v===null?null:`${x(i)},${y(v)}`).filter(Boolean).join(' ');
  svg+=`<polyline points="${pts}" fill="none" stroke="#f3c765" stroke-width="2"/>`;
  for(let i=0;i<data.length;i+=15){const dt=new Date(data[i].t);svg+=`<text x="${x(i)}" y="${H-8}" fill="#9fb0d0" text-anchor="middle" font-size="11">${dt.getUTCMonth()+1}/${dt.getUTCDate()}</text>`;}
  svg+='</svg>';
  el.innerHTML=svg+`<div class="chartLegend"><span>🟢 上漲日</span><span>🔴 下跌日</span><span style="color:#f3c765">━━ MA20</span><span>最後收盤 ${fmtPrice(data.at(-1).c)} USDT</span></div>`;
 }catch(e){if(id===dailyChartRequest && selectedSymbol===symbol)el.textContent=`日線暫時無法載入：${e.message}`;}
}
