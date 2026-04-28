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

    // 抽屉背景遮罩
    const overlay = document.createElement('div');
    overlay.className = 'mobile-nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    // 汉堡按钮
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mobile-menu-toggle';
    btn.setAttribute('aria-label', '打开工具导航');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerText = '☰';

    // 抽屉容器（动画只作用于这一个元素）
    const drawer = document.createElement('div');
    drawer.className = 'mobile-drawer';
    drawer.innerHTML = '<div class="mobile-drawer-title">PDF 工具箱</div>';

    // 把 nav-btn 和 theme-toggle 移入抽屉
    const navBtns = sidebar.querySelectorAll('.nav-btn');
    const themeBtn = sidebar.querySelector('.theme-toggle');
    navBtns.forEach(b => drawer.appendChild(b));
    if (themeBtn) drawer.appendChild(themeBtn);

    sidebar.appendChild(btn);
    document.body.appendChild(drawer);
    document.body.appendChild(overlay);

    let scrollY = 0;

    function setMobileNavOpen(isOpen) {
        drawer.classList.toggle('open', isOpen);
        overlay.classList.toggle('is-visible', isOpen);
        document.body.classList.toggle('mobile-nav-open', isOpen);
        btn.classList.toggle('active', isOpen);
        btn.setAttribute('aria-expanded', String(isOpen));
        btn.innerText = isOpen ? '×' : '☰';
        btn.setAttribute('aria-label', isOpen ? '关闭工具导航' : '打开工具导航');

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

    btn.addEventListener('click', () => {
        setMobileNavOpen(!drawer.classList.contains('open'));
    });

    overlay.addEventListener('click', () => setMobileNavOpen(false));

    drawer.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', () => setMobileNavOpen(false));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        setMobileNavOpen(false);
    });
}

// 页面加载完成后初始化主题
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileNav();
});
