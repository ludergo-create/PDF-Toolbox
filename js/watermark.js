pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';

let wmFileObj = null;
let pdfTotalPages = 0;
let pdfjsDoc = null;
let customWms = {};
let currentModalIdx = -1;

let modalZoom = 1;
let modalPanX = 0;
let modalPanY = 0;
let isModalPanning = false;
let mStartX, mStartY;
const wmFileInput = document.getElementById('wmFileInput');
const wmResetBtn = document.getElementById('wmResetBtn');
const runWmBtn = document.getElementById('runWmBtn');
const wmModalZoomOutBtn = document.getElementById('wmModalZoomOutBtn');
const wmModalZoomInBtn = document.getElementById('wmModalZoomInBtn');
const wmModalFitBtn = document.getElementById('wmModalFitBtn');
const modalClearCustomBtn = document.getElementById('modalClearCustomBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalSaveCustomBtn = document.getElementById('modalSaveCustomBtn');
const wmModalFocus = createModalFocusManager(
    document.getElementById('wmModal'),
    closeModal
);

wmFileInput.addEventListener('change', handleWmFileAdded);
wmResetBtn.addEventListener('click', resetWmFile);
runWmBtn.addEventListener('click', runWatermark);
wmModalZoomOutBtn.addEventListener('click', () => zoomModal(-0.2));
wmModalZoomInBtn.addEventListener('click', () => zoomModal(0.2));
wmModalFitBtn.addEventListener('click', fitModalToWindow);
modalClearCustomBtn.addEventListener('click', clearModalCustom);
modalCancelBtn.addEventListener('click', closeModal);
modalSaveCustomBtn.addEventListener('click', saveModalCustom);

['globalWmText', 'globalWmColor', 'globalWmMode', 'globalWmFlip'].forEach((id) => {
    const eventName = id === 'globalWmText' ? 'input' : 'change';
    document.getElementById(id).addEventListener(eventName, updateAllOverlays);
});

[
    ['globalWmOpacity', 'valOpacity'],
    ['globalWmSize', 'valSize'],
    ['globalWmAngle', 'valAngle'],
    ['globalWmGapX', 'valGapX'],
    ['globalWmGapY', 'valGapY'],
].forEach(([inputId, valueId]) => {
    const input = document.getElementById(inputId);
    input.addEventListener('input', () => {
        document.getElementById(valueId).innerText = input.value;
        updateAllOverlays();
    });
});

['modalWmText', 'modalWmColor', 'modalWmMode', 'modalWmFlip'].forEach((id) => {
    const eventName = id === 'modalWmText' ? 'input' : 'change';
    document.getElementById(id).addEventListener(eventName, updateModalPreview);
});

[
    ['modalWmOpacity', 'modalValOpacity'],
    ['modalWmSize', 'modalValSize'],
    ['modalWmAngle', 'modalValAngle'],
    ['modalWmGapX', 'modalValGapX'],
    ['modalWmGapY', 'modalValGapY'],
].forEach(([inputId, valueId]) => {
    const input = document.getElementById(inputId);
    input.addEventListener('input', () => {
        document.getElementById(valueId).innerText = input.value;
        updateModalPreview();
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.getElementById('modalCanvasWrap');
    if (wrap) {
        wrap.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            zoomModal(delta);
        });
        wrap.addEventListener('mousedown', (e) => {
            isModalPanning = true;
            mStartX = e.clientX - modalPanX;
            mStartY = e.clientY - modalPanY;
            wrap.style.cursor = 'grabbing';
        });
        wrap.addEventListener('mousemove', (e) => {
            if (!isModalPanning) return;
            modalPanX = e.clientX - mStartX;
            modalPanY = e.clientY - mStartY;
            applyModalTransform();
        });
        wrap.addEventListener('mouseup', () => {
            isModalPanning = false;
            wrap.style.cursor = 'grab';
        });
        wrap.addEventListener('mouseleave', () => {
            isModalPanning = false;
            wrap.style.cursor = 'grab';
        });
    }
});

function zoomModal(delta) {
    modalZoom = Math.max(0.1, Math.min(modalZoom + delta, 5));
    applyModalTransform();
}

function fitModalToWindow() {
    const wrap = document.getElementById('modalCanvasWrap');
    const canvas = document.getElementById('modalCanvas');
    if (canvas.width && canvas.height) {
        const scaleX = (wrap.clientWidth - 40) / canvas.width;
        const scaleY = (wrap.clientHeight - 40) / canvas.height;
        modalZoom = Math.max(0.1, Math.min(scaleX, scaleY, 1));
    } else {
        modalZoom = 1;
    }
    modalPanX = 0;
    modalPanY = 0;
    applyModalTransform();
}

function applyModalTransform() {
    const container = document.getElementById('modalZoomContainer');
    container.style.transform = `translate(${modalPanX}px, ${modalPanY}px) scale(${modalZoom})`;
    document.getElementById('modalZoomLevel').innerText =
        Math.round(modalZoom * 100) + '%';
}

function getGlobalConfig() {
    return {
        text: document.getElementById('globalWmText').value || ' ',
        color: document.getElementById('globalWmColor').value,
        mode: document.getElementById('globalWmMode').value,
        flip: document.getElementById('globalWmFlip').value,
        opacity: parseFloat(document.getElementById('globalWmOpacity').value),
        size: parseInt(document.getElementById('globalWmSize').value, 10),
        angle: parseInt(document.getElementById('globalWmAngle').value, 10),
        gapX: parseInt(document.getElementById('globalWmGapX').value, 10),
        gapY: parseInt(document.getElementById('globalWmGapY').value, 10),
    };
}

function getModalConfig() {
    return {
        text: document.getElementById('modalWmText').value || ' ',
        color: document.getElementById('modalWmColor').value,
        mode: document.getElementById('modalWmMode').value,
        flip: document.getElementById('modalWmFlip').value,
        opacity: parseFloat(document.getElementById('modalWmOpacity').value),
        size: parseInt(document.getElementById('modalWmSize').value, 10),
        angle: parseInt(document.getElementById('modalWmAngle').value, 10),
        gapX: parseInt(document.getElementById('modalWmGapX').value, 10),
        gapY: parseInt(document.getElementById('modalWmGapY').value, 10),
    };
}

function setModalConfig(config) {
    document.getElementById('modalWmText').value = config.text;
    document.getElementById('modalWmColor').value = config.color;
    document.getElementById('modalWmMode').value = config.mode;
    document.getElementById('modalWmFlip').value = config.flip || 'none';

    document.getElementById('modalWmOpacity').value = config.opacity;
    document.getElementById('modalValOpacity').innerText = config.opacity;

    document.getElementById('modalWmSize').value = config.size;
    document.getElementById('modalValSize').innerText = config.size;

    document.getElementById('modalWmAngle').value = config.angle;
    document.getElementById('modalValAngle').innerText = config.angle;

    const gapX = config.gapX !== undefined ? config.gapX : 100;
    document.getElementById('modalWmGapX').value = gapX;
    document.getElementById('modalValGapX').innerText = gapX;

    const gapY = config.gapY !== undefined ? config.gapY : 100;
    document.getElementById('modalWmGapY').value = gapY;
    document.getElementById('modalValGapY').innerText = gapY;
}

// 核心渲染引擎：在给定的 Canvas 2D 上下文上绘制水印
function renderWatermarkOnCanvas(ctx, canvasWidth, canvasHeight, config, scale = 1) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (!config.text.trim()) return;

    ctx.save();
    const scaledSize = config.size * 0.6 * scale;
    ctx.font = `bold ${scaledSize}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.fillStyle = config.color;
    ctx.globalAlpha = config.opacity;
    ctx.textBaseline = 'middle';

    let renderText = config.text;
    if (config.flip === 'reverse') {
        renderText = renderText.split('').reverse().join('');
    }

    let angleRad = (config.angle * Math.PI) / 180;
    if (config.flip === 'rotate180') {
        angleRad += Math.PI;
    }

    const metrics = ctx.measureText(renderText);
    const textW = metrics.width;
    const textH = scaledSize * 1.5;

    if (config.mode === 'single') {
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.rotate(angleRad);
        ctx.textAlign = 'center';
        ctx.fillText(renderText, 0, 0);
    } else {
        // 平铺模式
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.rotate(angleRad);
        ctx.textAlign = 'left';

        // 计算覆盖范围 (稍微多算一点以防旋转后留白)
        const diagonal = Math.sqrt(
            canvasWidth * canvasWidth + canvasHeight * canvasHeight
        );
        const stepX =
            textW + (config.gapX !== undefined ? config.gapX : 100) * 0.6 * scale;
        const stepY =
            textH + (config.gapY !== undefined ? config.gapY : 100) * 0.6 * scale;

        const startX = -diagonal / 2;
        const endX = diagonal / 2;
        const startY = -diagonal / 2;
        const endY = diagonal / 2;

        for (let y = startY; y < endY; y += stepY) {
            for (let x = startX; x < endX; x += stepX) {
                ctx.fillText(renderText, x, y);
            }
        }
    }
    ctx.restore();
}

const wmDropZone = document.getElementById('wmDropZone');
wmDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});
wmDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) loadWmFile(e.dataTransfer.files[0]);
});

function handleWmFileAdded(event) {
    if (event.target.files.length > 0) loadWmFile(event.target.files[0]);
    event.target.value = '';
}

function resetWmFile() {
    wmFileObj = null;
    pdfjsDoc = null;
    customWms = {};
    document.getElementById('wmDropZone').style.display = 'block';
    document.getElementById('fileInfoArea').style.display = 'none';
    document.getElementById('wmPagesGrid').style.display = 'none';
    document.getElementById('wmStatusText').innerText = '未加载文件';
    document.getElementById('runWmBtn').disabled = true;
}

async function loadWmFile(file) {
    if (!isPdfFile(file)) {
        alert('只能选择 PDF 文件！');
        return;
    }
    wmFileObj = file;
    customWms = {};

    const dropLabel = document.getElementById('wmDropZone');
    const fileInfoArea = document.getElementById('fileInfoArea');
    const fileNameDiv = document.getElementById('wmFileName');
    const status = document.getElementById('wmStatusText');
    const btn = document.getElementById('runWmBtn');
    const grid = document.getElementById('wmPagesGrid');

    dropLabel.innerHTML = '正在解析并渲染文档...';
    try {
        const arrayBuffer = await file.arrayBuffer();
        pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfTotalPages = pdfjsDoc.numPages;

        grid.innerHTML = '';

        // 渲染缩略图
        for (let i = 1; i <= pdfTotalPages; i++) {
            const page = await pdfjsDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 });

            const item = document.createElement('div');
            item.className = 'pdf-page-item';
            item.addEventListener('dblclick', () => openModal(i - 1));
            item.title = '双击可独立定制该页水印';

            const canvasWrap = document.createElement('div');
            canvasWrap.className = 'pdf-page-canvas-wrapper';

            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas';
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            // 水印专用透明 Canvas
            const wmCanvas = document.createElement('canvas');
            wmCanvas.className = 'wm-canvas-overlay';
            wmCanvas.id = `wm-canvas-${i - 1}`;
            wmCanvas.width = viewport.width;
            wmCanvas.height = viewport.height;

            const customBadge = document.createElement('div');
            customBadge.className = 'custom-badge';
            customBadge.id = `custom-badge-${i - 1}`;
            customBadge.innerText = '专属定制';

            canvasWrap.appendChild(canvas);
            canvasWrap.appendChild(wmCanvas);
            canvasWrap.appendChild(customBadge);

            const pageLabel = document.createElement('div');
            pageLabel.className = 'page-number-label';
            pageLabel.innerText = `第 ${i} 页`;

            item.appendChild(canvasWrap);
            item.appendChild(pageLabel);
            grid.appendChild(item);
        }

        dropLabel.style.display = 'none';
        dropLabel.innerHTML =
            '点击选择 PDF 文件<span class="hide-on-mobile">（或将文件拖到此处）</span>';

        fileInfoArea.style.display = 'flex';
        fileNameDiv.innerText = `📄 ${file.name} (共 ${pdfTotalPages} 页)`;

        grid.style.display = 'grid';

        updateAllOverlays(); // 初始化全局效果

        status.innerText = '渲染完成，所见即所得。双击单页可深度定制。';
        btn.disabled = false;
    } catch (e) {
        console.error(e);
        dropLabel.innerHTML = '❌ 读取失败，可能是加密文件。点击重试';
        wmFileObj = null;
        btn.disabled = true;
    }
}

// 同步全局设置与预览
function updateAllOverlays() {
    const globalCfg = getGlobalConfig();

    // 根据排布模式显隐间距滑块
    const hideGapControls = globalCfg.mode === 'single';
    document
        .getElementById('globalWmGapX')
        .parentElement.classList.toggle('u-hidden', hideGapControls);
    document
        .getElementById('globalWmGapY')
        .parentElement.classList.toggle('u-hidden', hideGapControls);

    for (let i = 0; i < pdfTotalPages; i++) {
        const wmCanvas = document.getElementById(`wm-canvas-${i}`);
        const badge = document.getElementById(`custom-badge-${i}`);
        if (!wmCanvas) continue;

        const ctx = wmCanvas.getContext('2d');
        const config = customWms[i] || globalCfg;

        renderWatermarkOnCanvas(ctx, wmCanvas.width, wmCanvas.height, config, 0.5);

        if (customWms[i]) badge.style.display = 'block';
        else badge.style.display = 'none';
    }
}

// 打开单页定制弹窗
async function openModal(idx) {
    currentModalIdx = idx;
    document.getElementById('modalTitle').innerText = `定制第 ${idx + 1} 页`;

    const config = customWms[idx] || getGlobalConfig();
    setModalConfig(config);

    // 渲染高清大图
    const canvas = document.getElementById('modalCanvas');
    const ctx = canvas.getContext('2d');
    const page = await pdfjsDoc.getPage(idx + 1);
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    // 初始化弹窗水印画布尺寸
    const wmCanvas = document.getElementById('modalWmCanvas');
    wmCanvas.width = viewport.width;
    wmCanvas.height = viewport.height;

    updateModalPreview();
    document.getElementById('wmModal').style.display = 'flex';
    wmModalFocus.open();
    setTimeout(() => fitModalToWindow(), 10);
}

function updateModalPreview() {
    const config = getModalConfig();
    // 根据排布模式显隐间距滑块
    const hideGapControls = config.mode === 'single';
    document
        .getElementById('modalGapXGroup')
        .classList.toggle('u-hidden', hideGapControls);
    document
        .getElementById('modalGapYGroup')
        .classList.toggle('u-hidden', hideGapControls);

    const wmCanvas = document.getElementById('modalWmCanvas');
    const ctx = wmCanvas.getContext('2d');
    renderWatermarkOnCanvas(ctx, wmCanvas.width, wmCanvas.height, config, 1.5);
}

function closeModal() {
    document.getElementById('wmModal').style.display = 'none';
    wmModalFocus.close();
}

function saveModalCustom() {
    customWms[currentModalIdx] = getModalConfig();
    updateAllOverlays();
    closeModal();
}

function clearModalCustom() {
    delete customWms[currentModalIdx];
    updateAllOverlays();
    closeModal();
}

// 将水印渲染为透明 PNG 供 pdf-lib 嵌入
function generateWatermarkPngUrl(width, height, config) {
    const canvas = document.createElement('canvas');
    // 为了保证清晰度，生成尺寸和实际页面一样大的图片
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    renderWatermarkOnCanvas(ctx, width, height, config);
    return canvas.toDataURL('image/png');
}

// 最终保存
async function runWatermark() {
    if (!wmFileObj) return;

    const btn = document.getElementById('runWmBtn');
    const status = document.getElementById('wmStatusText');

    btn.disabled = true;
    btn.innerText = '处理中...';
    status.innerText = '正在压制带中文字体的水印，这可能需要几秒钟...';

    try {
        const { PDFDocument } = PDFLib;
        const arrayBuffer = await wmFileObj.arrayBuffer();
        const newDoc = await PDFDocument.load(arrayBuffer);
        const globalCfg = getGlobalConfig();
        const pages = newDoc.getPages();

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const wmConfig = customWms[i] || globalCfg;
            if (!wmConfig.text.trim()) continue;

            const { width, height } = page.getSize();
            status.innerText = `正在处理第 ${i + 1}/${pages.length} 页...`;

            // 利用前端 Canvas 生成该页专属的水印层透明 PNG
            // 这里我们采用和缩略图一模一样的绘制逻辑，保证 100% 还原
            // 为了 PDF 打印清晰度，Canvas 生成分辨率提升 2 倍
            const scale = 2.0;
            const dataUrl = generateWatermarkPngUrl(width * scale, height * scale, {
                ...wmConfig,
                size: wmConfig.size * scale, // 字号跟着放大
            });

            // 嵌入到 PDF
            const pngImage = await newDoc.embedPng(dataUrl);
            page.drawImage(pngImage, {
                x: 0,
                y: 0,
                width: width,
                height: height,
            });
        }

        status.innerText = '正在打包生成最终文件...';
        const pdfBytes = await newDoc.save();
        const baseName = wmFileObj.name.replace(/\.[^/.]+$/, '');
        triggerDownload(pdfBytes, `${baseName}_水印.pdf`);

        status.innerText = '✅ 处理完成，已下载';
        status.style.color = 'var(--success)';
    } catch (e) {
        console.error(e);
        status.innerText = '❌ 处理失败';
        status.style.color = 'var(--danger)';
    } finally {
        btn.disabled = false;
        btn.innerText = '添加水印并保存';
        setTimeout(() => {
            status.innerText = '文件已就绪，可继续调整参数';
            status.style.color = 'var(--text-sub)';
        }, 4000);
    }
}