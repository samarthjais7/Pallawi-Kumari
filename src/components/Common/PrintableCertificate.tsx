import React, { useState } from 'react';
import { CertificateRequest, CertificateTheme, Student, StudentNoDuesApplication } from '../../types/fee';
import { INSTITUTION_INFO } from '../../data/mockData';
import { Printer, X, ShieldCheck, CheckCircle2, Award, QrCode, Maximize2 } from 'lucide-react';
import { InAppPdfPreviewer } from './InAppPdfPreviewer';

interface Props {
  certificate?: CertificateRequest | null;
  noDuesApp?: StudentNoDuesApplication | null;
  student: Student;
  theme?: CertificateTheme | null;
  onClose: () => void;
}

export const PrintableCertificate: React.FC<Props> = ({ 
  certificate, 
  noDuesApp, 
  student: inputStudent, 
  theme, 
  onClose 
}) => {
  const [showFullPdfPreview, setShowFullPdfPreview] = useState(false);

  if (!inputStudent && !certificate?.studentRollNo && !noDuesApp?.studentRollNo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto font-bold text-lg">
            !
          </div>
          <h3 className="font-bold text-slate-900 text-base">Certificate Generation Error</h3>
          <p className="text-xs text-slate-600">
            Cannot generate certificate: No verified student record or clearance application reference found.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const student: Student = inputStudent || {
    id: certificate?.studentId || noDuesApp?.studentId || 'UNKNOWN',
    rollNo: certificate?.studentRollNo || noDuesApp?.studentRollNo || 'UNKNOWN',
    registerNo: `RLSY/REG/${certificate?.studentRollNo || noDuesApp?.studentRollNo || 'N/A'}`,
    name: certificate?.studentName || noDuesApp?.studentName || 'Student',
    gender: 'Male',
    fatherName: 'Guardian',
    parentName: 'Guardian',
    email: '',
    phone: '',
    parentPhone: '',
    course: certificate?.course || noDuesApp?.course || 'General',
    branch: certificate?.branch || noDuesApp?.branch || 'General',
    streamCode: 'GEN',
    subjectsEnrolled: [],
    year: 1,
    semester: typeof certificate?.semester === 'number'
      ? certificate.semester
      : typeof noDuesApp?.semester === 'number'
      ? noDuesApp.semester
      : 1,
    admissionYear: 2025,
    dateOfBirth: 'N/A',
    category: 'General',
    domicileState: 'Bihar',
    annualFamilyIncome: 0,
    quota: 'General',
    hostelResident: false,
    scholarshipWaiverPercent: 0,
    totalFee: 0,
    paidFee: 0,
    pendingFee: 0,
    lateFineApplied: 0,
    hallTicketBlocked: false,
  };

  const handlePrint = () => {
    window.print();
  };

  const isNoDuesNoc = !certificate && noDuesApp;
  const certType = certificate?.certificateType || 'No Dues Clearance Certificate';
  const certSerial = certificate?.certificateSerialNo || noDuesApp?.certificateNo || `RLSY/CERT/2025/${student.rollNo}`;
  const issueDate = 
    certificate?.approvedDate || 
    certificate?.issuedDate || 
    noDuesApp?.appliedDate || 
    new Date().toISOString().split('T')[0];

  const principalName = INSTITUTION_INFO.principalName || 'Prof. (Dr.) K. K. Srivastava';

  const primaryColor = theme?.primaryBorderColor || '#1e3a8a';
  const accentColor = theme?.accentColor || '#d97706';
  const backgroundColor = theme?.backgroundColor || '#ffffff';
  const textColor = theme?.textColor || '#0f172a';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Action Bar */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold tracking-wide">
              Official Government College Certificate
            </span>
            {theme && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-900/60 border border-indigo-500/40 text-indigo-200">
                Theme: {theme.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFullPdfPreview(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded text-xs font-medium transition-colors shadow-sm cursor-pointer"
              title="Full-Screen In-App PDF Preview"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full-Screen Preview</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Certificate</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div 
          id="printable-receipt" 
          className="p-8 sm:p-12 min-h-[640px] flex flex-col justify-between border-8 relative m-2 overflow-y-auto flex-1 shadow-inner"
          style={{
            borderColor: primaryColor,
            backgroundColor: backgroundColor,
            color: textColor
          }}
        >
          {/* Accent Inner Border */}
          <div 
            className="absolute inset-1.5 border-2 pointer-events-none"
            style={{ borderColor: accentColor }}
          />

          {/* Watermark in background */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
            style={{ opacity: theme?.watermarkOpacity || 0.07 }}
          >
            <span 
              className="text-4xl sm:text-5xl font-black uppercase tracking-widest text-center transform -rotate-25"
              style={{ color: primaryColor }}
            >
              {theme?.watermarkText || 'RLSY COLLEGE PATNA'}
            </span>
          </div>

          {/* Official Govt College Header */}
          <div className="relative z-10">
            <div className="text-center border-b-2 pb-5 mb-8" style={{ borderColor: primaryColor }}>
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: accentColor }}>
                <span>{theme?.customTitlePrefix || INSTITUTION_INFO.treasuryCode}</span>
                <span>Affiliated with Patna College · UGC Approved</span>
              </div>

              <div 
                className="inline-block p-1 px-3 border text-[11px] font-bold uppercase tracking-wider mb-1"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                {INSTITUTION_INFO.dept}
              </div>

              <h1 
                className="text-2xl sm:text-3xl font-serif font-black tracking-tight uppercase mt-1"
                style={{ color: primaryColor }}
              >
                {INSTITUTION_INFO.name}
              </h1>
              <p className="text-xs font-medium mt-1 opacity-90">{INSTITUTION_INFO.accreditation}</p>
              <p className="text-[11px] opacity-80">{INSTITUTION_INFO.address}</p>

              <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-300 text-xs font-mono">
                <div>
                  <span className="opacity-75 font-medium">Dispatch Serial No: </span>
                  <span className="font-bold">{certSerial}</span>
                </div>
                <div>
                  <span className="opacity-75 font-medium">Issue Date: </span>
                  <span className="font-bold">{issueDate}</span>
                </div>
              </div>
            </div>

            {/* Certificate Title */}
            <div className="text-center my-6">
              <span 
                className="inline-block py-1.5 px-6 border-y-2 text-base sm:text-lg font-serif font-extrabold uppercase tracking-widest"
                style={{ borderColor: accentColor, color: primaryColor }}
              >
                {certType}
              </span>
            </div>

            {/* Certificate Body Paragraphs based on Type */}
            {certType === 'Bonafide Certificate' && (
              <div className="text-sm leading-relaxed text-slate-800 space-y-4 my-8 font-serif">
                <p className="text-justify text-base">
                  This is to certify that <strong className="font-bold underline uppercase">{student.name}</strong>, 
                  Son/Daughter of Shri <strong className="font-bold underline">{student.fatherName}</strong>, 
                  bearing College Enrollment Roll No: <strong className="font-mono font-bold">{student.rollNo}</strong> 
                  and University Registration No: <strong className="font-mono font-bold">{student.registerNo}</strong>, 
                  is a bonafide student of this Government Institute, studying in the 
                  <strong className="font-bold"> {student.course} ({student.branch})</strong>, 
                  currently enrolled in Semester <strong>{student.semester}</strong> (Academic Year {INSTITUTION_INFO.academicSession}).
                </p>

                <p className="text-justify text-base">
                  According to the institutional records, his/her date of birth is <strong className="font-mono font-bold">{student.dateOfBirth}</strong>. 
                  He/she is admitted under the <strong className="font-bold">{student.quota}</strong> quota category.
                </p>

                <p className="text-justify text-base">
                  This certificate is issued on the student's request for the specific purpose of: 
                  <span className="italic font-bold text-slate-900"> "{certificate?.purpose || 'Official verification / Scholarship / Passport application'}"</span>.
                </p>

                <p className="text-justify text-base">
                  To the best of our knowledge, his/her conduct, moral character, and academic attendance during his/her tenure at this institution have been 
                  <strong className="font-bold uppercase"> {certificate?.conductStatus || 'Very Good'}</strong>.
                </p>
              </div>
            )}

            {certType.includes('Transfer Certificate') && (
              <div className="text-sm leading-relaxed text-slate-800 space-y-3 my-6 font-serif">
                <p className="text-center italic text-xs text-slate-600 mb-4">
                  (College Leaving & Character Certificate under Government Education Rules)
                </p>

                <div className="grid grid-cols-2 gap-y-2.5 text-xs sm:text-sm border p-4 border-slate-300 bg-slate-50/50">
                  <div>
                    <span className="text-slate-500 block">1. Name of Student:</span>
                    <strong className="text-slate-900 uppercase">{student.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">2. Father's / Guardian's Name:</span>
                    <strong className="text-slate-900">{student.fatherName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">3. University Registration No:</span>
                    <strong className="font-mono text-slate-900">{student.registerNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">4. Year of Admission:</span>
                    <strong className="text-slate-900">{student.admissionYear}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">5. Date of Birth (as per Matriculation):</span>
                    <strong className="font-mono text-slate-900">{student.dateOfBirth}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">6. Quota / Category:</span>
                    <strong className="text-slate-900">{student.category} ({student.quota})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">7. Inter-Departmental No Dues:</span>
                    <strong className="text-emerald-800 font-bold">100% Fully Cleared & Certified</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">8. General Conduct & Character:</span>
                    <strong className="text-slate-900 uppercase">{certificate?.conductStatus || 'Exemplary'}</strong>
                  </div>
                </div>

                <p className="text-justify text-xs sm:text-sm pt-2">
                  This is to certify that all institutional dues, tuition fees, library books, and workshop items have been cleared in full. The student has left this college with our full consent and good wishes.
                </p>
              </div>
            )}

            {isNoDuesNoc && noDuesApp && (
              <div className="my-6 space-y-4">
                <p className="text-xs sm:text-sm text-slate-700 font-serif leading-relaxed">
                  Certified that student <strong className="uppercase">{student.name}</strong> (Roll: <strong className="font-mono">{student.rollNo}</strong>), 
                  course <strong className="font-semibold">{student.course} {student.branch}</strong>, has successfully submitted clearance and 
                  holds <strong>ZERO OUTSTANDING DUES</strong> across all university departments:
                </p>

                {/* 7 Department Sign-off Matrix */}
                <div className="border border-slate-300 rounded overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">College Department / Section</th>
                        <th className="py-2 px-3">Verifying Officer</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3 text-right">Clearance Ref / Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {Object.values(noDuesApp.clearances).map((clr, idx) => (
                        <tr key={clr.key} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{clr.name}</td>
                          <td className="py-2 px-3 text-slate-600">{clr.officerName}</td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-700">
                            ✓ {clr.status === 'Approved' ? 'CLEARED' : clr.status}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-600">
                            {clr.clearedDate || (noDuesApp?.appliedDate ? new Date(noDuesApp.appliedDate).toLocaleDateString('en-GB') : 'Verified')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Official Signatures & Seal Footer */}
          <div className="pt-8 border-t-2 text-xs relative z-10" style={{ borderColor: primaryColor }}>
            <div className="grid grid-cols-3 gap-6 items-end">
              <div>
                <div className="w-24 h-24 border p-1 flex flex-col items-center justify-center bg-white/80 text-center rounded shadow-xs" style={{ borderColor: accentColor }}>
                  <QrCode className="w-12 h-12 text-slate-800" />
                  <span className="font-mono text-[7px] text-slate-500 mt-0.5">STATE AUTH #{student.rollNo}</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Verify on State Higher Ed Portal</span>
              </div>

              <div className="text-center">
                <div 
                  className="inline-block p-2 border-2 rounded font-black uppercase text-[10px] tracking-wider shadow-xs"
                  style={{ borderColor: accentColor, color: primaryColor, backgroundColor: 'rgba(255,255,255,0.7)' }}
                >
                  <Award className="w-5 h-5 mx-auto mb-0.5 text-amber-600" />
                  <span>OFFICIAL SEAL & EMBLEM</span>
                  <div className="text-[7px] font-mono text-slate-500">RLSY COLLEGE PATNA</div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Administrative Section</p>
              </div>

              <div className="text-right">
                <div className="font-serif font-bold text-sm mb-1 italic opacity-90" style={{ color: primaryColor }}>
                  {principalName}
                </div>
                <div className="border-t pt-1 font-bold uppercase text-[11px]" style={{ borderColor: primaryColor, color: primaryColor }}>
                  {theme?.signatories?.primaryTitle || 'Principal & DDO'}
                </div>
                <p className="text-[10px] text-slate-500">{INSTITUTION_INFO.name}</p>
              </div>
            </div>

            <div className="mt-6 pt-2 border-t text-[10px] text-center" style={{ borderColor: accentColor, color: accentColor }}>
              {theme?.footerMotto || '* Valid for all Government, PSU, and University statutory purposes.'}
            </div>
          </div>
        </div>
      </div>

      {/* FULL SCREEN IN-APP PDF PREVIEWER */}
      {showFullPdfPreview && (
        <InAppPdfPreviewer
          isOpen={showFullPdfPreview}
          onClose={() => setShowFullPdfPreview(false)}
          defaultFullScreen={true}
          document={{
            id: `CERT-${certSerial}`,
            title: certType,
            subtitle: `${student.name} (${student.rollNo}) · Serial: ${certSerial}`,
            type: isNoDuesNoc ? 'noc' : 'certificate',
            badgeText: 'Verified Statutory Certificate',
            badgeColor: 'amber',
            fileName: `${certType.replace(/\s+/g, '_')}_${student.rollNo}.pdf`,
            contentNode: (
              <div 
                className="p-8 sm:p-12 min-h-[640px] flex flex-col justify-between border-8 relative m-2 overflow-hidden shadow-inner"
                style={{
                  borderColor: primaryColor,
                  backgroundColor: backgroundColor,
                  color: textColor
                }}
              >
                {/* Accent Inner Border */}
                <div 
                  className="absolute inset-1.5 border-2 pointer-events-none"
                  style={{ borderColor: accentColor }}
                />

                {/* Watermark in background */}
                <div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                  style={{ opacity: theme?.watermarkOpacity || 0.07 }}
                >
                  <span 
                    className="text-4xl sm:text-5xl font-black uppercase tracking-widest text-center transform -rotate-25"
                    style={{ color: primaryColor }}
                  >
                    {theme?.watermarkText || 'RLSY COLLEGE PATNA'}
                  </span>
                </div>

                {/* Official Govt College Header */}
                <div className="relative z-10">
                  <div className="text-center border-b-2 pb-5 mb-8" style={{ borderColor: primaryColor }}>
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: accentColor }}>
                      <span>{theme?.customTitlePrefix || INSTITUTION_INFO.treasuryCode}</span>
                      <span>Affiliated with Patna College · UGC Approved</span>
                    </div>

                    <div 
                      className="inline-block p-1 px-3 border text-[11px] font-bold uppercase tracking-wider mb-1"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      {INSTITUTION_INFO.dept}
                    </div>

                    <h1 
                      className="text-2xl sm:text-3xl font-serif font-black tracking-tight uppercase mt-1"
                      style={{ color: primaryColor }}
                    >
                      {INSTITUTION_INFO.name}
                    </h1>
                    <p className="text-xs font-medium mt-1 opacity-90">{INSTITUTION_INFO.accreditation}</p>
                    <p className="text-[11px] opacity-80">{INSTITUTION_INFO.address}</p>

                    <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-300 text-xs font-mono">
                      <div>
                        <span className="opacity-75 font-medium">Dispatch Serial No: </span>
                        <span className="font-bold">{certSerial}</span>
                      </div>
                      <div>
                        <span className="opacity-75 font-medium">Issue Date: </span>
                        <span className="font-bold">{issueDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Title */}
                  <div className="text-center my-6">
                    <span 
                      className="inline-block py-1.5 px-6 border-y-2 text-base sm:text-lg font-serif font-extrabold uppercase tracking-widest"
                      style={{ borderColor: accentColor, color: primaryColor }}
                    >
                      {certType}
                    </span>
                  </div>

                  {/* Certificate Body Paragraphs based on Type */}
                  {certType === 'Bonafide Certificate' && (
                    <div className="text-sm leading-relaxed text-slate-800 space-y-4 my-8 font-serif">
                      <p className="text-justify text-base">
                        This is to certify that <strong className="font-bold underline uppercase">{student.name}</strong>, 
                        Son/Daughter of Shri <strong className="font-bold underline">{student.fatherName}</strong>, 
                        bearing College Enrollment Roll No: <strong className="font-mono font-bold">{student.rollNo}</strong> 
                        and University Registration No: <strong className="font-mono font-bold">{student.registerNo}</strong>, 
                        is a bonafide student of this Government Institute, studying in the 
                        <strong className="font-bold"> {student.course} ({student.branch})</strong>, 
                        currently enrolled in Semester <strong>{student.semester}</strong> (Academic Year {INSTITUTION_INFO.academicSession}).
                      </p>

                      <p className="text-justify text-base">
                        According to the institutional records, his/her date of birth is <strong className="font-mono font-bold">{student.dateOfBirth}</strong>. 
                        He/she is admitted under the <strong className="font-bold">{student.quota}</strong> quota category.
                      </p>

                      <p className="text-justify text-base">
                        This certificate is issued on the student's request for the specific purpose of: 
                        <span className="italic font-bold text-slate-900"> "{certificate?.purpose || 'Official verification / Scholarship / Passport application'}"</span>.
                      </p>

                      <p className="text-justify text-base">
                        To the best of our knowledge, his/her conduct, moral character, and academic attendance during his/her tenure at this institution have been 
                        <strong className="font-bold uppercase"> {certificate?.conductStatus || 'Very Good'}</strong>.
                      </p>
                    </div>
                  )}

                  {certType.includes('Transfer Certificate') && (
                    <div className="text-sm leading-relaxed text-slate-800 space-y-3 my-6 font-serif">
                      <p className="text-center italic text-xs text-slate-600 mb-4">
                        (College Leaving & Character Certificate under Government Education Rules)
                      </p>

                      <div className="grid grid-cols-2 gap-y-2.5 text-xs sm:text-sm border p-4 border-slate-300 bg-slate-50/50">
                        <div>
                          <span className="text-slate-500 block">1. Name of Student:</span>
                          <strong className="text-slate-900 uppercase">{student.name}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">2. Father's / Guardian's Name:</span>
                          <strong className="text-slate-900">{student.fatherName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">3. University Registration No:</span>
                          <strong className="font-mono text-slate-900">{student.registerNo}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">4. Year of Admission:</span>
                          <strong className="text-slate-900">{student.admissionYear}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">5. Date of Birth (as per Matriculation):</span>
                          <strong className="font-mono text-slate-900">{student.dateOfBirth}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">6. Quota / Category:</span>
                          <strong className="text-slate-900">{student.category} ({student.quota})</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">7. Inter-Departmental No Dues:</span>
                          <strong className="text-emerald-800 font-bold">100% Fully Cleared & Certified</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">8. General Conduct & Character:</span>
                          <strong className="text-slate-900 uppercase">{certificate?.conductStatus || 'Exemplary'}</strong>
                        </div>
                      </div>

                      <p className="text-justify text-xs sm:text-sm pt-2">
                        This is to certify that all institutional dues, tuition fees, library books, and workshop items have been cleared in full. The student has left this college with our full consent and good wishes.
                      </p>
                    </div>
                  )}

                  {isNoDuesNoc && noDuesApp && (
                    <div className="my-6 space-y-4">
                      <p className="text-xs sm:text-sm text-slate-700 font-serif leading-relaxed">
                        Certified that student <strong className="uppercase">{student.name}</strong> (Roll: <strong className="font-mono">{student.rollNo}</strong>), 
                        course <strong className="font-semibold">{student.course} {student.branch}</strong>, has successfully submitted clearance and 
                        holds <strong>ZERO OUTSTANDING DUES</strong> across all university departments:
                      </p>

                      <div className="border border-slate-300 rounded overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                              <th className="py-2 px-3">#</th>
                              <th className="py-2 px-3">College Department / Section</th>
                              <th className="py-2 px-3">Verifying Officer</th>
                              <th className="py-2 px-3 text-center">Status</th>
                              <th className="py-2 px-3 text-right">Clearance Ref / Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {Object.values(noDuesApp.clearances).map((clr, idx) => (
                              <tr key={clr.key} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                                <td className="py-2 px-3 font-semibold text-slate-900">{clr.name}</td>
                                <td className="py-2 px-3 text-slate-600">{clr.officerName}</td>
                                <td className="py-2 px-3 text-center font-bold text-emerald-700">
                                  ✓ {clr.status === 'Approved' ? 'CLEARED' : clr.status}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-600">
                                  {clr.clearedDate || (noDuesApp?.appliedDate ? new Date(noDuesApp.appliedDate).toLocaleDateString('en-GB') : 'Verified')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Official Signatures & Seal Footer */}
                <div className="pt-8 border-t-2 text-xs relative z-10" style={{ borderColor: primaryColor }}>
                  <div className="grid grid-cols-3 gap-6 items-end">
                    <div>
                      <div className="w-24 h-24 border p-1 flex flex-col items-center justify-center bg-white/80 text-center rounded shadow-xs" style={{ borderColor: accentColor }}>
                        <QrCode className="w-12 h-12 text-slate-800" />
                        <span className="font-mono text-[7px] text-slate-500 mt-0.5">STATE AUTH #{student.rollNo}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">Verify on State Higher Ed Portal</span>
                    </div>

                    <div className="text-center">
                      <div 
                        className="inline-block p-2 border-2 rounded font-black uppercase text-[10px] tracking-wider shadow-xs"
                        style={{ borderColor: accentColor, color: primaryColor, backgroundColor: 'rgba(255,255,255,0.7)' }}
                      >
                        <Award className="w-5 h-5 mx-auto mb-0.5 text-amber-600" />
                        <span>OFFICIAL SEAL & EMBLEM</span>
                        <div className="text-[7px] font-mono text-slate-500">RLSY COLLEGE PATNA</div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Administrative Section</p>
                    </div>

                    <div className="text-right">
                      <div className="font-serif font-bold text-sm mb-1 italic opacity-90" style={{ color: primaryColor }}>
                        {principalName}
                      </div>
                      <div className="border-t pt-1 font-bold uppercase text-[11px]" style={{ borderColor: primaryColor, color: primaryColor }}>
                        {theme?.signatories?.primaryTitle || 'Principal & DDO'}
                      </div>
                      <p className="text-[10px] text-slate-500">{INSTITUTION_INFO.name}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-2 border-t text-[10px] text-center" style={{ borderColor: accentColor, color: accentColor }}>
                    {theme?.footerMotto || '* Valid for all Government, PSU, and University statutory purposes.'}
                  </div>
                </div>
              </div>
            ),
          }}
        />
      )}
    </div>
  );
};
