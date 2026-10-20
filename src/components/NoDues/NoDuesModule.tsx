import React, { useState } from 'react';
import { 
  StudentNoDuesApplication, 
  DepartmentKey, 
  Student, 
  DepartmentClearance 
} from '../../types/fee';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Search, 
  Check, 
  Building2, 
  BookOpen, 
  Cpu, 
  Home, 
  Trophy, 
  Flag, 
  Briefcase, 
  Printer,
  Plus,
  ShieldCheck,
  UserCheck,
  LucideIcon
} from 'lucide-react';
import { PrintableCertificate } from '../Common/PrintableCertificate';
import { safeLower } from '../../utils/safeHelpers';

interface Props {
  students: Student[];
  noDuesApps: StudentNoDuesApplication[];
  onUpdateNoDuesApp: (updatedApp: StudentNoDuesApplication) => void;
}

const DEPARTMENTS: { key: DepartmentKey; label: string; icon: LucideIcon; officer: string }[] = [
  { key: 'accounts', label: 'Accounts & Treasury', icon: Building2, officer: 'S. N. Sharma (Accounts Officer)' },
  { key: 'library', label: 'Central Library', icon: BookOpen, officer: 'Dr. P. K. Gupta (Chief Librarian)' },
  { key: 'department_lab', label: 'Department Labs', icon: Cpu, officer: 'Prof. Animesh Roy (HOD)' },
  { key: 'hostel_mess', label: 'Hostel & Mess', icon: Home, officer: 'Dr. D. S. Rawat (Chief Warden)' },
  { key: 'sports', label: 'Sports & Gym', icon: Trophy, officer: 'Col. R. B. Singh (Sports Director)' },
  { key: 'ncc_nss', label: 'NCC / NSS Wing', icon: Flag, officer: 'Capt. Sunita Yadav (In-charge)' },
  { key: 'placement_alumni', label: 'Placement & Alumni', icon: Briefcase, officer: 'Er. Sandeep Mittal (TPO)' },
];

