import json
import asyncio
import paho.mqtt.client as mqtt
from controller import Supervisor

# Set the MQTT broker IP here
MQTT_BROKER_IP = "192.168.10.137"
MQTT_PORT = 1883
ROBOT_ID = "robot_1"
TASKLOAD = ["Extra Heavy", "Heavy"]

class MQTTSupervisor(Supervisor):
    def __init__(self):
        super().__init__()
        self.step_size = 0.001  # Small step size for smooth movement
        self.current_pos = [0, 0]  # Starting position of the robot
        self.pointB = [0.1, -0.1]  # Target position (change as needed)
        self.trans = self.getSelf().getField("translation")  # Access translation field
        self.threshold = 0.01  # Threshold distance to snap to the target
        self.moving = False  # Flag to keep track of movement status

        # MQTT setup
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.loop_start()  # Start the MQTT loop in a non-blocking way

    def on_connect(self, client, userdata, flags, rc):
        """Called when the client connects to the broker."""
        if rc == 0:
            print("Connected to MQTT broker successfully!")
            # Publish a message once connected
            payload = {"robot_id": ROBOT_ID, "taskload": TASKLOAD}
            client.publish("robots/registration", json.dumps(payload))  # Publish to the robot status topic
        else:
            print(f"Failed to connect, return code {rc}")

    def on_message(self, client, userdata, msg):
        """Callback function for receiving MQTT messages."""
        try:
            # Decode the message bytes to string, then load the JSON data
            message = json.loads(msg.payload.decode('utf-8'))
            print(f"Received JSON message: {message} on topic {msg.topic}")
        except Exception as e:
            print(f"Error processing message: {e}")

    async def move_robot(self, target):
        """Move the robot from point A to point B smoothly, snap when really close."""
        while True:
            # Calculate direction vector (no scaling factors)
            direction = [target[0] - self.current_pos[0], target[1] - self.current_pos[1]]

            # Calculate distance to point B
            distance = (direction[0]**2 + direction[1]**2) ** 0.5

            if distance < self.threshold:  # If the robot is very close, snap to the target
                self.current_pos = target  # Snap the position to the target
                self.trans.setSFVec3f([self.current_pos[0], self.current_pos[1], 0.1])  # Update position
                print("Target reached!")
                break  # Break the loop when target is reached

            # Normalize the direction vector
            direction = [direction[0] / distance, direction[1] / distance]

            # Move a small step toward the target
            self.current_pos[0] += direction[0] * self.step_size
            self.current_pos[1] += direction[1] * self.step_size

            # Update the robot's position smoothly
            self.trans.setSFVec3f([self.current_pos[0], self.current_pos[1], 0.1])

            # Yield control back to the event loop
            await asyncio.sleep(0.01)  # Sleep to make the movement non-blocking

    async def run(self):
        timestep = int(self.getBasicTimeStep())
        while self.step(timestep) != -1:
            if not self.moving:
                self.moving = True
                # Start moving the robot asynchronously
                asyncio.create_task(self.move_robot(self.pointB))
            
            # Keep other tasks like MQTT communication running alongside
            await asyncio.sleep(0.1)  # This sleep ensures other tasks are not blocked

    def start_mqtt(self):
        """Start the MQTT client and robot control."""
        self.client.connect(MQTT_BROKER_IP, MQTT_PORT, 60)  # Connect to MQTT broker
        asyncio.run(self.run())  # Run the supervisor with asyncio

if __name__ == "__main__":
    supervisor = MQTTSupervisor()
    supervisor.start_mqtt()  # Start the MQTT connection and robot control
