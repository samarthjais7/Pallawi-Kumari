import React, { useState, useEffect } from 'react';
import { CollegeProfile, UserSession } from '../../types/fee';
import { 
  Building, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Landmark, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Globe, 
  Award, 
  GraduationCap, 
  ShieldCheck, 
  FileText, 
  Eye, 
  Sparkles,
  ExternalLink,
  Layers
} from 'lucide-react';
import { INITIAL_COLLEGE_PROFILE } from '../../data/mockData';
import { safeConfirm } from '../../utils/safeHelpers';

interface Props {
  profile: CollegeProfile;
  onSave: (updatedProfile: CollegeProfile) => Promise<void> | void;
  session: UserSession | null;
  onClose?: () => void;
}

export const CollegeProfileManager: React.FC<Props> = ({
  profile,
  onSave,
  session,
  onClose
}) => {
  const [formData, setFormData] = useState<CollegeProfile>({ ...profile });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activeSection, setActiveSection] = useState<'identity' | 'affiliation' | 'contacts' | 'treasury' | 'session'>('identity');

  // Synchronize internal form state when upstream profile updates via Firestore ONLY IF user has no unsaved local edits
  useEffect(() => {
    if (!isDirty) {
      setFormData({ ...profile });
    }
  }, [profile, isDirty]);

  const handleChange = (field: keyof CollegeProfile, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  const handleResetToDefaults = () => {
    if (safeConfirm('Reset all college details back to default values? Any unsaved edits will be lost.')) {
      setFormData({
        ...INITIAL_COLLEGE_PROFILE,
        id: profile.id || 'primary',
      });
      setIsDirty(true);
      setSaveSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('College Name is required.');
      return;
    }
    if (!formData.shortName.trim()) {
      setErrorMessage('College Short Code / Abbreviation is required.');
      return;
    }
    if (!formData.contactEmail.trim()) {
      setErrorMessage('Contact Email is required.');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMessage('Campus Address is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updated: CollegeProfile = {
        ...formData,
        id: profile.id || 'primary',
        name: (formData.name || 'Ram Lal Singh Yadav College').trim().slice(0, 128),
        shortName: (formData.shortName || 'RLSY').trim().slice(0, 32),
        dept: (formData.dept || 'Department of Higher Education').trim().slice(0, 256),
        address: (formData.address || 'College Campus, Bakhtiyarpur, Patna, Bihar - 803212').trim().slice(0, 512),
        contactEmail: (formData.contactEmail || 'admin.office@rlsycollege.ac.in').trim().slice(0, 128),
        accreditation: (formData.accreditation || 'NAAC B+ Accredited').trim(),
        bannerNotice: (formData.bannerNotice || '').trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: session?.name || 'Institutional Administrator'
      };
      await onSave(updated);
      setIsDirty(false);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setIsSaving(false);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to update college details. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-100/50 via-teal-50/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-black text-lg shadow-md ring-2 ring-emerald-500/20 shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  College Profile & Institutional Details
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Admin Authority
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  Synced Across App & Receipts
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Amend the official institution name, university affiliation, contact numbers, email addresses, 
                campus address, DDO codes, and treasury receipt heads displayed on headers, receipts, and certificates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset form fields to factory default values"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Defaults</span>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Publishing...' : 'Save & Publish Changes'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Banners */}
        {saveSuccess && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-3 text-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <strong>College details updated successfully!</strong> The changes are published to Cloud Firestore and instantly reflected across the Header, Student Portal, Fee Receipts, and Certificates.
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-3 text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1">
              <strong>Error updating details:</strong> {errorMessage}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Form Left, Real-Time Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveSection('identity')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'identity' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span>Identity & Name</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('affiliation')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'affiliation' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              <span>Affiliation & Accreditation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('contacts')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'contacts' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>Contacts & Address</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('treasury')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'treasury' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-blue-600" />
              <span>Treasury & DDO</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('session')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'session' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
              <span>Session & Notice</span>
            </button>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
            
            {/* 1. IDENTITY & NAME SECTION */}
            {activeSection === 'identity' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-700" />
                    <span>College Identity & Branding</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure the main title, short abbreviation, and full institutional designation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      College Display Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="e.g. RLSY College"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white font-medium"
                      required
                    />
                    <span className="text-[10px] text-slate-500 block">Primary brand name shown on header navigation & receipts.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Short Code / Logo Abbreviation <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.shortName}
                      onChange={(e) => handleChange('shortName', e.target.value.toUpperCase())}
                      placeholder="e.g. RLSY"
                      maxLength={12}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white font-black tracking-wider uppercase"
                      required
                    />
                    <span className="text-[10px] text-slate-500 block">2-6 letters badge displayed inside the header square emblem.</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Full Institutional Legal Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName || ''}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="e.g. Ram Lakhan Singh Yadav College, Patna"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-500 block">Complete official title printed on statutory university certificates & tax receipts.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Administrative Department / Directorate
                    </label>
                    <input
                      type="text"
                      value={formData.dept}
                      onChange={(e) => handleChange('dept', e.target.value)}
                      placeholder="e.g. Department of Higher Education"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Year of Establishment
                    </label>
                    <input
                      type="text"
                      value={formData.establishedYear || ''}
                      onChange={(e) => handleChange('establishedYear', e.target.value)}
                      placeholder="e.g. 1971"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Official College Website URL
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={formData.websiteUrl || ''}
                      onChange={(e) => handleChange('websiteUrl', e.target.value)}
                      placeholder="e.g. https://rlsycollege.ac.in"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. AFFILIATION & ACCREDITATION SECTION */}
            {activeSection === 'affiliation' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-700" />
                    <span>Affiliation & University Status</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define parent university affiliation, NAAC grades, UGC recognition, and approvals.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    University Affiliation Subtitle <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.affiliation}
                    onChange={(e) => handleChange('affiliation', e.target.value)}
                    placeholder="e.g. Patna College (Affiliated) or Patna University Constituent College"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white font-medium"
                    required
                  />
                  <span className="text-[10px] text-slate-500 block">Shown directly underneath the college name in the header banner.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Statutory Accreditation & Approvals Line
                  </label>
                  <input
                    type="text"
                    value={formData.accreditation}
                    onChange={(e) => handleChange('accreditation', e.target.value)}
                    placeholder="e.g. Affiliated with Patna College · UGC Approved · NAAC Grade 'A' Accredited"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-500 block">Printed on printable fee receipts and bona fide certificates.</span>
                </div>

                <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-1 text-xs text-indigo-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-700" />
                    <span>Statutory Compliance Guidance</span>
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    Changes here immediately update the accreditation sub-header on Student Bonafide Certificates,
                    80E Tax exemption receipts, and the Institutional Accreditation drawer modal.
                  </p>
                </div>
              </div>
            )}

            {/* 3. CONTACTS & ADDRESS SECTION */}
            {activeSection === 'contacts' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-700" />
                    <span>Official Contacts & Campus Location</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Helpline phone numbers, support emails, physical campus address, and cashier desk timings.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Campus Physical Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="e.g. RLSY College Campus, Patna, Bihar - 800001"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Official General Office Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => handleChange('contactEmail', e.target.value)}
                        placeholder="e.g. office@rlsycollege.ac.in"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Accounts Office / Fee Desk Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={formData.accountsEmail || ''}
                        onChange={(e) => handleChange('accountsEmail', e.target.value)}
                        placeholder="e.g. accounts@rlsycollege.ac.in"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Telephone / Helpline Number(s)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={formData.contactPhone || ''}
                        onChange={(e) => handleChange('contactPhone', e.target.value)}
                        placeholder="e.g. (0612) 237-1904 · 237-1905"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Mobile / SMS Grievance Helpline
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={formData.helplinePhone || ''}
                        onChange={(e) => handleChange('helplinePhone', e.target.value)}
                        placeholder="e.g. +91 94310 12345"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Administrative & Cashier Desk Working Hours
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={formData.officeHours || ''}
                      onChange={(e) => handleChange('officeHours', e.target.value)}
                      placeholder="e.g. Monday to Saturday: 10:00 AM – 04:30 PM"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. TREASURY & DDO SECTION */}
            {activeSection === 'treasury' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-blue-700" />
                    <span>State Treasury & Financial Codes</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official Drawing & Disbursing Officer (DDO) and Integrated Financial Management System (IFMS) identifiers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      DDO Treasury Code
                    </label>
                    <input
                      type="text"
                      value={formData.ddoTreasuryCode || ''}
                      onChange={(e) => handleChange('ddoTreasuryCode', e.target.value)}
                      placeholder="e.g. 2049-RLSY-PATNA"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      IFMS Receipt Head
                    </label>
                    <input
                      type="text"
                      value={formData.ifmsReceiptHead || ''}
                      onChange={(e) => handleChange('ifmsReceiptHead', e.target.value)}
                      placeholder="e.g. 0202-01-102-01"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Combined Statutory Treasury Descriptor Line
                  </label>
                  <input
                    type="text"
                    value={formData.treasuryCode}
                    onChange={(e) => handleChange('treasuryCode', e.target.value)}
                    placeholder="e.g. DDO Code: 2049-RLSY-PATNA · Head of Account: 0202-01-102-01"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-500 block">Appears in header of certificates and official challan copies.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Head of Institution / Principal Name
                    </label>
                    <input
                      type="text"
                      value={formData.principalName || ''}
                      onChange={(e) => handleChange('principalName', e.target.value)}
                      placeholder="e.g. Prof. (Dr.) Ramakant Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Signatory Designation Title
                    </label>
                    <input
                      type="text"
                      value={formData.principalTitle || ''}
                      onChange={(e) => handleChange('principalTitle', e.target.value)}
                      placeholder="e.g. Principal & DDO"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. ACADEMIC SESSION & NOTICE BANNER */}
            {activeSection === 'session' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-purple-700" />
                    <span>Academic Session & Portal Announcement</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Active academic year, term cycle, and top ticker announcements.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Active Academic Session
                    </label>
                    <input
                      type="text"
                      value={formData.academicSession}
                      onChange={(e) => handleChange('academicSession', e.target.value)}
                      placeholder="e.g. 2025-2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white font-medium"
                    />
                    <span className="text-[10px] text-slate-500 block">Printed on current fee receipts & semester enrolments.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Current Term Identifier
                    </label>
                    <input
                      type="text"
                      value={formData.currentTerm}
                      onChange={(e) => handleChange('currentTerm', e.target.value)}
                      placeholder="e.g. Session 2025-26"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Institutional Ticker Notice / Announcement Banner
                  </label>
                  <textarea
                    rows={2}
                    value={formData.bannerNotice || ''}
                    onChange={(e) => handleChange('bannerNotice', e.target.value)}
                    placeholder="e.g. Online Examination & Term Fee Portal · Session 2025-26 Open · Dynamic UPI QR Enabled"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-500 block">Optional marquee or banner text visible to students and visitors.</span>
                </div>
              </div>
            )}

            {/* Bottom Save Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {formData.updatedAt ? `Last saved on ${new Date(formData.updatedAt).toLocaleString()}` : 'Unsaved modifications'}
              </span>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs hover:shadow cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Publishing...' : 'Save & Publish Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                <Eye className="w-4 h-4" />
                <span>Live Real-Time Preview</span>
              </div>
              <span className="text-[10px] text-slate-400">Updates as you type</span>
            </div>

            {/* 1. Header Look Preview */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                1. Header Navigation Brand
              </span>
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-extrabold text-xs shadow-xs ring-1 ring-emerald-500/40 shrink-0">
                  {formData.shortName || 'RLSY'}
                </div>
                <div className="overflow-hidden">
                  <span className="text-sm font-extrabold tracking-tight text-white block leading-tight truncate">
                    {formData.name || 'College Display Name'}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-300/80 block truncate">
                    {formData.affiliation || 'University Affiliation'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Official Fee Receipt Letterhead Preview */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                2. Fee Receipt / Certificate Letterhead
              </span>
              <div className="p-4 bg-white text-slate-900 rounded-xl border border-slate-200 text-center space-y-1 shadow-xs">
                <div className="text-[10px] font-mono text-emerald-800 uppercase font-semibold">
                  {formData.dept || 'Department of Higher Education'}
                </div>
                <div className="text-sm font-black uppercase text-slate-950 tracking-tight">
                  {formData.name || 'College Name'}
                </div>
                <div className="text-[10px] text-slate-600 font-medium">
                  {formData.accreditation || 'Accreditation Line'}
                </div>
                <div className="text-[9px] text-slate-500">
                  {formData.address || 'Campus Address'}
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-600 font-mono">
                  <span>DDO: {formData.ddoTreasuryCode || '2049-RLSY-PATNA'}</span>
                  <span>Session: {formData.academicSession || '2025-26'}</span>
                </div>
              </div>
            </div>

            {/* 3. Statutory & Contact Card Preview */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                3. Institutional Info Modal Summary
              </span>
              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-400 block">DDO Treasury Code:</span>
                    <strong className="text-white font-mono">{formData.ddoTreasuryCode || '2049-RLSY-PATNA'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">IFMS Receipt Head:</span>
                    <strong className="text-white font-mono">{formData.ifmsReceiptHead || '0202-01-102-01'}</strong>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-700 text-[10px] space-y-1 text-slate-300">
                  <p><strong>Accounts Email:</strong> {formData.accountsEmail || formData.contactEmail || 'accounts@college.ac.in'}</p>
                  <p><strong>Helpline:</strong> {formData.contactPhone || '(0612) 000-0000'}</p>
                  <p><strong>Principal & DDO:</strong> {formData.principalName || 'Principal Name'} ({formData.principalTitle || 'Principal & DDO'})</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