export const NoDuesModule: React.FC<Props> = ({ 
  students, 
  noDuesApps, 
  onUpdateNoDuesApp 
}) => {
  const [selectedAppId, setSelectedAppId] = useState<string>(noDuesApps[1]?.id || noDuesApps[0]?.id);
  const [selectedDeptKey, setSelectedDeptKey] = useState<DepartmentKey>('library');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [printableModalApp, setPrintableModalApp] = useState<StudentNoDuesApplication | null>(null);

  // New Application Modal State
  const [showNewAppModal, setShowNewAppModal] = useState<boolean>(false);
  const [newStudentId, setNewStudentId] = useState<string>(students[1]?.id || students[0]?.id);
  const [newReason, setNewReason] = useState<StudentNoDuesApplication['reason']>('Completion of Course (TC/Degree)');

  const activeApp = noDuesApps.find((a) => a.id === selectedAppId) || noDuesApps[0];
  const activeStudent = students.find((s) => s.rollNo === activeApp?.studentRollNo) || students[0];

  // Handle department approval by officer
  const handleDepartmentSignOff = (appId: string, deptKey: DepartmentKey) => {
    const targetApp = noDuesApps.find((a) => a.id === appId);
    if (!targetApp) return;

    const updatedClearance: DepartmentClearance = {
      ...targetApp.clearances[deptKey],
      status: 'Approved',
      dueAmount: 0,
      dueReason: undefined,
      clearedDate: new Date().toISOString().split('T')[0],
      receiptReference: `CLR-${deptKey.toUpperCase().slice(0, 4)}-${Date.now().toString().slice(-4)}`,
    };

    const newClearances = {
      ...targetApp.clearances,
      [deptKey]: updatedClearance,
    };

    // Check if all 7 departments are now approved
    const allApproved = Object.values(newClearances).every((c) => c.status === 'Approved');

    const updatedApp: StudentNoDuesApplication = {
      ...targetApp,
      clearances: newClearances,
      overallStatus: allApproved ? 'Approved' : 'In_Progress',
      certificateGenerated: allApproved,
      certificateNo: allApproved ? `GIT/NOC/2025/${targetApp.studentRollNo}` : targetApp.certificateNo,
    };

    onUpdateNoDuesApp(updatedApp);
  };

  // Create new No Dues Application
  const handleCreateNewApplication = () => {
    const student = students.find((s) => s.id === newStudentId);
    if (!student) return;

    const newApp: StudentNoDuesApplication = {
      id: 'ND-' + Date.now().toString().slice(-6),
      applicationNo: `GIT/NODUES/25/${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: student.id,
      studentRollNo: student.rollNo,
      studentName: student.name,
      course: student.course,
      branch: student.branch,
      reason: newReason,
      appliedDate: new Date().toISOString().split('T')[0],
      overallStatus: 'In_Progress',
      certificateGenerated: false,
      clearances: {
        accounts: {
          key: 'accounts',
          name: 'Accounts & Treasury Section',
          officerName: 'S. N. Sharma (Accounts Officer)',
          status: student.pendingFee > 0 ? 'Dues_Pending' : 'Approved',
          dueAmount: student.pendingFee,
          dueReason: student.pendingFee > 0 ? `Tuition balance ₹${student.pendingFee} pending` : undefined,
          clearedDate: student.pendingFee === 0 ? new Date().toISOString().split('T')[0] : undefined,
        },
        library: {
          key: 'library',
          name: 'Central University Library',
          officerName: 'Dr. P. K. Gupta (Chief Librarian)',
          status: 'Pending',
          dueAmount: 0,
        },
        department_lab: {
          key: 'department_lab',
          name: `${student.branch} Department Laboratories`,
          officerName: 'Prof. Animesh Roy (HOD)',
          status: 'Pending',
          dueAmount: 0,
        },
        hostel_mess: {
          key: 'hostel_mess',
          name: 'Hostel Warden & Mess Committee',
          officerName: 'Dr. D. S. Rawat (Chief Warden)',
          status: student.hostelResident ? 'Pending' : 'Approved',
          dueAmount: 0,
          clearedDate: !student.hostelResident ? new Date().toISOString().split('T')[0] : undefined,
        },
        sports: {
          key: 'sports',
          name: 'Physical Education & Sports Gymnasium',
          officerName: 'Col. R. B. Singh (Sports Director)',
          status: 'Approved',
          dueAmount: 0,
          clearedDate: new Date().toISOString().split('T')[0],
        },
        ncc_nss: {
          key: 'ncc_nss',
          name: 'NCC 4-State Battalion / NSS Wing',
          officerName: 'Capt. Sunita Yadav (In-charge)',
          status: 'Approved',
          dueAmount: 0,
          clearedDate: new Date().toISOString().split('T')[0],
        },
        placement_alumni: {
          key: 'placement_alumni',
          name: 'Training, Placement & Alumni Association',
          officerName: 'Er. Sandeep Mittal (TPO)',
          status: 'Pending',
          dueAmount: 0,
        },
      },
    };

    onUpdateNoDuesApp(newApp);
    setSelectedAppId(newApp.id);
    setShowNewAppModal(false);
  };

  const q = safeLower(searchQuery);
  const filteredApps = noDuesApps.filter(
    (a) =>
      safeLower(a.studentName).includes(q) ||
      safeLower(a.studentRollNo).includes(q) ||
      safeLower(a.applicationNo).includes(q)
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Statutory Clearance & Institutional NOC System</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Inter-Departmental No Dues Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized sign-offs across 7 departments for Semester Exams, Transfer Certificates, and Caution Money refunds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewAppModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New No Dues Request</span>
          </button>
        </div>
      </section>

      {/* Main Grid: Student Applications (4 Cols) + Department Clearance Board (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Applications List (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Active Clearance Applications</span>
              <span className="text-[11px] text-slate-400 font-mono">{noDuesApps.length} Records</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Roll No or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto border border-slate-100 rounded-lg">
              {filteredApps.map((app) => {
                const clearedCount = Object.values(app.clearances).filter((c) => c.status === 'Approved').length;
                const hasDues = Object.values(app.clearances).some((c) => c.status === 'Dues_Pending');

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    className={`p-3 text-xs cursor-pointer transition-colors ${
                      app.id === activeApp?.id ? 'bg-indigo-50/90 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{app.studentName}</span>
                      {app.overallStatus === 'Approved' ? (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                          NOC Ready
                        </span>
                      ) : hasDues ? (
                        <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded">
                          Dues Found
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                          In Progress
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono">{app.studentRollNo}</span>
                      <span>{clearedCount}/7 Cleared</span>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      Purpose: {app.reason}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Department Clearance Matrix (8 Cols) */}
        {activeApp && (
          <div className="lg:col-span-8 space-y-6">
            {/* Header for Active Student Clearance */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">{activeApp.studentName}</h3>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-semibold rounded">
                    {activeApp.studentRollNo}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Application No: <span className="font-mono font-medium">{activeApp.applicationNo}</span> · {activeApp.course} ({activeApp.branch})
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                  <span>Purpose: <strong>{activeApp.reason}</strong></span>
                  <span>·</span>
                  <span>Applied on {activeApp.appliedDate}</span>
                </div>
              </div>

              {activeApp.overallStatus === 'Approved' ? (
                <button
                  onClick={() => setPrintableModalApp(activeApp)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 shrink-0"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official NOC Certificate</span>
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900 text-xs shrink-0">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Clearance Pending</span>
                  </div>
                  <span className="text-[11px] text-amber-700">
                    Awaiting remaining department approvals
                  </span>
                </div>
              )}
            </div>

            {/* Department Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEPARTMENTS.map((dept) => {
                const clr = activeApp.clearances[dept.key];
                const IconComponent = dept.icon;
                const isApproved = clr.status === 'Approved';
                const hasDues = clr.status === 'Dues_Pending';

                return (
                  <div
                    key={dept.key}
                    className={`bg-white p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isApproved
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : hasDues
                        ? 'border-rose-300 bg-rose-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${isApproved ? 'bg-emerald-100 text-emerald-700' : hasDues ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">{dept.label}</span>
                            <span className="text-[10px] text-slate-400">{clr.officerName}</span>
                          </div>
                        </div>

                        {isApproved ? (
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Cleared</span>
                          </span>
                        ) : hasDues ? (
                          <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>₹{clr.dueAmount} Due</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500">Pending</span>
                        )}
                      </div>

                      {/* Due Details or Clearance Note */}
                      <div className="py-3 text-xs">
                        {hasDues ? (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px]">
                            <strong>Notice: </strong> {clr.dueReason || 'Outstanding institutional balance'}
                          </div>
                        ) : isApproved ? (
                          <div className="text-[11px] text-slate-500">
                            Clearance Reference: <span className="font-mono text-slate-700">{clr.receiptReference || 'VERIFIED-DESK'}</span>
                            <br />
                            Signed on {clr.clearedDate || '2025-08-20'}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">
                            No physical or monetary dues reported. Officer review required.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button for Officer */}
                    <div className="pt-2 border-t border-slate-100">
                      {!isApproved ? (
                        <button
                          onClick={() => handleDepartmentSignOff(activeApp.id, dept.key)}
                          className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Approve & Sign Off as {dept.officer.split(' ')[0]}</span>
                        </button>
                      ) : (
                        <div className="text-center text-[10px] text-emerald-700 font-semibold py-1">
                          ✓ Officer Signature Authenticated
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* New No Dues Request Modal */}
      {showNewAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <h3 className="text-base font-bold text-slate-900">Initiate No Dues Clearance Application</h3>
            <p className="text-xs text-slate-500">
              Submit clearance request to open inter-departmental sign-off pipelines.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Select Student *</label>
                <select
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
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
                <label className="text-slate-700 block mb-1 font-medium">Reason for Clearance *</label>
                <select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs"
                >
                  <option value="Completion of Course (TC/Degree)">Completion of Course (TC / Degree)</option>
                  <option value="Semester Examination">Semester Examination Admit Card</option>
                  <option value="Migration to other University">Migration to other University</option>
                  <option value="Withdrawal / Relocation">Institutional Withdrawal / Relocation</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowNewAppModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewApplication}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-sm"
              >
                Initiate Clearance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Printable No Dues NOC Certificate */}
      {printableModalApp && (
        <PrintableCertificate
          noDuesApp={printableModalApp}
          student={students.find((s) => s.rollNo === printableModalApp.studentRollNo) || students[0]}
          onClose={() => setPrintableModalApp(null)}
        />
      )}
    </div>
  );
};
