# 測試案例管理工具

React + Supabase(免費方案)+ GitHub Pages。

## 設定步驟
1. 到 https://supabase.com 註冊並建立專案(免費方案,不需信用卡)。
2. 左側 **SQL Editor** → New query → 貼上 `supabase/schema.sql` 全部內容 → Run。
3. 左側 **Project Settings → API**:複製 `Project URL` 與 `anon public` key(不要用 service_role)。
4. (建議開發階段)左側 **Authentication → Sign In / Providers → Email**,關閉 "Confirm email",註冊後可直接登入。
5. 在專案根目錄建立 `.env.local`:
   ```
   VITE_SUPABASE_URL=你的 Project URL
   VITE_SUPABASE_ANON_KEY=你的 anon key
   ```
6. `npm install` → `npm run dev` 開啟本機網頁。

## 部署到 GitHub Pages
1. 把專案推到 GitHub repo 的 `main` 分支。
2. Repo → Settings → Secrets and variables → Actions,新增 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。
3. Repo → Settings → Pages → Source 選 **GitHub Actions**。
4. 推送後 Actions 會自動建置並發佈。
5. Supabase **Authentication → URL Configuration** 的 Site URL 填入你的 Pages 網址。

## 多團隊使用
首次登入建立團隊,在右上角「顯示邀請碼」把邀請碼給同事,同事註冊後用邀請碼加入。不同團隊資料彼此隔離。
