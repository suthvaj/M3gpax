/**
 * =========================================================================
 * ระบบตรวจสอบคุณสมบัติและผลการเรียนสำหรับการรับนักเรียนเข้าศึกษาต่อ ม.4
 * ปีการศึกษา 2570 ประเภทโควตา โรงเรียนมัธยมประชานิเวศน์
 * 
 * Google Apps Script Backend (Web App)
 * Author: Senior Software Architect / School System Developer
 * =========================================================================
 */

// คอลัมน์มาตรฐาน 9 คอลัมน์ ตรงตามโครงสร้างไฟล์ Excel ของโรงเรียน
const STUDENT_COLUMNS = [
  'เลขประจำตัว',
  'คำนำหน้า',
  'ชื่อ',
  'นามสกุล',
  'GPAX',
  'เลขบัตรประชาชน',
  'คณิต',
  'วิทย์',
  'ภาษาต่างประเทศ'
];

/**
 * ฟังก์ชันเริ่มต้นสร้างชีตและหัวตารางทั้งหมดอัตโนมัติ
 * รันครั้งเดียวจากตัวแก้ไข Apps Script: Run -> setupDatabase()
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ชีต Students
  let studentSheet = ss.getSheetByName('Students');
  if (!studentSheet) {
    studentSheet = ss.insertSheet('Students');
  }
  if (studentSheet.getLastRow() === 0) {
    studentSheet.appendRow(STUDENT_COLUMNS);
    studentSheet.getRange(1, 1, 1, STUDENT_COLUMNS.length)
      .setFontWeight('bold')
      .setBackground('#4A154B')
      .setFontColor('#FFFFFF')
      .setHorizontalAlignment('center');
    studentSheet.setFrozenRows(1);
    // กำหนดให้คอลัมน์ A (เลขประจำตัว) และ F (เลขบัตรประชาชน) เป็นรูปแบบข้อความ Plain Text เสมอ เพื่อรักษาเลข 0 ข้างหน้า
    studentSheet.getRange('A:A').setNumberFormat('@');
    studentSheet.getRange('F:F').setNumberFormat('@');
  }

  // 2. ชีต SearchLogs
  let searchSheet = ss.getSheetByName('SearchLogs');
  if (!searchSheet) {
    searchSheet = ss.insertSheet('SearchLogs');
    searchSheet.appendRow(['วันเวลา', 'เลขบัตรประชาชน (แบบปกปิด)', 'สถานะการค้นหา', 'รายละเอียด']);
    searchSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#2B3A67').setFontColor('#FFFFFF');
    searchSheet.setFrozenRows(1);
  }

  // 3. ชีต ActivityLogs
  let actSheet = ss.getSheetByName('ActivityLogs');
  if (!actSheet) {
    actSheet = ss.insertSheet('ActivityLogs');
    actSheet.appendRow(['วันเวลา', 'ผู้ใช้งาน', 'การกระทำ', 'รายละเอียด']);
    actSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#1A5235').setFontColor('#FFFFFF');
    actSheet.setFrozenRows(1);
  }

  // 4. ชีต Settings
  let settingSheet = ss.getSheetByName('Settings');
  if (!settingSheet) {
    settingSheet = ss.insertSheet('Settings');
    settingSheet.appendRow(['Key', 'Value', 'UpdatedAt']);
    settingSheet.appendRow(['AcademicYear', '2570', new Date().toISOString()]);
    settingSheet.appendRow(['SchoolName', 'โรงเรียนมัธยมประชานิเวศน์', new Date().toISOString()]);
    settingSheet.appendRow(['QuotaTitle', 'การรับนักเรียนเข้าศึกษาต่อชั้นมัธยมศึกษาปีที่ 4 ปีการศึกษา 2570 ประเภทโควตา', new Date().toISOString()]);
    settingSheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    settingSheet.setFrozenRows(1);
  }

  Logger.log('สร้างโครงสร้างฐานข้อมูลเสร็จสมบูรณ์!');
}

/**
 * Handle GET Requests
 * รองรับการค้นหาสำหรับนักเรียน และการตรวจสอบสถานะระบบ
 */
