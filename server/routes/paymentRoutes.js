// server/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../auth');

function generatePaymentNumber() {
  const currentYear = new Date().getFullYear();
  const row = db.prepare(`
    SELECT payment_number FROM payments 
    WHERE payment_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`PAY-${currentYear}-%`);

  if (!row) {
    return `PAY-${currentYear}-0001`;
  }

  const parts = row.payment_number.split('-');
  const seq = parseInt(parts[2], 10) + 1;
  return `PAY-${currentYear}-${String(seq).padStart(4, '0')}`;
}

// Get all payments (filtered by customer for customer role)
router.get('/', authenticateToken, (req, res) => {
  const { customer_id, invoice_id, limit = 100, offset = 0 } = req.query;

  let whereClauses = [];
  let params = [];

  if (req.user.role === 'customer') {
    whereClauses.push('p.customer_id = ?');
    params.push(req.user.id);
  } else if (customer_id) {
    whereClauses.push('p.customer_id = ?');
    params.push(parseInt(customer_id, 10));
  }

  if (invoice_id) {
    whereClauses.push('p.invoice_id = ?');
    params.push(parseInt(invoice_id, 10));
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const payments = db.prepare(`
    SELECT p.*, 
           i.invoice_number, i.total_amount as invoice_total,
           u.name as customer_name, u.email as customer_email,
           rec.name as recorded_by_name
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN users u ON p.customer_id = u.id
    LEFT JOIN users rec ON p.recorded_by_user_id = rec.id
    ${whereStr}
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit, 10), parseInt(offset, 10));

  res.json({ payments });
});

// Record a payment against an invoice (Staff/Admin or Customer self-checkout)
router.post('/', authenticateToken, (req, res) => {
  const { invoice_id, amount, payment_method, payment_date, reference_note } = req.body;

  if (!invoice_id || amount === undefined || !payment_method) {
    return res.status(400).json({ error: 'Invoice ID, amount, and payment method are required' });
  }

  const payAmount = parseFloat(amount);
  if (payAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero' });
  }

  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(parseInt(invoice_id, 10));
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  // Customer role check: customer can only pay their own invoice
  if (req.user.role === 'customer' && inv.customer_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this invoice' });
  }

  if (inv.status === 'cancelled') {
    return res.status(400).json({ error: 'Cannot apply payment to a cancelled invoice' });
  }

  if (inv.balance_due <= 0 && inv.status === 'paid') {
    return res.status(400).json({ error: 'This invoice is already fully paid' });
  }

  const dateToUse = payment_date || new Date().toISOString().split('T')[0];
  const payNumber = generatePaymentNumber();

  // Create payment record
  const result = db.prepare(`
    INSERT INTO payments (
      payment_number, invoice_id, customer_id, amount,
      payment_method, payment_date, reference_note, recorded_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payNumber,
    inv.id,
    inv.customer_id,
    payAmount,
    payment_method,
    dateToUse,
    reference_note || null,
    req.user.id
  );

  const paymentId = Number(result.lastInsertRowid);

  // Update invoice balance and status
  const newAmountPaid = Math.round((inv.amount_paid + payAmount) * 100) / 100;
  const newBalanceDue = Math.max(0, Math.round((inv.total_amount - newAmountPaid) * 100) / 100);
  const newStatus = newBalanceDue <= 0 ? 'paid' : (inv.status === 'draft' ? 'confirmed' : inv.status);

  db.prepare(`
    UPDATE invoices 
    SET amount_paid = ?, balance_due = ?, status = ?
    WHERE id = ?
  `).run(newAmountPaid, newBalanceDue, newStatus, inv.id);

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (?, 'payment', ?, 'record_payment', ?)
  `).run(
    req.user.id,
    paymentId,
    `Payment ${payNumber} of $${payAmount.toFixed(2)} recorded via ${payment_method} for Invoice ${inv.invoice_number}`
  );

  // Simulated email receipt
  const customer = db.prepare('SELECT email, name FROM users WHERE id = ?').get(inv.customer_id);
  if (customer) {
    const receiptBody = `
Dear ${customer.name},

We have successfully received your payment of $${payAmount.toFixed(2)} for invoice ${inv.invoice_number}.
Payment Method: ${payment_method}
Reference: ${payNumber} ${reference_note ? `(${reference_note})` : ''}
Remaining Balance on Invoice: $${newBalanceDue.toFixed(2)}

Thank you for your business!
Brightloop Software Finance Team
    `.trim();

    db.prepare(`
      INSERT INTO simulated_emails (to_email, subject, body, email_type, metadata_json)
      VALUES (?, ?, ?, 'payment_receipt', ?)
    `).run(
      customer.email,
      `Payment Receipt [${payNumber}] for Invoice ${inv.invoice_number}`,
      receiptBody,
      JSON.stringify({ paymentId, paymentNumber: payNumber, invoiceId: inv.id })
    );
  }

  res.status(201).json({
    message: 'Payment recorded successfully',
    paymentNumber: payNumber,
    newBalanceDue,
    newStatus
  });
});

module.exports = router;

