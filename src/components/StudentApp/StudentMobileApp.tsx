import React, { useState, useMemo, useEffect } from 'react';
import { 
  Student, 
  FeeTransaction, 
  StudentNoDuesApplication, 
  CertificateRequest, 
  UserSession,
  FacilityServiceOption,
  FacilityApplication,
  EnrollmentField,
  StudentAchievement,
  StudentNotification,
  DynamicQrConfig,
  CollegeProfile
} from '../../types/fee';
import { INSTITUTION_INFO, INITIAL_DYNAMIC_QR_CONFIG } from '../../data/mockData';
import { validateStudentProfile } from '../../utils/profileValidation';
import { MandatoryProfileCompletionModal } from './MandatoryProfileCompletionModal';
import { StudentProfileSection } from './StudentProfileSection';
import { StudentNotificationsPanel } from './StudentNotificationsPanel';
import { StudentAchievementPanel } from './StudentAchievementPanel';
import { DynamicUpiQrPaymentModal } from './DynamicUpiQrPaymentModal';
import { safeMatchStrings, safeNumber, safeString, safePercent, safeDivide } from '../../utils/safeHelpers';
import { 
  CreditCard, 
  Award, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Download, 
  QrCode, 
  Check, 
  Smartphone, 
  Building, 
  BookOpen, 
  LogOut, 
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Maximize2,
  Minimize2,
  Calendar,
  Filter,
  RotateCcw,
  X,
  PlusCircle,
  ClipboardList,
  FileCheck,
  Search,
  Tag,
  Printer,
  Camera,
  Trophy,
  User,
  Bell,
  Menu,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { PrintableReceipt } from '../Common/PrintableReceipt';
import { PrintableCertificate } from '../Common/PrintableCertificate';
import { UserProfileSummaryModal } from '../Common/UserProfileSummaryModal';
import { StudentMyFees } from '../FeeCampaign/StudentMyFees';
import { PrintableCampaignReceipt } from '../FeeCampaign/PrintableCampaignReceipt';
import { StudentDue, FeeCampaign, PaymentProviderConfig, CampaignPayment } from '../../types/campaign';
import { Phone, Send, Sparkles } from 'lucide-react';
import { BirthdayCelebrationBanner } from '../Common/BirthdayCelebrationBanner';
import { checkIsBirthdayToday } from '../../utils/birthdayHelper';

interface Props {
  session: UserSession;
  student: Student;
  transactions: FeeTransaction[];
  noDuesApps: StudentNoDuesApplication[];
  certificateRequests: CertificateRequest[];
  facilityOptions?: FacilityServiceOption[];
  facilityApplications?: FacilityApplication[];
  enrollmentFields?: EnrollmentField[];
  achievements?: StudentAchievement[];
  notifications?: StudentNotification[];
  dynamicQrConfig?: DynamicQrConfig;
  campaignStudentDues?: StudentDue[];
  campaigns?: FeeCampaign[];
  activeProvider?: PaymentProviderConfig | null;
  campaignPayments?: CampaignPayment[];
  onCampaignPaymentSuccess?: (payment: CampaignPayment, updatedDue: StudentDue) => void;
  onPayFee: (tx: FeeTransaction, updatedStudent: Student) => void;
  onApplyCertificate: (req: CertificateRequest) => void;
  onApplyFacility?: (app: FacilityApplication) => void;
  onPayFacilityFee?: (appId: string, tx: FeeTransaction) => void;
  onLogout: () => void;
  activeNavTab?: string;
  onNavTabChange?: (tab: string) => void;
  onUpdateProfilePicture?: (photoUrl: string) => void;
  onUpdateStudent?: (updatedStudent: Student) => void;
  onMarkNotificationAsRead?: (notifId: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  collegeProfile?: CollegeProfile;
}

export const StudentMobileApp: React.FC<Props> = ({
  session,
  student,
  transactions,
  noDuesApps,
  certificateRequests,
  facilityOptions = [],
  facilityApplications = [],
  enrollmentFields = [],
  achievements = [],
  notifications = [],
  dynamicQrConfig = INITIAL_DYNAMIC_QR_CONFIG,
  campaignStudentDues = [],
  campaigns = [],
  activeProvider,
  campaignPayments = [],
  collegeProfile,
  onCampaignPaymentSuccess,
  onPayFee,
  onApplyCertificate,
  onApplyFacility,
  onPayFacilityFee,
  onLogout,
  activeNavTab,
  onNavTabChange,
  onUpdateProfilePicture,
  onUpdateStudent,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
}) => {
  const [localTab, setLocalTab] = useState<'home' | 'apply' | 'fees' | 'nodues' | 'certificates' | 'idcard' | 'achievements' | 'profile' | 'notifications'>('home');
  const [showAcademicProfileModal, setShowAcademicProfileModal] = useState<boolean>(false);
  const [showStudentMenuDrawer, setShowStudentMenuDrawer] = useState<boolean>(false);
  const [viewingCampaignReceipt, setViewingCampaignReceipt] = useState<CampaignPayment | null>(null);
  const [isRollMasked, setIsRollMasked] = useState<boolean>(false);

  // Disable background scrolling when student in-app drawer is open
  useEffect(() => {
    if (showStudentMenuDrawer) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showStudentMenuDrawer]);

  // Dynamic QR Payment modal states
  const [showDynamicQrModal, setShowDynamicQrModal] = useState<boolean>(false);
  const [dynamicQrAmount, setDynamicQrAmount] = useState<number>(0);
  const [dynamicQrPurpose, setDynamicQrPurpose] = useState<string>('Odd Semester Tuition & Examination Fee');

  const handleOpenDynamicQr = (amount: number, purpose: string = 'Odd Semester Tuition & Examination Fee') => {
    setDynamicQrAmount(amount);
    setDynamicQrPurpose(purpose);
    setShowDynamicQrModal(true);
  };

  // Mandatory Profile Check
  const profileValidation = useMemo(() => {
    if (!enrollmentFields || enrollmentFields.length === 0) {
      return { isComplete: true, missingFields: [] };
    }
    return validateStudentProfile(student, enrollmentFields);
  }, [student, enrollmentFields]);

  const [mandatoryModalDismissed, setMandatoryModalDismissed] = useState<boolean>(false);

  const handleCompleteMandatoryProfile = (updatedStudent: Student) => {
    if (onUpdateStudent) {
      onUpdateStudent(updatedStudent);
    }
    setMandatoryModalDismissed(true);
  };

  // Notifications filtering for this specific student
  const studentNotifications = useMemo(() => {
    return notifications.filter(
      (n) => safeMatchStrings(n.studentRollNo, student?.rollNo)
    );
  }, [notifications, student?.rollNo]);
  const unreadNotifCount = studentNotifications.filter((n) => !n.isRead).length;

  // Strict roll number filtering for achievements
  const studentAchievements = useMemo(() => {
    return achievements.filter(
      (a) => safeMatchStrings(a.studentRollNo, student?.rollNo)
    );
  }, [achievements, student?.rollNo]);

  // Helper to extract initials
  const getInitials = (name: string): string => {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<FeeTransaction | null>(null);
  const [selectedCertForPrint, setSelectedCertForPrint] = useState<CertificateRequest | null>(null);
  const [showNocCertificate, setShowNocCertificate] = useState<boolean>(false);
  const [showBursarInquiry, setShowBursarInquiry] = useState<boolean>(false);
  const [bursarCategory, setBursarCategory] = useState<string>('Tuition Fee Clearance / Receipt');
  const [bursarMessage, setBursarMessage] = useState<string>('');
  const [bursarSubmitted, setBursarSubmitted] = useState<boolean>(false);

  // Fee dispute modal states
  const [showFeeDisputeModal, setShowFeeDisputeModal] = useState<boolean>(false);
  const [feeDisputeReason, setFeeDisputeReason] = useState<string>('Concession / Scholarship Waiver Not Applied');
  const [feeDisputeRemarks, setFeeDisputeRemarks] = useState<string>('');
  const [feeDisputeSubmitted, setFeeDisputeSubmitted] = useState<boolean>(false);

  // Apply For Tool States
  const [activeApplyCategoryFilter, setActiveApplyCategoryFilter] = useState<string>('ALL');
  const [applySubTab, setApplySubTab] = useState<'available' | 'my_apps'>('available');
  const [applySearchQuery, setApplySearchQuery] = useState<string>('');
  const [selectedServiceForApply, setSelectedServiceForApply] = useState<FacilityServiceOption | null>(null);
  const [applyPurpose, setApplyPurpose] = useState<string>('Academic Research & Career Development');
  const [applyRemarks, setApplyRemarks] = useState<string>('');
  const [applyPaymentOption, setApplyPaymentOption] = useState<'PAY_NOW' | 'PAY_LATER'>('PAY_NOW');
  const [isSubmittingApp, setIsSubmittingApp] = useState<boolean>(false);
  const [applySuccessMsg, setApplySuccessMsg] = useState<string | null>(null);
  const [selectedAppForPass, setSelectedAppForPass] = useState<FacilityApplication | null>(null);

  // Map header tab to subtab
  const getMappedTab = (tab?: string): 'home' | 'apply' | 'fees' | 'nodues' | 'certificates' | 'idcard' | 'achievements' | 'profile' | 'notifications' => {
    if (!tab) return localTab;
    if (tab === 'student_apply' || tab === 'apply') return 'apply';
    if (tab === 'student_fees' || tab === 'fees' || tab === 'student_campaigns') return 'fees';
    if (tab === 'student_nodues' || tab === 'nodues') return 'nodues';
    if (tab === 'student_certs' || tab === 'certificates') return 'certificates';
    if (tab === 'student_idcard' || tab === 'idcard') return 'idcard';
    if (tab === 'student_achievements' || tab === 'achievements') return 'achievements';
    if (tab === 'student_profile' || tab === 'profile') return 'profile';
    if (tab === 'student_notifications' || tab === 'notifications') return 'notifications';
    if (tab === 'student_home' || tab === 'home') return 'home';
    return localTab;
  };

  const activeTab = activeNavTab ? getMappedTab(activeNavTab) : localTab;

  const handleTabChange = (tab: 'home' | 'apply' | 'fees' | 'nodues' | 'certificates' | 'idcard' | 'achievements' | 'profile' | 'notifications') => {
    setLocalTab(tab);
    if (onNavTabChange) {
      const mapping: Record<string, string> = {
        home: 'student_home',
        apply: 'student_apply',
        fees: 'student_fees',
        nodues: 'student_nodues',
        certificates: 'student_certs',
        idcard: 'student_idcard',
        achievements: 'student_achievements',
        profile: 'student_profile',
        notifications: 'student_notifications',
      };
      onNavTabChange(mapping[tab] || 'student_home');
    }
  };

  // Student specific records
  const studentNoDues = noDuesApps.find((a) => a.studentRollNo === student.rollNo) || noDuesApps[0];
  const studentCertificates = certificateRequests.filter((c) => c.studentRollNo === student.rollNo);
  const studentTransactions = transactions.filter((t) => t.studentId === student.id || t.rollNo === student.rollNo);

  const myFacilityApplications = facilityApplications.filter(
    (a) => a.studentRollNo === student.rollNo || a.studentId === student.id
  );

  const displayedFacilityOptions = facilityOptions.filter((opt) => {
    if (!opt.isActive) return false;
    if (activeApplyCategoryFilter !== 'ALL' && opt.category !== activeApplyCategoryFilter) return false;
    if (applySearchQuery.trim()) {
      const q = applySearchQuery.toLowerCase();
      const matchTitle = opt.title.toLowerCase().includes(q);
      const matchDesc = opt.description?.toLowerCase().includes(q);
      const matchCode = opt.code.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCode) return false;
    }
    return true;
  });

  const handleOpenApplyModal = (opt: FacilityServiceOption) => {
    setSelectedServiceForApply(opt);
    setApplyPurpose(
      opt.category === 'Certificate'
        ? 'Higher Education & Scholarship Verification'
        : opt.category === 'Campus_Facility'
        ? 'Specialized Technical Project & Practical Research'
        : 'Official Institutional Requirement'
    );
    setApplyRemarks('');
    setApplyPaymentOption('PAY_NOW');
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceForApply) return;

    setIsSubmittingApp(true);

    setTimeout(() => {
      const willPayNow = selectedServiceForApply.isPayable && applyPaymentOption === 'PAY_NOW';
      const receiptNo = willPayNow ? `REC/FAC/${Math.floor(10000 + Math.random() * 90000)}` : undefined;
      const todayDate = new Date().toISOString().split('T')[0];

      const newApp: FacilityApplication = {
        id: 'APP-FAC-' + Date.now().toString().slice(-5),
        applicationNo: `APP/2025/${Math.floor(10000 + Math.random() * 90000)}`,
        serviceId: selectedServiceForApply.id,
        serviceCode: selectedServiceForApply.code,
        serviceTitle: selectedServiceForApply.title,
        serviceCategory: selectedServiceForApply.category,
        studentId: student.id,
        studentRollNo: student.rollNo,
        studentName: student.name,
        course: `${student.course} ${student.branch} - Sem ${student.semester}`,
        purpose: applyPurpose.trim() || 'Academic Purpose',
        additionalRemarks: applyRemarks.trim() || undefined,
        appliedDate: todayDate,
        isPayable: selectedServiceForApply.isPayable,
        feeAmount: selectedServiceForApply.feeAmount,
        feeStatus: !selectedServiceForApply.isPayable
          ? 'Not_Required'
          : willPayNow
          ? 'Paid'
          : 'Pending_Payment',
        paymentReceiptNo: receiptNo,
        paymentMode: willPayNow ? 'UPI' : undefined,
        paymentDate: willPayNow ? todayDate : undefined,
        status: willPayNow || !selectedServiceForApply.isPayable ? 'Approved' : 'Submitted',
        approvalRemarks: willPayNow
          ? 'Fee cleared via UPI. Approved for immediate issuance.'
          : !selectedServiceForApply.isPayable
          ? 'Free grant verified. Approved.'
          : 'Application received. Pending fee settlement at counter.',
        approvedBy: willPayNow || !selectedServiceForApply.isPayable ? 'Prof. (Dr.) Srivastava (Principal)' : undefined,
        approvedDate: willPayNow || !selectedServiceForApply.isPayable ? todayDate : undefined,
      };

      if (onApplyFacility) {
        onApplyFacility(newApp);
      }

      // If paid immediately, create fee transaction
      if (willPayNow && onPayFee) {
        const newTx: FeeTransaction = {
          id: 'TX-FAC-' + Date.now().toString().slice(-5),
          receiptNo: receiptNo!,
          studentId: student.id,
          studentName: student.name,
          rollNo: student.rollNo,
          course: `${student.course} ${student.branch}`,
          semester: student.semester,
          amount: selectedServiceForApply.feeAmount,
          lateFineIncluded: 0,
          discountApplied: 0,
          paymentMethod: 'UPI',
          gateway: 'SBI Collect',
          gatewayTransactionId: `DU${Math.floor(10000000 + Math.random() * 90000000)}`,
          bankUtr: `SBIN${Date.now().toString().slice(-8)}`,
          treasuryHeadCode: selectedServiceForApply.feeTreasuryCode || '0202-01-800-01',
          timestamp: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          status: 'Success',
          headsAllocated: [
            {
              headName: `${selectedServiceForApply.title} (Statutory Fee)`,
              amount: selectedServiceForApply.feeAmount,
              treasuryCode: selectedServiceForApply.feeTreasuryCode || '0202-01-800-01',
            },
          ],
        };
        onPayFee(newTx, student);
      }

      setIsSubmittingApp(false);
      setSelectedServiceForApply(null);
      setApplySuccessMsg(`Application for "${newApp.serviceTitle}" submitted successfully! Application No: ${newApp.applicationNo}`);
      setTimeout(() => setApplySuccessMsg(null), 5000);
    }, 700);
  };

  const handlePayApplicationFee = (app: FacilityApplication) => {
    const receiptNo = `REC/FAC/${Math.floor(10000 + Math.random() * 90000)}`;
    const newTx: FeeTransaction = {
      id: 'TX-FAC-' + Date.now().toString().slice(-5),
      receiptNo,
      studentId: student.id,
      studentName: student.name,
      rollNo: student.rollNo,
      course: `${student.course} ${student.branch}`,
      semester: student.semester,
      amount: app.feeAmount,
      lateFineIncluded: 0,
      discountApplied: 0,
      paymentMethod: 'UPI',
      gateway: 'SBI Collect',
      gatewayTransactionId: `DU${Math.floor(10000000 + Math.random() * 90000000)}`,
      bankUtr: `SBIN${Date.now().toString().slice(-8)}`,
      treasuryHeadCode: '0202-01-800-01',
      timestamp: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: 'Success',
      headsAllocated: [
        {
          headName: `${app.serviceTitle} (Fee Clearance)`,
          amount: app.feeAmount,
          treasuryCode: '0202-01-800-01',
        },
      ],
    };

    if (onPayFacilityFee) {
      onPayFacilityFee(app.id, newTx);
    } else if (onPayFee) {
      onPayFee(newTx, student);
    }

    setApplySuccessMsg(`Fee of ₹${app.feeAmount} cleared for ${app.serviceTitle}. Receipt #${receiptNo} generated.`);
    setTimeout(() => setApplySuccessMsg(null), 4000);
  };

  // Payment Transaction Filter States
  const [txStatusFilter, setTxStatusFilter] = useState<'ALL' | 'Success' | 'Pending' | 'Failed'>('ALL');
  const [txStartDate, setTxStartDate] = useState<string>('');
  const [txEndDate, setTxEndDate] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);

  // Helper to parse date from transaction timestamp
  const parseTxDate = (timestampStr: string): Date | null => {
    if (!timestampStr) return null;
    const isoMatch = timestampStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }
    const ddmmyyyyMatch = timestampStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ddmmyyyyMatch) {
      return new Date(parseInt(ddmmyyyyMatch[3]), parseInt(ddmmyyyyMatch[2]) - 1, parseInt(ddmmyyyyMatch[1]));
    }
    const parsed = new Date(timestampStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const statusCounts = useMemo(() => {
    const isSuccess = (s?: string) => {
      const low = (s || 'success').toLowerCase();
      return low === 'success' || low === 'reconciled';
    };
    const isPending = (s?: string) => {
      const low = (s || '').toLowerCase();
      return low === 'pending' || low === 'disputed';
    };
    const isFailed = (s?: string) => {
      const low = (s || '').toLowerCase();
      return low === 'failed';
    };

    return {
      all: studentTransactions.length,
      success: studentTransactions.filter((t) => isSuccess(t.status)).length,
      pending: studentTransactions.filter((t) => isPending(t.status)).length,
      failed: studentTransactions.filter((t) => isFailed(t.status)).length,
    };
  }, [studentTransactions]);

  const filteredTransactions = useMemo(() => {
    return studentTransactions.filter((tx) => {
      // 1. Payment status filter
      if (txStatusFilter !== 'ALL') {
        const txStatusLower = (tx.status || 'success').toLowerCase();
        if (txStatusFilter === 'Success' && txStatusLower !== 'success' && txStatusLower !== 'reconciled') {
          return false;
        }
        if (txStatusFilter === 'Pending' && txStatusLower !== 'pending' && txStatusLower !== 'disputed') {
          return false;
        }
        if (txStatusFilter === 'Failed' && txStatusLower !== 'failed') {
          return false;
        }
      }

      // 2. Date-range filter
      if (txStartDate || txEndDate) {
        const txDate = parseTxDate(tx.timestamp);
        if (txDate) {
          if (txStartDate) {
            const start = new Date(txStartDate);
            start.setHours(0, 0, 0, 0);
            if (txDate < start) return false;
          }
          if (txEndDate) {
            const end = new Date(txEndDate);
            end.setHours(23, 59, 59, 999);
            if (txDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [studentTransactions, txStatusFilter, txStartDate, txEndDate]);

  const handleResetFilters = () => {
    setTxStatusFilter('ALL');
    setTxStartDate('');
    setTxEndDate('');
  };

  const hasActiveFilters = txStatusFilter !== 'ALL' || !!txStartDate || !!txEndDate;

  // Unified Fee Module calculation for logged-in student (Annual fee is not calculated, fee payable is per Fee Module)
  const studentCampaignDues = (campaignStudentDues || []).filter(
    (d) =>
      safeMatchStrings(d.rollNo, student?.rollNo) &&
      (d.status as string) !== 'Cancelled' &&
      (d.status as string) !== 'Voided'
  );
  const feeModuleTotal = studentCampaignDues.length > 0
    ? studentCampaignDues.reduce((s, d) => s + safeNumber(d.netAmount, 0), 0)
    : safeNumber(student?.totalFee, 0);
  const feeModulePaid = studentCampaignDues.length > 0
    ? studentCampaignDues.reduce((s, d) => s + safeNumber(d.paidAmount, 0), 0)
    : safeNumber(student?.paidFee, 0);
  const feeModulePending = studentCampaignDues.length > 0
    ? studentCampaignDues.reduce((s, d) => s + safeNumber(d.balanceAmount, 0), 0)
    : safeNumber(student?.pendingFee, 0);
  const feeModuleLateFee = studentCampaignDues.reduce((s, d) => s + safeNumber(d.lateFeeApplied, 0), 0);
  const totalDue = feeModulePending + feeModuleLateFee;
  const clearedDeptCount = studentNoDues ? Object.values(studentNoDues.clearances).filter((c) => c.status === 'Approved').length : 0;

  const handleSimulateUpiPay = () => {
    if (totalDue <= 0) return;
    setIsPaying(true);

    setTimeout(() => {
      const newTx: FeeTransaction = {
        id: 'TX-MOB-' + Date.now().toString().slice(-5),
        receiptNo: `REC/SBI/25/${Math.floor(90000 + Math.random() * 10000)}`,
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        course: `${student.course} ${student.branch} - Sem ${student.semester}`,
        semester: student.semester,
        amount: totalDue,
        lateFineIncluded: student.lateFineApplied,
        discountApplied: (student.totalFee * student.scholarshipWaiverPercent) / 100,
        paymentMethod: 'SBI Collect',
        gateway: 'SBI Collect',
        gatewayTransactionId: `DU${Math.floor(10000000 + Math.random() * 90000000)}`,
        bankUtr: `SBIN${Date.now().toString().slice(-8)}`,
        treasuryHeadCode: '0202-01-102-01 (Govt Tech Ed)',
        timestamp: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'Success',
        headsAllocated: [
          { headName: 'Tuition Fee Clearance (Govt Rate)', amount: totalDue },
        ],
      };

      const updatedStudent: Student = {
        ...student,
        paidFee: student.paidFee + feeModulePending,
        pendingFee: 0,
        lateFineApplied: 0,
        hallTicketBlocked: false,
      };

      setIsPaying(false);
      setShowDynamicQrModal(false);
      onPayFee(newTx, updatedStudent);
    }, 1200);
  };

  // Check if today matches logged-in student's dateOfBirth
  const birthdayStatus = checkIsBirthdayToday(student?.dateOfBirth);

  const content = (
    <div className="bg-slate-50 min-h-[680px] flex flex-col justify-between text-slate-900">
      {/* Main Tab Viewport */}
      <div className="p-4 sm:p-5 flex-1 space-y-4 overflow-y-auto">
        {/* 1. Home Dashboard View */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Birthday Celebration Banner: Triggered when today matches stored DOB */}
            {birthdayStatus.isBirthdayToday && (
              <BirthdayCelebrationBanner
                userName={student.name}
                userRole="student"
                userIdentifier={student.rollNo}
                formattedDob={birthdayStatus.formattedDob}
              />
            )}

            {/* 1. Compact Student Profile Card (Whole card tappable, "View profile", no extra "Profile >" link) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowAcademicProfileModal(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowAcademicProfileModal(true);
                }
              }}
              className="w-full p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-500/80 transition-all text-left cursor-pointer group shadow-xs flex items-center justify-between"
              title="Tap to open full academic profile summary & update photo"
              aria-label="View profile"
            >
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                {/* Avatar Photo with Camera Badge */}
                <div className="relative shrink-0">
                  {student.profilePicture ? (
                    <img
                      src={student.profilePicture}
                      alt={student.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-emerald-600 ring-2 ring-emerald-500/20 group-hover:scale-105 transition-transform shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-700 text-white font-bold text-sm sm:text-base flex items-center justify-center border-2 border-emerald-600 ring-2 ring-emerald-500/20 group-hover:scale-105 transition-transform shadow-xs">
                      {getInitials(student.name)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-700 text-white p-1 rounded-full border-2 border-white shadow-xs">
                    <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </span>
                </div>

                {/* Student Details: Name, Roll Number, Course, Semester */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                      {student.name}
                    </h3>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                      Sem {student.semester}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                    <span className="font-semibold text-slate-800">
                      {isRollMasked ? student.rollNo.replace(/[0-9]/g, '•') : student.rollNo}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRollMasked(!isRollMasked);
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                      title={isRollMasked ? 'Reveal Roll Number' : 'Mask Roll Number (Shared Device)'}
                      aria-label="Toggle Roll Number Mask"
                    >
                      {isRollMasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 truncate">{student.course.split(' - ')[0] || student.course}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                    <span>View profile</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center text-slate-400 group-hover:text-emerald-700 transition-colors shrink-0 pl-2">
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* 2. Pending Fees Card (With Last updated, due date, clear warning banner, Dynamic QR button, and Dispute link) */}
            {totalDue > 0 ? (
              <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                      Fee Clearance Status
                    </span>
                    <div className="text-2xl font-black font-mono text-rose-700 mt-0.5">
                      ₹{totalDue.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs space-y-0.5">
                    <div className="text-slate-600 font-medium">
                      Due date: <strong className="text-slate-900 font-mono">15 Nov 2025</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center sm:justify-end gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Last updated: today, 10:45 AM</span>
                    </div>
                  </div>
                </div>

                {/* Clear Warning Banner */}
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2.5 text-xs text-rose-950 font-bold">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Pay ₹{totalDue.toLocaleString('en-IN')} to release your admit card</span>
                </div>

                {/* Actions Row: Dynamic QR Button + Dispute Link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenDynamicQr(totalDue, 'Odd Semester Tuition & Examination Fee')}
                    className="min-h-[44px] px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <QrCode className="w-4 h-4 text-emerald-200" />
                    <span>Pay via Dynamic QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFeeDisputeSubmitted(false);
                      setFeeDisputeRemarks('');
                      setShowFeeDisputeModal(true);
                    }}
                    className="text-xs text-slate-600 hover:text-emerald-700 font-medium underline decoration-slate-300 hover:decoration-emerald-600 transition-colors text-left sm:text-right cursor-pointer py-1"
                  >
                    Fee amount wrong? Raise dispute
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 bg-white border border-emerald-200 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Fees Status</span>
                  <div className="text-lg font-bold text-emerald-700 flex items-center gap-2 mt-0.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>All Dues Cleared</span>
                  </div>
                  <span className="text-xs text-slate-600 block mt-0.5">
                    Eligible for Semester Examination · Admit card unlocked
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('fees')}
                  className="min-h-[44px] px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  View Receipts
                </button>
              </div>
            )}

            {/* 3. Quick Actions Grid: 4 Equal-Size Tiles (Fees, No Dues, Certificates, Hall Ticket) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Tile 1: Fees */}
              <button
                type="button"
                onClick={() => handleTabChange('fees')}
                className="min-h-[110px] p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">Fees</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
                    {totalDue > 0 ? `₹${totalDue.toLocaleString('en-IN')} Due` : 'All Cleared'}
                  </span>
                </div>
              </button>

              {/* Tile 2: No Dues (0/7 Cleared plus hint: Library, Hostel, Lab +4 pending) */}
              <button
                type="button"
                onClick={() => handleTabChange('nodues')}
                className="min-h-[110px] p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">No Dues</span>
                  <span className="text-[11px] text-slate-600 font-semibold block mt-0.5">
                    {clearedDeptCount}/7 Cleared
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate" title="Library, Hostel, Lab +4 pending">
                    {clearedDeptCount === 7 ? 'All sign-offs completed' : 'Library, Hostel, Lab +4 pending'}
                  </span>
                </div>
              </button>

              {/* Tile 3: Certificates (Merged entry to Certificates & Facilities) */}
              <button
                type="button"
                onClick={() => handleTabChange('apply')}
                className="min-h-[110px] p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">Certificates</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
                    Bonafide, TC & Passes
                  </span>
                </div>
              </button>

              {/* Tile 4: Hall Ticket (With lock icon and 'Clear dues to unlock' while fees are pending) */}
              <button
                type="button"
                onClick={() => handleTabChange('idcard')}
                className="min-h-[110px] p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between cursor-pointer group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                  totalDue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {totalDue > 0 ? <Lock className="w-4 h-4 text-rose-600" /> : <ShieldCheck className="w-4 h-4 text-blue-700" />}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-900 block leading-tight">Hall Ticket</span>
                    {totalDue > 0 && <Lock className="w-3 h-3 text-rose-600 shrink-0" />}
                  </div>
                  <span className={`text-[11px] block mt-0.5 truncate font-medium ${
                    totalDue > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'
                  }`}>
                    {totalDue > 0 ? 'Clear dues to unlock' : 'Eligible & Unlocked'}
                  </span>
                </div>
              </button>
            </div>

            {/* 4. Apply for Certificates & Facilities (Merged Entry) */}
            <button
              type="button"
              onClick={() => handleTabChange('apply')}
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-emerald-600 transition-all shadow-xs flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      Apply for Certificates & Facilities
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full shrink-0">
                      {displayedFacilityOptions.length} Services
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Bonafide slip, Transfer Certificate, Library Pass, Computing Pass & Campus Amenities
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
            </button>

            {/* 5. Honors & Achievements (Placed last; collapsed compact row when 0 records, not large banner) */}
            {studentAchievements.length === 0 ? (
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-700">Honors & Achievements</span>
                  <span className="text-[11px] text-slate-400">(0 records recorded)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('achievements')}
                  className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
                >
                  View Details
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between text-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">Student Honors & Achievements</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                        {studentAchievements.length} Recorded
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verified honors strictly logged for Roll No: <strong className="font-mono text-slate-700">{student.rollNo}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('achievements')}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Apply For Certificates & Facilities View */}
        {activeTab === 'apply' && (
          <div className="space-y-4">
            {/* Success Notification Alert */}
            {applySuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-semibold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{applySuccessMsg}</span>
                </div>
                <button
                  onClick={() => setApplySuccessMsg(null)}
                  className="p-1 text-emerald-700 hover:text-emerald-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Header Context Card */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                      Student Services Desk
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Patna College Affiliated
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Apply for Certificates & Facilities
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Official options governed by Institutional Administration. Free services or statutory tariffs set by Accounts Officer.
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
              </div>

              {/* Sub-tab Navigation (Available vs My Applications) */}
              <div className="flex p-1 bg-slate-100 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setApplySubTab('available')}
                  className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    applySubTab === 'available'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Available Services</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    applySubTab === 'available' ? 'bg-purple-100 text-purple-800 font-bold' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {displayedFacilityOptions.length}
                  </span>
                </button>
                <button
                  onClick={() => setApplySubTab('my_apps')}
                  className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    applySubTab === 'my_apps'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>My Applications</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    applySubTab === 'my_apps' ? 'bg-purple-100 text-purple-800 font-bold' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {myFacilityApplications.length}
                  </span>
                </button>
              </div>

              {/* Search & Category Filter (shown on available tab) */}
              {applySubTab === 'available' && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search bonafide, TC, GPU lab, library, sports..."
                      value={applySearchQuery}
                      onChange={(e) => setApplySearchQuery(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                    {applySearchQuery && (
                      <button
                        onClick={() => setApplySearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                    <button
                      onClick={() => setActiveApplyCategoryFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
                        activeApplyCategoryFilter === 'ALL'
                          ? 'bg-purple-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All Services ({facilityOptions.filter((o) => o.isActive).length})
                    </button>
                    <button
                      onClick={() => setActiveApplyCategoryFilter('Certificate')}
                      className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                        activeApplyCategoryFilter === 'Certificate'
                          ? 'bg-purple-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Award className="w-3 h-3" />
                      <span>Certificates</span>
                    </button>
                    <button
                      onClick={() => setActiveApplyCategoryFilter('Campus_Facility')}
                      className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                        activeApplyCategoryFilter === 'Campus_Facility'
                          ? 'bg-purple-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Building className="w-3 h-3" />
                      <span>Campus Facilities</span>
                    </button>
                    <button
                      onClick={() => setActiveApplyCategoryFilter('Academic_Service')}
                      className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                        activeApplyCategoryFilter === 'Academic_Service'
                          ? 'bg-purple-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <FileCheck className="w-3 h-3" />
                      <span>Services</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-tab 1: Available Services List */}
            {applySubTab === 'available' && (
              <div className="space-y-3">
                {displayedFacilityOptions.length === 0 ? (
                  <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-2">
                    <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
                    <span className="text-xs font-bold text-slate-700 block">No services matching filters</span>
                    <p className="text-[11px] text-slate-400">
                      Try clearing your search query or selecting a different category.
                    </p>
                    <button
                      onClick={() => {
                        setApplySearchQuery('');
                        setActiveApplyCategoryFilter('ALL');
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold mt-2"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  displayedFacilityOptions.map((opt) => {
                    const existingApp = myFacilityApplications.find((a) => a.serviceId === opt.id);

                    return (
                      <div
                        key={opt.id}
                        className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3 hover:border-purple-300 transition-all"
                      >
                        {/* Option Top Badges */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              opt.category === 'Certificate'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : opt.category === 'Campus_Facility'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {opt.category === 'Certificate' && <Award className="w-3 h-3" />}
                            {opt.category === 'Campus_Facility' && <Building className="w-3 h-3" />}
                            {opt.category === 'Academic_Service' && <FileCheck className="w-3 h-3" />}
                            <span>{opt.category.replace('_', ' ')}</span>
                          </span>

                          {/* Payable vs Free Pill */}
                          {opt.isPayable ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-xs">
                              <span className="font-mono">₹{opt.feeAmount}</span>
                              <span className="text-[10px] font-normal text-emerald-700">· Statutory Fee</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                              <span>✓ 100% Free / Subsidized</span>
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">{opt.title}</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{opt.description}</p>
                        </div>

                        {/* Key Attributes Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Turnaround: <strong className="text-slate-800">{opt.processingDays} Days</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Validity: <strong className="text-slate-800">{opt.validity || 'Academic Year'}</strong></span>
                          </div>
                        </div>

                        {/* Special Requirements */}
                        {opt.requiresNoDues && (
                          <div className="p-2 bg-amber-50/80 border border-amber-200/70 rounded-lg text-[10px] text-amber-900 font-medium flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Requires institutional 7-department No Dues clearance before issuance.</span>
                          </div>
                        )}

                        {/* Documents Needed */}
                        {opt.requiredDocuments && opt.requiredDocuments.length > 0 && (
                          <div className="text-[10px] space-y-1">
                            <span className="text-slate-400 font-semibold block">Required Documentation:</span>
                            <div className="flex flex-wrap gap-1">
                              {opt.requiredDocuments.map((doc, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                                  {doc}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Fee Governance Caption */}
                        {opt.isPayable && (
                          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                            <span>Tariff set by: {opt.feeSetBy || 'Accounts Officer'}</span>
                            <span>Head: {opt.feeTreasuryCode || '0202-01-800-01'}</span>
                          </div>
                        )}

                        {/* Action Area */}
                        <div className="pt-2">
                          {existingApp ? (
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] text-slate-500 font-mono block">
                                  App #{existingApp.applicationNo}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    existingApp.status === 'Approved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : existingApp.feeStatus === 'Pending_Payment'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {existingApp.status === 'Approved' ? 'Approved' : existingApp.feeStatus === 'Pending_Payment' ? 'Payment Due' : 'In Review'}
                                  </span>
                                  {existingApp.feeStatus === 'Pending_Payment' && (
                                    <span className="text-[10px] text-rose-600 font-bold">₹{existingApp.feeAmount}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {existingApp.feeStatus === 'Pending_Payment' && (
                                  <button
                                    onClick={() => handlePayApplicationFee(existingApp)}
                                    className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1"
                                  >
                                    <QrCode className="w-3 h-3" />
                                    <span>Pay Fee</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedAppForPass(existingApp)}
                                  className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded text-xs font-semibold shadow-xs"
                                >
                                  View Pass
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenApplyModal(opt)}
                              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                                opt.isPayable
                                  ? 'bg-purple-700 hover:bg-purple-800 text-white'
                                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              }"}
                            >
                              <PlusCircle className="w-4 h-4" />
                              <span>{opt.isPayable ? `Apply & Pay ₹${opt.feeAmount}` : 'Apply For Free'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Sub-tab 2: My Applications List */}
            {applySubTab === 'my_apps' && (
              <div className="space-y-3">
                {myFacilityApplications.length === 0 ? (
                  <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-2">
                    <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
                    <span className="text-xs font-bold text-slate-700 block">No applications filed yet</span>
                    <p className="text-[11px] text-slate-400">
                      You haven&apos;t requested any certificate or campus facility yet.
                    </p>
                    <button
                      onClick={() => setApplySubTab('available')}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold mt-2"
                    >
                      Browse Available Facilities
                    </button>
                  </div>
                ) : (
                  myFacilityApplications.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              #{app.applicationNo}
                            </span>
                            <span className="text-[10px] text-slate-400">· {app.appliedDate}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5">{app.serviceTitle}</h4>
                          <span className="text-[10px] text-purple-700 font-semibold">{app.serviceCategory.replace('_', ' ')}</span>
                        </div>

                        {/* Status Badge */}
                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            app.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : app.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {app.status === 'Approved' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {app.status === 'Rejected' && <X className="w-3 h-3 text-rose-600" />}
                            {app.status !== 'Approved' && app.status !== 'Rejected' && <Clock className="w-3 h-3 text-amber-600" />}
                            <span>{app.status}</span>
                          </span>
                        </div>
                      </div>

                      {/* Purpose & Remarks */}
                      <div className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
                        <div className="text-[11px] text-slate-700">
                          <strong className="text-slate-900 font-medium">Stated Purpose:</strong> {app.purpose}
                        </div>
                        {app.approvalRemarks && (
                          <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200">
                            {app.approvalRemarks}
                          </div>
                        )}
                      </div>

                      {/* Fee and Action Row */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          {app.isPayable ? (
                            app.feeStatus === 'Paid' ? (
                              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>Fee ₹{app.feeAmount} Cleared · #{app.paymentReceiptNo}</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-rose-700 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                <span>Fee Payable: ₹{app.feeAmount}</span>
                              </div>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">✓ 100% Free Facility</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {app.feeStatus === 'Pending_Payment' && (
                            <button
                              onClick={() => handlePayApplicationFee(app)}
                              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1"
                            >
                              <QrCode className="w-3 h-3" />
                              <span>Pay ₹{app.feeAmount}</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedAppForPass(app)}
                            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded text-xs font-semibold shadow-xs flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Pass</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. Fee Payments & Receipts - Unified Fee Module */}
        {activeTab === 'fees' && (
          <div className="space-y-4">
            {campaignStudentDues && campaignStudentDues.length > 0 ? (
              <StudentMyFees
                studentRollNo={student.rollNo}
                studentDues={campaignStudentDues}
                campaigns={campaigns || []}
                activeProvider={activeProvider || null}
                onPaymentSuccess={(payment, updatedDue) => {
                  if (onCampaignPaymentSuccess) {
                    onCampaignPaymentSuccess(payment, updatedDue);
                  }
                }}
                onViewReceipt={(p) => setViewingCampaignReceipt(p)}
                payments={campaignPayments || []}
              />
            ) : (
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-slate-700 block mb-1">Fee Clearance Summary</span>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Statutory Fee Payable (Fee Module):</span>
                  <span className="font-mono font-bold text-slate-900">₹{feeModuleTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-xs text-slate-500">Amount Cleared:</span>
                  <span className="font-mono font-bold text-emerald-700">₹{feeModulePaid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-xs text-slate-500">Outstanding Balance:</span>
                  <span className="font-mono font-bold text-rose-700">₹{totalDue.toLocaleString('en-IN')}</span>
                </div>

                {totalDue > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenDynamicQr(totalDue, 'Odd Semester Tuition & Examination Fee')}
                    className="w-full mt-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay ₹{totalDue.toLocaleString('en-IN')} via Dynamic UPI QR</span>
                  </button>
                )}
              </div>
            )}

            {/* College Accounts Bursar Helpdesk */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">RLSY Accounts & Bursar Desk</span>
                  <span className="text-[10px] text-slate-500">Counter Timings: Mon–Fri 10:00 AM – 3:30 PM · Phone: Ext 104</span>
                </div>
                <button
                  onClick={() => setShowBursarInquiry(!showBursarInquiry)}
                  className="text-xs text-indigo-700 font-semibold hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{showBursarInquiry ? 'Close Desk' : 'Contact Bursar'}</span>
                </button>
              </div>

              {showBursarInquiry && (
                <div className="pt-3 border-t border-slate-100 text-xs space-y-2.5">
                  {bursarSubmitted ? (
                    <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Inquiry #TKT-RLSY-{Math.floor(1000 + Math.random() * 9000)} sent to Accounts Officer!</span>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setBursarSubmitted(true);
                        setTimeout(() => {
                          setBursarMessage('');
                          setBursarSubmitted(false);
                          setShowBursarInquiry(false);
                        }, 2500);
                      }}
                      className="space-y-2"
                    >
                      <select
                        value={bursarCategory}
                        onChange={(e) => setBursarCategory(e.target.value)}
                        className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded font-medium"
                      >
                        <option value="Tuition Fee Clearance / Receipt">Tuition Fee Clearance / Receipt</option>
                        <option value="Electronic Payment Double Deduction / Ref Number">Electronic Payment Double Deduction / Ref Number</option>
                        <option value="Scholarship / e-Kalyan Freeship Status">Scholarship / e-Kalyan Freeship Status</option>
                        <option value="General Fee Clearance Query">General Fee Clearance Query</option>
                      </select>
                      <textarea
                        required
                        rows={2}
                        value={bursarMessage}
                        onChange={(e) => setBursarMessage(e.target.value)}
                        placeholder="Describe issue (include transaction reference number if fee deducted)..."
                        className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded"
                      />
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <Send className="w-3 h-3 text-amber-400" />
                        <span>Submit to Bursar</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Payment History & Stamped Receipts with Date & Status Filter */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Payment History & Stamped Receipts
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Official Bank & State Treasury scrolls
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowDateFilter(!showDateFilter)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border ${
                      showDateFilter || txStartDate || txEndDate
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Toggle Date Range Filter"
                  >
                    <Calendar className="w-3 h-3 text-indigo-600" />
                    <span>Date Filter</span>
                    {(txStartDate || txEndDate) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}
                  </button>

                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Reset all filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Status Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setTxStatusFilter('ALL')}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                    txStatusFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>All</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    txStatusFilter === 'ALL' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200/60 text-slate-500'
                  }`}>
                    {statusCounts.all}
                  </span>
                </button>

                <button
                  onClick={() => setTxStatusFilter('Success')}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                    txStatusFilter === 'Success'
                      ? 'bg-white text-emerald-900 shadow-xs ring-1 ring-emerald-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Success</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    txStatusFilter === 'Success' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/60 text-slate-500'
                  }`}>
                    {statusCounts.success}
                  </span>
                </button>

                <button
                  onClick={() => setTxStatusFilter('Pending')}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                    txStatusFilter === 'Pending'
                      ? 'bg-white text-amber-900 shadow-xs ring-1 ring-amber-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Pending</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    txStatusFilter === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/60 text-slate-500'
                  }`}>
                    {statusCounts.pending}
                  </span>
                </button>

                <button
                  onClick={() => setTxStatusFilter('Failed')}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                    txStatusFilter === 'Failed'
                      ? 'bg-white text-rose-900 shadow-xs ring-1 ring-rose-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Failed</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    txStatusFilter === 'Failed' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200/60 text-slate-500'
                  }`}>
                    {statusCounts.failed}
                  </span>
                </button>
              </div>

              {/* Collapsible Date Range Filter Drawer */}
              {(showDateFilter || txStartDate || txEndDate) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Select Date Range (From - To)</span>
                    </span>
                    {(txStartDate || txEndDate) && (
                      <button
                        onClick={() => {
                          setTxStartDate('');
                          setTxEndDate('');
                        }}
                        className="text-[10px] text-indigo-600 font-semibold hover:underline"
                      >
                        Reset Dates
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">From Date</label>
                      <input
                        type="date"
                        value={txStartDate}
                        onChange={(e) => setTxStartDate(e.target.value)}
                        className="w-full p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">To Date</label>
                      <input
                        type="date"
                        value={txEndDate}
                        onChange={(e) => setTxEndDate(e.target.value)}
                        className="w-full p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                        const today = d.toISOString().split('T')[0];
                        setTxStartDate(firstDay);
                        setTxEndDate(today);
                      }}
                      className="px-2 py-0.5 bg-white border border-slate-200 hover:border-indigo-400 rounded text-[10px] text-slate-600 whitespace-nowrap"
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const past30 = new Date(d.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        const today = d.toISOString().split('T')[0];
                        setTxStartDate(past30);
                        setTxEndDate(today);
                      }}
                      className="px-2 py-0.5 bg-white border border-slate-200 hover:border-indigo-400 rounded text-[10px] text-slate-600 whitespace-nowrap"
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTxStartDate('2025-04-01');
                        setTxEndDate('2026-03-31');
                      }}
                      className="px-2 py-0.5 bg-white border border-slate-200 hover:border-indigo-400 rounded text-[10px] text-slate-600 whitespace-nowrap"
                    >
                      AY 2025-26
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTxStartDate('');
                        setTxEndDate('');
                      }}
                      className="px-2 py-0.5 bg-white border border-slate-200 hover:border-rose-400 rounded text-[10px] text-rose-600 whitespace-nowrap ml-auto"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Active Filter Info Indicator */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                  <span>
                    Showing <strong className="text-slate-800">{filteredTransactions.length}</strong> of {studentTransactions.length} transactions
                  </span>
                  <button
                    onClick={handleResetFilters}
                    className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              {/* Filtered Transactions List */}
              {filteredTransactions.length > 0 ? (
                <div className="space-y-2">
                  {filteredTransactions.map((tx) => {
                    const isSuccess = (tx.status || 'success').toLowerCase() === 'success' || (tx.status || '').toLowerCase() === 'reconciled';
                    const isPending = (tx.status || '').toLowerCase() === 'pending' || (tx.status || '').toLowerCase() === 'disputed';
                    const isFailed = (tx.status || '').toLowerCase() === 'failed';

                    return (
                      <div 
                        key={tx.id} 
                        className={`p-3 bg-white border rounded-xl flex items-center justify-between transition-all ${
                          isSuccess
                            ? 'border-slate-200'
                            : isPending
                            ? 'border-amber-200 bg-amber-50/20'
                            : 'border-rose-200 bg-rose-50/20'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 block font-mono">
                              {tx.receiptNo}
                            </span>

                            {isSuccess && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Success</span>
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                <span>Pending</span>
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                <span>Failed</span>
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-400 font-mono">
                            {tx.timestamp} · {tx.paymentMethod}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`font-mono font-bold text-xs block ${
                            isSuccess ? 'text-slate-900' : isPending ? 'text-amber-800' : 'text-rose-700 line-through'
                          }`}>
                            ₹{tx.amount.toLocaleString('en-IN')}
                          </span>

                          {isSuccess && (
                            <button
                              onClick={() => setSelectedReceiptTx(tx)}
                              className="text-[10px] text-indigo-600 font-semibold hover:underline inline-flex items-center gap-0.5 mt-0.5"
                            >
                              <Download className="w-2.5 h-2.5" />
                              <span>Download PDF</span>
                            </button>
                          )}

                          {isPending && (
                            <span className="text-[9px] text-amber-600 font-medium block mt-0.5">
                              Processing
                            </span>
                          )}

                          {isFailed && (
                            <button
                              type="button"
                              onClick={() => handleOpenDynamicQr(totalDue, 'Retry Outstanding Fee Settlement')}
                              className="text-[10px] text-rose-600 font-bold hover:underline block mt-0.5"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 px-4 bg-white border border-slate-200 rounded-xl space-y-1.5">
                  <Filter className="w-5 h-5 text-slate-300 mx-auto" />
                  <span className="text-xs text-slate-600 font-bold block">No transactions match your filter</span>
                  <p className="text-[10px] text-slate-400">
                    Try choosing a different status or expanding the date range.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="mt-1 text-[11px] text-indigo-600 font-bold hover:underline"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. No Dues (NOC) Tracker */}
        {activeTab === 'nodues' && (
          <div className="space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Institutional NOC Application</span>
                <span className="text-[10px] text-slate-500 font-mono">{studentNoDues?.applicationNo || 'GIT/NODUES/25/0812'}</span>
              </div>
              {clearedDeptCount === 7 ? (
                <button
                  onClick={() => setShowNocCertificate(true)}
                  className="min-h-[38px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="View Full-Screen PDF Preview before downloading or printing"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Preview & Download NOC</span>
                </button>
              ) : (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  In Progress
                </span>
              )}
            </div>

            {/* Department clearance list */}
            {studentNoDues && (
              <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden text-xs">
                {Object.values(studentNoDues.clearances).map((clr) => (
                  <div key={clr.key} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">{clr.name}</span>
                      <span className="text-[10px] text-slate-400">{clr.officerName}</span>
                    </div>
                    {clr.status === 'Approved' ? (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Cleared
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-700">
                        {clr.dueReason ? `Due: ₹${clr.dueAmount}` : 'Pending Review'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Certificate Wallet */}
        {activeTab === 'certificates' && (
          <div className="space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-bold text-slate-900 block">Available Digital Certificates</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download verified certificates with institutional QR seal and Principal signature.
              </p>
            </div>

            <div className="space-y-2.5">
              {studentCertificates.map((cert) => (
                <div key={cert.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{cert.certificateType}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Serial: {cert.certificateSerialNo || 'In Queue'}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">✓ Principal Signed</span>
                  </div>
                  <button
                    onClick={() => setSelectedCertForPrint(cert)}
                    className="min-h-[38px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="View Full-Screen PDF Preview before downloading or printing"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Preview & PDF</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Digital ID Card & Exam Admit Pass */}
        {activeTab === 'idcard' && (
          <div className="space-y-4">
            {/* Official Credentials Notice */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      Official Institutional Credentials
                    </span>
                    <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-950 font-black text-[9px] rounded uppercase tracking-wider">
                      Verified
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    High-resolution digital display of your official ID Card &amp; Semester Exam Hall Ticket.
                  </p>
                </div>
              </div>
            </div>
            <div 
              id="student-id-card-element"
              className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-emerald-600/40 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-emerald-300 font-bold block">
                    {collegeProfile?.name || 'RLSY College'} · {collegeProfile?.affiliation || 'Affiliated with Patna College'}
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase">Official Student Identity Card</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-xs font-mono font-bold">
                    {collegeProfile?.shortName || 'RLSY'}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-center mb-4">
                <div className="relative group shrink-0">
                  {student.profilePicture ? (
                    <img
                      src={student.profilePicture}
                      alt={student.name}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-white/50 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold border border-white/30 text-white">
                      {getInitials(student.name)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAcademicProfileModal(true)}
                    className="absolute -bottom-1.5 -right-1.5 bg-white text-emerald-800 p-1.5 rounded-full shadow-lg border border-slate-200 hover:scale-110 transition-transform cursor-pointer"
                    title="Change ID Card Photo"
                  >
                    <Camera className="w-3 h-3 text-emerald-800" />
                  </button>
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">{student.name}</h4>
                  <p className="text-xs text-emerald-200 font-mono font-semibold">{student.rollNo}</p>
                  <p className="text-[11px] text-slate-300">{student.course} · {student.branch}</p>
                  <p className="text-[10px] text-slate-400">DOB: {student.dateOfBirth}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-700/60 flex justify-between items-center text-[10px] text-emerald-200">
                <span>Category: {student.category}</span>
                <span className="font-mono">VALID: 2022 - 2026</span>
              </div>
            </div>

            {/* Exam Hall Ticket / Admit Card Box */}
            <div 
              id="student-admit-card-element"
              className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Semester Exam Admit Card</span>
                <div className="flex items-center gap-2">
                  {!student.hallTicketBlocked ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Eligible & Cleared
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      Withheld (Dues Pending)
                    </span>
                  )}
                </div>
              </div>

              {!student.hallTicketBlocked ? (
                <p className="text-xs text-slate-600">
                  You are cleared for Semester {student.semester} examinations. Examination center: Main Academic Block Hall B.
                </p>
              ) : (
                <p className="text-xs text-rose-600">
                  Please clear remaining tuition dues of ₹{totalDue.toLocaleString('en-IN')} to unlock digital admit card.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 7. Student Honors & Achievements View */}
        {activeTab === 'achievements' && (
          <StudentAchievementPanel
            achievements={achievements || []}
            student={student}
          />
        )}

        {/* 8. Student Profile Section View */}
        {activeTab === 'profile' && (
          <StudentProfileSection
            student={student}
            enrollmentFields={enrollmentFields || []}
            onUpdateStudent={(updated) => {
              if (onUpdateStudent) onUpdateStudent(updated);
            }}
            onOpenPhotoPicker={() => setShowAcademicProfileModal(true)}
          />
        )}

        {/* 9. Dedicated Notifications & Alerts View */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Notifications & Circular Alerts
                    </h3>
                    {unreadNotifCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        {unreadNotifCount} Unread
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official university circulars, fee deadlines & clearance updates for Roll No: <strong className="font-mono text-slate-700">{student.rollNo}</strong>
                  </p>
                </div>
              </div>
            </div>

            <StudentNotificationsPanel
              notifications={notifications || []}
              student={student}
              studentNoDues={studentNoDues}
              onMarkAsRead={(id) => onMarkNotificationAsRead?.(id)}
              onMarkAllAsRead={() => onMarkAllNotificationsAsRead?.()}
              onOpenDynamicQrPayment={(amt, purpose) => handleOpenDynamicQr(amt, purpose)}
              onNavigateToTab={(tab: string) => handleTabChange(tab)}
            />
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceiptTx && (
        <PrintableReceipt
          transaction={selectedReceiptTx}
          student={student}
          onClose={() => setSelectedReceiptTx(null)}
        />
      )}

      {/* Printable Certificate Modal */}
      {selectedCertForPrint && (
        <PrintableCertificate
          certificate={selectedCertForPrint}
          student={student}
          onClose={() => setSelectedCertForPrint(null)}
        />
      )}

      {/* Printable No Dues NOC Modal */}
      {showNocCertificate && studentNoDues && (
        <PrintableCertificate
          noDuesApp={studentNoDues}
          student={student}
          onClose={() => setShowNocCertificate(false)}
        />
      )}

      {/* Facility & Certificate Application Modal */}
      {selectedServiceForApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                  {selectedServiceForApply.category.replace('_', ' ')} Application
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Apply for {selectedServiceForApply.title}
                </h3>
                <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                  Code: {selectedServiceForApply.code}
                </span>
              </div>
              <button
                onClick={() => setSelectedServiceForApply(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-3.5">
              <div className={`p-3.5 rounded-xl border ${
                selectedServiceForApply.isPayable
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {selectedServiceForApply.isPayable ? 'Statutory Fee Tariff' : 'Fee Exemption'}
                  </span>
                  <span className={`text-base font-bold font-mono ${selectedServiceForApply.isPayable ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {selectedServiceForApply.isPayable ? `₹${selectedServiceForApply.feeAmount}` : 'FREE (₹0)'}
                  </span>
                </div>

                {selectedServiceForApply.isPayable ? (
                  <div className="text-[11px] space-y-0.5 text-emerald-800">
                    <p>• Tariff approved by: <strong>{selectedServiceForApply.feeSetBy || 'Accounts Officer'}</strong></p>
                    <p>• State Treasury Head: <strong className="font-mono">{selectedServiceForApply.feeTreasuryCode || '0202-01-800-01'}</strong></p>
                    <p>• Digital fee receipt will be instantly generated upon payment.</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600">
                    This service is 100% subsidized by the College Administration. No payment required.
                  </p>
                )}
              </div>

              {selectedServiceForApply.isPayable && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Payment Settlement Option:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setApplyPaymentOption('PAY_NOW')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        applyPaymentOption === 'PAY_NOW'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs ring-1 ring-emerald-600'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Pay via UPI Now</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">Instant Approval & Receipt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setApplyPaymentOption('PAY_LATER')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        applyPaymentOption === 'PAY_LATER'
                          ? 'bg-purple-50 border-purple-600 text-purple-900 shadow-xs ring-1 ring-purple-600'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Building className="w-3.5 h-3.5 text-purple-700" />
                        <span>Pay at Counter</span>
                      </div>
                      <span className="text-[10px] text-purple-700 block mt-0.5">Cash / Treasury Challan</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Purpose of Application <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={applyPurpose}
                  onChange={(e) => setApplyPurpose(e.target.value)}
                  placeholder="e.g. Higher Education, State Scholarship, Research Project..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Additional Notes (Optional):
                </label>
                <textarea
                  rows={2}
                  value={applyRemarks}
                  onChange={(e) => setApplyRemarks(e.target.value)}
                  placeholder="Any specific instructions for department or warden..."
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              {selectedServiceForApply.requiredDocuments && selectedServiceForApply.requiredDocuments.length > 0 && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <span className="font-bold text-slate-800 block">Document Verification:</span>
                  <p>
                    Please ensure you retain copies of: <strong>{selectedServiceForApply.requiredDocuments.join(', ')}</strong>.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedServiceForApply(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApp}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 ${
                    selectedServiceForApply.isPayable && applyPaymentOption === 'PAY_NOW'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-purple-700 hover:bg-purple-800'
                  }`}
                >
                  {isSubmittingApp ? (
                    <span>Submitting Application...</span>
                  ) : selectedServiceForApply.isPayable && applyPaymentOption === 'PAY_NOW' ? (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Pay ₹{selectedServiceForApply.feeAmount} & Apply</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Facility e-Pass & Application Acknowledgement Modal */}
      {selectedAppForPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto flex flex-col relative">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                  Official Institutional Pass / Slip
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedAppForPass.serviceTitle}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Application No: {selectedAppForPass.applicationNo}
                </span>
              </div>
              <button
                onClick={() => setSelectedAppForPass(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="text-center border-b border-slate-200 pb-2.5">
                <span className="text-xs font-extrabold uppercase text-slate-900 block tracking-tight">
                  {collegeProfile?.name || 'RLSY College'} · {collegeProfile?.affiliation || 'Affiliated with Patna College'}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {collegeProfile?.dept || 'Department of Higher Education · State of Bihar'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs">
                <span className="text-slate-600 font-medium">Authorization Status:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                  selectedAppForPass.status === 'Approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedAppForPass.status === 'Rejected'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedAppForPass.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{selectedAppForPass.status}</span>
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900">{selectedAppForPass.studentName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500">Roll No / Reg:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedAppForPass.studentRollNo}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500">Course & Branch:</span>
                  <span className="text-slate-800 font-semibold">{selectedAppForPass.course}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500">Date Applied:</span>
                  <span className="text-slate-800">{selectedAppForPass.appliedDate}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500">Fee Clearance:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedAppForPass.isPayable
                      ? selectedAppForPass.feeStatus === 'Paid'
                        ? `₹${selectedAppForPass.feeAmount} Cleared (${selectedAppForPass.paymentReceiptNo || 'Receipt Active'})`
                        : `Pending Payment (₹${selectedAppForPass.feeAmount})`
                      : 'Free Subsidized Access'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Stated Purpose:</span>
                  <span className="text-slate-800 text-right max-w-[200px] truncate">{selectedAppForPass.purpose}</span>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                <div className="w-16 h-16 bg-slate-900 rounded p-1 flex items-center justify-center shrink-0">
                  <QrCode className="w-full h-full text-white" />
                </div>
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <span className="font-bold text-slate-800 block">QR Security Token</span>
                  <span className="font-mono text-[9px] block text-purple-700">VERIFY-RLSY-{selectedAppForPass.id}</span>
                  <span>Valid for turnstile entry & laboratory access verification.</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-right text-[10px] text-slate-500">
                <span className="font-serif font-bold text-slate-800 block text-xs">
                  {selectedAppForPass.approvedBy || 'Prof. (Dr.) K. K. Srivastava'}
                </span>
                <span>{collegeProfile?.principalTitle || 'Principal & DDO'} · {collegeProfile?.name || 'RLSY College'}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Pass</span>
              </button>
              <button
                onClick={() => setSelectedAppForPass(null)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Academic Profile Summary & Photo Management Modal */}
      {showAcademicProfileModal && (
        <UserProfileSummaryModal
          session={session}
          student={student}
          onClose={() => setShowAcademicProfileModal(false)}
          onUpdateProfilePicture={(photoUrl) => {
            if (onUpdateProfilePicture) onUpdateProfilePicture(photoUrl);
          }}
          onNavigateTab={(tab) => {
            if (onNavTabChange) onNavTabChange(tab);
            else if (tab.includes('fees')) setLocalTab('fees');
            else if (tab.includes('idcard')) setLocalTab('idcard');
            else if (tab.includes('nodues')) setLocalTab('nodues');
            setShowAcademicProfileModal(false);
          }}
        />
      )}
    </div>
  );

  return (
    <div className="py-4">
      {/* Mandatory Profile Completion Modal (Strict blocking until filled if required fields missing) */}
      {!profileValidation.isComplete && !mandatoryModalDismissed && (
        <MandatoryProfileCompletionModal
          student={student}
          enrollmentFields={enrollmentFields || []}
          onComplete={handleCompleteMandatoryProfile}
          onLogout={onLogout}
          onClose={() => setMandatoryModalDismissed(true)}
        />
      )}

      {/* Dynamic UPI QR Payment Gateway Modal */}
      {showDynamicQrModal && (
        <DynamicUpiQrPaymentModal
          student={student}
          amountDue={dynamicQrAmount}
          purpose={dynamicQrPurpose}
          dynamicQrConfig={dynamicQrConfig || INITIAL_DYNAMIC_QR_CONFIG}
          onPaymentSuccess={(tx, updatedStudent) => {
            setShowDynamicQrModal(false);
            onPayFee(tx, updatedStudent);
          }}
          onClose={() => setShowDynamicQrModal(false)}
        />
      )}

      {/* Student In-App Hamburger Navigation Drawer */}
      {showStudentMenuDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setShowStudentMenuDrawer(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 max-w-full flex pr-4 sm:pr-8 z-50">
            <div className="w-[85vw] max-w-xs sm:max-w-sm h-full bg-white shadow-2xl flex flex-col border-r border-slate-200 transform transition-transform animate-in slide-in-from-left duration-300 overflow-hidden">
              {/* Drawer Top */}
              <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white text-emerald-800 font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                    RLSY
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white leading-tight">Student Portal Menu</h4>
                    <span className="text-[10px] text-emerald-200">Roll No: {student.rollNo}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStudentMenuDrawer(false)}
                  className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Profile Quick Tile */}
              <div className="p-3.5 bg-emerald-50/70 border-b border-emerald-200 flex items-center gap-3">
                <div className="relative shrink-0">
                  {student.profilePicture ? (
                    <img
                      src={student.profilePicture}
                      alt={student.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center border-2 border-emerald-500">
                      {getInitials(student.name)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-slate-900 text-xs truncate">{student.name}</h5>
                  <span className="text-[10px] text-slate-600 block">{student.course} · Sem {student.semester}</span>
                  <span className="text-[9px] font-mono text-emerald-700 font-bold">DDO: 2049-RLSY-PATNA</span>
                </div>
              </div>

              {/* Menu items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handleTabChange('home');
                    setShowStudentMenuDrawer(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-colors ${
                    activeTab === 'home' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="flex-1">
                    <span className="block font-semibold">My Dashboard</span>
                    <span className="text-[10px] text-slate-500">Alerts, notices and fee overview</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabChange('notifications');
                    setShowStudentMenuDrawer(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-colors ${
                    activeTab === 'notifications' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Bell className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="flex-1">
                    <span className="block font-semibold">Notifications & Circulars</span>
                    <span className="text-[10px] text-slate-500">Official fee dues & administrative circulars</span>
                  </div>
                  {unreadNotifCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                      {unreadNotifCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabChange('profile');
                    setShowStudentMenuDrawer(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-colors ${
                    activeTab === 'profile' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <User className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="flex-1">
                    <span className="block font-semibold">Student Profile & Identity</span>
                    <span className="text-[10px] text-slate-500">Personal, reservation & dynamic fields</span>
                  </div>
                  {!profileValidation.isComplete && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800">
                      Incomplete
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabChange('fees');
                    setShowStudentMenuDrawer(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-colors ${
                    activeTab === 'fees' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="flex-1">
                    <span className="block font-semibold">Fee Module & Payments</span>
                    <span className="text-[10px] text-slate-500">Outstanding dues & verified receipts</span>
                  </div>
                  {totalDue > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800">
                      ₹{totalDue}
                    </span>
                  )}
                </button>

                {totalDue > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowStudentMenuDrawer(false);
                      handleOpenDynamicQr(totalDue, 'Odd Semester Tuition & Examination Fee');
                    }}
                    className="w-full p-2.5 rounded-xl text-left flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 transition-colors"
                  >
                    <QrCode className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="flex-1">
                      <span className="block font-bold">Dynamic UPI QR Pay</span>
                      <span className="text-[10px] text-emerald-700">Instant treasury payment for ₹{totalDue}</span>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleTabChange('achievements');
                    setShowStudentMenuDrawer(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-colors ${
                    activeTab === 'achievements' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <span className="block font-semibold">Honors & Achievements</span>
                    <span className="text-[10px] text-slate-500">Verified academic & athletic honors</span>
                  </div>
                  {studentAchievements.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-200 text-amber-900">
                      {studentAchievements.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabChange('nodues');
                    setShowStudentMenuDrawer(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-colors ${
                    activeTab === 'nodues' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="flex-1">
                    <span className="block font-semibold">My No Dues (NOC)</span>
                    <span className="text-[10px] text-slate-500">7-department clearance sign-offs</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabChange('certificates');
                    setShowStudentMenuDrawer(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-colors ${
                    activeTab === 'certificates' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Award className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="flex-1">
                    <span className="block font-semibold">Certificate Wallet</span>
                    <span className="text-[10px] text-slate-500">Bonafide, TC & Character certs</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabChange('idcard');
                    setShowStudentMenuDrawer(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-colors ${
                    activeTab === 'idcard' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="flex-1">
                    <span className="block font-semibold">Digital ID & Hall Ticket</span>
                    <span className="text-[10px] text-slate-500">Admit slip and student ID barcode</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabChange('apply');
                    setShowStudentMenuDrawer(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-colors ${
                    activeTab === 'apply' ? 'bg-purple-100 text-purple-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-purple-700 shrink-0" />
                  <div className="flex-1">
                    <span className="block font-semibold">Apply For Facilities</span>
                    <span className="text-[10px] text-slate-500">Hostel, library card, bus pass</span>
                  </div>
                </button>
              </div>

              {/* Drawer Footer */}
              <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">DDO: 2049-RLSY-PATNA</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowStudentMenuDrawer(false);
                    onLogout();
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner prompt with redirect to complete profile for missing mandatory enrollment parameters */}
      {!profileValidation.isComplete && (
        <div className="max-w-4xl mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md border border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-[10px] uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
                <span className="text-[11px] text-amber-100 font-medium">
                  {profileValidation.missingFields.length} Mandatory Enrollment Parameter(s) Pending
                </span>
              </div>
              <p className="text-xs font-semibold text-white mt-0.5">
                Complete your required student profile ({profileValidation.missingFields.slice(0, 3).map(f => f.label).join(', ')}{profileValidation.missingFields.length > 3 ? '...' : ''}) to ensure seamless admissions and examination clearances.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                handleTabChange('profile');
                setShowAcademicProfileModal(true);
              }}
              className="px-4 py-2 bg-white text-orange-950 font-bold rounded-xl text-xs shadow-sm hover:bg-amber-50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Complete Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {content}
      </div>

      {/* Campaign / Fee Module Printable Receipt Modal */}
      {viewingCampaignReceipt && (
        <PrintableCampaignReceipt
          payment={viewingCampaignReceipt}
          allPayments={campaignPayments || []}
          userRole="student"
          userName={student.name}
          userEmail={student.email}
          onClose={() => setViewingCampaignReceipt(null)}
          onCancelReceipt={() => {}}
          onAddAuditLog={() => {}}
        />
      )}
    </div>
  );
};
