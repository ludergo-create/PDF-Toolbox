/* exported toggleLayout */

/**
 * 首页卡片布局切换（单列 ↔ 双列）
 * 用户偏好通过 localStorage 持久化，
 * 键名为 'homeLayout'，值为 'compact' 或 'full'。
 */
function toggleLayout() {
    const grid = document.getElementById('homeGrid');
    const btn = document.getElementById('layoutToggle');
    const compact = grid.classList.toggle('compact');
    btn.innerHTML = compact ? '☰ 单列' : '☷ 双列';
    if (typeof safeStorageSet === 'function') {
        safeStorageSet('homeLayout', compact ? 'compact' : 'full');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('layoutToggle').addEventListener('click', toggleLayout);

    /** 恢复上次用户选择的布局偏好 */
    const homeLayout = typeof safeStorageGet === 'function' ? safeStorageGet('homeLayout') : null;
    if (homeLayout === 'compact') {
        document.getElementById('homeGrid').classList.add('compact');
        document.getElementById('layoutToggle').innerHTML = '☰ 单列';
    }
});
