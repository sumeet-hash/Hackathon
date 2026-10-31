// src/pages/QuotationTemplates.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  FileBox,
  Plus,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { QuotationTemplate, Plan, Product, Tax } from '../types';

interface QuotationTemplatesProps {
  onStartQuoteFromTemplate?: (templateId: number) => void;
}

export const QuotationTemplates: React.FC<QuotationTemplatesProps> = ({ onStartQuoteFromTemplate }) => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);

  // New Template Modal
  const [showModal, setShowModal] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplPlanId, setTplPlanId] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [tplNotes, setTplNotes] = useState('');
  const [lines, setLines] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, pRes, prodRes, taxRes] = await Promise.all([
        api.getTemplates(),
        api.getPlans(),
        api.getProducts(),
        api.getTaxes()
      ]);
      setTemplates(tRes.templates);
      setPlans(pRes.plans);
      setProducts(prodRes.products);
      setTaxes(taxRes.taxes);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddLine = () => {
    if (products.length === 0) return;
    const p = products[0];
    const t = taxes.find((tax) => tax.is_default) || taxes[0];
    setLines([
      ...lines,
      {
        product_id: p.id,
        variant_id: null,
        quantity: 1,
        unit_price: p.sales_price,
        tax_id: t ? t.id : null
      }
    ]);
  };

  const handleUpdateLine = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    updated[idx][field] = val;

    if (field === 'product_id') {
      const p = products.find((prod) => prod.id === parseInt(val, 10));
      if (p) {
        updated[idx].unit_price = p.sales_price;
        updated[idx].variant_id = null;
      }
    }

    if (field === 'variant_id') {
      const p = products.find((prod) => prod.id === updated[idx].product_id);
      if (p) {
        let price = p.sales_price;
        if (val) {
          const v = (p.variants || []).find((varItem: any) => varItem.id === parseInt(val, 10));
          if (v) price += v.price_extra;
        }
        updated[idx].unit_price = price;
      }
    }

    setLines(updated);
  };

  const handleRemoveLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplPlanId) {
      alert('Please select a plan for this template');
      return;
    }

    try {
      await api.createTemplate({
        name: tplName,
        plan_id: parseInt(tplPlanId, 10),
        validity_days: parseInt(validityDays, 10),
        notes: tplNotes,
        lines
      });
      setShowModal(false);
      setTplName('');
      setLines([]);
      await fetchData();
    } catch (err: any) {
      alert('Error creating template: ' + err.message);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.deleteTemplate(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting template');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Quotation Templates</h1>
          <p className="text-xs text-slate-500 mt-1">
            "A sales rep is preparing an offer for a large customer. Instead of building it from scratch, they start from a quotation template that already has the right plan and product lines, and stays valid for a set number of days."
          </p>
        </div>

        {isAdminOrStaff && (
          <button
            onClick={() => {
              setShowModal(true);
              if (lines.length === 0 && products.length > 0) handleAddLine();
            }}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quotation Template</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-900">{t.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Valid {t.validity_days} days
                </span>
              </div>

              <div className="text-xs text-purple-900 font-semibold bg-purple-50/70 p-2.5 rounded-xl border border-purple-200 mb-3 flex items-center justify-between">
                <span>Associated Plan: {t.plan_name}</span>
                <span className="font-mono">${t.plan_cost?.toFixed(2)}/{t.billing_frequency}</span>
              </div>

              {t.notes && <p className="text-xs text-slate-500 mb-3">{t.notes}</p>}

              {/* Preconfigured Lines */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  Pre-Populated Product Lines:
                </div>
                {t.lines.map((l, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-semibold text-slate-800">{l.quantity}x {l.product_name}</span>
                      {l.variant_value && (
                        <span className="block text-[10px] text-purple-700 font-medium">Variant: {l.variant_value}</span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      ${((l.quantity || 1) * l.unit_price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {user?.role === 'admin' ? (
                <button
                  onClick={() => handleDeleteTemplate(t.id)}
                  className="text-xs text-slate-400 hover:text-rose-600 p-1"
                  title="Delete Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : <div />}

              {onStartQuoteFromTemplate && (
                <button
                  onClick={() => onStartQuoteFromTemplate(t.id)}
                  className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1"
                >
                  <span>Build Quote From Template</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Template Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Quotation Template"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Template Name *</label>
              <input
                type="text"
                required
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="e.g. Standard SaaS Offer"
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Plan *</label>
              <select
                required
                value={tplPlanId}
                onChange={(e) => setTplPlanId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2"
              >
                <option value="">Select plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (${p.cost}/{p.billing_frequency})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Validity (Days) *</label>
              <input
                type="number"
                min="1"
                required
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                placeholder="30"
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={tplNotes}
                onChange={(e) => setTplNotes(e.target.value)}
                placeholder="Template description..."
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800">Pre-Configured Product Lines</span>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-purple-700 font-semibold hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {lines.map((l, idx) => {
                const prod = products.find((p) => p.id === parseInt(l.product_id, 10));
                return (
                  <div key={idx} className="p-3 bg-slate-50/50 grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-5">
                      <select
                        value={l.product_id}
                        onChange={(e) => handleUpdateLine(idx, 'product_id', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5"
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
                        className="w-full border border-slate-300 rounded-lg p-1.5"
                      >
                        <option value="">Standard (No Variant)</option>
                        {(prod?.variants || []).map((v) => (
                          <option key={v.id} value={v.id}>{v.attribute_name}: {v.variant_value} (+${v.price_extra})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={l.quantity}
                        onChange={(e) => handleUpdateLine(idx, 'quantity', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-center"
                        title="Qty"
                      />
                    </div>

                    <div className="col-span-1 text-center font-mono font-bold text-slate-800">
                      ${(l.quantity * l.unit_price).toFixed(0)}
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

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs"
            >
              Save Template
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

