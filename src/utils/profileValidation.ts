import { Student, EnrollmentField } from '../types/fee';

export interface MissingFieldInfo {
  key: string;
  label: string;
  isCustom: boolean;
  type?: string;
  options?: string[];
  placeholder?: string;
}

export interface ProfileValidationResult {
  isComplete: boolean;
  missingFields: MissingFieldInfo[];
  totalRequired: number;
  completedCount: number;
  completionPercent: number;
}

/**
 * Standard core mandatory fields required for all enrolled students
 */
export const CORE_PROFILE_FIELDS: { key: string; label: string; isRequired: boolean; type: string }[] = [
  { key: 'name', label: 'Student Full Name', isRequired: true, type: 'text' },
  { key: 'rollNo', label: 'Roll Number', isRequired: true, type: 'text' },
  { key: 'dateOfBirth', label: 'Date of Birth (DOB)', isRequired: true, type: 'date' },
  { key: 'gender', label: 'Gender', isRequired: true, type: 'select' },
  { key: 'category', label: 'Caste / Reservation Category', isRequired: true, type: 'select' },
  { key: 'fatherName', label: 'Father / Guardian Full Name', isRequired: true, type: 'text' },
];

/**
 * Retrieve value of a field from a student object
 */
export function getStudentFieldValue(student: Student, key: string): string {
  if (!student) return '';

  // Direct top-level properties
  switch (key) {
    case 'name':
      return student.name || '';
    case 'rollNo':
      return student.rollNo || '';
    case 'registerNo':
      return student.registerNo || '';
    case 'dateOfBirth':
      return student.dateOfBirth || '';
    case 'gender':
      return student.gender || '';
    case 'category':
    case 'caste_category':
      return student.category || '';
    case 'subCaste':
    case 'sub_caste':
      return student.subCaste || '';
    case 'domicileState':
    case 'domicile_state':
      return student.domicileState || '';
    case 'fatherName':
    case 'parentName':
      return student.fatherName || student.parentName || '';
    case 'phone':
      return student.phone || '';
    case 'parentPhone':
      return student.parentPhone || '';
    case 'email':
      return student.email || '';
    case 'course':
      return student.course || '';
    case 'branch':
      return student.branch || '';
    case 'streamCode':
      return student.streamCode || '';
    case 'year':
      return student.year || 1;
    case 'semester':
      return student.semester || 1;
    case 'annualFamilyIncome':
    case 'annual_income':
      return student.annualFamilyIncome !== undefined ? student.annualFamilyIncome : '';
    case 'quota':
      return student.quota || '';
    case 'hostelResident':
      return student.hostelResident ?? false;
    case 'hostelRoomNo':
      return student.hostelRoomNo || '';
    default:
      // Look into customFields
      return student.customFields?.[key] !== undefined ? student.customFields[key] : '';
  }
}

/**
 * Validates whether all mandatory profile fields (core + admin configured) are completed
 */
export function validateStudentProfile(
  student: Student | null | undefined,
  enrollmentFields: EnrollmentField[] = []
): ProfileValidationResult {
  if (!student) {
    return {
      isComplete: false,
      missingFields: [],
      totalRequired: 0,
      completedCount: 0,
      completionPercent: 0,
    };
  }

  const missing: MissingFieldInfo[] = [];
  let totalRequiredCount = 0;
  let completedRequiredCount = 0;

  // 1. Check core fields
  for (const core of CORE_PROFILE_FIELDS) {
    if (core.isRequired) {
      totalRequiredCount++;
      const val = getStudentFieldValue(student, core.key);
      const isMissing = val === undefined || val === null || String(val).trim() === '';
      if (isMissing) {
        missing.push({
          key: core.key,
          label: core.label,
          isCustom: false,
          type: core.type,
          options: core.key === 'gender' ? ['Male', 'Female', 'Other'] :
                   core.key === 'category' ? ['General', 'OBC', 'SC', 'ST', 'EWS'] : undefined,
        });
      } else {
        completedRequiredCount++;
      }
    }
  }

  // 2. Check dynamic enrollment fields configured by Admin
  for (const field of enrollmentFields) {
    // Only check active fields
    if (!field.isActive) continue;

    // Skip fields already checked in core or hidden in student profile
    if (['name', 'rollNo', 'gender', 'caste_category', 'dateOfBirth', 'fatherName', 'phone', 'email', 'quota', 'parentPhone'].includes(field.key)) {
      continue;
    }

    if (field.isRequired) {
      totalRequiredCount++;
      const val = getStudentFieldValue(student, field.key);
      const isMissing = val === undefined || val === null || String(val).trim() === '';
      if (isMissing) {
        missing.push({
          key: field.key,
          label: field.label,
          isCustom: !field.isSystemField,
          type: field.type,
          options: field.options,
          placeholder: field.placeholder,
        });
      } else {
        completedRequiredCount++;
      }
    }
  }

  const isComplete = missing.length === 0;
  const completionPercent = totalRequiredCount > 0 
    ? Math.round((completedRequiredCount / totalRequiredCount) * 100) 
    : 100;

  return {
    isComplete,
    missingFields: missing,
    totalRequired: totalRequiredCount,
    completedCount: completedRequiredCount,
    completionPercent,
  };
}

/**
 * Validates fields designated as mandatory to obtain before full portal usage
 */
export function validateMandatoryBeforeLoginFields(
  student: Student | null | undefined,
  enrollmentFields: EnrollmentField[] = []
): { hasMissing: boolean; missingFields: MissingFieldInfo[] } {
  if (!student) return { hasMissing: false, missingFields: [] };

  const missing: MissingFieldInfo[] = [];

  // 1. Core mandatory fields
  for (const core of CORE_PROFILE_FIELDS) {
    if (core.isRequired) {
      const val = getStudentFieldValue(student, core.key);
      const isMissing = val === undefined || val === null || String(val).trim() === '';
      if (isMissing) {
        missing.push({
          key: core.key,
          label: core.label,
          isCustom: false,
          type: core.type,
          options: core.key === 'gender' ? ['Male', 'Female', 'Other'] :
                   core.key === 'category' ? ['General', 'OBC', 'SC', 'ST', 'EWS'] : undefined,
        });
      }
    }
  }

  // 2. Custom or system fields explicitly configured with mandatoryBeforeLogin
  for (const field of enrollmentFields) {
    if (!field.isActive) continue;
    if (['name', 'rollNo', 'gender', 'caste_category', 'dateOfBirth', 'fatherName'].includes(field.key)) {
      continue;
    }

    if (field.mandatoryBeforeLogin) {
      const val = getStudentFieldValue(student, field.key);
      const isMissing = val === undefined || val === null || String(val).trim() === '';
      if (isMissing) {
        missing.push({
          key: field.key,
          label: field.label,
          isCustom: !field.isSystemField,
          type: field.type,
          options: field.options,
          placeholder: field.placeholder,
        });
      }
    }
  }

  return {
    hasMissing: missing.length > 0,
    missingFields: missing,
  };
}

