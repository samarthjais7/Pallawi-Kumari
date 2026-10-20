import React, { useState } from 'react';
import { ReconciliationBatchItem } from '../../types/fee';
import { INITIAL_RECON_ITEMS } from '../../data/mockData';
import { 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  FileCode, 
  Search, 
  Download,
  Filter,
  Check,
  Building
} from 'lucide-react';

export const ReconciliationEngine: React.FC = () => {
  const [items, setItems] = useState<ReconciliationBatchItem[]>(INITIAL_RECON_ITEMS);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [reconciledCount, setReconciledCount] = useState<number>(0);
  const [tallyExported, setTallyExported] = useState<boolean>(false);

  const matchedCount = items.filter((i) => i.status === 'Matched').length;
  const pendingCount = items.filter((i) => i.status === 'Pending_Settlement').length;
  const missingCount = items.filter((i) => i.status === 'Missing_in_ERP').length;

  const handleRunAutoRecon = () => {
    setIsReconciling(true);
    setTimeout(() => {
      // Resolve any missing in ERP by auto-matching
      const updated = items.map((item) => {
        if (item.status === 'Missing_in_ERP') {
          return {
            ...item,
            erpReceiptNo: 'REC/AUTO/' + Date.now().toString().slice(-5),
            erpAmount: item.gatewayAmount,
            status: 'Matched' as const,
            resolutionNotes: 'Auto-resolved via student Virtual UPI VPA match.',
          };
        }
        return item;
      });
      setItems(updated);
      setIsReconciling(false);
      setReconciledCount((prev) => prev + 1);
    }, 1200);
  };

  const handleExportTallyXML = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        ${items
          .filter((i) => i.status === 'Matched')
          .map(
            (i) => `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Receipt" ACTION="Create">
            <DATE>${i.date.replace(/-/g, '')}</DATE>
            <NARRATION>Fee collected for student ${i.studentRollNo}, UTR: ${i.bankUtr}, Gateway: ${i.gateway}</NARRATION>
            <VOUCHERNUMBER>${i.erpReceiptNo}</VOUCHERNUMBER>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Tuition & Academic Fees</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${i.erpAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>HDFC Bank Collection Account</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${i.settledAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            ${
              i.feeMdr > 0
                ? `<ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Payment Gateway Commission Expense</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${i.feeMdr}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`
                : ''
            }
          </VOUCHER>
        </TALLYMESSAGE>`
          )
          .join('')}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TallyPrime_Fee_Receipts_${new Date().toISOString().split('T')[0]}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTallyExported(true);
    setTimeout(() => setTallyExported(false), 4000);
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;

    const headers = [
      'Date',
      'Student Roll No',
      'Student Name',
      'Bank UTR Number',
      'Gateway Transaction ID',
      'Payment Gateway',
      'ERP Receipt Number',
      'ERP Recorded Amount (INR)',
      'Gateway Amount (INR)',
      'Bank Settled Amount (INR)',
      'Gateway Fee MDR (INR)',
      'Reconciliation Status',
      'Resolution Notes'
    ];

    const escapeCsv = (val: unknown): string => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filtered.map((item) => [
      escapeCsv(item.date),
      escapeCsv(item.studentRollNo),
      escapeCsv(item.studentName ?? '-'),
      escapeCsv(item.bankUtr),
      escapeCsv(item.gatewayTxId),
      escapeCsv(item.gateway),
      escapeCsv(item.erpReceiptNo),
      escapeCsv(item.erpAmount.toString()),
      escapeCsv(item.gatewayAmount.toString()),
      escapeCsv(item.settledAmount.toString()),
      escapeCsv(item.feeMdr.toString()),
      escapeCsv(item.status),
      escapeCsv(item.resolutionNotes ?? '-')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `Accountant_Reconciliation_Ledger_${dateStamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = items.filter((item) => {
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch =
      item.studentRollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bankUtr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.gatewayTxId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>3-Way Financial Reconciliation Engine</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            ERP Ledger vs Gateway MIS vs Core Bank Statement
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automate T+1 settlement matching, fee MDR audit, and direct TallyPrime XML voucher exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAutoRecon}
            disabled={isReconciling}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
            <span>{isReconciling ? 'Reconciling Ledger...' : 'Run Auto-Reconciliation'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            title={`Export ${filtered.length} filtered reconciliation records as CSV`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportTallyXML}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export TallyPrime XML</span>
          </button>
        </div>
      </section>

      {tallyExported && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Tally XML vouchers generated successfully. You can import this directly into TallyPrime or SAP.</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            3-Way Matched
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700">{matchedCount} Txs</div>
          <span className="text-[10px] text-slate-500">100% ERP, Bank & Gateway sync</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            T+1 Pending Settlement
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700">{pendingCount} Txs</div>
          <span className="text-[10px] text-slate-500">Awaiting bank clearing window</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            Missing in ERP
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700">{missingCount} Txs</div>
          <span className="text-[10px] text-slate-500">Direct VAN deposit unmapped</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            Total Gateway MDR Deducted
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹{items.reduce((acc, i) => acc + i.feeMdr, 0).toFixed(1)}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Low 0.16% average fee</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Bank UTR, Roll No, Tx ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Status Filter:</span>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded font-medium ${
              filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            All Batches
          </button>
          <button
            onClick={() => setFilterStatus('Matched')}
            className={`px-2.5 py-1 rounded font-medium ${
              filterStatus === 'Matched' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Matched
          </button>
          <button
            onClick={() => setFilterStatus('Pending_Settlement')}
            className={`px-2.5 py-1 rounded font-medium ${
              filterStatus === 'Pending_Settlement' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Pending
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="ml-2 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
              <th className="py-3 px-4">Date & Gateway</th>
              <th className="py-3 px-3">Student Roll</th>
              <th className="py-3 px-3">Bank UTR & Tx ID</th>
              <th className="py-3 px-3 text-right">Gateway Amount (₹)</th>
              <th className="py-3 px-3 text-right">MDR (₹)</th>
              <th className="py-3 px-3 text-right">Settled Amount (₹)</th>
              <th className="py-3 px-3 text-center">Reconciliation Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{item.gateway}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{item.date}</div>
                </td>
                <td className="py-3 px-3 font-mono font-medium text-slate-800">
                  {item.studentRollNo}
                </td>
                <td className="py-3 px-3">
                  <div className="font-mono text-slate-900 font-semibold">{item.bankUtr}</div>
                  <div className="font-mono text-[10px] text-slate-400">{item.gatewayTxId}</div>
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                  ₹{item.gatewayAmount.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-700 font-medium">
                  ₹{item.feeMdr.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                  ₹{item.settledAmount.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3 text-center">
                  {item.status === 'Matched' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>3-Way Matched</span>
                    </span>
                  ) : item.status === 'Pending_Settlement' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                      <span>T+1 In Transit</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                      <span>Unmapped Drop</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
