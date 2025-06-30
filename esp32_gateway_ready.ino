#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <esp_timer.h>

// ==================== กำหนดค่า WiFi ====================
const char* ssid = "Kanchada_2.4G";           // เปลี่ยนตาม WiFi ของคุณ
const char* password = "kan123456789";         // เปลี่ยนตาม WiFi ของคุณ

// ==================== กำหนดค่า Server ====================
const char* webServerURL = "https://web-xdtm.onrender.com/api/detection";
const char* heartbeatURL = "https://web-xdtm.onrender.com/api/esp32/heartbeat";
const char* device_id = "ESP32_Gateway";
const char* location = "Gateway Hub";
const char* device_type = "gateway";

// ==================== กำหนดค่า Timing ====================
const unsigned long heartbeatInterval = 90000; // 90 วินาที (ให้เหมาะกับ Render Free Plan)
unsigned long lastHeartbeatTime = 0;

// ==================== กำหนดค่า Web Server ====================
WebServer server(80);

// ==================== สถิติการใช้งาน ====================
struct UsageStats {
  unsigned long totalRequests;
  unsigned long dailyRequests;
  unsigned long humanAlerts;
  unsigned long heartbeatsSent;
  unsigned long lastResetTime;
  unsigned long errors;
} stats = {0, 0, 0, 0, 0, 0};

// ==================== ฟังก์ชัน WiFi Connection ====================
void connectToWiFi() {
  Serial.print("🔗 Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi connected!");
    Serial.print("📡 IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("📶 RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection failed!");
  }
}

// ==================== ฟังก์ชัน Send Heartbeat ====================
void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, cannot send heartbeat");
    return;
  }
  
  HTTPClient http;
  http.begin(heartbeatURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000); // 15 second timeout
  
  // Create JSON payload
  DynamicJsonDocument doc(512);
  doc["device_id"] = device_id;
  doc["timestamp"] = millis();
  doc["location"] = location;
  doc["version"] = "2.0.0";
  doc["wifi_strength"] = WiFi.RSSI();
  doc["uptime"] = millis();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["device_type"] = device_type;
  doc["status"] = "active";
  doc["total_requests"] = stats.totalRequests;
  doc["human_alerts"] = stats.humanAlerts;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("💓 Sending heartbeat to web server...");
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✅ Heartbeat sent: %d\n", httpResponseCode);
    Serial.println("📨 Response: " + response);
    stats.heartbeatsSent++;
  } else {
    Serial.printf("❌ Heartbeat failed: %d\n", httpResponseCode);
    stats.errors++;
  }
  
  http.end();
}

// ==================== ฟังก์ชัน Forward Detection Data ====================
void forwardDetectionData(String jsonData) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, cannot forward data");
    stats.errors++;
    return;
  }
  
  HTTPClient http;
  http.begin(webServerURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000); // 15 second timeout
  
  Serial.println("📤 Forwarding detection data to web server...");
  Serial.println("📄 Payload: " + jsonData);
  
  int httpResponseCode = http.POST(jsonData);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✅ Data forwarded: %d\n", httpResponseCode);
    Serial.println("📨 Server response: " + response);
    stats.totalRequests++;
    stats.dailyRequests++;
  } else {
    Serial.printf("❌ Forward failed: %d\n", httpResponseCode);
    stats.errors++;
  }
  
  http.end();
}

