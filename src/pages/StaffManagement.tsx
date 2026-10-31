// src/pages/StaffManagement.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Users,
  UserPlus,
  Shield,
  Briefcase,
  Trash2,
  Check,
  X,
  Mail,
  Lock,
  Phone
} from 'lucide-react';
import { User } from '../types';

export const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New staff modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password rules validation
  const hasMinLength = password.length > 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasSpecial;

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.getStaff();
      setStaff(res.staff);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Password must satisfy all security requirements.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await api.createStaff({
        name,
        email,
        role,
        phone,
        password
      });
      setShowModal(false);
      setName('');
      setEmail('');
      setPassword('');
      await fetchStaff();
    } catch (err: any) {
      setError(err.message || 'Error creating staff member');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteStaff = async (staffId: number) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await api.deleteStaff(staffId);
      await fetchStaff();
    } catch (err: any) {
      alert(err.message || 'Error deleting staff');
    }
  };

  const checkItem = (label: string, met: boolean) => (
    <div className={`flex items-center space-x-1.5 text-[11px] ${met ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
      {met ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
      <span>{label}</span>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Staff & Access Control</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            "Only the admin can add a new member of staff. Internal staff handle day-to-day work with limited access."
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member of Staff</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role Permission</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-900">
                  {s.name}
                  {s.id === user?.id && <span className="text-[10px] text-purple-600 font-normal ml-1.5">(You)</span>}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {s.email}
                </td>
                <td className="py-3 px-4">
                  {s.role === 'admin' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                      <Shield className="w-3 h-3 mr-1" /> System Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      <Briefcase className="w-3 h-3 mr-1" /> Internal Staff
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-500">
                  {s.phone || '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  {s.id !== user?.id && (
                    <button
                      onClick={() => handleDeleteStaff(s.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Remove Staff Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Admin: Add Member of Staff"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Liam Taylor"
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Staff Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="liam@brightloop.com"
              className="w-full border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2"
              >
                <option value="staff">Internal Staff</option>
                <option value="admin">System Admin</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full border border-slate-300 rounded-lg p-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Initial Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create secure staff password"
              className="w-full border border-slate-300 rounded-lg p-2"
            />

            <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-600 text-[11px]">Security Requirements:</div>
              <div className="grid grid-cols-2 gap-1">
                {checkItem('> 8 characters', hasMinLength)}
                {checkItem('Uppercase letter', hasUppercase)}
                {checkItem('Lowercase letter', hasLowercase)}
                {checkItem('Special character', hasSpecial)}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !isPasswordValid}
              className={`px-4 py-2 font-bold rounded-xl shadow-xs ${
                isPasswordValid
                  ? 'bg-purple-700 hover:bg-purple-800 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {creating ? 'Creating...' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

