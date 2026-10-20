export type { Paisa } from '../utils/paisaMath';
export * from './calculations';

export type UserRole = 'student' | 'admin';

export type StaffRole = 
  | 'App_Admin'
  | 'Principal_DDO' 
  | 'Accounts_Officer' 
  | 'Librarian' 
  | 'HOD' 
  | 'Hostel_Warden' 
  | 'Cashier';

export interface UserSession {
  role: UserRole;
  id: string;
  name: string;
  emailOrPhone: string;
  email?: string;
  rollNo?: string;
  studentRefId?: string;
  staffDesignation?: string;
  staffRole?: StaffRole;
  isAppAdmin?: boolean;
  profilePicture?: string;
  canManageCertificateThemes?: boolean;
  dateOfBirth?: string;
}

export interface SchoolStaffUser {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  designation: string;
  department: string;
  status: 'Active' | 'Suspended' | 'Inactive';
  permissions: string[];
  createdAt: string;
  dateOfBirth?: string;
  lastLogin?: string;
  profilePicture?: string;
  password?: string;
  isFirstLogin?: boolean;
  passwordResetPending?: boolean;
  pendingNewPassword?: string;
  passwordResetRequestedAt?: string;
  passwordResetAuthorizedBy?: string;
  passwordResetAuthorizedAt?: string;
  canManageCertificateThemes?: boolean;
  certificateThemeServiceMappedBy?: string;
  certificateThemeServiceMappedAt?: string;
}

export interface FeeUploadBatchItem {
  id?: string;
  rollNo: string;
  studentName?: string;
  course?: string;
  semester?: number;
  promotedSemester?: number;
  promotionStatus?: string;
  currentTotalFee: number;
  newTotalFeePayable: number;
  difference: number;
  status: 'Matched' | 'Not_Found' | 'Invalid_Amount' | 'Duplicate';
  remarks?: string;
  rowNumber?: number;
}

export interface FeeUploadBatch {
  id: string;
  batchNo: string;
  fileName: string;
  fileSize?: string;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  academicSession: string;
  status: 'Pending_Approval' | 'Approved' | 'Rejected';
  authorizedAt?: string;
  authorizedBy?: {
    id: string;
    name: string;
    role: string;
    designation: string;
  };
  rejectionReason?: string;
  approvalRemarks?: string;
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  duplicateRecords?: number;
  invalidAmountRecords?: number;
  totalFeeBefore: number;
  totalFeeAfter: number;
  netDifference: number;
  items: FeeUploadBatchItem[];
  criticalErrors?: string[];
  warnings?: string[];
}

export type StudentQuota = 
  | 'General'
  | 'State Merit (Subsidized)'
  | 'TFW (Tuition Fee Waiver)'
  | 'SC/ST Post-Matric Freeship'
  | 'OBC / EWS Freeship'
  | 'General (Self-Financed)'
  | 'Physically Challenged (PWD)';

export type PaymentMethod = 
  | 'SBI Collect' 
  | 'e-Treasury' 
  | 'UPI' 
  | 'Dynamic UPI QR'
  | 'NetBanking' 
  | 'Card' 
  | 'Treasury Challan' 
  | 'Challan' 
  | 'Cash' 
  | 'Demand Draft' 
  | 'DD'
  | 'Cheque'
  | 'Online Gateway'
  | 'POS';

export type TransactionStatus = 'Success' | 'Pending' | 'Failed' | 'Reconciled' | 'Disputed' | 'Refunded';

// =================== ACADEMIC STREAM & SUBJECT MASTER ===================
export interface AcademicStream {
  id: string;
  code: string;             // e.g. "CSE", "ECE", "MECH", "BSC-MATH", "BCOM", "BA-ENG"
  name: string;             // e.g. "Computer Science & Engineering"
  degree: string;           // "B.Tech", "M.Tech", "B.Sc", "B.Com", "B.A", "BCA", "MCA"
  department: string;       // "Dept. of Computer Science & Engineering"
  totalSemesters: number;   // 8
  isActive: boolean;
}

