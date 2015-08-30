"use strict";

var canvas;
var gl;
var vBuffer;
var nBuffer;
var iBuffer;
var vBufferIdx;                     // current fill index of vertex buffer
var nBufferIdx;                     // current fill index of normal buffer
var iBufferIdx;                     // current fill index of element buffer

const NUM_VERTS = 50000;
const VERT_DATA_SIZE = 12;          // each vertex = (3 axes) * sizeof(float)
const NORMAL_DATA_SIZE = VERT_DATA_SIZE;
const COLOR_DATA_SIZE = 16;         // each vertex = (4 colors) * sizeof(float)

const NUM_ELEMS = 40000;  
const ELEM_DATA_SIZE = Uint16Array.BYTES_PER_ELEMENT;

var objs = [];
var meshes = [];
var objCount = 0;
var currObj = null;

var mvMatrixLoc;
var prMatrixLoc;
var ambientPrLoc, diffusePrLoc, specularPrLoc;
var lightPosLoc;
var shininessLoc;
var calcDistanceLoc;

var lineColor = [0, 0, 0, 1];
var camEye = [0, 600, 750];
var camAt  = [0, 500, 0];

var scaleMax  = [200, 200, 200];
var rotateMax = [180, 180, 180];
var posMax    = [1000, 1000, 1000];

var scaleMin  = [0, 0, 0];
var rotateMin = negate(rotateMax);
var posMin    = negate(posMax);

var animate = false;

function rotate_x(theta) {
  var c = Math.cos( radians(theta) );
  var s = Math.sin( radians(theta) );
  var rx = mat4( 1.0,  0.0,  0.0, 0.0,
      0.0,  c,  s, 0.0,
      0.0, -s,  c, 0.0,
      0.0,  0.0,  0.0, 1.0 );
  return rx;
}

function rotate_y(theta) {
  var c = Math.cos( radians(theta) );
  var s = Math.sin( radians(theta) );
  var ry = mat4( c, 0.0, -s, 0.0,
      0.0, 1.0,  0.0, 0.0,
      s, 0.0,  c, 0.0,
      0.0, 0.0,  0.0, 1.0 );
  return ry;
}

function rotate_z(theta) {
  var c = Math.cos( radians(theta) );
  var s = Math.sin( radians(theta) );
  var rz = mat4( c, s, 0.0, 0.0,
      -s,  c, 0.0, 0.0,
      0.0,  0.0, 1.0, 0.0,
      0.0,  0.0, 0.0, 1.0 );
  return rz;
}

function scalem( x, y, z )
{
    if ( Array.isArray(x) && x.length == 3 ) {
        z = x[2];
        y = x[1];
        x = x[0];
    }

    var result = mat4();
    result[0][0] = x;
    result[1][1] = y;
    result[2][2] = z;

    return result;
}

function Light() 
{
    // light properties
    this.ambient  = vec4(0.2, 0.2, 0.2, 1.0);
    this.diffuse  = vec4(1.0, 1.0, 1.0, 1.0);
    this.specular = vec4(1.0, 1.0, 1.0, 1.0);
    this.pos = [1000.0, 0.0, 0.0];
    this.scale = [1, 1, 1];
    this.rotate = [0, 0, 0];        // rotate pos in world coordinates
}

Light.prototype.transform = function(camEye)
{
    var rx = rotate_x(this.rotate[0]);
    var ry = rotate_y(this.rotate[1]);
    var rz = rotate_z(this.rotate[2]);
    var r = mult(rz, mult(ry, rx));
    var w = mult(r, scalem(this.scale));
    // get light position relative to camera position
    var lpos = mult(translate(negate(camEye)), w);     
    return lpos;
}

var lights = [];

function Mesh() 
{
    this.vertIdx = -1;
    this.normIdx = -1;
    this.elemIdx = -1;
    this.triangleCnt = 0;
}

Mesh.prototype.addPoint = function(p)
{
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, vBufferIdx * VERT_DATA_SIZE, flatten(p));
    if (this.vertIdx == -1) {
        // start of object
        this.vertIdx = vBufferIdx;
    }
    vBufferIdx++;
}

