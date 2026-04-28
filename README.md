# PDF 工具箱

一个纯前端 PDF 工具站点。所有 PDF、图片和水印处理都在用户浏览器本地完成，不需要后端服务，也不会把文件上传到服务器。


## 功能

- 合并 PDF：多个 PDF 合并为一个文件，支持拖拽排序。
- 拆分 / 提取：支持全部拆分、连续页码范围和自定义分组导出。
- 旋转与删除：按页预览、旋转、删除，并导出新 PDF。
- PDF 转图片：将 PDF 页面导出为 JPG 或 PNG，并打包 ZIP 下载。
- 图片转 PDF：将 JPG/PNG 图片合成为 PDF，支持拖拽排序。
- PDF 加水印：支持中文文字水印、平铺、旋转、透明度和单页定制。
- 隐私说明页：独立 `privacy.html`，说明本地处理、存储、缓存和第三方依赖边界。

## 隐私与安全边界

- 文件处理在浏览器内完成，项目没有上传 PDF 或图片的接口。
- 页面不会主动收集、保存或分析用户上传的文件内容。
- 主题偏好使用 `localStorage` 保存；Service Worker 和浏览器缓存仅缓存站点静态资源。
- ICP 备案号通过 `js/site-config.js` 配置，填写后同步渲染无延迟。
- 运行时依赖已本地托管在 `js/vendor/`，页面不依赖第三方 CDN 拉取核心脚本。

## 目录结构

```text
.
├── index.html              # 首页
├── merge.html              # 合并 PDF
├── split.html              # 拆分 / 提取
├── edit-pages.html         # 旋转与删除
├── pdf-to-img.html         # PDF 转图片
├── img-to-pdf.html         # 图片转 PDF
├── watermark.html          # PDF 加水印
├── privacy.html            # 隐私说明
├── css/style.css           # 全站样式
├── js/*.js                 # 页面逻辑与公共逻辑
├── js/vendor/              # 本地第三方依赖
├── sw.js                   # Service Worker 缓存策略
└── scripts/                # 本地检查脚本
```

## 本地开发

建议通过 HTTP 服务访问项目，不建议直接用 `file://` 打开；部分浏览器会限制 Worker、Service Worker 或模块相关行为。

```bash
npm install
python3 -m http.server 8765
```

然后访问：

```text
http://127.0.0.1:8765/
```

## 质量检查

```bash
npm run lint
npm run lint:all
npm run format
```

- `npm run lint`：检查 JavaScript 和 HTML 内联脚本约束。
- `npm run lint:all`：在 `lint` 基础上增加 Prettier 格式检查。
- `npm run format`：自动格式化 HTML、CSS、JS、README 和 `sw.js`。

## 部署说明

这是静态项目，部署时只需要把仓库文件放到任意静态托管环境，例如 Nginx、Cloudflare Pages、GitHub Pages 或对象存储静态网站。

Service Worker 只在 `https://` 或 `localhost` 下生效，用于加速二次访问、弱网回退和页面切换。更新站点时需要同步更新 `sw.js` 里的 `CACHE_VERSION`，否则旧缓存可能继续生效。

如果部署平台允许设置缓存头，建议：

- `sw.js` 和 `*.html` 使用 `Cache-Control: no-cache` 或短缓存，保证更新检查及时。
- 没有文件名 hash 的 `css/*.css`、`js/*.js` 不要配置永久 `immutable`。
- `js/vendor/*.js` 版本固定时可以设置较长缓存。

## ICP 备案配置

如需在页脚展示 ICP 备案号，编辑 `js/site-config.js` 填入真实备案号即可。该文件始终存在（默认空配置），页面加载时同步渲染，无延迟。

如果不想把真实备案号提交到 GitHub，可在部署时替换 `js/site-config.js` 的内容；未填写时仅不显示 ICP 信息，不影响任何 PDF 功能。

## 技术栈

- PDF.js：PDF 渲染与页面预览。
- pdf-lib：PDF 创建、合并、拆分、旋转和写入。
- JSZip：多文件 ZIP 打包下载。
- SortableJS：文件列表拖拽排序。
- 原生 HTML / CSS / JavaScript：无前端构建步骤。
