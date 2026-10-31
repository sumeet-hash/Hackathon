// src/pages/TaxesList.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Receipt, Plus, Check } from 'lucide-react';
import { Tax } from '../types';

export const TaxesList: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);

  // New tax modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('10.0');
  const [isDefault, setIsDefault] = useState(false);

  const fetchTaxes = async () => {
    setLoading(true);
    try {
      const res = await api.getTaxes();
      setTaxes(res.taxes);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTax({
        name,
        rate: parseFloat(rate),
        tax_type: 'percentage',
        is_default: isDefault
      });
      setShowModal(false);
      setName('');
      await fetchTaxes();
    } catch (err: any) {
      alert('Error creating tax rule: ' + err.message);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Tax Rules & Calculation</h1>
          <p className="text-xs text-slate-500 mt-1">
            "Taxes are calculated automatically from rules the admin has set."
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tax Rule</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
              <th className="py-3 px-4">Tax Rule Name</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4 text-right">Tax Rate (%)</th>
              <th className="py-3 px-4 text-center">Default Tax</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {taxes.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-800">
                  {t.name}
                </td>
                <td className="py-3 px-4 capitalize text-slate-600">
                  {t.tax_type}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                  {t.rate}%
                </td>
                <td className="py-3 px-4 text-center">
                  {t.is_default ? (
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Check className="w-3 h-3 mr-1 text-emerald-600" /> Default
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Tax Rule" maxWidth="max-w-md">
        <form onSubmit={handleCreateTax} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tax Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. State Sales Tax 6.5%"
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Percentage Rate (%) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 font-mono"
            />
          </div>

          <label className="flex items-center space-x-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span className="font-semibold text-slate-800">Set as default invoice tax</span>
          </label>

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
              Save Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

