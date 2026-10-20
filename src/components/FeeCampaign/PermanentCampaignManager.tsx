import React, { useState } from 'react';
import {
  FeeCampaign,
  StudentDue,
  AuditLogEntry,
  CampaignExtensionRecord,
} from '../../types/campaign';
import { AcademicStream, StudySubject, Student } from '../../types/fee';
import {
  Infinity as InfinityIcon,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CalendarPlus,
  PowerOff,
  Sparkles,
  Users,
  CreditCard,
  FileText,
  Info,
  X,
  History,
  TrendingUp,
  Play,
  Layers,
  BookOpen,
  Filter,
  CheckSquare,
  Square,
  ShieldAlert,
} from 'lucide-react';
import { safeMatchStrings, safeUpper, safeString } from '../../utils/safeHelpers';

interface Props {
  campaigns: FeeCampaign[];
  onUpdateCampaigns: (campaigns: FeeCampaign[]) => void;
  studentDues: StudentDue[];
  onUpdateStudentDues?: (dues: StudentDue[]) => void;
  onAddAuditLog: (log: AuditLogEntry) => void;
  userRole?: 'admin' | 'accountant' | 'student';
  userName?: string;
  userEmail?: string;
  isEmbeddedCard?: boolean;
  onNavigateToTab?: (tab: string) => void;
  allStudents?: Student[];
  streams?: AcademicStream[];
  studySubjects?: StudySubject[];
}

const DEFAULT_STREAMS: AcademicStream[] = [
  { id: 'STR-CSE', code: 'CSE', name: 'Computer Science & Engineering', degree: 'B.Tech', department: 'Dept. of CSE', totalSemesters: 8, isActive: true },
  { id: 'STR-MECH', code: 'MECH', name: 'Mechanical Engineering', degree: 'B.Tech', department: 'Dept. of MECH', totalSemesters: 8, isActive: true },
  { id: 'STR-ECE', code: 'ECE', name: 'Electronics & Communication', degree: 'B.Tech', department: 'Dept. of ECE', totalSemesters: 8, isActive: true },
  { id: 'STR-BSC', code: 'BSC-MATH', name: 'B.Sc Mathematics Honours', degree: 'B.Sc', department: 'Dept. of Mathematics', totalSemesters: 6, isActive: true },
  { id: 'STR-BCOM', code: 'BCOM', name: 'Bachelor of Commerce', degree: 'B.Com', department: 'Dept. of Commerce', totalSemesters: 6, isActive: true },
  { id: 'STR-BA', code: 'BA-ENG', name: 'Bachelor of Arts (English)', degree: 'B.A', department: 'Dept. of Humanities', totalSemesters: 6, isActive: true },
];

