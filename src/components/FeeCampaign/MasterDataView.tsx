import React, { useState } from 'react';
import {
  MasterFeeHead,
  FeePlan,
  CourseMaster,
  SemesterMaster,
  SubjectMaster,
  AuditLogEntry,
  MasterCategory,
} from '../../types/campaign';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Edit2,
  ShieldAlert,
  Clock,
  BookOpen,
  FolderPlus,
  FileText,
  Filter,
  Eye,
  Check,
  X,
  History as HistoryIcon,
  Info,
  Percent,
} from 'lucide-react';

interface Props {
  feeHeads: MasterFeeHead[];
  feePlans: FeePlan[];
  courses: CourseMaster[];
  semesters: SemesterMaster[];
  subjects: SubjectMaster[];
  auditLogs: AuditLogEntry[];
  userRole: 'admin' | 'accountant';
  userName: string;
  userEmail: string;
  onUpdateFeeHeads: (heads: MasterFeeHead[]) => void;
  onUpdateFeePlans: (plans: FeePlan[]) => void;
  onUpdateCourses: (courses: CourseMaster[]) => void;
  onUpdateSemesters: (semesters: SemesterMaster[]) => void;
  onUpdateSubjects: (subjects: SubjectMaster[]) => void;
  onAddAuditLog: (log: AuditLogEntry) => void;
  onNavigateToConcessions?: () => void;
}

