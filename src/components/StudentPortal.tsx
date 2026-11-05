import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
  AlertCircle,
  Award,
  BookOpen,
  RotateCcw,
  GraduationCap,
  Info,
  Calendar,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudentRepository } from '../services/studentRepository';
import { StudentSearchResult } from '../types/student';

interface StudentPortalProps {
  onOpenAdmin: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ onOpenAdmin }) => {
  const [citizenId, setCitizenId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<StudentSearchResult | null>(null);

  // Format 13-digit citizen ID with hyphens on the fly
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 13);
    setCitizenId(raw);
    setErrorMsg(null);
  };

  const formattedDisplay = () => {
    if (!citizenId) return '';
    const c = citizenId;
    if (c.length <= 1) return c;
    if (c.length <= 5) return `${c.slice(0, 1)}-${c.slice(1)}`;
    if (c.length <= 10) return `${c.slice(0, 1)}-${c.slice(1, 5)}-${c.slice(5)}`;
    if (c.length <= 12) return `${c.slice(0, 1)}-${c.slice(1, 5)}-${c.slice(5, 10)}-${c.slice(10)}`;
    return `${c.slice(0, 1)}-${c.slice(1, 5)}-${c.slice(5, 10)}-${c.slice(10, 12)}-${c.slice(12, 13)}`;
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (citizenId.length !== 13) {
      setErrorMsg('กรุณากรอกเลขบัตรประจำตัวประชาชนให้ครบ 13 หลัก');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      // Simulate real verification check with minimum delay for reassuring security check
      await new Promise((r) => setTimeout(r, 650));
      const searchRes = await StudentRepository.searchByCitizenId(citizenId);

      if (searchRes.found && searchRes.student) {
        setResult(searchRes);
        // Trigger celebratory confetti for student check
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#7c3aed', '#c084fc', '#f59e0b', '#10b981'],
        });
      } else {
        setErrorMsg(
          searchRes.message ||
            'ไม่พบข้อมูลในระบบ กรุณาตรวจสอบเลขบัตรประชาชนของท่านอีกครั้ง หรือติดต่อผู้ดูแลระบบ'
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCitizenId('');
    setResult(null);
    setErrorMsg(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Main Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12">
        {!result ? (
          /* Search Portal View */
          <div className="max-w-2xl mx-auto">
            {/* School Title Section with 3-tier hierarchy */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                ระบบตรวจสอบคุณสมบัติหลักเกณฑ์การพิจารณารับนักเรียนเข้าศึกษาต่อชั้นมัธยมศึกษาปีที่ 4
              </h1>
              <div className="text-lg sm:text-xl font-bold text-purple-900 mt-2">
                ปีการศึกษา 2570 ประเภทโควตา
              </div>
              <div className="text-sm sm:text-base font-medium text-slate-600 mt-1">
                โรงเรียนมัธยมประชานิเวศน์
              </div>
            </div>

            {/* Verification Form Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-purple-950/5 border border-purple-100 p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-600" />

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span>กรอกเลขประจำตัวประชาชน (13 หลัก)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={17} // with hyphens
                    value={formattedDisplay()}
                    onChange={handleInputChange}
                    placeholder="X-XXXX-XXXXX-XX-X"
                    className="w-full text-center tracking-widest text-xl sm:text-2xl font-mono py-3.5 px-4 bg-slate-50 border-2 border-purple-200 rounded-xl focus:bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-100 outline-none transition-all placeholder:text-slate-300 font-semibold text-slate-800"
                    disabled={loading}
                    autoFocus
                  />
                  {citizenId.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCitizenId('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs"
                    >
                      ล้าง
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>ตัวอย่าง: 1-1002-00123-45-6</span>
                  <span
                    className={`font-medium ${
                      citizenId.length === 13 ? 'text-emerald-600' : 'text-purple-600'
                    }`}
                  >
                    {citizenId.length}/13 หลัก
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold mb-0.5">แจ้งเตือน</div>
                    <div>{errorMsg}</div>
                    <div className="text-xs text-rose-600 mt-1.5">
                      หากพบข้อผิดพลาดหรือมีข้อสงสัย กรุณาติดต่อห้องกลุ่มบริหารวิชาการ
                      โรงเรียนมัธยมประชานิเวศน์
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={loading || citizenId.length !== 13}
                className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 hover:from-purple-900 hover:to-indigo-900 focus:ring-4 focus:ring-purple-200 shadow-md shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>กำลังตรวจสอบข้อมูลในฐานข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>ตรวจสอบข้อมูลและผลการเรียน</span>
                  </>
                )}
              </button>

              {/* Security & PDPA notice */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  ระบบนี้จัดทำขึ้นเพื่อการตรวจสอบสิทธิ์และผลการเรียนเฉพาะบุคคลตาม พ.ร.บ.
                  คุ้มครองข้อมูลส่วนบุคคล (PDPA) ระบบจะแสดงผลเฉพาะข้อมูลของผู้ที่ค้นหาเท่านั้น
                  และไม่มีการบันทึกเลขประจำตัวประชาชนเต็มในบันทึกสาธารณะ
                </p>
              </div>
            </div>

            {/* Quick criteria overview info */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm text-center">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mx-auto mb-2 font-bold">
                  5
                </div>
                <div className="text-xs font-semibold text-slate-800">เกรดเฉลี่ยสะสม 5 เทอม</div>
                <div className="text-[11px] text-slate-500 mt-1">ใช้ GPAX ม.1 - ม.3 ภาคเรียนที่ 1</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm text-center">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-2 font-bold">
                  3
                </div>
                <div className="text-xs font-semibold text-slate-800">กลุ่มวิชาหลัก</div>
                <div className="text-[11px] text-slate-500 mt-1">คณิตศาสตร์, วิทยาศาสตร์, ภาษาต่างประเทศ</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm text-center">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2 font-bold">
                  2570
                </div>
                <div className="text-xs font-semibold text-slate-800">ปีการศึกษา 2570</div>
                <div className="text-[11px] text-slate-500 mt-1">โควตาเข้าศึกษาต่อชั้น ม.4</div>
              </div>
            </div>
          </div>
        ) : (
          /* Student Verification Result Dashboard */
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Action Bar (No Print) */}
            <div className="no-print flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ตรวจสอบเลขบัตรอื่น</span>
              </button>
            </div>

            {/* Official Report Card (Printable) */}
            <div className="print-card bg-white rounded-2xl shadow-xl shadow-purple-950/5 border border-purple-100 overflow-hidden relative">
              {/* Report Header */}
              <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-6 sm:p-8 relative">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                      ระบบตรวจสอบคุณสมบัติหลักเกณฑ์การพิจารณารับนักเรียนเข้าศึกษาต่อชั้นมัธยมศึกษาปีที่ 4
                    </h2>
                    <div className="text-sm sm:text-base font-semibold text-purple-200 mt-1">
                      ปีการศึกษา 2570 ประเภทโควตา
                    </div>
                    <div className="text-xs sm:text-sm text-purple-300 mt-0.5">
                      โรงเรียนมัธยมประชานิเวศน์
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>ยืนยันข้อมูลแล้ว</span>
                    </span>
                    <div className="text-[11px] text-purple-300 mt-1 font-mono">
                      {result.student?.verificationCode}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {/* Section 1: Student Information */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-purple-700" />
                    <span>ส่วนที่ 1: ข้อมูลนักเรียน</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-xs text-slate-500">ชื่อ - นามสกุล</div>
                      <div className="text-base font-bold text-slate-900">
                        {result.student?.คำนำหน้า} {result.student?.ชื่อ} {result.student?.นามสกุล}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">เลขประจำตัวนักเรียน</div>
                      <div className="text-base font-bold font-mono text-purple-900">
                        {result.student?.เลขประจำตัว}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">เลขประจำตัวประชาชน (ปกปิด)</div>
                      <div className="text-base font-mono font-medium text-slate-700">
                        {result.student?.maskedCitizenId}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: GPAX 5 Semesters (Prominent Hero Card) */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-700" />
                    <span>ส่วนที่ 2: ผลการเรียนเฉลี่ยสะสม 5 ภาคเรียน (GPAX)</span>
                  </h3>
                  <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-purple-900/15 relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 pointer-events-none">
                      <Award className="w-48 h-48" />
                    </div>

                    <div className="relative z-10">
                      <div className="text-sm font-medium text-purple-200 mb-1">
                        เกรดเฉลี่ยสะสม 5 ภาคเรียน (ม.1 - ม.3 เทอม 1)
                      </div>
                      <div className="text-5xl sm:text-6xl font-extrabold tracking-tight font-mono text-white">
                        {result.student?.GPAX}
                      </div>
                      <div className="text-xs text-purple-200 mt-2">
                        * ข้อมูลผลการเรียนเฉลี่ยสะสม 5 ภาคเรียนเพียงค่าเดียวตามฐานข้อมูลทะเบียนวัดผล
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Subject Breakdown Cards */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-700" />
                    <span>ส่วนที่ 3: ผลการเรียนเฉลี่ยกลุ่มสาระการเรียนรู้</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Mathematics Card */}
                    <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-indigo-100 shadow-sm relative overflow-hidden">
                      <div className="w-2 h-full absolute left-0 top-0 bg-indigo-500" />
                      <div className="pl-2">
                        <div className="text-xs font-semibold text-slate-500">กลุ่มสาระการเรียนรู้</div>
                        <div className="text-base font-bold text-slate-800 mt-0.5">คณิตศาสตร์</div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold font-mono text-indigo-700">
                            {result.student?.คณิต}
                          </span>
                          <span className="text-xs text-slate-400">/ 4.00</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">ค่าเฉลี่ยตามแฟ้มข้อมูล</div>
                      </div>
                    </div>

                    {/* Science Card */}
                    <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-emerald-100 shadow-sm relative overflow-hidden">
                      <div className="w-2 h-full absolute left-0 top-0 bg-emerald-500" />
                      <div className="pl-2">
                        <div className="text-xs font-semibold text-slate-500">กลุ่มสาระการเรียนรู้</div>
                        <div className="text-base font-bold text-slate-800 mt-0.5">วิทยาศาสตร์</div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold font-mono text-emerald-700">
                            {result.student?.วิทย์}
                          </span>
                          <span className="text-xs text-slate-400">/ 4.00</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">ค่าเฉลี่ยตามแฟ้มข้อมูล</div>
                      </div>
                    </div>

                    {/* Foreign Language Card */}
                    <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-purple-100 shadow-sm relative overflow-hidden">
                      <div className="w-2 h-full absolute left-0 top-0 bg-purple-500" />
                      <div className="pl-2">
                        <div className="text-xs font-semibold text-slate-500">กลุ่มสาระการเรียนรู้</div>
                        <div className="text-base font-bold text-slate-800 mt-0.5">ภาษาต่างประเทศ</div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold font-mono text-purple-700">
                            {result.student?.ภาษาต่างประเทศ}
                          </span>
                          <span className="text-xs text-slate-400">/ 4.00</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">เกรดเฉลี่ยวิชาภาษาต่างประเทศ</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Academic Disclaimer & Notes */}
                <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 text-slate-700 text-xs space-y-2">
                  <div className="font-semibold text-purple-900 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-purple-700" />
                    <span>ส่วนที่ 4: ข้อมูลและเงื่อนไขเพิ่มเติม</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1 leading-relaxed">
                    <li>
                      GPAX ที่ปรากฏเป็นผลการเรียนเฉลี่ยสะสม 5 ภาคเรียน (ชั้น ม.1 - ม.3 ภาคเรียนที่ 1)
                      ตามฐานข้อมูลที่โรงเรียนมัธยมประชานิเวศน์จัดเตรียมไว้
                    </li>
                    <li>
                      เกรดเฉลี่ยรายวิชา (คณิตศาสตร์, วิทยาศาสตร์, ภาษาต่างประเทศ) เป็นค่าเฉลี่ยรายวิชาสะสม
                      มิได้คำนวณใหม่จากเกรดรายภาคเรียน
                    </li>
                    <li>
                      เอกสารฉบับนี้ใช้สำหรับตรวจสอบความถูกต้องของข้อมูลส่วนบุคคลและผลการเรียนเบื้องต้นเท่านั้น
                      การประกาศผลการคัดเลือกอย่างเป็นทางการจะเป็นไปตามประกาศโรงเรียนมัธยมประชานิเวศน์
                    </li>
                  </ul>

                  <div className="pt-3 border-t border-purple-200/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-700" />
                      <span>วันที่ตรวจสอบ: {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</span>
                    </div>
                    <div>รหัสอ้างอิงเอกสาร: {result.student?.verificationCode}</div>
                  </div>
                </div>

                {/* Official Stamp Signature on Print */}
                <div className="hidden print:flex items-center justify-between pt-8 border-t border-slate-300 mt-8">
                  <div className="text-center w-56">
                    <div className="h-14" />
                    <div className="border-t border-dotted border-slate-400 pt-1 text-xs">
                      (.......................................................)
                    </div>
                    <div className="text-xs text-slate-600">นักเรียนผู้ยื่นคำขอตรวจสอบ</div>
                  </div>

                  <div className="text-center w-64">
                    <div className="h-14" />
                    <div className="border-t border-dotted border-slate-400 pt-1 text-xs font-semibold">
                      (นาย/นาง/นางสาว....................................................)
                    </div>
                    <div className="text-xs text-slate-600">
                      นายทะเบียน / เจ้าหน้าที่กลุ่มบริหารวิชาการ
                    </div>
                    <div className="text-[11px] text-slate-500">โรงเรียนมัธยมประชานิเวศน์</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer with Administrator access at the bottom */}
      <footer className="no-print bg-slate-900 text-slate-400 text-xs py-6 mt-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="font-semibold text-slate-200">
              ระบบตรวจสอบคุณสมบัติหลักเกณฑ์การพิจารณารับนักเรียนเข้าศึกษาต่อชั้นมัธยมศึกษาปีที่ 4 ปีการศึกษา 2570 ประเภทโควตา โรงเรียนมัธยมประชานิเวศน์
            </div>
            <div className="text-slate-400 text-[11px] mt-1">
              &copy; 2570 โรงเรียนมัธยมประชานิเวศน์. All Rights Reserved.
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onOpenAdmin}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-200 hover:text-white px-3.5 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>สำหรับผู้ดูแลระบบ</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
