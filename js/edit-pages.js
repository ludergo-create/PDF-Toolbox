pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';

let editFileObj = null;
let pdfTotalPages = 0;
let pdfjsDoc = null; // I-9: 缓存 PDF 文档对象
let pagesState = []; // [{deleted: false, rotation: 0}]
let currentPreviewIdx = -1;
let editResetTimer = null;

const editFileInput = document.getElementById('editFileInput');
const editResetBtn = document.getElementById('editResetBtn');
const rotateAllLeftBtn = document.getElementById('rotateAllLeftBtn');
const rotateAllRightBtn = document.getElementById('rotateAllRightBtn');
const recoverAllBtn = document.getElementById('recoverAllBtn');
const runEditBtn = document.getElementById('runEditBtn');
const previewZoomOutBtn = document.getElementById('previewZoomOutBtn');
const previewZoomInBtn = document.getElementById('previewZoomInBtn');
const previewFitBtn = document.getElementById('previewFitBtn');
const previewCloseBtn = document.getElementById('previewCloseBtn');
const previewRotateLeftBtn = document.getElementById('previewRotateLeftBtn');
const previewRotateRightBtn = document.getElementById('previewRotateRightBtn');
const previewModalDelBtn = document.getElementById('previewModalDelBtn');
const previewModalFocus = createModalFocusManager(
    document.getElementById('previewModal'),
    closePreviewModal
);

const previewZoomMgr = createZoomPanManager(
    document.getElementById('previewModalCanvasWrap'),
    document.getElementById('previewModalZoomContainer'),
    document.getElementById('previewModalZoomLevel')
);

editFileInput.addEventListener('change', handleEditFileAdded);
editResetBtn.addEventListener('click', resetEditFile);
rotateAllLeftBtn.addEventListener('click', () => rotateAll(-90));
rotateAllRightBtn.addEventListener('click', () => rotateAll(90));
recoverAllBtn.addEventListener('click', recoverAll);
runEditBtn.addEventListener('click', runEdit);
previewZoomOutBtn.addEventListener('click', () => previewZoomMgr.zoomBy(-0.2));
previewZoomInBtn.addEventListener('click', () => previewZoomMgr.zoomBy(0.2));
previewFitBtn.addEventListener('click', () => previewZoomMgr.fitToWindow());
previewCloseBtn.addEventListener('click', closePreviewModal);
previewRotateLeftBtn.addEventListener('click', () => rotatePreviewPage(-90));
previewRotateRightBtn.addEventListener('click', () => rotatePreviewPage(90));
previewModalDelBtn.addEventListener('click', toggleDeletePreviewPage);

async function openPreviewModal(idx) {
    currentPreviewIdx = idx;
    document.getElementById('previewModalTitle').innerText = `第 ${idx + 1} 页预览`;

    // I-9: 复用已缓存的 pdfjsDoc 对象，避免重复解析
    const canvas = document.getElementById('previewModalCanvas');
    const ctx = canvas.getContext('2d');
    const page = await pdfjsDoc.getPage(idx + 1);
    const viewport = page.getViewport({ scale: 2.0 }); // 高清渲染
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    updatePreviewModalState();
    document.getElementById('previewModal').style.display = 'flex';
    previewModalFocus.open();
    setTimeout(() => previewZoomMgr.fitToWindow(), 10);
}

function updatePreviewModalState() {
    const state = pagesState[currentPreviewIdx];
    document.getElementById('previewModalRotateContainer').style.transform =
        `rotate(${state.rotation}deg)`;
    document.getElementById('previewModalMask').style.display = state.deleted ? 'flex' : 'none';
    document.getElementById('previewModalDelBtn').innerText = state.deleted
        ? '🔄 恢复页面'
        : '🗑️ 删除页面';
}
function rotatePreviewPage(deg) {
    rotatePage(currentPreviewIdx, deg);
    updatePreviewModalState();
}

function toggleDeletePreviewPage() {
    toggleDeletePage(currentPreviewIdx);
    updatePreviewModalState();
}

