// server/routes/discountRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../auth');

// Get all discounts
router.get('/', authenticateToken, (req, res) => {
  const discounts = db.prepare(`
    SELECT d.*, p.name as target_product_name
    FROM discounts d
    LEFT JOIN products p ON d.target_product_id = p.id
    ORDER BY d.created_at DESC
  `).all();
  res.json({ discounts });
});

// Admin creates discount rule
router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const {
    code,
    name,
    discount_type,
    discount_value,
    min_purchase_amount,
    min_quantity,
    start_date,
    end_date,
    usage_limit,
    scope,
    target_product_id
  } = req.body;

  if (!code || !name || !discount_type || discount_value === undefined || !start_date || !scope) {
    return res.status(400).json({
      error: 'Code, name, discount type, value, start date, and scope are required'
    });
  }

  const existing = db.prepare('SELECT id FROM discounts WHERE UPPER(code) = UPPER(?)').get(code.trim());
  if (existing) {
    return res.status(400).json({ error: 'Discount code already exists' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO discounts (
        code, name, discount_type, discount_value, min_purchase_amount,
        min_quantity, start_date, end_date, usage_limit, times_used,
        scope, target_product_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      code.trim().toUpperCase(),
      name.trim(),
      discount_type,
      parseFloat(discount_value) || 0,
      parseFloat(min_purchase_amount) || 0,
      parseInt(min_quantity, 10) || 0,
      start_date,
      end_date || null,
      usage_limit ? parseInt(usage_limit, 10) : null,
      scope,
      target_product_id ? parseInt(target_product_id, 10) : null
    );

    const newDiscount = db.prepare('SELECT * FROM discounts WHERE id = ?').get(Number(result.lastInsertRowid));

    db.prepare(`
      INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
      VALUES (?, 'discount', ?, 'create_discount', ?)
    `).run(req.user.id, newDiscount.id, `Admin created discount rule: ${newDiscount.code} (${newDiscount.discount_value}${newDiscount.discount_type === 'percentage' ? '%' : '$'})`);

    res.status(201).json({ message: 'Discount rule created successfully', discount: newDiscount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create discount rule: ' + err.message });
  }
});

// Admin updates discount rule
router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    name,
    discount_type,
    discount_value,
    min_purchase_amount,
    min_quantity,
    start_date,
    end_date,
    usage_limit,
    scope,
    target_product_id,
    is_active
  } = req.body;

  db.prepare(`
    UPDATE discounts
    SET name = COALESCE(?, name),
        discount_type = COALESCE(?, discount_type),
        discount_value = COALESCE(?, discount_value),
        min_purchase_amount = COALESCE(?, min_purchase_amount),
        min_quantity = COALESCE(?, min_quantity),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        usage_limit = COALESCE(?, usage_limit),
        scope = COALESCE(?, scope),
        target_product_id = COALESCE(?, target_product_id),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    discount_type || null,
    discount_value !== undefined ? parseFloat(discount_value) : null,
    min_purchase_amount !== undefined ? parseFloat(min_purchase_amount) : null,
    min_quantity !== undefined ? parseInt(min_quantity, 10) : null,
    start_date || null,
    end_date !== undefined ? end_date : null,
    usage_limit !== undefined ? (usage_limit ? parseInt(usage_limit, 10) : null) : null,
    scope || null,
    target_product_id !== undefined ? (target_product_id ? parseInt(target_product_id, 10) : null) : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    id
  );

  res.json({ message: 'Discount rule updated successfully' });
});

// Admin deletes discount rule
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('UPDATE discounts SET is_active = 0 WHERE id = ?').run(id);
  res.json({ message: 'Discount rule deactivated' });
});

module.exports = router;

