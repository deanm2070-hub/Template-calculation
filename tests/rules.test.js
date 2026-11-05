// 計算規則測試：每一條對應 docs/驗收標準.md 的編號。期望值是手算的，不是從程式抄來的。
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./lib/app');

let app;
before(async()=>{app=await openApp()});
after(async()=>{await app?.close()});

// 專案：層高 2 樓 3.2、其他 3.4；版厚 0.15；基礎版厚 0.30（專案設定）
const PROJ={bldgs:['A'],floors:[{name:'F',h:1.5},{name:'1',h:3.4},{name:'2',h:3.2},{name:'3',h:3.4}],slabT:0.15,raftT:0.3,drawings:[]};
const mem=(m,proj=PROJ)=>app.page.evaluate(([m,pr])=>{const p=Object.assign(newProject({}),pr);const c=memCalc(m,p);return {form:c.form,conc:c.conc,cat:memCat(m)}},[m,proj]);
const slab=s=>app.page.evaluate(s=>{const c=slabCalc(s);return {real:c.real,conc:c.conc,ded:c.ded}},s);

// ---------- 柱 ----------
test('AC-C01 柱模板 = 2(b+h)(H−ts)×n，混凝土 = b×h×(H−ts)×n',async()=>{
  const c=await mem({type:'柱',floor:'1',b:0.4,h:0.5,H:3.4,ts:0.15,n:2});
  assert.equal(c.form,11.7);assert.equal(c.conc,1.3);assert.equal(c.cat,'柱');
});
test('AC-C02 柱模板扣樑柱接頭',async()=>{
  const c=await mem({type:'柱',floor:'1',b:0.4,h:0.5,H:3.4,ts:0.15,n:2,ded:0.3});
  assert.equal(c.form,11.4);assert.equal(c.conc,1.3);
});
test('AC-C03 圓柱模板 = π×D×(H−ts)，混凝土 = π×D²/4×(H−ts)',async()=>{
  const c=await mem({type:'柱',floor:'1',shape:'circle',b:0.6,H:3.4,ts:0.15});
  assert.equal(c.form,6.13);assert.equal(c.conc,0.92);
});
test('AC-C04 柱高沒有個別指定時用該層層高，版厚用專案版厚',async()=>{
  const c=await mem({type:'柱',floor:'2',b:0.4,h:0.4});
  // (3.2−0.15)=3.05；2×0.8×3.05
  assert.equal(c.form,4.88);
});

// ---------- 樑 ----------
test('AC-B01 中間樑模板 = (b+2(h−ts))×L，混凝土 = b×h×L',async()=>{
  const c=await mem({type:'樑',floor:'1',b:0.3,h:0.6,ts:0.15,L:5});
  assert.equal(c.form,6);assert.equal(c.conc,0.9);assert.equal(c.cat,'樑');
});
test('AC-B02 中間樑不補「版厚×無版長度」（使用者規則 2026-10-27）',async()=>{
  const c=await mem({type:'樑',floor:'1',b:0.3,h:0.6,ts:0.15,L:5,ns:[2,2]});
  assert.equal(c.form,6);
});
test('AC-B03 只有邊樑補「版厚×無版長度」',async()=>{
  const c=await mem({type:'樑',floor:'1',b:0.3,h:0.6,ts:0.15,L:5,edge:true,ns:[2,2]});
  // 6 + 0.15×4
  assert.equal(c.form,6.6);
});
test('AC-B04 樑底下有牆的長度扣牆厚×長度',async()=>{
  const c=await mem({type:'樑',floor:'1',b:0.3,h:0.6,ts:0.15,L:5,ded:1.5});
  assert.equal(c.form,4.5);
});
test('AC-B05 樑混凝土含轉角塊',async()=>{
  const c=await mem({type:'樑',floor:'1',b:0.3,h:0.6,ts:0.15,L:5,cx:0.4});
  assert.equal(c.conc,0.97);
});

