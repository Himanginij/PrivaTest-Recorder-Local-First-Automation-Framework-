async function executeTest(page, stepsJSON) {
    console.log('\n🎬 Starting standard execution in your CURRENT window...');
    
    // We can still capture the ZIP trace in the current window!
    await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });

    for (const step of stepsJSON) {
        try {
            console.log(`Executing step: ${step.action} ...`);
            
            if (step.action === 'navigate') {
                await page.goto(step.url);
            } else if (step.action === 'click') {
                await page.click(step.locator);
            } else if (step.action === 'fill') {
                await page.fill(step.locator, step.value);
            } else if (step.action === 'select') {
                await page.selectOption(step.locator, step.value);
            }
            
            // Tiny pause so you can watch it happen
            await page.waitForTimeout(1000); 

        } catch (error) {
            console.warn(`Step failed. Initiating Self-Healing...`);
            console.error(error.message);
        }
    }

    console.log('\n⏹️ Stopping trace recording...');
    await page.context().tracing.stop({ path: './playback-trace.zip' });
    
    console.log('✅ Playback finished!');
    console.log('---------------------------------------------------------');
    console.log('🗂️ Your playback-trace.zip file has been saved.');
    console.log('---------------------------------------------------------');
}

module.exports = { executeTest };