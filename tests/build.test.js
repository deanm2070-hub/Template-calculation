// 部署檔一致：index.html 必須是用目前 src/app.html 建置出來的（測的就是上線的）
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');const path=require('path');
const {ROOT,buildTestApp}=require('./lib/app');

test('AC-D01 index.html 與 src/app.html 同步（改了 src 要執行 python3 build.py）',()=>{
  buildTestApp();
  const norm=s=>s.replace(/const BUILD='[^']*';/,"const BUILD='';");
  const built=norm(fs.readFileSync(path.join(ROOT,'dist/test.html'),'utf8'));
  const idx=norm(fs.readFileSync(path.join(ROOT,'index.html'),'utf8'));
  assert.ok(built===idx,'index.html 不是由目前的 src/app.html 建置的，請執行 python3 build.py 後一起提交');
});
