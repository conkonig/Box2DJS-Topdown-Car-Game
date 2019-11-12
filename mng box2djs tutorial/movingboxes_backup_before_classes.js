(function () {
    // Pull out common classes
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

    // API_Method 01 - Create world constructor
    var Physics = window.Physics = function (element, scale) {
        // var gravity = new b2Vec2(0, 9.8);
        var gravity = new b2Vec2(0, 0);
        this.world = new b2World(gravity, false);
        this.element = element;
        this.context = element.getContext("2d");
        this.scale = scale || 20;
        this.dtRemaining = 0;
        this.stepAmount = 1 / 60;
    };
    // API_Method 02 - Stepping the world
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
            // API Part 09 modify step method to take over rendering
            var obj = this.world.GetBodyList();
            this.context.clearRect(0, 0, this.element.width, this.element.height);

            this.context.save();
            this.context.scale(this.scale, this.scale);
            while (obj) {
                var body = obj.GetUserData();
                if (body) { body.draw(this.context); }

                obj = obj.GetNext();
            }
            this.context.restore();
        }
    };
    // API_Method 03 - debug draw
    Physics.prototype.debug = function () {
        this.debugDraw = new b2DebugDraw();
        this.debugDraw.SetSprite(this.context);
        this.debugDraw.SetDrawScale(this.scale);
        this.debugDraw.SetFillAlpha(0.3);
        this.debugDraw.SetLineThickness(1.0);
        this.debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
        this.world.SetDebugDraw(this.debugDraw);
    };

    // API Part 11 - Physics handle click events
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
        if(e.type === 'keydown') KEYS_DOWN[e.keyCode] = true;
        else if(e.type === 'keyup') KEYS_DOWN[e.keyCode] = false;
    }

    function Wheel(details) {
        this.position = [details.x, details.y];
        this.car = details.car;
        this.revolving = details.revolving;
        this.powered = details.powered;
        this.details = details = details || {};

        var def = new b2BodyDef();
        def.type = b2Body.b2_dynamicBody;
        def.position = this.car.body.GetWorldPoint(new b2Vec2(this.position[0], this.position[1]));
        def.angle = this.car.body.GetAngle();

        this.body = window.physics.world.CreateBody(def);

        var fixdef = new b2FixtureDef;
        fixdef.density = 1;
        fixdef.isSensor = true; //wheel does not participate in collision calculations: resulting complications are unnecessary
        fixdef.shape = new b2PolygonShape();
        fixdef.shape.SetAsBox(this.details.width / 2, this.details.length / 2);
        this.body.CreateFixture(fixdef);
        //create joint to connect wheel to body
        if (this.revolving) {
            var jointdef = new Box2D.Dynamics.Joints.b2RevoluteJointDef();
            jointdef.Initialize(this.car.body, this.body, this.body.GetWorldCenter());
            jointdef.enableMotor = false; //we'll be controlling the wheel's angle manually
        } else {
            var jointdef = new Box2D.Dynamics.Joints.b2PrismaticJointDef();
            jointdef.Initialize(this.car.body, this.body, this.body.GetWorldCenter(), new b2Vec2(1, 0));
            jointdef.enableLimit = true;
            jointdef.lowerTranslation = jointdef.upperTranslation = 0;
        }
        window.physics.world.CreateJoint(jointdef);
    }

    function degrees_to_radians(degrees) {
        var pi = Math.PI;
        return degrees * (pi / 180);
    }

    function dotproduct(v1, v2) {
        return (v1[0] * v2[0]) + (v1[1] * v2[1]);
    };

    function normaliseRadians(radians){
        radians=radians % (2*Math.PI);
        if(radians<0) {
            radians+=(2*Math.PI);
        }
        return radians;
    };

    function rotatevector(v, angle) {
        angle = normaliseRadians(angle);
        return [v[0] * Math.cos(angle) - v[1] * Math.sin(angle),
        v[0] * Math.sin(angle) + v[1] * Math.cos(angle)];
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

    // API Part 06 - Declare body class
    var Body = window.Body = function (physics, details) {
        this.steer = STEER_NONE;
        this.accelerate = ACC_NONE;
        this.max_steer_angle = details.max_steer_angle;
        this.max_speed = details.max_speed;
        this.power = details.power;
        this.wheel_angle = 0;
        this.details = details = details || {};

        // Create the definition
        this.definition = new b2BodyDef();

        // Set up the definition
        for (var k in this.definitionDefaults) {
            this.definition[k] = details[k] || this.definitionDefaults[k];
        }
        this.definition.position = new b2Vec2(details.x || 0, details.y || 0);
        this.definition.linearVelocity = new b2Vec2(details.vx || 0, details.vy || 0);
        this.definition.userData = this;
        this.definition.type = details.type == "static" ? b2Body.b2_staticBody :
            b2Body.b2_dynamicBody;

        // Create the Body
        this.body = physics.world.CreateBody(this.definition);

        // Create the fixture
        this.fixtureDef = new b2FixtureDef();
        for (var l in this.fixtureDefaults) {
            this.fixtureDef[l] = details[l] || this.fixtureDefaults[l];
        }

        // Create the shape
        details.shape = details.shape || this.defaults.shape;

        switch (details.shape) {
            case "circle":
                details.radius = details.radius || this.defaults.radius;
                this.fixtureDef.shape = new b2CircleShape(details.radius);
                break;
            case "polygon":
                this.fixtureDef.shape = new b2PolygonShape();
                this.fixtureDef.shape.SetAsArray(details.points, details.points.length);
                break;
            case "block":
            default:
                details.width = details.width || this.defaults.width;
                details.height = details.height || this.defaults.height;

                this.fixtureDef.shape = new b2PolygonShape();
                this.fixtureDef.shape.SetAsBox(details.width / 2,
                    details.height / 2);
                break;
        }

        this.body.CreateFixture(this.fixtureDef);

        if (details.player && details.wheels) {
            //initialize wheels
            this.wheels = []
            var wheeldef, i;
            for (i = 0; i < details.wheels.length; i++) {
                wheeldef = details.wheels[i];
                wheeldef.car = this;
                this.wheels.push(new Wheel(wheeldef));
            }
        }
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

    Body.prototype.getPoweredWheels = function () {
        var retv = [];
        for (var i = 0; i < this.wheels.length; i++) {
            if (this.wheels[i].powered) {
                retv.push(this.wheels[i]);
            }
        }
        return retv;
    };

    Body.prototype.getLocalVelocity = function () {
        var retv = this.body.GetLocalVector(this.body.GetLinearVelocityFromLocalPoint(new b2Vec2(0, 0)));
        return [retv.x, retv.y];
    };

    Body.prototype.getRevolvingWheels = function () {
        var retv = [];
        for (var i = 0; i < this.wheels.length; i++) {
            if (this.wheels[i].revolving) {
                retv.push(this.wheels[i]);
            }
        }
        return retv;
    };

    Body.prototype.getSpeedKMH = function () {
        var velocity = this.body.GetLinearVelocity();
        var len = vector_len([velocity.x, velocity.y]);
        return (len / 1000) * 3600;
    };

    Body.prototype.setSpeed = function (speed) {
        var velocity = this.body.GetLinearVelocity();
        velocity = unit_vector([velocity.x, velocity.y]);
        velocity = new b2Vec2(velocity[0] * ((speed * 1000.0) / 3600.0),
            velocity[1] * ((speed * 1000.0) / 3600.0));
        this.body.SetLinearVelocity(velocity);
    };

    // API Part 07 - Declare definition defaults
    Body.prototype.defaults = {
        shape: "block",
        width: 4,
        height: 4,
        radius: 1
    };

    Body.prototype.fixtureDefaults = {
        density: 2,
        friction: 1,
        restitution: 0.2
    };

    Body.prototype.definitionDefaults = {
        active: true,
        allowSleep: true,
        angle: 0,
        angularVelocity: 0,
        awake: true,
        bullet: false,
        fixedRotation: false
    };

    Body.prototype.update = function (msDuration) {
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

    var physics,
        lastFrame = new Date().getTime();

    window.gameLoop = function () {
        var tm = new Date().getTime();
        requestAnimationFrame(gameLoop);
        var msDuration = (tm - lastFrame);
        var dt = msDuration / 1000;
        if (dt > 1 / 15) { dt = 1 / 15; }

        function getPlayerObject() {
            var obj = window.physics.world.GetBodyList();
            while (obj) {
                var body = obj.GetUserData();
                if (body) {
                    try {
                        if (body.details.player) { return body; }
                    } catch (error) {
                        console.log(body);
                        console.log(error);
                    }
                }
                obj = obj.GetNext();
            }
        }

        var car = getPlayerObject();
        if (KEYS_DOWN[BINDINGS.accelerate]) {
            car.accelerate = ACC_ACCELERATE;
        } else if (KEYS_DOWN[BINDINGS.brake]) {
            car.accelerate = ACC_BRAKE;
        } else {
            car.accelerate = ACC_NONE;
        }
        if (KEYS_DOWN[BINDINGS.steer_right]) {
            car.steer = STEER_RIGHT;
        } else if (KEYS_DOWN[BINDINGS.steer_left]) {
            car.steer = STEER_LEFT;
        } else {
            car.steer = STEER_NONE;
        }
        car.update(msDuration);

        physics.step(dt);
        physics.world.ClearForces();
        lastFrame = tm;
    };

    function createWorld() {
        physics = window.physics = new Physics(document.getElementById("b2dCanvas"));
        physics.debug();
        new Body(physics, { color: "red", type: "static", x: 0, y: 0, height: 50, width: 0.5 });
        new Body(physics, { color: "red", type: "static", x: 51, y: 0, height: 50, width: 0.5 });
        new Body(physics, { color: "red", type: "static", x: 0, y: 0, height: 0.5, width: 120 });
        new Body(physics, { color: "red", type: "static", x: 0, y: 25, height: 0.5, width: 120 });
        new Body(physics, { color: "gray", shape: "circle", radius: 4, x: 5, y: 20 });

        var car = new Body(physics, {
            color: "yellow",
            width: 5,
            height: 10,
            shape: "block",
            x: 25,
            y: 10,
            angle: 180,
            power: 200,
            max_steer_angle: 20,
            max_speed: 200,

            linearDamping: 0.15,
            bullet: true,
            angularDamping: 0.3,

            density: 1.0,
            friction: 0.3,
            restitution: 0.4,  

            player: true,
            wheels: [{ 'x': -2.5, 'y': -3.2, 'width': 1, 'length': 1.8, 'revolving': true, 'powered': true }, //top left
            { 'x': 2.5, 'y': -3.2, 'width': 1, 'length': 1.8, 'revolving': true, 'powered': true }, //top right
            { 'x': -2.5, 'y': 3.2, 'width': 1, 'length': 1.8, 'revolving': false, 'powered': false }, //back left
            { 'x': 2.5, 'y': 3.2, 'width': 1, 'length': 1.8, 'revolving': false, 'powered': false }]//back right
        });

        physics.click(function (body) {
            console.log(body)
        });
    }

    function init() {
        createWorld();
        window.addEventListener('keydown', physics.handleKeys );
        window.addEventListener('keyup', physics.handleKeys );
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

