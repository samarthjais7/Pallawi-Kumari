/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ArchitecturalAdvisor } from './components/Advisor/ArchitecturalAdvisor';
import { AppErrorBoundary } from './components/Common/AppErrorBoundary';
import { 
  safeString, 
  safeTrim, 
  safeLower, 
  safeUpper, 
  safeMatchStrings, 
  safeNumber, 
  safeDivide, 
  safePercent, 
  safeJsonParse 
} from './utils/safeHelpers';
import { OverviewDashboard } from './components/Dashboard/OverviewDashboard';
import { NoDuesModule } from './components/NoDues/NoDuesModule';
import { CertificateModule } from './components/Certificates/CertificateModule';
import { CertificateThemeStudio } from './components/Certificates/CertificateThemeStudio';
import { FeeCampaignModule } from './components/FeeCampaign/FeeCampaignModule';
import { CashierDesk } from './components/Cashier/CashierDesk';
import { DefaulterManager } from './components/Defaulters/DefaulterManager';
import { ReconciliationEngine } from './components/Reconciliation/ReconciliationEngine';
import { PrintableReceipt } from './components/Common/PrintableReceipt';
import { SchoolUserDirectory } from './components/Admin/SchoolUserDirectory';
import { StudentUpdateMenu } from './components/Admin/StudentUpdateMenu';
import { StudentFeeCustomizer } from './components/Admin/StudentFeeCustomizer';
import { ReportGenerationEngine } from './components/Admin/ReportGenerationEngine';
import { QuickFeePaymentModal } from './components/StudentPortal/QuickFeePaymentModal';
import { 
  db, 
  auth,
  signInAnonymously,
  onAuthStateChanged,
  FirebaseUser,
  collection, 
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot, 
  syncStudentToFirestore, 
  syncTransactionToFirestore, 
  syncNoDuesToFirestore, 
  syncCertificateToFirestore, 
  syncCertificateThemeToFirestore,
  deleteCertificateThemeFromFirestore,
  syncPaymentProviderToFirestore,
  deletePaymentProviderFromFirestore,
  syncSubjectToFirestore,
  syncStreamToFirestore,
  syncStudentDueToFirestore,
  syncCampaignToFirestore,
  syncCampaignPaymentToFirestore,
  handleFirestoreError, 
  OperationType, 
  logoutFirebase 
} from './firebase';
import { 
  INITIAL_STUDENTS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_NO_DUES_APPLICATIONS,
  INITIAL_CERTIFICATE_REQUESTS,
  INITIAL_CERTIFICATE_THEMES,
  INITIAL_STAFF_USERS,
  INITIAL_FEE_UPLOAD_BATCHES,
  INITIAL_MASTER_FEE_HEADS,
  INITIAL_ACADEMIC_STREAMS,
  INITIAL_STUDY_SUBJECTS,
  INITIAL_ENROLLMENT_FIELDS,
  INITIAL_CONCESSION_RULES,
  INITIAL_REPORT_CONFIGS,
  INITIAL_FACILITY_OPTIONS,
  INITIAL_FACILITY_APPLICATIONS,
  INITIAL_STUDENT_NOTIFICATIONS,
  INITIAL_STUDENT_ACHIEVEMENTS,
  INITIAL_STAFF_HONOR_AUTHORITIES,
  INITIAL_DYNAMIC_QR_CONFIG,
  INITIAL_HELPDESK_CONFIG,
  INITIAL_COLLEGE_PROFILE,
  INSTITUTION_INFO 
} from './data/mockData';
import { 
  Student, 
  FeeTransaction, 
  StudentNoDuesApplication, 
  CertificateRequest,
  CertificateTheme,
  CertificateType,
  UserSession,
  SchoolStaffUser,
  FeeUploadBatch,
  FeeHeadItem,
  AcademicStream,
  StudySubject,
  EnrollmentField,
  ConcessionSurchargeRule,
  ReportConfig,
  FacilityServiceOption,
  FacilityApplication,
  StudentAchievement,
  StaffHonorAuthority,
  StudentNotification,
  DynamicQrConfig,
  HelpdeskConfig,
  CollegeProfile
} from './types/fee';
import {
  INITIAL_MASTER_FEE_HEADS as INITIAL_CAMPAIGN_FEE_HEADS,
  INITIAL_FEE_PLANS,
  INITIAL_COURSES,
  INITIAL_SEMESTERS,
  INITIAL_SUBJECTS,
  INITIAL_CAMPAIGNS,
  INITIAL_STUDENT_DUES,
  INITIAL_ACTIVE_PROVIDER,
  INITIAL_PROVIDER_HISTORY,
  INITIAL_CAMPAIGN_PAYMENTS,
  INITIAL_AUDIT_LOGS,
} from './data/campaignMockData';
import {
  FeeCampaign,
  MasterFeeHead,
  FeePlan,
  CourseMaster,
  SemesterMaster,
  SubjectMaster,
  StudentDue,
  PaymentProviderConfig,
  ProviderHistoryItem,
  CampaignPayment,
  AuditLogEntry,
} from './types/campaign';
import { LoginPortal } from './components/Auth/LoginPortal';
import { StudentMobileApp } from './components/StudentApp/StudentMobileApp';
import { DynamicQrConfigModal } from './components/Admin/DynamicQrConfigModal';
import { StudentAchievementManagerModal } from './components/Admin/StudentAchievementManagerModal';
import { EnrollmentParameterOptimizer } from './components/Admin/EnrollmentParameterOptimizer';
import { StreamSubjectMaster } from './components/Accountant/StreamSubjectMaster';
import { CollegeProfileManager } from './components/Admin/CollegeProfileManager';
import { UserProfileSummaryModal } from './components/Common/UserProfileSummaryModal';
import { HelpdeskModal } from './components/Helpdesk/HelpdeskModal';
import { AdminHelpdeskControlModal } from './components/Helpdesk/AdminHelpdeskControlModal';
import { syncHelpdeskConfigToFirestore, syncStaffUserToFirestore, syncInstitutionProfileToFirestore } from './firebase';
import { useAuthHandshake } from './hooks/useAuthHandshake';
import { toPaisa, fromPaisa, paisaAdd, paisaSub, formatPaisaINR } from './utils/paisaMath';
import { requestServerFeeSchedule, validateAndCommitLedger } from './services/calculationService';
import { calculateStudentFeeScheduleServer, validateLedgerCommitServer } from './services/serverFeeEngine';
import { ShieldCheck, Lock, Landmark, Award, Users, FileSpreadsheet, Sliders, QrCode, Trophy, Bell, Camera, ChevronRight, ChevronLeft, RotateCw, Palette, Sparkles, Building } from 'lucide-react';

