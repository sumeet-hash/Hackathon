// server/billingEngine.js
const { db } = require('./db');

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().split('T')[0];
}

function calculateNextDate(startDate, frequency) {
  switch (frequency) {
    case 'daily':
      return addDays(startDate, 1);
    case 'weekly':
      return addDays(startDate, 7);
    case 'monthly':
      return addMonths(startDate, 1);
    case 'yearly':
      return addMonths(startDate, 12);
    default:
      return addMonths(startDate, 1);
  }
}

function calculateDueDate(invoiceDate, paymentTerms) {
  switch (paymentTerms) {
    case 'immediate':
      return invoiceDate;
    case 'net_15':
      return addDays(invoiceDate, 15);
    case 'net_30':
      return addDays(invoiceDate, 30);
    case 'net_60':
      return addDays(invoiceDate, 60);
    default:
      return addDays(invoiceDate, 30);
  }
}

function generateInvoiceNumber() {
  const currentYear = new Date().getFullYear();
  const row = db.prepare(`
    SELECT invoice_number FROM invoices 
    WHERE invoice_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`INV-${currentYear}-%`);

  if (!row) {
    return `INV-${currentYear}-0001`;
  }

  const parts = row.invoice_number.split('-');
  const seq = parseInt(parts[2], 10) + 1;
  return `INV-${currentYear}-${String(seq).padStart(4, '0')}`;
}

/**
 * Checks and applies active discount rules for either a product or the whole subscription
 */
function evaluateDiscount(discountId, { subtotal, quantity, dateStr, isSubscription = false }) {
  if (!discountId) return null;
  const discount = db.prepare('SELECT * FROM discounts WHERE id = ?').get(discountId);
  if (!discount || !discount.is_active) return null;

  // Date validity check
  if (discount.start_date > dateStr) return null;
  if (discount.end_date && discount.end_date < dateStr) return null;

  // Usage limit check
  if (discount.usage_limit !== null && discount.usage_limit !== undefined) {
    if (discount.times_used >= discount.usage_limit) return null;
  }

  // Minimum purchase check
  if (discount.min_purchase_amount && subtotal < discount.min_purchase_amount) return null;

  // Minimum quantity check
  if (discount.min_quantity && quantity < discount.min_quantity) return null;

  let amount = 0;
  if (discount.discount_type === 'percentage') {
    amount = (subtotal * discount.discount_value) / 100;
  } else {
    amount = Math.min(subtotal, discount.discount_value);
  }

  return {
    discount,
    amount: Math.round(amount * 100) / 100
  };
}

/**
 * Run billing for a given target date (defaults to today's date YYYY-MM-DD)
 */
function runBillingCycle(targetDate = null, triggeredByUserId = null) {
  const today = targetDate || new Date().toISOString().split('T')[0];

  // 1. Find all active subscriptions whose next_billing_date <= today
  const candidateSubs = db.prepare(`
    SELECT s.*, 
           p.billing_frequency, p.auto_close_on_end as plan_auto_close,
           u.email as customer_email, u.name as customer_name
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    JOIN users u ON s.customer_id = u.id
    WHERE s.status = 'active'
      AND (s.next_billing_date IS NULL OR s.next_billing_date <= ?)
  `).all(today);

  let processedCount = 0;
  let invoicesGenerated = 0;
  let totalBilledAmount = 0;
  const logs = [];

  for (const sub of candidateSubs) {
    processedCount++;

    const periodStart = sub.next_billing_date || sub.start_date;
    const periodEnd = calculateNextDate(periodStart, sub.billing_frequency);

    // Auto-close check: if subscription reached expiry and auto_close_on_end is true
    const shouldAutoClose = (sub.auto_close_on_end || sub.plan_auto_close) && sub.expiry_date && periodStart >= sub.expiry_date;
    if (shouldAutoClose) {
      db.prepare(`UPDATE subscriptions SET status = 'closed', updated_at = datetime('now') WHERE id = ?`).run(sub.id);
      logs.push(`Subscription ${sub.subscription_number} expired and was automatically closed.`);
      continue;
    }

    // Idempotency check: Don't bill twice for the same billing period
    const existing = db.prepare(`
      SELECT id FROM invoices 
      WHERE subscription_id = ? AND billing_period_start = ? AND status != 'cancelled'
    `).get(sub.id, periodStart);

    if (existing) {
      logs.push(`Subscription ${sub.subscription_number} already billed for period ${periodStart} (Invoice ID: ${existing.id}). Skipping.`);
      // Advance next_billing_date if stuck
      if (sub.next_billing_date <= today) {
        db.prepare('UPDATE subscriptions SET next_billing_date = ?, updated_at = datetime("now") WHERE id = ?').run(periodEnd, sub.id);
      }
      continue;
    }

    // Fetch subscription line items
    const lines = db.prepare(`
      SELECT sl.*, p.name as product_name, pv.variant_value, pv.attribute_name,
             t.rate as tax_rate, t.name as tax_name
      FROM subscription_lines sl
      JOIN products p ON sl.product_id = p.id
      LEFT JOIN product_variants pv ON sl.variant_id = pv.id
      LEFT JOIN taxes t ON sl.tax_id = t.id
      WHERE sl.subscription_id = ?
    `).all(sub.id);

    if (lines.length === 0) {
      logs.push(`Subscription ${sub.subscription_number} has no lines. Skipping.`);
      continue;
    }

    let invoiceSubtotal = 0;
    let invoiceTaxTotal = 0;
    let invoiceDiscountTotal = 0;
    const invoiceLinesToInsert = [];
    const usedDiscountIds = new Set();

    for (const line of lines) {
      const lineSubtotal = line.quantity * line.unit_price;
      invoiceSubtotal += lineSubtotal;

      // Check product-specific active discount
      const productDiscount = db.prepare(`
        SELECT * FROM discounts 
        WHERE is_active = 1 
          AND scope = 'product' 
          AND target_product_id = ?
          AND start_date <= ?
          AND (end_date IS NULL OR end_date >= ?)
          AND (usage_limit IS NULL OR times_used < usage_limit)
        LIMIT 1
      `).get(line.product_id, today, today);

      let lineDiscount = 0;
      if (productDiscount) {
        const evalRes = evaluateDiscount(productDiscount.id, {
          subtotal: lineSubtotal,
          quantity: line.quantity,
          dateStr: today
        });
        if (evalRes) {
          lineDiscount = evalRes.amount;
          usedDiscountIds.add(productDiscount.id);
        }
      }

      invoiceDiscountTotal += lineDiscount;
      const taxableAmount = Math.max(0, lineSubtotal - lineDiscount);
      const taxRate = line.tax_rate || 0;
      const lineTax = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
      invoiceTaxTotal += lineTax;

      const lineTotal = taxableAmount + lineTax;

      let desc = line.product_name;
      if (line.variant_value) {
        desc += ` (${line.attribute_name || 'Variant'}: ${line.variant_value})`;
      }

      invoiceLinesToInsert.push({
        product_id: line.product_id,
        variant_id: line.variant_id,
        description: desc,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_id: line.tax_id,
        tax_rate: taxRate,
        tax_amount: lineTax,
        discount_amount: lineDiscount,
        line_total: lineTotal
      });
    }

    // Apply subscription-level discount if present on subscription
    if (sub.discount_id) {
      const subTotalQty = lines.reduce((acc, l) => acc + l.quantity, 0);
      const evalRes = evaluateDiscount(sub.discount_id, {
        subtotal: invoiceSubtotal,
        quantity: subTotalQty,
        dateStr: today,
        isSubscription: true
      });
      if (evalRes) {
        invoiceDiscountTotal += evalRes.amount;
        usedDiscountIds.add(sub.discount_id);
      }
    }

    const totalAmount = Math.max(0, Math.round((invoiceSubtotal - invoiceDiscountTotal + invoiceTaxTotal) * 100) / 100);
    const invoiceNumber = generateInvoiceNumber();
    const dueDate = calculateDueDate(today, sub.payment_terms);

    // Create the invoice (starts as 'draft' so staff can review/confirm/send, as stated in scene)
    const invRes = db.prepare(`
      INSERT INTO invoices (
        invoice_number, subscription_id, customer_id, invoice_date, due_date,
        payment_terms, status, billing_period_start, billing_period_end,
        subtotal, tax_total, discount_total, total_amount, amount_paid, balance_due, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, 0.0, ?, ?)
    `).run(
      invoiceNumber,
      sub.id,
      sub.customer_id,
      today,
      dueDate,
      sub.payment_terms,
      periodStart,
      periodEnd,
      invoiceSubtotal,
      invoiceTaxTotal,
      invoiceDiscountTotal,
      totalAmount,
      totalAmount,
      `Generated from subscription ${sub.subscription_number} for period ${periodStart} to ${periodEnd}`
    );

    const invoiceId = invRes.lastInsertRowid;

    // Insert invoice lines
    const insertLine = db.prepare(`
      INSERT INTO invoice_lines (
        invoice_id, product_id, variant_id, description, quantity,
        unit_price, tax_id, tax_rate, tax_amount, discount_amount, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const il of invoiceLinesToInsert) {
      insertLine.run(
        invoiceId,
        il.product_id,
        il.variant_id,
        il.description,
        il.quantity,
        il.unit_price,
        il.tax_id,
        il.tax_rate,
        il.tax_amount,
        il.discount_amount,
        il.line_total
      );
    }

    // Increment usage for applied discounts
    for (const discId of usedDiscountIds) {
      db.prepare('UPDATE discounts SET times_used = times_used + 1 WHERE id = ?').run(discId);
    }

    // Advance subscription billing dates
    db.prepare(`
      UPDATE subscriptions 
      SET last_billed_date = ?, next_billing_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(periodStart, periodEnd, sub.id);

    // Check if after this cycle, the subscription has ended and should close
    if ((sub.auto_close_on_end || sub.plan_auto_close) && sub.expiry_date && periodEnd >= sub.expiry_date) {
      db.prepare(`UPDATE subscriptions SET status = 'closed', updated_at = datetime('now') WHERE id = ?`).run(sub.id);
      logs.push(`Subscription ${sub.subscription_number} reached expiry date (${sub.expiry_date}) and is now closed.`);
    }

    invoicesGenerated++;
    totalBilledAmount += totalAmount;
    logs.push(`Generated Invoice ${invoiceNumber} for ${sub.customer_name} ($${totalAmount.toFixed(2)})`);
  }

  // Record billing run record
  const runRes = db.prepare(`
    INSERT INTO billing_runs (
      run_date, target_billing_date, subscriptions_processed,
      invoices_generated, total_amount_billed, status, run_by_user_id, log_details
    ) VALUES (datetime('now'), ?, ?, ?, ?, 'completed', ?, ?)
  `).run(
    today,
    processedCount,
    invoicesGenerated,
    totalBilledAmount,
    triggeredByUserId,
    JSON.stringify(logs)
  );

  return {
    runId: runRes.lastInsertRowid,
    targetDate: today,
    subscriptionsProcessed: processedCount,
    invoicesGenerated,
    totalBilledAmount,
    logs
  };
}

module.exports = {
  runBillingCycle,
  calculateDueDate,
  calculateNextDate,
  generateInvoiceNumber,
  evaluateDiscount
};

