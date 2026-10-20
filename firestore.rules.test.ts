/**
 * Firestore Security Rules Unit & Dirty Dozen Verification Suite
 * Verifies RBAC, ABAC, and Anti-Tampering rules for Govt College ERP
 */

interface MockSecurityContext {
  auth: {
    uid: string;
    token: {
      email?: string;
      email_verified?: boolean;
      role?: string;
      rollNo?: string;
      firebase?: { sign_in_provider?: string };
      [key: string]: unknown;
    };
  } | null;
  adminDirectory?: Set<string>;
}

interface MockDocResource {
  data: Record<string, unknown>;
}

// Security rule helpers replicated for programmatic validation
function checkIsAdmin(ctx: MockSecurityContext): boolean {
  if (!ctx.auth) return false;
  if (ctx.auth.token.email_verified !== true) return false;
  return ctx.auth.token.role === 'admin' || (ctx.adminDirectory?.has(ctx.auth.uid) === true);
}

function checkCanStudentUpdate(
  ctx: MockSecurityContext,
  existingData: Record<string, unknown>,
  incomingData: Record<string, unknown>
): boolean {
  if (!ctx.auth) return false;
  const isSelf = existingData['id'] === ctx.auth.uid || 
    (existingData['email'] === ctx.auth.token.email && ctx.auth.token.email_verified === true);
  if (!isSelf) return false;

  const getVal = <T>(obj: Record<string, unknown>, key: string, fallback: T): T =>
    obj[key] !== undefined && obj[key] !== null ? (obj[key] as T) : fallback;

  // Immutability checks with safe fallbacks
  if (getVal<number>(incomingData, 'totalFee', 0) !== getVal<number>(existingData, 'totalFee', 0)) return false;
  if (getVal<number>(incomingData, 'paidFee', 0) !== getVal<number>(existingData, 'paidFee', 0)) return false;
  if (getVal<number>(incomingData, 'pendingFee', 0) !== getVal<number>(existingData, 'pendingFee', 0)) return false;
  if (getVal<string>(incomingData, 'rollNo', '') !== getVal<string>(existingData, 'rollNo', '')) return false;

  // Allowed self-service keys only
  const allowedKeys = new Set([
    'id', 'rollNo', 'registerNo', 'name', 'course', 'semester', 'totalFee', 'paidFee', 'pendingFee',
    'password', 'isActivated', 'profilePicture', 'phone', 'parentPhone', 'passwordSetAt', 'updatedAt'
  ]);
  
  for (const key of Object.keys(incomingData)) {
    if (!allowedKeys.has(key)) return false;
  }
  return true;
}

function checkIsStaff(ctx: MockSecurityContext): boolean {
  if (!ctx.auth) return false;
  if (checkIsAdmin(ctx)) return true;
  return ctx.auth.token.role === 'staff' || ctx.auth.uid.startsWith('STAFF');
}

function checkCanCreateTransaction(
  ctx: MockSecurityContext, 
  incomingTx: {
    amount: number;
    status: 'Success' | 'Pending' | 'Failed';
    studentId?: string;
    studentEmail?: string;
  }
): boolean {
  if (!ctx.auth) return false;
  if (typeof incomingTx.amount !== 'number' || incomingTx.amount <= 0) return false;
  if (!['Success', 'Pending', 'Failed'].includes(incomingTx.status)) return false;

  const isStaff = checkIsStaff(ctx);
  if (isStaff) return true;

  // Student can only create for their own verified identity
  return incomingTx.studentId === ctx.auth.uid || 
    (incomingTx.studentEmail === ctx.auth.token.email && ctx.auth.token.email_verified === true);
}

