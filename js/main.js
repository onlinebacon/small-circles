import * as Plotter from './plotter.js';
import AngleFormats from './angle-formats.js';

window.Plotter = Plotter;

const canvas = document.querySelector('canvas');
const circlesContainer = document.querySelector('.circles-container');

const radToDeg = (rad) => rad*(180/Math.PI);
const degToRad = (deg) => deg*(Math.PI/180);

let angleFormat = AngleFormats.at(0);

const parseAngle = (angle) => {
	const format = AngleFormats.find(format => format.regex.test(angle));
	return format?.parse(angle) ?? NaN;
};

const getClassSet = (dom) => {
	const string = dom.getAttribute('class') ?? '';
	return new Set(string.trim().split(/\s+/).filter(item => item !== ''));
};

const addClass = (dom, className) => {
	const set = getClassSet(dom);
	set.add(className);
	dom.setAttribute('class', [...set].join(' '));
};

const removeClass = (dom, className) => {
	const set = getClassSet(dom);
	set.delete(className);
	dom.setAttribute('class', [...set].join(' '));
};

const replaceDOM = (prev, next) => {
	prev.parentElement.appendChild(next);
	prev.parentElement.insertBefore(prev, next);
	prev.remove();
};

const buildDOM = (tag, attrs, ...children) => {
	const dom = document.createElement(tag);
	for (const key in attrs) {
		dom.setAttribute(key, attrs[key]);
	}
	for (const child of children) {
		if (typeof child === 'string') {
			dom.appendChild(document.createTextNode(child));
		} else {
			dom.appendChild(child);
		}
	}
	return dom;
};

class CircleManager {
	constructor() {
		const parsed = { lat: 0, lon: 0, rad: 45 };
		const entries = Object.entries(parsed).map(([ name, val ]) => {
			return [ name, angleFormat.stringify(val) ];
		});
		const args = Object.values(parsed).map(degToRad);
		this.parsed = parsed;
		this.text = Object.fromEntries(entries);
		this.circle = Plotter.addSmallCircle(...args);
	}
	update() {
		const { parsed } = this;
		const args = Object.values(parsed).map(degToRad);
		const newCircle = Plotter.addSmallCircle(...args);
		Plotter.removeSmallCircle(this.circle);
		Plotter.update();
		this.circle = newCircle;
		return this;
	}
};

const buildCircleViewDOM = (circleManager) => {
	const valuesDOM = buildDOM('div', {'class': 'values'});
	const dom = buildDOM(
		'div',
		{ 'class': 'circle-view' },
		valuesDOM,
		buildDOM('div', {'class': 'remove-circle'}),
	);
	const { lat, lon, rad } = circleManager.parsed;
	const text = [ lat, lon, rad ].map(angleFormat.stringify).join(', ');
	valuesDOM.innerText = text;
	return dom;
};

const bindCircleEditInput = (dom, circleManager, name) => {
	const input = dom.querySelector(`[name="${name}"]`);
	input.value = circleManager.text[name];
	input.addEventListener('input', () => {
		const text = input.value;
		const value = parseAngle(text.trim());
		if (isNaN(value)) {
			addClass(input, 'invalid');
		} else {
			circleManager.text = text;
			removeClass(input, 'invalid');
			circleManager.parsed[name] = value;
			circleManager.update();
		}
	});
	input.addEventListener('blur', () => setTimeout(() => {
		const focused = dom.querySelector(':focus');
		if (focused == null) {
			const newDOM = buildCircleViewDOM(circleManager);
			replaceDOM(dom, newDOM);
		}
	}, 0));
};

const bindCircleEditDOM = (dom, circleManager) => {
	Object.keys(circleManager.text).forEach(name => {
		bindCircleEditInput(dom, circleManager, name);
	});
};

const buildCircleEditDOM = (circleManager) => {
	const fields = [ 'Latitude', 'Longitude', 'Radius' ].map(title => {
		const name = title.toLowerCase().substring(0, 3);
		const titleDOM = buildDOM('div', { 'class': 'field-title' }, title);
		const input = buildDOM('input', {
			'type': 'text',
			'name': name,
		});
		return buildDOM('div', { 'class': 'field' }, titleDOM, input);
	});
	const dom = buildDOM('div', { 'class': 'circle-edit' }, ...fields);
	bindCircleEditDOM(dom, circleManager);
	return dom;
};

const bindAddCircleButton = () => {
	const button = document.querySelector('.add-button');
	button.addEventListener('click', () => {
		const circleManager = new CircleManager();
		const dom = buildCircleEditDOM(circleManager);
		circlesContainer.appendChild(dom);
		dom.querySelector('input').focus();
		Plotter.update();
	});
};

const initAngleFormatSelect = () => {
	const select = document.querySelector('#angle_format');
	AngleFormats.forEach((format, i) => {
		select.innerHTML += `<option value="${i}">${format.sample}</option>`
	});
	select.addEventListener('input', () => {
		angleFormat = AngleFormats[select.value];
		updateViewInputs();
	});
};

const initNVerticesSelect = () => {
	const select = document.querySelector('#n_vertices');
	const values = [ 15, 30, 90, 180, 360, 720, 1080 ].reverse();
	select.innerHTML += values.map(val => `<option value="${val}">${val}</option>`).join('');
	select.addEventListener('input', () => {
		Plotter.setNVertices(Number(select.value));
		Plotter.update();
	});
	select.value = Plotter.getNVertices();
};

const initNDivisionsSelect = () => {
	const select = document.querySelector('#n_divisions');
	const values = [ 2, 4, 6, 8, 10, 12, 18, 20, 36 ].reverse();
	select.innerHTML += values.map(val => `<option value="${val}">${val}</option>`).join('');
	select.addEventListener('input', () => {
		Plotter.setNDivisions(Number(select.value));
		Plotter.update();
	});
	select.value = Plotter.getNDivisions();
};

const initSelects = () => {
	initAngleFormatSelect();
	initNVerticesSelect();
	initNDivisionsSelect();
};

const updateViewInputs = () => {
	const inputs = [ ...document.querySelectorAll('.view-box input') ];
	const values = Plotter.getObserver().map(radToDeg).map(angleFormat.stringify);
	inputs.forEach((input, i) => {
		input.value = values[i];
	});
};

const bindViewBox = () => {
	const viewBoxDOM = document.querySelector('.view-box');
	const inputs = [ ...viewBoxDOM.querySelectorAll('input') ];
	updateViewInputs();
	inputs.forEach((input, i) => {
		input.addEventListener('input', () => {
			const { value } = input;
			const parsed = parseAngle(value);
			if (isNaN(parsed)) {
				addClass(input, 'invalid');
				return;
			}
			removeClass(input, 'invalid');
			const args = Plotter.getObserver();
			args[i] = degToRad(parsed);
			Plotter.setObserver(...args);
			Plotter.update();
		});
	});
};

Plotter.setCavnas(canvas);
Plotter.resize(canvas.width, canvas.height);
Plotter.update();
Plotter.onObserverUpdate(updateViewInputs);

bindAddCircleButton();
bindViewBox();
initSelects();
