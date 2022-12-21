import { Transform, Vector } from '../../jslib/three-d.js';

const LEFT_BUTTON = 0;
const LEFT_BUTTON_MASK = 1;
const lineWidth = 1.5;
const crossHairLineWidth = 1;
const pointRad = lineWidth*1;
const colorMap = {
	background: '#2c2c2c',
	latitudeLines: 'rgba(0, 255, 192, 0.5)',
	longitudeLines: 'rgba(0, 192, 255, 0.5)',
	border: 'rgba(0, 255, 255, 1)',
	surface: 'rgba(40, 40, 40, 0.8)',
	smallCircle: '#fb0',
	crossHair: '#fff',
};

const points = [];
const gridSmallCircles = [];
const userSmallCircles = [];
const global = new Transform();
const projection = new Transform();
const observerUpdateHandlers = [];

let canvas, ctx;
let cx, cy;
let nDivisions = 6;
let nVertices = 90;
let viewRadius = 190;

const project = (vector, dst) => {
	return vector.apply(projection, dst);
};

const findCircleSliceStart = (arr) => {
	if (arr.length < 2) return 0;
	let index = -1;
	let dist = -1;
	for (let i=0; i<arr.length; ++i) {
		const a = arr.at(i - 1);
		const b = arr[i];
		const dx = a[0] - b[0];
		const dy = a[1] - b[1];
		const d = dx*dx + dy*dy;
		if (d > dist) {
			index = i;
			dist = d;
		}
	}
	return index;
};

const drawHalfCircle = (arr, connect = false) => {
	let index;
	index = findCircleSliceStart(arr);
	ctx.beginPath();
	for (let i=0; i<arr.length; ++i) {
		const j = (i + index)%arr.length;
		const [ x, y ] = arr[j];
		if (i === 0) {
			ctx.moveTo(x, y);
		} else {
			ctx.lineTo(x, y);
		}
	}
	if (connect) {
		ctx.closePath();
	}
	ctx.stroke();
};

const drawPoint = (point) => {
	const { projected, color } = point;
	const [ x, y ] = projected;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, pointRad, 0, Math.PI*2);
	ctx.fill();
};

class Point {
	constructor(lat, lon, color) {
		this.lat = lat;
		this.lon = lon;
		this.color = color;
		this.isPositive = null;
		this.vertex = new Vector();
		this.projected = new Vector();
		this.buildVertex();
	}
	buildVertex() {
		const { lat, lon, vertex } = this;
		vertex.set([ 0, 0, 1 ]).rotateX(lat).rotateY(-lon);
		return this;
	}
	updateView() {
		project(this.vertex, this.projected);
		return this;
	}
	drawNegative() {
		if (this.projected.z < 0) {
			drawPoint(this);
		}
		return this;
	}
	drawPositive() {
		if (this.projected.z >= 0) {
			drawPoint(this);
		}
		return this;
	}
}

class SmallCircle {
	constructor(lat, lon, rad, color) {
		this.lat = lat;
		this.lon = lon;
		this.rad = rad;
		this.color = color;
		this.positive = [];
		this.negative = [];
		this.createVertexArray();
		this.buildVertices();
	}
	createVertexArray() {
		this.vertices = [...new Array(nVertices)].map(() => new Vector());
		this.projected = [...new Array(nVertices)].map(() => new Vector());
		return this;
	}
	buildVertices() {
		if (this.vertices.length !== nVertices) {
			this.createVertexArray();
		}
		const { vertices, lat, lon, rad } = this;
		const z = Math.cos(rad);
		const zRad = Math.sin(rad);
		const transform = new Transform().rotateX(lat).rotateY(-lon);
		for (let i=0; i<nVertices; ++i) {
			const angle = (i/nVertices)*(Math.PI*2);
			const x = Math.sin(angle)*zRad;
			const y = Math.cos(angle)*zRad;
			vertices[i].set([ x, y, z ]).apply(transform);
		}
		return this;
	}
	updateView() {
		const { vertices, projected, positive, negative } = this;
		positive.length = 0;
		negative.length = 0;
		for (let i=0; i<vertices.length; ++i) {
			const point = project(vertices[i], projected[i]);
			const z = point[2];
			if (z >= 0) positive.push(point);
			else negative.push(point);
		}
		return this;
	}
	drawPositive() {
		const { positive } = this;
		drawHalfCircle(positive, this.negative.length === 0);
		return this;
	}
	drawNegative() {
		const { negative } = this;
		drawHalfCircle(negative, this.positive.length === 0);
		return this;
	}
}

