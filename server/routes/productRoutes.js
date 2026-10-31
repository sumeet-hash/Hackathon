// server/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../auth');

// Get all products with variants
router.get('/', authenticateToken, (req, res) => {
  const products = db.prepare(`
    SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC
  `).all();

  const variants = db.prepare(`
    SELECT * FROM product_variants WHERE is_active = 1 ORDER BY attribute_name, variant_value
  `).all();

  const variantMap = {};
  for (const v of variants) {
    if (!variantMap[v.product_id]) {
      variantMap[v.product_id] = [];
    }
    variantMap[v.product_id].push(v);
  }

  const enriched = products.map(p => ({
    ...p,
    variants: variantMap[p.id] || []
  }));

  res.json({ products: enriched });
});

// Admin creates product
router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { name, type, sales_price, cost_price, notes, variants } = req.body;

  if (!name || sales_price === undefined) {
    return res.status(400).json({ error: 'Product name and sales price are required' });
  }

  const result = db.prepare(`
    INSERT INTO products (name, type, sales_price, cost_price, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    type || 'software_license',
    parseFloat(sales_price) || 0,
    parseFloat(cost_price) || 0,
    notes || null
  );

  const productId = Number(result.lastInsertRowid);

  // If variants provided in creation
  if (Array.isArray(variants)) {
    const insertVariant = db.prepare(`
      INSERT INTO product_variants (product_id, attribute_name, variant_value, price_extra, sku)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const v of variants) {
      if (v.attribute_name && v.variant_value) {
        insertVariant.run(
          productId,
          v.attribute_name.trim(),
          v.variant_value.trim(),
          parseFloat(v.price_extra) || 0,
          v.sku || null
        );
      }
    }
  }

  db.prepare(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (?, 'product', ?, 'create_product', ?)
  `).run(req.user.id, productId, `Admin created product: ${name}`);

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  const createdVariants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(productId);

  res.status(201).json({
    message: 'Product created successfully',
    product: { ...created, variants: createdVariants }
  });
});

// Admin updates product
router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, type, sales_price, cost_price, notes, is_active } = req.body;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  db.prepare(`
    UPDATE products 
    SET name = COALESCE(?, name),
        type = COALESCE(?, type),
        sales_price = COALESCE(?, sales_price),
        cost_price = COALESCE(?, cost_price),
        notes = COALESCE(?, notes),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    name !== undefined ? name.trim() : null,
    type || null,
    sales_price !== undefined ? parseFloat(sales_price) : null,
    cost_price !== undefined ? parseFloat(cost_price) : null,
    notes !== undefined ? notes : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    id
  );

  res.json({ message: 'Product updated successfully' });
});

// Admin deletes product
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
  res.json({ message: 'Product archived successfully' });
});

// Admin adds variant to product
router.post('/:id/variants', authenticateToken, requireRole('admin'), (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const { attribute_name, variant_value, price_extra, sku } = req.body;

  if (!attribute_name || !variant_value) {
    return res.status(400).json({ error: 'Attribute name and variant value are required' });
  }

  const result = db.prepare(`
    INSERT INTO product_variants (product_id, attribute_name, variant_value, price_extra, sku)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    productId,
    attribute_name.trim(),
    variant_value.trim(),
    parseFloat(price_extra) || 0,
    sku || null
  );

  const newVariant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ message: 'Variant added successfully', variant: newVariant });
});

// Admin deletes variant
router.delete('/:id/variants/:variantId', authenticateToken, requireRole('admin'), (req, res) => {
  const variantId = parseInt(req.params.variantId, 10);
  db.prepare('DELETE FROM product_variants WHERE id = ?').run(variantId);
  res.json({ message: 'Variant deleted' });
});

module.exports = router;

