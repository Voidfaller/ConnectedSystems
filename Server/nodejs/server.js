const mqtt = require('mqtt');
const munkres = require('munkres-js'); // Hungarian Algorithm library
const brokerIP = "192.168.180.137";



let powerState = 0;
let robots = [];
let obstacles = [];
let idleRobots = [];
let taskQueue = [];
let failedTasks = new Set();
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
        'robots/obstacle/#',
        'server/powerControl',
        'server/task/target'
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
    //console.log(`📩 Received message on ${topic}: ${message.toString()}`);
    try {
        const payload = JSON.parse(message);
        const positionRegex = /^robots\/position\/(.+)$/;
        const obstacleRegex = /^robots\/obstacle\/(.+)$/;
        const powerControlRegex = /^server\/powerControl$/;
        const taskRegex = /^server\/task\/target$/;

        if (topic === 'robots/registration') {
            registerRobot(payload);
        } else if (positionRegex.test(topic)) {
            const match = positionRegex.exec(topic);
            const robotId = match[1];
            updateRobotPosition(payload, robotId);
        }
        else if (powerControlRegex.test(topic)) {
            powerState = payload.state;
            console.log(`Power state changed to: ${powerState}`);
            handlePowerstateChange();
        }
        else if (obstacleRegex.test(topic)) {
            const match = obstacleRegex.exec(topic);
            robotId = match[1];
            console.log(`Obstacle detected by robot ${robotId}:`, payload);
            if (!obstacles.some(obs => obs.x === payload.x && obs.y === payload.y)) {
                obstacles.push({ x: payload.x, y: payload.y });
                console.log(`Obstacle added at (${payload.x}, ${payload.y})`);
            }
            else {
                console.log(`Obstacle already exists at (${payload.x}, ${payload.y})`);
            }
            // Remove the obstacle from the graph
            graph.delete(`${payload.x},${payload.y}`);
            if (robots[robotId].tasks.length > 0) {
                let path = dijkstra(robots[robotId].position, robots[robotId].tasks[0], robotId);
                client.publish(`robots/pathUpdate/${robotId}`, JSON.stringify({ "path": path }));
            }
            else if (robots[robotId].isReturning) {
                let path = dijkstra(robots[robotId].position, robots[robotId].start_pos, robotId);
                client.publish(`robots/pathUpdate/${robotId}`, JSON.stringify({ "path": path }));
            }




        }

        else if (taskRegex.test(topic)) {
            console.log(`Task received:`, payload);
            if (payload.x < 0 || payload.x > 10 || payload.y < 0 || payload.y > 10) {
                console.log("Invalid task coordinates:", payload.x, payload.y);
                return;
            }

            if (obstacles.some(obs => obs.x === payload.x && obs.y === payload.y)) {
                console.log("Task coordinates are blocked by an obstacle:", payload.x, payload.y);
                return;
            }

            if (payload.robotId !== "") {
                if (!robots[payload.robotId]) {
                    console.error(`Robot ${payload.robotId} is not registered.`);
                    return;
                }
                if (robots[payload.robotId].taskLoad.includes(payload.taskType)) {
                    console.log("Yo");
                    robots[payload.robotId].tasks.push({ x: payload.x, y: payload.y, taskType: payload.taskType });
                    console.log(`Task added to robot ${payload.robotId}:`, payload);
                    return;
                }
            }
            taskQueue.push(payload);
            console.log(`Task added to queue:`, payload);
        }
        else {
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
        start_pos: { x: payload.start_pos.x * 10, y: payload.start_pos.y * 10, direction: payload.start_pos.direction },
        taskLoad: payload.taskLoad || [],
        tasks: [],
        isReturning: false
    };
    console.log(`Registered new robot: ${assignedId}`);
    console.log(`Robot ${assignedId} position:`, robots[assignedId].position);
    //push robot to idle robots array
    if (!idleRobots.includes(assignedId) && robots[assignedId].tasks.length === 0) {
        idleRobots.push(assignedId);
    }
    console.log(`Robot ${assignedId} is idle`);
}

