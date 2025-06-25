#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Network Configuration
const char* ssid = "gyeOul";  // แก้ไขเป็น WiFi ของคุณ
const char* password = "kittipong98";  // แก้ไขเป็นรหัสผ่าน WiFi ของคุณ

// Web Application URL
const char* webAppURL = "https://alertemail.vercel.app/api/detection";

void setup() {
    Serial.begin(115200);
    Serial.println("ESP32 Detection Test - Database Connection");

    // Connect to WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi...");
    }
    
    Serial.println("✅ Connected to WiFi");
    Serial.print("📍 IP Address: ");
    Serial.println(WiFi.localIP());
    
    delay(2000); // รอให้เชื่อมต่อเสถียร
}

void sendTestDetection() {
    Serial.println("\n🧪 Sending test detection data...");
    
    // สร้างข้อมูลทดสอบตามรูปที่คุณแสดง
    DynamicJsonDocument doc(1024);
    
    // General Information
    doc["device_id"] = "ESP32_Camera_02";
    doc["location"] = "Back Garden";
    doc["detection_time"] = "25/06/2568 00:38:03";
    
    // Processing Performance
    doc["dsp_time"] = 3;
    doc["classification_time"] = 289;
    doc["anomaly_time"] = 7;
    
    // Detection Results - Human detected with 100% confidence
    doc["human_detected"] = true;
    doc["confidence"] = 1.0; // 100% confidence
    doc["detected_objects"] = "Human (100% confidence) - Position: Detected in frame";
    
    // Alternative format for object detection
    JsonArray boxes = doc.createNestedArray("object_detection").createNestedObject()["boxes"];
    JsonObject humanBox = boxes.createNestedObject();
    humanBox["label"] = "Human";
    humanBox["confidence"] = 1.0;
    humanBox["x"] = 120;
    humanBox["y"] = 80;
    humanBox["width"] = 200;
    humanBox["height"] = 300;

    // Convert to JSON string
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("📤 Sending JSON data:");
    Serial.println(jsonString);

    // Send HTTP POST request
    HTTPClient http;
    http.begin(webAppURL);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(jsonString);

    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("✅ Response Code: %d\n", httpResponseCode);
        Serial.println("📨 Response from server:");
        Serial.println(response);
        
        if (httpResponseCode == 200) {
            Serial.println("🎉 Detection data successfully sent to database!");
            Serial.println("📧 Email notification should be sent automatically!");
        }
    } else {
        Serial.printf("❌ Error: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
}

void loop() {
    static unsigned long lastSend = 0;
    unsigned long currentTime = millis();
    
    // ส่งข้อมูลทดสอบทุก 30 วินาที
    if (currentTime - lastSend >= 30000) {
        sendTestDetection();
        lastSend = currentTime;
    }
    
    delay(1000);
} 