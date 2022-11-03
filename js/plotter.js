import { Transform, Vector } from './transform.js';

const LEFT_BUTTON = 0;
const LEFT_BUTTON_MASK = 1;
const color = {
	background: '#151515',
	latitudeLines: 'rgba(0, 255, 192, 0.5)',
	longitudeLines: 'rgba(0, 192, 255, 0.5)',
	border: 'rgba(0, 255, 255, 1)',
	surface: 'rgba(40, 40, 40, 0.8)',
	smallCircle: '#fb0',
	crossHair: '#fff',
};
const smallCircles = [];
const nVertices = 360;
const global = new Transform();
const auxV = new Vector();
const observerUpdateHandlers = [];

let canvas, ctx;
let cx, cy;
let viewRadius = 255;

const project = (vector) => {
	let [ x, y, z ] = vector.apply(global, auxV);
	return [ cx + x*viewRadius, cy - y*viewRadius, z ];
};

const findCircleSliceStart = (arr) => {
	if (arr.length < 2) return 0;
	let index = -1;
	let dist = 0;
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

class SmallCircle {
	constructor(lat, lon, rad, color) {
		this.lat = lat;
		this.lon = lon;
		this.rad = rad;
		this.color = color;
		const z = Math.cos(rad);
		const zRad = Math.sin(rad);
		const transform = new Transform().rotateX(lat).rotateY(-lon);
		this.vertices = [ ...new Array(nVertices) ].map((_, i) => {
			const angle = (i/nVertices)*(Math.PI*2);
			const x = Math.sin(angle)*zRad;
			const y = Math.cos(angle)*zRad;
			return new Vector([ x, y, z ]).apply(transform);
		});
		this.positive = [];
		this.negative = [];
	}
	updateView() {
		const { vertices, positive, negative } = this;
		positive.length = 0;
		negative.length = 0;
		for (let i=0; i<vertices.length; ++i) {
			const point = project(vertices[i]);
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

const handleCanvasResize = () => {
	cx = canvas.width*0.5;
	cy = canvas.height*0.5;
};

const clear = () => {
	ctx.fillStyle = color.background;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
};

const updateViews = () => {
	for (const circle of smallCircles) {
		circle.updateView();
	}
};

const drawNevagives = () => {
	for (const circle of smallCircles) {
		ctx.strokeStyle = circle.color;
		circle.drawNegative();
	}
};

const drawCrossHair = () => {
	const size = 10;
	ctx.strokeStyle = color.crossHair;
	ctx.beginPath();
	ctx.moveTo(cx - size, cy);
	ctx.lineTo(cx + size, cy);
	ctx.moveTo(cx, cy - size);
	ctx.lineTo(cx, cy + size);
	ctx.stroke();
};

const render = () => {
	clear();
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	updateViews();
	drawNevagives();
	ctx.fillStyle = color.surface;
	ctx.strokeStyle = color.border;
	ctx.beginPath();
	ctx.arc(cx, cy, viewRadius, 0, Math.PI*2);
	ctx.fill();
	ctx.stroke();
	for (const circle of smallCircles) {
		ctx.strokeStyle = circle.color;
		circle.drawPositive();
	}
	ctx.fillStyle = '#fff';
	const [ lat, lon, azm ] = global.calcInverseOrientation();
	ctx.font = '12px monospace';
	ctx.fillText('lat: ' + (lat/Math.PI*180).toFixed(3)*1, 10, 10);
	ctx.fillText('lon: ' + (lon/Math.PI*180).toFixed(3)*1, 10, 22);
	ctx.fillText('azm: ' + (azm/Math.PI*180).toFixed(3)*1, 10, 34);
	drawCrossHair();
};

const biuldGrid = () => {
	const n = 12;
	for (let i=0; i<n; ++i) {
		const angle = Math.PI/n*i;
		smallCircles.push(new SmallCircle(0, angle, Math.PI*0.5, color.longitudeLines));
	}
	for (let i=1; i<n; ++i) {
		const angle = Math.PI/n*i;
		smallCircles.push(new SmallCircle(Math.PI*0.5, 0, angle, color.latitudeLines));
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
	const [ lat, lon, azm ] = global.calcInverseOrientation();
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
		viewRadius = Math.exp(Math.log(viewRadius) - deltaY*2e-2);
		render();
	});
};

export const setCavnas = (dom) => {
	canvas = dom;
	ctx = dom.getContext('2d');
	bindCanvas();
	handleCanvasResize();
	biuldGrid();
	render();
};

export const resize = (width, height) => {
	canvas.width = width;
	canvas.height = height;
};

export const addSmallCircle = (lat, lon, rad) => {
	const circle = new SmallCircle(lat, lon, rad, color.smallCircle);
	smallCircles.push(circle);
	return circle;
};

export const setObserver = (lat, lon, azm) => {
	global.clear().rotateY(lon).rotateX(-lat).rotateZ(-azm);
};

export const update = () => {
	render();
};

export const onObserverUpdate = (handler) => {
	observerUpdateHandlers.push(handler);
};
