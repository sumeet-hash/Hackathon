// src/components/Sidebar.tsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Repeat,
  FileText,
  CalendarCheck2,
  FileBox,
  Layers,
  Percent,
  Receipt,
  Users,
  CreditCard,
  UserCheck,
  Zap
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenBenchmark: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, onOpenBenchmark }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff' || isAdmin;
  const isCustomer = user?.role === 'customer';

  const navItem = (id: string, label: string, icon: React.ReactNode, badge?: string) => {
    const active = currentTab === id;
    return (
      <button
        key={id}
        onClick={() => onSelectTab(id)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
          active
            ? 'bg-purple-700 text-white shadow-xs shadow-purple-200'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <span className={active ? 'text-white' : 'text-slate-500'}>{icon}</span>
          <span>{label}</span>
        </div>
        {badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            active ? 'bg-purple-900/60 text-purple-100' : 'bg-slate-200 text-slate-700'
          }`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 shrink-0 h-[calc(100vh-61px)] overflow-y-auto">
      <div className="space-y-6">
        {/* Staff & Admin Navigation */}
        {isStaff && (
          <>
            <div>
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Operations & Finance
              </div>
              <div className="space-y-1">
                {navItem('dashboard', 'Finance Dashboard', <LayoutDashboard className="w-4 h-4" />)}
                {navItem('billing_engine', 'Billing Day Engine', <CalendarCheck2 className="w-4 h-4" />)}
                {navItem('subscriptions', 'Subscriptions', <Repeat className="w-4 h-4" />)}
                {navItem('invoices', 'Invoices & Receivables', <FileText className="w-4 h-4" />)}
                {navItem('quotation_templates', 'Quote Templates', <FileBox className="w-4 h-4" />)}
              </div>
            </div>

            <div>
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Configuration & Catalog
              </div>
              <div className="space-y-1">
                {navItem('products', 'Products & Variants', <Layers className="w-4 h-4" />)}
                {navItem('plans', 'Plans & Policies', <Repeat className="w-4 h-4" />)}
                {navItem('discounts', 'Discounts Rules', <Percent className="w-4 h-4" />, isAdmin ? 'Admin' : undefined)}
                {navItem('taxes', 'Tax Rules', <Receipt className="w-4 h-4" />, isAdmin ? 'Admin' : undefined)}
                {isAdmin && navItem('staff', 'Staff & Access', <Users className="w-4 h-4" />, 'Admin Only')}
              </div>
            </div>
          </>
        )}

        {/* Customer Portal Navigation */}
        {isCustomer && (
          <div>
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Customer Self-Service
            </div>
            <div className="space-y-1">
              {navItem('customer_portal', 'My Subscriptions', <Repeat className="w-4 h-4" />)}
              {navItem('customer_invoices', 'My Invoices & Payments', <CreditCard className="w-4 h-4" />)}
            </div>
          </div>
        )}
      </div>

      {/* Benchmark & SLA Verification Footer */}
      {isStaff && (
        <div className="border-t border-slate-200 pt-4 mt-6">
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-3.5 text-xs text-purple-900">
            <div className="flex items-center space-x-1.5 font-bold mb-1">
              <Zap className="w-4 h-4 text-purple-600 fill-purple-600" />
              <span>SLA Performance</span>
            </div>
            <p className="text-[11px] text-purple-700 leading-relaxed mb-3">
              Page response time benchmarked under 2.0 seconds with thousands of subscriptions.
            </p>
            <button
              onClick={onOpenBenchmark}
              className="w-full py-1.5 px-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center space-x-1"
            >
              <span>Run Speed Benchmark</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