export default function App() {
  const { session: handshakeSession, setSession: setHandshakeSession } = useAuthHandshake();
  const [localSession, setLocalSession] = useState<UserSession | null>(null);
  const session = handshakeSession || localSession;
  const setSession = (action: React.SetStateAction<UserSession | null>) => {
    const nextSession = typeof action === 'function' ? (action as (prev: UserSession | null) => UserSession | null)(session) : action;
    setLocalSession(nextSession);
    setHandshakeSession(nextSession);
  };
  const [showStaffProfileModal, setShowStaffProfileModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('student_home');
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [transactions, setTransactions] = useState<FeeTransaction[]>(INITIAL_TRANSACTIONS);
  const [noDuesApps, setNoDuesApps] = useState<StudentNoDuesApplication[]>(INITIAL_NO_DUES_APPLICATIONS);
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>(INITIAL_CERTIFICATE_REQUESTS);
  const [certificateThemes, setCertificateThemes] = useState<CertificateTheme[]>(INITIAL_CERTIFICATE_THEMES);
  const [staffUsers, setStaffUsers] = useState<SchoolStaffUser[]>(INITIAL_STAFF_USERS);
  const [feeBatches, setFeeBatches] = useState<FeeUploadBatch[]>(INITIAL_FEE_UPLOAD_BATCHES);
  const [feeHeads, setFeeHeads] = useState<FeeHeadItem[]>(INITIAL_MASTER_FEE_HEADS);
  const [streams, setStreams] = useState<AcademicStream[]>(INITIAL_ACADEMIC_STREAMS);
  const [subjects, setSubjects] = useState<StudySubject[]>(INITIAL_STUDY_SUBJECTS);
  const [enrollmentFields, setEnrollmentFields] = useState<EnrollmentField[]>(INITIAL_ENROLLMENT_FIELDS);
  const [concessionRules, setConcessionRules] = useState<ConcessionSurchargeRule[]>(INITIAL_CONCESSION_RULES);
  const [reportConfigs, setReportConfigs] = useState<ReportConfig[]>(INITIAL_REPORT_CONFIGS);
  const [facilityOptions, setFacilityOptions] = useState<FacilityServiceOption[]>(INITIAL_FACILITY_OPTIONS);
  const [facilityApplications, setFacilityApplications] = useState<FacilityApplication[]>(INITIAL_FACILITY_APPLICATIONS);
  const [activeReceiptModalTx, setActiveReceiptModalTx] = useState<FeeTransaction | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  // Fee Campaign System States
  const [campaigns, setCampaigns] = useState<FeeCampaign[]>(INITIAL_CAMPAIGNS);
  const [campaignFeeHeads, setCampaignFeeHeads] = useState<MasterFeeHead[]>(INITIAL_CAMPAIGN_FEE_HEADS);
  const [campaignFeePlans, setCampaignFeePlans] = useState<FeePlan[]>(INITIAL_FEE_PLANS);
  const [campaignCourses, setCampaignCourses] = useState<CourseMaster[]>(INITIAL_COURSES);
  const [campaignSemesters, setCampaignSemesters] = useState<SemesterMaster[]>(INITIAL_SEMESTERS);
  const [campaignSubjects, setCampaignSubjects] = useState<SubjectMaster[]>(INITIAL_SUBJECTS);
  const [campaignStudentDues, setCampaignStudentDues] = useState<StudentDue[]>(INITIAL_STUDENT_DUES);
  const [campaignActiveProvider, setCampaignActiveProvider] = useState<PaymentProviderConfig | null>(INITIAL_ACTIVE_PROVIDER);
  const [campaignProviderHistory, setCampaignProviderHistory] = useState<ProviderHistoryItem[]>(INITIAL_PROVIDER_HISTORY);
  const [campaignPayments, setCampaignPayments] = useState<CampaignPayment[]>(INITIAL_CAMPAIGN_PAYMENTS);
  const [campaignAuditLogs, setCampaignAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  const handleUpdateActiveProvider = (provider: PaymentProviderConfig | null, oldToHistory?: ProviderHistoryItem) => {
    setCampaignActiveProvider(provider);
    if (provider) {
      syncPaymentProviderToFirestore(provider);
    } else {
      deletePaymentProviderFromFirestore();
    }
    if (oldToHistory) {
      setCampaignProviderHistory((prev) => [oldToHistory, ...prev]);
    }
  };

  const handleAddAuditLog = async (log: AuditLogEntry) => {
    const verifiedLog: AuditLogEntry = {
      ...log,
      userEmail: auth.currentUser?.email || session?.emailOrPhone || log.userEmail,
    };
    setCampaignAuditLogs((prev) => [verifiedLog, ...prev]);
    try {
      await setDoc(doc(db, 'auditLogs', verifiedLog.id), {
        ...verifiedLog,
        userId: auth.currentUser?.uid || undefined,
      });
    } catch (err) {
      console.warn('Statutory audit log Firestore commit notice:', err);
    }
  };
  const [helpdeskConfig, setHelpdeskConfig] = useState<HelpdeskConfig>(INITIAL_HELPDESK_CONFIG);
  const [isHelpdeskOpen, setIsHelpdeskOpen] = useState<boolean>(false);
  const [isAdminHelpdeskControlOpen, setIsAdminHelpdeskControlOpen] = useState<boolean>(false);
  const [isDemoMode] = useState<boolean>(false);
  const [showQuickFeePaymentModal, setShowQuickFeePaymentModal] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);

  // Institutional College Profile State (Synchronized across app)
  const [collegeProfile, setCollegeProfile] = useState<CollegeProfile>(() => {
    try {
      const cached = localStorage.getItem('college_profile');
      if (cached) {
        const parsed = safeJsonParse<Partial<CollegeProfile>>(cached, {});
        if (parsed && typeof parsed === 'object') {
          return { ...INITIAL_COLLEGE_PROFILE, ...parsed };
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_COLLEGE_PROFILE;
  });

  const handleUpdateCollegeProfile = async (updated: CollegeProfile) => {
    const previous = collegeProfile;
    setCollegeProfile(updated);
    try {
      await syncInstitutionProfileToFirestore(updated);
      try {
        localStorage.setItem('college_profile', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage quota or serialization error:', e);
      }
    } catch (err) {
      console.error('Failed to sync institution profile to Firestore, rolling back:', err);
      setCollegeProfile(previous);
      try {
        localStorage.setItem('college_profile', JSON.stringify(previous));
      } catch {
        // empty
      }
    }
  };

  // Synchronize Institutional College Profile from Firestore
  useEffect(() => {
    const unsubCollege = onSnapshot(
      doc(db, 'institutionProfile', 'primary'),
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data() as CollegeProfile;
          setCollegeProfile({
            ...INITIAL_COLLEGE_PROFILE,
            ...remoteData
          });
          try {
            localStorage.setItem('college_profile', JSON.stringify(remoteData));
          } catch {
            // empty
          }
        }
      },
      (error) => {
        console.warn('Institution profile sync warning:', error);
      }
    );
    return () => unsubCollege();
  }, []);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Global unhandled promise rejection trap to protect React fiber tree
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.warn('Unhandled promise rejection captured by ERP boundary:', event.reason);
      event.preventDefault();
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  const isSyncingRef = useRef<boolean>(false);
  const isMutatingDuesRef = useRef<boolean>(false);

  // Collection data fetch on login & manual on-demand sync
  const handleSyncDashboardData = async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      if (db) {
        const isVerifiedStaff = Boolean(
          session?.role === 'admin' &&
          session.staffRole &&
          staffUsers.some((u) => u.id === session.id || (u.email && u.email === session.emailOrPhone))
        );
        const currentStudentId = session?.role === 'student' ? (session.studentRefId || session.id) : (firebaseUser?.uid || '');
        const [studentRes, txRes, duesRes, campaignsRes] = await Promise.allSettled([
          isVerifiedStaff 
            ? getDocs(collection(db, 'students')) 
            : (currentStudentId ? getDocs(query(collection(db, 'students'), where('id', '==', currentStudentId))) : Promise.resolve(null)),
          isVerifiedStaff
            ? getDocs(collection(db, 'transactions'))
            : (currentStudentId ? getDocs(query(collection(db, 'transactions'), where('studentId', '==', currentStudentId))) : Promise.resolve(null)),
          isVerifiedStaff
            ? getDocs(collection(db, 'studentDues'))
            : (currentStudentId ? getDocs(query(collection(db, 'studentDues'), where('studentId', '==', currentStudentId))) : Promise.resolve(null)),
          getDocs(collection(db, 'campaigns')),
        ]);

        if (studentRes.status === 'fulfilled' && studentRes.value && !studentRes.value.empty) {
          const remoteList: Student[] = [];
          studentRes.value.forEach((docSnap) => {
            remoteList.push(docSnap.data() as Student);
          });

          // Reconcile case-insensitively with current state
          setStudents((prev) => {
            const map = new Map(remoteList.map((s) => [safeLower(safeTrim(s.rollNo)), s]));
            prev.forEach((s) => {
              const k = safeLower(safeTrim(s.rollNo));
              if (k && !map.has(k)) {
                map.set(k, s);
              }
            });
            return Array.from(map.values());
          });
        }

        if (txRes.status === 'fulfilled' && txRes.value) {
          const remoteTx: FeeTransaction[] = [];
          txRes.value.forEach((docSnap) => {
            remoteTx.push(docSnap.data() as FeeTransaction);
          });
          setTransactions((prev) => {
            const map = new Map(remoteTx.map((t) => [t.id, t]));
            prev.forEach((t) => {
              if (!map.has(t.id)) {
                map.set(t.id, t);
              }
            });
            return Array.from(map.values());
          });
        }

        if (duesRes.status === 'fulfilled' && duesRes.value) {
          const remoteDues: StudentDue[] = [];
          duesRes.value.forEach((docSnap) => {
            remoteDues.push(docSnap.data() as StudentDue);
          });
          setCampaignStudentDues((prev) => {
            const map = new Map(remoteDues.map((d) => [d.id, d]));
            prev.forEach((d) => {
              if (!map.has(d.id)) {
                map.set(d.id, d);
              }
            });
            return Array.from(map.values());
          });
        }

        if (campaignsRes.status === 'fulfilled' && campaignsRes.value && !campaignsRes.value.empty) {
          const remoteCampaigns: FeeCampaign[] = [];
          campaignsRes.value.forEach((docSnap) => {
            remoteCampaigns.push(docSnap.data() as FeeCampaign);
          });
          setCampaigns(remoteCampaigns);
        }
      }
      setLastSynced(new Date());
    } catch (error) {
      console.warn('Dashboard data sync notice:', error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  };

  // Fetch once upon staff/user login (not continuously polling in the background)
  useEffect(() => {
    if (session?.role === 'admin' || firebaseUser) {
      handleSyncDashboardData();
    }
  }, [session?.id, firebaseUser]);

  // Real-time Firestore synchronization for supporting modules
  useEffect(() => {
    if (!firebaseUser && !session) {
      return;
    }

    // 3. Synchronize No Dues Applications from Firestore (accurately syncing deletions)
    const unsubNoDues = onSnapshot(
      collection(db, 'noDuesApplications'),
      (snapshot) => {
        const remoteApps: StudentNoDuesApplication[] = [];
        snapshot.forEach((docSnap) => {
          remoteApps.push(docSnap.data() as StudentNoDuesApplication);
        });
        setNoDuesApps(remoteApps);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'noDuesApplications');
      }
    );

    // 4. Synchronize Certificate Requests from Firestore
    const unsubCerts = onSnapshot(
      collection(db, 'certificateRequests'),
      (snapshot) => {
        const remoteReqs: CertificateRequest[] = [];
        snapshot.forEach((docSnap) => {
          remoteReqs.push(docSnap.data() as CertificateRequest);
        });
        setCertificateRequests(remoteReqs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'certificateRequests');
      }
    );

    // 5. Synchronize Certificate Themes from Firestore
    const unsubThemes = onSnapshot(
      collection(db, 'certificateThemes'),
      (snapshot) => {
        const remoteThemes: CertificateTheme[] = [];
        snapshot.forEach((docSnap) => {
          remoteThemes.push(docSnap.data() as CertificateTheme);
        });
        if (remoteThemes.length > 0) {
          setCertificateThemes(remoteThemes);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'certificateThemes');
      }
    );

    // 6. Synchronize Payment Provider from Firestore
    const unsubProvider = onSnapshot(
      doc(db, 'paymentProvider', 'active'),
      (docSnap) => {
        if (docSnap.exists()) {
          setCampaignActiveProvider(docSnap.data() as PaymentProviderConfig);
        } else {
          setCampaignActiveProvider(null);
        }
      },
      (error) => {
        console.warn('Payment provider sync fallback:', error);
      }
    );

    // 7. Synchronize Student Dues from Firestore
    const unsubStudentDues = onSnapshot(
      collection(db, 'studentDues'),
      (snapshot) => {
        if (isMutatingDuesRef.current) {
          return; // Suppress remote snapshot overwrite while local FIFO dues allocation is in flight
        }
        if (!snapshot.empty) {
          const remoteDues: StudentDue[] = [];
          snapshot.forEach((docSnap) => {
            remoteDues.push(docSnap.data() as StudentDue);
          });
          setCampaignStudentDues(remoteDues);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'studentDues');
      }
    );

    // 8. Synchronize Dynamic QR Configuration from Firestore
    const unsubDynamicQr = onSnapshot(
      doc(db, 'dynamicQrConfig', 'default'),
      (docSnap) => {
        if (docSnap.exists()) {
          setDynamicQrConfig(docSnap.data() as DynamicQrConfig);
        }
      },
      (error) => {
        console.warn('Dynamic QR config sync fallback:', error);
      }
    );

    // 9. Synchronize Statutory Audit Logs from Firestore
    const unsubAuditLogs = onSnapshot(
      collection(db, 'auditLogs'),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteLogs: AuditLogEntry[] = [];
          snapshot.forEach((docSnap) => {
            remoteLogs.push(docSnap.data() as AuditLogEntry);
          });
          setCampaignAuditLogs((prev) => {
            const map = new Map(prev.map((l) => [l.id, l]));
            remoteLogs.forEach((l) => map.set(l.id, l));
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          });
        }
      },
      (error) => {
        console.warn('Audit logs remote sync notice:', error);
      }
    );

    // 10. Synchronize Student Achievements from Firestore
    const unsubAchievements = onSnapshot(
      collection(db, 'achievements'),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteList: StudentAchievement[] = [];
          snapshot.forEach((docSnap) => {
            remoteList.push(docSnap.data() as StudentAchievement);
          });
          setAchievements(remoteList);
        }
      },
      (error) => {
        console.warn('Achievements sync notice:', error);
      }
    );

    // 11. Synchronize Academic Streams from Firestore
    const unsubStreams = onSnapshot(
      collection(db, 'streams'),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteStreams: AcademicStream[] = [];
          snapshot.forEach((docSnap) => {
            remoteStreams.push(docSnap.data() as AcademicStream);
          });
          setStreams(remoteStreams);
        }
      },
      (error) => {
        console.warn('Academic streams sync notice:', error);
      }
    );

    // 12. Synchronize Study Subjects from Firestore
    const unsubSubjects = onSnapshot(
      collection(db, 'subjects'),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteSubjects: StudySubject[] = [];
          snapshot.forEach((docSnap) => {
            remoteSubjects.push(docSnap.data() as StudySubject);
          });
          setSubjects(remoteSubjects);
        }
      },
      (error) => {
        console.warn('Study subjects sync notice:', error);
      }
    );

    return () => {
      unsubNoDues();
      unsubCerts();
      unsubThemes();
      unsubProvider();
      unsubStudentDues();
      unsubDynamicQr();
      unsubAuditLogs();
      unsubAchievements();
      unsubStreams();
      unsubSubjects();
    };
  }, [firebaseUser?.uid, session?.id, session?.role]);

  // Notifications, Achievements & Dynamic QR Configuration
  const [achievements, setAchievements] = useState<StudentAchievement[]>(INITIAL_STUDENT_ACHIEVEMENTS);
  const [staffAuthorities, setStaffAuthorities] = useState<StaffHonorAuthority[]>(INITIAL_STAFF_HONOR_AUTHORITIES);
  const [notifications, setNotifications] = useState<StudentNotification[]>(INITIAL_STUDENT_NOTIFICATIONS);
  const [dynamicQrConfig, setDynamicQrConfig] = useState<DynamicQrConfig>(INITIAL_DYNAMIC_QR_CONFIG);
  const [showDynamicQrConfigModal, setShowDynamicQrConfigModal] = useState<boolean>(false);
  const [showAchievementManagerModal, setShowAchievementManagerModal] = useState<boolean>(false);

  const handleAddAchievement = async (achievement: StudentAchievement) => {
    setAchievements((prev) => [achievement, ...prev]);
    try {
      await setDoc(doc(db, 'achievements', achievement.id), achievement);
    } catch (err) {
      console.warn('Achievement Firestore sync notice:', err);
    }
  };

  const handleDeleteAchievement = async (id: string) => {
    setAchievements((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteDoc(doc(db, 'achievements', id));
    } catch (err) {
      console.warn('Achievement Firestore delete notice:', err);
    }
  };

  const handleMarkNotificationAsRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Unified Fee Structure: Annual fee is not calculated separately; fee payable is strictly per Fee Module dues
  useEffect(() => {
    setStudents((prevStudents) => {
      let hasChanges = false;
      const updated = prevStudents.map((s) => {
        const matchingDues = campaignStudentDues.filter(
          (d) =>
            safeMatchStrings(d.rollNo, s.rollNo) &&
            (d.status as string) !== 'Cancelled' &&
            (d.status as string) !== 'Voided'
        );
        if (matchingDues.length > 0) {
          const totalPaisa = matchingDues.reduce((sum, d) => paisaAdd(sum, toPaisa(d.netAmount)), 0);
          const paidPaisa = matchingDues.reduce((sum, d) => paisaAdd(sum, toPaisa(d.paidAmount)), 0);
          const pendingPaisa = paisaSub(totalPaisa, paidPaisa, true);
          const latePaisa = matchingDues.reduce((sum, d) => paisaAdd(sum, toPaisa(d.lateFeeApplied)), 0);

          const total = fromPaisa(totalPaisa);
          const paid = fromPaisa(paidPaisa);
          const pending = fromPaisa(pendingPaisa);
          const late = fromPaisa(latePaisa);
          const isDiff =
            toPaisa(s.totalFee) !== totalPaisa ||
            toPaisa(s.paidFee) !== paidPaisa ||
            toPaisa(s.pendingFee) !== pendingPaisa ||
            toPaisa(s.lateFineApplied || 0) !== latePaisa;

          if (isDiff) {
            hasChanges = true;
            return {
              ...s,
              totalFee: total,
              paidFee: paid,
              pendingFee: pending,
              lateFineApplied: late,
            };
          }
        }
        return s;
      });
      return hasChanges ? updated : prevStudents;
    });
  }, [campaignStudentDues]);

  const handleLogin = (newSession: UserSession) => {
    let resolvedSession = { ...newSession };

    if (newSession.role === 'student' && newSession.rollNo) {
      // Look up if this student profile already exists in state
      const matched = students.find((s) =>
        safeMatchStrings(s.rollNo, newSession.rollNo)
      );
      if (matched && !resolvedSession.dateOfBirth) {
        resolvedSession.dateOfBirth = matched.dateOfBirth;
      }
      setSession(resolvedSession);

      const matchExists = Boolean(matched);

      // If they don't exist yet, seed a fresh template into state dynamically
      if (!matchExists) {
        const studentRoll = newSession.rollNo || 'NEW-STUDENT';
        const defaultCamp = campaigns[0] || INITIAL_CAMPAIGNS[0];
        const defaultStream = streams[0]?.code || 'CSE';
        const newDue: StudentDue = {
          id: `DUE-${Date.now()}`,
          campaignId: defaultCamp.id,
          campaignTitle: defaultCamp.title,
          studentId: newSession.id,
          studentEmail: newSession.emailOrPhone,
          rollNo: studentRoll,
          studentName: newSession.name,
          course: 'B.Tech',
          semester: 1,
          baseAmount: defaultCamp.totalAmount,
          concessionAmount: 0,
          netAmount: defaultCamp.totalAmount,
          paidAmount: 0,
          balanceAmount: defaultCamp.totalAmount,
          status: 'Pending',
          lineItems: defaultCamp.customHeads.map((h) => ({
            headId: h.headId,
            name: h.headName,
            amount: h.amount,
          })),
          lateFeeApplied: 0,
          paymentLink: `/pay?campaignId=${defaultCamp.id}&rollNo=${encodeURIComponent(studentRoll)}`,
          paymentLinkActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setCampaignStudentDues((prev) => {
          const alreadyExists = prev.some((d) => safeMatchStrings(d.rollNo, studentRoll));
          return alreadyExists ? prev : [...prev, newDue];
        });
        syncStudentDueToFirestore(newDue).catch(() => {});

        const fallbackNewStudent: Student = {
          id: newSession.id,
          rollNo: studentRoll,
          registerNo: `RLSY/25/BTECH/${defaultStream}/${studentRoll}`,
          name: newSession.name,
          gender: 'Male',
          fatherName: 'Father Name',
          parentName: 'Parent Name',
          email: newSession.emailOrPhone,
          phone: '+91 98000 00000',
          parentPhone: '+91 98000 00001',
          course: 'B.Tech',
          branch: 'Computer Science & Engineering',
          streamCode: defaultStream,
          subjectsEnrolled: ['CS-701', 'CS-702'],
          year: 1,
          semester: 1,
          admissionYear: 2025,
          dateOfBirth: '2005-01-01',
          category: 'General',
          domicileState: 'Bihar',
          annualFamilyIncome: 200000,
          quota: 'State Merit (Subsidized)',
          hostelResident: false,
          scholarshipWaiverPercent: 0,
          totalFee: newDue.netAmount,
          paidFee: 0,
          pendingFee: newDue.balanceAmount,
          lateFineApplied: 0,
          hallTicketBlocked: false,
        };
        setStudents((prev) => [...prev, fallbackNewStudent]);
        syncStudentToFirestore(fallbackNewStudent).catch(() => {});
      }
      setActiveTab('student_home');
    } else {
      const matchedStaff = staffUsers.find(
        (u) => u.id === newSession.id || safeMatchStrings(u.email, newSession.emailOrPhone)
      );
      if (matchedStaff && !resolvedSession.dateOfBirth) {
        resolvedSession.dateOfBirth = matchedStaff.dateOfBirth;
      }
      setSession(resolvedSession);

      if (newSession.staffRole === 'App_Admin') {
        setActiveTab('users');
      } else {
        setActiveTab('overview');
      }
    }
  };

  const handleLogout = () => {
    logoutFirebase().catch(() => {});
    setSession(null);
    // Secure session teardown: wipe sensitive financial and student data from client memory
    setStudents(INITIAL_STUDENTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setCampaignStudentDues(INITIAL_STUDENT_DUES);
    setCampaignPayments(INITIAL_CAMPAIGN_PAYMENTS);
    setCampaignAuditLogs(INITIAL_AUDIT_LOGS);
    setNoDuesApps(INITIAL_NO_DUES_APPLICATIONS);
    setCertificateRequests(INITIAL_CERTIFICATE_REQUESTS);
    setActiveTab('overview');
  };

  const handleSwitchRole = (_targetRole: 'student' | 'admin' | 'app_admin') => {
    // Client-side role switching is permanently disabled across all environments to enforce institutional access controls
    console.warn('Role escalation blocked: client-side role switching is permanently disabled. Please log in with verified institutional credentials.');
    return;
  };

  const handleUpdateStudentProfilePicture = (studentId: string, photoUrl: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId || s.rollNo === studentId ? { ...s, profilePicture: photoUrl } : s))
    );
    if (session && (session.id === studentId || session.rollNo === studentId || session.studentRefId === studentId)) {
      setSession((prev) => (prev ? { ...prev, profilePicture: photoUrl } : null));
    }
  };

  const handleUpdateStaffProfilePicture = (staffId: string, photoUrl: string) => {
    setStaffUsers((prev) =>
      prev.map((u) => (u.id === staffId ? { ...u, profilePicture: photoUrl } : u))
    );
    if (session && session.id === staffId) {
      setSession((prev) => (prev ? { ...prev, profilePicture: photoUrl } : null));
    }
  };

  const handleUpdateCurrentProfilePicture = (photoUrl: string) => {
    if (!session) return;
    if (session.role === 'student') {
      const targetId = activeStudentForUser?.id || session.id;
      handleUpdateStudentProfilePicture(targetId, photoUrl);
    } else {
      handleUpdateStaffProfilePicture(session.id, photoUrl);
    }
  };

  // Staff and User Management
  const handleAddStaffUser = (newUser: SchoolStaffUser) => {
    setStaffUsers((prev) => [newUser, ...prev]);
    syncStaffUserToFirestore(newUser).catch(() => {});
  };

  const handleUpdateStaffUser = (updatedUser: SchoolStaffUser) => {
    // Only App_Admin can modify staff accounts
    const isAppAdmin = session?.isAppAdmin || session?.staffRole === 'App_Admin';
    if (!isAppAdmin && session?.id !== updatedUser.id) {
      console.warn('Unauthorized attempt to update staff account');
      return;
    }

    // Prevent self-promotion: logged-in user cannot promote their own role
    let sanitized = { ...updatedUser };
    if (session?.id === updatedUser.id && session?.staffRole && updatedUser.role !== session.staffRole) {
      sanitized.role = session.staffRole;
    }

    setStaffUsers((prev) => prev.map((u) => (u.id === sanitized.id ? sanitized : u)));
    syncStaffUserToFirestore(sanitized).catch(() => {});
    if (session && session.id === sanitized.id) {
      setSession({
        ...session,
        name: sanitized.name,
        emailOrPhone: sanitized.email,
        staffDesignation: sanitized.designation,
        staffRole: sanitized.role,
        isAppAdmin: sanitized.role === 'App_Admin',
        canManageCertificateThemes: Boolean(sanitized.canManageCertificateThemes),
      });
    }
  };

  // Certificate Theme Management Handlers
  const handleSaveCertificateTheme = (theme: CertificateTheme) => {
    setCertificateThemes((prev) => {
      const exists = prev.some((t) => t.id === theme.id);
      if (exists) {
        return prev.map((t) => (t.id === theme.id ? theme : t));
      }
      return [...prev, theme];
    });
    syncCertificateThemeToFirestore(theme);
  };

  const handleDeleteCertificateTheme = (themeId: string) => {
    setCertificateThemes((prev) => prev.filter((t) => t.id !== themeId));
    deleteCertificateThemeFromFirestore(themeId);
  };

  const handleSetDefaultCertificateTheme = (themeId: string, certType: CertificateType | 'All') => {
    setCertificateThemes((prev) => {
      const updated = prev.map((t) => {
        if (certType === 'All') {
          return { ...t, isDefault: t.id === themeId };
        }
        if (t.certificateType === certType || t.certificateType === 'All') {
          return { ...t, isDefault: t.id === themeId };
        }
        return t;
      });
      // Sync the changed themes to Firestore
      const target = updated.find((t) => t.id === themeId);
      if (target) syncCertificateThemeToFirestore(target);
      return updated;
    });
  };

  const handleDeleteStaffUser = (userId: string) => {
    // Only App_Admin can delete staff users
    const isAppAdmin = session?.isAppAdmin || session?.staffRole === 'App_Admin';
    if (!isAppAdmin) {
      console.warn('Unauthorized attempt to delete staff account');
      return;
    }

    // Prevent deleting own session or last App_Admin
    if (session?.id === userId) {
      console.warn('Self-deletion of administrator account is prevented');
      return;
    }

    const remainingAdmins = staffUsers.filter((u) => u.role === 'App_Admin' && u.id !== userId);
    if (remainingAdmins.length === 0) {
      console.warn('Cannot delete the last App_Admin user');
      return;
    }

    setStaffUsers((prev) => prev.filter((u) => u.id !== userId));
    deleteDoc(doc(db, 'staffUsers', userId)).catch(() => {});
  };

  // Student CRUD by App Admin
  const handleAddStudent = (newStudent: Student) => {
    setStudents((prev) => [newStudent, ...prev]);
  };

  const handleBatchAddStudents = (incomingStudents: Student[]) => {
    setStudents((prev) => {
      const existingMap = new Map(
        prev.map((s) => [safeLower(s.rollNo), s])
      );
      const newlyAdded: Student[] = [];

      for (const raw of incomingStudents) {
        const normalizedRoll = (raw.rollNo || '').trim().toUpperCase();
        const normalizedReg = (raw.registerNo || normalizedRoll).trim().toUpperCase();
        const rawItem: Student = { ...raw, rollNo: normalizedRoll, registerNo: normalizedReg };
        const key = safeLower(normalizedRoll);
        
        // Compute quota/category concessions, domicile rules and subjects for bulk admitted student
        const schedule = calculateStudentFeeScheduleServer(
          rawItem,
          feeHeads,
          concessionRules,
          subjects
        );
        const item: Student = {
          ...rawItem,
          totalFee: fromPaisa(schedule.totalFeePaisa),
          pendingFee: fromPaisa(Math.max(0, schedule.totalFeePaisa - toPaisa(rawItem.paidFee || 0))),
          appliedConcessions: schedule.concessions.map((c) => ({
            ruleName: c.name,
            amount: fromPaisa(c.appliedPaisa),
          })),
          appliedSurcharges: schedule.surcharges.map((s) => ({
            ruleName: `Surcharge: ${s.name}`,
            amount: fromPaisa(s.appliedPaisa),
          })),
        };

        if (key && existingMap.has(key)) {
          const old = existingMap.get(key)!;
          existingMap.set(key, { ...old, ...item, id: old.id });
        } else if (key) {
          newlyAdded.push(item);
        }
      }
      return [...newlyAdded, ...Array.from(existingMap.values())];
    });
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
    syncStudentToFirestore(updatedStudent).catch(() => {});
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  // Bulk Student Academic Course & Semester Profile Updates (Accountant & Admin)
  const handleBulkUpdateStudents = (updatedList: Student[], auditDetails?: string) => {
    setStudents((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      updatedList.forEach((u) => {
        map.set(u.id, u);
        syncStudentToFirestore(u).catch(() => {});
      });
      return Array.from(map.values());
    });

    if (auditDetails) {
      handleAddAuditLog({
        id: `LOG-STU-UPDATE-${Date.now()}`,
        entityType: 'Course',
        entityId: 'BATCH-STUDENTS',
        action: 'UPDATE',
        userEmail: session?.emailOrPhone || 'accountant@rlsycollege.ac.in',
        userName: session?.name || 'Accounts Officer',
        userRole: session?.staffRole || 'Accounts_Officer',
        details: auditDetails,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Batch Fee Upload & Authorization
  const handleSubmitBatch = (newBatch: FeeUploadBatch) => {
    setFeeBatches((prev) => [newBatch, ...prev]);
  };

  const handleAuthorizeBatch = (
    batchId: string, 
    officerName: string, 
    officerDesignation: string, 
    remarks?: string
  ) => {
    const batchToAuth = feeBatches.find((b) => b.id === batchId);
    if (!batchToAuth) return;

    // 1. Mark batch as Approved
    setFeeBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? {
              ...b,
              status: 'Approved' as const,
              authorizedAt: new Date().toISOString(),
              authorizedBy: {
                id: 'USR-AO-01',
                name: officerName,
                role: 'Accounts_Officer',
                designation: officerDesignation,
              },
              approvalRemarks: remarks,
            }
          : b
      )
    );

    // 2. Atomically update live student ledger values (totalFee & pendingFee)
    setStudents((prev) =>
      prev.map((student) => {
        const matchedItem = batchToAuth.items.find(
          (item) => safeMatchStrings(item.rollNo, student.rollNo) && item.status === 'Matched'
        );

        if (matchedItem) {
          const rawTotalPaisa = toPaisa(matchedItem.newTotalFeePayable);
          const currentPaidPaisa = toPaisa(student.paidFee);
          // Financial Invariant: totalFee must not be lower than already collected paidFee
          const effectiveTotalPaisa = Math.max(rawTotalPaisa, currentPaidPaisa);
          const newPendingPaisa = paisaSub(effectiveTotalPaisa, currentPaidPaisa, true);

          // Strict Server Ledger Commit Validation Guard
          const validation = validateLedgerCommitServer({
            studentRollNo: student.rollNo,
            previousTotalPaisa: toPaisa(student.totalFee),
            newTotalPaisa: effectiveTotalPaisa,
            paidPaisa: currentPaidPaisa,
            pendingPaisa: newPendingPaisa,
            differencePaisa: toPaisa(matchedItem.difference),
            authorizedBy: {
              id: session?.id || 'AUTH-OFFICER',
              name: session?.name || officerName,
              role: session?.staffRole || 'Accounts_Officer',
              email: session?.emailOrPhone || 'officer@rlsy.ac.in',
            },
            calculationHash: `BATCH-${batchToAuth.batchNo}`,
          });

          if (!validation.isValid) {
            console.error('Server Ledger validation rejected batch item commit:', validation.errors);
            return student;
          }

          const updatedStudent: Student = {
            ...student,
            totalFee: fromPaisa(effectiveTotalPaisa),
            pendingFee: fromPaisa(newPendingPaisa),
            hallTicketBlocked: newPendingPaisa > 0 
              ? (newPendingPaisa > ((collegeProfile as any)?.defaulterThresholdPaisa || 100000) ? true : Boolean(student.hallTicketBlocked))
              : false,
          };

          // Synchronize authorized live student ledger state to Cloud Firestore
          syncStudentToFirestore(updatedStudent).catch((err) =>
            console.error('Failed to sync authorized batch student to Firestore:', err)
          );

          return updatedStudent;
        }
        return student;
      })
    );
  };

  const handleRejectBatch = (batchId: string, officerName: string, reason: string) => {
    setFeeBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? {
              ...b,
              status: 'Rejected' as const,
              rejectionReason: reason,
              authorizedBy: {
                id: 'USR-AO-01',
                name: officerName,
                role: 'Accounts_Officer',
                designation: 'Accounts Officer & Treasury Bursar',
              },
            }
          : b
      )
    );
  };

  // Dynamically calculate and apply fee heads, subjects, and concession/surcharge rules to students
  // Enforced strictly via Server-Authoritative Calculation Engine in integer Paisa
  const handleApplyRulesToStudents = () => {
    setStudents((prevStudents) =>
      prevStudents.map((stu) => {
        const serverSchedule = calculateStudentFeeScheduleServer(stu, feeHeads, concessionRules, subjects);
        const newTotalPaisa = serverSchedule.totalFeePaisa;
        const currentPaidPaisa = toPaisa(stu.paidFee || 0);
        // Financial Invariant: total fee must not be less than already collected fee
        const effectiveTotalPaisa = Math.max(newTotalPaisa, currentPaidPaisa);
        const newPendingPaisa = paisaSub(effectiveTotalPaisa, currentPaidPaisa, true);

        const updatedStudent: Student = {
          ...stu,
          totalFee: fromPaisa(effectiveTotalPaisa),
          pendingFee: fromPaisa(newPendingPaisa),
          appliedConcessions: serverSchedule.concessions.map((c) => ({
            ruleName: c.name,
            amount: fromPaisa(c.appliedPaisa),
          })),
          appliedSurcharges: serverSchedule.surcharges.map((s) => ({
            ruleName: `Surcharge: ${s.name}`,
            amount: fromPaisa(s.appliedPaisa),
          })),
        };
        syncStudentToFirestore(updatedStudent).catch(() => {});
        return updatedStudent;
      })
    );
  };

  const handlePaymentSuccess = async (newTx: FeeTransaction, updatedStudent: Student) => {
    isMutatingDuesRef.current = true;
    setTransactions((prev) => [newTx, ...prev]);
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));

    // Synchronize campaignStudentDues sequentially (FIFO: oldest pending due first)
    setCampaignStudentDues((prevDues) => {
      let remainingToAllocate = newTx.amount;
      const matchingDues = prevDues
        .filter(
          (due) =>
            safeMatchStrings(due.rollNo, updatedStudent.rollNo) &&
            (due.status as string) !== 'Cancelled' &&
            (due.status as string) !== 'Voided' &&
            due.balanceAmount > 0
        )
        .sort((a, b) => new Date(a.dueDate || a.createdAt || 0).getTime() - new Date(b.dueDate || b.createdAt || 0).getTime());

      const updatedMap = new Map<string, StudentDue>();

      for (const due of matchingDues) {
        if (remainingToAllocate <= 0) break;
        const paidAmt = Math.min(due.balanceAmount, remainingToAllocate);
        if (paidAmt > 0) {
          const newPaid = due.paidAmount + paidAmt;
          const newBal = Math.max(0, due.balanceAmount - paidAmt);
          remainingToAllocate -= paidAmt;
          const updatedDue: StudentDue = {
            ...due,
            paidAmount: newPaid,
            balanceAmount: newBal,
            status: newBal === 0 ? ('Paid' as const) : ('Partial' as const),
            updatedAt: new Date().toISOString(),
          };
          if (auth.currentUser && !auth.currentUser.isAnonymous) {
            syncStudentDueToFirestore(updatedDue).catch(() => {});
          }
          updatedMap.set(due.id, updatedDue);
        }
      }

      return prevDues.map((d) => updatedMap.get(d.id) || d);
    });

    // Journal payment record to campaignPayments in Firestore (supported for both authenticated and quick-pay callers)
    syncCampaignPaymentToFirestore({
      id: newTx.id,
      receiptNo: newTx.receiptNo,
      dueId: `DUE-DIRECT-${newTx.id}`,
      campaignId: 'CMP-DIRECT-FEE',
      campaignTitle: 'Direct Fee Payment / Clearance',
      rollNo: updatedStudent.rollNo,
      studentName: updatedStudent.name,
      course: updatedStudent.course,
      semester: updatedStudent.semester,
      amountPaid: newTx.amount,
      lateFeePaid: 0,
      balanceRemaining: updatedStudent.pendingFee,
      paymentMode: (newTx.paymentMethod === 'Cash' || newTx.paymentMethod === 'Cheque' || newTx.paymentMethod === 'POS' ? newTx.paymentMethod : (newTx.paymentMethod === 'Demand Draft' ? 'DD' : 'Online Gateway')),
      providerId: campaignActiveProvider?.id || 'PRV-OFFLINE',
      providerName: campaignActiveProvider?.name || 'Institutional Counter Gateway',
      providerType: campaignActiveProvider?.type || 'SBI e-Pay / SBI Collect',
      providerMode: campaignActiveProvider?.mode || 'Live',
      transactionId: newTx.gatewayTransactionId || newTx.receiptNo,
      idempotencyKey: `IDEMP-${newTx.id}`,
      timestamp: new Date().toISOString(),
      status: 'Success',
      lineItems: newTx.headsAllocated ? newTx.headsAllocated.map((h) => ({ headId: h.headName, name: h.headName, amount: h.amount })) : [],
    }).catch(() => {});

    // Commit ledger updates to remote Firestore if caller has a verified non-anonymous session (Staff or signed-in student)
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      syncTransactionToFirestore(newTx).catch((err) => console.error('Failed to sync transaction to Firestore:', err));
      syncStudentToFirestore(updatedStudent).catch((err) => console.error('Failed to sync student to Firestore:', err));
    } else {
      console.info('Payment journaled to Firestore payments. Full ledger reconciliation active.');
    }

    // Release state lock after sufficient round-trip propagation debounce
    setTimeout(() => {
      isMutatingDuesRef.current = false;
    }, 3000);
    
    // Automatically update accounts clearance in No Dues if student had an active application
    setNoDuesApps((prev) =>
      prev.map((app) => {
        if (safeMatchStrings(app.studentRollNo, updatedStudent.rollNo)) {
          const isFullyCleared = updatedStudent.pendingFee <= 0;
          const updatedAccounts = {
            ...app.clearances.accounts,
            status: (isFullyCleared ? 'Approved' : 'Dues_Pending') as 'Approved' | 'Dues_Pending' | 'Pending',
            dueAmount: isFullyCleared ? 0 : updatedStudent.pendingFee,
            dueReason: isFullyCleared ? undefined : app.clearances.accounts.dueReason,
            clearedDate: isFullyCleared ? new Date().toISOString().split('T')[0] : app.clearances.accounts.clearedDate,
            receiptReference: newTx.receiptNo,
          };
          const newClearances = { ...app.clearances, accounts: updatedAccounts };
          const allApproved = Object.values(newClearances).every((c) => c.status === 'Approved');
          const finalApp = {
            ...app,
            clearances: newClearances,
            overallStatus: allApproved ? ('Approved' as const) : ('In_Progress' as const),
            certificateGenerated: allApproved,
            certificateNo: allApproved ? `GIT/NOC/2025/${app.studentRollNo}` : app.certificateNo,
          };
          syncNoDuesToFirestore(finalApp).catch(() => {});
          return finalApp;
        }
        return app;
      })
    );
  };

  const handleCashierPayment = async (newTx: FeeTransaction, updatedStudent: Student) => {
    setTransactions((prev) => [newTx, ...prev]);
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));

    // Synchronize campaignStudentDues sequentially (FIFO: oldest pending due first)
    setCampaignStudentDues((prevDues) => {
      let remainingToAllocate = newTx.amount;
      const matchingDues = prevDues
        .filter(
          (due) =>
            safeMatchStrings(due.rollNo, updatedStudent.rollNo) &&
            (due.status as string) !== 'Cancelled' &&
            (due.status as string) !== 'Voided' &&
            due.balanceAmount > 0
        )
        .sort((a, b) => new Date(a.dueDate || a.createdAt || 0).getTime() - new Date(b.dueDate || b.createdAt || 0).getTime());

      const updatedMap = new Map<string, StudentDue>();

      for (const due of matchingDues) {
        if (remainingToAllocate <= 0) break;
        const paidAmt = Math.min(due.balanceAmount, remainingToAllocate);
        if (paidAmt > 0) {
          const newPaid = due.paidAmount + paidAmt;
          const newBal = Math.max(0, due.balanceAmount - paidAmt);
          remainingToAllocate -= paidAmt;
          const updatedDue: StudentDue = {
            ...due,
            paidAmount: newPaid,
            balanceAmount: newBal,
            status: newBal === 0 ? ('Paid' as const) : ('Partial' as const),
            updatedAt: new Date().toISOString(),
          };
          syncStudentDueToFirestore(updatedDue).catch(() => {});
          updatedMap.set(due.id, updatedDue);
        }
      }

      return prevDues.map((d) => updatedMap.get(d.id) || d);
    });

    // Automatically update accounts clearance in No Dues on Cashier counter payment
    setNoDuesApps((prev) =>
      prev.map((app) => {
        if (safeMatchStrings(app.studentRollNo, updatedStudent.rollNo)) {
          const isFullyCleared = updatedStudent.pendingFee <= 0;
          const updatedAccounts = {
            ...app.clearances.accounts,
            status: (isFullyCleared ? 'Approved' : 'Dues_Pending') as 'Approved' | 'Dues_Pending' | 'Pending',
            dueAmount: isFullyCleared ? 0 : updatedStudent.pendingFee,
            dueReason: isFullyCleared ? undefined : app.clearances.accounts.dueReason,
            clearedDate: isFullyCleared ? new Date().toISOString().split('T')[0] : app.clearances.accounts.clearedDate,
            receiptReference: newTx.receiptNo,
          };
          const newClearances = { ...app.clearances, accounts: updatedAccounts };
          const allApproved = Object.values(newClearances).every((c) => c.status === 'Approved');
          const finalApp = {
            ...app,
            clearances: newClearances,
            overallStatus: allApproved ? ('Approved' as const) : ('In_Progress' as const),
            certificateGenerated: allApproved,
            certificateNo: allApproved ? `GIT/NOC/2025/${app.studentRollNo}` : app.certificateNo,
          };
          syncNoDuesToFirestore(finalApp).catch(() => {});
          return finalApp;
        }
        return app;
      })
    );

    syncTransactionToFirestore(newTx).catch(() => {});
    syncStudentToFirestore(updatedStudent).catch(() => {});
  };

  const handleCascadeStreamCode = (oldCode: string, newCode: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        const matchesStream = s.streamCode === oldCode || s.branch === oldCode;
        if (!matchesStream) return s;
        const updated: Student = {
          ...s,
          streamCode: newCode,
          branch: s.branch === oldCode ? newCode : s.branch,
          course: s.course.includes(oldCode) ? s.course.replace(oldCode, newCode) : s.course,
          registerNo: s.registerNo.includes(oldCode) ? s.registerNo.replace(oldCode, newCode) : s.registerNo,
        };
        syncStudentToFirestore(updated).catch(() => {});
        return updated;
      })
    );
  };

  const handleToggleHallTicket = (studentId: string, blocked: boolean) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const updated = { ...s, hallTicketBlocked: blocked };
          syncStudentToFirestore(updated).catch(() => {});
          return updated;
        }
        return s;
      })
    );
  };

  const handleUpdateNoDuesApp = (updatedApp: StudentNoDuesApplication) => {
    setNoDuesApps((prev) => prev.map((a) => (a.id === updatedApp.id ? updatedApp : a)));
    syncNoDuesToFirestore(updatedApp).catch(() => {});
  };

  const handleAddCertificateRequest = (newReq: CertificateRequest) => {
    setCertificateRequests((prev) => [newReq, ...prev]);
    syncCertificateToFirestore(newReq).catch(() => {});
  };

  const handleUpdateCertificateStatus = (reqId: string, status: CertificateRequest['status']) => {
    setCertificateRequests((prev) =>
      prev.map((c) => {
        if (c.id === reqId) {
          const updated = { ...c, status };
          syncCertificateToFirestore(updated).catch(() => {});
          return updated;
        }
        return c;
      })
    );
  };

  const handleApplyFacility = (newApp: FacilityApplication) => {
    setFacilityApplications((prev) => [newApp, ...prev]);
  };

  const handlePayFacilityFee = (appId: string, tx: FeeTransaction) => {
    setTransactions((prev) => [tx, ...prev]);
    setFacilityApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              feeStatus: 'Paid',
              paymentReceiptNo: tx.receiptNo,
              paymentMode: tx.paymentMethod,
              paymentDate: tx.timestamp.split(' ')[0],
              status: 'Approved',
              approvalRemarks: 'Fee verified & cleared via UPI. Approved for immediate facility access.',
              approvedBy: 'Prof. (Dr.) Srivastava (Principal)',
              approvedDate: new Date().toISOString().split('T')[0],
            }
          : app
      )
    );
  };

  const fallbackStudent: Student = {
    id: session?.id || 'STU-001',
    rollNo: session?.rollNo || '2025CS001',
    registerNo: `RLSY/25/BTECH/CSE/${session?.rollNo || '001'}`,
    name: session?.name || 'Enrolled Student',
    gender: 'Male',
    fatherName: 'Father Name',
    parentName: 'Parent Name',
    email: session?.emailOrPhone || 'student@rlsycollege.ac.in',
    phone: '+91 98000 00000',
    parentPhone: '+91 98000 00001',
    course: 'B.Tech',
    branch: 'Computer Science & Engineering',
    streamCode: 'CSE',
    subjectsEnrolled: [],
    year: 1,
    semester: 1,
    admissionYear: 2025,
    dateOfBirth: '2005-01-01',
    category: 'General',
    domicileState: 'Bihar',
    annualFamilyIncome: 200000,
    quota: 'State Merit (Subsidized)',
    hostelResident: false,
    scholarshipWaiverPercent: 0,
    totalFee: 25000,
    paidFee: 0,
    pendingFee: 25000,
    lateFineApplied: 0,
    hallTicketBlocked: false,
    profilePicture: session?.profilePicture,
  };

  const activeStudentForUser: Student = session?.role === 'student'
    ? (students.find((s) => 
        (session.rollNo && safeMatchStrings(s.rollNo, session.rollNo)) || 
        (session.id && (s.id === session.id || safeMatchStrings(s.rollNo, session.id))) ||
        (session.emailOrPhone && safeMatchStrings(s.email, session.emailOrPhone))
      ) || fallbackStudent)
    : (session?.rollNo ? (students.find((s) => safeMatchStrings(s.rollNo, session.rollNo)) || fallbackStudent) : fallbackStudent);

  const activeStaffUser = staffUsers.find((u) => u.id === session?.id);
  const effectiveStaffPhoto = session?.profilePicture || activeStaffUser?.profilePicture;

  const currentStudentForModal = activeReceiptModalTx
    ? students.find((s) => s.id === activeReceiptModalTx.studentId) || fallbackStudent
    : null;

  const pendingBatchCount = feeBatches.filter((b) => b.status === 'Pending_Approval').length;

  const unreadNotifCount = notifications.filter(
    (n) => safeMatchStrings(n.studentRollNo, activeStudentForUser?.rollNo) && !n.isRead
  ).length;

  // Helper to extract initials
  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Single identity card of admin and staff user is available only on default dashboard ('overview') in mobile mode
  const isStaffDefaultDashboard = (activeTab === 'overview');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Bar with user session & role switcher */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        session={session}
        onSwitchRole={handleSwitchRole}
        onLogout={handleLogout}
        onOpenHelpdesk={() => setIsHelpdeskOpen(true)}
        onOpenQuickFeePayment={() => setShowQuickFeePaymentModal(true)}
        pendingBatchCount={pendingBatchCount}
        unreadNotifCount={unreadNotifCount}
        currentStudent={activeStudentForUser}
        currentStaffUser={staffUsers.find((u) => u.id === session?.id)}
        onUpdateProfilePicture={handleUpdateCurrentProfilePicture}
        isDemoMode={isDemoMode}
        collegeProfile={collegeProfile}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-6">
        {/* If no session, show Login Portal - Fee Module accessible only after login */}
        {!session && (
          <LoginPortal 
            students={students} 
            staffUsers={staffUsers}
            initialTab={activeTab === 'admin_login' ? 'sysadmin' : 'student'}
            onLogin={handleLogin} 
            onUpdateStaffUser={handleUpdateStaffUser}
            onUpdateStudent={handleUpdateStudent}
            onOpenHelpdesk={() => setIsHelpdeskOpen(true)}
            onOpenQuickFeePayment={() => setShowQuickFeePaymentModal(true)}
            onTabChange={(tab) => {
              if (tab === 'sysadmin') setActiveTab('admin_login');
              else if (activeTab === 'admin_login') setActiveTab('student_home');
            }}
          />
        )}

        {/* 1. Student App Experience - Unified Portal with Merged Fee Module & Payments */}
        {session?.role === 'student' && (
          <AppErrorBoundary isolate fallbackTitle="Student Portal Unavailable" fallbackMessage="An unexpected issue occurred while rendering the student dashboard. Click below to recover safely.">
            <StudentMobileApp
              session={session}
              student={activeStudentForUser}
              transactions={transactions}
              noDuesApps={noDuesApps}
              certificateRequests={certificateRequests}
              facilityOptions={facilityOptions}
              facilityApplications={facilityApplications}
              enrollmentFields={enrollmentFields}
              achievements={achievements}
              notifications={notifications}
              dynamicQrConfig={dynamicQrConfig}
              campaignStudentDues={campaignStudentDues}
              campaigns={campaigns}
              activeProvider={campaignActiveProvider}
              campaignPayments={campaignPayments}
              collegeProfile={collegeProfile}
              onCampaignPaymentSuccess={(payment, updatedDue) => {
                setCampaignPayments((prev) => [payment, ...prev]);
                setCampaignStudentDues((prev) =>
                  prev.map((d) => (d.id === updatedDue.id ? updatedDue : d))
                );

                // Simultaneously issue matching FeeTransaction
                const newTx: FeeTransaction = {
                  id: payment.id,
                  receiptNo: payment.receiptNo,
                  studentId: activeStudentForUser.id,
                  studentName: payment.studentName,
                  rollNo: payment.rollNo,
                  course: activeStudentForUser.course,
                  semester: activeStudentForUser.semester,
                  amount: payment.amountPaid,
                  lateFineIncluded: payment.lateFeePaid || 0,
                  discountApplied: 0,
                  paymentMethod: payment.paymentMode,
                  gateway: payment.providerName,
                  gatewayTransactionId: payment.transactionId,
                  bankUtr: payment.gatewayReference || payment.transactionId,
                  treasuryHeadCode: '0202-01-102-01 (Govt Tech Ed)',
                  timestamp: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  status: 'Success',
                  headsAllocated: payment.lineItems.map((h) => ({ headName: h.name, amount: h.amount })),
                };
                const safePaidPaisa = toPaisa(payment.amountPaid);
                const currentPaidPaisa = toPaisa(activeStudentForUser.paidFee);
                const currentPendingPaisa = toPaisa(activeStudentForUser.pendingFee);
                const updatedPaidPaisa = paisaAdd(currentPaidPaisa, safePaidPaisa);
                const updatedPendingPaisa = paisaSub(currentPendingPaisa, safePaidPaisa, true);
                handlePaymentSuccess(newTx, {
                  ...activeStudentForUser,
                  paidFee: fromPaisa(updatedPaidPaisa),
                  pendingFee: fromPaisa(updatedPendingPaisa),
                  hallTicketBlocked: false,
                });
              }}
              onPayFee={handlePaymentSuccess}
              onApplyCertificate={handleAddCertificateRequest}
              onApplyFacility={handleApplyFacility}
              onPayFacilityFee={handlePayFacilityFee}
              onLogout={handleLogout}
              activeNavTab={activeTab}
              onNavTabChange={(tab) => setActiveTab(tab)}
              onUpdateProfilePicture={(photo) => handleUpdateStudentProfilePicture(activeStudentForUser.id, photo)}
              onUpdateStudent={handleUpdateStudent}
              onMarkNotificationAsRead={handleMarkNotificationAsRead}
              onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
            />
          </AppErrorBoundary>
        )}

        {/* 2. Admin & Staff Web Console */}
        {session?.role === 'admin' && (
          <>
            {/* Compact secondary module navigation bar when not on default overview dashboard */}
            {!isStaffDefaultDashboard && activeTab !== 'fee_campaigns' && activeTab !== 'permanent_campaign' && activeTab !== 'payment_settings' && activeTab !== 'feemaster' && (
              <div className="w-full max-w-[480px] mx-auto mb-4 flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="text-xs font-bold text-[#0B5D45] dark:text-emerald-400 hover:underline flex items-center gap-1.5 min-h-[44px] cursor-pointer"
                  title="Return to primary staff dashboard overview"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>‹ Back to Dashboard</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                    {session.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#0B5D45] dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    DDO 2049
                  </span>
                </div>
              </div>
            )}

            {/* App Admin & Staff Modules */}
            <AppErrorBoundary isolate fallbackTitle="Administrative Module Notice" fallbackMessage="An error occurred inside this administrative module. The session and database remain secure.">
            {(activeTab === 'fee_campaigns' || activeTab === 'permanent_campaign' || activeTab === 'payment_settings' || activeTab === 'feemaster') && (
              <FeeCampaignModule
                onBack={() => setActiveTab('overview')}
                onLogout={handleLogout}
                initialTab={activeTab === 'permanent_campaign' ? 'permanent' : activeTab === 'payment_settings' ? 'provider' : activeTab === 'feemaster' ? 'concessions' : undefined}
                userRole={session.staffRole === 'Accounts_Officer' || session.staffRole === 'Cashier' ? 'accountant' : 'admin'}
                userName={session.name}
                userEmail={session.emailOrPhone}
                allStudents={students}
                staffUsers={staffUsers}
                campaigns={campaigns}
                feeHeads={campaignFeeHeads}
                feePlans={campaignFeePlans}
                courses={campaignCourses}
                semesters={campaignSemesters}
                subjects={campaignSubjects}
                studentDues={campaignStudentDues}
                activeProvider={campaignActiveProvider}
                providerHistory={campaignProviderHistory}
                payments={campaignPayments}
                auditLogs={campaignAuditLogs}
                concessionRules={concessionRules}
                onUpdateConcessionRules={setConcessionRules}
                statutoryFeeHeads={feeHeads}
                onUpdateStatutoryFeeHeads={setFeeHeads}
                streams={streams}
                onUpdateStreams={setStreams}
                studySubjects={subjects}
                onUpdateStudySubjects={setSubjects}
                enrollmentFields={enrollmentFields}
                onUpdateEnrollmentFields={setEnrollmentFields}
                facilityOptions={facilityOptions}
                onUpdateFacilityOptions={setFacilityOptions}
                onApplyRulesToStudents={handleApplyRulesToStudents}
                currentSession={session}
                onUpdateCampaigns={(newCamps) => {
                  setCampaigns(newCamps);
                  if (Array.isArray(newCamps)) {
                    newCamps.forEach((c) => syncCampaignToFirestore(c).catch(() => {}));
                  }
                }}
                onUpdateFeeHeads={setCampaignFeeHeads}
                onUpdateFeePlans={setCampaignFeePlans}
                onUpdateCourses={setCampaignCourses}
                onUpdateSemesters={setCampaignSemesters}
                onUpdateSubjects={setCampaignSubjects}
                onUpdateStudentDues={(newDues) => {
                  setCampaignStudentDues(newDues);
                  if (Array.isArray(newDues)) {
                    newDues.forEach((d) => syncStudentDueToFirestore(d).catch(() => {}));
                  }
                }}
                onUpdateActiveProvider={handleUpdateActiveProvider}
                onUpdateProviderHistory={setCampaignProviderHistory}
                onUpdatePayments={(newPmts) => {
                  setCampaignPayments(newPmts);
                  if (Array.isArray(newPmts)) {
                    newPmts.forEach((p) => syncCampaignPaymentToFirestore(p).catch(() => {}));
                  }
                }}
                onAddAuditLog={handleAddAuditLog}
              />
            )}

            {activeTab === 'users' && (
              <SchoolUserDirectory
                staffUsers={staffUsers}
                students={students}
                enrollmentFields={enrollmentFields}
                concessionRules={concessionRules}
                streams={streams}
                currentSession={session}
                onAddStaffUser={handleAddStaffUser}
                onUpdateStaffUser={handleUpdateStaffUser}
                onDeleteStaffUser={handleDeleteStaffUser}
                onAddStudent={handleAddStudent}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                onBatchAddStudents={handleBatchAddStudents}
                onUpdateStaffProfilePicture={handleUpdateStaffProfilePicture}
                onUpdateStudentProfilePicture={handleUpdateStudentProfilePicture}
                onNavigateToCertificateThemes={() => setActiveTab('certificate_themes')}
              />
            )}

            {activeTab === 'batch_upload' && (
              <StudentUpdateMenu
                students={students}
                currentSession={session}
                staffUsers={staffUsers}
                enrollmentFields={enrollmentFields}
                feeHeads={feeHeads}
                concessionRules={concessionRules}
                onUpdateEnrollmentFields={setEnrollmentFields}
                onBulkUpdateStudents={handleBulkUpdateStudents}
              />
            )}

            {activeTab === 'fee_customizer' && (
              (session.staffRole === 'App_Admin' || session.staffRole === 'Principal_DDO') ? (
                <StudentFeeCustomizer
                  students={students}
                  onUpdateStudent={handleUpdateStudent}
                  currentSession={session}
                />
              ) : (
                <OverviewDashboard
                  students={students}
                  transactions={transactions}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onViewReceipt={(tx) => setActiveReceiptModalTx(tx)}
                  session={session}
                  effectiveStaffPhoto={effectiveStaffPhoto}
                  dynamicQrActive={dynamicQrConfig.isActive}
                  onOpenDynamicQr={() => setShowDynamicQrConfigModal(true)}
                  onOpenHonors={() => setShowAchievementManagerModal(true)}
                  onOpenStaffProfileModal={() => setShowStaffProfileModal(true)}
                  onSyncNow={handleSyncDashboardData}
                  isSyncing={isSyncing}
                  lastSynced={lastSynced}
                />
              )
            )}

            {activeTab === 'enrollment_optimizer' && (
              <EnrollmentParameterOptimizer
                fields={enrollmentFields}
                onUpdateFields={setEnrollmentFields}
                currentSession={session}
              />
            )}

            {activeTab === 'honours_achievements' && (
              <StudentAchievementManagerModal
                isOpen={true}
                isFullPage={true}
                onClose={() => setActiveTab('overview')}
                currentSession={session}
                staffUsers={staffUsers}
                students={students}
                achievements={achievements}
                staffAuthorities={staffAuthorities}
                onUpdateStaffAuthorities={setStaffAuthorities}
                onAddAchievement={handleAddAchievement}
                onDeleteAchievement={handleDeleteAchievement}
              />
            )}

            {activeTab === 'stream_subject_master' && (
              <StreamSubjectMaster
                streams={streams}
                subjects={subjects}
                onUpdateStreams={setStreams}
                onUpdateSubjects={setSubjects}
                onCascadeStreamCode={handleCascadeStreamCode}
                currentSession={session}
                onActivateCampaign={(type, streamCode, rawTotalAmount) => {
                  const totalAmount = Math.round(rawTotalAmount);
                  const now = new Date().toISOString();
                  const today = now.split('T')[0];
                  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  const campaignId = `CMP-${type.toUpperCase()}-FEE-${streamCode}`;
                  const title = `${streamCode} ${type} Fee Campaign 2025-26`;
                  
                  const targetStudents = students.filter((s) => {
                    const studentStream = (s.streamCode && s.streamCode.trim())
                      ? s.streamCode.trim().toUpperCase()
                      : (() => {
                          const branch = (s.branch || s.course || '').toUpperCase();
                          if (branch.includes('COMPUTER') || branch.includes('CSE')) return 'CSE';
                          if (branch.includes('MECHANICAL') || branch.includes('MECH')) return 'MECH';
                          if (branch.includes('CIVIL') || branch.includes('CE')) return 'CIVIL';
                          if (branch.includes('ELECTRICAL') || branch.includes('EEE') || branch.includes('ECE') || branch.includes('ELECTRONIC')) return 'ECE';
                          if (branch.includes('BCA') || branch.includes('APPLICATION')) return 'BCA';
                          if (branch.includes('COMMERCE') || branch.includes('B.COM') || branch.includes('BCOM')) return 'BCOM';
                          if (branch.includes('ARTS') || branch.includes('B.A') || branch.includes('BA')) return 'BA';
                          if (branch.includes('SCIENCE') || branch.includes('B.SC') || branch.includes('BSC')) return 'BSC';
                          return s.branch ? s.branch.trim().toUpperCase() : (s.course ? s.course.trim().toUpperCase() : 'GENERAL');
                        })();
                    return safeMatchStrings(studentStream, streamCode);
                  });

                  const newDues: StudentDue[] = targetStudents.map((stu) => ({
                    id: `DUE-${campaignId}-${stu.id}`,
                    campaignId,
                    campaignTitle: title,
                    studentId: stu.id,
                    studentEmail: stu.email,
                    rollNo: stu.rollNo,
                    studentName: stu.name,
                    course: stu.course,
                    semester: stu.semester,
                    baseAmount: totalAmount,
                    concessionAmount: 0,
                    netAmount: totalAmount,
                    paidAmount: 0,
                    balanceAmount: totalAmount,
                    status: 'Pending',
                    lineItems: [
                      {
                        headId: `HD-${type.toUpperCase()}-${streamCode}`,
                        name: `${streamCode} ${type} Academic Curriculum & Lab Fees`,
                        amount: totalAmount,
                      },
                    ],
                    lateFeeApplied: 0,
                    paymentLink: `/pay/${stu.id}`,
                    paymentLinkActive: true,
                    createdAt: now,
                    updatedAt: now,
                  }));

                  const newCampaign: FeeCampaign = {
                    id: campaignId,
                    title,
                    description: `Official statutory ${safeLower(type)} academic fee for stream ${streamCode}. Auto-summed from course subjects & laboratory components.`,
                    customHeads: [
                      {
                        headId: `HD-${type.toUpperCase()}-${streamCode}`,
                        headName: `${streamCode} Comprehensive Course Fee`,
                        amount: totalAmount,
                      },
                    ],
                    totalAmount,
                    startDate: today,
                    endDate: dueDate,
                    lateFee: {
                      enabled: false,
                      type: 'FLAT',
                      amount: 0,
                      graceDays: 7,
                    },
                    status: 'Active',
                    method: 'SELECTION',
                    studentCount: targetStudents.length,
                    totalExpectedAmount: totalAmount * targetStudents.length,
                    extensions: [],
                    createdAt: now,
                    createdBy: session?.emailOrPhone || 'accountant@rlsycollege.ac.in',
                    nominatedStaffEmails: [session?.emailOrPhone || ''],
                  };

                  setCampaigns((prev) => [newCampaign, ...prev.filter((c) => c.id !== campaignId)]);
                  syncCampaignToFirestore(newCampaign).catch(() => {});
                  setCampaignStudentDues((prev) => [...newDues, ...prev.filter((d) => d.campaignId !== campaignId)]);
                  newDues.forEach((d) => syncStudentDueToFirestore(d).catch(() => {}));
                  handleAddAuditLog({
                    id: `LOG-${Date.now()}`,
                    entityType: 'Campaign',
                    entityId: campaignId,
                    action: 'ACTIVATE',
                    userEmail: session?.emailOrPhone || 'accountant@rlsycollege.ac.in',
                    userName: session?.name || 'Accountant',
                    userRole: 'Accountant',
                    details: `Activated ${type} Fee Campaign for stream ${streamCode} with auto-summed dues of ₹${totalAmount.toLocaleString('en-IN')}.`,
                    timestamp: now,
                  });
                }}
              />
            )}

            {activeTab === 'college_profile' && (
              <CollegeProfileManager
                profile={collegeProfile}
                onSave={handleUpdateCollegeProfile}
                session={session}
              />
            )}

            {activeTab === 'overview' && (
              <OverviewDashboard
                students={students}
                transactions={transactions}
                onNavigate={(tab) => setActiveTab(tab)}
                onViewReceipt={(tx) => setActiveReceiptModalTx(tx)}
                session={session}
                effectiveStaffPhoto={effectiveStaffPhoto}
                dynamicQrActive={dynamicQrConfig.isActive}
                onOpenDynamicQr={() => setShowDynamicQrConfigModal(true)}
                onOpenHonors={() => setShowAchievementManagerModal(true)}
                onOpenStaffProfileModal={() => setShowStaffProfileModal(true)}
                onSyncNow={handleSyncDashboardData}
                isSyncing={isSyncing}
                lastSynced={lastSynced}
              />
            )}

            {activeTab === 'nodues' && (
              <NoDuesModule
                students={students}
                noDuesApps={noDuesApps}
                onUpdateNoDuesApp={handleUpdateNoDuesApp}
              />
            )}

            {activeTab === 'certificates' && (
              <CertificateModule
                students={students}
                certificateRequests={certificateRequests}
                noDuesApps={noDuesApps}
                onAddCertificateRequest={handleAddCertificateRequest}
                onUpdateCertificateStatus={handleUpdateCertificateStatus}
                themes={certificateThemes}
                currentSession={session}
                staffUsers={staffUsers}
                onSaveTheme={handleSaveCertificateTheme}
                onDeleteTheme={handleDeleteCertificateTheme}
                onSetDefaultTheme={handleSetDefaultCertificateTheme}
                onNavigateToUserDirectory={() => setActiveTab('users')}
                facilityOptions={facilityOptions}
                onUpdateFacilityOptions={setFacilityOptions}
              />
            )}

            {activeTab === 'certificate_themes' && (
              <CertificateThemeStudio
                themes={certificateThemes}
                currentSession={session}
                staffUsers={staffUsers}
                onSaveTheme={handleSaveCertificateTheme}
                onDeleteTheme={handleDeleteCertificateTheme}
                onSetDefaultTheme={handleSetDefaultCertificateTheme}
                onNavigateToServiceMapping={() => setActiveTab('users')}
              />
            )}

            {activeTab === 'cashier' && (
              <CashierDesk
                students={students}
                onCashierPayment={handleCashierPayment}
              />
            )}

            {activeTab === 'reports' && (
              <ReportGenerationEngine
                reportConfigs={reportConfigs}
                students={students}
                transactions={transactions}
                streams={streams}
                currentSession={session}
                staffUsers={staffUsers}
                onUpdateReportConfigs={setReportConfigs}
              />
            )}

            {activeTab === 'defaulters' && (
              <DefaulterManager
                students={students}
                studentDues={campaignStudentDues}
                onToggleHallTicket={handleToggleHallTicket}
              />
            )}

            {activeTab === 'reconciliation' && <ReconciliationEngine />}

            {activeTab === 'advisor' && (
              <ArchitecturalAdvisor onSwitchToLiveSystem={(tab = 'cashier') => setActiveTab(tab === 'portal' ? 'cashier' : tab)} />
            )}
            </AppErrorBoundary>
          </>
        )}
      </main>

      {/* Institutional Global Footer */}
      <footer className="mt-auto border-t border-slate-200/90 bg-white/80 backdrop-blur-xs py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{collegeProfile?.name || 'RLSY College'}</span>
            <span className="text-slate-400">·</span>
            <span>{collegeProfile?.affiliation || 'Affiliated College'}</span>
            <span className="text-slate-400">·</span>
            <span>Session {collegeProfile?.academicSession || '2025-2026'}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-500">
              Helpline: {collegeProfile?.contactPhone || '(0612) 237-1904'}
            </span>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin_login');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-slate-500 hover:text-emerald-700 font-medium text-xs underline decoration-slate-300 hover:decoration-emerald-600 transition-colors cursor-pointer py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
              title="Restricted Institutional Administration Access"
            >
              Admin Login
            </button>
          </div>
        </div>
      </footer>

      {/* Floating or Direct Receipt Modal if opened from Overview or elsewhere */}
      {activeReceiptModalTx && currentStudentForModal && (
        <PrintableReceipt
          transaction={activeReceiptModalTx}
          student={currentStudentForModal}
          onClose={() => setActiveReceiptModalTx(null)}
        />
      )}

      {/* Dynamic QR Configuration Gateway Modal (Admin & Accounts Officer) */}
      <DynamicQrConfigModal
        isOpen={showDynamicQrConfigModal}
        onClose={() => setShowDynamicQrConfigModal(false)}
        config={dynamicQrConfig}
        currentSession={session}
        staffUsers={staffUsers}
        onSaveConfig={async (updatedConfig) => {
          setDynamicQrConfig(updatedConfig);
          try {
            await setDoc(doc(db, 'dynamicQrConfig', 'default'), {
              ...updatedConfig,
              updatedAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error('Failed to sync dynamic QR config to Firestore:', err);
          }
        }}
      />

      {/* Student Honors & Achievement Manager Modal (Staff & Admin) */}
      <StudentAchievementManagerModal
        isOpen={showAchievementManagerModal}
        onClose={() => setShowAchievementManagerModal(false)}
        currentSession={session}
        staffUsers={staffUsers}
        students={students}
        achievements={achievements}
        staffAuthorities={staffAuthorities}
        onUpdateStaffAuthorities={setStaffAuthorities}
        onAddAchievement={handleAddAchievement}
        onDeleteAchievement={handleDeleteAchievement}
      />

      {/* Staff Academic & Profile Summary Modal */}
      {showStaffProfileModal && (
        <UserProfileSummaryModal
          session={session}
          staffUser={activeStaffUser || {
            id: session?.id || 'staff-1',
            employeeCode: 'EMP-RLSY-01',
            name: session?.name || 'Staff User',
            email: session?.emailOrPhone || 'staff@rlsy.ac.in',
            role: session?.staffRole || 'Accounts_Officer',
            designation: session?.staffDesignation || 'Accounts Officer & Treasury Bursar',
            department: 'Finance & Accounts',
            profilePicture: session?.profilePicture || '',
            phone: session?.emailOrPhone || '',
            status: 'Active',
            permissions: ['ALL_PERMISSIONS'],
            createdAt: '2025-01-01',
          }}
          onClose={() => setShowStaffProfileModal(false)}
          onUpdateProfilePicture={handleUpdateCurrentProfilePicture}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            setShowStaffProfileModal(false);
          }}
        />
      )}

      {/* Campus Multi-channel Helpdesk Modal (Chat & Email) */}
      <HelpdeskModal
        isOpen={isHelpdeskOpen}
        onClose={() => setIsHelpdeskOpen(false)}
        config={helpdeskConfig}
        session={session}
        students={students}
        onOpenAdminConfig={() => {
          setIsHelpdeskOpen(false);
          setIsAdminHelpdeskControlOpen(true);
        }}
      />

      {/* Admin Helpdesk Configuration & Chat Toggle Modal */}
      <AdminHelpdeskControlModal
        isOpen={isAdminHelpdeskControlOpen}
        onClose={() => setIsAdminHelpdeskControlOpen(false)}
        config={helpdeskConfig}
        onSaveConfig={(newCfg: HelpdeskConfig) => {
          setHelpdeskConfig(newCfg);
          syncHelpdeskConfigToFirestore(newCfg);
        }}
      />

      {/* Direct Quick Due Fee Payment Modal (Roll No & DOB) */}
      <QuickFeePaymentModal
        isOpen={showQuickFeePaymentModal}
        onClose={() => setShowQuickFeePaymentModal(false)}
        students={students}
        transactions={transactions}
        onPaymentSuccess={handlePaymentSuccess}
        activeProvider={campaignActiveProvider}
        onSaveProvider={handleUpdateActiveProvider}
        userRole={session?.role || 'student'}
      />
    </div>
  );
}
