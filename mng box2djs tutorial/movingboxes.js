(function () {
    var b2Vec2 = Box2D.Common.Math.b2Vec2;
    var b2BodyDef = Box2D.Dynamics.b2BodyDef;
    var b2Body = Box2D.Dynamics.b2Body;
    var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
    var b2Fixture = Box2D.Dynamics.b2Fixture;
    var b2World = Box2D.Dynamics.b2World;
    var b2MassData = Box2D.Collision.Shapes.b2MassData;
    var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
    var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
    var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
    var STEER_NONE = 0;
    var STEER_RIGHT = 1;
    var STEER_LEFT = 2;
    var ACC_NONE = 0;
    var ACC_ACCELERATE = 1;
    var ACC_BRAKE = 2;
    var KEYS_DOWN = {};
    var BINDINGS = {
        accelerate: 38,
        brake: 40,
        steer_left: 37,
        steer_right: 39
    };

    var Physics = window.Physics = function (element, scale) {
        var gravity = new b2Vec2(0, 0);
        this.world = new b2World(gravity, false);
        this.element = element;
        this.context = element.getContext("2d");
        this.scale = scale || 20;
        this.dtRemaining = 0;
        this.stepAmount = 1 / 60;
    };

    Physics.prototype.step = function (dt) {
        this.dtRemaining += dt;
        while (this.dtRemaining > this.stepAmount) {
            this.dtRemaining -= this.stepAmount;
            this.world.Step(this.stepAmount,
                10, // velocity iterations
                10);// position iterations
        }
        if (this.debugDraw) {
            this.world.DrawDebugData();
        } else {
            var obj = this.world.GetBodyList();
            this.context.clearRect(0, 0, this.element.width, this.element.height);
            this.context.save();
            this.context.scale(this.scale, this.scale);
            while (obj) {
                var body = obj.GetUserData();
                if (body) {
                    body.draw(this.context);
                }
                obj = obj.GetNext();
            }
            this.context.restore();
        }
    };

    Physics.prototype.debug = function () {
        this.debugDraw = new b2DebugDraw();
        this.debugDraw.SetSprite(this.context);
        this.debugDraw.SetDrawScale(this.scale);
        this.debugDraw.SetFillAlpha(0.3);
        this.debugDraw.SetLineThickness(1.0);
        this.debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
        this.world.SetDebugDraw(this.debugDraw);
    };

    Physics.prototype.click = function (callback) {
        var self = this;
        function handleClick(e) {
            e.preventDefault();
            var point = {
                x: (e.offsetX || e.layerX) / self.scale,
                y: (e.offsetY || e.layerY) / self.scale
            };
            self.world.QueryPoint(function (fixture) {
                callback(fixture.GetBody(),
                    fixture,
                    point);
            }, point);
        }
        this.element.addEventListener("mousedown", handleClick);
        this.element.addEventListener("touchstart", handleClick);
    };

    Physics.prototype.handleKeys = function (e) {
        if (e.type === 'keydown') KEYS_DOWN[e.keyCode] = true;
        else if (e.type === 'keyup') KEYS_DOWN[e.keyCode] = false;
    }

    function getPlayerObject(player) {
        var obj = window.physics.world.GetBodyList();
        while (obj) {
            var body = obj.GetUserData();
            if (body) {
                try {
                    if (body.details.player === player) { return body; }
                } catch (error) {
                    console.log(body, error);
                }
            }
            obj = obj.GetNext();
        }
    }

    function degrees_to_radians(degrees) {
        var pi = Math.PI;
        return degrees * (pi / 180);
    }

    function dotproduct(v1, v2) {
        return (v1[0] * v2[0]) + (v1[1] * v2[1]);
    };

    function normaliseRadians(radians) {
        radians = radians % (2 * Math.PI);
        if (radians < 0) {
            radians += (2 * Math.PI);
        }
        return radians;
    };

    function rotatevector(v, angle) {
        angle = normaliseRadians(angle);
        return [v[0] * Math.cos(angle) - v[1] * Math.sin(angle),
        v[0] * Math.sin(angle) + v[1] * Math.cos(angle)];
    };

    function vector_len(v) {
        return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    };

    function unit_vector(v) {
        var l = vector_len(v);
        if (l) {
            return [v[0] / l, v[1] / l];
        }
        return [0, 0];
    };

    var Body = window.Body = function (physics, details) {
        this.details = details = details || {};
        // this.definition = );
        // for (var k in this.definitionDefaults) {
        //     this.definition[k] = details[k] || this.definitionDefaults[k];
        // }
        this.definition = new b2BodyDef(Object.assign(this.definitionDefaults, this.details));
        this.definition.position = new b2Vec2(details.x || 0, details.y || 0);
        this.definition.linearVelocity = new b2Vec2(details.vx || 0, details.vy || 0);
        this.definition.angle = degrees_to_radians(details.angle) || 0;
        this.definition.userData = this;
        this.definition.type = details.type == "static" ? b2Body.b2_staticBody :
            b2Body.b2_dynamicBody;
        this.body = physics.world.CreateBody(this.definition);

        this.fixtures = [];
        for (i = 0; i < this.details.fixtures.length; i++) {
            var fixtureDef = new b2FixtureDef();
            var assignableFeatures = Object.assign(this.fixtureDefaults, this.details.fixtures[i]);
            for (var key in assignableFeatures) {
                fixtureDef[key] = assignableFeatures[key];
            }
            this.fixtures.push(fixtureDef);
        }

        for (j = 0; j < this.fixtures.length; j++) {
            offset = new b2Vec2(this.fixtures[j].x, this.fixtures[j].y);
            switch (this.fixtures[j].shapeName) {
                case "circle":
                    this.fixtures[j].radius = this.fixtures[j].radius || this.defaults.radius;
                    this.fixtures[j].shape = new b2CircleShape(this.fixtures[j].radius);
                    this.fixtures[j].shape.SetLocalPosition(offset);
                    break;
                case "polygon":
                    this.fixtures[j].shape = new b2PolygonShape();
                    pointsOffset = this.fixtures[j].points;
                    // pointsOffset = this.fixtures[j].points.map(function(point) {
                    //     return {x: (point.x + offset.x), y: (point.y + offset.y) };
                    // });
                    this.fixtures[j].shape.SetAsArray(pointsOffset,
                        pointsOffset.length);
                    break;
                case "image":
                case "block":
                default:
                    this.fixtures[j].shape = new b2PolygonShape();
                    this.fixtures[j].shape.SetAsOrientedBox(this.fixtures[j].width / 2,
                        this.fixtures[j].height / 2, offset, 0);
                    break;
            }
            console.log(this.fixtures[j])
            this.body.CreateFixture(this.fixtures[j]);
        }
    };

    Body.prototype.defaults = {
        width: 4,
        height: 4,
        radius: 1
    };

    Body.prototype.fixtureDefaults = {
        density: 2,
        friction: 1,
        restitution: 0.2,
        shapeName: "block",
    };

    Body.prototype.definitionDefaults = {
        name: "tim",
        active: true,
        allowSleep: true,
        angle: 0,
        angularVelocity: 0,
        awake: true,
        bullet: false,
        fixedRotation: false,
    };

    Body.prototype.draw = function (context) {
        if (this.details.player) {
            for (i = 0; i < this.wheels.length; i++) {
                this.wheels[i].draw(context);
            }
        }
        var pos = this.body.GetPosition(),
            angle = this.body.GetAngle();
            context.save();
            context.translate(pos.x, pos.y);
            context.rotate(angle);

        for (j = 0; j < this.fixtures.length; j++) {

            context.fillStyle = this.fixtures[j].color || this.details.color || "#000";
            offset = new b2Vec2(this.fixtures[j].x, this.fixtures[j].y);

            switch (this.fixtures[j].shapeName) {
                case "circle":
                    context.beginPath();
                    context.arc(offset.x, offset.y, this.fixtures[j].radius, 0, Math.PI * 2);
                    context.fill();
                    break;
                case "polygon":
                    var points = this.fixtures[j].points;
                    context.beginPath();
                    context.moveTo(points[0].x, points[0].y);
                    for (var i = 1; i < points.length; i++) {
                        context.lineTo(points[i].x, points[i].y);
                    }
                    context.fill();
                    break;
                case "image":
                    // context.translate(offset.x, offset.y);
                    // context.drawImage(this.fixtures[j].image,
                    //     offset.x, offset.y,
                    //     this.fixtures[j].width,
                    //     this.fixtures[j].height);
                case "block":
                default:
                    context.translate(offset.x, offset.y);
                    context.fillRect(-this.fixtures[j].width / 2,
                        -this.fixtures[j].height / 2,
                        this.fixtures[j].width,
                        this.fixtures[j].height);
                    break;
            }
            
        }
        context.restore();
    }

    function Wheel(details) {
        this.details = details = details || {};
        for (var k in this.defaults) {
            this.details[k] = details[k] || this.defaults[k];
        }
        this.position = [details.x, details.y];
        this.car = details.car;
        this.revolving = details.revolving;
        this.powered = details.powered;
        this.definition = new b2BodyDef();
        this.definition.type = b2Body.b2_dynamicBody;
        this.definition.position = this.car.body.GetWorldPoint(new b2Vec2(this.position[0], this.position[1]));
        this.definition.angle = this.car.body.GetAngle();
        this.body = window.physics.world.CreateBody(this.definition);
        this.fixdef = new b2FixtureDef;
        this.fixdef.density = 1;
        this.fixdef.shape = new b2PolygonShape();
        this.fixdef.shape.SetAsBox(details.width / 2, details.height / 2);
        this.body.CreateFixture(this.fixdef);
        console.log(details);
        if (this.revolving) {
            var jointdef = new Box2D.Dynamics.Joints.b2RevoluteJointDef();
            jointdef.Initialize(this.car.body, this.body, this.body.GetWorldCenter());
            jointdef.enableMotor = false;
        } else {
            var jointdef = new Box2D.Dynamics.Joints.b2PrismaticJointDef();
            jointdef.Initialize(this.car.body, this.body, this.body.GetWorldCenter(), new b2Vec2(1, 0));
            jointdef.enableLimit = true;
            jointdef.lowerTranslation = jointdef.upperTranslation = 0;
        }
        window.physics.world.CreateJoint(jointdef);
    }

    Wheel.prototype.defaults = {
        shape: "block",
        color: "black",
        width: 0.7,
        height: 1.5,
        x: 0,
        y: 0,
    };

    Wheel.prototype.setAngle = function (angle) {
        this.body.SetAngle(this.car.body.GetAngle() + degrees_to_radians(angle));
    };

    Wheel.prototype.getLocalVelocity = function () {
        var res = this.car.body.GetLocalVector(this.car.body.GetLinearVelocityFromLocalPoint(new b2Vec2(this.position[0], this.position[1])));
        return [res.x, res.y];
    };

    Wheel.prototype.getDirectionVector = function () {
        return rotatevector((this.getLocalVelocity()[1] > 0) ? [0, 1] : [0, -1], this.body.GetAngle());
    };

    Wheel.prototype.getKillVelocityVector = function () {
        var velocity = this.body.GetLinearVelocity();
        var sideways_axis = this.getDirectionVector();
        var dotprod = dotproduct([velocity.x, velocity.y], sideways_axis);
        return [sideways_axis[0] * dotprod, sideways_axis[1] * dotprod];
    };

    Wheel.prototype.killSidewaysVelocity = function () {
        var kv = this.getKillVelocityVector();
        this.body.SetLinearVelocity(new b2Vec2(kv[0], kv[1]));
    };

    Wheel.prototype.draw = function (context) {
        var pos = this.body.GetPosition(),
            angle = this.body.GetAngle();
        context.save();
        context.translate(pos.x, pos.y);
        context.rotate(angle);
        context.fillRect(-this.details.width / 2,
            -this.details.height / 2,
            this.details.width,
            this.details.height);
        context.restore();
    }

    var Car = window.Car = function (physics, details, carDetails) {
        Body.call(this, physics, details);
        this.steer = STEER_NONE;
        this.accelerate = ACC_NONE;
        this.wheel_angle = 0;
        this.max_steer_angle = carDetails.max_steer_angle;
        this.max_speed = carDetails.max_speed;
        this.power = carDetails.power;
        this.wheels = [];
        var wheeldef, i;
        for (i = 0; i < carDetails.wheels.length; i++) {
            wheeldef = carDetails.wheels[i];
            wheeldef.car = this;
            this.wheels.push(new Wheel(wheeldef));
        }
    }

    Car.prototype = Object.create(Body.prototype);
    Car.prototype.constructor = Car;

    Car.prototype.fixtureDefaults = {
        density: 1.0,
        friction: 0.3,
        restitution: 0.4
    };

    Car.prototype.definitionDefaults = {
        linearDamping: 0.3,
        bullet: true,
        angularDamping: 0.3,
    };

    Car.prototype.getPoweredWheels = function () {
        var retv = [];
        for (var i = 0; i < this.wheels.length; i++) {
            if (this.wheels[i].powered) {
                retv.push(this.wheels[i]);
            }
        }
        return retv;
    };

    Car.prototype.getLocalVelocity = function () {
        var retv = this.body.GetLocalVector(this.body.GetLinearVelocityFromLocalPoint(new b2Vec2(0, 0)));
        return [retv.x, retv.y];
    };

    Car.prototype.getRevolvingWheels = function () {
        var retv = [];
        for (var i = 0; i < this.wheels.length; i++) {
            if (this.wheels[i].revolving) {
                retv.push(this.wheels[i]);
            }
        }
        return retv;
    };

    Car.prototype.getSpeedKMH = function () {
        var velocity = this.body.GetLinearVelocity();
        var len = vector_len([velocity.x, velocity.y]);
        return (len / 1000) * 3600;
    };

    Car.prototype.setSpeed = function (speed) {
        var velocity = this.body.GetLinearVelocity();
        velocity = unit_vector([velocity.x, velocity.y]);
        velocity = new b2Vec2(velocity[0] * ((speed * 1000.0) / 3600.0),
            velocity[1] * ((speed * 1000.0) / 3600.0));
        this.body.SetLinearVelocity(velocity);
    };

    Car.prototype.update = function (msDuration) {
        //kill sideways velocity for all wheels
        var i;
        for (i = 0; i < this.wheels.length; i++) {
            this.wheels[i].killSidewaysVelocity();
        }
        //calculate the change in wheel's angle for this update, assuming the wheel will reach is maximum angle from zero in 200 ms
        var incr = (this.max_steer_angle / 200) * msDuration;
        if (this.steer == STEER_RIGHT) {
            this.wheel_angle = Math.min(Math.max(this.wheel_angle, 0) + incr, this.max_steer_angle) //increment angle without going over max steer
        } else if (this.steer == STEER_LEFT) {
            this.wheel_angle = Math.max(Math.min(this.wheel_angle, 0) - incr, -this.max_steer_angle) //decrement angle without going over max steer
        } else {
            this.wheel_angle = 0;
        }
        //update revolving wheels
        var wheels = this.getRevolvingWheels();
        for (i = 0; i < wheels.length; i++) {
            wheels[i].setAngle(this.wheel_angle);
        }
        var base_vect; //vector pointing in the direction force will be applied to a wheel ; relative to the wheel.
        //if accelerator is pressed down and speed limit has not been reached, go forwards
        if ((this.accelerate == ACC_ACCELERATE) && (this.getSpeedKMH() < this.max_speed)) {
            base_vect = [0, -1];
        }
        else if (this.accelerate == ACC_BRAKE) {
            //braking, but still moving forwards - increased force
            if (this.getLocalVelocity()[1] < 0) base_vect = [0, 1.3];
            //going in reverse - less force
            else base_vect = [0, 0.7];
        }
        else base_vect = [0, 0];
        //multiply by engine power, which gives us a force vector relative to the wheel
        var fvect = [this.power * base_vect[0], this.power * base_vect[1]];
        //apply force to each wheel
        wheels = this.getPoweredWheels();
        for (i = 0; i < wheels.length; i++) {
            var position = wheels[i].body.GetWorldCenter();
            wheels[i].body.ApplyForce(wheels[i].body.GetWorldVector(new b2Vec2(fvect[0], fvect[1])), position);
        }
        //if going very slow, stop - to prevent endless sliding
        if ((this.getSpeedKMH() < 4) && (this.accelerate == ACC_NONE)) {
            this.setSpeed(0);
        }
    }

    var Enemy = window.Enemy = function (physics, details, carDetails) {
        Car.call(this, physics, details, carDetails);
    }

    Enemy.prototype = Object.create(Car.prototype);
    Enemy.prototype.constructor = Car;

    var physics,
        lastFrame = new Date().getTime();

    window.gameLoop = function () {
        var tm = new Date().getTime();
        requestAnimationFrame(gameLoop);
        var msDuration = (tm - lastFrame);
        var dt = msDuration / 1000;
        if (dt > 1 / 15) { dt = 1 / 15; }

        var player = getPlayerObject(true);
        if (player) {
            if (KEYS_DOWN[BINDINGS.accelerate]) {
                player.accelerate = ACC_ACCELERATE;
            } else if (KEYS_DOWN[BINDINGS.brake]) {
                player.accelerate = ACC_BRAKE;
            } else {
                player.accelerate = ACC_NONE;
            }
            if (KEYS_DOWN[BINDINGS.steer_right]) {
                player.steer = STEER_RIGHT;
            } else if (KEYS_DOWN[BINDINGS.steer_left]) {
                player.steer = STEER_LEFT;
            } else {
                player.steer = STEER_NONE;
            }
            player.update(msDuration);
        }

        var enemy = getPlayerObject(false);
        if (enemy) {
            // console.log(enemy.body.GetPosition().y);
            enemyPos = enemy.body.GetPosition();
            console.log(enemyPos);

            if (enemyPos.y < 16) {
                enemy.accelerate = ACC_ACCELERATE;
            }
            if (enemyPos.x < 10 || enemyPos.x > 35) {
                enemy.steer = STEER_LEFT;
            }
            else {
                enemy.steer = STEER_NONE;
            }
            // else if (KEYS_DOWN[BINDINGS.brake]) {
            //     car.accelerate = ACC_BRAKE;
            // } else {
            //     car.accelerate = ACC_NONE;
            // }
            // if (KEYS_DOWN[BINDINGS.steer_right]) {
            //     car.steer = STEER_RIGHT;
            // } else if (KEYS_DOWN[BINDINGS.steer_left]) {
            //     car.steer = STEER_LEFT;
            // } else {
            //     car.steer = STEER_NONE;
            // }
            enemy.update(msDuration);
            // console.log(enemy);
        }

        physics.step(dt);
        physics.world.ClearForces();
        lastFrame = tm;
    };

    function createWorld() {
        var carImage = new Image();
        physics = window.physics = new Physics(document.getElementById("b2dCanvas"));
        carImage.addEventListener("load", function () {
    

            // var test = new Body(physics,
            //     {
            //         color: "red", type: "static", name: "test",
            //         fixtures: [
            //             { x: 0.5, y: 0, height: 50, width: 0.5 },
            //             { x: 50, y: 0, height: 50, width: 0.5 },
            //             { x: 0, y: 0.5, height: 0.5, width: 120 },
            //             { x: 0, y: 24.5, height: 0.5, width: 120 },
            //         ],
            //     });
            // console.log(test);

            var car = new Car(physics, {
                color: "yellow",
                x: 45,
                y: 15,
                player: true,
                angle: 0,
                fixtures: [
                    { shapeName: "block", image: carImage, width: 2.5, height: 5, }
                ],
            }, {
                wheels: [{ 'x': -1.1, 'y': -1.4, 'revolving': true, 'powered': true }, //top left
                { 'x': 1.1, 'y': -1.4, 'revolving': true, 'powered': true }, //top right
                { 'x': -1.1, 'y': 1.6, 'revolving': false, 'powered': false }, //back left
                { 'x': 1.1, 'y': 1.6, 'revolving': false, 'powered': false }], //back right
                power: 300,
                max_steer_angle: 30,
                max_speed: 200,
            });

            // console.log(car);
            // physics.debug();
            var triangle = new Body(physics, {
                color: "pink", x: 20, y: 10,
                fixtures: [
                    {
                        shapeName: "block", x: 0, y: 5, width: 5, height: 5,
                    },
                    {
                        shapeName: "circle", radius: 1, x: 0, y: -10,
                    },
                    {
                        shapeName: "polygon", x: 0.25, y: 5,
                        points: [
                            { x: 0, y: 0 },
                            { x: 0, y: 4 },
                            { x: -10, y: 0 }
                        ]
                    },
                ],
            });

            // var circle = new Body(physics,
            //     {
            //         color: "gray", x: 10, y: 0,
            //         fixtures: [
            //             { shapeName: "circle", radius: 4, x: 10, y: 20 }
            //         ]
            //     });
            // console.log(circle);

            // new Body(physics, { color: "red", type: "static", x: 51, y: 0, height: 50, width: 0.5 });
            // new Body(physics, { color: "red", type: "static", x: 0, y: 0, height: 0.5, width: 120 });
            // new Body(physics, { color: "red", type: "static", x: 0, y: 25, height: 0.5, width: 120 });
            // new Body(physics, { color: "gray", type: "static", x: 12.5, y: 12, height: 12, width: 0.5 });
            // new Body(physics, { color: "gray", type: "static", x: 37.5, y: 12, height: 12, width: 0.5 });
            // new Body(physics, { color: "gray", type: "static", x: 25, y: 6, height: 0.5, width: 25 });
            // new Body(physics, { color: "gray", type: "static", x: 25, y: 18, height: 0.5, width: 25 });

            // var circle = new Body(physics, {
            //     color: "pink",
            //     type: "static",
            //     fixtures: [
            //         {
            //             shape: "circle",
            //             radius: 1,
            //             points: [
            //                 { x: 0, y: 0 },
            //                 { x: 0, y: 4 },
            //                 { x: 10, y: 0 },
            //                 { x: 20, y: 4 }
            //             ],
            //         }
            //     ],
            //     x: 20, y: 5
            // });

            // console.log(circle);

            // var enemy = new Enemy(physics, {
            //     color: "yellow",
            //     x: 5,
            //     y: 15,
            //     player: false,
            //     angle: 180,
            // }, {
            //     wheels: [{ 'x': -1.1, 'y': -1.4, 'revolving': true, 'powered': true }, //top left
            //     { 'x': 1.1, 'y': -1.4, 'revolving': true, 'powered': true }, //top right
            //     { 'x': -1.1, 'y': 1.6, 'revolving': false, 'powered': false }, //back left
            //     { 'x': 1.1, 'y': 1.6, 'revolving': false, 'powered': false }], //back right
            //     power: 300,
            //     max_steer_angle: 30,
            //     max_speed: 200,
            // });

            physics.click(function (body) {
                console.log(body)
            });
        });
        carImage.src = "images/f1.png";
    }

    function init() {
        createWorld();
        window.addEventListener('keydown', physics.handleKeys);
        window.addEventListener('keyup', physics.handleKeys);
        requestAnimationFrame(gameLoop);
    }

    window.addEventListener("load", init);
}());

(function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () { callback(currTime + timeToCall); },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
}());

