import React, { useState, useEffect } from 'react';
import {
  FeeCampaign,
  MasterFeeHead,
  FeePlan,
  CourseMaster,
  SemesterMaster,
  SubjectMaster,
  StudentDue,
  PaymentProviderConfig,
  ProviderHistoryItem,
  CampaignPayment,
  AuditLogEntry,
} from '../../types/campaign';
import { Student, SchoolStaffUser, FeeHeadItem, AcademicStream, StudySubject, EnrollmentField, ConcessionSurchargeRule, FacilityServiceOption, UserSession } from '../../types/fee';
import { MasterDataView } from './MasterDataView';
import { CampaignWizard } from './CampaignWizard';
import { CollectionDashboard } from './CollectionDashboard';
import { PaymentProviderSettings } from './PaymentProviderSettings';
import { StudentMyFees } from './StudentMyFees';
import { PrintableCampaignReceipt } from './PrintableCampaignReceipt';
import { ModifyCampaignModal } from './ModifyCampaignModal';
import { PermanentCampaignManager } from './PermanentCampaignManager';
import { FeeHeadRulesManager } from '../Admin/FeeHeadRulesManager';
import {
  BarChart3,
  Sparkles,
  Layers,
  CreditCard,
  Plus,
  Receipt,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  FileText,
  Search,
  Users,
  Banknote,
  CheckCircle2,
  Lock,
  Sliders,
  Eye,
  X,
  Download,
  Percent,
  Infinity as InfiniteIcon,
  ArrowLeft,
  LogOut,
  Calendar,
} from 'lucide-react';

interface Props {
  userRole?: 'admin' | 'accountant' | 'student';
  userName?: string;
  userEmail?: string;
  studentRollNo?: string;
  allStudents: Student[];
  staffUsers?: SchoolStaffUser[];
  initialTab?: 'dashboard' | 'campaigns' | 'permanent' | 'master' | 'concessions' | 'provider' | 'offline' | 'receipts';
  onBack?: () => void;
  onLogout?: () => void;

  // State & Handlers passed from parent
  campaigns: FeeCampaign[];
  feeHeads: MasterFeeHead[];
  feePlans: FeePlan[];
  courses: CourseMaster[];
  semesters: SemesterMaster[];
  subjects: SubjectMaster[];
  studentDues: StudentDue[];
  activeProvider: PaymentProviderConfig | null;
  providerHistory: ProviderHistoryItem[];
  payments: CampaignPayment[];
  auditLogs: AuditLogEntry[];

  // Concession & Surcharge Rules and Statutory Master props
  concessionRules?: ConcessionSurchargeRule[];
  onUpdateConcessionRules?: (rules: ConcessionSurchargeRule[]) => void;
  statutoryFeeHeads?: FeeHeadItem[];
  onUpdateStatutoryFeeHeads?: (heads: FeeHeadItem[]) => void;
  streams?: AcademicStream[];
  onUpdateStreams?: (streams: AcademicStream[]) => void;
  studySubjects?: StudySubject[];
  onUpdateStudySubjects?: (subjects: StudySubject[]) => void;
  enrollmentFields?: EnrollmentField[];
  onUpdateEnrollmentFields?: (fields: EnrollmentField[]) => void;
  facilityOptions?: FacilityServiceOption[];
  onUpdateFacilityOptions?: (options: FacilityServiceOption[]) => void;
  onApplyRulesToStudents?: () => void;
  currentSession?: UserSession | null;

  onUpdateCampaigns: (campaigns: FeeCampaign[]) => void;
  onUpdateFeeHeads: (heads: MasterFeeHead[]) => void;
  onUpdateFeePlans: (plans: FeePlan[]) => void;
  onUpdateCourses: (courses: CourseMaster[]) => void;
  onUpdateSemesters: (semesters: SemesterMaster[]) => void;
  onUpdateSubjects: (subjects: SubjectMaster[]) => void;
  onUpdateStudentDues: (dues: StudentDue[]) => void;
  onUpdateActiveProvider: (provider: PaymentProviderConfig | null, oldToHistory?: ProviderHistoryItem) => void;
  onUpdateProviderHistory: (history: ProviderHistoryItem[]) => void;
  onUpdatePayments: (payments: CampaignPayment[]) => void;
  onAddAuditLog: (log: AuditLogEntry) => void;
}

