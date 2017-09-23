 var isValidGraphicsObject = function (object) {
    if(object.name === undefined) {
        console.log("warning: GraphicsObject missing name field");
        return false;
    }

    if(typeof object.draw !== "function" && typeof object.drawAfter !== "function") {
        console.log("warning: GraphicsObject of type " + object.name + " does not contain either a draw or drawAfter method");
        return false;
    }

    if(typeof object.center !== "function") {
        console.log("warning: GraphicsObject of type " + object.name + " does not contain a center method. ");
        return false;
    }

    if(typeof object.init !== "function") {
        console.log("warning: GraphicsObject of type " + object.name + " does not contain an init method. ");
        return false;
    }

    return true;
 }
window.onload = function() {
    "use strict";

    // set up the canvas and context
    var canvas = document.createElement("canvas");
    canvas.setAttribute("width",600);
    canvas.setAttribute("height",600);
    document.body.appendChild(canvas);

    // make a place to put the drawing controls - a div
    var controls = document.createElement("DIV");
    controls.id = "controls";
    document.body.appendChild(controls);

    // a switch between camera modes
    var uiMode = document.createElement("select");
    uiMode.innerHTML += "<option>ArcBall</option>";
    uiMode.innerHTML += "<option>Drive</option>";
    uiMode.innerHTML += "<option>Fly</option>";
    uiMode.innerHTML += "</select>";
    controls.appendChild(uiMode);

    var resetButton = document.createElement("button");
    resetButton.innerHTML = "Reset View";
    resetButton.onclick = function() {
        // note - this knows about arcball (defined later) since arcball is lifted
        arcball.reset();

        drivePos = [0,.2,5];
        driveTheta = 0;
        driveXTheta = 0;

    }
    controls.appendChild(resetButton);

    // make some checkboxes - using my cheesy panels code
    var checkboxes = makeCheckBoxes([ ["Run",1], ["Examine",0] ]); //

    // a selector for which object should be examined
    var toExamine = document.createElement("select");
    grobjects.forEach(function(obj) {
           toExamine.innerHTML +=  "<option>" + obj.name + "</option>";
        });
    controls.appendChild(toExamine);

    // make some sliders - using my cheesy panels code
    var sliders = makeSliders([["TimeOfDay",0,24,12]]);
    // this could be gl = canvas.getContext("webgl");
    // but twgl is more robust
    var gl = twgl.getWebGLContext(canvas);






    // make a fake drawing state for the object initialization
    var drawingState = {
        gl : gl,
        proj : twgl.m4.identity(),
        view : twgl.m4.identity(),
        camera : twgl.m4.identity(),
        sunDirection : [0,1,0]
    }

    // information for the cameras
    var lookAt = [0,0,0];
    var lookFrom = [0,10,10];
    var fov = Math.PI/2;

    var projM;
    var cameraM;
    var viewM;

    var arcball = new ArcBall(canvas);

    // for timing
    var realtime = 0
    var lastTime = Date.now();

    // parameters for driving
    var drivePos = [0,.2,5];
    var driveTheta = 0;
    var driveXTheta = 0;

    // cheesy keyboard handling
    var keysdown = {};

    document.body.onkeydown = function(e) {
        var event = window.event ? window.event : e;
        keysdown[event.keyCode] = true;
        e.stopPropagation();
    };
    document.body.onkeyup = function(e) {
        var event = window.event ? window.event : e;
        delete keysdown[event.keyCode];
        e.stopPropagation();
    };


    // the actual draw function - which is the main "loop"
    function draw() {
        // advance the clock appropriately (unless its stopped)
        var curTime = Date.now();
        if (checkboxes.Run.checked) {
            realtime += (curTime - lastTime);
        }
        lastTime = curTime;

        // first, let's clear the screen
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        projM = twgl.m4.perspective(fov, 1, 0.1, 100);
        cameraM = twgl.m4.lookAt(lookFrom, lookAt, [0, 1, 0]);
        viewM = twgl.m4.inverse(cameraM);

        // implement the camera UI
        if (uiMode.value == "ArcBall") {
            viewM = arcball.getMatrix();
            twgl.m4.setTranslation(viewM, [0, 0, -10], viewM);
        } else if (uiMode.value == "Drive") {
            if (keysdown[65]) { driveTheta += .02; }
            if (keysdown[68]) { driveTheta -= .02; }
            if (keysdown[87]) {
                var dz = Math.cos(driveTheta);
                var dx = Math.sin(driveTheta);
                drivePos[0] -= .05*dx;
                drivePos[2] -= .05*dz;
            }
            if (keysdown[83]) {
                var dz = Math.cos(driveTheta);
                var dx = Math.sin(driveTheta);
                drivePos[0] += .05*dx;
                drivePos[2] += .05*dz;
            }

            cameraM = twgl.m4.rotationY(driveTheta);
            twgl.m4.setTranslation(cameraM, drivePos, cameraM);
            viewM = twgl.m4.inverse(cameraM);
        }else if (uiMode.value == "Fly") {


            if (keysdown[65] || keysdown[37]) { 
                driveTheta += .02; 
            }else if (keysdown[68] || keysdown[39]) { 
                driveTheta -= .02; 
            }

            if (keysdown[38]) { driveXTheta += .02; }
            if (keysdown[40]) { driveXTheta -= .02; }

            var dz = Math.cos(driveTheta);
            var dx = Math.sin(driveTheta);
            var dy = Math.sin(driveXTheta);

            if (keysdown[87]) {
                drivePos[0] -= .25*dx;
                drivePos[2] -= .25*dz;
                drivePos[1] += .25 * dy;
            }

            if (keysdown[83]) {
                drivePos[0] += .25*dx;
                drivePos[2] += .25*dz;
                drivePos[1] -= .25 * dy;
            }

            cameraM = twgl.m4.rotationX(driveXTheta);
            twgl.m4.multiply(cameraM, twgl.m4.rotationY(driveTheta), cameraM);
            twgl.m4.setTranslation(cameraM, drivePos, cameraM);
            viewM = twgl.m4.inverse(cameraM);
        }

        // get lighting information
        var tod = Number(sliders.TimeOfDay.value);
        var sunAngle = Math.PI * (tod-6)/12;
        var sunDirection = [Math.cos(sunAngle),Math.sin(sunAngle),0];


        // make a real drawing state for drawing
        var drawingState = {
            gl : gl,
            proj : projM,   // twgl.m4.identity(),
            view : viewM,   // twgl.m4.identity(),
            camera: cameraM,
            timeOfDay : tod,
            sunDirection : sunDirection,
            realtime : realtime,
        }

        // initialize all of the objects that haven't yet been initialized (that way objects can be added at any point)
        grobjects.forEach(function(obj) { 
            if(!obj.__initialized) {
                if(isValidGraphicsObject(obj)){
                    obj.init(drawingState);
                    obj.__initialized = true;
                }
            }

            if (!ReflectiveLighthouse.__initialized) {
                drawingState.gl.bindTexture(gl.TEXTURE_CUBE_MAP, reflection);
                ReflectiveLighthouse.init(drawingState);
                ReflectiveLighthouse.__initialized = true;
            };
        });
        
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // now draw all of the objects - unless we're in examine mode
        if (checkboxes.Examine.checked) {
            // get the examined object - too bad this is an array not an object
            var examined = undefined;
            grobjects.forEach(function(obj) { if (obj.name == toExamine.value) {examined=obj;}});
            var ctr = examined.center(drawingState);
            var shift = twgl.m4.translation([-ctr[0],-ctr[1],-ctr[2]]);
            twgl.m4.multiply(shift,drawingState.view,drawingState.view);
  
            if(examined.draw) examined.draw(drawingState);
            if(examined.drawAfter) examined.drawAfter(drawingState);
        } else {

            grobjects.forEach(function (obj) {
                if(obj.draw) obj.draw(drawingState);
            });

            grobjects.forEach(function (obj) {
                if(obj.drawAfter) obj.drawAfter();
            });

            ReflectiveLighthouse.draw(drawingState);
        }
    };

    /**
    The Stuff that I added for the reflecting lighthouse.
    **/



    /** Some of this portion is taken from ~line 700 of the http://math.hws.edu/graphicsbook/source/webgl/cube-camera.html example**/
    var cubemapTargets = [
       //order found in twgl-full.js
       gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
       gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
       gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
    ];

    gl.enable(gl.DEPTH_TEST);

    var i;
    var reflection = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, reflection);
    for (i = 0; i < 6; i++) {
        gl.texImage2D(cubemapTargets[i], 0.0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 256, 256);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    //end of portion from example...


    //This function draws the reflection map and calls draw. See bottom for call.
    function Helper() {
        drawReflectionMap();
        draw();
        window.requestAnimationFrame(Helper);
    };

    function drawReflectionMap() {
        //Modeled from the example that was provided: (createDynamicCubemap function at http://math.hws.edu/graphicsbook/source/webgl/cube-camera.html)
        //Turns out to be pretty similar, but twgl for rotation and other minor differences the graphicstown framework creates.
        //twgl correspondence: rotateY(m, angleInRadians, dstopt)
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, 512, 512);
        projM = twgl.m4.perspective(Math.PI / 2, 1, 1, 100);

        cameraM = twgl.m4.identity();
        viewM = twgl.m4.scaling([-1, -1, 1]);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, reflection, 0);
        render();

        viewM = twgl.m4.scaling([-1, -1, 1]);
        twgl.m4.rotateY(viewM, Math.PI, viewM);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, reflection, 0);
        render();

        viewM = twgl.m4.scaling([-1, -1, 1]);
        twgl.m4.rotateY(viewM, Math.PI / 2, viewM);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X, reflection, 0);
        render();

        viewM = twgl.m4.scaling([-1, -1, 1]);
        twgl.m4.rotateY(viewM, -Math.PI / 2, viewM);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, reflection, 0);
        render();

        viewM = twgl.m4.identity();
        twgl.m4.rotateX(viewM, Math.PI / 2, viewM);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, reflection, 0);
        render();

        viewM = twgl.m4.identity();
        twgl.m4.rotateX(viewM, -Math.PI / 2, viewM);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, reflection, 0);
        render();

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, reflection);
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    };

    //Render function for the reflection
    function render() {
        //Replicate portion from original draw loop in order to 
        //Advance the clock appropriately (unless its stopped)
        var curTime = Date.now();
        if (checkboxes.Run.checked) {
            realtime += (curTime - lastTime);
        }
        lastTime = curTime;

        // first, let's clear the screen...  Again....
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var tod = Number(sliders.TimeOfDay.value);
        var sunAngle = Math.PI * (tod - 6) / 12.0;
        var sunDirection = [Math.cos(sunAngle), Math.sin(sunAngle), 0.0];

        var drawingState = {
            gl: gl,
            proj: projM,
            view: viewM,
            camera: cameraM,
            timeOfDay: tod,
            sunDirection: sunDirection,
            realtime: realtime
        }

        grobjects.forEach(function (obj) {
            if (!obj.__initialized) {
                if (isValidGraphicsObject(obj)) {
                    obj.init(drawingState);
                    obj.__initialized = true;
                }
            }
        });

        if (checkboxes.Examine.checked) {
            // get the examined object - too bad this is an array not an object
            var examined = undefined;
            grobjects.forEach(function (obj) { if (obj.name == toExamine.value) { examined = obj; } });
            var ctr = examined.center(drawingState);
            var shift = twgl.m4.translation([-ctr[0], -ctr[1], -ctr[2]]);
            twgl.m4.multiply(shift, drawingState.view, drawingState.view);

            if (examined.draw) examined.draw(drawingState);
            if (examined.drawAfter) examined.drawAfter(drawingState);
        } else {

            grobjects.forEach(function (obj) {
                if (obj.draw) obj.draw(drawingState);
            });

            grobjects.forEach(function (obj) {
                if (obj.drawAfter) obj.drawAfter();
            });
        }
    };
    //instead of window.requestAnimationFrame(draw), we call a helper function to set up the reflection map and draw
    Helper();
};