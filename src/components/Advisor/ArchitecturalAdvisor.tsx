import React, { useState } from 'react';
import { GATEWAY_BENCHMARKS, ARCHITECTURAL_PILLARS } from '../../data/mockData';
import { 
  Building2, 
  Check, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  HelpCircle, 
  Sliders, 
  DollarSign, 
  Clock, 
  FileText, 
  ChevronRight,
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface Props {
  onSwitchToLiveSystem: (tab?: string) => void;
}

export const ArchitecturalAdvisor: React.FC<Props> = ({ onSwitchToLiveSystem }) => {
  // ROI Calculator state (scaled in Paisa)
  const [studentCount, setStudentCount] = useState<number>(4500);
  const [avgAnnualFeePaisa, setAvgAnnualFeePaisa] = useState<number>(120000 * 100); // Scaled to integer Paisa (12,000,000 Paisa)
  const [upiShare, setUpiShare] = useState<number>(65); // 65% UPI
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Pure Integer Calculations in Paisa
  const totalAnnualBillingPaisa = studentCount * avgAnnualFeePaisa;
  const upiVolumePaisa = Math.round((totalAnnualBillingPaisa * upiShare) / 100);
  const nonUpiVolumePaisa = totalAnnualBillingPaisa - upiVolumePaisa;
  
  // Traditional legacy gateway (avg 1.25% MDR in pure integer scaled math)
  const legacyMdrCostPaisa = Math.round((totalAnnualBillingPaisa * 125) / 10000);
  // Modern Virtual Account + 0% UPI MDR architecture (0.95% on non-UPI in integer math)
  const modernMdrCostPaisa = Math.round((nonUpiVolumePaisa * 95) / 10000);
  const annualMdrSavingsPaisa = Math.max(0, legacyMdrCostPaisa - modernMdrCostPaisa);
  
  // Cashier hours: 4500 students * 15 min manual receipting = 1125 hours -> reduced to 180 hours
  const hoursSavedPerYear = Math.round(studentCount * 0.22);
  const leakagePreventedPaisa = Math.round((totalAnnualBillingPaisa * 40) / 10000); // 0.4% in integer Paisa math

  const faqs = [
    {
      q: 'Why should colleges prefer Virtual Account Numbers (VAN) & Smart Collect over standard payment links?',
      a: 'In traditional payment links, parents often bypass the portal and transfer via their personal netbanking to the college’s general bank account without writing the student roll number in the narration. The accounts department then spends months matching bank statements. With Virtual Accounts (e.g. ICICI/Razorpay Smart Collect), each student is given a permanent unique virtual account (e.g. APEX2024CS101) and custom UPI QR. Any deposit instantly credits the college bank and auto-updates that specific student’s fee ledger in under 1 second.',
    },
    {
      q: 'How does Split Settlement help college multi-entity trusts?',
      a: 'Most colleges have multiple bank accounts for compliance: Academic Society A/c (tuition), Hostel Mess Society A/c, Transport Fleet A/c, and Alumni Trust. Standard gateways force the college to collect everything into one account and do manual journal entries and bank transfers. Modern gateways (Razorpay Route / Cashfree Split) automatically distribute the single ₹1,80,000 fee transaction at source (₹1,00,000 to Tuition, ₹60,000 to Hostel, ₹20,000 to Transport) into respective bank accounts, simplifying audits and GST compliance.',
    },
    {
      q: 'What is the RBI guideline on educational UPI collection charges (MDR)?',
      a: 'Under current RBI & NPCI guidelines, Person-to-Merchant (P2M) UPI transactions under ₹2,000 incur zero MDR, and educational institutions enjoy preferential 0% or capped interchange rates. Integrating a modern gateway prioritizing UPI Intent (PhonePe, Google Pay, Paytm) allows institutions to collect over 60-70% of fees at zero transaction cost to both college and parent.',
    },
    {
      q: 'How should the ERP handle student fee defaulters without disrupting academics?',
      a: 'The best-practice ERP features a multi-tiered escalation matrix: Tier 1 (7-day grace period with subtle portal reminder), Tier 2 (automated WhatsApp & SMS alerts to parent), Tier 3 (daily nominal late fine calculation), and Tier 4 (automated withholding of semester exam admit cards / digital hall tickets). This brings fee recovery to over 98% prior to exam week without manual confrontation.',
    },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Executive Summary Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 border border-slate-800 shadow-xl">
        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-3">
            <Sparkles className="w-4 h-4" />
            <span>Higher Education Financial Infrastructure Report</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4">
            The Optimal College ERP Fee Collection Architecture
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-6 font-normal">
            For higher education institutions, the ideal fee management setup is an <span className="text-white font-semibold">API-First Modular ERP</span> integrated with <span className="text-white font-semibold">Smart Virtual Accounts (VAN) + UPI Intent</span> (via Razorpay or Cashfree), backed by a <span className="text-white font-semibold">3-Way T+1 Automated Reconciliation Engine</span> and a unified offline cashier counter desk.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => onSwitchToLiveSystem('portal')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-indigo-500/25"
            >
              <span>Test Live Student Fee Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSwitchToLiveSystem('reconciliation')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold border border-slate-700 transition-colors"
            >
              <span>Explore 3-Way Reconciliation</span>
            </button>
          </div>
        </div>

        {/* Decorative corner grid */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
      </section>

      {/* Quick Recommendation Verdict Cards */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Executive Recommendation by Institution Type
          </h2>
          <p className="text-sm text-slate-500">
            Select the archetype that best matches your campus governance model.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border-2 border-indigo-500 shadow-sm relative flex flex-col justify-between">
            <div className="absolute -top-3 right-4 bg-indigo-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Top Choice (85% of Colleges)
            </div>
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs uppercase mb-2">
                <Zap className="w-4 h-4" />
                <span>Private & Autonomous Universities</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Razorpay or Cashfree + Custom Cloud ERP</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Provides dynamic student Virtual Account Numbers (VAN) for NEFT/RTGS, dynamic UPI QR with 0% MDR, sub-account split settlements (Tuition vs Hostel), and real-time webhook updates.
              </p>
              <ul className="text-xs space-y-2 text-slate-700 mb-4">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Permanent unique bank account number per student</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Instant student ledger update in &lt; 500ms</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automated two-way TallyPrime XML export</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onSwitchToLiveSystem('portal')}
              className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
            >
              <span>See in Action</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-600 font-semibold text-xs uppercase mb-2">
                <Building2 className="w-4 h-4" />
                <span>State & Government Universities</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">State Treasury e-Challan & NetBanking</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Strict public procurement mandates and state treasury accounting favor State Treasury e-Challan or NetBanking, allowing rural parents to pay at authorized bank counters nationwide.
              </p>
              <ul className="text-xs space-y-2 text-slate-700 mb-4">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Supports 22,000+ physical bank branches offline</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Meets CAG and State Treasury audit criteria</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>High institutional trust in tier-3/rural zones</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onSwitchToLiveSystem('cashier')}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
            >
              <span>View Cashier Challan Mode</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase mb-2">
                <DollarSign className="w-4 h-4" />
                <span>NRI & International Campuses</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Flywire or Stripe + Local Gateway</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                For medical colleges and international universities collecting tuition in USD, AED, GBP, and EUR, Flywire delivers foreign exchange lock-in and automated FEMA/15CB documentation.
              </p>
              <ul className="text-xs space-y-2 text-slate-700 mb-4">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zero FX surprise with guaranteed exchange rates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automated central bank foreign inward remittance</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Accepts international debit/credit and SWIFT wires</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onSwitchToLiveSystem('fee_campaigns')}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
            >
              <span>Explore NRI Quota Pricing</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Gateway Benchmark Matrix */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Payment Gateway Evaluation for Higher Education
            </h2>
            <p className="text-sm text-slate-500">
              Benchmark comparison of leading fee collection aggregators in higher education.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Gateway & Provider</th>
                <th className="py-3 px-3">UPI MDR</th>
                <th className="py-3 px-3">Cards / NetBanking</th>
                <th className="py-3 px-3">Settlement</th>
                <th className="py-3 px-3">Virtual A/C (VAN)</th>
                <th className="py-3 px-3">Webhook Speed</th>
                <th className="py-3 px-3">Tally ERP Sync</th>
                <th className="py-3 px-4 text-right">Edu Suitability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {GATEWAY_BENCHMARKS.map((gw, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-sm">{gw.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{gw.tagline}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-emerald-700">
                    {gw.upiMdr}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {gw.cardsMdr}
                    <div className="text-[10px] text-slate-500">{gw.netBankingMdr}</div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">
                    {gw.settlementCycle}
                  </td>
                  <td className="py-3 px-3">
                    {gw.virtualAccountSupport ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Supported
                      </span>
                    ) : (
                      <span className="text-slate-400">Manual SFTP</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {gw.webhookSpeed}
                  </td>
                  <td className="py-3 px-3">
                    {gw.tallySync ? (
                      <span className="text-emerald-700 font-medium">Direct XML / API</span>
                    ) : (
                      <span className="text-amber-700 font-medium">Manual CSV</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                      {gw.recommendedRating} / 10
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* The 6 Architectural Pillars */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            6 Non-Negotiable Pillars of the Best College ERP Fee Module
          </h2>
          <p className="text-sm text-slate-500">
            Ensure your procurement or engineering RFP includes these critical technical capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ARCHITECTURAL_PILLARS.map((pillar, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">{pillar.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {pillar.description}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 bg-slate-50/60 -mx-5 -mb-5 p-4 rounded-b-xl">
                <span className="text-[11px] font-semibold text-indigo-900 block mb-1">
                  Why it&apos;s essential:
                </span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  {pillar.whyEssential}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive College ROI & Savings Calculator */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Interactive Feasibility & ROI Modeler</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              Calculate Your College&apos;s Annual Savings & Efficiency Gain
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Simulate shifting from manual cashier & legacy gateway to Modern Virtual Account + Smart Collect.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              0% UPI MDR
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Auto Tally Journaling
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
          {/* Controls */}
          <div className="space-y-5 lg:col-span-1">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>Enrolled Students</span>
                <span className="font-mono font-bold text-white">{studentCount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="500"
                max="25000"
                step="250"
                value={studentCount}
                onChange={(e) => setStudentCount(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>500</span>
                <span>12,500</span>
                <span>25,000</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>Avg. Annual Fee per Student (₹)</span>
                <span className="font-mono font-bold text-white">₹{(avgAnnualFeePaisa / 100).toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="30000"
                max="500000"
                step="5000"
                value={Math.round(avgAnnualFeePaisa / 100)}
                onChange={(e) => setAvgAnnualFeePaisa(Math.round(Number(e.target.value) * 100))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>₹30K</span>
                <span>₹2.5L</span>
                <span>₹5.0L</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>Targeted UPI Collection Share</span>
                <span className="font-mono font-bold text-white">{upiShare}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="90"
                step="5"
                value={upiShare}
                onChange={(e) => setUpiShare(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>30%</span>
                <span>60%</span>
                <span>90%</span>
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">Total Annual Fee Turnover</span>
              <div className="text-2xl font-bold font-mono text-white">
                ₹{((totalAnnualBillingPaisa / 100) / 10000000).toFixed(2)} Cr
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {studentCount.toLocaleString()} students across all academic programs
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-800 p-5 rounded-xl border border-emerald-500/40">
              <span className="text-xs text-emerald-400 block mb-1 font-semibold">
                Estimated Annual Gateway MDR Savings
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-300">
                ₹{Math.round(annualMdrSavingsPaisa / 100).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-emerald-400/80 mt-1">
                By leveraging 0% UPI MDR + preferential education rates
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">Accounts Staff Hours Saved</span>
              <div className="text-2xl font-bold font-mono text-indigo-300">
                {hoursSavedPerYear.toLocaleString()} Hours/Yr
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Eliminates manual bank challan receipting and UTR matching
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">Reconciliation Leakage Prevented</span>
              <div className="text-2xl font-bold font-mono text-cyan-300">
                ₹{((leakagePreventedPaisa / 100) / 100000).toFixed(1)} Lakhs
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Recovery from dropped transactions, untagged NEFTs, and uncollected fines
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Frequently Asked Questions by College Registrars & CFOs
          </h2>
          <p className="text-sm text-slate-500">
            Practical clarifications on security, compliance, and integration.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all shadow-sm"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                  {faq.q}
                </span>
                <span className="text-slate-400 text-xs shrink-0 font-mono">
                  {activeFaq === idx ? '−' : '+'}
                </span>
              </button>
              {activeFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Call to action to test live modules */}
      <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-indigo-950 text-base">
            Ready to test how the best fee collection system works?
          </h3>
          <p className="text-xs text-indigo-800/80 mt-0.5">
            Switch to the student portal to experience real-time UPI QR generation, instant fee clearances, and official receipt downloads.
          </p>
        </div>
        <button
          onClick={() => onSwitchToLiveSystem('portal')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold whitespace-nowrap transition-colors shadow-sm"
        >
          Launch Student Payment Portal
        </button>
      </section>
    </div>
  );
};
