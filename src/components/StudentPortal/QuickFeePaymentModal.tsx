import React, { useState } from 'react';
import { Student, FeeTransaction, PaymentMethod } from '../../types/fee';
import { PaymentProviderConfig } from '../../types/campaign';
import { INSTITUTION_INFO } from '../../data/mockData';
import { 
  X, 
  Search, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Lock, 
  Printer, 
  QrCode, 
  ArrowRight, 
  Building, 
  FileText, 
  Calendar, 
  Sparkles,
  Smartphone,
  Check,
  User,
  GraduationCap,
  Clock
} from 'lucide-react';
import { CaptchaChallenge } from '../Common/CaptchaChallenge';
import { PrintableReceipt } from '../Common/PrintableReceipt';
import { auth } from '../../firebase';
import { toPaisa, fromPaisa, paisaAdd, paisaSub, Paisa } from '../../utils/paisaMath';
import { safeMatchStrings } from '../../utils/safeHelpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  transactions: FeeTransaction[];
  onPaymentSuccess: (transaction: FeeTransaction, updatedStudent: Student) => void;
  initialRollNo?: string;
  initialDob?: string;
  activeProvider?: PaymentProviderConfig | null;
  onSaveProvider?: (provider: PaymentProviderConfig | null) => void;
  userRole?: string;
}

