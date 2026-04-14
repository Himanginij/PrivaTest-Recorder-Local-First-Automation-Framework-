const fs = require('fs');

function exportToPlaywright(stepsJSON, outputPath) {
    let scriptContent = `const { chromium } = require('playwright');\n\n`;
    scriptContent += `(async () => {\n`;
    scriptContent += `  const browser = await chromium.launch({ headless: false });\n`;
    scriptContent += `  const page = await browser.newPage();\n`;

    stepsJSON.forEach(step => {
        // Transpilation logic mapping JSON to JavaScript strings
        if (step.action === 'navigate') {
            scriptContent += `  await page.goto(${JSON.stringify(step.url)});\n`;
        } else if (step.action === 'click') {
            scriptContent += `  await page.click(${JSON.stringify(step.locator)});\n`;
        } else if (step.action === 'fill') {
            scriptContent += `  await page.fill(${JSON.stringify(step.locator)}, ${JSON.stringify(step.value)});\n`;
        } else if (step.action === 'select') {
            // NEW: Export drop-down selections safely
            scriptContent += `  await page.selectOption(${JSON.stringify(step.locator)}, ${JSON.stringify(step.value)});\n`;
        }
    });

    // Give a little pause at the end so you can see it before it closes
    scriptContent += `  await page.waitForTimeout(3000);\n`;
    scriptContent += `  await browser.close();\n`;
    scriptContent += `})();\n`;

    fs.writeFileSync(outputPath, scriptContent);
    console.log(`Exported Playwright script to ${outputPath}`);
}

module.exports = { exportToPlaywright };