// ---------- 基礎 ----------
test('AC-G01 中間地樑雙面模，高度 = 樑深 − 基礎版厚 − 1 樓版厚，不組底模',async()=>{
  const c=await mem({type:'樑',floor:'F',b:0.4,h:1.35,L:5});
  // 1.35−0.30−0.15 = 0.9；2×0.9×5；混凝土 0.4×0.9×5
  assert.equal(c.form,9);assert.equal(c.conc,1.8);
});
test('AC-G02 周邊地樑只組內側單面模',async()=>{
  const c=await mem({type:'樑',floor:'F',b:0.4,h:1.35,L:5,edge:true});
  assert.equal(c.form,4.5);assert.equal(c.conc,1.8);
});
test('AC-G03 基礎版厚沒有在專案設定填時，取圖面讀到的厚度',async()=>{
  const c=await mem({type:'樑',floor:'F',b:0.4,h:1.35,L:5},{...PROJ,raftT:undefined,drawings:[{raftT:0.45}]});
  // 1.35−0.45−0.15 = 0.75
  assert.equal(c.form,7.5);
});
test('AC-G04 基礎版混凝土 = 面積 × 基礎版厚，不組模',async()=>{
  const c=await mem({type:'其他',floor:'F',kind:'raft',A:100});
  assert.equal(c.conc,30);assert.equal(c.form,0);assert.equal(c.cat,'版');
});
test('AC-G05 1 樓地板混凝土 = (面積 − 電梯坑開口) × 版厚，不組模',async()=>{
  const c=await mem({type:'其他',floor:'F',kind:'slab1',A:100,open:4});
  assert.equal(c.conc,14.4);assert.equal(c.form,0);
});

// ---------- 牆 ----------
test('AC-W01 牆模板 = 2×L×(H − 上方樑深)，混凝土 = L×高×厚',async()=>{
  const c=await mem({type:'牆',floor:'1',b:0.2,L:4,H:3.4,hb:0.6});
  assert.equal(c.form,22.4);assert.equal(c.conc,2.24);assert.equal(c.cat,'牆');
});
test('AC-W02 牆上方沒有樑時算到樓版底（H − 版厚）',async()=>{
  const c=await mem({type:'牆',floor:'1',b:0.2,L:4,H:3.4,ts:0.15});
  assert.equal(c.form,26);
});
test('AC-W03 門窗開口兩面都扣，混凝土扣開口體積',async()=>{
  const c=await mem({type:'牆',floor:'1',b:0.2,L:4,H:3.4,hb:0.6,opens:[{tag:'W1',ow:1.5,oh:1.2}]});
  // 22.4 − 2×1.8；(11.2−1.8)×0.2
  assert.equal(c.form,18.8);assert.equal(c.conc,1.88);
});
test('AC-W04 女兒牆高度用女兒牆高',async()=>{
  const c=await mem({type:'牆',floor:'R1',b:0.15,L:4,hp:1.5});
  assert.equal(c.form,12);
});

// ---------- 版 ----------
test('AC-S01 版真實模板 = 原始模板 + 封模 − 扣版牆接頭 − 扣柱頭；混凝土 = 原始模板 × 版厚',async()=>{
  const c=await slab({orig:'20',seal:'2',wall:'0.5',col:'0.3',t:0.15});
  assert.equal(c.real,21.2);assert.equal(c.conc,3);
});
test('AC-S02 版欄位可輸入算式',async()=>{
  const c=await slab({orig:'4*5',seal:'(4+5)*2*0.15',wall:'',col:'',t:0.15});
  assert.equal(c.real,22.7);
});
test('AC-S03 不組模的版（如 FCS 落地版）只算混凝土',async()=>{
  const c=await slab({orig:'20',seal:'2',wall:'',col:'',t:0.15,noForm:true});
  assert.equal(c.real,0);assert.equal(c.conc,3);
});

// ---------- 其他 ----------
test('AC-O01 樓梯 = (斜版長×梯寬 + 級高×梯寬×階數)×座數，歸在「其他」',async()=>{
  const c=await mem({type:'其他',floor:'1',kind:'stair',L:3,b:1.2,h:0.18,k:10,ts:0.15,td:0.21,n:1});
  assert.equal(c.form,5.76);assert.equal(c.conc,0.77);assert.equal(c.cat,'其他');
});
test('AC-O02 樓梯平台底模 = 寬×深×處數×座數，歸在「版」',async()=>{
  const c=await mem({type:'其他',floor:'1',kind:'landing',b:1.2,L:1.5,k:1,n:2,ts:0.15});
  assert.equal(c.form,3.6);assert.equal(c.conc,0.54);assert.equal(c.cat,'版');
});
test('AC-O03 陽台垂牆 = (版厚 + 2×垂深 + 牆厚)×長，混凝土 = 厚×垂深×長',async()=>{
  const c=await mem({type:'其他',floor:'2',kind:'drop',b:0.1,h:0.45,L:3,ts:0.15});
  assert.equal(c.form,3.45);assert.equal(c.conc,0.14);
});

