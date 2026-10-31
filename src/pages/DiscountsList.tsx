// src/pages/DiscountsList.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Percent,
  Plus,
  Trash2,
  Calendar,
  Layers,
  ShieldAlert,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { Discount, Product } from '../types';

export const DiscountsList: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // New discount modal state
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('15');
  const [minPurchase, setMinPurchase] = useState('0');
  const [minQuantity, setMinQuantity] = useState('0');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [scope, setScope] = useState<'product' | 'subscription'>('subscription');
  const [targetProductId, setTargetProductId] = useState('');

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const [dRes, pRes] = await Promise.all([
        api.getDiscounts(),
        api.getProducts()
      ]);
      setDiscounts(dRes.discounts);
      setProducts(pRes.products);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDiscount({
        code,
        name,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_purchase_amount: parseFloat(minPurchase) || 0,
        min_quantity: parseInt(minQuantity, 10) || 0,
        start_date: startDate,
        end_date: endDate || null,
        usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
        scope,
        target_product_id: scope === 'product' && targetProductId ? parseInt(targetProductId, 10) : null
      });
      setShowModal(false);
      setCode('');
      setName('');
      await fetchDiscounts();
    } catch (err: any) {
      alert('Error creating discount rule: ' + err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Automated Discount Rules</h1>
          <p className="text-xs text-slate-500 mt-1">
            "Only the admin can create discount rules: a fixed amount or a percentage, with a minimum purchase or quantity, start and end dates, and a limit on how many times it can be used."
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Discount Rule</span>
          </button>
        ) : (
          <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl font-medium">
            Read-only mode (Only Admin can create discounts)
          </div>
        )}
      </div>

      {/* Discounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discounts.map((d) => {
          const isExpired = d.end_date && d.end_date < new Date().toISOString().split('T')[0];
          const isMaxedOut = d.usage_limit !== null && d.usage_limit !== undefined && d.times_used >= d.usage_limit;

          return (
            <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    {d.code}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isExpired || isMaxedOut
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isExpired ? 'Expired' : isMaxedOut ? 'Limit Reached' : 'Active Rule'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{d.name}</h3>

                <div className="mt-3 flex items-baseline space-x-1">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono">
                    {d.discount_type === 'percentage' ? `${d.discount_value}%` : `$${d.discount_value.toFixed(2)}`}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    off {d.scope === 'subscription' ? 'whole subscription' : `product (${d.target_product_name || 'specific item'})`}
                  </span>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Usage Count:</span>
                    <span className="font-semibold text-slate-800">
                      {d.times_used} {d.usage_limit ? `/ ${d.usage_limit} maximum` : '(Unlimited)'}
                    </span>
                  </div>

                  {d.min_quantity > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Min Quantity Req:</span>
                      <span className="font-semibold text-slate-800">{d.min_quantity} items / seats</span>
                    </div>
                  )}

                  {d.min_purchase_amount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Min Purchase Req:</span>
                      <span className="font-semibold text-slate-800 font-mono">${d.min_purchase_amount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200 text-[11px]">
                    <span>Valid:</span>
                    <span>{d.start_date} {d.end_date ? `to ${d.end_date}` : '(No expiry)'}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Discount Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Admin: Create Discount Rule"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateDiscount} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Coupon / Rule Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SEATS15"
                className="w-full border border-slate-300 rounded-lg p-2 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Discount Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Volume Seat Discount"
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Discount Type *</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Value ({discountType === 'percentage' ? '%' : '$'}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rule Scope *</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2"
              >
                <option value="subscription">Whole Subscription</option>
                <option value="product">Specific Product</option>
              </select>
            </div>

            {scope === 'product' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Product</label>
                <select
                  value={targetProductId}
                  onChange={(e) => setTargetProductId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                >
                  <option value="">Select target product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Purchase Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Quantity Requirement</label>
              <input
                type="number"
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                placeholder="0"
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Usage Limit</label>
              <input
                type="number"
                min="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="Unlimited"
                className="w-full border border-slate-300 rounded-lg p-2"
              />
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
              Create Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

