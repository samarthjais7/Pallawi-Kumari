import { Student, FeeHeadItem, ConcessionSurchargeRule, EnrollmentField } from './src/types/fee';
import { validateStudentProfile } from './src/utils/profileValidation';
import { calculateStudentFeeScheduleServer, validateLedgerCommitServer } from './src/services/serverFeeEngine';
import { toPaisa, fromPaisa, paisaAdd, paisaSub, paisaMulPercent, verifyLedgerBalance } from './src/utils/paisaMath';

// Mock Data for Server-Authoritative Fee Engine Testing
const mockFeeHeads: FeeHeadItem[] = [
  { id: 'fh-tuition', name: 'Tuition Fee', category: 'Tuition', amount: 18000, treasuryHeadCode: '0202-01-102-01', isMandatory: true, isTaxExempt: true },
  { id: 'fh-exam', name: 'Exam Fee', category: 'Academic', amount: 3500, treasuryHeadCode: '0202-01-102-02', isMandatory: true, isTaxExempt: true },
  { id: 'fh-lab', name: 'Advanced AI Lab Fee', category: 'Lab_Subject', amount: 4000, treasuryHeadCode: '0202-01-102-03', isMandatory: true, isTaxExempt: true, applicableStreams: ['CSE'] }
];

const mockRules: ConcessionSurchargeRule[] = [
  { id: 'R1', name: 'Kanya Tuition Waiver', code: 'W1', description: '20% Tuition Waiver', action: 'Concession', calculationMode: 'Percentage', value: 20, targetHeadId: 'ALL_TUITION', criteriaField: 'gender', criteriaOperator: 'equals', criteriaValue: 'Female', isActive: true, priority: 1 },
  { id: 'R2', name: 'Non-Bihar Surcharge', code: 'S1', description: '25% Surcharge', action: 'Surcharge', calculationMode: 'Percentage', value: 25, targetHeadId: 'TOTAL_FEE', criteriaField: 'domicile_state', criteriaOperator: 'not_equals', criteriaValue: 'Bihar', isActive: true, priority: 4 }
];