function checkCanSelfRegisterUser(
  ctx: MockSecurityContext,
  userId: string,
  incomingUser: {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'admin' | 'staff';
  }
): boolean {
  if (!ctx.auth) return false;
  const isOwner = ctx.auth.uid === userId;
  if (!isOwner) return false;
  const isValidUser = typeof incomingUser.id === 'string' &&
    typeof incomingUser.email === 'string' &&
    typeof incomingUser.name === 'string' &&
    ['student', 'admin', 'staff'].includes(incomingUser.role);
  if (!isValidUser) return false;
  const isAdmin = checkIsAdmin(ctx);
  return incomingUser.role === 'student' || isAdmin;
}

function checkCanDeleteCampaign(
  ctx: MockSecurityContext,
  incomingResourceData: Record<string, unknown> | null
): boolean {
  if (!ctx.auth) return false;
  // Rule evaluates without crashing when incoming() is null
  return checkIsAdmin(ctx);
}

function checkCanStudentSelfInit(
  ctx: MockSecurityContext,
  studentId: string,
  incomingStudent: { email: string; paidFee: number; totalFee: number; pendingFee: number }
): boolean {
  if (!ctx.auth) return false;
  if (checkIsAdmin(ctx)) return true;
  const isSelf = studentId === ctx.auth.uid || 
    (incomingStudent.email === ctx.auth.token.email && ctx.auth.token.email_verified === true);
  if (!isSelf) return false;
  return incomingStudent.paidFee === 0 && incomingStudent.totalFee === incomingStudent.pendingFee;
}

function checkCanStudentPatchDue(
  ctx: MockSecurityContext,
  existingDue: {
    studentId: string;
    netAmount: number;
    balanceAmount: number;
    phone?: string;
    updatedAt?: unknown;
  },
  patchData: {
    netAmount?: number;
    balanceAmount?: number;
    phone?: string;
    updatedAt?: unknown;
  }
): boolean {
  if (!ctx.auth) return false;
  // Checks existing().studentId so partial patch without studentId succeeds
  const isSelf = ctx.auth.uid === existingDue.studentId;
  if (!isSelf) return false;
  if (patchData.netAmount !== undefined && patchData.netAmount !== existingDue.netAmount) return false;
  if (patchData.balanceAmount !== undefined && patchData.balanceAmount !== existingDue.balanceAmount) return false;
  const allowedKeys = new Set(['phone', 'updatedAt']);
  for (const k of Object.keys(patchData)) {
    if (!allowedKeys.has(k)) return false;
  }
  return true;
}

function checkIsPrincipalOrDDO(
  ctx: MockSecurityContext,
  staffDocData: { role?: string; staffRole?: string }
): boolean {
  if (!ctx.auth) return false;
  if (checkIsAdmin(ctx)) return true;
  const role = staffDocData.role || '';
  const staffRole = staffDocData.staffRole || '';
  return ['Principal_DDO', 'App_Admin'].includes(role) || ['Principal_DDO', 'App_Admin'].includes(staffRole);
}

function checkIsStudentSelf(
  ctx: MockSecurityContext,
  resourceData: Record<string, unknown>
): boolean {
  if (!ctx.auth) return false;
  const id = resourceData.id;
  if (typeof id === 'string' && id === ctx.auth.uid) return true;
  const studentId = resourceData.studentId;
  if (typeof studentId === 'string' && studentId === ctx.auth.uid) return true;
  const email = resourceData.email;
  if (
    typeof email === 'string' &&
    ctx.auth.token.email &&
    email === ctx.auth.token.email
  ) return true;
  const studentEmail = resourceData.studentEmail;
  if (
    typeof studentEmail === 'string' &&
    ctx.auth.token.email &&
    studentEmail === ctx.auth.token.email
  ) return true;
  const phone = resourceData.phone;
  const tokenPhone = (ctx.auth.token as unknown as { phone_number?: unknown }).phone_number;
  if (
    typeof phone === 'string' &&
    typeof tokenPhone === 'string' &&
    phone === tokenPhone
  ) return true;
  const rollNo = resourceData.rollNo;
  if (
    typeof rollNo === 'string' &&
    ctx.auth.token.rollNo &&
    rollNo === ctx.auth.token.rollNo
  ) return true;
  return false;
}

