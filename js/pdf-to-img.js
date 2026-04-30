pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';

let pdfFileObj = null;
let cachedPdfDoc = null; // I-9: 缓存 PDF 文档对象
let pdfResetTimer = null;
let pdfLoadToken = 0;
const pdfFileInput = document.getElementById('pdfFileInput');
const pdfResetBtn = document.getElementById('pdfResetBtn');
const runPdfBtn = document.getElementById('runPdfBtn');
const pdfDropDefaultHtml =
    '点击选择 PDF 文件<span class="hide-on-mobile">（或将文件拖到此处）</span>';

pdfFileInput.addEventListener('change', handlePdfFileAdded);
pdfResetBtn.addEventListener('click', resetPdfFile);
runPdfBtn.addEventListener('click', runPdfToImg);

const pdfDropZone = document.getElementById('pdfDropZone');
pdfDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});
pdfDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) loadPdfFile(e.dataTransfer.files[0]);
});

function handlePdfFileAdded(event) {
    if (event.target.files.length > 0) loadPdfFile(event.target.files[0]);
    event.target.value = '';
}

function clearPdfResetTimer() {
    if (pdfResetTimer) {
        clearTimeout(pdfResetTimer);
        pdfResetTimer = null;
    }
}

function schedulePdfStatusReset(loadToken) {
    clearPdfResetTimer();
    pdfResetTimer = setTimeout(() => {
        pdfResetTimer = null;
        if (loadToken !== pdfLoadToken || !pdfFileObj || !cachedPdfDoc) return;

        document.getElementById('pdfStatusText').innerText = '文件已就绪，请配置转换参数';
        document.getElementById('pdfStatusText').style.color = 'var(--text-sub)';
    }, 4000);
}

function destroyCachedPdfDoc() {
    if (cachedPdfDoc) {
        cachedPdfDoc.destroy();
        cachedPdfDoc = null;
    }
}

function clearPdfLoadedState() {
    pdfFileObj = null;
    destroyCachedPdfDoc();
    document.getElementById('pdfDropZone').style.display = 'block';
    document.getElementById('pdfDropZone').innerHTML = pdfDropDefaultHtml;
    document.getElementById('fileInfoArea').style.display = 'none';
    document.getElementById('pdfStatusText').innerText = '未加载文件';
    document.getElementById('pdfStatusText').style.color = 'var(--text-sub)';
    document.getElementById('runPdfBtn').disabled = true;
    document.getElementById('runPdfBtn').innerText = '开始转换并打包';

    const canvas = document.getElementById('renderCanvas');
    canvas.width = 0;
    canvas.height = 0;
}

function resetPdfFile() {
    pdfLoadToken += 1;
    clearPdfResetTimer();
    clearPdfLoadedState();
}

async function loadPdfFile(file) {
    if (!isPdfFile(file)) {
        alert('只能选择 PDF 文件！');
        return;
    }
    pdfLoadToken += 1;
    const loadToken = pdfLoadToken;
    clearPdfResetTimer();
    clearPdfLoadedState();
    pdfFileObj = file;

    const dropLabel = document.getElementById('pdfDropZone');
    const fileInfoArea = document.getElementById('fileInfoArea');
    const fileNameDiv = document.getElementById('pdfFileName');
    const status = document.getElementById('pdfStatusText');
    const btn = document.getElementById('runPdfBtn');

    dropLabel.innerHTML = '正在读取文档...';
    try {
        const arrayBuffer = await file.arrayBuffer();
        if (loadToken !== pdfLoadToken) return;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (loadToken !== pdfLoadToken) {
            pdf.destroy();
            return;
        }
        cachedPdfDoc = pdf; // I-9: 缓存

        dropLabel.style.display = 'none';
        dropLabel.innerHTML = pdfDropDefaultHtml;

        fileInfoArea.style.display = 'flex';
        fileNameDiv.innerText = `📄 ${file.name} (共 ${pdf.numPages} 页)`;

        status.innerText = '文件已就绪，请配置转换参数';
        btn.disabled = false;
    } catch (e) {
        if (loadToken !== pdfLoadToken) return;
        console.error(e);
        const hint = isPasswordError(e)
            ? '❌ 该 PDF 可能受密码保护，请先解密再试。'
            : '❌ 读取失败，可能是加密文件。点击重试';
        clearPdfLoadedState();
        dropLabel.innerHTML = hint;
        status.innerText = '读取失败，请重新选择文件';
        status.style.color = 'var(--danger)';
        btn.disabled = true;
    }
}

async function runPdfToImg() {
    if (!pdfFileObj) return;

    const runToken = pdfLoadToken;
    const btn = document.getElementById('runPdfBtn');
    const status = document.getElementById('pdfStatusText');
    const format = document.getElementById('formatSelect').value;
    const ext = format === 'image/jpeg' ? 'jpg' : 'png';
    const scale = parseFloat(document.getElementById('scaleSelect').value);

    clearPdfResetTimer();
    btn.disabled = true;
    btn.innerText = '转换中...';
    status.innerText = '正在解析 PDF...';

    try {
        // I-9: 复用已缓存的 PDF 文档对象
        const pdf = cachedPdfDoc;
        const totalPages = pdf.numPages;
        const zip = new JSZip();
        const canvas = document.getElementById('renderCanvas');
        const ctx = canvas.getContext('2d');

        const baseName = pdfFileObj.name.replace(/\.[^/.]+$/, '');

        for (let i = 1; i <= totalPages; i++) {
            if (runToken !== pdfLoadToken) return;
            status.innerText = `正在渲染页面 ${i} / ${totalPages}...`;
            const page = await pdf.getPage(i);
            if (runToken !== pdfLoadToken) return;
            const viewport = page.getViewport({ scale: scale });

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Fill white background for JPEG
            if (format === 'image/jpeg') {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
            };
            await page.render(renderContext).promise;
            if (runToken !== pdfLoadToken) return;

            // Convert canvas to blob
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, format, 0.9));
            if (runToken !== pdfLoadToken) return;
            zip.file(`${baseName}_${i}.${ext}`, blob);
        }

        if (runToken !== pdfLoadToken) return;
        status.innerText = '正在打包图片压缩包...';
        const zipContent = await zip.generateAsync({ type: 'blob' });
        if (runToken !== pdfLoadToken) return;
        triggerDownload(zipContent, `${baseName}_图片.zip`, 'application/zip');

        status.innerText = '✅ 转换完成，已下载压缩包';
        status.style.color = 'var(--success)';
    } catch (e) {
        if (runToken !== pdfLoadToken) return;
        console.error(e);
        status.innerText = '❌ 转换失败';
        status.style.color = 'var(--danger)';
    } finally {
        if (runToken !== pdfLoadToken || !pdfFileObj || !cachedPdfDoc) return;
        btn.disabled = false;
        btn.innerText = '开始转换并打包';
        schedulePdfStatusReset(runToken);
    }
}