const updateProjection = () => {
	projection.set([
		viewRadius, 0, 0,
		0, -viewRadius, 0,
		0, 0, 1,
		cx, cy, 0,
	]);
	global.apply(projection, projection);
};

const handleCanvasResize = () => {
	cx = canvas.width*0.5;
	cy = canvas.height*0.5;
};

const clear = () => {
	ctx.fillStyle = colorMap.background;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
};

const forEachCircle = (fn) => {
	for (let i=0; i<gridSmallCircles.length; ++i) {
		fn(gridSmallCircles[i]);
	}
	for (let i=0; i<userSmallCircles.length; ++i) {
		fn(userSmallCircles[i]);
	}
};

const updateViews = () => {
	forEachCircle((circle) => circle.updateView());
	points.forEach(point => point.updateView());
};

const drawNevagives = () => {
	forEachCircle((circle) => {
		ctx.strokeStyle = circle.color;
		circle.drawNegative();
	});
	points.forEach(point => point.drawNegative());
};

const drawPositives = () => {
	forEachCircle((circle) => {
		ctx.strokeStyle = circle.color;
		circle.drawPositive();
	});
	points.forEach(point => point.drawPositive());
};

const drawCrossHair = () => {
	const size = 10;
	ctx.strokeStyle = colorMap.crossHair;
	ctx.lineWidth = crossHairLineWidth;
	ctx.beginPath();
	ctx.moveTo(cx - size, cy);
	ctx.lineTo(cx + size, cy);
	ctx.moveTo(cx, cy - size);
	ctx.lineTo(cx, cy + size);
	ctx.stroke();
};

const drawBase = () => {
	ctx.fillStyle = colorMap.surface;
	ctx.strokeStyle = colorMap.border;
	ctx.beginPath();
	ctx.arc(cx, cy, viewRadius, 0, Math.PI*2);
	ctx.fill();
	ctx.stroke();
};

const render = () => {
	updateProjection();
	updateViews();
	clear();
	ctx.lineWidth = lineWidth;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	drawNevagives();
	drawBase();
	drawPositives();
	drawCrossHair();
};

const biuldGrid = () => {
	gridSmallCircles.length = 0;
	for (let i=0; i<nDivisions; ++i) {
		const angle = Math.PI/nDivisions*i;
		gridSmallCircles.push(new SmallCircle(0, angle, Math.PI*0.5, colorMap.longitudeLines));
	}
	for (let i=1; i<nDivisions; ++i) {
		const angle = Math.PI/nDivisions*i;
		gridSmallCircles.push(new SmallCircle(Math.PI*0.5, 0, angle, colorMap.latitudeLines));
	}
};

let touchStartData = null;
const handleTouchStart = (x, y) => {
	touchStartData = {
		pos: [ x, y ],
		global: new Transform().set(global),
	};
};

const callObserverUpdateHandlers = () => {
	const [ lat, lon, azm ] = getObserver();
	observerUpdateHandlers.forEach(handler => handler(lat, lon, azm));
};

const handleDrag = (x, y) => {
	const [ ax, ay ] = touchStartData.pos;
	const [ bx, by ] = [ x, y ];
	if (ax === bx && ay === by) {
		global.set(touchStartData.global);
		render();
		callObserverUpdateHandlers();
		return;
	}
	const radianPerPx = 1/viewRadius;
	const dx = bx - ax;
	const dy = by - ay;
	const len = Math.sqrt(dx*dx + dy*dy);
	const nx = dx/len;
	const ny = dy/len;
	const angle = ny <= 0 ? Math.acos(nx) : - Math.acos(nx);
	const rot = len*radianPerPx;
	global.set(touchStartData.global).rotateZ(angle).rotateY(-rot).rotateZ(-angle);
	render();
	callObserverUpdateHandlers();
};

