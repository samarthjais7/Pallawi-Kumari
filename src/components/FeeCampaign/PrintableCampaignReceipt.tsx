import React, { useState } from 'react';
import { CampaignPayment, AuditLogEntry } from '../../types/campaign';
import { INSTITUTION_INFO } from '../../data/mockData';
import {
  Printer,
  X,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Building,
  ShieldCheck,
  Download,
  Search,
  Filter,
  FileText,
  Ban,
  Maximize2,
  Eye,
} from 'lucide-react';
import { InAppPdfPreviewer, DocumentPreviewItem } from '../Common/InAppPdfPreviewer';

interface Props {
  payment: CampaignPayment | null;
  allPayments: CampaignPayment[];
  userRole?: 'admin' | 'accountant' | 'student';
  userName?: string;
  userEmail?: string;
  onClose: () => void;
  onCancelReceipt?: (paymentId: string, reason: string) => void;
  onAddAuditLog?: (log: AuditLogEntry) => void;
}

export const PrintableCampaignReceipt: React.FC<Props> = ({
  payment,
  allPayments,
  userRole = 'student',
  userName = 'User',
  userEmail = 'user@institution.edu',
  onClose,
  onCancelReceipt,
  onAddAuditLog,
}) => {
  const [selectedPayment, setSelectedPayment] = useState<CampaignPayment | null>(payment);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [shareSuccessNotice, setShareSuccessNotice] = useState<string | null>(null);
  const [showFullPdfPreview, setShowFullPdfPreview] = useState(false);

  const activeP = selectedPayment || payment;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (!activeP) return;
    if (navigator.share) {
      navigator.share({
        title: `Fee Receipt ${activeP.receiptNo}`,
        text: `Official Fee Receipt for ${activeP.studentName} (${activeP.rollNo}): ₹${activeP.amountPaid} deposited for ${activeP.campaignTitle}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `RLSY College Official Fee Receipt #${activeP.receiptNo} for ${activeP.studentName} (${activeP.rollNo}) - Amount: ₹${activeP.amountPaid}. Status: ${activeP.status}`
      );
      setShareSuccessNotice('Receipt summary copied to clipboard.');
      setTimeout(() => setShareSuccessNotice(null), 3000);
    }
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeP || !onCancelReceipt || !cancelReasonInput.trim()) return;

    onCancelReceipt(activeP.id, cancelReasonInput.trim());
    if (onAddAuditLog) {
      onAddAuditLog({
        id: `LOG-${Date.now()}`,
        entityType: 'Payment',
        entityId: activeP.id,
        action: 'UPDATE',
        userEmail,
        userName,
        userRole: userRole === 'admin' ? 'Admin' : 'Accountant',
        details: `Cancelled Receipt ${activeP.receiptNo} (Reason: ${cancelReasonInput.trim()})`,
        oldValue: 'Success',
        newValue: 'Cancelled',
        timestamp: new Date().toISOString(),
      });
    }

    setShowCancelModal(false);
    setSelectedPayment({
      ...activeP,
      status: 'Cancelled',
      cancellationReason: cancelReasonInput.trim(),
      cancelledBy: userName,
      cancelledAt: new Date().toISOString(),
    });
  };

  if (!activeP) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print flex items-center justify-between px-4 py-3 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold tracking-wide">
              Official University Fee Receipt
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowFullPdfPreview(true)}
              className="min-h-[36px] px-2.5 sm:px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Preview in Full-Screen PDF Viewer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full-Screen Preview</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[36px] px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="min-h-[36px] p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
              title="Share Receipt Link"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Cancel Receipt (Admin/Accountant only) */}
            {(userRole === 'admin' || userRole === 'accountant') && activeP.status !== 'Cancelled' && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="min-h-[36px] px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Ban className="w-3 h-3 text-rose-400" />
                <span>Cancel</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {shareSuccessNotice && (
          <div className="no-print p-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-[11px] font-semibold text-center">
            {shareSuccessNotice}
          </div>
        )}

        {/* Printable Paper Canvas */}
        <div id="printable-receipt" className="p-6 sm:p-8 bg-white text-slate-900 space-y-4">
          {/* Cancelled Watermark Stamp */}
          {activeP.status === 'Cancelled' && (
            <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-center space-y-1">
              <span className="text-base font-black uppercase tracking-widest text-rose-700 block">
                [ RECEIPT CANCELLED ]
              </span>
              <p className="text-[11px] text-rose-800">
                Reason: {activeP.cancellationReason || 'Administrative cancellation'} · Cancelled by: {activeP.cancelledBy}
              </p>
            </div>
          )}

          {/* Institutional Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
              {INSTITUTION_INFO.name}
            </h1>
            <p className="text-[10px] text-slate-600 font-medium">
              {INSTITUTION_INFO.dept}
            </p>
            <p className="text-[9px] text-slate-500">
              {INSTITUTION_INFO.address} · Webmail: {INSTITUTION_INFO.contactEmail}
            </p>
            <div className="inline-block mt-1 px-3 py-0.5 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
              Statutory E-Treasury Fee Receipt
            </div>
          </div>

          {/* Receipt Meta Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Receipt Number</span>
              <strong className="font-mono text-slate-900 font-black">{activeP.receiptNo}</strong>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Date & Timestamp</span>
              <span className="font-mono text-slate-800">{new Date(activeP.timestamp).toLocaleString()}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Student Name & Roll No</span>
              <span className="font-bold text-slate-900 block">{activeP.studentName}</span>
              <span className="font-mono text-[11px] text-slate-600">{activeP.rollNo}</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Course & Semester</span>
              <span className="font-semibold text-slate-900 block">{activeP.course}</span>
              <span className="text-[11px] text-slate-600">Semester {activeP.semester}</span>
            </div>
          </div>

          {/* Campaign Title & Payment Mode */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Campaign</span>
              <span className="font-bold text-slate-900">{activeP.campaignTitle}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Payment Gateway / Mode</span>
              <span className="font-mono font-bold text-indigo-700">
                {activeP.providerName} ({activeP.paymentMode})
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2.5">Statutory Fee Component</th>
                  <th className="p-2.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeP.lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 text-slate-700">{item.name}</td>
                    <td className="p-2.5 text-right font-mono font-semibold">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {activeP.lateFeePaid > 0 && (
                  <tr className="bg-amber-50/50">
                    <td className="p-2.5 font-bold text-amber-900">Late Fee Surcharge</td>
                    <td className="p-2.5 text-right font-mono font-bold text-amber-900">
                      ₹{activeP.lateFeePaid.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                <tr>
                  <th className="p-2.5 font-bold text-slate-900">Total Deposited</th>
                  <th className="p-2.5 text-right font-mono text-base font-black text-indigo-950">
                    ₹{activeP.amountPaid.toLocaleString('en-IN')}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance Remaining & Gateway Audit */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Remaining Balance</span>
              <span className={`font-mono text-sm font-black ${
                activeP.balanceRemaining === 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {activeP.balanceRemaining === 0 ? 'Nil (Clear)' : `₹${activeP.balanceRemaining.toLocaleString('en-IN')}`}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Gateway Tx / UTR Ref</span>
              <span className="font-mono text-[11px] text-slate-700 truncate block">
                {activeP.gatewayReference || activeP.transactionId}
              </span>
            </div>
          </div>

          {/* Footer & Accreditations */}
          <div className="pt-4 border-t border-slate-200 text-center space-y-1 text-[10px] text-slate-500">
            <p className="font-semibold text-slate-700">
              Computer-generated e-Receipt issued under National E-Governance in Education Standards.
            </p>
            <p>
              Deposited via institutional aggregator into State Higher Education Treasury Head. No physical signature required.
            </p>
          </div>
        </div>
      </div>

      {/* CANCEL RECEIPT MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-rose-200 p-5 space-y-4 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center gap-2 text-rose-600 font-bold">
              <Ban className="w-5 h-5" />
              <span>Cancel Fee Receipt #{activeP.receiptNo}?</span>
            </div>
            <p className="text-xs text-slate-600">
              Cancelled receipts stay permanently visible and flagged as &quot;Cancelled&quot; in the student ledger and audit trail.
            </p>
            <form onSubmit={handleConfirmCancel} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Mandatory Cancellation Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Bank chargeback, payment entered under wrong Roll No, or bounced cheque..."
                  value={cancelReasonInput}
                  onChange={(e) => setCancelReasonInput(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!cancelReasonInput.trim()}
                  className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Confirm Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP FULL SCREEN PDF PREVIEWER */}
      {showFullPdfPreview && (
        <InAppPdfPreviewer
          isOpen={showFullPdfPreview}
          onClose={() => setShowFullPdfPreview(false)}
          defaultFullScreen={true}
          document={{
            id: `DOC-${activeP.receiptNo}`,
            title: `Fee Receipt #${activeP.receiptNo}`,
            subtitle: `${activeP.studentName} (${activeP.rollNo}) - ₹${activeP.amountPaid}`,
            type: 'receipt',
            badgeText: activeP.status === 'Cancelled' ? 'Cancelled' : 'Verified Treasury Receipt',
            badgeColor: activeP.status === 'Cancelled' ? 'rose' : 'emerald',
            fileName: `Fee_Receipt_${activeP.receiptNo}_${activeP.rollNo}.pdf`,
            contentNode: (
              <div className="p-6 sm:p-10 bg-white text-slate-900 space-y-4">
                {activeP.status === 'Cancelled' && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-center space-y-1">
                    <span className="text-base font-black uppercase tracking-widest text-rose-700 block">
                      [ RECEIPT CANCELLED ]
                    </span>
                    <p className="text-[11px] text-rose-800">
                      Reason: {activeP.cancellationReason || 'Administrative cancellation'} · Cancelled by: {activeP.cancelledBy}
                    </p>
                  </div>
                )}

                <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase">
                    {INSTITUTION_INFO.name}
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">
                    {INSTITUTION_INFO.dept}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {INSTITUTION_INFO.address} · Webmail: {INSTITUTION_INFO.contactEmail}
                  </p>
                  <div className="inline-block mt-1 px-3 py-0.5 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Statutory E-Treasury Fee Receipt (Official Copy)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Receipt Number</span>
                    <strong className="font-mono text-slate-900 font-black">{activeP.receiptNo}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Date & Timestamp</span>
                    <span className="font-mono text-slate-800">{new Date(activeP.timestamp).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Student Name & Roll No</span>
                    <span className="font-bold text-slate-900 block">{activeP.studentName}</span>
                    <span className="font-mono text-[11px] text-slate-600">{activeP.rollNo}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Course & Semester</span>
                    <span className="font-semibold text-slate-900 block">{activeP.course}</span>
                    <span className="text-[11px] text-slate-600">Semester {activeP.semester}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Campaign</span>
                    <span className="font-bold text-slate-900">{activeP.campaignTitle}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Payment Gateway / Mode</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {activeP.providerName} ({activeP.paymentMode})
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-3">Statutory Fee Component</th>
                        <th className="p-3 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeP.lineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 text-slate-700">{item.name}</td>
                          <td className="p-3 text-right font-mono font-semibold">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      {activeP.lateFeePaid > 0 && (
                        <tr className="bg-amber-50/50">
                          <td className="p-3 font-bold text-amber-900">Late Fee Surcharge</td>
                          <td className="p-3 text-right font-mono font-bold text-amber-900">
                            ₹{activeP.lateFeePaid.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                      <tr>
                        <th className="p-3 font-bold text-slate-900">Total Deposited</th>
                        <th className="p-3 text-right font-mono text-lg font-black text-indigo-950">
                          ₹{activeP.amountPaid.toLocaleString('en-IN')}
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Remaining Balance</span>
                    <span className={`font-mono text-base font-black ${
                      activeP.balanceRemaining === 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {activeP.balanceRemaining === 0 ? 'Nil (Clear)' : `₹${activeP.balanceRemaining.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Gateway Tx / UTR Ref</span>
                    <span className="font-mono text-xs text-slate-700 truncate block">
                      {activeP.gatewayReference || activeP.transactionId}
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 text-center space-y-1 text-[11px] text-slate-500">
                  <p className="font-semibold text-slate-700">
                    Computer-generated e-Receipt issued under National E-Governance in Education Standards.
                  </p>
                  <p>
                    Deposited via institutional aggregator into State Higher Education Treasury Head. No physical signature required.
                  </p>
                </div>
              </div>
            ),
          }}
        />
      )}
    </div>
  );
};
