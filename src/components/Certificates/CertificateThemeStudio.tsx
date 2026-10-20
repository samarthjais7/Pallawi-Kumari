import React, { useState } from 'react';
import { 
  CertificateTheme, 
  CertificateType, 
  CertificateBorderPattern, 
  CertificateFontFamily, 
  CertificateSealType, 
  SchoolStaffUser, 
  UserSession 
} from '../../types/fee';
import { INSTITUTION_INFO } from '../../data/mockData';
import { safeConfirm, safeMatchStrings, safeLower } from '../../utils/safeHelpers';
import { 
  Palette, 
  Plus, 
  Check, 
  Edit3, 
  Trash2, 
  Copy, 
  Printer, 
  ShieldCheck, 
  Award, 
  Sparkles, 
  Sliders, 
  Eye, 
  Building, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw,
  QrCode,
  FileText
} from 'lucide-react';

interface Props {
  themes: CertificateTheme[];
  currentSession: UserSession | null;
  staffUsers: SchoolStaffUser[];
  onSaveTheme: (theme: CertificateTheme) => void;
  onDeleteTheme: (themeId: string) => void;
  onSetDefaultTheme: (themeId: string, certType: CertificateType | 'All') => void;
  onNavigateToServiceMapping?: () => void;
}

const PRESET_PRIMARY_COLORS = [
  { name: 'Royal Navy', value: '#1e3a8a' },
  { name: 'Imperial Emerald', value: '#065f46' },
  { name: 'Burgundy Crimson', value: '#831843' },
  { name: 'Antique Slate', value: '#0f172a' },
  { name: 'Heritage Indigo', value: '#3730a3' },
  { name: 'Deep Bronze', value: '#78350f' },
  { name: 'Classic Black', value: '#18181b' },
];

const PRESET_ACCENT_COLORS = [
  { name: 'Metallic Gold', value: '#d97706' },
  { name: 'Radiant Amber', value: '#f59e0b' },
  { name: 'Platinum Silver', value: '#94a3b8' },
  { name: 'Imperial Bronze', value: '#b45309' },
  { name: 'Emerald Trim', value: '#10b981' },
  { name: 'Royal Ruby', value: '#e11d48' },
];

const PRESET_BG_COLORS = [
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Ivory Linen', value: '#fffbeb' },
  { name: 'Soft Cream', value: '#fefce8' },
  { name: 'Pale Mint Tint', value: '#f0fdf4' },
  { name: 'Subtle Slate', value: '#f8fafc' },
];

const CERTIFICATE_TYPES: (CertificateType | 'All')[] = [
  'All',
  'Bonafide Certificate',
  'Transfer Certificate (TC) & Character',
  'Migration Certificate',
  'Provisional Passing Certificate',
  'No Dues Clearance Certificate',
];