function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || 'ping';

    // 1. ตรวจสอบสถานะ Server
    if (action === 'ping') {
      return jsonResponse({
        status: 'success',
        message: 'ระบบตรวจสอบผลการเรียน ม.4 ร.ร.มัธยมประชานิเวศน์ พร้อมใช้งาน',
        academicYear: '2570',
        timestamp: new Date().toISOString()
      });
    }

    // 2. ค้นหานักเรียนด้วยเลขบัตรประชาชน 13 หลัก
    if (action === 'searchStudent') {
      const citizenId = (params.citizenId || '').toString().trim().replace(/[-\s]/g, '');

      // Validation เลขบัตรประชาชน
      if (!citizenId || citizenId.length !== 13 || !/^\d{13}$/.test(citizenId)) {
        return jsonResponse({
          status: 'error',
          code: 'INVALID_CITIZEN_ID',
          message: 'กรุณากรอกเลขบัตรประจำตัวประชาชน 13 หลักให้ถูกต้อง'
        });
      }

      const result = findStudentByCitizenId(citizenId);
      
      // บันทึกประวัติการค้นหาโดยปกปิดเลขบัตรประชาชน
      const maskedId = maskCitizenId(citizenId);
      logSearch(maskedId, result.found ? 'FOUND' : 'NOT_FOUND', result.found ? 'พบข้อมูลนักเรียน' : 'ไม่พบข้อมูลในระบบ');

      if (!result.found) {
        return jsonResponse({
          status: 'not_found',
          message: 'ไม่พบข้อมูลในระบบ กรุณาตรวจสอบเลขบัตรประชาชนของท่านอีกครั้ง หรือติดต่อผู้ดูแลระบบ'
        });
      }

      // ส่งกลับเฉพาะข้อมูลนักเรียนคนดังกล่าว ปกปิดเลขบัตรประชาชน ห้ามส่งข้อมูลคนอื่นเด็ดขาด
      return jsonResponse({
        status: 'success',
        data: {
          เลขประจำตัว: result.student.เลขประจำตัว,
          คำนำหน้า: result.student.คำนำหน้า,
          ชื่อ: result.student.ชื่อ,
          นามสกุล: result.student.นามสกุล,
          maskedCitizenId: maskedId,
          GPAX: result.student.GPAX,
          คณิต: result.student.คณิต,
          วิทย์: result.student.วิทย์,
          ภาษาต่างประเทศ: result.student.ภาษาต่างประเทศ,
          academicYear: '2570',
          quotaEligible: parseFloat(result.student.GPAX) >= 2.00,
          verifiedAt: new Date().toISOString()
        }
      });
    }

    // 3. ดึงรายชื่อนักเรียนทั้งหมด (Real-time Sync สำหรับผู้ดูแลระบบ)
    if (action === 'getAllStudents' || action === 'adminGetAllStudents') {
      const allStudents = getAllStudentsFromSheet();
      return jsonResponse({
        status: 'success',
        count: allStudents.length,
        data: allStudents,
        timestamp: new Date().toISOString()
      });
    }

    // 4. เพิ่มข้อมูลนักเรียน Real-time เข้า Google Sheets
    if (action === 'addStudent' || action === 'adminAddStudent') {
      let student = {};
      if (params.student) {
        try { student = JSON.parse(params.student); } catch(err) { student = {}; }
      } else {
        STUDENT_COLUMNS.forEach(col => {
          if (params[col] !== undefined) student[col] = params[col];
        });
      }
      const res = addStudentToSheet(student);
      logActivity(params.adminUser || 'Admin', 'ADD_STUDENT', `เพิ่มนักเรียน รหัส ${student.เลขประจำตัว} ${student.ชื่อ} ${student.นามสกุล}`);
      return jsonResponse(res);
    }

    // 5. แก้ไขข้อมูลนักเรียน Real-time ใน Google Sheets
    if (action === 'updateStudent' || action === 'adminUpdateStudent') {
      const rowNumber = parseInt(params.rowNumber, 10);
      let student = {};
      if (params.student) {
        try { student = JSON.parse(params.student); } catch(err) { student = {}; }
      } else {
        STUDENT_COLUMNS.forEach(col => {
          if (params[col] !== undefined) student[col] = params[col];
        });
      }
      const res = updateStudentInSheet(rowNumber, student);
      logActivity(params.adminUser || 'Admin', 'UPDATE_STUDENT', `แก้ไขข้อมูล: รหัส ${student.เลขประจำตัว}`);
      return jsonResponse(res);
    }

    // 6. ลบข้อมูลนักเรียน Real-time จาก Google Sheets
    if (action === 'deleteStudent' || action === 'adminDeleteStudent') {
      const rowNumber = parseInt(params.rowNumber, 10);
      const studentId = params.studentId || '';
      const citizenId = params.citizenId || '';
      const res = deleteStudentFromSheet(rowNumber, citizenId, studentId);
      logActivity(params.adminUser || 'Admin', 'DELETE_STUDENT', `ลบข้อมูลนักเรียน (รหัส: ${studentId || rowNumber})`);
      return jsonResponse(res);
    }

    return jsonResponse({ status: 'error', message: 'Unknown action' });
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Handle POST Requests
 * รองรับการส่งผ่าน POST เช่นเดียวกัน
 */
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action;

    if (action === 'adminGetAllStudents' || action === 'getAllStudents') {
      const allStudents = getAllStudentsFromSheet();
      return jsonResponse({ status: 'success', count: allStudents.length, data: allStudents });
    }

    if (action === 'adminAddStudent' || action === 'addStudent') {
      const student = payload.student || {};
      const res = addStudentToSheet(student);
      logActivity(payload.adminUser || 'Admin', 'ADD_STUDENT', `เพิ่มนักเรียน รหัส ${student.เลขประจำตัว} ${student.ชื่อ} ${student.นามสกุล}`);
      return jsonResponse(res);
    }

    if (action === 'adminUpdateStudent' || action === 'updateStudent') {
      const student = payload.student || {};
      const rowNumber = payload.rowNumber;
      const res = updateStudentInSheet(rowNumber, student);
      logActivity(payload.adminUser || 'Admin', 'UPDATE_STUDENT', `แก้ไขข้อมูล: รหัส ${student.เลขประจำตัว}`);
      return jsonResponse(res);
    }

    if (action === 'adminDeleteStudent' || action === 'deleteStudent') {
      const rowNumber = payload.rowNumber;
      const studentId = payload.studentId || '';
      const citizenId = payload.citizenId || '';
      const res = deleteStudentFromSheet(rowNumber, citizenId, studentId);
      logActivity(payload.adminUser || 'Admin', 'DELETE_STUDENT', `ลบข้อมูลนักเรียน (รหัส: ${studentId || rowNumber})`);
      return jsonResponse(res);
    }

    return jsonResponse({ status: 'error', message: 'Action not supported' });
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * ค้นหานักเรียนในชีต Students
 */
