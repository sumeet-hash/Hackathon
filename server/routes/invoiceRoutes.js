// server/routes/invoiceRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../auth');

// List invoices (Customer sees only their own; staff/admin see all with filters for status, overdue, etc.)
router.get('/', authenticateToken, (req, res) => {
  const { status, customer_id, is_overdue, search, limit = 100, offset = 0 } = req.query;
  const today = new Date().toISOString().split('T')[0];

  let whereClauses = [];
  let params = [];

  if (req.user.role === 'customer') {
    whereClauses.push('i.customer_id = ?');
    params.push(req.user.id);
  } else if (customer_id) {
    whereClauses.push('i.customer_id = ?');
    params.push(parseInt(customer_id, 10));
  }

  if (status) {
    whereClauses.push('i.status = ?');
    params.push(status);
  }

  if (is_overdue === 'true') {
    whereClauses.push("i.status IN ('draft', 'confirmed') AND i.due_date < ? AND i.balance_due > 0");
    params.push(today);
  }

  if (search) {
    whereClauses.push('(i.invoice_number LIKE ? OR u.name LIKE ? OR u.company_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = db.prepare(`
    SELECT COUNT(*) as total 
    FROM invoices i
    JOIN users u ON i.customer_id = u.id
    ${whereStr}
  `).get(...params);

  const query = `
    SELECT i.*, 
           u.name as customer_name, u.email as customer_email, u.company_name,
           s.subscription_number,
           CASE 
             WHEN i.status IN ('draft', 'confirmed') AND i.due_date < ? AND i.balance_due > 0 THEN 1 
             ELSE 0 
           END as is_overdue
    FROM invoices i
    JOIN users u ON i.customer_id = u.id
    LEFT JOIN subscriptions s ON i.subscription_id = s.id
    ${whereStr}
    ORDER BY i.id DESC
    LIMIT ? OFFSET ?
  `;

  const invoices = db.prepare(query).all(today, ...params, parseInt(limit, 10), parseInt(offset, 10));

  res.json({
    total: countRow.total,
    invoices
  });
});

// Single invoice detail with line items and payments
router.get('/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const today = new Date().toISOString().split('T')[0];

  const inv = db.prepare(`
    SELECT i.*, 
           u.name as customer_name, u.email as customer_email, u.company_name, u.phone, u.address,
           s.subscription_number,
           CASE 
             WHEN i.status IN ('draft', 'confirmed') AND i.due_date < ? AND i.balance_due > 0 THEN 1 
             ELSE 0 
           END as is_overdue
    FROM invoices i
    JOIN users u ON i.customer_id = u.id
    LEFT JOIN subscriptions s ON i.subscription_id = s.id
    WHERE i.id = ?
  `).get(today, id);

  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  // Customer access check
  if (req.user.role === 'customer' && inv.customer_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const lines = db.prepare(`
    SELECT il.*, p.name as product_name, pv.variant_value, pv.attribute_name,
           t.name as tax_name, t.rate as tax_rate
    FROM invoice_lines il
    LEFT JOIN products p ON il.product_id = p.id
    LEFT JOIN product_variants pv ON il.variant_id = pv.id
    LEFT JOIN taxes t ON il.tax_id = t.id
    WHERE il.invoice_id = ?
  `).all(id);

  const payments = db.prepare(`
    SELECT p.*, u.name as recorded_by_name
    FROM payments p
    LEFT JOIN users u ON p.recorded_by_user_id = u.id
    WHERE p.invoice_id = ?
    ORDER BY p.id DESC
  `).all(id);

  res.json({
    invoice: inv,
    lines,
    payments
  });
});

// Confirm invoice (Moves Draft -> Confirmed)
router.post('/:id/confirm', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  if (inv.status !== 'draft') {
    return res.status(400).json({ error: `Invoice is already in status: ${inv.status}` });
  }

  db.prepare(`UPDATE invoices SET status = 'confirmed' WHERE id = ?`).run(id);

  db.prepare(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (?, 'invoice', ?, 'confirm_invoice', 'Confirmed invoice for payment')
  `).run(req.user.id, id);

  res.json({ message: 'Invoice confirmed', status: 'confirmed' });
});

// Cancel invoice
router.post('/:id/cancel', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  if (inv.status === 'paid') {
    return res.status(400).json({ error: 'Cannot cancel an invoice that has already been paid.' });
  }

  db.prepare(`UPDATE invoices SET status = 'cancelled' WHERE id = ?`).run(id);

  db.prepare(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (?, 'invoice', ?, 'cancel_invoice', 'Cancelled invoice')
  `).run(req.user.id, id);

  res.json({ message: 'Invoice cancelled', status: 'cancelled' });
});

// Send invoice via email simulation
router.post('/:id/send', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const inv = db.prepare(`
    SELECT i.*, u.name as customer_name, u.email as customer_email, u.company_name
    FROM invoices i
    JOIN users u ON i.customer_id = u.id
    WHERE i.id = ?
  `).get(id);

  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  const emailBody = `
Dear ${inv.customer_name},

Thank you for being a customer of Brightloop Software!
Please find your invoice ${inv.invoice_number} details below:

Invoice Number: ${inv.invoice_number}
Invoice Date: ${inv.invoice_date}
Due Date: ${inv.due_date}
Total Amount: $${inv.total_amount.toFixed(2)}
Balance Due: $${inv.balance_due.toFixed(2)}

You can view, download, or pay this invoice anytime via your customer portal:
http://localhost:5173/customer/invoices/${inv.id}

Warm regards,
Brightloop Software Billing Team
  `.trim();

  db.prepare(`
    INSERT INTO simulated_emails (to_email, subject, body, email_type, metadata_json)
    VALUES (?, ?, ?, 'invoice_sent', ?)
  `).run(
    inv.customer_email,
    `Your Brightloop Software Invoice [${inv.invoice_number}]`,
    emailBody,
    JSON.stringify({ invoiceId: inv.id, invoiceNumber: inv.invoice_number })
  );

  db.prepare(`UPDATE invoices SET sent_at = datetime('now') WHERE id = ?`).run(id);

  db.prepare(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (?, 'invoice', ?, 'send_invoice', ?)
  `).run(req.user.id, id, `Sent invoice email to ${inv.customer_email}`);

  res.json({ message: `Invoice sent to ${inv.customer_email}` });
});

