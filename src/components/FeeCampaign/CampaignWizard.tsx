import React, { useState } from 'react';
import {
  FeeCampaign,
  MasterFeeHead,
  FeePlan,
  CourseMaster,
  SemesterMaster,
  SubjectMaster,
  LateFeeConfig,
  CampaignMethod,
  StudentDue,
  CampaignCohortDefinition,
  MasterCategory,
  ExcelUploadValidationRow,
} from '../../types/campaign';
import { Student, SchoolStaffUser } from '../../types/fee';
import {
  toPaisa,
  fromPaisa,
  paisaAdd,
  paisaSub,
  paisaMulPercent,
} from '../../utils/paisaMath';
import { safeMatchStrings } from '../../utils/safeHelpers';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  Upload,
  Download,
  Trash2,
  Plus,
  Users,
  Search,
  X,
  FileText,
  Sliders,
  DollarSign,
  HelpCircle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Layers,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  Edit3,
} from 'lucide-react';

interface Props {
  feeHeads: MasterFeeHead[];
  feePlans: FeePlan[];
  courses: CourseMaster[];
  semesters: SemesterMaster[];
  subjects: SubjectMaster[];
  allStudents: Student[];
  staffUsers?: SchoolStaffUser[];
  currentProviderName: string;
  userName: string;
  userRole?: string;
  userEmail?: string;
  onPublishCampaign: (newCampaign: FeeCampaign, studentDues: StudentDue[], draftHeadsToCommit?: MasterFeeHead[]) => void;
  onCancel: () => void;
}