function handlePowerstateChange() {
    if (powerState == 1) {
        console.log("System powering back ON. Resuming robot tasks...");


        Object.values(robots).forEach(robot => {
            if (robot.tasks.length > 0) {
                let path = dijkstra(robot.position, robot.tasks[0], robot.id);
                if (path.length > 0) {
                    client.publish(`robots/pathUpdate/${robot.id}`, JSON.stringify({ "path": path }));
                }
            }
            else if (robot.isReturning) {
                let path = dijkstra(robot.position, robot.start_pos, robot.id);
                client.publish(`robots/pathUpdate/${robot.id}`, JSON.stringify({ "path": path }));
            }
        });
    }
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

    if (powerState == 0) {
        console.log(`Robot ${robotId} powered off.`);
        return;
    }
    //console.log(`Updated position for robot ${robotId}:`, robots[robotId].position);

    if (robots[robotId].isReturning) {
        console.log(`Robot ${robotId} is returning to its original position.`);
        path = dijkstra(robots[robotId].position, robots[robotId].start_pos, robotId);
        client.publish(`robots/pathUpdate/${robotId}`, JSON.stringify({ "path": path }));
    }

    if (robots[robotId].tasks.length > 0) {
        const currentTask = robots[robotId].tasks[0];
        const endNode = `${currentTask.x},${currentTask.y}`;
        if (!graph.has(endNode)) {
            console.warn(`Task destination ${endNode} for robot ${robotId} is no longer valid.`);
            // Remove the task
            robots[robotId].tasks.shift();
            // Optionally add the robot back to idle
            if (!idleRobots.includes(robotId)) {
                idleRobots.push(robotId);
                console.log(`Robot ${robotId} is now idle due to invalid task destination.`);
            } else {
                console.log(`Robot ${robotId} has an invalid task destination! And iv veryyy busy`);
            }
            return;
        }

        let path = dijkstra(robots[robotId].position, currentTask, robotId);
        client.publish(`robots/pathUpdate/${robotId}`, JSON.stringify({ "path": path }));
    }
    else {
        if (!idleRobots.includes(robotId)) {
            idleRobots.push(robotId);
            //console.log(`Robot ${robotId} is now idle.`);
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

let reservedPaths = new Map();

function dijkstra(start, end, robotId) {
    const startNode = `${start.x},${start.y}`;
    const endNode = `${end.x},${end.y}`;

    if (!graph.has(startNode)) {
        console.warn("Missing startNode:", startNode);
        return [];
    }
    if (!graph.has(endNode)) {
        console.warn("Missing endNode:", endNode);
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
            if ([...reservedPaths.values()].some(path => path.has(neighbor))) return; // Skip reserved paths
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
        console.error(`No path found for robot ${robotId}. Retrying later...`);
        failedTasks.add(robotId);  // Store in a set for retrying
        return [];
    }

    reservePath(robotId, path);
    return path;
}


function reservePath(robotId, path) {
    if (!path.length) return;

    // Remove the old reservation
    reservedPaths.delete(robotId);

    // Reserve the next **2** steps (or less if near destination)
    let reserved = new Set(path.slice(0, 2));
    reservedPaths.set(robotId, reserved);
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
        // Check if the task position is not on an obstacle
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

    //console.log("Generated Cost Matrix:", costMatrix);

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
        //console.log("Assigning tasks to robots...");

        // Proceed with Hungarian algorithm only if there are available robots
        const assignments = hungarianAlgorithm(availableRobots, taskQueue);
        //console.log("Assignments:", assignments);
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

            //console.log("After assigning task, robot: " + JSON.stringify(robots[robot.id], null, 2));

            // Remove the assigned task from the queue
            const taskIndex = taskQueue.findIndex(t => t.x === task.x && t.y === task.y);
            //console.log(`Task index: ${taskIndex}`);
            if (taskIndex !== -1) {
                taskQueue.splice(taskIndex, 1);
            }


            // Make robot stop returning to original position
            robot.isReturning = false; // Mark the robot as not returning


            const payload = {
                status: "assign",
                x: task.x,
                y: task.y,
                taskType: task.taskType,
                robotId: robot.id
            }


            client.publish('server/task/dashboard', JSON.stringify(payload));

            console.log(`Assigned task ${task.taskType} to robot ${robot.id} at (${task.x}, ${task.y})`);
        });


    }
}

