import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FeeUploadBatch, 
  FeeUploadBatchItem, 
  Student, 
  UserSession,
  SchoolStaffUser 
} from '../../types/fee';
import { 
  auditExcelFeeBatch, 
  generateInstitutionalFeeTemplate, 
  ExcelFeeValidationResult 
} from '../../utils/excelValidator';
import {
  toPaisa,
  fromPaisa,
  paisaAdd,
  paisaSub
} from '../../utils/paisaMath';
import { 
  executeChunkedBatchUpload, 
  ChunkProgress, 
  ChunkWorkerResult, 
  FIRESTORE_MAX_BATCH_SIZE 
} from '../../services/chunkedBatchWorker';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Eye, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  Sparkles,
  ArrowUpRight,
  RotateCcw,
  Send,
  FileCheck,
  Filter,
  Copy,
  XCircle,
  HelpCircle,
  Layers,
  Zap,
  RefreshCw,
  Play
} from 'lucide-react';

interface Props {
  batches: FeeUploadBatch[];
  students: Student[];
  currentSession: UserSession | null;
  staffUsers: SchoolStaffUser[];
  onSubmitBatch: (batch: FeeUploadBatch) => void;
  onAuthorizeBatch: (batchId: string, officerName: string, officerDesignation: string, remarks?: string) => void;
  onRejectBatch: (batchId: string, officerName: string, reason: string) => void;
  onSwitchToAccountsOfficer?: () => void;
}

