import React from 'react';
import { Award, Download, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CertificateModalProps {
  studentName: string;
  subjectTitle: string;
  certificateTitle?: string;
  moduleCount?: number;
  passingThreshold?: number;
  certificateCode: string;
  issuedAt: string;
  testScore: number;
  onClose?: () => void;
  inline?: boolean;
}

export const CertificateGenerator: React.FC<CertificateModalProps> = ({
  studentName,
  subjectTitle,
  certificateTitle,
  moduleCount = 6,
  passingThreshold = 75,
  certificateCode,
  issuedAt,
  testScore,
  onClose,
  inline = false,
}) => {
  const displayCertTitle = certificateTitle?.trim() || 'Certificate of Completion';
  const formattedDate = (() => {
    try {
      return new Date(issuedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return issuedAt;
    }
  })();

  const handleDownloadCertificatePng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle top accent band
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, canvas.width, 24);

    // Outer frame
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 64, canvas.width - 96, canvas.height - 112);

    // Inner hairline frame
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;
    ctx.strokeRect(64, 80, canvas.width - 128, canvas.height - 144);

    // Brand Header
    ctx.fillStyle = '#4F46E5';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('UPPSEEKERS LAUNCHPAD', canvas.width / 2, 175);

    ctx.fillStyle = '#64748B';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('CAREER & ACADEMIC READINESS ACADEMY', canvas.width / 2, 212);

    // Certificate Title
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillText(displayCertTitle, canvas.width / 2, 325);

    // Divider line
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(460, 365);
    ctx.lineTo(1140, 365);
    ctx.stroke();

    // Presentation line
    ctx.fillStyle = '#475569';
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.fillText('This certifies that', canvas.width / 2, 435);

    // Student Name
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText(studentName, canvas.width / 2, 520);

    // Underline under name
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(420, 548);
    ctx.lineTo(1180, 548);
    ctx.stroke();

    // Completion copy
    ctx.fillStyle = '#475569';
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `has successfully completed all ${moduleCount} curriculum modules and passed the final assessment for`,
      canvas.width / 2,
      620
    );

    // Subject Title
    ctx.fillStyle = '#1E1B4B';
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    ctx.fillText(subjectTitle, canvas.width / 2, 685);

    // Score line
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Final Assessment Score: ${testScore}%  ·  Verified Mastery`, canvas.width / 2, 742);

    // Footer metadata blocks
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('DATE ISSUED', 180, 890);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(formattedDate, 180, 926);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'italic 28px Georgia, serif';
    ctx.fillText('Uppseekers Academic Board', canvas.width / 2, 916);
    ctx.strokeStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(640, 932);
    ctx.lineTo(960, 932);
    ctx.stroke();
    ctx.fillStyle = '#64748B';
    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('AUTHORIZED SIGNATURE', canvas.width / 2, 962);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748B';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('VERIFICATION ID', 1420, 890);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(certificateCode, 1420, 926);

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Uppseekers-Launchpad-Certificate-${certificateCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const cardBody = (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="h-2 bg-slate-900 w-full" />
      <div className="p-6 sm:p-10">
        <div className="border-2 border-indigo-600/20 rounded-xl p-6 sm:p-10 bg-slate-50/40 relative">
          {onClose && !inline && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close certificate preview"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="text-center space-y-5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-700">
              <Award className="w-4 h-4" />
              <span>Uppseekers Launchpad · Verified Credential</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
              {displayCertTitle}
            </h2>

            <p className="text-sm text-slate-500">This certifies that</p>

            <div className="border-b-2 border-indigo-600/40 pb-3 px-6 inline-block min-w-[260px]">
              <p className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">{studentName}</p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              has successfully completed all {moduleCount} structured learning modules, practical exercises, and passed the Final Certification Assessment for
            </p>

            <p className="text-xl sm:text-2xl font-bold text-slate-900">{subjectTitle}</p>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              <span className="tabular-nums">Assessment Score: {testScore}%</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Passed Threshold ({passingThreshold}%+)</span>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left sm:text-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date Issued</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{formattedDate}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Issued By</p>
                <p className="text-sm font-serif italic font-semibold text-slate-900 mt-1">Uppseekers Academic Board</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Verification ID</p>
                <p className="text-sm font-mono font-bold text-slate-900 mt-1 tabular-nums">{certificateCode}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Download a high-resolution certificate image for your admissions portfolio or LinkedIn.
          </p>
          <div className="flex items-center gap-2.5">
            {onClose && !inline && (
              <Button variant="outline" onClick={onClose} className="whitespace-nowrap shrink-0">
                Close
              </Button>
            )}
            <Button
              onClick={handleDownloadCertificatePng}
              className="bg-slate-900 hover:bg-slate-800 text-white whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Certificate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (inline) return cardBody;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl my-8">{cardBody}</div>
    </div>
  );
};
