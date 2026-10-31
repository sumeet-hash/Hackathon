// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { initSchema } = require('./db');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// Request timing header for monitoring sub-2-second performance
app.use((req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    return originalEnd.apply(this, args);
  };
  next();
});

// Initialize database schema
initSchema();

// Register API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/plans', require('./routes/planRoutes'));
app.use('/api/taxes', require('./routes/taxRoutes'));
app.use('/api/discounts', require('./routes/discountRoutes'));
app.use('/api/quotation-templates', require('./routes/quoteTemplateRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/billing', require('./routes/billingRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Brightloop Subscription Management System API',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build if dist folder exists
const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(404).send('Brightloop API is active on port ' + PORT + '. Please start Vite frontend or run npm run build.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Brightloop Server running on http://localhost:${PORT}`);
});

module.exports = app;
