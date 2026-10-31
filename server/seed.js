// server/seed.js
const { db } = require('./db');
const { hashPassword } = require('./auth');

console.log('🌱 Seeding Brightloop Software database...');

// Clean existing data
db.exec(`
  DELETE FROM audit_logs;
  DELETE FROM simulated_emails;
  DELETE FROM billing_runs;
  DELETE FROM payments;
  DELETE FROM invoice_lines;
  DELETE FROM invoices;
  DELETE FROM subscription_lines;
  DELETE FROM subscriptions;
  DELETE FROM quotation_template_lines;
  DELETE FROM quotation_templates;
  DELETE FROM discounts;
  DELETE FROM taxes;
  DELETE FROM product_variants;
  DELETE FROM products;
  DELETE FROM plans;
  DELETE FROM users;
`);

// 1. Users
const adminPass = hashPassword('Admin@12345');
const staffPass = hashPassword('Staff@12345');
const custPass = hashPassword('Customer@12345');

const insertUser = db.prepare(`
  INSERT INTO users (email, password_hash, name, role, company_name, phone, address)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const uAdmin = insertUser.run('admin@brightloop.com', adminPass, 'Alexander Vance', 'admin', 'Brightloop Software HQ', '+1 (555) 100-2000', '100 Market St, San Francisco, CA');
const uSarah = insertUser.run('sarah.sales@brightloop.com', staffPass, 'Sarah Jenkins', 'staff', 'Brightloop Software', '+1 (555) 200-3000', 'San Francisco Office');
const uFelix = insertUser.run('felix.finance@brightloop.com', staffPass, 'Felix Chen', 'staff', 'Brightloop Software', '+1 (555) 300-4000', 'Finance Operations');
const uJohn = insertUser.run('john@acmecorp.com', custPass, 'John Miller', 'customer', 'Acme Corporation', '+1 (555) 888-1122', '452 Industrial Blvd, Austin, TX');
const uGlobex = insertUser.run('tech@globex.com', custPass, 'Elena Rostova', 'customer', 'Globex Enterprises', '+1 (555) 777-9900', '1200 Avenue of the Americas, New York, NY');
const uEmma = insertUser.run('emma@startuplab.io', custPass, 'Emma Watson', 'customer', 'StartupLab AI', '+1 (555) 444-3322', '88 University Ave, Palo Alto, CA');

const adminId = Number(uAdmin.lastInsertRowid);
const sarahId = Number(uSarah.lastInsertRowid);
const felixId = Number(uFelix.lastInsertRowid);
const johnId = Number(uJohn.lastInsertRowid);
const globexId = Number(uGlobex.lastInsertRowid);
const emmaId = Number(uEmma.lastInsertRowid);

console.log('✅ Users seeded (Admin, Staff, Customers)');

// 2. Products
const insertProduct = db.prepare(`
  INSERT INTO products (name, type, sales_price, cost_price, notes)
  VALUES (?, ?, ?, ?, ?)
`);

const p1 = insertProduct.run('Brightloop ERP Core', 'software_license', 1200.0, 350.0, 'Unified core subscription engine with full modules');
const p2 = insertProduct.run('CRM Pro Suite', 'software_license', 450.0, 110.0, 'Multi-stage sales pipelines, leads, quotes and deals');
const p3 = insertProduct.run('Automated Recurring Billing Connector', 'addon', 180.0, 30.0, 'Synchronized billing day batch executor and multi-gateway handler');
const p4 = insertProduct.run('24/7 Dedicated SLA Support', 'service', 600.0, 200.0, 'Dedicated technical account manager with 15-min response SLA');

// 3. Product Variants (Exact requirement: "where choosing the Odoo brand adds 560 to the price")
const insertVariant = db.prepare(`
  INSERT INTO product_variants (product_id, attribute_name, variant_value, price_extra, sku)
  VALUES (?, ?, ?, ?, ?)
`);

const vStd = insertVariant.run(Number(p1.lastInsertRowid), 'Brand', 'Standard Brightloop', 0.0, 'ERP-STD');
const vOdoo = insertVariant.run(Number(p1.lastInsertRowid), 'Brand', 'Odoo Certified Edition', 560.0, 'ERP-ODOO-560');
const vEnt = insertVariant.run(Number(p1.lastInsertRowid), 'Brand', 'Enterprise Custom', 950.0, 'ERP-ENT-950');

const vCrmStd = insertVariant.run(Number(p2.lastInsertRowid), 'Edition', 'Standard 10-Users', 0.0, 'CRM-STD');
const vCrmUnltd = insertVariant.run(Number(p2.lastInsertRowid), 'Edition', 'Enterprise Unlimited Seats', 350.0, 'CRM-UNLTD');

console.log('✅ Products & Variants seeded (including Odoo brand +$560 surcharge)');

// 4. Plans
const insertPlan = db.prepare(`
  INSERT INTO plans (name, code, cost, billing_frequency, min_quantity, start_date, end_date, auto_close_on_end, can_close_early, can_pause, can_renew, description)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const planStarter = insertPlan.run('Starter Monthly', 'PLAN-STARTER-M', 150.0, 'monthly', 1, '2026-01-01', null, 0, 1, 1, 1, 'Ideal for growing businesses. Billed monthly with pause and renew options.');
const planAnnual = insertPlan.run('Growth Annual Contract', 'PLAN-GROWTH-Y', 1800.0, 'yearly', 5, '2026-01-01', null, 0, 0, 0, 1, 'Annual enterprise contract with guaranteed minimum 5 seats.');
const planOdoo = insertPlan.run('Odoo Cloud Managed (Auto-Closing)', 'PLAN-ODOO-AUTO', 750.0, 'monthly', 1, '2026-01-01', '2026-12-31', 1, 1, 0, 0, 'Fixed duration managed project plan. Closes automatically at expiry date.');
const planWeekly = insertPlan.run('Burst Weekly Operations', 'PLAN-WEEKLY-BURST', 95.0, 'weekly', 1, '2026-01-01', null, 0, 1, 1, 1, 'High velocity weekly billing for agile teams and temporary sprints.');

console.log('✅ Plans seeded with auto-close and lifecycle rules');

// 5. Taxes
const insertTax = db.prepare(`
  INSERT INTO taxes (name, rate, tax_type, is_default)
  VALUES (?, ?, ?, ?)
`);

const taxVAT = insertTax.run('VAT 20%', 20.0, 'percentage', 0);
const taxSales = insertTax.run('Sales Tax 8.25%', 8.25, 'percentage', 1);
const taxGST = insertTax.run('GST 18%', 18.0, 'percentage', 0);
const taxZero = insertTax.run('Zero Tax 0%', 0.0, 'percentage', 0);

console.log('✅ Taxes seeded');

// 6. Discounts (Admin only rules)
const insertDiscount = db.prepare(`
  INSERT INTO discounts (code, name, discount_type, discount_value, min_purchase_amount, min_quantity, start_date, end_date, usage_limit, times_used, scope, target_product_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const discSeats = insertDiscount.run('MORESEATS15', 'Volume Discount 15%', 'percentage', 15.0, 0.0, 10, '2026-01-01', '2026-12-31', 100, 12, 'subscription', null);
const discOdoo = insertDiscount.run('ODOOPROMO200', 'Odoo Brand $200 Rebate', 'fixed', 200.0, 500.0, 0, '2026-01-01', '2026-12-31', 50, 4, 'product', Number(p1.lastInsertRowid));
const discVIP = insertDiscount.run('ENTERPRISE500', 'Enterprise Welcome Credit', 'fixed', 500.0, 2000.0, 0, '2026-01-01', '2026-12-31', 25, 2, 'subscription', null);

console.log('✅ Discounts seeded');

// 7. Quotation Templates
const insertTemplate = db.prepare(`
  INSERT INTO quotation_templates (name, plan_id, validity_days, notes)
  VALUES (?, ?, ?, ?)
`);

const tplEnterprise = insertTemplate.run('Enterprise Odoo Cloud Package', Number(planAnnual.lastInsertRowid), 30, 'Full annual package with Odoo variant and 24/7 dedicated support.');
const tplStarter = insertTemplate.run('Standard SaaS Starter Bundle', Number(planStarter.lastInsertRowid), 15, 'Monthly SaaS setup for emerging startups.');

const insertTplLine = db.prepare(`
  INSERT INTO quotation_template_lines (template_id, product_id, variant_id, quantity, unit_price, tax_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Odoo ERP + 24/7 support
insertTplLine.run(Number(tplEnterprise.lastInsertRowid), Number(p1.lastInsertRowid), Number(vOdoo.lastInsertRowid), 5, 1760.0, Number(taxSales.lastInsertRowid)); // 1200 + 560
insertTplLine.run(Number(tplEnterprise.lastInsertRowid), Number(p4.lastInsertRowid), null, 1, 600.0, Number(taxSales.lastInsertRowid));

// Starter: CRM + Billing Addon
insertTplLine.run(Number(tplStarter.lastInsertRowid), Number(p2.lastInsertRowid), Number(vCrmStd.lastInsertRowid), 1, 450.0, Number(taxSales.lastInsertRowid));
insertTplLine.run(Number(tplStarter.lastInsertRowid), Number(p3.lastInsertRowid), null, 1, 180.0, Number(taxSales.lastInsertRowid));

console.log('✅ Quotation Templates seeded');

// 8. Subscriptions
const insertSub = db.prepare(`
  INSERT INTO subscriptions (
    subscription_number, customer_id, sales_rep_id, plan_id,
    start_date, expiry_date, payment_terms, status,
    last_billed_date, next_billing_date, auto_close_on_end, discount_id,
    subtotal, tax_total, discount_total, total_amount, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertSubLine = db.prepare(`
  INSERT INTO subscription_lines (
    subscription_id, product_id, variant_id, quantity, unit_price,
    tax_id, tax_amount, discount_amount, line_total
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Sub 1: Acme Corp - Active & Due on Billing Day! (next_billing_date is 2026-10-31)
const s1 = insertSub.run(
  'SUB-2026-0001', johnId, sarahId, Number(planStarter.lastInsertRowid),
  '2026-09-30', '2027-09-30', 'net_30', 'active',
  '2026-09-30', '2026-10-31', 0, null,
  630.0, 51.98, 0.0, 681.98, 'Acme Corp core monthly stack'
);
insertSubLine.run(Number(s1.lastInsertRowid), Number(p2.lastInsertRowid), Number(vCrmStd.lastInsertRowid), 1, 450.0, Number(taxSales.lastInsertRowid), 37.13, 0, 487.13);
insertSubLine.run(Number(s1.lastInsertRowid), Number(p3.lastInsertRowid), null, 1, 180.0, Number(taxSales.lastInsertRowid), 14.85, 0, 194.85);

// Sub 2: Globex Enterprises - Large Enterprise Contract with Odoo variant
const s2 = insertSub.run(
  'SUB-2026-0002', globexId, sarahId, Number(planAnnual.lastInsertRowid),
  '2026-01-15', '2027-01-15', 'net_60', 'active',
  '2026-01-15', '2027-01-15', 0, Number(discVIP.lastInsertRowid),
  9400.0, 734.25, 500.0, 9634.25, 'Globex custom Odoo ERP contract with Enterprise discount'
);
insertSubLine.run(Number(s2.lastInsertRowid), Number(p1.lastInsertRowid), Number(vOdoo.lastInsertRowid), 5, 1760.0, Number(taxSales.lastInsertRowid), 726.0, 0, 9526.0); // 1760*5 = 8800
insertSubLine.run(Number(s2.lastInsertRowid), Number(p4.lastInsertRowid), null, 1, 600.0, Number(taxSales.lastInsertRowid), 49.5, 0, 649.5);

// Sub 3: StartupLab - In Quotation status
const s3 = insertSub.run(
  'SUB-2026-0003', emmaId, sarahId, Number(planStarter.lastInsertRowid),
  '2026-11-01', '2027-11-01', 'immediate', 'quotation',
  null, '2026-11-01', 0, null,
  450.0, 37.13, 0.0, 487.13, 'Quotation sent to Emma Watson'
);
insertSubLine.run(Number(s3.lastInsertRowid), Number(p2.lastInsertRowid), Number(vCrmStd.lastInsertRowid), 1, 450.0, Number(taxSales.lastInsertRowid), 37.13, 0, 487.13);

// Sub 4: Acme Corp - Paused
const s4 = insertSub.run(
  'SUB-2026-0004', johnId, sarahId, Number(planWeekly.lastInsertRowid),
  '2026-08-01', '2026-12-01', 'immediate', 'paused',
  '2026-08-15', '2026-08-22', 0, null,
  180.0, 14.85, 0.0, 194.85, 'Paused by customer during server migration'
);
insertSubLine.run(Number(s4.lastInsertRowid), Number(p3.lastInsertRowid), null, 1, 180.0, Number(taxSales.lastInsertRowid), 14.85, 0, 194.85);

// Sub 5: StartupLab - Auto-closed plan reached end
const s5 = insertSub.run(
  'SUB-2026-0005', emmaId, sarahId, Number(planOdoo.lastInsertRowid),
  '2026-01-01', '2026-06-30', 'net_15', 'closed',
  '2026-05-31', '2026-06-30', 1, null,
  750.0, 61.88, 0.0, 811.88, 'Plan closed on end date per auto_close_on_end policy'
);
insertSubLine.run(Number(s5.lastInsertRowid), Number(p1.lastInsertRowid), Number(vOdoo.lastInsertRowid), 1, 750.0, Number(taxSales.lastInsertRowid), 61.88, 0, 811.88);

console.log('✅ Subscriptions seeded across lifecycle states');

// 9. Invoices & Payments
const insertInv = db.prepare(`
  INSERT INTO invoices (
    invoice_number, subscription_id, customer_id, invoice_date, due_date,
    payment_terms, status, billing_period_start, billing_period_end,
    subtotal, tax_total, discount_total, total_amount, amount_paid, balance_due, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertInvLine = db.prepare(`
  INSERT INTO invoice_lines (
    invoice_id, product_id, variant_id, description, quantity,
    unit_price, tax_id, tax_rate, tax_amount, discount_amount, line_total
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertPayment = db.prepare(`
  INSERT INTO payments (
    payment_number, invoice_id, customer_id, amount,
    payment_method, payment_date, reference_note, recorded_by_user_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Invoice 1: Overdue Invoice for Acme Corp (Due 2026-10-15) -> Demonstrates overdue chasing!
const inv1 = insertInv.run(
  'INV-2026-0001', Number(s1.lastInsertRowid), johnId, '2026-09-15', '2026-10-15',
  'net_30', 'confirmed', '2026-09-15', '2026-10-15',
  630.0, 51.98, 0.0, 681.98, 0.0, 681.98, 'September Billing Cycle - Overdue'
);
insertInvLine.run(Number(inv1.lastInsertRowid), Number(p2.lastInsertRowid), Number(vCrmStd.lastInsertRowid), 'CRM Pro Suite (Edition: Standard 10-Users)', 1, 450.0, Number(taxSales.lastInsertRowid), 8.25, 37.13, 0, 487.13);
insertInvLine.run(Number(inv1.lastInsertRowid), Number(p3.lastInsertRowid), null, 'Automated Recurring Billing Connector', 1, 180.0, Number(taxSales.lastInsertRowid), 8.25, 14.85, 0, 194.85);

// Invoice 2: Fully Paid Invoice for Globex Enterprises
const inv2 = insertInv.run(
  'INV-2026-0002', Number(s2.lastInsertRowid), globexId, '2026-01-15', '2026-03-15',
  'net_60', 'paid', '2026-01-15', '2027-01-15',
  9400.0, 734.25, 500.0, 9634.25, 9634.25, 0.0, 'Annual enterprise payment'
);
insertInvLine.run(Number(inv2.lastInsertRowid), Number(p1.lastInsertRowid), Number(vOdoo.lastInsertRowid), 'Brightloop ERP Core (Brand: Odoo Certified Edition)', 5, 1760.0, Number(taxSales.lastInsertRowid), 8.25, 726.0, 0, 9526.0);
insertInvLine.run(Number(inv2.lastInsertRowid), Number(p4.lastInsertRowid), null, '24/7 Dedicated SLA Support', 1, 600.0, Number(taxSales.lastInsertRowid), 8.25, 49.5, 0, 649.5);

// Record payment for invoice 2
insertPayment.run('PAY-2026-0001', Number(inv2.lastInsertRowid), globexId, 9634.25, 'bank_transfer', '2026-02-01', 'Wire transfer ref #GBX-99411', felixId);

// Invoice 3: Recent Confirmed Invoice for StartupLab
const inv3 = insertInv.run(
  'INV-2026-0003', Number(s5.lastInsertRowid), emmaId, '2026-05-31', '2026-06-15',
  'net_15', 'paid', '2026-05-01', '2026-05-31',
  750.0, 61.88, 0.0, 811.88, 811.88, 0.0, 'Final cycle before auto-close'
);
insertInvLine.run(Number(inv3.lastInsertRowid), Number(p1.lastInsertRowid), Number(vOdoo.lastInsertRowid), 'Brightloop ERP Core (Brand: Odoo Certified Edition)', 1, 750.0, Number(taxSales.lastInsertRowid), 8.25, 61.88, 0, 811.88);
insertPayment.run('PAY-2026-0002', Number(inv3.lastInsertRowid), emmaId, 811.88, 'credit_card', '2026-06-10', 'Stripe charge ch_1M891x', felixId);

console.log('✅ Invoices & Payments seeded (Overdue, Confirmed, Paid)');

// Seed simulated email
db.prepare(`
  INSERT INTO simulated_emails (to_email, subject, body, email_type, metadata_json)
  VALUES ('john@acmecorp.com', 'Welcome to Brightloop Software', 'Your customer portal account is ready. Log in to manage your subscriptions and invoices.', 'welcome', '{}')
`).run();

console.log('🎉 Seed complete! Brightloop ready to run.');