Mesh.prototype.addNormal = function(p)
{
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, nBufferIdx * NORMAL_DATA_SIZE, flatten(p));
    if (this.normIdx == -1) {
        // start of object
        this.normIdx = nBufferIdx;
    }
    nBufferIdx++;
}

Mesh.prototype.addTriangle = function(p0, p1, p2)
{
    this.addPoint(p0);
    this.addPoint(p1);
    this.addPoint(p2);
    var N = normalize(cross(subtract(p2, p0), subtract(p1, p0)));
    this.addNormal(N);
    this.addNormal(N);
    this.addNormal(N);
    this.triangleCnt++;
}

Mesh.prototype.addTopology = function(t)
{
    // adjust topology indexes to point to vertices in vertex array
    // with offset this.vertIdx
    var adjTopo = [];
    for (var i = 0; i < t.length; ++i) {
        adjTopo.push(t[i] + this.vertIdx);
    }
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, iBufferIdx * ELEM_DATA_SIZE, new Uint16Array(adjTopo)); 
    if (this.elemIdx == -1) {
        // start of object
        this.elemIdx = iBufferIdx;
    }
    iBufferIdx += adjTopo.length;
}

function CADObject(name, mesh)
{
    this.name = name;
    this.mesh = mesh;

    // lighting material properties
    this.ambient  = vec4(0.25, 0.25, 0.25, 1.0);
    this.diffuse  = vec4(0.0, 0.5, 1.0, 1.0);
    this.specular = vec4(0.5, 0.5, 0.5, 1.0);
    this.shininess = 15.0;

    // object in world space
    this.rotate = [0, 0, 0];
    this.scale  = [1, 1, 1];
    this.translate = [0, 0, 0];
}

CADObject.prototype.transform = function(camera)
{
    // transform from instance -> world coordinates
    var s = scalem(this.scale);
    var rx = rotate(this.rotate[0], [1, 0, 0]);
    var ry = rotate(this.rotate[1], [0, 1, 0]);
    var rz = rotate(this.rotate[2], [0, 0, 1]);
    var t = translate(this.translate);
    var r = mult(rz, mult(ry, rx));
    var world = mult(t, mult(r, s));
    // combine with camera transformation to create model-view matrix
    var mv = mult(camera, world);
    gl.uniformMatrix4fv(mvMatrixLoc, gl.FALSE, flatten(mv));
}

function Sphere(recurse) {
    Mesh.call(this);
    this.recurse = recurse || 3;
}
Sphere.prototype = Object.create(Mesh.prototype);

Sphere.prototype.addMeshPoint = function(p) 
{
    // add points normalized to unit circle length
    normalize(p);
    // only add new points; if point already exists, return its index
    for (var i = 0; i < this.vert.length; ++i) {
        if (equal(this.vert[i], p)) {
            return i;
        }
    }
    this.vert.push(p);
    // return vertex index
    return this.vert.length - 1;
}

