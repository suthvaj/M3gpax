import React, { useState } from 'react';
import {
  ShieldAlert,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Copy,
  ExternalLink,
  Check,
} from 'lucide-react';
import { googleSignIn } from '../services/firebaseAuth';
import { StudentRepository } from '../services/studentRepository';
import firebaseConfig from '../../firebase-applet-config.json';

interface AdminLoginProps {
  onLoginSuccess: (user: { name: string; username: string; role: string }) => void;
  onBackToStudent: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToStudent }) => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseConsoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  // Google Workspace Sign-In (Directly connects to Google Drive & Sheets with granted scopes)
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg(null);
    setIsUnauthorizedDomain(false);

    try {
      const res = await googleSignIn();
      if (res && res.user) {
        StudentRepository.addActivityLog(
          res.user.displayName || res.user.email || 'Google User',
          'LOGIN',
          'เข้าสู่ระบบผ่าน Google Workspace (Google Drive & Sheets)'
        );

        onLoginSuccess({
          name: res.user.displayName || 'Google Admin',
          username: res.user.email || 'google_admin',
          role: 'superadmin',
        });
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const isDomainErr =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('auth/unauthorized-domain');

      if (isDomainErr) {
        setIsUnauthorizedDomain(true);
        setErrorMsg(
          `Firebase: โดเมนปัจจุบัน (${currentDomain}) ยังไม่ได้รับอนุญาตใน Firebase Console`
        );
      } else {
        setErrorMsg(
          err.message || 'การเข้าสู่ระบบผ่าน Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleCopyDomain = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-purple-950/40 border border-white/20 p-6 sm:p-8 relative z-10">
        <button
          onClick={onBackToStudent}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับไปยังหน้านักเรียน</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">เข้าสู่ระบบผู้ดูแลระบบ</h2>
          <p className="text-xs text-slate-500 mt-1">
            โรงเรียนมัธยมประชานิเวศน์ | ระบบโควตา ม.4 ปีการศึกษา 2570
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMsg}</div>
            </div>

            {/* If unauthorized domain, show solution guide */}
            {isUnauthorizedDomain && (
              <div className="pt-2 border-t border-rose-200 text-[11px] space-y-2 text-rose-900">
                <div className="font-semibold">วิธีแก้ไขเพื่อเปิดใช้งาน Google Sign-In:</div>
                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  <li>
                    กดคัดลอกโดเมนนี้:{' '}
                    <span className="font-mono bg-white/80 px-1.5 py-0.5 rounded border border-rose-300 font-bold select-all">
                      {currentDomain}
                    </span>{' '}
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-200 hover:bg-rose-300 text-rose-900 font-semibold cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                    </button>
                  </li>
                  <li>
                    เปิดลิงก์{' '}
                    <a
                      href={firebaseConsoleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-semibold inline-flex items-center gap-0.5 text-purple-900 hover:text-purple-700"
                    >
                      <span>Firebase Authentication Settings</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    เลื่อนไปที่หัวข้อ <b>Authorized domains</b> &rarr; กดปุ่ม <b>Add domain</b> &rarr; วางโดเมนที่คัดลอกแล้วกด <b>Save</b>
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Google Workspace Sign-In Button Only */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-3.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-purple-700 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>เข้าสู่ระบบด้วย Google Account</span>
          </button>

          <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              การเข้าสู่ระบบถูกจำกัดเฉพาะบัญชี Google ของเจ้าหน้าที่ที่ได้รับสิทธิ์เชื่อมต่อกับ
              Google Drive และ Google Sheets ของโรงเรียนมัธยมประชานิเวศน์เท่านั้น
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
