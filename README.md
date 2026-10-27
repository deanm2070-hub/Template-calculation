# 築本模板工程計算

建築物模板與混凝土數量計算軟體（網頁版，單一 HTML 檔，可離線使用）。

## 功能

- 建立專案（只需輸入名稱），棟別、樓層、層高可於「專案設定」調整
- 直接匯入 **DWG**（內建 LibreDWG 解析引擎，R13～AutoCAD 2018+）或 **DXF**
- 依圖層角色自動辨識：版外框、柱、梁、牆
  - 版：原始模板（面積）、封模（自由邊 × 版厚）、扣版牆接頭、扣柱頭
  - 柱：矩形／圓形斷面；梁、牆：平行線配對，梁深讀取「B1 30x60」標註
  - 剖面／立面圖：讀取樓層標高換算層高
- 模板報表（棟別／樓層／版編號／版內編／原始模板／封模／扣版牆接頭／扣柱頭／扣接頭合計／真實模板，含樓層小計與合計）
- 模板、混凝土分層數量統計總表
- 計算導引圖：每一版可開啟幾何導引圖核對邊長、牆接頭、封模邊與柱頭扣除

## 使用

開啟 `index.html` 即可。部署到 GitHub Pages 後，用 iPhone Safari 開啟網址 →「分享」→「加入主畫面」，從主畫面開啟即為全螢幕。

資料儲存在瀏覽器（localStorage／IndexedDB），換裝置前請在「專案設定」備份。

範例圖檔：`samples/sample-structure-plan.dwg`、`samples/sample-structure-plan.dxf`

## Windows 桌面版

到 [Releases](https://github.com/deanm2070-hub/Template-calculation/releases/latest) 下載：

- `ZhuBen-Formwork-Setup.exe`：安裝版，裝好會在桌面建立「築本模板工程計算」捷徑
- `ZhuBen-Formwork-Portable.exe`：免安裝，放在桌面雙擊即可執行

桌面版內容就是 `index.html`，每次 `main` 更新網頁版後由 GitHub Actions（`.github/workflows/windows-desktop.yml`）自動重新打包。外殼程式在 `desktop/`（Electron）。

## 開發

原始碼在 `src/app.html`，修改後執行：

```bash
python3 build.py            # 產生 index.html（GitHub Pages／單機版）
python3 build.py artifact   # 產生 dist/artifact.html（Claude Artifact 版）
```

## 第三方元件

`vendor/libredwg-web/` 為 [@mlightcad/libredwg-web](https://github.com/mlightcad/libredwg-web) 0.7.17（WebAssembly 版 [LibreDWG](https://www.gnu.org/software/libredwg/)），授權為 **GPL-3.0**。對外散布含此元件的軟體時，須依 GPL-3.0 提供原始碼。
