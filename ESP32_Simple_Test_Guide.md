# ESP32 Simple Test Guide

## 🧪 โค้ดทดสอบเรียบง่าย

ไฟล์ `esp32_simple_test.ino` เป็นโค้ดทดสอบที่เรียบง่าย ส่งข้อมูล detection และ heartbeat ไปยัง web app เพื่อทดสอบระบบ

## ✨ ฟีเจอร์

- 🔍 **Detection Test**: ส่งข้อมูลการตรวจจับทุก 45 วินาที (80% โอกาสพบคน)
- 💓 **Heartbeat**: ส่งสถานะ ESP32 ทุก 30 วินาที
- 📊 **Status Report**: แสดงสถิติทุก 2 นาที
- 🎲 **Random Data**: ข้อมูลจำลองแบบสุ่มสมจริง

## 🚀 การใช้งาน

### 1. แก้ไขโค้ด

```cpp
// เปลี่ยน WiFi credentials
const char* ssid = "ชื่อ_WiFi_ของคุณ";
const char* password = "รหัสผ่าน_WiFi_ของคุณ";

// เปลี่ยน URLs (ถ้าจำเป็น)
const char* detectionURL = "https://your-domain.com/api/detection";
const char* heartbeatURL = "https://your-domain.com/api/esp32/heartbeat";
```

### 2. อัปโหลดและทดสอบ

1. อัปโหลดไปยัง ESP32
2. เปิด Serial Monitor (115200 baud)
3. ดูผลลัพธ์

## 📊 ผลลัพธ์ที่คาดหวัง

### Serial Monitor:
```
🧪 ESP32 Simple Test - Detection & Status
✅ Connected to WiFi
📍 IP Address: 192.168.1.123

💓 Sending heartbeat...
✅ Heartbeat Response Code: 200
💚 Heartbeat sent successfully - Device should show Online

🔍 Sending test detection data...
📤 Detection #1 - JSON data:
{"device_id":"ESP32_Camera_Test","human_detected":true,"confidence":0.85...}
✅ Detection Response Code: 200
🎉 Detection data sent successfully!
👤 Human detected - Email should be sent!
```

### Dashboard:
- 📷 **Camera: Online** (สีเขียว)
- 🔍 **การตรวจจับล่าสุด** จะปรากฏในรายการ
- 📧 **อีเมลแจ้งเตือน** จะถูกส่งเมื่อพบคน (80% โอกาส)

## ⚙️ การปรับแต่ง

### เปลี่ยนความถี่:
```cpp
// ส่ง heartbeat ทุก 15 วินาที
if (currentTime - lastHeartbeat >= 15000) {

// ส่ง detection ทุก 30 วินาที  
if (currentTime - lastDetection >= 30000) {
```

### เปลี่ยนโอกาสพบคน:
```cpp
bool humanDetected = random(0, 100) < 90; // 90% โอกาส
```

### เปลี่ยนข้อมูล Device:
```cpp
doc["device_id"] = "ESP32_Living_Room";
doc["location"] = "Living Room";
```

## 🔧 การแก้ปัญหา

### ❌ Connection Error:
- ตรวจสอบ WiFi credentials
- ตรวจสอบ URL ถูกต้องหรือไม่
- ลอง HTTP แทน HTTPS ถ้าทดสอบ local

### ❌ Response Code 400-500:
- ตรวจสอบ JSON format
- ดู Server logs มี error อะไร
- ตรวจสอบ API endpoints ใช้งานได้หรือไม่

### 📧 ไม่ได้รับอีเมล:
- ตรวจสอบ email settings ใน web app
- ดู detection logs ใน dashboard
- ตรวจสอบ spam folder

## 📈 Checklist การทดสอบ

- [ ] ESP32 เชื่อมต่อ WiFi สำเร็จ
- [ ] Heartbeat ส่งสำเร็จ (Response Code 200)
- [ ] Dashboard แสดง Camera Online
- [ ] Detection data ส่งสำเร็จ
- [ ] การตรวจจับปรากฏใน Dashboard
- [ ] ได้รับอีเมลแจ้งเตือน (เมื่อพบคน)

## 🎯 ขั้นตอนต่อไป

เมื่อทดสอบสำเร็จแล้ว:
1. เปลี่ยนไปใช้โค้ดจริงที่มี Camera
2. ติดตั้ง AI detection model
3. ใช้งานระบบจริง

โค้ดนี้เรียบง่ายและทดสอบได้ครบทุกฟีเจอร์! 🚀 