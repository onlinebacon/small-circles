const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
let viewRad = Math.min(canvas.width, canvas.height)*0.45;
const obsCoord = [ 0, 0 ];
const circles = [];
class Transform {
    constructor() {
        this.clear();
    }
    clear() {
        this.i = [ 1, 0, 0 ];
        this.j = [ 0, 1, 0 ];
        this.k = [ 0, 0, 1 ];
        return this;
    }
    rotateX(angle) {
        this.i = rotateX(this.i, angle);
        this.j = rotateX(this.j, angle);
        this.k = rotateX(this.k, angle);
        return this;
    }
    rotateY(angle) {
        this.i = rotateY(this.i, angle);
        this.j = rotateY(this.j, angle);
        this.k = rotateY(this.k, angle);
        return this;
    }
    rotateZ(angle) {
        this.i = rotateZ(this.i, angle);
        this.j = rotateZ(this.j, angle);
        this.k = rotateZ(this.k, angle);
        return this;
    }
    apply(transform) {
        this.i = transform.applyTo(this.i);
        this.j = transform.applyTo(this.j);
        this.k = transform.applyTo(this.k);
        return this;
    }
    applyTo([ x, y, z ]) {
        const [ ix, iy, iz ] = this.i;
        const [ jx, jy, jz ] = this.j;
        const [ kx, ky, kz ] = this.k;
        return [
            x*ix + y*jx + z*kx,
            x*iy + y*jy + z*ky,
            x*iz + y*jz + z*kz,
        ];
    }
}
const global = new Transform();
const project = ([ x, y, z ]) => [
    canvas.width*0.5 + x*viewRad,
    canvas.height*0.5 - y*viewRad,
    z,
];
const projectCircle = ({ lat, lon, radius }) => {
    const n = 360;
    const rad = sin(radius);
    const z = cos(radius);
    const transform = new Transform().rotateX(lat).rotateY(-lon).apply(global);
    const front = [];
    const back = [];
    for (let i=0; i<=n; ++i) {
        const angle = TAU/n*i;
        let vec = [ sin(angle)*rad, cos(angle)*rad, z ];
        vec = transform.applyTo(vec);
        vec = project(vec);
        const [ x, y, sign ] = vec;
        if (sign >= 0) {
            front.push([ x, y ]);
        } else {
            back.push([ x, y ]);
        }
    }
    return { front, back };
};
const calcDist = ([ ax, ay ], [ bx, by ]) => {
    const dx = bx - ax;
    const dy = by - ay;
    return sqrt(dx*dx + dy*dy);
};
const getOffset = (array) => {
    if (array.length < 2) return 0;
    let offset = 0;
    let dist = calcDist(array[0], array.at(-1));
    for (let i=1; i<array.length; ++i) {
        const a = array.at(i - 1);
        const b = array[i];
        const d = calcDist(a, b);
        if (d > dist) {
            dist = d;
            offset = i;
        }
    }
    return offset;
};
const drawHalfCircle = (array) => {
    const offset = getOffset(array);
    ctx.beginPath();
    for (let i=0; i<array.length; ++i) {
        const j = (i + offset)%array.length;
        const [ x, y ] = array[j];
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
};
const addCircle = (lat, lon, radius, color) => {
    circle = { lat, lon, radius, color };
    circles.push(circle);
    return circle;
};
const buildGrid = () => {
    const n = 10;
    for (let i=0; i<n; ++i) {
        const angle = i/n*D180;
        addCircle(0, angle, D90, 'rgba(0, 192, 255, 0.5)');
    }
    for (let i=1; i<n; ++i) {
        const angle = i/n*D180
        addCircle(D90, 0, angle, 'rgba(0, 255, 192, 0.5)');
    }
};
const setObserver = ([ lat, lon, azm ]) => {
    global.clear().rotateY(lon).rotateX(-lat).rotateZ(-azm);
};
const render = () => {
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const array = circles.map(projectCircle);
    array.forEach(({ back }, i) => {
        const { color } = circles[i];
        ctx.strokeStyle = color;
        drawHalfCircle(back);
    });
    ctx.beginPath();
    ctx.arc(canvas.width*0.5, canvas.height*0.5, viewRad, 0, TAU);
    ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
    ctx.fill();
    array.forEach(({ front }, i) => {
        const { color } = circles[i];
        ctx.strokeStyle = color;
        drawHalfCircle(front);
    });
    ctx.beginPath();
    ctx.arc(canvas.width*0.5, canvas.height*0.5, viewRad, 0, TAU);
    ctx.strokeStyle = '#0bf';
    ctx.stroke();
    const crossHair = 10;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(
        canvas.width*0.5 - crossHair*0.5,
        canvas.height*0.5 - crossHair*0.5,
    );
    ctx.lineTo(
        canvas.width*0.5 + crossHair*0.5,
        canvas.height*0.5 + crossHair*0.5,
    );
    ctx.moveTo(
        canvas.width*0.5 + crossHair*0.5,
        canvas.height*0.5 - crossHair*0.5,
    );
    ctx.lineTo(
        canvas.width*0.5 - crossHair*0.5,
        canvas.height*0.5 + crossHair*0.5,
    );
    ctx.stroke();
};
const observer = [ 0, 0, 0 ];
const inputUpdateMap = {
    'zoom': value => viewRad = value,
    'latitude': value => {
        observer[0] = degToRad(value);
        setObserver(observer);
    },
    'longitude': value => {
        observer[1] = degToRad(value);
        setObserver(observer);
    },
    'azimuth': value => {
        observer[2] = degToRad(value);
        setObserver(observer);
    },
};
const bindInputs = () => {
    [ ...document.querySelectorAll('input[type="range"]') ].forEach((range) => {
        const input = range.parentElement.querySelector('input[type="number"]');
        const name = range.parentElement.querySelector('.title').innerText.toLowerCase();
        if (!input) {
            range.oninput = () => {
                inputUpdateMap[name](range.value);
                render();
            };
            return;
        }
        input.oninput = () => {
            range.value = input.value;
            inputUpdateMap[name](input.value);
            render();
        };
        range.oninput = () => {
            input.value = range.value;
            inputUpdateMap[name](input.value);
            render();
        };
    });
};
const circleTemplate = document.querySelector('.circle.template');
const classAttr = circleTemplate.getAttribute('class').replace(/(\s|^)template(\s|$)/, ' ');
circleTemplate.setAttribute('class', classAttr);
const circleHTML = circleTemplate.outerHTML.replace(/\s*\n\s*/g, '');
circleTemplate.remove();
const htmlToDOM = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.children[0];
};
const buildCircleDOM = () => {
    const dom = htmlToDOM(circleHTML);
    const circle = addCircle(0, 0, 0, '#fb0');
    dom.querySelector('.remove-circle').onclick = () => {
        dom.remove();
    };
    [...dom.querySelectorAll('input')].forEach(input => {
        const name = input.getAttribute('name');
        circle[name] = radToDeg(Number(input.value));
        input.oninput = () => {
            circle[name] = degToRad(Number(input.value));
            render();
        };
    });
    render();
    return dom;
};
document.querySelector('.add-circle').onclick = () => {
    const newCircleDOM = buildCircleDOM();
    document.querySelector('.circles-box').appendChild(newCircleDOM);
};
buildGrid();
bindInputs();
render();