export const FeeCampaignModule: React.FC<Props> = ({
  userRole = 'admin',
  userName = 'Kumari Pallawi',
  userEmail = 'admin.office@rlsycollege.ac.in',
  studentRollNo = '2025/BTECH/CSE/001',
  allStudents,
  staffUsers = [],
  initialTab,
  onBack,
  onLogout,

  campaigns,
  feeHeads,
  feePlans,
  courses,
  semesters,
  subjects,
  studentDues,
  activeProvider,
  providerHistory,
  payments,
  auditLogs,

  concessionRules = [],
  onUpdateConcessionRules,
  statutoryFeeHeads = [],
  onUpdateStatutoryFeeHeads,
  streams = [],
  onUpdateStreams,
  studySubjects = [],
  onUpdateStudySubjects,
  enrollmentFields = [],
  onUpdateEnrollmentFields,
  facilityOptions = [],
  onUpdateFacilityOptions,
  onApplyRulesToStudents,
  currentSession = null,

  onUpdateCampaigns,
  onUpdateFeeHeads,
  onUpdateFeePlans,
  onUpdateCourses,
  onUpdateSemesters,
  onUpdateSubjects,
  onUpdateStudentDues,
  onUpdateActiveProvider,
  onUpdateProviderHistory,
  onUpdatePayments,
  onAddAuditLog,
}) => {
  // Navigation Tabs for Admin & Accountant
  const [adminActiveTab, setAdminActiveTab] = useState<'dashboard' | 'campaigns' | 'permanent' | 'master' | 'concessions' | 'provider' | 'offline' | 'receipts'>(initialTab || 'dashboard');

  useEffect(() => {
    if (initialTab) {
      setAdminActiveTab(initialTab);
    }
  }, [initialTab]);

  // Derived state for Permanent Campaign badge
  const activePermanentCamp = campaigns.find(
    (c) =>
      (c.isPermanent || c.id === 'CMP-MONTHLY-FEE' || c.id === 'CMP-SEMESTER-FEE' || c.id === 'CMP-ANNUAL-FEE' || c.id === 'CMP-PERMANENT-CORE') &&
      c.status === 'Active' &&
      c.permanentStatus !== 'Deactivated'
  );
  const permanentStatusBadge: 'Active' | 'Scheduled End' | 'Deactivated' = !activePermanentCamp
    ? 'Deactivated'
    : activePermanentCamp.endDate && activePermanentCamp.endDate !== '' && activePermanentCamp.endDate !== 'Indefinite'
    ? 'Scheduled End'
    : 'Active';
  const [showWizard, setShowWizard] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<CampaignPayment | null>(null);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');

  // Modify Launched Campaign state
  const [campaignToModify, setCampaignToModify] = useState<FeeCampaign | null>(null);
  const [unauthorizedNotice, setUnauthorizedNotice] = useState<string | null>(null);

  // Offline Payment Entry State
  const [offlineDueId, setOfflineDueId] = useState('');
  const [offlineMode, setOfflineMode] = useState<'Cash' | 'Cheque' | 'DD' | 'POS'>('Cash');
  const [offlineAmount, setOfflineAmount] = useState<number>(0);
  const [offlineReference, setOfflineReference] = useState('');
  const [offlineSuccessNotice, setOfflineSuccessNotice] = useState<string | null>(null);
  const [offlineErrorNotice, setOfflineErrorNotice] = useState<string | null>(null);

  // Role is strictly derived from authenticated session
  const effectiveRole = userRole;

  // Publish New Campaign from Wizard

  // Publish New Campaign from Wizard
  const handlePublishCampaign = (
    newCampaign: FeeCampaign,
    newDues: StudentDue[],
    draftHeadsToCommit?: MasterFeeHead[]
  ) => {
    // If draft heads were created and campaign is launched/saved, commit them into feeHeads
    if (draftHeadsToCommit && draftHeadsToCommit.length > 0) {
      const updatedHeads = [...feeHeads];
      draftHeadsToCommit.forEach((dh) => {
        const existingIdx = updatedHeads.findIndex((h) => h.id === dh.id);
        const headToSave: MasterFeeHead = {
          ...dh,
          status: newCampaign.status === 'Active' ? 'Active' : 'Draft',
          updatedAt: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          updatedHeads[existingIdx] = headToSave;
        } else {
          updatedHeads.unshift(headToSave);
        }

        onAddAuditLog({
          id: `LOG-HEAD-${Date.now()}-${dh.id}`,
          entityType: 'FeeHead',
          entityId: dh.id,
          action: 'CREATE',
          userEmail,
          userName,
          userRole: effectiveRole === 'admin' ? 'Admin' : 'Accountant',
          details: `Committed statutory fee head "${dh.name}" (₹${dh.defaultAmount}) with status "${
            newCampaign.status === 'Active' ? 'Active' : 'Draft'
          }" on campaign "${newCampaign.title}".`,
          timestamp: new Date().toISOString(),
        });
      });
      onUpdateFeeHeads(updatedHeads);
    }

    onUpdateCampaigns([newCampaign, ...campaigns]);
    onUpdateStudentDues([...newDues, ...studentDues]);
    setShowWizard(false);
    setAdminActiveTab('dashboard');

    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'Campaign',
      entityId: newCampaign.id,
      action: 'CREATE',
      userEmail,
      userName,
      userRole: effectiveRole === 'admin' ? 'Admin' : 'Accountant',
      details: `Published fee campaign "${newCampaign.title}" with ${
        newCampaign.cohorts?.length || 1
      } cohort(s) for ${newDues.length} students. Total expected: ₹${newCampaign.totalExpectedAmount}`,
      newValue: newCampaign.title,
      timestamp: new Date().toISOString(),
    });
  };

  const handleSaveModifiedCampaign = (updatedCampaign: FeeCampaign, updatedDues?: StudentDue[]) => {
    onUpdateCampaigns(
      campaigns.map((c) => (c.id === updatedCampaign.id ? updatedCampaign : c))
    );
    if (updatedDues) {
      onUpdateStudentDues(updatedDues);
    }
    setCampaignToModify(null);
  };

  // Extend Campaign End Date
  const handleExtendCampaign = (campaignId: string, newEndDate: string, reason: string) => {
    const now = new Date().toISOString();
    const targetCamp = campaigns.find((c) => c.id === campaignId);
    if (!targetCamp) return;

    const oldEnd = targetCamp.endDate;
    const extensionRecord = {
      id: `EXT-${Date.now()}`,
      oldEndDate: oldEnd,
      newEndDate,
      extendedBy: `${effectiveRole === 'admin' ? 'Admin' : 'Accountant'}: ${userName}`,
      extendedAt: now,
      reason,
    };

    const updatedCampaigns = campaigns.map((c) =>
      c.id === campaignId
        ? {
            ...c,
            endDate: newEndDate,
            status: 'Active' as const,
            extensions: [...c.extensions, extensionRecord],
          }
        : c
    );
    onUpdateCampaigns(updatedCampaigns);

    // Refresh payment links and active status on dues
    const updatedDues = studentDues.map((d) =>
      d.campaignId === campaignId
        ? {
            ...d,
            paymentLinkActive: d.balanceAmount > 0,
            status: d.status === 'Expired' ? ('Pending' as const) : d.status,
            updatedAt: now,
          }
        : d
    );
    onUpdateStudentDues(updatedDues);

    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'Campaign',
      entityId: campaignId,
      action: 'EXTEND',
      userEmail,
      userName,
      userRole: effectiveRole === 'admin' ? 'Admin' : 'Accountant',
      details: `Extended campaign "${targetCamp.title}" end date from ${oldEnd} to ${newEndDate} (${reason})`,
      oldValue: oldEnd,
      newValue: newEndDate,
      timestamp: now,
    });
  };

  // Send Reminders
  const handleSendReminder = (campaignId: string, rollNumbers: string[]) => {
    const now = new Date().toISOString();
    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'Campaign',
      entityId: campaignId,
      action: 'UPDATE',
      userEmail,
      userName,
      userRole: effectiveRole === 'admin' ? 'Admin' : 'Accountant',
      details: `Dispatched payment reminders to ${rollNumbers.length} students with outstanding balances.`,
      timestamp: now,
    });
  };

  // Payment Success Handler
  const handlePaymentSuccess = (payment: CampaignPayment, updatedDue: StudentDue) => {
    onUpdatePayments([payment, ...payments]);
    onUpdateStudentDues(
      studentDues.map((d) => (d.id === updatedDue.id ? updatedDue : d))
    );

    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'Payment',
      entityId: payment.id,
      action: 'CREATE',
      userEmail: payment.rollNo,
      userName: payment.studentName,
      userRole: 'Student',
      details: `Settled payment of ₹${payment.amountPaid} for ${payment.campaignTitle}. Receipt: ${payment.receiptNo}`,
      newValue: `Receipt ${payment.receiptNo}`,
      timestamp: new Date().toISOString(),
    });
  };

  // Cancel Receipt Handler
  const handleCancelReceipt = (paymentId: string, reason: string) => {
    const now = new Date().toISOString();
    const updatedPayments = payments.map((p) =>
      p.id === paymentId
        ? {
            ...p,
            status: 'Cancelled' as const,
            cancellationReason: reason,
            cancelledBy: `${effectiveRole === 'admin' ? 'Admin' : 'Accountant'}: ${userName}`,
            cancelledAt: now,
          }
        : p
    );
    onUpdatePayments(updatedPayments);

    // Reopen student due balance if receipt cancelled
    const targetP = payments.find((p) => p.id === paymentId);
    if (targetP) {
      const updatedDues = studentDues.map((d) => {
        if (d.id === targetP.dueId) {
          const restoredBalance = d.balanceAmount + targetP.amountPaid;
          return {
            ...d,
            paidAmount: Math.max(0, d.paidAmount - targetP.amountPaid),
            balanceAmount: restoredBalance,
            status: restoredBalance > 0 ? ('Pending' as const) : d.status,
            updatedAt: now,
          };
        }
        return d;
      });
      onUpdateStudentDues(updatedDues);
    }
  };

  // Manual Mark as Paid
  const handleManualMarkAsPaid = (paymentId: string, reason: string) => {
    const now = new Date().toISOString();
    const updatedPayments = payments.map((p) =>
      p.id === paymentId ? { ...p, status: 'Success' as const } : p
    );
    onUpdatePayments(updatedPayments);

    const targetP = payments.find((p) => p.id === paymentId);
    if (targetP) {
      onUpdateStudentDues(
        studentDues.map((d) =>
          d.id === targetP.dueId
            ? { ...d, paidAmount: d.netAmount, balanceAmount: 0, status: 'Paid' as const, updatedAt: now }
            : d
        )
      );
    }

    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'Reconciliation',
      entityId: paymentId,
      action: 'RECONCILE',
      userEmail,
      userName,
      userRole: 'Admin',
      details: `Manually marked payment ${paymentId} as Paid. Reason: ${reason}`,
      timestamp: now,
    });
  };

  // Refund Handler
  const handleInitiateRefund = (paymentId: string, refundAmount: number, reason: string) => {
    const now = new Date().toISOString();
    const targetP = payments.find((p) => p.id === paymentId);
    if (!targetP) return;

    const updatedPayments = payments.map((p) =>
      p.id === paymentId
        ? {
            ...p,
            status: 'Refunded' as const,
            refundAmount,
            refundReason: reason,
            refundedAt: now,
            refundedBy: `${effectiveRole === 'admin' ? 'Admin' : 'Accountant'}: ${userName}`,
          }
        : p
    );
    onUpdatePayments(updatedPayments);

    // Update student due balance
    onUpdateStudentDues(
      studentDues.map((d) =>
        d.id === targetP.dueId
          ? {
              ...d,
              balanceAmount: d.balanceAmount + refundAmount,
              paidAmount: Math.max(0, d.paidAmount - refundAmount),
              status: 'Partial' as const,
              updatedAt: now,
            }
          : d
      )
    );

    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'Refund',
      entityId: paymentId,
      action: 'REFUND',
      userEmail,
      userName,
      userRole: effectiveRole === 'admin' ? 'Admin' : 'Accountant',
      details: `Initiated ₹${refundAmount} refund for ${targetP.studentName} (${targetP.rollNo}) on ${targetP.providerName}. Reason: ${reason}`,
      timestamp: now,
    });
  };

  // Delete History Provider (Admin Only)
  const handleDeleteHistoryProvider = (historyId: string) => {
    onUpdateProviderHistory(providerHistory.filter((h) => h.id !== historyId));
    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'Provider',
      entityId: historyId,
      action: 'DELETE',
      userEmail,
      userName,
      userRole: 'Admin',
      details: `Deleted decommissioned provider archive ${historyId}`,
      timestamp: new Date().toISOString(),
    });
  };

  // Recurring Institutional Campaign Activations (Annual Fee, Monthly Fee, Semester Fee)
  const [recurringActivationMsg, setRecurringActivationMsg] = useState<string | null>(null);

  const handleActivateRecurringCampaign = (type: 'Annual' | 'Monthly' | 'Semester') => {
    const campaignId = `CMP-${type.toUpperCase()}-FEE`;
    const title = `${type} Fee Campaign 2025-26`;
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Auto-sum subjects and lab fees per student stream
    const activeSubjects = studySubjects || [];

    let totalCollectedAmount = 0;
    const newStudentDues: StudentDue[] = [];

    allStudents.forEach((stu) => {
      const stuStream = (stu.streamCode || (stu.branch?.includes('Computer') ? 'CSE' : stu.branch?.includes('Mechanical') ? 'MECH' : stu.branch?.includes('Electronics') ? 'ECE' : 'CSE')).toUpperCase();
      const streamSubs = activeSubjects.filter((s) => s.isActive && s.streamCode.toUpperCase() === stuStream);

      let studentAmountPaisa = 0;
      if (type === 'Annual') {
        studentAmountPaisa = streamSubs.reduce(
          (acc, s) => acc + Math.round((s.annualFee || s.subjectFee || 0) * 100) + Math.round((s.labFee || s.associatedLabFee || 0) * 100) + Math.round((s.otherFee || 0) * 100),
          0
        );
        if (studentAmountPaisa === 0) studentAmountPaisa = 24000 * 100;
      } else if (type === 'Monthly') {
        studentAmountPaisa = streamSubs.reduce(
          (acc, s) => acc + Math.round(s.monthlyFee ? s.monthlyFee * 100 : Math.round(((s.subjectFee || 10000) * 100) / 10)),
          0
        );
        if (studentAmountPaisa === 0) studentAmountPaisa = 2000 * 100;
      } else {
        studentAmountPaisa = streamSubs.reduce(
          (acc, s) => acc + Math.round(s.semesterFee ? s.semesterFee * 100 : Math.round(((s.subjectFee || 10000) * 100) / 2)) + Math.round((s.labFee || s.associatedLabFee || 0) * 100) + Math.round((s.otherFee || 0) * 100),
          0
        );
        if (studentAmountPaisa === 0) studentAmountPaisa = 12000 * 100;
      }

      const studentAmount = Math.round(studentAmountPaisa / 100);
      totalCollectedAmount += studentAmount;

      newStudentDues.push({
        id: `DUE-${campaignId}-${stu.id}`,
        campaignId,
        campaignTitle: title,
        studentId: stu.id,
        studentEmail: stu.email,
        rollNo: stu.rollNo,
        studentName: stu.name,
        course: stu.course,
        semester: stu.semester,
        baseAmount: studentAmount,
        concessionAmount: 0,
        netAmount: studentAmount,
        paidAmount: 0,
        balanceAmount: studentAmount,
        status: 'Pending',
        lineItems: [
          {
            headId: `HD-${type.toUpperCase()}`,
            name: `${type} Comprehensive Curriculum & Lab Fees`,
            amount: studentAmount,
          },
        ],
        lateFeeApplied: 0,
        paymentLink: `/pay/${stu.id}`,
        paymentLinkActive: true,
        createdAt: now,
        updatedAt: now,
      });
    });

    const averagePerStudent = Math.round(totalCollectedAmount / (allStudents.length || 1));

    const existingIndex = campaigns.findIndex((c) => c.id === campaignId);
    let updatedCampaigns: FeeCampaign[];

    if (existingIndex >= 0) {
      updatedCampaigns = campaigns.map((c, idx) =>
        idx === existingIndex
          ? {
              ...c,
              status: 'Active' as const,
              totalAmount: averagePerStudent,
              totalExpectedAmount: totalCollectedAmount,
              startDate: today,
              endDate: dueDate,
            }
          : c
      );
    } else {
      const newCampaign: FeeCampaign = {
        id: campaignId,
        title,
        description: `Official statutory ${type.toLowerCase()} academic & laboratory fee automatically summed from enrolled curriculum subjects and laboratory labs.`,
        customHeads: [
          {
            headId: `HD-${type.toUpperCase()}`,
            headName: `${type} Comprehensive Academic Fee`,
            amount: averagePerStudent,
          },
        ],
        totalAmount: averagePerStudent,
        startDate: today,
        endDate: dueDate,
        lateFee: {
          enabled: false,
          type: 'FLAT',
          amount: 0,
          graceDays: 7,
        },
        status: 'Active',
        method: 'SELECTION',
        studentCount: allStudents.length,
        totalExpectedAmount: totalCollectedAmount,
        extensions: [],
        createdAt: now,
        createdBy: userEmail,
        nominatedStaffEmails: [userEmail],
      };
      updatedCampaigns = [newCampaign, ...campaigns];
    }

    onUpdateCampaigns(updatedCampaigns);

    const otherDues = studentDues.filter((d) => d.campaignId !== campaignId);
    onUpdateStudentDues([...newStudentDues, ...otherDues]);

    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'Campaign',
      entityId: campaignId,
      action: 'ACTIVATE',
      userEmail,
      userName,
      userRole: effectiveRole === 'admin' ? 'Admin' : 'Accountant',
      details: `Activated recurring ${type} Fee Campaign. Enrolled ${allStudents.length} students with dynamic subject & lab auto-summation (Avg ₹${averagePerStudent}).`,
      timestamp: now,
    });

    setRecurringActivationMsg(`Successfully activated ${title}! Dues automatically calculated and published for ${allStudents.length} students across all streams.`);
    setTimeout(() => setRecurringActivationMsg(null), 6000);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-16">
      {/* 1. Header & Identity Cleanup: Single Clean Header Navbar */}
      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 min-w-9 min-h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-900 tracking-tight leading-tight">
              Fee Module
            </h1>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {userName || 'S. N. Sharma'} · DDO 2049
            </p>
          </div>
        </div>

        {/* Right side: Clean outline profile avatar or subtle logout icon */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center"
            title={userName || 'S. N. Sharma'}
          >
            {(userName || 'S. N. Sharma')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* STUDENT VIEW - Locked strictly to logged-in student roll number, read-only */}
      {effectiveRole === 'student' ? (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-950 font-medium">
              <Users className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Enrollment Roll No: <strong className="font-mono text-emerald-900 font-bold">{studentRollNo}</strong>
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-300 font-semibold">
              Read-Only Ledger · Payment Only
            </span>
          </div>

          <StudentMyFees
            studentRollNo={studentRollNo}
            studentDues={studentDues}
            campaigns={campaigns}
            activeProvider={activeProvider}
            onPaymentSuccess={handlePaymentSuccess}
            onViewReceipt={(p) => setViewingReceipt(p)}
            payments={payments}
          />
        </div>
      ) : (
        /* ADMIN / ACCOUNTANT VIEW - Tabs controlled strictly by role */
        <div className="space-y-4">
          {/* Module Navigation Tabs (Standardized Pill Switcher with Indigo Brand Color) */}
          {!showWizard && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 no-scrollbar">
              <button
                type="button"
                onClick={() => setAdminActiveTab('dashboard')}
                className={`min-h-[40px] px-3.5 py-2 text-xs rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  adminActiveTab === 'dashboard'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Collection Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminActiveTab('campaigns')}
                className={`min-h-[40px] px-3.5 py-2 text-xs rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  adminActiveTab === 'campaigns'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Fee Campaigns ({campaigns.length})</span>
              </button>

              {/* Permanent Campaign Tab with Dynamic Lifecycle Status Badge */}
              <button
                type="button"
                onClick={() => setAdminActiveTab('permanent')}
                className={`min-h-[40px] px-3.5 py-2 text-xs rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  adminActiveTab === 'permanent'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium'
                }`}
              >
                <Infinity className="w-4 h-4" />
                <span>Permanent Campaign</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                  adminActiveTab === 'permanent'
                    ? 'bg-white/20 text-white'
                    : permanentStatusBadge === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : permanentStatusBadge === 'Scheduled End'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {permanentStatusBadge}
                </span>
              </button>

              {/* Master Data Tab (Fee Head Master) */}
              <button
                type="button"
                onClick={() => setAdminActiveTab('master')}
                className={`min-h-[40px] px-3.5 py-2 text-xs rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  adminActiveTab === 'master'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Fee Head Master</span>
              </button>

              {/* Concession & Surcharge Tab */}
              <button
                type="button"
                onClick={() => setAdminActiveTab('concessions')}
                className={`min-h-[40px] px-3.5 py-2 text-xs rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  adminActiveTab === 'concessions'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium'
                }`}
              >
                <Percent className="w-4 h-4" />
                <span>Concession & Surcharge</span>
                {concessionRules && concessionRules.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    adminActiveTab === 'concessions' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {concessionRules.length}
                  </span>
                )}
              </button>

              {/* Payment Provider Settings */}
              <button
                type="button"
                onClick={() => setAdminActiveTab('provider')}
                className={`min-h-[40px] px-3.5 py-2 text-xs rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  adminActiveTab === 'provider'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Gateway Settings</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  adminActiveTab === 'provider'
                    ? 'bg-white/20 text-white'
                    : activeProvider && activeProvider.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {activeProvider && activeProvider.status === 'Active' ? 'Live' : 'Unmapped'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAdminActiveTab('offline')}
                className={`min-h-[40px] px-3.5 py-2 text-xs rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  adminActiveTab === 'offline'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Offline Entry</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminActiveTab('receipts')}
                className={`min-h-[40px] px-3.5 py-2 text-xs rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  adminActiveTab === 'receipts'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Receipts ({payments.length})</span>
              </button>
            </div>
          )}

          {/* WIZARD VIEW */}
          {showWizard ? (
            <CampaignWizard
              feeHeads={feeHeads}
              feePlans={feePlans}
              courses={courses}
              semesters={semesters}
              subjects={subjects}
              allStudents={allStudents}
              staffUsers={staffUsers}
              userRole={effectiveRole}
              userEmail={userEmail}
              currentProviderName={activeProvider ? activeProvider.name : 'No Provider Mapped (Awaiting Admin Onboarding)'}
              userName={userName}
              onPublishCampaign={handlePublishCampaign}
              onCancel={() => setShowWizard(false)}
            />
          ) : (
            <>
              {unauthorizedNotice && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{unauthorizedNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUnauthorizedNotice(null)}
                    className="text-rose-600 hover:text-rose-800 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 1. COLLECTION DASHBOARD */}
              {adminActiveTab === 'dashboard' && (
                <CollectionDashboard
                  campaigns={campaigns}
                  studentDues={studentDues}
                  payments={payments}
                  userRole={effectiveRole as 'admin' | 'accountant'}
                  userName={userName}
                  userEmail={userEmail}
                  staffUsers={staffUsers}
                  onExtendCampaign={handleExtendCampaign}
                  onModifyCampaign={(camp) => setCampaignToModify(camp)}
                  onSendReminder={handleSendReminder}
                  onUpdateReminderSchedule={() => {}}
                  onAddAuditLog={onAddAuditLog}
                  onViewReceipt={(p) => setViewingReceipt(p)}
                />
              )}

              {/* 2. CAMPAIGNS TAB */}
              {adminActiveTab === 'campaigns' && (
                <div className="space-y-4">
                  {recurringActivationMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{recurringActivationMsg}</span>
                      </div>
                      <button type="button" onClick={() => setRecurringActivationMsg(null)} className="text-emerald-700 hover:text-emerald-900">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Custom Institutional Campaigns</h2>
                      <p className="text-xs text-slate-500">Scheduled statutory student fee collection periods and cohort structures.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWizard(true)}
                      className="min-h-[44px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Campaign</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {campaigns.map((c) => {
                      const isCampaignAdmin = effectiveRole === 'admin' || effectiveRole === 'accountant';
                      const isCampaignNominated = (c.nominatedStaffEmails || []).some(
                        (e) => e.trim().toLowerCase() === (userEmail || '').trim().toLowerCase()
                      );
                      const canModify = isCampaignAdmin || isCampaignNominated;

                      return (
                        <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                              {c.method === 'EXCEL' ? 'Excel Upload' : 'Course Selection'} · {isCampaignAdmin ? 'Admin Control' : isCampaignNominated ? 'Nominated Editor' : 'Restricted'}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              c.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : c.status === 'Expired'
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                              {c.status}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-slate-900 leading-snug">{c.title}</h3>
                            {c.description && (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{c.description}</p>
                            )}
                            <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Due: {new Date(c.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </p>
                          </div>

                          {/* Cohorts summary if modular cohorts present */}
                          {c.cohorts && c.cohorts.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Cohorts ({c.cohorts.length})
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {c.cohorts.map((coh) => (
                                  <span
                                    key={coh.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 font-semibold text-[10px] border border-slate-200"
                                  >
                                    <span>{coh.course} (Sem {coh.semester})</span>
                                    <span className="text-indigo-600 font-mono">₹{coh.netFeePerStudent.toLocaleString('en-IN')}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 bg-slate-50 border border-slate-100 rounded-lg p-3">
                            <div>
                              <p className="text-[11px] text-slate-500 font-medium">Fee Rate / Student</p>
                              <p className="text-sm font-bold text-slate-900 font-mono">₹{c.totalAmount.toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-500 font-medium">Audience</p>
                              <p className="text-sm font-bold text-indigo-600 font-mono">{c.studentCount} Students</p>
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setAdminActiveTab('dashboard');
                              }}
                              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Ledger</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (canModify) {
                                  setCampaignToModify(c);
                                } else {
                                  setUnauthorizedNotice(
                                    `Modification restricted: Only Institutional Admin or staff nominated by Admin (${
                                      c.nominatedStaffNames?.length ? c.nominatedStaffNames.join(', ') : 'None nominated'
                                    }) can modify this campaign after launch.`
                                  );
                                  setTimeout(() => setUnauthorizedNotice(null), 5000);
                                }
                              }}
                              className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Sliders className="w-3.5 h-3.5 text-slate-500" />
                              <span>Modify</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PERMANENT CAMPAIGN DEDICATED TAB & LIFECYCLE CONTROLS */}
              {adminActiveTab === 'permanent' && (
                <div className="space-y-4">
                  <PermanentCampaignManager
                    campaigns={campaigns}
                    onUpdateCampaigns={onUpdateCampaigns}
                    studentDues={studentDues}
                    onUpdateStudentDues={onUpdateStudentDues}
                    onAddAuditLog={onAddAuditLog}
                    userRole={effectiveRole as 'admin' | 'accountant'}
                    userName={userName}
                    userEmail={userEmail}
                    allStudents={allStudents}
                    streams={streams}
                    studySubjects={studySubjects}
                    isEmbeddedCard={false}
                    onNavigateToTab={(tab: unknown) => {
                      if (typeof tab === 'string') {
                        setAdminActiveTab(tab);
                      }
                    }}
                  />
                </div>
              )}

              {/* 3. MASTER DATA TAB (Fee Head Master) */}
              {adminActiveTab === 'master' && (
                <div className="space-y-4">
                  <MasterDataView
                    feeHeads={feeHeads}
                    feePlans={feePlans}
                    courses={courses}
                    semesters={semesters}
                    subjects={subjects}
                    auditLogs={auditLogs}
                    userRole={effectiveRole as 'admin' | 'accountant'}
                    userName={userName}
                    userEmail={userEmail}
                    onUpdateFeeHeads={onUpdateFeeHeads}
                    onUpdateFeePlans={onUpdateFeePlans}
                    onUpdateCourses={onUpdateCourses}
                    onUpdateSemesters={onUpdateSemesters}
                    onUpdateSubjects={onUpdateSubjects}
                    onAddAuditLog={onAddAuditLog}
                    onNavigateToConcessions={() => setAdminActiveTab('concessions')}
                  />
                </div>
              )}

              {/* 4. CONCESSION & SURCHARGE TAB */}
              {adminActiveTab === 'concessions' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Percent className="w-5 h-5 text-amber-600" />
                        <span>Concession & Surcharge Rules Engine</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Define parameter-based fee concessions, quotas, scholarships & statutory surcharges for student cohorts.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdminActiveTab('master')}
                      className="min-h-[44px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Switch to Fee Head Master ›</span>
                    </button>
                  </div>

                  <FeeHeadRulesManager
                    feeHeads={statutoryFeeHeads}
                    enrollmentFields={enrollmentFields}
                    concessionRules={concessionRules}
                    students={allStudents}
                    currentSession={currentSession}
                    onUpdateConcessionRules={onUpdateConcessionRules || (() => {})}
                    onApplyRulesToStudents={onApplyRulesToStudents}
                  />
                </div>
              )}

              {/* 4. PAYMENT PROVIDER TAB */}
              {adminActiveTab === 'provider' && (
                <PaymentProviderSettings
                  activeProvider={activeProvider}
                  providerHistory={providerHistory}
                  payments={payments}
                  studentDues={studentDues}
                  userRole={effectiveRole as 'admin' | 'accountant'}
                  userName={userName}
                  userEmail={userEmail}
                  onUpdateActiveProvider={onUpdateActiveProvider}
                  onDeleteHistoryProvider={handleDeleteHistoryProvider}
                  onRecordOfflinePayment={(p) => {
                    handlePaymentSuccess(p, {
                      ...studentDues.find((d) => d.id === p.dueId)!,
                      paidAmount: (studentDues.find((d) => d.id === p.dueId)?.paidAmount || 0) + p.amountPaid,
                      balanceAmount: p.balanceRemaining,
                      status: p.balanceRemaining === 0 ? 'Paid' : 'Partial',
                    });
                  }}
                  onManualMarkAsPaid={handleManualMarkAsPaid}
                  onInitiateRefund={handleInitiateRefund}
                  onRegeneratePaymentLink={() => {}}
                  onAddAuditLog={onAddAuditLog}
                />
              )}

              {/* 5. OFFLINE PAYMENT ENTRY TAB */}
              {adminActiveTab === 'offline' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-sm font-bold text-slate-900">Counter & Offline Payment Entry</h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Accountant & Cashier Desk
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Accept physical counter collections via Cash, Bank Cheque, Demand Draft (DD) or POS machine and issue instant statutory receipts.
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-700 block">
                        {studentDues.filter((d) => d.balanceAmount > 0).length} Outstanding Dues
                      </span>
                      <span className="text-[10px] text-slate-400">Available for collection</span>
                    </div>
                  </div>

                  {offlineErrorNotice && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-semibold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{offlineErrorNotice}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOfflineErrorNotice(null)}
                        className="text-xs text-rose-700 hover:text-rose-900 font-bold cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {offlineSuccessNotice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-semibold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{offlineSuccessNotice}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOfflineSuccessNotice(null)}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setOfflineErrorNotice(null);

                      const matchedDue = studentDues.find((d) => d.id === offlineDueId);
                      if (!matchedDue) {
                        setOfflineErrorNotice('Please select a student fee due record.');
                        return;
                      }

                      const totalDuePayable = matchedDue.balanceAmount + (matchedDue.lateFeeApplied || 0);
                      const enteredAmount = Math.round(Number(offlineAmount));

                      if (enteredAmount <= 0) {
                        setOfflineErrorNotice('Collection amount must be greater than zero.');
                        return;
                      }

                      if (enteredAmount > totalDuePayable) {
                        setOfflineErrorNotice(
                          `Collection amount (₹${enteredAmount.toLocaleString('en-IN')}) exceeds total payable (₹${totalDuePayable.toLocaleString('en-IN')}). Excess collections cannot be silently capped.`
                        );
                        return;
                      }

                      if (['Cheque', 'DD'].includes(offlineMode) && (!offlineReference || offlineReference.trim().length < 4)) {
                        setOfflineErrorNotice(
                          `Cheque / Demand Draft instrument number and bank details are required for ${offlineMode} collection.`
                        );
                        return;
                      }

                      const now = new Date().toISOString();
                      const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
                      const receiptNo = `REC/CTR/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}-${entropy}`;
                      const txId = `TX-${offlineMode.toUpperCase()}-${Date.now().toString().slice(-6)}-${entropy}`;

                      // Allocate payment towards late fee first, then base balance
                      const lateFeeOwed = matchedDue.lateFeeApplied || 0;
                      const paidLate = Math.min(lateFeeOwed, enteredAmount);
                      const paidBase = enteredAmount - paidLate;
                      const newLateFee = Math.max(0, lateFeeOwed - paidLate);
                      const newBalance = Math.max(0, matchedDue.balanceAmount - paidBase);

                      const newPayment: CampaignPayment = {
                        id: `PAY-OFF-${Date.now()}-${entropy}`,
                        receiptNo,
                        dueId: matchedDue.id,
                        campaignId: matchedDue.campaignId,
                        campaignTitle: matchedDue.campaignTitle,
                        rollNo: matchedDue.rollNo,
                        studentName: matchedDue.studentName,
                        course: matchedDue.course,
                        semester: matchedDue.semester,
                        amountPaid: enteredAmount,
                        lateFeePaid: paidLate,
                        balanceRemaining: newBalance + newLateFee,
                        lineItems: matchedDue.lineItems,
                        paymentMode: offlineMode,
                        methodDetail: `Counter Collection (${offlineMode}): ${offlineReference || 'Official Counter Entry'}`,
                        providerId: 'PRV-COUNTER',
                        providerName: 'Treasury Counter Register',
                        providerType: 'Custom / Other',
                        providerMode: 'Live',
                        transactionId: txId,
                        gatewayReference: offlineReference.trim(),
                        idempotencyKey: `IDEMP-${txId}`,
                        status: 'Success',
                        timestamp: now,
                      };

                      const updatedDue: StudentDue = {
                        ...matchedDue,
                        paidAmount: matchedDue.paidAmount + paidBase,
                        lateFeeApplied: newLateFee,
                        balanceAmount: newBalance,
                        status: (newBalance === 0 && newLateFee === 0) ? 'Paid' : 'Partial',
                        lastPaymentDate: now.split('T')[0],
                        updatedAt: now,
                      };

                      handlePaymentSuccess(newPayment, updatedDue);

                      onAddAuditLog({
                        id: `LOG-${Date.now()}-${entropy}`,
                        entityType: 'Payment',
                        entityId: newPayment.id,
                        action: 'OFFLINE_PAYMENT',
                        userEmail,
                        userName,
                        userRole: effectiveRole === 'admin' ? 'Admin' : 'Accountant',
                        details: `Recorded offline ${offlineMode} collection of ₹${enteredAmount} (Late Fee: ₹${paidLate}) for ${matchedDue.studentName} (${matchedDue.rollNo}). Receipt: ${receiptNo}`,
                        newValue: `Receipt: ${receiptNo}`,
                        timestamp: now,
                      });

                      setOfflineSuccessNotice(`Recorded collection of ₹${enteredAmount.toLocaleString('en-IN')} (Late fine: ₹${paidLate}). Receipt ${receiptNo} issued.`);
                      setOfflineDueId('');
                      setOfflineAmount(0);
                      setOfflineReference('');
                      setViewingReceipt(newPayment);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-slate-800 font-bold block mb-1">
                        Select Student with Outstanding Fee Due *
                      </label>
                      <select
                        required
                        value={offlineDueId}
                        onChange={(e) => {
                          setOfflineDueId(e.target.value);
                          setOfflineErrorNotice(null);
                          const sel = studentDues.find((d) => d.id === e.target.value);
                          if (sel) {
                            setOfflineAmount(sel.balanceAmount + (sel.lateFeeApplied || 0));
                          }
                        }}
                        className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                      >
                        <option value="">-- Choose student & campaign due --</option>
                        {studentDues
                          .filter((d) => (d.balanceAmount + (d.lateFeeApplied || 0)) > 0)
                          .map((d) => {
                            const tot = d.balanceAmount + (d.lateFeeApplied || 0);
                            return (
                              <option key={d.id} value={d.id}>
                                {d.studentName} ({d.rollNo}) · {d.campaignTitle} [Total Due: ₹{tot.toLocaleString('en-IN')}{d.lateFeeApplied ? ` (Incl. ₹${d.lateFeeApplied} late fine)` : ''}]
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-800 font-bold block mb-1">Payment Mode *</label>
                        <select
                          value={offlineMode}
                          onChange={(e) => {
                            setOfflineMode(e.target.value as string);
                            setOfflineErrorNotice(null);
                          }}
                          className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                        >
                          <option value="Cash">Cash at Counter</option>
                          <option value="Cheque">Bank Cheque</option>
                          <option value="DD">Demand Draft (DD)</option>
                          <option value="POS">Treasury Counter POS / Card</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-800 font-bold block mb-1">Amount to Collect (₹) *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={
                            offlineDueId 
                              ? ((studentDues.find((d) => d.id === offlineDueId)?.balanceAmount || 0) + (studentDues.find((d) => d.id === offlineDueId)?.lateFeeApplied || 0)) || 999999 
                              : 999999
                          }
                          value={offlineAmount || ''}
                          onChange={(e) => {
                            setOfflineAmount(Number(e.target.value));
                            setOfflineErrorNotice(null);
                          }}
                          placeholder="Amount in Rupees"
                          className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-slate-800 font-bold block mb-1">
                          {['Cheque', 'DD'].includes(offlineMode) ? 'Instrument / Ref No. (Mandatory) *' : 'Counter Receipt Remarks'}
                        </label>
                        <input
                          type="text"
                          required={['Cheque', 'DD'].includes(offlineMode)}
                          value={offlineReference}
                          onChange={(e) => {
                            setOfflineReference(e.target.value);
                            setOfflineErrorNotice(null);
                          }}
                          placeholder={['Cheque', 'DD'].includes(offlineMode) ? 'e.g. CHQ-928102 (SBI Patna Branch)' : 'e.g. Counter #2 Entry'}
                          className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-[11px] text-slate-500">
                        Officer: <strong>{userName}</strong> ({effectiveRole === 'admin' ? 'Administrator' : 'Accountant'})
                      </div>

                      <button
                        type="submit"
                        disabled={!offlineDueId || offlineAmount <= 0}
                        className="min-h-[44px] px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
                      >
                        <Receipt className="w-4 h-4 text-emerald-200" />
                        <span>Issue Official Counter Receipt</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 6. RECEIPTS HISTORY TAB */}
              {adminActiveTab === 'receipts' && (() => {
                const filteredReceipts = payments.filter(
                  (p) =>
                    p.studentName.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
                    p.rollNo.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
                    p.receiptNo.toLowerCase().includes(receiptSearchQuery.toLowerCase())
                );

                const handleExportReceiptsCsv = () => {
                  if (filteredReceipts.length === 0) return;

                  const headers = [
                    'Receipt No',
                    'Transaction ID',
                    'Campaign ID',
                    'Campaign Title',
                    'Student Roll No',
                    'Student Name',
                    'Course',
                    'Semester',
                    'Amount Paid (INR)',
                    'Late Fee Paid (INR)',
                    'Balance Remaining (INR)',
                    'Payment Mode',
                    'Gateway / Channel',
                    'Gateway Reference / SBI DU Ref',
                    'Payment Status',
                    'Payment Date',
                    'Fee Heads Breakdown'
                  ];

                  const escapeCsv = (val: unknown): string => {
                    if (val === undefined || val === null) return '""';
                    const str = String(val).replace(/"/g, '""');
                    return `"${str}"`;
                  };

                  const rows = filteredReceipts.map((p) => {
                    const headsSummary = (p.lineItems || [])
                      .map((li) => `${li.name || 'Fee Head'}: ₹${li.amount}`)
                      .join('; ');

                    return [
                      escapeCsv(p.receiptNo),
                      escapeCsv(p.transactionId || p.id),
                      escapeCsv(p.campaignId),
                      escapeCsv(p.campaignTitle),
                      escapeCsv(p.rollNo),
                      escapeCsv(p.studentName),
                      escapeCsv(p.course),
                      escapeCsv(p.semester),
                      escapeCsv(p.amountPaid),
                      escapeCsv(p.lateFeePaid || 0),
                      escapeCsv(p.balanceRemaining || 0),
                      escapeCsv(p.paymentMode),
                      escapeCsv(p.providerName || 'Treasury Counter'),
                      escapeCsv(p.gatewayReference || '-'),
                      escapeCsv(p.status),
                      escapeCsv(p.timestamp),
                      escapeCsv(headsSummary)
                    ].join(',');
                  });

                  const csvContent = [headers.join(','), ...rows].join('\r\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  const dateStamp = new Date().toISOString().slice(0, 10);
                  link.href = url;
                  link.setAttribute('download', `RLSY_Accountant_Receipt_Ledger_${dateStamp}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                };

                return (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900">Official Fee Receipt Ledger</h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {filteredReceipts.length} records
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Every successful online or counter payment issues an immutable receipt.</p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search student, Roll No, Receipt #..."
                          value={receiptSearchQuery}
                          onChange={(e) => setReceiptSearchQuery(e.target.value)}
                          className="w-full min-h-[40px] pl-8 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleExportReceiptsCsv}
                        disabled={filteredReceipts.length === 0}
                        className="min-h-[40px] px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs disabled:cursor-not-allowed"
                        title={`Export ${filteredReceipts.length} filtered receipt records as CSV`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                    {payments
                      .filter(
                        (p) =>
                          p.studentName.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
                          p.rollNo.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
                          p.receiptNo.toLowerCase().includes(receiptSearchQuery.toLowerCase())
                      )
                      .map((p) => (
                        <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{p.studentName}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                                {p.rollNo}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                p.status === 'Success'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'Cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {p.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Receipt: {p.receiptNo} · Date: {new Date(p.timestamp).toLocaleDateString()} · Mode: {p.paymentMode} ({p.providerName})
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-left sm:text-right">
                              <span className="text-sm font-mono font-black text-indigo-950 block">
                                ₹{p.amountPaid.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-slate-400">{p.campaignTitle}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setViewingReceipt(p)}
                              className="min-h-[40px] px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-amber-400" />
                              <span>View Receipt</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {viewingReceipt && (
        <PrintableCampaignReceipt
          payment={viewingReceipt}
          allPayments={payments}
          userRole={effectiveRole}
          userName={userName}
          userEmail={userEmail}
          onClose={() => setViewingReceipt(null)}
          onCancelReceipt={handleCancelReceipt}
          onAddAuditLog={onAddAuditLog}
        />
      )}

      {/* MODIFY LAUNCHED CAMPAIGN MODAL (ADMIN & NOMINATED STAFF ONLY) */}
      {campaignToModify && (
        <ModifyCampaignModal
          isOpen={Boolean(campaignToModify)}
          campaign={campaignToModify}
          userRole={effectiveRole as 'admin' | 'accountant'}
          userName={userName}
          userEmail={userEmail}
          staffUsers={staffUsers}
          studentDues={studentDues}
          onClose={() => setCampaignToModify(null)}
          onSaveCampaign={handleSaveModifiedCampaign}
          onAddAuditLog={onAddAuditLog}
        />
      )}
    </div>
  );
};
