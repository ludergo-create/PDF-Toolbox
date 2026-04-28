/* exported generateId, isPdfFile, isImageFile, triggerDownload, createModalFocusManager, bindDropZone, setStatus, showFileLoaded, updateFooterYear */

// ================= 全局基础逻辑 =================

function safeStorageGet(key) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeStorageSet(key, value) {
    try {
        window.localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

function safeSessionGet(key) {
    try {
        return window.sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSessionSet(key, value) {
    try {
        window.sessionStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

function safeSessionRemove(key) {
    try {
        window.sessionStorage.removeItem(key);
    } catch {
        // 忽略隐私模式或存储不可用场景
    }
}

// 初始化主题
function initTheme() {
    const isDark = safeStorageGet('theme') === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        const btn = document.getElementById('themeBtn');
        if (btn) btn.innerText = '切换浅色';
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const btn = document.getElementById('themeBtn');
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        safeStorageSet('theme', 'light');
        if (btn) btn.innerText = '切换深色';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        safeStorageSet('theme', 'dark');
        if (btn) btn.innerText = '切换浅色';
    }
}

function generateId() {
    return Math.random().toString(36).slice(2, 11);
}

function hasFileExtension(fileName, extensions) {
    if (!fileName) return false;
    const lower = fileName.toLowerCase();
    return extensions.some((ext) => lower.endsWith(ext));
}

function isPdfFile(file) {
    if (!file) return false;
    const mime = (file.type || '').toLowerCase();
    return mime === 'application/pdf' || hasFileExtension(file.name, ['.pdf']);
}

function isJpegFile(file) {
    if (!file) return false;
    const mime = (file.type || '').toLowerCase();
    return mime === 'image/jpeg' || hasFileExtension(file.name, ['.jpg', '.jpeg']);
}

function isPngFile(file) {
    if (!file) return false;
    const mime = (file.type || '').toLowerCase();
    return mime === 'image/png' || hasFileExtension(file.name, ['.png']);
}

function isImageFile(file) {
    return isJpegFile(file) || isPngFile(file);
}

function triggerDownload(bytes, filename, mimeType = 'application/pdf') {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ================= 侧边栏动态渲染 (I-1) =================

const NAV_ITEMS = [
    { label: '工具导航', type: 'section' },
    { href: 'index.html', id: 'nav-home', text: '首页' },
    { label: '核心处理', type: 'section' },
    { href: 'merge.html', id: 'nav-merge', text: '合并 PDF' },
    { href: 'split.html', id: 'nav-split', text: '拆分 / 提取' },
    { href: 'edit-pages.html', id: 'nav-edit', text: '旋转与删除' },
    { label: '格式转换', type: 'section' },
    { href: 'pdf-to-img.html', id: 'nav-pdf2img', text: 'PDF 转图片' },
    { href: 'img-to-pdf.html', id: 'nav-img2pdf', text: '图片转 PDF' },
    { label: '安全与保护', type: 'section' },
    { href: 'watermark.html', id: 'nav-watermark', text: 'PDF 加水印' },
    { href: 'privacy.html', id: 'nav-privacy', text: '隐私说明' },
];

function renderSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || sidebar.dataset.rendered) return;
    sidebar.dataset.rendered = 'true';

    // Logo
    const logoLink = document.createElement('a');
    logoLink.href = 'index.html';
    logoLink.className = 'logo-area';
    const logoIcon = document.createElement('div');
    logoIcon.className = 'logo-icon';
    logoIcon.textContent = '◈';
    const logoTitle = document.createElement('div');
    logoTitle.className = 'logo-title';
    logoTitle.textContent = 'PDF 工具箱';
    logoLink.appendChild(logoIcon);
    logoLink.appendChild(logoTitle);
    sidebar.appendChild(logoLink);

    const divider = document.createElement('div');
    divider.className = 'divider';
    sidebar.appendChild(divider);

    let isFirstSection = true;
    NAV_ITEMS.forEach((item) => {
        if (item.type === 'section') {
            const label = document.createElement('div');
            label.className =
                'nav-label hide-on-mobile' + (isFirstSection ? '' : ' nav-label-spaced');
            label.textContent = item.label;
            sidebar.appendChild(label);
            isFirstSection = false;
        } else {
            const link = document.createElement('a');
            link.href = item.href;
            link.className = 'nav-btn';
            link.id = item.id;
            link.textContent = item.text;
            sidebar.appendChild(link);
        }
    });

    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    sidebar.appendChild(spacer);

    const themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle';
    themeBtn.id = 'themeBtn';
    themeBtn.textContent = '切换深色';
    sidebar.appendChild(themeBtn);
}

// ================= 公共辅助函数 (I-7) =================

/** 绑定拖放区域 */
function bindDropZone(elementOrId, options) {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!el) return;
    const { onDrop, accept } = options || {};
    el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    el.addEventListener('drop', (e) => {
        e.preventDefault();
        let files = Array.from(e.dataTransfer.files);
        if (accept) files = files.filter(accept);
        if (files.length > 0 && onDrop) onDrop(files);
    });
}

/** 设置状态消息（可自动恢复） */
function setStatus(elementOrId, text, type, resetMs, resetText) {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!el) return;
    el.innerText = text;
    const colorMap = {
        success: 'var(--success)',
        danger: 'var(--danger)',
        info: 'var(--text-sub)',
        ready: 'var(--text-main)',
    };
    el.style.color = colorMap[type || 'info'] || '';
    if (resetMs > 0 && resetText) {
        setTimeout(() => {
            el.innerText = resetText;
            el.style.color = colorMap.info;
        }, resetMs);
    }
}

/** 切换加载区/信息区显示 */
function showFileLoaded(dropZoneId, fileInfoId, show) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInfo = document.getElementById(fileInfoId);
    if (dropZone) dropZone.style.display = show ? 'none' : 'block';
    if (fileInfo) fileInfo.style.display = show ? 'flex' : 'none';
}

function bindThemeToggleButton() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.addEventListener('click', toggleTheme);
}

