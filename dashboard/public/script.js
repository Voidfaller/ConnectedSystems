let client;
let brokerIp = "145.137.68.141"; // Replace with broker IP adres

// Move lastPlace outside of placeObject to retain its state
const lastPlace = {
    robot1: { x: 0, y: 0 },
    robot2: { x: 0, y: 0 },
    robot3: { x: 0, y: 0 },
    robot4: { x: 0, y: 0 }
};

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById("buttonStart");
    const stopButton = document.getElementById("buttonStop");
    const enterButton = document.getElementById("enterButton");
    startButton.addEventListener("click", function () {
        start();
    });
    stopButton.addEventListener("click", function () {
        stop();
    });

    enterButton.addEventListener("click", function () {
        const task_x = document.getElementById("task_x").value;
        const task_y = document.getElementById("task_y").value;
        const taskType = document.getElementById("load").value;
        const taskRobot = document.getElementById("robot_id").value;

        const payload = {
            x: parseInt(task_x),
            y: parseInt(task_y),
            taskType: taskType,
            robotId: taskRobot
        };

        if (validate_target(payload.x, payload.y, payload.robotId) == 1) {
            client.publish("server/task/target", JSON.stringify(payload));
            addTaskToListTable(payload);
        } else {
            alert("Invalid input!");
        }

        document.getElementById("task_x").value = "";
        document.getElementById("task_y").value = "";
        document.getElementById("robot_id").value = "";
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
        for (let i = 10; i >= 0; i--) {
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
        } else if (topic.startsWith("server/task/dashboard")) {
            const task = payload;
            const taskRows = document.querySelectorAll("#tasklist-box tr");

            let taskRow = null;

            taskRows.forEach((row) => {
                const locationCell = row.children[0]; // Assuming the first column is the target location
                if (locationCell.textContent === `(${task.x}, ${task.y})`) {
                    taskRow = row;
                }
            });

            if (taskRow) {
                if (task.status == "completed") {
                    const statusCell = taskRow.children[3]; // Assuming the 4th column is for status
                    statusCell.textContent = "Completed";
                                        
                    console.log(`Task (${task.x}, ${task.y}) updated: Robot ID = ${task.robotId}, Status = Completed`);
                } else if(task.status == "impossible"){
                    const statusCell = taskRow.children[3]; // Assuming the 4th column is for status
                    statusCell.textContent = "Impossible";
                                        
                    console.log(`Task (${task.x}, ${task.y}) updated: Robot ID = ${task.robotId}, Status = Impossible`);
                } else {
                    // Update the robot ID column
                    const robotIdCell = taskRow.children[2]; // Assuming the 3rd column is for robot ID
                    robotIdCell.textContent = task.robotId;

                    // Update the status column
                    const statusCell = taskRow.children[3]; // Assuming the 4th column is for status
                    statusCell.textContent = "In Progress";
                    
                    console.log(`Task (${task.x}, ${task.y}) updated: Robot ID = ${task.robotId}, Status = In Progress`);
                }


            } else {
                console.warn(`Task (${task.x}, ${task.y}) not found in the task list.`);
            }
        }
    });


});

// topics to subscribe to
const topics = [
    "robots/world/obstacles", "robots/position/#", "robots/obstacle/#", "server/task/dashboard"];

function connectMQTT() {
    const brokerUrl = `ws://${brokerIp}:9001`;
    client = mqtt.connect(brokerUrl, { clientId: 'dashboard' });
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
};

function validate_target(x, y, robot_id = "") {
    // Validate if target location is within the grid
    if (x < 0 || x > 10 || y < 0 || y > 10 || isNaN(x) || isNaN(y)) {
        return 0;
    }

    // Validate whether a valid robot_id is in the correct range or not entered
    if ((robot_id !== "" || isNaN(robot_id)) && (robot_id < 1 || robot_id > 4)) {
        return 0;
    }

    return 1;
}

function addTaskToListTable(taskinfo) {
    const tasklistBox = document.getElementById("tasklist-box");

    // Create a new row
    const row = document.createElement("tr");
    row.setAttribute("id", `(${taskinfo.x}, ${taskinfo.y})`);

    // Create and populate the first column (target location)
    const locationCell = document.createElement("td");
    locationCell.textContent = `(${taskinfo.x}, ${taskinfo.y})`;
    row.appendChild(locationCell);

    // Create and populate the first column (target location)
    const typeCell = document.createElement("td");
    typeCell.textContent = `${taskinfo.taskType}`;
    row.appendChild(typeCell);

    // Create and populate the second column (robot ID)
    const robotIdCell = document.createElement("td");
    robotIdCell.textContent = taskinfo.robotId || "N/A"; // Default to "N/A" if robotId is not provided
    row.appendChild(robotIdCell);

    // Create and populate the third column (status)
    const statusCell = document.createElement("td");
    statusCell.textContent = taskinfo.status || "Pending"; // Default to "Pending" if status is not provided
    row.appendChild(statusCell);

    // Append the row to the table
    tasklistBox.appendChild(row);
}