Sphere.prototype.addVertices = function() 
{
    
    // create 12 vertices of a icosahedron
    var t = (1.0 + Math.sqrt(5.0)) / 2.0;
    this.vert = [];
    this.addMeshPoint([-1,  t,  0]);
    this.addMeshPoint([ 1,  t,  0]);
    this.addMeshPoint([-1, -t,  0]);
    this.addMeshPoint([ 1, -t,  0]);

    this.addMeshPoint([ 0, -1,  t]);
    this.addMeshPoint([ 0,  1,  t]);
    this.addMeshPoint([ 0, -1, -t]);
    this.addMeshPoint([ 0,  1, -t]);

    this.addMeshPoint([ t,  0, -1]);
    this.addMeshPoint([ t,  0,  1]);
    this.addMeshPoint([-t,  0, -1]);
    this.addMeshPoint([-t,  0,  1]);
   
    var faces = [];
    // 5 faces around point 0
    faces.push([0, 11, 5]);
    faces.push([0, 5, 1]);
    faces.push([0, 1, 7]);
    faces.push([0, 7, 10]);
    faces.push([0, 10, 11]);

    // 5 adjacent faces
    faces.push([1, 5, 9]);
    faces.push([5, 11, 4]);
    faces.push([11, 10, 2]);
    faces.push([10, 7, 6]);
    faces.push([7, 1, 8]);

    // 5 faces around point 3
    faces.push([3, 9, 4]);
    faces.push([3, 4, 2]);
    faces.push([3, 2, 6]);
    faces.push([3, 6, 8]);
    faces.push([3, 8, 9]);

    // 5 adjacent faces
    faces.push([4, 9, 5]);
    faces.push([2, 4, 11]);
    faces.push([6, 2, 10]);
    faces.push([8, 6, 7]);
    faces.push([9, 8, 1]);

    // refine triangles
    for (var i = 0; i < this.recurse; ++i) {
        var faces2 = [];
        for (var j = 0; j < faces.length; ++j) {
            var tri = faces[j];
            // replace triangle by 4 triangles
            var a = this.addMeshPoint(mix(this.vert[tri[0]], this.vert[tri[1]], 0.5));
            var b = this.addMeshPoint(mix(this.vert[tri[1]], this.vert[tri[2]], 0.5));
            var c = this.addMeshPoint(mix(this.vert[tri[2]], this.vert[tri[0]], 0.5));

            faces2.push([tri[0], a, c]);
            faces2.push([tri[1], b, a]);
            faces2.push([tri[2], c, b]);
            faces2.push([a, b, c]);
        }
        faces = faces2;
    }
    
    // send final vertices to GPU buffer
    for (var i = 0; i < this.vert.length; ++i) {
        this.addPoint(this.vert[i]);
        this.addNormal(normalize(this.vert[i]));
    }
 
    // send triangles to element buffer
    var topo = [];
    for (var i = 0; i < faces.length; ++i) {
        topo = topo.concat(faces[i]);
    }
    this.addTopology(topo);
    this.elemCnt = faces.length * 3;
}

Sphere.prototype.draw = function() 
{
    gl.drawElements(gl.TRIANGLES, this.elemCnt, gl.UNSIGNED_SHORT, this.elemIdx * ELEM_DATA_SIZE);
}

function Cone(angle) {
    Mesh.call(this);
    this.angle = angle || 20;
    this.segments = 0;
}
Cone.prototype = Object.create(Mesh.prototype);

Cone.prototype.addVertices = function() 
{
    // circle in y = -1 plane
    var pCircle = [0, -1, 0];
    var pCone = [0, 1, 0]; 
    this.segments = Math.ceil(360 / this.angle);
    var p1 = [1, -1, 0];
    for (var i = 1; i <= this.segments; ++i) {
        var alpha = i *  2 * Math.PI / this.segments;
        var p2 = [Math.cos(alpha), -1, Math.sin(alpha)];
        this.addTriangle(pCircle, p2, p1);
        this.addTriangle(pCone, p1, p2);
        p1 = p2;
    }
    // cone point
}

Cone.prototype.draw = function() 
{
    gl.drawArrays(gl.TRIANGLES, this.vertIdx, this.triangleCnt * 3);
}

function Cylinder(angle) {
    Mesh.call(this);
    this.angle = angle || 20;
    this.segments = 0;
}
Cylinder.prototype = Object.create(Mesh.prototype);

Cylinder.prototype.addVertices = function() 
{
    // circles in (y = -1) and (y = 1) plane
    var pCircleBot = [0, -1, 0];
    var pCircleTop = [0,  1, 0];
    
    this.segments = Math.ceil(360 / this.angle);
    var p1Bot = [1, -1, 0];
    var p1Top = [1,  1, 0];
    for (var i = 1; i <= this.segments; ++i) {
        var alpha = i *  2 * Math.PI / this.segments;
        var p2Bot = [Math.cos(alpha), -1, Math.sin(alpha)];
        var p2Top = [Math.cos(alpha),  1, Math.sin(alpha)];
        this.addTriangle(pCircleBot, p2Bot, p1Bot);
        this.addTriangle(pCircleTop, p1Top, p2Top);
        this.addTriangle(p1Bot, p2Bot, p1Top);
        this.addTriangle(p1Top, p2Bot, p2Top);
        p1Bot = p2Bot;
        p1Top = p2Top;
    }
}

