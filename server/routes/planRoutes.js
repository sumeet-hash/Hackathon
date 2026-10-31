// server/routes/planRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../auth');

// Get all plans
router.get('/', authenticateToken, (req, res) => {
  const plans = db.prepare(`
    SELECT p.*,
           (SELECT COUNT(*) FROM subscriptions WHERE plan_id = p.id AND status = 'active') as active_subscriptions_count
    FROM plans p
    ORDER BY p.name ASC
  `).all();
  res.json({ plans });
});

// Admin creates plan
router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const {
    name,
    code,
    cost,
    billing_frequency,
    min_quantity,
    start_date,
    end_date,
    auto_close_on_end,
    can_close_early,
    can_pause,
    can_renew,
    description
  } = req.body;

  if (!name || !code || cost === undefined || !billing_frequency || !start_date) {
    return res.status(400).json({ error: 'Name, code, cost, billing frequency, and start date are required' });
  }

  const existing = db.prepare('SELECT id FROM plans WHERE code = ?').get(code.trim().toUpperCase());
  if (existing) {
    return res.status(400).json({ error: 'Plan code already exists' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO plans (
        name, code, cost, billing_frequency, min_quantity, start_date, end_date,
        auto_close_on_end, can_close_early, can_pause, can_renew, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      code.trim().toUpperCase(),
      parseFloat(cost) || 0,
      billing_frequency,
      parseInt(min_quantity, 10) || 1,
      start_date,
      end_date || null,
      auto_close_on_end ? 1 : 0,
      can_close_early !== undefined ? (can_close_early ? 1 : 0) : 1,
      can_pause !== undefined ? (can_pause ? 1 : 0) : 1,
      can_renew !== undefined ? (can_renew ? 1 : 0) : 1,
      description || null
    );

    const newPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(Number(result.lastInsertRowid));

    db.prepare(`
      INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
      VALUES (?, 'plan', ?, 'create_plan', ?)
    `).run(req.user.id, newPlan.id, `Admin created plan: ${newPlan.name} (${newPlan.code})`);

    res.status(201).json({ message: 'Plan created successfully', plan: newPlan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create plan: ' + err.message });
  }
});

// Admin updates plan
router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    name,
    cost,
    billing_frequency,
    min_quantity,
    start_date,
    end_date,
    auto_close_on_end,
    can_close_early,
    can_pause,
    can_renew,
    description,
    is_active
  } = req.body;

  db.prepare(`
    UPDATE plans
    SET name = COALESCE(?, name),
        cost = COALESCE(?, cost),
        billing_frequency = COALESCE(?, billing_frequency),
        min_quantity = COALESCE(?, min_quantity),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        auto_close_on_end = COALESCE(?, auto_close_on_end),
        can_close_early = COALESCE(?, can_close_early),
        can_pause = COALESCE(?, can_pause),
        can_renew = COALESCE(?, can_renew),
        description = COALESCE(?, description),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    name !== undefined ? name.trim() : null,
    cost !== undefined ? parseFloat(cost) : null,
    billing_frequency || null,
    min_quantity !== undefined ? parseInt(min_quantity, 10) : null,
    start_date || null,
    end_date !== undefined ? end_date : null,
    auto_close_on_end !== undefined ? (auto_close_on_end ? 1 : 0) : null,
    can_close_early !== undefined ? (can_close_early ? 1 : 0) : null,
    can_pause !== undefined ? (can_pause ? 1 : 0) : null,
    can_renew !== undefined ? (can_renew ? 1 : 0) : null,
    description !== undefined ? description : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    id
  );

  res.json({ message: 'Plan updated successfully' });
});

// Admin deletes plan
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('UPDATE plans SET is_active = 0 WHERE id = ?').run(id);
  res.json({ message: 'Plan archived' });
});

module.exports = router;

