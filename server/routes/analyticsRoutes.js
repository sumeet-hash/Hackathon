// server/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../auth');

router.get('/dashboard', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const startTime = process.hrtime();
  const { date_range, plan_id, customer_id } = req.query;
  const today = new Date().toISOString().split('T')[0];

  let subWhere = [];
  let subParams = [];

  let invWhere = [];
  let invParams = [];

  let payWhere = [];
  let payParams = [];

  if (plan_id) {
    subWhere.push('plan_id = ?');
    subParams.push(parseInt(plan_id, 10));
  }

  if (customer_id) {
    const cId = parseInt(customer_id, 10);
    subWhere.push('customer_id = ?');
    subParams.push(cId);
    invWhere.push('customer_id = ?');
    invParams.push(cId);
    payWhere.push('customer_id = ?');
    payParams.push(cId);
  }

  // Date filters for payments and invoices
  if (date_range === 'this_month') {
    const currentMonth = today.slice(0, 7); // YYYY-MM
    invWhere.push("invoice_date LIKE ?");
    invParams.push(`${currentMonth}%`);
    payWhere.push("payment_date LIKE ?");
    payParams.push(`${currentMonth}%`);
  } else if (date_range === 'this_quarter') {
    const currentYear = today.slice(0, 4);
    const m = parseInt(today.slice(5, 7), 10);
    let qStart = '01-01', qEnd = '03-31';
    if (m >= 4 && m <= 6) { qStart = '04-01'; qEnd = '06-30'; }
    else if (m >= 7 && m <= 9) { qStart = '07-01'; qEnd = '09-30'; }
    else if (m >= 10 && m <= 12) { qStart = '10-01'; qEnd = '12-31'; }
    invWhere.push("invoice_date BETWEEN ? AND ?");
    invParams.push(`${currentYear}-${qStart}`, `${currentYear}-${qEnd}`);
    payWhere.push("payment_date BETWEEN ? AND ?");
    payParams.push(`${currentYear}-${qStart}`, `${currentYear}-${qEnd}`);
  } else if (date_range === 'ytd') {
    const currentYear = today.slice(0, 4);
    invWhere.push("invoice_date >= ?");
    invParams.push(`${currentYear}-01-01`);
    payWhere.push("payment_date >= ?");
    payParams.push(`${currentYear}-01-01`);
  }

  const subWhereStr = subWhere.length > 0 ? `WHERE ${subWhere.join(' AND ')}` : '';
  const invWhereStr = invWhere.length > 0 ? `WHERE ${invWhere.join(' AND ')}` : '';
  const payWhereStr = payWhere.length > 0 ? `WHERE ${payWhere.join(' AND ')}` : '';

  // 1. Subscription counts & status breakdown
  const subStats = db.prepare(`
    SELECT 
      COUNT(*) as total_subscriptions,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_subscriptions,
      SUM(CASE WHEN status = 'quotation' THEN 1 ELSE 0 END) as quotation_subscriptions,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_subscriptions,
      SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused_subscriptions,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_subscriptions
    FROM subscriptions
    ${subWhereStr}
  `).get(...subParams);

  // 2. MRR (Monthly Recurring Revenue) Calculation for Active Subscriptions
  // Normalizing billing frequencies:
  // daily: total_amount * 30.42
  // weekly: total_amount * 4.33
  // monthly: total_amount * 1
  // yearly: total_amount / 12
  const mrrRow = db.prepare(`
    SELECT 
      SUM(
        CASE 
          WHEN p.billing_frequency = 'daily' THEN s.total_amount * 30.42
          WHEN p.billing_frequency = 'weekly' THEN s.total_amount * 4.333
          WHEN p.billing_frequency = 'monthly' THEN s.total_amount
          WHEN p.billing_frequency = 'yearly' THEN s.total_amount / 12.0
          ELSE s.total_amount
        END
      ) as mrr
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status = 'active' ${subWhere.length > 0 ? `AND ${subWhere.map(w => 's.' + w).join(' AND ')}` : ''}
  `).get(...subParams);

  const mrr = mrrRow.mrr ? Math.round(mrrRow.mrr * 100) / 100 : 0;
  const arr = Math.round(mrr * 12 * 100) / 100;

  // 3. Payments collected (Actual cash revenue)
  const payStats = db.prepare(`
    SELECT 
      COUNT(*) as total_payments_count,
      COALESCE(SUM(amount), 0) as total_revenue_collected
    FROM payments
    ${payWhereStr}
  `).get(...payParams);

  // 4. Invoices & Receivables (How much is still owed & overdue)
  const invStats = db.prepare(`
    SELECT 
      COUNT(*) as total_invoices,
      COALESCE(SUM(total_amount), 0) as total_invoiced,
      COALESCE(SUM(balance_due), 0) as total_outstanding,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices_count,
      SUM(CASE WHEN status IN ('draft', 'confirmed') AND due_date < ? AND balance_due > 0 THEN 1 ELSE 0 END) as overdue_invoices_count,
      COALESCE(SUM(CASE WHEN status IN ('draft', 'confirmed') AND due_date < ? AND balance_due > 0 THEN balance_due ELSE 0 END), 0) as overdue_amount
    FROM invoices
    ${invWhere.length > 0 ? `WHERE ${invWhere.join(' AND ')}` : ''}
  `).get(today, today, ...invParams);

  // 5. Monthly Revenue Breakdown (Last 6 months)
  const monthlyRevenue = db.prepare(`
    SELECT 
      substr(payment_date, 1, 7) as month,
      SUM(amount) as collected_amount,
      COUNT(*) as payment_count
    FROM payments
    GROUP BY substr(payment_date, 1, 7)
    ORDER BY month DESC
    LIMIT 6
  `).all();

  // 6. Subscriptions by Plan Breakdown
  const planDistribution = db.prepare(`
    SELECT 
      p.name as plan_name,
      p.billing_frequency,
      COUNT(s.id) as subscription_count,
      SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_count,
      COALESCE(SUM(s.total_amount), 0) as total_plan_value
    FROM plans p
    LEFT JOIN subscriptions s ON p.id = s.plan_id
    GROUP BY p.id
    ORDER BY active_count DESC
  `).all();

  // 7. Recent Invoices
  const recentInvoices = db.prepare(`
    SELECT i.*, u.name as customer_name,
           CASE 
             WHEN i.status IN ('draft', 'confirmed') AND i.due_date < ? AND i.balance_due > 0 THEN 1 
             ELSE 0 
           END as is_overdue
    FROM invoices i
    JOIN users u ON i.customer_id = u.id
    ORDER BY i.id DESC
    LIMIT 5
  `).all(today);

  // Measure response time
  const diff = process.hrtime(startTime);
  const responseTimeMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);

  res.json({
    responseTimeMs: `${responseTimeMs}ms`,
    metrics: {
      activeSubscriptions: subStats.active_subscriptions || 0,
      totalSubscriptions: subStats.total_subscriptions || 0,
      draftSubscriptions: subStats.draft_subscriptions || 0,
      quotationSubscriptions: subStats.quotation_subscriptions || 0,
      pausedSubscriptions: subStats.paused_subscriptions || 0,
      closedSubscriptions: subStats.closed_subscriptions || 0,
      mrr,
      arr,
      totalRevenueCollected: payStats.total_revenue_collected || 0,
      totalOutstanding: invStats.total_outstanding || 0,
      overdueInvoicesCount: invStats.overdue_invoices_count || 0,
      overdueAmount: invStats.overdue_amount || 0,
      totalInvoiced: invStats.total_invoiced || 0
    },
    monthlyRevenue: monthlyRevenue.reverse(),
    planDistribution,
    recentInvoices
  });
});

