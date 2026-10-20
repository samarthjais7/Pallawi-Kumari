import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Student, UserSession, SchoolStaffUser, EnrollmentField, StudentQuota, FeeHeadItem, ConcessionSurchargeRule } from '../../types/fee';
import { calculateStudentFeeScheduleServer } from '../../services/serverFeeEngine';
import { fromPaisa } from '../../utils/paisaMath';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ArrowRight,
  Eye,
  X,
  Check,
  AlertTriangle,
  Info,
  Sparkles,
  RotateCcw,
  Users,
  Search,
  BookOpen,
  GraduationCap,
  Layers,
  Save,
  FileCheck,
  Building,
  Sliders,
  Plus,
  Trash2,
  Edit3,
  Settings,
  Award,
  Lock,
  Copy,
} from 'lucide-react';
import { safeLower, safeString } from '../../utils/safeHelpers';

export interface StudentUpdateBatchRecord {
  id: string;
  batchNo: string;
  fileName: string;
  updateMode?: 'course_semester' | 'quota';
  mappedCourse?: string;
  mappedSemester?: number;
  mappedBranch?: string;
  quotaType?: string;
  quotaStatus?: string;
  totalRollNos: number;
  matchedCount: number;
  unmatchedCount: number;
  uploadedAt: string;
  uploadedBy: {
    name: string;
    role: string;
    email: string;
  };
  sampleRollNos: string[];
}

interface ParsedMappingRow {
  rowNumber: number;
  rollNo: string;
  studentName?: string;
  currentCourse?: string;
  currentSemester?: number;
  currentBranch?: string;
  targetCourse: string;
  targetSemester: number;
  targetBranch: string;
  currentQuotaStatus?: string;
  targetQuotaStatus?: string;
  status: 'Matched' | 'Not_Found' | 'Duplicate';
  operationType: 'Semester_Promotion' | 'Course_Transfer' | 'Reaffirmation' | 'Quota_Assignment';
  matchedStudentId?: string;
}

interface Props {
  students: Student[];
  currentSession: UserSession | null;
  staffUsers?: SchoolStaffUser[];
  enrollmentFields?: EnrollmentField[];
  feeHeads?: FeeHeadItem[];
  concessionRules?: ConcessionSurchargeRule[];
  onUpdateEnrollmentFields?: (fields: EnrollmentField[]) => void;
  onBulkUpdateStudents: (updatedStudents: Student[], auditDetails?: string) => void;
}

