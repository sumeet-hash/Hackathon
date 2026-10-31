// server/routes/subscriptionRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../auth');
const { calculateNextDate, evaluateDiscount } = require('../billingEngine');

function generateSubscriptionNumber() {
  const currentYear = new Date().getFullYear();
  const row = db.prepare(`
    SELECT subscription_number FROM subscriptions 
    WHERE subscription_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`SUB-${currentYear}-%`);

  if (!row) {
    return `SUB-${currentYear}-0001`;
  }

  const parts = row.subscription_number.split('-');
  const seq = parseInt(parts[2], 10) + 1;
  return `SUB-${currentYear}-${String(seq).padStart(4, '0')}`;
}

// Get subscriptions list (filtered for customers, full list with filters for staff/admin)
router.get('/', authenticateToken, (req, res) => {
  const { status, plan_id, customer_id, search, limit = 100, offset = 0 } = req.query;

  let whereClauses = [];
  let params = [];

  // Role check: customers can ONLY see their own subscriptions
  if (req.user.role === 'customer') {
    whereClauses.push('s.customer_id = ?');
    params.push(req.user.id);
  } else {
    if (customer_id) {
      whereClauses.push('s.customer_id = ?');
      params.push(parseInt(customer_id, 10));
    }
  }

  if (status) {
    whereClauses.push('s.status = ?');
    params.push(status);
  }

  if (plan_id) {
    whereClauses.push('s.plan_id = ?');
    params.push(parseInt(plan_id, 10));
  }

  if (search) {
    whereClauses.push('(s.subscription_number LIKE ? OR u.name LIKE ? OR u.company_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = db.prepare(`
    SELECT COUNT(*) as total 
    FROM subscriptions s
    JOIN users u ON s.customer_id = u.id
    ${whereStr}
  `).get(...params);

  const query = `
    SELECT s.*, 
           u.name as customer_name, u.email as customer_email, u.company_name,
           p.name as plan_name, p.code as plan_code, p.billing_frequency,
           p.auto_close_on_end as plan_auto_close, p.can_close_early, p.can_pause, p.can_renew,
           sr.name as sales_rep_name,
           d.code as discount_code, d.discount_value, d.discount_type
    FROM subscriptions s
    JOIN users u ON s.customer_id = u.id
    JOIN plans p ON s.plan_id = p.id
    LEFT JOIN users sr ON s.sales_rep_id = sr.id
    LEFT JOIN discounts d ON s.discount_id = d.id
    ${whereStr}
    ORDER BY s.id DESC
    LIMIT ? OFFSET ?
  `;

  const subscriptions = db.prepare(query).all(...params, parseInt(limit, 10), parseInt(offset, 10));

  res.json({
    total: countRow.total,
    subscriptions
  });
});

// Get single subscription detail with line items, plan policies, and invoice history
router.get('/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);

  const sub = db.prepare(`
    SELECT s.*, 
           u.name as customer_name, u.email as customer_email, u.company_name, u.phone, u.address,
           p.name as plan_name, p.code as plan_code, p.billing_frequency, p.cost as plan_cost,
           p.auto_close_on_end as plan_auto_close, p.can_close_early, p.can_pause, p.can_renew,
           sr.name as sales_rep_name,
           d.code as discount_code, d.name as discount_name, d.discount_value, d.discount_type
    FROM subscriptions s
    JOIN users u ON s.customer_id = u.id
    JOIN plans p ON s.plan_id = p.id
    LEFT JOIN users sr ON s.sales_rep_id = sr.id
    LEFT JOIN discounts d ON s.discount_id = d.id
    WHERE s.id = ?
  `).get(id);

  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  // Customer access check
  if (req.user.role === 'customer' && sub.customer_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this subscription' });
  }

  // Lines
  const lines = db.prepare(`
    SELECT sl.*, pr.name as product_name, pr.type as product_type,
           pv.variant_value, pv.attribute_name, pv.price_extra,
           t.name as tax_name, t.rate as tax_rate
    FROM subscription_lines sl
    JOIN products pr ON sl.product_id = pr.id
    LEFT JOIN product_variants pv ON sl.variant_id = pv.id
    LEFT JOIN taxes t ON sl.tax_id = t.id
    WHERE sl.subscription_id = ?
  `).all(id);

  // Invoices for this subscription
  const invoices = db.prepare(`
    SELECT * FROM invoices 
    WHERE subscription_id = ? 
    ORDER BY id DESC
  `).all(id);

  res.json({
    subscription: sub,
    lines,
    invoices
  });
});

// Create subscription (Staff / Admin creates or Customer selects plan)
router.post('/', authenticateToken, (req, res) => {
  const {
    customer_id,
    plan_id,
    start_date,
    expiry_date,
    payment_terms,
    status = 'draft',
    discount_id,
    notes,
    lines
  } = req.body;

  let assignedCustomerId = customer_id;
  if (req.user.role === 'customer') {
    assignedCustomerId = req.user.id;
  } else if (!assignedCustomerId) {
    return res.status(400).json({ error: 'Customer is required' });
  }

  if (!plan_id || !start_date) {
    return res.status(400).json({ error: 'Plan and start date are required' });
  }

  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(parseInt(plan_id, 10));
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const subNumber = generateSubscriptionNumber();
  const salesRepId = req.user.role !== 'customer' ? req.user.id : null;

  // Next billing date is initially the start date if active/confirmed
  let nextBillingDate = start_date;

  const result = db.prepare(`
    INSERT INTO subscriptions (
      subscription_number, customer_id, sales_rep_id, plan_id,
      start_date, expiry_date, payment_terms, status,
      next_billing_date, auto_close_on_end, discount_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    subNumber,
    parseInt(assignedCustomerId, 10),
    salesRepId,
    plan.id,
    start_date,
    expiry_date || null,
    payment_terms || 'net_30',
    status,
    nextBillingDate,
    plan.auto_close_on_end,
    discount_id ? parseInt(discount_id, 10) : null,
    notes || null
  );

  const subId = Number(result.lastInsertRowid);

  // Insert lines and recalculate totals
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  if (Array.isArray(lines) && lines.length > 0) {
    const insertLine = db.prepare(`
      INSERT INTO subscription_lines (
        subscription_id, product_id, variant_id, quantity,
        unit_price, tax_id, tax_amount, discount_amount, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const l of lines) {
      const qty = parseInt(l.quantity, 10) || 1;
      const unitPrice = parseFloat(l.unit_price) || 0;
      const lineSubtotal = qty * unitPrice;
      subtotal += lineSubtotal;

      let lineTax = 0;
      if (l.tax_id) {
        const tax = db.prepare('SELECT rate FROM taxes WHERE id = ?').get(l.tax_id);
        if (tax) {
          lineTax = Math.round(((lineSubtotal * tax.rate) / 100) * 100) / 100;
        }
      }
      taxTotal += lineTax;

      const lineTotal = lineSubtotal + lineTax;

      insertLine.run(
        subId,
        parseInt(l.product_id, 10),
        l.variant_id ? parseInt(l.variant_id, 10) : null,
        qty,
        unitPrice,
        l.tax_id ? parseInt(l.tax_id, 10) : null,
        lineTax,
        0,
        lineTotal
      );
    }
  }

  // Check subscription discount
  if (discount_id) {
    const evalRes = evaluateDiscount(discount_id, {
      subtotal,
      quantity: lines ? lines.reduce((acc, l) => acc + (parseInt(l.quantity, 10) || 1), 0) : 1,
      dateStr: start_date,
      isSubscription: true
    });
    if (evalRes) {
      discountTotal = evalRes.amount;
    }
  }

  const grandTotal = Math.max(0, Math.round((subtotal - discountTotal + taxTotal) * 100) / 100);

  db.prepare(`
    UPDATE subscriptions 
    SET subtotal = ?, tax_total = ?, discount_total = ?, total_amount = ? 
    WHERE id = ?
  `).run(subtotal, taxTotal, discountTotal, grandTotal, subId);

  db.prepare(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (?, 'subscription', ?, 'create_subscription', ?)
  `).run(req.user.id, subId, `Created subscription ${subNumber} in status ${status}`);

  res.status(201).json({
    message: 'Subscription created successfully',
    subscriptionId: subId,
    subscriptionNumber: subNumber
  });
});

// State transitions: Draft -> Quotation -> Confirmed -> Active -> Closed (or Pause / Resume / Renew)
router.post('/:id/transition', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { action, new_expiry_date } = req.body;

  const sub = db.prepare(`
    SELECT s.*, p.billing_frequency, p.auto_close_on_end as plan_auto_close,
           p.can_close_early, p.can_pause, p.can_renew
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.id = ?
  `).get(id);

  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  // Role checks for transitions:
  // Customer can only pause, resume, renew, or close_early if plan policy permits!
  if (req.user.role === 'customer') {
    if (sub.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (action === 'pause' && !sub.can_pause) {
      return res.status(400).json({ error: 'This plan does not permit pausing subscriptions.' });
    }
    if (action === 'close_early' && !sub.can_close_early) {
      return res.status(400).json({ error: 'This plan does not permit early closure.' });
    }
    if (action === 'renew' && !sub.can_renew) {
      return res.status(400).json({ error: 'This plan does not permit renewals.' });
    }
    if (!['pause', 'resume', 'close_early', 'renew'].includes(action)) {
      return res.status(403).json({ error: 'Customers can only pause, resume, renew, or close subscriptions.' });
    }
  }

  let newStatus = sub.status;
  let logMessage = '';

  switch (action) {
    case 'to_quotation':
      if (sub.status !== 'draft') {
        return res.status(400).json({ error: `Cannot send quotation from status ${sub.status}` });
      }
      newStatus = 'quotation';
      logMessage = `Moved to Quotation`;
      break;

    case 'confirm':
      if (!['draft', 'quotation'].includes(sub.status)) {
        return res.status(400).json({ error: `Cannot confirm from status ${sub.status}` });
      }
      newStatus = 'confirmed';
      logMessage = `Quotation confirmed by sales/customer`;
      break;

    case 'activate':
      if (!['draft', 'quotation', 'confirmed'].includes(sub.status)) {
        return res.status(400).json({ error: `Cannot activate from status ${sub.status}` });
      }
      newStatus = 'active';
      // If next_billing_date is null, set to start_date or today
      if (!sub.next_billing_date) {
        db.prepare('UPDATE subscriptions SET next_billing_date = ? WHERE id = ?').run(sub.start_date, sub.id);
      }
      logMessage = `Subscription activated`;
      break;

    case 'pause':
      if (sub.status !== 'active') {
        return res.status(400).json({ error: 'Only active subscriptions can be paused' });
      }
      newStatus = 'paused';
      logMessage = `Subscription paused by ${req.user.role}`;
      break;

    case 'resume':
      if (sub.status !== 'paused') {
        return res.status(400).json({ error: 'Only paused subscriptions can be resumed' });
      }
      newStatus = 'active';
      logMessage = `Subscription resumed by ${req.user.role}`;
      break;

    case 'close_early':
      if (['closed'].includes(sub.status)) {
        return res.status(400).json({ error: 'Subscription is already closed' });
      }
      newStatus = 'closed';
      logMessage = `Subscription closed early by ${req.user.role}`;
      break;

    case 'renew':
      // Renew extends expiry date or re-activates
      const calculatedNewExpiry = new_expiry_date || calculateNextDate(sub.expiry_date || new Date().toISOString().split('T')[0], sub.billing_frequency);
      db.prepare(`
        UPDATE subscriptions 
        SET status = 'active', expiry_date = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(calculatedNewExpiry, sub.id);

      db.prepare(`
        INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
        VALUES (?, 'subscription', ?, 'renew', ?)
      `).run(req.user.id, sub.id, `Renewed subscription until ${calculatedNewExpiry}`);

      return res.json({
        message: `Subscription successfully renewed until ${calculatedNewExpiry}`,
        new_expiry_date: calculatedNewExpiry,
        status: 'active'
      });

    default:
      return res.status(400).json({ error: 'Unknown transition action' });
  }

  db.prepare(`
    UPDATE subscriptions 
    SET status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newStatus, sub.id);

  db.prepare(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (?, 'subscription', ?, 'transition', ?)
  `).run(req.user.id, sub.id, logMessage);

  res.json({
    message: `Subscription status updated to ${newStatus}`,
    status: newStatus
  });
});

module.exports = router;

