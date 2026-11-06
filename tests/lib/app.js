// 測試共用：建置測試版 app（dist/test.html）、開本機伺服器、用無頭 Chromium 開啟
const {execFileSync}=require('child_process');
const http=require('http');const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'..','..');

let built=false;
function buildTestApp(){
  if(built)return;
  execFileSync('python3',[path.join(ROOT,'build.py'),'test'],{cwd:ROOT,stdio:'pipe'});
  built=true;
}

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json','.wasm':'application/wasm'};
function serve(){
  return new Promise(res=>{
    const srv=http.createServer((req,rsp)=>{
      const u=decodeURIComponent(req.url.split('?')[0]);
      const f=path.join(ROOT,u==='/'?'dist/test.html':u);
      if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){rsp.writeHead(404);return rsp.end()}
      rsp.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0,'127.0.0.1',()=>res(srv));
  });
}

// 開啟 app，回傳 {page, close}。page 上可直接呼叫 app 的全域函式（memCalc、slabCalc、summary…）
async function openApp(){
  buildTestApp();
  const {chromium}=require('playwright');
  const srv=await serve();
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1400,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/`);
  await page.waitForFunction(()=>typeof memCalc==='function'&&typeof importFiles==='function');
  return {page,errors,async close(){await browser.close();srv.close()}};
}

// 跟使用者在畫面上「建立專案」相同的預設值（棟別 A、樓層 F,1–4,R1、層高 3.4、版厚 0.15）
async function newProject(page,name){
  await page.evaluate(name=>{
    const p=newProject({code:'',name,bldgs:['A'],floors:['F','1','2','3','4','R1'].map(n=>({name:n,h:3.4})),slabT:0.15});
    p.manCleared=true;S.projects.push(p);S.cur=p.id;S.tab='draw';S.dwg=null;saveAll();go('project');
  },name);
}

// 匯入圖檔（檔名照原名，app 會用檔名判斷樓層）
async function importDrawings(page,files){
  for(const f of files){
    const d64=fs.readFileSync(f).toString('base64');
    await page.evaluate(async([n,d64])=>{const bin=Uint8Array.from(atob(d64),c=>c.charCodeAt(0));await importFiles([new File([bin],n)])},[path.basename(f),d64]);
  }
}

// 各樓層 模板／混凝土 分類小計（四捨五入到 0.01）與辨識檢查數
async function floorTotals(page){
  return page.evaluate(()=>{
    const p=P(),o={},r=v=>Object.fromEntries(Object.entries(v).map(([k,x])=>[k,Math.round(x*100)/100]));
    p.bldgs.forEach(bd=>{const {fl,F}=summary(p,bd);fl.forEach(f=>{o[bd+'|'+f]={form:r(F[f].form),conc:r(F[f].conc),chk:checks(p,f,bd).length}})});
    return o;
  });
}

const sum=o=>Object.values(o).reduce((a,x)=>a+x,0);
const round2=v=>Math.round(v*100)/100;

module.exports={ROOT,buildTestApp,openApp,newProject,importDrawings,floorTotals,sum,round2};
