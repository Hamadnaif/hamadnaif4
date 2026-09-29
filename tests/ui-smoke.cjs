// Run against the disposable tests.preview_server, never a production environment.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE});
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
 const page=await context.newPage(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/','/login','/pricing','/templates','/domains','/terms','/privacy']){
  await page.goto('https://127.0.0.1:8443'+route);await page.waitForLoadState('networkidle');
  assert.ok((await page.locator('body').innerText()).length>30,route);
 }
 await page.goto('https://127.0.0.1:8443/register');
 await page.getByTestId('register-name').fill('قبول الواجهة');
 await page.getByTestId('register-email').fill(`ui-${Date.now()}@example.com`);
 await page.getByTestId('register-password').fill('TestPassword123');
 await page.getByTestId('register-submit').click();await page.getByTestId('sites-page').waitFor();
 await page.getByTestId('create-site-btn').click();
 await page.getByTestId('new-site-name').fill('موقعي التجريبي');
 await page.locator('[data-testid^="new-site-template-"]').first().click();
 await page.getByTestId('new-site-submit').click();
 await page.locator('[data-testid^="site-card-"]').first().waitFor();
 await page.locator('[data-testid^="site-edit-"]').first().click();
 await page.getByTestId('editor-preview').waitFor();
 const popupPromise=page.waitForEvent('popup');await page.getByTestId('editor-preview').click();
 const popup=await popupPromise;await popup.waitForLoadState('networkidle');
 assert.ok((await popup.locator('body').innerText()).includes('معاينة المسودة'));
 assert.ok((await popup.locator('body').innerText()).includes('موقعي التجريبي'));await popup.close();
 for(const [route,testId] of [['/dashboard/billing','billing-page'],['/dashboard/payments','merchant-payments-page'],['/dashboard/payouts','payouts-page'],['/dashboard/domains','domains-page']]){
  await page.goto('https://127.0.0.1:8443'+route);await page.getByTestId(testId).waitFor();
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto('https://127.0.0.1:8443/dashboard/payments');await page.getByTestId('merchant-payments-page').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'mobile overflow');
 await page.screenshot({path:'/tmp/naif-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,flows:['public routes','registration','dashboard','create site','editor','draft preview','billing','merchant payments','payouts','domains','390px layout'],pageErrors:errors}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
