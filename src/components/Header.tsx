import React, { useState, useEffect } from 'react';
import { UserSession, Student, SchoolStaffUser, CollegeProfile } from '../types/fee';
import { Language, translations } from '../utils/translations';
import { 
  Building, 
  LogOut, 
  Smartphone, 
  ShieldCheck, 
  CreditCard,
  FileText,
  Award,
  BookOpen,
  Landmark,
  Users,
  FileSpreadsheet,
  Sliders,
  Sparkles,
  BarChart3,
  PlusCircle,
  Camera,
  Menu,
  X,
  ChevronRight,
  User,
  Trophy,
  Bell,
  QrCode,
  CheckCircle2,
  ExternalLink,
  Info,
  Palette,
  Server,
  Settings,
  Infinity as InfinityIcon
} from 'lucide-react';
import { UserProfileSummaryModal } from './Common/UserProfileSummaryModal';
import { checkIsBirthdayToday } from '../utils/birthdayHelper';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: UserSession | null;
  onSwitchRole?: (role: 'student' | 'admin' | 'app_admin') => void;
  onLogout: () => void;
  onOpenHelpdesk?: () => void;
  pendingBatchCount?: number;
  unreadNotifCount?: number;
  currentStudent?: Student | null;
  currentStaffUser?: SchoolStaffUser | null;
  onUpdateProfilePicture?: (photoUrl: string) => void;
  onOpenQuickFeePayment?: () => void;
  isDemoMode?: boolean;
  collegeProfile?: CollegeProfile;
  lang?: Language;
  onToggleLang?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: number | string;
  category?: string;
  isSpecial?: boolean;
}

