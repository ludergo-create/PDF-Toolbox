// ================= 全局基础逻辑 =================

// 初始化主题
function initTheme() {
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        const btn = document.getElementById('themeBtn');
        if (btn) btn.innerText = "切换浅色";
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const btn = document.getElementById('themeBtn');
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        if (btn) btn.innerText = "切换深色";
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (btn) btn.innerText = "切换浅色";
    }
}

function generateId() { return Math.random().toString(36).substr(2, 9); }

function triggerDownload(bytes, filename, mimeType = 'application/pdf') {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    drawer.innerHTML = '<button class="mobile-drawer-close" aria-label="关闭工具导航">×</button><div class="mobile-drawer-title">PDF 工具箱</div>';

    const closeBtn = drawer.querySelector('.mobile-drawer-close');

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
        navBtns.forEach(b => drawer.appendChild(b));
        if (themeBtn) drawer.appendChild(themeBtn);
        if (spacer) spacer.style.display = 'none';
    }

    function moveToSidebar() {
        navBtns.forEach(b => sidebar.insertBefore(b, btn));
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
            moveToSidebar();
            isMobile = false;
        }
    }

    function setMobileNavOpen(isOpen) {
        drawer.classList.toggle('open', isOpen);
        overlay.classList.toggle('is-visible', isOpen);
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

    function closeDrawer() { setMobileNavOpen(false); }

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

// 页面加载完成后初始化主题
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileNav();
});