function findStudentByCitizenId(citizenId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Students');
  if (!sheet) return { found: false };

  // อ่านข้อมูลทั้งหมด (ใช้ DisplayValues เพื่อไม่ให้เลข 0 ด้านหน้าสูญหาย)
  const range = sheet.getDataRange();
  const values = range.getDisplayValues();
  if (values.length <= 1) return { found: false };

  const headers = values[0];
  const citizenColIdx = headers.indexOf('เลขบัตรประชาชน');
  const targetCol = citizenColIdx !== -1 ? citizenColIdx : 5;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowCitizenId = (row[targetCol] || '').toString().trim().replace(/[-\s]/g, '');
    if (rowCitizenId === citizenId) {
      const student = {};
      STUDENT_COLUMNS.forEach((colName, idx) => {
        const cIdx = headers.indexOf(colName);
        student[colName] = (cIdx !== -1 ? row[cIdx] : row[idx]) || '';
      });
      return { found: true, student: student, rowIndex: i + 1 };
    }
  }

  return { found: false };
}

/**
 * ดึงข้อมูลนักเรียนทั้งหมดสำหรับ Admin
 */
function getAllStudentsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Students');
  if (!sheet) return [];

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const list = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.join('').trim() === '') continue;

    const student = { rowNumber: i + 1 };
    STUDENT_COLUMNS.forEach((colName, idx) => {
      const cIdx = headers.indexOf(colName);
      student[colName] = (cIdx !== -1 ? row[cIdx] : row[idx]) || '';
    });
    list.push(student);
  }

  return list;
}

