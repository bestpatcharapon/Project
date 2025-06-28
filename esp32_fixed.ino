#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Network Configuration
const char* ssid = "Kanchada_2.4G";        // แก้ไขเป็น WiFi ของคุณ
const char* password = "yoriya888";      // แก้ไขเป็นรหัสผ่าน WiFi ของคุณ

// Web Application URLs - Production Server
//const char* detectionURL = "https://alertemail.vercel.app/api/detection";        
//const char* heartbeatURL = "https://alertemail.vercel.app/api/esp32/heartbeat";  

// สำหรับ local development (ถ้าต้องการทดสอบ local)
const char* detectionURL = "http://192.168.1.108:3000/api/detection";
const char* heartbeatURL = "http://192.168.1.108:3000/api/esp32/heartbeat";

// Timing variables
unsigned long lastDetection = 0;
unsigned long lastHeartbeat = 0;
int detectionCount = 0;

void setup() {
    Serial.begin(115200);
    Serial.println("\n🧪 ESP32 Simple Test - Detection & Status (FIXED VERSION)");
    Serial.println("Sending test data to database and monitoring system");

    // Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    Serial.println();
    Serial.println("✅ Connected to WiFi");
    Serial.print("📍 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.println("🌐 Detection URL: " + String(detectionURL));
    Serial.println("💓 Heartbeat URL: " + String(heartbeatURL));
    
    delay(2000); // รอให้เชื่อมต่อเสถียร
    
    // ทดสอบ API เบื้องต้น
    testAPIEndpoints();
    delay(3000);
    
    // ส่งข้อมูลครั้งแรก
    sendHeartbeat();
    delay(3000);
    sendTestDetection();
}

void sendTestDetection() {
    Serial.println("\n🔍 Sending test detection data...");
    detectionCount++;
    
    // สร้างข้อมูลทดสอบ - สุ่มว่าจะพบคนหรือไม่
    bool humanDetected = random(0, 100) < 80; // 80% โอกาสพบคน
    float confidence = humanDetected ? random(75, 100) / 100.0 : random(20, 60) / 100.0;
    
    DynamicJsonDocument doc(1024);
    
    // General Information
    doc["device_id"] = "ESP32_Main";  // ใช้ชื่อเดียวกับ heartbeat
    doc["location"] = "Detection System (Test)";
    
    // Processing Performance (สุ่มเวลาการประมวลผล)
    doc["dsp_time"] = random(80, 150);           // 80-150ms
    doc["classification_time"] = random(200, 400); // 200-400ms
    doc["anomaly_time"] = random(50, 100);       // 50-100ms
    
    // Detection Results - *** แก้ไขจุดสำคัญ: ส่งข้อมูล human_detected ***
    doc["human_detected"] = humanDetected;  // เพิ่มบรรทัดนี้ - สำคัญมาก!
    doc["confidence"] = confidence;
    
    String detectedObjects;
    if (humanDetected) {
        detectedObjects = "Human (" + String(confidence * 100, 1) + "% confidence)";
        // เพิ่มวัตถุอื่นบางครั้ง
        if (random(0, 100) < 30) {
            detectedObjects += ", Bag (" + String(random(40, 70)) + "%)";
        }
    } else {
        // ถ้าไม่พบคน อาจพบสิ่งอื่น
        String objects[] = {"Cat", "Dog", "Car", "Bird", "Bicycle"};
        int objIndex = random(0, 5);
        detectedObjects = objects[objIndex] + " (" + String(random(30, 70)) + "%)";
    }
    
    doc["detected_objects"] = detectedObjects;  // เพิ่มบรรทัดนี้เพื่อส่งข้อมูลวัตถุที่ตรวจพบ

    // Convert to JSON string
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("📤 Detection #" + String(detectionCount) + " - Enhanced JSON data:");
    Serial.println(jsonString);
    Serial.println("🎯 Human Detected: " + String(humanDetected ? "YES" : "NO"));
    Serial.println("📊 Confidence: " + String(confidence * 100, 1) + "%");
    Serial.println("🔍 Objects: " + detectedObjects);

    // Send HTTP POST request
    HTTPClient http;
    http.begin(detectionURL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(30000); // 30 วินาที timeout

    int httpResponseCode = http.POST(jsonString);

    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("✅ Detection Response Code: %d\n", httpResponseCode);
        Serial.println("📨 Server Response:");
        Serial.println(response);
        
        if (httpResponseCode == 200) {
            Serial.println("🎉 Detection data sent successfully!");
            if (humanDetected) {
                Serial.println("🚨 HUMAN DETECTED - EMAIL SHOULD BE SENT! 📧");
                Serial.println("💌 Check your email for the alert notification!");
            } else {
                Serial.println("🚫 No human detected in this test - No email sent");
            }
        } else if (httpResponseCode >= 400) {
            Serial.printf("⚠️ Server Error: %d\n", httpResponseCode);
        }
    } else {
        Serial.printf("❌ Detection Error: %s\n", http.errorToString(httpResponseCode).c_str());
        printConnectionError(httpResponseCode);
    }

    http.end();
    Serial.println("═══════════════════════════════════");
}

void sendHeartbeat() {
    Serial.println("\n💓 Sending ESP32 heartbeat...");
    Serial.printf("🔋 Free Memory: %d bytes\n", ESP.getFreeHeap());
    
    // ตรวจสอบ WiFi connection ก่อนส่ง
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ WiFi disconnected! Reconnecting...");
        WiFi.begin(ssid, password);
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 10) {
            delay(500);
            Serial.print(".");
            attempts++;
        }
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\n✅ WiFi reconnected!");
        } else {
            Serial.println("\n❌ WiFi reconnection failed!");
            return;
        }
    }
    
    DynamicJsonDocument doc(512);
    doc["device_id"] = "ESP32_Main";  // ใช้ชื่อเดียว
    doc["timestamp"] = millis();
    doc["location"] = "Detection System (Test)";
    doc["version"] = "1.0.0-test-fixed";  // อัพเดตเวอร์ชัน
    doc["wifi_strength"] = WiFi.RSSI();
    doc["uptime"] = millis() / 1000;
    doc["free_heap"] = ESP.getFreeHeap();
    doc["device_type"] = "detection_system";
    doc["status"] = "testing";

    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("📤 ESP32 Heartbeat JSON:");
    Serial.println(jsonString);

    HTTPClient http;
    http.begin(heartbeatURL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(10000); // ลด timeout

    int response = http.POST(jsonString);
    
    if (response > 0) {
        Serial.printf("✅ ESP32 Heartbeat Code: %d\n", response);
        if (response == 200) {
            Serial.println("💚 ESP32 should show Online");
        } else {
            Serial.printf("⚠️ ESP32 Response Error: %d\n", response);
        }
    } else {
        Serial.printf("❌ ESP32 Heartbeat Error: %s\n", http.errorToString(response).c_str());
        printConnectionError(response);
        
        // ลองส่งใหม่อีกครั้งหากล้มเหลว
        Serial.println("🔄 Retrying heartbeat in 2 seconds...");
        delay(2000);
        
        HTTPClient retryHttp;
        retryHttp.begin(heartbeatURL);
        retryHttp.addHeader("Content-Type", "application/json");
        retryHttp.setTimeout(8000);
        
        int retryResponse = retryHttp.POST(jsonString);
        if (retryResponse > 0) {
            Serial.printf("✅ Retry Heartbeat Code: %d\n", retryResponse);
            if (retryResponse == 200) {
                Serial.println("💚 ESP32 Retry Success - should show Online");
            }
        } else {
            Serial.printf("❌ Retry Failed: %s\n", retryHttp.errorToString(retryResponse).c_str());
        }
        retryHttp.end();
    }
    http.end();
    Serial.println();
}

