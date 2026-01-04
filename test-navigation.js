const { chromium } = require('playwright');

async function testNavigation() {
  console.log('Starting Test: Sidebar navigation links work correctly\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // Login as admin
    console.log('Step 1: Login as admin');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', 'admin@college.edu');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('   ✅ Logged in');

    // Expected navigation items for admin
    const navItems = [
      { label: 'Dashboard', path: '/dashboard', name: 'Dashboard' },
      { label: 'Applications', path: '/applications', name: 'Applications' },
      { label: 'Users', path: '/users', name: 'Users' },
      { label: 'Settings', path: '/settings', name: 'Settings' },
    ];

    let passed = 0;
    let failed = 0;

    for (const item of navItems) {
      console.log(`\nStep: Navigate to ${item.label} via sidebar`);
      await page.click(`a:has-text("${item.label}")`);
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      const urlMatches = currentUrl.includes(item.path);
      const headingVisible = await page.locator(`h1:has-text("${item.name}")`).isVisible().catch(() => false);

      if (urlMatches && headingVisible) {
        console.log(`   ✅ ${item.label}: URL and content match`);
        passed++;
      } else {
        console.log(`   ❌ ${item.label}: URL=${currentUrl}, Content visible=${headingVisible}`);
        failed++;
      }
    }

    console.log('\nConsole errors:', consoleErrors.length === 0 ? 'None' : consoleErrors);

    console.log('\n=== TEST RESULT ===');
    if (failed === 0) {
      console.log(`✅ PASS: All ${passed} navigation links work correctly`);
    } else {
      console.log(`❌ FAIL: ${failed} navigation links failed, ${passed} passed`);
    }

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testNavigation();