export const CampaignWizard: React.FC<Props> = ({
  feeHeads,
  feePlans,
  courses,
  semesters,
  subjects,
  allStudents,
  staffUsers = [],
  currentProviderName,
  userName,
  userRole = 'admin',
  userEmail = 'admin.office@rlsycollege.ac.in',
  onPublishCampaign,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // STEP 1: Campaign Details, Timeline & Nominated Authority
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [allowPartial, setAllowPartial] = useState(false);
  const [minPartialAmount, setMinPartialAmount] = useState<number>(1000);

  // Late Fee: Optional
  const [lateFeeEnabled, setLateFeeEnabled] = useState(false);
  const [lateFeeType, setLateFeeType] = useState<'FLAT' | 'PER_DAY'>('PER_DAY');
  const [lateFeeAmount, setLateFeeAmount] = useState(50);
  const [lateFeeMaxCap, setLateFeeMaxCap] = useState<number | undefined>(1500);
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState(5);

  // Nominated Staff (Users authorized to modify/extend campaign post-launch)
  const [nominatedStaffEmails, setNominatedStaffEmails] = useState<string[]>([]);
  const [nominatedStaffNames, setNominatedStaffNames] = useState<string[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // STEP 2: Course & Semester Cohort Builder
  const [cohortBuilderMode, setCohortBuilderMode] = useState<'COHORTS' | 'EXCEL'>('COHORTS');
  
  // Active Cohort Inputs in Step 2
  const [cohortCourse, setCohortCourse] = useState<string>(
    courses[0]?.name || courses[0]?.code || 'B.Tech CSE'
  );
  const [cohortSemester, setCohortSemester] = useState<number>(
    semesters[0]?.semesterNumber || 7
  );
  const [cohortPricingMode, setCohortPricingMode] = useState<'plan' | 'custom'>('custom');
  const [cohortPlanId, setCohortPlanId] = useState<string>(feePlans[0]?.id || '');
  const [cohortCustomHeads, setCohortCustomHeads] = useState<
    { headId: string; headName: string; amount: number; isDraft?: boolean }[]
  >([]);

  // Concession / Waiver for Active Cohort
  const [cohortConcessionType, setCohortConcessionType] = useState<'None' | 'Percentage' | 'Flat'>('None');
  const [cohortConcessionValue, setCohortConcessionValue] = useState<number>(0);
  const [cohortConcessionReason, setCohortConcessionReason] = useState<string>('State Merit (Subsidized)');
  const [cohortConcessionCriteria, setCohortConcessionCriteria] = useState<'ALL' | 'FEMALE' | 'CATEGORY_SC_ST' | 'CATEGORY_OBC_EWS'>('ALL');

  // Accumulated Cohorts Added to Audience
  const [addedCohorts, setAddedCohorts] = useState<CampaignCohortDefinition[]>([]);
  const [cohortSuccessNotice, setCohortSuccessNotice] = useState<string | null>(null);

  // Draft Heads created in wizard before launch
  const [draftHeads, setDraftHeads] = useState<MasterFeeHead[]>([]);
  const [showNewHeadModal, setShowNewHeadModal] = useState(false);
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadCategory, setNewHeadCategory] = useState<MasterCategory>('Tuition');
  const [newHeadAmount, setNewHeadAmount] = useState<number>(2000);
  const [newHeadDescription, setNewHeadDescription] = useState('');

  // Option B: Excel Upload (alternate intake mode)
  const [excelRows, setExcelRows] = useState<ExcelUploadValidationRow[]>([]);
  const [excelPasteText, setExcelPasteText] = useState('');
  const [excelFileName, setExcelFileName] = useState<string | null>(null);

  // Validation Error Banner
  const [validationError, setValidationError] = useState<string | null>(null);

  // Active + Draft Fee Heads combined for picker
  const allAvailableHeads = [
    ...feeHeads.filter((h) => !h.isDeleted && h.status === 'Active'),
    ...draftHeads,
  ];

  // Initialize custom heads with default heads if empty
  React.useEffect(() => {
    if (cohortCustomHeads.length === 0 && allAvailableHeads.length > 0) {
      setCohortCustomHeads(
        allAvailableHeads.slice(0, 3).map((h) => ({
          headId: h.id,
          headName: h.name,
          amount: h.defaultAmount,
          isDraft: h.status === 'Draft',
        }))
      );
    }
  }, [allAvailableHeads.length]);

  // Enrolled students matching current cohort course & semester
  const currentCohortEligibleStudents = allStudents.filter((s) => {
    const courseMatch =
      s.course.toLowerCase().includes(cohortCourse.toLowerCase()) ||
      cohortCourse.toLowerCase().includes(s.course.toLowerCase()) ||
      (s.branch && cohortCourse.toLowerCase().includes(s.branch.toLowerCase()));
    const semMatch = s.semester === Number(cohortSemester);
    return courseMatch && semMatch;
  });

  // Calculate Base Fee for Current Cohort in integer Paisa
  const currentCohortBaseFeePaisa =
    cohortPricingMode === 'plan'
      ? toPaisa(feePlans.find((p) => p.id === cohortPlanId)?.totalAmount || 0)
      : cohortCustomHeads.reduce((sum, h) => paisaAdd(sum, toPaisa(h.amount)), 0);

  // Calculate Concession Amount for Current Cohort in integer Paisa
  const calculateCohortConcessionPaisa = (baseFeePaisa: number): number => {
    if (cohortConcessionType === 'None') return 0;
    if (cohortConcessionType === 'Percentage') {
      return paisaMulPercent(baseFeePaisa, cohortConcessionValue);
    }
    return Math.min(baseFeePaisa, toPaisa(cohortConcessionValue));
  };

  const currentCohortConcessionPaisa = calculateCohortConcessionPaisa(currentCohortBaseFeePaisa);
  const currentCohortNetFeePaisa = paisaSub(currentCohortBaseFeePaisa, currentCohortConcessionPaisa, true);

  const currentCohortBaseFee = fromPaisa(currentCohortBaseFeePaisa);
  const currentCohortConcession = fromPaisa(currentCohortConcessionPaisa);
  const currentCohortNetFee = fromPaisa(currentCohortNetFeePaisa);

  // Add / Remove Custom Head in Current Cohort
  const handleAddHeadToCohort = (headId: string) => {
    const found = allAvailableHeads.find((h) => h.id === headId);
    if (!found) return;
    if (cohortCustomHeads.some((ch) => ch.headId === headId)) return;
    setCohortCustomHeads([
      ...cohortCustomHeads,
      {
        headId: found.id,
        headName: found.name,
        amount: found.defaultAmount,
        isDraft: found.status === 'Draft',
      },
    ]);
  };

  const handleRemoveHeadFromCohort = (headId: string) => {
    setCohortCustomHeads(cohortCustomHeads.filter((ch) => ch.headId !== headId));
  };

  const handleUpdateHeadAmountInCohort = (headId: string, amount: number) => {
    setCohortCustomHeads(
      cohortCustomHeads.map((ch) => (ch.headId === headId ? { ...ch, amount } : ch))
    );
  };

  // Create New Fee Head in Draft Mode
  const handleSaveDraftHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeadName.trim()) return;

    const newDraft: MasterFeeHead = {
      id: `HEAD-DRAFT-${Date.now().toString().slice(-6)}`,
      name: newHeadName.trim(),
      defaultAmount: Number(newHeadAmount) || 0,
      description: newHeadDescription.trim() || 'Created during campaign configuration (Draft until launch)',
      category: newHeadCategory,
      status: 'Draft',
      usedCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDraftHeads([...draftHeads, newDraft]);

    // Automatically add to current cohort heads
    setCohortCustomHeads([
      ...cohortCustomHeads,
      {
        headId: newDraft.id,
        headName: newDraft.name,
        amount: newDraft.defaultAmount,
        isDraft: true,
      },
    ]);

    setNewHeadName('');
    setNewHeadAmount(2000);
    setNewHeadDescription('');
    setShowNewHeadModal(false);
  };

  // ADD COHORT TO AUDIENCE
  const handleAddCohortToAudience = () => {
    if (currentCohortBaseFee <= 0) {
      setValidationError('Fee structure must total greater than ₹0 before adding cohort to audience.');
      return;
    }

    const headsSnapshot =
      cohortPricingMode === 'plan'
        ? (feePlans.find((p) => p.id === cohortPlanId)?.heads || []).map((h) => ({
            headId: h.headId,
            headName: h.headName,
            amount: h.amount,
            isDraft: false,
          }))
        : cohortCustomHeads;

    // Check if cohort already added
    const existingIndex = addedCohorts.findIndex(
      (c) => c.course === cohortCourse && c.semester === Number(cohortSemester)
    );

    const studentCount = currentCohortEligibleStudents.length;

    const newCohort: CampaignCohortDefinition = {
      id: `COHORT-${Date.now().toString().slice(-5)}`,
      course: cohortCourse,
      semester: Number(cohortSemester),
      heads: headsSnapshot,
      baseAmount: currentCohortBaseFee,
      concessionType: cohortConcessionType,
      concessionValue: cohortConcessionValue,
      concessionReason: cohortConcessionType !== 'None' ? cohortConcessionReason : undefined,
      concessionCriteria: cohortConcessionCriteria,
      concessionAmount: currentCohortConcession,
      netFeePerStudent: currentCohortNetFee,
      enrolledStudentsCount: studentCount,
      totalCohortExpectedAmount: currentCohortNetFee * studentCount,
      includedRollNos: currentCohortEligibleStudents.map((s) => s.rollNo),
    };

    if (existingIndex >= 0) {
      const updated = [...addedCohorts];
      updated[existingIndex] = newCohort;
      setAddedCohorts(updated);
      setCohortSuccessNotice(
        `Updated existing cohort: ${cohortCourse} Semester ${cohortSemester} (${studentCount} students, ₹${currentCohortNetFee.toLocaleString('en-IN')}/student)`
      );
    } else {
      setAddedCohorts([...addedCohorts, newCohort]);
      setCohortSuccessNotice(
        `Added to audience: ${cohortCourse} Semester ${cohortSemester} (${studentCount} students, ₹${currentCohortNetFee.toLocaleString('en-IN')}/student)`
      );
    }

    setValidationError(null);

    // Auto-advance course / semester to next available option if possible
    const currentCourseIdx = courses.findIndex((c) => (c.name || c.code) === cohortCourse);
    if (currentCourseIdx >= 0 && currentCourseIdx < courses.length - 1) {
      setCohortCourse(courses[currentCourseIdx + 1].name || courses[currentCourseIdx + 1].code);
    }
  };

  const handleRemoveCohort = (cohortId: string) => {
    setAddedCohorts(addedCohorts.filter((c) => c.id !== cohortId));
  };

  // Load existing cohort into editor to adjust fee structure or concession
  const handleEditCohort = (cohort: CampaignCohortDefinition) => {
    setCohortCourse(cohort.course);
    setCohortSemester(cohort.semester);
    setCohortPricingMode('custom');
    setCohortCustomHeads(cohort.heads);
    setCohortConcessionType(cohort.concessionType);
    setCohortConcessionValue(cohort.concessionValue);
    if (cohort.concessionReason) setCohortConcessionReason(cohort.concessionReason);
    if (cohort.concessionCriteria) setCohortConcessionCriteria(cohort.concessionCriteria);
    setCohortSuccessNotice(
      `Loaded "${cohort.course} - Semester ${cohort.semester}" into editor. Adjust fee heads or concession, then click "Update Cohort in Audience".`
    );
  };

  // Check if active course & semester is already added
  const isCohortAlreadyInAudience = addedCohorts.some(
    (c) => c.course === cohortCourse && c.semester === Number(cohortSemester)
  );

  // Staff Nomination Toggle
  const handleToggleNominatedStaff = (staff: SchoolStaffUser) => {
    if (nominatedStaffEmails.includes(staff.email)) {
      setNominatedStaffEmails(nominatedStaffEmails.filter((e) => e !== staff.email));
      setNominatedStaffNames(nominatedStaffNames.filter((n) => n !== staff.name));
    } else {
      setNominatedStaffEmails([...nominatedStaffEmails, staff.email]);
      setNominatedStaffNames([...nominatedStaffNames, staff.name]);
    }
  };

  // STEP 1 VALIDATION
  const handleNextFromStep1 = () => {
    if (!title.trim()) {
      setValidationError('Please enter an official campaign title.');
      return;
    }
    if (!endDate) {
      setValidationError('Campaign deadline (End Date) is mandatory.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setValidationError('End date must be strictly after the campaign start date.');
      return;
    }
    setValidationError(null);
    setCurrentStep(2);
  };

  // STEP 2 VALIDATION
  const handleNextFromStep2 = () => {
    if (cohortBuilderMode === 'COHORTS') {
      if (addedCohorts.length === 0) {
        setValidationError(
          'Please configure at least one Course & Semester cohort and click "Add Cohort to Audience" before proceeding.'
        );
        return;
      }
    } else {
      if (excelRows.filter((r) => r.status === 'Matched').length === 0) {
        setValidationError('No matched student rows found in uploaded Excel roster.');
        return;
      }
    }
    setValidationError(null);
    setCurrentStep(3);
  };

  // Totals across all cohorts
  const totalAudienceStudentsCount =
    cohortBuilderMode === 'COHORTS'
      ? addedCohorts.reduce((sum, c) => sum + c.enrolledStudentsCount, 0)
      : excelRows.filter((r) => r.status === 'Matched').length;

  const totalExpectedCampaignAmount =
    cohortBuilderMode === 'COHORTS'
      ? addedCohorts.reduce((sum, c) => sum + c.totalCohortExpectedAmount, 0)
      : excelRows
          .filter((r) => r.status === 'Matched')
          .reduce((sum, r) => sum + (r.amountOverride || 27400) - (r.concession || 0), 0);

  // LAUNCH / DRAFT SUBMIT HANDLER
  const handleFinalizeCampaign = (status: 'Active' | 'Draft') => {
    const now = new Date().toISOString();
    const campaignId = `CMP-${Date.now().toString().slice(-6)}`;

    // Build Individual StudentDue records
    let dues: StudentDue[] = [];

    const encodeRollForId = (roll: string): string => {
      return (roll || '')
        .trim()
        .replace(/\//g, '_sl_')
        .replace(/-/g, '_hy_')
        .replace(/\./g, '_dt_')
        .replace(/\s+/g, '_sp_')
        .replace(/[^a-zA-Z0-9_]/g, '');
    };

    if (cohortBuilderMode === 'COHORTS') {
      addedCohorts.forEach((cohort, cohortIdx) => {
        const cohCourse = (cohort.course || '').trim().toLowerCase();
        if (!cohCourse) return;

        const matchingStudents = allStudents.filter((s) => {
          const stuCourse = (s.course || '').trim().toLowerCase();
          if (!stuCourse) return false;
          const semMatch = s.semester === cohort.semester;
          if (!semMatch) return false;

          const stuBranch = (s.branch || '').trim().toLowerCase();
          const fullStuCourse = stuBranch ? `${stuCourse} ${stuBranch}` : stuCourse;
          return stuCourse === cohCourse || fullStuCourse === cohCourse;
        });

        matchingStudents.forEach((stu) => {
          // Check specific concession criteria
          let stuConcession = cohort.concessionAmount;
          if (cohort.concessionCriteria === 'FEMALE' && stu.gender !== 'Female') {
            stuConcession = 0;
          } else if (
            cohort.concessionCriteria === 'CATEGORY_SC_ST' &&
            !['SC', 'ST'].includes(stu.category)
          ) {
            stuConcession = 0;
          } else if (
            cohort.concessionCriteria === 'CATEGORY_OBC_EWS' &&
            !['OBC', 'EWS'].includes(stu.category)
          ) {
            stuConcession = 0;
          }

          const baseAmt = Math.max(0, Math.round(cohort.baseAmount));
          const roundConcession = Math.min(baseAmt, Math.max(0, Math.round(stuConcession)));
          const netAmt = Math.max(0, baseAmt - roundConcession);
          
          const safeCohortId = (cohort.id || `C${cohortIdx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
          const safeRollNo = encodeRollForId(stu.rollNo);
          const dueId = `DUE-${campaignId}-${safeCohortId}-${safeRollNo}`;

          // Scale line items so integer sum equals baseAmt
          const lineItems = cohort.heads.map((h) => ({
            headId: h.headId,
            name: h.headName,
            amount: Math.round(h.amount),
          }));
          const headsSum = lineItems.reduce((acc, h) => acc + h.amount, 0);
          const diff = baseAmt - headsSum;
          if (diff !== 0 && lineItems.length > 0) {
            lineItems[lineItems.length - 1].amount += diff;
          }

          dues.push({
            id: dueId,
            campaignId,
            campaignTitle: title.trim(),
            studentId: stu.id,
            studentEmail: stu.email,
            rollNo: stu.rollNo,
            studentName: stu.name,
            course: stu.course,
            semester: stu.semester,
            baseAmount: baseAmt,
            concessionAmount: roundConcession,
            netAmount: netAmt,
            paidAmount: 0,
            balanceAmount: netAmt,
            status: netAmt === 0 ? 'Waived' : 'Pending',
            lineItems,
            lateFeeApplied: 0,
            paymentLink: `https://erp.rlsycollege.ac.in/pay/${dueId}`,
            paymentLinkActive: true,
            dueDate: endDate,
            createdAt: now,
            updatedAt: now,
          });
        });
      });
    } else {
      // Excel mode
      const matched = excelRows.filter((r) => r.status === 'Matched');
      dues = matched.map((r, rIdx) => {
        const found = allStudents.find((s) => safeMatchStrings(s.rollNo, r.rollNo));
        const baseAmt = typeof r.amountOverride === 'number' && !isNaN(r.amountOverride)
          ? Math.max(0, Math.round(r.amountOverride))
          : (typeof r.baseAmount === 'number' && !isNaN(r.baseAmount) ? Math.max(0, Math.round(r.baseAmount)) : 0);
        const concAmt = Math.min(baseAmt, Math.max(0, Math.round(r.concession || 0)));
        const netAmt = Math.max(0, baseAmt - concAmt);
        const safeRollNo = encodeRollForId(r.rollNo);
        const dueId = `DUE-${campaignId}-XLS${rIdx + 1}-${safeRollNo}`;

        return {
          id: dueId,
          campaignId,
          campaignTitle: title.trim(),
          studentId: found?.id,
          studentEmail: found?.email,
          rollNo: r.rollNo,
          studentName: found?.name || r.studentName || 'Student',
          course: found?.course || 'General',
          semester: found?.semester || 1,
          baseAmount: baseAmt,
          concessionAmount: concAmt,
          netAmount: netAmt,
          paidAmount: 0,
          balanceAmount: netAmt,
          status: netAmt === 0 ? 'Waived' : 'Pending',
          lineItems: [
            { headId: 'HEAD-001', name: 'Tuition Fee (Govt Rate)', amount: baseAmt },
          ],
          lateFeeApplied: 0,
          paymentLink: `https://erp.rlsycollege.ac.in/pay/${dueId}`,
          paymentLinkActive: true,
          dueDate: endDate,
          createdAt: now,
          updatedAt: now,
        };
      });
    }

    // Consolidated Heads Snapshot for Campaign Header
    const consolidatedHeads: { headId: string; headName: string; amount: number }[] = [];
    addedCohorts.forEach((c) => {
      c.heads.forEach((h) => {
        if (!consolidatedHeads.some((ch) => ch.headId === h.headId)) {
          consolidatedHeads.push({ headId: h.headId, headName: h.headName, amount: h.amount });
        }
      });
    });

    const newCampaign: FeeCampaign = {
      id: campaignId,
      title: title.trim(),
      description: description.trim() || 'Comprehensive statutory term fee campaign.',
      customHeads: consolidatedHeads.length > 0 ? consolidatedHeads : [{ headId: 'HEAD-001', headName: 'Tuition Fee', amount: 20000 }],
      totalAmount: addedCohorts[0]?.netFeePerStudent || 20000,
      minPartialAmount: allowPartial ? minPartialAmount : undefined,
      startDate,
      endDate,
      lateFee: {
        enabled: lateFeeEnabled,
        type: lateFeeType,
        amount: lateFeeAmount,
        maxCap: lateFeeMaxCap,
        graceDays: lateFeeGraceDays,
      },
      status,
      method: cohortBuilderMode === 'COHORTS' ? 'SELECTION' : 'EXCEL',
      cohorts: addedCohorts,
      nominatedStaffEmails,
      nominatedStaffNames,
      audienceCourses: Array.from(new Set(addedCohorts.map((c) => c.course))),
      studentCount: dues.length,
      totalExpectedAmount: dues.reduce((sum, d) => sum + d.netAmount, 0),
      extensions: [],
      createdAt: now,
      createdBy: `${userRole === 'admin' ? 'Admin' : 'Staff'}: ${userName}`,
      publishedAt: status === 'Active' ? now : undefined,
    };

    onPublishCampaign(newCampaign, dues, draftHeads);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-5xl mx-auto">
      {/* Wizard Header & Stepper */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h1 className="text-base sm:text-lg font-black tracking-tight">Fee Campaign Launch Wizard</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase">
              Modular Cohort Mode
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Configure course-wise fee structures, concessions, and launch multi-semester statutory dues.
          </p>
        </div>

        {/* Stepper Tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white/10 p-1 rounded-xl text-xs font-bold">
          <div
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              currentStep === 1 ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-300'
            }`}
          >
            <span>1</span>
            <span className="hidden sm:inline">Details & Authority</span>
          </div>
          <div
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              currentStep === 2 ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-300'
            }`}
          >
            <span>2</span>
            <span className="hidden sm:inline">Course Cohorts ({addedCohorts.length})</span>
          </div>
          <div
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              currentStep === 3 ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-300'
            }`}
          >
            <span>3</span>
            <span className="hidden sm:inline">Review & Launch</span>
          </div>
        </div>
      </div>

      {/* Validation Error Alert Banner */}
      {validationError && (
        <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-rose-600 hover:text-rose-800 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: CAMPAIGN DETAILS, TIMELINE & NOMINATED STAFF */}
      {currentStep === 1 && (
        <div className="p-4 sm:p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Campaign Title, Timeline & Rules</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-800 font-bold block">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Autumn 2026 Regular Term & Lab Clearance"
                  className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-800 font-bold block">
                  Short Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Official college term fee schedule and clearance rules"
                  className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-800 font-bold block">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-800 font-bold block">
                  Campaign Deadline (End Date) *
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* Late Fee Policy & Partial Payment */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-800">Late Fee Dunning Rule</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={lateFeeEnabled}
                  onChange={(e) => setLateFeeEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span>Enable Late Fine</span>
              </label>
            </div>

            {lateFeeEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="text-slate-600 font-medium block mb-1">Fine Type</label>
                  <select
                    value={lateFeeType}
                    onChange={(e) => setLateFeeType(e.target.value as string)}
                    className="w-full min-h-[40px] p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="PER_DAY">Per Day Rate (₹/day)</option>
                    <option value="FLAT">Flat Surcharge (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-medium block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={lateFeeAmount}
                    onChange={(e) => setLateFeeAmount(Number(e.target.value))}
                    className="w-full min-h-[40px] p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-medium block mb-1">Grace Period (Days)</label>
                  <input
                    type="number"
                    value={lateFeeGraceDays}
                    onChange={(e) => setLateFeeGraceDays(Number(e.target.value))}
                    className="w-full min-h-[40px] p-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-medium block mb-1">Maximum Cap (₹)</label>
                  <input
                    type="number"
                    value={lateFeeMaxCap || ''}
                    onChange={(e) => setLateFeeMaxCap(Number(e.target.value) || undefined)}
                    placeholder="e.g. 1500"
                    className="w-full min-h-[40px] p-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Nominated Staff Governance: Authority to Modify Post-Launch */}
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" />
                  <span>Post-Launch Modification Governance & Admin Nomination</span>
                </h3>
                <p className="text-[11px] text-indigo-800/80">
                  After launch, only Institutional Admin or staff specifically nominated by admin here can modify, extend, or alter this campaign.
                </p>
              </div>

              <span className="text-[11px] font-bold bg-white text-indigo-900 px-2.5 py-1 rounded-lg border border-indigo-200 shrink-0">
                {nominatedStaffEmails.length} Staff Nominated
              </span>
            </div>

            {/* Nominated badges list */}
            {nominatedStaffNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {nominatedStaffNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 bg-white text-indigo-900 border border-indigo-300 px-2.5 py-1 rounded-lg font-bold text-[11px]"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const email = nominatedStaffEmails[i];
                        setNominatedStaffEmails(nominatedStaffEmails.filter((_, idx) => idx !== i));
                        setNominatedStaffNames(nominatedStaffNames.filter((_, idx) => idx !== i));
                      }}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick staff select list */}
            <div className="pt-2">
              <label className="text-slate-700 font-semibold block mb-1">
                Select Accounts Officers or Staff from Directory to Nominate:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                {staffUsers
                  .filter((u) => u.status === 'Active' && u.role !== 'App_Admin')
                  .map((staff) => {
                    const isSelected = nominatedStaffEmails.includes(staff.email);
                    return (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => handleToggleNominatedStaff(staff)}
                        className={`p-2 rounded-lg text-left text-xs border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold'
                            : 'hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="truncate pr-1">
                          <span className="block truncate">{staff.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {staff.designation || staff.role}
                          </span>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Step 1 Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleNextFromStep1}
              className="min-h-[44px] px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>Next: Course Cohort Builder</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: COURSE & SEMESTER COHORT BUILDER (THE REQUESTED FLOW) */}
      {currentStep === 2 && (
        <div className="p-4 sm:p-6 space-y-6 text-xs">
          {/* Top Info & Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Define Fee Structures & Concessions by Course & Semester</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure fee heads and concessions for a course & semester cohort, add to audience, and repeat for additional cohorts.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl font-bold">
              <button
                type="button"
                onClick={() => setCohortBuilderMode('COHORTS')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  cohortBuilderMode === 'COHORTS' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Cohort Selection ({addedCohorts.length})
              </button>
              <button
                type="button"
                onClick={() => setCohortBuilderMode('EXCEL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  cohortBuilderMode === 'EXCEL' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Excel Upload
              </button>
            </div>
          </div>

          {cohortSuccessNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{cohortSuccessNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setCohortSuccessNotice(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {cohortBuilderMode === 'COHORTS' ? (
            <div className="space-y-6">
              {/* CURRENT COHORT CONFIGURATION CARD */}
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-xs">
                      +
                    </span>
                    <h3 className="text-sm font-bold text-indigo-950">
                      Configure Cohort Fee Structure & Concession
                    </h3>
                  </div>

                  <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-indigo-200">
                    {currentCohortEligibleStudents.length} Students Matching Registry
                  </span>
                </div>

                {/* 1. Choose Course & Semester */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">
                      1. Select Academic Course *
                    </label>
                    <select
                      value={cohortCourse}
                      onChange={(e) => setCohortCourse(e.target.value)}
                      className="w-full min-h-[42px] p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.name || c.code}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-800 font-bold block mb-1">
                      2. Select Target Semester *
                    </label>
                    <select
                      value={cohortSemester}
                      onChange={(e) => setCohortSemester(Number(e.target.value))}
                      className="w-full min-h-[42px] p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    >
                      {semesters.map((s) => (
                        <option key={s.id} value={s.semesterNumber}>
                          {s.label || `Semester ${s.semesterNumber}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Define Fee Structure for this Cohort */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        3. Define Fee Heads & Amounts for this Cohort
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Customize statutory heads or choose pre-defined fee plan.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNewHeadModal(true)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Create new head in draft mode until campaign launch"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-600" />
                        <span>+ Create New Head [Save as Draft]</span>
                      </button>

                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setCohortPricingMode('custom')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            cohortPricingMode === 'custom' ? 'bg-white shadow-2xs text-indigo-900' : 'text-slate-600'
                          }`}
                        >
                          Custom Heads
                        </button>
                        <button
                          type="button"
                          onClick={() => setCohortPricingMode('plan')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            cohortPricingMode === 'plan' ? 'bg-white shadow-2xs text-indigo-900' : 'text-slate-600'
                          }`}
                        >
                          Use Plan
                        </button>
                      </div>
                    </div>
                  </div>

                  {cohortPricingMode === 'plan' ? (
                    <div className="space-y-2">
                      <select
                        value={cohortPlanId}
                        onChange={(e) => setCohortPlanId(e.target.value)}
                        className="w-full min-h-[40px] p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                      >
                        {feePlans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - ₹{p.totalAmount.toLocaleString('en-IN')} ({p.heads.length} heads)
                          </option>
                        ))}
                      </select>
                      <div className="p-2.5 bg-slate-50 rounded-lg space-y-1 text-[11px]">
                        {feePlans
                          .find((p) => p.id === cohortPlanId)
                          ?.heads.map((h, idx) => (
                            <div key={idx} className="flex justify-between text-slate-600">
                              <span>{h.headName}</span>
                              <span className="font-mono font-bold">₹{h.amount.toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Heads Editor */}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {cohortCustomHeads.map((ch) => (
                          <div
                            key={ch.headId}
                            className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="font-bold text-slate-800 truncate">{ch.headName}</span>
                              {ch.isDraft && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                                  DRAFT
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-slate-400">₹</span>
                              <input
                                type="number"
                                value={ch.amount}
                                onChange={(e) =>
                                  handleUpdateHeadAmountInCohort(ch.headId, Number(e.target.value))
                                }
                                className="w-24 min-h-[32px] p-1 bg-white border border-slate-300 rounded text-right font-mono font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveHeadFromCohort(ch.headId)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Head Adder Dropdown */}
                      <div className="flex items-center gap-2 pt-1">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddHeadToCohort(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                          className="flex-1 min-h-[36px] p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                        >
                          <option value="" disabled>
                            + Add existing or draft fee head to cohort...
                          </option>
                          {allAvailableHeads
                            .filter((h) => !cohortCustomHeads.some((ch) => ch.headId === h.id))
                            .map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name} ({h.category}) {h.status === 'Draft' ? '[DRAFT]' : ''} - ₹{h.defaultAmount}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-bold">
                    <span className="text-slate-700">Cohort Base Fee Total:</span>
                    <span className="font-mono text-indigo-950 text-sm">
                      ₹{currentCohortBaseFee.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* 3. Define Concession / Waiver for this Cohort */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        4. Concession / Scholarship Waiver (Optional)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Apply government merit waiver, e-Kalyan freeship or quota subsidy.
                      </span>
                    </div>

                    <select
                      value={cohortConcessionType}
                      onChange={(e) => setCohortConcessionType(e.target.value as string)}
                      className="min-h-[36px] p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    >
                      <option value="None">No Concession</option>
                      <option value="Percentage">Percentage Waiver (%)</option>
                      <option value="Flat">Flat Waiver Amount (₹)</option>
                    </select>
                  </div>

                  {cohortConcessionType !== 'None' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-slate-600 font-medium block mb-1">
                          {cohortConcessionType === 'Percentage' ? 'Waiver Percentage (%)' : 'Waiver Amount (₹)'}
                        </label>
                        <input
                          type="number"
                          value={cohortConcessionValue || ''}
                          onChange={(e) => setCohortConcessionValue(Number(e.target.value))}
                          placeholder={cohortConcessionType === 'Percentage' ? 'e.g. 50' : 'e.g. 5000'}
                          className="w-full min-h-[38px] p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 font-medium block mb-1">
                          Concession Scheme / Justification
                        </label>
                        <input
                          type="text"
                          value={cohortConcessionReason}
                          onChange={(e) => setCohortConcessionReason(e.target.value)}
                          placeholder="e.g. State Subsidized Merit"
                          className="w-full min-h-[38px] p-2 bg-slate-50 border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 font-medium block mb-1">
                          Eligibility Criteria
                        </label>
                        <select
                          value={cohortConcessionCriteria}
                          onChange={(e) => setCohortConcessionCriteria(e.target.value)}
                          className="w-full min-h-[38px] p-2 bg-slate-50 border border-slate-300 rounded-lg"
                        >
                          <option value="ALL">All Students in Cohort</option>
                          <option value="FEMALE">Female Students Only</option>
                          <option value="CATEGORY_SC_ST">SC / ST Category Only</option>
                          <option value="CATEGORY_OBC_EWS">OBC / EWS Category Only</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Net Fee preview */}
                  <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">
                      Net Fee per Student: Base (₹{currentCohortBaseFee.toLocaleString('en-IN')}) - Concession (₹{currentCohortConcession.toLocaleString('en-IN')}) =
                    </span>
                    <span className="text-sm font-mono text-emerald-800">
                      ₹{currentCohortNetFee.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* ADD COHORT BUTTON */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-slate-500 text-[11px]">
                    Expected from this cohort: <strong>₹{(currentCohortNetFee * currentCohortEligibleStudents.length).toLocaleString('en-IN')}</strong> ({currentCohortEligibleStudents.length} students)
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCohortToAudience}
                    className="min-h-[44px] px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {isCohortAlreadyInAudience
                        ? 'Update Cohort in Campaign Audience'
                        : 'Add Cohort to Campaign Audience'}
                    </span>
                  </button>
                </div>
              </div>

              {/* LIST OF ACCUMULATED COHORTS IN AUDIENCE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Audience Cohorts Added to Campaign ({addedCohorts.length})</span>
                  </h3>
                  <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    Total: {totalAudienceStudentsCount} Students · ₹{totalExpectedCampaignAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                {addedCohorts.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-1">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700">No cohorts added yet</p>
                    <p className="text-[11px] text-slate-400">
                      Choose a course & semester above and click &quot;Add Cohort to Campaign Audience&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {addedCohorts.map((cohort) => (
                      <div
                        key={cohort.id}
                        className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5 relative"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold text-[10px]">
                                {cohort.course}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                                Sem {cohort.semester}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-900 mt-1 block">
                              {cohort.enrolledStudentsCount} Students Enrolled
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-black text-indigo-950 text-sm block">
                              ₹{cohort.netFeePerStudent.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 block">per student</span>
                          </div>
                        </div>

                        <div className="p-2 bg-slate-50 rounded text-[11px] space-y-1">
                          <div className="flex justify-between text-slate-600">
                            <span>Base Fee:</span>
                            <span className="font-mono">₹{cohort.baseAmount.toLocaleString('en-IN')}</span>
                          </div>
                          {cohort.concessionAmount > 0 && (
                            <div className="flex justify-between text-emerald-700 font-semibold">
                              <span>Concession ({cohort.concessionReason || cohort.concessionType}):</span>
                              <span className="font-mono">-₹{cohort.concessionAmount.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                            <span>Cohort Revenue Expected:</span>
                            <span className="font-mono text-indigo-900">
                              ₹{cohort.totalCohortExpectedAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-400">
                            {cohort.heads.length} fee heads defined
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditCohort(cohort)}
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Load cohort into editor to adjust fee heads or concession"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCohort(cohort.id)}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EXCEL UPLOAD MODE */
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upload Spreadsheet Audience</h3>
                <p className="text-xs text-slate-500">
                  Paste or upload comma-separated or tab-separated student roll numbers.
                </p>
              </div>

              <textarea
                rows={4}
                value={excelPasteText}
                onChange={(e) => setExcelPasteText(e.target.value)}
                placeholder="Paste Roll Numbers (e.g. 2025/BTECH/CSE/001, 2025/BTECH/CSE/002)..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl font-mono text-xs"
              />

              <button
                type="button"
                onClick={() => {
                  const lines = excelPasteText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
                  const parsed = lines.map((r, i) => {
                    const match = allStudents.find((s) => safeMatchStrings(s.rollNo, r));
                    return {
                      rowNumber: i + 1,
                      rollNo: r,
                      studentName: match?.name,
                      status: match ? ('Matched' as const) : ('Not_Found' as const),
                    };
                  });
                  setExcelRows(parsed);
                }}
                className="min-h-[40px] px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs"
              >
                Validate {excelPasteText ? excelPasteText.split(/[\n,]/).filter(Boolean).length : 0} Rows
              </button>

              {excelRows.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-emerald-800">
                    {excelRows.filter((r) => r.status === 'Matched').length} Matched / {excelRows.length} Total
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 2 Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="min-h-[44px] px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Details</span>
            </button>
            <button
              type="button"
              onClick={handleNextFromStep2}
              className="min-h-[44px] px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>Next: Review & Final Launch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: FINAL REVIEW & LAUNCH (SHOWING COURSE, NO OF STUDENTS, FEE PER STUDENT) */}
      {currentStep === 3 && (
        <div className="p-4 sm:p-6 space-y-6 text-xs">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Final Review & Statutory Campaign Verification</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review course cohorts, enrolled student counts, fee payable per student, and draft heads before official launch.
            </p>
          </div>

          {/* Campaign Header Overview */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                Campaign Title
              </span>
              <h3 className="text-base font-black text-slate-900">{title}</h3>
              <p className="text-slate-500 text-xs mt-0.5">{description}</p>
            </div>

            <div className="text-left sm:text-right space-y-0.5">
              <span className="text-xs text-slate-500 block">Collection Period:</span>
              <span className="font-mono font-bold text-slate-800">
                {new Date(startDate).toLocaleDateString()} → {new Date(endDate).toLocaleDateString()}
              </span>
              <span className="text-[10px] text-amber-700 font-semibold block">
                {lateFeeEnabled ? `Late fee ₹${lateFeeAmount} applied after ${lateFeeGraceDays} grace days` : 'No late fine applicable'}
              </span>
            </div>
          </div>

          {/* MAIN REVIEW TABLE: COURSE, NO OF STUDENTS, FEE PER STUDENT */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs">
              Cohort Breakdown & Revenue Target Matrix
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Course / Branch</th>
                    <th className="p-3">Semester</th>
                    <th className="p-3 text-center">No. of Students</th>
                    <th className="p-3 text-right">Base Fee / Student</th>
                    <th className="p-3 text-right">Concession / Student</th>
                    <th className="p-3 text-right font-black text-indigo-950">Net Fee / Student</th>
                    <th className="p-3 text-right">Total Cohort Expected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {cohortBuilderMode === 'COHORTS' ? (
                    addedCohorts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">{c.course}</td>
                        <td className="p-3 font-semibold text-slate-700">Sem {c.semester}</td>
                        <td className="p-3 text-center font-bold text-slate-900">{c.enrolledStudentsCount}</td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          ₹{c.baseAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                          {c.concessionAmount > 0 ? `-₹${c.concessionAmount.toLocaleString('en-IN')}` : '₹0'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-indigo-950 bg-indigo-50/30">
                          ₹{c.netFeePerStudent.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          ₹{c.totalCohortExpectedAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500">
                        Spreadsheet audience roster ({excelRows.filter((r) => r.status === 'Matched').length} matched students)
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <tr>
                    <td colSpan={2} className="p-3 uppercase text-[11px]">
                      Grand Campaign Total
                    </td>
                    <td className="p-3 text-center font-black text-sm text-indigo-950">
                      {totalAudienceStudentsCount} Students
                    </td>
                    <td colSpan={3} className="p-3 text-right text-slate-500 text-[11px]">
                      Total Expected Institutional Target:
                    </td>
                    <td className="p-3 text-right font-mono font-black text-base text-emerald-800">
                      ₹{totalExpectedCampaignAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* DRAFT HEADS STATUS NOTICE */}
          {draftHeads.length > 0 && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Draft Fee Heads Pending Final Commit ({draftHeads.length})</span>
              </div>
              <p className="text-[11px] text-amber-900/80">
                The following newly created fee heads are currently in <strong>Draft mode</strong>. Upon launching this campaign, they will be automatically promoted to <strong>Active Master Fee Heads</strong> and registered into the permanent catalog:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {draftHeads.map((dh) => (
                  <span
                    key={dh.id}
                    className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-900 font-mono"
                  >
                    {dh.name} (₹{dh.defaultAmount}) · [DRAFT → ACTIVE]
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* POST-LAUNCH GOVERNANCE & NOMINATION NOTICE */}
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 text-indigo-950 space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              <span>Post-Launch Modification Governance Notice</span>
            </div>
            <p className="text-[11px] text-indigo-900/80">
              Per institutional security policy, after this campaign is launched, only <strong>Institutional Admin</strong> or the <strong>nominated staff members</strong> ({nominatedStaffNames.length > 0 ? nominatedStaffNames.join(', ') : 'None nominated'}) will be permitted to modify parameters, extend deadlines, or update fee rules.
            </p>
          </div>

          {/* Step 3 Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="min-h-[44px] px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Edit Cohorts</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleFinalizeCampaign('Draft')}
                className="min-h-[44px] px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Save Campaign as Draft
              </button>

              <button
                type="button"
                onClick={() => handleFinalizeCampaign('Active')}
                className="min-h-[44px] px-7 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Confirm & Launch Fee Campaign</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW HEAD IN DRAFT MODE MODAL */}
      {showNewHeadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Create New Statutory Fee Head</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  Saved in Draft Mode until Campaign Launch
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewHeadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDraftHead} className="space-y-3">
              <div>
                <label className="text-slate-800 font-bold block mb-1">Fee Head Name *</label>
                <input
                  type="text"
                  required
                  value={newHeadName}
                  onChange={(e) => setNewHeadName(e.target.value)}
                  placeholder="e.g. Specialized Cloud AI Lab Fee"
                  className="w-full min-h-[40px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-800 font-bold block mb-1">Category *</label>
                  <select
                    value={newHeadCategory}
                    onChange={(e) => setNewHeadCategory(e.target.value as MasterCategory)}
                    className="w-full min-h-[40px] p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Tuition">Tuition</option>
                    <option value="Exam">Exam</option>
                    <option value="Lab">Lab / Workshop</option>
                    <option value="Transport">Transport</option>
                    <option value="Other">Other Statutory</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-800 font-bold block mb-1">Default Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newHeadAmount}
                    onChange={(e) => setNewHeadAmount(Number(e.target.value))}
                    className="w-full min-h-[40px] p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-800 font-bold block mb-1">Description / Purpose</label>
                <input
                  type="text"
                  value={newHeadDescription}
                  onChange={(e) => setNewHeadDescription(e.target.value)}
                  placeholder="Official treasury purpose or laboratory maintenance"
                  className="w-full min-h-[40px] p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="p-2.5 bg-amber-50 rounded-lg text-[11px] text-amber-900 border border-amber-200">
                This fee head will be saved as <strong>Draft</strong> and can be used immediately in your cohorts. It will be officially committed to the Master Fee Heads catalog only when you launch the campaign.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewHeadModal(false)}
                  className="min-h-[38px] px-3.5 py-1.5 text-slate-600 hover:text-slate-900 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-2xs"
                >
                  Save in Draft Mode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
