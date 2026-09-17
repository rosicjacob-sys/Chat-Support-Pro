/**
 * Module-load smoke test.
 *
 * `node --check` validates syntax but not references, so a statement that lands
 * in the wrong scope — say, a live line accidentally inserted into one of the
 * large commented-out legacy regions in these files — passes a syntax check and
 * then throws ReferenceError at require() time. In a server that means the
 * process dies at boot, which is the most expensive place to find out.
 *
 * Loading the route module also runs the boot-time safety self-tests inside
 * ai-routes.js, which throw rather than warn when a guard is mis-wired. So this
 * covers two failure modes in one require.
 *
 * Run: node backend/test/module-load.test.js
 */

const assert = require('assert');

// The real modules read this at load time and throw in production without it.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-used-for-signing';

const MODULES = [
  '../lib/ai-suggestions',
  '../lib/voice',
  '../lib/brain-guards',
  '../lib/commitment-guards',
  '../lib/product-facts',
  '../lib/product-match',
  '../lib/deepseek-fallback',
  '../brain-context',
  '../auth',
  '../routes/ai-routes',
  '../routes/ai-training-routes',
  '../routes/qa-routes',
  '../routes/promo-routes',
];

let passed = 0;
let failed = 0;
let skipped = 0;

console.log('\nmodule load');

for (const mod of MODULES) {
  try {
    require(mod);
    passed++;
    console.log(`  ✓ ${mod}`);
  } catch (err) {
    // A missing third-party package means dependencies were never installed,
    // which is a different problem from the code being broken. Don't report it
    // as a failure of this file.
    if (err.code === 'MODULE_NOT_FOUND' && !err.message.includes(mod.replace('../', ''))) {
      skipped++;
      console.log(`  - ${mod} (skipped: run npm install first)`);
      continue;
    }
    failed++;
    console.error(`  ✗ ${mod}\n      ${err.message}`);
  }
}

// The boot self-tests in ai-routes.js throw on a mis-wired guard, so reaching
// this line at all is the assertion. Restate it so the intent is explicit.
if (failed === 0 && skipped === 0) {
  assert.ok(true, 'all modules loaded and boot-time safety self-tests passed');
}

console.log(`\n${passed} loaded, ${failed} failed, ${skipped} skipped\n`);
process.exit(failed === 0 ? 0 : 1);
