const fs = require('fs');
const path = require('path');
const { ESLint } = require('eslint');

const projectRoot = path.resolve(__dirname, '..');
const inlineScriptPattern = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;

function getHtmlFiles() {
    return fs
        .readdirSync(projectRoot)
        .filter((name) => name.endsWith('.html'))
        .map((name) => path.join(projectRoot, name));
}

function getLineNumber(content, index) {
    let line = 1;
    for (let i = 0; i < index; i += 1) {
        if (content.charCodeAt(i) === 10) line += 1;
    }
    return line;
}

async function lintInlineScripts() {
    const eslint = new ESLint({
        cwd: projectRoot,
        overrideConfigFile: path.join(projectRoot, 'eslint.config.cjs'),
    });
    const allResults = [];
    const htmlFiles = getHtmlFiles();

    for (const filePath of htmlFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        let match = null;
        let scriptIdx = 0;
        inlineScriptPattern.lastIndex = 0;

        while ((match = inlineScriptPattern.exec(content)) !== null) {
            scriptIdx += 1;
            const scriptCode = match[1] || '';
            if (!scriptCode.trim()) continue;

            const startLine = getLineNumber(content, match.index);
            const paddedCode = `${'\n'.repeat(Math.max(0, startLine - 1))}${scriptCode}`;
            const virtualPath = path.join(
                projectRoot,
                'js',
                '__inline__',
                `${path.basename(filePath)}.inline-${scriptIdx}.js`
            );
            const results = await eslint.lintText(paddedCode, { filePath: virtualPath });
            allResults.push(...results);
        }
    }

    if (allResults.length === 0) {
        console.log('No inline scripts found.');
        return 0;
    }

    const formatter = await eslint.loadFormatter('stylish');
    const output = formatter.format(allResults);
    if (output) console.log(output);

    return allResults.reduce((sum, result) => sum + result.errorCount, 0);
}

lintInlineScripts()
    .then((errorCount) => {
        if (errorCount > 0) process.exitCode = 1;
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
