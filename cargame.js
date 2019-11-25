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
    var b2EdgeChainDef = Box2D.Collision.Shapes.b2EdgeChainDef;
    var b2EdgeShape = Box2D.Collision.Shapes.b2EdgeShape;
    var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
    var STEER_NONE = 0;
    var STEER_RIGHT = 1;
    var STEER_LEFT = 2;
    var ACC_NONE = 0;
    var ACC_ACCELERATE = 1;
    var ACC_BRAKE = 2;
    var laps = 0;
    var maxLaps = 55;
    var KEYS_DOWN = {};
    var gameCompleted = false;
    var KEYBINDINGS = {
        accelerate: 32,
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

    function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this,
                args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    const checkLapped = debounce(function () {
        laps = laps + 1;
        if (laps >= maxLaps) {
            gameCompleted = true;
        }
    }, 1000);

    const restartGame = debounce(function () {
        window.physics = null;
        laps = 0;
        createWorld();
    }, 1000);

    Physics.prototype.collision = function () {
        this.listener = new Box2D.Dynamics.b2ContactListener();
        this.listener.EndContact = function (contact) {
            fixtureB_name = contact.GetFixtureB().GetBody().GetUserData().details.name;
            if (fixtureB_name == 'finish') {
                setTimeout(checkLapped, 500);
            }
        }
        this.listener.PostSolve = function (contact, impulse) {
            var bodyA = contact.GetFixtureA().GetBody().GetUserData(),
                bodyB = contact.GetFixtureB().GetBody().GetUserData();
            try {
                if (bodyA.contact) { bodyA.contact(contact, impulse, true) }
                if (bodyB.contact) { bodyB.contact(contact, impulse, false) }
            } catch (error) {
                console.log(error);
            }
        };
        this.world.SetContactListener(this.listener);
    };

    function winGame() {
        window.physics = null;
        var confettiSettings = { "target": "b2dCanvas", "max": "600", "size": "2", "animate": true, "props": ["circle", "square", "triangle", "line"], "colors": [[165, 104, 246], [230, 61, 135], [0, 199, 228], [253, 214, 126]], "clock": "25", "rotate": true, "width": "1024", "height": "520" };
        var confetti = new ConfettiGenerator(confettiSettings);
        confetti.render();
    }

    Physics.prototype.step = function (dt) {
        this.dtRemaining += dt;
        while (this.dtRemaining > this.stepAmount) {
            this.dtRemaining -= this.stepAmount;
            this.world.Step(this.stepAmount,
                10,
                10);
        }
        if (gameCompleted) {
            winGame();
        }
        else if (this.debugDraw) {
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
            this.context.font = "30px Verdana";
            player = getPlayerObject(true);
            if (player) {
                this.context.fillText("Damage: " + Math.round((player.details.damage / player.details.maxDamage) * 100) + "%", 425, 500);
                this.context.fillText("Lap: " + laps + "/" + maxLaps, 700, 500);
            }
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

    Physics.prototype.handleKeys = function (e) {
        if (([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) || (e.type === 'touchstart' && Object.keys(KEYBINDINGS).indexOf(e.target.id) > -1)) {
            e.preventDefault();
        }
        if (e.type === 'keydown') KEYS_DOWN[e.keyCode] = true;
        else if (e.type === 'keyup') KEYS_DOWN[e.keyCode] = false;

        if (e.type === 'mousedown') KEYS_DOWN[KEYBINDINGS[e.target.id]] = true;
        else if (e.type === 'mouseup') KEYS_DOWN[KEYBINDINGS[e.target.id]] = false;

        if (e.type === 'touchstart') KEYS_DOWN[KEYBINDINGS[e.target.id]] = true;
        else if (e.type === 'touchend') KEYS_DOWN[KEYBINDINGS[e.target.id]] = false;
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

    function MulMV(A, v) {
        var u = new b2Vec2(A.col1.x * v.x + A.col2.x * v.y, A.col1.y * v.x + A.col2.y * v.y);
        return u;
    }

    function MulX(T, v) {
        var a = MulMV(T.R, v);
        a.x += T.position.x;
        a.y += T.position.y;
        return a;
    }

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
            assignableFeatures = Object.assign({}, this.fixtureDefaults, this.details.fixtures[i]);
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
                    pointsOffset = this.fixtures[j].points.map(function (point) {
                        return { x: (point.x + offset.x), y: (point.y + offset.y) };
                    });
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
            this.body.CreateFixture(this.fixtures[j]);
        }
    };

    Body.prototype.defaults = {
        width: 4,
        height: 4,
        radius: 1
    };

    Body.prototype.fixtureDefaults = {
        isSensor: false,
        density: 2,
        friction: 1,
        restitution: 0.2,
        shapeName: "block",
        name: "arbitrary fixture",
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
            context.save();
            context.translate(offset.x, offset.y);
            switch (this.fixtures[j].shapeName) {
                case "circle":
                    context.beginPath();
                    context.arc(0, 0, this.fixtures[j].radius, 0, Math.PI * 2);
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
                    context.drawImage(this.fixtures[j].image,
                        -this.fixtures[j].width / 2,
                        -this.fixtures[j].height / 2,
                        this.fixtures[j].width,
                        this.fixtures[j].height);
                    break;
                case "block":
                default:
                    context.fillRect(
                        -this.fixtures[j].width / 2,
                        -this.fixtures[j].height / 2,
                        this.fixtures[j].width,
                        this.fixtures[j].height);
                    break;
            }
            context.restore();
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
        this.fixdef.isSensor = true;
        this.fixdef.shape.SetAsBox(details.width / 2, details.height / 2);
        this.body.CreateFixture(this.fixdef);
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
        width: 0.35,
        height: 0.75,
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
        var i;
        for (i = 0; i < this.wheels.length; i++) {
            this.wheels[i].killSidewaysVelocity();
        }
        var incr = (this.max_steer_angle / 200) * msDuration;
        if (this.steer == STEER_RIGHT) {
            this.wheel_angle = Math.min(Math.max(this.wheel_angle, 0) + incr, this.max_steer_angle)
        } else if (this.steer == STEER_LEFT) {
            this.wheel_angle = Math.max(Math.min(this.wheel_angle, 0) - incr, -this.max_steer_angle)
        } else {
            this.wheel_angle = 0;
        }
        var wheels = this.getRevolvingWheels();
        for (i = 0; i < wheels.length; i++) {
            wheels[i].setAngle(this.wheel_angle);
        }
        var base_vect;
        if ((this.accelerate == ACC_ACCELERATE) && (this.getSpeedKMH() < this.max_speed)) {
            base_vect = [0, -1];
        }
        else if (this.accelerate == ACC_BRAKE) {
            if (this.getLocalVelocity()[1] < 0) base_vect = [0, 1.3];
            else base_vect = [0, 0.7];
        }
        else {
            base_vect = [0, 0];
        }
        var fvect = [this.power * base_vect[0], this.power * base_vect[1]];
        wheels = this.getPoweredWheels();
        for (i = 0; i < wheels.length; i++) {
            var position = wheels[i].body.GetWorldCenter();
            wheels[i].body.ApplyForce(wheels[i].body.GetWorldVector(new b2Vec2(fvect[0], fvect[1])), position);
        }
        if ((this.getSpeedKMH() < 4) && (this.accelerate == ACC_NONE)) {
            this.setSpeed(0);
        }
    }

    var physics,
        lastFrame = new Date().getTime();

    window.gameLoop = function () {
        var tm = new Date().getTime();
        requestAnimationFrame(gameLoop);
        var msDuration = (tm - lastFrame);
        var dt = msDuration / 1000;
        if (dt > 1 / 15) { dt = 1 / 15; }

        if (this.physics) {
            var player = getPlayerObject(true);
            if (player) {
                if (KEYS_DOWN[KEYBINDINGS.accelerate]) {
                    player.accelerate = ACC_ACCELERATE;
                } else if (KEYS_DOWN[KEYBINDINGS.brake]) {
                    player.accelerate = ACC_BRAKE;
                } else {
                    player.accelerate = ACC_NONE;
                }
                if (KEYS_DOWN[KEYBINDINGS.steer_right]) {
                    player.steer = STEER_RIGHT;
                } else if (KEYS_DOWN[KEYBINDINGS.steer_left]) {
                    player.steer = STEER_LEFT;
                } else {
                    player.steer = STEER_NONE;
                }
                player.update(msDuration);
            }
            physics.step(dt);
            physics.world.ClearForces();
            lastFrame = tm;
        }
    };

    function createWorld() {
        var carImage = new Image();
        physics = window.physics = new Physics(document.getElementById("b2dCanvas"));
        carImage.addEventListener("load", function () {
            physics.collision();
            // physics.debug(); 

            var car = new Car(physics, {
                x: 29,
                y: 4,
                player: true,
                angle: 270,
                name: "car",
                damage: 0,
                maxDamage: 3,
                fixtures: [
                    { shapeName: "image", image: carImage, width: 1.5, height: 2.5, }
                ],
            }, {
                wheels: [{ 'x': -0.55, 'y': -.70, 'revolving': true, 'powered': true }, //top left
                { 'x': .55, 'y': -.70, 'revolving': true, 'powered': true }, //top right
                { 'x': -.55, 'y': .8, 'revolving': false, 'powered': false }, //back left
                { 'x': .55, 'y': .8, 'revolving': false, 'powered': false }], //back right
                power: 35,
                max_steer_angle: 45,
                max_speed: 50,
            });

            car.contact = function (contact, impulse, first) {
                var magnitude = Math.sqrt(
                    impulse.normalImpulses[0] * impulse.normalImpulses[0] + impulse.normalImpulses[1] * impulse.normalImpulses[1]),
                    color = Math.round(magnitude / 2);
                if (magnitude > 30) {
                    car.details.damage = car.details.damage + 1;
                    if (car.details.damage >= car.details.maxDamage) {
                        setTimeout(restartGame, 300);
                    }
                }
            };

            var finishLine = new Body(physics, {
                color: "red", x: 0, y: 0, name: "finish", type: "static",
                fixtures: [
                    { shapeName: "block", x: 33, y: 4, width: 0.1, height: 5, isSensor: true, }
                ],
            });

            var walls = new Body(physics, {
                color: "transparent", x: 0, y: 0, name: "walls", type: "static",
                fixtures: [
                    {
                        shapeName: "block", x: 5.5, y: 0, width: 0.1, height: 50,
                    }, {
                        shapeName: "block", x: 44, y: 0, width: 0.1, height: 50,
                    }, {
                        shapeName: "block", x: 0, y: 1.5, width: 105, height: 0.1,
                    }, {
                        shapeName: "block", x: 0, y: 25.5, width: 105, height: 0.1,
                    },
                    {
                        shapeName: "block", x: 26, y: 6.5, width: 25, height: 0.1,
                    }, {
                        shapeName: "block", x: 32.75, y: 8.5, width: 11.3, height: 0.1,
                    }, {
                        shapeName: "block", x: 27.9, y: 10.5, width: 2, height: 7,
                    },
                    {
                        shapeName: "polygon", x: 45, y: 1.5,
                        points: [
                            { x: 0, y: 0 },
                            { x: 0, y: 4 },
                            { x: -4, y: 0 }
                        ]
                    },
                    {
                        shapeName: "polygon", x: 5.25, y: 1.5,
                        points: [
                            { x: 4, y: 0 },
                            { x: 0, y: 4 },
                            { x: 0, y: 0 }
                        ]
                    },
                    {
                        shapeName: "polygon", x: 5.5, y: 25,
                        points: [
                            { x: 0, y: -3 },
                            { x: 3, y: 0 },
                            { x: 0, y: 0 }
                        ]
                    },
                ],
            })

            var boxes = new Body(physics, {
                color: "transparent",
                x: 21, y: 20.5, angle: 0,
                name: "boxes", type: "static",
                fixtures: [
                    {
                        shapeName: "block", x: -.1, y: -2, width: 1.9, height: 12.5,
                    },
                    {
                        shapeName: "circle", radius: 1.1, x: 0, y: -7.5,
                    },
                    {
                        shapeName: "circle", radius: 1, x: 17.5, y: -13,
                    },
                    {
                        shapeName: "circle", radius: 1.1, x: 6.75, y: -6.15,
                    },
                    {
                        shapeName: "block", x: 12, y: 2, width: 21.5, height: 5,
                    },
                    {
                        shapeName: "block", x: 18, y: -3, width: 10, height: 7,
                    },
                    {
                        shapeName: "block", x: -8.25, y: -7, width: 4.25, height: 13,
                    },
                    {
                        shapeName: "polygon", x: 13.5, y: -.5,
                        points: [
                            { x: -4, y: 0 },
                            { x: 0, y: -4 },
                            { x: 0, y: 0 }
                        ]
                    },
                    {
                        shapeName: "polygon", x: 0.8, y: -.5,
                        points: [
                            { x: 0, y: -3.5 },
                            { x: 3.5, y: 0 },
                            { x: 0, y: 0 }
                        ]
                    },
                    {
                        shapeName: "polygon", x: 23, y: -6,
                        points: [
                            { x: -4, y: 0 },
                            { x: 0, y: -4 },
                            { x: 0, y: 0 }
                        ]
                    },
                ],
            });
        });
        carImage.src = "https://multimedia.thenational.ae/assets/visual_assets/formula_one_interactive/images/f1.png";
    }

    function init() {
        createWorld();
        window.addEventListener('keydown', physics.handleKeys);
        window.addEventListener('keyup', physics.handleKeys);
        window.addEventListener('mousedown', physics.handleKeys);
        window.addEventListener('mouseup', physics.handleKeys);
        window.addEventListener('touchstart', physics.handleKeys);
        window.addEventListener('touchend', physics.handleKeys);
        // document.getElementById('carLeft').addEventListener('click', physics.handleKeys);
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
