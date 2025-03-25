let client;
let brokerIp = "192.168.1.105"; // Replace with broker IP adres
document.addEventListener('DOMContentLoaded', () => {

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
        if (button) {
            button.style.backgroundColor = colorMapping[object];
        }
    }
    function start() {

    }
    function stop() {

    }

    generateButtons();

    placeObject('robot1', 0, 0);
    placeObject('robot2', 9, 0);
    placeObject('robot3', 0, 9);
    placeObject('robot4', 9, 9);
    placeObject('box', 5, 5);

});

// topics to subscribe to
const topics = [
"robots/world/obstacles"];

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