function closePreviewModal() {
    document.getElementById('previewModal').style.display = 'none';
    previewModalFocus.close();
}

function normalizePageRotation(angle) {
    const normalized = ((angle % 360) + 360) % 360;
    return (Math.round(normalized / 90) * 90) % 360;
}

const editDropZone = document.getElementById('editDropZone');
editDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});
editDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) loadEditFile(e.dataTransfer.files[0]);
});

function handleEditFileAdded(event) {
    if (event.target.files.length > 0) loadEditFile(event.target.files[0]);
    event.target.value = '';
}

function resetEditFile() {
    editFileObj = null;
    if (pdfjsDoc) {
        pdfjsDoc.destroy();
        pdfjsDoc = null;
    }
    document.getElementById('editDropZone').style.display = 'block';
    document.getElementById('fileInfoArea').style.display = 'none';
    document.getElementById('globalToolbar').style.display = 'none';
    document.getElementById('pagesGrid').style.display = 'none';
    document.getElementById('editStatusText').innerText = '未加载文件';
    document.getElementById('runEditBtn').disabled = true;
}

async function loadEditFile(file) {
    if (!isPdfFile(file)) {
        alert('只能选择 PDF 文件！');
        return;
    }
    if (editResetTimer) { clearTimeout(editResetTimer); editResetTimer = null; }
    editFileObj = file;

    const dropLabel = document.getElementById('editDropZone');
    const fileInfoArea = document.getElementById('fileInfoArea');
    const fileNameDiv = document.getElementById('editFileName');
    const status = document.getElementById('editStatusText');
    const btn = document.getElementById('runEditBtn');
    const grid = document.getElementById('pagesGrid');
    const toolbar = document.getElementById('globalToolbar');

    dropLabel.innerHTML = '正在解析并渲染文档...';
    try {
        // 1. 获取 PDF 并缓存 (I-9)
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfjsDoc = pdf;
        pdfTotalPages = pdf.numPages;

        // 2. 初始化状态
        pagesState = Array.from({ length: pdfTotalPages }, () => ({
            deleted: false,
            rotation: 0,
        }));
        grid.innerHTML = '';

        // 3. 渲染缩略图
        for (let i = 1; i <= pdfTotalPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 }); // 缩略图比例

            const item = document.createElement('div');
            item.className = 'pdf-page-item';
            item.id = `page-item-${i - 1}`;
            item.addEventListener('dblclick', () => openPreviewModal(i - 1));
            item.title = '双击放大预览并精细操作';

            const canvasWrap = document.createElement('div');
            canvasWrap.className = 'pdf-page-canvas-wrapper';

            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas';
            canvas.id = `page-canvas-${i - 1}`;
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            const mask = document.createElement('div');
            mask.className = 'page-deleted-mask';
            mask.id = `page-mask-${i - 1}`;
            mask.style.display = 'none';
            mask.innerText = '已删除';

            canvasWrap.appendChild(canvas);
            canvasWrap.appendChild(mask);

            const actions = document.createElement('div');
            actions.className = 'pdf-page-actions';

            const rotateLeftBtn = document.createElement('button');
            rotateLeftBtn.className = 'page-btn';
            rotateLeftBtn.type = 'button';
            rotateLeftBtn.innerText = '↺';
            rotateLeftBtn.addEventListener('click', () => rotatePage(i - 1, -90));

            const rotateRightBtn = document.createElement('button');
            rotateRightBtn.className = 'page-btn';
            rotateRightBtn.type = 'button';
            rotateRightBtn.innerText = '↻';
            rotateRightBtn.addEventListener('click', () => rotatePage(i - 1, 90));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'page-btn page-btn-danger';
            deleteBtn.type = 'button';
            deleteBtn.innerText = '🗑️';
            deleteBtn.addEventListener('click', () => toggleDeletePage(i - 1));

            const pageLabel = document.createElement('div');
            pageLabel.className = 'page-number-label';
            pageLabel.innerText = `第 ${i} 页`;

            actions.appendChild(rotateLeftBtn);
            actions.appendChild(rotateRightBtn);
            actions.appendChild(deleteBtn);
            actions.appendChild(pageLabel);

            item.appendChild(canvasWrap);
            item.appendChild(actions);
            grid.appendChild(item);
        }

        // 4. 更新 UI
        dropLabel.style.display = 'none';
        dropLabel.innerHTML =
            '点击选择 PDF 文件<span class="hide-on-mobile">（或将文件拖到此处）</span>';

        fileInfoArea.style.display = 'flex';
        fileNameDiv.innerText = `📄 ${file.name} (共 ${pdfTotalPages} 页)`;

        toolbar.style.display = 'flex';
        grid.style.display = 'grid';

        status.innerText = '渲染完成，请直观地调整您的页面';
        btn.disabled = false;
    } catch (e) {
        console.error(e);
        const hint = isPasswordError(e)
            ? '❌ 该 PDF 可能受密码保护，请先解密再试。'
            : '❌ 读取失败，可能是加密文件。点击重试';
        dropLabel.innerHTML = hint;
        editFileObj = null;
        btn.disabled = true;
    }
}

