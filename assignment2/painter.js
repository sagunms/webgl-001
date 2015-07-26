"use strict";

var gl;
var program;

var canvas = document.getElementById("gl-canvas");
var controlColor = document.getElementById("color");

var prevPoint;
var colourPos;

var colours = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4( 0.0, 1.0, 1.0, 1.0)    // cyan
];

function coordinate(x, y) {
    return [    -1 + 2 * x / canvas.width,
                -1 + 2 * (canvas.height - y) / canvas.height    ];
}

canvas.addEventListener("mousedown", function(event) {
    if (event.buttons === 1) {
        prevPoint = coordinate(event.clientX, event.clientY);
    };
});

canvas.addEventListener("mousemove", function(event) {
    if (event.buttons === 1) {
        var t = coordinate(event.clientX, event.clientY);
        gl.bufferData(gl.ARRAY_BUFFER, flatten([prevPoint, t]), gl.STATIC_DRAW);
        gl.drawArrays(gl.LINES, 0, 2);
        prevPoint = t;
    };
});

controlColor.onchange = function(e) {
    gl.uniform4fv(colourPos, flatten(colours[controlColor.selectedIndex]));
};

window.onload = function() {

    gl = WebGLUtils.setupWebGL(canvas, {preserveDrawingBuffer: true});
    if (!gl) { alert("WebGL isn't available"); }

    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);

    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Uniform to hold color information
    colourPos = gl.getUniformLocation(program, "fColor");
    gl.uniform4fv(colourPos, flatten(colours[controlColor.selectedIndex]));
};