Cylinder.prototype.draw = function() 
{
    gl.drawArrays(gl.TRIANGLES, this.vertIdx, this.triangleCnt * 3);
}

window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) alert("WebGL isn't available");

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //  Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU
    
    // vertex buffer:
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, NUM_VERTS * VERT_DATA_SIZE, gl.STATIC_DRAW);
    vBufferIdx = 0;
    // Associate shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 3 * 4, 0);
    gl.enableVertexAttribArray(vPosition);
    
    // normal buffer:
    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, NUM_VERTS * NORMAL_DATA_SIZE, gl.STATIC_DRAW);
    nBufferIdx = 0;
    // Associate shader variables with our data buffer
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 3 * 4, 0);
    gl.enableVertexAttribArray(vNormal);
    
    // index buffer:
    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, NUM_ELEMS * ELEM_DATA_SIZE, gl.STATIC_DRAW); 
    iBufferIdx = 0;

    canvas.addEventListener("mousemove", mouse_move);
 
    mvMatrixLoc = gl.getUniformLocation(program, 'mvMatrix');
    prMatrixLoc = gl.getUniformLocation(program, 'prMatrix');
    ambientPrLoc = gl.getUniformLocation(program, 'ambientProduct');
    diffusePrLoc = gl.getUniformLocation(program, 'diffuseProduct');
    specularPrLoc = gl.getUniformLocation(program, 'specularProduct');
    lightPosLoc = gl.getUniformLocation(program, 'lightPosition');
    shininessLoc = gl.getUniformLocation(program, 'shininess');
    calcDistanceLoc = gl.getUniformLocation(program, 'calcDistance');
    
    // Create meshes
    meshes['cube']     = new Cylinder(90);
    meshes['sphere']   = new Sphere(4);
    meshes['cone']     = new Cone(3);
    meshes['cylinder'] = new Cylinder(3);
    for (var key in meshes) {
        if (meshes.hasOwnProperty(key)) {
            meshes[key].addVertices();
        }
    }
    
    // handle create
    document.getElementById('btn-create').onclick = function() {create_new_obj()};
    // handle delete
    document.getElementById('btn-del').onclick = delete_obj;
    // handle clear
    document.getElementById("btn-clear").onclick = reset_scene;
    // handle select of active object
    document.getElementById("sel-obj").onchange = select_obj;
    // inputs and slider controls
    document.getElementById('range-scale-x').oninput = cur_obj_change;
    document.getElementById('range-scale-y').oninput = cur_obj_change;
    document.getElementById('range-scale-z').oninput = cur_obj_change;
    document.getElementById('range-rotate-x').oninput = cur_obj_change;
    document.getElementById('range-rotate-y').oninput = cur_obj_change;
    document.getElementById('range-rotate-z').oninput = cur_obj_change;
    document.getElementById('range-pos-x').oninput = cur_obj_change;
    document.getElementById('range-pos-y').oninput = cur_obj_change;
    document.getElementById('range-pos-z').oninput = cur_obj_change;
    document.getElementById('range-color-r').oninput = cur_obj_change;
    document.getElementById('range-color-b').oninput = cur_obj_change;
    document.getElementById('range-color-g').oninput = cur_obj_change;
    document.getElementById('radio-proj-perspective').checked = true;
    document.getElementById('range-camera-x').oninput = cam_change;
    document.getElementById('range-camera-y').oninput = cam_change;
    document.getElementById('range-camera-z').oninput = cam_change;
    document.getElementById('range-lookat-x').oninput = cam_change;
    document.getElementById('range-lookat-y').oninput = cam_change;
    document.getElementById('range-lookat-z').oninput = cam_change;
    
    reset_scene();
    
    // lights
    var light = new Light();
    light.ambient  = vec4(0.2, 0.2, 0.2, 1.0);
    light.diffuse  = vec4(1.0, 1.0, 1.0, 1.0);
    light.specular = vec4(1.0, 1.0, 1.0, 1.0);
    light.pos = vec4(1000.0, 300.0, 0.0, 1.0);
    light.scale = [1.0, 0.5, 2.0];
    lights.push(light);

    light = new Light();
    light.ambient  = vec4(0.2, 0.2, 0.2, 1.0);
    light.diffuse  = vec4(1.0, 1.0, 1.0, 1.0);
    light.specular = vec4(1.0, 1.0, 1.0, 1.0);
    light.pos = vec4(1000.0, -8000.0, 0.0, 1.0);
    light.scale = [0.4, 1.0, 0.6];
    lights.push(light);

    // default objects on canvas
    create_new_obj('cube');
    currObj.scale = [120, 100, 105];
    currObj.rotate = [0, 80, -50];
    currObj.translate = [410, 700, 100];
    currObj.diffuse  = vec4(0.7, 0.2, 0.5, 1.0);
    currObj.specular = vec4(0.4, 0.4, 0.4, 1.0);
    currObj.shininess = 35;
    cur_obj_set_controls();
    
    create_new_obj('sphere');
    currObj.scale = [200, 200, 200];
    currObj.translate = [610, 210, 100];
    currObj.diffuse  = vec4(0.1, 0.9, 0.8, 1.0);
    currObj.specular = vec4(0.5, 0.85, 0.85, 1.0);
    currObj.shininess = 140;
    cur_obj_set_controls();

    create_new_obj('cone');
    currObj.scale = [170, 100, 170];
    currObj.rotate = [25, -10, 85];
    currObj.translate = [-680, 800, -300];
    currObj.diffuse  = vec4(0.5, 0.8, 0.2, 1.0);
    currObj.shininess = 50;
    cur_obj_set_controls();
    
    create_new_obj('cylinder');
    currObj.scale = [200, 200, 200];
    currObj.rotate = [65, 85, 50];
    currObj.translate = [-526, 360, 10];
    currObj.diffuse  = vec4(0.9, 0.1, 0.1, 1.0);
    currObj.specular = vec4(0.7, 0.7, 0.7, 1.0);
    currObj.shininess = 75;
    cur_obj_set_controls();

    animate = true;
    render();
}