// 单页操作
function rotatePage(idx, deg) {
    pagesState[idx].rotation = normalizePageRotation(pagesState[idx].rotation + deg);
    document.getElementById(`page-canvas-${idx}`).style.transform =
        `rotate(${pagesState[idx].rotation}deg)`;
}

function toggleDeletePage(idx) {
    pagesState[idx].deleted = !pagesState[idx].deleted;
    document.getElementById(`page-mask-${idx}`).style.display = pagesState[idx].deleted
        ? 'flex'
        : 'none';
    document.getElementById(`page-item-${idx}`).style.opacity = pagesState[idx].deleted
        ? '0.6'
        : '1';
}

// 全局操作
function rotateAll(deg) {
    for (let i = 0; i < pdfTotalPages; i++) {
        rotatePage(i, deg);
    }
}

function recoverAll() {
    for (let i = 0; i < pdfTotalPages; i++) {
        if (pagesState[i].deleted) toggleDeletePage(i);
    }
}

// 最终保存
async function runEdit() {
    if (!editFileObj) return;

    // 检查是否全部删除了
    const aliveCount = pagesState.filter((p) => !p.deleted).length;
    if (aliveCount === 0) {
        alert('您已删除了所有页面，无法保存！');
        return;
    }

    const btn = document.getElementById('runEditBtn');
    const status = document.getElementById('editStatusText');

    btn.disabled = true;
    btn.innerText = '处理中...';
    status.innerText = '正在生成最终文档...';

    try {
        const { PDFDocument, degrees } = PDFLib;
        const arrayBuffer = await editFileObj.arrayBuffer();
        const newDoc = await PDFDocument.load(arrayBuffer);

        // 必须从后往前删，否则索引会乱
        for (let i = pdfTotalPages - 1; i >= 0; i--) {
            if (pagesState[i].deleted) {
                newDoc.removePage(i);
            } else {
                const extraRot = pagesState[i].rotation;
                if (extraRot !== 0) {
                    const page = newDoc.getPage(i);
                    const currentAngle = page.getRotation().angle;
                    page.setRotation(degrees(normalizePageRotation(currentAngle + extraRot)));
                }
            }
        }

        const pdfBytes = await newDoc.save();
        const baseName = editFileObj.name.replace(/\.[^/.]+$/, '');
        triggerDownload(pdfBytes, `${baseName}_已调整.pdf`);

        status.innerText = '✅ 修改完成，已下载';
        status.style.color = 'var(--success)';
    } catch (e) {
        console.error(e);
        status.innerText = '❌ 处理失败';
        status.style.color = 'var(--danger)';
    } finally {
        btn.disabled = false;
        btn.innerText = '应用修改并保存';
        editResetTimer = setTimeout(() => {
            status.innerText = '文件已就绪，可继续调整';
            status.style.color = 'var(--text-sub)';
        }, 4000);
    }
}
