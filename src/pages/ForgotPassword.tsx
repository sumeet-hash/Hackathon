// src/pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { ArrowLeft, Mail, CheckCircle2, Send, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

interface ForgotPasswordProps {
  onNavigateToLogin: () => void;
  onNavigateToReset: (token: string, email: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigateToLogin, onNavigateToReset }) => {
  const [email, setEmail] = useState('john@acmecorp.com');
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ message: string; simulatedResetLink?: string; token?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword({ email });
      setSuccessInfo(res);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-50/40 to-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#714B67] to-[#8E5D82] p-6 text-white">
          <button
            onClick={onNavigateToLogin}
            className="flex items-center text-xs text-purple-200 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Sign In
          </button>
          <h1 className="text-xl font-extrabold tracking-tight">Reset Password</h1>
          <p className="text-purple-100 text-xs mt-1">
            Enter your registered email to receive a password reset link.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {successInfo ? (
            <div className="space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800">
                <div className="flex items-center space-x-2 font-bold text-sm mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Reset Link Sent!</span>
                </div>
                <p className="leading-relaxed">
                  A reset link has been dispatched to <span className="font-semibold">{email}</span>.
                </p>
              </div>

              {successInfo.token && (
                <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-xl space-y-2">
                  <div className="font-bold text-purple-900 text-xs">Simulate Email Link Click</div>
                  <p className="text-[11px] text-purple-700">
                    In this demo environment, you can directly launch the reset link below:
                  </p>
                  <button
                    onClick={() => onNavigateToReset(successInfo.token!, email)}
                    className="w-full py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                  >
                    <span>Proceed to Reset Form</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={onNavigateToLogin}
                className="w-full py-2 text-center text-slate-600 font-semibold hover:text-slate-900"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@acmecorp.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg shadow-md transition-colors flex items-center justify-center space-x-1.5"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Sending link...' : 'Send Reset Link'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

