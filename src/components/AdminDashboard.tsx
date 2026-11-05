import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  LogOut,
  FileSpreadsheet,
  Download,
  Upload,
  Eye,
  EyeOff,
  Activity,
  BarChart3,
  ExternalLink,
  Save,
  X,
  RefreshCw,
  FolderOpen,
  Globe,
  Link2,
  Copy,
  Check,
} from 'lucide-react';
import { StudentRecord, SearchLogEntry, ActivityLogEntry, SheetConfig } from '../types/student';
import { StudentRepository, DEFAULT_GAS_WEB_APP_URL } from '../services/studentRepository';
import { GoogleSheetsService, OFFICIAL_HEADERS } from '../services/googleSheetsService';
import { getAccessToken, logout as fbLogout } from '../services/firebaseAuth';
import { auditStudentRecords, formatCitizenId, isValidGrade } from '../utils/validation';

interface AdminDashboardProps {
  currentUser: { name: string; username: string; role: string };
  onLogout: () => void;
  onViewStudentPortal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLogout,
  onViewStudentPortal,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'students' | 'audit' | 'sheets' | 'logs'
  >('overview');

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [searchLogs, setSearchLogs] = useState<SearchLogEntry[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(StudentRepository.getSheetConfig());

  // Filter & Search states for students table
  const [searchTerm, setSearchTerm] = useState('');
  const [gpaxFilter, setGpaxFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showFullCitizenId, setShowFullCitizenId] = useState(false);

  // Modals state
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<StudentRecord | null>(null);
  const [viewingStudent, setViewingStudent] = useState<StudentRecord | null>(null);

  // Sheets sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [driveSheets, setDriveSheets] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

  // Google Apps Script Web App live states
  const [gasUrlInput, setGasUrlInput] = useState(DEFAULT_GAS_WEB_APP_URL);
  const [gasPingStatus, setGasPingStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(null);
  const [isPingingGas, setIsPingingGas] = useState(false);
  const [copiedGasUrl, setCopiedGasUrl] = useState(false);
  const [isSyncingRealtime, setIsSyncingRealtime] = useState(false);

  // Form state for add/edit student
  const [formData, setFormData] = useState<Omit<StudentRecord, 'id'>>({
    เลขประจำตัว: '',
    คำนำหน้า: 'เด็กชาย',
    ชื่อ: '',
    นามสกุล: '',
    GPAX: '3.00',
    เลขบัตรประชาชน: '',
    คณิต: '3.00',
    วิทย์: '3.00',
    ภาษาต่างประเทศ: '3.00',
  });

  const loadData = () => {
    setStudents(StudentRepository.getStudents());
    setSearchLogs(StudentRepository.getSearchLogs());
    setActivityLogs(StudentRepository.getActivityLogs());
    const config = StudentRepository.getSheetConfig();
    setSheetConfig(config);
    setGasUrlInput(config.gasWebAppUrl || DEFAULT_GAS_WEB_APP_URL);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePingGas = async () => {
    setIsPingingGas(true);
    setGasPingStatus(null);
    try {
      const res = await StudentRepository.pingGasWebApp(gasUrlInput.trim());
      setGasPingStatus({
        tested: true,
        success: res.success,
        message: res.message,
        timestamp: res.timestamp,
      });
    } catch (e: any) {
      setGasPingStatus({
        tested: true,
        success: false,
        message: e.message || 'ไม่สามารถติดต่อ Google Apps Script ได้',
      });
    } finally {
      setIsPingingGas(false);
    }
  };

  const handleSaveGasUrl = () => {
    const updated: SheetConfig = {
      ...sheetConfig,
      gasWebAppUrl: gasUrlInput.trim(),
    };
    StudentRepository.saveSheetConfig(updated);
    setSheetConfig(updated);
    setSyncStatusMsg({
      text: 'บันทึก URL Google Apps Script เรียบร้อยแล้ว',
      type: 'success',
    });
  };

  const handleCopyGasUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(gasUrlInput.trim());
      setCopiedGasUrl(true);
      setTimeout(() => setCopiedGasUrl(false), 2000);
    }
  };

  const handleSyncRealtimeGas = async () => {
    setIsSyncingRealtime(true);
    setSyncStatusMsg(null);
    try {
      const res = await StudentRepository.fetchStudentsFromGas(gasUrlInput);
      if (res.success && res.students.length > 0) {
        setStudents(res.students);
        setSyncStatusMsg({
          text: `ดึงข้อมูลสดจาก Google Sheets สำเร็จ (${res.count} รายการ)`,
          type: 'success',
        });
      } else {
        setSyncStatusMsg({
          text: res.message || 'ยังไม่มีข้อมูลนักเรียนในชีต Students ของ Google Sheets',
          type: 'error',
        });
      }
    } catch (err: any) {
      setSyncStatusMsg({
        text: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลสดจาก Google Sheets',
        type: 'error',
      });
    } finally {
      setIsSyncingRealtime(false);
    }
  };

  // Compute integrity report
  const integrityReport = useMemo(() => {
    return auditStudentRecords(students);
  }, [students]);

  // Compute grade statistics
  const stats = useMemo(() => {
    const total = students.length;
    if (total === 0) {
      return {
        avgGPAX: '0.00',
        avgMath: '0.00',
        avgSci: '0.00',
        avgLang: '0.00',
        tier4: 0,
        tier35: 0,
        tier3: 0,
        tier25: 0,
        tierBelow25: 0,
      };
    }

    let sumGPAX = 0;
    let sumMath = 0;
    let sumSci = 0;
    let sumLang = 0;
    let tier4 = 0;
    let tier35 = 0;
    let tier3 = 0;
    let tier25 = 0;
    let tierBelow25 = 0;

    students.forEach((s) => {
      const g = parseFloat(s.GPAX) || 0;
      sumGPAX += g;
      sumMath += parseFloat(s.คณิต) || 0;
      sumSci += parseFloat(s.วิทย์) || 0;
      sumLang += parseFloat(s.ภาษาต่างประเทศ) || 0;

      if (g >= 3.75) tier4++;
      else if (g >= 3.5) tier35++;
      else if (g >= 3.0) tier3++;
      else if (g >= 2.5) tier25++;
      else tierBelow25++;
    });

    return {
      avgGPAX: (sumGPAX / total).toFixed(2),
      avgMath: (sumMath / total).toFixed(2),
      avgSci: (sumSci / total).toFixed(2),
      avgLang: (sumLang / total).toFixed(2),
      tier4,
      tier35,
      tier3,
      tier25,
      tierBelow25,
    };
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        searchTerm === '' ||
        s.เลขประจำตัว.includes(searchTerm) ||
        s.ชื่อ.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.นามสกุล.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.เลขบัตรประชาชน.includes(searchTerm);

      let matchGpax = true;
      const g = parseFloat(s.GPAX) || 0;
      if (gpaxFilter === '3.5+') matchGpax = g >= 3.5;
      else if (gpaxFilter === '3.0-3.49') matchGpax = g >= 3.0 && g < 3.5;
      else if (gpaxFilter === 'below3.0') matchGpax = g < 3.0;

      return matchSearch && matchGpax;
    });
  }, [students, searchTerm, gpaxFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Sync with Google Sheets
  const handleSyncFromSheet = async () => {
    if (!sheetConfig.spreadsheetId) {
      setSyncStatusMsg({
        text: 'กรุณาเลือกหรือสร้าง Google Spreadsheet ก่อนกดซิงค์',
        type: 'error',
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const count = await StudentRepository.syncFromGoogleSheet(
        sheetConfig.spreadsheetId,
        currentUser.name
      );
      loadData();
      setSyncStatusMsg({
        text: `ดึงข้อมูลจาก Google Sheets สำเร็จ (${count} รายการ)`,
        type: 'success',
      });
    } catch (err: any) {
      setSyncStatusMsg({
        text: err.message || 'ไม่สามารถซิงค์ข้อมูลกับ Google Sheets ได้',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Push all local to Google Sheet
  const handlePushToSheet = async () => {
    if (!sheetConfig.spreadsheetId) {
      setSyncStatusMsg({
        text: 'กรุณาเลือกหรือสร้าง Google Spreadsheet ก่อนส่งข้อมูล',
        type: 'error',
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const count = await StudentRepository.pushAllToGoogleSheet(
        sheetConfig.spreadsheetId,
        currentUser.name
      );
      loadData();
      setSyncStatusMsg({
        text: `นำข้อมูลทั้งหมด ${count} รายการเข้าสู่ Google Sheets สำเร็จ`,
        type: 'success',
      });
    } catch (err: any) {
      setSyncStatusMsg({
        text: err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูลไปยัง Google Sheets',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Create new Google Sheet automatically
  const handleCreateNewSheet = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const created = await GoogleSheetsService.createOfficialSpreadsheet();
      const updatedConfig: SheetConfig = {
        spreadsheetId: created.id,
        spreadsheetTitle: created.name,
        spreadsheetUrl: created.url,
        lastSyncedAt: new Date().toLocaleString('th-TH'),
        syncMode: 'google-api',
      };
      StudentRepository.saveSheetConfig(updatedConfig);
      setSheetConfig(updatedConfig);

      // Immediately push existing baseline 300 students
      await StudentRepository.pushAllToGoogleSheet(created.id, currentUser.name);
      loadData();

      setSyncStatusMsg({
        text: `สร้าง Google Spreadsheet ใหม่ใน Google Drive สำเร็จ และบันทึกข้อมูล 300 รายการเรียบร้อยแล้ว!`,
        type: 'success',
      });
    } catch (err: any) {
      setSyncStatusMsg({
        text: err.message || 'ไม่สามารถสร้าง Google Sheet ได้ กรุณาตรวจสอบสิทธิ์บัญชี',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // List user's Drive spreadsheets
  const handleListDriveSheets = async () => {
    setIsLoadingDrive(true);
    try {
      const files = await GoogleSheetsService.listSpreadsheets();
      setDriveSheets(files);
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถค้นหา Google Spreadsheets ใน Google Drive ได้');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleSelectDriveSheet = (sheet: { id: string; name: string }) => {
    const updatedConfig: SheetConfig = {
      ...sheetConfig,
      spreadsheetId: sheet.id,
      spreadsheetTitle: sheet.name,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`,
      syncMode: 'google-api',
    };
    StudentRepository.saveSheetConfig(updatedConfig);
    setSheetConfig(updatedConfig);
    setSyncStatusMsg({
      text: `เชื่อมต่อกับ "${sheet.name}" เรียบร้อยแล้ว`,
      type: 'success',
    });
  };

  // Handle Save Student (Add or Edit)
  const handleSaveStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.ชื่อ.trim() || !formData.นามสกุล.trim()) {
      alert('กรุณากรอกชื่อและนามสกุล');
      return;
    }
    const cleanCid = formData.เลขบัตรประชาชน.replace(/[-\s]/g, '');
    if (cleanCid.length !== 13) {
      alert('เลขบัตรประชาชนต้องมี 13 หลัก');
      return;
    }

    if (editingStudent) {
      // Update
      const updated: StudentRecord = {
        ...editingStudent,
        ...formData,
      };
      await StudentRepository.updateStudent(updated, currentUser.name);
      setEditingStudent(null);
    } else {
      // Add
      await StudentRepository.addStudent(formData, currentUser.name);
      setIsAddModalOpen(false);
    }

    loadData();
  };

  // Handle Delete Student
  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;
    await StudentRepository.deleteStudent(deletingStudent.id, currentUser.name);
    setDeletingStudent(null);
    loadData();
  };

  const openEditModal = (s: StudentRecord) => {
    setEditingStudent(s);
    setFormData({
      เลขประจำตัว: s.เลขประจำตัว,
      คำนำหน้า: s.คำนำหน้า,
      ชื่อ: s.ชื่อ,
      นามสกุล: s.นามสกุล,
      GPAX: s.GPAX,
      เลขบัตรประชาชน: s.เลขบัตรประชาชน,
      คณิต: s.คณิต,
      วิทย์: s.วิทย์,
      ภาษาต่างประเทศ: s.ภาษาต่างประเทศ,
    });
  };

  const openAddModal = () => {
    const nextId = String(students.length + 4501).padStart(5, '0');
    setFormData({
      เลขประจำตัว: nextId,
      คำนำหน้า: 'เด็กชาย',
      ชื่อ: '',
      นามสกุล: '',
      GPAX: '3.25',
      เลขบัตรประชาชน: '',
      คณิต: '3.00',
      วิทย์: '3.00',
      ภาษาต่างประเทศ: '3.00',
    });
    setIsAddModalOpen(true);
  };

  const handleLogoutAdmin = async () => {
    await fbLogout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['IBM_Plex_Sans_Thai',sans-serif]">
      {/* Top Admin Navigation Header */}
      <header className="bg-purple-950 text-white shadow-md border-b border-purple-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-purple-200 font-semibold">
                โรงเรียนมัธยมประชานิเวศน์
              </div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>ระบบจัดการโควตา ม.4 ปีการศึกษา 2570 (Admin)</span>
                {sheetConfig.spreadsheetId && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    <CheckCircle className="w-3 h-3" />
                    <span>Sheets Connected</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={onViewStudentPortal}
              className="bg-white/10 hover:bg-white/20 text-purple-100 px-3 py-1.5 rounded-lg border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ดูหน้านักเรียน</span>
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-purple-900/60 rounded-lg border border-purple-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-200">{currentUser.name}</span>
            </div>

            <button
              onClick={handleLogoutAdmin}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 px-3 py-1.5 rounded-lg border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 overflow-x-auto text-xs font-semibold border-t border-purple-900/80 pt-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-purple-300 text-white bg-white/10'
                : 'border-transparent text-purple-200 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>ภาพรวมและสถิติ</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'students'
                ? 'border-purple-300 text-white bg-white/10'
                : 'border-transparent text-purple-200 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>จัดการข้อมูลนักเรียน ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'audit'
                ? 'border-purple-300 text-white bg-white/10'
                : 'border-transparent text-purple-200 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>
              ตรวจสอบข้อมูล
              {integrityReport.warningRecords > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-900 rounded-full font-mono text-[10px]">
                  {integrityReport.warningRecords}
                </span>
              )}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sheets')}
            className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'sheets'
                ? 'border-purple-300 text-white bg-white/10'
                : 'border-transparent text-purple-200 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>เชื่อมต่อ Google Sheets</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'border-purple-300 text-white bg-white/10'
                : 'border-transparent text-purple-200 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>ประวัติการค้นหา</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6">
        {/* Status notification if any */}
        {syncStatusMsg && (
          <div
            className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
              syncStatusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncStatusMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{syncStatusMsg.text}</span>
            </div>
            <button
              onClick={() => setSyncStatusMsg(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ---------------- 1. TAB: OVERVIEW ---------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 4 Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">
                    จำนวนนักเรียนทั้งหมด
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                    {students.length}
                  </div>
                  <div className="text-[11px] text-purple-700 mt-1">ผู้มีสิทธิ์ยื่นโควตา ม.4</div>
                </div>
                <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">
                    ข้อมูลสมบูรณ์
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-600 mt-1 font-mono">
                    {integrityReport.validRecords}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-1">
                    {((integrityReport.validRecords / (students.length || 1)) * 100).toFixed(1)}% ของทั้งหมด
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">
                    ข้อมูลที่ต้องตรวจสอบ
                  </div>
                  <div className="text-3xl font-extrabold text-amber-600 mt-1 font-mono">
                    {integrityReport.warningRecords}
                  </div>
                  <div className="text-[11px] text-amber-700 mt-1">
                    {integrityReport.warningRecords > 0
                      ? 'พบจุดที่ควรแก้ไข'
                      : 'ข้อมูลพร้อมใช้งาน 100%'}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">
                    สถานะ Google Sheets
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-2 truncate max-w-[150px]">
                    {sheetConfig.spreadsheetId ? 'เชื่อมต่อแล้ว' : 'ยังไม่ระบุ'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[150px]">
                    {sheetConfig.spreadsheetTitle}
                  </div>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* GPAX Distribution & Academic Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* GPAX Distribution */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      การกระจายตัวของผลการเรียนเฉลี่ยสะสม (GPAX 5 ภาคเรียน)
                    </h3>
                    <p className="text-xs text-slate-500">
                      ค่าเฉลี่ยสะสมรวมทั้งโรงเรียน: <b className="text-purple-700 font-mono text-sm">{stats.avgGPAX}</b>
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>ดีเยี่ยมมาก (3.75 - 4.00)</span>
                      <span className="font-mono font-bold text-purple-900">
                        {stats.tier4} คน ({((stats.tier4 / (students.length || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-700 rounded-full"
                        style={{ width: `${(stats.tier4 / (students.length || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>ดีเยี่ยม (3.50 - 3.74)</span>
                      <span className="font-mono font-bold text-indigo-900">
                        {stats.tier35} คน ({((stats.tier35 / (students.length || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${(stats.tier35 / (students.length || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>ดี (3.00 - 3.49)</span>
                      <span className="font-mono font-bold text-blue-900">
                        {stats.tier3} คน ({((stats.tier3 / (students.length || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(stats.tier3 / (students.length || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>ปานกลาง (2.50 - 2.99)</span>
                      <span className="font-mono font-bold text-amber-900">
                        {stats.tier25} คน ({((stats.tier25 / (students.length || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${(stats.tier25 / (students.length || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>ผ่านเกณฑ์พื้นฐาน (&lt; 2.50)</span>
                      <span className="font-mono font-bold text-slate-700">
                        {stats.tierBelow25} คน ({((stats.tierBelow25 / (students.length || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-400 rounded-full"
                        style={{ width: `${(stats.tierBelow25 / (students.length || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Subject averages cards */}
                <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
                  <div className="text-center p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                    <div className="text-[11px] text-slate-500">คณิตศาสตร์เฉลี่ย</div>
                    <div className="text-xl font-bold font-mono text-indigo-700 mt-0.5">
                      {stats.avgMath}
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="text-[11px] text-slate-500">วิทยาศาสตร์เฉลี่ย</div>
                    <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                      {stats.avgSci}
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                    <div className="text-[11px] text-slate-500">ภาษาต่างประเทศเฉลี่ย</div>
                    <div className="text-xl font-bold font-mono text-purple-700 mt-0.5">
                      {stats.avgLang}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Searches */}
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 text-sm mb-3">คำสั่งด่วน</h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleCreateNewSheet}
                      disabled={isSyncing}
                      className="w-full py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>สร้าง Google Sheet ใหม่ใน Google Drive</span>
                    </button>

                    <button
                      onClick={handleSyncRealtimeGas}
                      disabled={isSyncingRealtime}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRealtime ? 'animate-spin' : ''}`} />
                      <span>{isSyncingRealtime ? 'กำลังดึงข้อมูลสด...' : 'ดึงข้อมูลสด Real-time จาก Google Sheets'}</span>
                    </button>

                    <button
                      onClick={openAddModal}
                      className="w-full py-2 px-3 rounded-xl border border-purple-200 hover:bg-purple-50 text-purple-800 font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มนักเรียนรายคน</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">การค้นหาล่าสุด</h3>
                    <button
                      onClick={() => setActiveTab('logs')}
                      className="text-xs text-purple-700 hover:underline"
                    >
                      ดูทั้งหมด
                    </button>
                  </div>
                  {searchLogs.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      ยังไม่มีประวัติการค้นหา
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchLogs.slice(0, 4).map((log) => (
                        <div
                          key={log.id}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-mono font-medium text-slate-700">
                              {log.maskedCitizenId}
                            </div>
                            <div className="text-[10px] text-slate-400">{log.timestamp}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.status === 'FOUND'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status === 'FOUND' ? 'พบ' : 'ไม่พบ'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 2. TAB: STUDENTS TABLE ---------------- */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="ค้นหาชื่อ, นามสกุล, หรือรหัสนักเรียน..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={gpaxFilter}
                  onChange={(e) => {
                    setGpaxFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-600 outline-none font-medium text-slate-700 cursor-pointer"
                >
                  <option value="all">เกรดเฉลี่ย GPAX ทั้งหมด</option>
                  <option value="3.5+">GPAX 3.50 ขึ้นไป</option>
                  <option value="3.0-3.49">GPAX 3.00 - 3.49</option>
                  <option value="below3.0">GPAX ต่ำกว่า 3.00</option>
                </select>

                <button
                  onClick={() => setShowFullCitizenId(!showFullCitizenId)}
                  className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {showFullCitizenId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showFullCitizenId ? 'ซ่อนเลขบัตร' : 'แสดงเลขบัตรเต็ม'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncRealtimeGas}
                  disabled={isSyncingRealtime}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  title="ดึงข้อมูลสดจาก Google Sheets แบบ Real-time"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRealtime ? 'animate-spin' : ''}`} />
                  <span>{isSyncingRealtime ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลสดจาก Google Sheets'}</span>
                </button>

                <button
                  onClick={openAddModal}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มนักเรียน</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-purple-900 text-white font-semibold border-b border-purple-800">
                      <th className="py-3 px-3 w-12 text-center">แถว</th>
                      <th className="py-3 px-3">เลขประจำตัว</th>
                      <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                      <th className="py-3 px-3 text-center">GPAX (5 เทอม)</th>
                      <th className="py-3 px-4">เลขบัตรประชาชน</th>
                      <th className="py-3 px-3 text-center">คณิต</th>
                      <th className="py-3 px-3 text-center">วิทย์</th>
                      <th className="py-3 px-3 text-center">ภาษาต่างประเทศ</th>
                      <th className="py-3 px-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          ไม่พบข้อมูลนักเรียนที่ตรงกับเงื่อนไขการค้นหา
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map((s, index) => {
                        const actualRow = (currentPage - 1) * pageSize + index + 1;
                        return (
                          <tr
                            key={s.id}
                            className="hover:bg-purple-50/50 transition-colors odd:bg-slate-50/40"
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                              {actualRow}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-purple-900">
                              {s.เลขประจำตัว}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-900">
                              {s.คำนำหน้า} {s.ชื่อ} {s.นามสกุล}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full font-mono font-bold text-xs bg-purple-100 text-purple-900">
                                {s.GPAX}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              {showFullCitizenId
                                ? formatCitizenId(s.เลขบัตรประชาชน)
                                : `${s.เลขบัตรประชาชน.slice(0, 1)}-${s.เลขบัตรประชาชน.slice(1, 5)}-XXXXX-XX-${s.เลขบัตรประชาชน.slice(-1)}`}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-medium text-indigo-700">
                              {s.คณิต}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-medium text-emerald-700">
                              {s.วิทย์}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-medium text-purple-700">
                              {s.ภาษาต่างประเทศ}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setViewingStudent(s)}
                                  title="ดูรายละเอียด"
                                  className="p-1 rounded text-slate-500 hover:text-purple-700 hover:bg-purple-50 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openEditModal(s)}
                                  title="แก้ไข"
                                  className="p-1 rounded text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingStudent(s)}
                                  title="ลบ"
                                  className="p-1 rounded text-slate-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>
                    แสดง {Math.min((currentPage - 1) * pageSize + 1, filteredStudents.length)} -{' '}
                    {Math.min(currentPage * pageSize, filteredStudents.length)} จากทั้งหมด{' '}
                    <b className="text-slate-800">{filteredStudents.length}</b> รายการ
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="ml-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs outline-none"
                  >
                    <option value={10}>10 รายการ/หน้า</option>
                    <option value={25}>25 รายการ/หน้า</option>
                    <option value={50}>50 รายการ/หน้า</option>
                    <option value={100}>100 รายการ/หน้า</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="px-3 py-1 font-mono font-medium text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 3. TAB: DATA INTEGRITY AUDIT ---------------- */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span>ระบบตรวจสอบความถูกต้องของข้อมูล (Data Quality Audit)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    ระบบตรวจสอบอัตโนมัติ 9 คอลัมน์ตามเกณฑ์ไฟล์ Excel โรงเรียน
                    เพื่อป้องกันข้อมูลซ้ำหรือผิดรูปแบบก่อนการประกาศผล
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">ตรวจสอบทั้งหมด</div>
                  <div className="text-xl font-bold font-mono text-slate-800 mt-1">
                    {integrityReport.totalRecords}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-xs text-emerald-700">ข้อมูลสมบูรณ์</div>
                  <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                    {integrityReport.validRecords}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <div className="text-xs text-amber-700">รายการที่ต้องตรวจสอบ</div>
                  <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                    {integrityReport.warningRecords}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                  <div className="text-xs text-rose-700">ข้อผิดพลาดร้ายแรง</div>
                  <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                    {integrityReport.errorRecords}
                  </div>
                </div>
              </div>

              {integrityReport.issues.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-emerald-900">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <div className="font-bold text-base">ยอดเยี่ยม! ข้อมูลทั้งหมดมีความสมบูรณ์ 100%</div>
                  <div className="text-xs text-emerald-700 mt-1">
                    ไม่พบเลขบัตรประชาชนซ้ำ เลขประจำตัวซ้ำ หรือเกรดเฉลี่ยผิดรูปแบบในระบบ
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700">
                    รายการปัญหาที่ตรวจพบ ({integrityReport.issues.length} รายการ):
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {integrityReport.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 shrink-0">
                            {issue.issueType}
                          </span>
                          <div>
                            <div className="font-bold text-slate-800">
                              {issue.name} (รหัส: {issue.studentId})
                            </div>
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              {issue.details}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const found = students.find((s) => s.เลขประจำตัว === issue.studentId);
                            if (found) openEditModal(found);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg cursor-pointer"
                        >
                          แก้ไข
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- 4. TAB: GOOGLE SHEETS & APPS SCRIPT ---------------- */}
        {activeTab === 'sheets' && (
          <div className="space-y-6">
            {/* Live Google Apps Script Connection Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-purple-700" />
                      <span>สถานะการเชื่อมต่อ Google Sheets (ผ่าน Google Apps Script)</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    เชื่อมต่อฐานข้อมูลคะแนนและคุณสมบัตินักเรียน ม.4 ปีการศึกษา 2570 แบบ Real-time
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePingGas}
                    disabled={isPingingGas}
                    className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPingingGas ? 'animate-spin' : ''}`} />
                    <span>{isPingingGas ? 'กำลังตรวจสอบ...' : 'ทดสอบการเชื่อมต่อ (Ping Live)'}</span>
                  </button>
                </div>
              </div>

              {/* Ping Result Banner */}
              {gasPingStatus && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-fadeIn ${
                    gasPingStatus.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {gasPingStatus.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold">{gasPingStatus.message}</span>
                      {gasPingStatus.timestamp && (
                        <span className="text-[11px] opacity-75 ml-2">
                          (เวลาตอบกลับ: {new Date(gasPingStatus.timestamp).toLocaleTimeString('th-TH')})
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/70">
                    {gasPingStatus.success ? 'HTTP 200 OK' : 'ERROR'}
                  </span>
                </div>
              )}

              {/* Deployed Web App URL Configuration */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Google Apps Script Web App Endpoint URL:</span>
                  <span className="text-[11px] font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ● เชื่อมต่อใช้งานอยู่ (Active)
                  </span>
                </label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={gasUrlInput}
                      onChange={(e) => setGasUrlInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopyGasUrl}
                      className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="คัดลอก URL"
                    >
                      {copiedGasUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveGasUrl}
                      className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>บันทึก URL</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  * เมื่อมีการ Deploy เวอร์ชันใหม่ใน Apps Script สามารถนำ URL มาอัปเดตที่นี่ได้ตลอดเวลา
                </p>
              </div>
            </div>

            {/* Official Step-by-Step Guide for Google Sheets */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  วิธีการเชื่อมต่อและบันทึกข้อมูลใน Google Sheets
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  คู่มือสำหรับครูผู้รับผิดชอบงานทะเบียนและวัดผล โรงเรียนมัธยมประชานิเวศน์
                </p>
              </div>

              {/* Step 1: 9 Columns Structure */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h4 className="text-xs font-bold text-slate-800">
                    โครงสร้างชีตชื่อ "Students" กำหนด 9 คอลัมน์มาตรฐาน (ห้ามสลับหรือแก้ไขชื่อ)
                  </h4>
                </div>
                <div className="overflow-x-auto rounded-xl border border-purple-200 bg-purple-50/30">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-purple-800 text-white">
                        <th className="py-2 px-2.5 font-bold text-center border-r border-purple-700">A (1)</th>
                        <th className="py-2 px-2.5 font-bold text-center border-r border-purple-700">B (2)</th>
                        <th className="py-2 px-2.5 font-bold text-center border-r border-purple-700">C (3)</th>
                        <th className="py-2 px-2.5 font-bold text-center border-r border-purple-700">D (4)</th>
                        <th className="py-2 px-2.5 font-bold text-center border-r border-purple-700">E (5)</th>
                        <th className="py-2 px-2.5 font-bold text-center border-r border-purple-700">F (6)</th>
                        <th className="py-2 px-2.5 font-bold text-center border-r border-purple-700">G (7)</th>
                        <th className="py-2 px-2.5 font-bold text-center border-r border-purple-700">H (8)</th>
                        <th className="py-2 px-2.5 font-bold text-center">I (9)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-bold text-slate-800 bg-white border-b border-purple-100">
                        <td className="py-2.5 px-2.5 border-r border-purple-100 text-center">เลขประจำตัว</td>
                        <td className="py-2.5 px-2.5 border-r border-purple-100 text-center">คำนำหน้า</td>
                        <td className="py-2.5 px-2.5 border-r border-purple-100 text-center">ชื่อ</td>
                        <td className="py-2.5 px-2.5 border-r border-purple-100 text-center">นามสกุล</td>
                        <td className="py-2.5 px-2.5 border-r border-purple-100 text-center text-purple-900 font-extrabold">GPAX</td>
                        <td className="py-2.5 px-2.5 border-r border-purple-100 text-center text-indigo-900 font-extrabold">เลขบัตรประชาชน</td>
                        <td className="py-2.5 px-2.5 border-r border-purple-100 text-center">คณิต</td>
                        <td className="py-2.5 px-2.5 border-r border-purple-100 text-center">วิทย์</td>
                        <td className="py-2.5 px-2.5 text-center">ภาษาต่างประเทศ</td>
                      </tr>
                      <tr className="text-slate-600 bg-slate-50/50 text-[11px] font-mono">
                        <td className="py-2 px-2.5 border-r border-purple-100 text-center">04501</td>
                        <td className="py-2 px-2.5 border-r border-purple-100 text-center">เด็กชาย</td>
                        <td className="py-2 px-2.5 border-r border-purple-100 text-center">กิตติพงษ์</td>
                        <td className="py-2 px-2.5 border-r border-purple-100 text-center">เจริญทรัพย์</td>
                        <td className="py-2 px-2.5 border-r border-purple-100 text-center font-bold text-emerald-700">3.85</td>
                        <td className="py-2 px-2.5 border-r border-purple-100 text-center">1100201234561</td>
                        <td className="py-2 px-2.5 border-r border-purple-100 text-center">3.50</td>
                        <td className="py-2 px-2.5 border-r border-purple-100 text-center">4.00</td>
                        <td className="py-2 px-2.5 text-center">3.75</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 2: Plain Text Formatting */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h4 className="text-xs font-bold text-slate-800">
                    การตั้งค่ารูปแบบ Plain Text เพื่อป้องกันเลข 0 นำหน้าสูญหาย
                  </h4>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 leading-relaxed">
                  <p className="font-semibold">⚠️ จุดที่ต้องระวังเป็นพิเศษใน Google Sheets:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>
                      คลิกเลือกทั้งคอลัมน์ <strong>A (เลขประจำตัว)</strong> และ <strong>F (เลขบัตรประชาชน)</strong>
                    </li>
                    <li>
                      ไปที่เมนูบนของ Google Sheets: <strong>รูปแบบ (Format)</strong> &gt; <strong>ตัวเลข (Number)</strong> &gt; เลือก <strong>ข้อความธรรมดา (Plain Text)</strong>
                    </li>
                    <li>
                      หรือพิมพ์เครื่องหมาย <code>'</code> นำหน้า เช่น <code>'04501</code> และ <code>'0105556012345</code> เพื่อไม่ให้ Google Sheets ตัดเลข 0 หน้าสุดทิ้ง
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 3: Real-time search mechanism */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h4 className="text-xs font-bold text-slate-800">
                    การตรวจสอบคุณสมบัติแบบเรียลไทม์ (Live Search)
                  </h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  เมื่อนักเรียนกรอกเลขบัตรประชาชน 13 หลักที่หน้าเว็บหลัก ระบบจะส่งคำขอค้นหาไปยัง Web App URL โดยตรง
                  หากมีข้อมูลใน Google Sheet ระบบจะประมวลผล GPAX (5 ภาคเรียน) และคะแนนเฉลี่ย 3 กลุ่มสาระวิชา
                  (คณิตศาสตร์, วิทยาศาสตร์, ภาษาต่างประเทศ) พร้อมทั้งออกรหัสตรวจสอบคุณสมบัติ (Verification Code) ให้ทันที
                </p>
              </div>

              {/* Step 4: Security & Privacy */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <h4 className="text-xs font-bold text-slate-800">
                    ความปลอดภัยและการคุ้มครองข้อมูลส่วนบุคคล (PDPA Compliance)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1">🔒 ป้องกันการเข้าถึงข้อมูลข้ามคน</span>
                    ระบบจะส่งผลลัพธ์เฉพาะนักเรียนที่มีเลขบัตรประชาชนตรงกันเท่านั้น และไม่เปิดเผยรายชื่อผู้อื่น
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1">🛡️ การปกปิดเลขบัตรประชาชน</span>
                    หน้าจอรายงานผลจะแสดงผลในรูปแบบ Masking เช่น <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">1-1002-XXXXX-XX-1</code> เสมอ
                  </div>
                </div>
              </div>

              {/* Step 5: Real-time Admin CRUD Support */}
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    5
                  </span>
                  <h4 className="text-xs font-bold text-purple-950">
                    การจัดการข้อมูล Real-time 100% สำหรับผู้ดูแลระบบ (Admin Two-Way Real-time Sync)
                  </h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  ผู้ดูแลระบบสามารถ <strong>เพิ่ม, แก้ไข, ลบ</strong> ข้อมูลนักเรียนจากหน้าเว็บแอป แล้วข้อมูลจะส่งตรงเข้า Google Sheets แบบ Real-time ทันที
                  และเมื่อครูแก้ไขคะแนนใน Google Sheets โดยตรง ก็สามารถกดปุ่ม <span className="font-bold text-emerald-700">"ดึงข้อมูลสดจาก Google Sheets"</span> เพื่อให้ตารางสถิติและคะแนนอัปเดตตรงกันทันที
                </p>
                <div className="pt-2 text-[11px] text-purple-900 bg-white/80 p-3 rounded-lg border border-purple-100">
                  <span className="font-bold">💡 คำแนะนำ:</span> หากต้องการให้ Google Apps Script รองรับคำสั่ง <code>getAllStudents</code>, <code>addStudent</code>, <code>updateStudent</code>, <code>deleteStudent</code> แบบเต็มรูปแบบ
                  เพียงนำโค้ดในไฟล์ <code>gas/Code.gs</code> ไปวางทับใน Apps Script Editor แล้วกด Deploy เป็น New Version ได้ทันที
                </div>
              </div>
            </div>

            {/* Google Drive Integration Option */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-indigo-600" />
                    <span>จัดการไฟล์ Google Spreadsheet ผ่าน Google Drive</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    เชื่อมโยงโดยตรงกับ Google Drive ของบัญชีผู้ดูแลระบบ เพื่อสร้างไฟล์สำรองหรือนำเข้าชุดข้อมูล
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* 1-Click Create Official Sheet */}
                <div className="p-5 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 bg-slate-50/50 transition-all space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      สร้าง Google Spreadsheet ไฟล์ใหม่ใน Google Drive
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      ระบบจะสร้างชีต Students, SearchLogs, ActivityLogs, และ Settings พร้อมคอลัมน์มาตรฐานทั้ง 9 คอลัมน์ให้อัตโนมัติ
                    </p>
                  </div>
                  <button
                    onClick={handleCreateNewSheet}
                    disabled={isSyncing}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>สร้าง Google Sheet ใหม่ใน Drive</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Select from Drive */}
                <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      เลือก Google Spreadsheet ที่มีอยู่แล้วจาก Google Drive
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      ค้นหาไฟล์ Google Sheets หรือไฟล์ Excel ที่อัปโหลดไว้แล้วใน Drive ของท่าน
                    </p>
                  </div>
                  <button
                    onClick={handleListDriveSheets}
                    disabled={isLoadingDrive}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingDrive ? (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-purple-700 rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>ค้นหาไฟล์ใน Google Drive</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Drive Spreadsheets List if fetched */}
              {driveSheets.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">
                    ไฟล์ Google Spreadsheets ใน Google Drive ของท่าน:
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    {driveSheets.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 bg-white flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">{file.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">ID: {file.id}</div>
                        </div>
                        <button
                          onClick={() => handleSelectDriveSheet(file)}
                          className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded font-semibold text-xs cursor-pointer"
                        >
                          เลือกไฟล์นี้
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- 5. TAB: SEARCH LOGS ---------------- */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-700" />
                    <span>ประวัติการค้นหาข้อมูลนักเรียน (Search Logs)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    บันทึกสถิติการตรวจสอบข้อมูลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                    โดยปกปิดเลขประจำตัวประชาชน
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">วันเวลา</th>
                      <th className="py-2.5 px-3">เลขบัตรประชาชน (แบบปกปิด)</th>
                      <th className="py-2.5 px-3 text-center">ผลการค้นหา</th>
                      <th className="py-2.5 px-3">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {searchLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400">
                          ยังไม่มีประวัติการค้นหา
                        </td>
                      </tr>
                    ) : (
                      searchLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-500">{log.timestamp}</td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                            {log.maskedCitizenId}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                log.status === 'FOUND'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.status === 'RATE_LIMITED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {log.status === 'FOUND'
                                ? 'พบข้อมูล'
                                : log.status === 'RATE_LIMITED'
                                ? 'จำกัดความถี่'
                                : 'ไม่พบข้อมูล'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{log.details || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ---------------- MODAL: ADD / EDIT STUDENT ---------------- */}
      {(isAddModalOpen || editingStudent) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 relative">
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingStudent(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingStudent ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียนใหม่'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              ข้อมูล 9 รายการตามโครงสร้างไฟล์ Excel ของโรงเรียนมัธยมประชานิเวศน์
            </p>

            <form onSubmit={handleSaveStudentSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เลขประจำตัว (String) *
                  </label>
                  <input
                    type="text"
                    value={formData.เลขประจำตัว}
                    onChange={(e) => setFormData({ ...formData, เลขประจำตัว: e.target.value })}
                    placeholder="เช่น 04501"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:border-purple-600 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">คำนำหน้า *</label>
                  <select
                    value={formData.คำนำหน้า}
                    onChange={(e) => setFormData({ ...formData, คำนำหน้า: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-purple-600 outline-none cursor-pointer"
                  >
                    <option value="เด็กชาย">เด็กชาย</option>
                    <option value="เด็กหญิง">เด็กหญิง</option>
                    <option value="นาย">นาย</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชื่อ *</label>
                  <input
                    type="text"
                    value={formData.ชื่อ}
                    onChange={(e) => setFormData({ ...formData, ชื่อ: e.target.value })}
                    placeholder="ชื่อนักเรียน"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-purple-600 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">นามสกุล *</label>
                  <input
                    type="text"
                    value={formData.นามสกุล}
                    onChange={(e) => setFormData({ ...formData, นามสกุล: e.target.value })}
                    placeholder="นามสกุล"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-purple-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลขบัตรประจำตัวประชาชน 13 หลัก (String) *
                </label>
                <input
                  type="text"
                  maxLength={13}
                  value={formData.เลขบัตรประชาชน}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      เลขบัตรประชาชน: e.target.value.replace(/\D/g, '').slice(0, 13),
                    })
                  }
                  placeholder="เช่น 1100200123456"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:border-purple-600 outline-none"
                  required
                />
                <div className="text-[10px] text-slate-400 mt-1">
                  กรอก 13 หลักเพื่อรักษาเลข 0 ข้างหน้า
                </div>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 space-y-3">
                <div className="font-semibold text-purple-950">ผลการเรียน (GPA 5 ภาคเรียน)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      GPAX *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={formData.GPAX}
                      onChange={(e) => setFormData({ ...formData, GPAX: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono text-center"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      คณิต *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={formData.คณิต}
                      onChange={(e) => setFormData({ ...formData, คณิต: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono text-center"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      วิทย์ *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={formData.วิทย์}
                      onChange={(e) => setFormData({ ...formData, วิทย์: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono text-center"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      ภาษาต่างประเทศ *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={formData.ภาษาต่างประเทศ}
                      onChange={(e) => setFormData({ ...formData, ภาษาต่างประเทศ: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono text-center"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: VIEW DETAILS ---------------- */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative">
            <button
              onClick={() => setViewingStudent(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                {viewingStudent.ชื่อ.charAt(0)}
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {viewingStudent.คำนำหน้า} {viewingStudent.ชื่อ} {viewingStudent.นามสกุล}
              </h3>
              <div className="text-xs text-purple-700 font-mono mt-0.5">
                รหัสนักเรียน: {viewingStudent.เลขประจำตัว}
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">เลขบัตรประชาชน:</span>
                <span className="font-mono font-medium">{formatCitizenId(viewingStudent.เลขบัตรประชาชน)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">GPAX 5 ภาคเรียน:</span>
                <span className="font-mono font-bold text-purple-700 text-sm">{viewingStudent.GPAX}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">คณิตศาสตร์:</span>
                <span className="font-mono font-bold text-indigo-700">{viewingStudent.คณิต}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">วิทยาศาสตร์:</span>
                <span className="font-mono font-bold text-emerald-700">{viewingStudent.วิทย์}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">ภาษาต่างประเทศ:</span>
                <span className="font-mono font-bold text-purple-700">{viewingStudent.ภาษาต่างประเทศ}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: CONFIRM DELETE ---------------- */}
      {deletingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">ยืนยันการลบข้อมูลนักเรียน?</h3>
            <p className="text-xs text-slate-500 mb-4">
              คุณกำลังจะลบข้อมูลของ{' '}
              <b className="text-slate-800">
                {deletingStudent.คำนำหน้า} {deletingStudent.ชื่อ} {deletingStudent.นามสกุล}
              </b>{' '}
              (รหัส {deletingStudent.เลขประจำตัว}) ข้อมูลจะถูกลบออกจากระบบและ Google Sheets
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm cursor-pointer"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
