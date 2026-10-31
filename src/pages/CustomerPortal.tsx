// src/pages/CustomerPortal.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { InvoicePrintModal } from '../components/InvoicePrintModal';
import { Modal } from '../components/Modal';
import {
  Repeat,
  FileText,
  CreditCard,
  Pause,
  Play,
  RotateCcw,
  XCircle,
  Printer,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building,
  Mail,
  Phone
} from 'lucide-react';
import { Subscription, Invoice } from '../types';

export const CustomerPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'subs' | 'invoices'>('subs');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Print modal
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [printLines, setPrintLines] = useState<any[]>([]);

  // Online Pay Modal
  const [payModalInvoice, setPayModalInvoice] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<'credit_card' | 'bank_transfer' | 'stripe'>('credit_card');
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const [subsRes, invRes] = await Promise.all([
        api.getSubscriptions(),
        api.getInvoices()
      ]);
      setSubscriptions(subsRes.subscriptions);
      setInvoices(invRes.invoices);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const handleSelfServiceAction = async (subId: number, action: string) => {
    try {
      const res = await api.transitionSubscription(subId, action);
      alert(res.message);
      await fetchCustomerData();
    } catch (err: any) {
      alert(err.message || 'Action cannot be completed.');
    }
  };

  const handleOpenPrint = async (inv: Invoice) => {
    try {
      const full = await api.getInvoice(inv.id);
      setPrintInvoice(full.invoice);
      setPrintLines(full.lines);
    } catch (err: any) {
      alert('Failed to load invoice receipt');
    }
  };

  const handleOnlinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalInvoice) return;
    setPaying(true);
    try {
      const res = await api.recordPayment({
        invoice_id: payModalInvoice.id,
        amount: payModalInvoice.balance_due,
        payment_method: payMethod,
        payment_date: new Date().toISOString().split('T')[0],
        reference_note: `Online payment via customer portal (${payMethod})`
      });
      setPaySuccess(res.message);
      setPayModalInvoice(null);
      await fetchCustomerData();
    } catch (err: any) {
      alert('Payment processing failed: ' + err.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#714B67] to-[#8E5D82] p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-extrabold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
              Customer Self-Service Portal
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs text-purple-100 mt-1">
            Manage your Brightloop software subscriptions, renewals, invoices, and instant online payments without having to email anyone.
          </p>
        </div>

        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs text-xs space-y-1">
          <div className="font-semibold">{user?.company_name || 'My Account'}</div>
          <div className="text-purple-200">{user?.email}</div>
        </div>
      </div>

      {paySuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{paySuccess} - Payment receipt has been sent to your email.</span>
          </div>
          <button onClick={() => setPaySuccess(null)} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('subs')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'subs'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>My Subscriptions ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'invoices'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Invoices & Receipts ({invoices.length})</span>
        </button>
      </div>

      {/* Subscriptions Tab */}
      {activeTab === 'subs' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading your subscriptions...</div>
          ) : subscriptions.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
              <Repeat className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="text-xs font-medium text-slate-600">You do not have any active subscriptions yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscriptions.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs text-purple-700">{s.subscription_number}</span>
                      <StatusBadge status={s.status} />
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{s.plan_name}</h3>
                    <div className="text-xs text-slate-500 capitalize">{s.billing_frequency} billing</div>

                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Recurring Amount:</span>
                        <span className="font-mono font-bold text-slate-900">${s.total_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Next Billing Date:</span>
                        <span className="font-mono font-medium text-slate-800">{s.next_billing_date || '—'}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Contract Expiry:</span>
                        <span className="font-mono font-medium text-slate-800">{s.expiry_date || 'Ongoing'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Self-Service Controls */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] text-slate-400">
                      {s.auto_close_on_end ? 'Auto-closes at contract expiry' : 'Continuous renewal'}
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs">
                      {s.status === 'active' && s.can_pause ? (
                        <button
                          onClick={() => handleSelfServiceAction(s.id, 'pause')}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold flex items-center space-x-1"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Pause</span>
                        </button>
                      ) : null}

                      {s.status === 'paused' && (
                        <button
                          onClick={() => handleSelfServiceAction(s.id, 'resume')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-semibold flex items-center space-x-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Resume</span>
                        </button>
                      )}

                      {s.can_renew ? (
                        <button
                          onClick={() => handleSelfServiceAction(s.id, 'renew')}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg font-semibold flex items-center space-x-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Renew</span>
                        </button>
                      ) : null}

                      {s.status === 'active' && s.can_close_early ? (
                        <button
                          onClick={() => handleSelfServiceAction(s.id, 'close_early')}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-semibold flex items-center space-x-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Cancel Plan</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No invoices generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Self-Service Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-purple-700">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {inv.invoice_date}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className={inv.is_overdue === 1 ? 'text-rose-600 font-bold' : ''}>
                          {inv.due_date}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        ${inv.total_amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ${inv.balance_due.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={inv.status} isOverdue={inv.is_overdue === 1} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {inv.balance_due > 0 && inv.status !== 'cancelled' && (
                            <button
                              onClick={() => setPayModalInvoice(inv)}
                              className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-xs shadow-xs flex items-center space-x-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay Now</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenPrint(inv)}
                            className="p-1 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded"
                            title="Print / View Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Online Payment Modal */}
      <Modal
        isOpen={!!payModalInvoice}
        onClose={() => setPayModalInvoice(null)}
        title={`Instant Online Payment: ${payModalInvoice?.invoice_number}`}
        maxWidth="max-w-md"
      >
        {payModalInvoice && (
          <form onSubmit={handleOnlinePayment} className="space-y-4 text-xs">
            <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200">
              <div className="text-xs font-semibold text-purple-900 mb-1">Invoice Settle Amount</div>
              <div className="text-2xl font-extrabold text-purple-800 font-mono">
                ${payModalInvoice.balance_due.toFixed(2)}
              </div>
              <div className="text-[11px] text-purple-700 mt-1">
                Zero processing fees for direct subscription settlement.
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Payment Gateway</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'credit_card', label: 'Credit Card' },
                  { id: 'stripe', label: 'Stripe Pay' },
                  { id: 'bank_transfer', label: 'Bank Wire' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayMethod(m.id as any)}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                      payMethod === m.id
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {payMethod === 'credit_card' && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Card Number</label>
                  <input
                    type="text"
                    defaultValue="•••• •••• •••• 4242"
                    disabled
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Expiry</label>
                    <input
                      type="text"
                      defaultValue="12/28"
                      disabled
                      className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">CVC</label>
                    <input
                      type="text"
                      defaultValue="•••"
                      disabled
                      className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPayModalInvoice(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paying}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs"
              >
                {paying ? 'Authorizing Payment...' : `Confirm & Pay $${payModalInvoice.balance_due.toFixed(2)}`}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Invoice Print & PDF Modal */}
      <InvoicePrintModal
        isOpen={!!printInvoice}
        onClose={() => setPrintInvoice(null)}
        invoice={printInvoice}
        lines={printLines}
      />
    </div>
  );
};