export const Header: React.FC<Props> = ({ 
  activeTab, 
  setActiveTab, 
  session, 
  onSwitchRole, 
  onLogout,
  onOpenHelpdesk,
  onOpenQuickFeePayment,
  pendingBatchCount = 0,
  unreadNotifCount = 0,
  currentStudent,
  currentStaffUser,
  onUpdateProfilePicture,
  isDemoMode = true,
  collegeProfile,
  lang = 'en',
  onToggleLang,
}) => {
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState<boolean>(false);

  // Disable background scrolling when hamburger menu is open
  useEffect(() => {
    if (isHamburgerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isHamburgerOpen]);

  // Helper to extract initials
  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const effectivePhoto = currentStudent?.profilePicture || currentStaffUser?.profilePicture || session?.profilePicture;

  // Compare today's date (month + day) against user's stored DOB field
  const userDob = currentStudent?.dateOfBirth || currentStaffUser?.dateOfBirth || session?.dateOfBirth;
  const isBirthdayToday = checkIsBirthdayToday(userDob).isBirthdayToday;

  // 1. Strictly Student Nav Menu Items (Fee Module and Fee Payment Merged)
  const studentNavItems: NavItem[] = [
    { 
      id: 'student_home', 
      label: 'My Dashboard', 
      icon: Smartphone, 
      badge: isBirthdayToday ? '🎂 Birthday!' : undefined,
      description: 'Fee status, overview & academic services',
      category: 'Academic & Billing' 
    },
    { 
      id: 'student_fees', 
      label: 'Fee Module & Payments', 
      icon: CreditCard, 
      isSpecial: true,
      description: 'Term fee clearance, statutory dues breakdown, dynamic UPI QR checkout & payment receipts',
      category: 'Academic & Billing' 
    },
    { 
      id: 'student_notifications', 
      label: 'Notifications & Alerts', 
      icon: Bell, 
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
      description: 'Official fee notices, circulars & administrative alerts',
      category: 'Academic & Billing' 
    },
    { 
      id: 'student_profile', 
      label: 'Student Profile & Details', 
      icon: User, 
      description: 'Personal, caste reservation, income & enrollment details',
      category: 'Identity & Profile' 
    },
    { 
      id: 'student_achievements', 
      label: 'Honors & Achievements', 
      icon: Trophy, 
      description: 'Verified student academic, athletic & research honors',
      category: 'Identity & Profile' 
    },
    { 
      id: 'student_apply', 
      label: 'Apply For (Certs / Facilities)', 
      icon: PlusCircle, 
      isSpecial: true, 
      description: 'Hostel rooms, laboratory access, bus pass & campus amenities',
      category: 'Clearances & Services' 
    },
    { 
      id: 'student_nodues', 
      label: 'My No Dues (NOC)', 
      icon: FileText, 
      description: 'Real-time 7-department clearance status & downloadable NOC',
      category: 'Clearances & Services' 
    },
    { 
      id: 'student_certs', 
      label: 'Certificate Wallet', 
      icon: Award, 
      description: 'Apply for and download Transfer, Bonafide & Character certificates',
      category: 'Clearances & Services' 
    },
    { 
      id: 'student_idcard', 
      label: 'Digital ID & Hall Ticket', 
      icon: ShieldCheck, 
      description: 'Institutional identity card & semester examination admit slip',
      category: 'Academic & Billing' 
    },
  ];

  // 2. College Admin & Staff Nav Menu Items (Accounts / Bursar Focused)
  const adminNavItems: NavItem[] = [
    { 
      id: 'fee_campaigns', 
      label: 'Fee Module', 
      icon: Sparkles, 
      isSpecial: true,
      description: 'Fee Head Master, concession & surcharge, campaigns, collection & dues',
      category: 'Treasury & Fee Operations' 
    },
    { 
      id: 'payment_settings', 
      label: 'Payment Gateway Settings', 
      icon: Settings, 
      description: 'Onboard & map payment provider, configure Merchant ID, API keys & settlement channels',
      category: 'Treasury & Fee Operations' 
    },
    { 
      id: 'cashier', 
      label: 'Treasury Counter', 
      icon: Building, 
      description: 'Physical counter collections, cash receipts & treasury ledger entries',
      category: 'Treasury & Fee Operations' 
    },
    { 
      id: 'stream_subject_master', 
      label: 'Stream & Subject Master', 
      icon: BookOpen, 
      isSpecial: true,
      description: 'Accountant catalog to create, edit streams & subjects, tag multi-fees & auto-calculate campaign totals',
      category: 'Treasury & Fee Operations' 
    },
    { 
      id: 'enrollment_optimizer', 
      label: 'Enrollment Form Optimizer', 
      icon: Sliders, 
      description: 'Optimize enrollment parameters, toggle mandatory/optional fields, configure pre-login data gating',
      category: 'Treasury & Fee Operations' 
    },
    { 
      id: 'honours_achievements', 
      label: 'Honours & Achievements', 
      icon: Trophy, 
      description: 'Award student gems & honors against Roll No, authorize staff users & maintain honors ledger',
      category: 'Executive Administration' 
    },
    { 
      id: 'batch_upload', 
      label: 'Student Update Menu', 
      icon: FileSpreadsheet, 
      badge: pendingBatchCount > 0 ? pendingBatchCount : undefined,
      description: 'Accountant Excel intake to map roll numbers to courses, semesters & quotas (PwD, NCC, Sports, etc.) and update student records',
      category: 'Treasury & Fee Operations' 
    },
    { 
      id: 'reconciliation', 
      label: 'Bank Scroll Reconciliation', 
      icon: Landmark, 
      description: 'Account reconciliation with official bank and e-challan scrolls',
      category: 'Treasury & Fee Operations' 
    },
    { 
      id: 'overview', 
      label: 'Institutional Overview', 
      icon: Landmark, 
      badge: isBirthdayToday ? '🎂 Birthday!' : undefined,
      description: 'Macro financial indicators, collection charts & audit health',
      category: 'Executive Administration' 
    },
    { 
      id: 'defaulters', 
      label: 'Defaulters & Hall Tickets', 
      icon: ShieldCheck, 
      description: 'Track outstanding dues & manage examination admit card withholdings',
      category: 'Executive Administration' 
    },
    { 
      id: 'users', 
      label: 'User & Staff Directory', 
      icon: Users, 
      description: 'Enroll new students, bulk spreadsheet upload & manage staff roles',
      category: 'Executive Administration' 
    },
    { 
      id: 'reports', 
      label: 'Reports & Audit Engine', 
      icon: BarChart3, 
      description: 'Government statutory reports, CSV/PDF statements & collection ledger',
      category: 'Clearances & University Records' 
    },
    { 
      id: 'nodues', 
      label: 'No Dues (7 Depts)', 
      icon: FileText, 
      description: 'Sign-off departmental clearances for Library, Labs, Hostel & Sports',
      category: 'Clearances & University Records' 
    },
    { 
      id: 'certificates', 
      label: 'Statutory Certificates', 
      icon: Award, 
      description: 'Review and issue signed university Transfer, Character & Bonafide slips',
      category: 'Clearances & University Records' 
    },
    { 
      id: 'certificate_themes', 
      label: 'Certificate Theme Studio', 
      icon: Palette, 
      badge: (currentStaffUser?.canManageCertificateThemes || session?.canManageCertificateThemes) ? 'Mapped Service' : undefined,
      description: 'Design official certificate borders, seals, fonts, watermarks & typography',
      category: 'Clearances & University Records' 
    },
    { 
      id: 'college_profile', 
      label: 'College Profile & Details', 
      icon: Building, 
      description: 'View & amend official College identity, affiliation, contacts and statutory headers',
      category: 'Clearances & University Records' 
    },
  ];

  // 3. Root App Administrator Nav Menu Items
  const appAdminNavItems: NavItem[] = [
    { 
      id: 'college_profile', 
      label: 'College Profile & Details', 
      icon: Building, 
      isSpecial: true, 
      description: 'Amend College name, affiliation, contacts, email IDs, address & statutory headers',
      category: 'System & User Administration' 
    },
    { 
      id: 'fee_campaigns', 
      label: 'Fee Module', 
      icon: Sparkles, 
      isSpecial: true, 
      description: 'Fee Head Master, concession & surcharge, campaigns, collection & dues',
      category: 'System & User Administration' 
    },
    { 
      id: 'payment_settings', 
      label: 'Payment Gateway Settings', 
      icon: Settings, 
      isSpecial: true, 
      description: 'Onboard & map payment provider, configure Merchant ID, API keys & settlement channels',
      category: 'System & User Administration' 
    },
    { 
      id: 'users', 
      label: 'User & Staff Directory', 
      icon: Users, 
      isSpecial: true, 
      description: 'Enroll new students, bulk spreadsheet upload & manage staff roles',
      category: 'System & User Administration' 
    },
    { 
      id: 'batch_upload', 
      label: 'Student Update Menu', 
      icon: FileSpreadsheet, 
      badge: pendingBatchCount > 0 ? pendingBatchCount : undefined,
      description: 'Accountant Excel intake to map roll numbers to courses, semesters & quotas (PwD, NCC, Sports, etc.) and update student records',
      category: 'System & User Administration' 
    },
    { 
      id: 'enrollment_optimizer', 
      label: 'Enrollment Form Optimizer', 
      icon: Sliders, 
      isSpecial: true,
      description: 'Optimize enrollment parameters, toggle mandatory/optional fields, configure pre-login data gating',
      category: 'System & User Administration' 
    },
    { 
      id: 'honours_achievements', 
      label: 'Honours & Achievements', 
      icon: Trophy, 
      isSpecial: true,
      description: 'Award student gems & honors against Roll No, authorize staff users & maintain honors ledger',
      category: 'System & User Administration' 
    },
    { 
      id: 'stream_subject_master', 
      label: 'Stream & Subject Master', 
      icon: BookOpen, 
      description: 'Create, edit streams & subjects, tag multi-fees & auto-calculate campaign totals',
      category: 'System & User Administration' 
    },
    { 
      id: 'fee_customizer', 
      label: 'Student Fee Customizer', 
      icon: Sliders, 
      description: 'Individual student fee adjustments, waivers & scholarship tagging (Principal/Admin restricted changes)',
      category: 'System & User Administration' 
    },
    { 
      id: 'overview', 
      label: 'Institutional Overview', 
      icon: Landmark, 
      badge: isBirthdayToday ? '🎂 Birthday!' : undefined,
      description: 'Macro financial indicators, collection charts & audit health',
      category: 'Executive Administration' 
    },
    { 
      id: 'defaulters', 
      label: 'Defaulters & Hall Tickets', 
      icon: ShieldCheck, 
      description: 'Track outstanding dues & manage examination admit card withholdings',
      category: 'Executive Administration' 
    },
    { 
      id: 'reports', 
      label: 'Reports & Audit Engine', 
      icon: BarChart3, 
      description: 'Government statutory reports, CSV/PDF statements & collection ledger',
      category: 'Executive Administration' 
    },
    { 
      id: 'cashier', 
      label: 'Treasury Counter', 
      icon: Building, 
      description: 'Physical counter collections, cash receipts & treasury ledger entries',
      category: 'Treasury & University Clearances' 
    },
    { 
      id: 'nodues', 
      label: 'No Dues (7 Depts)', 
      icon: FileText, 
      description: 'Sign-off departmental clearances for Library, Labs, Hostel & Sports',
      category: 'Treasury & University Clearances' 
    },
    { 
      id: 'certificates', 
      label: 'Statutory Certificates', 
      icon: Award, 
      description: 'Review and issue signed university Transfer, Character & Bonafide slips',
      category: 'Treasury & University Clearances' 
    },
    { 
      id: 'certificate_themes', 
      label: 'Certificate Theme Studio', 
      icon: Palette, 
      isSpecial: true,
      description: 'System certificate styling, border patterns, seals, watermarks & staff mapping',
      category: 'System & User Administration' 
    },
    { 
      id: 'reconciliation', 
      label: 'Bank Scroll Reconciliation', 
      icon: Landmark, 
      description: 'Account reconciliation with official bank and e-challan scrolls',
      category: 'Treasury & University Clearances' 
    },
  ];

  // 4. Guest & Public Visitor Nav Items (At sign in page, no portal access or fee notice links)
  const guestNavItems: NavItem[] = [
    { 
      id: 'admin_login', 
      label: lang === 'en' ? 'Admin / System Admin Login' : 'व्यवस्थापक / एडमिन लॉग इन', 
      icon: Server, 
      isSpecial: true, 
      description: lang === 'en' ? 'Central IT & Institutional System Administrator console' : 'सिस्टम एडमिनिस्ट्रेटर कंसोल',
      category: lang === 'en' ? 'Administration' : 'प्रशासन' 
    },
  ];

  const isAppAdmin = session?.staffRole === 'App_Admin';

  const currentNavItems = 
    session?.role === 'student'
      ? studentNavItems
      : session?.role === 'admin'
      ? isAppAdmin
        ? appAdminNavItems
        : adminNavItems
      : guestNavItems;

  const [showInstitutionalInfoModal, setShowInstitutionalInfoModal] = useState<boolean>(false);

  const handleNavigate = (tabId: string) => {
    if (tabId === 'institutional_info') {
      setShowInstitutionalInfoModal(true);
      setIsHamburgerOpen(false);
      return;
    }
    setActiveTab(tabId);
    setIsHamburgerOpen(false);
  };

  // Group items by category for the drawer
  const groupedNavItems = currentNavItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <header className="sticky top-0 z-40 bg-[#0B5D45] border-b border-emerald-900/60 shadow-md text-white">
      {/* Compact Top Bar: Menu icon + RLSY Logo + "RLSY College" with "Patna College (Affiliated)" below + Logout icon */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 w-full min-w-0">
          {/* Left + Brand in a single flexible row */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Menu icon button */}
            <button
              type="button"
              onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                isHamburgerOpen
                  ? 'bg-emerald-700 text-white border-emerald-400'
                  : 'bg-emerald-900/70 hover:bg-emerald-900 text-emerald-100 border-emerald-600/50'
              }`}
              aria-label={isHamburgerOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              title={isHamburgerOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            >
              {isHamburgerOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-emerald-100" />
              )}
            </button>

            {/* College Wordmark & Affiliation: RLSY logo + "RLSY College" with "Patna College (Affiliated)" below */}
            <button
              type="button"
              onClick={() => {
                if (session?.role === 'student') setActiveTab('student_home');
                else if (session?.role === 'admin') setActiveTab('overview');
                else setActiveTab('student_home');
              }}
              className="text-left flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer focus:outline-none min-h-[44px]"
            >
              <div className="w-10 h-10 min-w-10 min-h-10 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-extrabold text-xs shadow-xs ring-1 ring-emerald-400/40 shrink-0">
                {collegeProfile?.shortName || 'RLSY'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-white block leading-tight truncate">
                  {collegeProfile?.name || 'RLSY College'}
                </span>
                <span className="text-[11px] font-medium text-emerald-100/90 block tracking-normal truncate">
                  Patna College (Affiliated)
                </span>
              </div>
            </button>
          </div>

          {/* Right Side: Header actions */}
          {session ? (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Conditional Birthday Badge: Strictly hidden when today is not user's birthday */}
              {isBirthdayToday && (
                <div
                  className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow-xs flex items-center gap-1.5 animate-bounce"
                  title="Happy Birthday from College ERP!"
                >
                  <span>🎂</span>
                  <span className="hidden sm:inline font-extrabold text-[11px] uppercase tracking-wide">Birthday!</span>
                </div>
              )}

              {onToggleLang && (
                <button
                  type="button"
                  onClick={onToggleLang}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 border border-emerald-300/30 text-white text-xs font-bold flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  title="Toggle Language / भाषा बदलें"
                >
                  <span className="text-xs">{lang === 'en' ? 'हिं' : 'EN'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 border border-emerald-300/30 text-white hover:text-rose-200 flex items-center justify-center cursor-pointer shadow-2xs shrink-0 transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Single right icon button for Quick Pay or Menu access */}
              <button
                type="button"
                onClick={onOpenQuickFeePayment}
                className="w-10 h-10 min-w-10 min-h-10 rounded-xl bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-600/50 text-emerald-200 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title="Quick Fee Payment"
                aria-label="Quick Fee Payment"
              >
                <CreditCard className="w-4 h-4 text-emerald-300" />
              </button>

              {/* Language toggle as compact icon */}
              {onToggleLang && (
                <button
                  type="button"
                  onClick={onToggleLang}
                  className="w-10 h-10 min-w-10 min-h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-emerald-300/30 text-white text-xs font-bold flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  title="Toggle Language / भाषा बदलें"
                  aria-label="Toggle Language"
                >
                  <span>{lang === 'en' ? 'हिं' : 'EN'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Universal Hamburger Navigation Slide-over Drawer (Accessible to ALL user types) */}
      {isHamburgerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsHamburgerOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 left-0 max-w-full flex pr-4 sm:pr-8 z-50">
            <div className="w-[88vw] max-w-xs sm:max-w-sm md:max-w-md max-h-screen bg-white shadow-2xl flex flex-col border-r border-slate-200 transform transition-transform animate-in slide-in-from-left duration-300 overflow-hidden">
              
              {/* Drawer Top Bar */}
              <div className="p-4 bg-gradient-to-r from-emerald-800 to-slate-900 text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white text-emerald-800 font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                    RLSY
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white leading-tight">
                      RLSY Navigation Portal
                    </h3>
                    <p className="text-[11px] text-emerald-200">
                      Patna University Constituent College ERP
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsHamburgerOpen(false)}
                  className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer User Identity Card */}
              {session ? (
                <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {effectivePhoto ? (
                          <img
                            src={effectivePhoto}
                            alt={session.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-emerald-700 text-white font-bold text-base flex items-center justify-center border-2 border-emerald-500 shadow-sm">
                            {getInitials(session.name)}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 text-white p-0.5 rounded-full border border-white">
                          <CheckCircle2 className="w-3 h-3" />
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-slate-900 text-sm">{session.name}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 border ${
                          session.role === 'student'
                            ? 'inline-block bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isAppAdmin
                            ? 'hidden sm:inline-block bg-purple-100 text-purple-900 border-purple-300'
                            : 'hidden sm:inline-block bg-indigo-100 text-indigo-800 border-indigo-300'
                        }`}>
                          {session.role === 'student' 
                            ? `Enrolled Student · Sem ${currentStudent?.semester || 1}` 
                            : session.staffDesignation || 'Accounts Officer'}
                        </span>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {session.rollNo ? `Roll No: ${session.rollNo}` : session.emailOrPhone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Profile Summary Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHamburgerOpen(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full py-1.5 px-3 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{session.role === 'student' ? 'View Academic Identity & Photo' : 'View Staff Identity & Details'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/90 border-b border-emerald-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block leading-tight">
                        RLSY Institutional Portal
                      </span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Access student and staff academic treasury services.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsHamburgerOpen(false);
                      onOpenQuickFeePayment?.();
                    }}
                    className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>⚡ Quick Due Fee Payment (No Sign In)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('admin_login');
                      setIsHamburgerOpen(false);
                    }}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer border border-slate-700"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Admin Login (System Administrator)</span>
                  </button>
                </div>
              )}

              {/* Drawer Scrollable Navigation Modules */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {Object.entries(groupedNavItems).map(([category, items]) => (
                  <div key={category} className="space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block px-2">
                      {category}
                    </span>

                    <div className="space-y-1">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNavigate(item.id)}
                            className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start gap-3 group ${
                              isActive
                                ? session?.role === 'student'
                                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-2xs'
                                  : isAppAdmin
                                  ? 'bg-purple-50 border border-purple-300 text-purple-900 shadow-2xs'
                                  : 'bg-indigo-50 border border-indigo-300 text-indigo-900 shadow-2xs'
                                : 'hover:bg-slate-100 text-slate-700 border border-transparent'
                            }`}
                          >
                            <div className={`p-2 rounded-lg shrink-0 mt-0.5 transition-colors ${
                              isActive
                                ? session?.role === 'student'
                                  ? 'bg-emerald-700 text-white'
                                  : isAppAdmin
                                  ? 'bg-purple-800 text-white'
                                  : 'bg-indigo-700 text-white'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold truncate block ${isActive ? 'text-slate-900' : 'text-slate-800'}`}>
                                  {item.label}
                                </span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white animate-pulse">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[10px] text-slate-500 leading-snug line-clamp-1 mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform mt-1 ${
                              isActive ? 'text-slate-900 translate-x-0.5' : 'text-slate-400 group-hover:translate-x-0.5'
                            }`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Drawer Bottom Actions & Sign Out */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>{collegeProfile?.shortName || 'RLSY'} Student ERP</span>
                  <span className="text-emerald-700 font-semibold">Active Session</span>
                </div>

                {session && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHamburgerOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out of Institutional ERP</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Summary Academic Profile & Photo Management Modal */}
      {showProfileModal && (
        <UserProfileSummaryModal
          session={session}
          student={currentStudent}
          staffUser={currentStaffUser}
          onClose={() => setShowProfileModal(false)}
          onUpdateProfilePicture={(photoUrl) => {
            if (onUpdateProfilePicture) onUpdateProfilePicture(photoUrl);
          }}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            setShowProfileModal(false);
          }}
        />
      )}

      {/* Institutional Accreditation & Statutory Info Modal */}
      {showInstitutionalInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-slate-900 text-white p-5 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-emerald-800 font-extrabold flex items-center justify-center text-sm shadow-md shrink-0">
                  {collegeProfile?.shortName || 'RLSY'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white leading-tight">
                    {collegeProfile?.name || 'RLSY College'}
                  </h3>
                  <p className="text-xs text-emerald-200 font-medium">
                    {collegeProfile?.affiliation || 'Affiliated College'} · Statutory Accreditation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstitutionalInfoModal(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-slate-700 overflow-y-auto flex-1">
              {/* Statutory Credentials */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs">
                  <Landmark className="w-4 h-4 text-emerald-700" />
                  <span>Institutional Accreditations & Identifiers</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-200/80 font-mono">
                  <div>
                    <span className="text-slate-600 block text-[11px] font-sans">Institutional Code:</span>
                    <strong className="text-slate-900">{collegeProfile?.ddoTreasuryCode || '2049-RLSY-PATNA'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px] font-sans">Account Head:</span>
                    <strong className="text-slate-900">{collegeProfile?.ifmsReceiptHead || '0202-01-102-01'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px] font-sans">Affiliation:</span>
                    <strong className="text-slate-900">{collegeProfile?.affiliation || 'Affiliated College'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px] font-sans">Academic Session:</span>
                    <strong className="text-slate-900">{collegeProfile?.academicSession || '2025-2026'}</strong>
                  </div>
                </div>
              </div>

              {/* Banking & Fee Payment Guidelines */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Fee Collection & Electronic Payment System</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  All semester examination fees, registration heads, and tuition charges are digitally reconciled against official university bank accounts. Real-time dynamic UPI QR generated inside student ledger guarantees immediate clearance and receipt issuance.
                </p>
              </div>

              {/* Campus & Bursar Desk */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <Building className="w-4 h-4 text-emerald-700" />
                  <span>Campus Address & Accounts Desk</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <p><strong>Campus:</strong> {collegeProfile?.address || 'RLSY College Campus, Patna, Bihar - 800001'}</p>
                  <p><strong>Accounts Office Desk:</strong> {collegeProfile?.accountsEmail || collegeProfile?.contactEmail || 'accounts@rlsycollege.ac.in'}</p>
                  <p><strong>General Office Desk:</strong> {collegeProfile?.contactEmail || 'office@rlsycollege.ac.in'}</p>
                  <p><strong>Helpline:</strong> {collegeProfile?.contactPhone || '(0612) 237-1904 · 237-1905'}</p>
                  <p><strong>Office Timings:</strong> {collegeProfile?.officeHours || 'Monday to Saturday: 10:00 AM – 04:30 PM'}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div>
                {session?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowInstitutionalInfoModal(false);
                      setActiveTab('college_profile');
                    }}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Amend College Details</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowInstitutionalInfoModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