export interface StudySubject {
  id: string;
  code: string;             // e.g. "CS-701"
  name: string;             // e.g. "Deep Learning & AI Lab"
  title?: string;           // Firestore schema compatibility alias
  streamCode: string;       // e.g. "CSE"
  semester: number;         // 7
  credits: number;          // 4
  type: 'Theory' | 'Practical_Lab' | 'Elective' | 'Project';
  subjectFee: number;        // Base/default amount as subject fee
  annualFee?: number;        // Tagged Annual Fee for this subject
  monthlyFee?: number;       // Tagged Monthly Fee for this subject
  semesterFee?: number;      // Tagged Semester Fee for this subject
  associatedLabFee?: number; // e.g. 2500
  labFee?: number;           // Dedicated Lab Fee
  otherFee?: number;         // Other Fee (Workshop/Library/IT)
  otherFeeLabel?: string;    // Custom label for other fee
  isActive: boolean;
}

// =================== DYNAMIC ENROLLMENT FIELDS ===================
export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'date';

export interface EnrollmentField {
  id: string;
  key: string;              // e.g. "gender", "caste_category", "domicile_state", "annual_income"
  label: string;            // e.g. "Gender", "Caste / Social Category"
  type: FieldType;
  options?: string[];       // for select type: e.g. ["Male", "Female", "Transgender"]
  defaultValue?: unknown;
  placeholder?: string;
  isRequired: boolean;
  mandatoryBeforeLogin?: boolean; // Must be obtained before login if not already captured
  isSystemField?: boolean;  // core fields vs custom fields
  isActive: boolean;
  isArchived?: boolean;     // Archived custom fields retain student attribute history
  category: 'Personal' | 'Academic' | 'Category_Quota' | 'Hostel_Transport' | 'Financial';
  isBillable?: boolean;     // Admin can make field billable as text or number
  billableAmount?: number;
  helpText?: string;
  displayOrder?: number;
}

// =================== CONCESSION & SURCHARGE RULES ===================
export type RuleAction = 'Concession' | 'Surcharge';
export type RuleCalculationMode = 'Percentage' | 'Flat_Amount';
export type RuleOperator = 'equals' | 'not_equals' | 'in_list' | 'less_than' | 'greater_than';

export interface ConcessionSurchargeRule {
  id: string;
  name: string;             // e.g. "Kanya Shiksha 100% Tuition Waiver"
  code: string;             // e.g. "CONC-GENDER-FEMALE"
  description: string;
  action: RuleAction;       // 'Concession' | 'Surcharge'
  calculationMode: RuleCalculationMode; // 'Percentage' | 'Flat_Amount'
  value: number;            // e.g. 100 for 100%, or 5000 for ₹5,000 flat
  targetHeadId?: string;    // 'ALL_TUITION' | 'TOTAL_FEE' | specific feeHead id
  criteriaField: string;    // e.g. "gender", "category", "quota", "annual_income"
  criteriaOperator: RuleOperator;
  criteriaValue: string | string[] | number;       // e.g. "Female" or ["SC", "ST"] or 250000
  isActive: boolean;
  priority: number;
}

// =================== REPORT GENERATION & USER ACCESS MAPPING ===================
export type ReportParameterType = 
  | 'gender' 
  | 'category' 
  | 'stream' 
  | 'feeStatus' 
  | 'dateRange' 
  | 'paymentGateway' 
  | 'concessionType';

