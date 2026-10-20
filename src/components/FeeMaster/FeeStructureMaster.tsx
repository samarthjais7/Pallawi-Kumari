import React, { useState } from 'react';
import { FeeStructure, FeeHeadItem, StudentQuota } from '../../types/fee';
import { INITIAL_FEE_STRUCTURES } from '../../data/mockData';
import { 
  Building, 
  Plus, 
  Trash2, 
  Check, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Layers,
  Sparkles,
  Edit2
} from 'lucide-react';

export const FeeStructureMaster: React.FC = () => {
  const [structures, setStructures] = useState<FeeStructure[]>(INITIAL_FEE_STRUCTURES);
  const [selectedStructureId, setSelectedStructureId] = useState<string>(structures[0].id);
  const [activeQuotaFilter, setActiveQuotaFilter] = useState<StudentQuota>('General');

  // Form for new fee head
  const [newHeadName, setNewHeadName] = useState<string>('');
  const [newHeadCategory, setNewHeadCategory] = useState<FeeHeadItem['category']>('Academic');
  const [newHeadAmount, setNewHeadAmount] = useState<number>(5000);
  const [isMandatory, setIsMandatory] = useState<boolean>(true);

  // Inline editing state for existing head
  const [editingHeadId, setEditingHeadId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<number>(0);

  const activeStructure = structures.find((s) => s.id === selectedStructureId) || structures[0];

  const totalStructureAmount = activeStructure.heads.reduce((sum, h) => sum + h.amount, 0);

  const handleStartEdit = (head: FeeHeadItem) => {
    setEditingHeadId(head.id);
    setEditingAmount(head.amount);
  };

  const handleSaveHeadAmount = (headId: string) => {
    if (editingAmount <= 0) return;
    const updatedStructures = structures.map((s) => {
      if (s.id === activeStructure.id) {
        return {
          ...s,
          heads: s.heads.map((h) => (h.id === headId ? { ...h, amount: editingAmount } : h)),
        };
      }
      return s;
    });
    setStructures(updatedStructures);
    setEditingHeadId(null);
  };

  const handleAddHead = () => {
    if (!newHeadName.trim() || newHeadAmount <= 0) return;

    const newHead: FeeHeadItem = {
      id: 'fh-' + Date.now().toString().slice(-4),
      name: newHeadName.trim(),
      category: newHeadCategory,
      amount: newHeadAmount,
      isMandatory,
      isTaxExempt: true,
    };

    const updatedStructures = structures.map((s) => {
      if (s.id === activeStructure.id) {
        return {
          ...s,
          heads: [...s.heads, newHead],
        };
      }
      return s;
    });

    setStructures(updatedStructures);
    setNewHeadName('');
    setNewHeadAmount(5000);
  };

  const handleRemoveHead = (headId: string) => {
    const updatedStructures = structures.map((s) => {
      if (s.id === activeStructure.id) {
        return {
          ...s,
          heads: s.heads.filter((h) => h.id !== headId),
        };
      }
      return s;
    });
    setStructures(updatedStructures);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Institutional Master Configuration
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            Fee Head Master & Multi-Quota Structure Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Define itemized heads, Section 10(23C) tax exempt status, and automated late fine tiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {structures.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStructureId(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                s.id === activeStructure.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {s.course} ({s.branch.split(' ')[0]})
            </button>
          ))}
        </div>
      </section>

      {/* Main Configuration Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Active Fee Structure & Head Itemization (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {activeStructure.course} · {activeStructure.branch}
                </h3>
                <p className="text-xs text-slate-500">
                  Academic Year {activeStructure.academicYear} · Semester {activeStructure.semester}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 uppercase block font-medium">Annual Base Package</span>
                <span className="text-lg font-mono font-bold text-indigo-700">
                  ₹{totalStructureAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Quota Surcharge Multiplier Preview */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="font-semibold text-slate-700 block mb-1">
                Quota-Based Tuition Multiplier Rules:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">General / State</span>
                  <span className="font-bold text-slate-900">1.0x (Standard)</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">Management Quota</span>
                  <span className="font-bold text-indigo-700">1.45x Surcharge</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">NRI / Foreign</span>
                  <span className="font-bold text-purple-700">2.2x ($4,200)</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">SC/ST Freeship</span>
                  <span className="font-bold text-emerald-700">75% Govt Subsidized</span>
                </div>
              </div>
            </div>

            {/* Fee Heads List */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Active Fee Heads ({activeStructure.heads.length} Components)
              </label>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {activeStructure.heads.map((head, idx) => (
                  <div
                    key={head.id}
                    className="p-3 bg-white flex items-center justify-between hover:bg-slate-50/70 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400 w-5">{idx + 1}.</span>
                      <div>
                        <span className="font-semibold text-slate-900 block">{head.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{head.category}</span>
                          <span>·</span>
                          <span>{head.isMandatory ? 'Mandatory' : 'Optional'}</span>
                          <span>·</span>
                          <span className="text-emerald-700">Tax Exempt (10(23C))</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingHeadId === head.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-500">₹</span>
                          <input
                            type="number"
                            step="500"
                            value={editingAmount}
                            onChange={(e) => setEditingAmount(Number(e.target.value))}
                            className="w-24 p-1 text-xs font-mono font-bold border border-indigo-500 rounded bg-white"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveHeadAmount(head.id);
                              if (e.key === 'Escape') setEditingHeadId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveHeadAmount(head.id)}
                            className="p-1 bg-emerald-700 text-white rounded hover:bg-emerald-800"
                            title="Save Amount"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            ₹{head.amount.toLocaleString('en-IN')}
                          </span>
                          <button
                            onClick={() => handleStartEdit(head)}
                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Edit Amount"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleRemoveHead(head.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors ml-1"
                        title="Delete Fee Head"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Add Fee Head & Late Fine Automation Policies (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Add New Fee Head */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Add New Fee Component</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Fee Head Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Industry Placement & Certifications"
                  value={newHeadName}
                  onChange={(e) => setNewHeadName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Category</label>
                  <select
                    value={newHeadCategory}
                    onChange={(e) => setNewHeadCategory(e.target.value as string)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
                  >
                    <option value="Tuition">Tuition</option>
                    <option value="Academic">Academic</option>
                    <option value="Hostel">Hostel</option>
                    <option value="Transport">Transport</option>
                    <option value="One-Time">One-Time</option>
                    <option value="Refundable">Refundable</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Standard Amount (₹)</label>
                  <input
                    type="number"
                    step="500"
                    value={newHeadAmount}
                    onChange={(e) => setNewHeadAmount(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mandatoryCheck"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="mandatoryCheck" className="text-slate-700 cursor-pointer">
                  Mandatory fee head for all cohort students
                </label>
              </div>

              <button
                onClick={handleAddHead}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Append Fee Head to Structure</span>
              </button>
            </div>
          </div>

          {/* Late Fine & Due Date Rules Policy */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
              <Clock className="w-4 h-4" />
              <span>Automated Dunning & Late Fine Engine</span>
            </div>
            <p className="text-xs text-slate-500">
              Rules governing overdue notices, automated penalty calculation, and exam admit card lock.
            </p>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Semester Due Date:</span>
                <span className="font-mono font-bold text-slate-900">{activeStructure.dueDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Grace Period:</span>
                <span className="font-mono font-bold text-slate-900">{activeStructure.gracePeriodDays} Days (No Fine)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Daily Late Penalty:</span>
                <span className="font-mono font-bold text-amber-700">₹{activeStructure.lateFeePerDay} / day</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Maximum Penalty Ceiling:</span>
                <span className="font-mono font-bold text-slate-900">₹{activeStructure.maxLateFee.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-600">Admit Card Hold Threshold:</span>
                <span className="font-bold text-rose-700">14 Days Overdue</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