function initMobileNav() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || sidebar.querySelector('.mobile-menu-toggle')) return;

    const overlay = document.createElement('div');
    overlay.className = 'mobile-nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mobile-menu-toggle';
    btn.setAttribute('aria-label', '打开工具导航');
    btn.innerText = '☰';

    // 抽屉容器
    const drawer = document.createElement('div');
    drawer.className = 'mobile-drawer';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'mobile-drawer-close';
    closeBtn.setAttribute('aria-label', '关闭工具导航');
    closeBtn.innerText = '×';

    const drawerTitle = document.createElement('div');
    drawerTitle.className = 'mobile-drawer-title';
    drawerTitle.innerText = 'PDF 工具箱';
    drawer.appendChild(closeBtn);
    drawer.appendChild(drawerTitle);

    // 需要移入/移出的元素
    const navBtns = Array.from(sidebar.querySelectorAll('.nav-btn'));
    const themeBtn = sidebar.querySelector('.theme-toggle');
    const spacer = sidebar.querySelector('.spacer');

    sidebar.appendChild(btn);
    document.body.appendChild(drawer);
    document.body.appendChild(overlay);

    let isMobile = false;
    let isDrawerOpen = false;
    let scrollY = 0;
    const navPlaceholders = navBtns.map((navBtn) => {
        const placeholder = document.createComment('nav-btn-placeholder');
        sidebar.insertBefore(placeholder, navBtn);
        return { navBtn, placeholder };
    });
    const themePlaceholder = document.createComment('theme-toggle-placeholder');
    if (themeBtn) sidebar.insertBefore(themePlaceholder, themeBtn);

    function moveToDrawer() {
        navBtns.forEach((b) => drawer.appendChild(b));
        if (themeBtn) drawer.appendChild(themeBtn);
        if (spacer) spacer.style.display = 'none';
    }

    function moveToSidebar() {
        navPlaceholders.forEach(({ navBtn, placeholder }) => {
            sidebar.insertBefore(navBtn, placeholder.nextSibling);
        });
        if (themeBtn) sidebar.insertBefore(themeBtn, themePlaceholder.nextSibling);
        if (spacer) spacer.style.display = '';
    }

    function checkMobile() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    function applyLayout() {
        const shouldBeMobile = checkMobile();
        if (shouldBeMobile && !isMobile) {
            moveToDrawer();
            isMobile = true;
        } else if (!shouldBeMobile && isMobile) {
            setMobileNavOpen(false);
            moveToSidebar();
            isMobile = false;
        }
    }

    function setMobileNavOpen(isOpen) {
        drawer.classList.toggle('open', isOpen);
        overlay.classList.toggle('is-visible', isOpen);
        overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        document.body.classList.toggle('mobile-nav-open', isOpen);

        if (isOpen) {
            if (isDrawerOpen) return;
            scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = -scrollY + 'px';
            document.body.style.width = '100%';
            isDrawerOpen = true;
        } else if (isDrawerOpen) {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, scrollY);
            isDrawerOpen = false;
        }
    }

    function closeDrawer() {
        setMobileNavOpen(false);
    }

    btn.addEventListener('click', () => setMobileNavOpen(true));
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    drawer.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-btn')) closeDrawer();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        closeDrawer();
    });

    // 初始化 + 监听窗口变化
    applyLayout();
    window.addEventListener('resize', applyLayout);
}

