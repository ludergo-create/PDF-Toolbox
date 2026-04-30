const imgsMap = new Map();
let imgResetTimer = null;
let imgListVersion = 0;
const sortableListEl = document.getElementById('sortableImgList');
const addImgsInput = document.getElementById('addImgsInput');
const clearImgBtn = document.getElementById('clearImgBtn');
const runImg2PdfBtn = document.getElementById('runImg2PdfBtn');

addImgsInput.addEventListener('change', handleImgsAdded);
clearImgBtn.addEventListener('click', clearImgList);
runImg2PdfBtn.addEventListener('click', runImgToPdf);

new Sortable(sortableListEl, {
    animation: 150,
    onEnd: () => {
        markImgListChanged();
        updateImgListStatus();
    },
});

function handleImgsAdded(event) {
    addImgsToList(event.target.files);
    event.target.value = '';
}

function clearImgResetTimer() {
    if (imgResetTimer) {
        clearTimeout(imgResetTimer);
        imgResetTimer = null;
    }
}

function markImgListChanged() {
    imgListVersion += 1;
    clearImgResetTimer();
}

function scheduleImgStatusReset(listVersion) {
    clearImgResetTimer();
    imgResetTimer = setTimeout(() => {
        imgResetTimer = null;
        if (listVersion !== imgListVersion) return;
        updateImgListStatus();
    }, 4000);
}

async function addImgsToList(files) {
    let addedCount = 0;
    for (const file of files) {
        if (!isImageFile(file)) continue;
        const id = generateId();
        imgsMap.set(id, file);

        const url = URL.createObjectURL(file);
        const li = document.createElement('li');
        li.className = 'file-item';
        li.setAttribute('data-id', id);

        const contentEl = document.createElement('div');
        contentEl.className = 'file-item-content';

        const previewImgEl = document.createElement('img');
        previewImgEl.className = 'img-preview';
        previewImgEl.src = url;
        previewImgEl.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
        previewImgEl.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });

        const fileNameEl = document.createElement('span');
        fileNameEl.textContent = file.name;
        contentEl.appendChild(previewImgEl);
        contentEl.appendChild(fileNameEl);

        const removeIconEl = document.createElement('span');
        removeIconEl.className = 'remove-icon';
        removeIconEl.title = '删除';
        removeIconEl.textContent = '✖';
        removeIconEl.addEventListener('click', () => removeImg(id, removeIconEl));

        li.appendChild(contentEl);
        li.appendChild(removeIconEl);
        sortableListEl.appendChild(li);
        addedCount += 1;
    }
    if (addedCount > 0) markImgListChanged();
    updateImgListStatus();
}

function removeImg(id, el) {
    imgsMap.delete(id);
    el.parentElement.remove();
    markImgListChanged();
    updateImgListStatus();
}

function clearImgList() {
    imgsMap.clear();
    sortableListEl.innerHTML = '';
    markImgListChanged();
    updateImgListStatus();
}

function updateImgListStatus() {
    const count = imgsMap.size;
    document.getElementById('imgCount').innerText = `共 ${count} 张图片`;
    document.getElementById('imgEmptyTip').style.display = count > 0 ? 'none' : 'block';
    const statusText = document.getElementById('imgStatusText');
    const btn = document.getElementById('runImg2PdfBtn');
    if (count < 1) {
        statusText.innerText = '请选择至少 1 张图片';
        statusText.style.color = 'var(--text-sub)';
        btn.disabled = true;
    } else {
        statusText.innerText = `已准备 ${count} 张图片，可以开始生成`;
        statusText.style.color = 'var(--text-main)';
        btn.disabled = false;
    }
}

const dropZone = document.getElementById('imgDropZone');
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    addImgsToList(e.dataTransfer.files);
});

async function runImgToPdf() {
    const orderedItems = document.querySelectorAll('#sortableImgList .file-item');
    if (orderedItems.length < 1) {
        alert('请选择至少 1 张图片！');
        return;
    }
    const runListVersion = imgListVersion;
    const btn = document.getElementById('runImg2PdfBtn');
    const status = document.getElementById('imgStatusText');
    clearImgResetTimer();
    btn.disabled = true;
    btn.innerText = '处理中...';
    status.innerText = '正在生成 PDF，请稍候...';
    try {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        for (let i = 0; i < orderedItems.length; i++) {
            if (runListVersion !== imgListVersion) return;
            const item = orderedItems[i];
            status.innerText = `正在处理第 ${i + 1} / ${orderedItems.length} 张图片...`;
            const file = imgsMap.get(item.getAttribute('data-id'));
            if (!file) return;
            const arrayBuffer = await file.arrayBuffer();
            if (runListVersion !== imgListVersion) return;
            let image;
            if (isJpegFile(file)) {
                image = await pdfDoc.embedJpg(arrayBuffer);
            } else if (isPngFile(file)) {
                image = await pdfDoc.embedPng(arrayBuffer);
            } else {
                continue;
            }
            const dims = image.scale(1);
            const page = pdfDoc.addPage([dims.width, dims.height]);
            page.drawImage(image, { x: 0, y: 0, width: dims.width, height: dims.height });
        }
        if (runListVersion !== imgListVersion) return;
        status.innerText = '正在保存最终文件...';
        const pdfBytes = await pdfDoc.save();
        if (runListVersion !== imgListVersion) return;
        triggerDownload(pdfBytes, `图片合成.pdf`);
        status.innerText = '✅ 生成完成，已下载';
        status.style.color = 'var(--success)';
    } catch (e) {
        if (runListVersion !== imgListVersion) return;
        console.error(e);
        status.innerText = '❌ 生成失败，图片可能损坏。';
        status.style.color = 'var(--danger)';
    } finally {
        if (runListVersion !== imgListVersion) return;
        btn.disabled = false;
        btn.innerText = '合并为 PDF';
        scheduleImgStatusReset(runListVersion);
    }
}
