// src/pages/PlansList.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Repeat,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Plan } from '../types';

export const PlansList: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // New plan modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cost, setCost] = useState('299.00');
  const [billingFrequency, setBillingFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [minQuantity, setMinQuantity] = useState('1');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [autoCloseOnEnd, setAutoCloseOnEnd] = useState(false);
  const [canCloseEarly, setCanCloseEarly] = useState(true);
  const [canPause, setCanPause] = useState(true);
  const [canRenew, setCanRenew] = useState(true);
  const [description, setDescription] = useState('');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.getPlans();
      setPlans(res.plans);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPlan({
        name,
        code,
        cost: parseFloat(cost),
        billing_frequency: billingFrequency,
        min_quantity: parseInt(minQuantity, 10),
        start_date: startDate,
        end_date: endDate || null,
        auto_close_on_end: autoCloseOnEnd,
        can_close_early: canCloseEarly,
        can_pause: canPause,
        can_renew: canRenew,
        description
      });
      setShowModal(false);
      setName('');
      setCode('');
      await fetchPlans();
    } catch (err: any) {
      alert('Error creating plan: ' + err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Subscription Plans & Policies</h1>
          <p className="text-xs text-slate-500 mt-1">
            "Some plans should close on their own when they end, and others can be closed early, paused or renewed. The admin decides which, plan by plan."
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plan</span>
          </button>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {p.code}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {p.active_subscriptions_count || 0} active subs
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {p.description || 'No description specified.'}
              </p>

              <div className="mt-4 flex items-baseline space-x-1">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">${p.cost.toFixed(2)}</span>
                <span className="text-xs text-slate-500 font-medium capitalize">/ {p.billing_frequency}</span>
              </div>

              {/* Lifecycle Policy Matrix */}
              <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Admin Lifecycle Rules
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Auto-Close on End:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    p.auto_close_on_end ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/60 text-slate-600'
                  }`}>
                    {p.auto_close_on_end ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Can Close Early:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    p.can_close_early ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {p.can_close_early ? 'Yes' : 'No'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Can Pause / Resume:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    p.can_pause ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {p.can_pause ? 'Yes' : 'No'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Can Renew:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    p.can_renew ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {p.can_renew ? 'Yes' : 'No'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px] text-slate-500">
                  <span>Min Seats / Qty: {p.min_quantity}</span>
                  <span>Valid: {p.start_date} {p.end_date ? `to ${p.end_date}` : '(Ongoing)'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Plan Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Admin: Create New Subscription Plan"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plan Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Enterprise Cloud Annual"
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plan Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PLAN-ENT-ANNUAL"
                className="w-full border border-slate-300 rounded-lg p-2 uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Base Plan Cost ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Billing Frequency *</label>
              <select
                value={billingFrequency}
                onChange={(e) => setBillingFrequency(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Availability Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Availability End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
          </div>

          {/* Lifecycle Policy Checkboxes (Crucial from Prompt!) */}
          <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
            <div className="font-bold text-purple-900 text-xs">Lifecycle Rules Configuration</div>
            <p className="text-[11px] text-purple-700">
              Configure whether customer / system can auto-close, pause, renew, or close early.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-800">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCloseOnEnd}
                  onChange={(e) => setAutoCloseOnEnd(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="font-medium">Auto-close when plan ends</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canCloseEarly}
                  onChange={(e) => setCanCloseEarly(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="font-medium">Allow early closure</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canPause}
                  onChange={(e) => setCanPause(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="font-medium">Allow pause / resume</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canRenew}
                  onChange={(e) => setCanRenew(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="font-medium">Allow renewals</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal notes or customer visible plan description..."
              className="w-full border border-slate-300 rounded-lg p-2"
            />
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
              Create Plan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

