import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { SchoolStaffUser, Student, StaffRole, StudentQuota, EnrollmentField, ConcessionSurchargeRule, AcademicStream, UserSession } from '../../types/fee';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Lock, 
  Mail, 
  Phone, 
  Briefcase, 
  GraduationCap,
  KeyRound,
  Building,
  Check,
  UserCheck,
  Percent,
  Sparkles,
  Camera,
  Upload,
  Link as LinkIcon,
  FileSpreadsheet,
  Download,
  RefreshCw,
  FileText,
  Award,
  Palette
} from 'lucide-react';
import { AVATAR_PRESETS } from '../Common/UserProfileSummaryModal';

interface Props {
  staffUsers: SchoolStaffUser[];
  students: Student[];
  enrollmentFields?: EnrollmentField[];
  concessionRules?: ConcessionSurchargeRule[];
  streams?: AcademicStream[];
  currentSession?: UserSession | null;
  onAddStaffUser: (user: SchoolStaffUser) => void;
  onUpdateStaffUser: (user: SchoolStaffUser) => void;
  onDeleteStaffUser: (userId: string) => void;
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onBatchAddStudents?: (students: Student[]) => void;
  onImpersonateUser?: (role: 'admin' | 'student', targetId: string) => void;
  onUpdateStaffProfilePicture?: (staffId: string, photoUrl: string) => void;
  onUpdateStudentProfilePicture?: (studentId: string, photoUrl: string) => void;
  onNavigateToCertificateThemes?: () => void;
}