export interface ReportConfig {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'Fee_Collection' | 'Defaulters_Audit' | 'Concession_Freeship' | 'Treasury_Scroll' | 'Stream_Ledger';
  supportedParameters: ReportParameterType[];
  accessibleRoles: StaffRole[];       // Roles allowed: e.g. ['App_Admin', 'Accounts_Officer', 'Principal_DDO']
  accessibleUserIds?: string[];      // Specific user IDs mapped
  outputColumns: string[];           // Columns to display/export
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

// =================== CERTIFICATE & FACILITY SERVICE OPTIONS ===================
export type FacilityCategory = 'Certificate' | 'Campus_Facility' | 'Academic_Service';

export interface FacilityServiceOption {
  id: string;
  code: string;
  title: string;
  description: string;
  category: FacilityCategory;
  isPayable: boolean;         // Admin decides whether Free or Payable
  feeAmount: number;          // Accountant/Accounts Officer sets this amount if isPayable is true
  feeSetBy?: string;          // Name/Role of accountant who fixed fee, e.g. "S. N. Sharma (Accounts Officer)"
  feeSetAt?: string;          // Timestamp of when fee was updated
  feeTreasuryCode?: string;   // DDO Treasury code e.g. "0202-01-800-01"
  processingDays: number;     // e.g. 2
  requiresNoDues: boolean;    // e.g. true for TC/Migration, false for Bonafide
  requiredDocuments: string[];// e.g. ['Identity Card Copy', 'Current Semester Fee Receipt']
  validity?: string;          // e.g. "Per Semester", "Academic Year", "One-Time"
  isActive: boolean;
  createdAt: string;
  createdBy: string;          // "Er. Amitav Sen (App Administrator)"
}

export interface FacilityApplication {
  id: string;
  applicationNo: string;
  serviceId: string;
  serviceCode: string;
  serviceTitle: string;
  serviceCategory: FacilityCategory;
  studentId: string;
  studentRollNo: string;
  studentName: string;
  course: string;
  purpose: string;
  additionalRemarks?: string;
  appliedDate: string;
  isPayable: boolean;
  feeAmount: number;
  feeStatus: 'Not_Required' | 'Pending_Payment' | 'Paid';
  paymentReceiptNo?: string;
  paymentMode?: string;
  paymentDate?: string;
  status: 'Submitted' | 'Under_Review' | 'Approved' | 'Rejected' | 'Ready_For_Pickup';
  approvalRemarks?: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface FeeHeadItem {
  id: string;
  name: string;
  category: 'Tuition' | 'Academic' | 'Treasury' | 'Hostel' | 'Transport' | 'One-Time' | 'Refundable' | 'Lab_Subject';
  amount: number;
  treasuryHeadCode?: string; // e.g., 0202-01-102-01 (State Govt Higher Ed)
  isMandatory: boolean;
  isTaxExempt: boolean;
  frequency?: 'Per_Semester' | 'Annual' | 'One_Time';
  applicableStreams?: string[];   // stream codes: ['CSE', 'ECE'] or ['ALL']
  applicableSubjects?: string[];  // subject codes: ['CS-701']
  applicableQuota?: StudentQuota[];
}

export interface FeeStructure {
  id: string;
  course: string;
  branch: string;
  academicYear: string;
  semester: number;
  quota: StudentQuota;
  heads: FeeHeadItem[];
  dueDate: string;
  gracePeriodDays: number;
  lateFeePerDay: number;
  maxLateFee: number;
}

export interface Student {
  id: string;
  rollNo: string;
  registerNo: string;
  name: string;
  gender?: 'Male' | 'Female' | 'Other';
  fatherName: string;
  parentName?: string;
  email: string;
  phone: string;
  parentPhone: string;
  course: string;
  branch: string;
  streamCode?: string;
  subjectsEnrolled?: string[];
  year: number;
  semester: number;
  admissionYear: number;
  dateOfBirth: string;
  category: string; // GEN, OBC, SC, ST, EWS
  subCaste?: string;
  domicileState?: string;
  annualFamilyIncome?: number;
  quota: StudentQuota;
  hostelResident: boolean;
  hostelRoomNo?: string;
  busUser?: boolean;
  scholarshipWaiverPercent: number;
  scholarshipName?: string;
  appliedConcessions?: { ruleName: string; amount: number }[];
  appliedSurcharges?: { ruleName: string; amount: number }[];
  customFields?: Record<string, unknown>;
  totalFee: number;
  paidFee: number;
  pendingFee: number;
  lateFineApplied: number;
  hallTicketBlocked: boolean;
  profilePicture?: string;
  profileCompleted?: boolean;
  password?: string;
  isActivated?: boolean;
  passwordSetAt?: string;
  pendingProfileModifications?: {
    status: 'Pending' | 'Approved' | 'Rejected';
    submittedAt: string;
    annualFamilyIncome?: number;
    domicileState?: string;
    quota?: StudentQuota;
    hostelResident?: boolean;
    sportsQuota?: string;
    physicallyHandicapped?: boolean;
    incomeProofDocument?: string;
    quotaProofDocument?: string;
    officeRemarks?: string;
    reviewedBy?: string;
    reviewedAt?: string;
  };
}

export interface FeeTransaction {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  rollNo: string;
  course: string;
  semester: number;
  amount: number;
  amountPaid?: number;
  lateFineIncluded: number;
  discountApplied: number;
  paymentMethod: PaymentMethod;
  gateway?: string; // e.g. SBI Collect, Razorpay, Cashfree, PayU, PhonePe, Treasury Counter
  gatewayTransactionId?: string; // DU Reference number in SBI Collect
  transactionId?: string;
  bankUtr?: string; // CIN or BRN
  treasuryHeadCode?: string;
  timestamp: string;
  date?: string;
  status: TransactionStatus;
  cashierName?: string;
  remarks?: string;
  headsAllocated: { headName: string; amount: number; treasuryCode?: string }[];
  lineItems?: Array<{ name: string; amount: number; category?: string }>;
}

// =================== NO DUES (NOC) WORKFLOW ===================

export type DepartmentKey = 
  | 'accounts'
  | 'library'
  | 'department_lab'
  | 'hostel_mess'
  | 'sports'
  | 'ncc_nss'
  | 'placement_alumni';

export interface DepartmentClearance {
  key: DepartmentKey;
  name: string;
  officerName: string;
  status: 'Approved' | 'Pending' | 'Dues_Pending';
  dueAmount: number;
  dueReason?: string;
  clearedDate?: string;
  receiptReference?: string;
}

export interface StudentNoDuesApplication {
  id: string;
  applicationNo: string;
  studentId: string;
  studentRollNo: string;
  studentName: string;
  course: string;
  branch: string;
  reason: 'Semester Examination' | 'Completion of Course (TC/Degree)' | 'Migration to other University' | 'Withdrawal / Relocation';
  appliedDate: string;
  overallStatus: 'Approved' | 'In_Progress' | 'Rejected';
  certificateGenerated: boolean;
  certificateNo?: string;
  clearances: Record<DepartmentKey, DepartmentClearance>;
}

// =================== CERTIFICATE ISSUANCE SYSTEM ===================

export type CertificateType = 
  | 'Bonafide Certificate'
  | 'No Dues Clearance Certificate'
  | 'Transfer Certificate (TC) & Character'
  | 'Migration Certificate'
  | 'Provisional Passing Certificate'
  | 'Caution Money Refund Voucher';

export interface CertificateRequest {
  id: string;
  requestNo: string;
  studentId: string;
  studentRollNo: string;
  studentName: string;
  course: string;
  branch: string;
  certificateType: CertificateType;
  purpose: string;
  statutoryFee: number;
  feePaid: boolean;
  feeReceiptNo?: string;
  noDuesVerified: boolean;
  appliedDate: string;
  status: 'Applied' | 'Verified' | 'Principal_Approved' | 'Ready_To_Issue' | 'Issued' | 'Rejected';
  approvedDate?: string;
  approvedBy?: string;
  issuedDate?: string;
  certificateSerialNo?: string;
  dispatchMode: 'Digital Download' | 'Physical Collect at Academic Counter' | 'Postal SpeedPost';
  conductStatus?: 'Exemplary' | 'Very Good' | 'Good' | 'Satisfactory';
}

// =================== CERTIFICATE THEME SYSTEM ===================

export type CertificateBorderPattern = 
  | 'double-gold' 
  | 'royal-filigree' 
  | 'imperial-triple' 
  | 'vintage-guilloche' 
  | 'modern-minimal' 
  | 'ornate-crest';

export type CertificateFontFamily = 
  | 'font-serif' 
  | 'font-sans' 
  | 'font-mono' 
  | 'cinzel' 
  | 'playfair';

export type CertificateSealType = 
  | 'gold-foil' 
  | 'state-emblem' 
  | 'bronze-crest' 
  | 'silver-embossed' 
  | 'academic-monogram';

export interface CertificateTheme {
  id: string;
  name: string;
  description?: string;
  certificateType: CertificateType | 'All';
  isDefault: boolean;
  borderPattern: CertificateBorderPattern;
  primaryBorderColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: CertificateFontFamily;
  watermarkText: string;
  watermarkOpacity: number;
  sealType: CertificateSealType;
  sealPosition: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-right';
  showQrCode: boolean;
  headerStyle: 'classic-centered' | 'ornate-arch' | 'modern-split';
  customTitlePrefix?: string;
  footerMotto?: string;
  signatories: {
    primaryTitle: string;
    secondaryTitle?: string;
    tertiaryTitle?: string;
  };
  createdByStaffId?: string;
  createdByStaffName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReconciliationBatchItem {
  id: string;
  date: string;
  gateway: string;
  gatewayTxId: string;
  erpReceiptNo: string;
  studentRollNo: string;
  gatewayAmount: number;
  settledAmount: number;
  feeMdr: number;
  bankUtr: string;
  erpAmount: number;
  treasuryHeadCode?: string;
  status: 'Matched' | 'Mismatched_Amount' | 'Missing_in_ERP' | 'Pending_Settlement';
  resolutionNotes?: string;
}

export interface GatewayComparison {
  name: string;
  tagline: string;
  upiMdr: string;
  cardsMdr: string;
  netBankingMdr: string;
  settlementCycle: string;
  virtualAccountSupport: boolean;
  webhookSpeed: string;
  tallySync: boolean;
  strengths: string[];
  bestSuitedFor: string;
  marketShareEdu: string;
  recommendedRating: number;
}

// =================== STUDENT NOTIFICATIONS ===================
export type NotificationType = 'fee_due' | 'no_dues' | 'achievement' | 'general';
export type NotificationUrgency = 'urgent' | 'warning' | 'info' | 'success';

export interface StudentNotification {
  id: string;
  studentRollNo: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  urgency: NotificationUrgency;
  isRead: boolean;
  dueDate?: string;
  dueAmount?: number;
  actionTab?: 'fees' | 'nodues' | 'achievements' | 'certificates' | 'home' | 'apply';
  actionLabel?: string;
  departmentKey?: string;
  receiptId?: string;
}

// =================== STUDENT ACHIEVEMENTS ===================
export type AchievementCategory = 
  | 'Academic' 
  | 'Sports' 
  | 'Technical' 
  | 'Cultural' 
  | 'Leadership' 
  | 'Research' 
  | 'Hackathon' 
  | 'Certification' 
  | 'Other';

export interface StudentAchievement {
  id: string;
  studentRollNo: string;
  studentName?: string;
  title: string;
  category: AchievementCategory;
  description: string;
  date: string;
  academicYear?: string;
  awardedBy: string;
  recordedByStaffId: string;
  recordedByStaffName: string;
  recordedByStaffRole: string;
  certificateUrl?: string;
  badgeLevel?: 'Gold' | 'Silver' | 'Bronze' | 'Special Honor' | 'Participation';
  scoreOrRank?: string;
  gemsAwarded?: number;     // Institutional Gem points awarded to student (e.g. 10, 25, 50 gems)
  gemReason?: string;
  createdAt: string;
}

export interface StaffHonorAuthority {
  id: string;
  staffEmail: string;
  staffName: string;
  designation: string;
  canAwardGems: boolean;
  canAwardAchievements: boolean;
  maxGemsPerAward?: number;
  authorizedBy: string;      // Admin or Accountant who designated authority
  authorizedAt: string;
  isActive: boolean;
}

// =================== DYNAMIC QR CONFIGURATION ===================
export interface DynamicQrConfig {
  isActive: boolean;
  merchantName: string;
  upiId: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountType: 'Govt_Treasury' | 'SBI_Collect_Current' | 'College_Development_Fund' | 'Student_Welfare_Account';
  treasuryHeadCode: string;
  requireExactAmount: boolean;
  allowPartialPayment: boolean;
  updatedBy: string;
  updatedAt: string;
}

// =================== HELPDESK & SUPPORT SYSTEM ===================
export interface HelpdeskCriterion {
  id: string;
  category: string;
  description: string;
  supportEmail: string;
  chatEnabled: boolean;
  typicalResponseTime: string;
}

export interface HelpdeskConfig {
  isGlobalChatActive: boolean;
  criteria: HelpdeskCriterion[];
}

export interface HelpdeskChatMessage {
  id: string;
  sender: 'user' | 'support_agent' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface HelpdeskTicket {
  id: string;
  ticketNo: string;
  criterionId: string;
  criterionCategory: string;
  userType: 'student' | 'staff' | 'admin';
  userName: string;
  userIdentifier: string; // Roll No or Email
  userEmail: string;
  subject: string;
  message: string;
  mode: 'chat' | 'mail';
  status: 'Open' | 'In_Progress' | 'Resolved';
  assignedSupportEmail: string;
  createdAt: string;
  chatHistory?: HelpdeskChatMessage[];
}

// =================== INSTITUTIONAL COLLEGE PROFILE ===================
export interface CollegeProfile {
  id: string; // 'primary'
  name: string; // e.g. 'RLSY College'
  shortName: string; // e.g. 'RLSY'
  fullName: string; // e.g. 'Ram Lakhan Singh Yadav College, Patna'
  dept: string; // e.g. 'Department of Higher Education · Affiliated with Patna College'
  accreditation: string; // e.g. 'Affiliated with Patna College · UGC Approved · NAAC Accredited'
  affiliation: string; // e.g. 'Patna College (Affiliated)'
  address: string; // e.g. 'RLSY College Campus, Patna, Bihar - 800001'
  contactEmail: string; // e.g. 'office@rlsycollege.ac.in'
  accountsEmail: string; // e.g. 'accounts@rlsycollege.ac.in'
  contactPhone: string; // e.g. '(0612) 237-1904 · 237-1905'
  helplinePhone: string; // e.g. '+91 94310 12345'
  treasuryCode: string; // e.g. 'DDO Code: 2049-RLSY-PATNA · Head of Account: 0202-01-102-01'
  ddoTreasuryCode: string; // e.g. '2049-RLSY-PATNA'
  ifmsReceiptHead: string; // e.g. '0202-01-102-01'
  academicSession: string; // e.g. '2025-2026'
  currentTerm: string; // e.g. 'Session 2025-26'
  principalName: string; // e.g. 'Prof. (Dr.) Ramakant Sharma'
  principalTitle: string; // e.g. 'Principal & DDO'
  officeHours: string; // e.g. 'Monday to Saturday: 10:00 AM – 04:30 PM'
  websiteUrl: string; // e.g. 'https://rlsycollege.ac.in'
  establishedYear: string; // e.g. '1971'
  bannerNotice?: string;
  updatedAt?: string;
  updatedBy?: string;
}

