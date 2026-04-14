const fs = require('fs');

// DDT Parser: Read test data from a CSV file MANUALLY to avoid hidden character bugs
async function runDataDrivenTests(page, stepsJSON, csvFilePath) {
    
    // 1. Read the raw file
    let rawCSV = fs.readFileSync(csvFilePath, 'utf8');
    
    // 2. Forcefully remove Windows hidden BOM characters
    if (rawCSV.charCodeAt(0) === 0xFEFF) {
        rawCSV = rawCSV.slice(1);
    }

    // 3. Split the file into lines and remove empty lines
    const lines = rawCSV.split(/\r?\n/).filter(line => line.trim() !== '');
    
    // 4. Extract the headers and SCRUB rogue quotation marks
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    // 5. Extract the data rows and SCRUB rogue quotation marks
    const dataRows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const rowObject = {};
        headers.forEach((header, index) => {
            rowObject[header] = values[index];
        });
        dataRows.push(rowObject);
    }

    // Loop test execution using parsed CSV data
    for (let i = 0; i < dataRows.length; i++) {
        const rowData = dataRows[i];
        console.log(`\n--- Running Iteration ${i + 1} ---`);
        
        const sessionLog = [];

        for (let step of stepsJSON) {
            // Substitute ${variable} placeholders with actual CSV data
            let finalValue = step.value;
            if (finalValue && typeof finalValue === 'string') {
                finalValue = finalValue.replace(/\${(.*?)}/g, (match, varName) => {
                    return rowData[varName] !== undefined ? rowData[varName] : match;
                });
            }

            // Execute the step (WITH SMART WAITING)
            try {
                console.log(`Executing step: ${step.action} ... (Value: ${finalValue || 'N/A'})`);
                
                if (step.action === 'navigate') {
                    await page.goto(step.url);
                    // Wait for the page to completely finish loading
                    await page.waitForLoadState('networkidle').catch(() => {});
                } else if (step.action === 'click') {
                    await page.click(step.locator);
                    // THE FIX: Wait for the website's server to process the click
                    await page.waitForLoadState('networkidle').catch(() => {});
                    // Give the browser an extra 1.5 seconds to visually "paint" the green/red banners
                    await page.waitForTimeout(1500); 
                } else if (step.action === 'fill') {
                    await page.fill(step.locator, finalValue); 
                    await page.waitForTimeout(500); // Tiny pause just to see the typing
                } else if (step.action === 'select') {
                    // THE FIX: Adding support for playing back drop-downs
                    await page.selectOption(step.locator, finalValue);
                    await page.waitForTimeout(500);
                }

                // Visual Logs: Capture page.screenshot() AFTER the page has settled
                const screenshotBuffer = await page.screenshot();
                const base64Image = screenshotBuffer.toString('base64');
                
                sessionLog.push({
                    step: { ...step, value: finalValue }, // Save actual typed value
                    screenshot: `data:image/png;base64,${base64Image}`
                });

            } catch (error) {
                console.warn(`Step failed: ${error.message}`);
            }
        }
        
        // HTML Report Compiler
        generateHTMLReport(sessionLog, `report_iteration_${i + 1}.html`);
    }
}

function generateHTMLReport(sessionLog, filename) {
    let htmlContent = `<html><body style="font-family: Arial, sans-serif;"><h1>Test Execution Report</h1><ul>`;
    sessionLog.forEach(log => {
        htmlContent += `<li style="margin-bottom: 20px;">
            <b>Action:</b> ${log.step.action} <br>
            <b>Locator:</b> ${log.step.locator || log.step.url} <br>
            <b>Value:</b> ${log.step.value || 'N/A'} <br><br>
            <img src="${log.screenshot}" width="500" style="border: 1px solid #ccc; box-shadow: 2px 2px 5px rgba(0,0,0,0.1);" />
        </li><hr>`;
    });
    htmlContent += `</ul></body></html>`;
    
    fs.writeFileSync(filename, htmlContent);
    console.log(`Report saved to ${filename}`);
}

module.exports = { runDataDrivenTests };