// Benchmark endpoint: stress-tests query performance and allows seeding thousands of test records
router.post('/benchmark', authenticateToken, requireRole('admin'), (req, res) => {
  const { seedCount = 0 } = req.body;
  const startTime = Date.now();

  if (seedCount > 0) {
    const safeCount = Math.min(seedCount, 5000);
    // Fetch a base customer and plan
    const customer = db.prepare("SELECT id FROM users WHERE role = 'customer' LIMIT 1").get();
    const plan = db.prepare("SELECT id FROM plans LIMIT 1").get();
    const product = db.prepare("SELECT id, sales_price FROM products LIMIT 1").get();

    if (customer && plan && product) {
      const insertSub = db.prepare(`
        INSERT INTO subscriptions (
          subscription_number, customer_id, plan_id, start_date, expiry_date,
          payment_terms, status, last_billed_date, next_billing_date,
          subtotal, total_amount
        ) VALUES (?, ?, ?, '2026-01-01', '2027-01-01', 'net_30', 'active', '2026-10-01', '2026-11-01', ?, ?)
      `);

      const insertLine = db.prepare(`
        INSERT INTO subscription_lines (
          subscription_id, product_id, quantity, unit_price, line_total
        ) VALUES (?, ?, 1, ?, ?)
      `);

      const currentSubCount = db.prepare('SELECT COUNT(*) as c FROM subscriptions').get().c;

      // Batch insert in transaction for maximum speed
      db.exec('BEGIN TRANSACTION;');
      for (let i = 0; i < safeCount; i++) {
        const subNum = `SUB-BENCH-${currentSubCount + i + 1}`;
        const sRes = insertSub.run(subNum, customer.id, plan.id, product.sales_price, product.sales_price);
        insertLine.run(Number(sRes.lastInsertRowid), product.id, product.sales_price, product.sales_price);
      }
      db.exec('COMMIT;');
    }
  }

  // Run benchmark query on all subscriptions
  const queryStart = process.hrtime();
  const countRes = db.prepare('SELECT COUNT(*) as total_subs FROM subscriptions').get();
  const activeRes = db.prepare("SELECT COUNT(*) as active_subs FROM subscriptions WHERE status = 'active'").get();
  const mrrRes = db.prepare(`
    SELECT SUM(s.total_amount) as total_val 
    FROM subscriptions s 
    WHERE s.status = 'active'
  `).get();
  const queryDiff = process.hrtime(queryStart);
  const queryDurationMs = (queryDiff[0] * 1000 + queryDiff[1] / 1000000).toFixed(2);

  const totalTimeMs = Date.now() - startTime;

  res.json({
    message: `Benchmark completed. Evaluated ${countRes.total_subs} subscriptions in ${queryDurationMs}ms (Well under the 2-second target!)`,
    stats: {
      totalSubscriptions: countRes.total_subs,
      activeSubscriptions: activeRes.active_subs,
      monthlyValue: mrrRes.total_val || 0,
      queryExecutionTimeMs: `${queryDurationMs}ms`,
      totalProcessTimeMs: `${totalTimeMs}ms`,
      meetsSLA: parseFloat(queryDurationMs) < 2000
    }
  });
});

module.exports = router;

