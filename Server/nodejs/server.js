const mqtt = require('mqtt');
const munkres = require('munkres-js'); // Hungarian Algorithm library
const brokerIP = "192.168.1.105";

let robots = [];
let obstacles = [];
let idleRobots = [];
let taskQueue = [];
let graph = new Map();
// Connect to the MQTT broker inside Docker
const client = mqtt.connect(`mqtt://${brokerIP}:1883`, { clientId: 'nodejs-server' });

// MQTT Connect Event
client.on('connect', () => {
    console.log('✅ Connected to MQTT Broker');
    generateGraph(11);

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
            registerRobot(payload);
        } else if (positionRegex.test(topic)) {
            const match = positionRegex.exec(topic);
            const robotId = match[1];
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
    robots[assignedId] = {
        id: assignedId,
        position: { x: payload.start_pos.x * 10, y: payload.start_pos.y * 10, direction: payload.start_pos.direction },
        taskLoad: payload.taskLoad || [],
        tasks: []
    };
    console.log(`Registered new robot: ${assignedId}`);
    console.log(`Robot ${assignedId} position:`, robots[assignedId].position);
    //push robot to idle robots array
    if (!idleRobots.includes(assignedId)) {
        idleRobots.push(assignedId);
    }
    console.log(`Robot ${assignedId} is idle`);
}

// Update robot position & recalculate path
function updateRobotPosition(payload, robotId) {
    if (!robots[robotId]) {
        console.error(`Robot ${robotId} is not registered.`);
        return;
    }

    if (payload.x === undefined || payload.y === undefined || payload.direction === undefined) {
        console.error(`Invalid position data for robot ${robotId}:`, payload);
        return;
    }

    const previousPosition = robots[robotId].position;


    // Update the robot's position
    robots[robotId].position = {
        x: payload.x,
        y: payload.y,
        direction: payload.direction
    };

    console.log(`Updated position for robot ${robotId}:`, robots[robotId].position);

    if (robots[robotId].tasks.length > 0) {
        let path = dijkstra(robots[robotId].position, robots[robotId].tasks[0]);
        console.log(`Calculated path for robot ${robotId}:`, path);
        client.publish(`robots/pathUpdate/${robotId}`, JSON.stringify({ "path": path }));
    } else {
        if (!idleRobots.includes(robotId)) {
            idleRobots.push(robotId);
            console.log(`Robot ${robotId} is now idle.`);
        }
    }
    checkTasks();
}



// Pathfinding logic - generate a grid graph


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


function dijkstra(start, end) {
    if (!start || !end) {
        console.error("Invalid start or end point for pathfinding.");
        return [];
    }

    const startNode = `${start.x},${start.y}`;
    const endNode = `${end.x},${end.y}`;

    if (!graph.has(startNode) || !graph.has(endNode)) {
        console.error(`Start or end node not found in graph.`);
        return [];
    }

    let distances = new Map();
    let previous = new Map();
    let priorityQueue = new Map();

    // Initialize distances
    graph.forEach((_, node) => {
        distances.set(node, Infinity);
        priorityQueue.set(node, Infinity);
    });

    distances.set(startNode, 0);
    priorityQueue.set(startNode, 0);

    while (priorityQueue.size > 0) {
        let currentNode = getMinNode(priorityQueue);

        if (currentNode === endNode) break;

        let currentDistance = distances.get(currentNode);
        let neighbors = graph.get(currentNode);

        neighbors.forEach((cost, neighbor) => {
            let newDist = currentDistance + cost;
            if (newDist < distances.get(neighbor)) {
                distances.set(neighbor, newDist);
                previous.set(neighbor, currentNode);
                priorityQueue.set(neighbor, newDist);
            }
        });

        priorityQueue.delete(currentNode);
    }

    // Reconstruct the shortest path
    let path = [];
    let step = endNode;
    while (step) {
        path.unshift(step);
        step = previous.get(step);
    }

    if (path[0] !== startNode) {
        console.error("No path found!");
        return [];
    }

    console.log(`Shortest path from ${startNode} to ${endNode}:`, path);
    return path;
}

// Helper function to get the node with the smallest distance
function getMinNode(queue) {
    return [...queue.entries()].reduce((min, entry) => (entry[1] < min[1] ? entry : min))[0];
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
    if (robots.length === 0 || tasks.length === 0) {
        console.log("No robots or tasks available for assignment.");
        return [];
    }

    let costMatrix = [];

    for (let i = 0; i < robots.length; i++) {
        costMatrix[i] = [];
        for (let j = 0; j < tasks.length; j++) {
            if (!robots[i].taskLoad.includes(tasks[j].taskType)) {
                costMatrix[i][j] = Infinity;
            } else {
                let cost = Math.abs(robots[i].position.x - tasks[j].x) +
                    Math.abs(robots[i].position.y - tasks[j].y);
                costMatrix[i][j] = cost;
            }
        }
    }

    console.log("Generated Cost Matrix:", costMatrix);

    try {
        const assignments = munkres(costMatrix);

        return assignments.map(([robotIdx, taskIdx]) => {
            if (costMatrix[robotIdx][taskIdx] !== Infinity) {
                return { robot: robots[robotIdx], task: tasks[taskIdx] };
            }
        }).filter(Boolean);
    } catch (error) {
        console.error("Hungarian Algorithm Error:", error);
        return [];
    }
}





function getAvailableRobots() {
    return Object.values(robots).filter(robot => robot.tasks.length === 0);
}

function planTasks() {
    // Get a list of available robots
    const availableRobots = getAvailableRobots();

    if (taskQueue.length > 0 && availableRobots.length > 0) {
        console.log("Assigning tasks to robots...");

        // Proceed with Hungarian algorithm only if there are available robots
        const assignments = hungarianAlgorithm(availableRobots, taskQueue);
        console.log("Assignments:", assignments);
        assignments.forEach(({ robot, task }) => {
            // Ensure tasks array exists
            if (!robot.tasks) {
                robot.tasks = [];
            }

            // Push the task into the robot's task list
            robot.tasks.push({ ...task }); // Spread to ensure we don’t push object references

            // Ensure the robot object in `robots` array/map is updated
            if (robots[robot.id]) {
                robots[robot.id].tasks = robot.tasks;
            }

            console.log("After assigning task, robot: " + JSON.stringify(robots[robot.id], null, 2));

            // Remove the assigned task from the queue
            const taskIndex = taskQueue.findIndex(t => t.x === task.x && t.y === task.y);
            console.log(`Task index: ${taskIndex}`);
            if (taskIndex !== -1) {
                taskQueue.splice(taskIndex, 1);
            }

            console.log(`Assigned task ${task.taskType} to robot ${robot.id}`);
        });


    }
}

function checkIdleRobots() {
    Object.values(robots).forEach(robot => {
        if (robot.tasks.length === 0 && !idleRobots.includes(robot.id)) {
            console.log(`Robot ${robot.id} is idle`);
            idleRobots.push(robot.id);
        }
        else if (robot.tasks.length > 0 && idleRobots.includes(robot.id)) {
            console.log(`Robot ${robot.id} is busy`);
            idleRobots = idleRobots.filter(id => id !== robot.id);
            updateRobotPosition(robot.position, robot.id)
        }
    });
}

function checkTasks() {
    Object.values(robots).forEach(robot => {
        if (robot.tasks.length > 0) {
            var task = robot.tasks[0]; // Get the first task
            var robotPosition = robot.position;
            var taskPosition = { x: task.x, y: task.y };

            console.log(robotPosition, taskPosition);
            if((robotPosition.x == taskPosition.x) && (robotPosition.y == taskPosition.y)) {
                console.log(`Robot ${robot.id} has completed task at (${task.x}, ${task.y})`);
                robot.tasks.shift(); // Remove the completed task from the robot's tasks
                console.log(`Robot ${robot.id} tasks after completion:`, robot.tasks);
                generateTask();
                idleRobots.push(robot.id); // Add robot back to idle robots
                console.log(`Robot ${robot.id} is now idle.`);
            }
        }
    });
}

// main code
for (let i = 0; i < 5; i++) {
    generateTask();
}


console.log("Tasks generated:", taskQueue);

setInterval(() => {
    planTasks();
    checkIdleRobots();
}, 100);
