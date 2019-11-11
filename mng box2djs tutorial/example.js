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
  // API_Method 01 - Create world constructor
  var Physics = window.Physics = function (element, scale) {
    // var gravity = new b2Vec2(0, 9.8);
    var gravity = new b2Vec2(0, 0);
    this.world = new b2World(gravity, true);
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

  Physics.prototype.moveCarForward = function(callback) {
    var self = this;

    function handleDrive(e) {
      e.preventDefault();
      self.world.GetBodyList();
    }

    this.element.addEventListener("keydown", handleDrive);
  }

  //  API Part 15 - Object drag and drop 
  Physics.prototype.dragNDrop = function () {
    var self = this;
    var obj = null;
    var joint = null;

    function calculateWorldPosition(e) {
      return point = {
        x: (e.offsetX || e.layerX) / self.scale,
        y: (e.offsetY || e.layerY) / self.scale
      };
    }

    this.element.addEventListener("mousedown", function (e) {
      e.preventDefault();
      var point = calculateWorldPosition(e);
      self.world.QueryPoint(function (fixture) {
        obj = fixture.GetBody().GetUserData();
      }, point);
    });

    this.element.addEventListener("mousemove", function (e) {
      if (!obj) { return; }
      var point = calculateWorldPosition(e);

      if (!joint) {
        var jointDefinition = new Box2D.Dynamics.Joints.b2MouseJointDef();

        jointDefinition.bodyA = self.world.GetGroundBody();
        jointDefinition.bodyB = obj.body;
        jointDefinition.target.Set(point.x, point.y);
        jointDefinition.maxForce = 100000;
        jointDefinition.timeStep = self.stepAmount;
        joint = self.world.CreateJoint(jointDefinition);
      }

      joint.SetTarget(new b2Vec2(point.x, point.y));
    });

    this.element.addEventListener("mouseup", function (e) {
      obj = null;
      if (joint) {
        self.world.DestroyJoint(joint);
        joint = null;
      }
    });

  };

  // API part 13 - collision detection
  Physics.prototype.collision = function () {
    this.listener = new Box2D.Dynamics.b2ContactListener();
    this.listener.PostSolve = function (contact, impulse) {
      var bodyA = contact.GetFixtureA().GetBody().GetUserData(),
        bodyB = contact.GetFixtureB().GetBody().GetUserData();

      if (bodyA.contact) { bodyA.contact(contact, impulse, true) }
      if (bodyB.contact) { bodyB.contact(contact, impulse, false) }

    };
    this.world.SetContactListener(this.listener);
  };

  // API Part 06 - Declare body class
  var Body = window.Body = function (physics, details) {
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

  // API Part 10 - Bodies can draw themselves
  Body.prototype.draw = function (context) {
    var pos = this.body.GetPosition(),
      angle = this.body.GetAngle();

    context.save();
    context.translate(pos.x, pos.y);
    context.rotate(angle);


    if (this.details.color) {
      context.fillStyle = this.details.color;

      switch (this.details.shape) {
        case "circle":
          context.beginPath();
          context.arc(0, 0, this.details.radius, 0, Math.PI * 2);
          context.fill();
          break;
        case "polygon":
          var points = this.details.points;
          context.beginPath();
          context.moveTo(points[0].x, points[0].y);
          for (var i = 1; i < points.length; i++) {
            context.lineTo(points[i].x, points[i].y);
          }
          context.fill();
          break;
        case "block":
          context.fillRect(-this.details.width / 2,
            -this.details.height / 2,
            this.details.width,
            this.details.height);
        default:
          break;
      }
    }

    if (this.details.image) {
      context.drawImage(this.details.image,
        -this.details.width / 2,
        -this.details.height / 2,
        this.details.width,
        this.details.height);

    }

    context.restore();

  }


  var physics,
    lastFrame = new Date().getTime();

  // API_Method 05 - Game loop + handling unfocused tab
  window.gameLoop = function () {
    var tm = new Date().getTime();
    requestAnimationFrame(gameLoop);
    var dt = (tm - lastFrame) / 1000;
    if (dt > 1 / 15) { dt = 1 / 15; }
    physics.step(dt);
    lastFrame = tm;
  };

  function createWorld() {
    physics = window.physics = new Physics(document.getElementById("b2dCanvas"));
    physics.collision();
    // API Part 08 - create some bodies to put in the world aka Create some walls
    new Body(physics, { color: "red", type: "static", x: 0, y: 0, height: 50, width: 0.5 });
    new Body(physics, { color: "red", type: "static", x: 51, y: 0, height: 50, width: 0.5 });
    new Body(physics, { color: "red", type: "static", x: 0, y: 0, height: 0.5, width: 120 });
    new Body(physics, { color: "red", type: "static", x: 0, y: 25, height: 0.5, width: 120 });
    new Body(physics, { color: "blue", x: 8, y: 3 });
    new Body(physics, { color: "gray", shape: "circle", radius: 4, x: 5, y: 20 });
    new Body(physics, {
      color: "pink", shape: "polygon",
      points: [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: -10, y: 0 }],
      x: 20, y: 5
    });
    // API Part 14 - Extend a body with a contact callback
    var body = new Body(physics, {
      color: "blue",
      x: 8,
      y: 3
    });
    body.contact = function (contact, impulse, first) {
      var magnitude = Math.sqrt(
        impulse.normalImpulses[0] * impulse.normalImpulses[0] + impulse.normalImpulses[1] * impulse.normalImpulses[1]),
        color = Math.round(magnitude / 2);

      if (magnitude > 10) {
        this.details.color = "rgb(" + color + ",50,50)";
      }
    };

    // API part 12 - test apply impulse
    physics.click(function(body) {
      body.ApplyImpulse({ x: 1000, y: -1000 }, body.GetWorldCenter());
    });

    physics.dragNDrop();
    // physics.moveCarForward();

    setupJoint(physics);
  }

  function setupJoint(physics) {

  }

  // API_Method 04 - Initialization
  function init() {
    var carImage = new Image();
    // Wait for the image to load
    carImage.addEventListener("load", function () {

      // API Part 16 - create distance joint
      // body1 = new Body(physics, {
      //   color: "yellow",
      //   x: 15,
      //   y: 12
      // }).body;
      // body2 = new Body(physics, {
      //   color: "yellow",
      //   x: 35,
      //   y: 12
      // }).body;
      // def = new Box2D.Dynamics.Joints.b2DistanceJointDef();
      // def.Initialize(body1,
      //   body2,
      //   body1.GetWorldCenter(),
      //   body2.GetWorldCenter());
      // var joint = physics.world.CreateJoint(def);

      // API Part 17 - create revolute joint
      // body3 = new Body(physics, { color: "pink", x: 20, y: 12 }).body;
      // body4 = new Body(physics, { image: img, x: 24, y: 12 }).body;
      // def = new Box2D.Dynamics.Joints.b2RevoluteJointDef();
      // def.Initialize(body3,
      //   body4,
      //   new b2Vec2(22, 14));
      // var joint2 = physics.world.CreateJoint(def);

      // API Part 18 - create prismatic joint
      // body5 = new Body(physics, { color: "red", x: 15, y: 12 }).body;
      // body6 = new Body(physics, { image: img, x: 25, y: 12 }).body;
      // def = new Box2D.Dynamics.Joints.b2PrismaticJointDef();
      // def.Initialize(body5, body6,
      //   new b2Vec2(20, 14),
      //   new b2Vec2(1, 0));
      // def.enableLimit = true;
      // def.lowerTranslation = 1;
      // def.upperTranslation = 1; 
      // var joint3 = physics.world.CreateJoint(def);

      // API Part 19 - pulley joint
      // body7 = new Body(physics, { color:"green", x: 15, y: 12 }).body;
      // body8 = new Body(physics, { color: "green", x: 25, y: 12 }).body;
      // def = new Box2D.Dynamics.Joints.b2PulleyJointDef();
      // def.Initialize(body7, body8,
      //               new b2Vec2(13,0),
      //               new b2Vec2(25,0),
      //               body7.GetWorldCenter(),
      //               body8.GetWorldCenter(),
      //               1);
      // var pulleyJoint = physics.world.CreateJoint(def);

      // API Part 20 - gear joints
      // body1 = new Body(physics, { color:"red", x: 15, y: 12 }).body;
      // body2 = new Body(physics, { image: img, x: 25, y: 12 }).body;
      // var def1 = new Box2D.Dynamics.Joints.b2RevoluteJointDef();
      // def1.Initialize(physics.world.GetGroundBody(),
      //                 body1,
      //                 body1.GetWorldCenter());
      // var joint1 = physics.world.CreateJoint(def1);

      // var def2 = new Box2D.Dynamics.Joints.b2RevoluteJointDef();
      // def2.Initialize(physics.world.GetGroundBody(),
      //                 body2,
      //                 body2.GetWorldCenter());
      // var joint2 = physics.world.CreateJoint(def2);
      // def = new Box2D.Dynamics.Joints.b2GearJointDef();
      // def.bodyA = body1;
      // def.bodyB = body2;
      // def.joint1 = joint1;
      // def.joint2 = joint2;
      // def.ratio = 2;
      // var joint = physics.world.CreateJoint(def);

      createWorld();
      var car = new Body(physics, { image: carImage, x: 12, y: 3, height: 5, width: 10 });
      // window.addEventListener("keydown", physics.moveCarForward);

      window.addEventListener("keydown",function(car){
        car.ApplyImpulse({ x: 1000, y: -1000 }, car.GetWorldCenter());
      });

      requestAnimationFrame(gameLoop);
    });

    carImage.src = "images/f1.png";
  }

  window.addEventListener("load", init);
}());




// Lastly, add in the `requestAnimationFrame` shim, if necessary. Does nothing 
// if `requestAnimationFrame` is already on the `window` object.
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

