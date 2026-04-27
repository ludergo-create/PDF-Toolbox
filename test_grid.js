const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const html = `
    <style>
    .pdf-page-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); align-content: start; grid-auto-rows: max-content; gap: 16px; margin-top: 16px; padding: 16px; max-height: 55vh; overflow-y: auto;}
    .pdf-page-item { position: relative; border: 1px solid red; display: flex; flex-direction: column; align-items: center; padding: 8px;}
    .pdf-page-canvas-wrapper { position: relative; width: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; border: 1px solid blue; flex-shrink: 0; min-height: 50px; }
    .pdf-page-canvas { width: 100%; height: auto; display: block; }
    </style>
    <div class='pdf-page-grid'>
        ${Array.from({length: 50}).map(() => `
        <div class='pdf-page-item'>
            <div class='pdf-page-canvas-wrapper'>
                <canvas class='pdf-page-canvas' width='500' height='700'></canvas>
            </div>
        </div>`).join('')}
    </div>
    `;
    await page.setContent(html);
    const size = await page.evaluate(() => {
        const item = document.querySelector('.pdf-page-canvas');
        return { w: item.clientWidth, h: item.clientHeight };
    });
    console.log('Canvas size in flex shrink 0:', size);
    await browser.close();
})();
