// src/pages/Login.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, ArrowRight, ShieldCheck, Mail, Lock, Sparkles } from 'lucide-react';

interface LoginProps {
  onNavigateToRegister: () => void;
  onNavigateToForgot: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigateToRegister, onNavigateToForgot }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@brightloop.com');
  const [password, setPassword] = useState('Admin@12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const setCredentials = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-50/40 to-slate-100 flex flex-col justify-center items-center p-4">
      {/* Container */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-[#714B67] to-[#8E5D82] p-6 text-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-extrabold text-2xl mx-auto mb-3 shadow-inner">
            B
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Brightloop Software</h1>
          <p className="text-purple-100 text-xs mt-1">Unified Subscription Management & Recurring Billing</p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <h2 className="text-base font-bold text-slate-800 mb-1">Sign in to your account</h2>
          <p className="text-xs text-slate-500 mb-5">Access your admin portal, staff dashboard, or customer portal.</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={onNavigateToForgot}
                  className="text-purple-700 hover:text-purple-800 font-semibold"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-hidden transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg shadow-md transition-colors flex items-center justify-center space-x-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex items-center space-x-1 text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>Demo Quick-Fill Personas</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setCredentials('admin@brightloop.com', 'Admin@12345')}
                className="p-1.5 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded text-slate-700 font-medium transition-all text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setCredentials('sarah.sales@brightloop.com', 'Staff@12345')}
                className="p-1.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded text-slate-700 font-medium transition-all text-center"
              >
                Staff (Sales)
              </button>
              <button
                type="button"
                onClick={() => setCredentials('john@acmecorp.com', 'Customer@12345')}
                className="p-1.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded text-slate-700 font-medium transition-all text-center"
              >
                Customer
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-slate-500">
            Small business customer without an account?{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-purple-700 font-bold hover:underline"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

