// constants
var DEG_TO_RAD = 0.0174533

// operation types
var MOVE = 1
var SCALE = 2
var ROTATE = 3
var ROTATE_LIGHT = 4

// operationg configuration constants
var SPEED_MOVE = 18 
var SPEED_ROTATE = 18 * DEG_TO_RAD
var SPEED_SCALE = 0.1

// other variables
var screenCenter = [300, 250, -250]
var rotationCenter = [300, 250, 725]
var lightDir = [0,0,-1]
var modeText = 0
var mode = MOVE
var stage = null // easelJS stage reference

var drawableObjects = []

function makeRect(x,y,z,width,height,depth) { 
	let xmin = x - width/2
	let xmax = x + width/2 
	let ymin = y - height/2 
	let ymax = y + height/2
	let zmin = z - depth/2
	let zmax = z + depth/2

	var rect = {
		points : [
			// front
			[xmin, ymin, zmin],
			[xmax, ymin, zmin],
			[xmax, ymax, zmin],
			[xmin, ymax, zmin],

			// back
			[xmin, ymin, zmax],
			[xmax, ymin, zmax],
			[xmax, ymax, zmax],
			[xmin, ymax, zmax],
		],
		drawpoints: [],
		triangles : [ // point indices
			[3,0,1], [1,2,3], // back 
			[5,4,7], [7,6,5], // front
			[7,4,0], [0,3,7], // left
			[2,1,5], [5,6,2], // right
			[7,3,2], [2,6,7], // down
			[1,0,4], [4,5,1] // up
		],
		faces : [ // triangle indices
			[0,1], 	// back 
			[2,3], 	// front
			[4,5], 	// left .
			[6,7], 	// right .
			[8,9], 	// down
			[10,11] // up
		],
		transform: [x,y,z],
		control : 0,
		axis: {
			x: [1,0,0],
			y: [0,1,0],
			z: [0,0,1]
		}
	}

	rect.drawpoints = []
	for (var i = 0; i < rect.points.length; i++) {
		rect.drawpoints.push([...rect.points[i]]);
	}

	drawableObjects.push(rect)
	return rect
}

function makeRects(distance) {
	var size = 50
	for (var x = 0; x <= 600; x += size*distance) {
		for (var y = 0; y <= 500; y+= size*distance) {
			for (var z = 0; z <= 500; z += size*distance) {
				makeRect(x,y,z-125,size, size, size)
			}
		}
	}

	console.log(drawableObjects.length)
}

function update() {
	updateDrawPoints()
	applyPerspective()
	draw()
}

function updateDrawPoints() {
	for (var r = 0; r < drawableObjects.length; r++) {
		var obj = drawableObjects[r];
		for (var i = 0; i < obj.points.length; i++) {
			obj.drawpoints[i] = [...obj.points[i]];
		}
	}
}

function applyPerspective() {
	for (var r = 0; r < drawableObjects.length; r++) {
		var obj = drawableObjects[r]

		for (var i = 0; i < obj.drawpoints.length; i++) {
			var point = obj.drawpoints[i]

			var screenMin = screenCenter[2]
			var screenMax = -screenMin*2
			var x = point[0]
			var y = point[1]
			var z = point[2]

			var dist = z-screenMin
			var distMax =screenMax-screenMin
			var ratio = dist/distMax;

			point[0] = ratio * (point[0] - screenCenter[0]) + screenCenter[0];
			point[1] = ratio * (point[1] - screenCenter[1]) + screenCenter[1];
			point[2] = ratio * (point[2] - screenCenter[2]) + screenCenter[2];
		}
	}
}

function getTriangle(parent, index, getDrawPoints) {
	var t = parent.triangles[index]

	if (!getDrawPoints)
		return [parent.points[t[0]], parent.points[t[1]], parent.points[t[2]]]
	
	return [parent.drawpoints[t[0]], parent.drawpoints[t[1]], parent.drawpoints[t[2]]]
}

function getTriangles() {
	var faces = []

	for (var r = 0; r < drawableObjects.length; r++) {
		var obj = drawableObjects[r]
		for (var i = 0; i < obj.faces.length; i++) {
			var face = obj.faces[i]

			var triangles = []
			for (let t = 0; t < face.length; t++) {
				triangles.push({drawpoints: getTriangle(obj, face[t], true), points: getTriangle(obj, face[t], false)})
			}

			faces.push(triangles)
		}
	}

	faces.sort(function(face1, face2) {
		var arr1 = face1.flat(1)
		var arr2 = face2.flat(1)

		var z_a = 0;
		for (let i = 0; i < arr1.length; i++)
			for (let j = 0; j < arr1[i].points.length; j++) 
				z_a += arr1[i].points[j][2]

		var z_b = 0;
		for (let i = 0; i < arr2.length; i++)
			for (let j = 0; j < arr2[i].points.length; j++) 
				z_b += arr2[i].points[j][2]

		return z_a - z_b
	});

	return faces.flat(2) // return a list of triangles
}

