from controller import Supervisor
import paho.mqtt.client as mqtt
import json

# Set the MQTT broker IP here
MQTT_BROKER_IP = "192.168.1.105"  # Change this as needed
MQTT_PORT = 1883  # Default MQTT port
ROBOT_ID = "robot_1"

class MQTTSupervisor(Supervisor):
    def __init__(self):
        super().__init__()

        # MQTT Setup with latest callback API (without specifying protocol)
        self.client = mqtt.Client(client_id=ROBOT_ID)  
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_log = self.on_log  # Enable MQTT logging
        self.client.connect(MQTT_BROKER_IP, MQTT_PORT, 60)  # Use the variable

        self.client.loop_start()  # Start MQTT loop in background
        self.connected = False  # Track connection status
        print("MQTT Client initialized")

    def on_connect(self, client, userdata, flags, rc, properties=None):
        """Handle the MQTT connection."""
        if not self.connected:
            self.connected = True  # Set connected flag to True
            print(f"Connected to MQTT broker at {MQTT_BROKER_IP}:{MQTT_PORT} with result code {rc}")
            # Subscribe to topic once connected
            payload =json.dumps({"robot_id": ROBOT_ID})  # JSON payload
            client.publish("robots/registration", payload)
            

    def on_message(self, client, userdata, msg):
        """Handle incoming messages."""
        print(f"Received message on topic: {msg.topic}")
        print(f"Raw message payload (bytes): {msg.payload}")

        try:
            # Try decoding it to a string first
            message_payload = msg.payload.decode("utf-8")
            print(f"Decoded message payload: {message_payload}")

            # Try parsing it as JSON
            try:
                json_data = json.loads(message_payload)  # Convert JSON string back to Python dict
                print(f"Decoded JSON data: {json_data}")
            except json.JSONDecodeError:
                print(f"Error: Failed to decode JSON. Payload is: {message_payload}")
        except Exception as e:
            print(f"Unexpected error while decoding: {e}")
            print(f"Raw binary payload: {msg.payload}")

    def on_log(self, client, userdata, level, buf):
        """Log MQTT operations."""
        print(f"MQTT Log - {buf}")

    def run(self):
        """Main loop to keep Webots and MQTT in sync."""
        timestep = int(self.getBasicTimeStep())
        while self.step(timestep) != -1:
            pos = self.getSelf().getPosition()
            posX = round(pos[0] * 10)
            posY = abs(round(pos[1] * 10))
            direction = self.getSelf().getOrientation()
            payload = json.dumps({
                    "x": posX,
                    "y": posY,
                    "direction": "north"
            })
            self.client.publish(f"robots/position/{ROBOT_ID}", payload)
            self.client.loop()  # Keep MQTT active inside loop

    def on_exit(self):
        """Ensure clean exit of MQTT client."""
        self.client.loop_stop()  # Stops the MQTT loop
        self.client.disconnect()  # Disconnects the MQTT client

if __name__ == "__main__":
    supervisor = MQTTSupervisor()
    supervisor.run()
