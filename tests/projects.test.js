// 實際專案回歸測試：用使用者的真實圖檔從頭匯入、計算，各樓層數量要跟 tests/expected/projects.json 完全相同（誤差 0.01 以內）
// 圖檔是使用者的真實案子，不放進公開的 repo。位置依序找：環境變數 ZHUBEN_DRAWINGS、tests/drawings/、專案共用資料夾。
// 數量要改（使用者確認新規則後）才用 `npm run test:update` 更新基準，並在 PR 說明寫出哪些數字變了、為什麼。
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');const path=require('path');
const {openApp,newProject,importDrawings,floorTotals,sum,round2}=require('./lib/app');

const EXP=path.join(__dirname,'expected','projects.json');
const UPDATE=!!process.env.ZHUBEN_UPDATE;
const DIRS=[process.env.ZHUBEN_DRAWINGS,path.join(__dirname,'drawings'),'/mnt/project-files/zhuben/tests/drawings'].filter(Boolean);
const DRAW=DIRS.find(d=>fs.existsSync(path.join(d,'S1-0102.dwg')));
const REQUIRE=!!process.env.ZHUBEN_REQUIRE_DRAWINGS;

// 測試案（名稱、匯入順序照使用者實際操作）
const SETS=[
  {name:'吳宅',files:['A002A401.dwg','S1-0102.dwg']},
  {name:'A2-01',files:['A2.dwg']},
  {name:'753-5',files:['A2.dwg','753-A6.dwg','753-S.dwg','753-A4.dwg','753-A3.dwg']},
  {name:'羅宅',files:['luo-S1.dwg']},
  {name:'羅宅+建照',files:['luo-S1.dwg','luo-A.dwg']},
];

const exp=fs.existsSync(EXP)?JSON.parse(fs.readFileSync(EXP,'utf8')):{};
const got={};
const skip=!DRAW&&!REQUIRE?'找不到測試圖檔（設定 ZHUBEN_DRAWINGS 或放到 tests/drawings/），跳過實際專案測試':false;
if(!DRAW&&REQUIRE)test('AC-P00 測試圖檔要存在',()=>assert.fail('ZHUBEN_REQUIRE_DRAWINGS 已設定，但找不到測試圖檔'));

let app;
before(async()=>{if(DRAW)app=await openApp()});
after(async()=>{
  await app?.close();
  if(UPDATE&&DRAW){fs.writeFileSync(EXP,JSON.stringify(got,null,1)+'\n');console.log('# 已更新基準 '+EXP)}
});

const totalForm=o=>round2(Object.values(o).reduce((a,f)=>a+sum(f.form),0));

function diff(a,c){
  const out=[];
  for(const k of new Set([...Object.keys(a||{}),...Object.keys(c||{})])){
    const x=(a||{})[k],y=(c||{})[k];
    if(!x||!y){out.push(`${k} ${x?'消失':'多出'}`);continue}
    for(const t of ['form','conc'])for(const q of new Set([...Object.keys(x[t]),...Object.keys(y[t])])){
      const u=x[t][q]||0,v=y[t][q]||0;if(Math.abs(u-v)>0.005)out.push(`${k} ${t==='form'?'模板':'混凝土'}${q} ${u}→${v}`)}
    if(x.chk!==y.chk)out.push(`${k} 辨識檢查 ${x.chk}→${y.chk}`);
  }
  return out;
}

for(const s of SETS){
  test(`AC-P01 ${s.name}：各樓層模板、混凝土與基準相同`,{skip},async()=>{
    const pg=app.page;
    await pg.evaluate(()=>{S.projects=[];S.cur=null});
    await newProject(pg,s.name);
    await importDrawings(pg,s.files.map(f=>path.join(DRAW,f)));
    const r=await floorTotals(pg);got[s.name]=r;
    assert.deepEqual(app.errors,[],'匯入過程不能有程式錯誤');
    if(UPDATE)return;
    assert.ok(exp[s.name],`基準沒有 ${s.name}`);
    const d=diff(exp[s.name],r);
    assert.equal(d.length,0,`${s.name} 與基準不同：\n  `+d.join('\n  '));
  });
}

// 使用者確認過的數字（寫死，不隨 test:update 改變）
const FIXED={
  '羅宅+建照':{total:1156.79,floors:{'A|F':232.34,'A|1':470.21,'A|2':454.24}},
};
for(const [name,f] of Object.entries(FIXED)){
  test(`AC-P02 ${name}：模板合計 ${f.total} ㎡`,{skip},()=>{
    const r=got[name];assert.ok(r,`${name} 沒有計算結果`);
    assert.equal(totalForm(r),f.total);
    for(const [k,v] of Object.entries(f.floors))assert.equal(round2(sum(r[k].form)),v,`${k} 模板`);
  });
}
