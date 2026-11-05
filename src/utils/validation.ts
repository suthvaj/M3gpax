import { StudentRecord, DataIntegrityReport } from '../types/student';

/**
 * Validates Thai 13-digit National ID checksum
 */
export function isValidThaiCitizenId(id: string): boolean {
  if (!id) return false;
  const clean = id.replace(/[-\s]/g, '');
  if (!/^\d{13}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i], 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(clean[12], 10);
}

/**
 * Format 13-digit Citizen ID with standard Thai hyphenation: X-XXXX-XXXXX-XX-X
 */
export function formatCitizenId(id: string): string {
  const clean = (id || '').replace(/[-\s]/g, '');
  if (clean.length !== 13) return id;
  return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean.slice(12, 13)}`;
}

/**
 * Mask 13-digit Citizen ID for student privacy: X-XXXX-XXXXX-XX-X -> 1-1002-XXXXX-XX-1
 */
export function maskCitizenId(id: string): string {
  const clean = (id || '').replace(/[-\s]/g, '');
  if (clean.length < 13) {
    return 'X-XXXX-XXXXX-XX-X';
  }
  const first = clean.slice(0, 1);
  const second = clean.slice(1, 5);
  const last = clean.slice(12, 13);
  return `${first}-${second}-XXXXX-XX-${last}`;
}

/**
 * Validate grade is numeric and within 0.00 - 4.00
 */
export function isValidGrade(val: string | number): boolean {
  if (val === undefined || val === null || val === '') return false;
  const n = typeof val === 'number' ? val : parseFloat(val);
  return !isNaN(n) && n >= 0.0 && n <= 4.0;
}

/**
 * Perform comprehensive integrity check across all student records
 */
export function auditStudentRecords(students: StudentRecord[]): DataIntegrityReport {
  const citizenCount = new Map<string, number>();
  const studentIdCount = new Map<string, number>();

  students.forEach((s) => {
    const cid = (s.เลขบัตรประชาชน || '').replace(/[-\s]/g, '');
    if (cid) {
      citizenCount.set(cid, (citizenCount.get(cid) || 0) + 1);
    }
    const sid = (s.เลขประจำตัว || '').trim();
    if (sid) {
      studentIdCount.set(sid, (studentIdCount.get(sid) || 0) + 1);
    }
  });

  const duplicateCitizenIds: string[] = [];
  citizenCount.forEach((count, cid) => {
    if (count > 1) duplicateCitizenIds.push(cid);
  });

  const duplicateStudentIds: string[] = [];
  studentIdCount.forEach((count, sid) => {
    if (count > 1) duplicateStudentIds.push(sid);
  });

  const incompleteCitizenIds: string[] = [];
  const invalidGPAXRecords: string[] = [];
  const emptyNameRecords: string[] = [];
  const issues: DataIntegrityReport['issues'] = [];

  students.forEach((s, index) => {
    const rowNum = s.rowNumber || index + 2;
    const cid = (s.เลขบัตรประชาชน || '').replace(/[-\s]/g, '');
    const sid = (s.เลขประจำตัว || '').trim();
    const fullName = `${s.คำนำหน้า || ''} ${s.ชื่อ || ''} ${s.นามสกุล || ''}`.trim() || 'ไม่ระบุชื่อ';

    // 1. Citizen ID checks
    if (!cid || cid.length !== 13 || !/^\d{13}$/.test(cid)) {
      incompleteCitizenIds.push(s.id);
      issues.push({
        studentId: sid || `แถว ${rowNum}`,
        name: fullName,
        issueType: 'เลขบัตรประชาชนไม่ครบ 13 หลัก',
        details: `ค่าปัจจุบัน: "${s.เลขบัตรประชาชน || 'ว่าง'}"`,
        rowNumber: rowNum,
      });
    } else if (duplicateCitizenIds.includes(cid)) {
      issues.push({
        studentId: sid,
        name: fullName,
        issueType: 'เลขบัตรประชาชนซ้ำ',
        details: `เลขบัตร: ${formatCitizenId(cid)} พบซ้ำในระบบ`,
        rowNumber: rowNum,
      });
    }

    // 2. Student ID duplicate or empty
    if (!sid) {
      issues.push({
        studentId: `แถว ${rowNum}`,
        name: fullName,
        issueType: 'ไม่มีเลขประจำตัวนักเรียน',
        details: 'ช่องเลขประจำตัวว่างเปล่า',
        rowNumber: rowNum,
      });
    } else if (duplicateStudentIds.includes(sid)) {
      issues.push({
        studentId: sid,
        name: fullName,
        issueType: 'เลขประจำตัวซ้ำ',
        details: `เลขประจำตัว ${sid} ปรากฏซ้ำหลายรายการ`,
        rowNumber: rowNum,
      });
    }

    // 3. Name check
    if (!s.ชื่อ || !s.ชื่อ.trim() || !s.นามสกุล || !s.นามสกุล.trim()) {
      emptyNameRecords.push(s.id);
      issues.push({
        studentId: sid,
        name: fullName,
        issueType: 'ชื่อหรือนามสกุลว่าง',
        details: 'กรุณากรอกชื่อและนามสกุลให้ครบถ้วน',
        rowNumber: rowNum,
      });
    }

    // 4. GPAX check
    if (!isValidGrade(s.GPAX)) {
      invalidGPAXRecords.push(s.id);
      issues.push({
        studentId: sid,
        name: fullName,
        issueType: 'GPAX ผิดรูปแบบ',
        details: `ค่า "${s.GPAX}" ไม่อยู่ในช่วง 0.00 - 4.00 หรือไม่ใช่ตัวเลข`,
        rowNumber: rowNum,
      });
    }

    // 5. Subject grades check
    ['คณิต', 'วิทย์', 'ภาษาต่างประเทศ'].forEach((subject) => {
      const val = (s as any)[subject];
      if (!isValidGrade(val)) {
        issues.push({
          studentId: sid,
          name: fullName,
          issueType: `เกรดวิชา${subject}ไม่ถูกต้อง`,
          details: `ค่า "${val}" ไม่อยู่ในช่วง 0.00 - 4.00`,
          rowNumber: rowNum,
        });
      }
    });
  });

  const warningRecords = issues.length;
  const validRecords = Math.max(0, students.length - warningRecords);

  return {
    totalRecords: students.length,
    validRecords,
    warningRecords,
    errorRecords: issues.filter((i) => i.issueType.includes('ไม่ครบ') || i.issueType.includes('ว่าง')).length,
    duplicateCitizenIds,
    duplicateStudentIds,
    incompleteCitizenIds,
    invalidGPAXRecords,
    emptyNameRecords,
    issues,
  };
}
