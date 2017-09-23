var ReflectiveLighthouse = undefined;

(function() {

    var shaderProgram = undefined;
    var buffers = undefined;
    ReflectiveLighthouse = function ReflectiveLighthouse(position, size, color)
    {
        this.name = "ReflectiveLighthouse";
        this.size = size || 1.0;
        this.position = position || [4,0,0];
    };
    ReflectiveLighthouse.prototype.init = function (drawingState) {
        var gl=drawingState.gl;
        if (!shaderProgram) {
            shaderProgram = twgl.createProgramInfo(gl, ["reflection-vs", "reflection-fs"]);
        }
        if (!buffers) 
            buffers = twgl.createBufferInfoFromArrays(drawingState.gl, reflectiveLighthouse);
        gl.uniform1i(shaderProgram.skybox, 0);
    };
    ReflectiveLighthouse.prototype.draw = function (drawingState) {
        var gl = drawingState.gl;
        var modelM = twgl.m4.scaling([this.size,this.size*0.5,this.size]);
        twgl.m4.setTranslation(modelM,this.position,modelM);
        gl.useProgram(shaderProgram.program);
        twgl.setBuffersAndAttributes(gl,shaderProgram,buffers);
        twgl.setUniforms(shaderProgram,{
            view: drawingState.view, proj: drawingState.proj, inverseView: twgl.m4.inverse(twgl.m4.multiply(modelM, drawingState.view)),
            lightdir: drawingState.sunDirection, model: modelM});
        twgl.drawBufferInfo(gl, gl.TRIANGLES, buffers);
    };
})();

var ReflectiveLighthouse = new ReflectiveLighthouse();