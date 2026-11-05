# 築本模板工程計算：開發規則

## 測試優先（使用者規則 2026-11-05，所有修改都要遵守）

使用者要求：「這個軟體要建立自動化測試及寫入驗收標準，自動化測試通過了，才能寫軟體程式」，目的是「算出來的模板數量才會正確」。

每一次修改程式都照這個順序：

1. **先寫驗收標準**：在 `docs/驗收標準.md` 新增或修改條目（有編號，例如 AC-B06），寫清楚規則與手算的期望值。
2. **再寫測試**：在 `tests/` 加同編號的測試，期望值用手算，不可從程式結果抄。先執行 `npm test`，確認新測試**失敗**（證明測試抓得到問題）。
3. **才寫程式**：改 `src/app.html`，執行 `python3 build.py` 產生 `index.html`。
4. **全部測試通過才算完成**：`npm test` 全綠（TODO 項目除外）才能開 PR；GitHub Actions「自動化測試」沒過的 PR 不能合併。
5. 數量有變動時，PR 說明列出哪些樓層、哪些數字從多少變多少，並寫明是使用者哪一句話確認的規則。

## 不能做的事

- 不可為了讓測試通過而修改期望值、跳過或刪除測試。只有使用者確認了新規則或新數字，才能改 `tests/expected/`（`npm run test:update`）與寫死的數字。
- 吳宅（五股）數量以接手前（PR #46）的算法為準，加上使用者明確要求的規則變更；**不可參照 xlsx 範本修改吳宅數量**。
- 圖面讀不到的值：照常計算但要標紅，不可默默用預設值。
- 使用者的真實圖檔不可提交到 repo（公開）。圖檔放在專案共用資料夾 `zhuben/tests/drawings/`。
- 待使用者決定的事項（見驗收標準第四節）不要自行假設。

## 執行測試

```bash
npm ci
npx playwright install chromium   # 雲端環境已內建 Chromium 時可略過
npm test                          # 全部測試（約 1 分鐘）
npm run test:rules                # 只跑計算規則
ZHUBEN_DRAWINGS=/路徑/drawings npm test   # 指定實際專案圖檔位置
```

測試內容：`tests/rules.test.js`（計算規則）、`tests/projects.test.js`（吳宅、A2-01、蘇宅 753-5、羅宅、羅宅＋建照 全流程數量）、`tests/sample.test.js`（範例圖）、`tests/build.test.js`（index.html 與 src 同步）。

## 架構

- 原始碼 `src/app.html`（單一 HTML），`python3 build.py` → `index.html`（GitHub Pages）；`python3 build.py artifact` → `dist/artifact.html`；`python3 build.py test` → `dist/test.html`（測試用）。
- Windows 桌面版在 `desktop/`（Electron），`main` 更新後自動打包。
