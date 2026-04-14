const fs = require('fs');

const STEPS_FILE = './test-steps.json';

async function startRecording(page, io) {
    let recordedSteps = [];
    fs.writeFileSync(STEPS_FILE, JSON.stringify([], null, 2));
    console.log('Cleared old test steps. Loading UI-TAB Ghost Engine...');

    const advancedGhostLogic = () => {
        if (window.__ghostAdvanced) return;
        window.__ghostAdvanced = true;

       // Upgraded Locator Generator (Now with Angular & Accessibility support!)
        function generateLocator(element) {
            
            // 1. THE NEW GOLDMINES: Angular and Accessibility attributes
            if (element.getAttribute('formcontrolname')) return `[formcontrolname="${element.getAttribute('formcontrolname')}"]`;
            if (element.getAttribute('aria-label')) return `[aria-label="${element.getAttribute('aria-label')}"]`;
            if (element.getAttribute('placeholder')) return `[placeholder="${element.getAttribute('placeholder')}"]`;

            // 2. Standard testing IDs
            if (element.getAttribute('data-testid')) return `[data-testid="${element.getAttribute('data-testid')}"]`;
            if (element.getAttribute('data-cy')) return `[data-cy="${element.getAttribute('data-cy')}"]`;
            
            // 3. Standard ID and Name
            if (element.id) return `#${element.id}`;
            if (element.name) return `[name="${element.name}"]`;
            
            // 4. UI TAB FIX: Use Playwright's powerful text selector for tabs and buttons
            if (['BUTTON', 'A', 'LI'].includes(element.tagName) || element.getAttribute('role') === 'tab') {
                const text = element.innerText?.trim();
                if (text && text.length > 0 && text.length < 30) {
                    return `text="${text}"`; 
                }
            }

            // 5. CSS Fallback (ignoring dynamic Angular ng- classes)
            if (element.className && typeof element.className === 'string') {
                // We specifically filter out those nasty ng-untouched, ng-pristine classes!
                const classes = element.className.split(' ')
                    .filter(c => c && !c.includes(':') && !c.startsWith('ng-'))
                    .map(c => `.${c}`).join('');
                if (classes) return `css=${element.tagName.toLowerCase()}${classes}`;
            }

            // 6. Ultimate Fallback: Relative XPath
            let paths = [];
            for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
                let index = 0;
                for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
                    if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
                    if (sibling.nodeName === element.nodeName) ++index;
                }
                let tagName = element.nodeName.toLowerCase();
                let pathIndex = (index ? "[" + (index + 1) + "]" : "");
                paths.splice(0, 0, tagName + pathIndex);
            }
            return paths.length ? "xpath=//" + paths.join("/") : null;
        }

        // Upgraded Click Listener
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'HTML' || e.target.tagName === 'BODY' || e.target.tagName === 'OPTION') return;
            
            // THE UI TAB FIX: Climb up the DOM tree!
            // If the user clicks a <span> or <i> inside a tab, find the actual parent tab/button.
            let targetElement = e.target.closest('a, button, [role="tab"], li') || e.target;
            
            window.sendToLocalTool({ action: 'click', locator: generateLocator(targetElement) });
        }, { capture: true, passive: true }); 

        // Live Typing
        let typingTimer;
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                clearTimeout(typingTimer);
                const locator = generateLocator(e.target);
                const value = e.target.value;
                typingTimer = setTimeout(() => {
                    window.sendToLocalTool({ action: 'fill', locator: locator, value: value });
                }, 500);
            }
        }, { capture: true });

        // Drop-downs
        document.addEventListener('change', (e) => {
            if (e.target.tagName === 'SELECT') {
                window.sendToLocalTool({ action: 'select', locator: generateLocator(e.target), value: e.target.value });
            }
        }, { capture: true });
    };

    async function injectGhostIntoTab(targetTab) {
        try {
            // 1. Safety Check: If Chrome already closed this tab, ignore it!
            if (targetTab.isClosed()) return;

            // 2. Setup the bridge
            await targetTab.exposeFunction('sendToLocalTool', (eventData) => {
                console.log(`👻 Ghost Captured: ${eventData.action} -> ${eventData.locator || eventData.value || ''}`);
                
                if (eventData.action === 'fill') {
                    recordedSteps = recordedSteps.filter(step => step.locator !== eventData.locator || step.action !== 'fill');
                }
                recordedSteps.push(eventData);
                fs.writeFileSync(STEPS_FILE, JSON.stringify(recordedSteps, null, 2));
            }).catch(() => {}); // Catch if bridge already exists

            // 3. Inject the logic safely
            await targetTab.addInitScript(advancedGhostLogic);
            await targetTab.evaluate(advancedGhostLogic);

            // 4. Track navigations safely
            targetTab.on('framenavigated', (frame) => {
                try {
                    if (frame === targetTab.mainFrame()) {
                        const url = frame.url();
                        if (url !== 'about:blank') {
                            console.log(`👻 Ghost Captured: navigate -> ${url}`);
                            recordedSteps.push({ action: 'navigate', url: url });
                            fs.writeFileSync(STEPS_FILE, JSON.stringify(recordedSteps, null, 2));
                        }
                    }
                } catch (e) { /* Ignore navigation errors on closed frames */ }
            });

        } catch (error) {
            // If the tab closes at any point during injection, silently catch the error and keep the engine running!
            // console.log('A temporary background tab closed, ignoring...');
        }
    }

    await injectGhostIntoTab(page);

    page.context().on('page', async (newTab) => {
        await injectGhostIntoTab(newTab);
    });

    console.log('\n🚀 UI-TAB Ghost script injected!');
    console.log('Try clicking your project screen tabs now!');
    console.log('--------------------------------------------------');
}

module.exports = { startRecording };