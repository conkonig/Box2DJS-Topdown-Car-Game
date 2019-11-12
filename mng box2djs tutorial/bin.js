
Physics.prototype.moveRedBox = function (e) {
    var self = this;

    function getPlayerObject() {
        var obj = self.world.GetBodyList();
        while (obj) {
            var body = obj.GetUserData();
            if (body) {
                try {
                    console.log(body.details);
                    if (body.details.player) { return body; }
                } catch (error) {
                    console.log(body);
                    console.log(error);
                }
            }
            obj = obj.GetNext();
        }
    }

    function rotateCar(angle) {
        player.SetAngle(player.GetAngle() + angle)
    }

    function forwardBack(desiredVelY) {
        velChangeY = desiredVelY - vel.y;
        impulseY = player.GetMass() * velChangeY;
        console.log("player angle " + player.GetAngle());
        console.log("player center x " + player.GetWorldCenter().x);
        console.log("player position  x " + player.GetPosition().x);
        player.ApplyImpulse({ x: player.GetAngle(), y: impulseY }, player.GetWorldCenter());
    }

    var moveState = e.keyCode;

    console.log(moveState, ' keypressed');
    var player = getPlayerObject().body;
    var position = player.GetWorldCenter();
    vel = player.GetLinearVelocity();



    // desiredVelX = 0;
    desiredVelY = 0;
    switch (moveState) {
        case steer_left:
            // desiredVelX = -5;
            // rotateCar(-.5);
            break;
        case brake:
            // forwardBack(-5); 
            break;
        case steer_right:
            // desiredVelX = 5; 
            // rotateCar(0.5);
            break;
        case accelerate:
            // forwardBack(5); 
            break;
    }
    // velChangeX = desiredVelX - vel.x;
    // impulseX = player.GetMass() * velChangeX;
}



var car = new Body(physics, {
    color: "yellow",
    width: 5,
    height: 10,
    shape: "block",
    x: 8,
    y: 3,
    angle: 180,
    power: 60,
    max_steer_angle: 20,
    max_speed: 60,
    player: true,
    fixedRotation: true,
    linearDamping: 0.15,
    bullet: true,
    angularDamping: 0.3,
    wheels: [{ 'x': -2.5, 'y': -3.2, 'width': 1, 'length': 1.8, 'revolving': true, 'powered': true }, //top left
    { 'x': 2.5, 'y': -3.2, 'width': 1, 'length': 1.8, 'revolving': true, 'powered': true }, //top right
    { 'x': -2.5, 'y': 3.2, 'width': 1, 'length': 1.8, 'revolving': false, 'powered': false }, //back left
    { 'x': 2.5, 'y': 3.2, 'width': 1, 'length': 1.8, 'revolving': false, 'powered': false }]//back right
});