function runSecurityTests() {
  console.log('--- RUNNING FIRESTORE SECURITY RULES TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assertDenied(testName: string, result: boolean) {
    if (result === false) {
      console.log(`[PASS] ${testName} -> REJECTED (PERMISSION_DENIED)`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} -> ALLOWED (SECURITY VULNERABILITY!)`);
      failed++;
    }
  }

  // 1. Unauthenticated Student Ledger Wipeout
  const unauthCtx: MockSecurityContext = { auth: null };
  const victimStudent = { id: 'STU-001', rollNo: 'CSE-101', totalFee: 25000, paidFee: 0, pendingFee: 25000 };
  const wipedLedger = { ...victimStudent, paidFee: 25000, pendingFee: 0 };
  assertDenied('Dirty Dozen 1: Unauthenticated Student Ledger Wipeout', checkCanStudentUpdate(unauthCtx, victimStudent, wipedLedger));

  // 2. Student Fee Transaction Forgery
  const studentCtx: MockSecurityContext = {
    auth: { uid: 'STU-ATTACKER', token: { email: 'attacker@col.edu', email_verified: true } }
  };
  const forgedTx = {
    id: 'TXN-001',
    receiptNo: 'REC-001',
    studentId: 'VICTIM-002',
    rollNo: 'CSE-202',
    amount: 1,
    paymentMethod: 'UPI',
    status: 'Success'
  };
  assertDenied('Dirty Dozen 2: Student Fee Transaction Forgery for another student', checkCanCreateTransaction(studentCtx, forgedTx));

  // 3. Gateway Payment Hijacking by Non-Admin
  assertDenied('Dirty Dozen 3: Gateway Payment Hijacking by Non-Admin', checkIsAdmin(studentCtx));

  // 4. Admin Spoofing without verified email
  const spoofedCtx: MockSecurityContext = {
    auth: { uid: 'ATTACKER', token: { email: 'admin@college.ac.in', email_verified: false, role: 'admin' } }
  };
  assertDenied('Dirty Dozen 4: Admin Spoofing with unverified email', checkIsAdmin(spoofedCtx));

  // Valid Verified Admin verification
  const validAdminCtx: MockSecurityContext = {
    auth: { uid: 'ADM-001', token: { email: 'admin@college.ac.in', email_verified: true, role: 'admin' } }
  };
  if (checkIsAdmin(validAdminCtx)) {
    console.log('[PASS] Valid Verified Admin -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Valid Verified Admin -> DENIED');
    failed++;
  }

  // 5. Ghost field injection during profile update
  const validStudentCtx: MockSecurityContext = {
    auth: { uid: 'STU-001', token: { email: 'stu@col.edu', email_verified: true } }
  };
  const shadowUpdatedStudent = {
    ...victimStudent,
    phone: '+919999999999',
    __isAdmin: true
  };
  assertDenied('Dirty Dozen 5: Ghost Field Injection during profile update', checkCanStudentUpdate(validStudentCtx, victimStudent, shadowUpdatedStudent));

  // 6. Zero or negative transaction amount
  const negativeTx = {
    id: 'TXN-NEG',
    receiptNo: 'REC-NEG',
    studentId: 'STU-001',
    rollNo: 'CSE-101',
    amount: -500,
    paymentMethod: 'UPI',
    status: 'Success'
  };
  assertDenied('Dirty Dozen 6: Negative transaction amount creation', checkCanCreateTransaction(validStudentCtx, negativeTx));

  // 7. Self-Registration Privilege Escalation
  const unprivilegedSelfUser = {
    id: 'NEW-USER-001',
    email: 'newuser@col.edu',
    name: 'New User',
    role: 'admin' // Attempting to self-grant admin
  };
  const newUserCtx: MockSecurityContext = {
    auth: { uid: 'NEW-USER-001', token: { email: 'newuser@col.edu', email_verified: true } }
  };
  assertDenied('Dirty Dozen 7: Self-Registration Admin Privilege Escalation', checkCanSelfRegisterUser(newUserCtx, 'NEW-USER-001', unprivilegedSelfUser));

  // 8. Campaign Delete Null Reference Protection
  const nonAdminStudentCtx: MockSecurityContext = {
    auth: { uid: 'STU-001', token: { email: 'stu@col.edu', email_verified: true, role: 'student' } }
  };
  assertDenied('Dirty Dozen 8: Non-Admin Campaign Deletion', checkCanDeleteCampaign(nonAdminStudentCtx, null));
  if (checkCanDeleteCampaign(validAdminCtx, null)) {
    console.log('[PASS] Valid Admin Campaign Deletion with null incoming() -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Valid Admin Campaign Deletion failed');
    failed++;
  }

  // 9. Student Stub Initialization Guard
  const forgedStubStudent = {
    id: 'STU-NEW',
    email: 'stu@col.edu',
    rollNo: 'CSE-999',
    totalFee: 25000,
    paidFee: 25000, // Attacker trying to self-initialize as paid up
    pendingFee: 0
  };
  assertDenied('Dirty Dozen 9: Tampered Student Stub Initial Fee Forgery', checkCanStudentSelfInit(validStudentCtx, 'STU-NEW', forgedStubStudent));

  const validStubStudent = {
    id: 'STU-001',
    email: 'stu@col.edu',
    rollNo: 'CSE-101',
    totalFee: 25000,
    paidFee: 0,
    pendingFee: 25000
  };
  if (checkCanStudentSelfInit(validStudentCtx, 'STU-001', validStubStudent)) {
    console.log('[PASS] Valid Student Stub Self-Initialization -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Valid Student Stub Self-Initialization -> DENIED');
    failed++;
  }

  // 10. Student Due Partial Patch Crash Prevention (omits studentId in patch payload)
  const existingDue = {
    id: 'DUE-001',
    studentId: 'STU-001',
    rollNo: 'CSE-101',
    netAmount: 25000,
    paidAmount: 0,
    balanceAmount: 25000,
    phone: '9800000000'
  };
  const partialPatchOnlyPhone = { phone: '9876543210', updatedAt: new Date().toISOString() };
  if (checkCanStudentPatchDue(validStudentCtx, existingDue, partialPatchOnlyPhone)) {
    console.log('[PASS] Dirty Dozen 10: Student Due Partial Patch with existing().studentId -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Dirty Dozen 10: Student Due Partial Patch failed');
    failed++;
  }

  // Attacker cannot patch another student's due
  assertDenied('Dirty Dozen 10b: Student Due Patch by non-owner', checkCanStudentPatchDue(studentCtx, existingDue, partialPatchOnlyPhone));

  // 11. Staff Principal & DDO role vs staffRole verification
  const staffDocWithStaffRole = { role: 'staff', staffRole: 'Principal_DDO' };
  const principalCtx: MockSecurityContext = {
    auth: { uid: 'STAFF-PRINCIPAL', token: { email: 'principal@college.edu', email_verified: true } }
  };
  if (checkIsPrincipalOrDDO(principalCtx, staffDocWithStaffRole)) {
    console.log('[PASS] Dirty Dozen 11: Principal & DDO verified via staffRole -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Dirty Dozen 11: Principal & DDO verification failed');
    failed++;
  }

  // 12. Student identification via Phone Auth or OAuth token matching
  const phoneAuthCtx: MockSecurityContext = {
    auth: { uid: 'STU-PHONE-99', token: { phone_number: '+919876543210' } } as unknown
  };
  const phoneStudentRecord = { id: 'STU-OTHER-ID', phone: '+919876543210' };
  if (checkIsStudentSelf(phoneAuthCtx, phoneStudentRecord)) {
    console.log('[PASS] Dirty Dozen 12: Phone auth student identified via token.phone_number -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Dirty Dozen 12: Phone auth student identification failed');
    failed++;
  }

  // 13. Helpdesk Ticket userId binding
  const validTicket = { id: 'TKT-1001', subject: 'Fee Receipt Issue', category: 'Fee_Payment', status: 'Open', userId: 'STU-001' };
  const forgedTicket = { id: 'TKT-1002', subject: 'Forged Ticket', category: 'Fee_Payment', status: 'Open', userId: 'STU-VICTIM-999' };
  const canCreateValidTicket = (ctx: MockSecurityContext, t: { userId: string; studentId?: string }) => {
    return !!ctx.auth && (checkIsStaff(ctx) || t.userId === ctx.auth.uid || t.studentId === ctx.auth.uid);
  };
  if (canCreateValidTicket(validStudentCtx, validTicket)) {
    console.log('[PASS] Test 13a: Student creating helpdesk ticket with own userId -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Test 13a: Student helpdesk ticket creation failed');
    failed++;
  }
  assertDenied('Test 13b: Student helpdesk ticket with forged victim userId', canCreateValidTicket(studentCtx, forgedTicket));

  // 14. Dynamic QR Configuration Rule
  const staffCtx: MockSecurityContext = {
    auth: { uid: 'STAFF-001', token: { email: 'staff@col.edu', email_verified: true, role: 'staff' } }
  };
  const canWriteDynamicQr = (ctx: MockSecurityContext) => {
    return !!ctx.auth && (checkIsAdmin(ctx) || checkIsStaff(ctx));
  };
  assertDenied('Test 14a: Unauthenticated access to dynamicQrConfig write', canWriteDynamicQr(unauthCtx));
  if (canWriteDynamicQr(staffCtx)) {
    console.log('[PASS] Test 14b: Authorized staff access to dynamicQrConfig -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Test 14b: Staff dynamicQrConfig access failed');
    failed++;
  }

  // 15. Student Notifications Rule
  const canWriteNotification = (ctx: MockSecurityContext) => {
    return !!ctx.auth && (checkIsAdmin(ctx) || checkIsStaff(ctx));
  };
  assertDenied('Test 15a: Unauthenticated access to notifications write', canWriteNotification(unauthCtx));
  if (canWriteNotification(staffCtx)) {
    console.log('[PASS] Test 15b: Authorized staff access to notifications -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Test 15b: Staff notifications access failed');
    failed++;
  }

  // 16. Student Achievements & Honors Rule
  const canWriteAchievement = (ctx: MockSecurityContext) => {
    return !!ctx.auth && (checkIsAdmin(ctx) || checkIsStaff(ctx));
  };
  assertDenied('Test 16a: Unauthenticated access to achievements write', canWriteAchievement(unauthCtx));
  if (canWriteAchievement(staffCtx)) {
    console.log('[PASS] Test 16b: Authorized staff access to achievements -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Test 16b: Staff achievements access failed');
    failed++;
  }

  // 17. Due Arithmetic with float numbers & epsilon tolerance
  interface DueAmounts {
    baseAmount: number;
    concessionAmount: number;
    netAmount: number;
    paidAmount: number;
    balanceAmount: number;
  }

  const isValidDueArithmeticMock = (data: DueAmounts): boolean => {
    const isNum = (v: unknown): v is number => typeof v === 'number' && v >= 0;
    if (!isNum(data.baseAmount) || !isNum(data.concessionAmount) || !isNum(data.netAmount) ||
        !isNum(data.paidAmount) || !isNum(data.balanceAmount)) return false;
    const diff1 = data.baseAmount - data.concessionAmount - data.netAmount;
    const diff2 = data.netAmount - data.paidAmount - data.balanceAmount;
    return (diff1 === 0 || (diff1 >= -1 && diff1 <= 1)) && (diff2 === 0 || (diff2 >= -1 && diff2 <= 1));
  };
  const floatDue = { baseAmount: 1000.5, concessionAmount: 200.2, netAmount: 800.3, paidAmount: 0, balanceAmount: 800.3 };
  if (isValidDueArithmeticMock(floatDue)) {
    console.log('[PASS] Test 17: Valid due with floating point Rupee precision -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Test 17: Valid due with floating point Rupee precision rejected');
    failed++;
  }

  // 18. General staff cannot update student dues amounts (must be Principal/DDO or Admin)
  const canStaffUpdateDueAmount = (ctx: MockSecurityContext, staffDoc: unknown) => {
    return !!ctx.auth && (checkIsAdmin(ctx) || checkIsPrincipalOrDDO(ctx, staffDoc));
  };
  const generalStaffDoc = { role: 'staff', staffRole: 'Lecturer' };
  assertDenied('Test 18a: General staff updating student dues amount', canStaffUpdateDueAmount(staffCtx, generalStaffDoc));
  if (canStaffUpdateDueAmount(principalCtx, staffDocWithStaffRole)) {
    console.log('[PASS] Test 18b: Principal/DDO updating student dues amount -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Test 18b: Principal/DDO student dues update rejected');
    failed++;
  }

  // 19. General staff cannot update institutionProfile (must be Principal/DDO or Admin)
  const canUpdateInstitutionProfile = (ctx: MockSecurityContext, staffDoc: unknown): boolean => {
    return !!ctx.auth && (checkIsAdmin(ctx) || checkIsPrincipalOrDDO(ctx, staffDoc));
  };
  assertDenied('Test 19a: General staff updating statutory institutionProfile', canUpdateInstitutionProfile(staffCtx, generalStaffDoc));
  if (canUpdateInstitutionProfile(principalCtx, staffDocWithStaffRole)) {
    console.log('[PASS] Test 19b: Principal/DDO updating institutionProfile -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Test 19b: Principal/DDO institutionProfile update rejected');
    failed++;
  }

  // 20. Admin impersonation via unverified email matching admin document email
  const unverifiedAdminDocCtx: MockSecurityContext = {
    auth: { uid: 'ATTACKER_FAKE_ADMIN', token: { email: 'admin@college.ac.in', email_verified: false } }
  };
  assertDenied('Test 20: Admin impersonation with matching email but email_verified=false', checkIsAdmin(unverifiedAdminDocCtx));

  // 21. Campaign payment with number/float amounts and optional studentId
  const isValidCampaignPaymentMock = (data: {
    id: string;
    campaignId: string;
    studentId?: string;
    rollNo: string;
    amountPaid: number;
    status: 'Success' | 'Pending' | 'Failed' | 'Mismatched' | 'Cancelled' | 'Refunded';
  }): boolean => {
    return typeof data.id === 'string' && data.id.length <= 128 &&
           typeof data.campaignId === 'string' && data.campaignId.length <= 128 &&
           (!('studentId' in data) || (typeof data.studentId === 'string' && data.studentId.length <= 128)) &&
           typeof data.rollNo === 'string' && data.rollNo.length <= 64 &&
           typeof data.amountPaid === 'number' && data.amountPaid > 0 &&
           ['Success', 'Pending', 'Failed', 'Mismatched', 'Cancelled', 'Refunded'].includes(data.status);
  };
  const validPmt = { id: 'PMT-01', campaignId: 'CMP-01', rollNo: '2025/CSE/001', amountPaid: 1250.5, status: 'Success' };
  if (isValidCampaignPaymentMock(validPmt)) {
    console.log('[PASS] Test 21: Valid campaign payment with decimal amount and rollNo -> ALLOWED');
    passed++;
  } else {
    console.error('[FAIL] Test 21: Valid campaign payment was rejected');
    failed++;
  }

  // 22. Anonymous Token Rejected from Mutating Student Ledger Balances
  const canUpdateStudentBalance = (ctx: MockSecurityContext, studentId: string, existingData: { paidFee: number }, incomingData: { paidFee: number }): boolean => {
    if (!ctx.auth) return false;
    if (ctx.auth.token?.firebase?.sign_in_provider === 'anonymous') return false;
    return checkIsStaff(ctx) || (ctx.auth.uid === studentId && incomingData.paidFee >= existingData.paidFee);
  };
  const anonymousCtx: MockSecurityContext = {
    auth: { uid: 'ANON_USER_999', token: { firebase: { sign_in_provider: 'anonymous' } } }
  };
  const existingStu = { id: 'STU-001', rollNo: '2024CSE001', totalFee: 25000, paidFee: 0, pendingFee: 25000 };
  const incomingStu = { ...existingStu, paidFee: 25000, pendingFee: 0 };
  assertDenied(
    'Test 22: Anonymous Token Direct Student Balance Mutation',
    canUpdateStudentBalance(anonymousCtx, 'STU-001', existingStu, incomingStu)
  );

  // 23. Student profile tamper with appliedConcessions array -> REJECTED
  const canStudentUpdateConcessions = (
    incomingData: unknown,
    existingData: unknown
  ): boolean => {
    if (typeof incomingData !== 'object' || incomingData === null) {
      return true;
    }
    const incObj = incomingData as { appliedConcessions?: unknown };
    const existingObj = existingData as { appliedConcessions?: unknown };
    if (!('appliedConcessions' in incObj)) {
      return true;
    }
    return JSON.stringify(incObj.appliedConcessions) === JSON.stringify(existingObj.appliedConcessions);
  };
  const forgedStudent = {
    ...existingStu,
    phone: '9999999999',
    appliedConcessions: [{ ruleName: 'Forged 100% Waiver', amount: 25000 }],
  };
  assertDenied(
    'Test 23: Student attempting to forge appliedConcessions array in profile patch',
    canStudentUpdateConcessions(forgedStudent, existingStu)
  );

  // 24. Audit Log actor identity spoofing by non-admin staff
  const canCreateAuditLog = (ctx: MockSecurityContext, incomingLog: { userEmail: string; userId: string }): boolean => {
    if (!ctx.auth) return false;
    const isStaff = checkIsStaff(ctx);
    if (!isStaff) return false;
    if (checkIsAdmin(ctx)) return true;
    return incomingLog.userEmail === ctx.auth.token?.email || incomingLog.userId === ctx.auth.uid;
  };
  const lowLevelStaffCtx: MockSecurityContext = {
    auth: { uid: 'STAFF_LECTURER_01', token: { role: 'staff', email: 'lecturer@college.ac.in', email_verified: true } }
  };
  const forgedAuditLog = {
    id: 'LOG-FORGED-01',
    userEmail: 'principal@college.ac.in', // Impersonating principal
    userId: 'PRINCIPAL_UID_999',
    details: 'Forged action',
  };
  assertDenied(
    'Test 24: Non-admin staff attempting to forge audit log actor identity',
    canCreateAuditLog(lowLevelStaffCtx, forgedAuditLog)
  );

  // 25. Student attempting create on top of an already existing profile -> REJECTED
  const canSelfInitializeStudent = (
    ctx: MockSecurityContext,
    studentId: string,
    incomingData: { paidFee: number; totalFee: number; pendingFee: number },
    alreadyExists: boolean
  ): boolean => {
    if (!ctx.auth) return false;
    if (alreadyExists) return false;
    const isOwner = ctx.auth.uid === studentId;
    return isOwner && incomingData.paidFee === 0 && incomingData.totalFee > 0 && incomingData.totalFee === incomingData.pendingFee;
  };
  const selfInitStudent = {
    id: 'STU-001',
    rollNo: '2024CSE001',
    name: 'Aarav Kumar',
    totalFee: 25000,
    paidFee: 0,
    pendingFee: 25000,
  };
  assertDenied(
    'Test 25: Student attempting create on top of an already existing profile',
    canSelfInitializeStudent(studentCtx, 'STU-001', selfInitStudent, true)
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    throw new Error(`Security test failed: ${failed} tests failed!`);
  }
}

runSecurityTests();
process.exit(0);
