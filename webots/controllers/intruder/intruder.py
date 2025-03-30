from controller import Supervisor
from random import randrange

robot = Supervisor()
supervisorNode = robot.getSelf()

# get the time step of the current world
timestep = int(robot.getBasicTimeStep())

# calculate a multiple of timestep close to one second
duration = (1000 // timestep) * timestep

# get handles to distance sensors
sensors = [robot.getDevice("ds" + str(i)) for i in range(4)]
for sensor in sensors:
    sensor.enable(timestep)

# execute every second
while robot.step(duration) != -1:
    blocked = True
    while blocked:
        direction = randrange(5) # pick random direction, 4 means stay put
        blocked = direction < 4 and sensors[direction].getValue() < 1000
    pos = supervisorNode.getPosition()
    if direction == 0:
        pos[0] = pos[0] + 0.1
    if direction == 1:
        pos[1] = pos[1] + 0.1
    if direction == 2:
        pos[0] = pos[0] - 0.1
    if direction == 3:
        pos[1] = pos[1] - 0.1
    trans = supervisorNode.getField("translation")
    trans.setSFVec3f(pos)
    