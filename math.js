const { sqrt, sin, cos, tan, asin, acos, atan, PI } = Math;
const TAU = PI*2;
const D360 = TAU;
const D180 = PI;
const D90 = PI*0.5;
const D45 = PI*0.25;
const degToRad = (deg) => deg/180*PI;
const radToDeg = (rad) => rad/PI*180;
const parseDeg = (angle) => {
    let [ m, ...r ] = angle.split(/\s+/).map(Number);
    let sign = m >= 0 ? 1 : -1;
    m = Math.abs(m);
    if (r.length) {
        m += r.reverse().reduce((a, b) => a/60 + b, 0)/60;
    }
    return m*sign;
};
const sphericalToEuclidean = ([ lat, lon ]) => {
    const cosLat = cos(lat);
    const x = sin(lon)*cosLat;
    const y = sin(lat);
    const z = cos(lon)*cosLat;
    return [ x, y, z ];
};
const euclideanToSpherical = ([ x, y, z ]) => {
    const lat = asin(y);
    const len = sqrt(x*x + z*z);
    const lon = len === 0 ? 0 : x >= 0 ? acos(z/len) : - acos(z/len);
    return [ lat, lon ];
};
const euclideanDist = ([ ax, ay, az ], [ bx, by, bz ]) => {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    return sqrt(dx*dx + dy*dy + dz*dz);
};
const rotateX = ([ x, y, z ], angle) => {
    const s = sin(angle);
    const c = cos(angle);
    return [ x, y*c + z*s, z*c - y*s ];
};
const rotateY = ([ x, y, z ], angle) => {
    const s = sin(angle);
    const c = cos(angle);
    return [ x*c - z*s, y, z*c + x*s ];
};
const rotateZ = ([ x, y, z ], angle) => {
    const s = sin(angle);
    const c = cos(angle);
    return [ x*c + y*s, y*c - x*s, z ];
};
const calcAzimuth = ([ lat, lon ], b) => {
    let vec = sphericalToEuclidean(b);
    vec = rotateY(vec, lon);
    vec = rotateX(vec, -lat);
    const [ x, y ] = vec;
    const len = sqrt(x*x + y*y);
    if (len === 0) return 0;
    return x >= 0 ? acos(y/len) : TAU - acos(y/len);
};
const getIntersections = (a, b) => {
    const [ lat, lon ] = a;
    const azm = calcAzimuth(a, b);
    let vec = sphericalToEuclidean(b);
    vec = rotateY(vec, lon);
    vec = rotateX(vec, -lat);
    vec = rotateZ(vec, -azm);
};
const SIDEREAL_DAY = 86164090.53820801;
const ARIES_GHA_AT_ZERO = 1656652979900;
const getAriesGHAAt = (date) => {
	const angle = (date - ARIES_GHA_AT_ZERO)*360/SIDEREAL_DAY;
    return angle >= 0 ? angle%360 : (angle%360 + 360)%360;
};
