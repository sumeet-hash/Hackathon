// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db } = require('../db');
const {
  validatePassword,
  hashPassword,
  comparePassword,
  generateToken,
  authenticateToken
} = require('../auth');

// Customer Sign Up
router.post('/register', (req, res) => {
  const { email, password, name, company_name, phone, address } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email address format' });
  }

  // Password rules check: > 8 chars, uppercase, lowercase, special character
  const pwdValidation = validatePassword(password);
  if (!pwdValidation.valid) {
    return res.status(400).json({ error: pwdValidation.message });
  }

  // Check unique email
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists' });
  }

  const pwdHash = hashPassword(password);

  try {
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, role, company_name, phone, address)
      VALUES (?, ?, ?, 'customer', ?, ?, ?)
    `).run(email.trim().toLowerCase(), pwdHash, name.trim(), company_name || null, phone || null, address || null);

    const newUser = {
      id: Number(result.lastInsertRowid),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: 'customer',
      company_name: company_name || null
    };

    const token = generateToken(newUser);

    // Record audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
      VALUES (?, 'user', ?, 'register', 'New customer registered account')
    `).run(newUser.id, newUser.id);

    return res.status(201).json({
      message: 'Account created successfully',
      user: newUser,
      token
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create account: ' + err.message });
  }
});

// Login (All roles: admin, staff, customer)
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = comparePassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    company_name: user.company_name
  };

  const token = generateToken(safeUser);

  return res.json({
    message: 'Login successful',
    user: safeUser,
    token
  });
});

// Current user details
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ user: req.user });
});

// Forgot Password - Generates reset link and sends email
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (!user) {
    // For security, don't disclose if email exists, but return success message
    return res.json({
      message: 'If that email is registered, a password reset link has been sent to it.'
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

  db.prepare(`
    UPDATE users 
    SET reset_token = ?, reset_token_expires = ? 
    WHERE id = ?
  `).run(resetToken, expires, user.id);

  // In production this would send via SMTP/SES, here we log it to simulated_emails
  const resetLink = `http://localhost:5173/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
  const emailBody = `
Hello ${user.name},

You requested a password reset for your Brightloop Software account.
Click the link below to set a new password (valid for 1 hour):

${resetLink}

If you did not request this, please ignore this email.
Brightloop Security Team
  `.trim();

  db.prepare(`
    INSERT INTO simulated_emails (to_email, subject, body, email_type, metadata_json)
    VALUES (?, 'Reset Your Brightloop Password', ?, 'password_reset', ?)
  `).run(user.email, emailBody, JSON.stringify({ token: resetToken, userId: user.id }));

  return res.json({
    message: 'Password reset link sent to your email',
    simulatedResetLink: resetLink,
    token: resetToken
  });
});

// Reset Password - Validates token and password complexity
router.post('/reset-password', (req, res) => {
  const { token, email, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  if (new Date() > new Date(user.reset_token_expires)) {
    return res.status(400).json({ error: 'Password reset token has expired' });
  }

  const pwdValidation = validatePassword(newPassword);
  if (!pwdValidation.valid) {
    return res.status(400).json({ error: pwdValidation.message });
  }

  const hash = hashPassword(newPassword);

  db.prepare(`
    UPDATE users 
    SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL 
    WHERE id = ?
  `).run(hash, user.id);

  db.prepare(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (?, 'user', ?, 'password_reset', 'Password successfully reset via token')
  `).run(user.id, user.id);

  return res.json({ message: 'Password has been successfully updated. You may now log in.' });
});

// Simulated emails endpoint (to view email inbox / simulation for demo)
router.get('/simulated-emails', authenticateToken, (req, res) => {
  let query = 'SELECT * FROM simulated_emails ORDER BY id DESC LIMIT 50';
  const params = [];
  if (req.user.role === 'customer') {
    query = 'SELECT * FROM simulated_emails WHERE to_email = ? ORDER BY id DESC LIMIT 50';
    params.push(req.user.email);
  }
  const emails = db.prepare(query).all(...params);
  return res.json({ emails });
});

module.exports = router;

