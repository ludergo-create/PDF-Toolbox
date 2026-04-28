# PDF 工具箱

免费在线 PDF 处理工具，所有文件均在浏览器本地处理，不上传服务器，保护隐私安全。
运行时依赖（`pdf-lib` / `pdf.js` / `jszip` / `Sortable` / `pdf.worker`）均已本地托管在 `js/vendor/`。

## 功能

- **合并 PDF** — 将多个 PDF 合并成一个，支持拖拽排序
- **拆分 / 提取** — 按页码范围提取或全部拆分为单页
- **旋转与删除** — 旋转或删除 PDF 页面
- **PDF 转图片** — 将 PDF 页面导出为高清 JPG/PNG
- **图片转 PDF** — 将多张图片合并为 PDF
- **PDF 加水印** — 添加文字水印，支持中文、平铺、旋转等

## 使用方式

建议部署到静态服务器后访问；直接用 `file://` 打开时，部分浏览器可能限制 Worker 行为。

## 性能优化说明

- 已内置页面预取（hover/touch/focus + 空闲时预取）与 Service Worker 缓存（`sw.js`）。
- Service Worker 仅在 `https://` 或 `localhost` 下生效，用于加速二次访问和页面切换。

建议服务器缓存策略（以 Nginx 为例）：

```nginx
# HTML 短缓存，兼顾更新速度与切页性能
location ~* \.html$ {
    add_header Cache-Control "public, max-age=300, stale-while-revalidate=30";
}

# 静态资源长缓存（文件名变更时自动刷新）
location ~* \.(css|js|woff2?|png|jpg|jpeg|svg|webp)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

## 开发规范

以下工具仅用于本地代码质量检查，不会上传或处理用户 PDF 文件，不影响隐私承诺。

1. 安装依赖：
   `npm install`
2. 运行日常规范检查：
   `npm run lint`
3. 运行全量严格检查（含格式检查）：
   `npm run lint:all`
4. 自动格式化：
   `npm run format`

## 技术栈

- [PDF.js](https://mozilla.github.io/pdf.js/) — PDF 渲染
- [pdf-lib](https://github.com/Hopding/pdf-lib) — PDF 生成与修改
- [JSZip](https://stuk.github.io/jszip/) — ZIP 打包下载
- [SortableJS](https://sortablejs.github.io/Sortable/) — 拖拽排序
- 纯前端，无后端依赖