// ==================== ฟังก์ชัน Handle Detection API ====================
void handleDetection() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }
  
  String body = server.arg("plain");
  Serial.println("📥 Received detection data from camera:");
  Serial.println("📍 From IP: " + server.client().remoteIP().toString());
  
  // Parse JSON to validate (increased buffer for Edge Impulse data)
  DynamicJsonDocument doc(2048);
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    Serial.println("❌ Invalid JSON received: " + String(error.c_str()));
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }
  
  // Extract key information for logging
  bool isHumanDetected = doc["human_detected"] | false;
  String aiModel = doc["ai_model"] | "Unknown";
  int boundingBoxes = doc["bounding_boxes_count"] | 0;
  float confidence = doc["confidence"] | 0.0;
  
  if (isHumanDetected) {
    Serial.println("🚨 HUMAN ALERT received from " + aiModel + " AI!");
    Serial.printf("🎯 Confidence: %.1f%%, Bounding Boxes: %d\n", confidence * 100, boundingBoxes);
    stats.humanAlerts++;
    
    // Log bounding box details if available
    if (doc.containsKey("bounding_boxes") && doc["bounding_boxes"].is<JsonArray>()) {
      JsonArray boxes = doc["bounding_boxes"];
      Serial.println("📦 Detected Objects:");
      for (JsonVariant box : boxes) {
        String label = box["label"] | "unknown";
        float boxConf = box["confidence"] | 0.0;
        int x = box["x"] | 0;
        int y = box["y"] | 0;
        int w = box["width"] | 0;
        int h = box["height"] | 0;
        
        if (label == "human" || label == "person") {
          Serial.printf("🚨 %s: %.1f%% [x:%d, y:%d, w:%d, h:%d]\n", label.c_str(), boxConf * 100, x, y, w, h);
        } else {
          Serial.printf("📦 %s: %.1f%% [x:%d, y:%d, w:%d, h:%d]\n", label.c_str(), boxConf * 100, x, y, w, h);
        }
      }
    }
  } else {
    Serial.printf("👍 No human detected by %s AI (Boxes: %d)\n", aiModel.c_str(), boundingBoxes);
  }
  
  // Add processing time info if available
  if (doc.containsKey("dsp_time") && doc.containsKey("classification_time")) {
    int dspTime = doc["dsp_time"] | 0;
    int classTime = doc["classification_time"] | 0;
    int anomalyTime = doc["anomaly_time"] | 0;
    Serial.printf("⏱️ AI Processing: DSP=%dms, Class=%dms, Anomaly=%dms\n", dspTime, classTime, anomalyTime);
  }
  
  // Add gateway information
  doc["forwarded_by"] = device_id;
  doc["gateway_timestamp"] = millis();
  doc["gateway_ip"] = WiFi.localIP().toString();
  doc["gateway_version"] = "2.0.0";
  
  // Convert back to JSON
  String forwardData;
  serializeJson(doc, forwardData);
  
  // Forward to web server
  forwardDetectionData(forwardData);
  
  // Respond to camera
  DynamicJsonDocument responseDoc(512);
  responseDoc["success"] = true;
  responseDoc["message"] = "AI detection data forwarded successfully";
  responseDoc["gateway_id"] = device_id;
  responseDoc["timestamp"] = millis();
  responseDoc["human_detected"] = isHumanDetected;
  responseDoc["boxes_processed"] = boundingBoxes;
  responseDoc["ai_model_received"] = aiModel;
  
  String response;
  serializeJson(responseDoc, response);
  
  server.send(200, "application/json", response);
  
  if (isHumanDetected) {
    Serial.println("🚨 Human alert forwarded to web server!");
    Serial.println("📧 Web Server should trigger EMAIL notification now!");
    Serial.printf("🎯 Alert Details: Confidence=%.1f%%, Boxes=%d\n", confidence * 100, boundingBoxes);
  } else {
    Serial.println("📤 AI detection data forwarded to web server");
    Serial.println("📝 No email expected (human_detected = false)");
  }
  
  // Additional debug info
  Serial.println("🔍 === GATEWAY FORWARD SUMMARY ===");
  Serial.printf("🚨 Human Detected: %s\n", isHumanDetected ? "TRUE" : "FALSE");
  Serial.printf("🎯 Confidence: %.1f%%\n", confidence * 100);
  Serial.printf("📦 Bounding Boxes: %d\n", boundingBoxes);
  Serial.printf("🤖 AI Model: %s\n", aiModel.c_str());
  Serial.println("====================================");
}

// ==================== ฟังก์ชัน Handle Status API ====================
void handleStatus() {
  DynamicJsonDocument doc(768);
  doc["device_id"] = device_id;
  doc["status"] = "online";
  doc["uptime"] = millis();
  doc["uptime_hours"] = millis() / 3600000.0;
  doc["free_heap"] = ESP.getFreeHeap();
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["wifi_ip"] = WiFi.localIP().toString();
  doc["total_requests"] = stats.totalRequests;
  doc["daily_requests"] = stats.dailyRequests;
  doc["human_alerts"] = stats.humanAlerts;
  doc["heartbeats_sent"] = stats.heartbeatsSent;
  doc["errors"] = stats.errors;
  doc["device_type"] = device_type;
  doc["version"] = "2.0.0";
  doc["location"] = location;
  
  if (stats.totalRequests > 0) {
    doc["success_rate"] = ((float)(stats.totalRequests - stats.errors) / stats.totalRequests * 100);
  }
  
  String response;
  serializeJson(doc, response);
  
  server.send(200, "application/json", response);
  Serial.println("📊 Status requested from: " + server.client().remoteIP().toString());
}

