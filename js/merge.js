const mergeFilesMap = new Map();
let mergeResetTimer = null;
let mergeListVersion = 0;
const sortableListEl = document.getElementById('sortableList');
const addFilesInput = document.getElementById('addFilesInput');
const clearMergeBtn = document.getElementById('clearMergeBtn');
const runMergeBtn = document.getElementById('runMergeBtn');

addFilesInput.addEventListener('change', handleMergeFilesAdded);
clearMergeBtn.addEventListener('click', clearMergeList);
runMergeBtn.addEventListener('click', runMerge);

new Sortable(sortableListEl, {
    animation: 150,
    onEnd: () => {
        markMergeListChanged();
        updateMergeListStatus();
    },
});

function handleMergeFilesAdded(event) {
    addFilesToMergeList(event.target.files);
    event.target.value = '';
}

function clearMergeResetTimer() {
    if (mergeResetTimer) {
        clearTimeout(mergeResetTimer);
        mergeResetTimer = null;
    }
}

function markMergeListChanged() {
    mergeListVersion += 1;
    clearMergeResetTimer();
}

function scheduleMergeStatusReset(listVersion) {
    clearMergeResetTimer();
    mergeResetTimer = setTimeout(() => {
        mergeResetTimer = null;
        if (listVersion !== mergeListVersion) return;
        updateMergeListStatus();
    }, 4000);
}

function addFilesToMergeList(files) {
    let addedCount = 0;
    for (const file of files) {
        if (!isPdfFile(file)) continue;
        const id = generateId();
        mergeFilesMap.set(id, file);
        const li = document.createElement('li');
        li.className = 'file-item';
        li.setAttribute('data-id', id);

        const fileNameEl = document.createElement('span');
        fileNameEl.textContent = `📄 ${file.name}`;

        const removeIconEl = document.createElement('span');
        removeIconEl.className = 'remove-icon';
        removeIconEl.title = '删除';
        removeIconEl.textContent = '✖';
        removeIconEl.addEventListener('click', () => removeMergeFile(id, removeIconEl));

        li.appendChild(fileNameEl);
        li.appendChild(removeIconEl);
        sortableListEl.appendChild(li);
        addedCount += 1;
    }
    if (addedCount > 0) markMergeListChanged();
    updateMergeListStatus();
}

function removeMergeFile(id, el) {
    mergeFilesMap.delete(id);
    el.parentElement.remove();
    markMergeListChanged();
    updateMergeListStatus();
}
function clearMergeList() {
    mergeFilesMap.clear();
    sortableListEl.innerHTML = '';
    markMergeListChanged();
    updateMergeListStatus();
}

function updateMergeListStatus() {
    const count = mergeFilesMap.size;
    document.getElementById('mergeFileCount').innerText = `共 ${count} 个文件`;
    document.getElementById('mergeEmptyTip').style.display = count > 0 ? 'none' : 'block';

    const statusText = document.getElementById('mergeStatusText');
    const btn = document.getElementById('runMergeBtn');
    if (count < 2) {
        statusText.innerText = '请选择至少 2 个 PDF 文件';
        statusText.style.color = 'var(--text-sub)';
        btn.disabled = true;
    } else {
        statusText.innerText = `已准备 ${count} 个文件，可以开始合并`;
        statusText.style.color = 'var(--text-main)';
        btn.disabled = false;
    }
}

const mergeDropZone = document.getElementById('mergeDropZone');
mergeDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});
mergeDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    addFilesToMergeList(e.dataTransfer.files);
});

mergeDropZone.style.cursor = 'pointer';
mergeDropZone.addEventListener('click', (e) => {
    if (e.target.closest('.file-item')) return;
    document.getElementById('addFilesInput').click();
});

async function runMerge() {
    const orderedItems = document.querySelectorAll('#sortableList .file-item');
    if (orderedItems.length < 2) {
        alert('请至少添加 2 个 PDF 文件！');
        return;
    }

    const runListVersion = mergeListVersion;
    const btn = document.getElementById('runMergeBtn');
    const status = document.getElementById('mergeStatusText');
    clearMergeResetTimer();
    btn.disabled = true;
    btn.innerText = '处理中...';
    status.innerText = '正在拼接文档，请稍候...';

    try {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < orderedItems.length; i++) {
            if (runListVersion !== mergeListVersion) return;
            const item = orderedItems[i];
            status.innerText = `正在合并第 ${i + 1} / ${orderedItems.length} 个文件...`;
            const file = mergeFilesMap.get(item.getAttribute('data-id'));
            if (!file) return;
            const arrayBuffer = await file.arrayBuffer();
            if (runListVersion !== mergeListVersion) return;
            const pdf = await PDFDocument.load(arrayBuffer);
            if (runListVersion !== mergeListVersion) return;
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            if (runListVersion !== mergeListVersion) return;
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        if (runListVersion !== mergeListVersion) return;
        status.innerText = '正在生成最终文件...';
        const pdfBytes = await mergedPdf.save();
        if (runListVersion !== mergeListVersion) return;
        const firstOrderedFile = mergeFilesMap.get(orderedItems[0].getAttribute('data-id'));
        if (!firstOrderedFile) return;
        const baseName = firstOrderedFile.name.replace(/\.pdf$/i, '');
        triggerDownload(pdfBytes, `${baseName}_合并.pdf`);

        status.innerText = '✅ 下载合并后的 PDF';
        status.style.color = 'var(--success)';
    } catch (e) {
        if (runListVersion !== mergeListVersion) return;
        console.error(e);
        status.innerText = isPasswordError(e)
            ? '❌ 合并失败：某个 PDF 可能受密码保护，请先解密再试。'
            : '❌ 合并失败，可能由于加密或格式不受支持。';
        status.style.color = 'var(--danger)';
    } finally {
        if (runListVersion !== mergeListVersion) return;
        btn.disabled = false;
        btn.innerText = '开始合并';
        scheduleMergeStatusReset(runListVersion);
    }
}
