#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Project_Detection_DATASET__inferencing.h>
#include "edge-impulse-sdk/dsp/image/image.hpp"
#include "esp_camera.h"
#include <time.h>  // เพิ่มสำหรับ NTP time sync

// ==================== Camera Model Definition ====================
#define CAMERA_MODEL_AI_THINKER
#if defined(CAMERA_MODEL_AI_THINKER)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#else
#error "Camera model not selected"
#endif

// ==================== Edge Impulse Configuration ====================
#define EI_CAMERA_RAW_FRAME_BUFFER_COLS           320
#define EI_CAMERA_RAW_FRAME_BUFFER_ROWS           240
#define EI_CAMERA_FRAME_BYTE_SIZE                 3

static bool debug_nn = false;
static bool is_initialised = false;
uint8_t *snapshot_buf;

// ==================== Camera Configuration ====================
static camera_config_t camera_config = {
    .pin_pwdn = PWDN_GPIO_NUM,
    .pin_reset = RESET_GPIO_NUM,
    .pin_xclk = XCLK_GPIO_NUM,
    .pin_sscb_sda = SIOD_GPIO_NUM,
    .pin_sscb_scl = SIOC_GPIO_NUM,
    .pin_d7 = Y9_GPIO_NUM,
    .pin_d6 = Y8_GPIO_NUM,
    .pin_d5 = Y7_GPIO_NUM,
    .pin_d4 = Y6_GPIO_NUM,
    .pin_d3 = Y5_GPIO_NUM,
    .pin_d2 = Y4_GPIO_NUM,
    .pin_d1 = Y3_GPIO_NUM,
    .pin_d0 = Y2_GPIO_NUM,
    .pin_vsync = VSYNC_GPIO_NUM,
    .pin_href = HREF_GPIO_NUM,
    .pin_pclk = PCLK_GPIO_NUM,
    .xclk_freq_hz = 20000000,
    .ledc_timer = LEDC_TIMER_0,
    .ledc_channel = LEDC_CHANNEL_0,
    .pixel_format = PIXFORMAT_JPEG,
    .frame_size = FRAMESIZE_QVGA,
    .jpeg_quality = 12,
    .fb_count = 1,
    .fb_location = CAMERA_FB_IN_PSRAM,
    .grab_mode = CAMERA_GRAB_WHEN_EMPTY,
};

// ==================== Network Configuration ====================
const char* ssid = "Kanchada_2.4G";                          // อัปเดตตามเว็บไซต์
const char* password = "kan123456789";                       // อัปเดตตามเว็บไซต์
const char* gatewayURL = "http://172.20.10.4/detection";     // ESP32 Gateway IP
const char* device_id = "ESP32_Camera_AI";
const char* location = "Front Door";

// ==================== NTP Configuration ====================
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7 * 3600;  // GMT+7 สำหรับประเทศไทย
const int daylightOffset_sec = 0;     // ไม่มี daylight saving ในไทย

// ==================== Timing Configuration ====================
unsigned long last_capture_time = 0;
const unsigned long capture_interval = 30000; // 30 วินาที (สำหรับทดสอบ)
unsigned long last_human_detection = 0;
const unsigned long human_cooldown = 0; // ปิด cooldown สำหรับทดสอบ email

// ==================== Statistics ====================
struct Statistics {
    unsigned long totalDetections;
    unsigned long humanDetections;
    unsigned long requestsSent;
    unsigned long errors;
    unsigned long aiProcessingTime;
} stats = {0, 0, 0, 0, 0};

// ==================== Function Declarations ====================
bool ei_camera_init(void);
void ei_camera_deinit(void);
bool ei_camera_capture(uint32_t img_width, uint32_t img_height, uint8_t *out_buf);
static int ei_camera_get_data(size_t offset, size_t length, float *out_ptr);
void setupNTP(void);
String getCurrentTimestamp(void);

// ==================== WiFi Connection ====================
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
        Serial.print("📡 Camera IP: ");
        Serial.println(WiFi.localIP());
        Serial.print("📶 Signal Strength: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
    } else {
        Serial.println();
        Serial.println("❌ WiFi connection failed!");
    }
}

