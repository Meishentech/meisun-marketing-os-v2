# 美昇 Marketing OS v2

新版行銷管理平台獨立專案。

## 目前用途

- 提供 Cloudflare Pages 綁定與部署用的初始版本。
- 作為 v2 開發主專案，不影響既有 `marketing-a4l.pages.dev`。
- 後續會依角色權限與 Phase 1 MVP 逐步實作。

## Cloudflare Pages 初始設定

- Production branch: `main`
- Framework preset: `None` 或 `Static HTML`
- Build command: 留空
- Build output directory: `/`

後續若改為 Vite / React，會再改成：

- Build command: `npm run build`
- Build output directory: `dist`
