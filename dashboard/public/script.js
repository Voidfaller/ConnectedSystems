let client;
let brokerIp = "192.168.178.80"; // Replace with broker IP adres

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
    });
    stopButton.addEventListener("click", function () {
        stop();
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
            'robot1': '#FF0000', // Red
            'robot2': '#00FF00', // Green
            'robot3': '#0000FF', // Blue
            'robot4': '#FFFF00', // Yellow
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

    
    placeObject('robot2', 9, 0);
    placeObject('robot3', 0, 9);
    placeObject('robot4', 9, 9);
    placeObject('robot1', 0, 0);

    placeObject('box', 5, 5);
    

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