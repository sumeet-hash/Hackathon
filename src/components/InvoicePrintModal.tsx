// src/components/InvoicePrintModal.tsx
import React from 'react';
import { Modal } from './Modal';
import { Printer, CheckCircle } from 'lucide-react';
import { Invoice, InvoiceLine } from '../types';

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  lines: InvoiceLine[];
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  invoice,
  lines
}) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invoice: ${invoice.invoice_number}`} maxWidth="max-w-3xl">
      <div className="flex justify-end mb-4 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Printer className="w-4 h-4 mr-1.5" />
          Print / Save PDF
        </button>
      </div>

      <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-xs print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-lg bg-[#714B67] flex items-center justify-center text-white font-bold text-lg">
                B
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Brightloop Software</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">100 Market St, Suite 400<br />San Francisco, CA 94105<br />billing@brightloop.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">Invoice</h2>
            <div className="text-sm font-semibold text-purple-700 mt-1">{invoice.invoice_number}</div>
            <div className="mt-2 text-xs text-slate-500">
              <div>Invoice Date: <span className="font-medium text-slate-700">{invoice.invoice_date}</span></div>
              <div>Due Date: <span className="font-medium text-slate-700">{invoice.due_date}</span></div>
              <div>Terms: <span className="font-medium text-slate-700 uppercase">{invoice.payment_terms.replace('_', ' ')}</span></div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-xs">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Billed To</div>
            <div className="font-bold text-slate-900 text-sm">{invoice.customer_name}</div>
            {invoice.company_name && <div className="text-slate-700 font-medium">{invoice.company_name}</div>}
            <div className="text-slate-600">{invoice.customer_email}</div>
            {invoice.address && <div className="text-slate-500 mt-1">{invoice.address}</div>}
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Billing Period</div>
              <div className="text-slate-700 font-medium">
                {invoice.billing_period_start || invoice.invoice_date} to {invoice.billing_period_end || invoice.due_date}
              </div>
              {invoice.subscription_number && (
                <div className="text-slate-500 mt-1">Ref Subscription: <span className="font-semibold text-purple-700">{invoice.subscription_number}</span></div>
              )}
            </div>
            {invoice.status === 'paid' && (
              <div className="mt-2 flex items-center text-emerald-600 font-bold text-xs uppercase tracking-wider">
                <CheckCircle className="w-4 h-4 mr-1" /> Fully Paid
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full text-left text-xs mb-8">
          <thead>
            <tr className="border-b border-slate-300 text-slate-600 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Unit Price</th>
              <th className="py-2.5 px-3 text-right">Tax</th>
              <th className="py-2.5 px-3 text-right">Discount</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l, i) => (
              <tr key={i} className="text-slate-800">
                <td className="py-3 px-3 font-medium">
                  {l.description}
                  {l.variant_value && (
                    <span className="block text-[11px] text-slate-500">{l.variant_value}</span>
                  )}
                </td>
                <td className="py-3 px-3 text-center">{l.quantity}</td>
                <td className="py-3 px-3 text-right font-mono">${l.unit_price.toFixed(2)}</td>
                <td className="py-3 px-3 text-right text-slate-500 font-mono">${(l.tax_amount || 0).toFixed(2)}</td>
                <td className="py-3 px-3 text-right text-emerald-600 font-mono">
                  {l.discount_amount > 0 ? `-$${l.discount_amount.toFixed(2)}` : '$0.00'}
                </td>
                <td className="py-3 px-3 text-right font-semibold font-mono">${l.line_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discount_total > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Total Discounts:</span>
                <span className="font-mono">-${invoice.discount_total.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxes:</span>
              <span className="font-mono font-medium">${invoice.tax_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-300 pt-2">
              <span>Total:</span>
              <span className="font-mono">${invoice.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono font-medium">${invoice.amount_paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200">
              <span>Balance Due:</span>
              <span className="font-mono">${invoice.balance_due.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Remittance */}
        <div className="border-t border-slate-200 pt-6 text-[11px] text-slate-500 space-y-1">
          <div className="font-bold text-slate-700 text-xs mb-1">Payment Instructions</div>
          <p>Please send payments to Brightloop Software Inc, Silicon Valley Bank, Routing #121000358, Account #889900112.</p>
          <p>Questions? Contact our billing desk at billing@brightloop.com</p>
        </div>
      </div>
    </Modal>
  );
};

