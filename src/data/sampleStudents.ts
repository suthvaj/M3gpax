import { StudentRecord } from '../types/student';

/**
 * Standard Quota dataset for Prachaniwet Secondary School (โรงเรียนมัธยมประชานิเวศน์)
 * Grade 10 (ม.4), Academic Year 2570
 * 9 Standard Columns:
 * 1. เลขประจำตัว (Student ID)
 * 2. คำนำหน้า (Title)
 * 3. ชื่อ (First Name)
 * 4. นามสกุล (Last Name)
 * 5. GPAX (5-Semester Cumulative GPA)
 * 6. เลขบัตรประชาชน (13-Digit National ID)
 * 7. คณิต (Mathematics)
 * 8. วิทย์ (Science)
 * 9. ภาษาต่างประเทศ (Foreign Language)
 */

const FIRST_NAMES_MALE = [
  'กิตติศักดิ์', 'ชินดนัย', 'ธนกฤต', 'พงศกร', 'วรเมธ', 'ศิรวิชญ์', 'อัครวินท์', 'ณัฐภัทร',
  'ปภังกร', 'ภัทรพล', 'ธนภัทร', 'จิรภัทร', 'กิตติภพ', 'ธนพล', 'ปิยวัฒน์', 'ชยุต', 'นรวิชญ์',
  'พิชญุตม์', 'รัชชานนท์', 'วรภพ', 'ศุภกร', 'สิรวิชญ์', 'อธิปัตย์', 'อภิวิชญ์', 'กรวิชญ์',
  'กานต์', 'ขจรศักดิ์', 'คณิน', 'จิรวัชร์', 'ชลธิศ', 'ฐิติพงศ์', 'ณภัทร', 'ดนัย', 'ทัตเทพ'
];

const FIRST_NAMES_FEMALE = [
  'กัญญาณัฐ', 'จิดาภา', 'ชัญญา', 'ณิชานันท์', 'ธัญลักษณ์', 'พิมลภัส', 'ภัทราภรณ์', 'วริศรา',
  'ศุภิสรา', 'อนันตญา', 'กัญญาวีร์', 'ชนกนันท์', 'ณัฐณิชา', 'ธนพร', 'นภัสสร', 'ปภาวรินทร์',
  'พิมพ์มาดา', 'มนัสวี', 'รินรดา', 'วรัญญา', 'ศศิวิมล', 'สุชัญญา', 'อภิชญา', 'เขมจิรา',
  'จิรัชญา', 'ชลิตา', 'ญาณิศา', 'ฐิตารีย์', 'ณัฐชา', 'ดวงกมล', 'ทิพวรรณ', 'ธันยพร', 'นภสร'
];

const LAST_NAMES = [
  'สุขสวัสดิ์', 'เจริญผล', 'รุ่งเรืองกิจ', 'วงศ์สุวรรณ', 'ประชานิเวศน์', 'เลิศวิริยะ', 'พัฒนพงศ์',
  'ศิริจันทร์', 'ทองประเสริฐ', 'บุญญารัตน์', 'รัตนโกสินทร์', 'ศรีสวัสดิ์', 'พรหมมณี', 'คงเจริญ',
  'จันทร์ทิพย์', 'ชัยวัฒน์', 'ทวีโชค', 'นพรัตน์', 'ประเสริฐสุข', 'มงคลศิลป์', 'ยอดรัก', 'วิจิตร',
  'สมบูรณ์', 'หิรัญญ์', 'อัครเดช', 'เกียรติขจร', 'เข็มทอง', 'เจริญรัตน์', 'โชคอนันต์', 'ดารารัศมี'
];

/**
 * Generate 300 realistic and consistent student records
 */
export const INITIAL_STUDENTS: StudentRecord[] = Array.from({ length: 300 }, (_, index) => {
  const isFemale = index % 2 === 1;
  const num = index + 1;
  // Student ID: 5 digits, preserving leading zero: e.g. "04501" to "04800"
  const studentId = String(4500 + num).padStart(5, '0');
  
  const title = isFemale ? (num % 5 === 0 ? 'นางสาว' : 'เด็กหญิง') : (num % 5 === 0 ? 'นาย' : 'เด็กชาย');
  const firstName = isFemale
    ? FIRST_NAMES_FEMALE[index % FIRST_NAMES_FEMALE.length]
    : FIRST_NAMES_MALE[index % FIRST_NAMES_MALE.length];
  const lastName = LAST_NAMES[index % LAST_NAMES.length];

  // Realistic GPAX distribution around 2.60 to 4.00
  // Formula gives varied realistic grades
  const baseGPA = 2.70 + ((num * 17) % 131) / 100; // 2.70 - 4.00
  const gpax = Math.min(4.0, Math.max(2.15, Number(baseGPA.toFixed(2))));
  
  const mathGrade = Math.min(4.0, Math.max(2.0, Number((gpax + ((num * 7) % 7 - 3) * 0.1).toFixed(2))));
  const sciGrade = Math.min(4.0, Math.max(2.0, Number((gpax + ((num * 11) % 7 - 3) * 0.1).toFixed(2))));
  const langGrade = Math.min(4.0, Math.max(2.0, Number((gpax + ((num * 13) % 7 - 3) * 0.1).toFixed(2))));

  // Generate valid 13-digit citizen ID string with prefix "11002" or "11003" (Bangkok / Chatuchak / Prachaniwet area)
  // Preserves leading zero as string
  const citizenPrefix = num % 2 === 0 ? '11002' : '11003';
  const citizenMiddle = String(10000 + num * 23).padStart(5, '0');
  const citizenSuffix = String(num % 90 + 10);
  const raw12 = `${citizenPrefix}${citizenMiddle}${citizenSuffix}`.substring(0, 12);
  
  // Calculate 13th checksum digit per official Thai National ID algorithm:
  // sum = sum(digit[i] * (13 - i)) for i in 0..11; check = (11 - (sum % 11)) % 10
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(raw12[i], 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  const citizenId = `${raw12}${checkDigit}`;

  return {
    id: `std-${studentId}`,
    rowNumber: index + 2, // Row 1 is header
    เลขประจำตัว: studentId,
    คำนำหน้า: title,
    ชื่อ: firstName,
    นามสกุล: lastName,
    GPAX: gpax.toFixed(2),
    เลขบัตรประชาชน: citizenId,
    คณิต: mathGrade.toFixed(2),
    วิทย์: sciGrade.toFixed(2),
    ภาษาต่างประเทศ: langGrade.toFixed(2),
    status: 'valid',
  };
});
