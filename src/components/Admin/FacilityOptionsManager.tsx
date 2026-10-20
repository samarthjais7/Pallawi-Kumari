import React, { useState } from 'react';
import { FacilityServiceOption, FacilityCategory, UserSession } from '../../types/fee';
import { safeConfirm } from '../../utils/safeHelpers';
import { 
  Award, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Building, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Tag, 
  Layers,
  HelpCircle
} from 'lucide-react';

interface Props {
  facilityOptions: FacilityServiceOption[];
  onUpdateFacilityOptions: (options: FacilityServiceOption[]) => void;
  currentSession: UserSession | null;
  onSwitchToAccountsOfficer?: () => void;
}

export const FacilityOptionsManager: React.FC<Props> = ({
  facilityOptions,
  onUpdateFacilityOptions,
  currentSession,
  onSwitchToAccountsOfficer,
}) => {
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('ALL');
  const [activePayableFilter, setActivePayableFilter] = useState<'ALL' | 'PAYABLE' | 'FREE'>('ALL');
  
  // Admin Add/Edit Service Option Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<FacilityServiceOption | null>(null);
  const [optionForm, setOptionForm] = useState<Partial<FacilityServiceOption>>({
    title: '',
    code: '',
    description: '',
    category: 'Certificate',
    isPayable: false,
    processingDays: 2,
    requiresNoDues: false,
    validity: 'Current Academic Year',
    isActive: true,
  });
  const [rawDocsInput, setRawDocsInput] = useState('');

  // Accountant Fee Marking Modal
  const [pricingOption, setPricingOption] = useState<FacilityServiceOption | null>(null);
  const [pricingFeeAmount, setPricingFeeAmount] = useState<number>(0);
  const [pricingTreasuryCode, setPricingTreasuryCode] = useState<string>('0202-01-800-01');
  const [accountantRemarks, setAccountantRemarks] = useState<string>('Approved as per State Higher Education Statutory Tariff Schedule');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const isAccountsOfficer = currentSession?.staffRole === 'Accounts_Officer';
  const isAppAdmin = currentSession?.staffRole === 'App_Admin' || currentSession?.isAppAdmin;

  // Filtered options
  const filteredOptions = facilityOptions.filter((opt) => {
    if (activeFilterCategory !== 'ALL' && opt.category !== activeFilterCategory) return false;
    if (activePayableFilter === 'PAYABLE' && !opt.isPayable) return false;
    if (activePayableFilter === 'FREE' && opt.isPayable) return false;
    return true;
  });

  const payableCount = facilityOptions.filter((o) => o.isPayable).length;
  const freeCount = facilityOptions.filter((o) => !o.isPayable).length;

  // Open Admin Add Modal
  const handleOpenAddModal = () => {
    setEditingOption(null);
    setFormError(null);
    setOptionForm({
      title: '',
      code: `OPT-${Date.now().toString().slice(-4)}`,
      description: '',
      category: 'Certificate',
      isPayable: false,
      feeAmount: 0,
      processingDays: 2,
      requiresNoDues: false,
      validity: 'Current Academic Year',
      isActive: true,
    });
    setRawDocsInput('College Identity Card Copy');
    setIsModalOpen(true);
  };

  // Open Admin Edit Modal
  const handleOpenEditModal = (opt: FacilityServiceOption) => {
    setEditingOption(opt);
    setFormError(null);
    setOptionForm({ ...opt });
    setRawDocsInput(opt.requiredDocuments?.join(', ') || '');
    setIsModalOpen(true);
  };

  // Save Admin Option
  const handleSaveOption = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!optionForm.title?.trim()) {
      setFormError('Option Title is required.');
      return;
    }

    if (optionForm.isPayable) {
      const fee = Number(optionForm.feeAmount);
      if (!fee || fee <= 0) {
        setFormError('State tariff regulations mandate an approved fee (> ₹0) before activating payable status.');
        return;
      }
    }

    const docs = rawDocsInput
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    const willBePayable = !!optionForm.isPayable;
    const feeVal = willBePayable ? Number(optionForm.feeAmount) || 0 : 0;

    if (editingOption) {
      const updated = facilityOptions.map((opt) => {
        if (opt.id === editingOption.id) {
          return {
            ...editingOption,
            ...optionForm,
            isPayable: willBePayable,
            feeAmount: feeVal,
            feeSetBy: willBePayable ? (currentSession?.name || editingOption.feeSetBy || 'Administrator') : undefined,
            requiredDocuments: docs,
          } as FacilityServiceOption;
        }
        return opt;
      });
      onUpdateFacilityOptions(updated);
      setSuccessBanner(`Option "${optionForm.title}" updated successfully.`);
    } else {
      const newOption: FacilityServiceOption = {
        id: 'OPT-' + Date.now().toString().slice(-6),
        code: optionForm.code?.toUpperCase().trim() || `OPT-${Date.now().toString().slice(-4)}`,
        title: optionForm.title.trim(),
        description: optionForm.description || '',
        category: (optionForm.category as FacilityCategory) || 'Certificate',
        isPayable: willBePayable,
        feeAmount: feeVal,
        feeSetBy: willBePayable ? (currentSession?.name || 'Administrator') : undefined,
        feeTreasuryCode: willBePayable ? '0202-01-800-01' : undefined,
        processingDays: Number(optionForm.processingDays) || 2,
        requiresNoDues: !!optionForm.requiresNoDues,
        requiredDocuments: docs,
        validity: optionForm.validity || 'Current Academic Year',
        isActive: optionForm.isActive ?? true,
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: currentSession?.name ? `${currentSession.name} (${currentSession.staffDesignation || 'App Administrator'})` : 'App Administrator',
      };
      onUpdateFacilityOptions([...facilityOptions, newOption]);
      setSuccessBanner(`New option "${newOption.title}" created (${willBePayable ? `PAYABLE ₹${feeVal}` : 'FREE'}).`);
    }

    setIsModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Delete Option
  const handleDeleteOption = (id: string, title: string) => {
    if (safeConfirm(`Are you sure you want to remove "${title}" from the student facility & certificate options list?`)) {
      onUpdateFacilityOptions(facilityOptions.filter((o) => o.id !== id));
      setSuccessBanner(`Option "${title}" removed.`);
      setTimeout(() => setSuccessBanner(null), 3000);
    }
  };

  // Open Accountant Pricing Modal
  const handleOpenPricingModal = (opt: FacilityServiceOption) => {
    setPricingOption(opt);
    setPricingFeeAmount(opt.feeAmount || 50);
    setPricingTreasuryCode(opt.feeTreasuryCode || '0202-01-800-01');
    setAccountantRemarks('Verified against State Treasury Schedule and Academic Council Notification');
  };

  // Save Accountant Fee Amount
  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricingOption) return;

    const accountantName = currentSession?.name || 'S. N. Sharma';
    const accountantRole = currentSession?.staffDesignation || 'Accounts Officer & Treasury Bursar';
    const timeNow = new Date().toISOString().split('T')[0];

    const updated = facilityOptions.map((opt) => {
      if (opt.id === pricingOption.id) {
        return {
          ...opt,
          feeAmount: Math.max(0, Number(pricingFeeAmount)),
          feeTreasuryCode: pricingTreasuryCode.trim(),
          feeSetBy: `${accountantName} (${accountantRole})`,
          feeSetAt: timeNow,
        };
      }
      return opt;
    });

    onUpdateFacilityOptions(updated);
    setSuccessBanner(`Statutory fee for "${pricingOption.title}" set to ₹${pricingFeeAmount} by ${accountantName}.`);
    setPricingOption(null);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining Admin vs Accountant Rights */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-100 text-purple-900 border border-purple-200">
              Institutional Master Controller
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800">
              Admin: Adds & Decides Free/Payable
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800">
              Accountant: Marks Fee Amount
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-1">
            Certificate & Campus Facility Options Master
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin has the authority to add/modify certificate and facility options and decide if they are <strong>Free</strong> or <strong>Payable</strong>. 
            If payable, the <strong>Accountant / Accounts Officer</strong> has exclusive statutory rights to mark the official fee amount.
          </p>
        </div>

        {/* Action Button: Add New Option (Admin) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleOpenAddModal}
            className="py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Certificate / Facility Option</span>
          </button>
        </div>
      </div>

      {/* Role State Context Pill */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-800 block">
              Current Session: {currentSession?.name || 'Administrator'} ({currentSession?.staffDesignation || 'System Admin'})
            </span>
            <span className="text-[11px] text-slate-500">
              {isAccountsOfficer 
                ? '⭐ You are authorized as Accounts Officer: You can mark and update fee amounts for any payable facility.'
                : '⭐ You are logged in as Administrator: You can add/modify options and toggle Free vs. Payable status.'}
            </span>
          </div>
        </div>

        {!isAccountsOfficer && onSwitchToAccountsOfficer && (
          <button
            onClick={onSwitchToAccountsOfficer}
            className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap self-start sm:self-auto flex items-center gap-1 shadow-xs"
            title="Switch to Accounts Officer to test marking statutory fee amounts"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Switch to Accounts Officer (Mark Fees)</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          <span className="text-slate-400 font-bold uppercase text-[10px] mr-1">Category:</span>
          {['ALL', 'Certificate', 'Campus_Facility', 'Academic_Service'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilterCategory(cat)}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilterCategory === cat
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Services' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Free vs Payable Filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActivePayableFilter('ALL')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              activePayableFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All ({facilityOptions.length})
          </button>
          <button
            onClick={() => setActivePayableFilter('PAYABLE')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
              activePayableFilter === 'PAYABLE' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Payable ({payableCount})</span>
          </button>
          <button
            onClick={() => setActivePayableFilter('FREE')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
              activePayableFilter === 'FREE' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Free ({freeCount})</span>
          </button>
        </div>
      </div>

      {/* Grid of Facility Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOptions.map((opt) => (
          <div
            key={opt.id}
            className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between transition-all ${
              opt.isPayable
                ? 'border-amber-200 hover:border-amber-300'
                : 'border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div>
              {/* Header Badges */}
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 font-mono">
                  {opt.code}
                </span>

                {/* Payable vs Free Badge */}
                {opt.isPayable ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    <DollarSign className="w-3 h-3 text-amber-700" />
                    <span>Payable: ₹{opt.feeAmount}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>FREE OF COST</span>
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h4 className="font-bold text-slate-900 text-sm mb-1 leading-snug">
                {opt.title}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-3 mb-3">
                {opt.description}
              </p>

              {/* Metadata Pills */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-semibold text-slate-700">{opt.category.replace('_', ' ')}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-400">Turnaround:</span>
                  <span className="font-semibold text-slate-700">{opt.processingDays} working days</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-400">Requires No Dues:</span>
                  <span className={`font-semibold ${opt.requiresNoDues ? 'text-amber-700' : 'text-slate-600'}`}>
                    {opt.requiresNoDues ? 'Yes (NOC Clearance)' : 'No'}
                  </span>
                </div>

                {opt.isPayable && (
                  <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg text-[10px] space-y-0.5 mt-2">
                    <div className="flex justify-between font-semibold text-amber-900">
                      <span>Statutory Fee:</span>
                      <span className="font-mono font-bold text-xs">₹{opt.feeAmount}</span>
                    </div>
                    {opt.feeSetBy && (
                      <div className="text-amber-800">
                        Marked by: {opt.feeSetBy}
                      </div>
                    )}
                    {opt.feeTreasuryCode && (
                      <div className="text-amber-700 font-mono text-[9px]">
                        Treasury Code: {opt.feeTreasuryCode}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              {/* Accountant Action Button if Payable */}
              {opt.isPayable ? (
                <button
                  onClick={() => handleOpenPricingModal(opt)}
                  className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                  title="Accountant right to mark/adjust statutory fee payable"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Set Fee (Accountant)</span>
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">Free service (₹0 fee)</span>
              )}

              {/* Admin Edit & Delete Buttons */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  onClick={() => handleOpenEditModal(opt)}
                  className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Admin: Modify option details or Free/Payable classification"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteOption(opt.id, opt.title)}
                  className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Admin: Delete option"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOptions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-600">No certificate or facility options match your filters.</p>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ADMIN ADD / MODIFY OPTION & DECIDE PAYABLE / FREE */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto my-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                  Admin Authority Panel
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {editingOption ? 'Modify Certificate / Facility Option' : 'Add New Certificate or Facility Option'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveOption} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Title / Facility Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Migration Certificate, Swimming Pool Pass"
                  value={optionForm.title || ''}
                  onChange={(e) => setOptionForm({ ...optionForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={optionForm.category || 'Certificate'}
                    onChange={(e) => setOptionForm({ ...optionForm, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white"
                  >
                    <option value="Certificate">Official Certificate</option>
                    <option value="Campus_Facility">Campus Facility</option>
                    <option value="Academic_Service">Academic Service</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unique Identifier Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CERT-MIG"
                    value={optionForm.code || ''}
                    onChange={(e) => setOptionForm({ ...optionForm, code: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 uppercase"
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description & Purpose</label>
                <textarea
                  rows={2}
                  placeholder="Explain what this certificate or facility provides to enrolled students..."
                  value={optionForm.description || ''}
                  onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white"
                />
              </div>

              {/* CRITICAL: ADMIN DECIDES PAYABLE VS FREE */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                <span className="font-bold text-purple-950 block text-xs">
                  ⭐ Administrator Decision: Payable vs. Free Status
                </span>
                <p className="text-[11px] text-purple-800">
                  Decide whether students must pay a fee to access this facility/certificate, or if it is provided free of charge under state grants.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setOptionForm({ ...optionForm, isPayable: false })}
                    className={`flex-1 py-2 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      !optionForm.isPayable
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Free (₹0 Fee)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOptionForm({ ...optionForm, isPayable: true })}
                    className={`flex-1 py-2 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      optionForm.isPayable
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Payable Facility</span>
                  </button>
                </div>

                {optionForm.isPayable && (
                  <div className="mt-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                    <label className="font-bold text-amber-950 block text-xs">
                      Approved Statutory Fee (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={50000}
                      value={optionForm.feeAmount || ''}
                      onChange={(e) => setOptionForm({ ...optionForm, feeAmount: Math.max(0, Number(e.target.value)) })}
                      placeholder="e.g. 150"
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg text-slate-900 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-amber-800">
                      State tariff regulations mandate an approved fee (&gt; ₹0) before activating payable status.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Turnaround Time (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={optionForm.processingDays || 2}
                    onChange={(e) => setOptionForm({ ...optionForm, processingDays: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Requires 7-Dept No Dues (NOC)?</label>
                  <select
                    value={optionForm.requiresNoDues ? 'yes' : 'no'}
                    onChange={(e) => setOptionForm({ ...optionForm, requiresNoDues: e.target.value === 'yes' })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="no">No (Direct Issue)</option>
                    <option value="yes">Yes (Requires All 7 Clearances)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Required Documents (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Identity Card Copy, Semester Fee Receipt, Marksheet"
                  value={rawDocsInput}
                  onChange={(e) => setRawDocsInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold transition-all shadow-sm"
                >
                  {editingOption ? 'Save Changes' : 'Create Option'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ACCOUNTANT SETS STATUTORY FEE FOR PAYABLE FACILITY */}
      {/* ============================================================== */}
      {pricingOption && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-amber-200 space-y-4 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Accountant Fee Pricing Authority
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Mark Statutory Fee Amount
                </h3>
              </div>
              <button
                onClick={() => setPricingOption(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-950">
              <div className="font-bold text-sm text-slate-900">{pricingOption.title}</div>
              <div className="text-[11px] text-amber-800">
                Category: {pricingOption.category.replace('_', ' ')} · Identifier: {pricingOption.code}
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                Admin has designated this service as <strong>Payable</strong>. As Accounts Officer, specify the mandatory fee amount payable by enrolled students.
              </p>
            </div>

            <form onSubmit={handleSavePricing} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Statutory Fee Amount Payable (INR ₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    required
                    value={pricingFeeAmount}
                    onChange={(e) => setPricingFeeAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-base text-slate-900 focus:bg-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  This fee will be automatically charged when students apply in the Student Mobile App.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  State Treasury DDO Head Code
                </label>
                <input
                  type="text"
                  value={pricingTreasuryCode}
                  onChange={(e) => setPricingTreasuryCode(e.target.value)}
                  placeholder="e.g. 0202-01-800-01 (Statutory Certificate DDO)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Accountant Approval Remarks / Ordinance Reference
                </label>
                <textarea
                  rows={2}
                  value={accountantRemarks}
                  onChange={(e) => setAccountantRemarks(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-500">
                Authorized By: <strong>{currentSession?.name || 'S. N. Sharma'}</strong> ({currentSession?.staffDesignation || 'Accounts Officer & Bursar'})
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPricingOption(null)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Authorize & Mark Fee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
