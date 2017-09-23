var grobjects = grobjects || [];
var groundPlaneSize = groundPlaneSize || 20;

(function ()
{
    "use strict";

    var vertexPos = [
        -groundPlaneSize, 0, -groundPlaneSize,
         groundPlaneSize, 0, -groundPlaneSize,
         groundPlaneSize, 0,  10.0,
        -groundPlaneSize, 0, -groundPlaneSize,
         groundPlaneSize, 0, 10.0,
        -groundPlaneSize, 0, 10.0
    ];
    var _010 = [0.0, 1.0, 0.0];
    var vnormal = [_010, _010, _010, _010, _010, _010];
    var shaderProgram = undefined;
    var buffers = undefined;
    var ground = {
        name : "Shoreline",
       
        init: function (drawingState)
        {
            var gl = drawingState.gl;
            if (!shaderProgram) { //TODO edit the ground vs and fs?
                shaderProgram = twgl.createProgramInfo(gl,["ground-vs","ground-fs"]);
            }
            var arrays = { vpos : {numComponents:3, data:vertexPos }};
            buffers = twgl.createBufferInfoFromArrays(gl,arrays);

       },
        draw: function (drawingState)
        {
            var gl = drawingState.gl;
            gl.useProgram(shaderProgram.program);
            twgl.setBuffersAndAttributes(gl,shaderProgram,buffers);
            twgl.setUniforms(shaderProgram,
                {
                    color: [1.0, 1.0, .4],
                    view: drawingState.view,
                    proj: drawingState.proj,
                    lightdir: drawingState.sunDirection
                });
            twgl.drawBufferInfo(gl, gl.TRIANGLES, buffers);
        },
        center: function (drawingState)
        {
            return [0,0,0];
        }

    };
    grobjects.push(ground);
})();