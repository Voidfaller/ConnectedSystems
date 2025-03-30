#include <Arduino.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFi.h>

#define BUTTON_PIN 12
#define NORTH_LED_PIN 26
#define EAST_LED_PIN 25
#define SOUTH_LED_PIN 33
#define WEST_LED_PIN 32

const int LED_PINS[] = {NORTH_LED_PIN, EAST_LED_PIN, SOUTH_LED_PIN, WEST_LED_PIN};

const char *ssid = "Mees";
const char *password = "meeskees";

WiFiClient wifiClient;
PubSubClient client = PubSubClient(wifiClient);

IPAddress server(192,168,68,58); // MQTT broker IP address

const char *position_topic = "robots/position/robot_1";
const char *system_topic = "system/powerControl";

void processMessage(int messageSize);
void processDirection(String direction);
void setDirection(int pin);
void gpioInit();
void reconnect();
void wifiInit();
void callback(char *topic, byte *payload, unsigned int length);

void setup()
{
  Serial.begin(115200);
  Serial.println("Hello, World!");

  wifiInit();
  gpioInit();

  // Setting up MQTT client: connecting and subscribing
  client.setServer(server, 1883);
  client.setCallback(callback);
}

void loop()
{
  // put your main code here, to run repeatedly:
  if (!client.connected())
  {
    reconnect();
  }

  client.loop();

  if(digitalRead(BUTTON_PIN) == 0)
  {
    Serial.println("Button pressed, sending message to MQTT broker");
    JsonDocument doc;
    doc["state"] = 0;
    serializeJson(doc, Serial);
    client.publish(system_topic, doc.as<String>().c_str());
    delay(100); // Debounce delay
  }
}

/* Function Definitions */
void reconnect()
{
  // Loop until we're reconnected
  while (!client.connected())
  {
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    if (client.connect("Physical-module"))
    {
      Serial.println("connected");
      client.subscribe(position_topic);
      client.subscribe(system_topic);
    }
    else
    {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}

void callback(char *topic, byte *payload, unsigned int length)
{
  if (strcmp(topic, position_topic) == 0)
  {
    Serial.println("Position message received");

    String message = "";
    for (int i = 0; i < length; i++)
    {
      message += (char)payload[i];
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, message);
    if (error) {
      Serial.print(F("deserializeJson() failed: "));
      Serial.println(error.f_str());
      return;
    }

    String direction = doc["direction"];
    processDirection(direction);
    Serial.println("Direction: " + direction);
  }
  else
  {
    return;
  }
}

void processDirection(String direction)
{
  if (direction == "north")
  {
    setDirection(NORTH_LED_PIN);
  }
  else if (direction == "east")
  {
    setDirection(EAST_LED_PIN);
  }
  else if (direction == "south")
  {
    setDirection(SOUTH_LED_PIN);
  }
  else if (direction == "west")
  {
    setDirection(WEST_LED_PIN);
  }
  else
  {
    Serial.println("Invalid direction received: " + direction);
    for(int i=0; i < sizeof(LED_PINS) / sizeof(LED_PINS[0]); i++){
      digitalWrite(LED_PINS[i], HIGH);
    }
  }
}

void gpioInit()
{
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(NORTH_LED_PIN, OUTPUT);
  pinMode(EAST_LED_PIN, OUTPUT);
  pinMode(SOUTH_LED_PIN, OUTPUT);
  pinMode(WEST_LED_PIN, OUTPUT);
}

void setDirection(int pin){
  for(int i=0; i < sizeof(LED_PINS) / sizeof(LED_PINS[0]); i++){
    if(LED_PINS[i] == pin){
      digitalWrite(pin, HIGH);
    }else{
      digitalWrite(LED_PINS[i], LOW);
    }
  }
}

void wifiInit()
{
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print(".");
    delay(100);
  }
  Serial.println("\nConnected to WiFi ");
}