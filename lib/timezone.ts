// Thailand Timezone Utilities (GMT+7)

/**
 * สร้าง timestamp ในเขตเวลาไทย (GMT+7)
 * @param dateString - วันที่ในรูปแบบ string (optional)
 * @returns Date object ที่ปรับเป็นเขตเวลาไทยแล้ว
 */
export function createThailandTimestamp(dateString?: string): Date {
  const now = dateString ? new Date(dateString) : new Date()
  // เพิ่ม 7 ชั่วโมงสำหรับเขตเวลาไทย (GMT+7)
  const thailandTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))
  return thailandTime
}

/**
 * แปลง timestamp เป็นรูปแบบเขตเวลาไทย
 * @param date - Date object ที่ต้องการแปลง
 * @returns string ในรูปแบบเขตเวลาไทย
 */
export function formatThailandTime(date: Date): string {
  return new Date(date.getTime()).toLocaleString('th-TH', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    timeZone: 'Asia/Bangkok'
  })
}

/**
 * ได้ timestamp ปัจจุบันในเขตเวลาไทย
 * @returns Date object ในเขตเวลาไทย
 */
export function getNowInThailand(): Date {
  return createThailandTimestamp()
}

/**
 * แปลง UTC timestamp เป็นเขตเวลาไทย
 * @param utcDate - UTC Date object
 * @returns Date object ที่ปรับเป็นเขตเวลาไทยแล้ว
 */
export function convertUTCToThailand(utcDate: Date): Date {
  return new Date(utcDate.getTime() + (7 * 60 * 60 * 1000))
}

/**
 * คำนวณช่วงเวลาวันปัจจุบันในเขตเวลาไทย (เริ่มต้นวันและสิ้นสุดวัน)
 * @returns Object ที่มี todayStart และ tomorrowStart
 */
export function getTodayRangeInThailand() {
  const now = new Date()
  const thailandOffset = 7 * 60 * 60 * 1000 // 7 hours in milliseconds
  const thailandNow = new Date(now.getTime() + thailandOffset)
  
  // คำนวณช่วงเวลาสำหรับวันปัจจุบันในเขตเวลาไทย
  const todayStart = new Date(thailandNow.getFullYear(), thailandNow.getMonth(), thailandNow.getDate())
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  
  // แปลงกลับเป็น UTC สำหรับ database query
  const todayStartUTC = new Date(todayStart.getTime() - thailandOffset)
  const tomorrowStartUTC = new Date(tomorrowStart.getTime() - thailandOffset)

  return {
    todayStart: todayStartUTC,
    tomorrowStart: tomorrowStartUTC,
    todayStartThailand: todayStart,
    tomorrowStartThailand: tomorrowStart
  }
} 