// ==================== Send Detection Results to Gateway ====================
void sendDetectionToGateway(ei_impulse_result_t result) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ WiFi not connected, cannot send data");
        stats.errors++;
        return;
    }
    
    HTTPClient http;
    http.begin(gatewayURL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(15000); // 15 second timeout
    
    // Initialize detection variables
    bool humanDetected = false;
    float highestConfidence = 0.0;
    String detectedObjects = "";
    
    Serial.println("🔍 === PROCESSING AI RESULTS ===");
    Serial.printf("📦 Total bounding boxes: %d\n", result.bounding_boxes_count);
    
    // First pass: Process bounding boxes and determine human detection
#if EI_CLASSIFIER_OBJECT_DETECTION == 1
    for (uint32_t i = 0; i < result.bounding_boxes_count; i++) {
        ei_impulse_result_bounding_box_t bb = result.bounding_boxes[i];
        if (bb.value == 0) continue;
        
        Serial.printf("🔍 Object %d: '%s' (confidence: %.1f%%)\n", i + 1, bb.label, bb.value * 100);
        
        // Check for human detection (case-insensitive)
        String labelLower = String(bb.label);
        labelLower.toLowerCase();
        
        if (labelLower == "human" || labelLower == "person") {
            Serial.printf("👤 Found human/person label with %.1f%% confidence\n", bb.value * 100);
            if (bb.value > 0.5) { // ✅ ใช้ threshold 50% สำหรับการใช้งานจริง
                humanDetected = true;
                if (bb.value > highestConfidence) {
                    highestConfidence = bb.value;
                }
                Serial.printf("✅ Human detection confirmed! (%.1f%% > 50%)\n", bb.value * 100);
            } else {
                Serial.printf("❌ Human confidence too low (%.1f%% < 50%)\n", bb.value * 100);
            }
        } else {
            Serial.printf("📦 Non-human object: %s\n", bb.label);
        }
        
        // Collect all detected objects
        if (detectedObjects.length() > 0) detectedObjects += ", ";
        detectedObjects += String(bb.label) + " (" + String((int)(bb.value * 100)) + "%)";
    }
#endif
    
    // Show final detection results
    Serial.println("📋 === FINAL DETECTION RESULTS ===");
    Serial.printf("🚨 Human Detected: %s\n", humanDetected ? "TRUE" : "FALSE");
    Serial.printf("🎯 Highest Confidence: %.1f%%\n", highestConfidence * 100);
    Serial.printf("👁️ Detected Objects: %s\n", detectedObjects.length() > 0 ? detectedObjects.c_str() : "none");
    Serial.println("===================================");
    
    // Create detailed JSON payload
    DynamicJsonDocument doc(2048);
    doc["device_id"] = device_id;
    doc["location"] = location;
    doc["timestamp"] = getCurrentTimestamp();  // ✅ ใช้เวลาจริงจาก NTP
    doc["camera_uptime"] = millis();
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["ai_model"] = "Edge_Impulse_Real";
    
    // Processing times
    doc["dsp_time"] = result.timing.dsp;
    doc["classification_time"] = result.timing.classification;
    doc["anomaly_time"] = result.timing.anomaly;
    doc["total_processing_time"] = result.timing.dsp + result.timing.classification + result.timing.anomaly;
    
    // Object detection results
    doc["bounding_boxes_count"] = result.bounding_boxes_count;
    
    // Create array for bounding boxes
    JsonArray boxes = doc.createNestedArray("bounding_boxes");
    
#if EI_CLASSIFIER_OBJECT_DETECTION == 1
    for (uint32_t i = 0; i < result.bounding_boxes_count; i++) {
        ei_impulse_result_bounding_box_t bb = result.bounding_boxes[i];
        if (bb.value == 0) continue;
        
        // Add to bounding boxes array
        JsonObject box = boxes.createNestedObject();
        box["label"] = bb.label;
        box["confidence"] = bb.value;
        box["x"] = bb.x;
        box["y"] = bb.y;
        box["width"] = bb.width;
        box["height"] = bb.height;
    }
#endif
    
    // Main detection results (for compatibility with web server)
    doc["human_detected"] = humanDetected;
    doc["confidence"] = highestConfidence;
    doc["detected_objects"] = detectedObjects.length() > 0 ? detectedObjects : "none";
    doc["alert_required"] = humanDetected;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Check human detection cooldown
    unsigned long currentTime = millis();
    bool shouldSendHumanAlert = false;
    bool shouldSendRegularData = false;
    
    if (humanDetected) {
        // ตรวจสอบ cooldown period สำหรับ human detection
        if (currentTime - last_human_detection >= human_cooldown) {
            shouldSendHumanAlert = true;
            last_human_detection = currentTime;
            Serial.println("🚨 HUMAN DETECTED! Sending URGENT alert to Gateway...");
            stats.humanDetections++;
        } else {
            unsigned long timeLeft = (human_cooldown - (currentTime - last_human_detection)) / 1000;
            Serial.printf("⏳ Human detected but in cooldown period (%lu seconds left)\n", timeLeft);
            Serial.println("📝 Logging detection but not sending alert");
        }
    } else {
        // สำหรับทดสอบ email: ส่งข้อมูลทุกครั้ง
        shouldSendRegularData = true;
        Serial.println("📤 Sending 'No Human' data for testing...");
    }
    
    // สำหรับทดสอบ email: ส่งข้อมูลทุกครั้ง
    if (!shouldSendHumanAlert && !shouldSendRegularData) {
        shouldSendRegularData = true; // บังคับส่งเพื่อทดสอบ
        Serial.println("🧪 FORCED SEND for email testing");
    }
    
    Serial.println("📄 Payload: " + jsonString);
    Serial.printf("🌐 Gateway URL: %s\n", gatewayURL);
    
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("✅ Gateway Response: %d\n", httpResponseCode);
        Serial.println("📨 Response: " + response);
        
        if (humanDetected) {
            Serial.println("🚨 Human detection alert sent to Gateway!");
        }
        
        stats.requestsSent++;
    } else {
        Serial.printf("❌ Gateway Error: %d\n", httpResponseCode);
        Serial.println("🔄 Will retry on next detection cycle");
        stats.errors++;
    }
    
    http.end();
}