// ---------- 樓層歸屬 ----------
test('AC-F01 第 N 層 = 本層柱、牆 + 上一層結構平面的樑、版',async()=>{
  const r=await app.page.evaluate(()=>{const all=['基礎及一層結構平面圖','二層結構平面圖','三層結構平面圖','屋頂層結構平面圖'];return all.map(t=>planStory(t,all))});
  assert.deepEqual(r,[['F'],['1'],['2'],['3']]);
});
test('AC-F02 屋突層：屋突一層結構平面 → 最上層；屋突二層 → R1',async()=>{
  const r=await app.page.evaluate(()=>{const all=['二層結構平面圖','五層結構平面圖','屋突一層結構平面圖','屋突二層結構平面圖'];return [planStory(all[2],all),planStory(all[3],all)]});
  assert.deepEqual(r,[['5'],['R1']]);
});
test('AC-F03 每層範圍 = 本層樓板面到上一層樓板面',async()=>{
  const r=await app.page.evaluate(()=>{const p=Object.assign(newProject({}),{floors:[{name:'F'},{name:'1'},{name:'2'}]});return [flRange(p,'F'),flRange(p,'1'),flRange(p,'2')]});
  assert.deepEqual(r,['基礎～1FL','1FL～2FL','2FL 以上']);
});
test('AC-F04 分層總表依樓層、類別加總（樓梯→其他、平台→版）',async()=>{
  const r=await app.page.evaluate(()=>{
    const p=Object.assign(newProject({}),{floors:[{name:'1',h:3.4},{name:'2',h:3.4}],slabT:0.15});
    p.slabs.push({bldg:'A',floor:'1',orig:'20',seal:'',wall:'',col:'',t:0.15});
    p.members.push({bldg:'A',floor:'1',type:'柱',b:0.4,h:0.5,H:3.4,ts:0.15,n:2});
    p.members.push({bldg:'A',floor:'1',type:'其他',kind:'stair',L:3,b:1.2,h:0.18,k:10,ts:0.15,td:0.21,n:1});
    p.members.push({bldg:'A',floor:'1',type:'其他',kind:'landing',b:1.2,L:1.5,k:1,n:2,ts:0.15});
    const {F}=summary(p,'A');return F['1'].form;
  });
  assert.equal(Math.round(r.版*100)/100,23.6);assert.equal(r.柱,11.7);assert.equal(r.其他,5.76);assert.equal(r.樑,0);
});

// ---------- 缺值處理 ----------
test('AC-M01 結構圖上沒有編號的柱，計算照常但列入辨識檢查',async()=>{
  const r=await app.page.evaluate(()=>{
    const p=Object.assign(newProject({}),{floors:[{name:'1',h:3.4}]});
    p.drawings.push({kind:'struct',bldg:'A',floors:['1']});
    const m={bldg:'A',floor:'1',type:'柱',code:'C',b:0.4,h:0.4,H:3.4,ts:0.15};p.members.push(m);
    return {form:memCalc(m,p).form,chk:checks(p,'1','A').map(c=>c.msg)};
  });
  assert.equal(r.form,5.2);assert.ok(r.chk.some(s=>/柱編號/.test(s)),'應有「沒有找到柱編號」檢查');
});
test('AC-M02 基礎版厚圖面沒有標、專案也沒填時，仍要計算但標紅提醒',{todo:'待實作：目前用預設 0.4 m，沒有標示'},async()=>{
  const r=await app.page.evaluate(()=>{
    const p=Object.assign(newProject({}),{floors:[{name:'F',h:1.5},{name:'1',h:3.4}]});
    p.drawings.push({kind:'struct',bldg:'A',floors:['F']});
    p.members.push({bldg:'A',floor:'F',type:'其他',kind:'raft',A:100});
    return {conc:memCalc(p.members[0],p).conc,chk:checks(p,'F','A').map(c=>c.msg)};
  });
  assert.ok(r.conc>0);assert.ok(r.chk.some(s=>/基礎版厚/.test(s)),'應提醒基礎版厚不是從圖面讀到的');
});