void printConnectionError(int errorCode) {
    if (errorCode == HTTPC_ERROR_CONNECTION_REFUSED) {
        Serial.println("🔌 Connection refused - Check URL");
    } else if (errorCode == HTTPC_ERROR_READ_TIMEOUT) {
        Serial.println("⏱️ Read timeout - Server response took too long");
        Serial.println("💡 This might be normal if email processing takes time");
    } else if (errorCode == HTTPC_ERROR_CONNECTION_LOST) {
        Serial.println("📡 Connection lost - Check WiFi connection");
    } else if (errorCode == HTTPC_ERROR_SEND_HEADER_FAILED) {
        Serial.println("📤 Failed to send headers - Check server");
    }
}

void printStatus() {
    Serial.println("\n📊 Test Status:");
    Serial.printf("⏰ Uptime: %lu seconds\n", millis() / 1000);
    Serial.printf("🔋 Free Memory: %d bytes\n", ESP.getFreeHeap());
    Serial.printf("📶 WiFi Signal: %d dBm\n", WiFi.RSSI());
    Serial.printf("🔍 Detections Sent: %d\n", detectionCount);
    Serial.printf("🌐 IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.println("🔧 This is the FIXED version that sends human_detected data!");
    Serial.println();
}

void loop() {
    unsigned long currentTime = millis();
    
    // ส่ง heartbeat ทุก 8 วินาที (เร็วมากขึ้น)
    if (currentTime - lastHeartbeat >= 8000) {
        sendHeartbeat();
        lastHeartbeat = currentTime;
    }
    
    // ส่งข้อมูล detection ทุก 45 วินาที
    if (currentTime - lastDetection >= 45000) {
        sendTestDetection();
        lastDetection = currentTime;
    }
    
    // แสดงสถิติทุก 2 นาที
    static unsigned long lastStatus = 0;
    if (currentTime - lastStatus >= 120000) {
        printStatus();
        lastStatus = currentTime;
    }
    
    delay(1000);
}

void testAPIEndpoints() {
    Serial.println("\n🧪 Testing API endpoints...");
    
    // ทดสอบ server connectivity ด้วย health check
    Serial.println("📡 Testing server connectivity...");
    HTTPClient http;
    String healthURL = "https://alertemail.vercel.app/api/health";
    http.begin(healthURL.c_str());
    http.setTimeout(10000);
    
    int healthResponse = http.GET();
    Serial.printf("GET %s -> Response: %d\n", healthURL.c_str(), healthResponse);
    
    if (healthResponse > 0) {
        String response = http.getString();
        Serial.println("Health Response: " + response);
    }
    http.end();
    
    delay(1000);
    
    // ทดสอบ heartbeat API ด้วย simple GET (อาจจะได้ 405 แต่แสดงว่าเชื่อมต่อได้)
    Serial.println("📡 Testing heartbeat endpoint...");
    HTTPClient http2;
    http2.begin(heartbeatURL);
    http2.setTimeout(10000);
    
    int getResponse = http2.GET();
    Serial.printf("GET %s -> Response: %d\n", heartbeatURL, getResponse);
    
    if (getResponse > 0) {
        String response = http2.getString();
        Serial.println("Heartbeat Response: " + response);
    }
    http2.end();
    
    Serial.println("🔍 API Test completed. Check responses above.");
    Serial.println("✅ Code 200 = OK, ❌ Code 404 = Not Found, ❌ Code 405 = Method Not Allowed (but connected)");
    Serial.println("💡 Code 405 is OK for POST-only endpoints when testing with GET");
    Serial.println("🔧 FIXED: Now sends human_detected and detected_objects to API");
    Serial.println();
} 