// Chase all overdue invoices (Batch reminder)
router.post('/chase-overdue', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const overdueInvoices = db.prepare(`
    SELECT i.*, u.name as customer_name, u.email as customer_email
    FROM invoices i
    JOIN users u ON i.customer_id = u.id
    WHERE i.status IN ('draft', 'confirmed') 
      AND i.due_date < ? 
      AND i.balance_due > 0
  `).all(today);

  let remindedCount = 0;
  for (const inv of overdueInvoices) {
    const reminderBody = `
Dear ${inv.customer_name},

This is an urgent reminder from Brightloop Software regarding invoice ${inv.invoice_number}, which was due on ${inv.due_date}.

Outstanding Amount: $${inv.balance_due.toFixed(2)}

Please settle this payment as soon as possible to avoid service disruption:
http://localhost:5173/customer/invoices/${inv.id}

Thank you,
Brightloop Software Accounts Receivable
    `.trim();

    db.prepare(`
      INSERT INTO simulated_emails (to_email, subject, body, email_type, metadata_json)
      VALUES (?, ?, ?, 'overdue_reminder', ?)
    `).run(
      inv.customer_email,
      `OVERDUE PAYMENT REMINDER: Invoice ${inv.invoice_number}`,
      reminderBody,
      JSON.stringify({ invoiceId: inv.id, overdueDays: Math.floor((new Date(today) - new Date(inv.due_date)) / 86400000) })
    );

    remindedCount++;
  }

  db.prepare(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (?, 'billing', 0, 'chase_overdue', ?)
  `).run(req.user.id, `Sent overdue payment reminders for ${remindedCount} invoices`);

  res.json({
    message: `Payment reminders sent for ${remindedCount} overdue invoices`,
    remindedCount
  });
});

module.exports = router;