// ==================== Print Statistics ====================
void printStatistics() {
    Serial.println("📊 === AI CAMERA STATISTICS ===");
    Serial.printf("📈 Total Detections: %lu\n", stats.totalDetections);
    Serial.printf("🚨 Human Detections: %lu\n", stats.humanDetections);
    Serial.printf("📤 Requests Sent: %lu\n", stats.requestsSent);
    Serial.printf("❌ Errors: %lu\n", stats.errors);
    Serial.printf("🧠 Avg AI Processing: %lu ms\n", 
                  stats.totalDetections > 0 ? stats.aiProcessingTime / stats.totalDetections : 0);
    
    if (stats.totalDetections > 0) {
        Serial.printf("🎯 Human Detection Rate: %.1f%%\n", 
                      (float)stats.humanDetections / stats.totalDetections * 100);
        Serial.printf("✅ Success Rate: %.1f%%\n", 
                      (float)stats.requestsSent / stats.totalDetections * 100);
    }
    
    Serial.printf("💾 Free Heap: %lu bytes\n", ESP.getFreeHeap());
    Serial.printf("⏱️ Uptime: %.1f minutes\n", millis() / 60000.0);
    Serial.println("==============================");
}

// ==================== Setup Function ====================
void setup() {
    Serial.begin(115200);
    delay(2000);
    
    Serial.println("🚀 ESP32 Camera with Edge Impulse AI - Human Detection System");
    Serial.println("==============================================================");
    Serial.printf("📍 Device ID: %s\n", device_id);
    Serial.printf("📍 Location: %s\n", location);
    Serial.printf("🌐 Gateway URL: %s\n", gatewayURL);
    Serial.printf("⏱️ Detection Interval: %lu seconds (FAST TEST MODE)\n", capture_interval / 1000);
    Serial.printf("🔄 Human Alert Cooldown: %lu seconds (FAST TEST MODE)\n", human_cooldown / 1000);
    Serial.printf("🎯 Human Confidence Threshold: 50%% (PRODUCTION MODE)\n");
    Serial.printf("🧠 AI Model: Edge Impulse Real Detection\n");
    Serial.println("==============================================================");
    
    // Connect to WiFi
    connectToWiFi();
    
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ WiFi connection required! Restarting...");
        delay(5000);
        ESP.restart();
    }

    // Setup NTP for accurate time
    setupNTP();
    
    // Initialize Edge Impulse Camera
    if (!ei_camera_init()) {
        Serial.println("❌ Failed to initialize Edge Impulse Camera! Restarting...");
        delay(5000);
        ESP.restart();
    } else {
        Serial.println("✅ Edge Impulse Camera initialized successfully");
    }
    
    Serial.println("🔍 Starting human detection with real AI...\n");
    ei_sleep(2000);
}

