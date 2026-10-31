// src/components/Navbar.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, LogOut, User as UserIcon, Shield, Briefcase, UserCheck, ChevronDown, Sparkles } from 'lucide-react';
import { SimulatedEmailModal } from './SimulatedEmailModal';

interface NavbarProps {
  onNavigateToReset?: (token: string, email: string) => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigateToReset, activeTab }) => {
  const { user, logout, quickSwitch } = useAuth();
  const [showEmails, setShowEmails] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="flex items-center text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-semibold">
            <Shield className="w-3 h-3 mr-1" /> Admin
          </span>
        );
      case 'staff':
        return (
          <span className="flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-semibold">
            <Briefcase className="w-3 h-3 mr-1" /> Staff
          </span>
        );
      default:
        return (
          <span className="flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
            <UserCheck className="w-3 h-3 mr-1" /> Customer
          </span>
        );
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3 flex items-center justify-between shadow-2xs">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#714B67] to-[#8E5D82] flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
            B
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-base">Brightloop</span>
              <span className="text-xs px-1.5 py-0.5 rounded-sm bg-purple-50 text-purple-700 font-bold border border-purple-200">
                Odoo Suite
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Subscription Management Platform</p>
          </div>
        </div>

        {/* Action Controls & User */}
        <div className="flex items-center space-x-3">
          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSwitchMenu(!showSwitchMenu)}
              className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Switch Persona</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showSwitchMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Select User Role for Testing
                </div>
                <button
                  onClick={() => { quickSwitch('admin'); setShowSwitchMenu(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900">Alexander Vance</div>
                    <div className="text-[11px] text-slate-500">System Administrator (Full access)</div>
                  </div>
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Admin</span>
                </button>
                <button
                  onClick={() => { quickSwitch('staff_sales'); setShowSwitchMenu(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900">Sarah Jenkins</div>
                    <div className="text-[11px] text-slate-500">Sales Representative</div>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Sales</span>
                </button>
                <button
                  onClick={() => { quickSwitch('staff_finance'); setShowSwitchMenu(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900">Felix Chen</div>
                    <div className="text-[11px] text-slate-500">Finance Operations Lead</div>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">Finance</span>
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => { quickSwitch('customer_acme'); setShowSwitchMenu(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900">John Miller</div>
                    <div className="text-[11px] text-slate-500">Acme Corp (Small Business Portal)</div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Customer</span>
                </button>
                <button
                  onClick={() => { quickSwitch('customer_globex'); setShowSwitchMenu(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900">Elena Rostova</div>
                    <div className="text-[11px] text-slate-500">Globex Enterprises (Large Enterprise)</div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Customer</span>
                </button>
              </div>
            )}
          </div>

          {/* Simulated Email Button */}
          <button
            onClick={() => setShowEmails(true)}
            className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
            title="Inspect all simulated system emails (Reset links, Invoices, Receipts, Overdue reminders)"
          >
            <Mail className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Simulated Inbox</span>
          </button>

          {/* User Profile */}
          {user && (
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-800">{user.name}</div>
                <div className="text-[10px] text-slate-400">{user.company_name || user.email}</div>
              </div>
              <div>{getRoleBadge(user.role)}</div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Simulated Email Delivery Modal */}
      <SimulatedEmailModal
        isOpen={showEmails}
        onClose={() => setShowEmails(false)}
        onNavigateToReset={onNavigateToReset}
      />
    </>
  );
};

