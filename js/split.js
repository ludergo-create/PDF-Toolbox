let splitFileObj = null;
let splitPdfDoc = null;
let splitTotalPages = 0;
let splitResetTimer = null;
let splitLoadToken = 0;
const splitFileInput = document.getElementById('splitFileInput');
const splitResetBtn = document.getElementById('splitResetBtn');
const runSplitBtn = document.getElementById('runSplitBtn');
const splitDropDefaultHtml =
    '点击选择 PDF 文件<span class="hide-on-mobile">（或将文件拖到此处）</span>';

splitFileInput.addEventListener('change', handleSplitFileAdded);
splitResetBtn.addEventListener('click', resetSplitFile);
runSplitBtn.addEventListener('click', runSplit);
document.querySelectorAll('input[name="splitMode"]').forEach((radio) => {
    radio.addEventListener('change', updateSplitModeUI);
});

function updateSplitModeUI() {
    const mode = document.querySelector('input[name="splitMode"]:checked').value;
    document.getElementById('rangeStart').disabled = mode !== 'range';
    document.getElementById('rangeEnd').disabled = mode !== 'range';
    document.getElementById('groupInput').disabled = mode !== 'group';
}

function parsePageNumber(value, label) {
    const text = String(value).trim();
    if (!/^\d+$/.test(text)) {
        throw new Error(`${label}必须是纯数字页码。`);
    }

    const pageNumber = Number.parseInt(text, 10);
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > splitTotalPages) {
        throw new Error(`${label}必须在 1 - ${splitTotalPages} 之间。`);
    }

    return pageNumber;
}

function parseGroupPart(part) {
    if (/^\d+$/.test(part)) {
        const pageNumber = parsePageNumber(part, `分组页码 "${part}"`);
        return [pageNumber - 1];
    }

    if (/^\d+-\d+$/.test(part)) {
        const [startText, endText] = part.split('-');
        const start = parsePageNumber(startText, `分组 "${part}" 的起始页码`);
        const end = parsePageNumber(endText, `分组 "${part}" 的结束页码`);
        if (start > end) {
            throw new Error(`分组范围有误: "${part}"，起始页不能大于结束页。`);
        }

        const pages = [];
        for (let i = start; i <= end; i += 1) pages.push(i - 1);
        return pages;
    }

    throw new Error(`分组格式有误: "${part}"。请输入类似：1, 3, 5-8`);
}

const splitDropZone = document.getElementById('splitDropZone');
splitDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});
splitDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) loadSplitFile(e.dataTransfer.files[0]);
});

function handleSplitFileAdded(event) {
    if (event.target.files.length > 0) loadSplitFile(event.target.files[0]);
    event.target.value = '';
}

function clearSplitResetTimer() {
    if (splitResetTimer) {
        clearTimeout(splitResetTimer);
        splitResetTimer = null;
    }
}

function scheduleSplitStatusReset(loadToken) {
    clearSplitResetTimer();
    splitResetTimer = setTimeout(() => {
        splitResetTimer = null;
        if (loadToken !== splitLoadToken || !splitFileObj || !splitPdfDoc) return;

        document.getElementById('splitStatusText').innerText = '文件已就绪，请选择拆分模式';
        document.getElementById('splitStatusText').style.color = 'var(--text-sub)';
    }, 4000);
}

function clearSplitLoadedState() {
    splitFileObj = null;
    splitPdfDoc = null;
    splitTotalPages = 0;
    document.getElementById('splitDropZone').style.display = 'block';
    document.getElementById('splitDropZone').innerHTML = splitDropDefaultHtml;
    document.getElementById('fileInfoArea').style.display = 'none';
    document.getElementById('splitStatusText').innerText = '未加载文件';
    document.getElementById('splitStatusText').style.color = 'var(--text-sub)';
    document.getElementById('runSplitBtn').disabled = true;
    document.getElementById('runSplitBtn').innerText = '执行拆分';
}

function resetSplitFile() {
    splitLoadToken += 1;
    clearSplitResetTimer();
    clearSplitLoadedState();
}

