#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

// Network Configuration
const char* ssid = "Kanchada_2.4G";  // ใช้ WiFi เดียวกับ ESP32 #1
const char* password = "kan123456789";  // รหัสผ่าน WiFi เดียวกัน

// Web Application Configuration
const char* webAppURL = "https://project-ex9u.onrender.com/api/detection"; // URL ของเว็บแอปพลิเคชันจริง

// Heartbeat Configuration
const char* heartbeatURL = "https://project-ex9u.onrender.com/api/esp32/heartbeat"; // URL สำหรับ heartbeat
unsigned long last_heartbeat_time = 0;
const unsigned long heartbeat_interval = 30000; // ส่ง heartbeat ทุก 30 วินาที

// Web server on port 80
WebServer server(80);

void forwardToWebApp(DynamicJsonDocument& detectionData) {
    HTTPClient http;
    http.begin(webAppURL);
    http.addHeader("Content-Type", "application/json");

    String jsonString;
    serializeJson(detectionData, jsonString);

    Serial.println("Forwarding detection data to web application:");
    Serial.println(jsonString);

    int httpResponseCode = http.POST(jsonString);

    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("✅ Data forwarded successfully. Response code: %d\n", httpResponseCode);
        Serial.printf("Response: %s\n", response.c_str());
    } else {
        Serial.printf("❌ Error forwarding data: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
}

void sendGatewayHeartbeat() {
    HTTPClient http;
    http.begin(heartbeatURL);
    http.addHeader("Content-Type", "application/json");

    // สร้าง JSON payload สำหรับ heartbeat
    DynamicJsonDocument doc(512);
    doc["device_id"] = "ESP32_Gateway_02";
    doc["timestamp"] = millis();
    doc["location"] = "Network Gateway";
    doc["version"] = "1.0.0";
    doc["wifi_strength"] = WiFi.RSSI();
    doc["uptime"] = millis() / 1000;  // วินาที
    doc["free_heap"] = ESP.getFreeHeap();
    doc["device_type"] = "gateway";
    doc["status"] = "active";

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.println("💓 Sending gateway heartbeat to web app:");
    Serial.println(jsonString);

    int httpResponseCode = http.POST(jsonString);

    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("✅ Gateway heartbeat sent successfully. Response code: %d\n", httpResponseCode);
        Serial.printf("Response: %s\n", response.c_str());
    } else {
        Serial.printf("❌ Error sending gateway heartbeat: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
}

void handleDetection() {
    if (server.hasArg("plain")) {
        String body = server.arg("plain");
        Serial.println("📨 Received detection data from ESP32 #1:");
        Serial.println(body);

        // แยกข้อมูล JSON
        DynamicJsonDocument doc(2048);
        DeserializationError error = deserializeJson(doc, body);

        if (error) {
            Serial.print("❌ JSON parsing failed: ");
            Serial.println(error.c_str());
            server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"Invalid JSON\"}");
            return;
        }

        // แสดงผลลัพท์การตรวจจับใน Serial Monitor
        Serial.println("\n=== DETECTION REPORT ===");
        Serial.printf("Device: %s\n", doc["device_id"].as<String>().c_str());
        Serial.printf("Location: %s\n", doc["location"].as<String>().c_str());
        
        if (doc.containsKey("processing")) {
            Serial.printf("Processing Time - DSP: %d ms, Classification: %d ms, Anomaly: %d ms\n", 
                         doc["processing"]["dsp_time"].as<int>(),
                         doc["processing"]["classification_time"].as<int>(),
                         doc["processing"]["anomaly_time"].as<int>());
        } else {
            Serial.printf("Processing Time - DSP: %d ms, Classification: %d ms, Anomaly: %d ms\n", 
                         doc["dsp_time"].as<int>(),
                         doc["classification_time"].as<int>(),
                         doc["anomaly_time"].as<int>());
        }
        
        if (doc.containsKey("human_detected")) {
            Serial.printf("Human Detected: %s\n", doc["human_detected"].as<bool>() ? "Yes" : "No");
            if (doc["human_detected"].as<bool>()) {
                Serial.printf("Confidence: %.2f%%\n", doc["confidence"].as<float>() * 100);
            }
            Serial.printf("Detected Objects: %s\n", doc["detected_objects"].as<String>().c_str());
        } else if (doc.containsKey("object_detection")) {
            JsonArray boxes = doc["object_detection"]["boxes"];
            Serial.printf("Objects detected: %d\n", boxes.size());
            
            if (boxes.size() > 0) {
                Serial.println("Object detection bounding boxes:");
                for (JsonVariant box : boxes) {
                    Serial.printf("  %s (%.6f) [ x: %d, y: %d, width: %d, height: %d ]\n",
                                 box["label"].as<String>().c_str(),
                                 box["confidence"].as<float>(),
                                 box["x"].as<int>(),
                                 box["y"].as<int>(),
                                 box["width"].as<int>(),
                                 box["height"].as<int>());
                }
            }
        }
        Serial.println("========================\n");

        // ส่งต่อข้อมูลไปยังเว็บแอปพลิเคชัน
        Serial.println("📤 Forwarding to web application...");
        forwardToWebApp(doc);

        // ส่งการตอบกลับ
        DynamicJsonDocument responseDoc(256);
        responseDoc["status"] = "success";
        responseDoc["message"] = "Detection received and forwarded to web app";
        responseDoc["forwarded"] = true;
        
        String response;
        serializeJson(responseDoc, response);
        server.send(200, "application/json", response);

    } else {
        server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"No data received\"}");
    }
}

void handleRoot() {
    String html = "<!DOCTYPE html><html><body>";
    html += "<h1>ESP32 Gateway - Web App Integration</h1>";
    html += "<p>Status: <span style='color: green;'>✅ Online</span></p>";
    html += "<p>Mode: <strong>Gateway to Web Application</strong></p>";
    html += "<p>Forwarding detection data to: <code>" + String(webAppURL) + "</code></p>";
    html += "<p>Local IP: " + WiFi.localIP().toString() + "</p>";
    html += "<hr>";
    html += "<h3>How it works:</h3>";
    html += "<ol>";
    html += "<li>ESP32 #1 sends detection data to this gateway</li>";
    html += "<li>Gateway forwards data to web application</li>";
    html += "<li>Web application processes and sends emails automatically</li>";
    html += "</ol>";
    html += "</body></html>";
    server.send(200, "text/html", html);
}

void setup() {
    Serial.begin(115200);
    Serial.println("ESP32 Gateway - Web App Integration");

    // Connect to WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi...");
    }
    
    Serial.println("✅ Connected to WiFi");
    Serial.print("📍 Gateway IP: ");
    Serial.println(WiFi.localIP());
    Serial.println("⚠️  Update ESP32 #1 with this IP address if using gateway mode!");
    Serial.println("🌐 Web App URL: " + String(webAppURL));
    Serial.println("💓 Heartbeat URL: " + String(heartbeatURL));
    
    // ส่ง heartbeat ครั้งแรก
    sendGatewayHeartbeat();

    // Setup web server routes
    server.on("/", handleRoot);
    server.on("/detection", HTTP_POST, handleDetection);
    
    // Start server
    server.begin();
    Serial.println("🌐 HTTP server started");
    Serial.println("📡 Gateway ready - Forwarding to web application!");
}

void loop() {
    server.handleClient();
    
    // ส่ง heartbeat ทุก 30 วินาที
    if (millis() - last_heartbeat_time >= heartbeat_interval) {
        last_heartbeat_time = millis();
        sendGatewayHeartbeat();
    }
    
    delay(10);
} 