export const QuickFeePaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  students,
  transactions,
  onPaymentSuccess,
  initialRollNo = '',
  initialDob = '',
  activeProvider = null,
  onSaveProvider,
  userRole = 'student',
}) => {
  // Verification states
  const [rollNo, setRollNo] = useState<string>(initialRollNo);
  const [dob, setDob] = useState<string>(initialDob);
  const [captchaInput, setCaptchaInput] = useState<string>('');
  const [expectedCaptcha, setExpectedCaptcha] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Matched student state
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);
  
  // Payment states
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');
  const [payerPhone, setPayerPhone] = useState<string>('');
  const [payerEmail, setPayerEmail] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedTx, setCompletedTx] = useState<FeeTransaction | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle Verification
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!rollNo.trim()) {
      setErrorMsg('Please enter your University / College Roll Number.');
      return;
    }

    if (!dob.trim()) {
      setErrorMsg('Please enter your Date of Birth as recorded in college records.');
      return;
    }

    if (!captchaInput.trim()) {
      setErrorMsg('Please enter the security verification CAPTCHA.');
      return;
    }

    if (captchaInput.trim().toUpperCase() !== expectedCaptcha.toUpperCase()) {
      setErrorMsg('Incorrect CAPTCHA code. Please re-enter the code displayed.');
      return;
    }

    const formattedRoll = rollNo.trim().toUpperCase();
    const matched = students.find((s) => {
      const rollMatch = safeMatchStrings(s.rollNo, formattedRoll) || 
                        safeMatchStrings(s.registerNo, formattedRoll) || 
                        safeMatchStrings(s.id, formattedRoll);
      if (!rollMatch) return false;

      // Check DOB if present in record
      if (s.dateOfBirth) {
        return s.dateOfBirth === dob.trim();
      }
      return true;
    });

    if (!matched) {
      setErrorMsg(`No student record found matching Roll No "${formattedRoll}" and the specified Date of Birth. Please check your credentials.`);
      return;
    }

    setVerifiedStudent(matched);
    setPayerPhone(matched.phone || matched.parentPhone || '');
    setPayerEmail(matched.email || '');
  };

  // Reset verification to search another student
  const handleReset = () => {
    setVerifiedStudent(null);
    setCompletedTx(null);
    setShowReceipt(false);
    setErrorMsg(null);
    setCaptchaInput('');
  };

  // Process Due Fee Payment
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedStudent) return;

    const totalDue = (verifiedStudent.pendingFee || 0) + (verifiedStudent.lateFineApplied || 0);
    if (totalDue <= 0) {
      setErrorMsg('There is no pending due amount for this student. Fee is already fully cleared.');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      const txId = `TX-${Date.now()}`;
      const receiptNo = `REC/${new Date().getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}`;

      const payablePaisa: Paisa = toPaisa(totalDue);
      const currentPaidPaisa = toPaisa(verifiedStudent.paidFee);
      const currentPendingPaisa = toPaisa(verifiedStudent.pendingFee);
      const currentLateFinePaisa = toPaisa(verifiedStudent.lateFineApplied || 0);

      const lateFineDeductionPaisa = Math.min(currentLateFinePaisa, payablePaisa);
      const feeDeductionPaisa = paisaSub(payablePaisa, lateFineDeductionPaisa);
      const newLateFinePaisa = paisaSub(currentLateFinePaisa, lateFineDeductionPaisa);
      const newPendingPaisa = paisaSub(currentPendingPaisa, feeDeductionPaisa);
      const newPaidPaisa = paisaAdd(currentPaidPaisa, feeDeductionPaisa);

      const newTx: FeeTransaction = {
        id: txId,
        receiptNo: receiptNo,
        studentId: verifiedStudent.id,
        studentName: verifiedStudent.name,
        studentEmail: verifiedStudent.email || '',
        rollNo: verifiedStudent.rollNo,
        course: verifiedStudent.course,
        semester: verifiedStudent.semester,
        amount: totalDue,
        lateFineIncluded: fromPaisa(lateFineDeductionPaisa),
        discountApplied: 0,
        paymentMethod: selectedMethod,
        gateway: activeProvider ? `${activeProvider.name}` : 'Institutional Payment Gateway',
        gatewayTransactionId: `DU-COLLECT-${Date.now().toString().slice(-8)}`,
        bankUtr: `CIN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        treasuryHeadCode: '0202-01-102-01 (Higher Tech Education)',
        timestamp: new Date().toISOString(),
        status: 'Success',
        remarks: `Direct Due Clearance via Quick Pay Portal. Payer: ${payerPhone || 'Self'}`,
        headsAllocated: [
          { headName: 'Tuition & Academic Term Fee', amount: Math.round(fromPaisa(feeDeductionPaisa) * 0.70), treasuryCode: '0202-01-102' },
          { headName: 'Examination & University Fund', amount: Math.round(fromPaisa(feeDeductionPaisa) * 0.20), treasuryCode: '0202-01-103' },
          { headName: 'Institutional Library & Lab Development', amount: Math.round(fromPaisa(feeDeductionPaisa) * 0.10) + fromPaisa(lateFineDeductionPaisa), treasuryCode: '0202-01-104' },
        ],
      };

      const updatedStudent: Student = {
        ...verifiedStudent,
        paidFee: fromPaisa(newPaidPaisa),
        pendingFee: fromPaisa(newPendingPaisa),
        lateFineApplied: fromPaisa(newLateFinePaisa),
        hallTicketBlocked: (newPendingPaisa === 0 && newLateFinePaisa === 0) ? false : verifiedStudent.hallTicketBlocked,
      };

      onPaymentSuccess(newTx, updatedStudent);
      setVerifiedStudent(updatedStudent);
      setCompletedTx(newTx);
      setIsProcessing(false);
      setShowReceipt(true);
    }, 1200);
  };

  // Find previous receipts if student has 0 dues
  const pastStudentTx = verifiedStudent
    ? transactions.find((t) => t.rollNo === verifiedStudent.rollNo || t.studentId === verifiedStudent.id)
    : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-xs">
                <CreditCard className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Quick Due Fee Payment
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-semibold">
                    Direct Payment Link
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  Submit Roll Number & Date of Birth to settle pending due amount directly
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1">

            {/* Error banner */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMsg}</div>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-rose-500 hover:text-rose-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 1: VERIFICATION FORM */}
            {!verifiedStudent ? (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Secure Institutional Lookup: </span>
                    Enter your enrollment roll number and date of birth exactly as registered during admission. The system will retrieve your current pending due amount.
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    University / College Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2025/BTECH/CSE/001"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-600 uppercase"
                  />
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>Demo samples:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRollNo('2025/BTECH/CSE/001');
                        setDob('2004-05-14');
                      }}
                      className="text-emerald-700 hover:underline font-mono text-[10px]"
                    >
                      Aarav (Due ₹17,400)
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRollNo('2025/BTECH/CSE/003');
                        setDob('2003-12-08');
                      }}
                      className="text-emerald-700 hover:underline font-mono text-[10px]"
                    >
                      Rohan (Due ₹27,400)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Date of Birth (as per Matriculation) *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Security CAPTCHA */}
                <CaptchaChallenge
                  userInput={captchaInput}
                  onUserInputChange={(val) => setCaptchaInput(val.toUpperCase())}
                  onCodeGenerated={(code) => setExpectedCaptcha(code)}
                  onRefresh={() => setCaptchaInput('')}
                />

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Fetch Verified Dues & Details</span>
                </button>
              </form>
            ) : (
              /* STEP 2: VERIFIED STUDENT DUES & PAYMENT */
              <div className="space-y-5">
                {/* Student Identity Card */}
                <div className="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                        {verifiedStudent.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{verifiedStudent.name}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-semibold">
                            Verified
                          </span>
                        </h4>
                        <div className="text-xs text-slate-500 font-mono">
                          Roll: {verifiedStudent.rollNo} · {verifiedStudent.course}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <span>← Check Different Roll No</span>
                    </button>
                  </div>

                  {/* Academic info grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Father&apos;s Name</span>
                      <span className="font-semibold text-slate-800">{verifiedStudent.fatherName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Current Semester</span>
                      <span className="font-semibold text-slate-800">Semester {verifiedStudent.semester}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Category / Quota</span>
                      <span className="font-semibold text-slate-800">{verifiedStudent.category}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Hostel Status</span>
                      <span className="font-semibold text-slate-800">{verifiedStudent.hostelResident ? 'Resident' : 'Day Scholar'}</span>
                    </div>
                  </div>
                </div>

                {/* DUES SUMMARY STATEMENT */}
                <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Verified Fee Ledger
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Session 2025-26
                    </span>
                  </div>

                  <div className={`grid ${verifiedStudent.lateFineApplied ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-3 text-center border-b border-slate-100 pb-3`}>
                    <div className="p-2.5 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Total Course Fee</span>
                      <span className="text-sm font-bold text-slate-800">₹{verifiedStudent.totalFee.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-xl">
                      <span className="text-[10px] text-emerald-700 block">Paid Till Date</span>
                      <span className="text-sm font-bold text-emerald-800">₹{verifiedStudent.paidFee.toLocaleString('en-IN')}</span>
                    </div>
                    {Boolean(verifiedStudent.lateFineApplied && verifiedStudent.lateFineApplied > 0) && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                        <span className="text-[10px] text-rose-700 font-bold block">Late Fine</span>
                        <span className="text-sm font-extrabold text-rose-800">
                          +₹{(verifiedStudent.lateFineApplied || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    <div className={`p-2.5 rounded-xl ${((verifiedStudent.pendingFee || 0) + (verifiedStudent.lateFineApplied || 0)) > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50'}`}>
                      <span className={`text-[10px] block ${((verifiedStudent.pendingFee || 0) + (verifiedStudent.lateFineApplied || 0)) > 0 ? 'text-amber-800 font-bold' : 'text-emerald-700'}`}>
                        {((verifiedStudent.pendingFee || 0) + (verifiedStudent.lateFineApplied || 0)) > 0 ? 'Net Due Balance' : 'Outstanding Balance'}
                      </span>
                      <span className={`text-base font-extrabold ${((verifiedStudent.pendingFee || 0) + (verifiedStudent.lateFineApplied || 0)) > 0 ? 'text-amber-900' : 'text-emerald-800'}`}>
                        ₹{((verifiedStudent.pendingFee || 0) + (verifiedStudent.lateFineApplied || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Statutory Policy Restriction Notice */}
                  <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-[11px] text-slate-600">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">Strict Due-Only Payment Policy: </span>
                      As per Treasury financial reconciliation regulations, only the exact verified due amount can be paid. Overpayment, custom adjustments, or paying with a zero balance are restricted.
                    </div>
                  </div>
                </div>

                {/* IF ZERO DUES */}
                {((verifiedStudent.pendingFee || 0) + (verifiedStudent.lateFineApplied || 0)) <= 0 ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-emerald-950">
                        All Dues Cleared! No Outstanding Balance.
                      </h4>
                      <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                        All enrolled academic semester fees have been fully settled for this student. No additional payment is required at this time.
                      </p>
                    </div>

                    {pastStudentTx ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCompletedTx(pastStudentTx);
                          setShowReceipt(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Official Clearance Receipt</span>
                      </button>
                    ) : null}
                  </div>
                ) : (
                  /* IF DUES PENDING > 0 */
                  <form onSubmit={handleProcessPayment} className="space-y-4">
                    {/* Locked Payment Amount Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Amount to Pay (Locked to Exact Due Amount)
                        </label>
                        <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Exact Due Amount Only
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                          ₹
                        </span>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={verifiedStudent.pendingFee.toLocaleString('en-IN')}
                          className="w-full pl-8 pr-4 py-3 bg-slate-100 border border-slate-300 rounded-xl text-base font-bold text-slate-900 font-mono cursor-not-allowed shadow-inner"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Exact Due</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Provider & Gateway Section */}
                    {(!activeProvider || activeProvider.status !== 'Active') ? (
                      /* ONLINE PAYMENT SERVICE COMING SOON BANNER */
                      <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-2xl text-amber-950 space-y-3.5 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                            <Clock className="w-5 h-5 text-amber-700 animate-pulse" />
                          </div>
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-amber-200 border border-amber-300 text-amber-900 rounded-md font-bold text-[10px] uppercase tracking-wider">
                                Coming Soon
                              </span>
                              <h4 className="text-sm font-bold text-slate-900">
                                Online Payment Gateway Service Coming Soon
                              </h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              The online payment gateway is currently in the process of onboarding and treasury certification by college administration. No unauthorized or third-party payment links are active.
                            </p>
                            <div className="p-2.5 bg-white/80 border border-amber-200 rounded-xl text-[11px] text-slate-700 space-y-1">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-amber-700" />
                                <span>Offline Treasury Counter Settlement Available</span>
                              </div>
                              <p className="text-slate-600">
                                Please deposit your due amount of <strong className="text-emerald-800">₹{((verifiedStudent.pendingFee || 0) + (verifiedStudent.lateFineApplied || 0)).toLocaleString('en-IN')}</strong> directly at the <strong>College Accounts Desk / Cashier Counter (Ground Floor)</strong>. Official printed receipts are issued instantly.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* MAPPED LIVE PROVIDER INFO & PAYMENT OPTIONS */
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <div>
                              <span className="text-xs font-bold text-emerald-950 block">
                                Live Gateway: {activeProvider.name}
                              </span>
                              <span className="text-[10px] text-emerald-800 font-mono">
                                Merchant ID: {activeProvider.merchantAccountId} · {activeProvider.mode} Mode
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Secured Online
                          </span>
                        </div>

                        {/* Payment Channels based on mapped provider */}
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                            Select Payment Channel *
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-semibold">
                            {activeProvider.supportUpi !== false && (
                              <button
                                type="button"
                                onClick={() => setSelectedMethod('UPI')}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                                  selectedMethod === 'UPI'
                                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/30'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <QrCode className="w-4 h-4 text-emerald-700 shrink-0" />
                                <div>
                                  <span className="block font-bold">Dynamic UPI</span>
                                  <span className="text-[10px] text-slate-500 block font-normal">Real-time VPA / QR</span>
                                </div>
                              </button>
                            )}

                            {activeProvider.supportNetBanking !== false && (
                              <button
                                type="button"
                                onClick={() => setSelectedMethod('NetBanking')}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                                  selectedMethod === 'NetBanking'
                                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/30'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <Building className="w-4 h-4 text-emerald-700 shrink-0" />
                                <div>
                                  <span className="block font-bold">Internet Banking</span>
                                  <span className="text-[10px] text-slate-500 block font-normal">Direct Clearing</span>
                                </div>
                              </button>
                            )}

                            {activeProvider.supportCards !== false && (
                              <button
                                type="button"
                                onClick={() => setSelectedMethod('Card')}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                                  selectedMethod === 'Card'
                                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/30'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                                <div>
                                  <span className="block font-bold">Cards</span>
                                  <span className="text-[10px] text-slate-500 block font-normal">Debit / Credit</span>
                                </div>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Contact for Receipt Dispatches */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="text-slate-700 font-semibold block mb-1">
                              Payer Mobile Number (for SMS confirmation)
                            </label>
                            <input
                              type="tel"
                              placeholder="+91 98765 43210"
                              value={payerPhone}
                              onChange={(e) => setPayerPhone(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-slate-700 font-semibold block mb-1">
                              Email Address (for PDF Receipt)
                            </label>
                            <input
                              type="email"
                              placeholder="payer@example.com"
                              value={payerEmail}
                              onChange={(e) => setPayerEmail(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>
                        </div>

                        {/* Public Payment Notice */}
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Official Certified Receipts Advisory:</span> Public quick fee payments update your local college dues immediately. For permanent cloud certification, scholarship records, and verified tax receipts, students are advised to log into their Student Portal account.
                          </div>
                        </div>

                        {/* Submit Payment - PAY NOW BUTTON APPEARS ONCE ONBOARDED */}
                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
                        >
                          {isProcessing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Processing Treasury Settlement with {activeProvider.name}...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              <span>Pay Due Amount (₹{((verifiedStudent.pendingFee || 0) + (verifiedStudent.lateFineApplied || 0)).toLocaleString('en-IN')}) Now</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-[11px] text-slate-500">
            {INSTITUTION_INFO.name} · Treasury Accounts & Electronic Payment Service
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {showReceipt && completedTx && verifiedStudent && (
        <PrintableReceipt
          transaction={completedTx}
          student={verifiedStudent}
          onClose={() => {
            setShowReceipt(false);
          }}
        />
      )}
    </>
  );
};
