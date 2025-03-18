const mqtt = require('mqtt');

let robots = [];
let obstacles = [];
// Connect to the MQTT broker inside Docker
const client = mqtt.connect('mqtt://mqtt-broker:1883');

client.on('connect', () => {
    console.log('✅ Connected to MQTT Broker');

    // Subscribe to topics
    const topics = [
        'robots/registration/request',
        'robots/updates/position',
        'robots/updates/obstacles',
        'robots/commands/#',
        'robots/status/#',
        'robots/updates/sync/#'
    ];

    client.subscribe(topics, (err) => {
        if (!err) {
            console.log(`Subscribed to topics: ${topics.join(", ")}`);
        } else {
            console.error("Subscription error:", err);
        }
    });
});



client.on('message', (topic, message) => {
    console.log(`📩 Received message on ${topic}: ${message.toString()}`);

    try {
        const payload = JSON.parse(message)
        const sender = payload.sender;

        if (sender != "server") {
            switch (payload.type) {
                case "registration_request":
                    registerRobot(payload);
                    break;
                case "position_update":
                    updateRobotPosition(payload);
                    break;
                case "obstacle_detected":
                    addObstacle(payload);
                    break;
                case "sync_request":
                    handleSyncRequest(payload);
                    break;
                default:
                    console.log(`unhandled payload type ${payload.type}`);
            }
        }
    }
    catch (error) {
        console.error("Error parsing JSON message", error);
    }
});




//handle registration requests
function registerRobot(payload) {
    const tempId = payload.data.response_topic;
    const assignedId = generateId();

    robots[assignedId] = { id: assignedId, position: null, status: 'online', lastSeen: Date.now() };

    const response = JSON.stringify({
        sender: "server",
        type: "registration_response",
        timestamp: getTimeStamp(),
        data: { assigned_robot_id: assignedId }
    });

    client.publish(tempId, response);
    console.log(`Registered new robot: ${assignedId}`);
}

function updateRobotPosition(payload) {
    if (robots[payload.sender]) {
        robots[payload.sender].position = payload.data;
        robots[payload.sender].lastSeen = Date.now();
        console.log(`Updated position for ${payload.sender}: `, payload.data);
    }
}

//update all robots on new world obstacles
function addObstacle(payload) {
    obstacles.push(payload.data);
    console.log(`Obstacle detected:`, payload.data);

    const response = JSON.stringify({
        sender: "server",
        type: "obstacle_update",
        timestamp: getTimeStamp(),
        data: { ...payload.data, reported_by: payload.sender }
    });
    client.publish('robots/world/obstacles', response);
}


//resend robot's data in case of lost data
function handleSyncRequest(payload) {
    const robotId = payload.sender;
    if (!robots[robotId]) return;

    const response = JSON.stringify({
        sender: "server",
        type: "sync_response",
        timestamp: getTimeStamp(),
        data: {
            tasks: [],
            obstacles: obstacles
        }
    });
    client.publish(`robots/updates/sync/${robotId}`, response);
}

//generate a unique IDf
function generateId(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

//returns the current UNIX timestamp
function getTimeStamp() {
    return Math.floor(Date.now() / 1000);
}
