import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  ReportConfig, 
  ReportParameterType, 
  StaffRole, 
  Student, 
  FeeTransaction, 
  UserSession,
  SchoolStaffUser,
  AcademicStream 
} from '../../types/fee';
import { safeConfirm, safeLower, safeMatchStrings } from '../../utils/safeHelpers';
import { 
  FileText, 
  Download, 
  Printer, 
  Filter, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Calendar, 
  Users, 
  DollarSign, 
  BarChart3, 
  Lock, 
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface Props {
  reportConfigs: ReportConfig[];
  students: Student[];
  transactions: FeeTransaction[];
  streams: AcademicStream[];
  currentSession: UserSession | null;
  staffUsers: SchoolStaffUser[];
  onUpdateReportConfigs: (configs: ReportConfig[]) => void;
}

export const ReportGenerationEngine: React.FC<Props> = ({
  reportConfigs,
  students,
  transactions,
  streams,
  currentSession,
  staffUsers,
  onUpdateReportConfigs,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'generate' | 'admin_config'>('generate');
  const [selectedReportId, setSelectedReportId] = useState<string>(reportConfigs[0]?.id || '');

  // Filter parameter values selected by user for generating report
  const [paramGender, setParamGender] = useState<string>('ALL');
  const [paramCategory, setParamCategory] = useState<string>('ALL');
  const [paramStream, setParamStream] = useState<string>('ALL');
  const [paramFeeStatus, setParamFeeStatus] = useState<string>('ALL'); // ALL, PAID, PARTIAL, DUE
  const [paramGateway, setParamGateway] = useState<string>('ALL');
  const [paramStartDate, setParamStartDate] = useState<string>('');
  const [paramEndDate, setParamEndDate] = useState<string>('');
  const [paramSearchText, setParamSearchText] = useState<string>('');

  // Admin Config Modal states
  const [editingConfig, setEditingConfig] = useState<ReportConfig | null>(null);
  const [isAddConfigOpen, setIsAddConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState<Partial<ReportConfig>>({
    title: '',
    code: '',
    description: '',
    category: 'Fee_Collection',
    supportedParameters: ['category', 'stream', 'feeStatus'],
    accessibleRoles: ['App_Admin', 'Accounts_Officer', 'Principal_DDO'],
    outputColumns: ['Roll No', 'Name', 'Stream', 'Category', 'Total Fee', 'Paid Fee', 'Balance Due'],
    isActive: true,
  });

  const isAppAdmin = currentSession?.staffRole === 'App_Admin';
  const currentStaffRole = currentSession?.staffRole || 'Accounts_Officer';

  // Active Report Definition
  const activeReport = reportConfigs.find((r) => r.id === selectedReportId) || reportConfigs[0];

  // Access control check: Can current user run this report?
  const hasAccessToActiveReport = 
    isAppAdmin || 
    activeReport?.accessibleRoles.includes(currentStaffRole);

  // Available Parameter Options for Admin Mapping
  const allParameterDefinitions: { id: ReportParameterType; label: string; description: string }[] = [
    { id: 'gender', label: 'Gender Filter', description: 'Filter by Male, Female, Other' },
    { id: 'category', label: 'Caste / Social Reservation', description: 'Filter by General, OBC, SC, ST, EWS' },
    { id: 'stream', label: 'Academic Stream / Branch', description: 'Filter by CSE, ECE, Mechanical, etc.' },
    { id: 'feeStatus', label: 'Fee Payment & Dues Status', description: 'Filter by Cleared, Partial, or Defaulter' },
    { id: 'paymentGateway', label: 'Payment Gateway / Mode', description: 'Filter by SBI Collect, e-Treasury, Counter' },
    { id: 'dateRange', label: 'Academic Session / Date Range', description: 'Transaction date boundaries' },
  ];

  const allAvailableRoles: { role: StaffRole; label: string }[] = [
    { role: 'App_Admin', label: 'App Administrator (Root IT)' },
    { role: 'Accounts_Officer', label: 'Accounts Officer & Treasury Bursar' },
    { role: 'Principal_DDO', label: 'Principal & DDO (Executive Sign-Off)' },
    { role: 'Cashier', label: 'Treasury Counter Cashier' },
    { role: 'HOD', label: 'Head of Department (Academic Review)' },
    { role: 'Librarian', label: 'Chief Librarian' },
    { role: 'Hostel_Warden', label: 'Chief Hostel Warden' },
  ];

  // Filter students / data based on active parameters
  const filteredData = useMemo(() => {
    return students.filter((stu) => {
      // 1. Gender filter (if report supports gender)
      if (activeReport?.supportedParameters.includes('gender') && paramGender !== 'ALL') {
        if (stu.gender !== paramGender) return false;
      }

      // 2. Category / Caste filter
      if (activeReport?.supportedParameters.includes('category') && paramCategory !== 'ALL') {
        if (stu.category !== paramCategory) return false;
      }

      // 3. Stream filter (Strict token / word-boundary match to prevent EE matching Engineering)
      if (activeReport?.supportedParameters.includes('stream') && paramStream !== 'ALL') {
        const streamCodeMatch = safeMatchStrings(stu.streamCode, paramStream);
        const branchLower = safeLower(stu.branch);
        const streamObj = streams.find((s) => s.code === paramStream);
        const streamNameLower = streamObj ? safeLower(streamObj.name) : '';
        const branchNameMatch = streamNameLower ? branchLower.includes(streamNameLower) : false;
        const codeWordMatch = new RegExp(`(^|\\W)${paramStream.toLowerCase()}(\\W|$)`, 'i').test(branchLower);
        if (!streamCodeMatch && !branchNameMatch && !codeWordMatch) {
          return false;
        }
      }

      // 4. Fee status filter (Clean, non-overlapping categories)
      if (activeReport?.supportedParameters.includes('feeStatus') && paramFeeStatus !== 'ALL') {
        if (paramFeeStatus === 'PAID' && stu.pendingFee > 0) return false;
        if (paramFeeStatus === 'PARTIAL' && (stu.pendingFee === 0 || stu.paidFee === 0)) return false;
        if (paramFeeStatus === 'DUE' && stu.paidFee > 0) return false; // Full defaulter with zero payments
      }

      // 5. Date Range filter (Applies to student transaction timestamps)
      if (activeReport?.supportedParameters.includes('dateRange') && (paramStartDate || paramEndDate)) {
        const studentTxs = transactions.filter((t) => safeMatchStrings(t.rollNo, stu.rollNo) || t.studentId === stu.id);
        if (studentTxs.length > 0) {
          const hasTxInRange = studentTxs.some((t) => {
            const d = t.timestamp ? t.timestamp.split('T')[0] : '';
            if (paramStartDate && d < paramStartDate) return false;
            if (paramEndDate && d > paramEndDate) return false;
            return true;
          });
          if (!hasTxInRange) return false;
        } else {
          return false;
        }
      }

      // 6. Text search
      if (paramSearchText.trim()) {
        const text = safeLower(paramSearchText);
        const matches = 
          safeLower(stu.name).includes(text) ||
          safeLower(stu.rollNo).includes(text) ||
          safeLower(stu.course).includes(text) ||
          (stu.subCaste && safeLower(stu.subCaste).includes(text));
        if (!matches) return false;
      }

      return true;
    });
  }, [students, transactions, streams, activeReport, paramGender, paramCategory, paramStream, paramFeeStatus, paramStartDate, paramEndDate, paramSearchText]);

  // Summary Metrics for the generated report
  const metrics = useMemo(() => {
    const totalStudents = filteredData.length;
    const totalAssessed = filteredData.reduce((s, stu) => s + stu.totalFee, 0);
    const totalCollected = filteredData.reduce((s, stu) => s + stu.paidFee, 0);
    const totalPending = filteredData.reduce((s, stu) => s + stu.pendingFee, 0);
    const totalConcessions = filteredData.reduce((s, stu) => {
      const concAmt = stu.appliedConcessions?.reduce((sum, c) => sum + c.amount, 0) || 0;
      return s + concAmt;
    }, 0);
    const recoveryRate = totalAssessed > 0 ? Math.round((totalCollected / totalAssessed) * 100) : 0;

    return {
      totalStudents,
      totalAssessed,
      totalCollected,
      totalPending,
      totalConcessions,
      recoveryRate,
    };
  }, [filteredData]);

  // Export report to genuine Excel (.xlsx) using SheetJS with role-based data protection
  const handleExportExcel = () => {
    if (filteredData.length === 0) return;

    const canViewSensitiveData = ['App_Admin', 'Accounts_Officer', 'Principal_DDO'].includes(currentStaffRole) || isAppAdmin;

    const rows = filteredData.map((s, idx) => ({
      'Sl No': idx + 1,
      'Roll Number': s.rollNo,
      'Student Name': s.name,
      'Gender': s.gender || 'Not Specified',
      'Caste Category': s.category,
      'Sub-Caste': s.subCaste || '—',
      'Stream / Branch': `${s.course} (${s.branch})`,
      'Semester': `Sem ${s.semester}`,
      'Total Fee Payable (₹)': s.totalFee,
      'Concession / Freeship (₹)': s.appliedConcessions?.reduce((sum, c) => sum + c.amount, 0) || 0,
      'Fee Paid (₹)': s.paidFee,
      'Balance Due (₹)': s.pendingFee,
      'Payment Status': s.pendingFee === 0 ? 'CLEARED' : s.paidFee > 0 ? 'PARTIAL' : 'DEF_UNPAID',
      'Admit Card Hold': s.hallTicketBlocked ? 'LOCKED' : 'CLEAR',
      'Contact Phone': canViewSensitiveData ? s.phone : (s.phone ? `XXXXX${s.phone.slice(-4)}` : '—'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 8 },  // Sl
      { wch: 15 }, // Roll
      { wch: 25 }, // Name
      { wch: 10 }, // Gender
      { wch: 15 }, // Category
      { wch: 14 }, // Sub-Caste
      { wch: 26 }, // Stream
      { wch: 10 }, // Sem
      { wch: 18 }, // Total Fee
      { wch: 20 }, // Concession
      { wch: 16 }, // Paid
      { wch: 16 }, // Due
      { wch: 14 }, // Status
      { wch: 16 }, // Hold
      { wch: 16 }, // Phone
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeReport?.code || 'Report');

    XLSX.writeFile(
      workbook,
      `${activeReport?.code || 'RLSY_Report'}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  // Print current view
  const handlePrint = () => {
    window.print();
  };

  // Admin Config Handlers
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.title || !configForm.code) return;

    if (editingConfig) {
      const updated = reportConfigs.map((r) =>
        r.id === editingConfig.id ? ({ ...editingConfig, ...configForm } as ReportConfig) : r
      );
      onUpdateReportConfigs(updated);
      setEditingConfig(null);
    } else {
      const newConfig: ReportConfig = {
        id: 'RPT-' + Date.now().toString().slice(-4),
        title: configForm.title.trim(),
        code: configForm.code.toUpperCase().trim(),
        description: configForm.description || '',
        category: configForm.category || 'Fee_Collection',
        supportedParameters: configForm.supportedParameters || ['category', 'stream', 'feeStatus'],
        accessibleRoles: configForm.accessibleRoles || ['App_Admin', 'Accounts_Officer'],
        outputColumns: configForm.outputColumns || ['Roll No', 'Name', 'Stream', 'Category', 'Total Fee', 'Paid Fee', 'Balance Due'],
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: currentSession?.name || 'App Administrator',
        isActive: configForm.isActive ?? true,
      };
      onUpdateReportConfigs([...reportConfigs, newConfig]);
      setIsAddConfigOpen(false);
    }
  };

  const handleDeleteConfig = (reportId: string) => {
    if (safeConfirm('Are you sure you want to delete this report type? Users will no longer have access to it.')) {
      onUpdateReportConfigs(reportConfigs.filter((r) => r.id !== reportId));
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-100 text-blue-900 border border-blue-200">
              Configurable Institutional Reporting Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">RBAC Parameter Reports</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Dynamic Report Generation & User Access Mapping Module
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin defines report types, selects which parameters apply (Gender, Caste, Stream, Status), and maps which staff roles can access each report.
          </p>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('generate')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'generate'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-700" />
              <span>Generate Reports</span>
            </button>

            {isAppAdmin && (
              <button
                onClick={() => setActiveSubTab('admin_config')}
                className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'admin_config'
                    ? 'bg-white text-purple-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                <span>Configure Reports & Access (Admin)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: REPORT GENERATION & EXECUTION RUNNER */}
      {/* ============================================================== */}
      {activeSubTab === 'generate' && (
        <div className="space-y-6">
          {/* Template Selector Strip */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-700" />
                <span>Select Report Type / Ledger to Generate:</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {reportConfigs.length} Active Templates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 pt-1">
              {reportConfigs.map((rpt) => {
                const isSelected = rpt.id === activeReport?.id;
                const isPermitted = isAppAdmin || rpt.accessibleRoles.includes(currentStaffRole);

                return (
                  <button
                    key={rpt.id}
                    onClick={() => setSelectedReportId(rpt.id)}
                    className={`text-left p-3 rounded-xl border text-xs transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-xs ring-1 ring-blue-400'
                        : isPermitted
                        ? 'bg-white hover:bg-slate-50 border-slate-200'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-[9px] font-bold text-slate-400">
                          {rpt.code}
                        </span>
                        {!isPermitted && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-700 font-bold">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Restricted</span>
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-900 block line-clamp-2 leading-snug">
                        {rpt.title}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500 mt-2 block truncate">
                      {rpt.accessibleRoles.map(r => r.replace('_', ' ')).slice(0, 2).join(', ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* If user lacks permission */}
          {!hasAccessToActiveReport ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center text-xs text-amber-900 space-y-2">
              <Lock className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="font-bold text-base text-amber-950">
                Access Restricted to Authorized Roles
              </h3>
              <p className="max-w-md mx-auto text-amber-800">
                You are currently signed in as <strong>{currentStaffRole.replace('_', ' ')}</strong>. 
                This report ({activeReport?.title}) is restricted to: <br />
                <span className="font-semibold">{activeReport?.accessibleRoles.map(r => r.replace('_', ' ')).join(', ')}</span>.
              </p>
              {isAppAdmin && (
                <button
                  onClick={() => setActiveSubTab('admin_config')}
                  className="mt-3 py-2 px-4 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl transition-all shadow-xs"
                >
                  Configure Access in Admin Panel
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Dynamic Filter Controls according to activeReport.supportedParameters */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Report Filter Parameters ({activeReport.title})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Parameters configured by Admin for this report: {activeReport.supportedParameters.join(', ')}.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportExcel}
                      className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      title="Download formatted Excel spreadsheet"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export to Excel (.xlsx)</span>
                    </button>

                    <button
                      onClick={handlePrint}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-300"
                      title="Print-ready view"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                  {/* Parameter: Gender */}
                  {activeReport.supportedParameters.includes('gender') && (
                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">Gender</label>
                      <select
                        value={paramGender}
                        onChange={(e) => setParamGender(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:bg-white"
                      >
                        <option value="ALL">All Genders</option>
                        <option value="Female">Female Students Only</option>
                        <option value="Male">Male Students Only</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}

                  {/* Parameter: Caste / Category */}
                  {activeReport.supportedParameters.includes('category') && (
                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">Caste / Social Category</label>
                      <select
                        value={paramCategory}
                        onChange={(e) => setParamCategory(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:bg-white"
                      >
                        <option value="ALL">All Categories</option>
                        <option value="General">General</option>
                        <option value="OBC">OBC</option>
                        <option value="SC">SC (Scheduled Caste)</option>
                        <option value="ST">ST (Scheduled Tribe)</option>
                        <option value="EWS">EWS (Economically Weaker)</option>
                      </select>
                    </div>
                  )}

                  {/* Parameter: Stream */}
                  {activeReport.supportedParameters.includes('stream') && (
                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">Academic Stream</label>
                      <select
                        value={paramStream}
                        onChange={(e) => setParamStream(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:bg-white"
                      >
                        <option value="ALL">All Streams & Branches</option>
                        {streams.map((s) => (
                          <option key={s.id} value={s.code}>{s.code} - {s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Parameter: Fee Status */}
                  {activeReport.supportedParameters.includes('feeStatus') && (
                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">Fee Payment Status</label>
                      <select
                        value={paramFeeStatus}
                        onChange={(e) => setParamFeeStatus(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:bg-white"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="PAID">Cleared (100% Paid)</option>
                        <option value="PARTIAL">Partially Paid</option>
                        <option value="DUE">Defaulters / Dues Pending</option>
                      </select>
                    </div>
                  )}

                  {/* Parameter: Date Range */}
                  {activeReport.supportedParameters.includes('dateRange') && (
                    <>
                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={paramStartDate}
                          onChange={(e) => setParamStartDate(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">End Date</label>
                        <input
                          type="date"
                          value={paramEndDate}
                          onChange={(e) => setParamEndDate(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white"
                        />
                      </div>
                    </>
                  )}

                  {/* Search within filtered results */}
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Search in Results</label>
                    <input
                      type="text"
                      placeholder="Roll No, Name..."
                      value={paramSearchText}
                      onChange={(e) => setParamSearchText(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Summary KPIs for Current Filtered Set */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Students Filtered</span>
                  <span className="text-xl font-bold font-mono text-slate-900">{metrics.totalStudents}</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Assessed</span>
                  <span className="text-base font-bold font-mono text-slate-700">₹{metrics.totalAssessed.toLocaleString('en-IN')}</span>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 shadow-xs">
                  <span className="text-[10px] text-purple-700 uppercase font-semibold block">Concessions / Relief</span>
                  <span className="text-base font-bold font-mono text-purple-900">₹{metrics.totalConcessions.toLocaleString('en-IN')}</span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 shadow-xs">
                  <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Collected / Realized</span>
                  <span className="text-base font-bold font-mono text-emerald-900">₹{metrics.totalCollected.toLocaleString('en-IN')}</span>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 shadow-xs">
                  <span className="text-[10px] text-rose-700 uppercase font-semibold block">Balance Pending</span>
                  <span className="text-base font-bold font-mono text-rose-900">₹{metrics.totalPending.toLocaleString('en-IN')}</span>
                </div>

                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 shadow-xs">
                  <span className="text-[10px] text-indigo-700 uppercase font-semibold block">Recovery Rate</span>
                  <span className="text-xl font-bold font-mono text-indigo-900">{metrics.recoveryRate}%</span>
                </div>
              </div>

              {/* Generated Results Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    Live Tabular Output ({filteredData.length} records matching criteria)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Generated: {new Date().toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Sl</th>
                        <th className="py-2.5 px-3">Student & Roll No</th>
                        <th className="py-2.5 px-3">Gender</th>
                        <th className="py-2.5 px-3">Caste & Sub-Caste</th>
                        <th className="py-2.5 px-3">Stream / Branch</th>
                        <th className="py-2.5 px-3 text-right">Total Payable</th>
                        <th className="py-2.5 px-3 text-right">Concessions</th>
                        <th className="py-2.5 px-3 text-right">Paid</th>
                        <th className="py-2.5 px-3 text-right">Balance Due</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredData.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400">
                            No students match the chosen parameter filters.
                          </td>
                        </tr>
                      ) : (
                        filteredData.map((stu, idx) => {
                          const conc = stu.appliedConcessions?.reduce((sum, c) => sum + c.amount, 0) || 0;
                          return (
                            <tr key={stu.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-900 block">{stu.name}</span>
                                <span className="font-mono text-[10px] text-slate-500 font-semibold">{stu.rollNo}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  stu.gender === 'Female' ? 'bg-pink-50 text-pink-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {stu.gender || '—'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-slate-800 block">{stu.category}</span>
                                <span className="text-[10px] text-slate-400 block">{stu.subCaste || '—'}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono font-bold text-blue-900 block text-[11px]">{stu.streamCode || 'CSE'}</span>
                                <span className="text-[10px] text-slate-500">{stu.branch.split(' ')[0]} (Sem {stu.semester})</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right">
                                ₹{stu.totalFee.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-purple-700 text-right font-medium">
                                {conc > 0 ? `₹${conc.toLocaleString('en-IN')}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold text-right">
                                ₹{stu.paidFee.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-right">
                                {stu.pendingFee === 0 ? (
                                  <span className="text-emerald-700 font-bold">₹0</span>
                                ) : (
                                  <span className="text-rose-700 font-bold">₹{stu.pendingFee.toLocaleString('en-IN')}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {stu.pendingFee === 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                    <Check className="w-3 h-3" />
                                    <span>CLEARED</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                                    <span>DUE</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: ADMIN CONFIGURATION & USER ACCESS MAPPING */}
      {/* ============================================================== */}
      {activeSubTab === 'admin_config' && isAppAdmin && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Report Type Definition & Role-Based Access Mapping (RBAC)
              </h3>
              <p className="text-xs text-slate-500">
                Create new custom report templates, select supported filter parameters, and map specifically which school staff roles can access each report.
              </p>
            </div>

            <button
              onClick={() => {
                setConfigForm({
                  title: '',
                  code: '',
                  description: '',
                  category: 'Fee_Collection',
                  supportedParameters: ['category', 'stream', 'feeStatus'],
                  accessibleRoles: ['App_Admin', 'Accounts_Officer'],
                  outputColumns: ['Roll No', 'Name', 'Stream', 'Category', 'Total Fee', 'Paid Fee', 'Balance Due'],
                  isActive: true,
                });
                setIsAddConfigOpen(true);
              }}
              className="py-2 px-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Define New Report Type</span>
            </button>
          </div>

          {/* Configured Report Cards */}
          <div className="space-y-3">
            {reportConfigs.map((config) => (
              <div
                key={config.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-purple-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                        {config.code}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {config.category.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{config.title}</h4>
                    <p className="text-xs text-slate-500">{config.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => {
                        setEditingConfig(config);
                        setConfigForm({ ...config });
                      }}
                      className="p-1.5 text-slate-500 hover:text-purple-700 rounded-lg hover:bg-slate-100"
                      title="Edit Report Configuration"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Delete Report Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  {/* Supported Parameters */}
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-700 text-[11px] block">
                      Configured Filter Parameters:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {config.supportedParameters.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-semibold">
                          ● {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Accessible Roles (RBAC) */}
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-700 text-[11px] block">
                      Permitted Staff Authorities:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {config.accessibleRoles.map((r) => (
                        <span key={r} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          ✓ {r.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE / MODIFY REPORT CONFIG & ACCESS */}
      {/* ============================================================== */}
      {(isAddConfigOpen || editingConfig) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 text-xs my-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingConfig ? `Modify Report: ${editingConfig.title}` : 'Define New Institutional Report Template'}
              </h3>
              <button
                onClick={() => {
                  setIsAddConfigOpen(false);
                  setEditingConfig(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Report Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RPT-GENDER-RELIEF"
                    value={configForm.code}
                    onChange={(e) => setConfigForm({ ...configForm, code: e.target.value.toUpperCase() })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Report Category</label>
                  <select
                    value={configForm.category}
                    onChange={(e) => setConfigForm({ ...configForm, category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  >
                    <option value="Fee_Collection">Fee Collection Realization</option>
                    <option value="Concession_Freeship">Concession & Freeship Audit</option>
                    <option value="Stream_Ledger">Stream & Subject Ledger</option>
                    <option value="Defaulters_Audit">Defaulters & Hall Ticket Hold</option>
                    <option value="Treasury_Scroll">State Treasury AG Audit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Report Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gender-Wise Fee Exemption & Kanya Subsidy Audit"
                  value={configForm.title}
                  onChange={(e) => setConfigForm({ ...configForm, title: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Report Description</label>
                <input
                  type="text"
                  placeholder="Purpose of report and audit justification..."
                  value={configForm.description}
                  onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>

              {/* Supported Parameter Checkboxes */}
              <div className="pt-2 border-t border-slate-200">
                <label className="text-slate-800 font-bold block mb-1.5">
                  Parameters on which this report can be filtered:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {allParameterDefinitions.map((param) => {
                    const isChecked = configForm.supportedParameters?.includes(param.id);
                    return (
                      <label key={param.id} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const cur = configForm.supportedParameters || [];
                            if (e.target.checked) {
                              setConfigForm({ ...configForm, supportedParameters: [...cur, param.id] });
                            } else {
                              setConfigForm({ ...configForm, supportedParameters: cur.filter(p => p !== param.id) });
                            }
                          }}
                          className="mt-0.5 text-blue-600 rounded"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block">{param.label}</span>
                          <span className="text-[10px] text-slate-500">{param.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Accessible Roles (User Access Mapping) */}
              <div className="pt-2 border-t border-slate-200">
                <label className="text-slate-800 font-bold block mb-1.5">
                  Map Staff Roles Permitted to Access this Report:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-purple-50/50 p-3 rounded-xl border border-purple-200">
                  {allAvailableRoles.map((roleItem) => {
                    const isChecked = configForm.accessibleRoles?.includes(roleItem.role);
                    return (
                      <label key={roleItem.role} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const cur = configForm.accessibleRoles || [];
                            if (e.target.checked) {
                              setConfigForm({ ...configForm, accessibleRoles: [...cur, roleItem.role] });
                            } else {
                              setConfigForm({ ...configForm, accessibleRoles: cur.filter(r => r !== roleItem.role) });
                            }
                          }}
                          className="text-purple-600 rounded"
                        />
                        <span className="font-semibold text-slate-800">{roleItem.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddConfigOpen(false);
                    setEditingConfig(null);
                  }}
                  className="py-2 px-3 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg shadow-sm"
                >
                  {editingConfig ? 'Save Report Configuration' : 'Create Report Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
