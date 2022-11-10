const splitNumbers = (string) => {
	const filtered = string.replace(/[^\d\.]+/g, ' ');
	return filtered.trim().split(/\s+/).map(Number);
};

const decompose = (value, weights) => {
	let n = Math.round(weights.slice(1).reduce((a, b) => a * b, 1)*value);
	return weights
		.reverse()
		.map((weight) => {
			const val = n % weight;
			n = Math.round((n - val)/weight);
			return val;
		})
		.reverse();
};

const formats = [{
	regex: /^([+\-]\s*)?\d+(\.\d+)?(\s*°)?$/,
	sample: `5.213°`,
	parse: (string) => {
		return Number(string.replace(/\s*°\s*/, ''));
	},
	stringify: (value) => {
		return Number(value.toFixed(3)) + '°';
	},
}, {
	regex: /^([+\-]\s*)?\d+(\s*°\s*|\s+)\d+(\.\d+)?(\s*')?$/,
	sample: `5° 12.8'`,
	parse: (string) => {
		const neg = string.startsWith('-');
		const [ deg, min ] = splitNumbers(string);
		return (1 - 2*neg)*(deg + min/60);
	},
	stringify: (value) => {
		const [ deg, min, dec ] = decompose(Math.abs(value), [ 360, 60, 10 ]);
		const sign = value < 0 ? '-' : '';
		return `${sign}${deg}° ${min}${dec ? '.' + dec : ''}'`;
	},
// }, {
// 	regex: /^([+\-]\s*)?\d+(\s*°\s*|\s+)\d+(\s*'\s*|\s+)\d+(\.\d+)?(\s*")?$/,
// 	sample: `5° 12' 46.8"`,
// 	parse: (string) => {
// 		const neg = string.startsWith('-');
// 		const [ deg, min, sec ] = splitNumbers(string);
// 		return (1 - 2*neg)*(deg + min/60 + sec/(60*60));
// 	},
// 	stringify: (value) => {
// 		const [ deg, min, sec, dec ] = decompose(Math.abs(value), [ 360, 60, 60, 10 ]);
// 		const sign = value < 0 ? '-' : '';
// 		return `${sign}${deg}° ${min}' ${sec}${dec ? '.' + dec : ''}"`;
// 	},
}];

export default formats;
