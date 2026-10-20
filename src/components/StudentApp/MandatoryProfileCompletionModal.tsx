import React, { useState } from 'react';
import { Student, EnrollmentField } from '../../types/fee';
import { validateStudentProfile, getStudentFieldValue } from '../../utils/profileValidation';
import { 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  UserCheck, 
  Lock, 
  Calendar, 
  GraduationCap, 
  Sparkles,
  ChevronRight,
  Info,
  ShieldCheck,
  Award,
  X
} from 'lucide-react';

interface Props {
  student: Student;
  enrollmentFields: EnrollmentField[];
  onComplete: (updatedStudent: Student) => void;
  onLogout: () => void;
  onClose?: () => void;
}

export const MandatoryProfileCompletionModal: React.FC<Props> = ({
  student,
  enrollmentFields,
  onComplete,
  onLogout,
  onClose,
}) => {
  const validation = validateStudentProfile(student, enrollmentFields);

  // Form states initialized with student values
  const isRegistered = Boolean(student.rollNo && student.rollNo.trim());

  const [formData, setFormData] = useState({
    name: student.name || '',
    rollNo: student.rollNo || '',
    dateOfBirth: student.dateOfBirth || '',
    gender: student.gender || 'Male',
    category: student.category || 'General',
    subCaste: student.subCaste || '',
    domicileState: student.domicileState || 'Bihar',
    fatherName: student.fatherName || '',
    phone: student.phone || '',
    parentPhone: student.parentPhone || '',
    email: student.email || '',
    annualFamilyIncome: student.annualFamilyIncome !== undefined ? student.annualFamilyIncome : 180000,
    customFields: { ...(student.customFields || {}) },
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to handle custom field change
  const handleCustomFieldChange = (key: string, value: unknown): void => {
    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [key]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    // Validate core fields
    if (!isRegistered && !formData.name.trim()) errors.name = 'Full Student Name is required';
    if (!isRegistered && !formData.rollNo.trim()) errors.rollNo = 'Roll Number is required';
    if (!isRegistered && !formData.dateOfBirth.trim()) errors.dateOfBirth = 'Date of Birth (DOB) is required';
    if (!isRegistered && !formData.gender) errors.gender = 'Gender is required';
    if (!isRegistered && !formData.category) errors.category = 'Caste Reservation Category is required';
    if (!isRegistered && !formData.fatherName.trim()) errors.fatherName = 'Father / Guardian Name is required';

    // Validate dynamic mandatory enrollment fields
    for (const field of enrollmentFields) {
      if (!field.isActive || !field.isRequired) continue;

      if (field.key === 'domicile_state' && !formData.domicileState.trim()) {
        errors.domicile_state = `${field.label} is mandatory`;
      } else if (field.key === 'annual_income' && (formData.annualFamilyIncome === undefined || formData.annualFamilyIncome === null || (formData.annualFamilyIncome as unknown as string) === '')) {
        errors.annual_income = `${field.label} is mandatory`;
      } else if (!['name', 'rollNo', 'gender', 'caste_category', 'dateOfBirth', 'fatherName', 'phone', 'email', 'domicile_state', 'annual_income', 'quota', 'parentPhone', 'year'].includes(field.key)) {
        const customVal = formData.customFields[field.key];
        if (customVal === undefined || customVal === null || String(customVal).trim() === '') {
          errors[field.key] = `${field.label} is required`;
        }
      }
    }

    // Validate phone and email
    const cleanPhone = formData.phone.trim().replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      errors.phone = 'Valid 10-digit mobile number is required';
    }
    const cleanParentPhone = formData.parentPhone.trim().replace(/\D/g, '').slice(-10);
    if (formData.parentPhone.trim() && cleanParentPhone.length !== 10) {
      errors.parentPhone = 'Parent phone must be a valid 10-digit mobile number';
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Valid email address is required (e.g. name@domain.com)';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    const parsedIncome = Math.max(0, Number(formData.annualFamilyIncome) || 0);
    const hasIncomeChange = student.annualFamilyIncome !== undefined && parsedIncome !== student.annualFamilyIncome;
    const hasDomicileChange = Boolean(student.domicileState && formData.domicileState !== student.domicileState);

    const pendingMods = (hasIncomeChange || hasDomicileChange) ? {
      status: 'Pending' as const,
      submittedAt: new Date().toISOString(),
      annualFamilyIncome: parsedIncome,
      domicileState: formData.domicileState,
      officeRemarks: 'Self-reported income/domicile update pending verification by college office.',
    } : student.pendingProfileModifications;

    // Construct updated student - 9 mandatory parameters strictly preserved if registered
    const updatedStudent: Student = {
      ...student,
      name: isRegistered && student.name ? student.name : formData.name.trim(),
      rollNo: isRegistered && student.rollNo ? student.rollNo : formData.rollNo.trim(),
      dateOfBirth: isRegistered && student.dateOfBirth ? student.dateOfBirth : formData.dateOfBirth,
      gender: (isRegistered && student.gender ? student.gender : formData.gender) as Student['gender'],
      category: isRegistered && student.category ? student.category : formData.category,
      fatherName: isRegistered && student.fatherName ? student.fatherName : formData.fatherName.trim(),
      parentName: isRegistered && student.fatherName ? student.fatherName : formData.fatherName.trim(),
      course: student.course,
      branch: student.branch,
      year: student.year,
      semester: student.semester,
      subCaste: formData.subCaste.trim(),
      domicileState: student.domicileState || formData.domicileState,
      phone: cleanPhone ? `+91 ${cleanPhone}` : student.phone,
      parentPhone: cleanParentPhone ? `+91 ${cleanParentPhone}` : student.parentPhone,
      email: student.email || formData.email.trim(),
      annualFamilyIncome: student.annualFamilyIncome !== undefined ? student.annualFamilyIncome : (parsedIncome > 0 ? parsedIncome : 180000),
      customFields: formData.customFields,
      pendingProfileModifications: pendingMods,
      profileCompleted: true,
    };

    setTimeout(() => {
      onComplete(updatedStudent);
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-auto max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Clean Header with Green Profile Badge */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-emerald-100 text-emerald-800 border border-emerald-400 flex items-center gap-2 shadow-2xs shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Student Profile</span>
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                Complete Your Student Profile
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Roll No: {student.rollNo || 'Pending'} · {student.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="Sign out of student account"
            >
              Log Out
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Form Container */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs overflow-y-auto flex-1 overscroll-contain">
          
          {/* Section 1: Basic Personal Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  1. Basic Personal Details
                </h4>
              </div>
              {isRegistered && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Registered Record Locked
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-800 font-bold block">
                    Full Student Name {isRegistered ? '' : <span className="text-rose-600 font-bold">* (Mandatory)</span>}
                  </label>
                  {isRegistered && (
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                      <Lock className="w-3 h-3 text-amber-600" /> Locked
                    </span>
                  )}
                </div>
                {isRegistered ? (
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={student.name}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed select-none"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Kumar Verma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full p-2.5 bg-slate-50 border rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      formErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                )}
                {formErrors.name && <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">{formErrors.name}</span>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-800 font-bold block">
                    Date of Birth (DOB) {isRegistered ? '' : <span className="text-rose-600 font-bold">* (Mandatory)</span>}
                  </label>
                  {isRegistered && (
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                      <Lock className="w-3 h-3 text-amber-600" /> Locked
                    </span>
                  )}
                </div>
                {isRegistered ? (
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={student.dateOfBirth}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-not-allowed select-none"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className={`w-full p-2.5 bg-slate-50 border rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      formErrors.dateOfBirth ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                )}
                {formErrors.dateOfBirth && <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">{formErrors.dateOfBirth}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-800 font-bold block">
                    Gender {isRegistered ? '' : <span className="text-rose-600 font-bold">* (Mandatory)</span>}
                  </label>
                  {isRegistered && (
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                      <Lock className="w-3 h-3 text-amber-600" /> Locked
                    </span>
                  )}
                </div>
                {isRegistered ? (
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={student.gender || 'Male'}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-not-allowed select-none"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                ) : (
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as string })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-800 font-bold block">
                    University / College Roll No {isRegistered ? '' : <span className="text-rose-600 font-bold">* (Mandatory)</span>}
                  </label>
                  {isRegistered && (
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                      <Lock className="w-3 h-3 text-amber-600" /> Locked
                    </span>
                  )}
                </div>
                {isRegistered ? (
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={student.rollNo}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 cursor-not-allowed select-none"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2022CS014"
                    value={formData.rollNo}
                    onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Caste & Reservation Quota */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  2. Social Category & Domicile Matrix
                </h4>
              </div>
              {isRegistered && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Caste Locked
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-800 font-bold block">
                    Caste Category {isRegistered ? '' : <span className="text-rose-600 font-bold">* (Mandatory)</span>}
                  </label>
                  {isRegistered && (
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                      <Lock className="w-3 h-3 text-amber-600" /> Locked
                    </span>
                  )}
                </div>
                {isRegistered ? (
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={student.category}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed select-none"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                ) : (
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="General">General / Open</option>
                    <option value="OBC">OBC (Other Backward Class)</option>
                    <option value="SC">SC (Scheduled Caste)</option>
                    <option value="ST">ST (Scheduled Tribe)</option>
                    <option value="EWS">EWS (Economically Weaker Section)</option>
                  </select>
                )}
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Sub-Caste / Community <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kurmi, Yadav, Rajput, etc."
                  value={formData.subCaste}
                  onChange={(e) => setFormData({ ...formData, subCaste: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-800 font-bold block mb-1">
                  Domicile State <span className="text-rose-600 font-bold">* (Mandatory)</span>
                </label>
                <select
                  value={formData.domicileState}
                  onChange={(e) => setFormData({ ...formData, domicileState: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none"
                >
                  <option value="Bihar">Bihar</option>
                  <option value="Jharkhand">Jharkhand</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Other State">Other State</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Father / Guardian Details */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  3. Father / Guardian Details
                </h4>
              </div>
              {isRegistered && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Father Name Locked
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-800 font-bold block">
                  Father / Guardian Name {isRegistered ? '' : <span className="text-rose-600 font-bold">* (Mandatory)</span>}
                </label>
                {isRegistered && (
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                    <Lock className="w-3 h-3 text-amber-600" /> Locked
                  </span>
                )}
              </div>
              {isRegistered ? (
                <div className="relative max-w-md">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={student.fatherName}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed select-none"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar Verma"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  className="w-full max-w-md p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Section 4: Official Quota Privileges & Exemption Status (View Facility Only) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-700" />
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  4. Quota & Exemption Privileges (View Facility Only)
                </h4>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-3 h-3 text-indigo-600" /> Managed by Accountant via Student Update Menu
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* PwD Quota View Facility */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold block text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Physically Challenged (PwD)</span>
                  </label>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> View Only
                  </span>
                </div>
                <div className="pt-0.5">
                  <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${
                    (student.customFields?.physically_handicapped || student.quota === 'Physically Challenged (PWD)')
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {(student.customFields?.physically_handicapped || student.quota === 'Physically Challenged (PWD)')
                      ? '✓ PwD Exemption Active'
                      : '✗ Not Applicable'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Exemption status mapped by Accounts Office.
                </span>
              </div>

              {/* Sports / NCC Participation Quota View Facility */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold block text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sports / NCC Quota</span>
                  </label>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> View Only
                  </span>
                </div>
                <div className="pt-0.5">
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                    {student.customFields?.sports_quota && student.customFields?.sports_quota !== 'None'
                      ? student.customFields.sports_quota
                      : 'None / Regular'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Verified via Student Update Menu.
                </span>
              </div>

              {/* Admission Quota Category View Facility */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold block text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Admission Quota</span>
                  </label>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> View Only
                  </span>
                </div>
                <div className="pt-0.5">
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 font-mono">
                    {student.quota || 'State Merit (Subsidized)'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Official statutory quota category.
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Dynamic Enrollment Fields configured by Admin */}
          {enrollmentFields.filter(f => f.isActive && !['gender', 'caste_category', 'sub_caste', 'domicile_state', 'quota', 'year', 'phone', 'email', 'parentPhone', 'physically_handicapped', 'sports_quota'].includes(f.key) && f.category !== 'Category_Quota').length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    5. Institutional Fields (Configured by College Admin)
                  </h4>
                </div>
                <span className="text-[10px] text-purple-800 bg-purple-50 px-2 py-0.5 rounded font-mono font-bold">
                  ERP Dynamic Fields
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {enrollmentFields
                  .filter(f => f.isActive && !['gender', 'caste_category', 'sub_caste', 'domicile_state', 'quota', 'year', 'phone', 'email', 'parentPhone', 'physically_handicapped', 'sports_quota'].includes(f.key) && f.category !== 'Category_Quota')
                  .map((field) => {
                    const isRequired = field.isRequired;
                    const currentValue = field.key === 'annual_income' 
                      ? formData.annualFamilyIncome 
                      : formData.customFields[field.key] ?? field.defaultValue ?? '';

                    return (
                      <div key={field.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-slate-800 font-bold block text-[11px]">
                            {field.label}
                            {isRequired ? (
                              <span className="text-rose-600 font-bold ml-1">* (Mandatory)</span>
                            ) : (
                              <span className="text-slate-400 font-normal ml-1">(Optional)</span>
                            )}
                          </label>

                          {field.isBillable && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-900 font-bold rounded">
                              Fee Linked
                            </span>
                          )}
                        </div>

                        {field.type === 'select' ? (
                          <select
                            value={currentValue}
                            onChange={(e) => {
                              if (field.key === 'annual_income') {
                                setFormData({ ...formData, annualFamilyIncome: Number(e.target.value) });
                              } else {
                                handleCustomFieldChange(field.key, e.target.value);
                              }
                            }}
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none"
                          >
                            <option value="">-- Select {field.label} --</option>
                            {(field.options || []).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            placeholder={field.placeholder || 'Enter numeric value'}
                            value={currentValue}
                            onChange={(e) => {
                              if (field.key === 'annual_income') {
                                setFormData({ ...formData, annualFamilyIncome: Number(e.target.value) });
                              } else {
                                handleCustomFieldChange(field.key, Number(e.target.value));
                              }
                            }}
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none"
                          />
                        ) : field.type === 'checkbox' ? (
                          <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(currentValue)}
                              onChange={(e) => handleCustomFieldChange(field.key, e.target.checked)}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-slate-800 font-medium text-xs">
                              Confirm / Check if applicable
                            </span>
                          </label>
                        ) : (
                          <input
                            type={field.type === 'date' ? 'date' : 'text'}
                            placeholder={field.placeholder || `Enter ${field.label}`}
                            value={currentValue}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                          />
                        )}

                        {formErrors[field.key] && (
                          <span className="text-[10px] text-rose-600 font-semibold block">{formErrors[field.key]}</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-500 font-medium">
              Student ID: <strong className="font-mono text-slate-700">{student.id}</strong>
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-xs cursor-pointer"
                >
                  Remind Later
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Saving Profile...</span>
                ) : (
                  <>
                    <span>Save Profile Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