export const PermanentCampaignManager: React.FC<Props> = ({
  campaigns,
  onUpdateCampaigns,
  studentDues,
  onUpdateStudentDues,
  onAddAuditLog,
  userRole = 'admin',
  userName = 'Kumari Pallawi',
  userEmail = 'admin.office@rlsycollege.ac.in',
  isEmbeddedCard = false,
  onNavigateToTab,
  allStudents = [],
  streams = [],
  studySubjects = [],
}) => {
  // Option to select Monthly / Semester / Annual fee
  const [selectedFeeType, setSelectedFeeType] = useState<'Monthly' | 'Semester' | 'Annual'>('Monthly');

  // Resolved list of available streams
  const effectiveStreams = streams && streams.length > 0 ? streams : DEFAULT_STREAMS;

  // Modals state
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showExtendDateModal, setShowExtendDateModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // Form states for Activation Modal
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDateInput, setStartDateInput] = useState(todayStr);
  const [endDateInput, setEndDateInput] = useState('');
  const [selectedStreamCodes, setSelectedStreamCodes] = useState<string[]>([]);
  const [activationError, setActivationError] = useState<string | null>(null);

  // Form states for Extend Date Modal
  const [extendEndDateInput, setExtendEndDateInput] = useState('');
  const [extensionReasonInput, setExtensionReasonInput] = useState('');
  const [extensionError, setExtensionError] = useState<string | null>(null);

  // Form states for Deactivate Modal
  const [deactivationReasonInput, setDeactivationReasonInput] = useState('Administrative fiscal review & schedule pause');

  // Toast notice
  const [notice, setNotice] = useState<{ type: 'success' | 'warn' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'warn' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => {
      setNotice((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // Resolve Campaign for current selected fee type
  const targetCampaignId = `CMP-${selectedFeeType.toUpperCase()}-FEE`;
  const existingCampaign = campaigns.find(
    (c) => c.id === targetCampaignId || (c.isPermanent && c.permanentFeeType === selectedFeeType)
  );

  // Determine current lifecycle state (Default mode is Deactivated)
  const isDeactivated =
    !existingCampaign ||
    existingCampaign.permanentStatus === 'Deactivated' ||
    existingCampaign.status === 'Expired' ||
    existingCampaign.status === 'Closed' ||
    (existingCampaign.hasNoEndDate !== true && (!existingCampaign.endDate || existingCampaign.endDate === ''));

  const hasEndDate = Boolean(
    existingCampaign &&
    existingCampaign.endDate &&
    existingCampaign.endDate !== '' &&
    existingCampaign.endDate !== 'Indefinite'
  );

  let currentStatus: 'Active' | 'Scheduled End' | 'Deactivated' = 'Deactivated';
  if (!isDeactivated && existingCampaign?.status === 'Active') {
    currentStatus = hasEndDate ? 'Scheduled End' : 'Active';
  }

  // Active targeted streams for this campaign
  const campaignTargetStreams = existingCampaign?.targetStreams || [];

  // Associated student dues for this recurring fee stream
  const associatedDues = existingCampaign
    ? studentDues.filter((d) => d.campaignId === existingCampaign.id)
    : [];

  const totalExpected = associatedDues.reduce((s, d) => s + d.netAmount, 0);
  const totalCollected = associatedDues.reduce((s, d) => s + d.paidAmount, 0);
  const totalPending = associatedDues.reduce((s, d) => s + (d.balanceAmount || 0) + (d.lateFeeApplied || 0), 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Stream resolution helper without hardcoded CSE fallback
  const resolveStudentStreamCode = (student: Student): string => {
    if (student.streamCode && student.streamCode.trim()) return safeUpper(student.streamCode);
    const branchLower = (student.branch || '').toLowerCase();
    const courseLower = (student.course || '').toLowerCase();
    const matchedStream = effectiveStreams.find(
      (st) =>
        branchLower.includes(st.name.toLowerCase()) ||
        st.name.toLowerCase().includes(branchLower) ||
        branchLower.includes(st.code.toLowerCase()) ||
        courseLower.includes(st.code.toLowerCase())
    );
    if (matchedStream) return safeUpper(matchedStream.code);
    if (branchLower.includes('civil')) return 'CIVIL';
    if (branchLower.includes('elec')) return 'EE';
    if (branchLower.includes('mech')) return 'MECH';
    if (branchLower.includes('comp') || branchLower.includes('cse') || courseLower.includes('bca')) return 'CSE';
    return safeUpper(student.branch || 'GEN');
  };

  // Helper to get matching students for selected streams
  const getEligibleStudents = (streamCodes: string[]): Student[] => {
    if (streamCodes.length === 0) return [];
    return allStudents.filter((s) => {
      const code = resolveStudentStreamCode(s);
      return streamCodes.some((sc) => safeMatchStrings(sc, code) || sc === 'ALL');
    });
  };

  // Helper to calculate estimated dues for a single student (respecting semester & enrolled subjects)
  const calculateStudentFee = (student: Student, type: 'Monthly' | 'Semester' | 'Annual'): number => {
    const studentStream = resolveStudentStreamCode(student);
    const studentSem = student.semester || 1;

    // Filter subjects by stream AND student's current semester/enrolled subjects
    const relevantSubs = studySubjects.filter((sub) => {
      if (!sub.isActive) return false;
      const streamMatch = safeMatchStrings(sub.streamCode, studentStream) || sub.streamCode === 'ALL';
      const semesterMatch =
        sub.semester === undefined ||
        sub.semester === studentSem ||
        (student.subjectsEnrolled && student.subjectsEnrolled.includes(sub.code));
      return streamMatch && semesterMatch;
    });

    if (type === 'Monthly') {
      const sumPaisa = relevantSubs.reduce((acc, sub) => {
        const base = sub.monthlyFee ? sub.monthlyFee * 100 : Math.round(((sub.subjectFee || sub.annualFee || 10000) * 100) / 10);
        const lab = Math.round(((sub.labFee || sub.associatedLabFee || 0) * 100) / 10);
        const other = Math.round(((sub.otherFee || 0) * 100) / 10);
        return acc + base + lab + other;
      }, 0);
      return sumPaisa > 0 ? Math.round(sumPaisa / 100) : (student.totalFee ? Math.round(student.totalFee / 10) : 2000);
    }
    if (type === 'Semester') {
      const sumPaisa = relevantSubs.reduce((acc, sub) => {
        const base = sub.semesterFee ? sub.semesterFee * 100 : Math.round(((sub.subjectFee || sub.annualFee || 10000) * 100) / 2);
        const lab = Math.round((sub.labFee || sub.associatedLabFee || 0) * 100);
        const other = Math.round((sub.otherFee || 0) * 100);
        return acc + base + lab + other;
      }, 0);
      return sumPaisa > 0 ? Math.round(sumPaisa / 100) : (student.totalFee ? Math.round(student.totalFee / 2) : 12000);
    }
    // Annual
    const sumPaisa = relevantSubs.reduce((acc, sub) => {
      const base = Math.round((sub.annualFee || sub.subjectFee || 0) * 100);
      const lab = Math.round((sub.labFee || sub.associatedLabFee || 0) * 100);
      const other = Math.round((sub.otherFee || 0) * 100);
      return acc + base + lab + other;
    }, 0);
    return sumPaisa > 0 ? Math.round(sumPaisa / 100) : (student.totalFee || 24000);
  };

  // Open Activation Modal
  const handleOpenActivateModal = () => {
    setStartDateInput(todayStr);
    const futureDate = new Date();
    if (selectedFeeType === 'Monthly') futureDate.setDate(futureDate.getDate() + 30);
    else if (selectedFeeType === 'Semester') futureDate.setMonth(futureDate.getMonth() + 6);
    else futureDate.setFullYear(futureDate.getFullYear() + 1);
    setEndDateInput(futureDate.toISOString().split('T')[0]);

    const initialStreams = campaignTargetStreams.length > 0
      ? campaignTargetStreams
      : effectiveStreams.map((s) => s.code);
    setSelectedStreamCodes(initialStreams);
    setActivationError(null);
    setShowActivateModal(true);
  };

  // Submit Activation
  const handleConfirmActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDateInput) {
      setActivationError('Please select a valid start date.');
      return;
    }
    if (!endDateInput) {
      setActivationError('Please select a valid scheduled end date.');
      return;
    }
    if (new Date(endDateInput) < new Date(startDateInput)) {
      setActivationError('Scheduled end date must be on or after the start date.');
      return;
    }
    if (selectedStreamCodes.length === 0) {
      setActivationError('Please select at least one academic stream to activate this fee stream.');
      return;
    }

    const targetedStudents = getEligibleStudents(selectedStreamCodes);
    if (targetedStudents.length === 0) {
      setActivationError('No enrolled students match the selected academic stream(s).');
      return;
    }

    const now = new Date().toISOString();
    let totalDuesAmount = 0;
    const newStudentDues: StudentDue[] = targetedStudents.map((stu) => {
      const existingDue = studentDues.find((d) => d.campaignId === targetCampaignId && (d.studentId === stu.id || safeMatchStrings(d.rollNo, stu.rollNo)));
      const feeAmount = calculateStudentFee(stu, selectedFeeType);
      totalDuesAmount += feeAmount;

      const existingPaid = existingDue?.paidAmount || 0;
      const concession = Math.min(feeAmount, existingDue?.concessionAmount || 0);
      const netAmount = Math.max(0, feeAmount - concession);
      const balanceAmount = Math.max(0, netAmount - existingPaid);
      const status: StudentDue['status'] = balanceAmount === 0 ? 'Paid' : (existingPaid > 0 ? 'Partial' : 'Pending');

      return {
        id: existingDue?.id || `DUE-${targetCampaignId}-${stu.id}`,
        campaignId: targetCampaignId,
        campaignTitle: `${selectedFeeType} Recurring Academic Fee Stream`,
        studentId: stu.id,
        studentEmail: stu.email,
        rollNo: stu.rollNo,
        studentName: stu.name,
        course: stu.course,
        semester: stu.semester,
        baseAmount: feeAmount,
        concessionAmount: concession,
        netAmount,
        paidAmount: existingPaid,
        balanceAmount,
        status,
        lineItems: [
          {
            headId: `HD-${selectedFeeType.toUpperCase()}`,
            name: `${selectedFeeType} Statutory Academic & Curriculum Fee`,
            amount: feeAmount,
          },
        ],
        lateFeeApplied: existingDue?.lateFeeApplied || 0,
        paymentLink: `/pay/${targetCampaignId}/${stu.id}`,
        paymentLinkActive: balanceAmount > 0,
        dueDate: endDateInput,
        createdAt: existingDue?.createdAt || now,
        updatedAt: now,
      };
    });

    const averageRate = Math.round(totalDuesAmount / (targetedStudents.length || 1));

    const updatedCampaignRecord: FeeCampaign = {
      id: targetCampaignId,
      title: `${selectedFeeType} Recurring Academic Fee Stream`,
      description: `Continuous ongoing ${selectedFeeType.toLowerCase()} academic fee collection across ${selectedStreamCodes.join(', ')}. Automatically calculated from enrolled subjects and lab fees.`,
      customHeads: [],
      isPermanent: true,
      permanentFeeType: selectedFeeType,
      permanentStatus: 'Active',
      status: 'Active',
      startDate: startDateInput,
      endDate: endDateInput,
      targetStreams: selectedStreamCodes,
      activeSince: startDateInput,
      hasNoEndDate: false,
      totalAmount: averageRate,
      studentCount: targetedStudents.length,
      totalExpectedAmount: totalDuesAmount,
      lateFee: {
        enabled: false,
        type: 'FLAT',
        amount: 0,
        graceDays: selectedFeeType === 'Monthly' ? 5 : 7,
      },
      method: 'SELECTION',
      extensions: existingCampaign?.extensions || [],
      createdAt: existingCampaign?.createdAt || now,
      createdBy: existingCampaign?.createdBy || userEmail,
      updatedAt: now,
    };

    const remainingCampaigns = campaigns.filter((c) => c.id !== targetCampaignId);
    onUpdateCampaigns([updatedCampaignRecord, ...remainingCampaigns]);

    // Update student dues: remove existing dues for this campaign and add newly calculated dues
    const remainingDues = studentDues.filter((d) => d.campaignId !== targetCampaignId);
    onUpdateStudentDues?.([...newStudentDues, ...remainingDues]);

    onAddAuditLog({
      id: `LOG-ACTIVATE-${Date.now()}`,
      entityType: 'Campaign',
      entityId: targetCampaignId,
      action: 'ACTIVATE',
      userEmail,
      userName,
      userRole: userRole === 'admin' ? 'Admin' : 'Accountant',
      details: `Activated ${selectedFeeType} recurring fee stream (Till ${new Date(endDateInput).toLocaleDateString()}) for ${selectedStreamCodes.length} streams. Auto-generated statutory dues for ${targetedStudents.length} students (Total: ₹${totalDuesAmount.toLocaleString('en-IN')}).`,
      timestamp: now,
    });

    setShowActivateModal(false);
    showToast(
      'success',
      `Successfully activated ${selectedFeeType} Fee Stream! Generated dues for ${targetedStudents.length} students across ${selectedStreamCodes.join(', ')}.`
    );
  };

  // Open Extend Date Modal
  const handleOpenExtendDateModal = () => {
    if (!existingCampaign) return;
    setExtendEndDateInput(existingCampaign.endDate || todayStr);
    setExtensionReasonInput('');
    setExtensionError(null);
    setShowExtendDateModal(true);
  };

  // Submit Extension
  const handleConfirmExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingCampaign) return;
    if (!extendEndDateInput) {
      setExtensionError('Please pick a new scheduled end date.');
      return;
    }
    if (new Date(extendEndDateInput) <= new Date(existingCampaign.endDate)) {
      setExtensionError('New end date must be strictly after the current scheduled end date.');
      return;
    }
    if (!extensionReasonInput.trim()) {
      setExtensionError('Please provide an administrative note or justification for the extension.');
      return;
    }

    const now = new Date().toISOString();
    const newRecord: CampaignExtensionRecord = {
      id: `EXT-${Date.now()}`,
      oldEndDate: existingCampaign.endDate,
      newEndDate: extendEndDateInput,
      reason: extensionReasonInput.trim(),
      extendedBy: userName,
      extendedAt: now,
    };

    const updatedCampaigns = campaigns.map((c) => {
      if (c.id === existingCampaign.id) {
        return {
          ...c,
          endDate: extendEndDateInput,
          hasNoEndDate: false,
          permanentStatus: 'Scheduled End' as const,
          extensions: [...(c.extensions || []), newRecord],
          updatedAt: now,
        };
      }
      return c;
    });

    onUpdateCampaigns(updatedCampaigns);

    if (onUpdateStudentDues) {
      const updatedDues = studentDues.map((d) => {
        if (d.campaignId === existingCampaign.id) {
          return {
            ...d,
            dueDate: extendEndDateInput,
            paymentLinkActive: d.balanceAmount > 0,
            status: d.status === 'Expired' && d.balanceAmount > 0 ? ('Pending' as const) : d.status,
            updatedAt: now,
          };
        }
        return d;
      });
      onUpdateStudentDues(updatedDues);
    }

    onAddAuditLog({
      id: `LOG-EXT-${Date.now()}`,
      entityType: 'Campaign',
      entityId: existingCampaign.id,
      action: 'EXTEND',
      userEmail,
      userName,
      userRole: userRole === 'admin' ? 'Admin' : 'Accountant',
      details: `Extended ${selectedFeeType} recurring fee cutoff from ${new Date(existingCampaign.endDate).toLocaleDateString()} to ${new Date(extendEndDateInput).toLocaleDateString()}. Note: "${extensionReasonInput.trim()}".`,
      timestamp: now,
    });

    setShowExtendDateModal(false);
    showToast(
      'success',
      `End date extended till ${new Date(extendEndDateInput).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`
    );
  };

  // Open Deactivate Modal
  const handleOpenDeactivateModal = () => {
    setDeactivationReasonInput('Fiscal term transition / administrative schedule hold');
    setShowDeactivateModal(true);
  };

  // Confirm Deactivation
  const handleConfirmDeactivation = () => {
    if (!existingCampaign) return;
    const now = new Date().toISOString();

    const updatedCampaigns = campaigns.map((c) => {
      if (c.id === existingCampaign.id) {
        return {
          ...c,
          permanentStatus: 'Deactivated' as const,
          status: 'Expired' as const,
          deactivatedAt: now,
          deactivatedBy: userName,
          deactivationReason: deactivationReasonInput,
          updatedAt: now,
        };
      }
      return c;
    });

    onUpdateCampaigns(updatedCampaigns);

    if (onUpdateStudentDues) {
      const updatedDues = studentDues.map((d) => {
        if (d.campaignId === existingCampaign.id) {
          return {
            ...d,
            paymentLinkActive: false,
            status: d.status === 'Pending' ? ('Expired' as const) : d.status,
            updatedAt: now,
          };
        }
        return d;
      });
      onUpdateStudentDues(updatedDues);
    }

    onAddAuditLog({
      id: `LOG-DEACTIVATE-${Date.now()}`,
      entityType: 'Campaign',
      entityId: existingCampaign.id,
      action: 'UPDATE',
      userEmail,
      userName,
      userRole: userRole === 'admin' ? 'Admin' : 'Accountant',
      details: `Deactivated ${selectedFeeType} fee stream. Auto-billing paused. Note: "${deactivationReasonInput}".`,
      timestamp: now,
    });

    setShowDeactivateModal(false);
    showToast('warn', `${selectedFeeType} Fee Stream has been deactivated.`);
  };

  // Stream toggle helpers for Activation Modal
  const toggleStream = (code: string) => {
    setSelectedStreamCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAllStreams = () => {
    setSelectedStreamCodes(effectiveStreams.map((s) => s.code));
  };

  const clearAllStreams = () => {
    setSelectedStreamCodes([]);
  };

  // Preview calculations in Activation Modal
  const previewEligibleStudents = getEligibleStudents(selectedStreamCodes);
  const previewTotalDues = previewEligibleStudents.reduce(
    (sum, stu) => sum + calculateStudentFee(stu, selectedFeeType),
    0
  );

  return (
    <div className="space-y-4">
      {/* Toast Alert Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200 border ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
              : notice.type === 'warn'
              ? 'bg-amber-50 text-amber-950 border-amber-200'
              : 'bg-rose-50 text-rose-950 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notice.type === 'warn' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Segmented Fee Period Switcher: Monthly / Semester / Annual */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Infinity className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Permanent Recurring Fee Streams</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Continuous ongoing institutional fee collections. Select cadence, target streams, and control lifecycle below.
            </p>
          </div>

          {/* Clean Segmented Pill Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedFeeType('Monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedFeeType === 'Monthly'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Monthly Fee</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFeeType('Semester')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedFeeType === 'Semester'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Semester Fee</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFeeType('Annual')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedFeeType === 'Annual'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Annual Fee</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Lifecycle Card for the Selected Period */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        {/* Card Header & Badges */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 font-medium">
              <span>Statutory Fee Stream</span>
              <span className="mx-1.5">·</span>
              <span>{selectedFeeType} Cadence</span>
              <span className="mx-1.5">·</span>
              <span>{campaignTargetStreams.length > 0 ? `${campaignTargetStreams.length} Stream(s) Targeted` : 'No Streams Active'}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {selectedFeeType} Recurring Academic Fee Stream
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
              Continuous ongoing {selectedFeeType.toLowerCase()} tuition and lab charges calculated from stream subjects. Default mode starts deactivated until activated with start and end dates.
            </p>
          </div>

          {/* Exactly ONE Status Pill at top right */}
          <div className="shrink-0">
            {currentStatus === 'Active' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
              </span>
            ) : currentStatus === 'Scheduled End' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Till {new Date(existingCampaign!.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Deactivated
              </span>
            )}
          </div>
        </div>

        {/* Current Details Section */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Current Status</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  currentStatus === 'Active'
                    ? 'bg-emerald-500'
                    : currentStatus === 'Scheduled End'
                    ? 'bg-purple-500'
                    : 'bg-slate-400'
                }`}
              />
              <strong className="text-slate-900 font-semibold">{currentStatus}</strong>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Start Date</span>
            <span className="text-slate-800 font-mono font-medium block mt-0.5">
              {existingCampaign?.startDate && existingCampaign.startDate !== ''
                ? new Date(existingCampaign.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Not Activated'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Current End Date</span>
            <span className="text-slate-800 font-mono font-medium block mt-0.5">
              {existingCampaign?.endDate && existingCampaign.endDate !== ''
                ? new Date(existingCampaign.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : isDeactivated
                ? 'Deactivated'
                : 'Indefinite (No End Date)'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Enrolled Audience</span>
            <span className="text-slate-900 font-bold block mt-0.5">
              {associatedDues.length} Students
            </span>
          </div>
        </div>

        {/* Targeted Streams Display */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Active Streams Targeted:</span>
            <span className="text-slate-400 text-[11px]">
              {campaignTargetStreams.length > 0
                ? `${campaignTargetStreams.length} of ${effectiveStreams.length} Streams Active`
                : 'None Selected (Activation Required)'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {campaignTargetStreams.length > 0 ? (
              campaignTargetStreams.map((code) => {
                const streamMeta = effectiveStreams.find((s) => safeMatchStrings(s.code, code));
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-900 text-xs font-semibold border border-indigo-200"
                  >
                    <span>{code}</span>
                    <span className="text-[10px] text-indigo-500 font-normal">
                      ({streamMeta?.degree || 'Stream'})
                    </span>
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-slate-400 italic">
                No streams are currently activated for this fee period. Click Activate below to select streams.
              </span>
            )}
          </div>
        </div>

        {/* Structured Dues Mini-Panel (if active or dues generated) */}
        {associatedDues.length > 0 && (
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-2">
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Total Expected Dues</p>
                <p className="text-sm font-bold text-slate-900 font-mono">
                  ₹{totalExpected.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Collected Rate</p>
                <p className="text-sm font-bold text-emerald-600 font-mono">
                  ₹{totalCollected.toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-normal text-slate-400">({collectionRate}%)</span>
                </p>
              </div>
            </div>

            <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${Math.min(100, collectionRate)}%` }}
              />
            </div>
          </div>
        )}

        {/* Lifecycle Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
          {isDeactivated ? (
            <button
              type="button"
              onClick={handleOpenActivateModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Activate {selectedFeeType} Fee</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleOpenExtendDateModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Extend End Date</span>
              </button>

              <button
                type="button"
                onClick={handleOpenActivateModal}
                className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Modify target streams and re-sync schedule"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Re-configure Streams</span>
              </button>

              <button
                type="button"
                onClick={handleOpenDeactivateModal}
                className="px-3.5 py-2 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ml-auto"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Deactivate Fee Stream</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. Extension History Audit Log (if any extensions exist) */}
      {existingCampaign?.extensions && existingCampaign.extensions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>Extension Timeline & Audit History</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              {existingCampaign.extensions.length} Extension Event(s)
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {existingCampaign.extensions.map((ext) => (
              <div key={ext.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      Extended to {new Date(ext.newEndDate).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      (from {new Date(ext.oldEndDate).toLocaleDateString()})
                    </span>
                  </div>
                  <p className="text-slate-600 italic">&quot;{ext.reason}&quot;</p>
                </div>
                <div className="text-right text-[11px] text-slate-400 shrink-0">
                  <span className="block font-medium text-slate-600">{ext.extendedBy}</span>
                  <span>{new Date(ext.extendedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL 1: ACTIVATION MODAL ================= */}
      {showActivateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Activate {selectedFeeType} Fee Stream
                  </h3>
                  <p className="text-xs text-slate-500">
                    Specify collection dates and select streams to auto-generate student dues.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActivateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{activationError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmActivation} className="space-y-4 text-xs">
              {/* Start & End Dates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Collection Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDateInput}
                    min={todayStr}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Calculations start from 00:00 on this date.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Scheduled End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDateInput}
                    min={startDateInput || todayStr}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Auto-calculates dues until 23:59 on this date.
                  </span>
                </div>
              </div>

              {/* Multi-Stream Selection Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-slate-800 font-bold block">
                      Target Academic Streams <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Select which stream cohorts will receive this {selectedFeeType.toLowerCase()} fee schedule.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={selectAllStreams}
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md cursor-pointer transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllStreams}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Streams Checkbox Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                  {effectiveStreams.map((st) => {
                    const isChecked = selectedStreamCodes.includes(st.code);
                    const matchingStudentCount = (allStudents || []).filter((s) => {
                      const code = safeUpper(s.streamCode || (s.branch?.includes('Computer') ? 'CSE' : s.branch?.includes('Mechanical') ? 'MECH' : s.branch?.includes('Electronics') ? 'ECE' : 'CSE'));
                      return safeMatchStrings(code, st.code);
                    }).length;

                    return (
                      <div
                        key={st.code}
                        onClick={() => toggleStream(st.code)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          isChecked
                            ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {st.code} · {st.degree}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {st.name}
                            </span>
                          </div>
                        </div>

                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 bg-slate-100 text-slate-700">
                          {matchingStudentCount} stu
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Impact Preview */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-950">Target Impact Preview:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {selectedStreamCodes.length} Stream(s) Selected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 text-[11px]">Eligible Students:</span>
                    <strong className="block text-slate-900 font-bold text-sm">
                      {previewEligibleStudents.length} Students
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Auto-Generated Dues:</span>
                    <strong className="block text-emerald-700 font-bold text-sm font-mono">
                      ₹{previewTotalDues.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowActivateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedStreamCodes.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Activate Dues</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EXTEND DATE MODAL ================= */}
      {showExtendDateModal && existingCampaign && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Extend End Date
                  </h3>
                  <p className="text-xs text-slate-500">
                    Push back cutoff date for {selectedFeeType} Fee Stream.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExtendDateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {extensionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{extensionError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmExtension} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Existing End Date:</span>
                <strong className="text-slate-900 font-mono text-xs">
                  {existingCampaign.endDate
                    ? new Date(existingCampaign.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'None (Indefinite)'}
                </strong>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  New Scheduled End Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={extendEndDateInput}
                  min={existingCampaign.endDate || todayStr}
                  onChange={(e) => setExtendEndDateInput(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Must be strictly after the current scheduled cutoff date.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason for Extension <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={extensionReasonInput}
                  onChange={(e) => setExtensionReasonInput(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Extended by order of Academic Council for state festival holidays"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowExtendDateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer shadow-xs"
                >
                  Save Extension
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: DEACTIVATE SAFEGUARD MODAL ================= */}
      {showDeactivateModal && existingCampaign && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
                  <PowerOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Deactivate {selectedFeeType} Fee Stream?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Immediate suspension of auto-billing and new dues schedule.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Safeguard Protection Notice:</span>
              </p>
              <p className="text-[11px] text-amber-800">
                Auto-calculation will be stopped immediately. Existing dues already issued to students ({associatedDues.length} records) will remain recorded in the ledger for historical audit.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block text-slate-700 font-semibold">
                Reason for Deactivation (Mandatory Audit Trail)
              </label>
              <textarea
                value={deactivationReasonInput}
                onChange={(e) => setDeactivationReasonInput(e.target.value)}
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivation}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Confirm Deactivation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
