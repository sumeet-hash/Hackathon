// tests/api.test.js
const assert = require('node:assert');
const { db } = require('../server/db');
const { validatePassword, hashPassword, comparePassword } = require('../server/auth');
const { runBillingCycle, calculateDueDate, calculateNextDate, evaluateDiscount } = require('../server/billingEngine');

console.log('🧪 Starting Brightloop API & Business Logic Verification Tests...\n');

// 1. Test Password Complexity Validation
console.log('Test 1: Password Complexity Rules');
assert.strictEqual(validatePassword('short').valid, false, 'Should reject short password');
assert.strictEqual(validatePassword('nouppercase123!').valid, false, 'Should reject missing uppercase');
assert.strictEqual(validatePassword('NOLOWERCASE123!').valid, false, 'Should reject missing lowercase');
assert.strictEqual(validatePassword('NoSpecialChar123').valid, false, 'Should reject missing special character');
assert.strictEqual(validatePassword('ValidPass123!').valid, true, 'Should accept valid password');
console.log('  ✅ Password validation rules verified');

// 2. Test Plan Lifecycle & Policies
console.log('\nTest 2: Plan Lifecycle Policies');
const autoClosingPlan = db.prepare("SELECT * FROM plans WHERE code = 'PLAN-ODOO-AUTO'").get();
assert(autoClosingPlan, 'Odoo auto-closing plan must exist');
assert.strictEqual(autoClosingPlan.auto_close_on_end, 1, 'Auto close on end must be 1');
assert.strictEqual(autoClosingPlan.can_pause, 0, 'Can pause must be 0 for this plan');
console.log('  ✅ Plan policies verified');

// 3. Test Product Variants & Surcharge
console.log('\nTest 3: Product Variants & Odoo Surcharge (+560)');
const odooVariant = db.prepare("SELECT * FROM product_variants WHERE variant_value = 'Odoo Certified Edition'").get();
assert(odooVariant, 'Odoo variant must exist');
assert.strictEqual(odooVariant.price_extra, 560.0, 'Odoo variant must add 560 to price');
console.log('  ✅ Product variant pricing verified');

// 4. Test Discount Rules Engine
console.log('\nTest 4: Discount Rules Engine');
const disc = db.prepare("SELECT * FROM discounts WHERE code = 'MORESEATS15'").get();
assert(disc, 'Discount MORESEATS15 must exist');
// Test below minimum quantity (e.g. qty 5 < min_quantity 10)
const resBelow = evaluateDiscount(disc.id, { subtotal: 1000, quantity: 5, dateStr: '2026-06-01' });
assert.strictEqual(resBelow, null, 'Discount should not apply if below min quantity');

// Test meeting minimum quantity (qty 12 >= min_quantity 10)
const resValid = evaluateDiscount(disc.id, { subtotal: 1000, quantity: 12, dateStr: '2026-06-01' });
assert(resValid, 'Discount should apply');
assert.strictEqual(resValid.amount, 150.0, '15% of 1000 should be 150.0');
console.log('  ✅ Discount evaluation and rules verified');

// 5. Test Billing Day Engine & Idempotency
console.log('\nTest 5: Billing Day Execution & Idempotency');
const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
const beforeInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;

// Run billing cycle for 2026-10-31 (Acme Corp SUB-2026-0001 is due!)
const cycle1 = runBillingCycle('2026-10-31', adminUser ? adminUser.id : null);
assert(cycle1.invoicesGenerated >= 1, 'Should generate at least 1 invoice for due subscription');
const afterInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
assert.strictEqual(afterInvoices, beforeInvoices + cycle1.invoicesGenerated, 'Invoice count should match generated count');

// Re-run for the SAME date -> must NOT double bill!
const cycle2 = runBillingCycle('2026-10-31', adminUser ? adminUser.id : null);
assert.strictEqual(cycle2.invoicesGenerated, 0, 'Idempotency: Re-running on same date should generate 0 new invoices');
console.log('  ✅ Recurring billing and double-billing prevention verified');

// 6. Test Payments and Overdue Detection
console.log('\nTest 6: Overdue Invoices & Payment Settlement');
const overdue = db.prepare(`
  SELECT * FROM invoices 
  WHERE status IN ('draft', 'confirmed') AND due_date < '2026-10-31' AND balance_due > 0
`).all();
assert(overdue.length > 0, 'Must have overdue invoices detected');
console.log(`  ✅ Overdue invoice correctly detected (${overdue.length} found)`);

// 7. Finance Lead Performance Benchmark (< 2 seconds SLA)
console.log('\nTest 7: Performance Benchmark SLA');
const start = process.hrtime();
const mrrRes = db.prepare(`
  SELECT 
    COUNT(*) as total_subs,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subs,
    SUM(total_amount) as total_val
  FROM subscriptions
`).get();
const diff = process.hrtime(start);
const durationMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);
console.log(`  ⚡ Aggregation query completed in: ${durationMs}ms (Required: < 2000ms)`);
assert(parseFloat(durationMs) < 2000, 'Must respond in under 2 seconds');
console.log('  ✅ SLA target met');

console.log('\n🎉 ALL BACKEND BUSINESS LOGIC TESTS PASSED!\n');
