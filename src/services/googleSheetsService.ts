import { getAccessToken } from './firebaseAuth';
import { StudentRecord, SearchLogEntry, ActivityLogEntry } from '../types/student';

export const OFFICIAL_HEADERS = [
  'เลขประจำตัว',
  'คำนำหน้า',
  'ชื่อ',
  'นามสกุล',
  'GPAX',
  'เลขบัตรประชาชน',
  'คณิต',
  'วิทย์',
  'ภาษาต่างประเทศ',
] as const;

export class GoogleSheetsService {
  /**
   * List Google Spreadsheets from user's Drive that they have access to
   */
  static async listSpreadsheets(): Promise<Array<{ id: string; name: string; modifiedTime?: string }>> {
    const token = await getAccessToken();
    if (!token) throw new Error('กรุณาเข้าสู่ระบบด้วย Google Account ก่อนดำเนินการ');

    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=20`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `เกิดข้อผิดพลาดในการค้นหาไฟล์ (${response.status})`);
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Create a new Google Spreadsheet with all required sheets and headers
   */
  static async createOfficialSpreadsheet(
    customTitle?: string
  ): Promise<{ id: string; name: string; url: string }> {
    const token = await getAccessToken();
    if (!token) throw new Error('กรุณาเข้าสู่ระบบด้วย Google Account ก่อนสร้างไฟล์');

    const title =
      customTitle ||
      `ระบบโควตา ม.4 ร.ร.มัธยมประชานิเวศน์ 2570 [${new Date().toLocaleDateString('th-TH')}]`;

    const requestBody = {
      properties: {
        title,
        locale: 'th_TH',
        timeZone: 'Asia/Bangkok',
      },
      sheets: [
        {
          properties: {
            title: 'Students',
            gridProperties: {
              frozenRowCount: 1,
              columnCount: 12,
            },
            tabColor: { red: 0.45, green: 0.15, blue: 0.65 },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: OFFICIAL_HEADERS.map((header) => ({
                    userEnteredValue: { stringValue: header },
                    userEnteredFormat: {
                      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                      backgroundColor: { red: 0.35, green: 0.12, blue: 0.55 },
                      horizontalAlignment: 'CENTER',
                    },
                  })),
                },
              ],
            },
          ],
        },
        {
          properties: {
            title: 'SearchLogs',
            gridProperties: { frozenRowCount: 1 },
            tabColor: { red: 0.2, green: 0.4, blue: 0.8 },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: ['วันเวลา', 'เลขบัตรประชาชน (แบบปกปิด)', 'สถานะการค้นหา', 'รายละเอียด'].map(
                    (header) => ({
                      userEnteredValue: { stringValue: header },
                      userEnteredFormat: {
                        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                        backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 },
                        horizontalAlignment: 'CENTER',
                      },
                    })
                  ),
                },
              ],
            },
          ],
        },
        {
          properties: {
            title: 'ActivityLogs',
            gridProperties: { frozenRowCount: 1 },
            tabColor: { red: 0.2, green: 0.6, blue: 0.4 },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: ['วันเวลา', 'ผู้ดำเนินการ', 'ประเภทคำสั่ง', 'รายละเอียด'].map((header) => ({
                    userEnteredValue: { stringValue: header },
                    userEnteredFormat: {
                      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                      backgroundColor: { red: 0.15, green: 0.45, blue: 0.3 },
                      horizontalAlignment: 'CENTER',
                    },
                  })),
                },
              ],
            },
          ],
        },
        {
          properties: {
            title: 'Admins',
            gridProperties: { frozenRowCount: 1 },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: ['ID', 'Username', 'Name', 'Email', 'Role', 'Status', 'LastLogin'].map(
                    (header) => ({
                      userEnteredValue: { stringValue: header },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        horizontalAlignment: 'CENTER',
                      },
                    })
                  ),
                },
              ],
            },
          ],
        },
        {
          properties: {
            title: 'Settings',
            gridProperties: { frozenRowCount: 1 },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: ['Key', 'Value', 'UpdatedAt'].map((header) => ({
                    userEnteredValue: { stringValue: header },
                    userEnteredFormat: { textFormat: { bold: true } },
                  })),
                },
                {
                  values: [
                    { userEnteredValue: { stringValue: 'AcademicYear' } },
                    { userEnteredValue: { stringValue: '2570' } },
                    { userEnteredValue: { stringValue: new Date().toISOString() } },
                  ],
                },
                {
                  values: [
                    { userEnteredValue: { stringValue: 'SchoolName' } },
                    { userEnteredValue: { stringValue: 'โรงเรียนมัธยมประชานิเวศน์' } },
                    { userEnteredValue: { stringValue: new Date().toISOString() } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `ไม่สามารถสร้าง Google Sheet ได้ (${res.status})`);
    }

    const data = await res.json();
    return {
      id: data.spreadsheetId,
      name: data.properties.title,
      url: data.spreadsheetUrl,
    };
  }

  /**
   * Fetch all student records from the 'Students' sheet
   */
  static async fetchStudents(spreadsheetId: string): Promise<{ students: StudentRecord[]; rawHeaders: string[] }> {
    const token = await getAccessToken();
    if (!token) throw new Error('ต้องเข้าสู่ระบบ Google Account ก่อนอ่านข้อมูลจาก Sheet');

    const range = encodeURIComponent('Students!A1:I');
    // Use valueRenderOption=FORMATTED_VALUE to preserve leading zeroes (e.g. '04521')
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `ไม่สามารถดึงข้อมูลจาก Google Sheets ได้ (${res.status})`);
    }

    const data = await res.json();
    const rows: string[][] = data.values || [];

    if (rows.length === 0) {
      return { students: [], rawHeaders: [] };
    }

    const headers = rows[0].map((h) => (h || '').toString().trim());

    // Map columns dynamically or by index
    const colMap: { [key: string]: number } = {};
    headers.forEach((h, idx) => {
      colMap[h] = idx;
    });

    const students: StudentRecord[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every((c) => !c || c.trim() === '')) {
        continue; // Skip empty row
      }

      const getCol = (name: string, fallbackIdx: number): string => {
        if (colMap[name] !== undefined && row[colMap[name]] !== undefined) {
          return String(row[colMap[name]] || '').trim();
        }
        return String(row[fallbackIdx] || '').trim();
      };

      const studentId = getCol('เลขประจำตัว', 0);
      const title = getCol('คำนำหน้า', 1);
      const firstName = getCol('ชื่อ', 2);
      const lastName = getCol('นามสกุล', 3);
      const gpax = getCol('GPAX', 4);
      const citizenId = getCol('เลขบัตรประชาชน', 5);
      const math = getCol('คณิต', 6);
      const sci = getCol('วิทย์', 7);
      const lang = getCol('ภาษาต่างประเทศ', 8);

      students.push({
        id: `row-${i + 1}-${citizenId || studentId}`,
        rowNumber: i + 1,
        เลขประจำตัว: studentId,
        คำนำหน้า: title,
        ชื่อ: firstName,
        นามสกุล: lastName,
        GPAX: gpax,
        เลขบัตรประชาชน: citizenId,
        คณิต: math,
        วิทย์: sci,
        ภาษาต่างประเทศ: lang,
      });
    }

    return { students, rawHeaders: headers };
  }

  /**
   * Append a single student row to the 'Students' sheet
   */
  static async appendStudent(spreadsheetId: string, student: StudentRecord): Promise<boolean> {
    const token = await getAccessToken();
    if (!token) throw new Error('ต้องเข้าสู่ระบบ Google Account ก่อนเพิ่มข้อมูล');

    const range = encodeURIComponent('Students!A:I');
    const values = [
      [
        student.เลขประจำตัว,
        student.คำนำหน้า,
        student.ชื่อ,
        student.นามสกุล,
        student.GPAX,
        student.เลขบัตรประชาชน,
        student.คณิต,
        student.วิทย์,
        student.ภาษาต่างประเทศ,
      ],
    ];

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `ไม่สามารถเพิ่มข้อมูลใน Google Sheets ได้ (${res.status})`);
    }

    return true;
  }

  /**
   * Batch append multiple students (e.g., when importing or seeding)
   */
  static async batchAppendStudents(
    spreadsheetId: string,
    students: StudentRecord[]
  ): Promise<boolean> {
    const token = await getAccessToken();
    if (!token) throw new Error('ต้องเข้าสู่ระบบ Google Account');

    const range = encodeURIComponent('Students!A:I');
    const values = students.map((s) => [
      s.เลขประจำตัว,
      s.คำนำหน้า,
      s.ชื่อ,
      s.นามสกุล,
      s.GPAX,
      s.เลขบัตรประชาชน,
      s.คณิต,
      s.วิทย์,
      s.ภาษาต่างประเทศ,
    ]);

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `ไม่สามารถส่งข้อมูลชุดใหญ่ได้ (${res.status})`);
    }

    return true;
  }

  /**
   * Update student row in Google Sheets
   */
  static async updateStudent(
    spreadsheetId: string,
    rowNumber: number,
    student: StudentRecord
  ): Promise<boolean> {
    const token = await getAccessToken();
    if (!token) throw new Error('ต้องเข้าสู่ระบบ Google Account ก่อนแก้ไข');

    const range = encodeURIComponent(`Students!A${rowNumber}:I${rowNumber}`);
    const values = [
      [
        student.เลขประจำตัว,
        student.คำนำหน้า,
        student.ชื่อ,
        student.นามสกุล,
        student.GPAX,
        student.เลขบัตรประชาชน,
        student.คณิต,
        student.วิทย์,
        student.ภาษาต่างประเทศ,
      ],
    ];

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `ไม่สามารถแก้ไขข้อมูลในแถวที่ ${rowNumber} ได้ (${res.status})`);
    }

    return true;
  }

  /**
   * Delete student row in Google Sheets using batchUpdate deleteDimension
   */
  static async deleteStudentRow(spreadsheetId: string, rowNumber: number): Promise<boolean> {
    const token = await getAccessToken();
    if (!token) throw new Error('ต้องเข้าสู่ระบบ Google Account ก่อนลบ');

    // First retrieve sheetId for 'Students' tab
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) throw new Error('ไม่สามารถอ่านข้อมูลโครงสร้าง Sheet ได้');
    const metaData = await metaRes.json();
    const studentsSheet = metaData.sheets?.find(
      (s: any) => s.properties?.title === 'Students'
    );
    const sheetId = studentsSheet ? studentsSheet.properties.sheetId : 0;

    const requestBody = {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1, // 0-indexed
              endIndex: rowNumber,
            },
          },
        },
      ],
    };

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `ไม่สามารถลบแถวที่ ${rowNumber} ได้ (${res.status})`);
    }

    return true;
  }

  /**
   * Log search event to SearchLogs sheet
   */
  static async logSearch(spreadsheetId: string, log: SearchLogEntry): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;

    try {
      const range = encodeURIComponent('SearchLogs!A:D');
      const values = [[log.timestamp, log.maskedCitizenId, log.status, log.details || '']];
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
    } catch (e) {
      console.warn('Failed to append search log to sheet:', e);
    }
  }

  /**
   * Log admin activity to ActivityLogs sheet
   */
  static async logActivity(spreadsheetId: string, log: ActivityLogEntry): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;

    try {
      const range = encodeURIComponent('ActivityLogs!A:D');
      const values = [[log.timestamp, log.user, log.action, log.details]];
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
    } catch (e) {
      console.warn('Failed to append activity log to sheet:', e);
    }
  }
}