/**
 * เพิ่มนักเรียนใหม่
 */
function addStudentToSheet(student) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Students');
  if (!sheet) throw new Error('ไม่พบชีต Students');

  const row = STUDENT_COLUMNS.map(col => (student[col] !== undefined ? student[col].toString() : ''));
  sheet.appendRow(row);
  return { status: 'success', message: 'เพิ่มข้อมูลเรียบร้อยแล้ว' };
}

/**
 * แก้ไขนักเรียน
 */
function updateStudentInSheet(rowNumber, student) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Students');
  if (!sheet) throw new Error('ไม่พบชีต Students');

  let targetRow = rowNumber;
  if (!targetRow || targetRow <= 1) {
    const values = sheet.getDataRange().getDisplayValues();
    const headers = values[0];
    const cidCol = headers.indexOf('เลขบัตรประชาชน');
    const sidCol = headers.indexOf('เลขประจำตัว');
    const cleanCid = (student.เลขบัตรประชาชน || '').replace(/[-\s]/g, '');
    const sId = (student.เลขประจำตัว || '').trim();

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if ((cleanCid && (row[cidCol] || '').replace(/[-\s]/g, '') === cleanCid) ||
          (sId && (row[sidCol] || '').trim() === sId)) {
        targetRow = i + 1;
        break;
      }
    }
  }

  if (!targetRow || targetRow <= 1) {
    return { status: 'error', message: 'ไม่พบแถวข้อมูลที่ต้องการแก้ไข' };
  }

  const row = STUDENT_COLUMNS.map(col => (student[col] !== undefined ? student[col].toString() : ''));
  sheet.getRange(targetRow, 1, 1, STUDENT_COLUMNS.length).setValues([row]);
  return { status: 'success', message: 'บันทึกการแก้ไขเรียบร้อยแล้ว', rowNumber: targetRow };
}

/**
 * ลบนักเรียน
 */
function deleteStudentFromSheet(rowNumber, citizenId, studentId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Students');
  if (!sheet) throw new Error('ไม่พบชีต Students');

  let targetRow = rowNumber;
  if (!targetRow || targetRow <= 1) {
    const values = sheet.getDataRange().getDisplayValues();
    const headers = values[0];
    const cidCol = headers.indexOf('เลขบัตรประชาชน');
    const sidCol = headers.indexOf('เลขประจำตัว');
    const cleanCid = (citizenId || '').replace(/[-\s]/g, '');
    const sId = (studentId || '').trim();

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if ((cleanCid && (row[cidCol] || '').replace(/[-\s]/g, '') === cleanCid) ||
          (sId && (row[sidCol] || '').trim() === sId)) {
        targetRow = i + 1;
        break;
      }
    }
  }

  if (!targetRow || targetRow <= 1) {
    return { status: 'error', message: 'ไม่พบแถวข้อมูลที่ต้องการลบ' };
  }

  sheet.deleteRow(targetRow);
  return { status: 'success', message: 'ลบข้อมูลเรียบร้อยแล้ว' };
}

/**
 * ฟังก์ชันปกปิดเลขบัตรประชาชน เช่น 1-1002-XXXXX-XX-1
 */
function maskCitizenId(id) {
  if (!id || id.length < 13) return 'XXXXXXXXXXXXX';
  const clean = id.replace(/[-\s]/g, '');
  return `${clean.substring(0, 1)}-${clean.substring(1, 5)}-XXXXX-XX-${clean.substring(12, 13)}`;
}

/**
 * บันทึกประวัติการค้นหา
 */
function logSearch(maskedId, status, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('SearchLogs');
    if (sheet) {
      sheet.appendRow([new Date(), maskedId, status, details]);
    }
  } catch (e) {
    Logger.log('Search log error: ' + e);
  }
}

/**
 * บันทึกประวัติการกระทำของ Admin
 */
function logActivity(user, action, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('ActivityLogs');
    if (sheet) {
      sheet.appendRow([new Date(), user, action, details]);
    }
  } catch (e) {
    Logger.log('Activity log error: ' + e);
  }
}

/**
 * สร้าง JSON Response
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
