import React, { useState } from 'react';
import { 
  Student, 
  SchoolStaffUser, 
  UserSession, 
  StudentAchievement, 
  AchievementCategory,
  StaffHonorAuthority
} from '../../types/fee';
import { 
  Trophy, 
  Medal, 
  Award, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  PlusCircle, 
  ShieldCheck, 
  UserCheck, 
  Calendar, 
  Trash2,
  ExternalLink,
  Sparkles,
  Users,
  Shield,
  Plus,
  Lock,
  ArrowRight
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  staffUsers: SchoolStaffUser[];
  currentSession: UserSession | null;
  achievements: StudentAchievement[];
  staffAuthorities?: StaffHonorAuthority[];
  onUpdateStaffAuthorities?: (authorities: StaffHonorAuthority[]) => void;
  onAddAchievement: (achievement: StudentAchievement) => void;
  onDeleteAchievement?: (id: string) => void;
  isFullPage?: boolean;
}

export const StudentAchievementManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  students,
  staffUsers,
  currentSession,
  achievements,
  staffAuthorities = [],
  onUpdateStaffAuthorities,
  onAddAchievement,
  onDeleteAchievement,
  isFullPage = false,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'roster' | 'staff_auth'>('create');

  // Form states
  const [rollNoInput, setRollNoInput] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<AchievementCategory>('Academic');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [academicYear, setAcademicYear] = useState<string>('2024-2025');
  const [awardedBy, setAwardedBy] = useState<string>('Patna University Academic Council');
  const [badgeLevel, setBadgeLevel] = useState<'Gold' | 'Silver' | 'Bronze' | 'Special Honor' | 'Participation'>('Gold');
  const [scoreOrRank, setScoreOrRank] = useState<string>('1st Rank / Gold Medalist');
  const [description, setDescription] = useState<string>('');
  const [certificateUrl, setCertificateUrl] = useState<string>('');
  const [gemsToAward, setGemsToAward] = useState<number>(25);
  const [gemReason, setGemReason] = useState<string>('Academic & Co-curricular Distinction');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Staff Authorization Form States
  const [authEmailInput, setAuthEmailInput] = useState<string>('');
  const [authNameInput, setAuthNameInput] = useState<string>('');
  const [authDesignationInput, setAuthDesignationInput] = useState<string>('Faculty Member');
  const [authCanGems, setAuthCanGems] = useState<boolean>(true);
  const [authCanAchieve, setAuthCanAchieve] = useState<boolean>(true);
  const [authMaxGems, setAuthMaxGems] = useState<number>(50);

  if (!isOpen && !isFullPage) return null;

  // Check if current user is authorized to insert achievements or award gems
  const isMasterAdminOrAccountant = Boolean(
    currentSession?.isAppAdmin ||
    currentSession?.staffRole === 'App_Admin' ||
    currentSession?.staffRole === 'Principal_DDO' ||
    currentSession?.staffRole === 'Accounts_Officer' ||
    currentSession?.role === 'admin'
  );

  const currentEmail = currentSession?.emailOrPhone?.toLowerCase();
  const designatedAuth = staffAuthorities.find(
    (a) => a.isActive && (a.staffEmail.toLowerCase() === currentEmail || a.id === currentSession?.id)
  );

  const canAwardGems = Boolean(isMasterAdminOrAccountant || designatedAuth?.canAwardGems);
  const canAwardAchievements = Boolean(isMasterAdminOrAccountant || designatedAuth?.canAwardAchievements);

  // Filter students based on rollNo search
  const handleRollNoSearch = (query: string) => {
    setRollNoInput(query);
    const matched = students.find((s) => s.rollNo.toLowerCase() === query.trim().toLowerCase());
    if (matched) {
      setSelectedStudent(matched);
      setErrorMessage(null);
    } else {
      setSelectedStudent(null);
    }
  };

  const handleSelectStudentDirect = (stu: Student) => {
    setRollNoInput(stu.rollNo);
    setSelectedStudent(stu);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNoInput.trim()) {
      setErrorMessage('Please enter a valid student Roll Number.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please fill in achievement title and citation details.');
      return;
    }

    const targetStudent = selectedStudent || students.find(
      (s) => s.rollNo.toLowerCase() === rollNoInput.trim().toLowerCase()
    );

    if (!targetStudent) {
      setErrorMessage(`Student with Roll Number "${rollNoInput}" not found in institutional registry. Please check roll number.`);
      return;
    }

    const newAchievement: StudentAchievement = {
      id: `ACH-${Date.now().toString().slice(-6)}`,
      studentRollNo: targetStudent.rollNo,
      studentName: targetStudent.name,
      title: title.trim(),
      category,
      description: description.trim(),
      date,
      academicYear,
      awardedBy: awardedBy.trim(),
      recordedByStaffId: currentSession?.id || 'USR-ADMIN-01',
      recordedByStaffName: currentSession?.name || 'Authorized Staff Officer',
      recordedByStaffRole: currentSession?.staffDesignation || currentSession?.staffRole || 'Academic Authority',
      certificateUrl: certificateUrl.trim() || undefined,
      badgeLevel,
      scoreOrRank: scoreOrRank.trim() || undefined,
      gemsAwarded: canAwardGems ? Number(gemsToAward) || 0 : 0,
      gemReason: canAwardGems && Number(gemsToAward) > 0 ? gemReason.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    onAddAchievement(newAchievement);
    setSuccessMessage(`Achievement and ${gemsToAward} Gems recorded successfully for ${targetStudent.name} (${targetStudent.rollNo})! Strictly visible only to their portal.`);
    setErrorMessage(null);

    // Reset form
    setTitle('');
    setDescription('');
    setScoreOrRank('');
    setCertificateUrl('');
  };

  // Staff Authorization Handlers
  const handleAddStaffAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmailInput.trim()) return;

    const email = authEmailInput.trim().toLowerCase();
    const existing = staffAuthorities.find((a) => a.staffEmail.toLowerCase() === email);

    if (existing) {
      setErrorMessage(`Staff email ${email} is already on the authorization list.`);
      return;
    }

    const newAuth: StaffHonorAuthority = {
      id: `AUTH-${Date.now().toString().slice(-5)}`,
      staffEmail: email,
      staffName: authNameInput.trim() || email.split('@')[0],
      designation: authDesignationInput.trim(),
      canAwardGems: authCanGems,
      canAwardAchievements: authCanAchieve,
      maxGemsPerAward: Number(authMaxGems) || 50,
      authorizedBy: `${currentSession?.name || 'Administrator'} (${currentSession?.staffRole || 'Admin'})`,
      authorizedAt: new Date().toISOString().split('T')[0],
      isActive: true,
    };

    if (onUpdateStaffAuthorities) {
      onUpdateStaffAuthorities([...staffAuthorities, newAuth]);
      setSuccessMessage(`Staff user ${email} successfully authorized to award honors & gems!`);
    }

    setAuthEmailInput('');
    setAuthNameInput('');
  };

  const handleToggleAuthGems = (id: string) => {
    if (!onUpdateStaffAuthorities) return;
    const updated = staffAuthorities.map((a) => (a.id === id ? { ...a, canAwardGems: !a.canAwardGems } : a));
    onUpdateStaffAuthorities(updated);
  };

  const handleToggleAuthAchievements = (id: string) => {
    if (!onUpdateStaffAuthorities) return;
    const updated = staffAuthorities.map((a) => (a.id === id ? { ...a, canAwardAchievements: !a.canAwardAchievements } : a));
    onUpdateStaffAuthorities(updated);
  };

  const handleToggleAuthActive = (id: string) => {
    if (!onUpdateStaffAuthorities) return;
    const updated = staffAuthorities.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a));
    onUpdateStaffAuthorities(updated);
  };

  const handleDeleteStaffAuth = (id: string) => {
    if (!onUpdateStaffAuthorities) return;
    onUpdateStaffAuthorities(staffAuthorities.filter((a) => a.id !== id));
  };

  const content = (
    <div className={`bg-white ${isFullPage ? 'rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-7xl mx-auto' : 'rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 my-auto border border-slate-200 max-h-[90vh] flex flex-col'} animate-in fade-in zoom-in-95 duration-150`}>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-700" />
              <span>Honour & Achievement Registry</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">Strict Roll No Privacy</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Student Gems & Honors Management
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin & Accountant designate authorized staff users. Achievements & Gems awarded are strictly visible ONLY to the specific student Roll No.
          </p>
        </div>

        {!isFullPage && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Permission Check */}
      {!canAwardAchievements && !isMasterAdminOrAccountant ? (
        <div className="p-6 text-center space-y-3 bg-amber-50/70 border border-amber-200 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Restricted School User Privilege</h4>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Your staff account is not currently authorized to award gems or record student honors. The Institutional Admin or Accountant can designate your email in the "Authorized Staff" directory.
          </p>
          {!isFullPage && (
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Acknowledge & Close
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Sub Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Award Gems & Honor Against Roll No</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-indigo-600" />
              <span>Honors & Gems Ledger ({achievements.length})</span>
            </button>

            {isMasterAdminOrAccountant && (
              <button
                type="button"
                onClick={() => setActiveTab('staff_auth')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'staff_auth'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Authorized Staff ({staffAuthorities.length})</span>
              </button>
            )}
          </div>

          {/* Feedback messages */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-semibold flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* VIEW 1: AWARD GEMS & HONOR AGAINST ROLL NO */}
          {activeTab === 'create' && (
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Roll No Search & Verification */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="text-slate-800 font-bold block">
                  1. Target Student Roll Number *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Enter Roll No e.g. 2025/BTECH/CSE/001..."
                    value={rollNoInput}
                    onChange={(e) => handleRollNoSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {selectedStudent ? (
                  <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-950">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center">
                        {selectedStudent.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold block">{selectedStudent.name}</span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          Roll: {selectedStudent.rollNo} · {selectedStudent.course} (Sem {selectedStudent.semester})
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-800" />
                      <span>Verified Target</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
                    <span className="text-slate-400 font-medium shrink-0">Quick Pick:</span>
                    {students.slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectStudentDirect(s)}
                        className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 shrink-0 font-mono font-semibold"
                      >
                        {s.rollNo} ({s.name.split(' ')[0]})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Award Gems Section */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-amber-900 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Institutional Gem Award (Points for Excellence)</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 uppercase bg-amber-200/60 px-2 py-0.5 rounded-full">
                    Gems System
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                      Gems to Credit
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[10, 25, 50, 100].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setGemsToAward(pts)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            gemsToAward === pts
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          💎 {pts}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                      Gem Citation Reason
                    </label>
                    <input
                      type="text"
                      value={gemReason}
                      onChange={(e) => setGemReason(e.target.value)}
                      placeholder="e.g. 1st Rank in AI Hackathon"
                      className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Achievement Distinction Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Science Fair Gold Medalist"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AchievementCategory)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-medium"
                  >
                    <option value="Academic">Academic (Gold Medal / Merit List)</option>
                    <option value="Sports">Sports & Athletics</option>
                    <option value="Technical">Technical & Robotics</option>
                    <option value="Hackathon">Hackathon & Coding Competitions</option>
                    <option value="Research">Research & Publications</option>
                    <option value="Cultural">Cultural & Arts</option>
                    <option value="Leadership">Leadership & Student Affairs</option>
                    <option value="Certification">Professional Certification</option>
                    <option value="Other">Other Institutional Honor</option>
                  </select>
                </div>
              </div>

              {/* Badge & Rank */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Honor / Badge Level</label>
                  <select
                    value={badgeLevel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBadgeLevel(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-medium"
                  >
                    <option value="Gold">Gold Medal / 1st Place</option>
                    <option value="Silver">Silver Medal / 2nd Place</option>
                    <option value="Bronze">Bronze Medal / 3rd Place</option>
                    <option value="Special Honor">Special Honor / Citation</option>
                    <option value="Participation">State / National Representation</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Rank / Score (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Rank, CGPA 9.8, Top 1%"
                    value={scoreOrRank}
                    onChange={(e) => setScoreOrRank(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Awarding Body & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Awarding Organization *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bihar State Higher Education Council"
                    value={awardedBy}
                    onChange={(e) => setAwardedBy(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Award Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Citation Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Official citation details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white text-xs"
                />
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-[11px] text-indigo-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0" />
                <span>
                  <strong>Strict Roll No Privacy:</strong> This distinction and gem award will strictly be visible ONLY to Roll No: <strong>{rollNoInput || '[Roll No]'}</strong>.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                {!isFullPage && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Award Gems & Record Achievement</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW 2: HONORS & GEMS LEDGER */}
          {activeTab === 'roster' && (
            <div className="space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">
                  Total Logged Honors Across College: <strong>{achievements.length}</strong>
                </span>
                <span className="text-[10px] text-slate-400">
                  Visible strictly only to individual student roll numbers
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {achievements.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    No achievements or gems recorded yet.
                  </div>
                ) : (
                  achievements.map((item) => (
                    <div key={item.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded font-mono font-bold bg-indigo-50 text-indigo-800 text-[10px] border border-indigo-200">
                            Roll: {item.studentRollNo}
                          </span>
                          <span className="font-bold text-slate-900">{item.title}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800">
                            {item.badgeLevel}
                          </span>
                          {item.gemsAwarded ? (
                            <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-amber-200 text-amber-950 flex items-center gap-1">
                              💎 {item.gemsAwarded} Gems
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-1">{item.description}</p>
                        <div className="text-[10px] text-slate-400 flex items-center gap-3">
                          <span>Awarded by: <strong>{item.awardedBy}</strong></span>
                          <span>Logged by: {item.recordedByStaffName}</span>
                          <span>Date: {item.date}</span>
                        </div>
                      </div>

                      {onDeleteAchievement && (
                        <button
                          type="button"
                          onClick={() => onDeleteAchievement(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                          title="Delete achievement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: AUTHORIZED STAFF DIRECTORY */}
          {activeTab === 'staff_auth' && (
            <div className="space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Designate Authorized Staff Users</span>
                </h4>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Admin and Accountant can authorize specific faculty, HODs, or staff email IDs to award Gems or record student achievements against Roll Numbers.
                </p>

                <form onSubmit={handleAddStaffAuth} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Staff Email ID..."
                    value={authEmailInput}
                    onChange={(e) => setAuthEmailInput(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Staff Full Name..."
                    value={authNameInput}
                    onChange={(e) => setAuthNameInput(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Authorize Staff</span>
                  </button>
                </form>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2.5 px-3">Staff Name & Email</th>
                      <th className="py-2.5 px-3 text-center">Can Award Gems</th>
                      <th className="py-2.5 px-3 text-center">Can Award Honors</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {staffAuthorities.map((auth) => (
                      <tr key={auth.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{auth.staffName}</span>
                          <span className="font-mono text-[10px] text-slate-500">{auth.staffEmail}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleAuthGems(auth.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              auth.canAwardGems
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {auth.canAwardGems ? '💎 Enabled' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleAuthAchievements(auth.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              auth.canAwardAchievements
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {auth.canAwardAchievements ? '🏆 Enabled' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleAuthActive(auth.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              auth.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {auth.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteStaffAuth(auth.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      {content}
    </div>
  );
};