export const CertificateThemeStudio: React.FC<Props> = ({
  themes,
  currentSession,
  staffUsers,
  onSaveTheme,
  onDeleteTheme,
  onSetDefaultTheme,
  onNavigateToServiceMapping,
}) => {
  // Check if current user is authorized to create/manage themes:
  // Root App_Admin or any staff mapped by the administrator with canManageCertificateThemes === true
  const currentStaff = staffUsers.find(
    (u) => safeMatchStrings(u.email, currentSession?.emailOrPhone) || (Boolean(currentSession?.id) && u.id === currentSession?.id)
  );
  
  const isAuthorized = Boolean(
    currentSession?.isAppAdmin ||
    currentSession?.canManageCertificateThemes ||
    currentStaff?.canManageCertificateThemes ||
    currentSession?.role === 'admin' && (currentSession.staffRole === 'App_Admin' || currentStaff?.canManageCertificateThemes)
  );

  const [activeTab, setActiveTab] = useState<'gallery' | 'designer'>('gallery');
  const [selectedThemeId, setSelectedThemeId] = useState<string>(themes[0]?.id || 'theme-royal-gold');
  const [filterCertType, setFilterCertType] = useState<string>('All');
  
  // Preview certificate sample selector
  const [previewCertType, setPreviewCertType] = useState<CertificateType>('Bonafide Certificate');

  // Theme Form Editor state
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [themeForm, setThemeForm] = useState<CertificateTheme>({
    id: '',
    name: 'New Custom Certificate Theme',
    description: 'Custom institutional certificate template designed for official academic credentials.',
    certificateType: 'All',
    isDefault: false,
    borderPattern: 'royal-filigree',
    primaryBorderColor: '#1e3a8a',
    accentColor: '#d97706',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    fontFamily: 'font-serif',
    watermarkText: 'RLSY COLLEGE PATNA',
    watermarkOpacity: 0.08,
    sealType: 'gold-foil',
    sealPosition: 'bottom-right',
    showQrCode: true,
    headerStyle: 'classic-centered',
    customTitlePrefix: 'GOVERNMENT OF BIHAR · HIGHER EDUCATION DEPARTMENT',
    footerMotto: 'तमसो मा ज्योतिर्गमय · Lead Us From Darkness To Light',
    signatories: {
      primaryTitle: 'Principal & DDO (Executive Sign-Off)',
      secondaryTitle: 'Controller of Examinations',
      tertiaryTitle: 'Head of Department'
    },
    createdAt: new Date().toISOString().split('T')[0]
  });

  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Active theme being previewed in gallery
  const activePreviewTheme = themes.find((t) => t.id === selectedThemeId) || themes[0] || themeForm;

  const handleStartCreateNew = () => {
    const newId = `theme-${Date.now().toString().slice(-6)}`;
    setEditingThemeId(null);
    setThemeForm({
      id: newId,
      name: `Custom Theme #${themes.length + 1}`,
      description: 'Institutional certificate style crafted by authorized campus staff.',
      certificateType: 'All',
      isDefault: false,
      borderPattern: 'royal-filigree',
      primaryBorderColor: '#1e3a8a',
      accentColor: '#d97706',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      fontFamily: 'font-serif',
      watermarkText: 'RLSY COLLEGE PATNA',
      watermarkOpacity: 0.08,
      sealType: 'gold-foil',
      sealPosition: 'bottom-right',
      showQrCode: true,
      headerStyle: 'classic-centered',
      customTitlePrefix: 'GOVERNMENT OF BIHAR · HIGHER EDUCATION DEPARTMENT',
      footerMotto: 'तमसो मा ज्योतिर्गमय · Lead Us From Darkness To Light',
      signatories: {
        primaryTitle: 'Principal & DDO (Executive Sign-Off)',
        secondaryTitle: 'Controller of Examinations',
        tertiaryTitle: 'Head of Department'
      },
      createdByStaffId: currentSession?.id,
      createdByStaffName: currentSession?.name,
      createdAt: new Date().toISOString().split('T')[0]
    });
    setActiveTab('designer');
  };

  const handleStartEdit = (theme: CertificateTheme) => {
    setEditingThemeId(theme.id);
    setThemeForm({ ...theme });
    setActiveTab('designer');
  };

  const handleCloneTheme = (theme: CertificateTheme) => {
    const newId = `theme-${Date.now().toString().slice(-6)}`;
    const cloned: CertificateTheme = {
      ...theme,
      id: newId,
      name: `${theme.name} (Copy)`,
      isDefault: false,
      createdByStaffId: currentSession?.id,
      createdByStaffName: currentSession?.name,
      createdAt: new Date().toISOString().split('T')[0]
    };
    onSaveTheme(cloned);
    setSelectedThemeId(newId);
    setSaveSuccessNotice(`Theme cloned as "${cloned.name}" successfully!`);
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeForm.name.trim()) return;

    const finalized: CertificateTheme = {
      ...themeForm,
      id: editingThemeId || themeForm.id || `theme-${Date.now().toString().slice(-6)}`,
      updatedAt: new Date().toISOString().split('T')[0],
      createdByStaffId: themeForm.createdByStaffId || currentSession?.id,
      createdByStaffName: themeForm.createdByStaffName || currentSession?.name || 'Staff User',
    };

    onSaveTheme(finalized);
    setSelectedThemeId(finalized.id);
    setSaveSuccessNotice(`Certificate Theme "${finalized.name}" saved successfully!`);
    setTimeout(() => setSaveSuccessNotice(null), 3500);
    setActiveTab('gallery');
  };

  const filteredThemes = themes.filter((t) => {
    if (filterCertType === 'All') return true;
    return t.certificateType === 'All' || t.certificateType === filterCertType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-2">
              <Award className="w-3.5 h-3.5" />
              <span>Official Institutional Certification Studio</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Certificate Theme Designer</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Design, customize, and publish ceremonial borders, state seals, gold-foil typography, and statutory watermark templates for Government College Degree and Clearance Certificates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isAuthorized ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('gallery')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'gallery'
                      ? 'bg-white text-slate-950 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>Themes Gallery ({themes.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartCreateNew}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Theme</span>
                </button>
              </>
            ) : (
              <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Service privilege restricted to mapped users</span>
              </div>
            )}
          </div>
        </div>

        {/* Access Status Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Your Authorization Status:</span>
            {isAuthorized ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-600/40 text-emerald-300 font-bold">
                <CheckCircle2 className="w-3 h-3" />
                <span>Mapped to Certificate Theme Service</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-900/60 border border-amber-600/40 text-amber-300 font-bold">
                <AlertCircle className="w-3 h-3" />
                <span>Unmapped (Administrator Mapping Required)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span>Service Governance:</span>
            <span className="font-mono text-amber-300">Administrator-Mapped Privilege</span>
            {currentSession?.isAppAdmin && onNavigateToServiceMapping && (
              <button
                type="button"
                onClick={onNavigateToServiceMapping}
                className="underline hover:text-white font-bold ml-1 cursor-pointer"
              >
                Manage Staff Mappings →
              </button>
            )}
          </div>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* ACCESS RESTRICTION NOTICE FOR UNMAPPED USERS */}
      {/* ============================================================== */}
      {!isAuthorized && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-amber-300 p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-slate-900">
              Institutional Service Mapping Required
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Under institutional security policy, only school staff members mapped to the <strong>Certificate Theme Service</strong> by the Administrator have rights to create, modify, or publish official certificate themes.
            </p>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-950 space-y-1 mt-3">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>How to get mapped to this service?</span>
              </div>
              <p className="text-[11px] text-amber-900">
                Contact your Institutional ERP Administrator. The administrator can grant your staff account the &quot;Certificate Theme Designer&quot; service right with 1-click in the <strong>School User Directory → Service Mapping</strong> console.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Browse Active Themes (View-Only)
            </button>
            {currentSession?.isAppAdmin && onNavigateToServiceMapping && (
              <button
                type="button"
                onClick={onNavigateToServiceMapping}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow"
              >
                Go to Service Mapping Console
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. THEMES GALLERY & LIVE PREVIEW VIEW */}
      {/* ============================================================== */}
      {activeTab === 'gallery' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Theme Cards List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Theme Templates</h3>
                  <p className="text-[11px] text-slate-500">Select a theme to inspect live rendering</p>
                </div>
                {isAuthorized && (
                  <button
                    type="button"
                    onClick={handleStartCreateNew}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                )}
              </div>

              {/* Scope Filter */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Filter by Certificate Scope:
                </label>
                <select
                  value={filterCertType}
                  onChange={(e) => setFilterCertType(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white"
                >
                  {CERTIFICATE_TYPES.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of Themes */}
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {filteredThemes.map((theme) => {
                const isSelected = theme.id === selectedThemeId;
                return (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Color swatch preview circle */}
                        <div 
                          className="w-7 h-7 rounded-lg border-2 shadow-xs shrink-0 flex items-center justify-center"
                          style={{ borderColor: theme.primaryBorderColor, backgroundColor: theme.backgroundColor }}
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: theme.accentColor }} 
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-slate-900 text-xs">{theme.name}</h4>
                            {theme.isDefault && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                Default
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Scope: {theme.certificateType}
                          </span>
                        </div>
                      </div>

                      {/* Pattern Badge */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 capitalize">
                        {theme.borderPattern.replace('-', ' ')}
                      </span>
                    </div>

                    {theme.description && (
                      <p className="text-[11px] text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {theme.description}
                      </p>
                    )}

                    {/* Metadata & Actions */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">
                        By {theme.createdByStaffName || 'College Administration'}
                      </span>

                      {isAuthorized && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {!theme.isDefault && (
                            <button
                              type="button"
                              onClick={() => onSetDefaultTheme(theme.id, theme.certificateType)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[10px] cursor-pointer"
                              title="Set as Default Theme"
                            >
                              Make Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCloneTheme(theme)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                            title="Duplicate Theme"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(theme)}
                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded cursor-pointer"
                            title="Edit Theme"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {themes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (safeConfirm(`Are you sure you want to delete the theme "${theme.name}"?`)) {
                                  onDeleteTheme(theme.id);
                                }
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                              title="Delete Theme"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredThemes.length === 0 && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                  No themes found for scope &quot;{filterCertType}&quot;.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Interactive Certificate Rendering Preview */}
          <div className="lg:col-span-7 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Live Certificate Preview:</span>
                <span className="font-semibold text-xs text-indigo-700">{activePreviewTheme.name}</span>
              </div>

              {/* Sample Certificate Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Test Document:</span>
                <select
                  value={previewCertType}
                  onChange={(e) => setPreviewCertType(e.target.value as CertificateType)}
                  className="p-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:bg-white"
                >
                  <option value="Bonafide Certificate">Bonafide Student Certificate</option>
                  <option value="Transfer Certificate (TC) & Character">Transfer Certificate (TC) & Character</option>
                  <option value="Migration Certificate">Inter-University Migration Certificate</option>
                  <option value="Provisional Passing Certificate">Provisional Passing Certificate</option>
                  <option value="No Dues Clearance Certificate">No Dues Clearance Certificate</option>
                </select>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Test Print"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print Test</span>
                </button>
              </div>
            </div>

            {/* The Live Rendered Certificate Canvas */}
            <div className="overflow-x-auto pb-4">
              <CertificateLiveCanvas 
                theme={activePreviewTheme} 
                certType={previewCertType}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. THEME DESIGNER & CUSTOMIZER (FULL STUDIO FORM + LIVE PREVIEW) */}
      {/* ============================================================== */}
      {activeTab === 'designer' && isAuthorized && (
        <form onSubmit={handleSaveForm} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form Controls */}
            <div className="lg:col-span-6 space-y-6">
              {/* Card 1: Theme Identity & Scope */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      1. Theme Identity & Scope
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {themeForm.id || 'NEW'}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Theme Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={themeForm.name}
                    onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                    placeholder="e.g. Royal Heritage Gold & Navy"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Certificate Target Scope *
                    </label>
                    <select
                      value={themeForm.certificateType}
                      onChange={(e) => setThemeForm({ ...themeForm, certificateType: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white"
                    >
                      {CERTIFICATE_TYPES.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={themeForm.isDefault}
                        onChange={(e) => setThemeForm({ ...themeForm, isDefault: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span>Set as Default for this scope</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Theme Description
                  </label>
                  <textarea
                    rows={2}
                    value={themeForm.description || ''}
                    onChange={(e) => setThemeForm({ ...themeForm, description: e.target.value })}
                    placeholder="Brief description of when this ceremonial template should be applied..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white"
                  />
                </div>
              </div>

              {/* Card 2: Border Framing & Palette */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    2. Frame Border & Color Palette
                  </h3>
                </div>

                {/* Border Pattern Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    Border Ornamentation Pattern *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'royal-filigree', label: 'Royal Filigree', desc: 'Corner crests & ornate lining' },
                      { id: 'double-gold', label: 'Double Gold Trim', desc: 'Classical double frame' },
                      { id: 'imperial-triple', label: 'Imperial Triple', desc: 'Multi-tiered heavy border' },
                      { id: 'vintage-guilloche', label: 'Vintage Guilloche', desc: 'Intricate certificate scroll' },
                      { id: 'modern-minimal', label: 'Modern Minimal', desc: 'Clean geometric edges' },
                      { id: 'ornate-crest', label: 'Ornate Crest', desc: 'Embossed heraldic corners' },
                    ].map((bp) => {
                      const isSelected = themeForm.borderPattern === bp.id;
                      return (
                        <button
                          key={bp.id}
                          type="button"
                          onClick={() => setThemeForm({ ...themeForm, borderPattern: bp.id as CertificateBorderPattern })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                              : 'border-slate-200 bg-slate-50 hover:bg-white'
                          }`}
                        >
                          <span className="font-bold text-xs text-slate-900 block">{bp.label}</span>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{bp.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Colors Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Primary Border Color */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Primary Frame Color *
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="color"
                        value={themeForm.primaryBorderColor}
                        onChange={(e) => setThemeForm({ ...themeForm, primaryBorderColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={themeForm.primaryBorderColor}
                        onChange={(e) => setThemeForm({ ...themeForm, primaryBorderColor: e.target.value })}
                        className="w-24 p-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded"
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1">
                      {PRESET_PRIMARY_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setThemeForm({ ...themeForm, primaryBorderColor: c.value })}
                          className="w-5 h-5 rounded-full border border-slate-300 transition-transform hover:scale-110"
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        ></button>
                      ))}
                    </div>
                  </div>

                  {/* Accent / Gold Color */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Accent / Metallic Trim *
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="color"
                        value={themeForm.accentColor}
                        onChange={(e) => setThemeForm({ ...themeForm, accentColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={themeForm.accentColor}
                        onChange={(e) => setThemeForm({ ...themeForm, accentColor: e.target.value })}
                        className="w-24 p-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded"
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1">
                      {PRESET_ACCENT_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setThemeForm({ ...themeForm, accentColor: c.value })}
                          className="w-5 h-5 rounded-full border border-slate-300 transition-transform hover:scale-110"
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        ></button>
                      ))}
                    </div>
                  </div>

                  {/* Canvas Background Tone */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Parchment / Canvas Tone *
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="color"
                        value={themeForm.backgroundColor}
                        onChange={(e) => setThemeForm({ ...themeForm, backgroundColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={themeForm.backgroundColor}
                        onChange={(e) => setThemeForm({ ...themeForm, backgroundColor: e.target.value })}
                        className="w-24 p-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_BG_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setThemeForm({ ...themeForm, backgroundColor: c.value })}
                          className="w-5 h-5 rounded-full border border-slate-400 transition-transform hover:scale-110"
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        ></button>
                      ))}
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Primary Text Color *
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="color"
                        value={themeForm.textColor}
                        onChange={(e) => setThemeForm({ ...themeForm, textColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={themeForm.textColor}
                        onChange={(e) => setThemeForm({ ...themeForm, textColor: e.target.value })}
                        className="w-24 p-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Typography & Institutional Header Layout */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    3. Header Typography & Architecture
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Typography Family *
                    </label>
                    <select
                      value={themeForm.fontFamily}
                      onChange={(e) => setThemeForm({ ...themeForm, fontFamily: e.target.value as CertificateFontFamily })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white"
                    >
                      <option value="font-serif">Classical Garamond Serif</option>
                      <option value="playfair">Formal Playfair Display</option>
                      <option value="cinzel">Cinzel Monumental Roman</option>
                      <option value="font-sans">Modern Academic Sans</option>
                      <option value="font-mono">Official State Monospace</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Header Architecture *
                    </label>
                    <select
                      value={themeForm.headerStyle}
                      onChange={(e) => setThemeForm({ ...themeForm, headerStyle: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white"
                    >
                      <option value="classic-centered">Classic Centered with Dual Badges</option>
                      <option value="ornate-arch">Ornate Arch with Ribbon Border</option>
                      <option value="modern-split">Modern Split with State Seal Left</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Statutory Government Prefix Banner
                  </label>
                  <input
                    type="text"
                    value={themeForm.customTitlePrefix || ''}
                    onChange={(e) => setThemeForm({ ...themeForm, customTitlePrefix: e.target.value })}
                    placeholder="e.g. GOVERNMENT OF BIHAR · HIGHER EDUCATION DEPARTMENT"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Footer Proclamation / Institutional Motto
                  </label>
                  <input
                    type="text"
                    value={themeForm.footerMotto || ''}
                    onChange={(e) => setThemeForm({ ...themeForm, footerMotto: e.target.value })}
                    placeholder="e.g. तमसो मा ज्योतिर्गमय · Lead Us From Darkness To Light"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white"
                  />
                </div>
              </div>

              {/* Card 4: Watermark, Official Seal & Signatories */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    4. Watermark, Official Seal & Endorsements
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Watermark Center Text
                    </label>
                    <input
                      type="text"
                      value={themeForm.watermarkText}
                      onChange={(e) => setThemeForm({ ...themeForm, watermarkText: e.target.value })}
                      placeholder="e.g. RLSY COLLEGE PATNA"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Watermark Opacity: {Math.round(themeForm.watermarkOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.03"
                      max="0.25"
                      step="0.01"
                      value={themeForm.watermarkOpacity}
                      onChange={(e) => setThemeForm({ ...themeForm, watermarkOpacity: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-600 mt-2 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Embossed Seal Type *
                    </label>
                    <select
                      value={themeForm.sealType}
                      onChange={(e) => setThemeForm({ ...themeForm, sealType: e.target.value as CertificateSealType })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white"
                    >
                      <option value="gold-foil">Gold Foil Stamped Seal</option>
                      <option value="state-emblem">Bihar State Government Emblem</option>
                      <option value="bronze-crest">Imperial Bronze Crest</option>
                      <option value="silver-embossed">Silver Stamped Verification</option>
                      <option value="academic-monogram">Academic University Monogram</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Seal Placement *
                    </label>
                    <select
                      value={themeForm.sealPosition}
                      onChange={(e) => setThemeForm({ ...themeForm, sealPosition: e.target.value as string })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white"
                    >
                      <option value="bottom-right">Bottom Right (Beside Signatures)</option>
                      <option value="bottom-center">Bottom Center (Classical Anchor)</option>
                      <option value="bottom-left">Bottom Left (State Seal Position)</option>
                      <option value="top-right">Top Right (Header Stamp)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={themeForm.showQrCode}
                      onChange={(e) => setThemeForm({ ...themeForm, showQrCode: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Stamp National Verification QR Code badge on certificate</span>
                  </label>
                </div>

                {/* Signatories Customization */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Authority Signatory Titles
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Primary Signatory *</label>
                      <input
                        type="text"
                        required
                        value={themeForm.signatories.primaryTitle}
                        onChange={(e) => setThemeForm({
                          ...themeForm,
                          signatories: { ...themeForm.signatories, primaryTitle: e.target.value }
                        })}
                        placeholder="Principal & DDO"
                        className="w-full p-1.5 text-xs bg-slate-50 border border-slate-300 rounded font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Secondary Signatory</label>
                      <input
                        type="text"
                        value={themeForm.signatories.secondaryTitle || ''}
                        onChange={(e) => setThemeForm({
                          ...themeForm,
                          signatories: { ...themeForm.signatories, secondaryTitle: e.target.value }
                        })}
                        placeholder="Exam Controller"
                        className="w-full p-1.5 text-xs bg-slate-50 border border-slate-300 rounded font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Tertiary Signatory</label>
                      <input
                        type="text"
                        value={themeForm.signatories.tertiaryTitle || ''}
                        onChange={(e) => setThemeForm({
                          ...themeForm,
                          signatories: { ...themeForm.signatories, tertiaryTitle: e.target.value }
                        })}
                        placeholder="Head of Department"
                        className="w-full p-1.5 text-xs bg-slate-50 border border-slate-300 rounded font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-700 to-indigo-800 hover:from-indigo-800 hover:to-indigo-900 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Publish Certificate Theme</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('gallery')}
                  className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Right Column: Instant Live Preview */}
            <div className="lg:col-span-6 space-y-3">
              <div className="sticky top-4 space-y-3">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900">Instant Canvas Preview:</span>
                    <span className="text-xs font-semibold text-indigo-700 truncate max-w-[180px]">{themeForm.name}</span>
                  </div>

                  <select
                    value={previewCertType}
                    onChange={(e) => setPreviewCertType(e.target.value as CertificateType)}
                    className="p-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="Bonafide Certificate">Bonafide Student Certificate</option>
                    <option value="Transfer Certificate (TC) & Character">Transfer Certificate (TC)</option>
                    <option value="Migration Certificate">Migration Certificate</option>
                    <option value="Provisional Passing Certificate">Provisional Passing Certificate</option>
                    <option value="No Dues Clearance Certificate">No Dues Certificate</option>
                  </select>
                </div>

                <div className="overflow-x-auto pb-4">
                  <CertificateLiveCanvas 
                    theme={themeForm} 
                    certType={previewCertType} 
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

// =========================================================================
// REAL-TIME CANVAS RENDERING COMPONENT
// =========================================================================
interface CanvasProps {
  theme: CertificateTheme;
  certType: CertificateType;
}

export const CertificateLiveCanvas: React.FC<CanvasProps> = ({ theme, certType }) => {
  const sampleStudent = {
    name: 'Aarav Sharma',
    rollNo: '2022CS014',
    regNo: 'PU/REG/2022/88219',
    course: 'Bachelor of Technology (B.Tech)',
    branch: 'Computer Science & Engineering',
    semester: 6,
    year: '2022-2026',
    fatherName: 'Rajesh Sharma',
    dob: '2003-08-15',
    conduct: 'Exemplary',
    cgpa: '8.84',
    dispatchNo: `RLSY/CERT/2025/${theme.borderPattern.toUpperCase().slice(0, 3)}/0491`
  };

  const getFontClass = (ff: CertificateFontFamily) => {
    switch (ff) {
      case 'playfair': return 'font-serif tracking-normal';
      case 'cinzel': return 'font-serif tracking-wide';
      case 'font-mono': return 'font-mono tracking-tight';
      case 'font-sans': return 'font-sans tracking-normal';
      default: return 'font-serif tracking-normal';
    }
  };

  // Determine frame styling based on borderPattern
  const renderFrameDecorations = () => {
    switch (theme.borderPattern) {
      case 'royal-filigree':
        return (
          <>
            {/* 4 Corner Ornate Crests */}
            <div 
              className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg pointer-events-none" 
              style={{ borderColor: theme.accentColor }} 
            />
            <div 
              className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg pointer-events-none" 
              style={{ borderColor: theme.accentColor }} 
            />
            <div 
              className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg pointer-events-none" 
              style={{ borderColor: theme.accentColor }} 
            />
            <div 
              className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 rounded-br-lg pointer-events-none" 
              style={{ borderColor: theme.accentColor }} 
            />
          </>
        );
      case 'imperial-triple':
        return (
          <div 
            className="absolute inset-1.5 border border-dashed pointer-events-none"
            style={{ borderColor: theme.accentColor }}
          />
        );
      case 'vintage-guilloche':
        return (
          <div 
            className="absolute inset-2 border-2 border-dotted pointer-events-none opacity-80"
            style={{ borderColor: theme.accentColor }}
          />
        );
      case 'ornate-crest':
        return (
          <>
            <div className="absolute top-3 left-3 text-sm pointer-events-none font-serif" style={{ color: theme.accentColor }}>❖</div>
            <div className="absolute top-3 right-3 text-sm pointer-events-none font-serif" style={{ color: theme.accentColor }}>❖</div>
            <div className="absolute bottom-3 left-3 text-sm pointer-events-none font-serif" style={{ color: theme.accentColor }}>❖</div>
            <div className="absolute bottom-3 right-3 text-sm pointer-events-none font-serif" style={{ color: theme.accentColor }}>❖</div>
          </>
        );
      default:
        return null;
    }
  };

  // Render Official Seal Badge
  const renderSeal = () => {
    switch (theme.sealType) {
      case 'state-emblem':
        return (
          <div className="w-16 h-16 rounded-full border-2 p-1 flex flex-col items-center justify-center text-center shadow-xs" style={{ borderColor: theme.accentColor, backgroundColor: '#f0fdf4' }}>
            <Building className="w-5 h-5 text-emerald-800" />
            <span className="text-[7px] font-black uppercase tracking-tighter text-emerald-950 mt-0.5">Govt of Bihar</span>
            <span className="text-[6px] text-emerald-800">Higher Ed</span>
          </div>
        );
      case 'bronze-crest':
        return (
          <div className="w-16 h-16 rounded-full border-3 p-1 flex flex-col items-center justify-center text-center shadow-xs" style={{ borderColor: '#78350f', backgroundColor: '#fef3c7' }}>
            <Award className="w-5 h-5 text-amber-900" />
            <span className="text-[7px] font-extrabold uppercase tracking-tighter text-amber-950">Statutory</span>
            <span className="text-[6px] text-amber-800">Seal · 1958</span>
          </div>
        );
      case 'silver-embossed':
        return (
          <div className="w-16 h-16 rounded-full border-2 p-1 flex flex-col items-center justify-center text-center shadow-xs" style={{ borderColor: '#64748b', backgroundColor: '#f8fafc' }}>
            <ShieldCheck className="w-5 h-5 text-slate-700" />
            <span className="text-[7px] font-bold uppercase tracking-tighter text-slate-900">Verified</span>
            <span className="text-[6px] text-slate-600">NAD / ABC</span>
          </div>
        );
      case 'academic-monogram':
        return (
          <div className="w-16 h-16 rounded-full border-2 border-dashed p-1 flex flex-col items-center justify-center text-center shadow-xs" style={{ borderColor: theme.primaryBorderColor, backgroundColor: '#fff' }}>
            <span className="font-serif font-black text-xs" style={{ color: theme.primaryBorderColor }}>RLSY</span>
            <span className="text-[6px] font-bold text-slate-600 uppercase">Patna Coll.</span>
          </div>
        );
      default: // gold-foil
        return (
          <div className="w-16 h-16 rounded-full border-3 p-1 flex flex-col items-center justify-center text-center shadow-md" style={{ borderColor: '#b45309', backgroundColor: '#fef3c7' }}>
            <Award className="w-5 h-5 text-amber-700 animate-pulse" />
            <span className="text-[7px] font-black uppercase tracking-tighter text-amber-950 mt-0.5">Official Seal</span>
            <span className="text-[6px] font-bold text-amber-900">UGC Accredited</span>
          </div>
        );
    }
  };

  return (
    <div 
      className={`relative min-w-[540px] max-w-2xl mx-auto rounded-xl p-8 sm:p-10 shadow-2xl overflow-hidden transition-all border-8 ${getFontClass(theme.fontFamily)}`}
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        borderColor: theme.primaryBorderColor,
      }}
    >
      {/* Outer inner accent border */}
      <div 
        className="absolute inset-1.5 border-2 pointer-events-none"
        style={{ borderColor: theme.accentColor }}
      />

      {renderFrameDecorations()}

      {/* Watermark in background */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        style={{ opacity: theme.watermarkOpacity }}
      >
        <span 
          className="text-4xl sm:text-5xl font-black uppercase tracking-widest text-center transform -rotate-25"
          style={{ color: theme.primaryBorderColor }}
        >
          {theme.watermarkText || 'RLSY COLLEGE PATNA'}
        </span>
      </div>

      {/* Content Container */}
      <div className="relative z-10 space-y-4">
        {/* Top Government Prefix */}
        <div className="text-center">
          <span 
            className="text-[10px] font-bold uppercase tracking-widest block pb-1 border-b"
            style={{ color: theme.accentColor, borderColor: theme.accentColor }}
          >
            {theme.customTitlePrefix || 'GOVERNMENT OF BIHAR · HIGHER EDUCATION DEPARTMENT'}
          </span>
        </div>

        {/* Institution Header Architecture */}
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-px flex-1" style={{ backgroundColor: theme.accentColor }} />
            <span className="text-[9px] font-bold uppercase tracking-widest px-2" style={{ color: theme.primaryBorderColor }}>
              {INSTITUTION_INFO.treasuryCode} · NAAC Grade &apos;A&apos;
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: theme.accentColor }} />
          </div>

          <h1 
            className="text-2xl sm:text-3xl font-black uppercase tracking-tight"
            style={{ color: theme.primaryBorderColor }}
          >
            {INSTITUTION_INFO.name}
          </h1>
          <p className="text-[11px] font-medium opacity-90 mt-0.5">
            {INSTITUTION_INFO.accreditation} · {INSTITUTION_INFO.address}
          </p>

          {/* Dispatch & Serial Row */}
          <div className="flex justify-between items-center text-[10px] font-mono mt-3 pt-2 border-t border-slate-300">
            <span><strong>Dispatch No:</strong> {sampleStudent.dispatchNo}</span>
            <span><strong>Issue Date:</strong> {new Date().toISOString().split('T')[0]}</span>
          </div>
        </div>

        {/* Certificate Title Banner */}
        <div className="text-center my-4">
          <div 
            className="inline-block py-1.5 px-6 border-y-2 uppercase tracking-widest font-black text-sm sm:text-base shadow-2xs"
            style={{ 
              borderColor: theme.accentColor, 
              color: theme.primaryBorderColor,
              backgroundColor: 'rgba(255, 255, 255, 0.6)'
            }}
          >
            {certType}
          </div>
        </div>

        {/* Certificate Body Paragraph */}
        <div className="text-xs sm:text-sm leading-relaxed space-y-3 text-justify px-2 py-2">
          {certType === 'Bonafide Certificate' && (
            <p>
              This is to solemnly certify that <strong className="font-bold underline uppercase">{sampleStudent.name}</strong>, 
              Son/Daughter of <strong className="font-bold">{sampleStudent.fatherName}</strong>, bearing Enrollment Roll Number <span className="font-mono font-bold">{sampleStudent.rollNo}</span> and University Registration No. <span className="font-mono font-bold">{sampleStudent.regNo}</span>, is a bonafide regular student of <strong>{sampleStudent.course} ({sampleStudent.branch})</strong> at Ram Lakhan Singh Yadav College for the academic session <strong>{sampleStudent.year}</strong>. To the best of institutional knowledge, their conduct during this period has been <strong className="font-bold">{sampleStudent.conduct}</strong>.
            </p>
          )}

          {certType === 'Transfer Certificate (TC) & Character' && (
            <p>
              This official certificate confirms that <strong className="font-bold underline uppercase">{sampleStudent.name}</strong> has satisfactorily completed Semester {sampleStudent.semester} of the prescribed <strong>{sampleStudent.course}</strong> degree curriculum. All departmental, library, and hostel dues have been cleared through the Institutional Ledger. There is no moral or disciplinary objection to their transfer to another accredited university.
            </p>
          )}

          {certType === 'Migration Certificate' && (
            <p>
              This inter-university clearance authorizes <strong className="font-bold underline uppercase">{sampleStudent.name}</strong> (Roll: <span className="font-mono">{sampleStudent.rollNo}</span>) to seek migration to an accredited university or higher learning institution. The student has left this institution with regular academic standing.
            </p>
          )}

          {certType === 'Provisional Passing Certificate' && (
            <p>
              This is to certify that <strong className="font-bold underline uppercase">{sampleStudent.name}</strong> has successfully qualified and cleared the final examination of <strong>{sampleStudent.course}</strong> held by Patna University in First Class with Cumulative GPA of <strong className="font-bold">{sampleStudent.cgpa}</strong>.
            </p>
          )}

          {certType === 'No Dues Clearance Certificate' && (
            <p>
              Official Departmental No Dues Clearance confirms that student <strong className="font-bold underline uppercase">{sampleStudent.name}</strong> has settled all outstanding dues across Central Accounts, Book Bank, Laboratories, and Campus Mess. No institutional encumbrance remains.
            </p>
          )}
        </div>

        {/* Seal & Signatures Footer Layout */}
        <div className="pt-6 mt-4 border-t border-slate-300 flex items-end justify-between gap-4">
          {/* Left Signatory / QR */}
          <div className="text-center w-36">
            {theme.showQrCode && (
              <div className="inline-block p-1 bg-white border border-slate-300 rounded mb-1 shadow-2xs">
                <QrCode className="w-10 h-10 text-slate-800" />
                <span className="text-[7px] font-mono block text-slate-500">Scan to Verify</span>
              </div>
            )}
            <div className="border-t border-slate-800 pt-1 text-[10px] font-bold">
              {theme.signatories.secondaryTitle || 'Controller of Exams'}
            </div>
            <span className="text-[9px] text-slate-500 block">Examination Cell</span>
          </div>

          {/* Center: Seal placement if bottom-center */}
          {theme.sealPosition === 'bottom-center' && (
            <div className="shrink-0 flex justify-center">
              {renderSeal()}
            </div>
          )}

          {/* If seal is bottom-left */}
          {theme.sealPosition === 'bottom-left' && (
            <div className="absolute bottom-6 left-6 pointer-events-none">
              {renderSeal()}
            </div>
          )}

          {/* If seal is bottom-right */}
          {theme.sealPosition === 'bottom-right' && (
            <div className="shrink-0 flex justify-center">
              {renderSeal()}
            </div>
          )}

          {/* Right: Primary Signatory (Principal & DDO) */}
          <div className="text-center w-40">
            <div className="h-8 flex items-center justify-center italic text-xs font-serif opacity-80" style={{ color: theme.primaryBorderColor }}>
              Prof. (Dr.) K. K. Srivastava
            </div>
            <div className="border-t-2 border-slate-900 pt-1 text-[11px] font-black uppercase">
              {theme.signatories.primaryTitle || 'Principal & DDO'}
            </div>
            <span className="text-[9px] text-slate-600 block">Ram Lakhan Singh Yadav College</span>
          </div>
        </div>

        {/* Footer Motto / Statutory Citation */}
        <div className="text-center pt-3 border-t border-slate-200">
          <span 
            className="text-[9px] font-semibold tracking-wider italic"
            style={{ color: theme.accentColor }}
          >
            {theme.footerMotto || 'तमसो मा ज्योतिर्गमय · Lead Us From Darkness To Light'}
          </span>
        </div>
      </div>
    </div>
  );
};
