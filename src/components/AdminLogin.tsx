import React, { useState } from 'react';
import { ShieldAlert, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { googleSignIn } from '../services/firebaseAuth';
import { StudentRepository } from '../services/studentRepository';

interface AdminLoginProps {
  onLoginSuccess: (user: { name: string; username: string; role: string }) => void;
  onBackToStudent: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToStudent }) => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Google Workspace Sign-In (Directly connects to Google Drive & Sheets with granted scopes)
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg(null);

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
      setErrorMsg(
        err.message || 'การเข้าสู่ระบบผ่าน Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-purple-950/40 border border-white/20 p-8 relative z-10">
        <button
          onClick={onBackToStudent}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับไปยังหน้านักเรียน</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">เข้าสู่ระบบผู้ดูแลระบบ</h2>
          <p className="text-xs text-slate-500 mt-1">
            โรงเรียนมัธยมประชานิเวศน์ | ระบบโควตา ม.4 ปีการศึกษา 2570
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Workspace Sign-In Button */}
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
