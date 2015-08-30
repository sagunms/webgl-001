"use strict";

var gl;
var program;
var newObjectListItem;

var objectsList = document.getElementById('inputObjectsList'),
    shapeInput = document.getElementById('inputShape'),
    sizeInput = document.getElementById('inputSize'),
    locationXInput = document.getElementById('inputLocationX'),
    locationYInput = document.getElementById('inputLocationY'),
    locationZInput = document.getElementById('inputLocationZ'),
    rotationXInput = document.getElementById('inputRotationX'),
    rotationYInput = document.getElementById('inputRotationY'),
    rotationZInput = document.getElementById('inputRotationZ'),
    colourRInput = document.getElementById('inputColourR'),
    colourGInput = document.getElementById('inputColourG'),
    colourBInput = document.getElementById('inputColourB'),
    sizeValueText = document.getElementById('inputSizeValue'),
    locationXValueText = document.getElementById('inputLocationXValue'),
    locationYValueText = document.getElementById('inputLocationYValue'),
    locationZValueText = document.getElementById('inputLocationZValue'),
    rotationXValueText = document.getElementById('inputRotationXValue'),
    rotationYValueText = document.getElementById('inputRotationYValue'),
    rotationZValueText = document.getElementById('inputRotationZValue'),
    colourRValueText = document.getElementById('inputColourRValue'),
    colourGValueText = document.getElementById('inputColourGValue'),
    colourBValueText = document.getElementById('inputColourBValue'),
    colourPreview = document.getElementById('inputColourValue'),
    objects = [],
    currentObject = {
        name: '',
        shape: '',
        size: 3,
        locationX: 0,
        locationY: 0,
        locationZ: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        colourR: 0,
        colourG: 0,
        colourB: 0
    },

    createNewObject = function () {
        var newObjectIndex = objects.length,
            dateNow = new Date(),
            timeStampNow = dateNow.getTime(),
            newObjectProperties = {
                id: 'object' + timeStampNow,
                objectIndex: newObjectIndex,
                name: 'sphere',
                shape: 'sphere',
                size: 3,
                locationX: 0,
                locationY: 0,
                locationZ: 0,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                colourR: 128,
                colourG: 128,
                colourB: 128
            };

        objects.push(newObjectProperties);
        return newObjectProperties;
    },
    setcurrentListItem = function () {
        var objectListElements = document.getElementsByClassName('object-item');

        for (var i = 0; i < objectListElements.length; i++) {
            objectListElements[i].className = 'object-item';
        }

        currentObject.listItem.className = 'object-item active';
    },
    setColourPreview = function () {
        colourPreview.style.backgroundColor = 'rgb(' + currentObject.colourR + ',' + currentObject.colourG + ',' + currentObject.colourB + ')';
    },
    setPropertiesControls = function () {
        shapeInput.value = currentObject.shape;
        sizeInput.value = currentObject.size;
        locationXInput.value = ((currentObject.locationX * 10) + 10);
        locationYInput.value = ((currentObject.locationY * 10) + 10);
        locationZInput.value = ((currentObject.locationZ * 10) + 10);
        rotationXInput.value = currentObject.rotationX;
        rotationYInput.value = currentObject.rotationY;
        rotationZInput.value = currentObject.rotationZ;
        colourRInput.value = currentObject.colourR;
        colourGInput.value = currentObject.colourG;
        colourBInput.value = currentObject.colourB;

        sizeValueText.innerHTML = currentObject.size;
        locationYValueText.innerHTML = 'Y: ' + currentObject.locationY;
        locationXValueText.innerHTML = 'X: ' + currentObject.locationX;
        locationZValueText.innerHTML = 'Z: ' + currentObject.locationZ;
        rotationXValueText.innerHTML = 'X: ' + currentObject.rotationX;
        rotationYValueText.innerHTML = 'Y: ' + currentObject.rotationY;
        rotationZValueText.innerHTML = 'Z: ' + currentObject.rotationZ;
        colourRValueText.innerHTML = 'R: ' + currentObject.colourR;
        colourGValueText.innerHTML = 'G: ' + currentObject.colourG;
        colourBValueText.innerHTML = 'B: ' + currentObject.colourB;

        setColourPreview();
    },
    setcurrentObject = function (objectIndex) {
        currentObject = objects[objectIndex];

        setcurrentListItem();
        setPropertiesControls();
    },
    clearCanvas = function () {
        objects = [];
        objectsList.innerHTML = '';
        currentObject = {
            name: '',
            shape: '',
            size: 5,
            locationX: 0,
            locationY: 0,
            locationZ: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            colourR: 128,
            colourG: 128,
            colourB: 128
        };
        setPropertiesControls();
        render();
    },
    addNewObject = function () {
        var newObject = createNewObject();
            newObjectListItem = document.createElement('li');

        newObjectListItem.id = newObject.id;
        newObjectListItem.className = 'object-item';
        newObjectListItem.innerHTML = newObject.shape;
        newObjectListItem.addEventListener('click', function () { setcurrentObject(newObject.objectIndex); });
        objectsList.appendChild(newObjectListItem);

        newObject.listItem = newObjectListItem;

        newObjectListItem.click();
        render();
    },
    setName = function (nameValue) {
        currentObject.name = nameValue;

        if(currentObject.listItem) {
            currentObject.listItem.innerHTML = currentObject.name;
        }
    },
    setShape = function (shapeValue) {
        currentObject.shape = shapeValue;
        setName(shapeValue);
        render();
    },
    setSize = function (sizeValue) {
        currentObject.size = parseInt(sizeValue);
        sizeValueText.innerHTML = 'S: ' + sizeValue;
        render();
    },
    setLocation = function (axis, locationValue) {
        var locationIntValue = (parseInt(locationValue) - 10) / 10;

        if (axis === 'x') {
            currentObject.locationX = locationIntValue;
            locationXValueText.innerHTML = 'X: ' + locationIntValue;
        } else if (axis === 'y') {
            currentObject.locationY = locationIntValue;
            locationYValueText.innerHTML = 'Y: ' + locationIntValue;
        } else if (axis === 'z') {
            currentObject.locationZ = locationIntValue;
            locationZValueText.innerHTML = 'Z: ' + locationIntValue;
        }

        render();
    },
    setRotation = function (axis, rotationValue) {
        if (axis === 'x') {
            currentObject.rotationX = parseInt(rotationValue);
            rotationXValueText.innerHTML = 'X: ' + rotationValue;
        } else if (axis === 'y') {
            currentObject.rotationY = parseInt(rotationValue);
            rotationYValueText.innerHTML = 'Y: ' + rotationValue;
        } else if (axis === 'z') {
            currentObject.rotationZ = parseInt(rotationValue);
            rotationZValueText.innerHTML = 'Z: ' + rotationValue;
        }

        render();
    },
    setColour = function (colourFraction, colourValue) {
        if (colourFraction === 'r') {
            currentObject.colourR = parseInt(colourValue);
            colourRValueText.innerHTML = 'R: ' + colourValue;
        } else if (colourFraction === 'g') {
            currentObject.colourG = parseInt(colourValue);
            colourGValueText.innerHTML = 'G: ' + colourValue;
        } else if (colourFraction === 'b') {
            currentObject.colourB = parseInt(colourValue);
            colourBValueText.innerHTML = 'B: ' + colourValue;
        }

        setColourPreview();
        render();
    },
    canvas,
    gl,
    points = [],
    colors = [],
    edgesColors = [],
    vertexBufferId,
    colorBufferId,
    thetaLoc,
    tfLoc,
    sfLoc,
    pushVertex = function (vertice, r, g, b) {
        points.push(vertice);
        colors.push([r / 255, g / 255, b / 255, 1.0]);
        edgesColors.push([1.0, 1.0, 1.0, 1.0]);
    },
    createCircleXZCoordinates = function (circleBands) {
        var circleXZCoordinates = [],
            theta = Math.PI / 2,
            sinTheta = Math.sin(theta),
            cosTheta = Math.cos(theta);

        for (var circleBandNumber = 0; circleBandNumber <= circleBands; circleBandNumber++) {
            var phi = circleBandNumber * 2 * Math.PI / circleBands,
                sinPhi = Math.sin(phi),
                cosPhi = Math.cos(phi),
                x = cosPhi * sinTheta,
                z = sinPhi * sinTheta;

            circleXZCoordinates.push([x, z]);
        }

        return circleXZCoordinates;
    },
    createCircleObject = function (circleXZCoordinates, originVertice, circleY, r, g, b) {
        var circleBands = circleXZCoordinates.length - 1;
        for (var circleBandNumber = 0; circleBandNumber < circleBands; circleBandNumber++) {
            var leftBottom = vec4(circleXZCoordinates[circleBandNumber][0], circleY, circleXZCoordinates[circleBandNumber][1], 1.0),
                rightBottom = vec4(circleXZCoordinates[circleBandNumber + 1][0], circleY, circleXZCoordinates[circleBandNumber + 1][1], 1.0);

            pushVertex(originVertice, r, g, b);
            pushVertex(leftBottom, r, g, b);
            pushVertex(rightBottom, r, g, b);
        }
    },
    createCylinderObject = function (r, g, b) {
        var circleBands = 20,
            circleXZCoordinates = createCircleXZCoordinates(circleBands);

        createCircleObject(
            circleXZCoordinates,
            vec4(0.0, 1.0, 0.0, 1.0),
            1,
            r, g, b
        );

        for (var circleBandNumber = 0; circleBandNumber < circleBands; circleBandNumber++) {
            var leftTop = vec4(circleXZCoordinates[circleBandNumber][0], 1, circleXZCoordinates[circleBandNumber][1], 1.0),
                leftBottom = vec4(circleXZCoordinates[circleBandNumber][0], -1, circleXZCoordinates[circleBandNumber][1], 1.0),
                rightTop = vec4(circleXZCoordinates[circleBandNumber + 1][0], 1, circleXZCoordinates[circleBandNumber + 1][1], 1.0),
                rightBottom = vec4(circleXZCoordinates[circleBandNumber + 1][0], -1, circleXZCoordinates[circleBandNumber + 1][1], 1.0);

            pushVertex(leftTop, r, g, b);
            pushVertex(leftBottom, r, g, b);
            pushVertex(rightTop, r, g, b);

            pushVertex(rightTop, r, g, b);
            pushVertex(leftBottom, r, g, b);
            pushVertex(rightBottom, r, g, b);
        }

        createCircleObject(
            circleXZCoordinates,
            vec4(0.0, -1.0, 0.0, 1.0),
            -1,
            r, g, b
        );
    },
    createConeObject = function (r, g, b) {
        var circleBands = 20,
            circleXZCoordinates = createCircleXZCoordinates(circleBands);

        createCircleObject(
            circleXZCoordinates,
            vec4(0.0, 1.0, 0.0, 1.0),
            -1,
            r, g, b
        );

        createCircleObject(
            circleXZCoordinates,
            vec4(0.0, -1.0, 0.0, 1.0),
            -1,
            r, g, b
        );
    },
    createSphereObject = function (r, g, b) {
        var latitudeBands = 10,
            longitudeBands = 10,
            latitudeLongitudeVertices = [];

        for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
            var latitudeVertices = [],
                theta = latNumber * Math.PI / latitudeBands,
                sinTheta = Math.sin(theta),
                cosTheta = Math.cos(theta);

            for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
                var phi = longNumber * 2 * Math.PI / longitudeBands,
                    sinPhi = Math.sin(phi),
                    cosPhi = Math.cos(phi),
                    x = cosPhi * sinTheta,
                    y = cosTheta,
                    z = sinPhi * sinTheta;

                latitudeVertices.push(vec4(x, y, z, 1.0));
            }

            latitudeLongitudeVertices.push(latitudeVertices);
        }

        for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
            for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
                var leftTop = latitudeLongitudeVertices[latNumber][longNumber],
                    leftBottom = latitudeLongitudeVertices[latNumber + 1][longNumber],
                    rightTop = latitudeLongitudeVertices[latNumber][longNumber + 1],
                    rightBottom = latitudeLongitudeVertices[latNumber + 1][longNumber + 1];

                pushVertex(leftTop, r, g, b);
                pushVertex(leftBottom, r, g, b);
                pushVertex(rightTop, r, g, b);

                pushVertex(rightTop, r, g, b);
                pushVertex(leftBottom, r, g, b);
                pushVertex(rightBottom, r, g, b);
            }
        }
    },
    loadVertexBuffer = function (vertexBufferData) {
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexBufferData), gl.STATIC_DRAW);

        var vPosition = gl.getAttribLocation(program, "vPosition");
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
    },
    loadColourBufferData = function (colourBufferData) {
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferId);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(colourBufferData), gl.STATIC_DRAW);

        var vColor = gl.getAttribLocation(program, "vColor");
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vColor);
    },
    render = function() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (var objectIndex in objects) {
            var objectProperties = objects[objectIndex],
                normalizedSize = objectProperties.size / 10;

            console.log(objectProperties);

            points = [];
            colors = [];
            edgesColors = [];

            gl.uniform3fv(thetaLoc, [
                objectProperties.rotationX,
                objectProperties.rotationY,
                objectProperties.rotationZ
            ]);

            gl.uniform3fv(tfLoc, [
                objectProperties.locationX,
                objectProperties.locationY,
                objectProperties.locationZ
            ]);

            gl.uniform3fv(sfLoc, [
                normalizedSize,
                normalizedSize,
                normalizedSize
            ]);

            if (objectProperties.shape === 'sphere') {
                createSphereObject(
                    objectProperties.colourR,
                    objectProperties.colourG,
                    objectProperties.colourB
                );
            } else if (objectProperties.shape === 'cone') {
                createConeObject(
                    objectProperties.colourR,
                    objectProperties.colourG,
                    objectProperties.colourB
                );
            } else if (objectProperties.shape === 'cylinder') {
                createCylinderObject(
                    objectProperties.colourR,
                    objectProperties.colourG,
                    objectProperties.colourB
                );
            }

            loadVertexBuffer(points);

            loadColourBufferData(colors);
            gl.drawArrays(gl.TRIANGLES, 0, points.length);

            loadColourBufferData(edgesColors);
            gl.drawArrays(gl.LINES, 0, points.length);
        }
    };

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.85, 0.85, 0.85, 1.0);

    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vertexBufferId = gl.createBuffer();
    colorBufferId = gl.createBuffer();
    thetaLoc = gl.getUniformLocation(program, "theta");
    tfLoc = gl.getUniformLocation(program, "tf");
    sfLoc = gl.getUniformLocation(program, "sf");

    setPropertiesControls();
    render();
};