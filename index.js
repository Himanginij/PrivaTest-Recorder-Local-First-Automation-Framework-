const readline = require('readline');
const fs = require('fs');

// Import the modules for each phase of the framework
const { connectToBrowser, io } = require('./server'); 
const { startRecording } = require('./recorder');
const { executeTest } = require('./playback');
const { runDataDrivenTests } = require('./runner');
const { exportToPlaywright } = require('./export');

// Setup the Command Line Interface (CLI) menu
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// File paths for local persistence (ensuring zero-outbound data leakage)
const STEPS_FILE = './test-steps.json';
const CSV_FILE = './test-data.csv';

async function main() {
    console.log('==================================================');
    console.log(' Privacy-Centric Browser Automation Framework');
    console.log('==================================================');

    // Phase 1: Environment & Connectivity Setup
    console.log('Connecting to Chrome via CDP...');
    let page;
    try {
        page = await connectToBrowser();
        console.log('Successfully connected to the active Chrome tab!\n');
    } catch (error) {
        console.error('Connection failed. Ensure Chrome is running with --remote-debugging-port=9222');
        process.exit(1);
    }

    const showMenu = () => {
        console.log('\n--- Main Menu ---');
        console.log('1. Start Recording (Phase 2 - "Ghost" Engine)');
        console.log('2. Run Standard Playback (Phase 3)');
        console.log('3. Run Data-Driven Test with CSV (Phase 4)');
        console.log('4. Export to Playwright Script (Phase 5)');
        console.log('5. Exit');
        
        rl.question('\nSelect an option (1-5): ', async (answer) => {
            switch (answer.trim()) {
                case '1':
                    console.log('\nInjecting Ghost Engine...');
                    await startRecording(page, io);
                    console.log('Recording started! Interact with your Chrome browser. Press Ctrl+C to stop.');
                    break;
                case '2':
                    if (fs.existsSync(STEPS_FILE)) {
                        const steps = JSON.parse(fs.readFileSync(STEPS_FILE, 'utf-8'));
                        console.log('\nStarting playback...');
                        await executeTest(page, steps);
                        console.log('Playback complete!');
                    } else {
                        console.log(`\nError: Could not find ${STEPS_FILE}. Please create or record steps first.`);
                    }
                    showMenu();
                    break;
                case '3':
                    if (fs.existsSync(STEPS_FILE) && fs.existsSync(CSV_FILE)) {
                        const steps = JSON.parse(fs.readFileSync(STEPS_FILE, 'utf-8'));
                        console.log('\nStarting Data-Driven Execution...');
                        await runDataDrivenTests(page, steps, CSV_FILE);
                        console.log('DDT Execution complete! Check your directory for generated HTML reports.');
                    } else {
                        console.log(`\nError: Missing ${STEPS_FILE} or ${CSV_FILE}. Both are required for DDT.`);
                    }
                    showMenu();
                    break;
                case '4':
                    if (fs.existsSync(STEPS_FILE)) {
                        const steps = JSON.parse(fs.readFileSync(STEPS_FILE, 'utf-8'));
                        console.log('\nExporting code...');
                        // Exports the JSON steps to a standalone Playwright script 
                        exportToPlaywright(steps, './exported-script.js');
                    } else {
                        console.log(`\nError: Could not find ${STEPS_FILE} to export.`);
                    }
                    showMenu();
                    break;
                case '5':
                    console.log('Exiting framework. Goodbye!');
                    process.exit(0);
                default:
                    console.log('Invalid option. Please try again.');
                    showMenu();
                    break;
            }
        });
    };

    // Trigger the menu
    showMenu();
}

// Start the application
main();