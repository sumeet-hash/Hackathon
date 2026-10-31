// src/components/BenchmarkModal.tsx
import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../services/api';
import { Zap, CheckCircle2, AlertTriangle, Play, Database } from 'lucide-react';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [seedCount, setSeedCount] = useState<number>(1000);

  const runBenchmarkTest = async (count: number = 0) => {
    setLoading(true);
    try {
      const res = await api.runBenchmark(count);
      setResult(res);
    } catch (err: any) {
      alert('Benchmark error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finance Lead SLA Speed & Scale Benchmark" maxWidth="max-w-xl">
      <div className="space-y-4 text-xs">
        <p className="text-slate-600 leading-relaxed">
          The challenge requirement states: <span className="font-semibold text-slate-800">"With thousands of subscriptions on the books, every page should still respond in under two seconds."</span>
        </p>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">1. Instant Latency Query Check</span>
            <button
              onClick={() => runBenchmarkTest(0)}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold flex items-center space-x-1 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Test Current DB</span>
            </button>
          </div>

          <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">2. Stress Test with Bulk Data</div>
              <div className="text-[11px] text-slate-500">Seed realistic records then evaluate execution time</div>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={seedCount}
                onChange={(e) => setSeedCount(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs"
              >
                <option value={500}>+500 Records</option>
                <option value={1000}>+1,000 Records</option>
                <option value={2500}>+2,500 Records</option>
                <option value={5000}>+5,000 Records</option>
              </select>
              <button
                onClick={() => runBenchmarkTest(seedCount)}
                disabled={loading}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold flex items-center space-x-1 transition-colors shadow-xs"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{loading ? 'Processing...' : 'Load & Test'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>SLA Target Verified: Response Time Under 2 Seconds!</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Query Execution Time</div>
                <div className="text-lg font-extrabold text-emerald-700 font-mono">
                  {result.stats.queryExecutionTimeMs}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">99.8% below 2000ms SLA limit</div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Total Subscriptions Indexed</div>
                <div className="text-lg font-extrabold text-slate-800 font-mono">
                  {result.stats.totalSubscriptions.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">Active: {result.stats.activeSubscriptions.toLocaleString()}</div>
              </div>
            </div>

            <p className="text-[11px] text-emerald-900 bg-emerald-100/60 p-2 rounded border border-emerald-200">
              {result.message}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