export const SchoolUserDirectory: React.FC<Props> = ({
  staffUsers,
  students,
  enrollmentFields = [],
  concessionRules = [],
  streams = [],
  currentSession = null,
  onAddStaffUser,
  onUpdateStaffUser,
  onDeleteStaffUser,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBatchAddStudents,
  onImpersonateUser,
  onUpdateStaffProfilePicture,
  onUpdateStudentProfilePicture,
  onNavigateToCertificateThemes,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'students' | 'service_mapping'>('staff');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals state
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showUploadStudentModal, setShowUploadStudentModal] = useState(false);
  const [uploadedStudentsPreview, setUploadedStudentsPreview] = useState<Student[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [editingStaff, setEditingStaff] = useState<SchoolStaffUser | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingUser, setDeletingUser] = useState<{ type: 'staff' | 'student'; id: string; name: string } | null>(null);
  const [photoEditingUser, setPhotoEditingUser] = useState<{
    type: 'staff' | 'student';
    id: string;
    name: string;
    subtext: string;
    currentPhoto?: string;
  } | null>(null);
  const [photoSuccessNotice, setPhotoSuccessNotice] = useState<string | null>(null);
  const [photoErrorNotice, setPhotoErrorNotice] = useState<string | null>(null);

  // Form state for adding/editing staff
  const [staffForm, setStaffForm] = useState<{
    name: string;
    email: string;
    phone: string;
    employeeCode: string;
    role: StaffRole;
    designation: string;
    department: string;
    status: 'Active' | 'Suspended' | 'Inactive';
    permissions: string[];
    profilePicture: string;
    canManageCertificateThemes: boolean;
  }>({
    name: '',
    email: '',
    phone: '',
    employeeCode: '',
    role: 'Accounts_Officer',
    designation: '',
    department: 'Finance & Accounts',
    status: 'Active',
    permissions: ['fee_collection', 'reconciliation'],
    profilePicture: '',
    canManageCertificateThemes: false,
  });

  // Form state for adding/editing student
  const [studentForm, setStudentForm] = useState<{
    rollNo: string;
    registerNo: string;
    name: string;
    gender: 'Male' | 'Female' | 'Other';
    dateOfBirth: string;
    fatherName: string;
    email: string;
    phone: string;
    parentPhone: string;
    course: string;
    branch: string;
    streamCode: string;
    year: number;
    semester: number;
    category: string;
    subCaste: string;
    domicileState: string;
    annualFamilyIncome: number;
    quota: StudentQuota;
    hostelResident: boolean;
    totalFee: number;
    paidFee: number;
    scholarshipWaiverPercent: number;
    customFields: Record<string, unknown>;
    profilePicture: string;
  }>({
    rollNo: '',
    registerNo: '',
    name: '',
    gender: 'Male',
    dateOfBirth: '2004-01-01',
    fatherName: '',
    email: '',
    phone: '',
    parentPhone: '',
    course: 'B.Tech',
    branch: 'Computer Science & Engineering',
    streamCode: 'CSE',
    year: 1,
    semester: 1,
    category: 'General',
    subCaste: '',
    domicileState: 'Bihar',
    annualFamilyIncome: 200000,
    quota: 'State Merit (Subsidized)',
    hostelResident: false,
    totalFee: 28500,
    paidFee: 0,
    scholarshipWaiverPercent: 0,
    customFields: {},
    profilePicture: '',
  });

  const availablePermissions = [
    { id: 'manage_users', label: 'User & Staff Directory Management' },
    { id: 'all_fee_modifications', label: 'Modify All Student Fee Structures' },
    { id: 'upload_excel_batch', label: 'Upload Fee Excel / CSV Spreadsheets' },
    { id: 'authorize_fee_uploads', label: 'Authorize & Clear Fee Upload Batches (Accounts Officer)' },
    { id: 'fee_collection', label: 'Cashier & Payment Counter Collection' },
    { id: 'treasury_reconciliation', label: 'State Treasury & Bank Reconciliation' },
    { id: 'clear_nodues_accounts', label: 'Sign-off Accounts Clearance (NOC)' },
    { id: 'statutory_certificates', label: 'Approve & Issue University Certificates' },
    { id: 'record_achievements', label: 'Field & Insert Student Honors & Achievements' },
    { id: 'manage_dynamic_qr', label: 'Configure & Map Dynamic QR Payment Accounts' },
  ];

  // Open edit staff
  const handleOpenEditStaff = (user: SchoolStaffUser) => {
    setEditingStaff(user);
    setStaffForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      employeeCode: user.employeeCode,
      role: user.role,
      designation: user.designation,
      department: user.department,
      status: user.status,
      permissions: [...user.permissions],
      profilePicture: user.profilePicture || '',
      canManageCertificateThemes: Boolean(user.canManageCertificateThemes),
    });
  };

  // Open edit student
  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      rollNo: student.rollNo,
      registerNo: student.registerNo,
      name: student.name,
      gender: student.gender || 'Male',
      dateOfBirth: student.dateOfBirth || '2004-01-01',
      fatherName: student.fatherName,
      email: student.email,
      phone: student.phone,
      parentPhone: student.parentPhone,
      course: student.course,
      branch: student.branch,
      streamCode: student.streamCode || 'CSE',
      year: student.year,
      semester: student.semester,
      category: student.category,
      subCaste: student.subCaste || '',
      domicileState: student.domicileState || 'Bihar',
      annualFamilyIncome: student.annualFamilyIncome || 200000,
      quota: student.quota,
      hostelResident: student.hostelResident,
      totalFee: student.totalFee,
      paidFee: student.paidFee,
      scholarshipWaiverPercent: student.scholarshipWaiverPercent,
      customFields: student.customFields || {},
      profilePicture: student.profilePicture || '',
    });
  };

  // Submit staff create/update
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.email) return;

    if (editingStaff) {
      onUpdateStaffUser({
        ...editingStaff,
        ...staffForm,
        canManageCertificateThemes: staffForm.canManageCertificateThemes,
        certificateThemeServiceMappedBy: staffForm.canManageCertificateThemes
          ? (editingStaff.certificateThemeServiceMappedBy || currentSession?.name || 'Institutional Administrator')
          : undefined,
        certificateThemeServiceMappedAt: staffForm.canManageCertificateThemes
          ? (editingStaff.certificateThemeServiceMappedAt || new Date().toISOString().split('T')[0])
          : undefined,
      });
      setEditingStaff(null);
    } else {
      const newUser: SchoolStaffUser = {
        id: 'USR-' + Date.now().toString().slice(-6),
        ...staffForm,
        employeeCode: staffForm.employeeCode || `EMP-${Date.now().toString().slice(-4)}`,
        password: '11111111',
        isFirstLogin: true,
        createdAt: new Date().toISOString().split('T')[0],
        canManageCertificateThemes: staffForm.canManageCertificateThemes,
        certificateThemeServiceMappedBy: staffForm.canManageCertificateThemes
          ? (currentSession?.name || 'Institutional Administrator')
          : undefined,
        certificateThemeServiceMappedAt: staffForm.canManageCertificateThemes
          ? new Date().toISOString().split('T')[0]
          : undefined,
      };
      onAddStaffUser(newUser);
      setShowAddStaffModal(false);
    }
  };

  // Administrator exclusive right: Map / Revoke staff user to Certificate Theme Designer Service
  const handleToggleCertificateServiceMapping = (staffUser: SchoolStaffUser) => {
    const isCurrentlyMapped = Boolean(staffUser.canManageCertificateThemes);
    const updated: SchoolStaffUser = {
      ...staffUser,
      canManageCertificateThemes: !isCurrentlyMapped,
      certificateThemeServiceMappedBy: !isCurrentlyMapped ? (currentSession?.name || 'Institutional Administrator') : undefined,
      certificateThemeServiceMappedAt: !isCurrentlyMapped ? new Date().toISOString().split('T')[0] : undefined,
    };
    onUpdateStaffUser(updated);
    setPhotoSuccessNotice(
      !isCurrentlyMapped 
        ? `User "${staffUser.name}" successfully mapped to Certificate Theme Designer Service!` 
        : `Certificate Theme Designer service mapping revoked for "${staffUser.name}".`
    );
    setTimeout(() => setPhotoSuccessNotice(null), 3500);
  };

  // Authorize password reset request (for Accountant or staff)
  const handleAuthorizePasswordReset = (staffUser: SchoolStaffUser) => {
    if (!staffUser.pendingNewPassword) return;
    onUpdateStaffUser({
      ...staffUser,
      password: staffUser.pendingNewPassword,
      passwordResetPending: false,
      pendingNewPassword: undefined,
      passwordResetAuthorizedBy: currentSession?.name || 'Administrator',
      passwordResetAuthorizedAt: new Date().toISOString(),
    });
  };

  const handleDeclinePasswordReset = (staffUser: SchoolStaffUser) => {
    onUpdateStaffUser({
      ...staffUser,
      passwordResetPending: false,
      pendingNewPassword: undefined,
    });
  };

  // Submit student create/update
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.rollNo || !studentForm.name) return;

    const pendingFee = Math.max(0, studentForm.totalFee - studentForm.paidFee);

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        ...studentForm,
        pendingFee,
      });
      setEditingStudent(null);
    } else {
      const newStu: Student = {
        id: 'STU-' + Date.now().toString().slice(-4),
        ...studentForm,
        admissionYear: 2025,
        dateOfBirth: studentForm.dateOfBirth || '2004-01-01',
        pendingFee,
        lateFineApplied: 0,
        hallTicketBlocked: false,
      };
      onAddStudent(newStu);
      setShowAddStudentModal(false);
    }
  };

  // Download Sample Student Import CSV Template
  const handleDownloadSampleCSV = () => {
    const baseHeaders = [
      'Roll No',
      'Student Name',
      'Date of Birth',
      'Gender',
      'Caste Category',
      'Sub Caste',
      'Father Name',
      'Student Phone',
      'Parent Phone',
      'Official Email',
      'Domicile State',
      'Annual Family Income',
      'Course',
      'Branch',
      'Stream Code',
      'Semester',
      'Admission Quota',
      'Hostel Resident',
      'Total Annual Fee',
      'Paid Fee'
    ];
    // Include all dynamic custom enrollment fields configured by Admin
    const dynamicHeaders = enrollmentFields
      .filter(f => !['gender', 'caste_category', 'sub_caste', 'domicile_state', 'annual_income'].includes(f.key))
      .map(f => f.label);

    const headers = [...baseHeaders, ...dynamicHeaders];
    const sampleRows = [
      [
        '2024CS088',
        'Aditya Raj',
        '2004-05-14',
        'Male',
        'OBC',
        'Kurmi',
        'Manoj Kumar Raj',
        '+91 9876543210',
        '+91 9431201999',
        'aditya.2024cs088@rlsycollege.ac.in',
        'Bihar',
        '180000',
        'B.Tech',
        'Computer Science & Engineering',
        'CSE',
        '1',
        'State Merit (Subsidized)',
        'No',
        '28500',
        '0',
        ...dynamicHeaders.map(() => 'N/A')
      ],
      [
        '2024EC042',
        'Priya Kumari',
        '2004-09-22',
        'Female',
        'General',
        'Kayastha',
        'Suresh Prasad',
        '+91 9812345678',
        '+91 9835012345',
        'priya.2024ec042@rlsycollege.ac.in',
        'Bihar',
        '240000',
        'B.Tech',
        'Electronics & Communication Engineering',
        'ECE',
        '1',
        'State Merit (Subsidized)',
        'Yes',
        '32500',
        '15000',
        ...dynamicHeaders.map(() => 'N/A')
      ]
    ];

    const csvLines = [headers.join(','), ...sampleRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'RLSY_Student_Enrollment_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse Student Details Spreadsheet (CSV / Excel)
  const handleStudentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setUploadError(null);
    setIsProcessingUpload(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          setUploadError('The uploaded spreadsheet contains no student data rows.');
          setIsProcessingUpload(false);
          return;
        }

        const parsed: Student[] = rows.map((r, idx) => {
          const getVal = (keys: string[]) => {
            for (const k of keys) {
              for (const rowKey of Object.keys(r)) {
                if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
                  return String((r as Record<string, unknown>)[rowKey] ?? '').trim();
                }
              }
            }
            return '';
          };

          const rollNo = getVal(['roll no', 'rollno', 'roll', 'roll_no', 'roll number']) || `GEN-${Date.now().toString().slice(-4)}-${idx + 1}`;
          const name = getVal(['student name', 'name', 'full name', 'candidate name']) || 'Unnamed Student';
          const dob = getVal(['date of birth', 'dob', 'date of birth (yyyy-mm-dd)', 'birth date']) || '2004-01-01';
          const gender = getVal(['gender', 'sex']) || 'Male';
          const category = getVal(['caste category', 'caste', 'category', 'social category']) || 'General';
          const subCaste = getVal(['sub caste', 'subcaste', 'community']) || '';
          const fatherName = getVal(['father name', 'father', "father's name", 'guardian name']) || '';
          const phone = getVal(['student phone', 'phone', 'mobile', 'contact phone']) || '';
          const parentPhone = getVal(['parent phone', 'parent mobile', 'guardian phone']) || '';
          const email = getVal(['official email', 'email', 'webmail', 'student email']) || `${rollNo.toLowerCase()}@rlsycollege.ac.in`;
          const domicile = getVal(['domicile state', 'domicile', 'state']) || 'Bihar';
          const income = Number(getVal(['annual family income', 'annual income', 'family income', 'income']) || 180000);
          const course = getVal(['course', 'degree', 'program']) || 'B.Tech';
          const branch = getVal(['branch', 'department', 'discipline']) || 'Computer Science & Engineering';
          const streamCode = getVal(['stream code', 'stream']) || 'CSE';
          const semester = Number(getVal(['semester', 'sem']) || 1);
          const year = Math.ceil(semester / 2) || 1;
          const quota = getVal(['admission quota', 'quota']) || 'State Merit (Subsidized)';
          const hostelStr = getVal(['hostel resident', 'hostel', 'hostel resident (yes/no)']);
          const hostel = hostelStr.toLowerCase().includes('y') || hostelStr.toLowerCase().includes('true');
          const totalFee = Number(getVal(['total annual fee', 'total fee', 'fee']) || 28500);
          const paidFee = Number(getVal(['paid fee', 'paid']) || 0);

          // Extract custom enrollment fields
          const customFields: Record<string, string | number> = {};
          enrollmentFields.forEach((fld) => {
            const val = getVal([fld.label, fld.key]);
            if (val) {
              customFields[fld.key] = fld.type === 'number' ? Number(val) : val;
            }
          });

          return {
            id: `STU-UPL-${Date.now().toString().slice(-6)}-${idx}`,
            rollNo,
            registerNo: getVal(['registration no', 'reg no', 'register no']) || `REG-${rollNo}`,
            name,
            gender,
            fatherName,
            email,
            phone: phone.startsWith('+91') ? phone : (phone ? `+91 ${phone}` : '+91 9800000000'),
            parentPhone: parentPhone ? (parentPhone.startsWith('+91') ? parentPhone : `+91 ${parentPhone}`) : '+91 9400000000',
            course,
            branch,
            streamCode,
            year,
            semester,
            category,
            subCaste,
            domicileState: domicile,
            annualFamilyIncome: income,
            quota,
            hostelResident: hostel,
            hostelRoomNo: '',
            dateOfBirth: dob,
            admissionYear: 2025,
            lateFineApplied: 0,
            hallTicketBlocked: false,
            totalFee,
            paidFee,
            pendingFee: Math.max(0, totalFee - paidFee),
            status: 'Regular',
            scholarshipWaiverPercent: 0,
            customFields,
            profilePicture: '',
          };
        });

        setUploadedStudentsPreview(parsed);
        setIsProcessingUpload(false);
      } catch (err: unknown) {
        let message = 'Invalid format';
        if (err instanceof Error) {
          message = err.message;
        }
        setUploadError(`Failed to parse file: ${message}`);
        setIsProcessingUpload(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm student batch upload
  const handleConfirmImportStudents = () => {
    if (uploadedStudentsPreview.length === 0) return;

    if (onBatchAddStudents) {
      onBatchAddStudents(uploadedStudentsPreview);
    } else {
      uploadedStudentsPreview.forEach((stu) => onAddStudent(stu));
    }

    setPhotoSuccessNotice(
      `Successfully uploaded and recorded ${uploadedStudentsPreview.length} student profiles into the institutional directory!`
    );
    setShowUploadStudentModal(false);
    setUploadedStudentsPreview([]);
    setUploadFileName('');
  };

  // Handle quick photo apply
  const handleApplyPhoto = (photoUrl: string) => {
    if (!photoEditingUser) return;
    if (photoEditingUser.type === 'staff') {
      if (onUpdateStaffProfilePicture) {
        onUpdateStaffProfilePicture(photoEditingUser.id, photoUrl);
      }
      const target = staffUsers.find(u => u.id === photoEditingUser.id);
      if (target) {
        onUpdateStaffUser({ ...target, profilePicture: photoUrl });
      }
      setPhotoSuccessNotice(`Profile picture updated for staff member ${photoEditingUser.name}!`);
    } else {
      if (onUpdateStudentProfilePicture) {
        onUpdateStudentProfilePicture(photoEditingUser.id, photoUrl);
      }
      const target = students.find(s => s.id === photoEditingUser.id);
      if (target) {
        onUpdateStudent({ ...target, profilePicture: photoUrl });
      }
      setPhotoSuccessNotice(`Profile picture updated for student ${photoEditingUser.name}!`);
    }
    setPhotoEditingUser(null);
    setTimeout(() => setPhotoSuccessNotice(null), 3500);
  };

  // Confirm delete
  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    if (deletingUser.type === 'staff') {
      onDeleteStaffUser(deletingUser.id);
    } else {
      onDeleteStudent(deletingUser.id);
    }
    setDeletingUser(null);
  };

  // Filtered staff
  const filteredStaff = staffUsers.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Filtered students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.branch.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-100 text-purple-800 border border-purple-200">
              Root App Administrator Privilege
            </span>
            <span className="text-xs text-slate-400 font-mono">RBAC v4.2 Security</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            School User Directory & Access Control Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Empowered to create, modify, suspend, or delete institutional accounts: Accounts Officers, Cashiers, Principal, Teachers, Wardens, and Student ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigateToCertificateThemes && (
            <button
              type="button"
              onClick={onNavigateToCertificateThemes}
              className="py-2 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              title="Open Certificate Theme Studio to customize templates & layout"
            >
              <Palette className="w-3.5 h-3.5 text-indigo-600" />
              <span>Theme Studio</span>
            </button>
          )}

          {activeSubTab === 'staff' ? (
            <button
              onClick={() => {
                setStaffForm({
                  name: '',
                  email: '',
                  phone: '+91 ',
                  employeeCode: '',
                  role: 'Accounts_Officer',
                  designation: '',
                  department: 'Finance & Accounts',
                  status: 'Active',
                  permissions: ['fee_collection'],
                  profilePicture: '',
                  canManageCertificateThemes: false,
                });
                setShowAddStaffModal(true);
              }}
              className="py-2 px-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add School Staff / Officer</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setUploadedStudentsPreview([]);
                  setUploadFileName('');
                  setUploadError(null);
                  setShowUploadStudentModal(true);
                }}
                className="py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                title="Admin or Accountant can upload student details using CSV or Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upload Student Details (CSV / Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStudentForm({
                    rollNo: '',
                    registerNo: '',
                    name: '',
                    gender: 'Male',
                    dateOfBirth: '2004-01-01',
                    fatherName: '',
                    email: '',
                    phone: '+91 ',
                    parentPhone: '+91 ',
                    course: 'B.Tech',
                    branch: 'Computer Science & Engineering',
                    streamCode: 'CSE',
                    year: 1,
                    semester: 1,
                    category: 'General',
                    subCaste: '',
                    domicileState: 'Bihar',
                    annualFamilyIncome: 200000,
                    quota: 'State Merit (Subsidized)',
                    hostelResident: false,
                    totalFee: 28500,
                    paidFee: 0,
                    scholarshipWaiverPercent: 0,
                    customFields: {},
                    profilePicture: '',
                  });
                  setShowAddStudentModal(true);
                }}
                className="py-2 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Enroll New Student</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {photoSuccessNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{photoSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setPhotoSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-[11px] font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Directory Category Tabs & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Toggle between Staff vs Students */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('staff')}
            className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 ${
              activeSubTab === 'staff'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>School Staff & Authorities ({staffUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('students')}
            className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 ${
              activeSubTab === 'students'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
            <span>Student Accounts ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('service_mapping')}
            className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 ${
              activeSubTab === 'service_mapping'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Theme Service Mapping ({staffUsers.filter(u => u.canManageCertificateThemes).length})</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeSubTab === 'staff' ? "Search by name, employee ID, role..." : activeSubTab === 'service_mapping' ? "Search staff to map certificate service..." : "Search by roll no, name, course..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {activeSubTab === 'staff' && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700 focus:bg-white"
            >
              <option value="ALL">All Roles</option>
              <option value="App_Admin">App Admin</option>
              <option value="Accounts_Officer">Accounts Officer</option>
              <option value="Principal_DDO">Principal (DDO)</option>
              <option value="Cashier">Cashier</option>
              <option value="HOD">HOD</option>
              <option value="Librarian">Librarian</option>
              <option value="Hostel_Warden">Hostel Warden</option>
            </select>
          )}
        </div>
      </div>

      {/* Pending Accountant & Staff Password Reset Authorizations Banner */}
      {activeSubTab === 'staff' && staffUsers.some((u) => u.passwordResetPending) && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Staff Password Reset Authorization Requests Requiring Approval</span>
          </div>
          <p className="text-[11px] text-amber-800">
            As per institutional financial security compliance, password resets for the user Accountant and critical authorities require verification and executive authorization by the Principal or Institutional Administrator before taking effect.
          </p>
          <div className="space-y-2">
            {staffUsers.filter((u) => u.passwordResetPending).map((reqUser) => (
              <div key={reqUser.id} className="p-3 bg-white border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>{reqUser.name}</span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold text-[10px]">
                      {reqUser.role.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                      Pending Authorization
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {reqUser.email} · Employee Code: <span className="font-mono">{reqUser.employeeCode}</span>
                    {reqUser.passwordResetRequestedAt && ` · Requested on ${new Date(reqUser.passwordResetRequestedAt).toLocaleString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAuthorizePasswordReset(reqUser)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Authorize & Activate Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeclinePasswordReset(reqUser)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Users Table */}
      {activeSubTab === 'staff' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee & Designation</th>
                  <th className="py-3 px-4">Role & Access Level</th>
                  <th className="py-3 px-4">Contact & Webmail</th>
                  <th className="py-3 px-4">Assigned Permissions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No staff members match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((user) => {
                    const isAppAdmin = user.role === 'App_Admin';
                    const isAccountsOfficer = user.role === 'Accounts_Officer';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {/* Avatar Placeholder / Photo with quick camera button */}
                            <div className="relative group shrink-0">
                              {user.profilePicture ? (
                                <img
                                  src={user.profilePicture}
                                  alt={user.name}
                                  className={`w-9 h-9 rounded-full object-cover border-2 shadow-2xs group-hover:scale-105 transition-transform ${
                                    isAppAdmin ? 'border-purple-500 ring-1 ring-purple-300' : 'border-indigo-400 ring-1 ring-indigo-200'
                                  }`}
                                />
                              ) : (
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs border-2 ${
                                  isAppAdmin
                                    ? 'bg-purple-800 text-white border-purple-400'
                                    : isAccountsOfficer
                                    ? 'bg-indigo-700 text-white border-indigo-400'
                                    : 'bg-slate-700 text-white border-slate-300'
                                }`}>
                                  {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => setPhotoEditingUser({
                                  type: 'staff',
                                  id: user.id,
                                  name: user.name,
                                  subtext: `${user.role.replace(/_/g, ' ')} · ${user.employeeCode}`,
                                  currentPhoto: user.profilePicture
                                })}
                                className="absolute -bottom-1 -right-1 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-full p-1 shadow-md border border-slate-200 transition-transform group-hover:scale-110"
                                title="Change or add profile picture"
                              >
                                <Camera className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            <div>
                              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                                {user.name}
                                {isAppAdmin && (
                                  <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[9px] font-bold rounded">
                                    ROOT ADMIN
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                {user.designation} · <span className="font-mono text-[10px] text-slate-400">{user.employeeCode}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold ${
                            isAppAdmin 
                              ? 'bg-purple-50 text-purple-800 border border-purple-200 font-bold'
                              : isAccountsOfficer
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            <ShieldCheck className="w-3 h-3" />
                            <span>{user.role.replace('_', ' ')}</span>
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{user.department}</span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-slate-700">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="font-mono text-[11px]">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{user.phone}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {user.permissions.slice(0, 2).map((perm) => (
                              <span key={perm} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                                {perm.replace(/_/g, ' ')}
                              </span>
                            ))}
                            {user.permissions.length > 2 && (
                              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold">
                                +{user.permissions.length - 2} more
                              </span>
                            )}
                            {user.canManageCertificateThemes && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold flex items-center gap-1">
                                <Award className="w-2.5 h-2.5 text-amber-700" />
                                <span>Theme Designer</span>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                            <span>{user.status}</span>
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{user.lastLogin || 'Recent'}</span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Administrator quick toggle for Certificate Theme Designer Service mapping */}
                            <button
                              type="button"
                              onClick={() => handleToggleCertificateServiceMapping(user)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                user.canManageCertificateThemes
                                  ? 'text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                                  : 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                              }`}
                              title={user.canManageCertificateThemes ? "Revoke Certificate Theme Designer Service" : "Administrator Right: Map user to Certificate Theme Designer Service"}
                            >
                              <Award className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setPhotoEditingUser({
                                type: 'staff',
                                id: user.id,
                                name: user.name,
                                subtext: `${user.role.replace(/_/g, ' ')} · ${user.employeeCode}`,
                                currentPhoto: user.profilePicture
                              })}
                              className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Add or Change Profile Picture"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenEditStaff(user)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Modify User Details & Permissions"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeletingUser({ type: 'staff', id: user.id, name: user.name })}
                              disabled={isAppAdmin && staffUsers.filter(u => u.role === 'App_Admin').length <= 1}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isAppAdmin && staffUsers.filter(u => u.role === 'App_Admin').length <= 1
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={isAppAdmin ? "Cannot delete the sole App Administrator" : "Delete User Account"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Accounts Table */}
      {activeSubTab === 'students' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student & Roll Number</th>
                  <th className="py-3 px-4">Academic Details</th>
                  <th className="py-3 px-4">Quota & Scholarship</th>
                  <th className="py-3 px-4">Total Fee Payable</th>
                  <th className="py-3 px-4">Collection Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No student records match the search.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stu) => (
                    <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* Student Avatar Placeholder / Photo with camera quick button */}
                          <div className="relative group shrink-0">
                            {stu.profilePicture ? (
                              <img
                                src={stu.profilePicture}
                                alt={stu.name}
                                className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400 ring-1 ring-emerald-200 shadow-2xs group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs border-2 border-emerald-400 shadow-2xs group-hover:scale-105 transition-transform">
                                {stu.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setPhotoEditingUser({
                                type: 'student',
                                id: stu.id,
                                name: stu.name,
                                subtext: `Roll: ${stu.rollNo} · ${stu.course} (${stu.branch.split(' ')[0]})`,
                                currentPhoto: stu.profilePicture
                              })}
                              className="absolute -bottom-1 -right-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-full p-1 shadow-md border border-slate-200 transition-transform group-hover:scale-110"
                              title="Change or add student photo"
                            >
                              <Camera className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <div>
                            <span className="font-bold text-slate-900 block">{stu.name}</span>
                            <span className="text-[11px] text-slate-500 block">
                              Roll: <span className="font-mono font-bold text-slate-700">{stu.rollNo}</span> · Reg: {stu.registerNo}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{stu.course} - {stu.branch}</span>
                        <span className="text-[11px] text-slate-500">Year {stu.year} · Semester {stu.semester}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold block w-fit">
                          {stu.quota}
                        </span>
                        {stu.scholarshipWaiverPercent > 0 ? (
                          <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                            {stu.scholarshipWaiverPercent}% Fee Waiver ({stu.scholarshipName || 'Scholarship'})
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block mt-0.5">Category: {stu.category}</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ₹{stu.totalFee.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Paid: ₹{stu.paidFee.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {stu.pendingFee === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" />
                            <span>CLEARED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            <span>DUE: ₹{stu.pendingFee.toLocaleString('en-IN')}</span>
                          </span>
                        )}
                        {stu.hallTicketBlocked && (
                          <span className="block text-[9px] font-bold text-rose-600 mt-0.5">
                            Hall Ticket Blocked
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPhotoEditingUser({
                              type: 'student',
                              id: stu.id,
                              name: stu.name,
                              subtext: `Roll: ${stu.rollNo} · ${stu.course} (${stu.branch.split(' ')[0]})`,
                              currentPhoto: stu.profilePicture
                            })}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Add or Change Profile Picture"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditStudent(stu)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit Student & Modify Fee Structure"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeletingUser({ type: 'student', id: stu.id, name: stu.name })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Student Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Staff User */}
      {(showAddStaffModal || editingStaff) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 my-auto flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingStaff ? `Modify User: ${editingStaff.name}` : 'Create School Authority Account'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Set role, permissions, and administrative access privileges.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddStaffModal(false);
                  setEditingStaff(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-6 space-y-4 text-xs">
              {!editingStaff && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-[11px] leading-relaxed flex items-start gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-indigo-950">Staff Onboarding Password Policy:</span>
                    <span>Newly created staff accounts are provisioned with default security password <span className="font-mono font-bold text-indigo-800">11111111</span>. The staff member will be required to change their password immediately upon their first login.</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S. N. Sharma"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Official Webmail *</label>
                  <input
                    type="email"
                    required
                    placeholder="staff.name@rlsycollege.ac.in"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Employee Code</label>
                  <input
                    type="text"
                    placeholder="EMP-FIN-004"
                    value={staffForm.employeeCode}
                    onChange={(e) => setStaffForm({ ...staffForm, employeeCode: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Institutional Role *</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => {
                      const r = e.target.value as StaffRole;
                      let des = staffForm.designation;
                      let dept = staffForm.department;
                      if (r === 'App_Admin') { des = 'App & Institutional Systems Administrator'; dept = 'IT & ERP Cell'; }
                      if (r === 'Accounts_Officer') { des = 'Accounts Officer & Treasury Bursar'; dept = 'Finance & Accounts'; }
                      if (r === 'Principal_DDO') { des = 'Principal & Drawing and Disbursing Officer (DDO)'; dept = 'Executive Office'; }
                      if (r === 'Cashier') { des = 'Treasury Counter Cashier'; dept = 'Cashier Desk'; }
                      if (r === 'Librarian') { des = 'Chief Librarian & Book Bank Officer'; dept = 'Central Library'; }
                      if (r === 'HOD') { des = 'Head of Department'; dept = 'Academic Departments'; }
                      if (r === 'Hostel_Warden') { des = 'Chief Hostel Warden'; dept = 'Hostel Administration'; }

                      setStaffForm({
                        ...staffForm,
                        role: r,
                        designation: des,
                        department: dept,
                      });
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-semibold"
                  >
                    <option value="App_Admin">App Administrator (Root Super Admin)</option>
                    <option value="Accounts_Officer">Accounts Officer & Treasury Bursar</option>
                    <option value="Principal_DDO">Principal & DDO (Executive Sign-Off)</option>
                    <option value="Cashier">Treasury Counter Cashier</option>
                    <option value="Librarian">Librarian (Book Bank Clearance)</option>
                    <option value="HOD">Head of Department (Lab Clearance)</option>
                    <option value="Hostel_Warden">Hostel Warden (Mess Dues)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Account Status</label>
                  <select
                    value={staffForm.status}
                    onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-semibold"
                  >
                    <option value="Active">Active (Permitted)</option>
                    <option value="Suspended">Suspended (Temporarily Blocked)</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Designation Title</label>
                  <input
                    type="text"
                    value={staffForm.designation}
                    onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Department</label>
                  <input
                    type="text"
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  />
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="pt-2 border-t border-slate-200">
                <label className="text-slate-700 font-bold block mb-2">Granular Role Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {availablePermissions.map((p) => {
                    const isChecked = staffForm.permissions.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-start gap-2 p-1.5 bg-white rounded border border-slate-200 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStaffForm({ ...staffForm, permissions: [...staffForm.permissions, p.id] });
                            } else {
                              setStaffForm({ ...staffForm, permissions: staffForm.permissions.filter(id => id !== p.id) });
                            }
                          }}
                          className="mt-0.5 text-purple-700 rounded"
                        />
                        <span className="text-slate-800 font-medium leading-tight">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Profile Picture Option for Staff */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold block flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-purple-700" />
                    <span>Staff Profile Picture</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Headshot / ERP Photo</span>
                </div>

                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex flex-col sm:flex-row items-center gap-4">
                  {/* Preview Avatar */}
                  <div className="relative shrink-0">
                    {staffForm.profilePicture ? (
                      <img
                        src={staffForm.profilePicture}
                        alt="Staff Preview"
                        className="w-14 h-14 rounded-full object-cover border-2 border-purple-500 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-purple-800 text-white font-bold text-sm flex items-center justify-center border-2 border-purple-400 shadow-sm">
                        {staffForm.name ? staffForm.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'ST'}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs">
                        <Upload className="w-3 h-3" />
                        <span>Upload From Device</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setStaffForm({ ...staffForm, profilePicture: reader.result });
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>

                      {staffForm.profilePicture && (
                        <button
                          type="button"
                          onClick={() => setStaffForm({ ...staffForm, profilePicture: '' })}
                          className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 font-semibold">Presets:</span>
                      <div className="flex gap-1.5">
                        {AVATAR_PRESETS.slice(4, 6).map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setStaffForm({ ...staffForm, profilePicture: preset.url })}
                            className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 hover:border-purple-600 focus:outline-none"
                            title={preset.label}
                          >
                            <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStaffModal(false);
                    setEditingStaff(null);
                  }}
                  className="py-2 px-3 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg transition-colors shadow-sm"
                >
                  {editingStaff ? 'Save Changes' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Student Account & Fee Structure */}
      {(showAddStudentModal || editingStudent) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 my-auto flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingStudent ? `Modify Student & Fee: ${editingStudent.name} (${editingStudent.rollNo})` : 'Enroll New Student into ERP'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    App Administrator can customize individual student dues, quotas, and fee ledger.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddStudentModal(false);
                  setEditingStudent(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2024CS099"
                    value={studentForm.rollNo}
                    onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Full Student Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Verma"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Gender *</label>
                  <select
                    value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as string })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Date of Birth (DOB) *</label>
                  <input
                    type="date"
                    required
                    value={studentForm.dateOfBirth}
                    onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Academic Stream</label>
                  <select
                    value={studentForm.streamCode}
                    onChange={(e) => {
                      const str = streams.find(s => s.code === e.target.value);
                      setStudentForm({ 
                        ...studentForm, 
                        streamCode: e.target.value,
                        branch: str ? str.name : studentForm.branch,
                        course: str ? str.degree : studentForm.course,
                      });
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-bold text-indigo-900"
                  >
                    {streams.length > 0 ? (
                      streams.map(s => (
                        <option key={s.id} value={s.code}>{s.code} - {s.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="CSE">CSE - Computer Science</option>
                        <option value="ECE">ECE - Electronics</option>
                        <option value="MECH">MECH - Mechanical</option>
                        <option value="EEE">EEE - Electrical</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Semester</label>
                  <select
                    value={studentForm.semester}
                    onChange={(e) => setStudentForm({ ...studentForm, semester: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Caste / Reservation Category *</label>
                  <select
                    value={studentForm.category}
                    onChange={(e) => setStudentForm({ ...studentForm, category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-medium"
                  >
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC (Scheduled Caste)</option>
                    <option value="ST">ST (Scheduled Tribe)</option>
                    <option value="EWS">EWS (Economically Weaker)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Sub-Caste / Community</label>
                  <input
                    type="text"
                    placeholder="e.g. Kurmi, Rajput, Ravidas, etc."
                    value={studentForm.subCaste}
                    onChange={(e) => setStudentForm({ ...studentForm, subCaste: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Domicile State *</label>
                  <select
                    value={studentForm.domicileState}
                    onChange={(e) => setStudentForm({ ...studentForm, domicileState: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  >
                    <option value="Bihar">Bihar (Home State)</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Other State">Other State (Non-Domicile)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Family Annual Income (₹) *</label>
                  <input
                    type="number"
                    step="10000"
                    placeholder="e.g. 180000"
                    value={studentForm.annualFamilyIncome}
                    onChange={(e) => setStudentForm({ ...studentForm, annualFamilyIncome: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Admission Quota *</label>
                  <select
                    value={studentForm.quota}
                    onChange={(e) => setStudentForm({ ...studentForm, quota: e.target.value as StudentQuota })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-medium"
                  >
                    <option value="State Merit (Subsidized)">State Merit (Subsidized)</option>
                    <option value="General">General</option>
                    <option value="TFW (Tuition Fee Waiver)">TFW (Tuition Fee Waiver)</option>
                    <option value="SC/ST Post-Matric Freeship">SC/ST Post-Matric Freeship</option>
                    <option value="OBC / EWS Freeship">OBC / EWS Freeship</option>
                    <option value="General (Self-Financed)">General (Self-Financed)</option>
                    <option value="Physically Challenged (PWD)">Physically Challenged (PWD)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Custom Enrollment Fields defined by Admin */}
              {enrollmentFields.filter(f => !['gender', 'caste_category', 'sub_caste', 'domicile_state', 'annual_income'].includes(f.key)).length > 0 && (
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 space-y-2">
                  <span className="font-bold text-purple-950 text-xs block">
                    Custom Enrollment Attributes (Configured by Admin):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {enrollmentFields
                      .filter(f => !['gender', 'caste_category', 'sub_caste', 'domicile_state', 'annual_income'].includes(f.key))
                      .map((fld) => (
                        <div key={fld.id}>
                          <label className="text-slate-700 font-semibold block mb-1">
                            {fld.label} {fld.isRequired && <span className="text-rose-600">*</span>}
                          </label>
                          {fld.type === 'select' ? (
                            <select
                              value={studentForm.customFields?.[fld.key] || fld.defaultValue || ''}
                              onChange={(e) => setStudentForm({
                                ...studentForm,
                                customFields: { ...studentForm.customFields, [fld.key]: e.target.value }
                              })}
                              className="w-full p-2 bg-white border border-purple-300 rounded-lg text-xs"
                            >
                              <option value="">Select option...</option>
                              {fld.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : fld.type === 'checkbox' ? (
                            <label className="flex items-center gap-2 cursor-pointer mt-1">
                              <input
                                type="checkbox"
                                checked={Boolean(studentForm.customFields?.[fld.key])}
                                onChange={(e) => setStudentForm({
                                  ...studentForm,
                                  customFields: { ...studentForm.customFields, [fld.key]: e.target.checked }
                                })}
                                className="rounded text-purple-600"
                              />
                              <span className="text-slate-700 font-medium">Yes / Active</span>
                            </label>
                          ) : (
                            <input
                              type={fld.type === 'number' ? 'number' : 'text'}
                              placeholder={fld.placeholder || ''}
                              value={studentForm.customFields?.[fld.key] || ''}
                              onChange={(e) => setStudentForm({
                                ...studentForm,
                                customFields: { ...studentForm.customFields, [fld.key]: e.target.value }
                              })}
                              className="w-full p-2 bg-white border border-purple-300 rounded-lg text-xs"
                            />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Fee Adjustment Box */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                <span className="font-bold text-emerald-950 block text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Student Fee Structure & Ledger Configuration</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-emerald-900 font-semibold block mb-1">
                      Total Annual / Semester Fee Payable (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      step="500"
                      value={studentForm.totalFee}
                      onChange={(e) => setStudentForm({ ...studentForm, totalFee: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      App Administrator can directly adjust this fee payable.
                    </span>
                  </div>

                  <div>
                    <label className="text-emerald-900 font-semibold block mb-1">
                      Already Collected / Paid Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={studentForm.paidFee}
                      onChange={(e) => setStudentForm({ ...studentForm, paidFee: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Balance Due: ₹{Math.max(0, studentForm.totalFee - studentForm.paidFee).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Student Email</label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Student Contact Phone</label>
                  <input
                    type="text"
                    value={studentForm.phone}
                    onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  />
                </div>
              </div>

              {/* Profile Picture Option for Student */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold block flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Student Profile Picture</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Headshot / ERP Photo</span>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-center gap-4">
                  {/* Preview Avatar */}
                  <div className="relative shrink-0">
                    {studentForm.profilePicture ? (
                      <img
                        src={studentForm.profilePicture}
                        alt="Student Preview"
                        className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-emerald-700 text-white font-bold text-sm flex items-center justify-center border-2 border-emerald-400 shadow-sm">
                        {studentForm.name ? studentForm.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'ST'}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs">
                        <Upload className="w-3 h-3" />
                        <span>Upload From Device</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setStudentForm({ ...studentForm, profilePicture: reader.result });
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>

                      {studentForm.profilePicture && (
                        <button
                          type="button"
                          onClick={() => setStudentForm({ ...studentForm, profilePicture: '' })}
                          className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 font-semibold">Presets:</span>
                      <div className="flex gap-1.5">
                        {AVATAR_PRESETS.slice(0, 4).map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setStudentForm({ ...studentForm, profilePicture: preset.url })}
                            className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 hover:border-emerald-600 focus:outline-none"
                            title={preset.label}
                          >
                            <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setEditingStudent(null);
                  }}
                  className="py-2 px-3 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors shadow-sm"
                >
                  {editingStudent ? 'Update Student & Fee Ledger' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 text-xs my-auto max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-center font-bold text-slate-900 text-sm">
              Confirm Account Deletion
            </h3>
            <p className="text-center text-slate-500 mt-1">
              Are you sure you want to permanently delete <strong className="text-slate-800">{deletingUser.name}</strong> from the school ERP?
              This will remove active logins and historical associations.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setDeletingUser(null)}
                className="py-2 px-4 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="py-2 px-4 text-white bg-rose-600 hover:bg-rose-700 rounded-lg font-bold shadow-sm"
              >
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change / Add Profile Picture for ANY User (Staff or Student) */}
      {photoEditingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-xs space-y-4 animate-in zoom-in-95 duration-150 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                  photoEditingUser.type === 'staff' ? 'bg-purple-700' : 'bg-emerald-700'
                }`}>
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Update Profile Picture
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[260px]">
                    {photoEditingUser.name} · {photoEditingUser.subtext}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhotoEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {photoErrorNotice && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-[11px] font-semibold flex items-center justify-between">
                <span>{photoErrorNotice}</span>
                <button type="button" onClick={() => setPhotoErrorNotice(null)} className="text-rose-600 hover:text-rose-800 font-bold ml-2">✕</button>
              </div>
            )}

            {/* Current Avatar Hero */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="relative shrink-0">
                {photoEditingUser.currentPhoto ? (
                  <img
                    src={photoEditingUser.currentPhoto}
                    alt={photoEditingUser.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md ring-2 ring-purple-200"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-full font-extrabold text-lg text-white flex items-center justify-center shadow-md border-2 border-white ring-2 ${
                    photoEditingUser.type === 'staff' ? 'bg-purple-800 ring-purple-200' : 'bg-emerald-700 ring-emerald-200'
                  }`}>
                    {photoEditingUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                )}
              </div>
              <div>
                <span className="font-bold text-slate-900 block text-sm">{photoEditingUser.name}</span>
                <span className="text-[11px] text-slate-500 font-mono block">{photoEditingUser.subtext}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {photoEditingUser.currentPhoto ? 'Custom photo attached' : 'Default avatar placeholder'}
                </span>
              </div>
            </div>

            {/* Upload from Device */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">
                1. Upload Headshot From Device:
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith('image/')) {
                        setPhotoErrorNotice('Please choose an image file (JPG, PNG, WebP).');
                        setTimeout(() => setPhotoErrorNotice(null), 4000);
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setPhotoErrorNotice('File size exceeds 5MB.');
                        setTimeout(() => setPhotoErrorNotice(null), 4000);
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          handleApplyPhoto(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                  />
                  <div className="w-full py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose File from Computer / Mobile</span>
                  </div>
                </label>

                {photoEditingUser.currentPhoto && (
                  <button
                    type="button"
                    onClick={() => handleApplyPhoto('')}
                    className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-semibold transition-all flex items-center gap-1 shadow-2xs"
                    title="Remove custom picture and restore placeholder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Presets Gallery */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                2. Or Choose Pre-formatted Portrait:
              </span>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPhoto(preset.url)}
                    className="group relative rounded-full overflow-hidden border-2 hover:border-purple-600 transition-all focus:outline-none aspect-square"
                    title={preset.label}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    {photoEditingUser.currentPhoto === preset.url && (
                      <div className="absolute inset-0 bg-purple-900/60 flex items-center justify-center text-white">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Web Image Link */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                3. Or Paste Image Web Link (HTTPS URL):
              </span>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  id="directPhotoUrlInput"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('directPhotoUrlInput') as HTMLInputElement;
                    if (input && input.value.trim()) {
                      handleApplyPhoto(input.value.trim());
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-2xs"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPhotoEditingUser(null)}
                className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Student Details Modal (Admin & Accountant) */}
      {showUploadStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Admin & Accounts Officer Tool
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Bulk Onboarding Engine</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>Upload Student Details (CSV / Excel)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload spreadsheets containing student profiles, DOB, gender, caste reservation, fee allocations, and custom enrollment fields.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowUploadStudentModal(false);
                  setUploadedStudentsPreview([]);
                  setUploadFileName('');
                  setUploadError(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Instructions Bar */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">Supported Formats: .csv, .xlsx, .xls</span>
                <span className="text-slate-500 block">
                  Mandatory headers: <strong className="text-slate-700">Roll No, Student Name, Date of Birth, Gender, Caste Category</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleDownloadSampleCSV}
                className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>

            {/* File Upload Drop Zone */}
            <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors relative">
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleStudentFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-sm block">
                    {uploadFileName ? uploadFileName : 'Click to select or drag & drop student spreadsheet'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {uploadFileName ? 'Spreadsheet loaded! Review the parsed records below.' : 'Excel (.xlsx, .xls) or CSV files with student roster data'}
                  </span>
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Preview Section */}
            {uploadedStudentsPreview.length > 0 && (
              <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                {/* Stats Summary Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Rows</span>
                    <span className="text-base font-bold text-slate-800">{uploadedStudentsPreview.length}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-emerald-700 block text-[10px] uppercase font-bold">New Records</span>
                    <span className="text-base font-bold text-emerald-800">
                      {uploadedStudentsPreview.filter(p => !students.some(s => s.rollNo.toLowerCase() === p.rollNo.toLowerCase())).length}
                    </span>
                  </div>
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-blue-700 block text-[10px] uppercase font-bold">Existing Updates</span>
                    <span className="text-base font-bold text-blue-800">
                      {uploadedStudentsPreview.filter(p => students.some(s => s.rollNo.toLowerCase() === p.rollNo.toLowerCase())).length}
                    </span>
                  </div>
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                    <span className="text-purple-700 block text-[10px] uppercase font-bold">Profile Mandatory Check</span>
                    <span className="text-base font-bold text-purple-800">
                      {uploadedStudentsPreview.filter(p => p.name && p.rollNo && p.dateOfBirth && p.gender && p.category).length} / {uploadedStudentsPreview.length}
                    </span>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl max-h-56">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Roll No</th>
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-3">DOB</th>
                        <th className="py-2 px-3">Gender</th>
                        <th className="py-2 px-3">Caste / Category</th>
                        <th className="py-2 px-3">Course & Branch</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {uploadedStudentsPreview.map((stu, i) => {
                        const isUpdate = students.some(s => s.rollNo.toLowerCase() === stu.rollNo.toLowerCase());
                        const isComplete = Boolean(stu.name && stu.rollNo && stu.dateOfBirth && stu.gender && stu.category);
                        return (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{stu.rollNo}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{stu.name}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{stu.dateOfBirth}</td>
                            <td className="py-2 px-3 text-slate-600">{stu.gender}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {stu.category}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500 truncate max-w-[150px]">{stu.course} · {stu.branch}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                {isUpdate ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                    Update Existing
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    New Enroll
                                  </span>
                                )}
                                {!isComplete && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Missing Fields
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                {uploadedStudentsPreview.length > 0 ? `${uploadedStudentsPreview.length} student records prepared for registration` : 'Please upload a CSV or Excel spreadsheet to proceed'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadStudentModal(false);
                    setUploadedStudentsPreview([]);
                    setUploadFileName('');
                    setUploadError(null);
                  }}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={uploadedStudentsPreview.length === 0 || isProcessingUpload}
                  onClick={handleConfirmImportStudents}
                  className="py-2 px-5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isProcessingUpload ? 'Processing...' : `Confirm & Register ${uploadedStudentsPreview.length} Students`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
