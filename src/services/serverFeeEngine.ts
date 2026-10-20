/**
 * Server-Side Fee Engine
 * Authoritative financial calculation and ledger validation engine.
 * All math operations are scaled to integer Paisa (100 Paisa = 1 INR).
 */

import { Student, FeeHeadItem, ConcessionSurchargeRule, StudySubject } from '../types/fee';
import {
  Paisa,
  toPaisa,
  fromPaisa,
  paisaAdd,
  paisaSub,
  paisaMulPercent,
  verifyLedgerBalance,
} from '../utils/paisaMath';
import {
  ServerFeeCalculationResult,
  FeeHeadBreakdown,
  AppliedRuleDetail,
  LedgerCommitPayload,
  LedgerCommitValidationResult,
} from '../types/calculations';

// Minimum fee floor enforced by Bihar State Higher Education Treasury guidelines: ₹1,000.00
const INSTITUTIONAL_MINIMUM_FEE_PAISA: Paisa = 100000; // 1000 * 100

/**
 * Generates a deterministic audit hash for a calculation result
 */
function generateAuditHash(
  rollNo: string,
  totalPaisa: Paisa,
  paidPaisa: Paisa,
  pendingPaisa: Paisa,
  ruleCount: number,
  timestamp: string
): string {
  const raw = `${rollNo}:${totalPaisa}:${paidPaisa}:${pendingPaisa}:${ruleCount}:${timestamp}`;
  // Deterministic 32-bit FNV-1a hash formatted as hex
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `SEC-LEDGER-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

export function evaluateRuleMatch(student: Student, rule: ConcessionSurchargeRule): boolean {
  let stuVal: unknown = undefined;
  if (rule.criteriaField === 'gender') stuVal = student.gender;
  else if (rule.criteriaField === 'category' || rule.criteriaField === 'caste_category') stuVal = student.category;
  else if (rule.criteriaField === 'quota') stuVal = student.quota;
  else if (rule.criteriaField === 'domicile_state') stuVal = student.domicileState;
  else if (rule.criteriaField === 'annual_income') stuVal = student.annualFamilyIncome;
  else if (rule.criteriaField === 'stream') stuVal = student.streamCode;
  else if (rule.criteriaField === 'sports_quota') {
    const studentRec = student as unknown as Record<string, unknown>;
    stuVal = studentRec.sportsQuota ?? (student.quota === 'Sports' ? 'Yes' : 'No');
  } else {
    const studentRec = student as unknown as Record<string, unknown>;
    stuVal = studentRec.customFields?.[rule.criteriaField] ?? studentRec.enrollmentData?.[rule.criteriaField];
  }

  const parseCleanNumber = (val: unknown): number | null => {
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (val === null || val === undefined || val === '') return null;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  if (rule.criteriaOperator === 'equals') {
    if (stuVal === undefined || stuVal === null) return false;
    return String(stuVal).trim().toLowerCase() === String(rule.criteriaValue ?? '').trim().toLowerCase();
  } else if (rule.criteriaOperator === 'not_equals') {
    if (stuVal === undefined || stuVal === null) return false;
    return String(stuVal).trim().toLowerCase() !== String(rule.criteriaValue ?? '').trim().toLowerCase();
  } else if (rule.criteriaOperator === 'in_list') {
    if (stuVal === undefined || stuVal === null) return false;
    const list = Array.isArray(rule.criteriaValue)
      ? rule.criteriaValue
      : String(rule.criteriaValue ?? '').split(',').map((s) => s.trim());
    return list.map((item) => String(item).trim().toLowerCase()).includes(String(stuVal).trim().toLowerCase());
  } else if (rule.criteriaOperator === 'less_than' || rule.criteriaOperator === 'less_than_or_equal') {
    const numStu = parseCleanNumber(stuVal);
    const numRule = parseCleanNumber(rule.criteriaValue);
    if (numStu === null || numRule === null) return false;
    return rule.criteriaOperator === 'less_than_or_equal' ? numStu <= numRule : numStu < numRule;
  } else if (rule.criteriaOperator === 'greater_than' || rule.criteriaOperator === 'greater_than_or_equal') {
    const numStu = parseCleanNumber(stuVal);
    const numRule = parseCleanNumber(rule.criteriaValue);
    if (numStu === null || numRule === null) return false;
    return rule.criteriaOperator === 'greater_than_or_equal' ? numStu >= numRule : numStu > numRule;
  }

  return false;
}

/**
 * Server-Authoritative Fee Schedule Calculation
 * Computes fee heads, evaluates concession and surcharge rules, and returns certified ledger state in integer Paisa.
 */
export function calculateStudentFeeScheduleServer(
  student: Student,
  feeHeads: FeeHeadItem[],
  concessionRules: ConcessionSurchargeRule[],
  subjects?: StudySubject[]
): ServerFeeCalculationResult {
  const timestamp = new Date().toISOString();
  const studentRollNo = student?.rollNo?.trim() || 'UNKNOWN';
  const studentStream = student?.streamCode || student?.branch || 'CSE';
  const studentPaidFeePaisa: Paisa = toPaisa(student?.paidFee || 0);

  // 1. Fee Head Aggregation in Integer Paisa
  let baseFeePaisa: Paisa = 0;
  let tuitionPartPaisa: Paisa = 0;
  const feeHeadBreakdown: FeeHeadBreakdown[] = [];

  for (const head of feeHeads) {
    const isApplicableStream =
      !head.applicableStreams ||
      head.applicableStreams.length === 0 ||
      head.applicableStreams.includes('ALL') ||
      head.applicableStreams.includes(studentStream) ||
      (student.branch && head.applicableStreams.some((s) => student.branch.toLowerCase().includes(s.toLowerCase())));

    const isApplicableSubject =
      !head.applicableSubjects ||
      head.applicableSubjects.length === 0 ||
      head.applicableSubjects.some((subCode) => student.subjectsEnrolled?.includes(subCode));

    if (isApplicableStream && isApplicableSubject) {
      const headAmountPaisa: Paisa = toPaisa(head.amount);
      baseFeePaisa = paisaAdd(baseFeePaisa, headAmountPaisa);

      if (head.category === 'Tuition') {
        tuitionPartPaisa = paisaAdd(tuitionPartPaisa, headAmountPaisa);
      }

      feeHeadBreakdown.push({
        id: head.id,
        name: head.name,
        category: head.category,
        amountPaisa: headAmountPaisa,
        treasuryHeadCode: head.treasuryHeadCode,
        isMandatory: Boolean(head.isMandatory),
      });
    }
  }

  // 2. Add enrolled subjects fees if subjects are passed
  if (subjects && subjects.length > 0) {
    let subjectFeePaisa: Paisa = 0;
    for (const sub of subjects) {
      const isEnrolled =
        student.subjectsEnrolled?.includes(sub.code) ||
        (!student.subjectsEnrolled?.length &&
          sub.streamCode === studentStream &&
          sub.semester === (student.semester || 1));

      if (isEnrolled) {
        const subFeePaisa = toPaisa(sub.subjectFee || 0);
        subjectFeePaisa = paisaAdd(subjectFeePaisa, subFeePaisa);
        if (sub.associatedLabFee && sub.associatedLabFee > 0) {
          baseFeePaisa = paisaAdd(baseFeePaisa, toPaisa(sub.associatedLabFee));
        }
      }
    }
    tuitionPartPaisa = paisaAdd(tuitionPartPaisa, subjectFeePaisa);
    baseFeePaisa = paisaAdd(baseFeePaisa, subjectFeePaisa);
  }

  // 3. Concession & Surcharge Rule Evaluation
  const appliedConcessions: AppliedRuleDetail[] = [];
  const appliedSurcharges: AppliedRuleDetail[] = [];
  let netConcessionPaisa: Paisa = 0;
  let netSurchargePaisa: Paisa = 0;

  const activeRules = concessionRules
    .filter((r) => r.isActive)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  for (const rule of activeRules) {
    const matches = evaluateRuleMatch(student, rule);

    if (matches) {
      // Determine the base against which the rule is calculated (Targeted head or entire base)
      let targetBasePaisa = baseFeePaisa;
      if (rule.targetHeadId === 'ALL_TUITION') {
        targetBasePaisa = tuitionPartPaisa;
      } else if (rule.targetHeadId && rule.targetHeadId !== 'ALL') {
        const matchingHead = feeHeadBreakdown.find((h) => h.id === rule.targetHeadId);
        targetBasePaisa = matchingHead ? matchingHead.amountPaisa : baseFeePaisa;
      }

      let ruleAmountPaisa: Paisa = 0;
      if (rule.calculationMode === 'Percentage') {
        ruleAmountPaisa = paisaMulPercent(targetBasePaisa, rule.value);
      } else {
        ruleAmountPaisa = toPaisa(rule.value);
      }

      const detail: AppliedRuleDetail = {
        ruleId: rule.id,
        ruleCode: rule.code || rule.id,
        name: rule.name,
        action: rule.action,
        calculationMode: rule.calculationMode,
        value: rule.value,
        targetHeadId: rule.targetHeadId,
        appliedPaisa: ruleAmountPaisa,
      };

      if (rule.action === 'Concession') {
        netConcessionPaisa = paisaAdd(netConcessionPaisa, ruleAmountPaisa);
        appliedConcessions.push(detail);
      } else if (rule.action === 'Surcharge') {
        netSurchargePaisa = paisaAdd(netSurchargePaisa, ruleAmountPaisa);
        appliedSurcharges.push(detail);
      }
    }
  }

  // Cap total concessions to prevent exceeding the base fee
  netConcessionPaisa = Math.min(baseFeePaisa, netConcessionPaisa);

  // 3. Subtotal and Floor Rule
  const subtotalPaisa = paisaAdd(
    paisaSub(baseFeePaisa, netConcessionPaisa, true),
    netSurchargePaisa
  );

  let totalFeePaisa = subtotalPaisa;
  let minimumFloorApplied = false;
  const hasFullWaiver = (student.scholarshipWaiverPercent === 100) || (netConcessionPaisa >= baseFeePaisa);
  
  if (hasFullWaiver) {
    totalFeePaisa = 0; // 100% waiver or full scholarship yields 0 fee
  } else if (totalFeePaisa < INSTITUTIONAL_MINIMUM_FEE_PAISA && baseFeePaisa > 0) {
    totalFeePaisa = INSTITUTIONAL_MINIMUM_FEE_PAISA;
    minimumFloorApplied = true;
  }

  // 4. Ledger Balance Invariants
  const pendingFeePaisa = paisaSub(totalFeePaisa, studentPaidFeePaisa, true);
  const ledgerBalanced = verifyLedgerBalance(totalFeePaisa, studentPaidFeePaisa, pendingFeePaisa);

  // 5. Audit Hash Generation
  const totalRuleCount = appliedConcessions.length + appliedSurcharges.length;
  const calculationHash = generateAuditHash(
    studentRollNo,
    totalFeePaisa,
    studentPaidFeePaisa,
    pendingFeePaisa,
    totalRuleCount,
    timestamp
  );

  return {
    studentRollNo,
    studentName: student.name || 'Unnamed Student',
    baseFeePaisa,
    tuitionPartPaisa,
    feeHeadBreakdown,
    concessions: appliedConcessions,
    surcharges: appliedSurcharges,
    netConcessionPaisa,
    netSurchargePaisa,
    subtotalPaisa,
    totalFeePaisa,
    paidFeePaisa: studentPaidFeePaisa,
    pendingFeePaisa,
    minimumFloorApplied,
    ledgerBalanced,
    calculationHash,
    timestamp,
    serverVersion: '2.4.0-authoritative',
    isVerified: true,
  };
}

/**
 * Validates a ledger commit payload prior to writing into database/ledger
 */
export function validateLedgerCommitServer(
  payload: LedgerCommitPayload
): LedgerCommitValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required Field Verifications
  if (!payload.studentRollNo || typeof payload.studentRollNo !== 'string' || payload.studentRollNo.trim() === '') {
    errors.push('CRITICAL: Missing or invalid student roll number in ledger commit payload');
  }

  if (!payload.authorizedBy || !payload.authorizedBy.id) {
    errors.push('SECURITY: Ledger modification requires authorized personnel identity');
  }

  // Integer scale check
  if (!Number.isSafeInteger(payload.newTotalPaisa) || payload.newTotalPaisa < 0) {
    errors.push('PRECISION_ERROR: newTotalPaisa must be a valid non-negative integer Paisa value');
  }

  if (!Number.isSafeInteger(payload.paidPaisa) || payload.paidPaisa < 0) {
    errors.push('PRECISION_ERROR: paidPaisa must be a valid non-negative integer Paisa value');
  }

  if (!Number.isSafeInteger(payload.pendingPaisa) || payload.pendingPaisa < 0) {
    errors.push('PRECISION_ERROR: pendingPaisa must be a valid non-negative integer Paisa value');
  }

  // Ledger Balance Equation Invariant: Total == Paid + Pending (or Overpayment Advance Credit)
  const isOverpaid = payload.paidPaisa > payload.newTotalPaisa;
  const isBalanced = isOverpaid 
    ? (payload.pendingPaisa === 0)
    : verifyLedgerBalance(payload.newTotalPaisa, payload.paidPaisa, payload.pendingPaisa);

  if (!isBalanced) {
    errors.push(
      `LEDGER_UNBALANCED: Total (${payload.newTotalPaisa} Paisa) does not equal Paid (${payload.paidPaisa} Paisa) + Pending (${payload.pendingPaisa} Paisa)`
    );
  } else if (isOverpaid) {
    warnings.push(
      `ADVANCE_CREDIT: Paid amount (${payload.paidPaisa} Paisa) exceeds total (${payload.newTotalPaisa} Paisa); ledger carries ${payload.paidPaisa - payload.newTotalPaisa} Paisa credit.`
    );
  }

  // Mathematical Difference Integrity Check
  const expectedDiff = payload.newTotalPaisa - payload.previousTotalPaisa;
  if (payload.differencePaisa !== expectedDiff) {
    warnings.push(
      `DISCREPANCY: Declared difference (${payload.differencePaisa} Paisa) differs from computed (${expectedDiff} Paisa); normalizing to computed.`
    );
  }

  const isValid = errors.length === 0;
  const auditSignature = isValid
    ? `SIG-${Date.now()}-${payload.studentRollNo}-${payload.authorizedBy?.id || 'AUTH'}`
    : 'INVALID_SIGNATURE';

  return {
    isValid,
    errors,
    warnings,
    verifiedPayload: isValid
      ? {
          ...payload,
          differencePaisa: expectedDiff,
        }
      : undefined,
    auditSignature,
  };
}
