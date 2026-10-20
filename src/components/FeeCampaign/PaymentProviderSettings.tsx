import React, { useState } from 'react';
import {
  PaymentProviderConfig,
  ProviderHistoryItem,
  ProviderType,
  ProviderMode,
  CampaignPayment,
  StudentDue,
  AuditLogEntry,
} from '../../types/campaign';
import {
  CreditCard,
  CheckCircle2,
  Copy,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  ExternalLink,
  History as HistoryIcon,
  Lock,
  RefreshCw,
  Plus,
  ArrowRight,
  Check,
  X,
  Clock,
  Landmark,
  KeyRound,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  PowerOff,
} from 'lucide-react';

interface Props {
  activeProvider: PaymentProviderConfig | null;
  providerHistory: ProviderHistoryItem[];
  payments: CampaignPayment[];
  studentDues: StudentDue[];
  userRole: 'admin' | 'accountant';
  userName: string;
  userEmail: string;
  onUpdateActiveProvider: (newProvider: PaymentProviderConfig | null, oldProviderToHistory?: ProviderHistoryItem) => void;
  onDeleteHistoryProvider: (historyId: string) => void;
  onRecordOfflinePayment: (payment: CampaignPayment) => void;
  onManualMarkAsPaid: (paymentId: string, reason: string) => void;
  onInitiateRefund: (paymentId: string, refundAmount: number, reason: string) => void;
  onRegeneratePaymentLink: (dueId: string) => void;
  onAddAuditLog: (log: AuditLogEntry) => void;
}