function create_new_obj(objType)
{
    var type = objType || document.getElementById('sel-type').value;
    var sel_obj = document.getElementById('sel-obj');
    var opt = document.createElement('option');
    objCount++;
    var name = type + objCount;
    opt.value = name;
    opt.innerHTML = name;
    sel_obj.appendChild(opt);
    sel_obj.value = opt.value;

    objs.push(new CADObject(name, meshes[type]));
    currObj = objs[objs.length - 1];
    currObj.diffuse = get_rgb_values();
    currObj.scale = [100, 100, 100];
    currObj.translate = camAt.slice();
    cur_obj_set_controls();
}

function delete_obj()
{
    if (!currObj) return;
    
    for (var i = 0; i < objs.length; ++i) {
        if (objs[i].name == currObj.name) {
            objs.splice(i, 1);
            var sel_opt = document.getElementById('sel-obj');
            sel_opt.remove(sel_opt.selectedIndex);
            select_obj.call(sel_opt);
            
            break;
        }
    }
}

function select_obj()
{
    if (!objs.length) {
        currObj = null;
    } else {
        for (var i = 0; i < objs.length; ++i) {
            if (objs[i].name == this.value) {
                currObj = objs[i];
                break;
            }
        }
    }
    cur_obj_set_controls();
}

function reset_scene()
{
    objs = [];
    currObj = null;
    objCount = 0;
    var sel_obj = document.getElementById('sel-obj');
    sel_obj.innerHTML = '';

    camEye = [0, 600, 550];
    camAt  = [0, 500, 0];
    cam_set();
}

function clip_to_range(x, min, max)
{
    if (Array.isArray(x)) {
        for (var i = 0; i < x.length; ++i) {
            if (x[i] < min[i]) 
                x[i] = min[i];
            else if (x[i] > max[i])
                x[i] = max[i];
        }
    } else {
        if (x < min) x = min;
        else if (x > max) x = max;
    }

    return x;
}

