// src/pages/BillingEngine.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  CalendarCheck2,
  Play,
  CheckCircle2,
  Clock,
  Repeat,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

interface BillingEngineProps {
  onNavigateToInvoice: (invoiceId: number) => void;
  onNavigateToInvoicesList: () => void;
}

export const BillingEngine: React.FC<BillingEngineProps> = ({ onNavigateToInvoice, onNavigateToInvoicesList }) => {
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [preview, setPreview] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  const fetchPreview = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await api.getBillingPreview(dateStr);
      setPreview(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.getBillingHistory();
      setHistory(res.runs);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPreview(targetDate);
    fetchHistory();
  }, [targetDate]);

  const handleRunBilling = async () => {
    setExecuting(true);
    setRunResult(null);
    try {
      const res = await api.runBilling(targetDate);
      setRunResult(res.result);
      // Refresh preview and history
      await fetchPreview(targetDate);
      await fetchHistory();
    } catch (err: any) {
      alert('Billing execution error: ' + err.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Automated Billing Day Engine</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              "Hundreds of subscriptions are due at once. Nobody should be typing invoices by hand. Nothing should be billed twice or skipped."
            </p>
          </div>

          {/* Target date selector + Execute button */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="font-semibold text-slate-600">Simulate Billing Date:</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent font-mono font-medium text-slate-800 outline-hidden"
              />
            </div>

            <button
              onClick={handleRunBilling}
              disabled={executing || !preview || preview.dueCount === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center space-x-2 transition-all ${
                preview && preview.dueCount > 0
                  ? 'bg-purple-700 hover:bg-purple-800 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{executing ? 'Generating Invoices...' : `Run Billing Batch (${preview?.dueCount || 0} Due)`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Execution Results Banner */}
      {runResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-900 space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <h3 className="text-sm font-extrabold text-emerald-900">
                Billing Day Execution Completed Successfully!
              </h3>
            </div>
            <button
              onClick={onNavigateToInvoicesList}
              className="text-xs font-bold text-emerald-800 hover:underline flex items-center space-x-1"
            >
              <span>View Generated Invoices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="bg-white/80 p-3 rounded-xl border border-emerald-100">
              <div className="text-[10px] uppercase font-bold text-slate-500">Subscriptions Processed</div>
              <div className="text-lg font-extrabold text-slate-800 font-mono mt-1">
                {runResult.subscriptionsProcessed}
              </div>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-emerald-100">
              <div className="text-[10px] uppercase font-bold text-slate-500">Invoices Generated</div>
              <div className="text-lg font-extrabold text-purple-700 font-mono mt-1">
                {runResult.invoicesGenerated}
              </div>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-emerald-100">
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Invoiced Amount</div>
              <div className="text-lg font-extrabold text-emerald-700 font-mono mt-1">
                ${runResult.totalBilledAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 max-h-40 overflow-y-auto space-y-1">
            <div className="text-[10px] font-bold uppercase text-slate-400">Execution Log Details:</div>
            {runResult.logs.map((log: string, idx: number) => (
              <div key={idx} className="text-[11px] font-mono text-slate-700 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Due Subscriptions Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-800">
                Subscriptions Due for Billing on {targetDate}
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {preview?.dueCount || 0} subscriptions
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Identified by next_billing_date &lt;= target date. Zero double-billing enforced.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Idempotency Protected</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading due subscriptions...</div>
        ) : preview?.dueSubscriptions?.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CalendarCheck2 className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
            <p className="text-xs font-medium text-slate-600">No subscriptions currently due on or before {targetDate}.</p>
            <p className="text-[11px] text-slate-400 mt-1">Select a later date to simulate the next billing cycle.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/30">
                  <th className="py-3 px-4">Sub #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Next Billing Date</th>
                  <th className="py-3 px-4 text-right">Recurring Amount</th>
                  <th className="py-3 px-4 text-center">Lifecycle Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.dueSubscriptions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-purple-700">
                      {s.subscription_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{s.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{s.customer_email}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {s.plan_name}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">
                      {s.billing_frequency}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-purple-900 bg-purple-50/50">
                      {s.next_billing_date}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ${s.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.auto_close_on_end ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Auto-Close on End
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500">
                          Continuous
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Billing Runs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800">Billing Run Audit Trail</h3>
          <p className="text-[11px] text-slate-400">Past automated billing executions & financial totals</p>
        </div>

        {history.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No previous billing runs recorded.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Run Date</th>
                <th className="py-2.5 px-4">Target Billing Date</th>
                <th className="py-2.5 px-4 text-center">Invoices Created</th>
                <th className="py-2.5 px-4 text-right">Amount Billed</th>
                <th className="py-2.5 px-4">Triggered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((h: any) => (
                <tr key={h.id}>
                  <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                    {new Date(h.run_date).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                    {h.target_billing_date}
                  </td>
                  <td className="py-2.5 px-4 text-center font-bold text-purple-700">
                    {h.invoices_generated}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                    ${h.total_amount_billed.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {h.run_by_name || 'System Scheduler'}
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