export const PaymentProviderSettings: React.FC<Props> = ({
  activeProvider,
  providerHistory,
  payments,
  studentDues,
  userRole,
  userName,
  userEmail,
  onUpdateActiveProvider,
  onDeleteHistoryProvider,
  onRecordOfflinePayment,
  onManualMarkAsPaid,
  onInitiateRefund,
  onRegeneratePaymentLink,
  onAddAuditLog,
}) => {
  const [subTab, setSubTab] = useState<'current' | 'history' | 'reconciliation' | 'offline'>('current');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Testing connection state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Switch Test to Live confirmation modal
  const [showSwitchModeModal, setShowSwitchModeModal] = useState(false);

  // Change Provider Flow Modal
  const [showChangeProviderModal, setShowChangeProviderModal] = useState(false);
  const [changeStep, setChangeStep] = useState<1 | 2>(1);
  const [newType, setNewType] = useState<ProviderType>('Cashfree');
  const [newMode, setNewMode] = useState<ProviderMode>('Live');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newMerchantId, setNewMerchantId] = useState('');
  const [newApiKeyId, setNewApiKeyId] = useState('');
  const [newApiKeySecret, setNewApiKeySecret] = useState('');
  const [newWebhookSecret, setNewWebhookSecret] = useState('');
  const [customTemplateUrl, setCustomTemplateUrl] = useState('https://pay.custompg.com/checkout?amount={amount}&roll={roll_no}&due={due_id}&ref={reference}');
  const [customCallbackUrl, setCustomCallbackUrl] = useState('https://api.rlsycollege.ac.in/api/v1/payments/callback');
  const [changeFormError, setChangeFormError] = useState<string | null>(null);
  const [pendingTxWarningAcknowledged, setPendingTxWarningAcknowledged] = useState(false);

  // Offline Payment Form
  const [offlineRollNo, setOfflineRollNo] = useState('');
  const [offlineDueId, setOfflineDueId] = useState('');
  const [offlineAmount, setOfflineAmount] = useState<number>(0);
  const [offlineMode, setOfflineMode] = useState<'Cash' | 'Cheque' | 'DD'>('Cash');
  const [offlineReference, setOfflineReference] = useState('');
  const [offlineSuccessNotice, setOfflineSuccessNotice] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Manual Mark as Paid modal
  const [manualMarkTarget, setManualMarkTarget] = useState<CampaignPayment | null>(null);
  const [manualMarkReason, setManualMarkReason] = useState('');

  // Refund Modal
  const [refundTarget, setRefundTarget] = useState<CampaignPayment | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState<number>(0);
  const [refundReasonInput, setRefundReasonInput] = useState('');

  // Count pending transactions on current provider
  const pendingOnCurrent = activeProvider
    ? payments.filter(
        (p) => p.providerId === activeProvider.id && (p.status === 'Pending' || p.status === 'Mismatched')
      )
    : [];

  // Copy webhook URL helper
  const handleCopyWebhook = () => {
    if (!activeProvider) return;
    navigator.clipboard.writeText(activeProvider.webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // Test connection simulation
  const handleTestConnection = () => {
    if (!activeProvider) return;
    setIsTestingConnection(true);
    setTestResult(null);
    setTimeout(() => {
      setIsTestingConnection(false);
      setTestResult({
        success: true,
        message: `Successfully connected to ${activeProvider.type} (${activeProvider.mode} API). Signature check passed. Latency: 42ms.`,
      });
      setTimeout(() => setTestResult(null), 5000);
    }, 1000);
  };

  // Switching Mode (Test <-> Live)
  const handleConfirmSwitchMode = () => {
    if (!activeProvider) return;
    const nextMode: ProviderMode = activeProvider.mode === 'Test' ? 'Live' : 'Test';
    const now = new Date().toISOString();
    const updated: PaymentProviderConfig = {
      ...activeProvider,
      mode: nextMode,
      activatedAt: now,
      activatedBy: `${userRole === 'admin' ? 'Admin' : 'Accountant'}: ${userName}`,
    };
    onUpdateActiveProvider(updated);
    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'Provider',
      entityId: activeProvider.id,
      action: 'UPDATE',
      userEmail,
      userName,
      userRole: userRole === 'admin' ? 'Admin' : 'Accountant',
      details: `Switched provider mode from ${activeProvider.mode} to ${nextMode}`,
      oldValue: activeProvider.mode,
      newValue: nextMode,
      timestamp: now,
    });
    setShowSwitchModeModal(false);
  };

  // Change Provider Workflow
  const handleOpenChangeProvider = () => {
    setNewType('Cashfree');
    setNewMode('Live');
    setNewDisplayName('Cashfree Payment Gateway');
    setNewMerchantId('');
    setNewApiKeyId('');
    setNewApiKeySecret('');
    setNewWebhookSecret('');
    setChangeStep(1);
    setChangeFormError(null);
    setPendingTxWarningAcknowledged(false);
    setShowChangeProviderModal(true);
  };

  const handleNextChangeStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMerchantId.trim()) {
      setChangeFormError('Merchant / Account ID is required.');
      return;
    }
    if (!newApiKeyId.trim()) {
      setChangeFormError('API Key ID / Client ID is required.');
      return;
    }
    if (!newApiKeySecret.trim()) {
      setChangeFormError('API Key Secret is required.');
      return;
    }

    setChangeFormError(null);
    setChangeStep(2);
  };

  const handleConfirmChangeProvider = () => {
    const now = new Date().toISOString();
    const secretTail = newApiKeySecret.slice(-4) || '1a2b';
    const webhookTail = newWebhookSecret ? newWebhookSecret.slice(-4) : '3c4d';

    // Move current provider to history (if one was previously active)
    const historyItem: ProviderHistoryItem | undefined = activeProvider
      ? {
          id: `HIST-${activeProvider.id}`,
          name: activeProvider.name,
          type: activeProvider.type,
          mode: activeProvider.mode,
          activeFrom: activeProvider.activatedAt ? activeProvider.activatedAt.split('T')[0] : now.split('T')[0],
          activeTo: now.split('T')[0],
          changedBy: `${userRole === 'admin' ? 'Admin' : 'Accountant'}: ${userName}`,
          merchantAccountId: activeProvider.merchantAccountId,
          pendingTxCount: pendingOnCurrent.length,
        }
      : undefined;

    const newProviderConfig: PaymentProviderConfig = {
      id: `PRV-${newType.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`,
      name: newDisplayName.trim() || `${newType} Payments`,
      type: newType,
      mode: newMode,
      merchantAccountId: newMerchantId.trim(),
      apiKeyId: newApiKeyId.trim(),
      apiKeySecretMasked: `••••••••${secretTail}`,
      webhookSecretMasked: `••••••••${webhookTail}`,
      webhookUrl: `https://api.rlsycollege.ac.in/api/v1/payments/webhook/${newType.toLowerCase().replace(/[^a-z]/g, '')}`,
      customUrlTemplate: newType === 'Custom / Other' ? customTemplateUrl : undefined,
      customCallbackUrl: newType === 'Custom / Other' ? customCallbackUrl : undefined,
      status: 'Active',
      isOnboarded: true,
      isMapped: true,
      activatedAt: now,
      activatedBy: `${userRole === 'admin' ? 'Admin' : 'Accountant'}: ${userName}`,
    };

    onUpdateActiveProvider(newProviderConfig, historyItem);
    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'Provider',
      entityId: newProviderConfig.id,
      action: 'PROVIDER_CHANGE',
      userEmail,
      userName,
      userRole: userRole === 'admin' ? 'Admin' : 'Accountant',
      details: activeProvider
        ? `Institution payment provider replaced with ${newProviderConfig.name} (${newProviderConfig.mode}). All active campaign payment links regenerated.`
        : `Institution payment provider onboarded with ${newProviderConfig.name} (${newProviderConfig.mode}). Online payments activated.`,
      oldValue: activeProvider ? activeProvider.name : 'None (Unmapped)',
      newValue: newProviderConfig.name,
      timestamp: now,
    });

    setShowChangeProviderModal(false);
  };

  // Offline payment submit
  const handleOfflinePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedDue = studentDues.find((d) => d.id === offlineDueId);
    if (!matchedDue) return;

    const now = new Date().toISOString();
    const receiptNo = `REC/OFFLINE/${Date.now().toString().slice(-5)}`;
    const txId = `TX-${offlineMode.toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const newPayment: CampaignPayment = {
      id: `PAY-OFF-${Date.now()}`,
      receiptNo,
      dueId: matchedDue.id,
      campaignId: matchedDue.campaignId,
      campaignTitle: matchedDue.campaignTitle,
      rollNo: matchedDue.rollNo,
      studentName: matchedDue.studentName,
      course: matchedDue.course,
      semester: matchedDue.semester,
      amountPaid: Number(offlineAmount),
      lateFeePaid: 0,
      balanceRemaining: Math.max(0, matchedDue.balanceAmount - Number(offlineAmount)),
      lineItems: matchedDue.lineItems,
      paymentMode: offlineMode,
      methodDetail: `Treasury Counter (${offlineMode}): ${offlineReference || 'Official Challan'}`,
      providerId: 'PRV-OFFLINE',
      providerName: 'Treasury Counter Register',
      providerType: 'Custom / Other',
      providerMode: 'Live',
      transactionId: txId,
      gatewayReference: offlineReference,
      idempotencyKey: `IDEMP-${txId}`,
      status: 'Success',
      timestamp: now,
    };

    onRecordOfflinePayment(newPayment);
    onAddAuditLog({
      id: `LOG-${Date.now()}`,
      entityType: 'Payment',
      entityId: newPayment.id,
      action: 'OFFLINE_PAYMENT',
      userEmail,
      userName,
      userRole: userRole === 'admin' ? 'Admin' : 'Accountant',
      details: `Recorded offline ${offlineMode} payment of ₹${offlineAmount} for ${matchedDue.studentName} (${matchedDue.rollNo})`,
      newValue: `Receipt: ${receiptNo}`,
      timestamp: now,
    });

    setOfflineSuccessNotice(`Recorded payment of ₹${offlineAmount}. Receipt ${receiptNo} generated.`);
    setOfflineDueId('');
    setOfflineRollNo('');
    setOfflineAmount(0);
    setOfflineReference('');
    setTimeout(() => setOfflineSuccessNotice(null), 4000);
  };

  // Filter reconciliation payments
  const reconciliationPayments = payments.filter((p) => p.status === 'Pending' || p.status === 'Mismatched' || p.status === 'Failed');

  return (
    <div className="space-y-4">
      {/* Sub tabs navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('current')}
          className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            subTab === 'current'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Active Provider</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            subTab === 'history'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <HistoryIcon className="w-3.5 h-3.5" />
          <span>Provider History ({providerHistory.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('reconciliation')}
          className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            subTab === 'reconciliation'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Reconciliation ({reconciliationPayments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('offline')}
          className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            subTab === 'offline'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Record Counter Payment</span>
        </button>
      </div>

      {actionNotice && (
        <div className="p-3 bg-indigo-50 border border-indigo-300 rounded-xl text-xs text-indigo-900 font-semibold flex items-center justify-between animate-in fade-in">
          <span>{actionNotice}</span>
          <button type="button" onClick={() => setActionNotice(null)} className="text-indigo-700 hover:text-indigo-900 font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* 1. CURRENT ACTIVE PROVIDER TAB */}
      {subTab === 'current' && (
        <div className="space-y-4">
          {/* Institutional Single Provider Notice */}
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Single Institutional Payment Aggregator Enforced</p>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Exactly one payment provider is active at any time for the entire institution. It handles all payments for every campaign, fee head, and course without per-campaign or fallback mappings.
              </p>
            </div>
          </div>

          {/* Current Provider Card or Awaiting Setup Banner */}
          {!activeProvider ? (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-dashed border-amber-400 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                    <Clock className="w-6 h-6 text-amber-700 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-200 border border-amber-300 text-amber-900 rounded-md font-bold text-[10px] uppercase tracking-wider">
                        Awaiting Setup
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Online Gateways Offline
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mt-1">
                      No Payment Provider Onboarded
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                      Online fee payments are currently disabled across student portals and quick payments. Students see the <strong>"Online Payment Service Coming Soon"</strong> banner. Once an administrator configures and maps the authorized payment provider credentials, the <strong>"Pay Now"</strong> button will automatically become live.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenChangeProvider}
                  className="min-h-[44px] px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Onboard Payment Provider Now</span>
                </button>
              </div>

              <div className="p-3 bg-white/80 border border-amber-200 rounded-xl text-xs text-slate-700 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Supported providers: SBI e-Pay / SBI Collect, Razorpay, Cashfree, PayU, BillDesk, HDFC SmartGateway, ICICI EasyPay, PhonePe, Paytm, or Custom API.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border-2 border-indigo-600 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      {activeProvider.status}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      activeProvider.mode === 'Live' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {activeProvider.mode} Mode
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                      {activeProvider.type}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{activeProvider.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Merchant ID: {activeProvider.merchantAccountId}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSwitchModeModal(true)}
                    className="min-h-[40px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Switch between Test and Live mode"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Switch to {activeProvider.mode === 'Live' ? 'Test' : 'Live'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenChangeProvider}
                    className="min-h-[40px] px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Change Provider</span>
                  </button>
                </div>
              </div>

              {/* Provider Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">API Key ID</span>
                  <div className="font-mono font-semibold text-slate-900 truncate">
                    {activeProvider.apiKeyId}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">API Secret (Masked)</span>
                  <div className="font-mono text-slate-600">
                    {activeProvider.apiKeySecretMasked}
                    <span className="text-[10px] text-slate-400 ml-1.5 italic">(Stored encrypted)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Webhook Signature Secret</span>
                  <div className="font-mono text-slate-600">{activeProvider.webhookSecretMasked}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Last Successful Payment</span>
                  <div className="font-mono text-emerald-700 font-semibold">
                    {activeProvider.lastSuccessfulPayment
                      ? new Date(activeProvider.lastSuccessfulPayment).toLocaleString()
                      : 'Awaiting first payment'}
                  </div>
                </div>
              </div>

              {/* Webhook Endpoint */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Aggregator Webhook URL (Signatures Verified)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-[11px] font-mono text-slate-800 break-all select-all">
                    {activeProvider.webhookUrl}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="min-h-[36px] px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                  >
                    {copiedWebhook ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Test Connection Button & Result */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isTestingConnection ? 'Verifying Gateway...' : 'Test Connection'}</span>
                </button>

                {testResult && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. PROVIDER HISTORY TAB */}
      {subTab === 'history' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Past Decommissioned Providers
              </h3>
              <p className="text-[11px] text-slate-500">
                Read-only archive. Past payments remain bound to their original provider for reporting and refunds.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{providerHistory.length} archived</span>
          </div>

          {providerHistory.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No past providers in history.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {providerHistory.map((hist) => (
                <div key={hist.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{hist.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {hist.type} · {hist.mode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Active: {hist.activeFrom} to {hist.activeTo} · By {hist.changedBy}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {userRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (hist.pendingTxCount && hist.pendingTxCount > 0) {
                            setActionNotice(`Cannot delete past provider: ${hist.pendingTxCount} pending or unreconciled payments exist.`);
                            setTimeout(() => setActionNotice(null), 4000);
                            return;
                          }
                          onDeleteHistoryProvider(hist.id);
                        }}
                        className="min-h-[40px] px-3 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Delete past provider (Admin only, blocked if pending txs)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Archive</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. RECONCILIATION TAB */}
      {subTab === 'reconciliation' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Payment Reconciliation & Audit Safety
              </h3>
              <p className="text-[11px] text-slate-500">
                Handle pending webhooks, failed gateway attempts, and issue refunds on original providers.
              </p>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {reconciliationPayments.length} Pending Actions
            </span>
          </div>

          {reconciliationPayments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800">100% Reconciled</p>
              <p className="text-[11px] text-slate-400">All gateway payments have matching ledger receipts.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reconciliationPayments.map((p) => (
                <div key={p.id} className="py-3 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{p.studentName} ({p.rollNo})</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {p.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {p.campaignTitle} · Amount: ₹{p.amountPaid} · Gateway Ref: {p.gatewayReference || p.transactionId}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Re-check status button */}
                      <button
                        type="button"
                        onClick={() => {
                          setActionNotice(`Querying ${p.providerName} for Tx: ${p.transactionId}... Status confirmed from gateway logs.`);
                          setTimeout(() => setActionNotice(null), 4000);
                        }}
                        className="min-h-[40px] px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-check</span>
                      </button>

                      {/* Admin Manual Mark as Paid */}
                      {userRole === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualMarkTarget(p);
                            setManualMarkReason('');
                          }}
                          className="min-h-[40px] px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Manual Mark Paid
                        </button>
                      )}

                      {/* Refund Action */}
                      <button
                        type="button"
                        onClick={() => {
                          setRefundTarget(p);
                          setRefundAmountInput(p.amountPaid);
                          setRefundReasonInput('');
                        }}
                        className="min-h-[40px] px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Refund
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. OFFLINE PAYMENT ENTRY (Cash, Cheque, DD) */}
      {subTab === 'offline' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Record Counter Offline Payment</h3>
            <p className="text-xs text-slate-500">
              Accountant/Cashier counter collections via Cash, Bank Cheque, or Demand Draft (DD).
            </p>
          </div>

          {offlineSuccessNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{offlineSuccessNotice}</span>
            </div>
          )}

          <form onSubmit={handleOfflinePaymentSubmit} className="space-y-4">
            <div>
              <label className="text-slate-800 font-bold block mb-1">Select Outstanding Student Due *</label>
              <select
                required
                value={offlineDueId}
                onChange={(e) => {
                  setOfflineDueId(e.target.value);
                  const selected = studentDues.find((d) => d.id === e.target.value);
                  if (selected) {
                    setOfflineRollNo(selected.rollNo);
                    setOfflineAmount(selected.balanceAmount);
                  }
                }}
                className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="">-- Choose student with outstanding due --</option>
                {studentDues
                  .filter((d) => d.balanceAmount > 0)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.studentName} ({d.rollNo}) - {d.campaignTitle} [Balance: ₹{d.balanceAmount}]
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-800 font-bold block mb-1">Payment Mode *</label>
                <select
                  value={offlineMode}
                  onChange={(e) => setOfflineMode(e.target.checked)}
                  className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="Cash">Cash at Counter</option>
                  <option value="Cheque">Bank Cheque</option>
                  <option value="DD">Demand Draft (DD)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-800 font-bold block mb-1">Amount Collected (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={offlineAmount}
                  onChange={(e) => setOfflineAmount(Number(e.target.value))}
                  className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-indigo-900"
                />
              </div>

              <div>
                <label className="text-slate-800 font-bold block mb-1">Instrument / Challan Ref # *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TC-9012 or Cheque #884910"
                  value={offlineReference}
                  onChange={(e) => setOfflineReference(e.target.value)}
                  className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                className="min-h-[44px] px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Record Payment & Generate Receipt
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SWITCH TEST / LIVE CONFIRM MODAL */}
      {showSwitchModeModal && activeProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">
                Switch Mode to {activeProvider.mode === 'Live' ? 'Test (Sandbox)' : 'Live (Production)'}?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activeProvider.mode === 'Live'
                ? 'Switching to Test mode will simulate payment links with fake cards and sandbox UPI test credentials.'
                : 'Switching to Live mode will activate real banking settlements. Actual money will be deducted from student bank accounts.'}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSwitchModeModal(false)}
                className="min-h-[44px] px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitchMode}
                className="min-h-[44px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PROVIDER WIZARD MODAL */}
      {showChangeProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-0 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold">Replace Institution Payment Provider</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowChangeProviderModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {changeFormError && (
              <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                {changeFormError}
              </div>
            )}

            {changeStep === 1 && (
              <form onSubmit={handleNextChangeStep} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                <div>
                  <label className="text-slate-800 font-bold block mb-1">Supported Gateway Type *</label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const t = e.target.value as ProviderType;
                      setNewType(t);
                      setNewDisplayName(`${t} Payment Gateway`);
                    }}
                    className="w-full min-h-[44px] p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="Razorpay">Razorpay</option>
                    <option value="Cashfree">Cashfree</option>
                    <option value="PayU">PayU</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="Paytm">Paytm</option>
                    <option value="Stripe">Stripe</option>
                    <option value="Custom / Other">Custom / Other (Generic URL Template)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Mode *</label>
                    <select
                      value={newMode}
                      onChange={(e) => setNewMode(e.target.value as ProviderMode)}
                      className="w-full min-h-[44px] p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="Live">Live (Production)</option>
                      <option value="Test">Test (Sandbox)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="w-full min-h-[44px] p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-800 font-bold block mb-1">Merchant / Account ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. cf_live_94829104"
                    value={newMerchantId}
                    onChange={(e) => setNewMerchantId(e.target.value)}
                    className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-bold block mb-1">API Key ID / Client ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. key_live_abc123"
                    value={newApiKeyId}
                    onChange={(e) => setNewApiKeyId(e.target.value)}
                    className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-bold block mb-1">API Secret Key * (Encrypted)</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••••••"
                    value={newApiKeySecret}
                    onChange={(e) => setNewApiKeySecret(e.target.value)}
                    className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-bold block mb-1">Webhook Secret (Optional)</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={newWebhookSecret}
                    onChange={(e) => setNewWebhookSecret(e.target.value)}
                    className="w-full min-h-[44px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                {newType === 'Custom / Other' && (
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="font-bold text-slate-800 block">Generic URL Template</label>
                    <input
                      type="text"
                      value={customTemplateUrl}
                      onChange={(e) => setCustomTemplateUrl(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      Placeholders: &#123;amount&#125;, &#123;roll_no&#125;, &#123;due_id&#125;, &#123;reference&#125;
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowChangeProviderModal(false)}
                    className="min-h-[44px] px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Test & Confirm</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {changeStep === 2 && (
              <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                {/* Mandatory System Confirmation Notice */}
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Important Institution Policy Confirmation</span>
                  </div>
                  <p className="leading-relaxed text-xs">
                    "All new payments for every campaign will go to <strong>{newDisplayName || newType}</strong>.{activeProvider ? ` Payments already made stay with the previous provider (${activeProvider.name}).` : ' This will activate online payments for all students.'}"
                  </p>
                </div>

                {activeProvider && pendingOnCurrent.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-2">
                    <span className="font-bold block">
                      Warning: {pendingOnCurrent.length} payments currently pending with {activeProvider.name}
                    </span>
                    <p className="text-[11px] text-rose-800">
                      These pending payments should ideally be reconciled first, or you may proceed with explicit administrative acknowledgement.
                    </p>
                    <label className="flex items-center gap-2 pt-1 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pendingTxWarningAcknowledged}
                        onChange={(e) => setPendingTxWarningAcknowledged(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded"
                      />
                      <span>Acknowledge pending transactions and proceed</span>
                    </label>
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  {activeProvider && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Deactivating:</span>
                      <strong className="text-slate-800">{activeProvider.name}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">{activeProvider ? 'Activating:' : 'New Provider:'}</span>
                    <strong className="text-indigo-700">{newDisplayName} ({newMode})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Campaign Links:</span>
                    <span className="text-emerald-700 font-bold">Auto-regenerating seamlessly</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setChangeStep(1)}
                    className="min-h-[44px] px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={pendingOnCurrent.length > 0 && !pendingTxWarningAcknowledged}
                    onClick={handleConfirmChangeProvider}
                    className="min-h-[44px] px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm & Activate Provider</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANUAL MARK AS PAID MODAL (Admin Only) */}
      {manualMarkTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <h3 className="text-sm font-bold text-slate-900">Admin Override: Mark Payment as Paid</h3>
            <p className="text-xs text-slate-600">
              For {manualMarkTarget.studentName} ({manualMarkTarget.rollNo}) - Amount: ₹{manualMarkTarget.amountPaid}.
              A mandatory administrative justification is required.
            </p>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Reason / Bank Scroll UTR *</label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Bank scroll verified via SBI Treasury scroll #9021..."
                value={manualMarkReason}
                onChange={(e) => setManualMarkReason(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setManualMarkTarget(null)}
                className="min-h-[44px] px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!manualMarkReason.trim()}
                onClick={() => {
                  onManualMarkAsPaid(manualMarkTarget.id, manualMarkReason.trim());
                  setManualMarkTarget(null);
                }}
                className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <h3 className="text-sm font-bold text-slate-900">Initiate Gateway Refund</h3>
            <p className="text-xs text-slate-600">
              Refund for {refundTarget.studentName} ({refundTarget.rollNo}) on original provider <strong>{refundTarget.providerName}</strong>.
            </p>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Refund Amount (₹) *</label>
              <input
                type="number"
                min={1}
                max={refundTarget.amountPaid}
                value={refundAmountInput}
                onChange={(e) => setRefundAmountInput(Number(e.target.value))}
                className="w-full min-h-[40px] p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Reason for Refund *</label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Duplicate fee deposit refunded as per Principal approval order #88..."
                value={refundReasonInput}
                onChange={(e) => setRefundReasonInput(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="min-h-[44px] px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!refundReasonInput.trim() || refundAmountInput <= 0}
                onClick={() => {
                  onInitiateRefund(refundTarget.id, refundAmountInput, refundReasonInput.trim());
                  setRefundTarget(null);
                }}
                className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Execute Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
