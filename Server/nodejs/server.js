const mqtt = require('mqtt');
const munkres = require('munkres-js'); // Hungarian Algorithm library
const brokerIP = "192.168.10.137";
let robots = [];
let obstacles = [];

let taskQueue = [];
// Connect to the MQTT broker inside Docker
const client = mqtt.connect(`mqtt://${brokerIP}:1883`, { clientId: 'nodejs-server' });

// MQTT Connect Event
client.on('connect', () => {
    console.log('✅ Connected to MQTT Broker');
    generateGraph(10);

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
    const taskload = payload.taskLoad || [];
    robots[assignedId] = { id: assignedId, position: { x: null, y: null, direction: null }, taskLoad: taskload, tasks: [] };
    console.log(`Registered new robot: ${assignedId}`);
    console.log(`Current robots:`, robots);
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

    //calculate new optimal path
    let path = dijkstra(payload.x, payload.y);
    client.publish(`robots/pathUpdate/${robotId}`, JSON.stringify({ "path": path }));
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

        // Ensure neighbors is an iterable object (a Map)
        const neighbors = graph.get(currentNode);
        if (!neighbors || !(neighbors instanceof Map)) {
            console.error(`Invalid neighbors for node ${currentNode}:`, neighbors);
            continue;  // Skip invalid nodes
        }

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



function generateTask() {
    let taskTypes = ["Extra Heavy", "Heavy", "Medium", "Light", "Extra Light"];
    let taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];

    let newTask;
    do {
        newTask = {
            x: Math.floor(Math.random() * 10),  // Adjust grid size
            y: Math.floor(Math.random() * 10),
            taskType: taskType
        };
    } while (obstacles.some(obs => obs.x === newTask.x && obs.y === newTask.y));

    taskQueue.push(newTask);
    console.log(`Generated Task:`, newTask);
}


function hungarianAlgorithm(robots, tasks) {
    const validAssignments = [];

    // Create a cost matrix where only valid robot-task pairs are assigned costs
    let costMatrix = [];
    for (let i = 0; i < robots.length; i++) {
        costMatrix[i] = [];
        for (let j = 0; j < tasks.length; j++) {
            if (robots[i].taskLoad.includes(tasks[j].taskType)) {
                // Use Manhattan Distance as a cost metric (shorter is better)
                let cost = Math.abs(robots[i].position.x - tasks[j].x) + Math.abs(robots[i].position.y - tasks[j].y);
                costMatrix[i][j] = cost;
            } else {
                costMatrix[i][j] = Infinity; // Invalid assignment
            }
        }
    }

    // Apply the Hungarian Algorithm (external library like 'munkres-js' is recommended)

    const assignments = munkres(costMatrix);

    // Map the assignments back to robots and tasks
    assignments.forEach(([robotIdx, taskIdx]) => {
        if (costMatrix[robotIdx][taskIdx] !== Infinity) {
            validAssignments.push({ robot: robots[robotIdx], task: tasks[taskIdx] });
        }
    });

    return validAssignments;
}




function getAvailableRobots() {
    return Object.values(robots).filter(robot => robot.tasks.length === 0);
}

function planTasks(){
     // Get a list of available robots
     const availableRobots = getAvailableRobots();

     if (taskQueue.length > 0 && availableRobots.length > 0) {
         console.log("Assigning tasks to robots...");
 
         // Proceed with Hungarian algorithm only if there are available robots
         const assignments = hungarianAlgorithm(availableRobots, taskQueue);
         assignments.forEach(({ robot, task }) => {
             robot.tasks.push(task); // Assign the task to the robot
 
             // Remove the assigned task from the queue
             const taskIndex = taskQueue.findIndex(t => t.x === task.x && t.y === task.y);
             if (taskIndex !== -1) {
                 taskQueue.splice(taskIndex, 1);
             }
             console.log(`Assigned task ${task.taskType} to robot ${robot.id}`);
         });
 
     } 
}



// main code
for (let i = 0; i < 5; i++) {
    generateTask();
}

console.log("Tasks generated:", taskQueue);

setInterval(() => {
    planTasks();
    
   
}, 100);
