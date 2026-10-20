import React, { useState } from 'react';
import { 
  FeeHeadItem, 
  EnrollmentField, 
  ConcessionSurchargeRule,
  Student,
  UserSession
} from '../../types/fee';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Percent, 
  Tag, 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle,
  ArrowRight,
  Filter,
  CheckCircle2,
  DollarSign,
  Search,
  Users,
  ArrowUpDown,
  Lock,
  BookOpen
} from 'lucide-react';
import { safeConfirm, safeAlert, safeNumber, safeString, safeMatchStrings, safeLower, safeTrim } from '../../utils/safeHelpers';
import { evaluateRuleMatch } from '../../services/serverFeeEngine';

interface Props {
  concessionRules: ConcessionSurchargeRule[];
  feeHeads?: FeeHeadItem[];
  enrollmentFields?: EnrollmentField[];
  students: Student[];
  currentSession?: UserSession | null;
  onUpdateConcessionRules: (rules: ConcessionSurchargeRule[]) => void;
  onApplyRulesToStudents?: () => void;
}

export const FeeHeadRulesManager: React.FC<Props> = ({
  concessionRules,
  feeHeads = [],
  enrollmentFields = [],
  students,
  currentSession = null,
  onUpdateConcessionRules,
  onApplyRulesToStudents,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<'ALL' | 'Concession' | 'Surcharge'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State for Add / Edit Rule
  const [editingRule, setEditingRule] = useState<ConcessionSurchargeRule | null>(null);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<Partial<ConcessionSurchargeRule>>({
    name: '',
    code: '',
    description: '',
    action: 'Concession',
    calculationMode: 'Percentage',
    value: 20,
    targetHeadId: 'ALL_TUITION',
    criteriaField: 'gender',
    criteriaOperator: 'equals',
    criteriaValue: 'Female',
    isActive: true,
    priority: 1,
  });
  const [ruleSuccessMsg, setRuleSuccessMsg] = useState<string | null>(null);

  // Dynamic Student Matching Evaluator (100% synchronized with serverFeeEngine)
  const countMatchingStudents = (rule: Partial<ConcessionSurchargeRule>) => {
    if (!rule.criteriaField || !rule.criteriaOperator) return 0;
    return students.filter((stu) => evaluateRuleMatch(stu, rule as ConcessionSurchargeRule)).length;
  };

  // Rule Handlers
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.name || !ruleForm.criteriaField) return;

    const parsedVal = Math.max(0, Number(ruleForm.value) || 0);
    const validatedVal = ruleForm.calculationMode === 'Percentage' ? Math.min(100, parsedVal) : parsedVal;

    if (editingRule) {
      const updated = concessionRules.map((r) =>
        r.id === editingRule.id
          ? ({ ...editingRule, ...ruleForm, value: validatedVal } as ConcessionSurchargeRule)
          : r
      );
      onUpdateConcessionRules(updated);
      setEditingRule(null);
      setRuleSuccessMsg(`Rule "${ruleForm.name}" updated successfully.`);
    } else {
      const newRule: ConcessionSurchargeRule = {
        id: 'RULE-' + Date.now().toString().slice(-4),
        name: ruleForm.name.trim(),
        code: ruleForm.code?.toUpperCase().trim() || `RULE-${Date.now().toString().slice(-4)}`,
        description: ruleForm.description || '',
        action: ruleForm.action || 'Concession',
        calculationMode: ruleForm.calculationMode || 'Percentage',
        value: validatedVal,
        targetHeadId: ruleForm.targetHeadId || 'ALL_TUITION',
        criteriaField: ruleForm.criteriaField || 'gender',
        criteriaOperator: ruleForm.criteriaOperator || 'equals',
        criteriaValue: ruleForm.criteriaValue || 'Female',
        isActive: ruleForm.isActive ?? true,
        priority: Number(ruleForm.priority) || concessionRules.length + 1,
      };
      onUpdateConcessionRules([...concessionRules, newRule]);
      setIsAddRuleOpen(false);
      setRuleSuccessMsg(`New rule "${newRule.name}" activated.`);
    }

    setTimeout(() => setRuleSuccessMsg(null), 3500);
  };

  const handleDeleteRule = (ruleId: string, ruleName: string) => {
    if (safeConfirm(`Are you sure you want to delete rule "${ruleName}"? It will no longer apply to student ledgers.`)) {
      onUpdateConcessionRules(concessionRules.filter((r) => r.id !== ruleId));
      setRuleSuccessMsg(`Rule "${ruleName}" deleted.`);
      setTimeout(() => setRuleSuccessMsg(null), 3000);
    }
  };

  const handleToggleRuleStatus = (ruleId: string) => {
    const updated = concessionRules.map((r) =>
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    );
    onUpdateConcessionRules(updated);
  };

  const handlePriorityShift = (ruleId: string, direction: 'up' | 'down') => {
    // Clone immutably
    const sorted = concessionRules
      .map((r) => ({ ...r }))
      .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

    const index = sorted.findIndex((r) => r.id === ruleId);
    if (index < 0) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap elements cleanly
    const temp = sorted[index];
    sorted[index] = sorted[targetIndex];
    sorted[targetIndex] = temp;

    // Re-index priorities 1..N
    const reindexed = sorted.map((r, i) => ({ ...r, priority: i + 1 }));
    onUpdateConcessionRules(reindexed);
  };

  // Filtered Rules
  const filteredRules = concessionRules
    .filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.criteriaField.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction =
        filterAction === 'ALL' || r.action === filterAction;

      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && r.isActive) ||
        (filterStatus === 'INACTIVE' && !r.isActive);

      return matchesSearch && matchesAction && matchesStatus;
    })
    .sort((a, b) => a.priority - b.priority);

  // Statistics
  const totalActiveRules = concessionRules.filter((r) => r.isActive).length;
  const activeConcessionsCount = concessionRules.filter((r) => r.isActive && r.action === 'Concession').length;
  const activeSurchargesCount = concessionRules.filter((r) => r.isActive && r.action === 'Surcharge').length;
  const totalImpactedStudents = students.filter((stu) =>
    concessionRules.some((r) => r.isActive && countMatchingStudents(r) > 0)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Percent className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Statutory Concession & Surcharge Rules Engine
              </h2>
              <p className="text-xs text-slate-500">
                Configure parameter-driven fee concessions, merit waivers, state quotas & statutory surcharges for student cohorts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onApplyRulesToStudents && (
            <button
              type="button"
              onClick={() => {
                onApplyRulesToStudents();
                setRuleSuccessMsg('Concession and surcharge rules recalculated across all enrolled student ledgers!');
                setTimeout(() => setRuleSuccessMsg(null), 4000);
              }}
              className="min-h-[40px] px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Recalculate active fee waivers and surcharges for all students"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Recalculate All Student Ledgers</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setRuleForm({
                name: '',
                code: `RULE-${Date.now().toString().slice(-4)}`,
                description: '',
                action: 'Concession',
                calculationMode: 'Percentage',
                value: 20,
                targetHeadId: 'ALL_TUITION',
                criteriaField: 'gender',
                criteriaOperator: 'equals',
                criteriaValue: 'Female',
                isActive: true,
                priority: concessionRules.length + 1,
              });
              setEditingRule(null);
              setIsAddRuleOpen(true);
            }}
            className="min-h-[40px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Define New Rule</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {ruleSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{ruleSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setRuleSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
            Total Rules
          </span>
          <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
            {concessionRules.length}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {totalActiveRules} active in registry
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
            Active Concessions
          </span>
          <span className="text-xl font-black text-emerald-700 font-mono mt-0.5 block">
            {activeConcessionsCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Tuition waivers & relief
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">
            Active Surcharges
          </span>
          <span className="text-xl font-black text-amber-700 font-mono mt-0.5 block">
            {activeSurchargesCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Statutory & domicile fees
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">
            Students Impacted
          </span>
          <span className="text-xl font-black text-indigo-700 font-mono mt-0.5 block">
            {totalImpactedStudents}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across active student body
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search rules by name, authority order, code, or criteria field..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Action Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterAction('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterAction === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('Concession')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterAction === 'Concession' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Concessions
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('Surcharge')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterAction === 'Surcharge' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Surcharges
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as string)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Rules List / Empty State */}
      {filteredRules.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Percent className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Rules Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? `No concession or surcharge rules match your search "${searchQuery}".`
              : 'No policy rules configured yet. Create a waiver rule to grant statutory discounts to specific cohorts.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterAction('ALL');
                setFilterStatus('ALL');
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRules.map((rule, idx) => {
            const matchedCount = countMatchingStudents(rule);
            const isConcession = rule.action === 'Concession';
            const percentOfStudents = Math.round((matchedCount / (students.length || 1)) * 100);

            return (
              <div
                key={rule.id}
                className={`p-4 rounded-2xl border bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  rule.isActive
                    ? isConcession
                      ? 'border-emerald-200 hover:border-emerald-400'
                      : 'border-amber-200 hover:border-amber-400'
                    : 'border-slate-200 bg-slate-50/50 opacity-75'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                        isConcession
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {rule.action} · {rule.calculationMode === 'Percentage' ? `${rule.value}%` : `₹${rule.value.toLocaleString('en-IN')}`}
                    </span>
                    <span className="font-mono text-slate-400 font-semibold text-[11px]">
                      #{rule.code}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Priority {rule.priority}
                    </span>
                    {!rule.isActive && (
                      <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-bold uppercase">
                        Deactivated
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">
                    {rule.name}
                  </h3>

                  {rule.description && (
                    <p className="text-xs text-slate-500">
                      {rule.description}
                    </p>
                  )}

                  {/* Criteria Formula Block */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-700 pt-1 font-mono">
                    <span className="text-slate-400 font-sans font-semibold">IF</span>
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-bold text-slate-800">
                      {rule.criteriaField}
                    </span>
                    <span className="text-indigo-700 font-bold">
                      {rule.criteriaOperator}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded font-bold text-indigo-900">
                      {Array.isArray(rule.criteriaValue) ? rule.criteriaValue.join(', ') : String(rule.criteriaValue)}
                    </span>
                    <span className="text-slate-400 font-sans font-semibold">THEN</span>
                    <span className="font-bold text-slate-800">
                      {rule.action} {rule.calculationMode === 'Percentage' ? `${rule.value}%` : `₹${rule.value.toLocaleString('en-IN')}`} on{' '}
                      <span className="underline decoration-slate-300">{rule.targetHeadId}</span>
                    </span>
                  </div>
                </div>

                {/* Right Column: Impact & Actions */}
                <div className="flex items-center gap-4 self-end md:self-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">
                      Cohort Impact
                    </span>
                    <span className="font-bold font-mono text-emerald-800 text-sm">
                      {matchedCount} students ({percentOfStudents}%)
                    </span>
                  </div>

                  {/* Priority reordering controls */}
                  <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handlePriorityShift(rule.id, 'up')}
                      className="p-1 text-slate-600 hover:text-indigo-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      title="Move Priority Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === filteredRules.length - 1}
                      onClick={() => handlePriorityShift(rule.id, 'down')}
                      className="p-1 text-slate-600 hover:text-indigo-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      title="Move Priority Down"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Toggle Active status */}
                  <button
                    type="button"
                    onClick={() => handleToggleRuleStatus(rule.id)}
                    className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      rule.isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                    title={rule.isActive ? 'Click to deactivate rule' : 'Click to activate rule'}
                  >
                    {rule.isActive ? 'Active' : 'Disabled'}
                  </button>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRule(rule);
                        setRuleForm({ ...rule });
                        setIsAddRuleOpen(false);
                      }}
                      className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Rule"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id, rule.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT CONCESSION OR SURCHARGE RULE */}
      {/* ============================================================== */}
      {(isAddRuleOpen || editingRule) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs max-h-[90vh] overflow-y-auto my-auto flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Percent className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingRule ? `Modify Rule: ${editingRule.name}` : 'Create Parameter Concession / Surcharge Rule'}
                  </h3>
                  <span className="text-[11px] text-slate-500">Statutory institutional waiver policy configuration</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddRuleOpen(false);
                  setEditingRule(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Rule Title / Scheme Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kanya Shiksha 20% Tuition Relief (Female Students)"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Action Type *</label>
                  <select
                    value={ruleForm.action}
                    onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value as string })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-semibold text-xs cursor-pointer"
                  >
                    <option value="Concession">Concession (Waiver / Discount)</option>
                    <option value="Surcharge">Surcharge (Fee Addition)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Calculation Mode</label>
                  <select
                    value={ruleForm.calculationMode}
                    onChange={(e) => setRuleForm({ ...ruleForm, calculationMode: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-semibold text-xs cursor-pointer"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Value ({ruleForm.calculationMode === 'Percentage' ? '%' : '₹'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={ruleForm.value}
                    onChange={(e) => setRuleForm({ ...ruleForm, value: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Target Application Head</label>
                  <select
                    value={ruleForm.targetHeadId}
                    onChange={(e) => setRuleForm({ ...ruleForm, targetHeadId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white text-xs cursor-pointer"
                  >
                    <option value="ALL_TUITION">All Tuition Fee Heads</option>
                    <option value="TOTAL_FEE">Total Final Fee</option>
                    {feeHeads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} (₹{h.amount})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Trigger Condition Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="font-bold text-slate-800 block text-xs">
                  Trigger Parameter Condition (IF):
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-500 text-[10px] font-semibold block mb-1">Field</label>
                    <select
                      value={ruleForm.criteriaField}
                      onChange={(e) => setRuleForm({ ...ruleForm, criteriaField: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                    >
                      <option value="gender">Gender</option>
                      <option value="caste_category">Caste Category</option>
                      <option value="quota">Admission Quota</option>
                      <option value="domicile_state">Domicile State</option>
                      <option value="annual_income">Family Annual Income</option>
                      <option value="sports_quota">Sports Quota</option>
                      {enrollmentFields
                        .filter((f) => !['gender', 'caste_category', 'domicile_state', 'annual_income', 'sports_quota'].includes(f.key))
                        .map((f) => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 text-[10px] font-semibold block mb-1">Operator</label>
                    <select
                      value={ruleForm.criteriaOperator}
                      onChange={(e) => setRuleForm({ ...ruleForm, criteriaOperator: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Does Not Equal</option>
                      <option value="in_list">In List (comma separated)</option>
                      <option value="less_than">Less Than (&lt;)</option>
                      <option value="greater_than">Greater Than (&gt;)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 text-[10px] font-semibold block mb-1">Criteria Value</label>
                    <input
                      type="text"
                      placeholder="e.g. Female, SC,ST, 150000"
                      value={Array.isArray(ruleForm.criteriaValue) ? ruleForm.criteriaValue.join(',') : String(ruleForm.criteriaValue || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (ruleForm.criteriaOperator === 'in_list') {
                          setRuleForm({ ...ruleForm, criteriaValue: val.split(',').map((v) => v.trim()) });
                        } else {
                          setRuleForm({ ...ruleForm, criteriaValue: val });
                        }
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                    />
                  </div>
                </div>

                {/* Real-time simulation within modal */}
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px] text-emerald-900">
                  <span className="font-semibold">Matching Students Preview:</span>
                  <span className="font-bold font-mono text-emerald-800">
                    {countMatchingStudents(ruleForm)} of {students.length} students qualify ({Math.round((countMatchingStudents(ruleForm) / (students.length || 1)) * 100)}%)
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Policy Description / Authority Order</label>
                <input
                  type="text"
                  placeholder="e.g. State Cabinet Resolution No. 492/2025 (Kanya Utthan Scheme)"
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddRuleOpen(false);
                    setEditingRule(null);
                  }}
                  className="min-h-[40px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {editingRule ? 'Save Rule Changes' : 'Activate Policy Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