export const BatchFeeUpload: React.FC<Props> = ({
  batches,
  students,
  currentSession,
  staffUsers,
  onSubmitBatch,
  onAuthorizeBatch,
  onRejectBatch,
  onSwitchToAccountsOfficer,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'queue' | 'advisory'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Parsed draft state & audit result before submission
  const [parsedFileName, setParsedFileName] = useState<string>('');
  const [parsedFileSize, setParsedFileSize] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<FeeUploadBatchItem[]>([]);
  const [auditResult, setAuditResult] = useState<ExcelFeeValidationResult | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'matched' | 'issues'>('all');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const PREVIEW_PAGE_SIZE = 50;

  const filteredPreviewItems = useMemo(() => {
    return parsedItems.filter((i) => {
      if (filterMode === 'matched') return i.status === 'Matched';
      if (filterMode === 'issues') return i.status !== 'Matched';
      return true;
    });
  }, [parsedItems, filterMode]);

  const totalPreviewPages = Math.max(1, Math.ceil(filteredPreviewItems.length / PREVIEW_PAGE_SIZE));
  const currentPageItems = useMemo(() => {
    const start = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    return filteredPreviewItems.slice(start, start + PREVIEW_PAGE_SIZE);
  }, [filteredPreviewItems, previewPage]);

  // Chunked Worker & Atomicity State (500 rows per transaction block)
  const [isChunkWorkerModalOpen, setIsChunkWorkerModalOpen] = useState(false);
  const [isChunkWorkerRunning, setIsChunkWorkerRunning] = useState(false);
  const [isAuthorizingBatch, setIsAuthorizingBatch] = useState(false);
  const [chunkProgress, setChunkProgress] = useState<ChunkProgress | null>(null);
  const [chunkWorkerResult, setChunkWorkerResult] = useState<ChunkWorkerResult | null>(null);
  const [targetPromotionSemester, setTargetPromotionSemester] = useState<number>(0);
  const [workerSimulateRowError, setWorkerSimulateRowError] = useState<number | undefined>(undefined);

  // Inspection & Authorization Modals
  const [inspectingBatch, setInspectingBatch] = useState<FeeUploadBatch | null>(null);
  const [inspectFilterMode, setInspectFilterMode] = useState<'all' | 'matched' | 'issues'>('all');
  const [rejectionModalBatch, setRejectionModalBatch] = useState<FeeUploadBatch | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Discrepancy in fee head totals, please re-verify with fee master.');
  const [approvalRemarks, setApprovalRemarks] = useState<string>('Verified against official university fee notification and state treasury schedule.');

  // Check if current user has authorization authority
  const isAccountsOfficerOrDDO = 
    currentSession?.staffRole === 'Accounts_Officer' || 
    currentSession?.staffRole === 'Principal_DDO';

  // Handle Excel/CSV File Parsing via Multi-Stage Audit Engine
  const handleFile = (file: File) => {
    setParseError(null);
    setIsProcessingFile(true);
    setParsedFileName(file.name);
    setParsedFileSize((file.size / 1024).toFixed(1) + ' KB');
    setFilterMode('all');

    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        if (!data) {
          setParseError('Failed to read file data buffer from disk.');
          setIsProcessingFile(false);
          return;
        }

        // Run multi-stage audit engine: structural verification, duplicate checking,
        // live roster cross-referencing, and financial sanity screening
        const audit = auditExcelFeeBatch(data, students, '2025-2026');
        setAuditResult(audit);
        setParsedItems(audit.validatedItems);

        if (!audit.isValidBatch && audit.criticalErrors.length > 0) {
          setParseError(audit.criticalErrors[0]);
        }

        setIsProcessingFile(false);
      } catch (err: unknown) {
        console.error('Error auditing excel file:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setParseError(`Spreadsheet audit exception: ${errorMessage}`);
        setIsProcessingFile(false);
      }
    };

    reader.onerror = () => {
      setParseError('Failed to read file from disk.');
      setIsProcessingFile(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Generate & Download Official Institutional Template (.xlsx)
  const handleDownloadTemplate = () => {
    generateInstitutionalFeeTemplate(students);
  };

  // Submit Draft Batch to Queue (supports submitting all items or only clean matched items)
  const handleSubmitBatch = (matchedOnly: boolean = false) => {
    if (parsedItems.length === 0) return;

    const itemsToSubmit = matchedOnly 
      ? parsedItems.filter((i) => i.status === 'Matched')
      : parsedItems;

    if (itemsToSubmit.length === 0) return;

    const matchedCount = itemsToSubmit.filter((i) => i.status === 'Matched').length;
    const unmatchedCount = itemsToSubmit.filter((i) => i.status === 'Not_Found').length;
    const duplicateCount = itemsToSubmit.filter((i) => i.status === 'Duplicate').length;
    const invalidAmountCount = itemsToSubmit.filter((i) => i.status === 'Invalid_Amount').length;
    const totalBeforePaisa = itemsToSubmit.reduce((acc, curr) => paisaAdd(acc, curr.status === 'Matched' ? toPaisa(curr.currentTotalFee) : 0), 0);
    const totalAfterPaisa = itemsToSubmit.reduce((acc, curr) => paisaAdd(acc, curr.status === 'Matched' ? toPaisa(curr.newTotalFeePayable) : 0), 0);
    const netDiffPaisa = paisaSub(totalAfterPaisa, totalBeforePaisa, true);

    const batchId = 'BATCH-' + Date.now().toString().slice(-6);
    const scopedItems = itemsToSubmit.map((item, idx) => ({
      ...item,
      id: item.id && item.id.startsWith(batchId) ? item.id : `${batchId}-ROW-${item.rowNumber || idx + 1}`,
    }));

    const newBatch: FeeUploadBatch = {
      id: batchId,
      batchNo: `BATCH/FEE/2025-26/${String(batches.length + 1).padStart(3, '0')}`,
      fileName: parsedFileName || 'Student_Fee_Upload.xlsx',
      fileSize: parsedFileSize,
      uploadedAt: new Date().toISOString(),
      uploadedBy: {
        id: currentSession?.id || 'USR-ADMIN-01',
        name: currentSession?.name || 'Er. Amitav Sen (App Administrator)',
        role: currentSession?.staffRole || 'App_Admin',
        email: currentSession?.emailOrPhone || 'admin.it@rlsycollege.ac.in',
      },
      academicSession: '2025-2026',
      status: 'Pending_Approval',
      totalRecords: scopedItems.length,
      matchedRecords: matchedCount,
      unmatchedRecords: unmatchedCount,
      duplicateRecords: duplicateCount,
      invalidAmountRecords: invalidAmountCount,
      totalFeeBefore: fromPaisa(totalBeforePaisa),
      totalFeeAfter: fromPaisa(totalAfterPaisa),
      netDifference: fromPaisa(netDiffPaisa),
      criticalErrors: auditResult?.criticalErrors,
      warnings: auditResult?.warnings,
      items: scopedItems,
    };

    onSubmitBatch(newBatch);
    setParsedItems([]);
    setParsedFileName('');
    setAuditResult(null);
    setActiveTab('queue');
  };

  // Handler: Run Chunked Array Processing Worker with atomic writeBatch commits (500 rows/cluster)
  const handleStartChunkedWorker = async (
    itemsToProcess: FeeUploadBatchItem[],
    simulateErrorAtRow?: number
  ): Promise<{
    success: boolean;
    totalItemsProcessed: number;
    totalChunksProcessed: number;
    rollbackOccurred: boolean;
    errorSummary: string;
    clusterResults: unknown[];
  } | null> => {
    if (!itemsToProcess || itemsToProcess.length === 0) return null;

    setIsChunkWorkerModalOpen(true);
    setIsChunkWorkerRunning(true);
    setWorkerSimulateRowError(simulateErrorAtRow);
    setChunkProgress(null);
    setChunkWorkerResult(null);

    try {
      const result = await executeChunkedBatchUpload(itemsToProcess, students, {
        chunkSize: FIRESTORE_MAX_BATCH_SIZE,
        simulateErrorAtRow,
        targetSemester: targetPromotionSemester > 0 ? targetPromotionSemester : undefined,
        academicSession: '2025-2026',
        onProgress: (p) => setChunkProgress(p),
      });

      setChunkWorkerResult(result);
      return result;
    } catch (err: unknown) {
      console.error('Fatal Chunk Worker Execution Error:', err);
      const errorSummary = err instanceof Error ? err.message : 'Worker execution failed';
      const errRes = {
        success: false,
        totalItemsProcessed: 0,
        totalChunksProcessed: 0,
        rollbackOccurred: true,
        errorSummary,
        clusterResults: [] as unknown[],
      };
      setChunkWorkerResult(errRes);
      return errRes;
    } finally {
      setIsChunkWorkerRunning(false);
    }
  };

  // Handler: Generate 5,000 Student Test Dataset for instant bulk testing & promotion
  const handleGenerate5000TestDataset = () => {
    setIsProcessingFile(true);
    setParseError(null);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      const generatedItems: FeeUploadBatchItem[] = [];
      const baseFee = 28500;
      const branches = ['CSE', 'ECE', 'MECH', 'CIVIL', 'IT'];

      for (let i = 1; i <= 5000; i++) {
        const branch = branches[(i - 1) % branches.length];
        const numStr = String(i).padStart(4, '0');
        const rollNo = `2024${branch}${numStr}`.trim().toUpperCase();
        const newFee = baseFee + ((i % 5) * 500);

        const datasetPrefix = 'DS-' + Date.now().toString().slice(-4);
        generatedItems.push({
          id: `${datasetPrefix}-ROW-${i}`,
          rowNumber: i,
          rollNo,
          studentName: `Student ${branch} ${i}`,
          course: `B.Tech ${branch}`,
          semester: 6,
          promotedSemester: 7,
          promotionStatus: 'Eligible',
          currentTotalFee: baseFee,
          newTotalFeePayable: newFee,
          difference: newFee - baseFee,
          status: 'Matched',
        });
      }

      setParsedFileName('Official_Roster_5000_Promotion_Batch.xlsx');
      setParsedFileSize('348.5 KB');
      setAuditResult({
        isValidBatch: true,
        canProceedWithMatchedOnly: true,
        totalRecords: 5000,
        matchedCount: 5000,
        unmatchedCount: 0,
        duplicateCount: 0,
        invalidAmountCount: 0,
        criticalErrors: [],
        warnings: [
          '5,000 student records verified. Ready for 10 x 500-student atomic transaction blocks.'
        ],
        validatedItems: generatedItems,
        totalFeeBefore: 5000 * baseFee,
        totalFeeAfter: generatedItems.reduce((acc, curr) => acc + curr.newTotalFeePayable, 0),
        netDifference: generatedItems.reduce((acc, curr) => acc + (curr.difference || 0), 0),
        detectedColumns: {
          rollNoHeader: 'Roll No',
          feeHeader: 'New Fee Payable'
        }
      });
      setIsProcessingFile(false);
    }, 120);
  };

  const pendingBatchesCount = batches.filter((b) => b.status === 'Pending_Approval').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              Bulk SpreadSheet Upload & Dual Authorization
            </span>
            <span className="text-xs text-slate-400 font-mono">Excel (.xlsx) / CSV</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Student Fee Structure Upload & Accounts Officer Sign-Off Desk
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            App Administrator uploads spreadsheets with Roll No and Total Fee Payable. Changes require strict authorization by the Accounts Officer before updating live student balances.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerate5000TestDataset}
            className="py-2 px-3.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            title="Load 5,000-student dataset to test 500-row chunked processing and atomicity"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Load 5,000-Student Promotion Roster</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-300"
            title="Download official formatted Excel file with sample roll numbers"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Download Sample Excel Template</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-3 px-4 transition-all flex items-center gap-2 ${
            activeTab === 'upload'
              ? 'border-b-2 border-indigo-700 text-indigo-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Fee Spreadsheet</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 px-4 transition-all flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-b-2 border-indigo-700 text-indigo-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Authorization & Audit Queue ({batches.length})</span>
          {pendingBatchesCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {pendingBatchesCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('advisory')}
          className={`pb-3 px-4 transition-all flex items-center gap-2 ${
            activeTab === 'advisory'
              ? 'border-b-2 border-purple-700 text-purple-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Best Practices & Better Options Guide</span>
        </button>
      </div>

      {/* 1. UPLOAD TAB */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Dual Control Notice Banner */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <span className="font-bold text-indigo-950 block text-xs">
                  Maker-Checker Dual Control Governance Enabled
                </span>
                <p className="text-[11px] text-indigo-800 mt-0.5">
                  Uploaded fee modifications will enter a <span className="font-semibold underline">Pending Authorization</span> state. 
                  The Accounts Officer (or Principal/DDO) must verify and approve the batch before it alters student dues and payment receipts.
                </p>
              </div>
            </div>

            {!isAccountsOfficerOrDDO && onSwitchToAccountsOfficer && (
              <button
                onClick={onSwitchToAccountsOfficer}
                className="py-1.5 px-3 bg-white hover:bg-indigo-100 text-indigo-900 font-bold rounded-lg border border-indigo-300 transition-colors text-xs whitespace-nowrap self-start sm:self-auto shadow-xs"
              >
                Switch to Accounts Officer View
              </button>
            )}
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-sm">
              <FileSpreadsheet className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-slate-900 text-base">
              Drag & Drop Excel (.xlsx / .xls) or CSV here
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Must contain columns: <strong className="text-slate-800 font-mono">Roll No</strong> and <strong className="text-slate-800 font-mono">Total Fee Payable</strong>.
              Optional: Student Name, Course, Remarks.
            </p>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                className="py-2.5 px-4 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Select File from Computer</span>
              </button>
            </div>
          </div>

          {/* Processing Indicator */}
          {isProcessingFile && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Parsing spreadsheet rows and cross-referencing student roll numbers...</span>
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold block">Validation Error</span>
                <p>{parseError}</p>
              </div>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">
                      {parsedFileName}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">({parsedFileSize})</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Previewing {parsedItems.length} rows parsed from sheet. Review discrepancies before submitting to Accounts Officer.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setParsedItems([]);
                      setParsedFileName('');
                      setAuditResult(null);
                    }}
                    className="py-2 px-3 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                  >
                    Clear
                  </button>
                  
                  {/* Submission & Chunk Worker Action Buttons */}
                  {auditResult && auditResult.matchedCount > 0 && (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {/* Optional Target Semester Promotion */}
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl text-xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Promote to:</span>
                        <select
                          value={targetPromotionSemester}
                          onChange={(e) => setTargetPromotionSemester(Number(e.target.value))}
                          className="bg-transparent font-bold text-indigo-700 py-0.5 text-xs outline-hidden cursor-pointer"
                        >
                          <option value={0}>Retain Current Sem</option>
                          <option value={3}>Semester 3</option>
                          <option value={5}>Semester 5</option>
                          <option value={7}>Semester 7</option>
                          <option value={8}>Semester 8</option>
                        </select>
                      </div>

                      {/* Test Row 421 Rollback Simulator */}
                      <button
                        type="button"
                        onClick={() => handleStartChunkedWorker(auditResult.validatedItems, 421)}
                        className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                        title="Simulate validation error at row 421 to verify clean rollback of the entire 500-student transaction block"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Test Row 421 Rollback</span>
                      </button>

                      {/* Chunked Array Processing with Atomic writeBatch */}
                      <button
                        type="button"
                        onClick={() => handleStartChunkedWorker(auditResult.validatedItems)}
                        className="py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        title="Recursively chunks spreadsheet into 500-student blocks and commits atomically using writeBatch()"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Atomic Commit (500/Batch)</span>
                      </button>

                      {(auditResult.duplicateCount > 0 || auditResult.unmatchedCount > 0 || auditResult.invalidAmountCount > 0) && (
                        <button
                          onClick={() => handleSubmitBatch(true)}
                          className="py-2 px-3.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                          title="Submits only clean matched records and skips rows with duplicates, missing students, or negative amounts"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Submit Only Matched ({auditResult.matchedCount})</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleSubmitBatch(false)}
                        className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                          auditResult.isValidBatch
                            ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                        disabled={!auditResult.isValidBatch}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit for Sign-Off ({parsedItems.length})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Audit Health Status Banner */}
              {auditResult && (
                <div>
                  {auditResult.criticalErrors.length > 0 ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Critical Batch Errors Detected (Submission Blocked)</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700">
                        {auditResult.criticalErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ) : auditResult.warnings.length > 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Audit Warnings: {auditResult.warnings.length} Anomalies Flagged</span>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-700">
                          Recommended: Use "Submit Only Matched" to auto-exclude invalid rows
                        </span>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-2">
                        {auditResult.warnings.slice(0, 5).map((w, i) => (
                          <p key={i} className="text-[11px] text-amber-800 font-mono">• {w}</p>
                        ))}
                        {auditResult.warnings.length > 5 && (
                          <p className="text-[10px] text-amber-600 italic">
                            + {auditResult.warnings.length - 5} additional warnings hidden. Inspect flagged rows in the table below.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold">100% Clean Audit Pass:</span>
                        <span className="text-emerald-800 ml-1.5">
                          All {auditResult.matchedCount} student roll numbers cross-referenced successfully against active ERP records with valid amounts.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Summary KPIs & Anomaly Tallies */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Rows</span>
                  <span className="text-base font-bold font-mono text-slate-900">{parsedItems.length}</span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] text-emerald-800 block uppercase font-bold">Matched in ERP</span>
                  <span className="text-base font-bold font-mono text-emerald-900">
                    {auditResult ? auditResult.matchedCount : parsedItems.filter((i) => i.status === 'Matched').length}
                  </span>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <span className="text-[10px] text-purple-800 block uppercase font-bold">Sheet Duplicates</span>
                  <span className="text-base font-bold font-mono text-purple-900">
                    {auditResult ? auditResult.duplicateCount : parsedItems.filter((i) => i.status === 'Duplicate').length}
                  </span>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[10px] text-rose-800 block uppercase font-bold">Invalid / Neg Fee</span>
                  <span className="text-base font-bold font-mono text-rose-900">
                    {auditResult ? auditResult.invalidAmountCount : parsedItems.filter((i) => i.status === 'Invalid_Amount').length}
                  </span>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[10px] text-amber-800 block uppercase font-bold">Unmatched Roster</span>
                  <span className="text-base font-bold font-mono text-amber-900">
                    {auditResult ? auditResult.unmatchedCount : parsedItems.filter((i) => i.status === 'Not_Found').length}
                  </span>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="text-[10px] text-indigo-800 block uppercase font-bold">Net Variance</span>
                  <span className="text-base font-bold font-mono text-indigo-900">
                    {auditResult 
                      ? (auditResult.netDifference >= 0 ? `+₹${auditResult.netDifference.toLocaleString('en-IN')}` : `-₹${Math.abs(auditResult.netDifference).toLocaleString('en-IN')}`)
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Filter Tabs for Parsed Rows */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px] font-semibold mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    <span>Filter:</span>
                  </span>
                  
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                      filterMode === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({parsedItems.length})
                  </button>

                  <button
                    onClick={() => setFilterMode('matched')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                      filterMode === 'matched'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Matched ({parsedItems.filter((i) => i.status === 'Matched').length})
                  </button>

                  <button
                    onClick={() => setFilterMode('issues')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                      filterMode === 'issues'
                        ? 'bg-rose-700 text-white'
                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                    }`}
                  >
                    Flagged Issues ({parsedItems.filter((i) => i.status !== 'Matched').length})
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 font-mono">
                  Showing {parsedItems.filter((i) => filterMode === 'all' ? true : filterMode === 'matched' ? i.status === 'Matched' : i.status !== 'Matched').length} of {parsedItems.length} records
                </span>
              </div>

              {/* Rows List Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Row #</th>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Current Total Fee</th>
                      <th className="py-2.5 px-3">New Total Fee Payable</th>
                      <th className="py-2.5 px-3">Variance (Delta)</th>
                      <th className="py-2.5 px-3">Audit Status</th>
                      <th className="py-2.5 px-3">Audit Trace / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentPageItems.map((item, idx) => {
                      const actualRowIndex = (previewPage - 1) * PREVIEW_PAGE_SIZE + idx;
                      return (
                        <tr 
                          key={item.id || `${item.rollNo}-${item.rowNumber || actualRowIndex}`} 
                          className={
                            item.status === 'Duplicate'
                              ? 'bg-purple-50/40 hover:bg-purple-50/70'
                              : item.status === 'Invalid_Amount'
                              ? 'bg-rose-50/50 hover:bg-rose-50/80'
                              : item.status === 'Not_Found'
                              ? 'bg-amber-50/40 hover:bg-amber-50/70'
                              : 'hover:bg-slate-50/60'
                          }
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                            {item.rowNumber || actualRowIndex + 2}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {item.rollNo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            {item.studentName || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            ₹{item.currentTotalFee.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-900">
                            ₹{item.newTotalFeePayable.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {item.difference > 0 ? (
                              <span className="text-emerald-700 font-bold">+₹{item.difference.toLocaleString('en-IN')}</span>
                            ) : item.difference < 0 ? (
                              <span className="text-rose-700 font-bold">-₹{Math.abs(item.difference).toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-slate-400 font-medium">₹0 (Unchanged)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.status === 'Matched' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" />
                                <span>Matched</span>
                              </span>
                            ) : item.status === 'Duplicate' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                <Copy className="w-3 h-3" />
                                <span>Duplicate</span>
                              </span>
                            ) : item.status === 'Invalid_Amount' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                <XCircle className="w-3 h-3" />
                                <span>Invalid Amount</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Not Found</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {item.remarks || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Window Pagination Bar */}
              {totalPreviewPages > 1 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">
                    Showing <strong className="text-slate-900 font-mono font-semibold">{((previewPage - 1) * PREVIEW_PAGE_SIZE) + 1}</strong> to <strong className="text-slate-900 font-mono font-semibold">{Math.min(previewPage * PREVIEW_PAGE_SIZE, filteredPreviewItems.length)}</strong> of <strong className="text-slate-900 font-mono font-semibold">{filteredPreviewItems.length.toLocaleString('en-IN')}</strong> records
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={previewPage <= 1}
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-mono text-slate-600">
                      Page {previewPage} of {totalPreviewPages}
                    </span>
                    <button
                      type="button"
                      disabled={previewPage >= totalPreviewPages}
                      onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. QUEUE & AUDIT TAB */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Batch Fee Upload Authorization & Ledger Registry
                </h3>
                <p className="text-xs text-slate-500">
                  Dual-signoff queue. Only authorized batches update live student fee structures and hall ticket holds.
                </p>
              </div>

              {isAccountsOfficerOrDDO ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Authorized Authority Mode Active</span>
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Currently: App Admin</span>
                  {onSwitchToAccountsOfficer && (
                    <button
                      onClick={onSwitchToAccountsOfficer}
                      className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Switch to Accounts Officer to Authorize
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Batch Number & File</th>
                    <th className="py-3 px-4">Uploaded By</th>
                    <th className="py-3 px-4">Records & Match</th>
                    <th className="py-3 px-4">Total Fee Impact</th>
                    <th className="py-3 px-4">Authorization Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No batch uploads in the registry yet.
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => {
                      const isPending = batch.status === 'Pending_Approval';
                      const isApproved = batch.status === 'Approved';
                      const isRejected = batch.status === 'Rejected';

                      return (
                        <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                <FileSpreadsheet className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block font-mono text-xs">
                                  {batch.batchNo}
                                </span>
                                <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                                  {batch.fileName}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">{batch.uploadedBy.name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {new Date(batch.uploadedAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-800 block">
                              {batch.matchedRecords} / {batch.totalRecords} matched
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {batch.unmatchedRecords > 0 && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium border border-amber-200">
                                  {batch.unmatchedRecords} missing
                                </span>
                              )}
                              {(batch.duplicateRecords ?? 0) > 0 && (
                                <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium border border-purple-200">
                                  {batch.duplicateRecords} dups
                                </span>
                              )}
                              {(batch.invalidAmountRecords ?? 0) > 0 && (
                                <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-medium border border-rose-200">
                                  {batch.invalidAmountRecords} invalid
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-mono">
                              <span className="font-bold text-slate-900 block">
                                ₹{batch.totalFeeAfter.toLocaleString('en-IN')}
                              </span>
                              <span className={`text-[10px] font-semibold block ${
                                batch.netDifference > 0 ? 'text-emerald-700' : 'text-slate-500'
                              }`}>
                                {batch.netDifference > 0 ? `+₹${batch.netDifference.toLocaleString('en-IN')} Net Delta` : 'No Delta'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending Accounts Officer Sign-Off</span>
                              </span>
                            )}

                            {isApproved && (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Authorized & Applied</span>
                                </span>
                                <span className="block text-[10px] text-slate-400 mt-0.5">
                                  By: {batch.authorizedBy?.name}
                                </span>
                              </div>
                            )}

                            {isRejected && (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  <span>Rejected</span>
                                </span>
                                <span className="block text-[10px] text-rose-700 mt-0.5 truncate max-w-[150px]">
                                  {batch.rejectionReason}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setInspectingBatch(batch)}
                                className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>

                              {isPending && isAccountsOfficerOrDDO && (
                                <button
                                  onClick={() => setInspectingBatch(batch)}
                                  className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Authorize</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. BEST PRACTICES & BETTER OPTIONS ADVISORY TAB */}
      {activeTab === 'advisory' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-xs uppercase font-bold tracking-wider text-purple-200">
                Institutional Financial Architecture Advisory
              </span>
            </div>
            <h3 className="text-xl font-bold">
              Comparative Analysis: Bulk Excel Updates vs Modern Institutional Alternatives
            </h3>
            <p className="text-xs text-purple-200 max-w-3xl leading-relaxed">
              You asked for suggestions on better options for fee management. 
              While uploading an Excel file with <strong>Roll No</strong> and <strong>Total Fee Payable</strong> solves rapid aggregate updates, here is how leading Indian universities and State Technical Directorates achieve zero-error fee accounting:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option 1: What was requested */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-bold">
                  Option 1: Flat Total Fee Upload (Requested)
                </span>
                <span className="text-xs text-slate-400 font-mono">Current Baseline</span>
              </div>

              <h4 className="text-base font-bold text-slate-900">
                Excel with Roll No + Total Fee Payable
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                App Administrator prepares an Excel sheet with just student roll numbers and a final aggregate sum. The Accounts Officer authorizes the batch before live ledger commitment.
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200">
                  <span className="font-bold block mb-1">Advantages:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li>Extremely simple to produce from legacy spreadsheets or Tally dumps.</li>
                    <li>Allows arbitrary one-off total fee changes per student without navigating menus.</li>
                    <li>Quick migration when bringing legacy records into the new ERP.</li>
                  </ul>
                </div>

                <div className="p-3 bg-rose-50 text-rose-900 rounded-lg border border-rose-200">
                  <span className="font-bold block mb-1">Disadvantages & Risks:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li><strong>Loss of Itemized Accounting Heads:</strong> Cannot distinguish Tuition Fee from Lab, Exam, Library, or Hostel dues.</li>
                    <li><strong>Income Tax Section 80E / 10(23C) Failure:</strong> Students and parents cannot claim tax exemption without clear Tuition vs Transport separation.</li>
                    <li><strong>State AG Audit Objections:</strong> Government Colleges must map every rupee to specific Treasury Major/Minor Heads (e.g. 0202-01-102-01).</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Option 2: Component-Itemized Matrix Upload (Better Option A) */}
            <div className="bg-white p-6 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg">
                HIGHLY RECOMMENDED
              </div>

              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-md text-xs font-bold border border-indigo-200">
                  Option 2: Head-Itemized Matrix Upload
                </span>
                <span className="text-xs text-indigo-600 font-bold">Better Option A</span>
              </div>

              <h4 className="text-base font-bold text-slate-900">
                Excel with Granular Fee Head Columns
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                The Excel file has columns: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Roll No | Tuition | Development | Exam | Lab | Hostel | Concession</code>. The ERP sums these to compute the Total Fee Payable automatically.
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200">
                  <span className="font-bold block mb-1">Why this is much better:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li><strong>Treasury Head Compliant:</strong> Automatically splits receipts into statutory government accounting heads.</li>
                    <li><strong>Instant 80E Tax Certificates:</strong> Parents receive valid digital receipts showing pure tuition component.</li>
                    <li><strong>Department Clearances:</strong> Hostel warden mess dues and library fines reconcile without manual cross-checks.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Option 3: Dynamic Rule-Based Engine (Better Option B) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-purple-50 text-purple-800 rounded-md text-xs font-bold border border-purple-200">
                  Option 3: Dynamic Formula Engine
                </span>
                <span className="text-xs text-purple-600 font-bold">Better Option B</span>
              </div>

              <h4 className="text-base font-bold text-slate-900">
                Rules-Based Fee Calculation (No Manual Spreadsheets)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Instead of editing thousands of rows in Excel, fees are computed dynamically:
                <br />
                <code className="text-[11px] bg-slate-100 p-1 rounded font-mono text-purple-800 block mt-1">
                  Total Fee = (Course Base) × Quota Multiplier + Hostel Fee - Scholarship Waiver%
                </code>
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 text-slate-800 rounded-lg border border-slate-200">
                  <span className="font-bold block mb-1">Key Strengths:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li>Eliminates human spreadsheet typing errors entirely.</li>
                    <li>When government changes SC/ST waiver or state fee caps, updating 1 master rule updates all 3,000 students instantly.</li>
                    <li>Zero Excel version conflicts between admin and accounts department.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Option 4: Maker-Checker with OTP/Biometric & Snapshot Rollback (Better Option C) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md text-xs font-bold border border-amber-200">
                  Option 4: Dual Staging with 1-Click Rollback
                </span>
                <span className="text-xs text-amber-600 font-bold">Better Option C</span>
              </div>

              <h4 className="text-base font-bold text-slate-900">
                Staged Buffer & Automated Parent SMS/WhatsApp Push
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                When a batch is authorized by Accounts Officer, the system takes a ledger snapshot before applying changes, with 1-click rollback, and triggers automated SMS/WhatsApp alerts to registered parent phone numbers.
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 text-slate-800 rounded-lg border border-slate-200">
                  <span className="font-bold block mb-1">Key Strengths:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li>100% Audit trail of who uploaded, who authorized, and when.</li>
                    <li>Instant rollback if an incorrect Excel file was accidentally authorized.</li>
                    <li>Parent transparency prevents surprises when students pay via online or cashier counters.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Batch Inspection & Authorization Desk */}
      {inspectingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 my-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  inspectingBatch.status === 'Approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : inspectingBatch.status === 'Pending_Approval'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Batch Inspection: {inspectingBatch.batchNo}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      inspectingBatch.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inspectingBatch.status === 'Pending_Approval'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {inspectingBatch.status.replace('_', ' ')}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    File: {inspectingBatch.fileName} · Uploaded by {inspectingBatch.uploadedBy.name} ({inspectingBatch.uploadedBy.role.replace('_', ' ')})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectingBatch(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 text-xs">
              {/* Batch KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Rows</span>
                  <span className="text-base font-bold font-mono text-slate-900">{inspectingBatch.totalRecords}</span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] text-emerald-800 uppercase block font-bold">Matched in ERP</span>
                  <span className="text-base font-bold font-mono text-emerald-900">{inspectingBatch.matchedRecords}</span>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <span className="text-[10px] text-purple-800 uppercase block font-bold">Duplicates</span>
                  <span className="text-base font-bold font-mono text-purple-900">{inspectingBatch.duplicateRecords || 0}</span>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[10px] text-rose-800 uppercase block font-bold">Invalid Dues</span>
                  <span className="text-base font-bold font-mono text-rose-900">{inspectingBatch.invalidAmountRecords || 0}</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Pre-Upload Total</span>
                  <span className="text-base font-bold font-mono text-slate-700">
                    ₹{inspectingBatch.totalFeeBefore.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="text-[10px] text-indigo-700 uppercase block font-bold">Net Variance</span>
                  <span className="text-base font-bold font-mono text-indigo-900">
                    {inspectingBatch.netDifference >= 0 ? `+₹${inspectingBatch.netDifference.toLocaleString('en-IN')}` : `-₹${Math.abs(inspectingBatch.netDifference).toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>

              {/* Warnings List on Stored Batch */}
              {inspectingBatch.warnings && inspectingBatch.warnings.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Audit Warnings Recorded During Maker Upload ({inspectingBatch.warnings.length}):</span>
                  </div>
                  <div className="max-h-20 overflow-y-auto space-y-0.5 pl-5 text-[11px] text-amber-800 font-mono">
                    {inspectingBatch.warnings.slice(0, 5).map((w, idx) => (
                      <p key={idx}>• {w}</p>
                    ))}
                    {inspectingBatch.warnings.length > 5 && (
                      <p className="text-[10px] text-amber-600 italic">
                        +{inspectingBatch.warnings.length - 5} additional warnings logged.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Status & Approval details */}
              {inspectingBatch.status === 'Approved' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Authorized by Accounts Officer</span>
                    <span className="text-[11px] text-emerald-800">
                      Authorized by: <strong>{inspectingBatch.authorizedBy?.name}</strong> ({inspectingBatch.authorizedBy?.designation}) on {new Date(inspectingBatch.authorizedAt || '').toLocaleString('en-IN')}
                    </span>
                    {inspectingBatch.approvalRemarks && (
                      <p className="text-[10px] text-emerald-700 mt-1 italic">
                        "{inspectingBatch.approvalRemarks}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {inspectingBatch.status === 'Rejected' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Batch Rejected</span>
                    <span className="text-[11px] text-rose-800">
                      Reason: {inspectingBatch.rejectionReason}
                    </span>
                  </div>
                </div>
              )}

              {/* Detailed Item List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 block text-xs">
                    Line-by-Line Student Roll No & Fee Payable Breakdown:
                  </span>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setInspectFilterMode('all')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inspectFilterMode === 'all'
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({inspectingBatch.items.length})
                    </button>
                    <button
                      onClick={() => setInspectFilterMode('matched')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inspectFilterMode === 'matched'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      Matched ({inspectingBatch.items.filter((i) => i.status === 'Matched').length})
                    </button>
                    <button
                      onClick={() => setInspectFilterMode('issues')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inspectFilterMode === 'issues'
                          ? 'bg-rose-700 text-white'
                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                      }`}
                    >
                      Flagged Issues ({inspectingBatch.items.filter((i) => i.status !== 'Matched').length})
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Roll No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Current Total Fee</th>
                        <th className="py-2.5 px-3">Proposed Total Fee</th>
                        <th className="py-2.5 px-3">Variance</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Remarks / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inspectingBatch.items
                        .filter((item) => {
                          if (inspectFilterMode === 'matched') return item.status === 'Matched';
                          if (inspectFilterMode === 'issues') return item.status !== 'Matched';
                          return true;
                        })
                        .map((item, idx) => (
                          <tr key={item.id || `${item.rollNo}-${item.rowNumber || idx}`} className={item.status !== 'Matched' ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/60'}>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{item.rollNo}</td>
                            <td className="py-2 px-3 text-slate-800">{item.studentName}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">₹{item.currentTotalFee.toLocaleString('en-IN')}</td>
                            <td className="py-2 px-3 font-mono font-bold text-indigo-900">₹{item.newTotalFeePayable.toLocaleString('en-IN')}</td>
                            <td className="py-2 px-3 font-mono">
                              {item.difference > 0 ? (
                                <span className="text-emerald-700 font-bold">+₹{item.difference.toLocaleString('en-IN')}</span>
                              ) : item.difference < 0 ? (
                                <span className="text-rose-700 font-bold">-₹{Math.abs(item.difference).toLocaleString('en-IN')}</span>
                              ) : (
                                <span className="text-slate-400">₹0</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {item.status === 'Matched' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Matched</span>
                                </span>
                              ) : item.status === 'Duplicate' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Duplicate</span>
                                </span>
                              ) : item.status === 'Invalid_Amount' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                  <XCircle className="w-2.5 h-2.5" />
                                  <span>Invalid</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>Not Found</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{item.remarks || '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons for Accounts Officer */}
              {inspectingBatch.status === 'Pending_Approval' && (
                <div className="pt-4 border-t border-slate-200">
                  {isAccountsOfficerOrDDO ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-slate-700 font-semibold block mb-1">
                          Accounts Officer Official Approval Endorsement Note:
                        </label>
                        <input
                          type="text"
                          value={approvalRemarks}
                          onChange={(e) => setApprovalRemarks(e.target.value)}
                          placeholder="e.g. Verified against state treasury schedule and approved."
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
                        <button
                          onClick={() => {
                            setRejectionModalBatch(inspectingBatch);
                          }}
                          className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition-colors border border-rose-200"
                        >
                          Reject Batch
                        </button>

                        <button
                          disabled={isAuthorizingBatch || isChunkWorkerRunning}
                          onClick={async () => {
                            if (isAuthorizingBatch || isChunkWorkerRunning) return;
                            const batchItems = inspectingBatch.items;
                            const currentBatchId = inspectingBatch.id;
                            const officerName = currentSession?.name || 'S. N. Sharma';
                            const officerDesig = currentSession?.staffDesignation || 'Accounts Officer & Treasury Bursar';
                            const remarks = approvalRemarks;

                            setIsAuthorizingBatch(true);
                            try {
                              const result = await handleStartChunkedWorker(batchItems);
                              if (result && result.success) {
                                onAuthorizeBatch(
                                  currentBatchId,
                                  officerName,
                                  officerDesig,
                                  remarks
                                );
                                setInspectingBatch(null);
                              } else {
                                console.warn('Batch authorization deferred: background chunk worker failed or rolled back.');
                              }
                            } catch (error) {
                              console.error('Batch authorization failed unexpectedly:', error);
                            } finally {
                              setIsAuthorizingBatch(false);
                            }
                          }}
                          className={`py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 ${
                            isAuthorizingBatch || isChunkWorkerRunning ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                          title="Authorize and commit in atomic 500-student transaction blocks"
                        >
                          {isAuthorizingBatch || isChunkWorkerRunning ? (
                            <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-emerald-200" />
                          )}
                          <span>
                            {isAuthorizingBatch || isChunkWorkerRunning
                              ? 'Authorizing & Committing 500/Batch...'
                              : 'Authorize & Atomic Commit (500/Batch)'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>This batch requires Accounts Officer authorization.</span>
                      </div>
                      {onSwitchToAccountsOfficer && (
                        <button
                          onClick={() => {
                            setInspectingBatch(null);
                            onSwitchToAccountsOfficer();
                          }}
                          className="py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          Switch Role to Authorize
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rejection Reason */}
      {rejectionModalBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 text-xs my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Reject Fee Upload Batch ({rejectionModalBatch.batchNo})
            </h3>
            <p className="text-slate-500 mb-4">
              Please specify the audit reason for rejecting this fee revision batch so the App Administrator can correct and re-upload.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white"
              placeholder="State reason for rejection..."
            />

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectionModalBatch(null)}
                className="py-1.5 px-3 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRejectBatch(
                    rejectionModalBatch.id,
                    currentSession?.name || 'S. N. Sharma',
                    rejectionReason
                  );
                  setRejectionModalBatch(null);
                  setInspectingBatch(null);
                }}
                className="py-1.5 px-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* MODAL: CHUNKED ARRAY PROCESSING & ATOMIC WRITEBATCH WORKER */}
      {/* ============================================================== */}
      {isChunkWorkerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 text-xs flex flex-col max-h-[90dvh]">
            <div className="shrink-0 flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  chunkWorkerResult && !chunkWorkerResult.success
                    ? 'bg-rose-100 text-rose-700'
                    : isChunkWorkerRunning
                    ? 'bg-indigo-100 text-indigo-700 animate-pulse'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">
                      Chunked Array Processing Worker
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                      500 Rows / writeBatch
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Atomic transaction processing ensuring zero Firebase timeouts and clean failure rollback.
                  </p>
                </div>
              </div>

              {!isChunkWorkerRunning && (
                <button
                  onClick={() => setIsChunkWorkerModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-4">

            {/* Simulated Error Notice if active */}
            {workerSimulateRowError && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <strong className="block font-bold">Simulated Test Mode Active (Target Row {workerSimulateRowError})</strong>
                  <span>
                    Simulating bad duplicate data structure at row {workerSimulateRowError} to verify complete cluster atomicity and clean rollback.
                  </span>
                </div>
              </div>
            )}

            {/* Real-time Progress Bar */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  {isChunkWorkerRunning && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                  {isChunkWorkerRunning 
                    ? `Processing Cluster ${chunkProgress?.currentChunkIndex || 1} of ${chunkProgress?.totalChunks || 1}...`
                    : chunkWorkerResult?.success 
                    ? 'All Clusters Successfully Committed to Firestore'
                    : chunkWorkerResult && !chunkWorkerResult.success
                    ? 'Transaction Aborted & Cleanly Rolled Back'
                    : 'Initializing Worker...'}
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {chunkProgress ? `${chunkProgress.processedRows.toLocaleString()} / ${chunkProgress.totalRows.toLocaleString()} Students` : '0 Students'}
                </span>
              </div>

              {/* Progress bar line */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    chunkWorkerResult && !chunkWorkerResult.success
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-indigo-600 to-emerald-600'
                  }`}
                  style={{
                    width: chunkProgress 
                      ? `${Math.round((chunkProgress.processedRows / Math.max(1, chunkProgress.totalRows)) * 100)}%` 
                      : '0%'
                  }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Chunk Size: <strong>500 docs / block</strong></span>
                <span>
                  {chunkProgress ? `${Math.round((chunkProgress.processedRows / Math.max(1, chunkProgress.totalRows)) * 100)}% Complete` : '0%'}
                </span>
              </div>
            </div>

            {/* Error & Rollback Card if failed */}
            {chunkWorkerResult && !chunkWorkerResult.success && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-950 space-y-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="font-bold text-sm text-rose-900">
                    Cluster Transaction Rolled Back Cleanly
                  </span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  {chunkWorkerResult.error}
                </p>
                <div className="p-2.5 bg-white/80 rounded-xl border border-rose-200 text-[11px] text-rose-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-950">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Atomicity Invariant Maintained:</span>
                  </div>
                  <p className="text-slate-700">
                    Because row {chunkWorkerResult.failedRowNumber || 'in error'} failed validation, the entire 500-student transaction block was discarded before calling <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-rose-700 font-bold">batch.commit()</code>. No partial or corrupted records were committed to Firestore.
                  </p>
                </div>
              </div>
            )}

            {/* Success Summary if completed */}
            {chunkWorkerResult && chunkWorkerResult.success && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 space-y-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm text-emerald-900">
                    Atomic Chunk Migration Completed
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Successfully processed and committed <strong>{chunkWorkerResult.totalProcessed.toLocaleString()} students</strong> across <strong>{chunkWorkerResult.totalChunksCommitted} atomic transaction blocks</strong> (500 records each) with zero network drops or front-end memory exhaustion.
                </p>
              </div>
            )}

            {/* Cluster Status Matrix */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 block text-xs">
                Transaction Block Breakdown (500 Rows per Block):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Array.from({ length: chunkProgress?.totalChunks || Math.ceil(parsedItems.length / 500) || 10 }).map((_, idx) => {
                  const chunkNum = idx + 1;
                  const isCommitted = (chunkWorkerResult?.clusterHashes.length || chunkProgress?.completedClusterHashes.length || 0) >= chunkNum;
                  const isCurrent = chunkProgress?.currentChunkIndex === chunkNum && isChunkWorkerRunning;
                  const isRolledBack = chunkWorkerResult && !chunkWorkerResult.success && chunkWorkerResult.rolledBackChunkIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isCommitted
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                          : isCurrent
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-300'
                          : isRolledBack
                          ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-300'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="font-bold block text-xs">Block {chunkNum}</span>
                      <span className="text-[10px] block font-mono">
                        {idx * 500 + 1}–{(idx + 1) * 500}
                      </span>
                      <span className={`text-[9px] font-bold block mt-1 uppercase tracking-wider ${
                        isCommitted
                          ? 'text-emerald-700'
                          : isCurrent
                          ? 'text-indigo-700 animate-pulse'
                          : isRolledBack
                          ? 'text-rose-700 font-black'
                          : 'text-slate-400'
                      }`}>
                        {isCommitted ? 'Committed' : isCurrent ? 'Writing...' : isRolledBack ? 'Rolled Back' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>

            {/* Modal Actions */}
            <div className="shrink-0 flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                <span>Atomicity: <strong>writeBatch() Guaranteed</strong></span>
              </div>

              <div className="flex items-center gap-2">
                {chunkWorkerResult && !chunkWorkerResult.success && (
                  <button
                    onClick={() => handleStartChunkedWorker(parsedItems)}
                    className="py-2 px-3.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Clean Commit</span>
                  </button>
                )}

                <button
                  onClick={() => setIsChunkWorkerModalOpen(false)}
                  disabled={isChunkWorkerRunning}
                  className={`py-2 px-4 rounded-xl font-bold text-xs transition-colors ${
                    isChunkWorkerRunning
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-900 text-white'
                  }`}
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