// ==================== ฟังก์ชัน Handle Root ====================
void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<title>ESP32 Gateway - Human Detection System</title>";
  html += "<meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>";
  html += "body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }";
  html += ".container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }";
  html += "h1 { color: #333; text-align: center; margin-bottom: 30px; }";
  html += "h2 { color: #666; border-bottom: 2px solid #eee; padding-bottom: 5px; }";
  html += ".status { padding: 10px; border-radius: 5px; margin: 10px 0; }";
  html += ".online { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }";
  html += ".stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }";
  html += ".stat-box { padding: 15px; background: #f8f9fa; border-radius: 5px; text-align: center; }";
  html += ".stat-number { font-size: 24px; font-weight: bold; color: #007bff; }";
  html += ".api-list { background: #f8f9fa; padding: 15px; border-radius: 5px; }";
  html += ".refresh-btn { display: block; margin: 20px auto; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }";
  html += "</style></head><body>";
  
  html += "<div class='container'>";
  html += "<h1>🌐 ESP32 Gateway</h1>";
  html += "<div class='status online'>✅ Gateway Online</div>";
  
  html += "<h2>📊 System Information</h2>";
  html += "<div class='stats'>";
  html += "<div class='stat-box'>";
  html += "<div class='stat-number'>" + String(device_id) + "</div>";
  html += "<div>Device ID</div></div>";
  html += "<div class='stat-box'>";
  html += "<div class='stat-number'>" + String(millis() / 60000) + " min</div>";
  html += "<div>Uptime</div></div>";
  html += "<div class='stat-box'>";
  html += "<div class='stat-number'>" + String(ESP.getFreeHeap() / 1024) + " KB</div>";
  html += "<div>Free Memory</div></div>";
  html += "<div class='stat-box'>";
  html += "<div class='stat-number'>" + String(WiFi.RSSI()) + " dBm</div>";
  html += "<div>WiFi Signal</div></div>";
  html += "</div>";
  
  html += "<h2>📈 Usage Statistics</h2>";
  html += "<div class='stats'>";
  html += "<div class='stat-box'>";
  html += "<div class='stat-number'>" + String(stats.totalRequests) + "</div>";
  html += "<div>Total Requests</div></div>";
  html += "<div class='stat-box'>";
  html += "<div class='stat-number'>" + String(stats.dailyRequests) + "</div>";
  html += "<div>Daily Requests</div></div>";
  html += "<div class='stat-box'>";
  html += "<div class='stat-number'>" + String(stats.humanAlerts) + "</div>";
  html += "<div>🚨 Human Alerts</div></div>";
  html += "<div class='stat-box'>";
  html += "<div class='stat-number'>" + String(stats.heartbeatsSent) + "</div>";
  html += "<div>💓 Heartbeats</div></div>";
  html += "<div class='stat-box'>";
  html += "<div class='stat-number'>" + String(stats.errors) + "</div>";
  html += "<div>❌ Errors</div></div>";
  
  // Success rate calculation
  float successRate = 0;
  if (stats.totalRequests > 0) {
    successRate = ((float)(stats.totalRequests - stats.errors) / stats.totalRequests * 100);
  }
  html += "<div class='stat-box'>";
  html += "<div class='stat-number'>" + String((int)successRate) + "%</div>";
  html += "<div>✅ Success Rate</div></div>";
  html += "</div>";
  
  html += "<h2>🧠 AI System Status</h2>";
  html += "<div class='api-list'>";
  html += "<strong>AI Model:</strong> Edge Impulse Real Detection<br>";
  html += "<strong>Detection Method:</strong> Object Detection with Bounding Boxes<br>";
  html += "<strong>Human Detection:</strong> Active (Confidence > 75%)<br>";
  html += "<strong>Detection Interval:</strong> 30 seconds (FAST TEST MODE)<br>";
  html += "<strong>Human Alert Cooldown:</strong> 1 minute (FAST TEST MODE)<br>";
  html += "<strong>Processing:</strong> Real-time on ESP32 Camera<br>";
  html += "<strong>Alert System:</strong> Immediate forwarding to Web Server<br>";
  html += "<strong>Email Trigger:</strong> Web Server (when human_detected = true)<br>";
  html += "<strong>Data Flow:</strong> ESP32 Camera (AI) → Gateway → Web Server → Email";
  html += "</div>";
  
  html += "<h2>🔗 API Endpoints</h2>";
  html += "<div class='api-list'>";
  html += "<strong>POST /detection</strong> - Receive detection data from camera<br>";
  html += "<strong>GET /status</strong> - Get detailed system status<br>";
  html += "<strong>GET /</strong> - This web interface<br><br>";
  html += "<strong>Camera should POST to:</strong><br>";
  html += "http://" + WiFi.localIP().toString() + "/detection";
  html += "</div>";
  
  html += "<h2>🌐 Network Information</h2>";
  html += "<div class='api-list'>";
  html += "<strong>Gateway IP:</strong> " + WiFi.localIP().toString() + "<br>";
  html += "<strong>WiFi Network:</strong> " + String(ssid) + "<br>";
  html += "<strong>Web Server:</strong> " + String(webServerURL) + "<br>";
  html += "<strong>Location:</strong> " + String(location);
  html += "</div>";
  
  html += "<button class='refresh-btn' onclick='location.reload()'>🔄 Refresh</button>";
  html += "</div></body></html>";
  
  server.send(200, "text/html", html);
  Serial.println("🌐 Web interface accessed from: " + server.client().remoteIP().toString());
}

