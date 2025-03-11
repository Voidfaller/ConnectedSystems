#include <Arduino.h>
#include <ArduinoMqttClient.h>
#include <WiFi.h>

const char* ssid = "Mees";
const char* password = "sexiestmfalive";

WiFiClient wifiClient;
MqttClient mqttClient = MqttClient(wifiClient);

void processMessage(int messageSize);

void setup() {
  Serial.begin(115200);
  Serial.println("Hello, World!");
  
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(100);
  }
  Serial.println("\nConnected to WiFi ");

  // Setting up MQTT client: connecting and subscribing
  Serial.print("Connecting to MQTT broker");
  while (!mqttClient.connect("test.mosquitto.org", 1883)) {
    Serial.print(".");
    delay(100);
  }
  Serial.println("\nConnected to MQTT broker");

  mqttClient.subscribe("test/topic");
  Serial.println("Subscribed to topic: test/topic");

  // MQTT event handlers
  mqttClient.onMessage(processMessage);
}

void loop() {
  // put your main code here, to run repeatedly:
  mqttClient.poll();
}

/* Function Definitions */
void processMessage(int messageSize) {
  // we received a message, print out the topic and contents
  Serial.println("Received a message with topic '");
  Serial.print(mqttClient.messageTopic());
  Serial.print("', length ");
  Serial.print(messageSize);
  Serial.println(" bytes:");

  // use the Stream interface to print the contents
  while (mqttClient.available()) {
    Serial.print((char)mqttClient.read());
  }
  Serial.println();

  Serial.println();
}