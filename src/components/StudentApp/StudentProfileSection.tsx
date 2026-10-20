import React, { useState } from 'react';
import { Student, EnrollmentField } from '../../types/fee';
import { validateStudentProfile } from '../../utils/profileValidation';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  GraduationCap, 
  Building, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Camera, 
  Sparkles, 
  FileText, 
  Home, 
  Lock, 
  Info,
  ChevronRight,
  Upload,
  Trash2
} from 'lucide-react';

interface Props {
  student: Student;
  enrollmentFields: EnrollmentField[];
  onUpdateStudent: (updatedStudent: Student) => void;
  onOpenPhotoPicker?: () => void;
}

export const StudentProfileSection: React.FC<Props> = ({
  student,
  enrollmentFields,
  onUpdateStudent,
  onOpenPhotoPicker,
}) => {
  const [formData, setFormData] = useState({
    name: student.name || '',
    rollNo: student.rollNo || '',
    registerNo: student.registerNo || '',
    dateOfBirth: student.dateOfBirth || '',
    gender: student.gender || 'Male',
    category: student.category || 'General',
    subCaste: student.subCaste || '',
    domicileState: student.domicileState || 'Bihar',
    fatherName: student.fatherName || '',
    parentPhone: student.parentPhone || '',
    phone: student.phone || '',
    email: student.email || '',
    course: student.course || 'B.Tech',
    branch: student.branch || 'Computer Science & Engineering',
    year: student.year || 4,
    semester: student.semester || 7,
    streamCode: student.streamCode || 'CSE',
    quota: student.quota || 'State Merit (Subsidized)',
    annualFamilyIncome: student.annualFamilyIncome !== undefined ? student.annualFamilyIncome : 180000,
    hostelResident: student.hostelResident ?? false,
    hostelRoomNo: student.hostelRoomNo || '',
    customFields: { ...(student.customFields || {}) },
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validation = validateStudentProfile(
    { ...student, ...formData, customFields: formData.customFields },
    enrollmentFields
  );

  const handleCustomFieldChange = (key: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [key]: value,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    // Validate core mandatory fields
    if (!formData.name.trim()) errors.name = 'Full Student Name is required';
    if (!formData.rollNo.trim()) errors.rollNo = 'Roll Number is required';
    if (!formData.dateOfBirth.trim()) errors.dateOfBirth = 'Date of Birth (DOB) is required';
    if (!formData.gender) errors.gender = 'Gender is required';
    if (!formData.category) errors.category = 'Caste Reservation Category is required';
    if (!formData.fatherName.trim()) errors.fatherName = 'Father / Guardian Name is required';

    // Validate dynamic mandatory enrollment fields
    for (const field of enrollmentFields) {
      if (!field.isActive || !field.isRequired) continue;

      if (field.key === 'domicile_state' && !formData.domicileState.trim()) {
        errors.domicile_state = `${field.label} is required`;
      } else if (field.key === 'annual_income' && (formData.annualFamilyIncome === undefined || formData.annualFamilyIncome === null || (formData.annualFamilyIncome as unknown as string) === '')) {
        errors.annual_income = `${field.label} is required`;
      } else if (!['name', 'rollNo', 'gender', 'caste_category', 'dateOfBirth', 'fatherName', 'phone', 'email', 'domicile_state', 'annual_income', 'quota', 'parentPhone', 'year'].includes(field.key)) {
        const val = formData.customFields[field.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          errors[field.key] = `${field.label} is required`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
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

    setFormErrors({});

    // Check if student requested changes to sensitive fee-impacting fields
    const parsedIncome = Math.max(0, Number(formData.annualFamilyIncome) || 0);
    const hasIncomeChange = parsedIncome !== (student.annualFamilyIncome || 0);
    const hasDomicileChange = Boolean(formData.domicileState && formData.domicileState !== student.domicileState);
    const hasHostelChange = Boolean(formData.hostelResident) !== Boolean(student.hostelResident);
    const hasQuotaChange = Boolean(formData.quota && formData.quota !== student.quota);
    const hasSportsChange = formData.customFields?.sports_quota !== student.customFields?.sports_quota;
    const hasPwdChange = formData.customFields?.physically_handicapped !== student.customFields?.physically_handicapped;

    const hasFeeImpactingChanges = hasIncomeChange || hasDomicileChange || hasHostelChange || hasQuotaChange || hasSportsChange || hasPwdChange;

    const pendingMods = hasFeeImpactingChanges ? {
      status: 'Pending' as const,
      submittedAt: new Date().toISOString(),
      annualFamilyIncome: parsedIncome,
      domicileState: formData.domicileState,
      hostelResident: formData.hostelResident,
      quota: formData.quota,
      sportsQuota: formData.customFields?.sports_quota,
      physicallyHandicapped: formData.customFields?.physically_handicapped,
      officeRemarks: 'Pending administrative verification and physical document audit.',
    } : student.pendingProfileModifications;

    // Filter sensitive fields from customFields to prevent bypass
    const safeCustomFields = { ...formData.customFields };
    if (hasSportsChange) safeCustomFields.sports_quota = student.customFields?.sports_quota;
    if (hasPwdChange) safeCustomFields.physically_handicapped = student.customFields?.physically_handicapped;

    const updatedStudent: Student = {
      ...student,
      // Mandatory identity parameters are strictly preserved
      name: student.name,
      rollNo: student.rollNo,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      category: student.category,
      fatherName: student.fatherName,
      parentName: student.fatherName,
      course: student.course,
      branch: student.branch,
      year: student.year,
      semester: student.semester,

      // Editable contact parameters
      registerNo: formData.registerNo.trim(),
      subCaste: formData.subCaste.trim(),
      phone: cleanPhone ? `+91 ${cleanPhone}` : student.phone,
      parentPhone: cleanParentPhone ? `+91 ${cleanParentPhone}` : student.parentPhone,
      email: student.email || formData.email.trim(),

      // Fee-determining fields: authoritatively locked; updates held in pending modifications
      domicileState: student.domicileState || formData.domicileState,
      quota: student.quota,
      annualFamilyIncome: student.annualFamilyIncome,
      hostelResident: student.hostelResident,
      hostelRoomNo: formData.hostelRoomNo,
      customFields: safeCustomFields,
      pendingProfileModifications: pendingMods,
      profileCompleted: true,
    };

    onUpdateStudent(updatedStudent);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4500);
  };

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-200">
      
      {/* Header Profile Identity Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-5 rounded-3xl shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          
          {/* Avatar with Camera Changer */}
          <div className="relative group shrink-0">
            {student.profilePicture ? (
              <img
                src={student.profilePicture}
                alt={student.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-white/90 shadow-md ring-2 ring-emerald-400"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-emerald-700 text-white font-extrabold text-2xl flex items-center justify-center border-4 border-white/90 shadow-md ring-2 ring-emerald-400">
                {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
            )}

            {onOpenPhotoPicker && (
              <button
                type="button"
                onClick={onOpenPhotoPicker}
                className="absolute -bottom-1 -right-1 bg-white hover:bg-emerald-50 text-emerald-800 p-2 rounded-full shadow-lg border border-slate-200 transition-transform hover:scale-110"
                title="Change or upload profile picture"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Student Identity Information */}
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">{student.name}</h2>
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 shadow-2xs">
                Regular Enrolled Scholar
              </span>
            </div>

            <p className="text-xs text-emerald-200 font-mono">
              Roll No: <strong className="text-white">{student.rollNo}</strong> · Reg: {student.registerNo}
            </p>

            <p className="text-xs text-slate-300">
              {student.course} · {student.branch} (Year {student.year}, Semester {student.semester})
            </p>

            {/* Profile Completeness Indicator */}
            <div className="pt-2 max-w-sm">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-emerald-300 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Profile Form Completeness</span>
                </span>
                <span className="font-mono font-bold text-white">{validation.completionPercent}%</span>
              </div>
              <div className="w-full bg-emerald-950/60 rounded-full h-2 overflow-hidden border border-emerald-700/60">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${validation.completionPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Student profile details successfully verified and saved into college ERP!</span>
          </div>
          <button
            onClick={() => setSavedSuccess(false)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Registration Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6 text-xs">
        
        {/* Section 1: Basic Identity Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                1. Basic Student Identity Details
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" /> Registered Record
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-800 font-bold block">
                  Full Student Name
                </label>
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                  <Lock className="w-3 h-3 text-amber-600" /> Locked Once Registered
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={student.name}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed select-none"
                  title="Mandatory parameter locked: Cannot be amended by student once registered"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Official name as registered in college admission register.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-800 font-bold block">
                  Date of Birth (DOB)
                </label>
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                  <Lock className="w-3 h-3 text-amber-600" /> Locked Once Registered
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={student.dateOfBirth}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-not-allowed select-none"
                  title="Mandatory parameter locked: Cannot be amended by student once registered"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                DOB verified from matriculation certificate on file.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-800 font-bold block">
                  Gender Identity
                </label>
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                  <Lock className="w-3 h-3 text-amber-600" /> Locked Once Registered
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={student.gender || 'Male'}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-not-allowed select-none"
                  title="Mandatory parameter locked: Cannot be amended by student once registered"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Gender recorded in statutory university enrollment.
              </span>
            </div>

            <div>
              <label className="text-slate-800 font-bold block mb-1">
                University Registration Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="RLSY/22/BTECH/CSE/0014"
                value={formData.registerNo}
                onChange={(e) => setFormData({ ...formData, registerNo: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Official university registration card number.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Academic Standing Matrix */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                2. Academic Curriculum & Stage
              </h3>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-600" /> Mapped by Accountant via Student Update Menu
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-800 font-bold block">
                  Roll Number
                </label>
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                  <Lock className="w-3 h-3 text-amber-600" /> Locked
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={student.rollNo}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 cursor-not-allowed select-none"
                  title="Mandatory parameter locked: Cannot be amended by student once registered"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                University institutional roll identifier.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-800 font-bold block">
                  Degree / Course
                </label>
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                  <Lock className="w-3 h-3 text-amber-600" /> Locked
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={student.course}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-not-allowed select-none"
                  title="Mandatory parameter locked: Managed by Accountant via Student Update Menu"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Mapped by Accountant via Student Update Menu.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-800 font-bold block">
                  Branch / Subject
                </label>
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                  <Lock className="w-3 h-3 text-amber-600" /> Locked
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={student.branch}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-800 cursor-not-allowed select-none"
                  title="Mandatory parameter locked: Managed by Accountant via Student Update Menu"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Official academic discipline / stream.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="text-slate-800 font-bold block mb-1">
                Current Academic Year <span className="text-slate-400 font-normal text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={student.year ? `Year ${student.year}` : 'Optional / Not Specified'}
                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-700 cursor-not-allowed select-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-800 font-bold block">
                  Semester Stage
                </label>
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                  <Lock className="w-3 h-3 text-amber-600" /> Locked
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={`Semester ${student.semester}`}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 cursor-not-allowed select-none"
                  title="Mandatory parameter locked: Promoted by Accountant via Student Update Menu"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Promoted by Accountant via Student Update Menu.
              </span>
            </div>

            <div>
              <label className="text-slate-800 font-bold block mb-1">Stream Code</label>
              <input
                type="text"
                readOnly
                disabled
                value={student.streamCode || 'CSE'}
                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-700 cursor-not-allowed select-none uppercase"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Social Category & Domicile */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                3. Social Category & Reservation
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">Government Domicile &amp; Welfare</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-800 font-bold block">
                  Caste Category
                </label>
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                  <Lock className="w-3 h-3 text-amber-600" /> Locked Once Registered
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={student.category}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed select-none"
                  title="Mandatory parameter locked: Verified reservation category"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Statutory reservation category verified during admission.
              </span>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Sub-Caste Community <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Kurmi, Yadav, Rajput"
                value={formData.subCaste}
                onChange={(e) => setFormData({ ...formData, subCaste: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-800 font-bold block mb-1">
                Domicile State <span className="text-rose-600 font-bold">* Mandatory</span>
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

        {/* Section 4: Father / Guardian Details */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                4. Father / Guardian Details
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">Institutional Record</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-800 font-bold block">
                Father / Guardian Full Name
              </label>
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                <Lock className="w-3 h-3 text-amber-600" /> Locked Once Registered
              </span>
            </div>
            <div className="relative max-w-md">
              <input
                type="text"
                readOnly
                disabled
                value={student.fatherName}
                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed select-none"
                title="Mandatory parameter locked: Cannot be amended by student once registered"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Official father / guardian name recorded at admission.
            </span>
          </div>
        </div>

        {/* Section 5: Official Quota Privileges & Exemption Status (View Facility Only) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                5. Quota & Exemption Privileges (View Facility Only)
              </h3>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
              <Lock className="w-3 h-3 text-indigo-600" /> Managed by Accountant via Student Update Menu
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* PWD Quota View Facility */}
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
              <div className="pt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${
                  (student.customFields?.physically_handicapped || student.quota === 'Physically Challenged (PWD)')
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {(student.customFields?.physically_handicapped || student.quota === 'Physically Challenged (PWD)')
                    ? '✓ PwD Exemption Granted (Active)'
                    : '✗ Not Applicable (Regular)'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block pt-1">
                Fee waiver & accessibility privilege mapped by Accounts Office.
              </span>
            </div>

            {/* Sports / NCC Participation Quota View Facility */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-800 font-bold block text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sports / NCC Participation Quota</span>
                </label>
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> View Only
                </span>
              </div>
              <div className="pt-1">
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                  {student.customFields?.sports_quota && student.customFields?.sports_quota !== 'None'
                    ? student.customFields.sports_quota
                    : 'None / Regular Enrollment'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block pt-1">
                NCC certificates & sports quotas verified via Student Update Menu.
              </span>
            </div>

            {/* Admission Quota Category View Facility */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-800 font-bold block text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Admission Quota Category</span>
                </label>
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> View Only
                </span>
              </div>
              <div className="pt-1">
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 font-mono">
                  {student.quota || 'State Merit (Subsidized)'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block pt-1">
                Government merit or statutory quota assigned at admission.
              </span>
            </div>
          </div>
        </div>

        {/* Section 6: Institutional & Dynamic Enrollment Fields configured by Admin */}
        {enrollmentFields.filter(f => f.isActive && !['gender', 'caste_category', 'sub_caste', 'domicile_state', 'quota', 'year', 'phone', 'email', 'parentPhone', 'physically_handicapped', 'sports_quota'].includes(f.key) && f.category !== 'Category_Quota').length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-700" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  6. Institutional & Dynamic Profile Fields
                </h3>
              </div>
              <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-mono font-bold">
                Admin Configured
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* Submit Actions Button */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Updates are synced immediately with your official student ledger and digital ID card.</span>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save & Sync Academic Profile</span>
          </button>
        </div>

      </form>
    </div>
  );
};
