import {
  StudentRecord,
  StudentSearchResult,
  SearchLogEntry,
  ActivityLogEntry,
  AdminUser,
  SheetConfig,
} from '../types/student';
import { INITIAL_STUDENTS } from '../data/sampleStudents';
import { GoogleSheetsService } from './googleSheetsService';
import { maskCitizenId, isValidGrade } from '../utils/validation';

const STORAGE_KEYS = {
  STUDENTS: 'pnw_students_data_2570',
  SHEET_CONFIG: 'pnw_sheet_config_2570',
  SEARCH_LOGS: 'pnw_search_logs_2570',
  ACTIVITY_LOGS: 'pnw_activity_logs_2570',
  ADMINS: 'pnw_admins_2570',
  RATE_LIMIT: 'pnw_search_rate_limit',
};

// Initial admin accounts
const DEFAULT_ADMINS: AdminUser[] = [
  {
    id: 'adm-01',
    username: 'admin',
    name: 'ผู้ดูแลระบบหลัก (มัธยมประชานิเวศน์)',
    email: 'admin@prachaniwet.ac.th',
    role: 'superadmin',
    active: true,
    lastLogin: '2026-11-05 10:30',
  },
  {
    id: 'adm-02',
    username: 'academic',
    name: 'งานวิชาการและรับนักเรียน ม.4',
    email: 'academic@prachaniwet.ac.th',
    role: 'admin',
    active: true,
    lastLogin: '2026-11-04 15:45',
  },
];

