// server/routes/taxRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../auth');

// Get all taxes
router.get('/', authenticateToken, (req, res) => {
  const taxes = db.prepare('SELECT * FROM taxes WHERE is_active = 1 ORDER BY rate ASC').all();
  res.json({ taxes });
});

// Admin creates tax rule
router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { name, rate, tax_type, is_default } = req.body;

  if (!name || rate === undefined) {
    return res.status(400).json({ error: 'Tax name and rate are required' });
  }

  // If set to default, clear other defaults
  if (is_default) {
    db.prepare('UPDATE taxes SET is_default = 0').run();
  }

  const result = db.prepare(`
    INSERT INTO taxes (name, rate, tax_type, is_default)
    VALUES (?, ?, ?, ?)
  `).run(
    name.trim(),
    parseFloat(rate) || 0,
    tax_type || 'percentage',
    is_default ? 1 : 0
  );

  const newTax = db.prepare('SELECT * FROM taxes WHERE id = ?').get(Number(result.lastInsertRowid));

  db.prepare(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (?, 'tax', ?, 'create_tax', ?)
  `).run(req.user.id, newTax.id, `Created tax rule: ${newTax.name} (${newTax.rate}%)`);

  res.status(201).json({ message: 'Tax rule created', tax: newTax });
});

// Admin updates tax rule
router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, rate, tax_type, is_default, is_active } = req.body;

  if (is_default) {
    db.prepare('UPDATE taxes SET is_default = 0 WHERE id != ?').run(id);
  }

  db.prepare(`
    UPDATE taxes
    SET name = COALESCE(?, name),
        rate = COALESCE(?, rate),
        tax_type = COALESCE(?, tax_type),
        is_default = COALESCE(?, is_default),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    rate !== undefined ? parseFloat(rate) : null,
    tax_type || null,
    is_default !== undefined ? (is_default ? 1 : 0) : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    id
  );

  res.json({ message: 'Tax rule updated' });
});

// Admin deletes tax rule
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('UPDATE taxes SET is_active = 0 WHERE id = ?').run(id);
  res.json({ message: 'Tax rule deactivated' });
});

module.exports = router;

