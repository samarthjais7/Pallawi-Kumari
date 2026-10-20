import React, { useState, useRef } from 'react';
import { EnrollmentField, FieldType, UserSession } from '../../types/fee';
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Lock,
  Layers,
  HelpCircle,
  Sparkles,
  ArrowUpDown,
  FileText
} from 'lucide-react';

interface Props {
  fields: EnrollmentField[];
  onUpdateFields: (fields: EnrollmentField[]) => void;
  currentSession: UserSession | null;
}

export const EnrollmentParameterOptimizer: React.FC<Props> = ({
  fields,
  onUpdateFields,
  currentSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterMandatory, setFilterMandatory] = useState<'ALL' | 'MANDATORY' | 'OPTIONAL' | 'PRE_LOGIN'>('ALL');
  const [activeView, setActiveView] = useState<'manager' | 'preview'>('manager');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EnrollmentField | null>(null);

  // Form State
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formType, setFormType] = useState<FieldType>('text');
  const [formOptionsInput, setFormOptionsInput] = useState('');
  const [formPlaceholder, setFormPlaceholder] = useState('');
  const [formHelpText, setFormHelpText] = useState('');
  const [formCategory, setFormCategory] = useState<EnrollmentField['category']>('Personal');
  const [formIsRequired, setFormIsRequired] = useState(false);
  const [formMandatoryBeforeLogin, setFormMandatoryBeforeLogin] = useState(false);
  const [formIsBillable, setFormIsBillable] = useState(false);
  const [formBillableAmount, setFormBillableAmount] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<EnrollmentField | null>(null);

  const categories: ('ALL' | EnrollmentField['category'])[] = [
    'ALL',
    'Personal',
    'Academic',
    'Category_Quota',
    'Hostel_Transport',
    'Financial',
  ];

  const handleOpenAddModal = () => {
    setEditingField(null);
    setFormKey('');
    setFormLabel('');
    setFormType('text');
    setFormOptionsInput('');
    setFormPlaceholder('');
    setFormHelpText('');
    setFormCategory('Personal');
    setFormIsRequired(false);
    setFormMandatoryBeforeLogin(false);
    setFormIsBillable(false);
    setFormBillableAmount(0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (field: EnrollmentField) => {
    setEditingField(field);
    setFormKey(field.key);
    setFormLabel(field.label);
    setFormType(field.type);
    setFormOptionsInput(field.options ? field.options.join(', ') : '');
    setFormPlaceholder(field.placeholder || '');
    setFormHelpText(field.helpText || '');
    setFormCategory(field.category);
    setFormIsRequired(field.isRequired);
    setFormMandatoryBeforeLogin(Boolean(field.mandatoryBeforeLogin));
    setFormIsBillable(Boolean(field.isBillable));
    setFormBillableAmount(field.billableAmount || 0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      setFormError('Please enter a display label for this enrollment parameter.');
      return;
    }

    const generatedKey = formKey.trim()
      ? formKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : formLabel.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Check duplicate key
    const duplicate = fields.find(
      (f) => f.key === generatedKey && (!editingField || f.id !== editingField.id)
    );
    if (duplicate) {
      setFormError(`A parameter with key "${generatedKey}" already exists. Please pick a distinct identifier.`);
      return;
    }

    const parsedOptions = formType === 'select'
      ? formOptionsInput.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    if (formType === 'select' && (!parsedOptions || parsedOptions.length === 0)) {
      setFormError('Dropdown Select parameters must specify at least one option.');
      return;
    }

    if (editingField) {
      const updatedList = fields.map((f) => {
        if (f.id === editingField.id) {
          return {
            ...f,
            key: generatedKey,
            label: formLabel.trim(),
            type: formType,
            options: parsedOptions,
            placeholder: formPlaceholder.trim() || undefined,
            helpText: formHelpText.trim() || undefined,
            category: formCategory,
            isRequired: formIsRequired,
            mandatoryBeforeLogin: formMandatoryBeforeLogin,
            isBillable: formIsBillable,
            billableAmount: formIsBillable ? Number(formBillableAmount) || 0 : undefined,
          };
        }
        return f;
      });
      onUpdateFields(updatedList);
    } else {
      const newField: EnrollmentField = {
        id: `fld-${Date.now().toString().slice(-6)}`,
        key: generatedKey,
        label: formLabel.trim(),
        type: formType,
        options: parsedOptions,
        placeholder: formPlaceholder.trim() || undefined,
        helpText: formHelpText.trim() || undefined,
        category: formCategory,
        isRequired: formIsRequired,
        mandatoryBeforeLogin: formMandatoryBeforeLogin,
        isSystemField: false,
        isActive: true,
        isBillable: formIsBillable,
        billableAmount: formIsBillable ? Number(formBillableAmount) || 0 : undefined,
      };
      onUpdateFields([...fields, newField]);
    }

    setIsModalOpen(false);
  };

  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const handleToggleRequired = (fieldId: string) => {
    const updated = fieldsRef.current.map((f) => {
      if (f.id === fieldId) {
        const nextRequired = !f.isRequired;
        return {
          ...f,
          isRequired: nextRequired,
          // If made optional, cannot remain mandatory before login
          mandatoryBeforeLogin: nextRequired ? f.mandatoryBeforeLogin : false,
        };
      }
      return f;
    });
    fieldsRef.current = updated;
    onUpdateFields(updated);
  };

  const handleTogglePreLogin = (fieldId: string) => {
    const updated = fieldsRef.current.map((f) => {
      if (f.id === fieldId) {
        const nextPreLogin = !f.mandatoryBeforeLogin;
        return {
          ...f,
          mandatoryBeforeLogin: nextPreLogin,
          // If mandatory before login, must automatically be required
          isRequired: nextPreLogin ? true : f.isRequired,
        };
      }
      return f;
    });
    fieldsRef.current = updated;
    onUpdateFields(updated);
  };

  const handleToggleActive = (fieldId: string) => {
    const updated = fieldsRef.current.map((f) => (f.id === fieldId ? { ...f, isActive: !f.isActive } : f));
    fieldsRef.current = updated;
    onUpdateFields(updated);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    if (deleteTarget.isSystemField) {
      setDeleteTarget(null);
      return;
    }
    // Archive custom key so existing students with stored data keys are preserved
    const updated = fields.map((f) =>
      f.id === deleteTarget.id
        ? { ...f, isActive: false, isArchived: true, label: `${f.label} (Archived)` }
        : f
    );
    onUpdateFields(updated);
    setDeleteTarget(null);
  };

  // Filtered fields (hide archived custom parameters from active builder)
  const filteredFields = fields.filter((f) => {
    if (f.isArchived) return false;
    const matchesSearch =
      f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || f.category === selectedCategory;
    const matchesMandatory =
      filterMandatory === 'ALL' ||
      (filterMandatory === 'MANDATORY' && f.isRequired) ||
      (filterMandatory === 'OPTIONAL' && !f.isRequired) ||
      (filterMandatory === 'PRE_LOGIN' && f.mandatoryBeforeLogin);
    return matchesSearch && matchesCategory && matchesMandatory;
  });

  const mandatoryCount = fields.filter((f) => f.isRequired).length;
  const preLoginCount = fields.filter((f) => f.mandatoryBeforeLogin).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Admin & Accountant Console</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">Dynamic Form Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Enrollment Form Parameter Optimizer
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Define, customize, and optimize admission and student enrollment parameters. Toggle fields as Mandatory or Optional, configure fields that must be mandatorily captured before login, and customize real-time validations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center min-w-[90px]">
              <span className="block text-2xl font-black font-mono text-indigo-300">{fields.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Total Fields</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center min-w-[90px]">
              <span className="block text-2xl font-black font-mono text-amber-300">{mandatoryCount}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Mandatory</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center min-w-[90px]">
              <span className="block text-2xl font-black font-mono text-emerald-300">{preLoginCount}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Pre-Login Gate</span>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Parameter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation View Switcher (Manager vs Live Preview) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('manager')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeView === 'manager'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parameters Manager & Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('preview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeView === 'preview'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Student Form Preview & Testing</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Logged in: <strong className="text-slate-700">{currentSession?.name}</strong> ({currentSession?.staffRole || 'Authorized Officer'})
        </span>
      </div>

      {activeView === 'manager' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search parameters by label or database key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterMandatory('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterMandatory === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({fields.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMandatory('MANDATORY')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterMandatory === 'MANDATORY' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mandatory ({mandatoryCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMandatory('PRE_LOGIN')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterMandatory === 'PRE_LOGIN' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pre-Login Gate ({preLoginCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMandatory('OPTIONAL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterMandatory === 'OPTIONAL' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Optional
                </button>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Parameters Cards & Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Parameter Name & Label</th>
                    <th className="py-3.5 px-4">Key / Type</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Mandatory vs Optional</th>
                    <th className="py-3.5 px-4 text-center">Mandatory Before Login</th>
                    <th className="py-3.5 px-4 text-center">Active Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredFields.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-semibold">No enrollment parameters match your filter.</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting the search query or category tabs.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredFields.map((field) => (
                      <tr key={field.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Label */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="font-bold text-slate-900 block text-xs">{field.label}</span>
                              {field.helpText && (
                                <span className="text-[10px] text-slate-400 block line-clamp-1">{field.helpText}</span>
                              )}
                              {field.isBillable && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Fee Tagged: ₹{field.billableAmount?.toLocaleString('en-IN') || 0}
                                </span>
                              )}
                            </div>
                            {field.isSystemField && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200" title="Core Institutional Field">
                                Core
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Key & Type */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                          <div>
                            <span className="text-indigo-700 font-semibold">{field.key}</span>
                            <span className="text-[10px] text-slate-400 block font-sans">
                              {field.type.toUpperCase()}{field.options ? ` (${field.options.length} options)` : ''}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {field.category.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Mandatory / Optional Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRequired(field.id)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                              field.isRequired
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {field.isRequired ? 'Mandatory' : 'Optional'}
                          </button>
                        </td>

                        {/* Mandatory Before Login Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePreLogin(field.id)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 mx-auto cursor-pointer ${
                              field.mandatoryBeforeLogin
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 hover:text-slate-600'
                            }`}
                            title={field.mandatoryBeforeLogin ? 'Student MUST complete this field before login access' : 'Field not required before login'}
                          >
                            <ShieldAlert className={`w-3.5 h-3.5 ${field.mandatoryBeforeLogin ? 'text-emerald-700' : 'text-slate-400'}`} />
                            <span>{field.mandatoryBeforeLogin ? 'Required Pre-Login' : 'Standard'}</span>
                          </button>
                        </td>

                        {/* Active Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(field.id)}
                            className={`w-7 h-4 rounded-full transition-colors relative inline-block cursor-pointer ${
                              field.isActive ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                                field.isActive ? 'translate-x-3' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(field)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Modify / Customize Parameter"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => !field.isSystemField && setDeleteTarget(field)}
                              disabled={field.isSystemField}
                              className={`p-1.5 rounded-lg transition-colors ${
                                field.isSystemField
                                  ? 'text-slate-300 cursor-not-allowed opacity-50'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                              }`}
                              title={
                                field.isSystemField
                                  ? 'System-critical parameters cannot be deleted'
                                  : 'Archive / Remove Custom Parameter'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Live Form Preview View */}
      {activeView === 'preview' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Interactive Dynamic Render
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Student Enrollment Form Simulation</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                This shows the active enrollment form exactly as prospective or logged-in students experience it.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Active Fields Rendered: <strong>{fields.filter((f) => f.isActive).length}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields
              .filter((f) => f.isActive)
              .map((field) => (
                <div key={field.id} className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <span>{field.label}</span>
                      {field.isRequired && <span className="text-rose-600 font-black">*</span>}
                    </label>
                    <div className="flex items-center gap-1">
                      {field.mandatoryBeforeLogin && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                          <ShieldAlert className="w-2.5 h-2.5" />
                          <span>Pre-Login Required</span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">{field.key}</span>
                    </div>
                  </div>

                  {field.type === 'select' ? (
                    <select
                      disabled
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed opacity-90"
                    >
                      <option value="">-- Choose {field.label} --</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center gap-2 py-1">
                      <input type="checkbox" disabled className="w-4 h-4 rounded text-indigo-600 cursor-not-allowed" />
                      <span className="text-xs text-slate-600">{field.placeholder || `Check if ${field.label} applies`}</span>
                    </div>
                  ) : field.type === 'date' ? (
                    <input
                      type="date"
                      disabled
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed opacity-90"
                    />
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      disabled
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed opacity-90"
                    />
                  )}

                  {field.helpText && (
                    <p className="text-[10px] text-slate-400 italic">{field.helpText}</p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modal: Add or Modify Parameter */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 my-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {editingField ? 'Modify Parameter' : 'New Enrollment Field'}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {editingField ? `Customize: ${editingField.label}` : 'Create Enrollment Form Parameter'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveField} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Parameter Display Label <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Domicile Certificate Number, Blood Group, Hostel Requirement"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Database Field Key</label>
                  <input
                    type="text"
                    placeholder="auto-generated or custom"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Field Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as FieldType)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="text">Text Input</option>
                    <option value="number">Numeric</option>
                    <option value="select">Dropdown Select</option>
                    <option value="date">Date Picker</option>
                    <option value="checkbox">Checkbox (Yes/No)</option>
                  </select>
                </div>
              </div>

              {formType === 'select' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Dropdown Options (comma separated) <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Day Scholar, College Hostel, Private PG"
                    value={formOptionsInput}
                    onChange={(e) => setFormOptionsInput(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category Classification</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as string)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Personal">Personal Details</option>
                    <option value="Academic">Academic Curriculum</option>
                    <option value="Category_Quota">Social Category & Quota</option>
                    <option value="Hostel_Transport">Hostel & Campus Facilities</option>
                    <option value="Financial">Financial & Bank Info</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Input Placeholder</label>
                  <input
                    type="text"
                    placeholder="e.g. Enter certificate serial..."
                    value={formPlaceholder}
                    onChange={(e) => setFormPlaceholder(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Help / Guidance Citation</label>
                <input
                  type="text"
                  placeholder="e.g. As stated in your official government domicile verification slip"
                  value={formHelpText}
                  onChange={(e) => setFormHelpText(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Switches: Mandatory, Mandatory Before Login */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Mark as Mandatory Field</span>
                    <span className="text-[11px] text-slate-500">Student cannot submit enrollment without completing this.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsRequired}
                    onChange={(e) => {
                      setFormIsRequired(e.target.checked);
                      if (!e.target.checked) setFormMandatoryBeforeLogin(false);
                    }}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                  <div>
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Mandatorily Obtained Before Login</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      If missing upon login, student portal displays banner prompt to complete before full access.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formMandatoryBeforeLogin}
                    onChange={(e) => {
                      setFormMandatoryBeforeLogin(e.target.checked);
                      if (e.target.checked) setFormIsRequired(true);
                    }}
                    className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                  <div>
                    <span className="font-bold text-slate-800 block">Attach Custom Billable Fee</span>
                    <span className="text-[11px] text-slate-500">Attach automatic service or lab charge when opted.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsBillable}
                    onChange={(e) => setFormIsBillable(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                {formIsBillable && (
                  <div className="pt-2">
                    <label className="font-bold text-slate-700 block mb-1">Billable Amount (₹)</label>
                    <input
                      type="number"
                      value={formBillableAmount}
                      onChange={(e) => setFormBillableAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {editingField ? 'Save Changes' : 'Create Parameter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete / Archive Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                deleteTarget.isSystemField ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {deleteTarget.isSystemField ? <ShieldAlert className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">
                {deleteTarget.isSystemField ? 'System-Critical Parameter' : 'Archive Parameter?'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {deleteTarget.isSystemField ? (
                  <>
                    Parameter <strong>"{deleteTarget.label}"</strong> ({deleteTarget.key}) is required for core institutional workflows and student authentication. It cannot be deleted.
                  </>
                ) : (
                  <>
                    Are you sure you want to archive parameter <strong>"{deleteTarget.label}"</strong> ({deleteTarget.key})? The field will be deactivated and archived, safely preserving all historical student enrollment attributes.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-xs"
              >
                {deleteTarget.isSystemField ? 'Understood' : 'Keep Parameter'}
              </button>
              {!deleteTarget.isSystemField && (
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md text-xs cursor-pointer"
                >
                  Yes, Archive
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
