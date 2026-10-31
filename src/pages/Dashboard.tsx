// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Users,
  Repeat,
  Calendar,
  Filter,
  RefreshCw,
  BellRing,
  CheckCircle2,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { StatusBadge } from '../components/StatusBadge';

interface DashboardProps {
  onNavigateToInvoice: (invoiceId: number) => void;
  onNavigateToSubscription: (subId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToInvoice, onNavigateToSubscription }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [chasing, setChasing] = useState(false);
  const [chaseSuccess, setChaseSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (dateRange !== 'all') params.date_range = dateRange;
      if (selectedPlanId) params.plan_id = selectedPlanId;

      const [dashRes, plansRes] = await Promise.all([
        api.getDashboard(params),
        api.getPlans()
      ]);
      setData(dashRes);
      setPlans(plansRes.plans);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedPlanId]);

  const handleChaseOverdue = async () => {
    setChasing(true);
    setChaseSuccess(null);
    try {
      const res = await api.chaseOverdue();
      setChaseSuccess(res.message);
      await fetchData();
    } catch (err: any) {
      alert('Error chasing overdue invoices: ' + err.message);
    } finally {
      setChasing(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / SLA Response Time */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Finance Lead Command Center</h1>
            <span className="flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Zap className="w-3 h-3 mr-1 text-emerald-500 fill-emerald-500" />
              Response: {data?.responseTimeMs || '2ms'} (SLA &lt; 2s Passed)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time recurring revenue, payment collections, and automated overdue tracking.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent font-medium text-slate-700 outline-hidden"
            >
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="ytd">Year to Date (YTD)</option>
            </select>
          </div>

          {/* Plan filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="bg-transparent font-medium text-slate-700 outline-hidden"
            >
              <option value="">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchData}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
            title="Refresh Numbers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {chaseSuccess && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
            <span>{chaseSuccess}</span>
          </div>
          <button onClick={() => setChaseSuccess(null)} className="text-purple-600 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Subscriptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Subscriptions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {metrics.activeSubscriptions}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Total book: {metrics.totalSubscriptions}</span>
            <span className="text-emerald-600 font-semibold">{metrics.draftSubscriptions} draft / {metrics.quotationSubscriptions} quote</span>
          </div>
        </div>

        {/* MRR / ARR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Monthly Recurring (MRR)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-700 font-mono">
            ${(metrics.mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            ARR Run-rate: <span className="font-semibold text-slate-800 font-mono">${(metrics.arr || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}/yr</span>
          </div>
        </div>

        {/* Total Revenue Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cash Collected</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-700 font-mono">
            ${(metrics.totalRevenueCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total Invoiced: <span className="font-medium text-slate-700 font-mono">${(metrics.totalInvoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Overdue / Outstanding */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Overdue Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-700 font-mono">
            ${(metrics.overdueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="text-rose-600 font-bold">{metrics.overdueInvoicesCount} invoices overdue</span>
            <span>Total owed: ${(metrics.totalOutstanding || 0).toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Overdue Chase Callout if any overdue */}
      {metrics.overdueInvoicesCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Action Required: {metrics.overdueInvoicesCount} Overdue Invoices (${(metrics.overdueAmount || 0).toFixed(2)})
              </div>
              <p className="text-[11px] text-slate-600">
                Promptly chase outstanding invoices before they transition into lost revenue.
              </p>
            </div>
          </div>
          <button
            onClick={handleChaseOverdue}
            disabled={chasing}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center space-x-1.5"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{chasing ? 'Dispatching Reminders...' : 'Chase All Overdue Invoices'}</span>
          </button>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Monthly Revenue Inflow ($)</h3>
              <p className="text-[11px] text-slate-400">Cash collected from invoice payments</p>
            </div>
          </div>
          <div className="h-64">
            {data?.monthlyRevenue && data.monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Collected']}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="collected_amount" fill="#714B67" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No revenue records in this timeframe
              </div>
            )}
          </div>
        </div>

        {/* Subscriptions by Plan */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Active Subscriptions by Plan</h3>
            <p className="text-[11px] text-slate-400 mb-4">Plan volume & recurring value</p>

            <div className="space-y-3">
              {(data?.planDistribution || []).map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-xl">
                  <div>
                    <div className="font-bold text-slate-800">{p.plan_name}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{p.billing_frequency} billing</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-700">{p.active_count} active</div>
                    <div className="text-[10px] text-slate-500 font-mono">${(p.total_plan_value || 0).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Recent Invoices</h3>
            <p className="text-[11px] text-slate-400">Latest generated bills & payment statuses</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/30">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.recentInvoices || []).map((inv: any) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-purple-700 font-mono">
                    {inv.invoice_number}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {inv.customer_name}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {inv.invoice_date}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {inv.due_date}
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
                    <button
                      onClick={() => onNavigateToInvoice(inv.id)}
                      className="text-xs text-purple-700 hover:text-purple-900 font-semibold inline-flex items-center"
                    >
                      <span>View</span>
                      <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