// ==================== Main Loop ====================
void loop() {
    unsigned long currentTime = millis();
    
    // Check if it's time for detection
    if (currentTime - last_capture_time >= capture_interval) {
        last_capture_time = currentTime;
        
        Serial.println("⏰ AI Detection cycle started");
        Serial.printf("🕐 Current time: %lu ms\n", currentTime);
        
        // Check WiFi connection
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("🔄 WiFi disconnected, reconnecting...");
            connectToWiFi();
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            // Perform Edge Impulse AI detection
            if (ei_sleep(5) != EI_IMPULSE_OK) {
                Serial.println("❌ Sleep failed");
                stats.errors++;
                return;
            }
            
            // Allocate snapshot buffer
            snapshot_buf = (uint8_t*)malloc(EI_CAMERA_RAW_FRAME_BUFFER_COLS * EI_CAMERA_RAW_FRAME_BUFFER_ROWS * EI_CAMERA_FRAME_BYTE_SIZE);
            if (snapshot_buf == nullptr) {
                Serial.println("❌ Failed to allocate snapshot buffer!");
                stats.errors++;
                return;
            }
            
            // Setup signal
            ei::signal_t signal;
            signal.total_length = EI_CLASSIFIER_INPUT_WIDTH * EI_CLASSIFIER_INPUT_HEIGHT;
            signal.get_data = &ei_camera_get_data;
            
            // Capture image
            if (!ei_camera_capture(EI_CLASSIFIER_INPUT_WIDTH, EI_CLASSIFIER_INPUT_HEIGHT, snapshot_buf)) {
                Serial.println("❌ Failed to capture image");
                free(snapshot_buf);
                stats.errors++;
                return;
            }
            
            // Run AI classifier
            unsigned long ai_start = millis();
            ei_impulse_result_t result = { 0 };
            EI_IMPULSE_ERROR err = run_classifier(&signal, &result, debug_nn);
            unsigned long ai_time = millis() - ai_start;
            
            if (err != EI_IMPULSE_OK) {
                Serial.printf("❌ Failed to run classifier (%d)\n", err);
                free(snapshot_buf);
                stats.errors++;
                return;
            }
            
            stats.totalDetections++;
            stats.aiProcessingTime += ai_time;
            
            // Display results in Serial Monitor
            Serial.printf("🧠 AI Results (DSP: %d ms, Classification: %d ms, Anomaly: %d ms, Total: %lu ms): \n",
                          result.timing.dsp, result.timing.classification, result.timing.anomaly, ai_time);
            
        #if EI_CLASSIFIER_OBJECT_DETECTION == 1
            Serial.println("🎯 Object detection bounding boxes:");
            bool foundHuman = false;
            float highestConfidence = 0.0;  // ประกาศตัวแปรที่ขาดหาย
            for (uint32_t i = 0; i < result.bounding_boxes_count; i++) {
                ei_impulse_result_bounding_box_t bb = result.bounding_boxes[i];
                if (bb.value == 0) continue;
                
                if (strcmp(bb.label, "human") == 0 || strcmp(bb.label, "person") == 0) {
                    if (bb.value > 0.5) {
                        foundHuman = true;
                        if (bb.value > highestConfidence) {
                            highestConfidence = bb.value;  // อัปเดตค่าสูงสุด
                        }
                        Serial.printf("🚨 HUMAN: %s (%.1f%%) [x:%u, y:%u, w:%u, h:%u]\n",
                                      bb.label, bb.value * 100, bb.x, bb.y, bb.width, bb.height);
                    } else {
                        Serial.printf("👤 %s (%.1f%%) [x:%u, y:%u, w:%u, h:%u] - Low confidence\n",
                                      bb.label, bb.value * 100, bb.x, bb.y, bb.width, bb.height);
                    }
                } else {
                    Serial.printf("📦 %s (%.1f%%) [x:%u, y:%u, w:%u, h:%u]\n",
                                  bb.label, bb.value * 100, bb.x, bb.y, bb.width, bb.height);
                }
            }
            
                         if (!foundHuman && result.bounding_boxes_count > 0) {
                 Serial.println("👍 No human detected (other objects found)");
             } else if (result.bounding_boxes_count == 0) {
                 Serial.println("👍 No objects detected");
             }
             
             // Summary of detection
             Serial.println("📋 === DETECTION SUMMARY ===");
             Serial.printf("🎯 Total Objects Found: %d\n", result.bounding_boxes_count);
             Serial.printf("🚨 Human Detected: %s\n", foundHuman ? "YES" : "NO");
             if (foundHuman) {
                 Serial.printf("🎯 Highest Confidence: %.1f%%\n", highestConfidence * 100);
             }
             Serial.println("=============================");
        #endif
            
            // Send results to Gateway
            sendDetectionToGateway(result);
            
            // Clean up
            free(snapshot_buf);
            
            Serial.printf("⏳ Next AI detection in %lu seconds (FAST TEST MODE)\n", capture_interval / 1000);
        } else {
            Serial.println("❌ Cannot perform AI detection without WiFi");
            stats.errors++;
        }
        
        Serial.println(""); // Empty line for readability
    }
    
    // Print statistics every 5 minutes
    static unsigned long lastStatsTime = 0;
    if (currentTime - lastStatsTime >= 300000) { // 5 minutes
        printStatistics();
        lastStatsTime = currentTime;
    }
    
    // Small delay to prevent watchdog issues
    delay(100);
}

