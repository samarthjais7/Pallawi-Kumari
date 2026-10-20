import React, { useState } from 'react';
import {
  FeeCampaign,
  StudentDue,
  AuditLogEntry,
  MasterFeeHead,
} from '../../types/campaign';
import { SchoolStaffUser } from '../../types/fee';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  UserCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Save,
  Lock,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  campaign: FeeCampaign | null;
  userRole: 'admin' | 'accountant';
  userName: string;
  userEmail: string;
  staffUsers?: SchoolStaffUser[];
  studentDues: StudentDue[];
  onClose: () => void;
  onSaveCampaign: (updatedCampaign: FeeCampaign, updatedDues?: StudentDue[]) => void;
  onAddAuditLog: (log: AuditLogEntry) => void;
}

export const ModifyCampaignModal: React.FC<Props> = ({
  isOpen,
  campaign,
  userRole,
  userName,
  userEmail,
  staffUsers = [],
  studentDues,
  onClose,
  onSaveCampaign,
  onAddAuditLog,
}) => {
  // Form states (safe defaults if campaign is null)
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'cohorts' | 'nomination'>('details');
  const [title, setTitle] = useState(campaign?.title || '');
  const [description, setDescription] = useState(campaign?.description || '');
  const [startDate, setStartDate] = useState(campaign?.startDate || '');
  const [endDate, setEndDate] = useState(campaign?.endDate || '');
  const [extensionReason, setExtensionReason] = useState('');
  const [status, setStatus] = useState<FeeCampaign['status']>(campaign?.status || 'Draft');

  // Late Fee states
  const [lateFeeEnabled, setLateFeeEnabled] = useState(campaign?.lateFee?.enabled ?? false);
  const [lateFeeType, setLateFeeType] = useState<'FLAT' | 'PER_DAY'>(campaign?.lateFee?.type || 'PER_DAY');
  const [lateFeeAmount, setLateFeeAmount] = useState(campaign?.lateFee?.amount ?? 50);
  const [lateFeeMaxCap, setLateFeeMaxCap] = useState<number | undefined>(campaign?.lateFee?.maxCap ?? 1500);
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState(campaign?.lateFee?.graceDays ?? 5);

  // Partial Payment
  const [minPartialAmount, setMinPartialAmount] = useState<number>(campaign?.minPartialAmount || 1000);
  const [allowPartial, setAllowPartial] = useState(Boolean(campaign?.minPartialAmount));

  // Nominated Staff states
  const [nominatedStaffEmails, setNominatedStaffEmails] = useState<string[]>(
    campaign?.nominatedStaffEmails || []
  );
  const [nominatedStaffNames, setNominatedStaffNames] = useState<string[]>(
    campaign?.nominatedStaffNames || []
  );

  // Validation / Feedback states
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen || !campaign) return null;

  // Authorization check
  const isAdmin = userRole === 'admin';
  const isNominated = (campaign.nominatedStaffEmails || []).some(
    (email) => email.trim().toLowerCase() === (userEmail || '').trim().toLowerCase()
  );
  const isAuthorized = isAdmin || isNominated;

  // Staff Nomination Toggle
  const handleToggleNominateStaff = (staff: SchoolStaffUser) => {
    if (!isAdmin) return; // Only admin can nominate or revoke nomination
    if (nominatedStaffEmails.includes(staff.email)) {
      setNominatedStaffEmails(nominatedStaffEmails.filter((e) => e !== staff.email));
      setNominatedStaffNames(nominatedStaffNames.filter((n) => n !== staff.name));
    } else {
      setNominatedStaffEmails([...nominatedStaffEmails, staff.email]);
      setNominatedStaffNames([...nominatedStaffNames, staff.name]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setValidationError('You do not have administrative or nominated clearance to modify this launched campaign.');
      return;
    }

    if (!title.trim()) {
      setValidationError('Campaign title is mandatory.');
      return;
    }

    if (!endDate) {
      setValidationError('Campaign deadline (End Date) is mandatory.');
      return;
    }

    const now = new Date().toISOString();
    const hasDateChanged = endDate !== campaign.endDate;

    if (hasDateChanged && new Date(endDate) <= new Date(startDate)) {
      setValidationError('End date must be strictly after the start date.');
      return;
    }

    // Prepare updated campaign
    const updatedExtensions = [...campaign.extensions];
    if (hasDateChanged) {
      updatedExtensions.unshift({
        id: `EXT-${Date.now()}`,
        oldEndDate: campaign.endDate,
        newEndDate: endDate,
        extendedBy: `${isAdmin ? 'Admin' : 'Nominated Staff'}: ${userName}`,
        extendedAt: now,
        reason: extensionReason.trim() || 'Deadline adjustment by authorized authority',
      });
    }

    const updatedCampaign: FeeCampaign = {
      ...campaign,
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      status,
      minPartialAmount: allowPartial ? minPartialAmount : undefined,
      lateFee: {
        enabled: lateFeeEnabled,
        type: lateFeeType,
        amount: lateFeeAmount,
        maxCap: lateFeeMaxCap,
        graceDays: lateFeeGraceDays,
      },
      nominatedStaffEmails,
      nominatedStaffNames,
      extensions: updatedExtensions,
    };

    // If deadline extended, also reactivate expired student dues for this campaign
    let updatedDues: StudentDue[] | undefined = undefined;
    if (hasDateChanged) {
      updatedDues = studentDues.map((d) => {
        if (d.campaignId === campaign.id) {
          const isDuePending = d.balanceAmount > 0;
          return {
            ...d,
            dueDate: endDate,
            paymentLinkActive: isDuePending,
            status: d.status === 'Expired' && isDuePending ? 'Pending' : d.status,
            updatedAt: now,
          };
        }
        return d;
      });
    }

    onSaveCampaign(updatedCampaign, updatedDues);

    // Audit Log Entry
    onAddAuditLog({
      id: `LOG-MOD-${Date.now()}`,
      entityType: 'Campaign',
      entityId: campaign.id,
      action: 'UPDATE',
      userEmail,
      userName,
      userRole: isAdmin ? 'Admin' : 'Nominated_Staff',
      details: `Modified launched campaign "${campaign.title}" (${
        isAdmin ? 'by Administrator' : 'by Nominated Staff member'
      }). Changes: ${hasDateChanged ? `Deadline: ${campaign.endDate} -> ${endDate}; ` : ''}Title/Rules updated.`,
      oldValue: `${campaign.title} (End: ${campaign.endDate})`,
      newValue: `${updatedCampaign.title} (End: ${endDate})`,
      timestamp: now,
    });

    setSuccessToast('Campaign modified and synchronization dispatched successfully.');
    setTimeout(() => {
      onClose();
    }, 700);
  };

  // If user is NOT authorized, render institutional access refusal
  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs my-auto max-h-[90vh] overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Institutional Access Restricted</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-950">
            <p className="font-bold">
              Only Institutional Admin or Nominated Users can modify this campaign after launch.
            </p>
            <p className="text-[11px] text-rose-900/80">
              Per college statutory policy, once a fee campaign has been published and assigned to student rosters, altering fee amounts, deadlines, or concessions requires administrative clearance or explicit nomination by the Admin.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-slate-600 font-bold block">
              Staff Members Nominated by Admin for &quot;{campaign.title}&quot;:
            </span>
            {campaign.nominatedStaffNames && campaign.nominatedStaffNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {campaign.nominatedStaffNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold text-[11px]"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic text-[11px]">
                No staff members are currently nominated for this campaign. Only the Root Administrator can modify it.
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs"
            >
              Understood / Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs max-h-[90vh] overflow-y-auto my-auto flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Modify Launched Fee Campaign
              </h2>
              {isAdmin ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-700" />
                  <span>Institutional Admin</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-700" />
                  <span>Nominated Authorized Staff</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Campaign ID: <span className="font-mono font-bold text-slate-700">{campaign.id}</span> · Status: {campaign.status}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Validation / Success Messages */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-rose-600 hover:text-rose-800 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              activeTab === 'details' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Title & Description
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              activeTab === 'timeline' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Timeline & Late Fee
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cohorts')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              activeTab === 'cohorts' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Audience Cohorts ({campaign.cohorts?.length || 1})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nomination')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              activeTab === 'nomination' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Admin Nomination ({nominatedStaffEmails.length})
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-3">
              <div>
                <label className="text-slate-800 font-bold block mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full min-h-[40px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-slate-800 font-bold block mb-1">Short Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-slate-800 font-bold block mb-1">Campaign Operational Status</label>
                  <select
                    value={status}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatus(e.target.value)}
                    className="w-full min-h-[40px] p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="Active">Active (Accepting Student Payments)</option>
                    <option value="Draft">Draft (Suspended / On Hold)</option>
                    <option value="Expired">Expired (Fee Window Closed)</option>
                    <option value="Closed">Closed (Archived)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-800 font-bold block mb-1">Audience Intake Method</label>
                  <input
                    type="text"
                    disabled
                    value={campaign.method === 'SELECTION' ? 'Course & Semester Selection' : 'Excel Roster Upload'}
                    className="w-full min-h-[40px] p-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-500 font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE & LATE FEE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-800 font-bold block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full min-h-[40px] p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-bold block mb-1">
                    End Date / Collection Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full min-h-[40px] p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-indigo-950"
                  />
                </div>
              </div>

              {endDate !== campaign.endDate && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-amber-950">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span>Extension Reason (Mandatory for Audit Trail)</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Festival relief / Examination form submission window extended"
                    value={extensionReason}
                    onChange={(e) => setExtensionReason(e.target.value)}
                    className="w-full min-h-[38px] p-2 bg-white border border-amber-300 rounded-lg text-xs"
                  />
                  <p className="text-[10px] text-amber-800">
                    Extending the deadline will automatically re-enable payment links for all students with pending balances.
                  </p>
                </div>
              )}

              {/* Late Fee Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-slate-800">Late Fee Fine Rule</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={lateFeeEnabled}
                      onChange={(e) => setLateFeeEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>Enable Late Fine</span>
                  </label>
                </div>

                {lateFeeEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-slate-600 block mb-1">Fine Type</label>
                      <select
                        value={lateFeeType}
                        onChange={(e) => setLateFeeType(e.target.value as string)}
                        className="w-full min-h-[36px] p-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                      >
                        <option value="PER_DAY">Per Day (₹/day)</option>
                        <option value="FLAT">Flat Surcharge (₹)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-600 block mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={lateFeeAmount}
                        onChange={(e) => setLateFeeAmount(Number(e.target.value))}
                        className="w-full min-h-[36px] p-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-slate-600 block mb-1">Grace Period (Days)</label>
                      <input
                        type="number"
                        value={lateFeeGraceDays}
                        onChange={(e) => setLateFeeGraceDays(Number(e.target.value))}
                        className="w-full min-h-[36px] p-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-slate-600 block mb-1">Max Cap (₹)</label>
                      <input
                        type="number"
                        value={lateFeeMaxCap || ''}
                        onChange={(e) => setLateFeeMaxCap(Number(e.target.value) || undefined)}
                        placeholder="e.g. 1500"
                        className="w-full min-h-[36px] p-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Partial Payment */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Partial Fee Installments</span>
                  <span className="text-[11px] text-slate-500">Allow students to pay dues in multiple installments</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPartial}
                      onChange={(e) => setAllowPartial(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>Allow Partial</span>
                  </label>
                  {allowPartial && (
                    <input
                      type="number"
                      value={minPartialAmount}
                      onChange={(e) => setMinPartialAmount(Number(e.target.value))}
                      placeholder="Min ₹"
                      className="w-24 p-1.5 bg-white border border-slate-300 rounded-lg text-right font-mono font-bold"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COHORTS AUDIENCE OVERVIEW */}
          {activeTab === 'cohorts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Target Course Cohorts Attached to Campaign
                </span>
                <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded text-[11px] border border-indigo-200">
                  {campaign.studentCount} Total Students Assigned
                </span>
              </div>

              {campaign.cohorts && campaign.cohorts.length > 0 ? (
                <div className="space-y-2">
                  {campaign.cohorts.map((cohort) => (
                    <div
                      key={cohort.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold text-[10px]">
                            {cohort.course}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                            Semester {cohort.semester}
                          </span>
                        </div>
                        <span className="font-mono font-black text-indigo-950">
                          ₹{cohort.netFeePerStudent.toLocaleString('en-IN')} / student
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
                        <div>
                          <span className="text-slate-400 block">Enrolled Count:</span>
                          <strong className="text-slate-800">{cohort.enrolledStudentsCount} Students</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Base Fee:</span>
                          <span className="font-mono">₹{cohort.baseAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Concession:</span>
                          <span className="font-mono text-emerald-700">
                            {cohort.concessionAmount > 0 ? `-₹${cohort.concessionAmount.toLocaleString('en-IN')}` : 'None'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-center">
                  Standard batch roster with {campaign.studentCount} students enrolled. Fee rate: ₹{campaign.totalAmount.toLocaleString('en-IN')} / student.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADMIN NOMINATION */}
          {activeTab === 'nomination' && (
            <div className="space-y-3">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" />
                  <span>Institutional Authority & Modification Rights</span>
                </div>
                <p className="text-[11px] text-indigo-900/80">
                  {isAdmin
                    ? 'As Institutional Admin, you have master authority and can nominate accounts officers, bursars, or department heads to edit this launched campaign.'
                    : 'You are currently viewing this screen as a Nominated Authorized Staff member. Only Institutional Admin can alter nominated authority members.'}
                </p>
              </div>

              {/* Nominated Staff Badges */}
              <div>
                <span className="font-bold text-slate-800 block mb-1.5">
                  Currently Authorized Staff Members ({nominatedStaffNames.length}):
                </span>
                {nominatedStaffNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {nominatedStaffNames.map((name, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 bg-slate-50 text-indigo-950 border border-slate-300 px-2.5 py-1 rounded-lg font-bold text-[11px]"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{name}</span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              const email = nominatedStaffEmails[i];
                              setNominatedStaffEmails(nominatedStaffEmails.filter((_, idx) => idx !== i));
                              setNominatedStaffNames(nominatedStaffNames.filter((_, idx) => idx !== i));
                            }}
                            className="text-slate-400 hover:text-rose-600 ml-1"
                            title="Remove nomination"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[11px]">
                    No staff members currently nominated. Only Admin can modify.
                  </p>
                )}
              </div>

              {/* Quick Nominate Grid (Admin Only) */}
              {isAdmin && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-700 font-semibold block mb-1">
                    Select Accounts Officers or Staff from Directory to Nominate:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                    {staffUsers
                      .filter((u) => u.status === 'Active' && u.role !== 'App_Admin')
                      .map((staff) => {
                        const isSelected = nominatedStaffEmails.includes(staff.email);
                        return (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => handleToggleNominateStaff(staff)}
                            className={`p-2 rounded-lg text-left text-xs border transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold'
                                : 'hover:bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="truncate pr-1">
                              <span className="block truncate">{staff.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                {staff.designation || staff.role}
                              </span>
                            </div>
                            {isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 text-slate-600 hover:text-slate-900 font-bold rounded-xl"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="min-h-[40px] px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Campaign Modifications</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
