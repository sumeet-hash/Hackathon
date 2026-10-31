// src/components/StatusBadge.tsx
import React from 'react';

interface StatusBadgeProps {
  status: string;
  isOverdue?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isOverdue, className = '' }) => {
  const norm = (status || '').toLowerCase();

  if (isOverdue) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse ${className}`}>
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-500" />
        Overdue
      </span>
    );
  }

  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let dot = 'bg-slate-400';
  let label = status;

  switch (norm) {
    case 'active':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dot = 'bg-emerald-500';
      label = 'Active';
      break;
    case 'confirmed':
      style = 'bg-blue-50 text-blue-700 border-blue-200';
      dot = 'bg-blue-500';
      label = 'Confirmed';
      break;
    case 'quotation':
      style = 'bg-purple-50 text-purple-700 border-purple-200';
      dot = 'bg-purple-500';
      label = 'Quotation';
      break;
    case 'draft':
      style = 'bg-amber-50 text-amber-700 border-amber-200';
      dot = 'bg-amber-500';
      label = 'Draft';
      break;
    case 'paused':
      style = 'bg-orange-50 text-orange-700 border-orange-200';
      dot = 'bg-orange-500';
      label = 'Paused';
      break;
    case 'closed':
      style = 'bg-slate-100 text-slate-600 border-slate-300';
      dot = 'bg-slate-400';
      label = 'Closed';
      break;
    case 'paid':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dot = 'bg-emerald-500';
      label = 'Paid';
      break;
    case 'cancelled':
      style = 'bg-slate-100 text-slate-500 border-slate-300 line-through';
      dot = 'bg-slate-400';
      label = 'Cancelled';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${style} ${className}`}>
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};

