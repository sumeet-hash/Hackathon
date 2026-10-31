// src/pages/ResetPassword.tsx
import React, { useState } from 'react';
import { ArrowLeft, Lock, Check, X, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface ResetPasswordProps {
  token: string;
  email: string;
  onNavigateToLogin: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ token, email, onNavigateToLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMinLength = newPassword.length > 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword);
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasSpecial && matches;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Please satisfy all password complexity rules.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await api.resetPassword({ token, email, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const checkItem = (label: string, met: boolean) => (
    <div className={`flex items-center space-x-1.5 text-[11px] ${met ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
      {met ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
      <span>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-50/40 to-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#714B67] to-[#8E5D82] p-6 text-white">
          <button
            onClick={onNavigateToLogin}
            className="flex items-center text-xs text-purple-200 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Sign In
          </button>
          <h1 className="text-xl font-extrabold tracking-tight">Set New Password</h1>
          <p className="text-purple-100 text-xs mt-1">
            Setting new credentials for <span className="font-semibold text-white">{email}</span>
          </p>
        </div>

        <div className="p-6">
          {success ? (
            <div className="space-y-4 text-xs text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Password Reset Complete</h3>
              <p className="text-slate-600">
                Your password has been successfully updated in compliance with security policies.
              </p>
              <button
                onClick={onNavigateToLogin}
                className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg shadow-md transition-colors"
              >
                Sign In With New Password
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
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-hidden"
                  />
                </div>
              </div>

              {/* Password checklist */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-semibold text-slate-600 text-[11px]">Security Validation:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {checkItem('> 8 characters', hasMinLength)}
                  {checkItem('Uppercase letter', hasUppercase)}
                  {checkItem('Lowercase letter', hasLowercase)}
                  {checkItem('Special character', hasSpecial)}
                  {checkItem('Passwords match', matches)}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordValid}
                className={`w-full py-2.5 px-4 font-bold rounded-lg shadow-md transition-colors flex items-center justify-center space-x-1.5 ${
                  isPasswordValid
                    ? 'bg-purple-700 hover:bg-purple-800 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