const handleTouchEnd = (x, y) => {
	touchStartData = null;
};

const bindCanvas = () => {
	canvas.addEventListener('mousedown', e => {
		if (e.ctrlKey || e.shiftKey || e.altKey) return;
		if (e.button !== LEFT_BUTTON) return;
		const x = e.offsetX;
		const y = e.offsetY;
		handleTouchStart(x, y);
	});
	canvas.addEventListener('mousemove', e => {
		if (touchStartData === null) return;
		const x = e.offsetX;
		const y = e.offsetY;
		if (!(e.buttons & LEFT_BUTTON_MASK)) {
			handleTouchEnd(x, y);
			return;
		}
		handleDrag(x, y);
	});
	canvas.addEventListener('mouseup', e => {
		if (e.button !== LEFT_BUTTON) return;
		if (touchStartData === null) return;
		const x = e.offsetX;
		const y = e.offsetY;
		handleTouchEnd(x, y);
	});
	canvas.addEventListener('touchstart', e => {
		const bcr = e.target.getBoundingClientRect();
		const x = e.targetTouches[0].clientX - bcr.x;
		const y = e.targetTouches[0].clientY - bcr.y;
		e.preventDefault();
		e.stopPropagation();
		handleTouchStart(x, y);
	});
	canvas.addEventListener('touchmove', e => {
		const bcr = e.target.getBoundingClientRect();
		const x = e.targetTouches[0].clientX - bcr.x;
		const y = e.targetTouches[0].clientY - bcr.y;
		e.preventDefault();
		e.stopPropagation();
		handleDrag(x, y);
	});
	canvas.addEventListener('wheel', e => {
		const { deltaY } = e;
		if (!deltaY) return;
		viewRadius = Math.exp(Math.log(viewRadius) - deltaY/Math.abs(deltaY)*0.2);
		render();
	});
};

export const setCavnas = (dom) => {
	canvas = dom;
	ctx = dom.getContext('2d');
	bindCanvas();
	handleCanvasResize();
};

export const resize = (width, height) => {
	canvas.width = width;
	canvas.height = height;
	handleCanvasResize();
};

export const addSmallCircle = (lat, lon, rad) => {
	const circle = new SmallCircle(lat, lon, rad, colorMap.smallCircle);
	userSmallCircles.push(circle);
	return circle;
};

export const addPoint = (lat, lon, color = colorMap.point) => {
	const point = new Point(lat, lon, color);
	points.push(point);
	return point;
};

export const getObserver = () => {
	const [ ry, rx, rz ] = global.calcYXZRotation();
	const lat = rx > Math.PI ? Math.PI*2 - rx : - rx;
	const lon = ry > Math.PI ? ry - Math.PI*2 : ry;
	const azm = rz > 0 ? Math.PI*2 - rz : 0;
	return [ lat, lon, azm ];
}

export const setObserver = (lat, lon, azm) => {
	global.clear().rotateY(lon).rotateX(-lat).rotateZ(-azm);
};

export const update = () => {
	render();
};

export const onObserverUpdate = (handler) => {
	observerUpdateHandlers.push(handler);
};

export const removeSmallCircle = (circle) => {
	const index = userSmallCircles.indexOf(circle);
	userSmallCircles.splice(index, 1);
};

export const removePoint = (point) => {
	const index = points.indexOf(point);
	points.splice(index, 1);
};

export const getNVertices = () => nVertices;
export const setNVertices = (n) => {
	nVertices = n;
	forEachCircle(circle => circle.buildVertices());
};

export const getNDivisions = () => nDivisions;
export const setNDivisions = (n) => {
	nDivisions = n;
	biuldGrid();
};

biuldGrid();
