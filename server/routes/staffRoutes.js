// server/routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const {
  validatePassword,
  hashPassword,
  authenticateToken,
  requireRole
} = require('../auth');

// List staff and admins (Admin and staff can view staff list)
router.get('/', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const staff = db.prepare(`
    SELECT id, email, name, role, company_name, phone, created_at 
    FROM users 
    WHERE role IN ('admin', 'staff')
    ORDER BY role ASC, name ASC
  `).all();
  res.json({ staff });
});

// Admin creates a new staff member (Admin ONLY!)
router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { email, password, name, role, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const assignedRole = role === 'admin' ? 'admin' : 'staff';

  const pwdValidation = validatePassword(password);
  if (!pwdValidation.valid) {
    return res.status(400).json({ error: pwdValidation.message });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'A user with this email already exists' });
  }

  const pwdHash = hashPassword(password);

  try {
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, role, phone)
      VALUES (?, ?, ?, ?, ?)
    `).run(email.trim().toLowerCase(), pwdHash, name.trim(), assignedRole, phone || null);

    const newStaff = {
      id: Number(result.lastInsertRowid),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: assignedRole,
      phone: phone || null
    };

    db.prepare(`
      INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
      VALUES (?, 'staff', ?, 'create_staff', ?)
    `).run(req.user.id, newStaff.id, `Created staff member ${newStaff.name} with role ${assignedRole}`);

    res.status(201).json({
      message: 'Staff member created successfully',
      staff: newStaff
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create staff: ' + err.message });
  }
});

// Admin deletes staff member
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account' });
  }

  const target = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(targetId);
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);

  db.prepare(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (?, 'staff', ?, 'delete_staff', ?)
  `).run(req.user.id, targetId, `Deleted staff member ${target.name}`);

  res.json({ message: 'Staff member removed successfully' });
});

// List all customers (for sales reps and admin when selecting a customer)
router.get('/customers', authenticateToken, requireRole('admin', 'staff'), (req, res) => {
  const customers = db.prepare(`
    SELECT id, email, name, role, company_name, phone, address, created_at,
           (SELECT COUNT(*) FROM subscriptions WHERE customer_id = users.id AND status = 'active') as active_subs_count
    FROM users 
    WHERE role = 'customer'
    ORDER BY name ASC
  `).all();
  res.json({ customers });
});

module.exports = router;

