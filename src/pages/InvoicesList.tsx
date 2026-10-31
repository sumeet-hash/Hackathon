// src/pages/InvoicesList.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { InvoicePrintModal } from '../components/InvoicePrintModal';
import { Modal } from '../components/Modal';
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Send,
  Printer,
  CreditCard,
  BellRing,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { Invoice } from '../types';

interface InvoicesListProps {
  onSelectInvoice: (id: number) => void;
}

export const InvoicesList: React.FC<InvoicesListProps> = ({ onSelectInvoice }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');

  // Print modal state
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [printLines, setPrintLines] = useState<any[]>([]);

  // Record Payment Modal State
  const [payModalInvoice, setPayModalInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'credit_card' | 'bank_transfer' | 'stripe' | 'paypal' | 'cash' | 'cheque'>('credit_card');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState<string>('');
  const [recordingPay, setRecordingPay] = useState(false);

  // Overdue chase state
  const [chasing, setChasing] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (statusFilter) params.status = statusFilter;
      if (overdueOnly) params.is_overdue = 'true';
      if (search) params.search = search;
      const res = await api.getInvoices(params);
      setInvoices(res.invoices);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, overdueOnly, search]);

  const handleConfirm = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.confirmInvoice(id);
      await fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Error confirming invoice');
    }
  };

  const handleCancel = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    try {
      await api.cancelInvoice(id);
      await fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Error cancelling invoice');
    }
  };

  const handleSend = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.sendInvoice(id);
      alert(res.message);
      await fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Error sending invoice');
    }
  };

  const handleOpenPrint = async (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const full = await api.getInvoice(inv.id);
      setPrintInvoice(full.invoice);
      setPrintLines(full.lines);
    } catch (err: any) {
      alert(err.message || 'Failed to load invoice for printing');
    }
  };

  const handleOpenPay = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setPayModalInvoice(inv);
    setPayAmount(String(inv.balance_due));
    setPayNote('');
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalInvoice) return;
    setRecordingPay(true);
    try {
      await api.recordPayment({
        invoice_id: payModalInvoice.id,
        amount: parseFloat(payAmount),
        payment_method: payMethod,
        payment_date: payDate,
        reference_note: payNote
      });
      setPayModalInvoice(null);
      await fetchInvoices();
    } catch (err: any) {
      alert('Error recording payment: ' + err.message);
    } finally {
      setRecordingPay(false);
    }
  };

  const handleChaseOverdue = async () => {
    setChasing(true);
    try {
      const res = await api.chaseOverdue();
      alert(res.message);
      await fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Error chasing overdue invoices');
    } finally {
      setChasing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Invoices & Receivables</h1>
          <p className="text-xs text-slate-500 mt-1">
            "The team can confirm, cancel, send or print any invoice, and each invoice moves from Draft to Confirmed to Paid."
          </p>
        </div>

        <button
          onClick={handleChaseOverdue}
          disabled={chasing}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>{chasing ? 'Chasing...' : 'Chase Overdue Invoices'}</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          {['', 'draft', 'confirmed', 'paid', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setOverdueOnly(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === st && !overdueOnly
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {st === '' ? 'All Invoices' : st}
            </button>
          ))}

          {/* Overdue Quick Filter */}
          <button
            onClick={() => { setOverdueOnly(!overdueOnly); setStatusFilter(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
              overdueOnly
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue Only</span>
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, customer..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-hidden"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
            <p className="text-xs font-medium text-slate-600">No invoices found matching criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/40">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => onSelectInvoice(inv.id)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {inv.invoice_number}
                      {inv.subscription_number && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {inv.subscription_number}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{inv.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{inv.company_name || inv.customer_email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {inv.invoice_date}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className={inv.is_overdue === 1 ? 'font-bold text-rose-600 font-mono' : ''}>
                        {inv.due_date}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                      ${inv.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ${inv.balance_due.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={inv.status} isOverdue={inv.is_overdue === 1} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                        {inv.status === 'draft' && (
                          <button
                            onClick={(e) => handleConfirm(inv.id, e)}
                            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold"
                            title="Confirm Invoice"
                          >
                            Confirm
                          </button>
                        )}

                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={(e) => handleOpenPay(inv, e)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-bold flex items-center space-x-0.5"
                            title="Record Payment"
                          >
                            <CreditCard className="w-3 h-3 mr-0.5" />
                            <span>Pay</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => handleSend(inv.id, e)}
                          className="p-1 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded"
                          title="Send Email to Customer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleOpenPrint(inv, e)}
                          className="p-1 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded"
                          title="Print / Save PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={(e) => handleCancel(inv.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Cancel Invoice"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!payModalInvoice}
        onClose={() => setPayModalInvoice(null)}
        title={`Record Payment for ${payModalInvoice?.invoice_number}`}
        maxWidth="max-w-md"
      >
        {payModalInvoice && (
          <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600 mb-1">
                <span>Customer:</span>
                <span className="font-semibold text-slate-800">{payModalInvoice.customer_name}</span>
              </div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>Invoice Total:</span>
                <span className="font-mono">${payModalInvoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-purple-900 border-t border-slate-200 pt-1">
                <span>Current Balance Due:</span>
                <span className="font-mono">${payModalInvoice.balance_due.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={payModalInvoice.balance_due}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800 text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Supports partial payments or full payment.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                >
                  <option value="credit_card">Credit Card</option>
                  <option value="bank_transfer">Bank Transfer (Wire)</option>
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
              <label className="block font-semibold text-slate-700 mb-1">Reference / Transaction Note</label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="e.g. Wire ref #TX-88912 or Stripe ID"
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>

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
                disabled={recordingPay}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
              >
                {recordingPay ? 'Saving Payment...' : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Invoice Print & PDF Preview Modal */}
      <InvoicePrintModal
        isOpen={!!printInvoice}
        onClose={() => setPrintInvoice(null)}
        invoice={printInvoice}
        lines={printLines}
      />
    </div>
  );
};

