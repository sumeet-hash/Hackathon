// server/routes/quoteTemplateRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../auth');

// Get all quotation templates with line items
router.get('/', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const templates = db.prepare(`
    SELECT qt.*, p.name as plan_name, p.billing_frequency, p.cost as plan_cost
    FROM quotation_templates qt
    JOIN plans p ON qt.plan_id = p.id
    ORDER BY qt.name ASC
  `).all();

  const lines = db.prepare(`
    SELECT qtl.*, pr.name as product_name, pv.variant_value, pv.attribute_name,
           t.rate as tax_rate, t.name as tax_name
    FROM quotation_template_lines qtl
    JOIN products pr ON qtl.product_id = pr.id
    LEFT JOIN product_variants pv ON qtl.variant_id = pv.id
    LEFT JOIN taxes t ON qtl.tax_id = t.id
  `).all();

  const lineMap = {};
  for (const l of lines) {
    if (!lineMap[l.template_id]) lineMap[l.template_id] = [];
    lineMap[l.template_id].push(l);
  }

  const enriched = templates.map(t => ({
    ...t,
    lines: lineMap[t.id] || []
  }));

  res.json({ templates: enriched });
});

// Create quotation template
router.post('/', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const { name, plan_id, validity_days, notes, lines } = req.body;

  if (!name || !plan_id) {
    return res.status(400).json({ error: 'Template name and plan are required' });
  }

  const result = db.prepare(`
    INSERT INTO quotation_templates (name, plan_id, validity_days, notes)
    VALUES (?, ?, ?, ?)
  `).run(
    name.trim(),
    parseInt(plan_id, 10),
    parseInt(validity_days, 10) || 30,
    notes || null
  );

  const templateId = Number(result.lastInsertRowid);

  if (Array.isArray(lines)) {
    const insertLine = db.prepare(`
      INSERT INTO quotation_template_lines (template_id, product_id, variant_id, quantity, unit_price, tax_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const l of lines) {
      insertLine.run(
        templateId,
        parseInt(l.product_id, 10),
        l.variant_id ? parseInt(l.variant_id, 10) : null,
        parseInt(l.quantity, 10) || 1,
        parseFloat(l.unit_price) || 0,
        l.tax_id ? parseInt(l.tax_id, 10) : null
      );
    }
  }

  res.status(201).json({ message: 'Quotation template created', templateId });
});

// Delete quotation template
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM quotation_templates WHERE id = ?').run(id);
  res.json({ message: 'Quotation template deleted' });
});

module.exports = router;

