import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Student, FeeTransaction, StudentNoDuesApplication, CertificateRequest, CollegeProfile, SchoolStaffUser, StudySubject, AcademicStream } from './types/fee';
import { StudentDue, FeeCampaign, CampaignPayment, AuditLogEntry } from './types/campaign';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { collection, doc, onSnapshot, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, query, where };
export { onAuthStateChanged, signInAnonymously };
export type { FirebaseUser };

// Error Handling Infrastructure as mandated by Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Status: ', JSON.stringify(errInfo));
  return errInfo;
}

// Validate Connection to Firestore on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client in offline/local cache mode.');
    }
  }
}
testConnection();

// Authentication helpers
export const signInWithEmail = async (email: string, pass: string) => {
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  return await signInWithEmailAndPassword(auth, email, pass);
};

export const registerWithEmail = async (email: string, pass: string) => {
  const { createUserWithEmailAndPassword } = await import('firebase/auth');
  return await createUserWithEmailAndPassword(auth, email, pass);
};

export const logoutFirebase = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
  }
};

export const sendPasswordReset = async (email: string) => {
  const { sendPasswordResetEmail } = await import('firebase/auth');
  return await sendPasswordResetEmail(auth, email);
};

export const signInWithGoogle = async () => {
  return await signInWithPopup(auth, googleProvider);
};

export const syncUserToFirestore = async (userId: string, userData: unknown): Promise<void> => {
  const path = `users/${userId}`;
  if (typeof userData !== 'object' || userData === null) {
    throw new Error(`Expected userData to be an object, got ${typeof userData}`);
  }
  try {
    const dataToSave = {
      ...(userData as Record<string, unknown>),
      id: userId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userId), dataToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Firestore Data Helpers
export const syncStudentToFirestore = async (student: Student) => {
  const path = `students/${student.id}`;
  try {
    const { password, ...safeStudent }: Omit<Student, 'password'> = student;
    await setDoc(doc(db, 'students', student.id), {
      ...safeStudent,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncTransactionToFirestore = async (tx: FeeTransaction) => {
  const path = `transactions/${tx.id}`;
  try {
    await setDoc(doc(db, 'transactions', tx.id), tx);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncNoDuesToFirestore = async (appRecord: StudentNoDuesApplication) => {
  const path = `noDuesApplications/${appRecord.id}`;
  try {
    await setDoc(doc(db, 'noDuesApplications', appRecord.id), appRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncCertificateToFirestore = async (req: CertificateRequest) => {
  const path = `certificateRequests/${req.id}`;
  try {
    await setDoc(doc(db, 'certificateRequests', req.id), req);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncStaffUserToFirestore = async (user: SchoolStaffUser, targetUid?: string) => {
  const docId = targetUid || (auth.currentUser && auth.currentUser.email?.toLowerCase() === user.email?.toLowerCase() ? auth.currentUser.uid : user.id);
  const path = `staffUsers/${docId}`;
  try {
    const { password, ...safeStaff }: Omit<SchoolStaffUser, 'password'> = user;
    await setDoc(doc(db, 'staffUsers', docId), {
      ...safeStaff,
      id: docId,
      updatedAt: new Date().toISOString(),
    });
    if (docId !== user.id) {
      await setDoc(doc(db, 'staffUsers', user.id), {
        ...safeStaff,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncSubjectToFirestore = async (subject: StudySubject) => {
  const path = `subjects/${subject.id}`;
  try {
    await setDoc(doc(db, 'subjects', subject.id), {
      ...subject,
      title: subject.title || subject.name,
      name: subject.name || subject.title,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncStreamToFirestore = async (stream: AcademicStream) => {
  const path = `streams/${stream.id}`;
  try {
    await setDoc(doc(db, 'streams', stream.id), {
      ...stream,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncStudentDueToFirestore = async (due: StudentDue) => {
  const path = `studentDues/${due.id}`;
  try {
    const { password, ...safeDue } = due;
    await setDoc(doc(db, 'studentDues', due.id), {
      ...safeDue,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncHelpdeskConfigToFirestore = async (cfg: unknown): Promise<void> => {
  const path = `helpdeskConfig/global`;
  try {
    if (typeof cfg !== 'object' || cfg === null) {
      throw new TypeError('Invalid cfg: expected object');
    }
    await setDoc(doc(db, 'helpdeskConfig', 'global'), {
      ...(cfg as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export interface HelpdeskTicket {
  id: string;
  [key: string]: unknown;
}

export const syncHelpdeskTicketToFirestore = async (
  ticket: HelpdeskTicket
): Promise<void> => {
  const path = `helpdeskTickets/${ticket.id}`;
  try {
    await setDoc(doc(db, 'helpdeskTickets', ticket.id), {
      ...ticket,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncCertificateThemeToFirestore = async (
  theme: Record<string, unknown> & { id: string }
): Promise<void> => {
  const path = `certificateThemes/${theme.id}`;
  try {
    await setDoc(doc(db, 'certificateThemes', theme.id), {
      ...theme,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteCertificateThemeFromFirestore = async (themeId: string) => {
  const path = `certificateThemes/${themeId}`;
  try {
    await deleteDoc(doc(db, 'certificateThemes', themeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const syncPaymentProviderToFirestore = async (
  provider: Record<string, unknown>
): Promise<void> => {
  const path = `paymentProvider/active`;
  try {
    await setDoc(doc(db, 'paymentProvider', 'active'), {
      ...provider,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deletePaymentProviderFromFirestore = async () => {
  const path = `paymentProvider/active`;
  try {
    await deleteDoc(doc(db, 'paymentProvider', 'active'));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const syncInstitutionProfileToFirestore = async (profile: CollegeProfile) => {
  const profileId = profile.id || 'primary';
  const path = `institutionProfile/${profileId}`;
  try {
    await setDoc(doc(db, 'institutionProfile', profileId), {
      ...profile,
      id: profileId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncCampaignToFirestore = async (campaign: FeeCampaign) => {
  const path = `campaigns/${campaign.id}`;
  try {
    await setDoc(doc(db, 'campaigns', campaign.id), {
      ...campaign,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncCampaignPaymentToFirestore = async (payment: CampaignPayment) => {
  const path = `campaignPayments/${payment.id}`;
  try {
    await setDoc(doc(db, 'campaignPayments', payment.id), {
      ...payment,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncAuditLogToFirestore = async (log: AuditLogEntry) => {
  const path = `auditLogs/${log.id}`;
  try {
    await setDoc(doc(db, 'auditLogs', log.id), log);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};


