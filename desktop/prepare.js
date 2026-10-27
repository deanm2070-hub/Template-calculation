// 把網頁版（../index.html 與圖示）複製到 app/，並把 PDF 用的 html2canvas、jsPDF 改成本機檔，離線也能出 PDF。
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(__dirname, 'app');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'lib'), { recursive: true });
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
for (const f of ['manifest.webmanifest', 'version.json']) fs.copyFileSync(path.join(root, f), path.join(out, f));
const libs = {
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js': 'html2canvas/dist/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js': 'jspdf/dist/jspdf.umd.min.js',
};
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const [url, mod] of Object.entries(libs)) {
  if (!html.includes(url)) throw new Error('index.html 找不到 ' + url);
  const name = path.basename(mod);
  fs.copyFileSync(require.resolve(mod), path.join(out, 'lib', name));
  html = html.split(url).join('lib/' + name);
}
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('app/ ready', html.length);
