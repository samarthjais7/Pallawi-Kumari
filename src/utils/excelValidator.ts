import * as XLSX from 'xlsx';
import { Student, FeeUploadBatchItem } from '../types/fee';

export interface ExcelFeeValidationResult {
  isValidBatch: boolean;
  canProceedWithMatchedOnly: boolean;
  totalRecords: number;
  matchedCount: number;
  unmatchedCount: number;
  duplicateCount: number;
  invalidAmountCount: number;
  totalFeeBefore: number;
  totalFeeAfter: number;
  netDifference: number;
  validatedItems: FeeUploadBatchItem[];
  criticalErrors: string[];
  warnings: string[];
  detectedColumns: {
    rollNoHeader?: string;
    feeHeader?: string;
    nameHeader?: string;
    remarksHeader?: string;
  };
}

/**
 * Normalizes header keys by trimming, lowercasing, and stripping non-alphanumeric chars.
 */
function normalizeHeader(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Robust Client-Side Excel / CSV Audit Engine
 * 
 * Intercepts binary array buffer from spreadsheet upload, enforces structural typing,
 * fuzzy-matches headers, catches duplicate student rows within the sheet, cross-references
 * against the active student roster in memory/Firestore, and screens out invalid or negative fee inputs.
 */
export function auditExcelFeeBatch(
  data: ArrayBuffer | Uint8Array,
  students: Student[],
  academicSession: string = '2025-2026'
): ExcelFeeValidationResult {
  const result: ExcelFeeValidationResult = {
    isValidBatch: true,
    canProceedWithMatchedOnly: false,
    totalRecords: 0,
    matchedCount: 0,
    unmatchedCount: 0,
    duplicateCount: 0,
    invalidAmountCount: 0,
    totalFeeBefore: 0,
    totalFeeAfter: 0,
    netDifference: 0,
    validatedItems: [],
    criticalErrors: [],
    warnings: [],
    detectedColumns: {},
  };

  try {
    // 1. Read binary spreadsheet data via SheetJS
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      result.criticalErrors.push('The uploaded workbook contains no active worksheets.');
      result.isValidBatch = false;
      return result;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      result.criticalErrors.push('Worksheet contains zero data rows or is completely blank.');
      result.isValidBatch = false;
      return result;
    }

    // 2. Identify and validate column headers using fuzzy matching
    const sampleRow = rawRows[0];
    const headers = Object.keys(sampleRow);
    
    let rollNoKey = '';
    let feeKey = '';
    let remarksKey = '';
    let nameKey = '';

    for (const key of headers) {
      const norm = normalizeHeader(key);
      if (['rollno', 'rollnumber', 'roll', 'enrollmentno', 'studentrollno', 'studentroll', 'regno', 'registrationno', 'enrolno'].includes(norm)) {
        rollNoKey = key;
      } else if (['totalfeepayable', 'totalfee', 'feepayable', 'annualfee', 'amount', 'fee', 'tuitionfee', 'proposedfee', 'newfee', 'revisedfee'].includes(norm)) {
        feeKey = key;
      } else if (['remarks', 'remark', 'notes', 'note', 'reason', 'comment', 'comments'].includes(norm)) {
        remarksKey = key;
      } else if (['studentname', 'name', 'fullname', 'candidatename'].includes(norm)) {
        nameKey = key;
      }
    }

    result.detectedColumns = {
      rollNoHeader: rollNoKey || undefined,
      feeHeader: feeKey || undefined,
      nameHeader: nameKey || undefined,
      remarksHeader: remarksKey || undefined,
    };

    if (!rollNoKey) {
      result.criticalErrors.push(
        'Missing mandatory Roll Number column header. Please include a header named "Roll No", "Roll Number", or "Enrollment No".'
      );
    }

    if (!feeKey) {
      result.criticalErrors.push(
        'Missing mandatory Fee Payable column header. Please include a header named "Total Fee Payable", "Total Fee", or "Amount".'
      );
    }

    if (result.criticalErrors.length > 0) {
      result.isValidBatch = false;
      return result;
    }

    // Create fast lookup map for students by uppercase roll number
    const studentMap = new Map<string, Student>();
    for (const s of students) {
      if (s.rollNo) {
        studentMap.set(s.rollNo.trim().toUpperCase(), s);
      }
    }

    // 3. Row Iteration, Duplicate Tracking & Validation Loop
    const trackedRollNumbers = new Map<string, number>(); // normalized rollNo -> first row seen (1-indexed spreadsheet row)

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const spreadsheetRowNum = i + 2; // Row 1 is header in Excel

      const rawRollNo = String(row[rollNoKey] || '').trim();
      const rawFeeStr = String(row[feeKey] !== undefined ? row[feeKey] : '').trim();
      const rawRemarks = remarksKey ? String(row[remarksKey] || '').trim() : '';

      // Skip completely empty spacer rows
      if (!rawRollNo && (!rawFeeStr || rawFeeStr === '0')) {
        continue;
      }

      result.totalRecords++;

      // Check for missing roll number in non-empty row
      if (!rawRollNo) {
        result.unmatchedCount++;
        result.warnings.push(`Row ${spreadsheetRowNum}: Missing Roll Number value.`);
        result.validatedItems.push({
          rowNumber: spreadsheetRowNum,
          rollNo: 'MISSING_ROLL_NO',
          studentName: 'Invalid Row (Empty Roll No)',
          currentTotalFee: 0,
          newTotalFeePayable: 0,
          difference: 0,
          status: 'Not_Found',
          remarks: `Row ${spreadsheetRowNum} has no roll number specified.`,
        });
        continue;
      }

      const normalizedRollNo = rawRollNo.trim().toUpperCase();

      // Guard against row duplicates inside the same sheet
      if (trackedRollNumbers.has(normalizedRollNo)) {
        const firstSeenRow = trackedRollNumbers.get(normalizedRollNo)!;
        result.duplicateCount++;
        result.warnings.push(
          `Row ${spreadsheetRowNum}: Duplicate Roll Number [${normalizedRollNo}] detected. First appeared at row ${firstSeenRow}.`
        );

        result.validatedItems.push({
          rowNumber: spreadsheetRowNum,
          rollNo: normalizedRollNo,
          studentName: 'Duplicate Entry in Sheet',
          currentTotalFee: 0,
          newTotalFeePayable: 0,
          difference: 0,
          status: 'Duplicate',
          remarks: `Duplicate record within sheet (first seen at row ${firstSeenRow}). Skipped to prevent ledger double-posting.`,
        });
        continue;
      }

      trackedRollNumbers.set(normalizedRollNo, spreadsheetRowNum);

      // Parse and validate proposed fee amount
      let proposedFee = NaN;
      if (typeof row[feeKey] === 'number') {
        proposedFee = Math.round(row[feeKey]);
      } else {
        const cleanFeeStr = rawFeeStr.replace(/[^0-9.-]+/g, '');
        proposedFee = Math.round(Number(cleanFeeStr));
      }

      // Check student presence in live roster
      const liveStudent = studentMap.get(normalizedRollNo);

      if (!liveStudent) {
        result.unmatchedCount++;
        result.warnings.push(
          `Row ${spreadsheetRowNum}: Roll number [${normalizedRollNo}] not found in ERP roster [AY ${academicSession}].`
        );
        result.validatedItems.push({
          rowNumber: spreadsheetRowNum,
          rollNo: normalizedRollNo,
          studentName: row[nameKey] ? String(row[nameKey]).trim() : 'Student Not Found in ERP',
          currentTotalFee: 0,
          newTotalFeePayable: isNaN(proposedFee) ? 0 : proposedFee,
          difference: isNaN(proposedFee) ? 0 : proposedFee,
          status: 'Not_Found',
          remarks: `Roll number does not match active student registries [AY: ${academicSession}]`,
        });
        continue;
      }

      const currentFee = Math.round(liveStudent.totalFee || 0);

      // Guard against negative or corrupt fee values
      if (isNaN(proposedFee) || proposedFee < 0) {
        result.invalidAmountCount++;
        result.warnings.push(
          `Row ${spreadsheetRowNum}: Proposed fee for [${normalizedRollNo}] is invalid (${rawFeeStr}). Values cannot be negative or non-numeric.`
        );
        result.validatedItems.push({
          rowNumber: spreadsheetRowNum,
          rollNo: liveStudent.rollNo,
          studentName: liveStudent.name,
          course: `${liveStudent.course} (${liveStudent.branch})`,
          semester: liveStudent.semester,
          currentTotalFee: currentFee,
          newTotalFeePayable: isNaN(proposedFee) ? 0 : proposedFee,
          difference: 0,
          status: 'Invalid_Amount',
          remarks: `Invalid amount [${rawFeeStr}]. Fee must be a positive number.`,
        });
        continue;
      }

      // Record successful validation match
      result.matchedCount++;
      result.totalFeeBefore += currentFee;
      result.totalFeeAfter += proposedFee;

      const diff = proposedFee - currentFee;
      let defaultRemark = 'Batch ledger update validated.';
      if (diff > 0) defaultRemark = 'Annual fee increment / upward revision';
      else if (diff < 0) defaultRemark = 'Fee concession / reduction applied';
      else defaultRemark = 'Fee reaffirmed (no net delta)';

      result.validatedItems.push({
    result.netDifference = result.totalFeeAfter - result.totalFeeBefore;

    // Determine batch validity & usability
    if (result.matchedCount === 0) {
      result.isValidBatch = false;
      result.criticalErrors.push('None of the rows in the sheet matched active student records with valid amounts.');
    } else {
      result.canProceedWithMatchedOnly = result.matchedCount > 0;
      // If there are warnings/errors but some are matched, isValidBatch is true with warnings
      result.isValidBatch = result.criticalErrors.length === 0;
    }

  } catch (err: unknown) {
    result.isValidBatch = false;
    const message = err instanceof Error ? err.message : String(err);
    result.criticalErrors.push(`Failed to parse spreadsheet: ${message}`);
  }

  return result;
}

export interface StudentRosterValidationResult {
  isValid: boolean;
  totalRows: number;
  matchedCount: number;
  duplicateCount: number;
  unmatchedCount: number;
  warnings: string[];
  criticalErrors: string[];
  extractedRolls: {
    rowNumber: number;
    rollNo: string;
    isDuplicate: boolean;
    student?: Student;
    courseOverride?: string;
    semOverride?: number;
    branchOverride?: string;
  }[];
}

/**
 * Validates a student roster spreadsheet used for bulk student promotions, course updates, or quota assignments.
 */
export function auditStudentRosterSheet(
  data: ArrayBuffer | Uint8Array,
  students: Student[]
): StudentRosterValidationResult {
  const result: StudentRosterValidationResult = {
    isValid: true,
    totalRows: 0,
    matchedCount: 0,
    duplicateCount: 0,
    unmatchedCount: 0,
    warnings: [],
    criticalErrors: [],
    extractedRolls: [],
  };

  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      result.criticalErrors.push('Spreadsheet contains no worksheets.');
      result.isValid = false;
      return result;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      result.criticalErrors.push('Spreadsheet is empty with zero data rows.');
      result.isValid = false;
      return result;
    }

    const sample = rawRows[0];
    const headers = Object.keys(sample);
    let rollKey = '';
    let courseKey = '';
    let semKey = '';
    let branchKey = '';

    for (const key of headers) {
      const norm = normalizeHeader(key);
      if (['rollno', 'rollnumber', 'roll', 'enrollmentno', 'studentrollno'].includes(norm)) {
        rollKey = key;
      } else if (['course', 'targetcourse', 'degree'].includes(norm)) {
        courseKey = key;
      } else if (['semester', 'targetsemester', 'sem'].includes(norm)) {
        semKey = key;
      } else if (['branch', 'targetbranch', 'stream'].includes(norm)) {
        branchKey = key;
      }
    }

    if (!rollKey) {
      result.criticalErrors.push('Missing Roll Number column header (e.g., "Roll No", "Roll Number").');
      result.isValid = false;
      return result;
    }

    const studentMap = new Map<string, Student>();
    for (const s of students) {
      if (s.rollNo) {
        studentMap.set(s.rollNo.trim().toLowerCase(), s);
      }
    }

    const seenRolls = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2;
      const roll = String(row[rollKey] || '').trim();

      if (!roll) continue;

      result.totalRows++;
      const normRoll = roll.toLowerCase();
      const isDup = seenRolls.has(normRoll);

      if (isDup) {
        result.duplicateCount++;
        result.warnings.push(`Row ${rowNum}: Duplicate Roll Number [${roll}] found in sheet.`);
      } else {
        seenRolls.add(normRoll);
      }

      const matchedStudent = studentMap.get(normRoll);
      if (matchedStudent) {
        if (!isDup) result.matchedCount++;
      } else {
        result.unmatchedCount++;
        result.warnings.push(`Row ${rowNum}: Roll Number [${roll}] does not exist in student database.`);
      }

      let semOverride: number | undefined;
      if (semKey && row[semKey]) {
        const num = parseInt(String(row[semKey]), 10);
        if (!isNaN(num)) semOverride = num;
      }

      result.extractedRolls.push({
        rowNumber: rowNum,
        rollNo: roll,
        isDuplicate: isDup,
        student: matchedStudent,
        courseOverride: courseKey ? String(row[courseKey] || '').trim() || undefined : undefined,
        semOverride,
        branchOverride: branchKey ? String(row[branchKey] || '').trim() || undefined : undefined,
      });
    }

    if (result.matchedCount === 0) {
      result.isValid = false;
      result.criticalErrors.push('None of the extracted roll numbers match existing student records.');
    }

  } catch (err: unknown) {
    result.isValid = false;
    const errMsg = err instanceof Error ? err.message : String(err);
    result.criticalErrors.push(`Failed to parse roster file: ${errMsg}`);
  }

  return result;
}

/**
 * Generates an institutional formatted Excel template for fee revisions.
 */
export function generateInstitutionalFeeTemplate(students: Student[]): void {
  const sampleRows = students.slice(0, 15).map((s, idx) => ({
    'Roll No': s.rollNo,
    'Student Name': s.name,
    'Course': s.course,
    'Current Total Fee': s.totalFee,
    'Total Fee Payable': s.totalFee + (idx % 2 === 0 ? 1000 : 0),
    'Remarks': 'Academic Session 2025-26 Annual Revision',
  }));

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);

  worksheet['!cols'] = [
    { wch: 16 }, // Roll No
    { wch: 26 }, // Student Name
    { wch: 16 }, // Course
    { wch: 18 }, // Current Total Fee
    { wch: 20 }, // Total Fee Payable
    { wch: 42 }, // Remarks
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fee Revision');

  XLSX.writeFile(workbook, 'RLSY_Student_Fee_Payable_Template.xlsx');
}
