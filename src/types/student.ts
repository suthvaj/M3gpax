/**
 * Data structures for Prachaniwet Secondary School Admission Verification System
 * Grade 10 (Mathayom 4), Academic Year 2570 (Quota Admission)
 */

// Exact 9 columns as specified in the official school Excel database:
// 1. เลขประจำตัว (Student ID)
// 2. คำนำหน้า (Title / Prefix)
// 3. ชื่อ (First Name)
// 4. นามสกุล (Last Name)
// 5. GPAX (5-Semester Cumulative GPA)
// 6. เลขบัตรประชาชน (13-digit National ID)
// 7. คณิต (Mathematics Average Grade)
// 8. วิทย์ (Science Average Grade)
// 9. ภาษาต่างประเทศ (Foreign Language Average Grade - DO NOT change to 'english')

export interface StudentRecord {
  id: string; // Internal unique key
  rowNumber?: number; // Row index in Google Sheets
  เลขประจำตัว: string; // 5-6 digits with preserved leading zero
  คำนำหน้า: string; // เด็กชาย, เด็กหญิง, นาย, นางสาว
  ชื่อ: string;
  นามสกุล: string;
  GPAX: string; // e.g., "3.75"
  เลขบัตรประชาชน: string; // 13 characters, strictly string to preserve leading zero
  คณิต: string; // e.g., "3.50"
  วิทย์: string; // e.g., "3.80"
  ภาษาต่างประเทศ: string; // e.g., "3.60"
  status?: 'valid' | 'warning' | 'error';
  issues?: string[];
}

export interface StudentSearchResult {
  found: boolean;
  student?: {
    id: string;
    เลขประจำตัว: string;
    คำนำหน้า: string;
    ชื่อ: string;
    นามสกุล: string;
    maskedCitizenId: string;
    GPAX: string;
    คณิต: string;
    วิทย์: string;
    ภาษาต่างประเทศ: string;
    quotaEligible?: boolean;
    verificationCode?: string;
  };
  message?: string;
}

export interface SearchLogEntry {
  id: string;
  timestamp: string;
  maskedCitizenId: string;
  status: 'FOUND' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INVALID_FORMAT';
  clientIp?: string;
  details?: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC' | 'IMPORT' | 'LOGIN' | 'SETTINGS';
  details: string;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'staff';
  active: boolean;
  lastLogin?: string;
  passwordHash?: string;
}

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  lastSyncedAt?: string;
  gasWebAppUrl?: string;
  syncMode: 'google-api' | 'gas-webapp' | 'offline-sample';
}

export interface DataIntegrityReport {
  totalRecords: number;
  validRecords: number;
  warningRecords: number;
  errorRecords: number;
  duplicateCitizenIds: string[];
  duplicateStudentIds: string[];
  incompleteCitizenIds: string[];
  invalidGPAXRecords: string[];
  emptyNameRecords: string[];
  issues: {
    studentId: string;
    name: string;
    issueType: string;
    details: string;
    rowNumber?: number;
  }[];
}