const PREFETCHED_URLS = new Set();

function supportsLinkPrefetch() {
    const link = document.createElement('link');
    return !!(link.relList && link.relList.supports && link.relList.supports('prefetch'));
}

function prefetchUrl(url, asType) {
    if (!supportsLinkPrefetch()) return;

    const normalized = url.href.split('#')[0];
    if (PREFETCHED_URLS.has(normalized)) return;
    PREFETCHED_URLS.add(normalized);

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = normalized;
    if (asType) link.as = asType;
    document.head.appendChild(link);
}

function getPrefetchAssetList(pathname) {
    if (pathname.endsWith('/merge.html')) {
        return ['js/merge.js', 'js/vendor/pdf-lib.min.js', 'js/vendor/Sortable.min.js'];
    }
    if (pathname.endsWith('/split.html')) {
        return ['js/split.js', 'js/vendor/pdf-lib.min.js', 'js/vendor/jszip.min.js'];
    }
    if (pathname.endsWith('/edit-pages.html')) {
        return [
            'js/edit-pages.js',
            'js/vendor/pdf.min.js',
            'js/vendor/pdf.worker.min.js',
            'js/vendor/pdf-lib.min.js',
        ];
    }
    if (pathname.endsWith('/pdf-to-img.html')) {
        return [
            'js/pdf-to-img.js',
            'js/vendor/pdf.min.js',
            'js/vendor/pdf.worker.min.js',
            'js/vendor/jszip.min.js',
        ];
    }
    if (pathname.endsWith('/img-to-pdf.html')) {
        return ['js/img-to-pdf.js', 'js/vendor/pdf-lib.min.js', 'js/vendor/Sortable.min.js'];
    }
    if (pathname.endsWith('/watermark.html')) {
        return [
            'js/watermark.js',
            'js/vendor/pdf.min.js',
            'js/vendor/pdf.worker.min.js',
            'js/vendor/pdf-lib.min.js',
        ];
    }
    return [];
}

function prefetchTargetPage(url) {
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname) return;

    prefetchUrl(url, 'document');
    const assets = getPrefetchAssetList(url.pathname);
    assets.forEach((assetPath) => {
        prefetchUrl(new URL(assetPath, window.location.href), 'script');
    });
}

function parsePrefetchCandidate(href) {
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return null;

    try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return null;
        if (!/\.html$/i.test(url.pathname)) return null;
        return url;
    } catch {
        return null;
    }
}

