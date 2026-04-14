const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://the-internet.herokuapp.com/login");
  await page.click("#username");
  await page.fill("#username", "tomsmith");
  await page.click("#password");
  await page.click("#password");
  await page.fill("#password", "SuperSecretPassword!");
  await page.click("form#login > button > i");
  await page.goto("https://the-internet.herokuapp.com/secure");
  await page.waitForTimeout(3000);
  await browser.close();
})();
