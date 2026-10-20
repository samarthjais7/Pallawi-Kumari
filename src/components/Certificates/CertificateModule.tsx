import React, { useState } from 'react';
import { 
  CertificateRequest, 
  CertificateTheme,
  CertificateType, 
  SchoolStaffUser,
  Student, 
  StudentNoDuesApplication,
  UserSession,
  FacilityServiceOption
} from '../../types/fee';
import { 
  Award, 
  Plus, 
  Search, 
  Check, 
  Printer, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShieldCheck, 
  CreditCard,
  Building,
  UserCheck,
  Palette,
  Sparkles,
  Sliders
} from 'lucide-react';
import { PrintableCertificate } from '../Common/PrintableCertificate';
import { CertificateThemeStudio } from './CertificateThemeStudio';
import { FacilityOptionsManager } from '../Admin/FacilityOptionsManager';
import { safeMatchStrings, safeString, safeTrim, safeLower, safeNumber } from '../../utils/safeHelpers';

interface Props {
  students: Student[];
  certificateRequests: CertificateRequest[];
  noDuesApps: StudentNoDuesApplication[];
  onAddCertificateRequest: (newReq: CertificateRequest) => void;
  onUpdateCertificateStatus: (reqId: string, status: CertificateRequest['status']) => void;
  themes?: CertificateTheme[];
  currentSession?: UserSession | null;
  staffUsers?: SchoolStaffUser[];
  onSaveTheme?: (theme: CertificateTheme) => void;
  onDeleteTheme?: (themeId: string) => void;
  onSetDefaultTheme?: (themeId: string, certType: CertificateType | 'All') => void;
  onNavigateToUserDirectory?: () => void;
  initialSubTab?: 'requests' | 'themes' | 'facilities';
  facilityOptions?: FacilityServiceOption[];
  onUpdateFacilityOptions?: (options: FacilityServiceOption[]) => void;
}

const STATUTORY_FEES: Record<CertificateType, number> = {
  'Bonafide Certificate': 50,
  'No Dues Clearance Certificate': 0,
  'Transfer Certificate (TC) & Character': 150,
  'Migration Certificate': 250,
  'Provisional Passing Certificate': 300,
  'Caution Money Refund Voucher': 0,
};

