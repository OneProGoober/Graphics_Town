var grobjects = grobjects || [];
var Shark = undefined;
var SharkSpot = undefined;


(function () {
    "use strict";
    var shaderProgram = undefined;
    var copterBodyBuffers = undefined;
    var copterRotorBuffers = undefined;
    var shaderProgram2 = undefined;

    var SharkBuffers = undefined;
    var Number = 0;

    // constructor for Helicopter
    Shark = function Shark(name)
    {
        this.name = "Sharkfin";
        this.position = [0,0,0];
        this.color = [1.0,1.0,1.0];
        this.orientation = 0;
    }
    Shark.prototype.init = function (drawingState) {
        var gl=drawingState.gl;
        var q = .25;  
        // create the shaders once - for all cubes
        if (!shaderProgram) {
            shaderProgram = twgl.createProgramInfo(gl, ["shark-vs", "shark-fs"]);
        }
        if (!copterBodyBuffers) {
            var arrays = {
                vpos: {
                    numComponents: 3, data: [
                                 -0.1, -1.0, 0.5,
                                 -0.1, -1.0, -0.15,
                                 0.0, 0.0, 0.0,

                                 -0.1, -1.0, 0.5,
                                 0.1, -1.0, -0.15,
                                 0.0, 0.0, 0.0,

                                 //back portion of fin
                                 0.0, 0.0, 0.0,
                                -0.1, -1.0, -0.15,
                                 0.1, -1.0, -0.15,
                    ]
                },
            };
            copterBodyBuffers = twgl.createBufferInfoFromArrays(drawingState.gl,arrays);
        }
        this.lastPad = randomHelipad();
        this.position = twgl.v3.add(this.lastPad.center(),[0,.5+this.lastPad.helipadAltitude,0]);
        this.state = 0; // landed
        this.wait = getRandomInt(250,750);
        this.lastTime = 0;

    };
    Shark.prototype.draw = function (drawingState)
    {
        advance(this,drawingState);

        var modelM = twgl.m4.rotationY(this.orientation);
        twgl.m4.setTranslation(modelM,this.position,modelM);
        var gl = drawingState.gl;
        gl.useProgram(shaderProgram.program);
        twgl.setUniforms(shaderProgram,{
            view:drawingState.view, proj:drawingState.proj, model: modelM });
        twgl.setBuffersAndAttributes(gl,shaderProgram,copterBodyBuffers);
        twgl.drawBufferInfo(gl, gl.TRIANGLES, copterBodyBuffers);
        };
    Shark.prototype.center = function (drawingState)
    {
        return this.position;
    }

    SharkSpot = function SharkSpot(position)
    {
        this.name = "SharkSpot" + Number++;
        this.position = position || [2,0.01,2];
        this.size = .01;
        // yes, there is probably a better way
        this.helipad = true;
        // what altitude should the helicopter be?
        // this get added to the helicopter size
        this.helipadAltitude = 0;
    }
    SharkSpot.prototype.init = function (drawingState) {
        var gl=drawingState.gl;
        var q = .25;  // abbreviation

        // create the shaders once - for all cubes
        if (!shaderProgram2) {
            shaderProgram2 = twgl.createProgramInfo(gl, ["sharks-vs", "sharks-fs"]);
        }
        if (!SharkBuffers) {
            var arrays = {
                vpos : { numComponents: 3, data: [
                    -.1,-.1,-.1, -.1,-.1,.1, -.5,-.1,.1, ] }
            };
            SharkBuffers = twgl.createBufferInfoFromArrays(drawingState.gl, arrays);
        }

    };
    SharkSpot.prototype.draw = function (drawingState) {
        // we make a model matrix to place the cube in the world
        var modelM = twgl.m4.scaling([this.size,this.size,this.size]);
        twgl.m4.setTranslation(modelM,this.position,modelM);
        // the drawing coce is straightforward - since twgl deals with the GL stuff for us
        var gl = drawingState.gl;
        gl.useProgram(shaderProgram2.program);
        twgl.setUniforms(shaderProgram2, {
            view:drawingState.view, proj:drawingState.proj, model: modelM });
        twgl.setBuffersAndAttributes(gl, shaderProgram2, SharkBuffers);
        twgl.drawBufferInfo(gl, gl.TRIANGLES, SharkBuffers);
    };
    SharkSpot.prototype.center = function (drawingState) {
        return this.position;
    }

//Shark Behavior (Similar to the helicopter behavior
    var altitude = 0.0;
    var verticalSpeed = 3 / 1000;      // units per milli-second
    var flyingSpeed = 1/250;          // units per milli-second
    var turningSpeed = 2/1000;         // radians per milli-second

    // utility - generate random  integer
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }
    // find a random helipad - allow for excluding one (so we don't re-use last target)
    function randomHelipad(exclude) {
        var helipads = grobjects.filter(function(obj) {return (obj.helipad && (obj!=exclude))});
        if (!helipads.length) {
            throw("No Helipads for the helicopter!");
        }
        var idx = getRandomInt(0,helipads.length);
        return helipads[idx];
    }

    // this actually does the work
    function advance(heli, drawingState) {
        // on the first call, the copter does nothing
        if (!heli.lastTime) {
            heli.lastTime = drawingState.realtime;
            return;
        }
        var delta = drawingState.realtime - heli.lastTime;
        heli.lastTime = drawingState.realtime;

        // now do the right thing depending on state
        switch (heli.state) {
            case 0: // on the ground, waiting for take off
                if (heli.wait > 0) { heli.wait -= delta; }
                else {  // take off!
                    heli.state = 1;
                    heli.wait = 0;
                }
                break;
            case 1: // taking off
                if (heli.position[1] < altitude) {
                    var up = verticalSpeed * delta;
                    heli.position[1] = Math.min(altitude,heli.position[1]+up);
                } else { // we've reached altitude - pick a destination
                    var dest = randomHelipad(heli.lastPad);
                    heli.lastPad = dest;
                    // the direction to get there...
                    heli.dx = dest.position[0] - heli.position[0];
                    heli.dz = dest.position[2] - heli.position[2];
                    heli.dst = Math.sqrt(heli.dx*heli.dx + heli.dz*heli.dz);
                    if (heli.dst < .01) {
                        // small distance - just go there
                        heli.position[0] = dest.position[0];
                        heli.position[2] = dest.position[2];
                        heli.state = 4;
                     } else {
                        heli.vx = heli.dx / heli.dst;
                        heli.vz = heli.dz / heli.dst;
                    }
                    heli.dir = Math.atan2(heli.dx,heli.dz);
                    heli.state = 2;
                }
                break;
            case 2: // spin towards goal
                var dtheta = heli.dir - heli.orientation;
                // if we're close, pretend we're there
                if (Math.abs(dtheta) < .01) {
                    heli.state = 3;
                    heli.orientation = heli.dir;
                }
                var rotAmt = turningSpeed * delta;
                if (dtheta > 0) {
                    heli.orientation = Math.min(heli.dir,heli.orientation+rotAmt);
                } else {
                    heli.orientation = Math.max(heli.dir,heli.orientation-rotAmt);
                }
                break;
            case 3: // fly towards goal
                if (heli.dst > .01) {
                    var go = delta * flyingSpeed;
                    // don't go farther than goal
                    go = Math.min(heli.dst,go);
                    heli.position[0] += heli.vx * go;
                    heli.position[2] += heli.vz * go;
                    heli.dst -= go;
                } else { // we're effectively there, so go there
                    heli.position[0] = heli.lastPad.position[0];
                    heli.position[2] = heli.lastPad.position[2];
                    heli.state = 4;
                }
                break;
            case 4: // land at goal
                var destAlt = heli.lastPad.position[1] + .5 + heli.lastPad.helipadAltitude;
                if (heli.position[1] > destAlt) {
                    var down = delta * verticalSpeed;
                    heli.position[1] = Math.max(destAlt,heli.position[1]-down);
                } else { // on the ground!
                    heli.state = 0;
                    heli.wait = getRandomInt(500,1000);
                }
                break;
        }
    }
})();

grobjects.push(new Shark());
grobjects.push(new SharkSpot([12.0, 0.01, 7]));
grobjects.push(new SharkSpot([12.0, 0.01, -16]));
grobjects.push(new SharkSpot([17.0, 0.01, -16]));
grobjects.push(new SharkSpot([17.0, 0.01, 7]));