async function loadSplitFile(file) {
    if (!isPdfFile(file)) {
        alert('只能选择 PDF 文件！');
        return;
    }
    splitLoadToken += 1;
    const loadToken = splitLoadToken;
    clearSplitResetTimer();
    clearSplitLoadedState();
    splitFileObj = file;

    const dropLabel = document.getElementById('splitDropZone');
    const fileInfoArea = document.getElementById('fileInfoArea');
    const fileNameDiv = document.getElementById('splitFileName');
    const status = document.getElementById('splitStatusText');
    const btn = document.getElementById('runSplitBtn');

    dropLabel.innerHTML = '正在读取文档...';
    try {
        const arrayBuffer = await file.arrayBuffer();
        if (loadToken !== splitLoadToken) return;
        const { PDFDocument } = PDFLib;
        splitPdfDoc = await PDFDocument.load(arrayBuffer);
        if (loadToken !== splitLoadToken) return;
        splitTotalPages = splitPdfDoc.getPageCount();

        dropLabel.style.display = 'none';
        dropLabel.innerHTML = splitDropDefaultHtml;

        fileInfoArea.style.display = 'flex';
        fileNameDiv.innerText = `📄 ${file.name} (共 ${splitTotalPages} 页)`;

        status.innerText = '文件已就绪，请选择拆分模式';
        btn.disabled = false;
    } catch (e) {
        if (loadToken !== splitLoadToken) return;
        console.error(e);
        clearSplitLoadedState();
        dropLabel.innerHTML = '❌ 读取失败，可能是加密文件。点击重试';
        status.innerText = '读取失败，请重新选择文件';
        status.style.color = 'var(--danger)';
        btn.disabled = true;
    }
}

async function runSplit() {
    if (!splitFileObj || !splitPdfDoc) {
        alert('请先选择一个 PDF 文件！');
        return;
    }

    const runToken = splitLoadToken;
    const mode = document.querySelector('input[name="splitMode"]:checked').value;
    const exportTasks = [];

    try {
        if (mode === 'all') {
            for (let i = 0; i < splitTotalPages; i++) {
                exportTasks.push({ suffix: `${i + 1}`, pages: [i] });
            }
        } else if (mode === 'range') {
            const start = parsePageNumber(document.getElementById('rangeStart').value, '起始页码');
            const end = parsePageNumber(document.getElementById('rangeEnd').value, '结束页码');
            if (start > end) {
                throw new Error('范围无效，起始页不能大于结束页。');
            }
            const pagesArr = [];
            for (let i = start; i <= end; i += 1) pagesArr.push(i - 1);
            exportTasks.push({ suffix: `${start}-${end}`, pages: pagesArr });
        } else if (mode === 'group') {
            const txt = document.getElementById('groupInput').value;
            const parts = txt.replace(/，/g, ',').split(',');
            for (const rawPart of parts) {
                const part = rawPart.trim();
                if (!part) {
                    throw new Error('分组格式有误：存在空分组。请输入类似：1, 3, 5-8');
                }
                exportTasks.push({ suffix: part, pages: parseGroupPart(part) });
            }
            if (exportTasks.length === 0)
                throw new Error('请填写有效的分组规则！格式如：1, 3, 5-8');
        }
    } catch (e) {
        alert(e.message);
        return;
    }

    const btn = document.getElementById('runSplitBtn');
    const status = document.getElementById('splitStatusText');
    clearSplitResetTimer();
    btn.disabled = true;
    btn.innerText = '处理中...';
    status.innerText = '正在切分并打包...';

    try {
        const { PDFDocument } = PDFLib;
        const baseName = splitFileObj.name.replace(/\.[^/.]+$/, '');
        const zip = new JSZip();

        for (let i = 0; i < exportTasks.length; i++) {
            if (runToken !== splitLoadToken) return;
            const task = exportTasks[i];
            status.innerText = `正在处理第 ${i + 1} / ${exportTasks.length} 个文件...`;

            const newDoc = await PDFDocument.create();
            if (runToken !== splitLoadToken) return;
            const copiedPages = await newDoc.copyPages(splitPdfDoc, task.pages);
            if (runToken !== splitLoadToken) return;
            copiedPages.forEach((p) => newDoc.addPage(p));

            const bytes = await newDoc.save();
            if (runToken !== splitLoadToken) return;
            const fileName = `${baseName}_${task.suffix}.pdf`;

            if (exportTasks.length === 1) {
                triggerDownload(bytes, fileName);
            } else {
                zip.file(fileName, bytes);
            }
        }

        if (exportTasks.length > 1) {
            if (runToken !== splitLoadToken) return;
            status.innerText = '正在生成 ZIP 压缩包...';
            const zipContent = await zip.generateAsync({ type: 'blob' });
            if (runToken !== splitLoadToken) return;
            triggerDownload(zipContent, `${baseName}_拆分包.zip`, 'application/zip');
        }

        status.innerText = '✅ 拆分完成，已下载';
        status.style.color = 'var(--success)';
    } catch (e) {
        if (runToken !== splitLoadToken) return;
        console.error(e);
        status.innerText = '❌ 处理失败';
        status.style.color = 'var(--danger)';
    } finally {
        if (runToken !== splitLoadToken || !splitFileObj || !splitPdfDoc) return;
        btn.disabled = false;
        btn.innerText = '执行拆分';
        scheduleSplitStatusReset(runToken);
    }
}