///////////////////
///// 3d math /////
///////////////////
function normalize(vec) {
	let dist = math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2])
	if (dist == 0)
		return vec

	vec[0] /= dist 
	vec[1] /= dist 
	vec[2] /= dist 
	return vec
}

function getTranslationMatrix(x,y,z) {
	return math.matrix([
		[1,0,0,x],
		[0,1,0,y],
		[0,0,1,z],
		[0,0,0,1]
	])
}

function getScaleMatrix(x,y,z,k) {
	return math.matrix([
		[1+(k-1)*x*x,	(k-1)*x*y,		(k-1)*x*z,		0],
		[(k-1)*x*y,		1+(k-1)*y*y,	(k-1)*y*z,		0],
		[(k-1)*x*z,		(k-1)*y*z,		1+(k-1)*z*z,	0],
		[0,				0,				0,				1]
	])
}

function getRotationXMatrix(x) {
	return math.matrix([
		[1,0,0,0],
		[0,math.cos(x),-math.sin(x),0],
		[0,math.sin(x),math.cos(x),0],
		[0,0,0,1]
	])
}

function getRotationYMatrix(x) {
	return math.matrix([
		[math.cos(x),0,-math.sin(x),0],
		[0,1,0,0],
		[math.sin(x),0,math.cos(x),0],
		[0,0,0,1]
	])
}

function getRotationZMatrix(x) {
	return math.matrix([
		[math.cos(x),-math.sin(x),0,0],
		[math.sin(x),math.cos(x),0,0],
		[0,0,1,0],
		[0,0,0,1]
	])
}

function onMove(rect, x, y, z) {
	rect.transform[0] += x
	rect.transform[1] += y
	rect.transform[2] += z

	let m = getTranslationMatrix(x,y,z)

	for (var i = 0; i < rect.points.length; i++) {
		var point = rect.points[i];

		var vec = [[point[0]], [point[1]], [point[2]], [1]];
		vec = math.multiply(m, vec).valueOf()
		point[0] = vec[0][0];
		point[1] = vec[1][0];
		point[2] = vec[2][0];
	}
}

function onScale(rect, x, y, z) {
	let axis = 0;
	let k = 1;
	if (x != 1) {
		axis = rect.axis.x
		k = x 
	}
	else if (y!=1) {
		axis = rect.axis.y 
		k = y
	}
	else if (z != 1) {
		axis = rect.axis.z 
		k = z
	}

	if (k == 1)
		return;

	let tmp = Array.from(rect.transform)

	let m1 = getTranslationMatrix(tmp[0], tmp[1], tmp[2])
	let m2 = getScaleMatrix(axis[0], axis[1], axis[2], k)
	let m3 = getTranslationMatrix(-tmp[0], -tmp[1], -tmp[2])

	m1 = math.multiply(m1, math.multiply(m2, m3))

	for (var i = 0; i < rect.points.length; i++) {
		var point = rect.points[i];

		var vec = [[point[0]], [point[1]], [point[2]], [1]];
		vec = math.multiply(m1, vec).valueOf()
		point[0] = vec[0][0];
		point[1] = vec[1][0];
		point[2] = vec[2][0];
	}
}

function onRotate(rect, x, y, z, pivot) {
	let tmp = Array.from(pivot)

	let m1 = getTranslationMatrix(tmp[0], tmp[1], tmp[2])
	let m3 = getTranslationMatrix(-tmp[0], -tmp[1], -tmp[2])

	let mx = getRotationXMatrix(x)
	let my = getRotationYMatrix(y)
	let mz = getRotationZMatrix(z)
	let m2 = math.multiply(mx, math.multiply(my, mz))

	m1 = math.multiply(m1, math.multiply(m2, m3))

	for (var i = 0; i < rect.points.length; i++) {
		var point = rect.points[i];

		var vec = [[point[0]], [point[1]], [point[2]], [1]];
		vec = math.multiply(m1, vec).valueOf()
		point[0] = vec[0][0];
		point[1] = vec[1][0];
		point[2] = vec[2][0];
	}

	// rotate the transform around the given pivot as well
	var vec = [[rect.transform[0]], [rect.transform[1]], [rect.transform[2]], [1]]
	vec = math.multiply(m1, vec).valueOf()
	rect.transform[0] = vec[0][0]
	rect.transform[1] = vec[1][0]
	rect.transform[2] = vec[2][0]

	// rotate axii
	let ax = rect.axis.x
	let ay = rect.axis.y 
	let az = rect.axis.z 

	let vx = [[ax[0]], [ax[1]], [ax[2]], [1]];
	vx = math.multiply(m2, vx).valueOf()
	
	let vy = [[ay[0]], [ay[1]], [ay[2]], [1]];
	vy = math.multiply(m2, vy).valueOf()
	
	let vz = [[az[0]], [az[1]], [az[2]], [1]];
	vz = math.multiply(m2, vz).valueOf()

	vx = normalize([vx[0][0], vx[1][0], vx[2][0]])
	vy = normalize([vy[0][0], vy[1][0], vy[2][0]])
	vz = normalize([vz[0][0], vz[1][0], vz[2][0]])

	rect.axis.x = vx 
	rect.axis.y = vy 
	rect.axis.z = vz
}

