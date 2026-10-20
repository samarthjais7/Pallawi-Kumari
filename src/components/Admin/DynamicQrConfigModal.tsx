import React, { useState } from 'react';
import { DynamicQrConfig, UserSession, SchoolStaffUser } from '../../types/fee';
import { 
  QrCode, 
  Building, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Lock, 
  Smartphone, 
  CreditCard, 
  RefreshCw,
  Check,
  Power
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: DynamicQrConfig;
  currentSession: UserSession | null;
  staffUsers: SchoolStaffUser[];
  onSaveConfig: (updatedConfig: DynamicQrConfig) => void;
}

export function generateSanitizedUpiUrl(
  upiId: string,
  merchantName: string,
  amount: number,
  note: string,
  transactionRef?: string
): string {
  const pa = encodeURIComponent((upiId || '').trim());
  const pn = encodeURIComponent((merchantName || '').trim());
  const am = encodeURIComponent(Math.max(0, amount || 0).toFixed(2));
  const tn = encodeURIComponent((note || '').trim());
  // NPCI specification mandates valid alphanumeric transaction reference (tr)
  const cleanRef = transactionRef ? transactionRef.replace(/[^a-zA-Z0-9]/g, '') : '';
  const finalRef = cleanRef.length >= 4 
    ? cleanRef.slice(-30) 
    : `TXN${Date.now().toString().slice(-8)}${cleanRef}`;
  const tr = `&tr=${encodeURIComponent(finalRef)}`;
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}${tr}`;
}

export const DynamicQrConfigModal: React.FC<Props> = ({
  isOpen,
  onClose,
  config,
  currentSession,
  staffUsers,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<DynamicQrConfig>({ ...config });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [authWarning, setAuthWarning] = useState<string | null>(null);
  const [testAmount, setTestAmount] = useState<number>(14500);
  const [testRollNo, setTestRollNo] = useState<string>('2022CS014');

  if (!isOpen) return null;

  // Check roles:
  // Admin has right to activate/deactivate.
  // Accountant or Admin has right to map this QR to specific account.
  const isAdmin = Boolean(
    currentSession?.isAppAdmin || 
    currentSession?.staffRole === 'App_Admin' || 
    currentSession?.staffRole === 'Principal_DDO'
  );

  const isAccountantOrAdmin = Boolean(
    isAdmin || 
    currentSession?.staffRole === 'Accounts_Officer' ||
    staffUsers.find(u => u.id === currentSession?.id)?.permissions?.includes('manage_dynamic_qr')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: DynamicQrConfig = {
      ...formData,
      updatedBy: `${currentSession?.name || 'Administrator'} (${currentSession?.staffDesignation || currentSession?.staffRole || 'Authorized Officer'})`,
      updatedAt: new Date().toISOString(),
    };
    onSaveConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleToggleActive = () => {
    if (!isAdmin) {
      setAuthWarning('Only the Institutional App Administrator or Principal has authority to activate or deactivate the Dynamic QR Service.');
      setTimeout(() => setAuthWarning(null), 4000);
      return;
    }
    const nextState = !formData.isActive;
    setFormData((prev) => ({ ...prev, isActive: nextState }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 my-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {authWarning && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold animate-in fade-in">
            {authWarning}
          </div>
        )}
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <QrCode className="w-3 h-3 text-emerald-700" />
                <span>NPCI UPI Treasury Settlement</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">DDO Bank Mapping v3</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              Dynamic UPI QR Gateway & Bank Account Mapping
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin controls service activation. Accountant or Admin maps the institutional bank account and UPI VPA.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Dynamic QR bank account mapping and gateway settings updated successfully!</span>
          </div>
        )}

        {/* Activation / Deactivation Toggle Box (Admin Right) */}
        <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
          formData.isActive 
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-rose-50/70 border-rose-200 text-rose-950'
        }`}>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Dynamic QR Gateway Status:
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                formData.isActive ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
              }`}>
                {formData.isActive ? 'ACTIVE & SERVING PAYMENTS' : 'SUSPENDED / DEACTIVATED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              {formData.isActive 
                ? 'Students can scan locked dynamic QRs with automatic roll number binding.' 
                : 'Service is currently paused. Students will be redirected to the central cashier counter.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleActive}
            disabled={!isAdmin}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 ${
              !isAdmin ? 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-600' :
              formData.isActive 
                ? 'bg-rose-700 hover:bg-rose-800 text-white'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
            title={!isAdmin ? 'Only Admin can activate/deactivate' : 'Toggle gateway status'}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{formData.isActive ? 'Deactivate Service' : 'Activate Service'}</span>
          </button>
        </div>

        {/* Mapping Form */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
              <Building className="w-4 h-4 text-emerald-700" />
              <span>Institutional Bank & UPI VPA Account Details</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Recipient Merchant / Institution Display Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAccountantOrAdmin}
                  value={formData.merchantName}
                  onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Mapped UPI VPA ID (Virtual Payment Address) *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAccountantOrAdmin}
                  placeholder="e.g. principal.rlsy@sbi"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Bank Name & Branch *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAccountantOrAdmin}
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAccountantOrAdmin}
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Bank IFSC Code *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAccountantOrAdmin}
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Institutional Account Type
                </label>
                <select
                  disabled={!isAccountantOrAdmin}
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
                >
                  <option value="Govt_Treasury">Govt Treasury Current Account</option>
                  <option value="SBI_Collect_Current">Institutional Bank Clearing Account</option>
                  <option value="College_Development_Fund">College Development & Infrastructure Fund</option>
                  <option value="Student_Welfare_Account">Student Welfare & Examination Account</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  State Treasury Head of Account Code
                </label>
                <input
                  type="text"
                  disabled={!isAccountantOrAdmin}
                  value={formData.treasuryHeadCode}
                  onChange={(e) => setFormData({ ...formData, treasuryHeadCode: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Immutable Amount & Roll No Enforcement Notice */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2 text-indigo-950">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-700" />
              <span className="font-bold text-xs">Security Mandate: Locked Amount & Roll Number Identifier</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              In accordance with college financial controls, generated QRs are embedded with the exact pending fee sum. 
              The UPI transaction note automatically includes the student's unique Roll Number (<code className="font-mono text-indigo-700 font-bold">&tn=FEE-ROLLNO-SEM</code>) 
              to enable automated reconciliation and prevent misallocation.
            </p>
          </div>

          {/* Dynamic URL Sanitization Preview & Test */}
          <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                <span>Sanitized Banking Deep Link Preview</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                URL Encoded
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Verified parameter encoding prevents payment failures when merchant names contain spaces, ampersands, or punctuation:
            </p>
            <div className="p-2 bg-slate-900 rounded-xl text-emerald-400 font-mono text-[10px] break-all select-all">
              {generateSanitizedUpiUrl(
                formData.upiId,
                formData.merchantName,
                testAmount,
                `FEE-${testRollNo}-SEM1`,
                'TEST-TX-001'
              )}
            </div>
          </div>

          {/* Last Updated Timestamp */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 p-1">
            <span>Last mapped by: <strong className="text-slate-700">{config?.updatedBy || 'System'}</strong></span>
            <span>Timestamp: {config?.updatedAt ? config.updatedAt.split('T')[0] : 'N/A'}</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {isAdmin ? 'Admin & Accountant access verified' : 'Accountant mapping mode active'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={!isAccountantOrAdmin}
                className="py-2 px-5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save & Map QR Account</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
