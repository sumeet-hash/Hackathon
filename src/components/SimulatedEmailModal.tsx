// src/components/SimulatedEmailModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../services/api';
import { Mail, Clock, ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import { SimulatedEmail } from '../types';

interface SimulatedEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToReset?: (token: string, email: string) => void;
}

export const SimulatedEmailModal: React.FC<SimulatedEmailModalProps> = ({
  isOpen,
  onClose,
  onNavigateToReset
}) => {
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await api.getSimulatedEmails();
      setEmails(res.emails);
      if (res.emails.length > 0 && !selectedEmail) {
        setSelectedEmail(res.emails[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmails();
    }
  }, [isOpen]);

  const extractResetToken = (email: SimulatedEmail) => {
    if (email.email_type !== 'password_reset') return null;
    const match = email.body.match(/token=([a-f0-9]+)&email=([^&\s]+)/);
    if (match) {
      return { token: match[1], email: decodeURIComponent(match[2]) };
    }
    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Simulated Email Delivery Inbox" maxWidth="max-w-4xl">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
        <p className="text-sm text-slate-500">
          Emails sent by the system (password resets, invoices, payment receipts, overdue reminders) are captured here for demonstration.
        </p>
        <button
          onClick={fetchEmails}
          disabled={loading}
          className="flex items-center text-xs font-semibold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {emails.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No emails sent yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[450px]">
          {/* Email list */}
          <div className="md:col-span-5 border border-slate-200 rounded-xl overflow-y-auto divide-y divide-slate-100">
            {emails.map((em) => {
              const isSelected = selectedEmail?.id === em.id;
              return (
                <button
                  key={em.id}
                  onClick={() => setSelectedEmail(em)}
                  className={`w-full text-left p-3 transition-colors ${
                    isSelected ? 'bg-purple-50/70 border-l-4 border-purple-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                      {em.email_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center">
                      <Clock className="w-3 h-3 mr-0.5" />
                      {new Date(em.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="font-medium text-xs text-slate-900 truncate">{em.subject}</div>
                  <div className="text-[11px] text-slate-500 truncate">To: {em.to_email}</div>
                </button>
              );
            })}
          </div>

          {/* Email Preview */}
          <div className="md:col-span-7 border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-slate-50/50">
            {selectedEmail ? (
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-3">
                  <h4 className="font-bold text-slate-800 text-sm">{selectedEmail.subject}</h4>
                  <div className="text-xs text-slate-500 mt-1">
                    To: <span className="font-medium text-slate-700">{selectedEmail.to_email}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Sent at: {new Date(selectedEmail.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto">
                  {selectedEmail.body}
                </div>

                {/* If password reset, show direct one-click link */}
                {selectedEmail.email_type === 'password_reset' && (
                  <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-purple-900">Simulate Customer Action</div>
                      <div className="text-[11px] text-purple-700">Open the reset password page with this token</div>
                    </div>
                    {onNavigateToReset && (
                      <button
                        onClick={() => {
                          const info = extractResetToken(selectedEmail);
                          if (info) {
                            onClose();
                            onNavigateToReset(info.token, info.email);
                          }
                        }}
                        className="flex items-center text-xs font-semibold px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg shadow-xs transition-colors"
                      >
                        Reset Password Now
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">Select an email to view details</div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

