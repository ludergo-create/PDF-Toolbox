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
    return Math.random().toString(36).substr(2, 9);
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

function showPrivacyNotice() {
    alert('该工具纯前端本地处理，您的文件不会上传至任何服务器。');
}

function bindThemeToggleButton() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.addEventListener('click', toggleTheme);
}

function bindPrivacyNoticeLinks() {
    const links = document.querySelectorAll('.privacy-link');
    links.forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            showPrivacyNotice();
        });
    });
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
    let scrollY = 0;

    function moveToDrawer() {
        navBtns.forEach((b) => drawer.appendChild(b));
        if (themeBtn) drawer.appendChild(themeBtn);
        if (spacer) spacer.style.display = 'none';
    }

    function moveToSidebar() {
        navBtns.forEach((b) => sidebar.insertBefore(b, btn));
        if (themeBtn) sidebar.insertBefore(themeBtn, btn);
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
            scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = -scrollY + 'px';
            document.body.style.width = '100%';
        } else {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, scrollY);
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
        return ['js/vendor/pdf-lib.min.js', 'js/vendor/Sortable.min.js'];
    }
    if (pathname.endsWith('/split.html')) {
        return ['js/vendor/pdf-lib.min.js', 'js/vendor/jszip.min.js'];
    }
    if (pathname.endsWith('/edit-pages.html')) {
        return ['js/vendor/pdf.min.js', 'js/vendor/pdf.worker.min.js', 'js/vendor/pdf-lib.min.js'];
    }
    if (pathname.endsWith('/pdf-to-img.html')) {
        return ['js/vendor/pdf.min.js', 'js/vendor/pdf.worker.min.js', 'js/vendor/jszip.min.js'];
    }
    if (pathname.endsWith('/img-to-pdf.html')) {
        return ['js/vendor/pdf-lib.min.js', 'js/vendor/Sortable.min.js'];
    }
    if (pathname.endsWith('/watermark.html')) {
        return ['js/vendor/pdf.min.js', 'js/vendor/pdf.worker.min.js', 'js/vendor/pdf-lib.min.js'];
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

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {
            // 保持静默失败，避免影响核心功能
        });
    });
}

function renderIcpBadge() {
    var config = window.SITE_CONFIG || {};
    var icp = (config.icpNumber || '').trim();
    if (!icp) return;

    var footer = document.querySelector('.footer');
    if (!footer) return;

    var line = document.createElement('p');
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

// 页面加载完成后初始化主题
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    bindThemeToggleButton();
    initMobileNav();
    bindPrivacyNoticeLinks();
    initNavigationPrefetch();
    renderIcpBadge();
});

registerServiceWorker();
