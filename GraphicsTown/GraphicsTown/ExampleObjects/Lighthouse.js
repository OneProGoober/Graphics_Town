/**This file is actually just the spinning top pretty much.... I deleted the old lighthouse base code and the light since I didn't implement it..
***Check out the reflection part for the base.
**/
var grobjects = grobjects || [];

var Top = undefined;
var SpinningTop = undefined;
//pretty much all the below code is just spinning cube that I implemented as a spinning pyramid.
(function ()
{
    "use strict";

    var shaderProgram = undefined;
    var buffers = undefined;
    Top = function Top(name, position, size, color) {
        this.name = name;
        this.position = position || [0, 0, 0];
        this.size = size || 1.0;
        this.color = color || [.7, .8, .9];
    }
    Top.prototype.init = function (drawingState) {
        var gl = drawingState.gl;
        if (!shaderProgram) {
            shaderProgram = twgl.createProgramInfo(gl, ["top-vs", "top-fs"]);
        }

        if (!buffers) {
            var arrays =
            {
                vpos: {
                    numComponents: 3, data: [
                                -0.5, 3.0, -0.5,    // triangle 1
                                 0.5, 3.0, -0.5,
                                 0.0, 4.0, 0.0,
                                 0.5, 3.0, -0.5,    // triangle 2
                                 0.5, 3.0, 0.5,
                                 0.0, 4.0, 0.0,
                                 0.5, 3.0, 0.5,    // triangle 3
                                -0.5, 3.0, 0.5,
                                 0.0, 4.0, 0.0,
                                -0.5, 3.0, 0.5,    // triangle 4
                                -0.5, 3.0, -0.5,
                                 0.0, 4.0, 0.0,
                    ]
                }
            }
            buffers = twgl.createBufferInfoFromArrays(drawingState.gl, arrays);
        }
    };

    Top.prototype.draw = function (drawingState)
    {
        var modelM = twgl.m4.scaling([this.size, this.size, this.size]);
        twgl.m4.setTranslation(modelM, this.position, modelM);
        // the drawing code is straightforward - since twgl deals with the GL stuff for us
        var gl = drawingState.gl;
        gl.useProgram(shaderProgram.program);
        twgl.setBuffersAndAttributes(gl, shaderProgram, buffers);
        twgl.setUniforms(shaderProgram, {
            view: drawingState.view, proj: drawingState.proj,
            model: modelM
        });
        twgl.drawBufferInfo(gl, gl.TRIANGLES, buffers);
    };

    Top.prototype.center = function (drawingState) {
        return this.position;
    }

    SpinningTop = function SpinningTop(name, position, size, color, axis) {
        Top.apply(this, arguments);
        this.axis = axis || 'X';
    }
    SpinningTop.prototype = Object.create(Top.prototype);
    SpinningTop.prototype.draw = function (drawingState) {
        var modelM = twgl.m4.scaling([this.size, this.size, this.size]);
        var theta = Number(drawingState.realtime) / 1000.0;
        twgl.m4.rotateY(modelM, theta, modelM);

        twgl.m4.setTranslation(modelM, this.position, modelM);
        var gl = drawingState.gl;
        gl.useProgram(shaderProgram.program);
        twgl.setBuffersAndAttributes(gl, shaderProgram, buffers);
        twgl.setUniforms(shaderProgram,
        {
            view: drawingState.view, proj: drawingState.proj, model: modelM
        });
        twgl.drawBufferInfo(gl, gl.TRIANGLES, buffers);
    };
    SpinningTop.prototype.center = function (drawingState)
    {
        return this.position;
    }
})();

//make the lighthouse on the shoreline
grobjects.push(new SpinningTop("lighthouseTop", [9.5, 0.0, 0.5], 1));
//grobjects.push(new SpinningCube("light", [9.5, 3.05, 0.5], 0.1, [1.0, 1.0, 1.0]));
//grobjects.push(new Rectangle("LighthouseBase", [5, 1.5, 0], 1));