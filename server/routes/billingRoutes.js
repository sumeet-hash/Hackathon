// server/routes/billingRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../auth');
const { runBillingCycle } = require('../billingEngine');

// Preview subscriptions that are due for billing on a given date
router.get('/preview', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];

  const dueSubscriptions = db.prepare(`
    SELECT s.id, s.subscription_number, s.status, s.start_date, s.expiry_date,
           s.last_billed_date, s.next_billing_date, s.total_amount,
           u.name as customer_name, u.email as customer_email,
           p.name as plan_name, p.billing_frequency, p.auto_close_on_end
    FROM subscriptions s
    JOIN users u ON s.customer_id = u.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status = 'active'
      AND (s.next_billing_date IS NULL OR s.next_billing_date <= ?)
    ORDER BY s.next_billing_date ASC
  `).all(targetDate);

  res.json({
    targetDate,
    dueCount: dueSubscriptions.length,
    dueSubscriptions
  });
});

// Execute the Billing Cycle
router.post('/run', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const { targetDate } = req.body;

  try {
    const result = runBillingCycle(targetDate || null, req.user.id);
    res.json({
      message: `Billing day executed successfully! Processed ${result.subscriptionsProcessed} subscriptions, generated ${result.invoicesGenerated} invoices.`,
      result
    });
  } catch (err) {
    res.status(500).json({ error: 'Billing execution failed: ' + err.message });
  }
});

// Billing run logs / history
router.get('/history', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const runs = db.prepare(`
    SELECT br.*, u.name as run_by_name
    FROM billing_runs br
    LEFT JOIN users u ON br.run_by_user_id = u.id
    ORDER BY br.id DESC
    LIMIT 50
  `).all();

  res.json({ runs });
});

module.exports = router;

