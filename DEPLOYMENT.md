# 教導處任務地圖：部署筆記

## 目前版本狀態

這個版本可以先部署成線上試用版，但資料仍使用瀏覽器 `localStorage` 保存。

也就是：

- 同一台電腦、同一個瀏覽器重新整理後資料會保留。
- 換電腦或換瀏覽器，不會看到同一份資料。
- 適合先讓主任與少數老師測試流程。
- 若要全校共用資料，下一步需要接資料庫，例如 Supabase 或 Firebase。

## 建議部署方式：Vercel

Vercel 對 Next.js 是零設定部署。官方文件說明 Next.js 專案可直接用 Vercel CLI，或透過 GitHub/GitLab/Bitbucket 匯入部署。

### 方式 A：GitHub + Vercel

1. 建立 GitHub repository。
2. 把此專案推上 GitHub。
3. 到 Vercel Dashboard 選 `New Project`。
4. 匯入 GitHub repository。
5. Build Command 使用預設 `npm run build`。
6. Deploy。

### 方式 B：Vercel CLI

在專案根目錄執行：

```bash
npm install
npm run build
npx vercel
```

第一次部署後，正式上線可用：

```bash
npx vercel --prod
```

## 部署前檢查

```bash
npm install
npm run build
```

如果 build 成功，就可以部署。

## 下一階段：真正多人共用

正式給學校使用前，建議補：

- 登入與角色權限：主任 / 教師
- 雲端資料庫：任務、活動、便利貼、檢討紀錄
- 檔案上傳：照片、文件
- 備份與匯出：活動資料庫可匯出