function checkIdleRobots() {
    Object.values(robots).forEach(robot => {
        // Check if the robot is idle (no tasks assigned)
        if (robot.tasks.length === 0 && !idleRobots.includes(robot.id)) {
            console.log(`Robot ${robot.id} is idle`);
            idleRobots.push(robot.id);

            //make robot go back to its original position
            const originalPosition = robots[robot.id].start_pos;
            console.log(`Original position for robot ${robot.id}:`, originalPosition);
            if (!originalPosition) {
                console.error(`Original position not found for robot ${robot.id}.`);
                return;
            }

            // Check if the robot is already at its original position
            if (robot.position.x === originalPosition.x && robot.position.y === originalPosition.y) {
                robot.isReturning = false; // Mark the robot as not returning
                return;
            }
            console.log(`Original position for robot ${robot.id}:`, originalPosition);
            const path = dijkstra(robot.position, originalPosition, robot.id);
            if (path.length > 0) {
                robot.isReturning = true; // Mark the robot as returning
                client.publish(`robots/pathUpdate/${robot.id}`, JSON.stringify({ "path": path }));
            } else {
                console.log(`No path found for robot ${robot.id} to return to original position.`);
            }
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

            // Check if task is on obstacle
            if (obstacles.some(obs => obs.x === task.x && obs.y === task.y)) {
                console.log(`Task at (${task.x}, ${task.y}) is blocked by an obstacle.`);

                const payload = {
                    status: "impossible",
                    x: task.x,
                    y: task.y,
                    taskType: task.taskType,
                    robotId: robot.id
                }

                client.publish('server/task/dashboard', JSON.stringify(payload));

                // Remove the task from the robot's tasks
                robot.tasks.shift(); // Remove the impossible task
                console.log(`Task at (${task.x}, ${task.y}) marked as impossible and removed.`);

                // // add the robot back to idle robots if it has no tasks left
                // if (robot.tasks.length === 0 && !idleRobots.includes(robot.id)) {
                //     idleRobots.push(robot.id);
                //     console.log(`Robot ${robot.id} is now idle after task removal.`);
                // }


                // Check if the robot has reached its task position
                if ((robotPosition.x === taskPosition.x) && (robotPosition.y === taskPosition.y)) {
                    console.log(`Robot ${robot.id} has completed task at (${task.x}, ${task.y})`);
                    const payload = {
                        status: "completed",
                        x: task.x,
                        y: task.y,
                        taskType: task.taskType,
                        robotId: robot.id
                    }

                    client.publish('server/task/dashboard', JSON.stringify(payload));

                    robot.tasks.shift(); // Remove the completed task
                    console.log(`Robot ${robot.id} tasks after completion:`, robot.tasks);
                }
                else if (robot.tasks.length > 0) {
                    // Recalculate path for the next task
                    let path = dijkstra(robot.position, robot.tasks[0], robot.id);
                    if (path.length > 0) {
                        client.publish(`robots/pathUpdate/${robot.id}`, JSON.stringify({ "path": path }));
                    } else {
                        console.log(`No path found for robot ${robot.id} to its next task.`);
                    }
                }
                return;
            }

            // Check if the robot has reached its task position
            if ((robotPosition.x === taskPosition.x) && (robotPosition.y === taskPosition.y)) {
                console.log(`Robot ${robot.id} has completed task at (${task.x}, ${task.y})`);
                const payload = {
                    status: "completed",
                    x: task.x,
                    y: task.y,
                    taskType: task.taskType,
                    robotId: robot.id
                }

                client.publish('server/task/dashboard', JSON.stringify(payload));

                robot.tasks.shift(); // Remove the completed task
                console.log(`Robot ${robot.id} tasks after completion:`, robot.tasks);
            }
            else {
                // If the robot is not moving and has tasks, check if it's in idleRobots
                if (!idleRobots.includes(robot.id)) {
                } else {
                    console.log(`Robot ${robot.id} is idle`);
                }
            }

            // If the robot has a task but isn't moving, check if it's in failedTasks
            if (failedTasks.has(robot.id)) {
                console.log(`Retrying pathfinding for robot ${robot.id}...`);
                let path = dijkstra(robot.position, robot.tasks[0], robot.id);
                if (path.length > 0) {
                    failedTasks.delete(robot.id); // Remove from retry list if path is found
                    client.publish(`robots/pathUpdate/${robot.id}`, JSON.stringify({ "path": path }));
                }

            }
        }
    });
}





console.log("Tasks generated:", taskQueue);

setInterval(() => {
    if (powerState == 1) {
        planTasks();
        checkIdleRobots();
        checkTasks();
    }

}, 100);
