let client;
let brokerIp = "145.137.57.176"; // Replace with broker IP adres

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
    startButtton.addEventListener("click", function () {
        start();
        console.log("start");
    });
    stopButton.addEventListener("click", function () {
        stop();
        console.log("stop");
    });

    connectMQTT();
    function generateButtons() {
        for (let i = 0; i < 10; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            row.setAttribute('data-row-id', i);
            for (let j = 0; j < 10; j++) {
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
            'robot': '#FF0000', // Red
            // 'robot_2': '#00FF00', // Green
            // 'robot_3': '#0000FF', // Blue
            // 'robot_4': '#FFFF00', // Yellow
            'box': '#FFA500' // Orange
        };

        const button = document.querySelector(`button[data-position='${x},${y}']`);
        if(object === 'box'){
            button.style.backgroundColor = colorMapping[object];
            return;
        }
        console.log("new place of object : " + object, x, y);
        console.log("old place: of object : " + lastPlace[object],lastPlace[object].x, lastPlace[object].y);
        const buttonPrev = document.querySelector(`button[data-position='${lastPlace[object].x},${lastPlace[object].y}']`);
        if (lastPlace[object].x != x || lastPlace[object].y != y) { 
            buttonPrev.style.backgroundColor = '#FFFFFF';
            lastPlace[object].x = x;
            lastPlace[object].y = y;
        }

        button.style.backgroundColor = colorMapping[object];
    }
    function start() {
        const payload = {
            state: 1
        };
        client.publish("system/powerControl", JSON.stringify(payload));
        console.log("start");

    }
    function stop() {
        const payload = {
            state: 0
        };
        client.publish("system/powerControl", JSON.stringify(payload));
        console.log("stop");
    }

    generateButtons();

    
    // placeObject('robot2', 9, 0);
    // placeObject('robot3', 0, 9);
    // placeObject('robot4', 9, 9);
    // placeObject('robot1', 0, 0);


    placeObject('box', 5, 5);
    client.on("message", (topic, message) => {
        const payload = JSON.parse(message.toString());
        console.log("Received message:", topic, payload);
        if (topic === "robots/world/obstacles") {
            const obstacles = payload.obstacles;
            obstacles.forEach((obstacle) => {
                const x = obstacle.x;
                const y = obstacle.y;
                placeObject('box', x, y);
            });
        } else if (topic.startsWith("robots/position/")) {
            const robotId = topic.split("/")[2];       
            if(robotId.startsWith("robot")){
                const robotNumber = parseInt(robotId.replace("robot", ""), 10); // Extract the number from "robotId"
                console.log("robot id : "+ robotId);
                console.log("robot number : "+ robotNumber);
                const x = payload.x;
                const y = payload.y;
                placeObject(`robot${robotNumber}`, x, y);
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