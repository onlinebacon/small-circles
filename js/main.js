import * as Plotter from './plotter.js';
import AngleFormats from './angle-formats.js';

const canvas = document.querySelector('canvas');
const circles = [];

Plotter.setCavnas(canvas);
Plotter.resize(511, 511)
Plotter.update();

const circlesContainer = document.querySelector('.circles-container');

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

const bindEditCircle = (dom) => {
};

const buildCircleEditDOM = () => {
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
	bindEditCircle(dom);
	return dom;
};

const bindAddCircleButton = () => {
	const button = document.querySelector('.add-button');
	button.addEventListener('click', () => {
		const dom = buildCircleEditDOM();
		circlesContainer.appendChild(dom);
		dom.querySelector('input').focus();
	});
};

const fillAngleFormatSelect = () => {
	const select = document.querySelector('select');
	AngleFormats.forEach((format, i) => {
		select.innerHTML += `<option value="${i}">${format.sample}</option>`
	});
};

bindAddCircleButton();
// fillAngleFormatSelect();
