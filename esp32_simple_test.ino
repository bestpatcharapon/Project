#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Network Configuration
const char* ssid = "Kanchada_2.4G";        // แก้ไขเป็น WiFi ของคุณ
const char* password = "kan123456789";      // แก้ไขเป็นรหัสผ่าน WiFi ของคุณ

// Web Application URLs - Local Development Server
// ✅ ใช้ IP ของคอมพิวเตอร์: 172.20.10.8 (จาก ipconfig)
const char* detectionURL = "http://172.20.10.8:3000/api/detection";        
const char* heartbeatURL = "http://172.20.10.8:3000/api/esp32/heartbeat";  

// สำหรับ production (เมื่อ API พร้อมแล้ว)
// const char* detectionURL = "https://alertemail.vercel.app/api/detection";
// const char* heartbeatURL = "https://alertemail.vercel.app/api/esp32/heartbeat";

// Timing variables
unsigned long lastDetection = 0;
unsigned long lastHeartbeat = 0;
int detectionCount = 0;

void setup() {
    Serial.begin(115200);
    Serial.println("\n🧪 ESP32 Simple Test - Detection & Status");
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
    doc["device_id"] = "ESP32_Camera_01";  // เปลี่ยนให้ตรงกับ Dashboard
    doc["location"] = "Front Door (Test)";
    
    // Processing Performance (สุ่มเวลาการประมวลผล)
    doc["dsp_time"] = random(80, 150);           // 80-150ms
    doc["classification_time"] = random(200, 400); // 200-400ms
    doc["anomaly_time"] = random(50, 100);       // 50-100ms
    
    // Detection Results
    doc["human_detected"] = humanDetected;
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
    
    doc["detected_objects"] = detectedObjects;

    // Convert to JSON string
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("📤 Detection #" + String(detectionCount) + " - JSON data:");
    Serial.println(jsonString);

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
                Serial.println("👤 Human detected - Email should be sent!");
            } else {
                Serial.println("🚫 No human detected in this test");
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
    Serial.println("\n💓 Sending Camera heartbeat...");
    
    // ส่ง Camera heartbeat
    DynamicJsonDocument cameraDoc(512);
    cameraDoc["device_id"] = "ESP32_Camera_01";  // ตรงกับ Dashboard
    cameraDoc["timestamp"] = millis();
    cameraDoc["location"] = "Front Door (Test)";
    cameraDoc["version"] = "1.0.0-test";
    cameraDoc["wifi_strength"] = WiFi.RSSI();
    cameraDoc["uptime"] = millis() / 1000;
    cameraDoc["free_heap"] = ESP.getFreeHeap();
    cameraDoc["device_type"] = "camera";
    cameraDoc["status"] = "testing";

    String cameraJson;
    serializeJson(cameraDoc, cameraJson);
    
    Serial.println("📤 Camera Heartbeat JSON:");
    Serial.println(cameraJson);

    HTTPClient http1;
    http1.begin(heartbeatURL);
    http1.addHeader("Content-Type", "application/json");
    http1.setTimeout(15000);

    int cameraResponse = http1.POST(cameraJson);
    
    if (cameraResponse > 0) {
        Serial.printf("✅ Camera Heartbeat Code: %d\n", cameraResponse);
        if (cameraResponse == 200) {
            Serial.println("💚 Camera should show Online");
        }
    } else {
        Serial.printf("❌ Camera Heartbeat Error: %s\n", http1.errorToString(cameraResponse).c_str());
    }
    http1.end();

    delay(1000); // รอ 1 วินาที

    // ส่ง Gateway heartbeat
    Serial.println("💓 Sending Gateway heartbeat...");
    
    DynamicJsonDocument gatewayDoc(512);
    gatewayDoc["device_id"] = "ESP32_Gateway_02";  // ตรงกับ Dashboard
    gatewayDoc["timestamp"] = millis();
    gatewayDoc["location"] = "Network Gateway (Test)";
    gatewayDoc["version"] = "1.0.0-test";
    gatewayDoc["wifi_strength"] = WiFi.RSSI();
    gatewayDoc["uptime"] = millis() / 1000;
    gatewayDoc["free_heap"] = ESP.getFreeHeap();
    gatewayDoc["device_type"] = "gateway";
    gatewayDoc["status"] = "testing";

    String gatewayJson;
    serializeJson(gatewayDoc, gatewayJson);
    
    Serial.println("📤 Gateway Heartbeat JSON:");
    Serial.println(gatewayJson);

    HTTPClient http2;
    http2.begin(heartbeatURL);
    http2.addHeader("Content-Type", "application/json");
    http2.setTimeout(15000);

    int gatewayResponse = http2.POST(gatewayJson);
    
    if (gatewayResponse > 0) {
        Serial.printf("✅ Gateway Heartbeat Code: %d\n", gatewayResponse);
        if (gatewayResponse == 200) {
            Serial.println("💚 Gateway should show Online");
        }
    } else {
        Serial.printf("❌ Gateway Heartbeat Error: %s\n", http2.errorToString(gatewayResponse).c_str());
    }
    http2.end();
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
    Serial.println();
}

void loop() {
    unsigned long currentTime = millis();
    
    // ส่ง heartbeat ทุก 15 วินาที (เร็วขึ้น)
    if (currentTime - lastHeartbeat >= 15000) {
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
    
    // ทดสอบ heartbeat API ด้วย GET request
    Serial.println("📡 Testing heartbeat API...");
    HTTPClient http;
    http.begin(heartbeatURL);
    http.setTimeout(10000);
    
    int getResponse = http.GET();
    Serial.printf("GET %s -> Response: %d\n", heartbeatURL, getResponse);
    
    if (getResponse > 0) {
        String response = http.getString();
        Serial.println("Response: " + response);
    }
    http.end();
    
    delay(1000);
    
    // ทดสอบ detection API ด้วย GET request
    Serial.println("📡 Testing detection API...");
    HTTPClient http2;
    http2.begin(detectionURL);
    http2.setTimeout(10000);
    
    int getResponse2 = http2.GET();
    Serial.printf("GET %s -> Response: %d\n", detectionURL, getResponse2);
    
    if (getResponse2 > 0) {
        String response2 = http2.getString();
        Serial.println("Response: " + response2);
    }
    http2.end();
    
    Serial.println("🔍 API Test completed. Check responses above.");
    Serial.println("✅ Code 200 = OK, ❌ Code 404 = Not Found, ❌ Code 405 = Method Not Allowed");
    Serial.println();
} 