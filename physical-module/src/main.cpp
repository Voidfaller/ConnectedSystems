#include <Arduino.h>
#include <PubSubClient.h>
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

IPAddress server(192,168,183,138); // MQTT broker IP address

const char *position_topic = "robots/position/robot_1";
const char *system_topic = "system/powerControl";

void sendStopJson(const char *topic, const char *key, int value);
void processMessage(int messageSize);
void processDirection(String direction);
void setDirection(int pin);
void gpioInit();
void reconnect();
void wifiInit();
void callback(char *topic, byte *payload, unsigned int length);

unsigned long lastButtonPress = 0;

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
  if (!client.connected())
  {
    reconnect();
  }

  client.loop();

  if (digitalRead(BUTTON_PIN) == 0 && millis() - lastButtonPress > 1000)
  {
    lastButtonPress = millis();
    Serial.println("Button pressed, sending message to MQTT broker");
    sendStopJson(system_topic, "state", 0);
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

void replace(char *string, char target, char replacement = '\0') {
  int j = 0;
  for (int i = 0; i < strlen(string); i++) {
    if (string[i] != target) {
      string[j++] = string[i];
    } else if (replacement != '\0') {
      string[j++] = replacement; // Voeg het vervangende teken toe
    }
  }
  string[j] = '\0'; // Zorg voor een null-terminatie
}

void split_to_words(const char *delimiter, char *message, char words[][50])
{
  // Function to split a message based on " " that returns a string array of words
  int i = 0;

  // Filter the json "{" and "}" out
  if (message[0] == '{')
    message[0] = '\0';

  size_t messageLength = strlen(message);
  
  if (message[messageLength - 1] == '}')
    message[messageLength - 1] = '\0';

  char *token = strtok(message, delimiter);
  while (token != NULL)
  {
    strcpy(words[i], token);
    words[i][strlen(words[i])] = '\0'; // Ensure null termination
    token = strtok(NULL, delimiter);
    i++;
  }
}

void sendStopJson(const char *topic, const char *key, int value)
{
  char buffer[128];
  buffer[0] = '{';
  buffer[1] = '\0'; // Ensure null termination
  strcat(buffer, "\"");
  strcat(buffer, key);
  strcat(buffer, "\":\"");
  char valueStr[10];
  itoa(value, valueStr, 10); // Convert integer to string
  strcat(buffer, valueStr);
  strcat(buffer, "\"}");

  client.publish(topic, buffer);
}

void callback(char *topic, byte *payload, unsigned int length)
{
  if (strcmp(topic, position_topic) == 0)
  {
    Serial.println("Position message received");

    char message[256] = {0}; // Ensure the buffer is large enough
    for (int i = 0; i < length; i++)
    {
      message[i] = (char)payload[i];
    }
    message[length] = '\0'; // Null-terminate the string

    // Filter direction out of the JSON by splitting into nodes and then key and value
    char nodes[10][50];
    split_to_words(",", message, nodes);
    char direction_node[10][50];
    split_to_words(":", nodes[2], direction_node);

    replace(direction_node[1], '\"'); // Remove ""
    replace(direction_node[1], ' ');  // Remove spaces
    processDirection(direction_node[1]);
    Serial.println("Direction: " + (String)direction_node[1]);
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
    for (int i = 0; i < sizeof(LED_PINS) / sizeof(LED_PINS[0]); i++)
    {
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

void setDirection(int pin)
{
  for (int i = 0; i < sizeof(LED_PINS) / sizeof(LED_PINS[0]); i++)
  {
    if (LED_PINS[i] == pin)
    {
      digitalWrite(pin, HIGH);
    }
    else
    {
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