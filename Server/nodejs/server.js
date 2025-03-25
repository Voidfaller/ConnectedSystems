const mqtt = require('mqtt');

const brokerIP = "192.168.1.105";
let robots = [];
let obstacles = [];

// Connect to the MQTT broker inside Docker
const client = mqtt.connect(`mqtt://${brokerIP}:1883`, { clientId: 'nodejs-server' });

// MQTT Connect Event
client.on('connect', () => {
    console.log('✅ Connected to MQTT Broker');
    generateGraph(10);
    console.log(graph);

    // Subscribe to topics
    const topics = [
        'robots/registration',
        'robots/position/#',
        'robots/obstacle/#'
    ];

    client.subscribe(topics, (err) => {
        if (!err) {
            console.log(`Subscribed to topics: ${topics.join(", ")}`);
        } else {
            console.error("Subscription error:", err);
        }
    });
});

// Handle incoming MQTT messages
client.on('message', (topic, message) => {
    console.log(`📩 Received message on ${topic}: ${message.toString()}`);
    try {
        const payload = JSON.parse(message);
        const positionRegex = /^robots\/position\/(.+)$/;

        if (topic === 'robots/registration') {
            // Handle registration requests
            registerRobot(payload);
        } else if (positionRegex.test(topic)) {
            const match = positionRegex.exec(topic);
            const robotId = match[1];  // Extract the robot ID from the topic
            console.log(`Robot ID extracted from topic: ${robotId}`);
            updateRobotPosition(payload, robotId);
        } else {
            console.log(`Unhandled topic: ${topic}`);
        }
    } catch (error) {
        console.error("Error parsing JSON message", error);
    }
});

// Register a new robot
function registerRobot(payload) {
    const assignedId = payload.robot_id;
    robots[assignedId] = { id: assignedId, position: { x: null, y: null, direction: null } };
    console.log(`Registered new robot: ${assignedId}`);
}

// Update the robot's position
function updateRobotPosition(payload, robotId) {
    if (!robots[robotId]) {
        console.error(`Robot ${robotId} is not registered yet.`);
        return;
    }

    if (payload.x === undefined || payload.y === undefined || payload.direction === undefined) {
        console.error(`Invalid position data for robot ${robotId}:`, payload);
        return;
    }

    const previousPosition = robots[robotId].position;

    // Add the previous position back to the graph
    if (previousPosition && previousPosition.x !== null && previousPosition.y !== null) {
        addNodeToGraph(previousPosition.x, previousPosition.y);
    }

    // Update the robot's current position
    robots[robotId].position = {
        x: payload.x,
        y: payload.y,
        direction: payload.direction
    };


    // Remove the current position node from the graph
    removeNodeFromGraph(payload.x, payload.y);

    // Update the graph with the new position
    console.log(graph);
    console.log(`Updated position for robot ${robotId}:`, robots[robotId].position);
}

// Remove a node from the graph and its edges
function removeNodeFromGraph(x, y) {
    const node = `${x},${y}`;
    if (graph.has(node)) {
        // Remove edges connected to this node
        graph.forEach((edges, key) => {
            if (edges.has(node)) {
                edges.delete(node);
                console.log(`Removed edge between ${key} and ${node}`);
            }
        });

        // Remove the node itself
        graph.delete(node);
        console.log(`Removed node ${node} from graph`);
    } else {
        console.log(`Node ${node} not found in graph`);
    }
}

// Add a node to the graph (if it doesn't already exist)
// Add a node to the graph (if it doesn't already exist)
function addNodeToGraph(x, y) {
    const node = `${x},${y}`;
    if (!graph.has(node)) {
        graph.set(node, new Map());

        // Add edges to adjacent nodes
        const size = 10; // Assuming the grid is of size 10 (can be dynamic)
        const neighbors = [
            `${x - 1},${y}`, // Left
            `${x + 1},${y}`, // Right
            `${x},${y - 1}`, // Up
            `${x},${y + 1}`, // Down
        ];

        neighbors.forEach((neighbor) => {
            if (isValidNode(neighbor, size)) {
                graph.get(node).set(neighbor, 1); // Add edge to the neighbor
                graph.get(neighbor).set(node, 1); // Add edge back to the node
            }
        });

        console.log(`Added node ${node} to graph`);
    } else {
        console.log(`Node ${node} already exists in graph`);
    }
}
// Check if a node is within the valid grid bounds
function isValidNode(node, size) {
    const [x, y] = node.split(',').map(Number);
    return x >= 0 && x < size && y >= 0 && y < size;
}

// Pathfinding logic - generate a grid graph
let graph = new Map();

function generateGraph(size) {
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let node = `${x},${y}`;
            graph.set(node, new Map());

            if (x > 0) graph.get(node).set(`${x - 1},${y}`, 1); // Left
            if (x < size - 1) graph.get(node).set(`${x + 1},${y}`, 1); // Right
            if (y > 0) graph.get(node).set(`${x},${y - 1}`, 1); // Up
            if (y < size - 1) graph.get(node).set(`${x},${y + 1}`, 1); // Down
        }
    }
}

// Placeholder for Dijkstra's algorithm (unused in current code)
// Dijkstra's algorithm for finding the shortest path
function dijkstra(start, end) {
    const distances = {};  // Stores the shortest distance from start to each node
    const previous = {};   // Stores the previous node in the shortest path
    const unvisited = new Set();  // Set of all unvisited nodes

    // Initialize distances and unvisited nodes
    for (let node of graph.keys()) {
        distances[node] = Infinity;
        unvisited.add(node);
    }
    distances[`${start.x},${start.y}`] = 0;  // Start node's distance is 0

    while (unvisited.size > 0) {
        // Get the node with the smallest distance
        let currentNode = null;
        let currentDistance = Infinity;
        for (let node of unvisited) {
            if (distances[node] < currentDistance) {
                currentDistance = distances[node];
                currentNode = node;
            }
        }

        // If the current node is the destination, we're done
        if (currentNode === `${end.x},${end.y}`) {
            break;
        }

        unvisited.delete(currentNode);
        const neighbors = graph.get(currentNode);

        // Update the distances to the neighbors
        for (let [neighbor, weight] of neighbors) {
            if (unvisited.has(neighbor)) {
                const newDist = distances[currentNode] + weight;
                if (newDist < distances[neighbor]) {
                    distances[neighbor] = newDist;
                    previous[neighbor] = currentNode;
                }
            }
        }
    }

    // Reconstruct the path
    const path = [];
    let node = `${end.x},${end.y}`;
    while (previous[node]) {
        path.unshift(node);
        node = previous[node];
    }

    path.unshift(`${start.x},${start.y}`);
    return path;  // Returns the shortest path
}
