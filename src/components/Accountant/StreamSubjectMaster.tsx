import React, { useState } from 'react';
import { AcademicStream, StudySubject, UserSession } from '../../types/fee';
import { toPaisa, fromPaisa, Paisa, calculateInstallmentSchedule } from '../../utils/paisaMath';
import { safeMatchStrings, safeLower } from '../../utils/safeHelpers';
import {
  BookOpen,
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  Calculator,
  Sparkles,
  TrendingUp,
  X,
  FileSpreadsheet,
  GraduationCap,
  FlaskConical,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface Props {
  streams: AcademicStream[];
  subjects: StudySubject[];
  onUpdateStreams: (streams: AcademicStream[]) => void;
  onUpdateSubjects: (subjects: StudySubject[]) => void;
  onActivateCampaign?: (campaignType: 'Annual' | 'Monthly' | 'Semester', streamCode: string, totalAmount: number) => void;
  onCascadeStreamCode?: (oldCode: string, newCode: string) => void;
  currentSession: UserSession | null;
}

export const StreamSubjectMaster: React.FC<Props> = ({
  streams,
  subjects,
  onUpdateStreams,
  onUpdateSubjects,
  onActivateCampaign,
  onCascadeStreamCode,
  currentSession,
}) => {
  const [activeTab, setActiveTab] = useState<'streams' | 'subjects' | 'summation'>('summation');
  const [selectedStreamCode, setSelectedStreamCode] = useState<string>(streams[0]?.code || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Stream Modal State
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<AcademicStream | null>(null);
  const [streamCode, setStreamCode] = useState('');
  const [streamName, setStreamName] = useState('');
  const [streamDegree, setStreamDegree] = useState('B.Tech');
  const [streamDepartment, setStreamDepartment] = useState('');
  const [streamSemesters, setStreamSemesters] = useState(8);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<StudySubject | null>(null);
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectStreamCode, setSubjectStreamCode] = useState(streams[0]?.code || 'CSE');
  const [subjectSemester, setSubjectSemester] = useState(1);
  const [subjectCredits, setSubjectCredits] = useState(4);
  const [subjectType, setSubjectType] = useState<StudySubject['type']>('Theory');
  const [subjectAnnualFeePaisa, setSubjectAnnualFeePaisa] = useState<number>(10000 * 100);
  const [subjectMonthlyFeePaisa, setSubjectMonthlyFeePaisa] = useState<number>(850 * 100);
  const [subjectSemesterFeePaisa, setSubjectSemesterFeePaisa] = useState<number>(5000 * 100);
  const [subjectLabFeePaisa, setSubjectLabFeePaisa] = useState<number>(0);
  const [subjectOtherFeePaisa, setSubjectOtherFeePaisa] = useState<number>(0);
  const [subjectOtherFeeLabel, setSubjectOtherFeeLabel] = useState('IT & Lab Maintenance');
  const [subjectError, setSubjectError] = useState<string | null>(null);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'stream' | 'subject'; id: string; name: string } | null>(null);

  // Campaign Activation Feedback
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  // Calculations for Stream Summation
  const getStreamSubjects = (code: string) => {
    return subjects.filter((s) => s.isActive && safeMatchStrings(s.streamCode, code));
  };

  const calculateStreamTotals = (code: string) => {
    const list = getStreamSubjects(code);
    // Absolute integer Paisa scaling for all subject fee components
    const sumSubjectAnnualPaisa = list.reduce((acc, s) => acc + toPaisa(s.annualFee || s.subjectFee || 0), 0);
    const sumSubjectMonthlyPaisa = list.reduce((acc, s) => {
      if (s.monthlyFee !== undefined && s.monthlyFee !== null) {
        return acc + toPaisa(s.monthlyFee);
      }
      const feePaisa = toPaisa(s.annualFee || s.subjectFee || 0);
      return acc + Math.floor(feePaisa / 10);
    }, 0);
    const sumSubjectSemesterPaisa = list.reduce((acc, s) => {
      if (s.semesterFee !== undefined && s.semesterFee !== null) {
        return acc + toPaisa(s.semesterFee);
      }
      const feePaisa = toPaisa(s.annualFee || s.subjectFee || 0);
      return acc + Math.floor(feePaisa / 2);
    }, 0);
    const sumLabPaisa = list.reduce((acc, s) => acc + toPaisa(s.labFee || s.associatedLabFee || 0), 0);
    const sumOtherPaisa = list.reduce((acc, s) => acc + toPaisa(s.otherFee || 0), 0);

    const labMonthlySchedule = calculateInstallmentSchedule(sumLabPaisa, 10);
    const labSemesterSchedule = calculateInstallmentSchedule(sumLabPaisa, 2);
    const otherMonthlySchedule = calculateInstallmentSchedule(sumOtherPaisa, 10);
    const otherSemesterSchedule = calculateInstallmentSchedule(sumOtherPaisa, 2);

    const monthlyLabPaisa = labMonthlySchedule.baseInstallment;
    const monthlyOtherPaisa = otherMonthlySchedule.baseInstallment;
    const semesterLabPaisa = labSemesterSchedule.baseInstallment;
    const semesterOtherPaisa = otherSemesterSchedule.baseInstallment;

    const totalAnnualPaisa = sumSubjectAnnualPaisa + sumLabPaisa + sumOtherPaisa;
    const annualMonthlySchedule = calculateInstallmentSchedule(totalAnnualPaisa, 10);
    const annualSemesterSchedule = calculateInstallmentSchedule(totalAnnualPaisa, 2);

    const totalMonthlyPaisa = annualMonthlySchedule.baseInstallment;
    const totalSemesterPaisa = annualSemesterSchedule.baseInstallment;

    return {
      count: list.length,
      sumSubjectAnnual: fromPaisa(sumSubjectAnnualPaisa),
      sumSubjectMonthly: fromPaisa(sumSubjectMonthlyPaisa),
      sumSubjectSemester: fromPaisa(sumSubjectSemesterPaisa),
      sumLab: fromPaisa(sumLabPaisa),
      sumOther: fromPaisa(sumOtherPaisa),
      monthlyLab: fromPaisa(monthlyLabPaisa),
      monthlyOther: fromPaisa(monthlyOtherPaisa),
      semesterLab: fromPaisa(semesterLabPaisa),
      semesterOther: fromPaisa(semesterOtherPaisa),
      totalAnnual: fromPaisa(totalAnnualPaisa),
      totalMonthly: fromPaisa(totalMonthlyPaisa),
      totalSemester: fromPaisa(totalSemesterPaisa),
      totalAnnualPaisa,
      totalMonthlyPaisa,
      totalSemesterPaisa,
    };
  };

  // Stream CRUD Handlers
  const handleOpenAddStream = () => {
    setEditingStream(null);
    setStreamCode('');
    setStreamName('');
    setStreamDegree('B.Tech');
    setStreamDepartment('');
    setStreamSemesters(8);
    setStreamError(null);
    setIsStreamModalOpen(true);
  };

  const handleOpenEditStream = (st: AcademicStream) => {
    setEditingStream(st);
    setStreamCode(st.code);
    setStreamName(st.name);
    setStreamDegree(st.degree);
    setStreamDepartment(st.department);
    setStreamSemesters(st.totalSemesters);
    setStreamError(null);
    setIsStreamModalOpen(true);
  };

  const handleSaveStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamCode.trim() || !streamName.trim()) {
      setStreamError('Stream code and name are required.');
      return;
    }

    const cleanCode = streamCode.trim().toUpperCase();
    const duplicate = streams.find(
      (s) => s.code.toUpperCase() === cleanCode && (!editingStream || s.id !== editingStream.id)
    );
    if (duplicate) {
      setStreamError(`Stream with code "${cleanCode}" already exists.`);
      return;
    }

    if (editingStream) {
      const updated = streams.map((s) =>
        s.id === editingStream.id
          ? {
              ...s,
              code: cleanCode,
              name: streamName.trim(),
              degree: streamDegree.trim(),
              department: streamDepartment.trim() || `Department of ${streamName.trim()}`,
              totalSemesters: Number(streamSemesters) || 8,
            }
          : s
      );
      onUpdateStreams(updated);

      // Cascade stream code update to all associated subjects to prevent orphaning
      if (editingStream.code !== cleanCode) {
        const updatedSubjects = subjects.map((sub) =>
          sub.streamCode === editingStream.code ? { ...sub, streamCode: cleanCode } : sub
        );
        onUpdateSubjects(updatedSubjects);
        onCascadeStreamCode?.(editingStream.code, cleanCode);
        if (selectedStreamCode === editingStream.code) {
          setSelectedStreamCode(cleanCode);
        }
      }
    } else {
      const newStream: AcademicStream = {
        id: `STR-${Date.now().toString().slice(-5)}`,
        code: cleanCode,
        name: streamName.trim(),
        degree: streamDegree.trim(),
        department: streamDepartment.trim() || `Department of ${streamName.trim()}`,
        totalSemesters: Number(streamSemesters) || 8,
        isActive: true,
      };
      onUpdateStreams([...streams, newStream]);
    }

    setIsStreamModalOpen(false);
  };

  // Subject CRUD Handlers
  const handleOpenAddSubject = (defaultStream?: string) => {
    setEditingSubject(null);
    setSubjectCode('');
    setSubjectName('');
    setSubjectStreamCode(defaultStream || selectedStreamCode !== 'ALL' ? selectedStreamCode : streams[0]?.code || 'CSE');
    setSubjectSemester(1);
    setSubjectCredits(4);
    setSubjectType('Theory');
    setSubjectAnnualFeePaisa(10000 * 100);
    setSubjectMonthlyFeePaisa(850 * 100);
    setSubjectSemesterFeePaisa(5000 * 100);
    setSubjectLabFeePaisa(0);
    setSubjectOtherFeePaisa(0);
    setSubjectOtherFeeLabel('IT & Library Service');
    setSubjectError(null);
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (sub: StudySubject) => {
    setEditingSubject(sub);
    setSubjectCode(sub.code);
    setSubjectName(sub.name);
    setSubjectStreamCode(sub.streamCode);
    setSubjectSemester(sub.semester);
    setSubjectCredits(sub.credits);
    setSubjectType(sub.type);
    const annualPaisa = toPaisa(sub.annualFee || sub.subjectFee || 10000);
    setSubjectAnnualFeePaisa(annualPaisa);
    setSubjectMonthlyFeePaisa(
      sub.monthlyFee !== undefined && sub.monthlyFee !== null
        ? toPaisa(sub.monthlyFee)
        : Math.floor(annualPaisa / 10)
    );
    setSubjectSemesterFeePaisa(
      sub.semesterFee !== undefined && sub.semesterFee !== null
        ? toPaisa(sub.semesterFee)
        : Math.floor(annualPaisa / 2)
    );
    setSubjectLabFeePaisa(toPaisa(sub.labFee || sub.associatedLabFee || 0));
    setSubjectOtherFeePaisa(toPaisa(sub.otherFee || 0));
    setSubjectOtherFeeLabel(sub.otherFeeLabel || 'IT & Library Service');
    setSubjectError(null);
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectCode.trim() || !subjectName.trim()) {
      setSubjectError('Subject code and name are required.');
      return;
    }

    const cleanCode = subjectCode.trim().toUpperCase();
    const duplicate = subjects.find(
      (s) => s.streamCode === subjectStreamCode &&
             s.code.toUpperCase() === cleanCode &&
             (!editingSubject || s.id !== editingSubject.id)
    );
    if (duplicate) {
      setSubjectError(`Subject with code "${cleanCode}" already exists in this stream.`);
      return;
    }

    // Pure integer math conversions for fee values
    const basePaisa = subjectAnnualFeePaisa || (subjectSemesterFeePaisa * 2) || (10000 * 100);
    const baseAmount = fromPaisa(basePaisa);
    const annualFee = fromPaisa(subjectAnnualFeePaisa);
    const monthlyFee = fromPaisa(subjectMonthlyFeePaisa);
    const semesterFee = fromPaisa(subjectSemesterFeePaisa);
    const labFee = fromPaisa(subjectLabFeePaisa);
    const otherFee = fromPaisa(subjectOtherFeePaisa);

    if (editingSubject) {
      const updated = subjects.map((s) =>
        s.id === editingSubject.id
          ? {
              ...s,
              code: cleanCode,
              name: subjectName.trim(),
              title: subjectName.trim(),
              streamCode: subjectStreamCode,
              semester: Number(subjectSemester),
              credits: Number(subjectCredits),
              type: subjectType,
              subjectFee: baseAmount,
              annualFee,
              monthlyFee,
              semesterFee,
              labFee,
              associatedLabFee: labFee || undefined,
              otherFee,
              otherFeeLabel: subjectOtherFeeLabel.trim() || undefined,
            }
          : s
      );
      onUpdateSubjects(updated);
    } else {
      const newSubject: StudySubject = {
        id: `SUB-${Date.now().toString().slice(-5)}`,
        code: cleanCode,
        name: subjectName.trim(),
        title: subjectName.trim(),
        streamCode: subjectStreamCode,
        semester: Number(subjectSemester),
        credits: Number(subjectCredits),
        type: subjectType,
        subjectFee: baseAmount,
        annualFee,
        monthlyFee,
        semesterFee,
        labFee,
        associatedLabFee: labFee || undefined,
        otherFee,
        otherFeeLabel: subjectOtherFeeLabel.trim() || undefined,
        isActive: true,
      };
      onUpdateSubjects([...subjects, newSubject]);
    }

    setIsSubjectModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'stream') {
      onUpdateStreams(streams.filter((s) => s.id !== deleteTarget.id));
    } else {
      // Per institutional policy: mark subjects as inactive to preserve existing student fee ledgers and enrollment integrity
      onUpdateSubjects(
        subjects.map((s) => (s.id === deleteTarget.id ? { ...s, isActive: false, archivedAt: new Date().toISOString() } : s))
      );
    }
    setDeleteTarget(null);
  };

  const handleTriggerCampaignActivation = (type: 'Annual' | 'Monthly' | 'Semester', streamCode: string, total: number) => {
    if (onActivateCampaign) {
      const roundedTotal = Math.round(total);
      onActivateCampaign(type, streamCode, roundedTotal);
      setActivationSuccess(`Activated ${type} Fee Campaign for stream ${streamCode} (Auto-calculated: ₹${roundedTotal.toLocaleString('en-IN')})! Dues updated in Fee Module.`);
      setTimeout(() => setActivationSuccess(null), 5000);
    }
  };

  const currentStreamObj = streams.find((s) => safeMatchStrings(s.code, selectedStreamCode)) || streams[0];
  const currentStreamTotals = currentStreamObj ? calculateStreamTotals(currentStreamObj.code) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Accountant Module</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">Dynamic Multi-Fee Summation Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Stream & Subject Master
            </h1>
            <p className="text-sm text-teal-100 mt-1 max-w-2xl leading-relaxed">
              Create, modify, and delete Academic Streams and Subjects. Tag Annual Fee, Monthly Fee, Semester-wise Fee, Lab Fee, and special fees for each subject. The auto-summation of all subjects in a stream directly defines the stream's Annual, Monthly, and Semester Fee campaigns.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddStream}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-teal-300" />
              <span>Create Stream</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddSubject()}
              className="px-5 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-teal-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subject to Stream</span>
            </button>
          </div>
        </div>
      </div>

      {activationSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{activationSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActivationSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('summation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'summation'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-teal-400" />
            <span>Stream Fee Summation & Campaigns ({streams.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Subjects Catalog ({subjects.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('streams')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'streams'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
            <span>Academic Streams ({streams.length})</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Accountant: <strong className="text-slate-800">{currentSession?.name || 'S. N. Sharma'}</strong>
        </span>
      </div>

      {/* TAB 1: STREAM FEE SUMMATION & CAMPAIGN ACTIVATION */}
      {activeTab === 'summation' && (
        <div className="space-y-6">
          {/* Stream Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
            {streams.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStreamCode(st.code)}
                className={`px-4 py-2 rounded-xl transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  selectedStreamCode === st.code
                    ? 'bg-emerald-800 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-mono font-bold">{st.code}</span>
                <span className="text-[11px] opacity-90">({st.degree})</span>
              </button>
            ))}
          </div>

          {currentStreamObj && currentStreamTotals && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              {/* Stream Details & Headline */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {currentStreamObj.degree}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      Code: {currentStreamObj.code} · {currentStreamObj.totalSemesters} Semesters
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {currentStreamObj.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentStreamObj.department} · {currentStreamTotals.count} Active Subjects Tagged
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAddSubject(currentStreamObj.code)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-400" />
                  <span>Add Subject to {currentStreamObj.code}</span>
                </button>
              </div>

              {/* Dynamic Summation Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Annual Fee Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Sum of Annual Fees
                    </span>
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-950">
                      ₹{currentStreamTotals.totalAnnual.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-emerald-800 block mt-1">
                      Includes Subjects (₹{currentStreamTotals.sumSubjectAnnual.toLocaleString('en-IN')}) + Lab (₹{currentStreamTotals.sumLab.toLocaleString('en-IN')}) + Other (₹{currentStreamTotals.sumOther.toLocaleString('en-IN')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTriggerCampaignActivation('Annual', currentStreamObj.code, currentStreamTotals.totalAnnual)}
                    className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                    <span>Activate Annual Fee Campaign</span>
                  </button>
                </div>

                {/* 2. Monthly Fee Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-sky-50/50 to-white border border-indigo-200 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      Sum of Monthly Fees
                    </span>
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
                      <Calculator className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-950">
                      ₹{currentStreamTotals.totalMonthly.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-indigo-800 block mt-1">
                      Includes Subjects (₹{currentStreamTotals.sumSubjectMonthly.toLocaleString('en-IN')}) + Prorated Lab (₹{currentStreamTotals.monthlyLab.toLocaleString('en-IN')}) + Other (₹{currentStreamTotals.monthlyOther.toLocaleString('en-IN')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTriggerCampaignActivation('Monthly', currentStreamObj.code, currentStreamTotals.totalMonthly)}
                    className="w-full py-2 px-3 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                    <span>Activate Monthly Fee Campaign</span>
                  </button>
                </div>

                {/* 3. Semester Fee Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/50 to-white border border-amber-200 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Sum of Semester Fees
                    </span>
                    <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                      <BookOpen className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-amber-950">
                      ₹{currentStreamTotals.totalSemester.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-amber-800 block mt-1">
                      Includes Subjects (₹{currentStreamTotals.sumSubjectSemester.toLocaleString('en-IN')}) + Semester Lab (₹{currentStreamTotals.semesterLab.toLocaleString('en-IN')}) + Other (₹{currentStreamTotals.semesterOther.toLocaleString('en-IN')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTriggerCampaignActivation('Semester', currentStreamObj.code, currentStreamTotals.totalSemester)}
                    className="w-full py-2 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>Activate Semester Fee Campaign</span>
                  </button>
                </div>
              </div>

              {/* Tagged Subjects Breakdown Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Subject-Wise Multi-Fee Ledger for {currentStreamObj.code}</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {getStreamSubjects(currentStreamObj.code).length} subjects contributing
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                          <th className="py-3 px-4">Subject Code & Title</th>
                          <th className="py-3 px-4">Sem / Type</th>
                          <th className="py-3 px-4 text-right">Annual Fee</th>
                          <th className="py-3 px-4 text-right">Monthly Fee</th>
                          <th className="py-3 px-4 text-right">Semester Fee</th>
                          <th className="py-3 px-4 text-right">Lab Fee</th>
                          <th className="py-3 px-4 text-right">Other Fee</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {getStreamSubjects(currentStreamObj.code).length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              No subjects tagged to stream {currentStreamObj.code} yet. Click "Add Subject to {currentStreamObj.code}" above!
                            </td>
                          </tr>
                        ) : (
                          getStreamSubjects(currentStreamObj.code).map((sub) => (
                            <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-bold text-slate-900 block">{sub.name}</span>
                                <span className="font-mono text-[10px] text-teal-700">{sub.code} · {sub.credits} Credits</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                  Sem {sub.semester} · {sub.type.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                                ₹{(sub.annualFee || sub.subjectFee || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-indigo-800">
                                ₹{(sub.monthlyFee !== undefined && sub.monthlyFee !== null ? sub.monthlyFee : fromPaisa(Math.floor(toPaisa(sub.annualFee || sub.subjectFee || 0) / 10))).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                                ₹{(sub.semesterFee !== undefined && sub.semesterFee !== null ? sub.semesterFee : fromPaisa(Math.floor(toPaisa(sub.annualFee || sub.subjectFee || 0) / 2))).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-700">
                                {(sub.labFee || sub.associatedLabFee || 0) > 0 ? (
                                  <span className="text-teal-700 font-bold">
                                    ₹{(sub.labFee || sub.associatedLabFee || 0).toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-700">
                                {(sub.otherFee || 0) > 0 ? (
                                  <div>
                                    <span className="font-bold text-slate-900">₹{(sub.otherFee || 0).toLocaleString('en-IN')}</span>
                                    {sub.otherFeeLabel && (
                                      <span className="block text-[9px] text-slate-400 font-sans">{sub.otherFeeLabel}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSubject(sub)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                                    title="Edit Subject Fees"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget({ type: 'subject', id: sub.id, name: sub.name })}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                                    title="Delete Subject"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                          <td colSpan={2} className="py-3 px-4 text-slate-600 uppercase text-[10px] tracking-wider">
                            Total Stream Auto-Summation
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-900 text-sm">
                            ₹{currentStreamTotals.sumSubjectAnnual.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-indigo-900 text-sm">
                            ₹{currentStreamTotals.sumSubjectMonthly.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-900 text-sm">
                            ₹{currentStreamTotals.sumSubjectSemester.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-teal-900 text-sm">
                            ₹{currentStreamTotals.sumLab.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                            ₹{currentStreamTotals.sumOther.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBJECTS CATALOG */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subjects across all streams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddSubject()}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4">Stream</th>
                    <th className="py-3.5 px-4">Semester</th>
                    <th className="py-3.5 px-4 text-right">Annual Fee</th>
                    <th className="py-3.5 px-4 text-right">Monthly Fee</th>
                    <th className="py-3.5 px-4 text-right">Semester Fee</th>
                    <th className="py-3.5 px-4 text-right">Lab Fee</th>
                    <th className="py-3.5 px-4 text-right">Other Fee</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {subjects
                    .filter((s) => {
                      const q = safeLower(searchQuery);
                      return safeLower(s.name).includes(q) || safeLower(s.code).includes(q) || safeLower(s.streamCode).includes(q);
                    })
                    .map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold block ${sub.isActive === false ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{sub.name}</span>
                            {sub.isActive === false && (
                              <span className="text-[10px] font-semibold text-amber-700">· Archived</span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-teal-700">{sub.code} ({sub.type})</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {sub.streamCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          Sem {sub.semester}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800">
                          ₹{(sub.annualFee || sub.subjectFee || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-800">
                          ₹{(sub.monthlyFee !== undefined && sub.monthlyFee !== null ? sub.monthlyFee : fromPaisa(Math.floor(toPaisa(sub.annualFee || sub.subjectFee || 0) / 10))).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-800">
                          ₹{(sub.semesterFee !== undefined && sub.semesterFee !== null ? sub.semesterFee : fromPaisa(Math.floor(toPaisa(sub.annualFee || sub.subjectFee || 0) / 2))).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-teal-700">
                          ₹{(sub.labFee || sub.associatedLabFee || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          ₹{(sub.otherFee || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubject(sub)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {sub.isActive === false ? (
                              <button
                                type="button"
                                title="Reactivate Subject"
                                onClick={() => {
                                  onUpdateSubjects(
                                    subjects.map((s) => (s.id === sub.id ? { ...s, isActive: true, archivedAt: undefined } : s))
                                  );
                                }}
                                className="px-2 py-1 text-emerald-700 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 text-[11px] font-bold"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Archive Subject"
                                onClick={() => setDeleteTarget({ type: 'subject', id: sub.id, name: sub.name })}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACADEMIC STREAMS */}
      {activeTab === 'streams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.map((st) => {
            const totals = calculateStreamTotals(st.code);
            return (
              <div
                key={st.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-teal-400 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                        {st.degree}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{st.name}</h3>
                      <span className="text-[11px] font-mono font-bold text-teal-700 block">Stream Code: {st.code}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditStream(st)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ type: 'stream', id: st.id, name: st.name })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-1">{st.department}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subjects Tagged:</span>
                    <strong className="text-slate-900 font-mono">{totals.count}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Annual Sum:</span>
                    <strong className="text-emerald-700 font-mono">₹{totals.totalAnnual.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Semester Sum:</span>
                    <strong className="text-amber-700 font-mono">₹{totals.totalSemester.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStreamCode(st.code);
                    setActiveTab('summation');
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <span>View Fee Summation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Stream Modal */}
      {isStreamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingStream ? `Edit Stream: ${editingStream.code}` : 'Create Academic Stream'}
              </h3>
              <button type="button" onClick={() => setIsStreamModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {streamError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {streamError}
              </div>
            )}

            <form onSubmit={handleSaveStream} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Stream Code (e.g. CSE, ECE, BCOM) *</label>
                <input
                  type="text"
                  required
                  value={streamCode}
                  onChange={(e) => setStreamCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase"
                  placeholder="CSE"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Stream / Degree Program Name *</label>
                <input
                  type="text"
                  required
                  value={streamName}
                  onChange={(e) => setStreamName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  placeholder="Computer Science & Engineering"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Degree Title</label>
                  <input
                    type="text"
                    value={streamDegree}
                    onChange={(e) => setStreamDegree(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="B.Tech, B.Sc, B.Com"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Semesters</label>
                  <input
                    type="number"
                    value={streamSemesters}
                    onChange={(e) => setStreamSemesters(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    min={1}
                    max={12}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Department</label>
                <input
                  type="text"
                  value={streamDepartment}
                  onChange={(e) => setStreamDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  placeholder="Dept. of Computer Science & Engineering"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStreamModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md"
                >
                  {editingStream ? 'Save Stream' : 'Create Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 my-auto border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                  {editingSubject ? 'Modify Subject' : 'Add Subject to Stream'}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {editingSubject ? `Edit: ${editingSubject.name}` : 'Configure Subject & Tag Fees'}
                </h3>
              </div>
              <button type="button" onClick={() => setIsSubjectModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {subjectError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {subjectError}
              </div>
            )}

            <form onSubmit={handleSaveSubject} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase"
                    placeholder="CS-701"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Stream *</label>
                  <select
                    value={subjectStreamCode}
                    onChange={(e) => setSubjectStreamCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {streams.map((st) => (
                      <option key={st.id} value={st.code}>
                        {st.code} ({st.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  placeholder="Deep Learning & Artificial Intelligence Lab"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={subjectSemester}
                    onChange={(e) => setSubjectSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={subjectCredits}
                    onChange={(e) => setSubjectCredits(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subject Type</label>
                  <select
                    value={subjectType}
                    onChange={(e) => setSubjectType(e.target.value as string)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Practical_Lab">Practical / Lab</option>
                    <option value="Elective">Elective</option>
                    <option value="Project">Project / Viva</option>
                  </select>
                </div>
              </div>

              {/* Tagged Multi-Fee Engine Section */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">
                  Tag Fee Rates for this Subject (Directly Summed into Campaigns):
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-emerald-800 block mb-1">Annual Fee (₹)</label>
                    <input
                      type="number"
                      value={fromPaisa(subjectAnnualFeePaisa)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const num = parseFloat(raw);
                        if (!isNaN(num) && num >= 0) {
                          const p = Math.round(num * 100);
                          setSubjectAnnualFeePaisa(p);
                          const monthlySched = calculateInstallmentSchedule(p, 10);
                          const semSched = calculateInstallmentSchedule(p, 2);
                          setSubjectMonthlyFeePaisa(monthlySched.baseInstallment);
                          setSubjectSemesterFeePaisa(semSched.baseInstallment);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-indigo-800 block mb-1">Monthly Fee (₹)</label>
                    <input
                      type="number"
                      value={Math.round(subjectMonthlyFeePaisa / 100)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const num = parseFloat(raw);
                        if (!isNaN(num) && num >= 0) {
                          setSubjectMonthlyFeePaisa(Math.round(num * 100));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-800 block mb-1">Semester Fee (₹)</label>
                    <input
                      type="number"
                      value={Math.round(subjectSemesterFeePaisa / 100)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const num = parseFloat(raw);
                        if (!isNaN(num) && num >= 0) {
                          setSubjectSemesterFeePaisa(Math.round(num * 100));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-amber-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                {subjectAnnualFeePaisa > 0 && (
                  <div className="text-[11px] bg-white p-2.5 rounded-xl border border-slate-200 text-slate-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-900">Monthly Plan (10 Installments):</span>
                      <span className="font-mono font-bold text-indigo-950">
                        {calculateInstallmentSchedule(subjectAnnualFeePaisa, 10).hasRemainder ? (
                          <>
                            9 × ₹{fromPaisa(calculateInstallmentSchedule(subjectAnnualFeePaisa, 10).baseInstallment).toLocaleString('en-IN')} + 1 × ₹{fromPaisa(calculateInstallmentSchedule(subjectAnnualFeePaisa, 10).finalInstallment).toLocaleString('en-IN')}
                          </>
                        ) : (
                          <>10 × ₹{fromPaisa(calculateInstallmentSchedule(subjectAnnualFeePaisa, 10).baseInstallment).toLocaleString('en-IN')}</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-900">Semester Plan (2 Installments):</span>
                      <span className="font-mono font-bold text-amber-950">
                        {calculateInstallmentSchedule(subjectAnnualFeePaisa, 2).hasRemainder ? (
                          <>
                            Sem 1: ₹{fromPaisa(calculateInstallmentSchedule(subjectAnnualFeePaisa, 2).baseInstallment).toLocaleString('en-IN')} · Sem 2: ₹{fromPaisa(calculateInstallmentSchedule(subjectAnnualFeePaisa, 2).finalInstallment).toLocaleString('en-IN')}
                          </>
                        ) : (
                          <>2 × ₹{fromPaisa(calculateInstallmentSchedule(subjectAnnualFeePaisa, 2).baseInstallment).toLocaleString('en-IN')}</>
                        )}
                      </span>
                    </div>
                    {calculateInstallmentSchedule(subjectAnnualFeePaisa, 10).hasRemainder && (
                      <p className="text-[10px] text-teal-700 italic pt-0.5">
                        * Residual Paisas (₹{fromPaisa(calculateInstallmentSchedule(subjectAnnualFeePaisa, 10).remainderPaisa).toFixed(2)}) allocated to final installment to guarantee 100% annual fee integrity.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Subject Lab Fee (₹)</label>
                    <input
                      type="number"
                      value={Math.round(subjectLabFeePaisa / 100)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const num = parseFloat(raw);
                        if (!isNaN(num) && num >= 0) {
                          setSubjectLabFeePaisa(Math.round(num * 100));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-mono"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Other Fee (₹)</label>
                    <input
                      type="number"
                      value={Math.round(subjectOtherFeePaisa / 100)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const num = parseFloat(raw);
                        if (!isNaN(num) && num >= 0) {
                          setSubjectOtherFeePaisa(Math.round(num * 100));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                {subjectOtherFeePaisa > 0 && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Other Fee Description Label</label>
                    <input
                      type="text"
                      value={subjectOtherFeeLabel}
                      onChange={(e) => setSubjectOtherFeeLabel(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl"
                      placeholder="e.g. IT Software License, Workshop Consumables"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md"
                >
                  {editingSubject ? 'Save Changes' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">Delete {deleteTarget.type === 'stream' ? 'Stream' : 'Subject'}?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md text-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
