import json
import asyncio
import paho.mqtt.client as mqtt
import threading
from controller import Supervisor, DistanceSensor

# Set the MQTT broker IP here
MQTT_BROKER_IP = "192.168.180.137"
MQTT_PORT = 1883



class MQTTSupervisor(Supervisor):
    def __init__(self):
        super().__init__()
        self.ROBOT_ID = self.getSelf().getField("name").getSFString()  # Get the robot ID from the field name
        self.step_size = 0.001  # Small step size for smooth movement
        self.trans = self.getSelf().getField("translation")  # Access translation field
        self.threshold = 0.01  # Threshold distance to snap to the target
        self.moving = False  # Flag to keep track of movement status
        self.startPos = self.trans.getSFVec3f()
        self.current_pos = self.startPos  # Starting position of the robot
        self.target_pos = None
        self.current_direction = "north"  # Current direction of the robot
        self.current_rotation = self.getSelf().getField("rotation")  # Access rotation field
        
        self.ledNorth = self.getDevice("ledNorth")  # Access LED device
        self.ledEast = self.getDevice("ledEast")
        self.ledWest = self.getDevice("ledWest")
        self.ledSouth = self.getDevice("ledSouth")
        
        # MQTT setup
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.loop_start()  # Start the MQTT loop in a non-blocking way
        
        self.ledNorth.set(1)
        self.ledEast.set(1)
        self.ledWest.set(1)
        self.ledSouth.set(1)
        
        
           # ✅ Create an event loop for the MQTT thread
        self.loop = asyncio.new_event_loop()
        self.loop_thread = threading.Thread(target=self._run_event_loop, daemon=True)
        self.stop_event = asyncio.Event()  # Event to signal movement should stop
        self.loop_thread.start()
            
    def _run_event_loop(self):
            """Runs the asyncio event loop in a separate thread."""
            asyncio.set_event_loop(self.loop)
            self.loop.run_forever()
        
    def on_connect(self, client, userdata, flags, rc):
        """Called when the client connects to the broker."""
        if rc == 0:
            print("Connected to MQTT broker successfully!")
            
        # Turn off all LEDs when connected
            self.ledNorth.set(0)
            self.ledEast.set(0)
            self.ledWest.set(0)
            self.ledSouth.set(0)
            # Publish a message once connected
            client.subscribe(f"robots/pathUpdate/{self.ROBOT_ID}")  # Subscribe to the path update topic
        else:
            print(f"Failed to connect, return code {rc}")

    def on_message(self, client, userdata, msg):
        """Callback function for receiving MQTT messages."""
        try:
            # Decode the message bytes to string, then load the JSON data
            message = json.loads(msg.payload.decode('utf-8'))
            print(f"Received JSON message: {message} on topic {msg.topic}")
            
            if msg.topic == f"robots/pathUpdate/{self.ROBOT_ID}":
                print("Path update received!")
                asyncio.run_coroutine_threadsafe(self.handle_path_update(message), self.loop)

        except Exception as e:
            print(f"Error processing message: {e}")


    def setLedDirection(self, direction):
        if(direction == "north"):
            self.ledNorth.set(1)
            self.ledEast.set(0)
            self.ledWest.set(0)
            self.ledSouth.set(0)
        elif(direction == "east"):
            self.ledNorth.set(0)
            self.ledEast.set(1)
            self.ledWest.set(0)
            self.ledSouth.set(0)
        elif(direction == "west"):
            self.ledNorth.set(0)
            self.ledEast.set(0)
            self.ledWest.set(1)
            self.ledSouth.set(0)
        elif(direction == "south"):
            self.ledNorth.set(0)
            self.ledEast.set(0)
            self.ledWest.set(0)
            self.ledSouth.set(1)
        else:
            print("Invalid direction specified for LED.")
            return
        
    async def handle_path_update(self, message):
        """Handle path updates asynchronously."""
        # Stop any ongoing movement
        self.stop_event.set()
        await asyncio.sleep(0.05)  # Allow movement to stop
        
        self.stop_event.clear()

        path = message.get("path", [])

        if len(path) < 2:
            print("Not enough waypoints to move.")
            return

        target_str = path[1]  
        current_str = path[0]

        x, y = map(int, target_str.split(","))  
        previous_x, previous_y = map(int, current_str.split(","))

        target_pos = [x / 10, y / 10]  
        self.target_pos = target_pos  

        direction = [target_pos[0] - previous_x / 10, target_pos[1] - previous_y / 10]

        print(f"New movement direction: {direction}")
        if direction[0] > 0:
            self.current_direction = "east"
            self.current_rotation.setSFRotation([0, 0, 1, -1.57])
            self.setLedDirection("east")
        elif direction[0] < 0:
            self.current_direction = "west"
            self.current_rotation.setSFRotation([0, 0, 1, 1.57])
            self.setLedDirection("west")
        elif direction[1] > 0:
            self.current_direction = "north"
            self.current_rotation.setSFRotation([0, 0, 1, 0])
            self.setLedDirection("north")
        elif direction[1] < 0:
            self.current_direction = "south"
            self.current_rotation.setSFRotation([0, 0, 1, 3.14])
            self.setLedDirection("south")
        
        print(f"Moving to {target_pos}...")
        await self.move_robot(target_pos)  
        
    async def move_robot(self, target):
        """Move the robot from point A to point B smoothly, snap when really close."""
        while not self.stop_event.is_set():
            # Calculate direction vector (no scaling factors)
            direction = [target[0] - self.current_pos[0], target[1] - self.current_pos[1]]
            # Calculate distance to point B
            distance = (direction[0]**2 + direction[1]**2) ** 0.5

            if distance < self.threshold:  # If the robot is very close, snap to the target
                self.current_pos = target  # Snap the position to the target
                self.trans.setSFVec3f([self.current_pos[0], self.current_pos[1], 0.04])  # Update position
                print("Target reached!")
                break  # Break the loop when target is reached

            # Normalize the direction vector
            direction = [direction[0] / distance, direction[1] / distance]

            # Move a small step toward the target
            self.current_pos[0] += direction[0] * self.step_size
            self.current_pos[1] += direction[1] * self.step_size

            # Update the robot's position smoothly
            self.trans.setSFVec3f([self.current_pos[0], self.current_pos[1], 0.04])

            # Yield control back to the event loop
            await asyncio.sleep(0.01)  # Sleep to make the movement non-blocking

    
    async def run(self):
        timestep = int(self.getBasicTimeStep())
        while self.step(timestep) != -1:
            # Keep other tasks like MQTT communication running alongside
            await asyncio.sleep(0.1)  # This sleep ensures other tasks are not blocked

    def start_mqtt(self):
        """Start the MQTT client and robot control."""
        self.client.connect(MQTT_BROKER_IP, MQTT_PORT, 60)  # Connect to MQTT broker
        asyncio.run(self.run())  # Run the supervisor with asyncio

if __name__ == "__main__":
    supervisor = MQTTSupervisor()
    supervisor.start_mqtt()  # Start the MQTT connection and robot control
