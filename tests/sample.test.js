// 範例圖（samples/ 內，公開）：CI 一定跑得到的匯入→辨識→計算全流程
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');const path=require('path');
const {ROOT,openApp,newProject,importDrawings,floorTotals}=require('./lib/app');

const EXP=path.join(__dirname,'expected','sample.json');
let app;
before(async()=>{app=await openApp()});
after(async()=>{await app?.close()});

for(const f of ['sample-structure-plan.dxf','sample-structure-plan.dwg']){
  test(`AC-I01 範例圖 ${f}：匯入、辨識、計算結果與基準相同`,async()=>{
    const pg=app.page;
    await pg.evaluate(()=>{S.projects=[];S.cur=null});
    await newProject(pg,'範例');
    await importDrawings(pg,[path.join(ROOT,'samples',f)]);
    const r=await pg.evaluate(()=>{const p=P();const cnt=t=>p.members.filter(m=>m.type===t).length;return {slabs:p.slabs.length,cols:cnt('柱'),beams:cnt('樑'),walls:cnt('牆')}});
    r.floors=await floorTotals(pg);
    assert.deepEqual(app.errors,[]);
    assert.ok(r.slabs>0&&r.cols>0&&r.beams>0,'範例圖要辨識出版、柱、樑');
    const all=fs.existsSync(EXP)?JSON.parse(fs.readFileSync(EXP,'utf8')):{};
    if(process.env.ZHUBEN_UPDATE||!all[f]){all[f]=r;fs.writeFileSync(EXP,JSON.stringify(all,null,1)+'\n');return}
    assert.deepEqual(r,all[f]);
  });
}
