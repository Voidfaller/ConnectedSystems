let client;
let brokerIp = "192.168.56.1"; // Replace with broker IP adres

// Move lastPlace outside of placeObject to retain its state
const lastPlace = {
    robot1: { x: 0, y: 0 },
    robot2: { x: 0, y: 0 },
    robot3: { x: 0, y: 0 },
    robot4: { x: 0, y: 0 }
};

document.addEventListener('DOMContentLoaded', () => {
    const startButtton = document.getElementById("buttonStart");
    const stopButton = document.getElementById("buttonStop");
    const enterBurton = document.getElementById("enterButton");
    startButtton.addEventListener("click", function () {
        start();
    });
    stopButton.addEventListener("click", function () {
        stop();
    });

    enterBurton.addEventListener("click", function () {
        const task_x = document.getElementById("task_x").value;
        const task_y = document.getElementById("task_y").value;
        const taskType = document.getElementById("load").value;

        const payload = {
            x: parseInt(task_x),
            y: parseInt(task_y),
            taskType: taskType
        };

        client.publish("server/task", JSON.stringify(payload));
        document.getElementById("task_x").value = "";
        document.getElementById("task_y").value = "";
    });

    function randomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    connectMQTT();
    function generateButtons() {
        for (let i = 0; i < 11; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            row.setAttribute('data-row-id', i);
            for (let j = 0; j < 11; j++) {
                const col = document.createElement('button');
                col.className = 'col';
                col.setAttribute('data-position', `${j},${i}`);
                col.style.backgroundColor = '#FFFFFF'; // Set default color to white
                row.appendChild(col);

            }
            document.getElementById('button-grid').appendChild(row);
        }
    }

    function placeObject(object, x, y) {
        const colorMapping = {
            'robot_1': '#FF0000', // Red
            'robot_2': '#00FF00', // Green
            'robot_3': '#0000FF', // Blue
            'robot_4': '#FFFF00', // Yellow
            'wooden box': '#FFA500'     // Orange
        };

        const button = document.querySelector(`button[data-position='${x},${y}']`);

        if (object === 'wooden box') {
            button.style.backgroundColor = colorMapping[object];
            return;
        }

        // Default to white if robot is new
        if (!lastPlace[object]) {
            lastPlace[object] = { x: x, y: y };
        } else {
            const lastX = lastPlace[object].x;
            const lastY = lastPlace[object].y;

            // Clear previous cell
            const buttonPrev = document.querySelector(`button[data-position='${lastX},${lastY}']`);
            if (buttonPrev) {
                buttonPrev.style.backgroundColor = '#FFFFFF';
            }

            // Update last place
            lastPlace[object].x = x;
            lastPlace[object].y = y;
        }

        // Apply color
        button.style.backgroundColor = colorMapping[object] || colorMapping[object];
    }



    function start() {
        const payload = {
            state: 1
        };
        client.publish("server/powerControl", JSON.stringify(payload));
        console.log("start");

    }
    function stop() {
        const payload = {
            state: 0
        };
        client.publish("server/powerControl", JSON.stringify(payload));
        console.log("stop");
    }

    generateButtons();

    client.on("message", (topic, message) => {
        const payload = JSON.parse(message.toString());
        console.log("Received message:", topic, payload);
        if (payload.x < 0 || payload.x > 10 || payload.y < 0 || payload.y > 10) {
            console.log("Invalid obstacle coordinates:", x, y);
            return;
        }
        if (topic.startsWith("robots/obstacle/")) {
            const x = payload.x;
            const y = payload.y;
            const object = payload.obstacle_type;
            placeObject(object, x, y);

        } else if (topic.startsWith("robots/position/")) {
            const robotId = topic.split("/")[2];
            if (robotId.startsWith("robot")) {
                console.log("robot id : " + robotId);
                const x = payload.x;
                const y = payload.y;
                placeObject(robotId, x, y);
            }
        }
    });


});

// topics to subscribe to
const topics = [
    "robots/world/obstacles", "robots/position/#", "robots/obstacle/#"];

function connectMQTT() {
    const brokerUrl = `ws://${brokerIp}:9001`;
    client = mqtt.connect(brokerUrl);
    client.on("connect", () => {
        console.log("Connected to MQTT broker");
        topics.forEach((topic) => {
            client.subscribe(topic, (err) => {
                if (err) {
                    console.error(`Failed to subscribe to topic ${topic}:`, err);
                } else {
                    console.log(`Subscribed to topic ${topic}`);
                }
            });
        });
    });
}