// ==================== ฟังก์ชัน Reset Daily Stats ====================
void resetDailyStats() {
  unsigned long currentTime = millis();
  // Reset daily stats every 24 hours (86400000 ms)
  if (stats.lastResetTime == 0) {
    stats.lastResetTime = currentTime;
  } else if (currentTime - stats.lastResetTime >= 86400000) {
    stats.dailyRequests = 0;
    stats.lastResetTime = currentTime;
    Serial.println("📊 Daily statistics reset");
  }
}

// ==================== ฟังก์ชัน Print Statistics ====================
void printStatistics() {
  Serial.println("📊 === GATEWAY STATISTICS ===");
  Serial.printf("📈 Total Requests: %lu\n", stats.totalRequests);
  Serial.printf("📊 Daily Requests: %lu\n", stats.dailyRequests);
  Serial.printf("🚨 Human Alerts: %lu\n", stats.humanAlerts);
  Serial.printf("💓 Heartbeats Sent: %lu\n", stats.heartbeatsSent);
  Serial.printf("❌ Errors: %lu\n", stats.errors);
  if (stats.totalRequests > 0) {
    Serial.printf("✅ Success Rate: %.1f%%\n", 
                  (float)(stats.totalRequests - stats.errors) / stats.totalRequests * 100);
  }
  Serial.printf("💾 Free Heap: %lu bytes\n", ESP.getFreeHeap());
  Serial.printf("⏱️ Uptime: %.1f hours\n", millis() / 3600000.0);
  Serial.printf("📶 WiFi RSSI: %d dBm\n", WiFi.RSSI());
  Serial.println("=============================");
}

// ==================== ฟังก์ชัน Setup ====================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("🚀 ESP32 Gateway - Human Detection System");
  Serial.println("==========================================");
  Serial.printf("📍 Device ID: %s\n", device_id);
  Serial.printf("📍 Location: %s\n", location);
  Serial.printf("🌐 Web Server URL: %s\n", webServerURL);
  Serial.printf("💓 Heartbeat URL: %s\n", heartbeatURL);
  Serial.printf("⏱️ Heartbeat Interval: %lu seconds\n", heartbeatInterval / 1000);
  Serial.println("==========================================");
  
  // Connect to WiFi
  connectToWiFi();
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi connection required! Restarting...");
    delay(5000);
    ESP.restart();
  }
  
  // Setup web server routes
  server.on("/", handleRoot);
  server.on("/detection", handleDetection);
  server.on("/status", handleStatus);
  
  // Handle 404
  server.onNotFound([]() {
    server.send(404, "text/plain", "404: Not Found");
  });
  
  // Start web server
  server.begin();
  Serial.println("🌐 HTTP server started");
  Serial.printf("📡 Gateway IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.println("🔗 Camera should POST to: http://" + WiFi.localIP().toString() + "/detection");
  Serial.println("🌐 Web interface: http://" + WiFi.localIP().toString());
  
  // Initialize stats
  stats.lastResetTime = millis();
  
  Serial.println("✅ System initialized successfully!");
  Serial.println("🔍 Ready to receive detection data...\n");
}

// ==================== ฟังก์ชัน Main Loop ====================
void loop() {
  unsigned long currentTime = millis();
  
  // Handle web server clients
  server.handleClient();
  
  // Send heartbeat
  if (currentTime - lastHeartbeatTime >= heartbeatInterval) {
    // Check WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("🔄 WiFi disconnected, reconnecting...");
      connectToWiFi();
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      sendHeartbeat();
    }
    
    lastHeartbeatTime = currentTime;
  }
  
  // Reset daily stats
  resetDailyStats();
  
  // Print stats every 10 minutes
  static unsigned long lastStatsTime = 0;
  if (currentTime - lastStatsTime >= 600000) { // 10 minutes
    printStatistics();
    lastStatsTime = currentTime;
  }
  
  // Small delay to prevent watchdog issues
  delay(100);
}
