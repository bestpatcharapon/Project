-- SQL Query เพื่อตรวจสอบข้อมูลการตรวจจับ
-- ใช้คำสั่งนี้ใน Database หรือ Prisma Studio

-- 1. ดูข้อมูลการตรวจจับทั้งหมดวันนี้
SELECT 
    id,
    device_id,
    location,
    detection_time,
    detection_human,
    DATE(detection_time) as detection_date
FROM "General_information" 
WHERE DATE(detection_time) = CURRENT_DATE
ORDER BY detection_time DESC;

-- 2. ดูสถิติการตรวจจับ
SELECT 
    DATE(detection_time) as date,
    COUNT(*) as total_detections,
    COUNT(CASE WHEN detection_human = true THEN 1 END) as human_detections,
    COUNT(CASE WHEN detection_human = false THEN 1 END) as no_human_detections
FROM "General_information" 
WHERE detection_time >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(detection_time)
ORDER BY date DESC;

-- 3. ดูการตรวจจับ human ล่าสุด 10 รายการ
SELECT 
    id,
    device_id,
    location,
    detection_time,
    detection_human
FROM "General_information" 
WHERE detection_human = true
ORDER BY detection_time DESC
LIMIT 10;

-- 4. ดูข้อมูลวันนี้อย่างละเอียด
SELECT 
    gi.id,
    gi.device_id,
    gi.location,
    gi.detection_time,
    gi.detection_human,
    pp.dsp_time,
    pp.classification_time,
    pp.anomaly_time
FROM "General_information" gi
LEFT JOIN "Processing_Performance" pp ON pp.general_info_id = gi.id
WHERE DATE(gi.detection_time) = CURRENT_DATE
ORDER BY gi.detection_time DESC; 