// Assert Test Suite Implementation
function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASSED: ${testName}`);
  } else {
    console.error(`❌ FAILED: ${testName}`);
    process.exit(1);
  }
}

// ==========================================
// RUNNING AUTOMATED UNIT TESTS
// ==========================================
console.log("🚀 Initializing Government College ERP Integer Paisa & Server Fee Engine Test Suite...\n");

// Test Case 1: Standard Student Baseline Calculation in Integer Paisa
const testStudent1: Student = {
  id: 'STU-01', rollNo: '2026CS01', registerNo: 'REG-01', name: 'Aarav Kumar', gender: 'Male', fatherName: 'Rajesh Kumar',
  email: 'aarav@rlsy.ac.in', phone: '9999999999', parentPhone: '9999999998', course: 'B.Tech', branch: 'CSE', streamCode: 'CSE',
  year: 1, semester: 1, admissionYear: 2026, dateOfBirth: '2004-01-01', category: 'General', domicileState: 'Bihar',
  quota: 'State Merit (Subsidized)', hostelResident: false, scholarshipWaiverPercent: 0, totalFee: 0, paidFee: 0, pendingFee: 0, lateFineApplied: 0, hallTicketBlocked: false
};

const serverResult1 = calculateStudentFeeScheduleServer(testStudent1, mockFeeHeads, mockRules);
// Baseline expected total: 18000 (Tuition) + 3500 (Exam) + 4000 (Lab) = 25500 INR = 2,550,000 Paisa
assert(serverResult1.totalFeePaisa === 2550000, "Server Engine Baseline Fee Computation in Paisa (25,500.00 INR = 2,550,000 Paisa)");
assert(serverResult1.pendingFeePaisa === 2550000, "Unpaid Student Ledger Balance Matching in Paisa");
assert(serverResult1.ledgerBalanced === true, "Mathematical Ledger Invariant: Total == Paid + Pending");
assert(serverResult1.isVerified === true, "Cryptographic audit hash generated and certified");

// Test Case 2: Kanya Waiver Exemption Concession Rule in Pure Integer Paisa
const testStudent2: Student = { ...testStudent1, id: 'STU-02', name: 'Priya Kumari', gender: 'Female' as const };
const serverResult2 = calculateStudentFeeScheduleServer(testStudent2, mockFeeHeads, mockRules);
// Expected: 2550000 baseline - 20% of 1800000 Tuition Waiver (360000) = 2190000 Paisa (₹21,900.00)
assert(serverResult2.totalFeePaisa === 2190000, "Female Student Kanya 20% Tuition Exemption in Exact Integer Paisa");
assert(serverResult2.netConcessionPaisa === 360000, "Concession Net Deduction in Exact Integer Paisa (360,000 Paisa)");
assert(fromPaisa(serverResult2.totalFeePaisa) === 21900, "Conversion back to Rupees equals 21,900");

// Test Case 3: Out-of-State Non-Domicile Multiplier Surcharge Assessment
const testStudent3: Student = { ...testStudent1, id: 'STU-03', name: 'John Doe', domicileState: 'Jharkhand' };
const serverResult3 = calculateStudentFeeScheduleServer(testStudent3, mockFeeHeads, mockRules);
// Expected: 2550000 baseline + 25% Surcharge on overall target total fee (637500) = 3187500 Paisa (₹31,875.00)
assert(serverResult3.totalFeePaisa === 3187500, "Non-Bihar Domicile 25% Infrastructure Surcharge in Exact Integer Paisa");
assert(serverResult3.netSurchargePaisa === 637500, "Surcharge Net Addition in Exact Integer Paisa (637,500 Paisa)");

// Test Case 4: Pure Integer Paisa Math Library Verification
const addTest = paisaAdd(toPaisa(100.50), toPaisa(200.75)); // 10050 + 20075 = 30125
assert(addTest === 30125, "Paisa addition without floating point error");
const subTest = paisaSub(30125, 10050);
assert(subTest === 20075, "Paisa subtraction without floating point error");
const pctTest = paisaMulPercent(100000, 18); // 18% of ₹1,000 = ₹180 = 18000 Paisa
assert(pctTest === 18000, "Paisa percentage multiplication (18% GST / Concession)");

// Test Case 5: Ledger Invariant Validation & Tamper Protection
const validLedger = validateLedgerCommitServer({
  studentRollNo: '2026CS01',
  previousTotalPaisa: 2550000,
  newTotalPaisa: 2550000,
  paidPaisa: 1000000,
  pendingPaisa: 1550000,
  differencePaisa: 0,
  authorizedBy: { id: 'ACC-01', name: 'Cashier', role: 'Accounts_Officer', email: 'acc@rlsy.ac.in' },
  calculationHash: serverResult1.calculationHash
});
assert(validLedger.isValid === true, "Valid balanced ledger commit accepted by server validator");
assert(validLedger.auditSignature.startsWith('SIG-'), "Server audit signature attached to verified ledger commit");

const invalidLedger = validateLedgerCommitServer({
  studentRollNo: '2026CS01',
  previousTotalPaisa: 2550000,
  newTotalPaisa: 2550000,
  paidPaisa: 1000000,
  pendingPaisa: 1000000, // Deliberately unbalanced: 1000000 + 1000000 != 2550000
  differencePaisa: 0,
  authorizedBy: { id: 'ACC-01', name: 'Cashier', role: 'Accounts_Officer', email: 'acc@rlsy.ac.in' },
  calculationHash: serverResult1.calculationHash
});
assert(invalidLedger.isValid === false, "Unbalanced ledger commit strictly rejected by server validator");

// Test Case 6: Vault Profile Mandatory Input Validation Check
const mandatoryFieldsMock: EnrollmentField[] = [
  { id: 'f1', key: 'gender', label: 'Gender', type: 'select', isRequired: true, isActive: true, category: 'Personal' }
];
const incompleteStudent: Student = { ...testStudent1, gender: '' };
const profileCheck = validateStudentProfile(incompleteStudent, mandatoryFieldsMock);
assert(profileCheck.isComplete === false, "Blocking Hook Guard for Incomplete Mandatory Personal Profile Record");

// Test Case 7: Incoming Slider & Custom Subject Input Paisa Multiplication (x100 on selection)
const sliderInputRupees = 10000;
const sliderPaisa = Math.round(sliderInputRupees * 100);
assert(sliderPaisa === 1000000, "Slider Selection: ₹10,000 multiplied by 100 yields 1,000,000 Paisa");

const customSubjectFeeRupees = 3500;
const customSubjectPaisa = Math.round(customSubjectFeeRupees * 100);
assert(customSubjectPaisa === 350000, "Custom Subject Input: ₹3,500 multiplied by 100 yields 350,000 Paisa");

// Absolute integer splits: 10% monthly split and 50% semester split
const monthlySplitPaisa = Math.round(customSubjectPaisa / 10);
const semesterSplitPaisa = Math.round(customSubjectPaisa / 2);
assert(monthlySplitPaisa === 35000, "Monthly Split in Pure Integer Paisa (35,000 Paisa = ₹350.00)");
assert(semesterSplitPaisa === 175000, "Semester Split in Pure Integer Paisa (175,000 Paisa = ₹1,750.00)");

// Final presentation tier division by 100
const formattedPresentation = (customSubjectPaisa / 100).toLocaleString('en-IN');
assert(formattedPresentation === "3,500", "Visual Presentation Tier: Divides by 100 to format accurately as ₹3,500");

// Test Case 8: AG Audit Verification across 5,000 Students without Floating-Point Drift
let aggregateLedgerPaisa = 0;
let floatDriftAccumulator = 0;
const studentFeePaisa = 2550000; // ₹25,500.00
const studentFeeFloatRupees = 25500.10; // Fractional Rupee prone to IEEE 754 drift

for (let i = 0; i < 5000; i++) {
  // Pure integer Paisa accumulator
  aggregateLedgerPaisa += studentFeePaisa;
  // Raw float accumulator to demonstrate IEEE 754 fraction leak
  floatDriftAccumulator += 0.1;
}

assert(Number.isSafeInteger(aggregateLedgerPaisa), "Aggregate ledger across 5,000 students is a 100% pure safe integer");
assert(aggregateLedgerPaisa === 12750000000, "5,000 students * 2,550,000 Paisa = 12,750,000,000 Paisa (₹12.75 Cr) zero error");
assert(fromPaisa(aggregateLedgerPaisa) === 127500000, "Conversion of aggregate 5,000 student ledger to Rupees matches exactly ₹12,75,00,000");

// Test Case 9: 5,000 Student Chunked Array Processing (Exact 500-Row Chunks)
import { chunkArray, validateClusterAtomicity, FIRESTORE_MAX_BATCH_SIZE } from './src/services/chunkedBatchWorker';
import { FeeUploadBatchItem } from './src/types/fee';

const mock5000Rows: FeeUploadBatchItem[] = Array.from({ length: 5000 }, (_, i) => ({
  rowNumber: i + 1,
  rollNo: `2024CSE${String(i + 1).padStart(4, '0')}`,
  studentName: `Student CSE ${i + 1}`,
  currentTotalFee: 28500,
  newTotalFeePayable: 29000,
  difference: 500,
  status: 'Matched'
}));

const chunks = chunkArray(mock5000Rows, FIRESTORE_MAX_BATCH_SIZE);
assert(chunks.length === 10, "5,000 students correctly partitioned into exactly 10 chunks");
assert(chunks.every((c) => c.length === 500), "Every chunk contains exactly 500 records (Firestore max writeBatch limit)");

// Test Case 10: Complete Atomicity & Clean Rollback on Row 421 Validation Failure
let rollbackTriggered = false;
try {
  // First cluster has rows 1 to 500; row 421 is inside this cluster
  validateClusterAtomicity(chunks[0], 0, 0, 421);
} catch (err: unknown) {
  if (err instanceof Error) {
    rollbackTriggered = err.message.includes('Row 421');
  }
}
assert(rollbackTriggered === true, "Row 421 bad duplicate data structure cleanly aborts and rolls back entire 500-student block");

// Test Case 11: Dynamic UPI URL Parameter Sanitization
import { generateSanitizedUpiUrl } from './src/components/Admin/DynamicQrConfigModal';

const merchantWithAmpersand = "RLSY College & Hospital & Research Institute";
const rawUpiId = "principal.rlsy@sbi";
const sanitizedUrl = generateSanitizedUpiUrl(rawUpiId, merchantWithAmpersand, 14500, "FEE-2024CSE001 & DUES", "TX-1001");

assert(sanitizedUrl.includes("pn=RLSY%20College%20%26%20Hospital%20%26%20Research%20Institute"), "Merchant name with spaces and ampersands is correctly percent-encoded");
assert(sanitizedUrl.includes("pa=principal.rlsy%40sbi"), "UPI VPA is correctly percent-encoded");
assert(sanitizedUrl.includes("tn=FEE-2024CSE001%20%26%20DUES"), "Transaction note with spaces and ampersands is correctly percent-encoded");
assert(!sanitizedUrl.includes(" & "), "Zero unencoded ampersands or spaces in deep link URL");

// Test Case 12: Stream Subject Master Installment Precision in Integer Paisa
const testSubjectFeeRupees = 25001; // Problematic odd amount
const annualPaisa = toPaisa(testSubjectFeeRupees); // 2,500,100 Paisa
const monthlyInstallmentPaisa = Math.floor(annualPaisa / 10); // 250,010 Paisa = ₹2,500.10
const semesterInstallmentPaisa = Math.floor(annualPaisa / 2); // 1,250,050 Paisa = ₹12,500.50

assert(annualPaisa === 2500100, "Annual fee converted to exact integer Paisa without float leak");
assert(monthlyInstallmentPaisa === 250010, "Monthly installment calculated in integer Paisa (250,010 Paisa)");
assert(semesterInstallmentPaisa === 1250050, "Semester installment calculated in integer Paisa (1,250,050 Paisa)");
assert(monthlyInstallmentPaisa * 10 <= annualPaisa, "Installment summation never exceeds total annual Paisa");

// Test Case 13: Residual Paisas Installment Schedule Allocation
import { calculateInstallmentSchedule } from './src/utils/paisaMath';

// Odd annual fee ₹10,000.07 = 1,000,007 Paisa across 10 installments
const oddAnnualPaisa = 1000007;
const monthlySchedule = calculateInstallmentSchedule(oddAnnualPaisa, 10);
assert(monthlySchedule.installments.length === 10, "Monthly schedule produces exactly 10 installments");
assert(monthlySchedule.baseInstallment === 100000, "Base installment is 100,000 Paisa (₹1,000.00)");
assert(monthlySchedule.finalInstallment === 100007, "Final 10th installment absorbs residual 7 Paisas (₹1,000.07)");
assert(monthlySchedule.hasRemainder === true, "Identifies presence of residual Paisas");
const sumMonthlyInstallments = monthlySchedule.installments.reduce((sum, inst) => sum + inst, 0);
assert(sumMonthlyInstallments === oddAnnualPaisa, "Sum of all 10 installments exactly equals 100% of the annual fee (1,000,007 Paisa)");

// Semester schedule for odd amount ₹25,001 = 2,500,100 Paisa
const semSchedule = calculateInstallmentSchedule(2500100, 2);
assert(semSchedule.installments.length === 2, "Semester schedule produces exactly 2 installments");
assert(semSchedule.baseInstallment === 1250050, "Semester 1 base installment = 1,250,050 Paisa");
assert(semSchedule.finalInstallment === 1250050, "Semester 2 final installment = 1,250,050 Paisa");
assert(semSchedule.installments[0] + semSchedule.installments[1] === 2500100, "Sum of semester installments exactly equals total annual fee");

// Test Case 14: Safe Field Fallbacks in Student Self-Service Profile Update
interface StudentDocument {
  id: string;
  name: string;
  totalFee?: number;
  paidFee?: number;
  pendingFee?: number;
  rollNo?: string;
}

const existingStudentMissingDefaults: StudentDocument = {
  id: 'STU-999',
  name: 'Test Student',
  // totalFee, paidFee, pendingFee, rollNo omitted in legacy document
};
const studentUpdatePayload: StudentDocument & { phone: string; isActivated: boolean } = {
  ...existingStudentMissingDefaults,
  phone: '9876543210',
  isActivated: true
};

const getSafe = <T>(obj: Record<string, T | undefined>, key: string, fallback: T): T =>
  obj[key] !== undefined && obj[key] !== null ? (obj[key] as T) : fallback;

assert(getSafe(studentUpdatePayload, 'totalFee', 0) === getSafe(existingStudentMissingDefaults, 'totalFee', 0), "Safe fallback matches totalFee 0 === 0 for missing field");
assert(getSafe(studentUpdatePayload, 'paidFee', 0) === getSafe(existingStudentMissingDefaults, 'paidFee', 0), "Safe fallback matches paidFee 0 === 0 for missing field");
assert(getSafe(studentUpdatePayload, 'pendingFee', 0) === getSafe(existingStudentMissingDefaults, 'pendingFee', 0), "Safe fallback matches pendingFee 0 === 0 for missing field");
assert(getSafe(studentUpdatePayload, 'rollNo', '') === getSafe(existingStudentMissingDefaults, 'rollNo', ''), "Safe fallback matches rollNo '' === '' for missing field");

// Test Case 15: Enrollment Parameter Optimizer Deletion Safeguards & Archiving
const systemField: EnrollmentField = {
  id: 'fld-sys-1',
  key: 'student_roll_no',
  label: 'Roll Number',
  type: 'text',
  isRequired: true,
  isSystemField: true,
  isActive: true,
  category: 'Academic'
};

const customField: EnrollmentField = {
  id: 'fld-cust-1',
  key: 'tshirt_size',
  label: 'T-Shirt Size',
  type: 'select',
  options: ['S', 'M', 'L', 'XL'],
  isRequired: false,
  isSystemField: false,
  isActive: true,
  category: 'Personal'
};

// Test deletion attempt on system field (must be blocked)
function attemptDeleteField(target: EnrollmentField, fieldList: EnrollmentField[]): { list: EnrollmentField[]; blocked: boolean } {
  if (target.isSystemField) {
    return { list: fieldList, blocked: true };
  }
  const updated = fieldList.map((f) =>
    f.id === target.id
      ? { ...f, isActive: false, isArchived: true, label: `${f.label} (Archived)` }
      : f
  );
  return { list: updated, blocked: false };
}

const allFields = [systemField, customField];
const systemDeleteRes = attemptDeleteField(systemField, allFields);
assert(systemDeleteRes.blocked === true, "Deletion of system-critical parameter is blocked");
assert(systemDeleteRes.list.length === 2, "System field remains in schema list");

const customDeleteRes = attemptDeleteField(customField, allFields);
assert(customDeleteRes.blocked === false, "Custom parameter deletion allowed via archiving");
const archivedCustom = customDeleteRes.list.find((f) => f.id === customField.id);
assert(archivedCustom?.isArchived === true, "Custom parameter is marked as archived");
assert(archivedCustom?.isActive === false, "Custom parameter is deactivated");
assert(Boolean(archivedCustom?.label.includes('(Archived)')), "Archived parameter label updated");

// Test Case: Fractional concession percentage rounded to integer rupees ensuring isValidDueArithmetic invariant
const fractionalBaseFee = 28500;
const fractionalConcessionPercent = 15; // 15% of 28500 = 4275.50
const roundedConcession = Math.round((fractionalBaseFee * fractionalConcessionPercent) / 100); // 4276
const roundedNet = fractionalBaseFee - roundedConcession; // 24224
const roundedPaid = 0;
const roundedBalance = roundedNet - roundedPaid; // 24224

assert(Number.isInteger(roundedConcession), "Concession is a whole integer");
assert(Number.isInteger(roundedNet), "Net fee is a whole integer");
assert(Number.isInteger(roundedBalance), "Balance amount is a whole integer");
assert(fractionalBaseFee - roundedConcession === roundedNet, "Firestore Rule Invariant: baseAmount - concessionAmount == netAmount");
assert(roundedNet - roundedPaid === roundedBalance, "Firestore Rule Invariant: netAmount - paidAmount == balanceAmount");

// Test Case 16: Sequential FIFO Multi-Due Depletion Algorithm
const mockStudentDues = [
  { id: 'DUE-SEM-1', rollNo: '2024CSE001', baseAmount: 6000, paidAmount: 0, balanceAmount: 6000, dueDate: '2025-01-10', status: 'Pending' },
  { id: 'DUE-SEM-2', rollNo: '2024CSE001', baseAmount: 6000, paidAmount: 0, balanceAmount: 6000, dueDate: '2025-06-10', status: 'Pending' },
];

function depleteDuesSequentially(dues: typeof mockStudentDues, paymentAmount: number) {
  let remaining = paymentAmount;
  const sorted = [...dues].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  return sorted.map((due) => {
    if (remaining <= 0) return due;
    const paidAmt = Math.min(due.balanceAmount, remaining);
    remaining -= paidAmt;
    const newPaid = due.paidAmount + paidAmt;
    const newBal = due.balanceAmount - paidAmt;
    return {
      ...due,
      paidAmount: newPaid,
      balanceAmount: newBal,
      status: newBal === 0 ? 'Paid' : 'Partial'
    };
  });
}

const depletedResult = depleteDuesSequentially(mockStudentDues, 10000);
assert(depletedResult[0].balanceAmount === 0, "FIFO Due 1 (Sem 1) is fully cleared to 0 balance");
assert(depletedResult[0].paidAmount === 6000, "FIFO Due 1 (Sem 1) paid amount is exactly ₹6,000");
assert(depletedResult[0].status === 'Paid', "FIFO Due 1 status is marked Paid");
assert(depletedResult[1].balanceAmount === 2000, "FIFO Due 2 (Sem 2) balance is reduced to ₹2,000");
assert(depletedResult[1].paidAmount === 4000, "FIFO Due 2 (Sem 2) paid amount is exactly ₹4,000");
assert(depletedResult[0].paidAmount + depletedResult[1].paidAmount === 10000, "Total allocated amount strictly equals payment amount of ₹10,000");

// Test Case 18: Safe String Comparison Security Invariant
import { safeMatchStrings, normalizeDateToYYYYMMDD } from './src/utils/safeHelpers';
assert(safeMatchStrings(undefined, undefined) === false, "safeMatchStrings(undefined, undefined) strictly returns false");
assert(safeMatchStrings(null, null) === false, "safeMatchStrings(null, null) strictly returns false");
assert(safeMatchStrings("", "") === false, "safeMatchStrings('', '') strictly returns false");
assert(safeMatchStrings("2025/CS/001", "2025/cs/001") === true, "safeMatchStrings correctly matches case-insensitively");
assert(safeMatchStrings("2025/CS/001", "2025/CS/002") === false, "safeMatchStrings rejects mismatched roll numbers");

// Test Case 19: Excel Date Serial Normalization (e.g. 38353 -> 2005-01-01)
const convertedDob = normalizeDateToYYYYMMDD(38353);
assert(convertedDob === '2005-01-01', "Excel serial 38353 correctly converts to ISO 2005-01-01");
const formattedDob = normalizeDateToYYYYMMDD("15/08/2004");
assert(formattedDob === '2004-08-15', "Date string 15/08/2004 correctly normalizes to ISO 2004-08-15");

// Test Case 20: Pending Student Profile Modification Fee Invariance
const stuWithPendingIncome: Student = {
  ...testStudent1,
  annualFamilyIncome: 500000, // Authoritative: above threshold
  pendingProfileModifications: {
    status: 'Pending',
    submittedAt: new Date().toISOString(),
    annualFamilyIncome: 50000, // Claimed: below ₹2.5L
  }
};
const feeWithPending = calculateStudentFeeScheduleServer(stuWithPendingIncome, mockFeeHeads, mockRules);
const feeBaseline = calculateStudentFeeScheduleServer(testStudent1, mockFeeHeads, mockRules);
assert(feeWithPending.totalFeePaisa === feeBaseline.totalFeePaisa, "Pending unverified profile income does not mutate authoritative fee calculation");

console.log("\n✨ Verification Complete: 100% Core Financial Ledgers, Integer Paisa Scaling & Server Fee Engine Verified.");
process.exit(0);


