// src/pages/InvoiceDetail.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { InvoicePrintModal } from '../components/InvoicePrintModal';
import { Modal } from '../components/Modal';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Send,
  Printer,
  CreditCard,
  Calendar,
  AlertTriangle,
  Receipt,
  DollarSign
} from 'lucide-react';
import { Invoice, InvoiceLine, Payment } from '../types';

interface InvoiceDetailProps {
  invoiceId: number;
  onBack: () => void;
  onNavigateToSubscription?: (subId: number) => void;
}

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  invoiceId,
  onBack,
  onNavigateToSubscription
}) => {
  const [inv, setInv] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Print modal
  const [showPrint, setShowPrint] = useState(false);

  // Pay modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'credit_card' | 'bank_transfer' | 'stripe' | 'paypal' | 'cash' | 'cheque'>('credit_card');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await api.getInvoice(invoiceId);
      setInv(res.invoice);
      setLines(res.lines);
      setPayments(res.payments);
      setPayAmount(String(res.invoice.balance_due));
    } catch (err: any) {
      alert('Error loading invoice: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const handleConfirm = async () => {
    try {
      await api.confirmInvoice(invoiceId);
      await fetchInvoice();
    } catch (err: any) {
      alert(err.message || 'Error confirming invoice');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    try {
      await api.cancelInvoice(invoiceId);
      await fetchInvoice();
    } catch (err: any) {
      alert(err.message || 'Error cancelling invoice');
    }
  };

  const handleSend = async () => {
    try {
      const res = await api.sendInvoice(invoiceId);
      alert(res.message);
      await fetchInvoice();
    } catch (err: any) {
      alert(err.message || 'Error sending invoice');
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      await api.recordPayment({
        invoice_id: invoiceId,
        amount: parseFloat(payAmount),
        payment_method: payMethod,
        payment_date: payDate,
        reference_note: payNote
      });
      setShowPayModal(false);
      await fetchInvoice();
    } catch (err: any) {
      alert('Error recording payment: ' + err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  if (loading || !inv) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading invoice...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
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
                {inv.invoice_number}
              </h1>
              <StatusBadge status={inv.status} isOverdue={inv.is_overdue === 1} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer: <span className="font-semibold text-slate-800">{inv.customer_name}</span> ({inv.company_name || inv.customer_email})
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 text-xs">
          {inv.status === 'draft' && (
            <button
              onClick={handleConfirm}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Confirm Invoice</span>
            </button>
          )}

          {inv.balance_due > 0 && inv.status !== 'cancelled' && (
            <button
              onClick={() => setShowPayModal(true)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          <button
            onClick={handleSend}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-xl transition-colors flex items-center space-x-1"
          >
            <Send className="w-3.5 h-3.5 text-purple-600" />
            <span>Send Email</span>
          </button>

          <button
            onClick={() => setShowPrint(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-xl transition-colors flex items-center space-x-1"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print / PDF</span>
          </button>

          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
            <button
              onClick={handleCancel}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
              title="Cancel Invoice"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Invoice Details Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Customer & Billing Info</div>
            <div className="font-bold text-slate-900 text-sm">{inv.customer_name}</div>
            {inv.company_name && <div className="text-slate-700 font-medium">{inv.company_name}</div>}
            <div className="text-slate-600">{inv.customer_email}</div>
            {inv.phone && <div className="text-slate-500">{inv.phone}</div>}
            {inv.address && <div className="text-slate-500 mt-1">{inv.address}</div>}
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Invoice Dates & Terms</div>
            <div className="text-slate-600">Invoice Date: <span className="font-mono font-medium text-slate-800">{inv.invoice_date}</span></div>
            <div className="text-slate-600">
              Due Date:{' '}
              <span className={`font-mono font-medium ${inv.is_overdue === 1 ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                {inv.due_date} {inv.is_overdue === 1 ? '(OVERDUE)' : ''}
              </span>
            </div>
            <div className="text-slate-600 capitalize">Payment Terms: <span className="font-medium text-slate-800 uppercase">{inv.payment_terms.replace('_', ' ')}</span></div>
            {inv.billing_period_start && (
              <div className="text-slate-500 text-[11px] mt-1">
                Period: {inv.billing_period_start} to {inv.billing_period_end}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Source Subscription</div>
            {inv.subscription_number ? (
              <div>
                <span className="font-mono font-bold text-purple-700">{inv.subscription_number}</span>
                {onNavigateToSubscription && inv.subscription_id && (
                  <button
                    onClick={() => onNavigateToSubscription(inv.subscription_id!)}
                    className="block text-[11px] text-purple-600 hover:underline mt-1 font-semibold"
                  >
                    View Source Subscription
                  </button>
                )}
              </div>
            ) : (
              <span className="text-slate-400">Manual Invoice</span>
            )}
            {inv.sent_at && (
              <div className="text-[11px] text-emerald-700 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100 mt-2">
                Email dispatched at {new Date(inv.sent_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Lines Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Tax</th>
                <th className="py-2.5 px-3 text-right">Discount</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {l.description}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-700">
                    {l.quantity}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    ${l.unit_price.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                    ${(l.tax_amount || 0).toFixed(2)} ({l.tax_rate}%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                    {l.discount_amount > 0 ? `-$${l.discount_amount.toFixed(2)}` : '$0.00'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    ${l.line_total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Balances */}
        <div className="flex justify-end">
          <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">${inv.subtotal.toFixed(2)}</span>
            </div>
            {inv.discount_total > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discounts:</span>
                <span className="font-mono">-${inv.discount_total.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxes:</span>
              <span className="font-mono font-medium">${inv.tax_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-1.5">
              <span>Total Amount:</span>
              <span className="font-mono">${inv.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono text-emerald-700 font-bold">${inv.amount_paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-purple-900 bg-purple-100/60 p-2 rounded-lg border border-purple-200">
              <span>Balance Due:</span>
              <span className="font-mono">${inv.balance_due.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Recorded Payments</h3>
          <span className="text-xs font-semibold text-slate-500">{payments.length} transactions</span>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No payments recorded yet against this invoice.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Payment #</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Method</th>
                <th className="py-2.5 px-4">Reference Note</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-4 font-mono font-bold text-purple-700">
                    {p.payment_number}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {p.payment_date}
                  </td>
                  <td className="py-3 px-4 capitalize font-medium text-slate-800">
                    {p.payment_method.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {p.reference_note || '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                    ${p.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {p.recorded_by_name || 'System'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title={`Record Payment for ${inv.invoice_number}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between font-bold text-purple-900">
              <span>Balance Due:</span>
              <span className="font-mono">${inv.balance_due.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Amount to Pay ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={inv.balance_due}
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Method *</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2"
              >
                <option value="credit_card">Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reference Note</label>
            <input
              type="text"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="e.g. Wire transfer code or check #"
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowPayModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPayment}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
            >
              {savingPayment ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Print View Modal */}
      <InvoicePrintModal
        isOpen={showPrint}
        onClose={() => setShowPrint(false)}
        invoice={inv}
        lines={lines}
      />
    </div>
  );
};