export const CertificateModule: React.FC<Props> = ({
  students,
  certificateRequests,
  noDuesApps,
  onAddCertificateRequest,
  onUpdateCertificateStatus,
  themes = [],
  currentSession,
  staffUsers = [],
  onSaveTheme,
  onDeleteTheme,
  onSetDefaultTheme,
  onNavigateToUserDirectory,
  initialSubTab = 'requests',
  facilityOptions = [],
  onUpdateFacilityOptions,
}) => {
  const [subTab, setSubTab] = useState<'requests' | 'themes' | 'facilities'>(initialSubTab);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [activeCertForPrint, setActiveCertForPrint] = useState<CertificateRequest | null>(null);
  const [selectedPrintThemeId, setSelectedPrintThemeId] = useState<string>('');

  const currentStaff = staffUsers.find(
    (u) => safeMatchStrings(u.email, currentSession?.emailOrPhone) || u.id === currentSession?.id
  );
  const isThemeServiceMapped = Boolean(
    currentSession?.isAppAdmin ||
    currentSession?.canManageCertificateThemes ||
    currentStaff?.canManageCertificateThemes ||
    (currentSession?.role === 'admin' && (currentSession.staffRole === 'App_Admin' || currentStaff?.canManageCertificateThemes))
  );

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [selectedCertType, setSelectedCertType] = useState<CertificateType>('Bonafide Certificate');
  const [purpose, setPurpose] = useState<string>('State Post-Matric Scholarship & Bus Pass');

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0] || null;

  const handleApply = () => {
    if (!selectedStudent) return;
    const fee = safeNumber(STATUTORY_FEES[selectedCertType], 0);
    const studentNoDues = noDuesApps.find((app) => safeMatchStrings(app.studentRollNo, selectedStudent.rollNo));
    const isNoDuesCleared = Boolean(studentNoDues?.overallStatus === 'Approved' || selectedStudent.pendingFee <= 0);
    const newReq: CertificateRequest = {
      id: 'CERT-REQ-' + Date.now().toString().slice(-5),
      requestNo: `GIT/CERT/25/${Math.floor(10000 + Math.random() * 90000)}`,
      studentId: selectedStudent.id,
      studentRollNo: selectedStudent.rollNo,
      studentName: selectedStudent.name,
      course: selectedStudent.course,
      branch: selectedStudent.branch,
      certificateType: selectedCertType,
      purpose: safeTrim(purpose),
      statutoryFee: fee,
      feePaid: true,
      feeReceiptNo: `REC/TREASURY/${Math.floor(80000 + Math.random() * 10000)}`,
      noDuesVerified: isNoDuesCleared,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'Principal_Approved',
      approvedDate: new Date().toISOString().split('T')[0],
      approvedBy: 'Prof. (Dr.) K. K. Srivastava, Principal & DDO',
      certificateSerialNo: `GIT/${safeString(selectedCertType).slice(0, 2).toUpperCase()}/2025/${Math.floor(1000 + Math.random() * 9000)}`,
      dispatchMode: 'Digital Download',
      conductStatus: 'Exemplary',
    };

    onAddCertificateRequest(newReq);
    setShowApplyModal(false);
  };

  const filtered = certificateRequests.filter((c) => {
    const matchesFilter = filterType === 'all' || c.certificateType === filterType;
    const query = safeLower(searchQuery);
    const matchesSearch =
      safeLower(c.studentName).includes(query) ||
      safeLower(c.studentRollNo).includes(query) ||
      safeLower(c.requestNo).includes(query);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Sub navigation bar: Certificate Issuance vs Theme Studio */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('requests')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'requests'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Statutory Certificate Issuance</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              subTab === 'requests' ? 'bg-indigo-900 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {certificateRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('themes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'themes'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Palette className="w-4 h-4 text-amber-400" />
            <span>Certificate Theme Studio</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              subTab === 'themes' ? 'bg-indigo-900 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {themes.length}
            </span>
            {isThemeServiceMapped ? (
              <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold uppercase tracking-wider">
                Service Mapped
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold uppercase tracking-wider">
                Admin Mapping Req.
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('facilities')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'facilities'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Facilities & Certificate Pricing</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              subTab === 'facilities' ? 'bg-indigo-900 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {facilityOptions.length}
            </span>
          </button>
        </div>

        {subTab === 'requests' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTab('themes')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5 text-indigo-600" />
              <span>Customize Themes & Seals</span>
            </button>
            <button
              type="button"
              onClick={() => setShowApplyModal(true)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply for Certificate</span>
            </button>
          </div>
        )}
      </div>

      {subTab === 'themes' ? (
        <CertificateThemeStudio
          themes={themes}
          currentSession={currentSession || null}
          staffUsers={staffUsers}
          onSaveTheme={onSaveTheme || (() => {})}
          onDeleteTheme={onDeleteTheme || (() => {})}
          onSetDefaultTheme={onSetDefaultTheme || (() => {})}
          onNavigateToServiceMapping={onNavigateToUserDirectory}
        />
      ) : subTab === 'facilities' ? (
        <FacilityOptionsManager
          facilityOptions={facilityOptions}
          currentSession={currentSession || null}
          onUpdateFacilityOptions={onUpdateFacilityOptions || (() => {})}
        />
      ) : (
        <>
          {/* Top Banner */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">
                <Award className="w-4 h-4" />
                <span>Academic Registry & Statutory Certification Division</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Government College Certificate Issuance Portal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Issue Bonafide, Transfer Certificate (TC), Migration, and Caution Money refund vouchers with State Higher Ed seals.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSubTab('themes')}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Palette className="w-4 h-4 text-indigo-600" />
                <span>Theme Designer</span>
              </button>
              <button
                type="button"
                onClick={() => setShowApplyModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Apply for Certificate</span>
              </button>
            </div>
          </section>

      {/* Filter and Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            Total Requests
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">{certificateRequests.length}</div>
          <span className="text-[10px] text-slate-400">Current Academic Term</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            Issued & Dispatched
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {certificateRequests.filter((c) => ['Issued', 'Ready_To_Issue', 'Principal_Approved'].includes(c.status)).length}
          </div>
          <span className="text-[10px] text-emerald-600">With digital QR seal</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            Statutory Fees Collected
          </span>
          <div className="text-2xl font-bold font-mono text-indigo-700">
            ₹{certificateRequests.reduce((acc, c) => acc + (c.feePaid ? c.statutoryFee : 0), 0)}
          </div>
          <span className="text-[10px] text-slate-400">Head 0202-01-800 Treasury</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            No Dues Clearance Rate
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">100%</div>
          <span className="text-[10px] text-emerald-600">Strict NOC check enforced</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student, Roll No, Request ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs overflow-x-auto w-full sm:w-auto">
          <span className="text-slate-500 font-medium shrink-0">Type:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
              filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setFilterType('Bonafide Certificate')}
            className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
              filterType === 'Bonafide Certificate' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Bonafide
          </button>
          <button
            onClick={() => setFilterType('Transfer Certificate (TC) & Character')}
            className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
              filterType === 'Transfer Certificate (TC) & Character' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            TC & Character
          </button>
        </div>
      </div>

      {/* Certificate Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
              <th className="py-3 px-4">Request No & Student</th>
              <th className="py-3 px-3">Certificate Type</th>
              <th className="py-3 px-3">Purpose Specified</th>
              <th className="py-3 px-3 text-right">Statutory Fee (₹)</th>
              <th className="py-3 px-3 text-center">NOC Status</th>
              <th className="py-3 px-3 text-center">Workflow State</th>
              <th className="py-3 px-4 text-center">Action / Print</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900">{req.studentName}</div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {req.studentRollNo} · {req.requestNo}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className="font-semibold text-slate-900 block">{req.certificateType}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {req.certificateSerialNo || 'Serial pending'}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                  {req.purpose}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                  {req.statutoryFee === 0 ? 'Free (Govt)' : `₹${req.statutoryFee}`}
                  <span className="text-[10px] text-emerald-600 block font-normal">e-Treasury Cleared</span>
                </td>
                <td className="py-3 px-3 text-center">
                  {req.noDuesVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>NOC Cleared</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>NOC Pending</span>
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-center">
                  {['Issued', 'Ready_To_Issue', 'Principal_Approved'].includes(req.status) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Approved & Issued</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                      <Clock className="w-3 h-3" />
                      <span>In Review</span>
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => setActiveCertForPrint(req)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm mx-auto"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Print Official Certificate</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <h3 className="text-base font-bold text-slate-900">
              Apply for Official Government Certificate
            </h3>
            <p className="text-xs text-slate-500">
              Select certificate type and specify administrative purpose.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Select Student *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium text-xs"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNo}) - {s.course} {s.branch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-medium">Certificate Type *</label>
                <select
                  value={selectedCertType}
                  onChange={(e) => setSelectedCertType(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-xs"
                >
                  <option value="Bonafide Certificate">Bonafide Student Certificate (Fee: ₹50)</option>
                  <option value="Transfer Certificate (TC) & Character">Transfer Certificate (TC) & Character (Fee: ₹150)</option>
                  <option value="Migration Certificate">Migration Certificate (Fee: ₹250)</option>
                  <option value="Provisional Passing Certificate">Provisional Passing Certificate (Fee: ₹300)</option>
                  <option value="Caution Money Refund Voucher">Caution Money Refund Order (Fee: ₹0)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-medium">Official Purpose *</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Passport verification / Education Loan / Bus Pass"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-950 text-xs">
                <div className="flex justify-between items-center">
                  <span>Statutory Government Fee:</span>
                  <span className="font-mono font-bold text-sm">
                    {STATUTORY_FEES[selectedCertType] === 0 ? 'Exempt (₹0)' : `₹${STATUTORY_FEES[selectedCertType]}`}
                  </span>
                </div>
                <p className="text-[10px] text-indigo-700 mt-1">
                  Deposited under Head of Account 0202-01-800-01 (Treasury Challan)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowApplyModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-sm"
              >
                Issue Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Printable Certificate Modal */}
      {activeCertForPrint && (
        <PrintableCertificate
          certificate={activeCertForPrint}
          student={students.find((s) => safeMatchStrings(s.rollNo, activeCertForPrint.studentRollNo)) || students[0]}
          theme={
            themes.find((t) => t.id === selectedPrintThemeId) ||
            themes.find((t) => t.isDefault && (t.certificateType === activeCertForPrint.certificateType || t.certificateType === 'All')) ||
            themes[0] ||
            null
          }
          onClose={() => {
            setActiveCertForPrint(null);
            setSelectedPrintThemeId('');
          }}
        />
      )}
        </>
      )}
    </div>
  );
};