export const StudentUpdateMenu: React.FC<Props> = ({
  students,
  currentSession,
  staffUsers = [],
  enrollmentFields = [],
  feeHeads = [],
  concessionRules = [],
  onUpdateEnrollmentFields,
  onBulkUpdateStudents,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'roster'>('upload');
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');

  // Admin Permission Check (Only Admin can amend/sync options from Enrollment Field)
  const isAdmin =
    currentSession?.role === 'admin' ||
    currentSession?.staffRole === 'App_Admin' ||
    currentSession?.staffRole === 'Principal_DDO' ||
    Boolean(currentSession?.isAppAdmin);

  // Extract the 3 synchronized fields from the central Enrollment Field Builder
  const courseField = enrollmentFields.find((f) => f.key === 'course');
  const subjectField = enrollmentFields.find((f) => f.key === 'subject' || f.key === 'branch');
  const semesterField = enrollmentFields.find((f) => f.key === 'semester');

  // Fallback defaults
  const defaultCourses = [
    'Bachelor of Technology (Computer Science)',
    'Bachelor of Technology (Civil Engineering)',
    'Bachelor of Technology (Mechanical Engineering)',
    'Bachelor of Technology (Electrical Engineering)',
    'Bachelor of Computer Applications',
    'Bachelor of Commerce (Honours)',
    'Bachelor of Science (Physics & Maths)',
    'Bachelor of Arts (History & Political Science)',
    'Master of Science (Mathematics)',
    'Master of Arts (Economics)',
  ];

  const defaultSubjects = [
    'Computer Science & Engineering',
    'Civil Engineering',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Computer Applications',
    'Commerce & Accounting',
    'Physical Sciences',
    'Humanities',
    'Mathematics',
    'Economics',
  ];

  const defaultSemesters = [
    'Semester 1',
    'Semester 2',
    'Semester 3',
    'Semester 4',
    'Semester 5',
    'Semester 6',
    'Semester 7',
    'Semester 8',
  ];

  // Dynamically derived options synchronized from Enrollment Field Builder
  const availableCourseOptions =
    courseField?.options && courseField.options.length > 0 ? courseField.options : defaultCourses;

  const availableSubjectOptions =
    subjectField?.options && subjectField.options.length > 0 ? subjectField.options : defaultSubjects;

  const availableSemesterOptions =
    semesterField?.options && semesterField.options.length > 0 ? semesterField.options : defaultSemesters;

  // Selected Target Course, Subject & Semester States
  const [targetCourse, setTargetCourse] = useState<string>(availableCourseOptions[0] || defaultCourses[0]);
  const [targetBranch, setTargetBranch] = useState<string>(availableSubjectOptions[0] || defaultSubjects[0]);
  const [targetSemester, setTargetSemester] = useState<number>(7);

  // ================= QUOTA TYPES & PRIVILEGE ASSIGNMENT STATE =================
  // Derived dynamically from Enrollment Field Builder (category 'Category_Quota' or key containing quota/pwd/sports/ncc)
  const quotaFieldsFromEnrollment = enrollmentFields.filter(
    (f) =>
      f.category === 'Category_Quota' ||
      f.key === 'quota' ||
      f.key === 'sports_quota' ||
      f.key === 'physically_handicapped' ||
      f.key.toLowerCase().includes('quota') ||
      f.key.toLowerCase().includes('pwd') ||
      f.key.toLowerCase().includes('ncc')
  );

  const defaultQuotaDefinitions: { key: string; label: string; defaultOptions: string[] }[] = [
    {
      key: 'sports_quota',
      label: 'Sports / NCC Participation Quota',
      defaultOptions: [
        "NCC 'C' Certificate (Alpha Grade)",
        "NCC 'B' Certificate",
        "NCC 'A' Certificate",
        "Active NCC Cadet",
        "National Games Participation",
        "State Championship",
        "District Level",
        "Sports / Cultural Quota",
        "None / Regular",
      ],
    },
    {
      key: 'physically_handicapped',
      label: 'Physically Challenged (PwD Exemption)',
      defaultOptions: [
        'PwD Exemption Granted / Active (Yes)',
        'Not Applicable / Regular (No)',
      ],
    },
    {
      key: 'quota',
      label: 'Admission / Quota Category',
      defaultOptions: [
        'Physically Challenged (PWD)',
        'State Merit (Subsidized)',
        'General',
        'TFW (Tuition Fee Waiver)',
        'SC/ST Post-Matric Freeship',
        'OBC / EWS Freeship',
        'General (Self-Financed)',
        'Sports / Cultural Quota',
        'Management / NRI Quota',
      ],
    },
  ];

  // Merge any dynamic quota fields configured by Admin into list
  const effectiveQuotaFields: { key: string; label: string; defaultOptions: string[] }[] = [
    ...defaultQuotaDefinitions,
  ];
  quotaFieldsFromEnrollment.forEach((qf) => {
    if (!effectiveQuotaFields.some((eq) => eq.key === qf.key)) {
      effectiveQuotaFields.push({
        key: qf.key,
        label: qf.label,
        defaultOptions: qf.options && qf.options.length > 0 ? qf.options : ['Applicable (Yes)', 'Not Applicable (No)'],
      });
    }
  });

  const getOptionsForQuotaField = (key: string): string[] => {
    const fld = enrollmentFields.find((f) => f.key === key);
    if (fld && fld.options && fld.options.length > 0) {
      return fld.options;
    }
    const fallback = effectiveQuotaFields.find((eq) => eq.key === key);
    return fallback?.defaultOptions || ['Applicable (Yes)', 'Not Applicable (No)'];
  };

  // Operation Mode: Course/Semester Promotion vs Quota Status Assignment
  const [updateMode, setUpdateMode] = useState<'course_semester' | 'quota'>('course_semester');
  const [selectedQuotaFieldKey, setSelectedQuotaFieldKey] = useState<string>('sports_quota');
  const availableQuotaStatusOptions = getOptionsForQuotaField(selectedQuotaFieldKey);
  const [selectedQuotaStatus, setSelectedQuotaStatus] = useState<string>(
    availableQuotaStatusOptions[0] || "NCC 'C' Certificate (Alpha Grade)"
  );

  // Sync selectedQuotaStatus when selectedQuotaFieldKey changes
  useEffect(() => {
    const opts = getOptionsForQuotaField(selectedQuotaFieldKey);
    if (opts.length > 0 && !opts.includes(selectedQuotaStatus)) {
      setSelectedQuotaStatus(opts[0]);
    }
  }, [selectedQuotaFieldKey, enrollmentFields]);

  // Sync state if options change
  useEffect(() => {
    if (!availableCourseOptions.includes(targetCourse) && availableCourseOptions.length > 0) {
      setTargetCourse(availableCourseOptions[0]);
    }
  }, [availableCourseOptions]);

  useEffect(() => {
    if (!availableSubjectOptions.includes(targetBranch) && availableSubjectOptions.length > 0) {
      setTargetBranch(availableSubjectOptions[0]);
    }
  }, [availableSubjectOptions]);

  // Helper to parse numeric semester from option text
  const parseSemesterNumber = (semStrOrNum: string | number): number => {
    if (typeof semStrOrNum === 'number') return semStrOrNum;
    const num = parseInt(String(semStrOrNum).replace(/\D/g, ''), 10);
    return isNaN(num) ? 1 : num;
  };

  // ================= ADMIN DROPDOWN MANAGER MODAL STATE =================
  const [showAdminDropdownModal, setShowAdminDropdownModal] = useState(false);
  const [managerActiveTab, setManagerActiveTab] = useState<'course' | 'subject' | 'semester' | 'quota'>('course');
  const [draftCourseOptions, setDraftCourseOptions] = useState<string[]>(availableCourseOptions);
  const [draftSubjectOptions, setDraftSubjectOptions] = useState<string[]>(availableSubjectOptions);
  const [draftSemesterOptions, setDraftSemesterOptions] = useState<string[]>(availableSemesterOptions);
  
  // Admin Quota options definition state
  const [adminSelectedQuotaFieldKey, setAdminSelectedQuotaFieldKey] = useState<string>('sports_quota');
  const [draftQuotaOptions, setDraftQuotaOptions] = useState<string[]>(getOptionsForQuotaField('sports_quota'));
  const [newQuotaTypeName, setNewQuotaTypeName] = useState('');
  const [showAddQuotaTypeInput, setShowAddQuotaTypeInput] = useState(false);

  const [newOptionInput, setNewOptionInput] = useState('');
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const [editingOptionText, setEditingOptionText] = useState('');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Reset draft options whenever modal opens
  const handleOpenAdminModal = (tab: 'course' | 'subject' | 'semester' | 'quota' = 'course') => {
    setManagerActiveTab(tab);
    setDraftCourseOptions([...availableCourseOptions]);
    setDraftSubjectOptions([...availableSubjectOptions]);
    setDraftSemesterOptions([...availableSemesterOptions]);
    setAdminSelectedQuotaFieldKey('sports_quota');
    setDraftQuotaOptions([...getOptionsForQuotaField('sports_quota')]);
    setNewOptionInput('');
    setEditingOptionIndex(null);
    setShowAddQuotaTypeInput(false);
    setNewQuotaTypeName('');
    setShowAdminDropdownModal(true);
  };

  const handleAdminSelectQuotaField = (key: string) => {
    setAdminSelectedQuotaFieldKey(key);
    setDraftQuotaOptions([...getOptionsForQuotaField(key)]);
    setNewOptionInput('');
    setEditingOptionIndex(null);
  };

  // Add Option to Active Draft Tab
  const handleAddOptionToDraft = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;

    if (managerActiveTab === 'course') {
      if (!draftCourseOptions.includes(trimmed)) {
        setDraftCourseOptions([...draftCourseOptions, trimmed]);
      }
    } else if (managerActiveTab === 'subject') {
      if (!draftSubjectOptions.includes(trimmed)) {
        setDraftSubjectOptions([...draftSubjectOptions, trimmed]);
      }
    } else if (managerActiveTab === 'semester') {
      if (!draftSemesterOptions.includes(trimmed)) {
        setDraftSemesterOptions([...draftSemesterOptions, trimmed]);
      }
    } else if (managerActiveTab === 'quota') {
      if (!draftQuotaOptions.includes(trimmed)) {
        setDraftQuotaOptions([...draftQuotaOptions, trimmed]);
      }
    }
    setNewOptionInput('');
  };

  // Remove Option from Draft
  const handleRemoveOptionFromDraft = (index: number) => {
    if (managerActiveTab === 'course') {
      setDraftCourseOptions(draftCourseOptions.filter((_, i) => i !== index));
    } else if (managerActiveTab === 'subject') {
      setDraftSubjectOptions(draftSubjectOptions.filter((_, i) => i !== index));
    } else if (managerActiveTab === 'semester') {
      setDraftSemesterOptions(draftSemesterOptions.filter((_, i) => i !== index));
    } else if (managerActiveTab === 'quota') {
      setDraftQuotaOptions(draftQuotaOptions.filter((_, i) => i !== index));
    }
  };

  // Save Inline Edit for an Option
  const handleSaveOptionEdit = (index: number) => {
    const trimmed = editingOptionText.trim();
    if (!trimmed) {
      setEditingOptionIndex(null);
      return;
    }
    if (managerActiveTab === 'course') {
      const copy = [...draftCourseOptions];
      copy[index] = trimmed;
      setDraftCourseOptions(copy);
    } else if (managerActiveTab === 'subject') {
      const copy = [...draftSubjectOptions];
      copy[index] = trimmed;
      setDraftSubjectOptions(copy);
    } else if (managerActiveTab === 'semester') {
      const copy = [...draftSemesterOptions];
      copy[index] = trimmed;
      setDraftSemesterOptions(copy);
    } else if (managerActiveTab === 'quota') {
      const copy = [...draftQuotaOptions];
      copy[index] = trimmed;
      setDraftQuotaOptions(copy);
    }
    setEditingOptionIndex(null);
  };

  // Commit and Synchronize with Platform Enrollment Field Builder
  const handleSaveAndSyncWithEnrollmentField = () => {
    if (!onUpdateEnrollmentFields) {
      setSyncNotice('Enrollment fields sync handler not connected.');
      return;
    }

    let foundQuotaField = false;
    const updatedFields: EnrollmentField[] = enrollmentFields.map((fld) => {
      if (fld.key === 'course') {
        return { ...fld, options: draftCourseOptions };
      }
      if (fld.key === 'subject' || fld.key === 'branch') {
        return { ...fld, options: draftSubjectOptions };
      }
      if (fld.key === 'semester') {
        return { ...fld, options: draftSemesterOptions };
      }
      if (fld.key === adminSelectedQuotaFieldKey) {
        foundQuotaField = true;
        return { ...fld, options: draftQuotaOptions };
      }
      return fld;
    });

    // If quota field didn't exist in enrollmentFields, ensure it is inserted
    if (!foundQuotaField) {
      const def = effectiveQuotaFields.find((eq) => eq.key === adminSelectedQuotaFieldKey);
      updatedFields.push({
        id: `fld-${adminSelectedQuotaFieldKey}`,
        key: adminSelectedQuotaFieldKey,
        label: def?.label || adminSelectedQuotaFieldKey,
        type: 'select',
        options: draftQuotaOptions,
        defaultValue: draftQuotaOptions[0] || '',
        isRequired: false,
        isSystemField: false,
        isActive: true,
        category: 'Category_Quota',
      });
    }

    // If course, subject, or semester didn't exist in enrollmentFields, ensure they are inserted
    if (!updatedFields.some((f) => f.key === 'course')) {
      updatedFields.push({
        id: 'fld-course',
        key: 'course',
        label: 'Course / Academic Degree Program',
        type: 'select',
        options: draftCourseOptions,
        defaultValue: draftCourseOptions[0] || '',
        isRequired: true,
        isSystemField: true,
        isActive: true,
        category: 'Academic',
      });
    }

    if (!updatedFields.some((f) => f.key === 'subject' || f.key === 'branch')) {
      updatedFields.push({
        id: 'fld-subject',
        key: 'subject',
        label: 'Academic Subject / Branch Specialization',
        type: 'select',
        options: draftSubjectOptions,
        defaultValue: draftSubjectOptions[0] || '',
        isRequired: true,
        isSystemField: true,
        isActive: true,
        category: 'Academic',
      });
    }

    if (!updatedFields.some((f) => f.key === 'semester')) {
      updatedFields.push({
        id: 'fld-semester',
        key: 'semester',
        label: 'Academic Semester Stage',
        type: 'select',
        options: draftSemesterOptions,
        defaultValue: draftSemesterOptions[0] || '',
        isRequired: true,
        isSystemField: true,
        isActive: true,
        category: 'Academic',
      });
    }

    onUpdateEnrollmentFields(updatedFields);
    setShowAdminDropdownModal(false);
    setSyncNotice(
      'Successfully updated options in Enrollment Field Builder! Dropdowns in Student Update Menu and platform are now synchronized.'
    );
    setTimeout(() => setSyncNotice(null), 5000);
  };

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsedFileName, setParsedFileName] = useState('');
  const [parsedFileSize, setParsedFileSize] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Textarea Paste State
  const [pasteText, setPasteText] = useState('');

  // Parsed Mapping Rows
  const [parsedRows, setParsedRows] = useState<ParsedMappingRow[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Matched' | 'Not_Found'>('ALL');

  // Success Notice
  const [updateSuccessNotice, setUpdateSuccessNotice] = useState<string | null>(null);

  // Batch History State backed by persistent localStorage
  const STORAGE_KEY_BATCH = 'rlsy_student_update_batches';
  const [batchHistory, setBatchHistory] = useState<StudentUpdateBatchRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BATCH);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [
      {
        id: 'BATCH-MAP-2026-01',
        batchNo: 'BATCH/STU-UPD/2026/001',
        fileName: 'CSE_Sem7_Promotion_List.xlsx',
        mappedCourse: 'Bachelor of Technology (Computer Science)',
        mappedSemester: 7,
        mappedBranch: 'Computer Science & Engineering',
        totalRollNos: 4,
        matchedCount: 4,
        unmatchedCount: 0,
        uploadedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        uploadedBy: {
          name: currentSession?.name || 'R. N. Sharma (Accounts Officer)',
          role: currentSession?.staffRole || 'Accounts_Officer',
          email: currentSession?.email || currentSession?.emailOrPhone || 'officer@rlsycollege.ac.in',
        },
        sampleRollNos: ['2025/BTECH/CSE/001', '2025/BTECH/CSE/002'],
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BATCH, JSON.stringify(batchHistory));
    } catch {
      // ignore
    }
  }, [batchHistory]);

  // Update targetBranch automatically when targetCourse changes if related subject found
  const handleCourseChange = (courseName: string) => {
    setTargetCourse(courseName);
    const lowerCourse = courseName.toLowerCase();
    const matched = availableSubjectOptions.find((sub) => {
      const lowerSub = sub.toLowerCase();
      if (lowerCourse.includes('computer') && lowerSub.includes('computer')) return true;
      if (lowerCourse.includes('civil') && lowerSub.includes('civil')) return true;
      if (lowerCourse.includes('mechanical') && lowerSub.includes('mechanical')) return true;
      if (lowerCourse.includes('electrical') && lowerSub.includes('electrical')) return true;
      if (lowerCourse.includes('commerce') && lowerSub.includes('commerce')) return true;
      if (lowerCourse.includes('applications') && lowerSub.includes('applications')) return true;
      if (lowerCourse.includes('science') && lowerSub.includes('physical sciences')) return true;
      if (lowerCourse.includes('arts') && lowerSub.includes('humanities')) return true;
      return false;
    });
    if (matched) {
      setTargetBranch(matched);
    }
  };

  // Re-evaluate mapping rows whenever targetCourse, targetSemester or quota selection changes
  const reconcileRows = (
    extractedItems: { rollNo: string; courseOverride?: string; semOverride?: number; branchOverride?: string }[]
  ): ParsedMappingRow[] => {
    const seenRolls = new Set<string>();

    return extractedItems.map((item, idx) => {
      const cleanRoll = item.rollNo.trim();
      const normRoll = cleanRoll.toUpperCase();
      const isDuplicate = seenRolls.has(normRoll);
      seenRolls.add(normRoll);

      const matched = students.find(
        (s) => s.rollNo.trim().toUpperCase() === normRoll
      );

      const effectiveTargetCourse = item.courseOverride || targetCourse;
      const effectiveTargetSem = item.semOverride || targetSemester;
      const effectiveTargetBranch = item.branchOverride || targetBranch;

      let currentQuotaStatus = 'None / Regular';
      if (matched) {
        if (selectedQuotaFieldKey === 'physically_handicapped') {
          currentQuotaStatus = (matched.customFields?.physically_handicapped || matched.quota === 'Physically Challenged (PWD)')
            ? 'PwD Active (Granted)'
            : 'Not Applicable (Regular)';
        } else if (selectedQuotaFieldKey === 'sports_quota') {
          currentQuotaStatus = (matched.customFields?.sports_quota && matched.customFields?.sports_quota !== 'None')
            ? matched.customFields.sports_quota
            : 'None / Regular';
        } else if (selectedQuotaFieldKey === 'quota') {
          currentQuotaStatus = matched.quota || 'State Merit (Subsidized)';
        } else {
          currentQuotaStatus = String(matched.customFields?.[selectedQuotaFieldKey] || 'None / Not Set');
        }
      }

      if (isDuplicate) {
        return {
          rowNumber: idx + 1,
          rollNo: cleanRoll,
          studentName: matched ? `${matched.name} (Duplicate in Sheet)` : 'Duplicate Entry in Sheet',
          currentCourse: matched?.course,
          currentSemester: matched?.semester,
          currentBranch: matched?.branch,
          targetCourse: effectiveTargetCourse,
          targetSemester: effectiveTargetSem,
          targetBranch: effectiveTargetBranch,
          currentQuotaStatus,
          targetQuotaStatus: selectedQuotaStatus,
          status: 'Duplicate',
          operationType: 'Reaffirmation',
          matchedStudentId: matched?.id,
        };
      }

      if (matched) {
        let opType: ParsedMappingRow['operationType'] = 'Reaffirmation';
        if (updateMode === 'quota') {
          opType = 'Quota_Assignment';
        } else if (matched.semester !== effectiveTargetSem) {
          opType = 'Semester_Promotion';
        } else if (matched.course !== effectiveTargetCourse) {
          opType = 'Course_Transfer';
        }

        return {
          rowNumber: idx + 1,
          rollNo: matched.rollNo,
          studentName: matched.name,
          currentCourse: matched.course,
          currentSemester: matched.semester,
          currentBranch: matched.branch,
          targetCourse: effectiveTargetCourse,
          targetSemester: effectiveTargetSem,
          targetBranch: effectiveTargetBranch,
          currentQuotaStatus,
          targetQuotaStatus: selectedQuotaStatus,
          status: 'Matched',
          operationType: opType,
          matchedStudentId: matched.id,
        };
      }

      return {
        rowNumber: idx + 1,
        rollNo: cleanRoll || 'UNKNOWN',
        studentName: 'Student Record Not Found in ERP',
        targetCourse: effectiveTargetCourse,
        targetSemester: effectiveTargetSem,
        targetBranch: effectiveTargetBranch,
        currentQuotaStatus: 'N/A',
        targetQuotaStatus: selectedQuotaStatus,
        status: 'Not_Found',
        operationType: updateMode === 'quota' ? 'Quota_Assignment' : 'Reaffirmation',
      };
    });
  };

  // Handle Excel File Parsing
  const handleFileUpload = (file: File) => {
    setParseError(null);
    setIsProcessing(true);
    setParsedFileName(file.name);
    setParsedFileSize((file.size / 1024).toFixed(1) + ' KB');

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json<{ [key: string]: string | number }>(worksheet, { defval: '' });

        if (!jsonRows || jsonRows.length === 0) {
          setParseError('The uploaded spreadsheet is empty. Please upload an Excel or CSV file containing student roll numbers.');
          setIsProcessing(false);
          return;
        }

        const extracted: { rollNo: string; courseOverride?: string; semOverride?: number; branchOverride?: string }[] = [];

        for (const row of jsonRows) {
          let roll = '';
          let cOverride: string | undefined;
          let sOverride: number | undefined;
          let bOverride: string | undefined;

          for (const key of Object.keys(row)) {
            const normKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            if (['rollno', 'rollnumber', 'roll', 'enrollmentno', 'studentrollno', 'studentroll'].includes(normKey)) {
              roll = String(row[key]).trim();
            }
            if (['course', 'degree', 'targetcourse', 'mappedcourse'].includes(normKey) && row[key]) {
              cOverride = String(row[key]).trim();
            }
            if (['semester', 'targetsemester', 'sem', 'targetsem'].includes(normKey) && row[key]) {
              const num = parseInt(String(row[key]), 10);
              if (!isNaN(num)) sOverride = num;
            }
            if (['branch', 'subject', 'specialization'].includes(normKey) && row[key]) {
              bOverride = String(row[key]).trim();
            }
          }

          if (roll) {
            extracted.push({
              rollNo: roll,
              courseOverride: cOverride,
              semOverride: sOverride,
              branchOverride: bOverride,
            });
          }
        }

        if (extracted.length === 0) {
          setParseError('Could not find a valid "Roll No" column in spreadsheet. Please verify headers or download our official sample template.');
          setIsProcessing(false);
          return;
        }

        const processed = reconcileRows(extracted);
        setParsedRows(processed);
        setIsProcessing(false);
      } catch (err) {
        console.error('Spreadsheet parse error:', err);
        setParseError('Failed to parse spreadsheet. Please ensure it is a valid .xlsx or .csv document.');
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setParseError('Failed to read file from local storage.');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle Textarea Paste Validation
  const handleParsePastedRolls = () => {
    setParseError(null);
    if (!pasteText.trim()) {
      setParseError('Please paste student roll numbers first.');
      return;
    }

    const lines = pasteText
      .split(/[\n,\t;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (lines.length === 0) {
      setParseError('No valid roll numbers identified in pasted text.');
      return;
    }

    setParsedFileName(`Pasted_Roster_${lines.length}_Students.txt`);
    setParsedFileSize(`${(pasteText.length / 1024).toFixed(1)} KB`);

    const extracted = lines.map((r) => ({ rollNo: r }));
    const processed = reconcileRows(extracted);
    setParsedRows(processed);
  };

  // Download Sample Excel Template
  const handleDownloadSampleTemplate = () => {
    if (updateMode === 'quota') {
      const quotaFieldLabel =
        effectiveQuotaFields.find((q) => q.key === selectedQuotaFieldKey)?.label ||
        selectedQuotaFieldKey;

      const sampleRows = students.slice(0, 8).map((s) => ({
        'Roll No': s.rollNo,
        'Student Name': s.name,
        'Course': s.course,
        'Current Quota / Status':
          selectedQuotaFieldKey === 'physically_handicapped'
            ? (s.customFields?.physically_handicapped ? 'PwD Active' : 'Regular')
            : selectedQuotaFieldKey === 'sports_quota'
            ? (s.customFields?.sports_quota || 'None')
            : s.quota,
        'Target Quota Status': selectedQuotaStatus,
        'Remarks': `Assigned via Accountant Intake (${quotaFieldLabel})`,
      }));

      const worksheet = XLSX.utils.json_to_sheet(sampleRows);
      worksheet['!cols'] = [
        { wch: 22 }, // Roll No
        { wch: 26 }, // Student Name
        { wch: 32 }, // Course
        { wch: 26 }, // Current Status
        { wch: 32 }, // Target Status
        { wch: 35 }, // Remarks
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Quota_Roll_List');
      XLSX.writeFile(
        workbook,
        `RLSY_Student_${selectedQuotaFieldKey.toUpperCase()}_Quota_Assignment_Template.xlsx`
      );
      return;
    }

    // Generate real student sample rows
    const sampleRows = students.slice(0, 8).map((s, idx) => ({
      'Roll No': s.rollNo,
      'Student Name': s.name,
      'Target Course': targetCourse,
      'Target Semester': targetSemester,
      'Branch / Subject': targetBranch,
      'Remarks': idx === 0 ? 'Official Semester Regular Mapping' : 'Session Promotion',
    }));

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 22 }, // Roll No
      { wch: 26 }, // Student Name
      { wch: 36 }, // Target Course
      { wch: 18 }, // Target Semester
      { wch: 30 }, // Branch / Subject
      { wch: 35 }, // Remarks
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roll_Mapping');
    XLSX.writeFile(workbook, 'RLSY_Student_Course_Semester_Mapping_Template.xlsx');
  };

  // Execute Profile Updates
  const handleApplyProfileUpdates = () => {
    const matchedRows = parsedRows.filter((r) => r.status === 'Matched');
    if (matchedRows.length === 0) {
      setParseError('No matched student records available to update.');
      return;
    }

    const now = new Date().toISOString();
    const updatedStudentsList: Student[] = [];

    if (updateMode === 'quota') {
      const quotaFieldLabel =
        effectiveQuotaFields.find((q) => q.key === selectedQuotaFieldKey)?.label ||
        selectedQuotaFieldKey;

      students.forEach((existing) => {
        const matchInParsed = matchedRows.find(
          (r) => r.rollNo.toUpperCase() === existing.rollNo.toUpperCase()
        );

        if (matchInParsed) {
          let updatedStu: Student = { ...existing };
          if (selectedQuotaFieldKey === 'physically_handicapped') {
            const normStatus = selectedQuotaStatus.trim().toLowerCase();
            const isGranted = (normStatus === 'yes' || normStatus === 'granted' || normStatus === 'active' || normStatus === 'approved') && !normStatus.startsWith('not');
            
            const originalQuota = (updatedStu.customFields?.originalQuota as StudentQuota) || 
              (updatedStu.quota !== 'Physically Challenged (PWD)' ? updatedStu.quota : 'General');

            updatedStu = {
              ...updatedStu,
              quota: isGranted ? 'Physically Challenged (PWD)' : originalQuota,
              customFields: {
                ...(updatedStu.customFields || {}),
                physically_handicapped: isGranted,
                originalQuota: isGranted ? originalQuota : undefined,
              },
            };
          } else if (selectedQuotaFieldKey === 'sports_quota') {
            updatedStu = {
              ...updatedStu,
              customFields: {
                ...(updatedStu.customFields || {}),
                sports_quota: selectedQuotaStatus,
              },
            };
          } else if (selectedQuotaFieldKey === 'quota') {
            updatedStu = {
              ...updatedStu,
              quota: selectedQuotaStatus as StudentQuota,
            };
          } else {
            updatedStu = {
              ...updatedStu,
              customFields: {
                ...(updatedStu.customFields || {}),
                [selectedQuotaFieldKey]: selectedQuotaStatus,
              },
            };
          }

          // Automatically recalculate student fee schedule to prevent ledger drift
          if (feeHeads && feeHeads.length > 0 && concessionRules) {
            const calc = calculateStudentFeeScheduleServer(updatedStu, feeHeads, concessionRules);
            const newTotal = fromPaisa(calc.totalFeePaisa);
            const paid = updatedStu.paidFee || 0;
            updatedStu.totalFee = newTotal;
            updatedStu.pendingFee = Math.max(0, newTotal - paid);
          }

          updatedStudentsList.push(updatedStu);
        }
      });

      const auditMessage = `Accountant (${currentSession?.name || 'Authorized Staff'}) executed Quota Excel batch update: assigned "${selectedQuotaStatus}" under ${quotaFieldLabel} to ${matchedRows.length} student profile(s).`;

      onBulkUpdateStudents(updatedStudentsList, auditMessage);

      // Save quota batch record to history
      const newHistoryRecord: StudentUpdateBatchRecord = {
        id: `BATCH-QUOTA-${Date.now()}`,
        batchNo: `BATCH/QUOTA-UPD/${new Date().getFullYear()}/${String(batchHistory.length + 1).padStart(3, '0')}`,
        fileName: parsedFileName || 'Quota_Roll_List.xlsx',
        updateMode: 'quota',
        quotaType: quotaFieldLabel,
        quotaStatus: selectedQuotaStatus,
        totalRollNos: parsedRows.length,
        matchedCount: matchedRows.length,
        unmatchedCount: parsedRows.filter((r) => r.status !== 'Matched').length,
        uploadedAt: now,
        uploadedBy: {
          name: currentSession?.name || 'Accounts Officer',
          role: currentSession?.staffRole || 'Accounts_Officer',
          email: currentSession?.email || currentSession?.emailOrPhone || 'officer@rlsycollege.ac.in',
        },
        sampleRollNos: matchedRows.slice(0, 3).map((r) => r.rollNo),
      };

      setBatchHistory([newHistoryRecord, ...batchHistory]);
      setUpdateSuccessNotice(
        `Successfully updated ${quotaFieldLabel} status to "${selectedQuotaStatus}" for ${matchedRows.length} students! Records and fee ledgers synchronized.`
      );
    } else {
      // Course & Semester promotion
      students.forEach((existing) => {
        const matchInParsed = matchedRows.find(
          (r) => r.rollNo.toUpperCase() === existing.rollNo.toUpperCase()
        );

        if (matchInParsed) {
          const rawSem = Number(matchInParsed.targetSemester) || 1;
          const validSemester = Math.min(12, Math.max(1, rawSem));

          const updatedStu: Student = {
            ...existing,
            course: matchInParsed.targetCourse,
            semester: validSemester,
            branch: matchInParsed.targetBranch,
            year: Math.min(5, Math.max(1, Math.ceil(validSemester / 2))),
          };

          // Recompute fees for the new course / semester
          if (feeHeads && feeHeads.length > 0 && concessionRules) {
            const calc = calculateStudentFeeScheduleServer(updatedStu, feeHeads, concessionRules);
            const newTotal = fromPaisa(calc.totalFeePaisa);
            const paid = updatedStu.paidFee || 0;
            updatedStu.totalFee = newTotal;
            updatedStu.pendingFee = Math.max(0, newTotal - paid);
          }

          updatedStudentsList.push(updatedStu);
        }
      });

      const auditMessage = `Accountant (${currentSession?.name || 'Authorized Staff'}) executed Excel batch update: mapped ${matchedRows.length} student profile(s) to Course: "${targetCourse}" and Semester: ${targetSemester}.`;

      onBulkUpdateStudents(updatedStudentsList, auditMessage);

      // Save batch record to history
      const newHistoryRecord: StudentUpdateBatchRecord = {
        id: `BATCH-MAP-${Date.now()}`,
        batchNo: `BATCH/STU-UPD/${new Date().getFullYear()}/${String(batchHistory.length + 1).padStart(3, '0')}`,
        fileName: parsedFileName || 'Pasted_Roster.xlsx',
        updateMode: 'course_semester',
        mappedCourse: targetCourse,
        mappedSemester: targetSemester,
        mappedBranch: targetBranch,
        totalRollNos: parsedRows.length,
        matchedCount: matchedRows.length,
        unmatchedCount: parsedRows.filter((r) => r.status !== 'Matched').length,
        uploadedAt: now,
        uploadedBy: {
          name: currentSession?.name || 'Accounts Officer',
          role: currentSession?.staffRole || 'Accounts_Officer',
          email: currentSession?.email || currentSession?.emailOrPhone || 'officer@rlsycollege.ac.in',
        },
        sampleRollNos: matchedRows.slice(0, 3).map((r) => r.rollNo),
      };

      setBatchHistory([newHistoryRecord, ...batchHistory]);
      setUpdateSuccessNotice(
        `Successfully updated profile data for ${matchedRows.length} students! Mapped to ${targetCourse} (Semester ${targetSemester}) with synchronized fee ledgers.`
      );
    }

    // Clear parsed items
    setParsedRows([]);
    setPasteText('');
    setParsedFileName('');
  };

  // Metrics
  const matchedCount = parsedRows.filter((r) => r.status === 'Matched').length;
  const unmatchedCount = parsedRows.filter((r) => r.status !== 'Matched').length;
  const filteredRows = parsedRows.filter((r) => {
    const q = safeLower(searchFilter);
    const matchesSearch =
      safeLower(r.rollNo).includes(q) ||
      (r.studentName && safeLower(r.studentName).includes(q));
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Title Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Student Update Menu
              </h1>
              <p className="text-xs text-slate-500">
                Accountant portal to upload Excel roster of student Roll Numbers and bulk-map them to specific Courses & Semesters, updating their official student profile records.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload' ? 'bg-white text-indigo-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload & Map</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-indigo-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Update History ({batchHistory.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'roster' ? 'bg-white text-indigo-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Course Roster ({students.length})</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {updateSuccessNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-950 font-semibold flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{updateSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setUpdateSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sync Success Notice */}
      {syncNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statutory Restriction Advisory Banner */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-700">
        <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-900 block">
            Statutory Student Profile Governance:
          </span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Per university statutory policy, registered students do not have the right to amend their core mandatory profile parameters (<strong>Roll No, Name, Date of Birth, Father's Name, Course, Subject, Semester, Gender, Caste</strong>).
            All academic migrations, semester promotions, and course roster assignments are managed authoritatively here by the <strong>Accounts Office / Academic Administration</strong>.
          </p>
        </div>
      </div>

      {/* TAB 1: UPLOAD & MAP ROSTER */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* OPERATION MODE SELECTOR */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Select Update Operation Mode
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Official Student Update Engine
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setUpdateMode('course_semester');
                  if (parsedRows.length > 0) {
                    setParsedRows(reconcileRows(parsedRows.map((r) => ({ rollNo: r.rollNo }))));
                  }
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  updateMode === 'course_semester'
                    ? 'bg-indigo-50/70 border-indigo-400 shadow-xs ring-1 ring-indigo-400'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  updateMode === 'course_semester' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                }`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">
                      1. Course, Subject &amp; Semester Promotion
                    </span>
                    {updateMode === 'course_semester' && (
                      <span className="px-1.5 py-0.2 rounded-full bg-indigo-200 text-indigo-900 text-[9px] font-black">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Map roll numbers to course degree, subject specialization, and academic semester progression.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUpdateMode('quota');
                  if (parsedRows.length > 0) {
                    setParsedRows(reconcileRows(parsedRows.map((r) => ({ rollNo: r.rollNo }))));
                  }
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  updateMode === 'quota'
                    ? 'bg-emerald-50/70 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  updateMode === 'quota' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">
                      2. Quota &amp; Privilege Status Assignment
                    </span>
                    {updateMode === 'quota' && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 text-[9px] font-black">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Choose quota type (PwD, NCC, Sports, etc.), upload Excel Roll Numbers, and bulk-update official quota statuses.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* STEP 1: DEFINE TARGET DESTINATION / QUOTA PRIVILEGE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full text-white font-black flex items-center justify-center text-xs ${
                  updateMode === 'quota' ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}>
                  1
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {updateMode === 'quota'
                      ? 'Choose Quota Type & Privilege Status to Assign'
                      : 'Select Target Academic Course, Subject & Semester'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {updateMode === 'quota'
                      ? 'Select the quota type and the target status/privilege to map across uploaded roll numbers.'
                      : 'Dropdown options are synchronized with the central Enrollment Field Builder schema.'}
                  </p>
                </div>
              </div>

              {/* Admin Right to Select / Amend Options */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleOpenAdminModal(updateMode === 'quota' ? 'quota' : 'course')}
                  className="min-h-[38px] px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
                  title="Administrator: Select or amend available options in Enrollment Field to update dropdowns"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-300" />
                  <span>{updateMode === 'quota' ? 'Admin: Define Quota Types & Options' : 'Admin: Amend Dropdown Options'}</span>
                </button>
              )}
            </div>

            {/* CONDITIONAL STEP 1 BODY: QUOTA MODE VS COURSE/SEMESTER MODE */}
            {updateMode === 'quota' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 1. Choose Quota Type */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-800 font-bold block flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      <span>1. Choose Quota Type *</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                      From Enrollment Fields
                    </span>
                  </div>
                  <select
                    value={selectedQuotaFieldKey}
                    onChange={(e) => setSelectedQuotaFieldKey(e.target.value)}
                    className="w-full min-h-[42px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {effectiveQuotaFields.map((q) => (
                      <option key={q.key} value={q.key}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Selects which enrollment field/quota parameter will be updated on uploaded students.
                  </span>
                </div>

                {/* 2. Choose Target Quota Status to Assign */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-800 font-bold block flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>2. Target Quota Status to Assign *</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                      {availableQuotaStatusOptions.length} Status Options
                    </span>
                  </div>
                  <select
                    value={selectedQuotaStatus}
                    onChange={(e) => setSelectedQuotaStatus(e.target.value)}
                    className="w-full min-h-[42px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableQuotaStatusOptions.map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    The chosen status will be committed to all matched Roll Numbers upon intake.
                  </span>
                </div>
              </div>
            ) : (
              /* THREE DROPDOWN CONTROLS: COURSE, SUBJECT, SEMESTER */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {/* 1. Target Course Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-800 font-bold block">
                      1. Target Academic Course *
                    </label>
                    <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                      {availableCourseOptions.length} Options
                    </span>
                  </div>
                  <select
                    value={targetCourse}
                    onChange={(e) => setTargetCourse(e.target.value)}
                    className="w-full min-h-[42px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableCourseOptions.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Target Subject Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-800 font-bold block">
                      2. Target Academic Subject / Branch *
                    </label>
                    <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                      {availableSubjectOptions.length} Options
                    </span>
                  </div>
                  <select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="w-full min-h-[42px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableSubjectOptions.map((sub, i) => (
                      <option key={i} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Target Semester Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-800 font-bold block">
                      3. Target Academic Semester *
                    </label>
                    <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                      {availableSemesterOptions.length} Options
                    </span>
                  </div>
                  <select
                    value={targetSemester}
                    onChange={(e) => setTargetSemester(parseSemesterNumber(e.target.value))}
                    className="w-full min-h-[42px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableSemesterOptions.map((semStr, i) => {
                      const sNum = parseSemesterNumber(semStr);
                      return (
                        <option key={i} value={sNum}>
                          {semStr.toLowerCase().startsWith('semester') ? semStr : `Semester ${semStr}`} (Year {Math.ceil(sNum / 2)})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            {/* Sync Information Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Synced with Enrollment Field Builder
                </span>
                <span className="text-slate-500">
                  {updateMode === 'quota'
                    ? 'Admin defines quota types and options in enrollment fields; Accountant executes roll number update.'
                    : 'Platform sync guarantees consistency between Student Admission, Fee Heads Master & Mapping Roster.'}
                </span>
              </div>

              {!isAdmin && (
                <span className="text-slate-400 italic">
                  Quota types and options configured by College Administrator
                </span>
              )}
            </div>
          </div>

          {/* STEP 2: SPREADSHEET INTAKE / QUICK PASTE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-xs">
                  2
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Upload Excel Spreadsheet or Paste Roll Numbers
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="min-h-[38px] px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download standard Excel template with pre-filled student roll numbers"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Download Excel Template</span>
                </button>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      inputMode === 'file' ? 'bg-white shadow-2xs text-indigo-950 font-bold' : 'text-slate-600'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('paste')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      inputMode === 'paste' ? 'bg-white shadow-2xs text-indigo-950 font-bold' : 'text-slate-600'
                    }`}
                  >
                    Quick Paste
                  </button>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {parseError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{parseError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setParseError(null)}
                  className="text-rose-600 hover:text-rose-800 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mode A: File Upload */}
            {inputMode === 'file' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {parsedFileName ? `File Loaded: ${parsedFileName} (${parsedFileSize})` : 'Drag and drop Excel or CSV file here'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Supports <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> with Roll Number column.
                  </p>
                  <span className="inline-block mt-2 px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-2xs">
                    Browse File on Device
                  </span>
                </div>
              </div>
            ) : (
              /* Mode B: Direct Quick Paste */
              <div className="space-y-3">
                <div>
                  <label className="text-slate-800 font-bold block mb-1 text-xs">
                    Paste Student Roll Numbers (Separated by newlines, commas, or tabs):
                  </label>
                  <textarea
                    rows={5}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="e.g.&#10;2025/BTECH/CSE/001&#10;2025/BTECH/CSE/002&#10;2025/BTECH/CSE/003"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {pasteText.split(/[\n,\t;]/).filter((s) => s.trim().length > 0).length} Roll Number(s) identified
                  </span>
                  <button
                    type="button"
                    onClick={handleParsePastedRolls}
                    className="min-h-[40px] px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    Validate & Reconcile Pasted Roll Numbers
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: DIFFERENTIAL PREVIEW & EXECUTION MATRIX */}
          {parsedRows.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">
                    3
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Profile Update Differential Matrix ({parsedRows.length} Records)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Review proposed course and semester updates before committing to student profiles.
                    </p>
                  </div>
                </div>

                {/* Commit Action Button */}
                <button
                  type="button"
                  onClick={handleApplyProfileUpdates}
                  disabled={matchedCount === 0}
                  className={`min-h-[44px] px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-all ${
                    matchedCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>Apply Profile Updates ({matchedCount} Students)</span>
                </button>
              </div>

              {/* KPI Metrics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Total Roll Numbers</span>
                  <strong className="text-slate-900 font-mono text-sm">{parsedRows.length}</strong>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 block text-[11px]">Matched in ERP</span>
                  <strong className="text-emerald-950 font-mono text-sm">{matchedCount} Students</strong>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-amber-800 block text-[11px]">Not Found / Unregistered</span>
                  <strong className="text-amber-950 font-mono text-sm">{unmatchedCount} Roll Numbers</strong>
                </div>

                <div className={`p-3 rounded-xl border ${
                  updateMode === 'quota'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-indigo-50 border-indigo-200'
                }`}>
                  <span className={`${updateMode === 'quota' ? 'text-emerald-800' : 'text-indigo-800'} block text-[11px]`}>
                    {updateMode === 'quota' ? 'Target Quota Status' : 'Destination Target'}
                  </span>
                  <strong className={`${updateMode === 'quota' ? 'text-emerald-950' : 'text-indigo-950'} truncate block text-[11px]`}>
                    {updateMode === 'quota'
                      ? selectedQuotaStatus
                      : `Sem ${targetSemester} · ${targetCourse.split(' ')[0]}`}
                  </strong>
                </div>
              </div>

              {/* Search & Status Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Roll No or Student Name..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full min-h-[38px] pl-8 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    All ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Matched')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      statusFilter === 'Matched' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Matched ({matchedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Not_Found')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      statusFilter === 'Not_Found' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Unmatched ({unmatchedCount})
                  </button>
                </div>
              </div>

              {/* Differential Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    {updateMode === 'quota' ? (
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Roll Number</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Current Quota Status</th>
                        <th className="p-3">Target Quota Status to Assign</th>
                        <th className="p-3">Quota Field Category</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Roll Number</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Current Academic Profile</th>
                        <th className="p-3">Updated Target Profile (Mapped)</th>
                        <th className="p-3">Operation</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRows.map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-400 font-mono text-[11px]">{row.rowNumber}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{row.rollNo}</td>
                        <td className="p-3 font-bold text-slate-800">
                          {row.studentName}
                        </td>
                        {updateMode === 'quota' ? (
                          <>
                            <td className="p-3 text-[11px]">
                              {row.status === 'Matched' ? (
                                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                                  {row.currentQuotaStatus}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No existing record</span>
                              )}
                            </td>
                            <td className="p-3 text-[11px] bg-emerald-50/40">
                              <span className="font-bold text-emerald-900 bg-emerald-100/90 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{row.targetQuotaStatus}</span>
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                                {effectiveQuotaFields.find((q) => q.key === selectedQuotaFieldKey)?.label || selectedQuotaFieldKey}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-[11px]">
                              {row.status === 'Matched' ? (
                                <div>
                                  <span className="text-slate-700 font-medium block truncate max-w-[200px]">
                                    {row.currentCourse}
                                  </span>
                                  <span className="font-mono text-slate-500 font-semibold">
                                    Semester {row.currentSemester} · {row.currentBranch}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No existing record</span>
                              )}
                            </td>
                            <td className="p-3 text-[11px] bg-indigo-50/30">
                              <div>
                                <span className="text-indigo-950 font-bold block truncate max-w-[220px]">
                                  {row.targetCourse}
                                </span>
                                <span className="font-mono font-black text-indigo-700">
                                  Semester {row.targetSemester} · {row.targetBranch}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                row.operationType === 'Semester_Promotion'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : row.operationType === 'Course_Transfer'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {row.operationType === 'Semester_Promotion'
                                  ? 'Semester Promotion'
                                  : row.operationType === 'Course_Transfer'
                                  ? 'Course Transfer'
                                  : 'Reaffirm'}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="p-3 text-center">
                          {row.status === 'Matched' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Ready</span>
                            </span>
                          ) : row.status === 'Duplicate' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                              <Copy className="w-3 h-3 text-purple-600" />
                              <span>Duplicate</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              <span>Not Found</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Commit Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {updateMode === 'quota' ? (
                    <>
                      {matchedCount} student profile(s) will be updated with Quota Field: <strong>{effectiveQuotaFields.find((q) => q.key === selectedQuotaFieldKey)?.label}</strong> → Target Status: <strong>"{selectedQuotaStatus}"</strong>.
                    </>
                  ) : (
                    <>
                      {matchedCount} student profile(s) will be updated with target Course: <strong>{targetCourse}</strong> (Semester {targetSemester}).
                    </>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      setParsedFileName('');
                      setPasteText('');
                    }}
                    className="min-h-[40px] px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl"
                  >
                    Clear Roster
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyProfileUpdates}
                    disabled={matchedCount === 0}
                    className={`min-h-[40px] px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-all ${
                      matchedCount > 0
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>Apply Profile Updates Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPDATE HISTORY & AUDIT TRAIL */}
      {activeTab === 'history' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Student Profile Update History & Audit Logs
              </h2>
              <p className="text-xs text-slate-500">
                Historical record of spreadsheet intake, academic mappings, and operator sign-offs.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
              {batchHistory.length} Batches Executed
            </span>
          </div>

          <div className="space-y-3">
            {batchHistory.map((batch) => (
              <div
                key={batch.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {batch.batchNo}
                      </span>
                      {batch.updateMode === 'quota' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                          Quota Intake: {batch.quotaType || 'Quota'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                          Course Promotion
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-slate-800 mt-1">
                      {batch.updateMode === 'quota'
                        ? `Assigned Status "${batch.quotaStatus}" (${batch.quotaType})`
                        : `Mapped to ${batch.mappedCourse} · Semester ${batch.mappedSemester}`}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right text-[11px]">
                    <span className="text-slate-500 block">
                      Uploaded by {batch.uploadedBy.name} ({batch.uploadedBy.role})
                    </span>
                    <span className="font-mono text-slate-400">
                      {new Date(batch.uploadedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-white rounded-lg text-[11px] border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">File Source:</span>
                    <strong className="text-slate-800 truncate block">{batch.fileName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Roll Nos:</span>
                    <strong className="text-slate-800">{batch.totalRollNos}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{batch.updateMode === 'quota' ? 'Quota Status Assigned:' : 'Profiles Updated:'}</span>
                    <strong className="text-emerald-700 truncate block">
                      {batch.updateMode === 'quota' ? batch.quotaStatus : `${batch.matchedCount} Students`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sample Students:</span>
                    <span className="font-mono text-slate-600 truncate block">
                      {batch.sampleRollNos.join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ROSTER DISTRIBUTION BY COURSE & SEMESTER */}
      {activeTab === 'roster' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Institutional Course & Semester Distribution Roster
              </h2>
              <p className="text-xs text-slate-500">
                Active students registered in ERP grouped by academic program and semester stage.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-950 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
              Total Enrolled: {students.length} Students
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {availableCourseOptions.map((crsName, idx) => {
              const studentsInCourse = students.filter(
                (s) =>
                  safeLower(s.course).includes(safeLower(crsName)) ||
                  safeLower(crsName).includes(safeLower(s.course))
              );
              const shortCode =
                crsName.split('(')[1]?.replace(')', '') ||
                crsName.split(' ')[0] + ' ' + (crsName.split(' ')[1] || '');

              return (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate max-w-[200px]" title={crsName}>
                      {shortCode}
                    </span>
                    <span className="text-xs font-black font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {studentsInCourse.length} Students
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{crsName}</p>

                  {/* Semesters breakdown */}
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                      const countInSem = studentsInCourse.filter((st) => st.semester === s).length;
                      if (countInSem === 0) return null;
                      return (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-700"
                        >
                          Sem {s}: <strong>{countInSem}</strong>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADMIN DROPDOWN OPTIONS MANAGER MODAL (SYNCED WITH ENROLLMENT FIELD BUILDER) */}
      {/* ============================================================== */}
      {showAdminDropdownModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-sm sm:text-base">
                      Admin: Amend Dropdown Options
                    </h3>
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full border border-purple-200">
                      Enrollment Field Sync
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select, amend, add, or remove options for <strong>Courses, Subjects, Semesters, and Quota Privileges</strong> (PwD, NCC, Sports, etc.). Changes immediately sync across the platform.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdminDropdownModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Field Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => {
                  setManagerActiveTab('course');
                  setNewOptionInput('');
                  setEditingOptionIndex(null);
                }}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                  managerActiveTab === 'course'
                    ? 'bg-white text-purple-950 shadow-xs ring-1 ring-purple-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                <span>1. Courses ({draftCourseOptions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setManagerActiveTab('subject');
                  setNewOptionInput('');
                  setEditingOptionIndex(null);
                }}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                  managerActiveTab === 'subject'
                    ? 'bg-white text-purple-950 shadow-xs ring-1 ring-purple-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                <span>2. Subjects ({draftSubjectOptions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setManagerActiveTab('semester');
                  setNewOptionInput('');
                  setEditingOptionIndex(null);
                }}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                  managerActiveTab === 'semester'
                    ? 'bg-white text-purple-950 shadow-xs ring-1 ring-purple-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>3. Semesters ({draftSemesterOptions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setManagerActiveTab('quota');
                  setNewOptionInput('');
                  setEditingOptionIndex(null);
                  setDraftQuotaOptions([...getOptionsForQuotaField(adminSelectedQuotaFieldKey)]);
                }}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                  managerActiveTab === 'quota'
                    ? 'bg-white text-purple-950 shadow-xs ring-1 ring-purple-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-purple-600" />
                <span>4. Quota Types ({draftQuotaOptions.length})</span>
              </button>
            </div>

            {/* QUOTA FIELD SELECTOR (ONLY WHEN IN QUOTA TAB) */}
            {managerActiveTab === 'quota' && (
              <div className="mb-4 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Select Quota Field from Enrollment Fields to Define/Configure:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddQuotaTypeInput(!showAddQuotaTypeInput)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Quota Field</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={adminSelectedQuotaFieldKey}
                      onChange={(e) => handleAdminSelectQuotaField(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-purple-600"
                    >
                      {effectiveQuotaFields.map((q) => (
                        <option key={q.key} value={q.key}>
                          {q.label} ({q.key})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-200">
                    <span>
                      Currently configuring: <strong className="text-slate-900">{effectiveQuotaFields.find((q) => q.key === adminSelectedQuotaFieldKey)?.label}</strong>
                    </span>
                  </div>
                </div>

                {showAddQuotaTypeInput && (
                  <div className="flex items-center gap-2 pt-2 border-t border-emerald-200">
                    <input
                      type="text"
                      placeholder="e.g. Defense Personnel / Martyrs Ward Quota"
                      value={newQuotaTypeName}
                      onChange={(e) => setNewQuotaTypeName(e.target.value)}
                      className="flex-1 p-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newQuotaTypeName.trim();
                        if (!trimmed) return;
                        const key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        if (!effectiveQuotaFields.some((eq) => eq.key === key)) {
                          effectiveQuotaFields.push({
                            key,
                            label: trimmed,
                            defaultOptions: ['Eligible (Yes)', 'Not Eligible (No)'],
                          });
                          handleAdminSelectQuotaField(key);
                        }
                        setNewQuotaTypeName('');
                        setShowAddQuotaTypeInput(false);
                      }}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Create Field
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddQuotaTypeInput(false)}
                      className="px-2.5 py-2 text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Add New Option Input Box */}
            <div className="flex items-center gap-2 mb-4 bg-purple-50/60 p-3 rounded-2xl border border-purple-100">
              <input
                type="text"
                placeholder={
                  managerActiveTab === 'course'
                    ? 'Add new course title (e.g. Bachelor of Data Science)'
                    : managerActiveTab === 'subject'
                    ? 'Add new academic subject (e.g. Artificial Intelligence & ML)'
                    : managerActiveTab === 'semester'
                    ? 'Add new semester stage (e.g. Semester 9)'
                    : `Add option for ${effectiveQuotaFields.find((q) => q.key === adminSelectedQuotaFieldKey)?.label || 'Quota'} (e.g. NCC 'A' Certificate, State Games)`
                }
                value={newOptionInput}
                onChange={(e) => setNewOptionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOptionToDraft();
                  }
                }}
                className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <button
                type="button"
                onClick={handleAddOptionToDraft}
                className="min-h-[40px] px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            </div>

            {/* Options List */}
            <div className="border border-slate-200 rounded-2xl p-3 max-h-60 overflow-y-auto divide-y divide-slate-100 space-y-1.5">
              {(managerActiveTab === 'course'
                ? draftCourseOptions
                : managerActiveTab === 'subject'
                ? draftSubjectOptions
                : managerActiveTab === 'semester'
                ? draftSemesterOptions
                : draftQuotaOptions
              ).map((opt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded-lg group"
                >
                  {editingOptionIndex === idx ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingOptionText}
                        onChange={(e) => setEditingOptionText(e.target.value)}
                        className="flex-1 p-1.5 bg-white border border-purple-400 rounded-lg text-xs font-semibold text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveOptionEdit(idx)}
                        className="px-2.5 py-1 bg-purple-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingOptionIndex(null)}
                        className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-mono text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-900 text-xs">{opt}</span>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOptionIndex(idx);
                            setEditingOptionText(opt);
                          }}
                          className="p-1 text-slate-400 hover:text-purple-700 rounded hover:bg-purple-50 cursor-pointer"
                          title="Edit option name"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionFromDraft(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                          title="Remove option"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Footer with Sync to Platform button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-200">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Synchronizes directly with Enrollment Field Builder schema.</span>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAdminDropdownModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndSyncWithEnrollmentField}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save &amp; Sync to Platform</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