// ==================== Edge Impulse Camera Functions ====================
bool ei_camera_init(void) {
    if (is_initialised) return true;
    
    esp_err_t err = esp_camera_init(&camera_config);
    if (err != ESP_OK) {
        Serial.printf("❌ Camera init failed with error 0x%x\n", err);
        return false;
    }
    
    sensor_t * s = esp_camera_sensor_get();
    if (s->id.PID == OV3660_PID) {
        s->set_vflip(s, 1);
        s->set_brightness(s, 1);
        s->set_saturation(s, 0);
    }
    
    is_initialised = true;
    return true;
}

void ei_camera_deinit(void) {
    esp_err_t err = esp_camera_deinit();
    if (err != ESP_OK) {
        Serial.println("❌ Camera deinit failed");
    }
    is_initialised = false;
}

bool ei_camera_capture(uint32_t img_width, uint32_t img_height, uint8_t *out_buf) {
    bool do_resize = false;
    
    if (!is_initialised) {
        Serial.println("❌ Camera is not initialized");
        return false;
    }
    
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("❌ Camera capture failed");
        return false;
    }
    
    bool converted = fmt2rgb888(fb->buf, fb->len, PIXFORMAT_JPEG, snapshot_buf);
    esp_camera_fb_return(fb);
    
    if (!converted) {
        Serial.println("❌ Image conversion failed");
        return false;
    }
    
    if ((img_width != EI_CAMERA_RAW_FRAME_BUFFER_COLS) || (img_height != EI_CAMERA_RAW_FRAME_BUFFER_ROWS)) {
        do_resize = true;
    }
    
    if (do_resize) {
        ei::image::processing::crop_and_interpolate_rgb888(
            out_buf, EI_CAMERA_RAW_FRAME_BUFFER_COLS, EI_CAMERA_RAW_FRAME_BUFFER_ROWS,
            out_buf, img_width, img_height);
    }
    
    return true;
}

static int ei_camera_get_data(size_t offset, size_t length, float *out_ptr) {
    size_t pixel_ix = offset * 3;
    size_t pixels_left = length;
    size_t out_ptr_ix = 0;
    
    while (pixels_left != 0) {
        out_ptr[out_ptr_ix] = (snapshot_buf[pixel_ix + 2] << 16) + 
                              (snapshot_buf[pixel_ix + 1] << 8) + 
                              snapshot_buf[pixel_ix];
        out_ptr_ix++;
        pixel_ix += 3;
        pixels_left--;
    }
    return 0;
}

// ==================== NTP Time Functions ====================
void setupNTP() {
    Serial.println("🕐 Setting up NTP time sync...");
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    
    // รอให้ NTP sync เสร็จ
    Serial.print("🔄 Waiting for NTP time sync");
    int attempts = 0;
    while (!time(nullptr) && attempts < 10) {
        delay(1000);
        Serial.print(".");
        attempts++;
    }
    
    if (time(nullptr)) {
        Serial.println();
        Serial.println("✅ NTP time synchronized!");
        Serial.print("🕐 Current time: ");
        Serial.println(getCurrentTimestamp());
    } else {
        Serial.println();
        Serial.println("❌ NTP time sync failed!");
    }
}

String getCurrentTimestamp() {
    time_t now;
    struct tm timeinfo;
    time(&now);
    localtime_r(&now, &timeinfo);
    
    // สร้าง timestamp ในรูปแบบ ISO 8601 (2023-12-07T14:30:45+07:00)
    char timestamp[32];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%S+07:00", &timeinfo);
    return String(timestamp);
}