export class StudentRepository {
  /**
   * Load students from storage or initialize with baseline 300 records
   */
  static getStudents(): StudentRecord[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached students:', e);
    }
    // Default baseline dataset
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    return INITIAL_STUDENTS;
  }

  /**
   * Save students to local storage
   */
  static saveStudents(students: StudentRecord[]) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  /**
   * Sheet configuration management
   */
  static getSheetConfig(): SheetConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHEET_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return {
      spreadsheetId: '',
      spreadsheetTitle: 'ยังไม่ได้เชื่อมต่อ Google Sheet',
      spreadsheetUrl: '',
      syncMode: 'google-api',
    };
  }

  static saveSheetConfig(config: SheetConfig) {
    localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(config));
  }

  /**
   * Search student by 13-digit citizen ID with rate-limiting and security protection
   */
  static async searchByCitizenId(rawCitizenId: string): Promise<StudentSearchResult> {
    const cleanId = (rawCitizenId || '').replace(/[-\s]/g, '').trim();

    // 1. Rate Limiting Check: max 6 searches per 30 seconds
    const now = Date.now();
    let searchHistory: number[] = [];
    try {
      const rawLimit = sessionStorage.getItem(STORAGE_KEYS.RATE_LIMIT);
      if (rawLimit) searchHistory = JSON.parse(rawLimit);
    } catch (e) {}

    // Keep searches within last 30 seconds
    searchHistory = searchHistory.filter((t) => now - t < 30000);
    if (searchHistory.length >= 6) {
      this.addSearchLog(maskCitizenId(cleanId), 'RATE_LIMITED', 'ค้นหาถี่เกินไป (Rate Limit)');
      return {
        found: false,
        message: 'คุณทำการค้นหาถี่เกินไป เพื่อความปลอดภัยกรุณารอ 30 วินาทีก่อนลองใหม่อีกครั้ง',
      };
    }

    searchHistory.push(now);
    sessionStorage.setItem(STORAGE_KEYS.RATE_LIMIT, JSON.stringify(searchHistory));

    // 2. Validate 13-digit format
    if (cleanId.length !== 13 || !/^\d{13}$/.test(cleanId)) {
      this.addSearchLog(maskCitizenId(cleanId), 'INVALID_FORMAT', 'เลขบัตรประชาชนไม่ถูกต้อง');
      return {
        found: false,
        message: 'กรุณากรอกเลขประจำตัวประชาชน 13 หลักให้ถูกต้องครบถ้วน',
      };
    }

    // 3. Search in current database
    const students = this.getStudents();
    const matched = students.find((s) => {
      const sCid = (s.เลขบัตรประชาชน || '').replace(/[-\s]/g, '').trim();
      return sCid === cleanId;
    });

    const masked = maskCitizenId(cleanId);

    if (!matched) {
      this.addSearchLog(masked, 'NOT_FOUND', 'ไม่พบข้อมูลในระบบ');
      return {
        found: false,
        message: 'ไม่พบข้อมูลในระบบ กรุณาตรวจสอบเลขบัตรประชาชนของท่านอีกครั้ง หรือติดต่อผู้ดูแลระบบ',
      };
    }

    // 4. Success - Log found and return restricted student record
    this.addSearchLog(masked, 'FOUND', `พบข้อมูลนักเรียน รหัส ${matched.เลขประจำตัว}`);

    // Generate unique verification code for admission quota verification
    const verificationCode = `PNW70-Q${matched.เลขประจำตัว}-${cleanId.slice(-4)}`;

    return {
      found: true,
      student: {
        id: matched.id,
        เลขประจำตัว: matched.เลขประจำตัว,
        คำนำหน้า: matched.คำนำหน้า,
        ชื่อ: matched.ชื่อ,
        นามสกุล: matched.นามสกุล,
        maskedCitizenId: masked,
        GPAX: matched.GPAX,
        คณิต: matched.คณิต,
        วิทย์: matched.วิทย์,
        ภาษาต่างประเทศ: matched.ภาษาต่างประเทศ,
        quotaEligible: parseFloat(matched.GPAX) >= 2.0,
        verificationCode,
      },
    };
  }

  /**
   * Search Logs
   */
  static getSearchLogs(): SearchLogEntry[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SEARCH_LOGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  }

  static addSearchLog(
    maskedCitizenId: string,
    status: SearchLogEntry['status'],
    details?: string
  ) {
    const logs = this.getSearchLogs();
    const newEntry: SearchLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      maskedCitizenId,
      status,
      details,
    };
    logs.unshift(newEntry);
    // Keep last 300 logs
    const trimmed = logs.slice(0, 300);
    localStorage.setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(trimmed));

    // Async log to Google Sheet if connected
    const config = this.getSheetConfig();
    if (config.spreadsheetId) {
      GoogleSheetsService.logSearch(config.spreadsheetId, newEntry).catch(() => {});
    }
  }

  /**
   * Activity Logs
   */
  static getActivityLogs(): ActivityLogEntry[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'act-1',
        timestamp: new Date().toLocaleString('th-TH'),
        user: 'ระบบ',
        action: 'LOGIN',
        details: 'เริ่มต้นระบบตรวจสอบคุณสมบัติ ม.4 ร.ร.มัธยมประชานิเวศน์',
      },
    ];
  }

  static addActivityLog(
    user: string,
    action: ActivityLogEntry['action'],
    details: string
  ) {
    const logs = this.getActivityLogs();
    const newEntry: ActivityLogEntry = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toLocaleString('th-TH'),
      user,
      action,
      details,
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs.slice(0, 300)));

    const config = this.getSheetConfig();
    if (config.spreadsheetId) {
      GoogleSheetsService.logActivity(config.spreadsheetId, newEntry).catch(() => {});
    }
  }

  /**
   * Admin Users
   */
  static getAdmins(): AdminUser[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMINS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(DEFAULT_ADMINS));
    return DEFAULT_ADMINS;
  }

  static saveAdmins(admins: AdminUser[]) {
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins));
  }

  /**
   * Add student record
   */
  static async addStudent(studentData: Omit<StudentRecord, 'id'>, adminUser: string): Promise<StudentRecord> {
    const students = this.getStudents();
    const newId = `std-${Date.now()}`;
    const newRecord: StudentRecord = {
      ...studentData,
      id: newId,
      rowNumber: students.length + 2,
      status: 'valid',
    };

    students.push(newRecord);
    this.saveStudents(students);
    this.addActivityLog(
      adminUser,
      'CREATE',
      `เพิ่มข้อมูลนักเรียน: รหัส ${newRecord.เลขประจำตัว} ${newRecord.ชื่อ} ${newRecord.นามสกุล}`
    );

    // Sync to Google Sheets if connected
    const config = this.getSheetConfig();
    if (config.spreadsheetId) {
      try {
        await GoogleSheetsService.appendStudent(config.spreadsheetId, newRecord);
      } catch (e) {
        console.warn('Could not sync addition to Google Sheet immediately:', e);
      }
    }

    return newRecord;
  }

  /**
   * Update student record
   */
  static async updateStudent(updatedStudent: StudentRecord, adminUser: string): Promise<boolean> {
    const students = this.getStudents();
    const index = students.findIndex((s) => s.id === updatedStudent.id);
    if (index === -1) return false;

    students[index] = updatedStudent;
    this.saveStudents(students);
    this.addActivityLog(
      adminUser,
      'UPDATE',
      `แก้ไขข้อมูลนักเรียน รหัส ${updatedStudent.เลขประจำตัว} ${updatedStudent.ชื่อ} ${updatedStudent.นามสกุล}`
    );

    // Sync to Google Sheets if connected
    const config = this.getSheetConfig();
    if (config.spreadsheetId && updatedStudent.rowNumber) {
      try {
        await GoogleSheetsService.updateStudent(
          config.spreadsheetId,
          updatedStudent.rowNumber,
          updatedStudent
        );
      } catch (e) {
        console.warn('Could not sync update to Google Sheet:', e);
      }
    }

    return true;
  }

  /**
   * Delete student record
   */
  static async deleteStudent(studentId: string, adminUser: string): Promise<boolean> {
    const students = this.getStudents();
    const target = students.find((s) => s.id === studentId);
    if (!target) return false;

    const filtered = students.filter((s) => s.id !== studentId);
    this.saveStudents(filtered);
    this.addActivityLog(
      adminUser,
      'DELETE',
      `ลบข้อมูลนักเรียน รหัส ${target.เลขประจำตัว} ${target.ชื่อ} ${target.นามสกุล}`
    );

    // Sync delete to Google Sheets if rowNumber exists
    const config = this.getSheetConfig();
    if (config.spreadsheetId && target.rowNumber) {
      try {
        await GoogleSheetsService.deleteStudentRow(config.spreadsheetId, target.rowNumber);
      } catch (e) {
        console.warn('Could not sync row deletion to Google Sheet:', e);
      }
    }

    return true;
  }

  /**
   * Sync all data from connected Google Sheet into local memory
   */
  static async syncFromGoogleSheet(spreadsheetId: string, adminUser: string): Promise<number> {
    const { students } = await GoogleSheetsService.fetchStudents(spreadsheetId);
    if (students && students.length > 0) {
      this.saveStudents(students);
      const config = this.getSheetConfig();
      config.spreadsheetId = spreadsheetId;
      config.lastSyncedAt = new Date().toLocaleString('th-TH');
      this.saveSheetConfig(config);

      this.addActivityLog(
        adminUser,
        'SYNC',
        `ซิงค์ข้อมูลจาก Google Sheets สำเร็จ (${students.length} รายการ)`
      );
      return students.length;
    }
    return 0;
  }

  /**
   * Push all current students into Google Sheet (1-click seed / backup)
   */
  static async pushAllToGoogleSheet(spreadsheetId: string, adminUser: string): Promise<number> {
    const students = this.getStudents();
    await GoogleSheetsService.batchAppendStudents(spreadsheetId, students);
    this.addActivityLog(
      adminUser,
      'SYNC',
      `นำข้อมูลนักเรียน ${students.length} คนเข้าสู่ Google Sheets สำเร็จ`
    );
    return students.length;
  }

  /**
   * Reset to initial dataset
   */
  static resetToDefault(adminUser: string) {
    this.saveStudents(INITIAL_STUDENTS);
    this.addActivityLog(adminUser, 'SETTINGS', 'รีเซ็ตข้อมูลเป็นชุดข้อมูลเริ่มต้น 300 คน');
  }
}