function cur_obj_set_controls()
{
    if (!currObj) return;
    
    var col = currObj.diffuse.slice();
    col[0] = Math.floor(col[0] * 255);
    col[1] = Math.floor(col[1] * 255);
    col[2] = Math.floor(col[2] * 255);
    document.getElementById('range-color-r').value = document.getElementById('color-r').innerHTML = col[0];
    document.getElementById('range-color-g').value = document.getElementById('color-b').innerHTML = col[1];
    document.getElementById('range-color-b').value = document.getElementById('color-g').innerHTML = col[2];
    clip_to_range(currObj.rotate, rotateMin, rotateMax);
    clip_to_range(currObj.translate, posMin, posMax);
    document.getElementById('range-scale-x').value = document.getElementById('scale-x').innerHTML = currObj.scale[0];
    document.getElementById('range-scale-y').value = document.getElementById('scale-y').innerHTML = currObj.scale[1];
    document.getElementById('range-scale-z').value = document.getElementById('scale-z').innerHTML = currObj.scale[2];
    document.getElementById('range-rotate-x').value = document.getElementById('rotate-x').innerHTML = currObj.rotate[0];
    document.getElementById('range-rotate-y').value = document.getElementById('rotate-y').innerHTML = currObj.rotate[1];
    document.getElementById('range-rotate-z').value = document.getElementById('rotate-z').innerHTML = currObj.rotate[2];
    document.getElementById('range-pos-x').value = document.getElementById('pos-x').innerHTML = currObj.translate[0];
    document.getElementById('range-pos-y').value = document.getElementById('pos-y').innerHTML = currObj.translate[1];
    document.getElementById('range-pos-z').value = document.getElementById('pos-z').innerHTML = currObj.translate[2];
}

function cur_obj_change()
{
    if (currObj) {
        currObj.diffuse = get_rgb_values();
        document.getElementById('color-r').innerHTML = +currObj.diffuse[0]*255;
        document.getElementById('color-g').innerHTML = +currObj.diffuse[1]*255;
        document.getElementById('color-b').innerHTML = +currObj.diffuse[2]*255;


        var scale_x = document.getElementById('range-scale-x').value;
        var scale_y = document.getElementById('range-scale-y').value;
        var scale_z = document.getElementById('range-scale-z').value;
        currObj.scale[0] = document.getElementById('scale-x').innerHTML = +scale_x;
        currObj.scale[1] = document.getElementById('scale-y').innerHTML = +scale_y;
        currObj.scale[2] = document.getElementById('scale-z').innerHTML = +scale_z;

        var rot_x = document.getElementById('range-rotate-x').value;
        var rot_y = document.getElementById('range-rotate-y').value;
        var rot_z = document.getElementById('range-rotate-z').value;
        currObj.rotate[0] = document.getElementById('rotate-x').innerHTML = +rot_x;
        currObj.rotate[1] = document.getElementById('rotate-y').innerHTML = +rot_y;
        currObj.rotate[2] = document.getElementById('rotate-z').innerHTML = +rot_z;

        var pos_x = document.getElementById('range-pos-x').value;
        var pos_y = document.getElementById('range-pos-y').value;
        var pos_z = document.getElementById('range-pos-z').value;
        currObj.translate[0] = document.getElementById('pos-x').innerHTML = +pos_x;
        currObj.translate[1] = document.getElementById('pos-y').innerHTML = +pos_y;
        currObj.translate[2] = document.getElementById('pos-z').innerHTML = +pos_z;
    }
}

function cam_set()
{
    document.getElementById('range-camera-x').value = document.getElementById('camera-x').innerHTML = camEye[0];
    document.getElementById('range-camera-y').value = document.getElementById('camera-y').innerHTML = camEye[1];
    document.getElementById('range-camera-z').value = document.getElementById('camera-z').innerHTML = camEye[2];
    document.getElementById('range-lookat-x').value = document.getElementById('lookat-x').innerHTML = camAt[0];
    document.getElementById('range-lookat-y').value = document.getElementById('lookat-y').innerHTML = camAt[1];
    document.getElementById('range-lookat-z').value = document.getElementById('lookat-z').innerHTML = camAt[2];
}