function onRotateLight(x, y, z) {
	let mx = getRotationXMatrix(x)
	let my = getRotationYMatrix(y)
	let mz = getRotationZMatrix(z)
	let m = math.multiply(mx, math.multiply(my, mz))

	let vec = [[lightDir[0]], [lightDir[1]], [lightDir[2]], [1]]
	vec = math.multiply(m, vec).valueOf()
	lightDir = normalize([vec[0][0], vec[1][0], vec[2][0]])
}

/////////////////////////
///// input handler /////
/////////////////////////
window.onkeydown = function( event ) {
	if (event.type != "keydown")
		return

	let key = event.key

	if (key == "1") {
		mode = MOVE;
	}
	else if (key == "2") {
		mode = SCALE;
	}
	else if (key == "3") {
		mode = ROTATE;
	}
	else if (key == "4") {
		mode = ROTATE_LIGHT;
	}

	var mult = 0;

	var x;
  	var y;
	var z;

	if (mode == MOVE) {
		mult = SPEED_MOVE;
		x = key == "ArrowLeft" ? -mult : key == "ArrowRight" ? mult : 0;
	  	y = key == "ArrowUp" ? -mult : key == "ArrowDown" ? mult : 0;
		z = key == "z" ? -mult : key == "x" ? mult : 0;
	}
	else if (mode == ROTATE || mode == ROTATE_LIGHT) {
		mult = SPEED_ROTATE
		y = key == "ArrowLeft" ? mult : key == "ArrowRight" ? -mult : 0;
	  	x = key == "ArrowUp" ? mult : key == "ArrowDown" ? -mult : 0;
		z = key == "z" ? -mult : key == "x" ? mult : 0;
	}
	else {
		mult = SPEED_SCALE;
		x = key == "ArrowLeft" ? -mult : key == "ArrowRight" ? mult : 0;
	  	y = key == "ArrowUp" ? mult : key == "ArrowDown" ? -mult : 0;
		z = key == "z" ? -mult : key == "x" ? mult : 0;
	}

	if (mode == MOVE) {
		for (var i = 0; i < drawableObjects.length; i++) {
			var obj = drawableObjects[i]
			onMove(obj, x,y,z)
		}
	}
	else if (mode == ROTATE) {
		for (var i = 0; i < drawableObjects.length; i++) {
			var obj = drawableObjects[i]
			onRotate(obj, x,y,z, obj.transform)
		}
	}
	else if (mode == ROTATE_LIGHT) {
		onRotateLight(x,y,z)
	}
	else if (mode == SCALE) {
		for (var i = 0; i < drawableObjects.length; i++) {
			var obj = drawableObjects[i]
			onScale(obj, x+1,y+1,z+1)
		}
	}

	update();
}

///////////////////////////////////////////////////////////////
///// draw on the screen. this part is library dependent. /////
///////////////////////////////////////////////////////////////
function draw() {
	if (stage == null) {
		stage = new createjs.Stage("demoCanvas");
	}

	stage.removeAllChildren();
	var shape = new createjs.Shape();
	var g = new createjs.Graphics();

	var triangles = getTriangles()

	for (var i = 0; i < triangles.length; i++) {
		var triangle = triangles[i]
		var points = triangle.points
		var drawpoints = triangle.drawpoints

		// calculate shininess based on surface normal/light relationship
		var vec1 = [drawpoints[1][0] - drawpoints[0][0], drawpoints[1][1] - drawpoints[0][1], drawpoints[1][2] - drawpoints[0][2]]
		var vec2 = [drawpoints[2][0] - drawpoints[0][0], drawpoints[2][1] - drawpoints[0][1], drawpoints[2][2] - drawpoints[0][2]]

		var normal = normalize(math.cross(vec1, vec2))
		var lightAngle = (math.dot(normal, lightDir))

		var colorStrength = math.round(0xff*lightAngle)
		colorStrength = colorStrength.toString(16)

		g.beginFill("#" + colorStrength + "0000");
		g.moveTo(drawpoints[0][0], drawpoints[0][1]);
		g.lineTo(drawpoints[1][0], drawpoints[1][1]);
		g.lineTo(drawpoints[2][0], drawpoints[2][1]);
		g.endFill();
	}

	g.beginStroke("#0000ff");
	let lx = 500 
	let ly = 400
	g.moveTo(lx, ly);
	g.lineTo(lx + lightDir[0]*50, ly + lightDir[1]*50);
	g.endStroke();

    shape.graphics = g;
    shape.x = 0;
    shape.y = 0;
    stage.addChild(shape);

    stage.update();
}