export const MasterDataView: React.FC<Props> = ({
  feeHeads,
  feePlans,
  courses,
  semesters,
  subjects,
  auditLogs,
  userRole,
  userName,
  userEmail,
  onUpdateFeeHeads,
  onUpdateFeePlans,
  onUpdateCourses,
  onUpdateSemesters,
  onUpdateSubjects,
  onAddAuditLog,
  onNavigateToConcessions,
}) => {
  const [activeTab, setActiveTab] = useState<'heads' | 'plans' | 'courses' | 'semesters' | 'subjects' | 'trash' | 'audit'>('heads');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Modal States
  const [showHeadModal, setShowHeadModal] = useState(false);
  const [editingHead, setEditingHead] = useState<MasterFeeHead | null>(null);
  const [headForm, setHeadForm] = useState({
    name: '',
    defaultAmount: 1000,
    category: 'Tuition' as MasterCategory,
    description: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Draft',
  });
  const [headFormError, setHeadFormError] = useState<string | null>(null);

  // Toggle Status Confirm Modal
  const [toggleTarget, setToggleTarget] = useState<{ type: 'head' | 'plan' | 'course' | 'semester' | 'subject'; id: string; name: string; currentStatus: 'Active' | 'Inactive' | 'Draft'; usedCount?: number } | null>(null);

  // Delete Confirm Modal (Admin Only)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'head' | 'plan' | 'course' | 'semester' | 'subject'; id: string; name: string; usedCount: number } | null>(null);

  // Fee Head Form Handlers
  const handleOpenAddHead = () => {
    setEditingHead(null);
    setHeadForm({
      name: '',
      defaultAmount: 1000,
      category: 'Tuition',
      description: '',
      status: 'Active',
    });
    setHeadFormError(null);
    setShowHeadModal(true);
  };

  const handleOpenEditHead = (head: MasterFeeHead) => {
    setEditingHead(head);
    setHeadForm({
      name: head.name,
      defaultAmount: head.defaultAmount,
      category: head.category,
      description: head.description,
      status: head.status,
    });
    setHeadFormError(null);
    setShowHeadModal(true);
  };

  const handleSaveHead = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = headForm.name.trim();
    if (!trimmedName) {
      setHeadFormError('Fee head name is required.');
      return;
    }
    // Check uniqueness (ignoring self if editing)
    const duplicate = feeHeads.some(
      (h) => !h.isDeleted && h.id !== editingHead?.id && h.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setHeadFormError(`A fee head with the name "${trimmedName}" already exists.`);
      return;
    }

    const now = new Date().toISOString();

    if (editingHead) {
      const updated = feeHeads.map((h) =>
        h.id === editingHead.id
          ? {
              ...h,
              name: trimmedName,
              defaultAmount: Number(headForm.defaultAmount),
              category: headForm.category,
              description: headForm.description.trim(),
              status: headForm.status,
              updatedAt: now,
            }
          : h
      );
      onUpdateFeeHeads(updated);
      onAddAuditLog({
        id: `LOG-${Date.now()}`,
        entityType: 'FeeHead',
        entityId: editingHead.id,
        action: 'UPDATE',
        userEmail,
        userName,
        userRole: userRole === 'admin' ? 'Admin' : 'Accountant',
        details: `Updated Fee Head "${trimmedName}". Amount: ₹${headForm.defaultAmount}. Status: ${headForm.status}`,
        oldValue: `${editingHead.name} (₹${editingHead.defaultAmount})`,
        newValue: `${trimmedName} (₹${headForm.defaultAmount})`,
        timestamp: now,
      });
    } else {
      const newHead: MasterFeeHead = {
        id: `HEAD-${Date.now().toString().slice(-4)}`,
        name: trimmedName,
        defaultAmount: Number(headForm.defaultAmount),
        category: headForm.category,
        description: headForm.description.trim(),
        status: headForm.status,
        usedCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      onUpdateFeeHeads([...feeHeads, newHead]);
      onAddAuditLog({
        id: `LOG-${Date.now()}`,
        entityType: 'FeeHead',
        entityId: newHead.id,
        action: 'CREATE',
        userEmail,
        userName,
        userRole: userRole === 'admin' ? 'Admin' : 'Accountant',
        details: `Created new Fee Head "${trimmedName}" with default amount ₹${headForm.defaultAmount}`,
        newValue: `${trimmedName} (₹${headForm.defaultAmount})`,
        timestamp: now,
      });
    }

    setShowHeadModal(false);
  };

  // Status Toggle
  const handleConfirmToggle = () => {
    if (!toggleTarget) return;
    const now = new Date().toISOString();
    const newStatus: 'Active' | 'Inactive' = toggleTarget.currentStatus === 'Active' ? 'Inactive' : 'Active';

    if (toggleTarget.type === 'head') {
      const updated = feeHeads.map((h) =>
        h.id === toggleTarget.id ? { ...h, status: newStatus, updatedAt: now } : h
      );
      onUpdateFeeHeads(updated);
      onAddAuditLog({
        id: `LOG-${Date.now()}`,
        entityType: 'FeeHead',
        entityId: toggleTarget.id,
        action: newStatus === 'Active' ? 'ACTIVATE' : 'DEACTIVATE',
        userEmail,
        userName,
        userRole: userRole === 'admin' ? 'Admin' : 'Accountant',
        details: `${newStatus === 'Active' ? 'Activated' : 'Deactivated'} Fee Head "${toggleTarget.name}"`,
        oldValue: toggleTarget.currentStatus,
        newValue: newStatus,
        timestamp: now,
      });
    }

    setToggleTarget(null);
  };

  // Soft Delete (Admin Only, 30 days recovery)
  const handleConfirmDelete = () => {
    if (!deleteTarget || userRole !== 'admin') return;
    if (deleteTarget.usedCount > 0) return; // Blocked

    const now = new Date().toISOString();

    if (deleteTarget.type === 'head') {
      const updated = feeHeads.map((h) =>
        h.id === deleteTarget.id ? { ...h, isDeleted: true, deletedAt: now } : h
      );
      onUpdateFeeHeads(updated);
      onAddAuditLog({
        id: `LOG-${Date.now()}`,
        entityType: 'FeeHead',
        entityId: deleteTarget.id,
        action: 'DELETE',
        userEmail,
        userName,
        userRole: 'Admin',
        details: `Soft deleted Fee Head "${deleteTarget.name}". Recoverable for 30 days.`,
        oldValue: 'Active',
        newValue: 'Soft Deleted',
        timestamp: now,
      });
    }

    setDeleteTarget(null);
  };

  // Restore from Trash
  const handleRestoreHead = (head: MasterFeeHead) => {
    const now = new Date().toISOString();
    const updated = feeHeads.map((h) =>
      h.id === head.id ? { ...h, isDeleted: false, deletedAt: undefined, updatedAt: now } : h
    );
    onUpdateFeeHeads(updated);
    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'FeeHead',
      entityId: head.id,
      action: 'RESTORE',
      userEmail,
      userName,
      userRole: 'Admin',
      details: `Restored soft-deleted Fee Head "${head.name}"`,
      timestamp: now,
    });
  };

  // Filtered Heads
  const visibleHeads = feeHeads
    .filter((h) => !h.isDeleted)
    .filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'All' ? true : h.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  // Soft deleted items
  const deletedHeads = feeHeads.filter((h) => h.isDeleted);

  return (
    <div className="space-y-4">
      {/* Top Header & Role Badge */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Institution Fee Master Data</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              userRole === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {userRole === 'admin' ? 'Admin Full Access' : 'Accountant Access'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage reusable fee heads, statutory fee plans, courses, semesters, and subjects.
          </p>
        </div>

        {activeTab === 'heads' && (
          <button
            type="button"
            onClick={handleOpenAddHead}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fee Head</span>
          </button>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('heads')}
          className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'heads'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <span>Fee Heads</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            activeTab === 'heads' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {feeHeads.filter((h) => !h.isDeleted).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'plans'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <span>Fee Plans</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            activeTab === 'plans' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {feePlans.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('courses')}
          className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'courses'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <span>Courses ({courses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('semesters')}
          className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'semesters'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <span>Semesters ({semesters.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subjects')}
          className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'subjects'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <span>Subjects ({subjects.length})</span>
        </button>

        {userRole === 'admin' && (
          <button
            type="button"
            onClick={() => setActiveTab('trash')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'trash'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-rose-700'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Trash ({deletedHeads.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-slate-800 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <HistoryIcon className="w-3.5 h-3.5" />
          <span>Audit Log ({auditLogs.length})</span>
        </button>

        {onNavigateToConcessions && (
          <button
            type="button"
            onClick={onNavigateToConcessions}
            className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer ml-auto"
            title="Configure dynamic parameters, percentage waivers, scholarships and surcharges"
          >
            <Percent className="w-3.5 h-3.5 text-amber-600" />
            <span>Concession & Surcharge Rules ›</span>
          </button>
        )}
      </div>

      {/* 1. FEE HEADS TAB */}
      {activeTab === 'heads' && (
        <div className="space-y-3">
          {/* Search & Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative w-full flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search fee head name, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {(['All', 'Active', 'Inactive'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Fee Heads List Cards (Mobile-first) */}
          {visibleHeads.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-2">
              <FolderPlus className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold">No fee heads found</p>
              <p className="text-[11px] text-slate-400">
                {searchQuery || statusFilter !== 'All' ? 'Try adjusting your search or filters.' : 'Click "Add Fee Head" to define your first master fee head.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleHeads.map((head) => (
                <div
                  key={head.id}
                  className={`bg-white p-4 rounded-xl border transition-all ${
                    head.status === 'Active' ? 'border-slate-200 shadow-2xs' : 'border-slate-200 bg-slate-50/60 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          head.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {head.status}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {head.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {head.name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold font-mono text-indigo-700 block">
                        ₹{head.defaultAmount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400">Default Rate</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    {head.description || 'No description provided.'}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Used in <strong className="text-slate-800 font-mono">{head.usedCount}</strong> campaigns
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditHead(head)}
                        className="min-h-[40px] px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Edit Fee Head"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setToggleTarget({
                            type: 'head',
                            id: head.id,
                            name: head.name,
                            currentStatus: head.status,
                            usedCount: head.usedCount,
                          })
                        }
                        className={`min-h-[40px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          head.status === 'Active'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                        }`}
                        title={head.status === 'Active' ? 'Deactivate Fee Head' : 'Activate Fee Head'}
                      >
                        {head.status === 'Active' ? (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Activate</span>
                          </>
                        )}
                      </button>

                      {userRole === 'admin' && (
                        head.usedCount > 0 ? (
                          <span
                            className="text-[10px] text-slate-400 italic px-2"
                            title="Used in campaigns. Deactivate instead of deleting."
                          >
                            Deactivate instead
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'head',
                                id: head.id,
                                name: head.name,
                                usedCount: head.usedCount,
                              })
                            }
                            className="min-h-[40px] p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Fee Head (Admin only, 30 days recovery)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. PLANS TAB */}
      {activeTab === 'plans' && (
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Reusable Pre-packaged Fee Bundles</p>
              <p className="text-[11px] text-indigo-800">
                Fee Plans combine multiple active fee heads into standard semester fee structures. Inactive heads are excluded from new plans.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {feePlans.map((plan) => (
              <div key={plan.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {plan.status}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{plan.name}</h3>
                    <p className="text-xs text-slate-500">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-indigo-700 block">
                      ₹{plan.totalAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400">Total Bundle</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg space-y-1.5 text-xs">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Bundled Heads ({plan.heads.length})
                  </span>
                  {plan.heads.map((h, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-700 truncate pr-2">{h.headName}</span>
                      <span className="font-mono font-bold text-slate-900">₹{h.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Used in {plan.usedCount} campaigns</span>
                  <span className="font-mono">{plan.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. COURSES TAB */}
      {activeTab === 'courses' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Accredited Academic Courses</h3>
            <span className="text-[11px] text-slate-400 font-mono">{courses.length} active courses</span>
          </div>

          <div className="divide-y divide-slate-100">
            {courses.map((crs) => (
              <div key={crs.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{crs.name}</div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Code: {crs.code} · Duration: {crs.durationYears} Years
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {crs.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SEMESTERS TAB */}
      {activeTab === 'semesters' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Academic Terms & Semesters</h3>
            <span className="text-[11px] text-slate-400 font-mono">{semesters.length} semesters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {semesters.map((sem) => (
              <div key={sem.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{sem.label}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {sem.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. SUBJECTS TAB */}
      {activeTab === 'subjects' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Curriculum Subjects</h3>
            <span className="text-[11px] text-slate-400 font-mono">{subjects.length} subjects</span>
          </div>

          <div className="divide-y divide-slate-100">
            {subjects.map((sub) => (
              <div key={sub.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{sub.name}</span>
                    {sub.isElective && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold uppercase">
                        Elective
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {sub.code} · {sub.courseCode} (Semester {sub.semester})
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. TRASH / RECOVERABLE TAB (Admin Only) */}
      {activeTab === 'trash' && userRole === 'admin' && (
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-700">
              <Trash2 className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Soft-Deleted Master Items</h3>
            </div>
            <span className="text-[11px] text-rose-700 font-semibold">Recoverable for 30 Days</span>
          </div>

          {deletedHeads.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">The recycle bin is empty. No deleted master items.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {deletedHeads.map((dh) => (
                <div key={dh.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900 line-through text-slate-400">{dh.name}</div>
                    <div className="text-[10px] text-slate-400">
                      Deleted on {dh.deletedAt ? new Date(dh.deletedAt).toLocaleDateString() : 'Recent'} · Default: ₹{dh.defaultAmount}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestoreHead(dh)}
                    className="min-h-[44px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Item</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. AUDIT LOG TAB */}
      {activeTab === 'audit' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Master Data Change Audit Log</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Immutable audit trail</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">{log.details}</span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                  <span>By: {log.userName} ({log.userRole})</span>
                  <span>·</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold">{log.action}</span>
                  {log.oldValue && (
                    <span>Old: <em className="text-slate-600">{log.oldValue}</em></span>
                  )}
                  {log.newValue && (
                    <span>New: <strong className="text-slate-800">{log.newValue}</strong></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD / EDIT FEE HEAD MODAL */}
      {showHeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold">
                  {editingHead ? 'Edit Fee Head' : 'Add Master Fee Head'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHeadModal(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHead} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Snapshot Notice if Editing */}
              {editingHead && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Changes apply to new campaigns only.</span>
                    <span className="text-[11px] text-amber-800">
                      Existing published student dues and campaign balances are immutable snapshots and will not change.
                    </span>
                  </div>
                </div>
              )}

              {headFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium">
                  {headFormError}
                </div>
              )}

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Fee Head Name * (Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Laboratory Maintenance"
                  value={headForm.name}
                  onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })}
                  className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Default Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={10}
                    value={headForm.defaultAmount}
                    onChange={(e) => setHeadForm({ ...headForm, defaultAmount: Number(e.target.value) })}
                    className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Category</label>
                  <select
                    value={headForm.category}
                    onChange={(e) => setHeadForm({ ...headForm, category: e.target.value as MasterCategory })}
                    className="w-full min-h-[44px] p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Tuition">Tuition</option>
                    <option value="Exam">Exam</option>
                    <option value="Lab">Lab</option>
                    <option value="Transport">Transport</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Description / Purpose</label>
                <textarea
                  rows={2}
                  placeholder="Short description of this statutory fee head..."
                  value={headForm.description}
                  onChange={(e) => setHeadForm({ ...headForm, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Initial Status</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="headStatus"
                      checked={headForm.status === 'Active'}
                      onChange={() => setHeadForm({ ...headForm, status: 'Active' })}
                      className="text-indigo-600"
                    />
                    <span className="font-semibold text-slate-800">Active (Available in wizard)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="headStatus"
                      checked={headForm.status === 'Inactive'}
                      onChange={() => setHeadForm({ ...headForm, status: 'Inactive' })}
                      className="text-indigo-600"
                    />
                    <span className="text-slate-500">Inactive</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHeadModal(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  {editingHead ? 'Save Changes' : 'Create Fee Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOGGLE STATUS CONFIRM MODAL */}
      {toggleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">
                {toggleTarget.currentStatus === 'Active' ? 'Deactivate' : 'Activate'} {toggleTarget.name}?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {toggleTarget.currentStatus === 'Active' ? (
                <>
                  Deactivating this item will hide it from future campaign wizards. Existing published campaigns and past receipts will remain completely unaffected.
                  {Boolean(toggleTarget.usedCount && toggleTarget.usedCount > 0) && (
                    <span className="block mt-2 font-bold text-amber-800">
                      Notice: Currently used in {toggleTarget.usedCount} campaigns.
                    </span>
                  )}
                </>
              ) : (
                'Activating this item will immediately make it selectable in the campaign launch wizard and fee plans.'
              )}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setToggleTarget(null)}
                className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`min-h-[44px] px-4 py-2 text-white rounded-xl text-xs font-bold cursor-pointer ${
                  toggleTarget.currentStatus === 'Active'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm {toggleTarget.currentStatus === 'Active' ? 'Deactivation' : 'Activation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL (Admin Only) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-rose-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">
                Move &quot;{deleteTarget.name}&quot; to Trash?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This master item has never been used in any plan or campaign. It will be moved to the Trash bin and can be recovered by an Admin for 30 days.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