function cam_change()
{
    camEye[0] = document.getElementById('range-camera-x').value;
    camEye[1] = document.getElementById('range-camera-y').value;
    camEye[2] = document.getElementById('range-camera-z').value;
    document.getElementById('camera-x').innerHTML = camEye[0];
    document.getElementById('camera-y').innerHTML = camEye[1];
    document.getElementById('camera-z').innerHTML = camEye[2];

    camAt[0] = document.getElementById('range-lookat-x').value;
    camAt[1] = document.getElementById('range-lookat-y').value;
    camAt[2] = document.getElementById('range-lookat-z').value;
    document.getElementById('lookat-x').innerHTML = camAt[0];
    document.getElementById('lookat-y').innerHTML = camAt[1];
    document.getElementById('lookat-z').innerHTML = camAt[2];

}

function get_rgb_values() 
{
    var r = document.getElementById("range-color-r").value / 255;
    var g = document.getElementById("range-color-g").value / 255;
    var b = document.getElementById("range-color-b").value / 255;
    return vec4(r, g, b, 1.0);
}

var prev_mouse_pos = [0, 0];
function mouse_move(ev)
{
    if (currObj && ev.buttons) {
        if (ev.buttons & 1) {
            var incX = ev.clientX - prev_mouse_pos[0];
            var incY = prev_mouse_pos[1] - ev.clientY;
            currObj.translate[0] += incX; 
            currObj.translate[1] += incY; 
            // ensure values are ints
            currObj.translate[0] = parseInt(currObj.translate[0]); 
            currObj.translate[1] = parseInt(currObj.translate[1]); 

            cur_obj_set_controls();
            
        }
    }

    prev_mouse_pos = [ev.clientX, ev.clientY];
}

function render()
{
    var cam = lookAt(camEye, camAt, [0, 1, 0]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    if (document.getElementById('radio-proj-perspective').checked) {
        var pr = perspective(90, 2, 1, 10000);
    } else {
        var pr = ortho(-2000, 2000, -1000, 1000, -2000, 2000);
    }
    gl.uniformMatrix4fv(prMatrixLoc, gl.FALSE, flatten(pr));
    
    var cb_light = [document.getElementById('cb-light1'),
        document.getElementById('cb-light2')];
    var calcDistance = document.getElementById('cb-distance').checked;
    
    // light 
    lights[0].rotate[0] += 0.1;
    lights[0].rotate[1] += 1.0;
    lights[0].rotate[2] += 0.1;
    
    lights[1].rotate[0] += 0.5;
    lights[1].rotate[2] += 0.1;

    // iterate over all objects, do model-view transformation
    for (var i = 0; i < objs.length; ++i) {
        var ambientPr  = [];
        var diffusePr  = [];
        var specularPr = [];
        var lightPos   = [];
        for (var j = 0; j < lights.length; ++j) {
            var lmv = transpose(lights[j].transform(camEye));
            var lightPosVec = vec4(
                    dot(lmv[0], lights[j].pos),
                    dot(lmv[1], lights[j].pos),
                    dot(lmv[2], lights[j].pos),
                    dot(lmv[3], lights[j].pos));

            ambientPr = ambientPr.concat(mult(lights[j].ambient, objs[i].ambient));
            if (cb_light[j].checked) {
                diffusePr = diffusePr.concat(mult(lights[j].diffuse, objs[i].diffuse));
                specularPr = specularPr.concat(mult(lights[j].specular, objs[i].specular));
            } else {
                diffusePr = diffusePr.concat([0.0, 0.0, 0.0, 1.0]);
                specularPr = specularPr.concat([0.0, 0.0, 0.0, 1.0]);
            }
            lightPos = lightPos.concat(lightPosVec);
        }
        gl.uniform4fv(ambientPrLoc, flatten(ambientPr));
        gl.uniform4fv(diffusePrLoc, flatten(diffusePr));
        gl.uniform4fv(specularPrLoc, flatten(specularPr));
        gl.uniform4fv(lightPosLoc, flatten(lightPos));
        gl.uniform1f(shininessLoc, objs[i].shininess);
        gl.uniform1i(calcDistanceLoc, calcDistance);

        objs[i].transform(cam); 
        objs[i].mesh.draw();
    }

    // testing
    if (animate) requestAnimFrame(render);
}

