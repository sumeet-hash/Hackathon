// src/pages/SubscriptionsList.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Plus,
  Search,
  Filter,
  FileBox,
  Trash2,
  Calendar,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Subscription } from '../types';

interface SubscriptionsListProps {
  onSelectSubscription: (id: number) => void;
}

export const SubscriptionsList: React.FC<SubscriptionsListProps> = ({ onSelectSubscription }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Data for creation form
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);

  // Create form state
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('net_30');
  const [selectedDiscount, setSelectedDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.getSubscriptions(params);
      setSubscriptions(res.subscriptions);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFormAuxData = async () => {
    try {
      const [cRes, pRes, tplRes, prodRes, taxRes, discRes] = await Promise.all([
        api.getCustomers(),
        api.getPlans(),
        api.getTemplates(),
        api.getProducts(),
        api.getTaxes(),
        api.getDiscounts()
      ]);
      setCustomers(cRes.customers);
      setPlans(pRes.plans);
      setTemplates(tplRes.templates);
      setProducts(prodRes.products);
      setTaxes(taxRes.taxes);
      setDiscounts(discRes.discounts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter, search]);

  useEffect(() => {
    loadFormAuxData();
  }, []);

  const handleApplyTemplate = (templateId: string) => {
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === parseInt(templateId, 10));
    if (!tpl) return;

    setSelectedPlan(String(tpl.plan_id));
    // Calculate expiry based on validity_days
    const exp = new Date();
    exp.setDate(exp.getDate() + (tpl.validity_days || 30));
    setExpiryDate(exp.toISOString().split('T')[0]);

    // Populate lines
    const populated = (tpl.lines || []).map((tl: any) => ({
      product_id: tl.product_id,
      variant_id: tl.variant_id || null,
      quantity: tl.quantity || 1,
      unit_price: tl.unit_price,
      tax_id: tl.tax_id || null
    }));
    setLines(populated);
  };

  const handleAddLine = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    const defaultTax = taxes.find((t) => t.is_default) || taxes[0];
    setLines([
      ...lines,
      {
        product_id: defaultProd.id,
        variant_id: null,
        quantity: 1,
        unit_price: defaultProd.sales_price,
        tax_id: defaultTax ? defaultTax.id : null
      }
    ]);
  };

  const handleUpdateLine = (index: number, field: string, val: any) => {
    const updated = [...lines];
    updated[index][field] = val;

    // If product changed, update base price
    if (field === 'product_id') {
      const prod = products.find((p) => p.id === parseInt(val, 10));
      if (prod) {
        updated[index].unit_price = prod.sales_price;
        updated[index].variant_id = null;
      }
    }

    // If variant changed, adjust price with extra surcharge
    if (field === 'variant_id') {
      const prod = products.find((p) => p.id === updated[index].product_id);
      if (prod) {
        let base = prod.sales_price;
        if (val) {
          const v = (prod.variants || []).find((varItem: any) => varItem.id === parseInt(val, 10));
          if (v) base += v.price_extra;
        }
        updated[index].unit_price = base;
      }
    }

    setLines(updated);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const computeTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    for (const l of lines) {
      const lineSub = (parseInt(l.quantity, 10) || 1) * (parseFloat(l.unit_price) || 0);
      subtotal += lineSub;
      if (l.tax_id) {
        const tax = taxes.find((t) => t.id === parseInt(l.tax_id, 10));
        if (tax) {
          taxTotal += Math.round(((lineSub * tax.rate) / 100) * 100) / 100;
        }
      }
    }

    let discountTotal = 0;
    if (selectedDiscount) {
      const disc = discounts.find((d) => d.id === parseInt(selectedDiscount, 10));
      if (disc) {
        if (disc.discount_type === 'percentage') {
          discountTotal = (subtotal * disc.discount_value) / 100;
        } else {
          discountTotal = Math.min(subtotal, disc.discount_value);
        }
      }
    }

    const total = Math.max(0, subtotal - discountTotal + taxTotal);
    return { subtotal, discountTotal, taxTotal, total };
  };

  const handleCreateSubmit = async (status: 'draft' | 'quotation') => {
    if (!selectedCustomer || !selectedPlan || !startDate) {
      alert('Please fill customer, plan, and start date.');
      return;
    }

    setCreating(true);
    try {
      const res = await api.createSubscription({
        customer_id: selectedCustomer,
        plan_id: selectedPlan,
        start_date: startDate,
        expiry_date: expiryDate || null,
        payment_terms: paymentTerms,
        status,
        discount_id: selectedDiscount || null,
        notes,
        lines
      });

      setShowCreateModal(false);
      await fetchSubscriptions();
      onSelectSubscription(res.subscriptionId);
    } catch (err: any) {
      alert('Failed to create subscription: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const totals = computeTotals();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Subscriptions & Quotations</h1>
          <p className="text-xs text-slate-500 mt-1">
            "It moves from Draft to Quotation to Confirmed to Active and finally to Closed, and anyone on the team should be able to see where it stands."
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            if (lines.length === 0 && products.length > 0) handleAddLine();
          }}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Quote / Subscription</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          {['', 'draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {st === '' ? 'All States' : st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sub #, customer, company..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-hidden"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Repeat className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
            <p className="text-xs font-medium text-slate-600">No subscriptions found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/40">
                  <th className="py-3 px-4">Subscription #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Billing Frequency</th>
                  <th className="py-3 px-4">Next Billing</th>
                  <th className="py-3 px-4 text-right">Recurring Total</th>
                  <th className="py-3 px-4 text-center">Lifecycle State</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {s.subscription_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{s.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{s.company_name || s.customer_email}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {s.plan_name}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">
                      {s.billing_frequency}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {s.next_billing_date || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ${s.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectSubscription(s.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors inline-flex items-center space-x-1"
                      >
                        <span>Manage</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Offer / Subscription"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5 text-xs">
          {/* Quick Start from Quotation Template */}
          <div className="bg-purple-50/70 border border-purple-200 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileBox className="w-4 h-4 text-purple-700" />
              <div>
                <div className="font-bold text-purple-900 text-xs">Start from Quotation Template</div>
                <div className="text-[11px] text-purple-700">Pre-loads plan and product lines configured for this offer</div>
              </div>
            </div>
            <select
              onChange={(e) => handleApplyTemplate(e.target.value)}
              defaultValue=""
              className="bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs text-purple-900 font-medium"
            >
              <option value="" disabled>Select Template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.validity_days} days validity)</option>
              ))}
            </select>
          </div>

          {/* Customer & Plan Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer *</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plan *</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs"
              >
                <option value="">Select plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} - ${p.cost}/{p.billing_frequency}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs"
              >
                <option value="immediate">Immediate</option>
                <option value="net_15">Net 15 Days</option>
                <option value="net_30">Net 30 Days</option>
                <option value="net_60">Net 60 Days</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expiry / End Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subscription Discount Rule</label>
              <select
                value={selectedDiscount}
                onChange={(e) => setSelectedDiscount(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs"
              >
                <option value="">No Discount</option>
                {discounts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.discount_value}{d.discount_type === 'percentage' ? '%' : '$'} off)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 text-xs">Product Lines</span>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-purple-700 font-semibold hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {lines.map((l, idx) => {
                const prod = products.find((p) => p.id === parseInt(l.product_id, 10));
                return (
                  <div key={idx} className="p-3 bg-slate-50/50 grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-4">
                      <select
                        value={l.product_id}
                        onChange={(e) => handleUpdateLine(idx, 'product_id', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <select
                        value={l.variant_id || ''}
                        onChange={(e) => handleUpdateLine(idx, 'variant_id', e.target.value || null)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs"
                      >
                        <option value="">Standard (No Variant)</option>
                        {(prod?.variants || []).map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.attribute_name}: {v.variant_value} (+${v.price_extra})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <input
                        type="number"
                        min="1"
                        value={l.quantity}
                        onChange={(e) => handleUpdateLine(idx, 'quantity', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs text-center"
                        title="Quantity"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={l.unit_price}
                        onChange={(e) => handleUpdateLine(idx, 'unit_price', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs text-right font-mono"
                        title="Unit Price"
                      />
                    </div>

                    <div className="col-span-1">
                      <select
                        value={l.tax_id || ''}
                        onChange={(e) => handleUpdateLine(idx, 'tax_id', e.target.value || null)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs"
                      >
                        <option value="">0%</option>
                        {taxes.map((t) => (
                          <option key={t.id} value={t.id}>{t.rate}%</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-64 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">${totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span className="font-mono">-${totals.discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Taxes:</span>
                <span className="font-mono font-medium">${totals.taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Recurring Amount:</span>
                <span className="font-mono text-purple-700">${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={() => handleCreateSubmit('draft')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-xs"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={() => handleCreateSubmit('quotation')}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-xs"
            >
              Save & Send Quotation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

