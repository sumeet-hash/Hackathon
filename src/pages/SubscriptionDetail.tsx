// src/pages/SubscriptionDetail.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  ArrowLeft,
  CheckCircle,
  Pause,
  Play,
  XCircle,
  RotateCcw,
  Send,
  FileText,
  AlertCircle,
  Calendar,
  Layers,
  DollarSign,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { Subscription, SubscriptionLine, Invoice } from '../types';

interface SubscriptionDetailProps {
  subscriptionId: number;
  onBack: () => void;
  onNavigateToInvoice: (invoiceId: number) => void;
}

export const SubscriptionDetail: React.FC<SubscriptionDetailProps> = ({
  subscriptionId,
  onBack,
  onNavigateToInvoice
}) => {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [lines, setLines] = useState<SubscriptionLine[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.getSubscription(subscriptionId);
      setSub(res.subscription);
      setLines(res.lines);
      setInvoices(res.invoices);
    } catch (err: any) {
      alert('Error fetching subscription: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [subscriptionId]);

  const handleTransition = async (action: string) => {
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await api.transitionSubscription(subscriptionId, action);
      setMsg(res.message);
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !sub) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading subscription details...</div>;
  }

  const stages = ['draft', 'quotation', 'confirmed', 'active', 'closed'];
  const currentStageIndex = stages.indexOf(sub.status);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-slate-900 font-mono">
                {sub.subscription_number}
              </h1>
              <StatusBadge status={sub.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer: <span className="font-semibold text-slate-800">{sub.customer_name}</span> ({sub.company_name || sub.customer_email})
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {sub.status === 'draft' && (
            <button
              onClick={() => handleTransition('to_quotation')}
              disabled={actionLoading}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Quotation</span>
            </button>
          )}

          {sub.status === 'quotation' && (
            <button
              onClick={() => handleTransition('confirm')}
              disabled={actionLoading}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Confirm Order</span>
            </button>
          )}

          {sub.status === 'confirmed' && (
            <button
              onClick={() => handleTransition('activate')}
              disabled={actionLoading}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Activate Subscription</span>
            </button>
          )}

          {sub.status === 'active' && (
            <>
              {sub.can_pause ? (
                <button
                  onClick={() => handleTransition('pause')}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold rounded-xl transition-colors flex items-center space-x-1"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              ) : null}

              {sub.can_close_early ? (
                <button
                  onClick={() => handleTransition('close_early')}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold rounded-xl transition-colors flex items-center space-x-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Close Early</span>
                </button>
              ) : null}
            </>
          )}

          {sub.status === 'paused' && (
            <button
              onClick={() => handleTransition('resume')}
              disabled={actionLoading}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </button>
          )}

          {sub.can_renew ? (
            <button
              onClick={() => handleTransition('renew')}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded-xl transition-colors flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Renew Subscription</span>
            </button>
          ) : null}
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-purple-600" />
          <span>{msg}</span>
        </div>
      )}

      {/* Odoo Style Visual Pipeline Stage Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          {stages.map((stage, idx) => {
            const isCompleted = currentStageIndex >= idx;
            const isCurrent = sub.status === stage;
            return (
              <div key={stage} className="flex-1 flex items-center">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  isCurrent
                    ? 'bg-purple-700 text-white shadow-sm'
                    : isCompleted
                    ? 'text-purple-900 bg-purple-50'
                    : 'text-slate-400 bg-slate-50'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    isCurrent ? 'bg-white' : isCompleted ? 'bg-purple-600' : 'bg-slate-300'
                  }`} />
                  <span>{stage}</span>
                </div>
                {idx < stages.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStageIndex > idx ? 'bg-purple-300' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Details */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Customer Details</div>
          <div className="text-sm font-bold text-slate-900">{sub.customer_name}</div>
          {sub.company_name && <div className="text-slate-700 font-medium">{sub.company_name}</div>}
          <div className="text-slate-600">{sub.customer_email}</div>
          {sub.phone && <div className="text-slate-500">{sub.phone}</div>}
          {sub.address && <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-100">{sub.address}</div>}
        </div>

        {/* Plan & Lifecycle Policies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Plan & Policies</div>
          <div className="text-sm font-bold text-purple-700">{sub.plan_name}</div>
          <div className="text-slate-600 capitalize">Billing: <span className="font-semibold text-slate-800">{sub.billing_frequency}</span></div>
          <div className="text-slate-600">Payment Terms: <span className="font-semibold text-slate-800 uppercase">{sub.payment_terms.replace('_', ' ')}</span></div>

          {/* Configured Lifecycle Policy Badges */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1 text-[10px]">
            {sub.auto_close_on_end ? (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">Auto-close on end</span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">No auto-close</span>
            )}
            <span className={`px-2 py-0.5 rounded font-medium ${sub.can_pause ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
              {sub.can_pause ? 'Pausable' : 'Cannot pause'}
            </span>
            <span className={`px-2 py-0.5 rounded font-medium ${sub.can_close_early ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
              {sub.can_close_early ? 'Early closure allowed' : 'No early close'}
            </span>
            <span className={`px-2 py-0.5 rounded font-medium ${sub.can_renew ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
              {sub.can_renew ? 'Renewable' : 'No renewal'}
            </span>
          </div>
        </div>

        {/* Schedule & Billing Dates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Schedule & Billing</div>
          <div className="flex justify-between">
            <span className="text-slate-500">Start Date:</span>
            <span className="font-mono font-medium text-slate-800">{sub.start_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Expiry / End Date:</span>
            <span className="font-mono font-medium text-slate-800">{sub.expiry_date || 'Ongoing'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Last Billed:</span>
            <span className="font-mono font-medium text-slate-800">{sub.last_billed_date || 'Never'}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-100">
            <span className="font-bold text-purple-900">Next Billing Date:</span>
            <span className="font-mono font-bold text-purple-700">{sub.next_billing_date || '—'}</span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800">Subscription Line Items</h3>
        </div>

        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/30">
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">Variant Attributes</th>
              <th className="py-3 px-4 text-center">Quantity</th>
              <th className="py-3 px-4 text-right">Unit Price</th>
              <th className="py-3 px-4 text-right">Tax</th>
              <th className="py-3 px-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="py-3 px-4 font-semibold text-slate-800">
                  {l.product_name}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {l.variant_value ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium text-[11px] border border-purple-200">
                      {l.attribute_name || 'Variant'}: {l.variant_value}
                      {l.price_extra ? ` (+$${l.price_extra})` : ''}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Standard</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-medium">
                  {l.quantity}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-700">
                  ${l.unit_price.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-500">
                  ${(l.tax_amount || 0).toFixed(2)} ({l.tax_rate || 0}%)
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                  ${l.line_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Box */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
          <div className="w-64 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">${sub.subtotal.toFixed(2)}</span>
            </div>
            {sub.discount_total > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount ({sub.discount_code || 'Promo'}):</span>
                <span className="font-mono">-${sub.discount_total.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxes:</span>
              <span className="font-mono font-medium">${sub.tax_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-300 pt-2">
              <span>Recurring Total:</span>
              <span className="font-mono text-purple-700">${sub.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Invoices History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Invoices Generated for this Subscription</h3>
          <span className="text-xs font-semibold text-slate-500">{invoices.length} invoices</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No invoices generated yet. Run the Billing Day Engine to create the recurring invoice.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">Invoice Date</th>
                <th className="py-2.5 px-4">Due Date</th>
                <th className="py-2.5 px-4 text-right">Total</th>
                <th className="py-2.5 px-4 text-right">Balance Due</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-purple-700">
                    {inv.invoice_number}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {inv.invoice_date}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {inv.due_date}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                    ${inv.total_amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    ${inv.balance_due.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onNavigateToInvoice(inv.id)}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 inline-flex items-center"
                    >
                      <span>View</span>
                      <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