function initNavigationPrefetch() {
    const linkEls = Array.from(document.querySelectorAll('a.nav-btn[href], a.tool-card[href]'));
    if (linkEls.length === 0) return;

    const candidates = [];
    linkEls.forEach((linkEl) => {
        const url = parsePrefetchCandidate(linkEl.getAttribute('href'));
        if (!url) return;
        candidates.push(url);

        const prefetchFromEvent = () => prefetchTargetPage(url);
        linkEl.addEventListener('mouseenter', prefetchFromEvent, { once: true });
        linkEl.addEventListener('touchstart', prefetchFromEvent, { once: true, passive: true });
        linkEl.addEventListener('focus', prefetchFromEvent, { once: true });
    });

    const schedule =
        window.requestIdleCallback ||
        ((cb) =>
            window.setTimeout(() => {
                cb({ didTimeout: false, timeRemaining: () => 0 });
            }, 300));

    schedule(() => {
        const currentPath = window.location.pathname;
        const idleTargets = candidates.filter((url) => url.pathname !== currentPath).slice(0, 2);
        idleTargets.forEach(prefetchTargetPage);
    });
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;

    const refreshKey = 'pdf-toolbox-sw-refreshing';
    if (safeSessionGet(refreshKey) === '1') {
        safeSessionRemove(refreshKey);
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        safeSessionSet(refreshKey, '1');
        window.location.reload();
    });

    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('sw.js', {
                updateViaCache: 'none',
            });
            registration.update().catch(() => {
                // 更新检查失败不影响核心功能
            });
        } catch {
            // 保持静默失败，避免影响核心功能
        }
    });
}

function renderIcpBadge() {
    var config = window.SITE_CONFIG || {};
    var icp = (config.icpNumber || '').trim();
    if (!icp) return;

    var footer = document.querySelector('.footer');
    if (!footer) return;

    var existing = document.getElementById('icp-line');
    if (existing) {
        existing.querySelector('a').textContent = icp;
        return;
    }

    var line = document.createElement('p');
    line.id = 'icp-line';
    line.style.cssText = 'font-size:12px; margin-top:6px;';

    var link = document.createElement('a');
    link.href = 'https://beian.miit.gov.cn/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.cssText = 'text-decoration:none; color:var(--text-dim);';
    link.textContent = icp;

    line.appendChild(link);
    footer.appendChild(line);
}

function getFocusableElements(container) {
    const selector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(container.querySelectorAll(selector)).filter((el) => {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    });
}

function createModalFocusManager(modal, onEscape) {
    let previousFocus = null;

    if (!modal.hasAttribute('tabindex')) {
        modal.setAttribute('tabindex', '-1');
    }

    modal.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onEscape();
            return;
        }

        if (event.key !== 'Tab') return;

        const focusable = getFocusableElements(modal);
        if (focusable.length === 0) {
            event.preventDefault();
            modal.focus({ preventScroll: true });
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus({ preventScroll: true });
        }
    });

    return {
        open() {
            previousFocus = document.activeElement;
            window.requestAnimationFrame(() => {
                const focusable = getFocusableElements(modal);
                const first = focusable[0] || modal;
                first.focus({ preventScroll: true });
            });
        },
        close() {
            if (previousFocus && document.contains(previousFocus)) {
                previousFocus.focus({ preventScroll: true });
            }
            previousFocus = null;
        },
    };
}

/** 动态更新 footer 中的版权年份 */
function updateFooterYear() {
    const footer = document.querySelector('.footer');
    if (!footer) return;
    const year = new Date().getFullYear();
    footer.innerHTML = footer.innerHTML.replace(/© \d{4}/, `© ${year}`);
}

// 页面加载完成后初始化主题
document.addEventListener('DOMContentLoaded', () => {
    renderSidebar();
    initTheme();
    bindThemeToggleButton();
    initMobileNav();
    initNavigationPrefetch();
    updateFooterYear();
    renderIcpBadge();
});

registerServiceWorker();
