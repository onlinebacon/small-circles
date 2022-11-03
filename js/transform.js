const mulVec3Mat3 = ([ x, y, z ], [ ix, iy, iz, jx, jy, jz, kx, ky, kz ], dst) => {
	dst[0] = x*ix + y*jx + z*kx;
	dst[1] = x*iy + y*jy + z*ky;
	dst[2] = x*iz + y*jz + z*kz;
	return dst;
};

const rotateX = ([ x, y, z ], sin, cos, dst) => {
	dst[0] = x;
	dst[1] = y*cos + z*sin;
	dst[2] = z*cos - y*sin;
	return dst;
};

const rotateY = ([ x, y, z ], sin, cos, dst) => {
	dst[0] = x*cos - z*sin;
	dst[1] = y;
	dst[2] = z*cos + x*sin;
	return dst;
};

const rotateZ = ([ x, y, z ], sin, cos, dst) => {
	dst[0] = x*cos + y*sin;
	dst[1] = y*cos - x*sin;
	dst[2] = z;
	return dst;
};

const mulMat3Mat3 = (a, b, dst) => {
	const [ aix, aiy, aiz, ajx, ajy, ajz, akx, aky, akz ] = a;
	const [ bix, biy, biz, bjx, bjy, bjz, bkx, bky, bkz ] = b;
	dst[0] = aix*bix + aiy*bjx + aiz*bkx;
	dst[1] = aix*biy + aiy*bjy + aiz*bky;
	dst[2] = aix*biz + aiy*bjz + aiz*bkz;
	dst[3] = ajx*bix + ajy*bjx + ajz*bkx;
	dst[4] = ajx*biy + ajy*bjy + ajz*bky;
	dst[5] = ajx*biz + ajy*bjz + ajz*bkz;
	dst[6] = akx*bix + aky*bjx + akz*bkx;
	dst[7] = akx*biy + aky*bjy + akz*bky;
	dst[8] = akx*biz + aky*bjz + akz*bkz;
	return dst;
};

export class Transform extends Float64Array {
    constructor() {
        super(9);
        this.i = new Vector(this, 0);    
        this.j = new Vector(this, 3);    
        this.k = new Vector(this, 6);    
        this.clear();
    }
    clear() {
        for (let i=9; i--;) {
			this[i] = ((i & 3) === 0);
		}
        return this;
    }
    rotateX(angle) {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        rotateX(this.i, sin, cos, this.i);
        rotateX(this.j, sin, cos, this.j);
        rotateX(this.k, sin, cos, this.k);
        return this;
    }
    rotateY(angle) {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        rotateY(this.i, sin, cos, this.i);
        rotateY(this.j, sin, cos, this.j);
        rotateY(this.k, sin, cos, this.k);
        return this;
    }
    rotateZ(angle) {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle); 
        rotateZ(this.i, sin, cos, this.i);
        rotateZ(this.j, sin, cos, this.j);
        rotateZ(this.k, sin, cos, this.k);
        return this;
    }
	set(transform) {
		for (let i=9; i--;) {
			this[i] = transform[i];
		}
		return this;
	}
    apply(transform) {
        mulMat3Mat3(this, transform, this);
        return this;
    }
	calcInverseOrientation() {
		let lat = 0, lon = 0, azm = 0;
		auxT.set(this);
		let [ jx, jy ] = auxT.j, jz;
		let len;
		len = Math.sqrt(jx*jx + jy*jy);
		if (len !== 0) {
			const acos = Math.acos(jy/len);
			azm = jx <= 0 ? acos : Math.PI*2 - acos;
			auxT.rotateZ(azm);
		}
		lat = Math.asin(auxT.j.z);
		auxT.rotateX(lat);
		const acos = Math.acos(auxT.k.z);
		lon = auxT.k.x <= 0 ? acos : - acos;
		return [ lat, lon, azm ];
	}
}

export class Vector extends Float64Array {
	constructor(a, b, c) {
        if (a instanceof Transform) {
            const transform = a;
            const offset = b;
            super(transform.buffer, transform.BYTES_PER_ELEMENT*offset, 3);
        } else if (a instanceof Array) {
            super(a);
        } else if (typeof a === 'number') {
			super([ a, b, c ]);
		} else {
			super(3);
		}
	}
    apply(transform, dst = this) {
        mulVec3Mat3(this, transform, dst);
        return dst;
    }
	rotateX(angle, dst = this) {
		const sin = Math.sin(angle);
		const cos = Math.cos(angle);
		rotateX(this, sin, cos, dst);
		return dst;
	}
	rotateY(angle, dst = this) {
		const sin = Math.sin(angle);
		const cos = Math.cos(angle);
		rotateY(this, sin, cos, dst);
		return dst;
	}
	rotateZ(angle, dst = this) {
		const sin = Math.sin(angle);
		const cos = Math.cos(angle);
		rotateZ(this, sin, cos, dst);
		return dst;
	}
	get x() { return this[0]; }
	get y() { return this[1]; }
	get z() { return this[2]; }
	set x(value) { this[0] = value; }
	set y(value) { this[1] = value; }
	set z(value) { this[2] = value; }
	set(x, y, z) {
		this[0] = x;
		this[1] = y;
		this[2] = z;
		return this;
	}
}

const auxT = new Transform();
