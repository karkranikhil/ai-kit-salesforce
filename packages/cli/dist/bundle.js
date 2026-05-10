#!/usr/bin/env node
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 7993:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
/* module decorator */ module = __nccwpck_require__.nmd(module);


const wrapAnsi16 = (fn, offset) => (...args) => {
	const code = fn(...args);
	return `\u001B[${code + offset}m`;
};

const wrapAnsi256 = (fn, offset) => (...args) => {
	const code = fn(...args);
	return `\u001B[${38 + offset};5;${code}m`;
};

const wrapAnsi16m = (fn, offset) => (...args) => {
	const rgb = fn(...args);
	return `\u001B[${38 + offset};2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
};

const ansi2ansi = n => n;
const rgb2rgb = (r, g, b) => [r, g, b];

const setLazyProperty = (object, property, get) => {
	Object.defineProperty(object, property, {
		get: () => {
			const value = get();

			Object.defineProperty(object, property, {
				value,
				enumerable: true,
				configurable: true
			});

			return value;
		},
		enumerable: true,
		configurable: true
	});
};

/** @type {typeof import('color-convert')} */
let colorConvert;
const makeDynamicStyles = (wrap, targetSpace, identity, isBackground) => {
	if (colorConvert === undefined) {
		colorConvert = __nccwpck_require__(8821);
	}

	const offset = isBackground ? 10 : 0;
	const styles = {};

	for (const [sourceSpace, suite] of Object.entries(colorConvert)) {
		const name = sourceSpace === 'ansi16' ? 'ansi' : sourceSpace;
		if (sourceSpace === targetSpace) {
			styles[name] = wrap(identity, offset);
		} else if (typeof suite === 'object') {
			styles[name] = wrap(suite[targetSpace], offset);
		}
	}

	return styles;
};

function assembleStyles() {
	const codes = new Map();
	const styles = {
		modifier: {
			reset: [0, 0],
			// 21 isn't widely supported and 22 does the same thing
			bold: [1, 22],
			dim: [2, 22],
			italic: [3, 23],
			underline: [4, 24],
			inverse: [7, 27],
			hidden: [8, 28],
			strikethrough: [9, 29]
		},
		color: {
			black: [30, 39],
			red: [31, 39],
			green: [32, 39],
			yellow: [33, 39],
			blue: [34, 39],
			magenta: [35, 39],
			cyan: [36, 39],
			white: [37, 39],

			// Bright color
			blackBright: [90, 39],
			redBright: [91, 39],
			greenBright: [92, 39],
			yellowBright: [93, 39],
			blueBright: [94, 39],
			magentaBright: [95, 39],
			cyanBright: [96, 39],
			whiteBright: [97, 39]
		},
		bgColor: {
			bgBlack: [40, 49],
			bgRed: [41, 49],
			bgGreen: [42, 49],
			bgYellow: [43, 49],
			bgBlue: [44, 49],
			bgMagenta: [45, 49],
			bgCyan: [46, 49],
			bgWhite: [47, 49],

			// Bright color
			bgBlackBright: [100, 49],
			bgRedBright: [101, 49],
			bgGreenBright: [102, 49],
			bgYellowBright: [103, 49],
			bgBlueBright: [104, 49],
			bgMagentaBright: [105, 49],
			bgCyanBright: [106, 49],
			bgWhiteBright: [107, 49]
		}
	};

	// Alias bright black as gray (and grey)
	styles.color.gray = styles.color.blackBright;
	styles.bgColor.bgGray = styles.bgColor.bgBlackBright;
	styles.color.grey = styles.color.blackBright;
	styles.bgColor.bgGrey = styles.bgColor.bgBlackBright;

	for (const [groupName, group] of Object.entries(styles)) {
		for (const [styleName, style] of Object.entries(group)) {
			styles[styleName] = {
				open: `\u001B[${style[0]}m`,
				close: `\u001B[${style[1]}m`
			};

			group[styleName] = styles[styleName];

			codes.set(style[0], style[1]);
		}

		Object.defineProperty(styles, groupName, {
			value: group,
			enumerable: false
		});
	}

	Object.defineProperty(styles, 'codes', {
		value: codes,
		enumerable: false
	});

	styles.color.close = '\u001B[39m';
	styles.bgColor.close = '\u001B[49m';

	setLazyProperty(styles.color, 'ansi', () => makeDynamicStyles(wrapAnsi16, 'ansi16', ansi2ansi, false));
	setLazyProperty(styles.color, 'ansi256', () => makeDynamicStyles(wrapAnsi256, 'ansi256', ansi2ansi, false));
	setLazyProperty(styles.color, 'ansi16m', () => makeDynamicStyles(wrapAnsi16m, 'rgb', rgb2rgb, false));
	setLazyProperty(styles.bgColor, 'ansi', () => makeDynamicStyles(wrapAnsi16, 'ansi16', ansi2ansi, true));
	setLazyProperty(styles.bgColor, 'ansi256', () => makeDynamicStyles(wrapAnsi256, 'ansi256', ansi2ansi, true));
	setLazyProperty(styles.bgColor, 'ansi16m', () => makeDynamicStyles(wrapAnsi16m, 'rgb', rgb2rgb, true));

	return styles;
}

// Make the export immutable
Object.defineProperty(module, 'exports', {
	enumerable: true,
	get: assembleStyles
});


/***/ }),

/***/ 2325:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const ansiStyles = __nccwpck_require__(7993);
const {stdout: stdoutColor, stderr: stderrColor} = __nccwpck_require__(3662);
const {
	stringReplaceAll,
	stringEncaseCRLFWithFirstIndex
} = __nccwpck_require__(6437);

const {isArray} = Array;

// `supportsColor.level` → `ansiStyles.color[name]` mapping
const levelMapping = [
	'ansi',
	'ansi',
	'ansi256',
	'ansi16m'
];

const styles = Object.create(null);

const applyOptions = (object, options = {}) => {
	if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
		throw new Error('The `level` option should be an integer from 0 to 3');
	}

	// Detect level if not set manually
	const colorLevel = stdoutColor ? stdoutColor.level : 0;
	object.level = options.level === undefined ? colorLevel : options.level;
};

class ChalkClass {
	constructor(options) {
		// eslint-disable-next-line no-constructor-return
		return chalkFactory(options);
	}
}

const chalkFactory = options => {
	const chalk = {};
	applyOptions(chalk, options);

	chalk.template = (...arguments_) => chalkTag(chalk.template, ...arguments_);

	Object.setPrototypeOf(chalk, Chalk.prototype);
	Object.setPrototypeOf(chalk.template, chalk);

	chalk.template.constructor = () => {
		throw new Error('`chalk.constructor()` is deprecated. Use `new chalk.Instance()` instead.');
	};

	chalk.template.Instance = ChalkClass;

	return chalk.template;
};

function Chalk(options) {
	return chalkFactory(options);
}

for (const [styleName, style] of Object.entries(ansiStyles)) {
	styles[styleName] = {
		get() {
			const builder = createBuilder(this, createStyler(style.open, style.close, this._styler), this._isEmpty);
			Object.defineProperty(this, styleName, {value: builder});
			return builder;
		}
	};
}

styles.visible = {
	get() {
		const builder = createBuilder(this, this._styler, true);
		Object.defineProperty(this, 'visible', {value: builder});
		return builder;
	}
};

const usedModels = ['rgb', 'hex', 'keyword', 'hsl', 'hsv', 'hwb', 'ansi', 'ansi256'];

for (const model of usedModels) {
	styles[model] = {
		get() {
			const {level} = this;
			return function (...arguments_) {
				const styler = createStyler(ansiStyles.color[levelMapping[level]][model](...arguments_), ansiStyles.color.close, this._styler);
				return createBuilder(this, styler, this._isEmpty);
			};
		}
	};
}

for (const model of usedModels) {
	const bgModel = 'bg' + model[0].toUpperCase() + model.slice(1);
	styles[bgModel] = {
		get() {
			const {level} = this;
			return function (...arguments_) {
				const styler = createStyler(ansiStyles.bgColor[levelMapping[level]][model](...arguments_), ansiStyles.bgColor.close, this._styler);
				return createBuilder(this, styler, this._isEmpty);
			};
		}
	};
}

const proto = Object.defineProperties(() => {}, {
	...styles,
	level: {
		enumerable: true,
		get() {
			return this._generator.level;
		},
		set(level) {
			this._generator.level = level;
		}
	}
});

const createStyler = (open, close, parent) => {
	let openAll;
	let closeAll;
	if (parent === undefined) {
		openAll = open;
		closeAll = close;
	} else {
		openAll = parent.openAll + open;
		closeAll = close + parent.closeAll;
	}

	return {
		open,
		close,
		openAll,
		closeAll,
		parent
	};
};

const createBuilder = (self, _styler, _isEmpty) => {
	const builder = (...arguments_) => {
		if (isArray(arguments_[0]) && isArray(arguments_[0].raw)) {
			// Called as a template literal, for example: chalk.red`2 + 3 = {bold ${2+3}}`
			return applyStyle(builder, chalkTag(builder, ...arguments_));
		}

		// Single argument is hot path, implicit coercion is faster than anything
		// eslint-disable-next-line no-implicit-coercion
		return applyStyle(builder, (arguments_.length === 1) ? ('' + arguments_[0]) : arguments_.join(' '));
	};

	// We alter the prototype because we must return a function, but there is
	// no way to create a function with a different prototype
	Object.setPrototypeOf(builder, proto);

	builder._generator = self;
	builder._styler = _styler;
	builder._isEmpty = _isEmpty;

	return builder;
};

const applyStyle = (self, string) => {
	if (self.level <= 0 || !string) {
		return self._isEmpty ? '' : string;
	}

	let styler = self._styler;

	if (styler === undefined) {
		return string;
	}

	const {openAll, closeAll} = styler;
	if (string.indexOf('\u001B') !== -1) {
		while (styler !== undefined) {
			// Replace any instances already present with a re-opening code
			// otherwise only the part of the string until said closing code
			// will be colored, and the rest will simply be 'plain'.
			string = stringReplaceAll(string, styler.close, styler.open);

			styler = styler.parent;
		}
	}

	// We can move both next actions out of loop, because remaining actions in loop won't have
	// any/visible effect on parts we add here. Close the styling before a linebreak and reopen
	// after next line to fix a bleed issue on macOS: https://github.com/chalk/chalk/pull/92
	const lfIndex = string.indexOf('\n');
	if (lfIndex !== -1) {
		string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
	}

	return openAll + string + closeAll;
};

let template;
const chalkTag = (chalk, ...strings) => {
	const [firstString] = strings;

	if (!isArray(firstString) || !isArray(firstString.raw)) {
		// If chalk() was called by itself or with a string,
		// return the string itself as a string.
		return strings.join(' ');
	}

	const arguments_ = strings.slice(1);
	const parts = [firstString.raw[0]];

	for (let i = 1; i < firstString.length; i++) {
		parts.push(
			String(arguments_[i - 1]).replace(/[{}\\]/g, '\\$&'),
			String(firstString.raw[i])
		);
	}

	if (template === undefined) {
		template = __nccwpck_require__(9514);
	}

	return template(chalk, parts.join(''));
};

Object.defineProperties(Chalk.prototype, styles);

const chalk = Chalk(); // eslint-disable-line new-cap
chalk.supportsColor = stdoutColor;
chalk.stderr = Chalk({level: stderrColor ? stderrColor.level : 0}); // eslint-disable-line new-cap
chalk.stderr.supportsColor = stderrColor;

module.exports = chalk;


/***/ }),

/***/ 9514:
/***/ ((module) => {

"use strict";

const TEMPLATE_REGEX = /(?:\\(u(?:[a-f\d]{4}|\{[a-f\d]{1,6}\})|x[a-f\d]{2}|.))|(?:\{(~)?(\w+(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?)*)(?:[ \t]|(?=\r?\n)))|(\})|((?:.|[\r\n\f])+?)/gi;
const STYLE_REGEX = /(?:^|\.)(\w+)(?:\(([^)]*)\))?/g;
const STRING_REGEX = /^(['"])((?:\\.|(?!\1)[^\\])*)\1$/;
const ESCAPE_REGEX = /\\(u(?:[a-f\d]{4}|{[a-f\d]{1,6}})|x[a-f\d]{2}|.)|([^\\])/gi;

const ESCAPES = new Map([
	['n', '\n'],
	['r', '\r'],
	['t', '\t'],
	['b', '\b'],
	['f', '\f'],
	['v', '\v'],
	['0', '\0'],
	['\\', '\\'],
	['e', '\u001B'],
	['a', '\u0007']
]);

function unescape(c) {
	const u = c[0] === 'u';
	const bracket = c[1] === '{';

	if ((u && !bracket && c.length === 5) || (c[0] === 'x' && c.length === 3)) {
		return String.fromCharCode(parseInt(c.slice(1), 16));
	}

	if (u && bracket) {
		return String.fromCodePoint(parseInt(c.slice(2, -1), 16));
	}

	return ESCAPES.get(c) || c;
}

function parseArguments(name, arguments_) {
	const results = [];
	const chunks = arguments_.trim().split(/\s*,\s*/g);
	let matches;

	for (const chunk of chunks) {
		const number = Number(chunk);
		if (!Number.isNaN(number)) {
			results.push(number);
		} else if ((matches = chunk.match(STRING_REGEX))) {
			results.push(matches[2].replace(ESCAPE_REGEX, (m, escape, character) => escape ? unescape(escape) : character));
		} else {
			throw new Error(`Invalid Chalk template style argument: ${chunk} (in style '${name}')`);
		}
	}

	return results;
}

function parseStyle(style) {
	STYLE_REGEX.lastIndex = 0;

	const results = [];
	let matches;

	while ((matches = STYLE_REGEX.exec(style)) !== null) {
		const name = matches[1];

		if (matches[2]) {
			const args = parseArguments(name, matches[2]);
			results.push([name].concat(args));
		} else {
			results.push([name]);
		}
	}

	return results;
}

function buildStyle(chalk, styles) {
	const enabled = {};

	for (const layer of styles) {
		for (const style of layer.styles) {
			enabled[style[0]] = layer.inverse ? null : style.slice(1);
		}
	}

	let current = chalk;
	for (const [styleName, styles] of Object.entries(enabled)) {
		if (!Array.isArray(styles)) {
			continue;
		}

		if (!(styleName in current)) {
			throw new Error(`Unknown Chalk style: ${styleName}`);
		}

		current = styles.length > 0 ? current[styleName](...styles) : current[styleName];
	}

	return current;
}

module.exports = (chalk, temporary) => {
	const styles = [];
	const chunks = [];
	let chunk = [];

	// eslint-disable-next-line max-params
	temporary.replace(TEMPLATE_REGEX, (m, escapeCharacter, inverse, style, close, character) => {
		if (escapeCharacter) {
			chunk.push(unescape(escapeCharacter));
		} else if (style) {
			const string = chunk.join('');
			chunk = [];
			chunks.push(styles.length === 0 ? string : buildStyle(chalk, styles)(string));
			styles.push({inverse, styles: parseStyle(style)});
		} else if (close) {
			if (styles.length === 0) {
				throw new Error('Found extraneous } in Chalk template literal');
			}

			chunks.push(buildStyle(chalk, styles)(chunk.join('')));
			chunk = [];
			styles.pop();
		} else {
			chunk.push(character);
		}
	});

	chunks.push(chunk.join(''));

	if (styles.length > 0) {
		const errMessage = `Chalk template literal is missing ${styles.length} closing bracket${styles.length === 1 ? '' : 's'} (\`}\`)`;
		throw new Error(errMessage);
	}

	return chunks.join('');
};


/***/ }),

/***/ 6437:
/***/ ((module) => {

"use strict";


const stringReplaceAll = (string, substring, replacer) => {
	let index = string.indexOf(substring);
	if (index === -1) {
		return string;
	}

	const substringLength = substring.length;
	let endIndex = 0;
	let returnValue = '';
	do {
		returnValue += string.substr(endIndex, index - endIndex) + substring + replacer;
		endIndex = index + substringLength;
		index = string.indexOf(substring, endIndex);
	} while (index !== -1);

	returnValue += string.substr(endIndex);
	return returnValue;
};

const stringEncaseCRLFWithFirstIndex = (string, prefix, postfix, index) => {
	let endIndex = 0;
	let returnValue = '';
	do {
		const gotCR = string[index - 1] === '\r';
		returnValue += string.substr(endIndex, (gotCR ? index - 1 : index) - endIndex) + prefix + (gotCR ? '\r\n' : '\n') + postfix;
		endIndex = index + 1;
		index = string.indexOf('\n', endIndex);
	} while (index !== -1);

	returnValue += string.substr(endIndex);
	return returnValue;
};

module.exports = {
	stringReplaceAll,
	stringEncaseCRLFWithFirstIndex
};


/***/ }),

/***/ 9308:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/* MIT license */
/* eslint-disable no-mixed-operators */
const cssKeywords = __nccwpck_require__(9437);

// NOTE: conversions should only return primitive values (i.e. arrays, or
//       values that give correct `typeof` results).
//       do not use box values types (i.e. Number(), String(), etc.)

const reverseKeywords = {};
for (const key of Object.keys(cssKeywords)) {
	reverseKeywords[cssKeywords[key]] = key;
}

const convert = {
	rgb: {channels: 3, labels: 'rgb'},
	hsl: {channels: 3, labels: 'hsl'},
	hsv: {channels: 3, labels: 'hsv'},
	hwb: {channels: 3, labels: 'hwb'},
	cmyk: {channels: 4, labels: 'cmyk'},
	xyz: {channels: 3, labels: 'xyz'},
	lab: {channels: 3, labels: 'lab'},
	lch: {channels: 3, labels: 'lch'},
	hex: {channels: 1, labels: ['hex']},
	keyword: {channels: 1, labels: ['keyword']},
	ansi16: {channels: 1, labels: ['ansi16']},
	ansi256: {channels: 1, labels: ['ansi256']},
	hcg: {channels: 3, labels: ['h', 'c', 'g']},
	apple: {channels: 3, labels: ['r16', 'g16', 'b16']},
	gray: {channels: 1, labels: ['gray']}
};

module.exports = convert;

// Hide .channels and .labels properties
for (const model of Object.keys(convert)) {
	if (!('channels' in convert[model])) {
		throw new Error('missing channels property: ' + model);
	}

	if (!('labels' in convert[model])) {
		throw new Error('missing channel labels property: ' + model);
	}

	if (convert[model].labels.length !== convert[model].channels) {
		throw new Error('channel and label counts mismatch: ' + model);
	}

	const {channels, labels} = convert[model];
	delete convert[model].channels;
	delete convert[model].labels;
	Object.defineProperty(convert[model], 'channels', {value: channels});
	Object.defineProperty(convert[model], 'labels', {value: labels});
}

convert.rgb.hsl = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const min = Math.min(r, g, b);
	const max = Math.max(r, g, b);
	const delta = max - min;
	let h;
	let s;

	if (max === min) {
		h = 0;
	} else if (r === max) {
		h = (g - b) / delta;
	} else if (g === max) {
		h = 2 + (b - r) / delta;
	} else if (b === max) {
		h = 4 + (r - g) / delta;
	}

	h = Math.min(h * 60, 360);

	if (h < 0) {
		h += 360;
	}

	const l = (min + max) / 2;

	if (max === min) {
		s = 0;
	} else if (l <= 0.5) {
		s = delta / (max + min);
	} else {
		s = delta / (2 - max - min);
	}

	return [h, s * 100, l * 100];
};

convert.rgb.hsv = function (rgb) {
	let rdif;
	let gdif;
	let bdif;
	let h;
	let s;

	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const v = Math.max(r, g, b);
	const diff = v - Math.min(r, g, b);
	const diffc = function (c) {
		return (v - c) / 6 / diff + 1 / 2;
	};

	if (diff === 0) {
		h = 0;
		s = 0;
	} else {
		s = diff / v;
		rdif = diffc(r);
		gdif = diffc(g);
		bdif = diffc(b);

		if (r === v) {
			h = bdif - gdif;
		} else if (g === v) {
			h = (1 / 3) + rdif - bdif;
		} else if (b === v) {
			h = (2 / 3) + gdif - rdif;
		}

		if (h < 0) {
			h += 1;
		} else if (h > 1) {
			h -= 1;
		}
	}

	return [
		h * 360,
		s * 100,
		v * 100
	];
};

convert.rgb.hwb = function (rgb) {
	const r = rgb[0];
	const g = rgb[1];
	let b = rgb[2];
	const h = convert.rgb.hsl(rgb)[0];
	const w = 1 / 255 * Math.min(r, Math.min(g, b));

	b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));

	return [h, w * 100, b * 100];
};

convert.rgb.cmyk = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;

	const k = Math.min(1 - r, 1 - g, 1 - b);
	const c = (1 - r - k) / (1 - k) || 0;
	const m = (1 - g - k) / (1 - k) || 0;
	const y = (1 - b - k) / (1 - k) || 0;

	return [c * 100, m * 100, y * 100, k * 100];
};

function comparativeDistance(x, y) {
	/*
		See https://en.m.wikipedia.org/wiki/Euclidean_distance#Squared_Euclidean_distance
	*/
	return (
		((x[0] - y[0]) ** 2) +
		((x[1] - y[1]) ** 2) +
		((x[2] - y[2]) ** 2)
	);
}

convert.rgb.keyword = function (rgb) {
	const reversed = reverseKeywords[rgb];
	if (reversed) {
		return reversed;
	}

	let currentClosestDistance = Infinity;
	let currentClosestKeyword;

	for (const keyword of Object.keys(cssKeywords)) {
		const value = cssKeywords[keyword];

		// Compute comparative distance
		const distance = comparativeDistance(rgb, value);

		// Check if its less, if so set as closest
		if (distance < currentClosestDistance) {
			currentClosestDistance = distance;
			currentClosestKeyword = keyword;
		}
	}

	return currentClosestKeyword;
};

convert.keyword.rgb = function (keyword) {
	return cssKeywords[keyword];
};

convert.rgb.xyz = function (rgb) {
	let r = rgb[0] / 255;
	let g = rgb[1] / 255;
	let b = rgb[2] / 255;

	// Assume sRGB
	r = r > 0.04045 ? (((r + 0.055) / 1.055) ** 2.4) : (r / 12.92);
	g = g > 0.04045 ? (((g + 0.055) / 1.055) ** 2.4) : (g / 12.92);
	b = b > 0.04045 ? (((b + 0.055) / 1.055) ** 2.4) : (b / 12.92);

	const x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
	const y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
	const z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

	return [x * 100, y * 100, z * 100];
};

convert.rgb.lab = function (rgb) {
	const xyz = convert.rgb.xyz(rgb);
	let x = xyz[0];
	let y = xyz[1];
	let z = xyz[2];

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? (x ** (1 / 3)) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? (y ** (1 / 3)) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? (z ** (1 / 3)) : (7.787 * z) + (16 / 116);

	const l = (116 * y) - 16;
	const a = 500 * (x - y);
	const b = 200 * (y - z);

	return [l, a, b];
};

convert.hsl.rgb = function (hsl) {
	const h = hsl[0] / 360;
	const s = hsl[1] / 100;
	const l = hsl[2] / 100;
	let t2;
	let t3;
	let val;

	if (s === 0) {
		val = l * 255;
		return [val, val, val];
	}

	if (l < 0.5) {
		t2 = l * (1 + s);
	} else {
		t2 = l + s - l * s;
	}

	const t1 = 2 * l - t2;

	const rgb = [0, 0, 0];
	for (let i = 0; i < 3; i++) {
		t3 = h + 1 / 3 * -(i - 1);
		if (t3 < 0) {
			t3++;
		}

		if (t3 > 1) {
			t3--;
		}

		if (6 * t3 < 1) {
			val = t1 + (t2 - t1) * 6 * t3;
		} else if (2 * t3 < 1) {
			val = t2;
		} else if (3 * t3 < 2) {
			val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
		} else {
			val = t1;
		}

		rgb[i] = val * 255;
	}

	return rgb;
};

convert.hsl.hsv = function (hsl) {
	const h = hsl[0];
	let s = hsl[1] / 100;
	let l = hsl[2] / 100;
	let smin = s;
	const lmin = Math.max(l, 0.01);

	l *= 2;
	s *= (l <= 1) ? l : 2 - l;
	smin *= lmin <= 1 ? lmin : 2 - lmin;
	const v = (l + s) / 2;
	const sv = l === 0 ? (2 * smin) / (lmin + smin) : (2 * s) / (l + s);

	return [h, sv * 100, v * 100];
};

convert.hsv.rgb = function (hsv) {
	const h = hsv[0] / 60;
	const s = hsv[1] / 100;
	let v = hsv[2] / 100;
	const hi = Math.floor(h) % 6;

	const f = h - Math.floor(h);
	const p = 255 * v * (1 - s);
	const q = 255 * v * (1 - (s * f));
	const t = 255 * v * (1 - (s * (1 - f)));
	v *= 255;

	switch (hi) {
		case 0:
			return [v, t, p];
		case 1:
			return [q, v, p];
		case 2:
			return [p, v, t];
		case 3:
			return [p, q, v];
		case 4:
			return [t, p, v];
		case 5:
			return [v, p, q];
	}
};

convert.hsv.hsl = function (hsv) {
	const h = hsv[0];
	const s = hsv[1] / 100;
	const v = hsv[2] / 100;
	const vmin = Math.max(v, 0.01);
	let sl;
	let l;

	l = (2 - s) * v;
	const lmin = (2 - s) * vmin;
	sl = s * vmin;
	sl /= (lmin <= 1) ? lmin : 2 - lmin;
	sl = sl || 0;
	l /= 2;

	return [h, sl * 100, l * 100];
};

// http://dev.w3.org/csswg/css-color/#hwb-to-rgb
convert.hwb.rgb = function (hwb) {
	const h = hwb[0] / 360;
	let wh = hwb[1] / 100;
	let bl = hwb[2] / 100;
	const ratio = wh + bl;
	let f;

	// Wh + bl cant be > 1
	if (ratio > 1) {
		wh /= ratio;
		bl /= ratio;
	}

	const i = Math.floor(6 * h);
	const v = 1 - bl;
	f = 6 * h - i;

	if ((i & 0x01) !== 0) {
		f = 1 - f;
	}

	const n = wh + f * (v - wh); // Linear interpolation

	let r;
	let g;
	let b;
	/* eslint-disable max-statements-per-line,no-multi-spaces */
	switch (i) {
		default:
		case 6:
		case 0: r = v;  g = n;  b = wh; break;
		case 1: r = n;  g = v;  b = wh; break;
		case 2: r = wh; g = v;  b = n; break;
		case 3: r = wh; g = n;  b = v; break;
		case 4: r = n;  g = wh; b = v; break;
		case 5: r = v;  g = wh; b = n; break;
	}
	/* eslint-enable max-statements-per-line,no-multi-spaces */

	return [r * 255, g * 255, b * 255];
};

convert.cmyk.rgb = function (cmyk) {
	const c = cmyk[0] / 100;
	const m = cmyk[1] / 100;
	const y = cmyk[2] / 100;
	const k = cmyk[3] / 100;

	const r = 1 - Math.min(1, c * (1 - k) + k);
	const g = 1 - Math.min(1, m * (1 - k) + k);
	const b = 1 - Math.min(1, y * (1 - k) + k);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.rgb = function (xyz) {
	const x = xyz[0] / 100;
	const y = xyz[1] / 100;
	const z = xyz[2] / 100;
	let r;
	let g;
	let b;

	r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
	g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
	b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

	// Assume sRGB
	r = r > 0.0031308
		? ((1.055 * (r ** (1.0 / 2.4))) - 0.055)
		: r * 12.92;

	g = g > 0.0031308
		? ((1.055 * (g ** (1.0 / 2.4))) - 0.055)
		: g * 12.92;

	b = b > 0.0031308
		? ((1.055 * (b ** (1.0 / 2.4))) - 0.055)
		: b * 12.92;

	r = Math.min(Math.max(0, r), 1);
	g = Math.min(Math.max(0, g), 1);
	b = Math.min(Math.max(0, b), 1);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.lab = function (xyz) {
	let x = xyz[0];
	let y = xyz[1];
	let z = xyz[2];

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? (x ** (1 / 3)) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? (y ** (1 / 3)) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? (z ** (1 / 3)) : (7.787 * z) + (16 / 116);

	const l = (116 * y) - 16;
	const a = 500 * (x - y);
	const b = 200 * (y - z);

	return [l, a, b];
};

convert.lab.xyz = function (lab) {
	const l = lab[0];
	const a = lab[1];
	const b = lab[2];
	let x;
	let y;
	let z;

	y = (l + 16) / 116;
	x = a / 500 + y;
	z = y - b / 200;

	const y2 = y ** 3;
	const x2 = x ** 3;
	const z2 = z ** 3;
	y = y2 > 0.008856 ? y2 : (y - 16 / 116) / 7.787;
	x = x2 > 0.008856 ? x2 : (x - 16 / 116) / 7.787;
	z = z2 > 0.008856 ? z2 : (z - 16 / 116) / 7.787;

	x *= 95.047;
	y *= 100;
	z *= 108.883;

	return [x, y, z];
};

convert.lab.lch = function (lab) {
	const l = lab[0];
	const a = lab[1];
	const b = lab[2];
	let h;

	const hr = Math.atan2(b, a);
	h = hr * 360 / 2 / Math.PI;

	if (h < 0) {
		h += 360;
	}

	const c = Math.sqrt(a * a + b * b);

	return [l, c, h];
};

convert.lch.lab = function (lch) {
	const l = lch[0];
	const c = lch[1];
	const h = lch[2];

	const hr = h / 360 * 2 * Math.PI;
	const a = c * Math.cos(hr);
	const b = c * Math.sin(hr);

	return [l, a, b];
};

convert.rgb.ansi16 = function (args, saturation = null) {
	const [r, g, b] = args;
	let value = saturation === null ? convert.rgb.hsv(args)[2] : saturation; // Hsv -> ansi16 optimization

	value = Math.round(value / 50);

	if (value === 0) {
		return 30;
	}

	let ansi = 30
		+ ((Math.round(b / 255) << 2)
		| (Math.round(g / 255) << 1)
		| Math.round(r / 255));

	if (value === 2) {
		ansi += 60;
	}

	return ansi;
};

convert.hsv.ansi16 = function (args) {
	// Optimization here; we already know the value and don't need to get
	// it converted for us.
	return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
};

convert.rgb.ansi256 = function (args) {
	const r = args[0];
	const g = args[1];
	const b = args[2];

	// We use the extended greyscale palette here, with the exception of
	// black and white. normal palette only has 4 greyscale shades.
	if (r === g && g === b) {
		if (r < 8) {
			return 16;
		}

		if (r > 248) {
			return 231;
		}

		return Math.round(((r - 8) / 247) * 24) + 232;
	}

	const ansi = 16
		+ (36 * Math.round(r / 255 * 5))
		+ (6 * Math.round(g / 255 * 5))
		+ Math.round(b / 255 * 5);

	return ansi;
};

convert.ansi16.rgb = function (args) {
	let color = args % 10;

	// Handle greyscale
	if (color === 0 || color === 7) {
		if (args > 50) {
			color += 3.5;
		}

		color = color / 10.5 * 255;

		return [color, color, color];
	}

	const mult = (~~(args > 50) + 1) * 0.5;
	const r = ((color & 1) * mult) * 255;
	const g = (((color >> 1) & 1) * mult) * 255;
	const b = (((color >> 2) & 1) * mult) * 255;

	return [r, g, b];
};

convert.ansi256.rgb = function (args) {
	// Handle greyscale
	if (args >= 232) {
		const c = (args - 232) * 10 + 8;
		return [c, c, c];
	}

	args -= 16;

	let rem;
	const r = Math.floor(args / 36) / 5 * 255;
	const g = Math.floor((rem = args % 36) / 6) / 5 * 255;
	const b = (rem % 6) / 5 * 255;

	return [r, g, b];
};

convert.rgb.hex = function (args) {
	const integer = ((Math.round(args[0]) & 0xFF) << 16)
		+ ((Math.round(args[1]) & 0xFF) << 8)
		+ (Math.round(args[2]) & 0xFF);

	const string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert.hex.rgb = function (args) {
	const match = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
	if (!match) {
		return [0, 0, 0];
	}

	let colorString = match[0];

	if (match[0].length === 3) {
		colorString = colorString.split('').map(char => {
			return char + char;
		}).join('');
	}

	const integer = parseInt(colorString, 16);
	const r = (integer >> 16) & 0xFF;
	const g = (integer >> 8) & 0xFF;
	const b = integer & 0xFF;

	return [r, g, b];
};

convert.rgb.hcg = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const max = Math.max(Math.max(r, g), b);
	const min = Math.min(Math.min(r, g), b);
	const chroma = (max - min);
	let grayscale;
	let hue;

	if (chroma < 1) {
		grayscale = min / (1 - chroma);
	} else {
		grayscale = 0;
	}

	if (chroma <= 0) {
		hue = 0;
	} else
	if (max === r) {
		hue = ((g - b) / chroma) % 6;
	} else
	if (max === g) {
		hue = 2 + (b - r) / chroma;
	} else {
		hue = 4 + (r - g) / chroma;
	}

	hue /= 6;
	hue %= 1;

	return [hue * 360, chroma * 100, grayscale * 100];
};

convert.hsl.hcg = function (hsl) {
	const s = hsl[1] / 100;
	const l = hsl[2] / 100;

	const c = l < 0.5 ? (2.0 * s * l) : (2.0 * s * (1.0 - l));

	let f = 0;
	if (c < 1.0) {
		f = (l - 0.5 * c) / (1.0 - c);
	}

	return [hsl[0], c * 100, f * 100];
};

convert.hsv.hcg = function (hsv) {
	const s = hsv[1] / 100;
	const v = hsv[2] / 100;

	const c = s * v;
	let f = 0;

	if (c < 1.0) {
		f = (v - c) / (1 - c);
	}

	return [hsv[0], c * 100, f * 100];
};

convert.hcg.rgb = function (hcg) {
	const h = hcg[0] / 360;
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	if (c === 0.0) {
		return [g * 255, g * 255, g * 255];
	}

	const pure = [0, 0, 0];
	const hi = (h % 1) * 6;
	const v = hi % 1;
	const w = 1 - v;
	let mg = 0;

	/* eslint-disable max-statements-per-line */
	switch (Math.floor(hi)) {
		case 0:
			pure[0] = 1; pure[1] = v; pure[2] = 0; break;
		case 1:
			pure[0] = w; pure[1] = 1; pure[2] = 0; break;
		case 2:
			pure[0] = 0; pure[1] = 1; pure[2] = v; break;
		case 3:
			pure[0] = 0; pure[1] = w; pure[2] = 1; break;
		case 4:
			pure[0] = v; pure[1] = 0; pure[2] = 1; break;
		default:
			pure[0] = 1; pure[1] = 0; pure[2] = w;
	}
	/* eslint-enable max-statements-per-line */

	mg = (1.0 - c) * g;

	return [
		(c * pure[0] + mg) * 255,
		(c * pure[1] + mg) * 255,
		(c * pure[2] + mg) * 255
	];
};

convert.hcg.hsv = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	const v = c + g * (1.0 - c);
	let f = 0;

	if (v > 0.0) {
		f = c / v;
	}

	return [hcg[0], f * 100, v * 100];
};

convert.hcg.hsl = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	const l = g * (1.0 - c) + 0.5 * c;
	let s = 0;

	if (l > 0.0 && l < 0.5) {
		s = c / (2 * l);
	} else
	if (l >= 0.5 && l < 1.0) {
		s = c / (2 * (1 - l));
	}

	return [hcg[0], s * 100, l * 100];
};

convert.hcg.hwb = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;
	const v = c + g * (1.0 - c);
	return [hcg[0], (v - c) * 100, (1 - v) * 100];
};

convert.hwb.hcg = function (hwb) {
	const w = hwb[1] / 100;
	const b = hwb[2] / 100;
	const v = 1 - b;
	const c = v - w;
	let g = 0;

	if (c < 1) {
		g = (v - c) / (1 - c);
	}

	return [hwb[0], c * 100, g * 100];
};

convert.apple.rgb = function (apple) {
	return [(apple[0] / 65535) * 255, (apple[1] / 65535) * 255, (apple[2] / 65535) * 255];
};

convert.rgb.apple = function (rgb) {
	return [(rgb[0] / 255) * 65535, (rgb[1] / 255) * 65535, (rgb[2] / 255) * 65535];
};

convert.gray.rgb = function (args) {
	return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
};

convert.gray.hsl = function (args) {
	return [0, 0, args[0]];
};

convert.gray.hsv = convert.gray.hsl;

convert.gray.hwb = function (gray) {
	return [0, 100, gray[0]];
};

convert.gray.cmyk = function (gray) {
	return [0, 0, 0, gray[0]];
};

convert.gray.lab = function (gray) {
	return [gray[0], 0, 0];
};

convert.gray.hex = function (gray) {
	const val = Math.round(gray[0] / 100 * 255) & 0xFF;
	const integer = (val << 16) + (val << 8) + val;

	const string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert.rgb.gray = function (rgb) {
	const val = (rgb[0] + rgb[1] + rgb[2]) / 3;
	return [val / 255 * 100];
};


/***/ }),

/***/ 8821:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const conversions = __nccwpck_require__(9308);
const route = __nccwpck_require__(4140);

const convert = {};

const models = Object.keys(conversions);

function wrapRaw(fn) {
	const wrappedFn = function (...args) {
		const arg0 = args[0];
		if (arg0 === undefined || arg0 === null) {
			return arg0;
		}

		if (arg0.length > 1) {
			args = arg0;
		}

		return fn(args);
	};

	// Preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

function wrapRounded(fn) {
	const wrappedFn = function (...args) {
		const arg0 = args[0];

		if (arg0 === undefined || arg0 === null) {
			return arg0;
		}

		if (arg0.length > 1) {
			args = arg0;
		}

		const result = fn(args);

		// We're assuming the result is an array here.
		// see notice in conversions.js; don't use box types
		// in conversion functions.
		if (typeof result === 'object') {
			for (let len = result.length, i = 0; i < len; i++) {
				result[i] = Math.round(result[i]);
			}
		}

		return result;
	};

	// Preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

models.forEach(fromModel => {
	convert[fromModel] = {};

	Object.defineProperty(convert[fromModel], 'channels', {value: conversions[fromModel].channels});
	Object.defineProperty(convert[fromModel], 'labels', {value: conversions[fromModel].labels});

	const routes = route(fromModel);
	const routeModels = Object.keys(routes);

	routeModels.forEach(toModel => {
		const fn = routes[toModel];

		convert[fromModel][toModel] = wrapRounded(fn);
		convert[fromModel][toModel].raw = wrapRaw(fn);
	});
});

module.exports = convert;


/***/ }),

/***/ 4140:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const conversions = __nccwpck_require__(9308);

/*
	This function routes a model to all other models.

	all functions that are routed have a property `.conversion` attached
	to the returned synthetic function. This property is an array
	of strings, each with the steps in between the 'from' and 'to'
	color models (inclusive).

	conversions that are not possible simply are not included.
*/

function buildGraph() {
	const graph = {};
	// https://jsperf.com/object-keys-vs-for-in-with-closure/3
	const models = Object.keys(conversions);

	for (let len = models.length, i = 0; i < len; i++) {
		graph[models[i]] = {
			// http://jsperf.com/1-vs-infinity
			// micro-opt, but this is simple.
			distance: -1,
			parent: null
		};
	}

	return graph;
}

// https://en.wikipedia.org/wiki/Breadth-first_search
function deriveBFS(fromModel) {
	const graph = buildGraph();
	const queue = [fromModel]; // Unshift -> queue -> pop

	graph[fromModel].distance = 0;

	while (queue.length) {
		const current = queue.pop();
		const adjacents = Object.keys(conversions[current]);

		for (let len = adjacents.length, i = 0; i < len; i++) {
			const adjacent = adjacents[i];
			const node = graph[adjacent];

			if (node.distance === -1) {
				node.distance = graph[current].distance + 1;
				node.parent = current;
				queue.unshift(adjacent);
			}
		}
	}

	return graph;
}

function link(from, to) {
	return function (args) {
		return to(from(args));
	};
}

function wrapConversion(toModel, graph) {
	const path = [graph[toModel].parent, toModel];
	let fn = conversions[graph[toModel].parent][toModel];

	let cur = graph[toModel].parent;
	while (graph[cur].parent) {
		path.unshift(graph[cur].parent);
		fn = link(conversions[graph[cur].parent][cur], fn);
		cur = graph[cur].parent;
	}

	fn.conversion = path;
	return fn;
}

module.exports = function (fromModel) {
	const graph = deriveBFS(fromModel);
	const conversion = {};

	const models = Object.keys(graph);
	for (let len = models.length, i = 0; i < len; i++) {
		const toModel = models[i];
		const node = graph[toModel];

		if (node.parent === null) {
			// No possible conversion, or this node is the source model.
			continue;
		}

		conversion[toModel] = wrapConversion(toModel, graph);
	}

	return conversion;
};



/***/ }),

/***/ 9437:
/***/ ((module) => {

"use strict";


module.exports = {
	"aliceblue": [240, 248, 255],
	"antiquewhite": [250, 235, 215],
	"aqua": [0, 255, 255],
	"aquamarine": [127, 255, 212],
	"azure": [240, 255, 255],
	"beige": [245, 245, 220],
	"bisque": [255, 228, 196],
	"black": [0, 0, 0],
	"blanchedalmond": [255, 235, 205],
	"blue": [0, 0, 255],
	"blueviolet": [138, 43, 226],
	"brown": [165, 42, 42],
	"burlywood": [222, 184, 135],
	"cadetblue": [95, 158, 160],
	"chartreuse": [127, 255, 0],
	"chocolate": [210, 105, 30],
	"coral": [255, 127, 80],
	"cornflowerblue": [100, 149, 237],
	"cornsilk": [255, 248, 220],
	"crimson": [220, 20, 60],
	"cyan": [0, 255, 255],
	"darkblue": [0, 0, 139],
	"darkcyan": [0, 139, 139],
	"darkgoldenrod": [184, 134, 11],
	"darkgray": [169, 169, 169],
	"darkgreen": [0, 100, 0],
	"darkgrey": [169, 169, 169],
	"darkkhaki": [189, 183, 107],
	"darkmagenta": [139, 0, 139],
	"darkolivegreen": [85, 107, 47],
	"darkorange": [255, 140, 0],
	"darkorchid": [153, 50, 204],
	"darkred": [139, 0, 0],
	"darksalmon": [233, 150, 122],
	"darkseagreen": [143, 188, 143],
	"darkslateblue": [72, 61, 139],
	"darkslategray": [47, 79, 79],
	"darkslategrey": [47, 79, 79],
	"darkturquoise": [0, 206, 209],
	"darkviolet": [148, 0, 211],
	"deeppink": [255, 20, 147],
	"deepskyblue": [0, 191, 255],
	"dimgray": [105, 105, 105],
	"dimgrey": [105, 105, 105],
	"dodgerblue": [30, 144, 255],
	"firebrick": [178, 34, 34],
	"floralwhite": [255, 250, 240],
	"forestgreen": [34, 139, 34],
	"fuchsia": [255, 0, 255],
	"gainsboro": [220, 220, 220],
	"ghostwhite": [248, 248, 255],
	"gold": [255, 215, 0],
	"goldenrod": [218, 165, 32],
	"gray": [128, 128, 128],
	"green": [0, 128, 0],
	"greenyellow": [173, 255, 47],
	"grey": [128, 128, 128],
	"honeydew": [240, 255, 240],
	"hotpink": [255, 105, 180],
	"indianred": [205, 92, 92],
	"indigo": [75, 0, 130],
	"ivory": [255, 255, 240],
	"khaki": [240, 230, 140],
	"lavender": [230, 230, 250],
	"lavenderblush": [255, 240, 245],
	"lawngreen": [124, 252, 0],
	"lemonchiffon": [255, 250, 205],
	"lightblue": [173, 216, 230],
	"lightcoral": [240, 128, 128],
	"lightcyan": [224, 255, 255],
	"lightgoldenrodyellow": [250, 250, 210],
	"lightgray": [211, 211, 211],
	"lightgreen": [144, 238, 144],
	"lightgrey": [211, 211, 211],
	"lightpink": [255, 182, 193],
	"lightsalmon": [255, 160, 122],
	"lightseagreen": [32, 178, 170],
	"lightskyblue": [135, 206, 250],
	"lightslategray": [119, 136, 153],
	"lightslategrey": [119, 136, 153],
	"lightsteelblue": [176, 196, 222],
	"lightyellow": [255, 255, 224],
	"lime": [0, 255, 0],
	"limegreen": [50, 205, 50],
	"linen": [250, 240, 230],
	"magenta": [255, 0, 255],
	"maroon": [128, 0, 0],
	"mediumaquamarine": [102, 205, 170],
	"mediumblue": [0, 0, 205],
	"mediumorchid": [186, 85, 211],
	"mediumpurple": [147, 112, 219],
	"mediumseagreen": [60, 179, 113],
	"mediumslateblue": [123, 104, 238],
	"mediumspringgreen": [0, 250, 154],
	"mediumturquoise": [72, 209, 204],
	"mediumvioletred": [199, 21, 133],
	"midnightblue": [25, 25, 112],
	"mintcream": [245, 255, 250],
	"mistyrose": [255, 228, 225],
	"moccasin": [255, 228, 181],
	"navajowhite": [255, 222, 173],
	"navy": [0, 0, 128],
	"oldlace": [253, 245, 230],
	"olive": [128, 128, 0],
	"olivedrab": [107, 142, 35],
	"orange": [255, 165, 0],
	"orangered": [255, 69, 0],
	"orchid": [218, 112, 214],
	"palegoldenrod": [238, 232, 170],
	"palegreen": [152, 251, 152],
	"paleturquoise": [175, 238, 238],
	"palevioletred": [219, 112, 147],
	"papayawhip": [255, 239, 213],
	"peachpuff": [255, 218, 185],
	"peru": [205, 133, 63],
	"pink": [255, 192, 203],
	"plum": [221, 160, 221],
	"powderblue": [176, 224, 230],
	"purple": [128, 0, 128],
	"rebeccapurple": [102, 51, 153],
	"red": [255, 0, 0],
	"rosybrown": [188, 143, 143],
	"royalblue": [65, 105, 225],
	"saddlebrown": [139, 69, 19],
	"salmon": [250, 128, 114],
	"sandybrown": [244, 164, 96],
	"seagreen": [46, 139, 87],
	"seashell": [255, 245, 238],
	"sienna": [160, 82, 45],
	"silver": [192, 192, 192],
	"skyblue": [135, 206, 235],
	"slateblue": [106, 90, 205],
	"slategray": [112, 128, 144],
	"slategrey": [112, 128, 144],
	"snow": [255, 250, 250],
	"springgreen": [0, 255, 127],
	"steelblue": [70, 130, 180],
	"tan": [210, 180, 140],
	"teal": [0, 128, 128],
	"thistle": [216, 191, 216],
	"tomato": [255, 99, 71],
	"turquoise": [64, 224, 208],
	"violet": [238, 130, 238],
	"wheat": [245, 222, 179],
	"white": [255, 255, 255],
	"whitesmoke": [245, 245, 245],
	"yellow": [255, 255, 0],
	"yellowgreen": [154, 205, 50]
};


/***/ }),

/***/ 8875:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1404)
const path = __nccwpck_require__(6928)
const mkdirsSync = (__nccwpck_require__(6813).mkdirsSync)
const utimesMillisSync = (__nccwpck_require__(1226).utimesMillisSync)
const stat = __nccwpck_require__(699)

function copySync (src, dest, opts) {
  if (typeof opts === 'function') {
    opts = { filter: opts }
  }

  opts = opts || {}
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    process.emitWarning(
      'Using the preserveTimestamps option in 32-bit node is not recommended;\n\n' +
      '\tsee https://github.com/jprichardson/node-fs-extra/issues/269',
      'Warning', 'fs-extra-WARN0002'
    )
  }

  const { srcStat, destStat } = stat.checkPathsSync(src, dest, 'copy', opts)
  stat.checkParentPathsSync(src, srcStat, dest, 'copy')
  if (opts.filter && !opts.filter(src, dest)) return
  const destParent = path.dirname(dest)
  if (!fs.existsSync(destParent)) mkdirsSync(destParent)
  return getStats(destStat, src, dest, opts)
}

function getStats (destStat, src, dest, opts) {
  const statSync = opts.dereference ? fs.statSync : fs.lstatSync
  const srcStat = statSync(src)

  if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts)
  else if (srcStat.isFile() ||
           srcStat.isCharacterDevice() ||
           srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts)
  else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts)
  else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`)
  else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`)
  throw new Error(`Unknown file: ${src}`)
}

function onFile (srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile(srcStat, src, dest, opts)
  return mayCopyFile(srcStat, src, dest, opts)
}

function mayCopyFile (srcStat, src, dest, opts) {
  if (opts.overwrite) {
    fs.unlinkSync(dest)
    return copyFile(srcStat, src, dest, opts)
  } else if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`)
  }
}

function copyFile (srcStat, src, dest, opts) {
  fs.copyFileSync(src, dest)
  if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest)
  return setDestMode(dest, srcStat.mode)
}

function handleTimestamps (srcMode, src, dest) {
  // Make sure the file is writable before setting the timestamp
  // otherwise open fails with EPERM when invoked with 'r+'
  // (through utimes call)
  if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode)
  return setDestTimestamps(src, dest)
}

function fileIsNotWritable (srcMode) {
  return (srcMode & 0o200) === 0
}

function makeFileWritable (dest, srcMode) {
  return setDestMode(dest, srcMode | 0o200)
}

function setDestMode (dest, srcMode) {
  return fs.chmodSync(dest, srcMode)
}

function setDestTimestamps (src, dest) {
  // The initial srcStat.atime cannot be trusted
  // because it is modified by the read(2) system call
  // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
  const updatedSrcStat = fs.statSync(src)
  return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime)
}

function onDir (srcStat, destStat, src, dest, opts) {
  if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts)
  return copyDir(src, dest, opts)
}

function mkDirAndCopy (srcMode, src, dest, opts) {
  fs.mkdirSync(dest)
  copyDir(src, dest, opts)
  return setDestMode(dest, srcMode)
}

function copyDir (src, dest, opts) {
  const dir = fs.opendirSync(src)

  try {
    let dirent

    while ((dirent = dir.readSync()) !== null) {
      copyDirItem(dirent.name, src, dest, opts)
    }
  } finally {
    dir.closeSync()
  }
}

function copyDirItem (item, src, dest, opts) {
  const srcItem = path.join(src, item)
  const destItem = path.join(dest, item)
  if (opts.filter && !opts.filter(srcItem, destItem)) return
  const { destStat } = stat.checkPathsSync(srcItem, destItem, 'copy', opts)
  return getStats(destStat, srcItem, destItem, opts)
}

function onLink (destStat, src, dest, opts) {
  let resolvedSrc = fs.readlinkSync(src)
  if (opts.dereference) {
    resolvedSrc = path.resolve(process.cwd(), resolvedSrc)
  }

  if (!destStat) {
    return fs.symlinkSync(resolvedSrc, dest)
  } else {
    let resolvedDest
    try {
      resolvedDest = fs.readlinkSync(dest)
    } catch (err) {
      // dest exists and is a regular file or directory,
      // Windows may throw UNKNOWN error. If dest already exists,
      // fs throws error anyway, so no need to guard against it here.
      if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return fs.symlinkSync(resolvedSrc, dest)
      throw err
    }
    if (opts.dereference) {
      resolvedDest = path.resolve(process.cwd(), resolvedDest)
    }
    // If both symlinks resolve to the same target, they are still distinct symlinks
    // that can be copied/overwritten. Only check subdirectory constraints when
    // the resolved paths are different.
    if (resolvedSrc !== resolvedDest) {
      if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
        throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`)
      }

      // prevent copy if src is a subdir of dest since unlinking
      // dest in this case would result in removing src contents
      // and therefore a broken symlink would be created.
      if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
        throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`)
      }
    }
    return copyLink(resolvedSrc, dest)
  }
}

function copyLink (resolvedSrc, dest) {
  fs.unlinkSync(dest)
  return fs.symlinkSync(resolvedSrc, dest)
}

module.exports = copySync


/***/ }),

/***/ 4027:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(9238)
const path = __nccwpck_require__(6928)
const { mkdirs } = __nccwpck_require__(6813)
const { pathExists } = __nccwpck_require__(6949)
const { utimesMillis } = __nccwpck_require__(1226)
const stat = __nccwpck_require__(699)
const { asyncIteratorConcurrentProcess } = __nccwpck_require__(4645)

async function copy (src, dest, opts = {}) {
  if (typeof opts === 'function') {
    opts = { filter: opts }
  }

  opts.clobber = 'clobber' in opts ? !!opts.clobber : true // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    process.emitWarning(
      'Using the preserveTimestamps option in 32-bit node is not recommended;\n\n' +
      '\tsee https://github.com/jprichardson/node-fs-extra/issues/269',
      'Warning', 'fs-extra-WARN0001'
    )
  }

  const { srcStat, destStat } = await stat.checkPaths(src, dest, 'copy', opts)

  await stat.checkParentPaths(src, srcStat, dest, 'copy')

  const include = await runFilter(src, dest, opts)

  if (!include) return

  // check if the parent of dest exists, and create it if it doesn't exist
  const destParent = path.dirname(dest)
  const dirExists = await pathExists(destParent)
  if (!dirExists) {
    await mkdirs(destParent)
  }

  await getStatsAndPerformCopy(destStat, src, dest, opts)
}

async function runFilter (src, dest, opts) {
  if (!opts.filter) return true
  return opts.filter(src, dest)
}

async function getStatsAndPerformCopy (destStat, src, dest, opts) {
  const statFn = opts.dereference ? fs.stat : fs.lstat
  const srcStat = await statFn(src)

  if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts)

  if (
    srcStat.isFile() ||
    srcStat.isCharacterDevice() ||
    srcStat.isBlockDevice()
  ) return onFile(srcStat, destStat, src, dest, opts)

  if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts)
  if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`)
  if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`)
  throw new Error(`Unknown file: ${src}`)
}

async function onFile (srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile(srcStat, src, dest, opts)

  if (opts.overwrite) {
    await fs.unlink(dest)
    return copyFile(srcStat, src, dest, opts)
  }
  if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`)
  }
}

async function copyFile (srcStat, src, dest, opts) {
  await fs.copyFile(src, dest)
  if (opts.preserveTimestamps) {
    // Make sure the file is writable before setting the timestamp
    // otherwise open fails with EPERM when invoked with 'r+'
    // (through utimes call)
    if (fileIsNotWritable(srcStat.mode)) {
      await makeFileWritable(dest, srcStat.mode)
    }

    // Set timestamps and mode correspondingly

    // Note that The initial srcStat.atime cannot be trusted
    // because it is modified by the read(2) system call
    // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
    const updatedSrcStat = await fs.stat(src)
    await utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime)
  }

  return fs.chmod(dest, srcStat.mode)
}

function fileIsNotWritable (srcMode) {
  return (srcMode & 0o200) === 0
}

function makeFileWritable (dest, srcMode) {
  return fs.chmod(dest, srcMode | 0o200)
}

async function onDir (srcStat, destStat, src, dest, opts) {
  // the dest directory might not exist, create it
  if (!destStat) {
    await fs.mkdir(dest)
  }

  // iterate through the files in the current directory to copy everything
  await asyncIteratorConcurrentProcess(await fs.opendir(src), async (item) => {
    const srcItem = path.join(src, item.name)
    const destItem = path.join(dest, item.name)

    const include = await runFilter(srcItem, destItem, opts)
    // only copy the item if it matches the filter function
    if (include) {
      const { destStat } = await stat.checkPaths(srcItem, destItem, 'copy', opts)
      // If the item is a copyable file, `getStatsAndPerformCopy` will copy it
      // If the item is a directory, `getStatsAndPerformCopy` will call `onDir` recursively
      await getStatsAndPerformCopy(destStat, srcItem, destItem, opts)
    }
  })

  if (!destStat) {
    await fs.chmod(dest, srcStat.mode)
  }
}

async function onLink (destStat, src, dest, opts) {
  let resolvedSrc = await fs.readlink(src)
  if (opts.dereference) {
    resolvedSrc = path.resolve(process.cwd(), resolvedSrc)
  }
  if (!destStat) {
    return fs.symlink(resolvedSrc, dest)
  }

  let resolvedDest = null
  try {
    resolvedDest = await fs.readlink(dest)
  } catch (e) {
    // dest exists and is a regular file or directory,
    // Windows may throw UNKNOWN error. If dest already exists,
    // fs throws error anyway, so no need to guard against it here.
    if (e.code === 'EINVAL' || e.code === 'UNKNOWN') return fs.symlink(resolvedSrc, dest)
    throw e
  }
  if (opts.dereference) {
    resolvedDest = path.resolve(process.cwd(), resolvedDest)
  }
  // If both symlinks resolve to the same target, they are still distinct symlinks
  // that can be copied/overwritten. Only check subdirectory constraints when
  // the resolved paths are different.
  if (resolvedSrc !== resolvedDest) {
    if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
      throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`)
    }

    // do not copy if src is a subdir of dest since unlinking
    // dest in this case would result in removing src contents
    // and therefore a broken symlink would be created.
    if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
      throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`)
    }
  }

  // copy the link
  await fs.unlink(dest)
  return fs.symlink(resolvedSrc, dest)
}

module.exports = copy


/***/ }),

/***/ 424:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
module.exports = {
  copy: u(__nccwpck_require__(4027)),
  copySync: __nccwpck_require__(8875)
}


/***/ }),

/***/ 198:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const fs = __nccwpck_require__(9238)
const path = __nccwpck_require__(6928)
const mkdir = __nccwpck_require__(6813)
const remove = __nccwpck_require__(3073)

const emptyDir = u(async function emptyDir (dir) {
  let items
  try {
    items = await fs.readdir(dir)
  } catch {
    return mkdir.mkdirs(dir)
  }

  return Promise.all(items.map(item => remove.remove(path.join(dir, item))))
})

function emptyDirSync (dir) {
  let items
  try {
    items = fs.readdirSync(dir)
  } catch {
    return mkdir.mkdirsSync(dir)
  }

  items.forEach(item => {
    item = path.join(dir, item)
    remove.removeSync(item)
  })
}

module.exports = {
  emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir,
  emptydir: emptyDir
}


/***/ }),

/***/ 3693:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const path = __nccwpck_require__(6928)
const fs = __nccwpck_require__(9238)
const mkdir = __nccwpck_require__(6813)

async function createFile (file) {
  let stats
  try {
    stats = await fs.stat(file)
  } catch { }
  if (stats && stats.isFile()) return

  const dir = path.dirname(file)

  let dirStats = null
  try {
    dirStats = await fs.stat(dir)
  } catch (err) {
    // if the directory doesn't exist, make it
    if (err.code === 'ENOENT') {
      await mkdir.mkdirs(dir)
      await fs.writeFile(file, '')
      return
    } else {
      throw err
    }
  }

  if (dirStats.isDirectory()) {
    await fs.writeFile(file, '')
  } else {
    // parent is not a directory
    // This is just to cause an internal ENOTDIR error to be thrown
    await fs.readdir(dir)
  }
}

function createFileSync (file) {
  let stats
  try {
    stats = fs.statSync(file)
  } catch { }
  if (stats && stats.isFile()) return

  const dir = path.dirname(file)
  try {
    if (!fs.statSync(dir).isDirectory()) {
      // parent is not a directory
      // This is just to cause an internal ENOTDIR error to be thrown
      fs.readdirSync(dir)
    }
  } catch (err) {
    // If the stat call above failed because the directory doesn't exist, create it
    if (err && err.code === 'ENOENT') mkdir.mkdirsSync(dir)
    else throw err
  }

  fs.writeFileSync(file, '')
}

module.exports = {
  createFile: u(createFile),
  createFileSync
}


/***/ }),

/***/ 4895:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { createFile, createFileSync } = __nccwpck_require__(3693)
const { createLink, createLinkSync } = __nccwpck_require__(1147)
const { createSymlink, createSymlinkSync } = __nccwpck_require__(5788)

module.exports = {
  // file
  createFile,
  createFileSync,
  ensureFile: createFile,
  ensureFileSync: createFileSync,
  // link
  createLink,
  createLinkSync,
  ensureLink: createLink,
  ensureLinkSync: createLinkSync,
  // symlink
  createSymlink,
  createSymlinkSync,
  ensureSymlink: createSymlink,
  ensureSymlinkSync: createSymlinkSync
}


/***/ }),

/***/ 1147:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const path = __nccwpck_require__(6928)
const fs = __nccwpck_require__(9238)
const mkdir = __nccwpck_require__(6813)
const { pathExists } = __nccwpck_require__(6949)
const { areIdentical } = __nccwpck_require__(699)

async function createLink (srcpath, dstpath) {
  let dstStat
  try {
    dstStat = await fs.lstat(dstpath, { bigint: true })
  } catch {
    // ignore error
  }

  let srcStat
  try {
    srcStat = await fs.lstat(srcpath, { bigint: true })
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink')
    throw err
  }

  if (dstStat && areIdentical(srcStat, dstStat)) return

  const dir = path.dirname(dstpath)

  const dirExists = await pathExists(dir)

  if (!dirExists) {
    await mkdir.mkdirs(dir)
  }

  await fs.link(srcpath, dstpath)
}

function createLinkSync (srcpath, dstpath) {
  let dstStat
  try {
    dstStat = fs.lstatSync(dstpath, { bigint: true })
  } catch {}

  try {
    const srcStat = fs.lstatSync(srcpath, { bigint: true })
    if (dstStat && areIdentical(srcStat, dstStat)) return
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink')
    throw err
  }

  const dir = path.dirname(dstpath)
  const dirExists = fs.existsSync(dir)
  if (dirExists) return fs.linkSync(srcpath, dstpath)
  mkdir.mkdirsSync(dir)

  return fs.linkSync(srcpath, dstpath)
}

module.exports = {
  createLink: u(createLink),
  createLinkSync
}


/***/ }),

/***/ 9933:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const path = __nccwpck_require__(6928)
const fs = __nccwpck_require__(9238)
const { pathExists } = __nccwpck_require__(6949)

const u = (__nccwpck_require__(2977).fromPromise)

/**
 * Function that returns two types of paths, one relative to symlink, and one
 * relative to the current working directory. Checks if path is absolute or
 * relative. If the path is relative, this function checks if the path is
 * relative to symlink or relative to current working directory. This is an
 * initiative to find a smarter `srcpath` to supply when building symlinks.
 * This allows you to determine which path to use out of one of three possible
 * types of source paths. The first is an absolute path. This is detected by
 * `path.isAbsolute()`. When an absolute path is provided, it is checked to
 * see if it exists. If it does it's used, if not an error is returned
 * (callback)/ thrown (sync). The other two options for `srcpath` are a
 * relative url. By default Node's `fs.symlink` works by creating a symlink
 * using `dstpath` and expects the `srcpath` to be relative to the newly
 * created symlink. If you provide a `srcpath` that does not exist on the file
 * system it results in a broken symlink. To minimize this, the function
 * checks to see if the 'relative to symlink' source file exists, and if it
 * does it will use it. If it does not, it checks if there's a file that
 * exists that is relative to the current working directory, if does its used.
 * This preserves the expectations of the original fs.symlink spec and adds
 * the ability to pass in `relative to current working direcotry` paths.
 */

async function symlinkPaths (srcpath, dstpath) {
  if (path.isAbsolute(srcpath)) {
    try {
      await fs.lstat(srcpath)
    } catch (err) {
      err.message = err.message.replace('lstat', 'ensureSymlink')
      throw err
    }

    return {
      toCwd: srcpath,
      toDst: srcpath
    }
  }

  const dstdir = path.dirname(dstpath)
  const relativeToDst = path.join(dstdir, srcpath)

  const exists = await pathExists(relativeToDst)
  if (exists) {
    return {
      toCwd: relativeToDst,
      toDst: srcpath
    }
  }

  try {
    await fs.lstat(srcpath)
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureSymlink')
    throw err
  }

  return {
    toCwd: srcpath,
    toDst: path.relative(dstdir, srcpath)
  }
}

function symlinkPathsSync (srcpath, dstpath) {
  if (path.isAbsolute(srcpath)) {
    const exists = fs.existsSync(srcpath)
    if (!exists) throw new Error('absolute srcpath does not exist')
    return {
      toCwd: srcpath,
      toDst: srcpath
    }
  }

  const dstdir = path.dirname(dstpath)
  const relativeToDst = path.join(dstdir, srcpath)
  const exists = fs.existsSync(relativeToDst)
  if (exists) {
    return {
      toCwd: relativeToDst,
      toDst: srcpath
    }
  }

  const srcExists = fs.existsSync(srcpath)
  if (!srcExists) throw new Error('relative srcpath does not exist')
  return {
    toCwd: srcpath,
    toDst: path.relative(dstdir, srcpath)
  }
}

module.exports = {
  symlinkPaths: u(symlinkPaths),
  symlinkPathsSync
}


/***/ }),

/***/ 7489:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(9238)
const u = (__nccwpck_require__(2977).fromPromise)

async function symlinkType (srcpath, type) {
  if (type) return type

  let stats
  try {
    stats = await fs.lstat(srcpath)
  } catch {
    return 'file'
  }

  return (stats && stats.isDirectory()) ? 'dir' : 'file'
}

function symlinkTypeSync (srcpath, type) {
  if (type) return type

  let stats
  try {
    stats = fs.lstatSync(srcpath)
  } catch {
    return 'file'
  }
  return (stats && stats.isDirectory()) ? 'dir' : 'file'
}

module.exports = {
  symlinkType: u(symlinkType),
  symlinkTypeSync
}


/***/ }),

/***/ 5788:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const path = __nccwpck_require__(6928)
const fs = __nccwpck_require__(9238)

const { mkdirs, mkdirsSync } = __nccwpck_require__(6813)

const { symlinkPaths, symlinkPathsSync } = __nccwpck_require__(9933)
const { symlinkType, symlinkTypeSync } = __nccwpck_require__(7489)

const { pathExists } = __nccwpck_require__(6949)

const { areIdentical } = __nccwpck_require__(699)

async function createSymlink (srcpath, dstpath, type) {
  let stats
  try {
    stats = await fs.lstat(dstpath)
  } catch { }

  if (stats && stats.isSymbolicLink()) {
    // When srcpath is relative, resolve it relative to dstpath's directory
    // (standard symlink behavior) or fall back to cwd if that doesn't exist
    let srcStat
    if (path.isAbsolute(srcpath)) {
      srcStat = await fs.stat(srcpath, { bigint: true })
    } else {
      const dstdir = path.dirname(dstpath)
      const relativeToDst = path.join(dstdir, srcpath)
      try {
        srcStat = await fs.stat(relativeToDst, { bigint: true })
      } catch {
        srcStat = await fs.stat(srcpath, { bigint: true })
      }
    }

    const dstStat = await fs.stat(dstpath, { bigint: true })
    if (areIdentical(srcStat, dstStat)) return
  }

  const relative = await symlinkPaths(srcpath, dstpath)
  srcpath = relative.toDst
  const toType = await symlinkType(relative.toCwd, type)
  const dir = path.dirname(dstpath)

  if (!(await pathExists(dir))) {
    await mkdirs(dir)
  }

  return fs.symlink(srcpath, dstpath, toType)
}

function createSymlinkSync (srcpath, dstpath, type) {
  let stats
  try {
    stats = fs.lstatSync(dstpath)
  } catch { }
  if (stats && stats.isSymbolicLink()) {
    // When srcpath is relative, resolve it relative to dstpath's directory
    // (standard symlink behavior) or fall back to cwd if that doesn't exist
    let srcStat
    if (path.isAbsolute(srcpath)) {
      srcStat = fs.statSync(srcpath, { bigint: true })
    } else {
      const dstdir = path.dirname(dstpath)
      const relativeToDst = path.join(dstdir, srcpath)
      try {
        srcStat = fs.statSync(relativeToDst, { bigint: true })
      } catch {
        srcStat = fs.statSync(srcpath, { bigint: true })
      }
    }

    const dstStat = fs.statSync(dstpath, { bigint: true })
    if (areIdentical(srcStat, dstStat)) return
  }

  const relative = symlinkPathsSync(srcpath, dstpath)
  srcpath = relative.toDst
  type = symlinkTypeSync(relative.toCwd, type)
  const dir = path.dirname(dstpath)
  const exists = fs.existsSync(dir)
  if (exists) return fs.symlinkSync(srcpath, dstpath, type)
  mkdirsSync(dir)
  return fs.symlinkSync(srcpath, dstpath, type)
}

module.exports = {
  createSymlink: u(createSymlink),
  createSymlinkSync
}


/***/ }),

/***/ 9238:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// This is adapted from https://github.com/normalize/mz
// Copyright (c) 2014-2016 Jonathan Ong me@jongleberry.com and Contributors
const u = (__nccwpck_require__(2977).fromCallback)
const fs = __nccwpck_require__(1404)

const api = [
  'access',
  'appendFile',
  'chmod',
  'chown',
  'close',
  'copyFile',
  'cp',
  'fchmod',
  'fchown',
  'fdatasync',
  'fstat',
  'fsync',
  'ftruncate',
  'futimes',
  'glob',
  'lchmod',
  'lchown',
  'lutimes',
  'link',
  'lstat',
  'mkdir',
  'mkdtemp',
  'open',
  'opendir',
  'readdir',
  'readFile',
  'readlink',
  'realpath',
  'rename',
  'rm',
  'rmdir',
  'stat',
  'statfs',
  'symlink',
  'truncate',
  'unlink',
  'utimes',
  'writeFile'
].filter(key => {
  // Some commands are not available on some systems. Ex:
  // fs.cp was added in Node.js v16.7.0
  // fs.statfs was added in Node v19.6.0, v18.15.0
  // fs.glob was added in Node.js v22.0.0
  // fs.lchown is not available on at least some Linux
  return typeof fs[key] === 'function'
})

// Export cloned fs:
Object.assign(exports, fs)

// Universalify async methods:
api.forEach(method => {
  exports[method] = u(fs[method])
})

// We differ from mz/fs in that we still ship the old, broken, fs.exists()
// since we are a drop-in replacement for the native module
exports.exists = function (filename, callback) {
  if (typeof callback === 'function') {
    return fs.exists(filename, callback)
  }
  return new Promise(resolve => {
    return fs.exists(filename, resolve)
  })
}

// fs.read(), fs.write(), fs.readv(), & fs.writev() need special treatment due to multiple callback args

exports.read = function (fd, buffer, offset, length, position, callback) {
  if (typeof callback === 'function') {
    return fs.read(fd, buffer, offset, length, position, callback)
  }
  return new Promise((resolve, reject) => {
    fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
      if (err) return reject(err)
      resolve({ bytesRead, buffer })
    })
  })
}

// Function signature can be
// fs.write(fd, buffer[, offset[, length[, position]]], callback)
// OR
// fs.write(fd, string[, position[, encoding]], callback)
// We need to handle both cases, so we use ...args
exports.write = function (fd, buffer, ...args) {
  if (typeof args[args.length - 1] === 'function') {
    return fs.write(fd, buffer, ...args)
  }

  return new Promise((resolve, reject) => {
    fs.write(fd, buffer, ...args, (err, bytesWritten, buffer) => {
      if (err) return reject(err)
      resolve({ bytesWritten, buffer })
    })
  })
}

// Function signature is
// s.readv(fd, buffers[, position], callback)
// We need to handle the optional arg, so we use ...args
exports.readv = function (fd, buffers, ...args) {
  if (typeof args[args.length - 1] === 'function') {
    return fs.readv(fd, buffers, ...args)
  }

  return new Promise((resolve, reject) => {
    fs.readv(fd, buffers, ...args, (err, bytesRead, buffers) => {
      if (err) return reject(err)
      resolve({ bytesRead, buffers })
    })
  })
}

// Function signature is
// s.writev(fd, buffers[, position], callback)
// We need to handle the optional arg, so we use ...args
exports.writev = function (fd, buffers, ...args) {
  if (typeof args[args.length - 1] === 'function') {
    return fs.writev(fd, buffers, ...args)
  }

  return new Promise((resolve, reject) => {
    fs.writev(fd, buffers, ...args, (err, bytesWritten, buffers) => {
      if (err) return reject(err)
      resolve({ bytesWritten, buffers })
    })
  })
}

// fs.realpath.native sometimes not available if fs is monkey-patched
if (typeof fs.realpath.native === 'function') {
  exports.realpath.native = u(fs.realpath.native)
} else {
  process.emitWarning(
    'fs.realpath.native is not a function. Is fs being monkey-patched?',
    'Warning', 'fs-extra-WARN0003'
  )
}


/***/ }),

/***/ 1348:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = {
  // Export promiseified graceful-fs:
  ...__nccwpck_require__(9238),
  // Export extra methods:
  ...__nccwpck_require__(424),
  ...__nccwpck_require__(198),
  ...__nccwpck_require__(4895),
  ...__nccwpck_require__(5219),
  ...__nccwpck_require__(6813),
  ...__nccwpck_require__(5256),
  ...__nccwpck_require__(5241),
  ...__nccwpck_require__(6949),
  ...__nccwpck_require__(3073)
}


/***/ }),

/***/ 5219:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const jsonFile = __nccwpck_require__(1891)

jsonFile.outputJson = u(__nccwpck_require__(7597))
jsonFile.outputJsonSync = __nccwpck_require__(6917)
// aliases
jsonFile.outputJSON = jsonFile.outputJson
jsonFile.outputJSONSync = jsonFile.outputJsonSync
jsonFile.writeJSON = jsonFile.writeJson
jsonFile.writeJSONSync = jsonFile.writeJsonSync
jsonFile.readJSON = jsonFile.readJson
jsonFile.readJSONSync = jsonFile.readJsonSync

module.exports = jsonFile


/***/ }),

/***/ 1891:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const jsonFile = __nccwpck_require__(3588)

module.exports = {
  // jsonfile exports
  readJson: jsonFile.readFile,
  readJsonSync: jsonFile.readFileSync,
  writeJson: jsonFile.writeFile,
  writeJsonSync: jsonFile.writeFileSync
}


/***/ }),

/***/ 6917:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { stringify } = __nccwpck_require__(8173)
const { outputFileSync } = __nccwpck_require__(5241)

function outputJsonSync (file, data, options) {
  const str = stringify(data, options)

  outputFileSync(file, str, options)
}

module.exports = outputJsonSync


/***/ }),

/***/ 7597:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { stringify } = __nccwpck_require__(8173)
const { outputFile } = __nccwpck_require__(5241)

async function outputJson (file, data, options = {}) {
  const str = stringify(data, options)

  await outputFile(file, str, options)
}

module.exports = outputJson


/***/ }),

/***/ 6813:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const u = (__nccwpck_require__(2977).fromPromise)
const { makeDir: _makeDir, makeDirSync } = __nccwpck_require__(6293)
const makeDir = u(_makeDir)

module.exports = {
  mkdirs: makeDir,
  mkdirsSync: makeDirSync,
  // alias
  mkdirp: makeDir,
  mkdirpSync: makeDirSync,
  ensureDir: makeDir,
  ensureDirSync: makeDirSync
}


/***/ }),

/***/ 6293:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const fs = __nccwpck_require__(9238)
const { checkPath } = __nccwpck_require__(7496)

const getMode = options => {
  const defaults = { mode: 0o777 }
  if (typeof options === 'number') return options
  return ({ ...defaults, ...options }).mode
}

module.exports.makeDir = async (dir, options) => {
  checkPath(dir)

  return fs.mkdir(dir, {
    mode: getMode(options),
    recursive: true
  })
}

module.exports.makeDirSync = (dir, options) => {
  checkPath(dir)

  return fs.mkdirSync(dir, {
    mode: getMode(options),
    recursive: true
  })
}


/***/ }),

/***/ 7496:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Adapted from https://github.com/sindresorhus/make-dir
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const path = __nccwpck_require__(6928)

// https://github.com/nodejs/node/issues/8987
// https://github.com/libuv/libuv/pull/1088
module.exports.checkPath = function checkPath (pth) {
  if (process.platform === 'win32') {
    const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path.parse(pth).root, ''))

    if (pathHasInvalidWinCharacters) {
      const error = new Error(`Path contains invalid characters: ${pth}`)
      error.code = 'EINVAL'
      throw error
    }
  }
}


/***/ }),

/***/ 5256:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
module.exports = {
  move: u(__nccwpck_require__(3219)),
  moveSync: __nccwpck_require__(1523)
}


/***/ }),

/***/ 1523:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1404)
const path = __nccwpck_require__(6928)
const copySync = (__nccwpck_require__(424).copySync)
const removeSync = (__nccwpck_require__(3073).removeSync)
const mkdirpSync = (__nccwpck_require__(6813).mkdirpSync)
const stat = __nccwpck_require__(699)

function moveSync (src, dest, opts) {
  opts = opts || {}
  const overwrite = opts.overwrite || opts.clobber || false

  const { srcStat, isChangingCase = false } = stat.checkPathsSync(src, dest, 'move', opts)
  stat.checkParentPathsSync(src, srcStat, dest, 'move')
  if (!isParentRoot(dest)) mkdirpSync(path.dirname(dest))
  return doRename(src, dest, overwrite, isChangingCase)
}

function isParentRoot (dest) {
  const parent = path.dirname(dest)
  const parsedPath = path.parse(parent)
  return parsedPath.root === parent
}

function doRename (src, dest, overwrite, isChangingCase) {
  if (isChangingCase) return rename(src, dest, overwrite)
  if (overwrite) {
    removeSync(dest)
    return rename(src, dest, overwrite)
  }
  if (fs.existsSync(dest)) throw new Error('dest already exists.')
  return rename(src, dest, overwrite)
}

function rename (src, dest, overwrite) {
  try {
    fs.renameSync(src, dest)
  } catch (err) {
    if (err.code !== 'EXDEV') throw err
    return moveAcrossDevice(src, dest, overwrite)
  }
}

function moveAcrossDevice (src, dest, overwrite) {
  const opts = {
    overwrite,
    errorOnExist: true,
    preserveTimestamps: true
  }
  copySync(src, dest, opts)
  return removeSync(src)
}

module.exports = moveSync


/***/ }),

/***/ 3219:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(9238)
const path = __nccwpck_require__(6928)
const { copy } = __nccwpck_require__(424)
const { remove } = __nccwpck_require__(3073)
const { mkdirp } = __nccwpck_require__(6813)
const { pathExists } = __nccwpck_require__(6949)
const stat = __nccwpck_require__(699)

async function move (src, dest, opts = {}) {
  const overwrite = opts.overwrite || opts.clobber || false

  const { srcStat, isChangingCase = false } = await stat.checkPaths(src, dest, 'move', opts)

  await stat.checkParentPaths(src, srcStat, dest, 'move')

  // If the parent of dest is not root, make sure it exists before proceeding
  const destParent = path.dirname(dest)
  const parsedParentPath = path.parse(destParent)
  if (parsedParentPath.root !== destParent) {
    await mkdirp(destParent)
  }

  return doRename(src, dest, overwrite, isChangingCase)
}

async function doRename (src, dest, overwrite, isChangingCase) {
  if (!isChangingCase) {
    if (overwrite) {
      await remove(dest)
    } else if (await pathExists(dest)) {
      throw new Error('dest already exists.')
    }
  }

  try {
    // Try w/ rename first, and try copy + remove if EXDEV
    await fs.rename(src, dest)
  } catch (err) {
    if (err.code !== 'EXDEV') {
      throw err
    }
    await moveAcrossDevice(src, dest, overwrite)
  }
}

async function moveAcrossDevice (src, dest, overwrite) {
  const opts = {
    overwrite,
    errorOnExist: true,
    preserveTimestamps: true
  }

  await copy(src, dest, opts)
  return remove(src)
}

module.exports = move


/***/ }),

/***/ 5241:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const fs = __nccwpck_require__(9238)
const path = __nccwpck_require__(6928)
const mkdir = __nccwpck_require__(6813)
const pathExists = (__nccwpck_require__(6949).pathExists)

async function outputFile (file, data, encoding = 'utf-8') {
  const dir = path.dirname(file)

  if (!(await pathExists(dir))) {
    await mkdir.mkdirs(dir)
  }

  return fs.writeFile(file, data, encoding)
}

function outputFileSync (file, ...args) {
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) {
    mkdir.mkdirsSync(dir)
  }

  fs.writeFileSync(file, ...args)
}

module.exports = {
  outputFile: u(outputFile),
  outputFileSync
}


/***/ }),

/***/ 6949:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const u = (__nccwpck_require__(2977).fromPromise)
const fs = __nccwpck_require__(9238)

function pathExists (path) {
  return fs.access(path).then(() => true).catch(() => false)
}

module.exports = {
  pathExists: u(pathExists),
  pathExistsSync: fs.existsSync
}


/***/ }),

/***/ 3073:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1404)
const u = (__nccwpck_require__(2977).fromCallback)

function remove (path, callback) {
  fs.rm(path, { recursive: true, force: true }, callback)
}

function removeSync (path) {
  fs.rmSync(path, { recursive: true, force: true })
}

module.exports = {
  remove: u(remove),
  removeSync
}


/***/ }),

/***/ 4645:
/***/ ((module) => {

"use strict";


// https://github.com/jprichardson/node-fs-extra/issues/1056
// Performing parallel operations on each item of an async iterator is
// surprisingly hard; you need to have handlers in place to avoid getting an
// UnhandledPromiseRejectionWarning.
// NOTE: This function does not presently handle return values, only errors
async function asyncIteratorConcurrentProcess (iterator, fn) {
  const promises = []
  for await (const item of iterator) {
    promises.push(
      fn(item).then(
        () => null,
        (err) => err ?? new Error('unknown error')
      )
    )
  }
  await Promise.all(
    promises.map((promise) =>
      promise.then((possibleErr) => {
        if (possibleErr !== null) throw possibleErr
      })
    )
  )
}

module.exports = {
  asyncIteratorConcurrentProcess
}


/***/ }),

/***/ 699:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(9238)
const path = __nccwpck_require__(6928)
const u = (__nccwpck_require__(2977).fromPromise)

function getStats (src, dest, opts) {
  const statFunc = opts.dereference
    ? (file) => fs.stat(file, { bigint: true })
    : (file) => fs.lstat(file, { bigint: true })
  return Promise.all([
    statFunc(src),
    statFunc(dest).catch(err => {
      if (err.code === 'ENOENT') return null
      throw err
    })
  ]).then(([srcStat, destStat]) => ({ srcStat, destStat }))
}

function getStatsSync (src, dest, opts) {
  let destStat
  const statFunc = opts.dereference
    ? (file) => fs.statSync(file, { bigint: true })
    : (file) => fs.lstatSync(file, { bigint: true })
  const srcStat = statFunc(src)
  try {
    destStat = statFunc(dest)
  } catch (err) {
    if (err.code === 'ENOENT') return { srcStat, destStat: null }
    throw err
  }
  return { srcStat, destStat }
}

async function checkPaths (src, dest, funcName, opts) {
  const { srcStat, destStat } = await getStats(src, dest, opts)
  if (destStat) {
    if (areIdentical(srcStat, destStat)) {
      const srcBaseName = path.basename(src)
      const destBaseName = path.basename(dest)
      if (funcName === 'move' &&
        srcBaseName !== destBaseName &&
        srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return { srcStat, destStat, isChangingCase: true }
      }
      throw new Error('Source and destination must not be the same.')
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`)
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`)
    }
  }

  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName))
  }

  return { srcStat, destStat }
}

function checkPathsSync (src, dest, funcName, opts) {
  const { srcStat, destStat } = getStatsSync(src, dest, opts)

  if (destStat) {
    if (areIdentical(srcStat, destStat)) {
      const srcBaseName = path.basename(src)
      const destBaseName = path.basename(dest)
      if (funcName === 'move' &&
        srcBaseName !== destBaseName &&
        srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return { srcStat, destStat, isChangingCase: true }
      }
      throw new Error('Source and destination must not be the same.')
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`)
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`)
    }
  }

  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return { srcStat, destStat }
}

// recursively check if dest parent is a subdirectory of src.
// It works for all file types including symlinks since it
// checks the src and dest inodes. It starts from the deepest
// parent and stops once it reaches the src parent or the root path.
async function checkParentPaths (src, srcStat, dest, funcName) {
  const srcParent = path.resolve(path.dirname(src))
  const destParent = path.resolve(path.dirname(dest))
  if (destParent === srcParent || destParent === path.parse(destParent).root) return

  let destStat
  try {
    destStat = await fs.stat(destParent, { bigint: true })
  } catch (err) {
    if (err.code === 'ENOENT') return
    throw err
  }

  if (areIdentical(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName))
  }

  return checkParentPaths(src, srcStat, destParent, funcName)
}

function checkParentPathsSync (src, srcStat, dest, funcName) {
  const srcParent = path.resolve(path.dirname(src))
  const destParent = path.resolve(path.dirname(dest))
  if (destParent === srcParent || destParent === path.parse(destParent).root) return
  let destStat
  try {
    destStat = fs.statSync(destParent, { bigint: true })
  } catch (err) {
    if (err.code === 'ENOENT') return
    throw err
  }
  if (areIdentical(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return checkParentPathsSync(src, srcStat, destParent, funcName)
}

function areIdentical (srcStat, destStat) {
  // stat.dev can be 0n on windows when node version >= 22.x.x
  return destStat.ino !== undefined && destStat.dev !== undefined && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev
}

// return true if dest is a subdir of src, otherwise false.
// It only checks the path strings.
function isSrcSubdir (src, dest) {
  const srcArr = path.resolve(src).split(path.sep).filter(i => i)
  const destArr = path.resolve(dest).split(path.sep).filter(i => i)
  return srcArr.every((cur, i) => destArr[i] === cur)
}

function errMsg (src, dest, funcName) {
  return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`
}

module.exports = {
  // checkPaths
  checkPaths: u(checkPaths),
  checkPathsSync,
  // checkParent
  checkParentPaths: u(checkParentPaths),
  checkParentPathsSync,
  // Misc
  isSrcSubdir,
  areIdentical
}


/***/ }),

/***/ 1226:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(9238)
const u = (__nccwpck_require__(2977).fromPromise)

async function utimesMillis (path, atime, mtime) {
  const fd = await fs.open(path, 'r+')

  let error = null

  try {
    await fs.futimes(fd, atime, mtime)
  } catch (futimesErr) {
    error = futimesErr
  } finally {
    try {
      await fs.close(fd)
    } catch (closeErr) {
      if (!error) error = closeErr
    }
  }

  if (error) {
    throw error
  }
}

function utimesMillisSync (path, atime, mtime) {
  const fd = fs.openSync(path, 'r+')

  let error = null

  try {
    fs.futimesSync(fd, atime, mtime)
  } catch (futimesErr) {
    error = futimesErr
  } finally {
    try {
      fs.closeSync(fd)
    } catch (closeErr) {
      if (!error) error = closeErr
    }
  }

  if (error) {
    throw error
  }
}

module.exports = {
  utimesMillis: u(utimesMillis),
  utimesMillisSync
}


/***/ }),

/***/ 7472:
/***/ ((module) => {

"use strict";


module.exports = clone

var getPrototypeOf = Object.getPrototypeOf || function (obj) {
  return obj.__proto__
}

function clone (obj) {
  if (obj === null || typeof obj !== 'object')
    return obj

  if (obj instanceof Object)
    var copy = { __proto__: getPrototypeOf(obj) }
  else
    var copy = Object.create(null)

  Object.getOwnPropertyNames(obj).forEach(function (key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key))
  })

  return copy
}


/***/ }),

/***/ 1404:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var fs = __nccwpck_require__(9896)
var polyfills = __nccwpck_require__(3545)
var legacy = __nccwpck_require__(2674)
var clone = __nccwpck_require__(7472)

var util = __nccwpck_require__(9023)

/* istanbul ignore next - node 0.x polyfill */
var gracefulQueue
var previousSymbol

/* istanbul ignore else - node 0.x polyfill */
if (typeof Symbol === 'function' && typeof Symbol.for === 'function') {
  gracefulQueue = Symbol.for('graceful-fs.queue')
  // This is used in testing by future versions
  previousSymbol = Symbol.for('graceful-fs.previous')
} else {
  gracefulQueue = '___graceful-fs.queue'
  previousSymbol = '___graceful-fs.previous'
}

function noop () {}

function publishQueue(context, queue) {
  Object.defineProperty(context, gracefulQueue, {
    get: function() {
      return queue
    }
  })
}

var debug = noop
if (util.debuglog)
  debug = util.debuglog('gfs4')
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
  debug = function() {
    var m = util.format.apply(util, arguments)
    m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ')
    console.error(m)
  }

// Once time initialization
if (!fs[gracefulQueue]) {
  // This queue can be shared by multiple loaded instances
  var queue = global[gracefulQueue] || []
  publishQueue(fs, queue)

  // Patch fs.close/closeSync to shared queue version, because we need
  // to retry() whenever a close happens *anywhere* in the program.
  // This is essential when multiple graceful-fs instances are
  // in play at the same time.
  fs.close = (function (fs$close) {
    function close (fd, cb) {
      return fs$close.call(fs, fd, function (err) {
        // This function uses the graceful-fs shared queue
        if (!err) {
          resetQueue()
        }

        if (typeof cb === 'function')
          cb.apply(this, arguments)
      })
    }

    Object.defineProperty(close, previousSymbol, {
      value: fs$close
    })
    return close
  })(fs.close)

  fs.closeSync = (function (fs$closeSync) {
    function closeSync (fd) {
      // This function uses the graceful-fs shared queue
      fs$closeSync.apply(fs, arguments)
      resetQueue()
    }

    Object.defineProperty(closeSync, previousSymbol, {
      value: fs$closeSync
    })
    return closeSync
  })(fs.closeSync)

  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
    process.on('exit', function() {
      debug(fs[gracefulQueue])
      __nccwpck_require__(2613).equal(fs[gracefulQueue].length, 0)
    })
  }
}

if (!global[gracefulQueue]) {
  publishQueue(global, fs[gracefulQueue]);
}

module.exports = patch(clone(fs))
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
    module.exports = patch(fs)
    fs.__patched = true;
}

function patch (fs) {
  // Everything that references the open() function needs to be in here
  polyfills(fs)
  fs.gracefulify = patch

  fs.createReadStream = createReadStream
  fs.createWriteStream = createWriteStream
  var fs$readFile = fs.readFile
  fs.readFile = readFile
  function readFile (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$readFile(path, options, cb)

    function go$readFile (path, options, cb, startTime) {
      return fs$readFile(path, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readFile, [path, options, cb], err, startTime || Date.now(), Date.now()])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
        }
      })
    }
  }

  var fs$writeFile = fs.writeFile
  fs.writeFile = writeFile
  function writeFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$writeFile(path, data, options, cb)

    function go$writeFile (path, data, options, cb, startTime) {
      return fs$writeFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$writeFile, [path, data, options, cb], err, startTime || Date.now(), Date.now()])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
        }
      })
    }
  }

  var fs$appendFile = fs.appendFile
  if (fs$appendFile)
    fs.appendFile = appendFile
  function appendFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$appendFile(path, data, options, cb)

    function go$appendFile (path, data, options, cb, startTime) {
      return fs$appendFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$appendFile, [path, data, options, cb], err, startTime || Date.now(), Date.now()])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
        }
      })
    }
  }

  var fs$copyFile = fs.copyFile
  if (fs$copyFile)
    fs.copyFile = copyFile
  function copyFile (src, dest, flags, cb) {
    if (typeof flags === 'function') {
      cb = flags
      flags = 0
    }
    return go$copyFile(src, dest, flags, cb)

    function go$copyFile (src, dest, flags, cb, startTime) {
      return fs$copyFile(src, dest, flags, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$copyFile, [src, dest, flags, cb], err, startTime || Date.now(), Date.now()])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
        }
      })
    }
  }

  var fs$readdir = fs.readdir
  fs.readdir = readdir
  var noReaddirOptionVersions = /^v[0-5]\./
  function readdir (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    var go$readdir = noReaddirOptionVersions.test(process.version)
      ? function go$readdir (path, options, cb, startTime) {
        return fs$readdir(path, fs$readdirCallback(
          path, options, cb, startTime
        ))
      }
      : function go$readdir (path, options, cb, startTime) {
        return fs$readdir(path, options, fs$readdirCallback(
          path, options, cb, startTime
        ))
      }

    return go$readdir(path, options, cb)

    function fs$readdirCallback (path, options, cb, startTime) {
      return function (err, files) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([
            go$readdir,
            [path, options, cb],
            err,
            startTime || Date.now(),
            Date.now()
          ])
        else {
          if (files && files.sort)
            files.sort()

          if (typeof cb === 'function')
            cb.call(this, err, files)
        }
      }
    }
  }

  if (process.version.substr(0, 4) === 'v0.8') {
    var legStreams = legacy(fs)
    ReadStream = legStreams.ReadStream
    WriteStream = legStreams.WriteStream
  }

  var fs$ReadStream = fs.ReadStream
  if (fs$ReadStream) {
    ReadStream.prototype = Object.create(fs$ReadStream.prototype)
    ReadStream.prototype.open = ReadStream$open
  }

  var fs$WriteStream = fs.WriteStream
  if (fs$WriteStream) {
    WriteStream.prototype = Object.create(fs$WriteStream.prototype)
    WriteStream.prototype.open = WriteStream$open
  }

  Object.defineProperty(fs, 'ReadStream', {
    get: function () {
      return ReadStream
    },
    set: function (val) {
      ReadStream = val
    },
    enumerable: true,
    configurable: true
  })
  Object.defineProperty(fs, 'WriteStream', {
    get: function () {
      return WriteStream
    },
    set: function (val) {
      WriteStream = val
    },
    enumerable: true,
    configurable: true
  })

  // legacy names
  var FileReadStream = ReadStream
  Object.defineProperty(fs, 'FileReadStream', {
    get: function () {
      return FileReadStream
    },
    set: function (val) {
      FileReadStream = val
    },
    enumerable: true,
    configurable: true
  })
  var FileWriteStream = WriteStream
  Object.defineProperty(fs, 'FileWriteStream', {
    get: function () {
      return FileWriteStream
    },
    set: function (val) {
      FileWriteStream = val
    },
    enumerable: true,
    configurable: true
  })

  function ReadStream (path, options) {
    if (this instanceof ReadStream)
      return fs$ReadStream.apply(this, arguments), this
    else
      return ReadStream.apply(Object.create(ReadStream.prototype), arguments)
  }

  function ReadStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        if (that.autoClose)
          that.destroy()

        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
        that.read()
      }
    })
  }

  function WriteStream (path, options) {
    if (this instanceof WriteStream)
      return fs$WriteStream.apply(this, arguments), this
    else
      return WriteStream.apply(Object.create(WriteStream.prototype), arguments)
  }

  function WriteStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        that.destroy()
        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
      }
    })
  }

  function createReadStream (path, options) {
    return new fs.ReadStream(path, options)
  }

  function createWriteStream (path, options) {
    return new fs.WriteStream(path, options)
  }

  var fs$open = fs.open
  fs.open = open
  function open (path, flags, mode, cb) {
    if (typeof mode === 'function')
      cb = mode, mode = null

    return go$open(path, flags, mode, cb)

    function go$open (path, flags, mode, cb, startTime) {
      return fs$open(path, flags, mode, function (err, fd) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$open, [path, flags, mode, cb], err, startTime || Date.now(), Date.now()])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
        }
      })
    }
  }

  return fs
}

function enqueue (elem) {
  debug('ENQUEUE', elem[0].name, elem[1])
  fs[gracefulQueue].push(elem)
  retry()
}

// keep track of the timeout between retry() calls
var retryTimer

// reset the startTime and lastTime to now
// this resets the start of the 60 second overall timeout as well as the
// delay between attempts so that we'll retry these jobs sooner
function resetQueue () {
  var now = Date.now()
  for (var i = 0; i < fs[gracefulQueue].length; ++i) {
    // entries that are only a length of 2 are from an older version, don't
    // bother modifying those since they'll be retried anyway.
    if (fs[gracefulQueue][i].length > 2) {
      fs[gracefulQueue][i][3] = now // startTime
      fs[gracefulQueue][i][4] = now // lastTime
    }
  }
  // call retry to make sure we're actively processing the queue
  retry()
}

function retry () {
  // clear the timer and remove it to help prevent unintended concurrency
  clearTimeout(retryTimer)
  retryTimer = undefined

  if (fs[gracefulQueue].length === 0)
    return

  var elem = fs[gracefulQueue].shift()
  var fn = elem[0]
  var args = elem[1]
  // these items may be unset if they were added by an older graceful-fs
  var err = elem[2]
  var startTime = elem[3]
  var lastTime = elem[4]

  // if we don't have a startTime we have no way of knowing if we've waited
  // long enough, so go ahead and retry this item now
  if (startTime === undefined) {
    debug('RETRY', fn.name, args)
    fn.apply(null, args)
  } else if (Date.now() - startTime >= 60000) {
    // it's been more than 60 seconds total, bail now
    debug('TIMEOUT', fn.name, args)
    var cb = args.pop()
    if (typeof cb === 'function')
      cb.call(null, err)
  } else {
    // the amount of time between the last attempt and right now
    var sinceAttempt = Date.now() - lastTime
    // the amount of time between when we first tried, and when we last tried
    // rounded up to at least 1
    var sinceStart = Math.max(lastTime - startTime, 1)
    // backoff. wait longer than the total time we've been retrying, but only
    // up to a maximum of 100ms
    var desiredDelay = Math.min(sinceStart * 1.2, 100)
    // it's been long enough since the last retry, do it again
    if (sinceAttempt >= desiredDelay) {
      debug('RETRY', fn.name, args)
      fn.apply(null, args.concat([startTime]))
    } else {
      // if we can't do this job yet, push it to the end of the queue
      // and let the next iteration check again
      fs[gracefulQueue].push(elem)
    }
  }

  // schedule our next run if one isn't already scheduled
  if (retryTimer === undefined) {
    retryTimer = setTimeout(retry, 0)
  }
}


/***/ }),

/***/ 2674:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var Stream = (__nccwpck_require__(2203).Stream)

module.exports = legacy

function legacy (fs) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  }

  function ReadStream (path, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path, options);

    Stream.call(this);

    var self = this;

    this.path = path;
    this.fd = null;
    this.readable = true;
    this.paused = false;

    this.flags = 'r';
    this.mode = 438; /*=0666*/
    this.bufferSize = 64 * 1024;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.encoding) this.setEncoding(this.encoding);

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }

      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }

      this.pos = this.start;
    }

    if (this.fd !== null) {
      process.nextTick(function() {
        self._read();
      });
      return;
    }

    fs.open(this.path, this.flags, this.mode, function (err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }

      self.fd = fd;
      self.emit('open', fd);
      self._read();
    })
  }

  function WriteStream (path, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path, options);

    Stream.call(this);

    this.path = path;
    this.fd = null;
    this.writable = true;

    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438; /*=0666*/
    this.bytesWritten = 0;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }

      this.pos = this.start;
    }

    this.busy = false;
    this._queue = [];

    if (this.fd === null) {
      this._open = fs.open;
      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
      this.flush();
    }
  }
}


/***/ }),

/***/ 3545:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var constants = __nccwpck_require__(9140)

var origCwd = process.cwd
var cwd = null

var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform

process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process)
  return cwd
}
try {
  process.cwd()
} catch (er) {}

// This check is needed until node.js 12 is required
if (typeof process.chdir === 'function') {
  var chdir = process.chdir
  process.chdir = function (d) {
    cwd = null
    chdir.call(process, d)
  }
  if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir)
}

module.exports = patch

function patch (fs) {
  // (re-)implement some things that are known busted or missing.

  // lchmod, broken prior to 0.6.2
  // back-port the fix here.
  if (constants.hasOwnProperty('O_SYMLINK') &&
      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs)
  }

  // lutimes implementation, or no-op
  if (!fs.lutimes) {
    patchLutimes(fs)
  }

  // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.

  fs.chown = chownFix(fs.chown)
  fs.fchown = chownFix(fs.fchown)
  fs.lchown = chownFix(fs.lchown)

  fs.chmod = chmodFix(fs.chmod)
  fs.fchmod = chmodFix(fs.fchmod)
  fs.lchmod = chmodFix(fs.lchmod)

  fs.chownSync = chownFixSync(fs.chownSync)
  fs.fchownSync = chownFixSync(fs.fchownSync)
  fs.lchownSync = chownFixSync(fs.lchownSync)

  fs.chmodSync = chmodFixSync(fs.chmodSync)
  fs.fchmodSync = chmodFixSync(fs.fchmodSync)
  fs.lchmodSync = chmodFixSync(fs.lchmodSync)

  fs.stat = statFix(fs.stat)
  fs.fstat = statFix(fs.fstat)
  fs.lstat = statFix(fs.lstat)

  fs.statSync = statFixSync(fs.statSync)
  fs.fstatSync = statFixSync(fs.fstatSync)
  fs.lstatSync = statFixSync(fs.lstatSync)

  // if lchmod/lchown do not exist, then make them no-ops
  if (fs.chmod && !fs.lchmod) {
    fs.lchmod = function (path, mode, cb) {
      if (cb) process.nextTick(cb)
    }
    fs.lchmodSync = function () {}
  }
  if (fs.chown && !fs.lchown) {
    fs.lchown = function (path, uid, gid, cb) {
      if (cb) process.nextTick(cb)
    }
    fs.lchownSync = function () {}
  }

  // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 60 seconds.

  // Set the timeout this long because some Windows Anti-Virus, such as Parity
  // bit9, may lock files for up to a minute, causing npm package install
  // failures. Also, take care to yield the scheduler. Windows scheduling gives
  // CPU to a busy looping process, which can cause the program causing the lock
  // contention to be starved of CPU by node, so the contention doesn't resolve.
  if (platform === "win32") {
    fs.rename = typeof fs.rename !== 'function' ? fs.rename
    : (function (fs$rename) {
      function rename (from, to, cb) {
        var start = Date.now()
        var backoff = 0;
        fs$rename(from, to, function CB (er) {
          if (er
              && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY")
              && Date.now() - start < 60000) {
            setTimeout(function() {
              fs.stat(to, function (stater, st) {
                if (stater && stater.code === "ENOENT")
                  fs$rename(from, to, CB);
                else
                  cb(er)
              })
            }, backoff)
            if (backoff < 100)
              backoff += 10;
            return;
          }
          if (cb) cb(er)
        })
      }
      if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename)
      return rename
    })(fs.rename)
  }

  // if read() returns EAGAIN, then just try it again.
  fs.read = typeof fs.read !== 'function' ? fs.read
  : (function (fs$read) {
    function read (fd, buffer, offset, length, position, callback_) {
      var callback
      if (callback_ && typeof callback_ === 'function') {
        var eagCounter = 0
        callback = function (er, _, __) {
          if (er && er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter ++
            return fs$read.call(fs, fd, buffer, offset, length, position, callback)
          }
          callback_.apply(this, arguments)
        }
      }
      return fs$read.call(fs, fd, buffer, offset, length, position, callback)
    }

    // This ensures `util.promisify` works as it does for native `fs.read`.
    if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read)
    return read
  })(fs.read)

  fs.readSync = typeof fs.readSync !== 'function' ? fs.readSync
  : (function (fs$readSync) { return function (fd, buffer, offset, length, position) {
    var eagCounter = 0
    while (true) {
      try {
        return fs$readSync.call(fs, fd, buffer, offset, length, position)
      } catch (er) {
        if (er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++
          continue
        }
        throw er
      }
    }
  }})(fs.readSync)

  function patchLchmod (fs) {
    fs.lchmod = function (path, mode, callback) {
      fs.open( path
             , constants.O_WRONLY | constants.O_SYMLINK
             , mode
             , function (err, fd) {
        if (err) {
          if (callback) callback(err)
          return
        }
        // prefer to return the chmod error, if one occurs,
        // but still try to close, and report closing errors if they occur.
        fs.fchmod(fd, mode, function (err) {
          fs.close(fd, function(err2) {
            if (callback) callback(err || err2)
          })
        })
      })
    }

    fs.lchmodSync = function (path, mode) {
      var fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode)

      // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.
      var threw = true
      var ret
      try {
        ret = fs.fchmodSync(fd, mode)
        threw = false
      } finally {
        if (threw) {
          try {
            fs.closeSync(fd)
          } catch (er) {}
        } else {
          fs.closeSync(fd)
        }
      }
      return ret
    }
  }

  function patchLutimes (fs) {
    if (constants.hasOwnProperty("O_SYMLINK") && fs.futimes) {
      fs.lutimes = function (path, at, mt, cb) {
        fs.open(path, constants.O_SYMLINK, function (er, fd) {
          if (er) {
            if (cb) cb(er)
            return
          }
          fs.futimes(fd, at, mt, function (er) {
            fs.close(fd, function (er2) {
              if (cb) cb(er || er2)
            })
          })
        })
      }

      fs.lutimesSync = function (path, at, mt) {
        var fd = fs.openSync(path, constants.O_SYMLINK)
        var ret
        var threw = true
        try {
          ret = fs.futimesSync(fd, at, mt)
          threw = false
        } finally {
          if (threw) {
            try {
              fs.closeSync(fd)
            } catch (er) {}
          } else {
            fs.closeSync(fd)
          }
        }
        return ret
      }

    } else if (fs.futimes) {
      fs.lutimes = function (_a, _b, _c, cb) { if (cb) process.nextTick(cb) }
      fs.lutimesSync = function () {}
    }
  }

  function chmodFix (orig) {
    if (!orig) return orig
    return function (target, mode, cb) {
      return orig.call(fs, target, mode, function (er) {
        if (chownErOk(er)) er = null
        if (cb) cb.apply(this, arguments)
      })
    }
  }

  function chmodFixSync (orig) {
    if (!orig) return orig
    return function (target, mode) {
      try {
        return orig.call(fs, target, mode)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }


  function chownFix (orig) {
    if (!orig) return orig
    return function (target, uid, gid, cb) {
      return orig.call(fs, target, uid, gid, function (er) {
        if (chownErOk(er)) er = null
        if (cb) cb.apply(this, arguments)
      })
    }
  }

  function chownFixSync (orig) {
    if (!orig) return orig
    return function (target, uid, gid) {
      try {
        return orig.call(fs, target, uid, gid)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }

  function statFix (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options, cb) {
      if (typeof options === 'function') {
        cb = options
        options = null
      }
      function callback (er, stats) {
        if (stats) {
          if (stats.uid < 0) stats.uid += 0x100000000
          if (stats.gid < 0) stats.gid += 0x100000000
        }
        if (cb) cb.apply(this, arguments)
      }
      return options ? orig.call(fs, target, options, callback)
        : orig.call(fs, target, callback)
    }
  }

  function statFixSync (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options) {
      var stats = options ? orig.call(fs, target, options)
        : orig.call(fs, target)
      if (stats) {
        if (stats.uid < 0) stats.uid += 0x100000000
        if (stats.gid < 0) stats.gid += 0x100000000
      }
      return stats;
    }
  }

  // ENOSYS means that the fs doesn't support the op. Just ignore
  // that, because it doesn't matter.
  //
  // if there's no getuid, or if getuid() is something other
  // than 0, and the error is EINVAL or EPERM, then just ignore
  // it.
  //
  // This specific case is a silent failure in cp, install, tar,
  // and most other unix tools that manage permissions.
  //
  // When running as root, or if other types of errors are
  // encountered, then it's strict.
  function chownErOk (er) {
    if (!er)
      return true

    if (er.code === "ENOSYS")
      return true

    var nonroot = !process.getuid || process.getuid() !== 0
    if (nonroot) {
      if (er.code === "EINVAL" || er.code === "EPERM")
        return true
    }

    return false
  }
}


/***/ }),

/***/ 9473:
/***/ ((module) => {

"use strict";


module.exports = (flag, argv = process.argv) => {
	const prefix = flag.startsWith('-') ? '' : (flag.length === 1 ? '-' : '--');
	const position = argv.indexOf(prefix + flag);
	const terminatorPosition = argv.indexOf('--');
	return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
};


/***/ }),

/***/ 3588:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

let _fs
try {
  _fs = __nccwpck_require__(1404)
} catch (_) {
  _fs = __nccwpck_require__(9896)
}
const universalify = __nccwpck_require__(2977)
const { stringify, stripBom } = __nccwpck_require__(8173)

async function _readFile (file, options = {}) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }

  const fs = options.fs || _fs

  const shouldThrow = 'throws' in options ? options.throws : true

  let data = await universalify.fromCallback(fs.readFile)(file, options)

  data = stripBom(data)

  let obj
  try {
    obj = JSON.parse(data, options ? options.reviver : null)
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`
      throw err
    } else {
      return null
    }
  }

  return obj
}

const readFile = universalify.fromPromise(_readFile)

function readFileSync (file, options = {}) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }

  const fs = options.fs || _fs

  const shouldThrow = 'throws' in options ? options.throws : true

  try {
    let content = fs.readFileSync(file, options)
    content = stripBom(content)
    return JSON.parse(content, options.reviver)
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`
      throw err
    } else {
      return null
    }
  }
}

async function _writeFile (file, obj, options = {}) {
  const fs = options.fs || _fs

  const str = stringify(obj, options)

  await universalify.fromCallback(fs.writeFile)(file, str, options)
}

const writeFile = universalify.fromPromise(_writeFile)

function writeFileSync (file, obj, options = {}) {
  const fs = options.fs || _fs

  const str = stringify(obj, options)
  // not sure if fs.writeFileSync returns anything, but just in case
  return fs.writeFileSync(file, str, options)
}

// NOTE: do not change this export format; required for ESM compat
// see https://github.com/jprichardson/node-jsonfile/pull/162 for details
module.exports = {
  readFile,
  readFileSync,
  writeFile,
  writeFileSync
}


/***/ }),

/***/ 8173:
/***/ ((module) => {

function stringify (obj, { EOL = '\n', finalEOL = true, replacer = null, spaces } = {}) {
  const EOF = finalEOL ? EOL : ''
  const str = JSON.stringify(obj, replacer, spaces)

  if (str === undefined) {
    throw new TypeError(`Converting ${typeof obj} value to JSON is not supported`)
  }

  return str.replace(/\n/g, EOL) + EOF
}

function stripBom (content) {
  // we do this because JSON.parse would convert it to a utf8 string if encoding wasn't specified
  if (Buffer.isBuffer(content)) content = content.toString('utf8')
  return content.replace(/^\uFEFF/, '')
}

module.exports = { stringify, stripBom }


/***/ }),

/***/ 6401:
/***/ ((module) => {

"use strict";


const { FORCE_COLOR, NODE_DISABLE_COLORS, TERM } = process.env;

const $ = {
	enabled: !NODE_DISABLE_COLORS && TERM !== 'dumb' && FORCE_COLOR !== '0',

	// modifiers
	reset: init(0, 0),
	bold: init(1, 22),
	dim: init(2, 22),
	italic: init(3, 23),
	underline: init(4, 24),
	inverse: init(7, 27),
	hidden: init(8, 28),
	strikethrough: init(9, 29),

	// colors
	black: init(30, 39),
	red: init(31, 39),
	green: init(32, 39),
	yellow: init(33, 39),
	blue: init(34, 39),
	magenta: init(35, 39),
	cyan: init(36, 39),
	white: init(37, 39),
	gray: init(90, 39),
	grey: init(90, 39),

	// background colors
	bgBlack: init(40, 49),
	bgRed: init(41, 49),
	bgGreen: init(42, 49),
	bgYellow: init(43, 49),
	bgBlue: init(44, 49),
	bgMagenta: init(45, 49),
	bgCyan: init(46, 49),
	bgWhite: init(47, 49)
};

function run(arr, str) {
	let i=0, tmp, beg='', end='';
	for (; i < arr.length; i++) {
		tmp = arr[i];
		beg += tmp.open;
		end += tmp.close;
		if (str.includes(tmp.close)) {
			str = str.replace(tmp.rgx, tmp.close + tmp.open);
		}
	}
	return beg + str + end;
}

function chain(has, keys) {
	let ctx = { has, keys };

	ctx.reset = $.reset.bind(ctx);
	ctx.bold = $.bold.bind(ctx);
	ctx.dim = $.dim.bind(ctx);
	ctx.italic = $.italic.bind(ctx);
	ctx.underline = $.underline.bind(ctx);
	ctx.inverse = $.inverse.bind(ctx);
	ctx.hidden = $.hidden.bind(ctx);
	ctx.strikethrough = $.strikethrough.bind(ctx);

	ctx.black = $.black.bind(ctx);
	ctx.red = $.red.bind(ctx);
	ctx.green = $.green.bind(ctx);
	ctx.yellow = $.yellow.bind(ctx);
	ctx.blue = $.blue.bind(ctx);
	ctx.magenta = $.magenta.bind(ctx);
	ctx.cyan = $.cyan.bind(ctx);
	ctx.white = $.white.bind(ctx);
	ctx.gray = $.gray.bind(ctx);
	ctx.grey = $.grey.bind(ctx);

	ctx.bgBlack = $.bgBlack.bind(ctx);
	ctx.bgRed = $.bgRed.bind(ctx);
	ctx.bgGreen = $.bgGreen.bind(ctx);
	ctx.bgYellow = $.bgYellow.bind(ctx);
	ctx.bgBlue = $.bgBlue.bind(ctx);
	ctx.bgMagenta = $.bgMagenta.bind(ctx);
	ctx.bgCyan = $.bgCyan.bind(ctx);
	ctx.bgWhite = $.bgWhite.bind(ctx);

	return ctx;
}

function init(open, close) {
	let blk = {
		open: `\x1b[${open}m`,
		close: `\x1b[${close}m`,
		rgx: new RegExp(`\\x1b\\[${close}m`, 'g')
	};
	return function (txt) {
		if (this !== void 0 && this.has !== void 0) {
			this.has.includes(open) || (this.has.push(open),this.keys.push(blk));
			return txt === void 0 ? this : $.enabled ? run(this.keys, txt+'') : txt+'';
		}
		return txt === void 0 ? chain([open], [blk]) : $.enabled ? run([blk], txt+'') : txt+'';
	};
}

module.exports = $;


/***/ }),

/***/ 1220:
/***/ ((module) => {

"use strict";


class DatePart {
  constructor({
    token,
    date,
    parts,
    locales
  }) {
    this.token = token;
    this.date = date || new Date();
    this.parts = parts || [this];
    this.locales = locales || {};
  }

  up() {}

  down() {}

  next() {
    const currentIdx = this.parts.indexOf(this);
    return this.parts.find((part, idx) => idx > currentIdx && part instanceof DatePart);
  }

  setTo(val) {}

  prev() {
    let parts = [].concat(this.parts).reverse();
    const currentIdx = parts.indexOf(this);
    return parts.find((part, idx) => idx > currentIdx && part instanceof DatePart);
  }

  toString() {
    return String(this.date);
  }

}

module.exports = DatePart;

/***/ }),

/***/ 6919:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(1220);

const pos = n => {
  n = n % 10;
  return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
};

class Day extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setDate(this.date.getDate() + 1);
  }

  down() {
    this.date.setDate(this.date.getDate() - 1);
  }

  setTo(val) {
    this.date.setDate(parseInt(val.substr(-2)));
  }

  toString() {
    let date = this.date.getDate();
    let day = this.date.getDay();
    return this.token === 'DD' ? String(date).padStart(2, '0') : this.token === 'Do' ? date + pos(date) : this.token === 'd' ? day + 1 : this.token === 'ddd' ? this.locales.weekdaysShort[day] : this.token === 'dddd' ? this.locales.weekdays[day] : date;
  }

}

module.exports = Day;

/***/ }),

/***/ 7474:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(1220);

class Hours extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setHours(this.date.getHours() + 1);
  }

  down() {
    this.date.setHours(this.date.getHours() - 1);
  }

  setTo(val) {
    this.date.setHours(parseInt(val.substr(-2)));
  }

  toString() {
    let hours = this.date.getHours();
    if (/h/.test(this.token)) hours = hours % 12 || 12;
    return this.token.length > 1 ? String(hours).padStart(2, '0') : hours;
  }

}

module.exports = Hours;

/***/ }),

/***/ 4889:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = {
  DatePart: __nccwpck_require__(1220),
  Meridiem: __nccwpck_require__(3675),
  Day: __nccwpck_require__(6919),
  Hours: __nccwpck_require__(7474),
  Milliseconds: __nccwpck_require__(8635),
  Minutes: __nccwpck_require__(8756),
  Month: __nccwpck_require__(8363),
  Seconds: __nccwpck_require__(7940),
  Year: __nccwpck_require__(9340)
};

/***/ }),

/***/ 3675:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(1220);

class Meridiem extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setHours((this.date.getHours() + 12) % 24);
  }

  down() {
    this.up();
  }

  toString() {
    let meridiem = this.date.getHours() > 12 ? 'pm' : 'am';
    return /\A/.test(this.token) ? meridiem.toUpperCase() : meridiem;
  }

}

module.exports = Meridiem;

/***/ }),

/***/ 8635:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(1220);

class Milliseconds extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setMilliseconds(this.date.getMilliseconds() + 1);
  }

  down() {
    this.date.setMilliseconds(this.date.getMilliseconds() - 1);
  }

  setTo(val) {
    this.date.setMilliseconds(parseInt(val.substr(-this.token.length)));
  }

  toString() {
    return String(this.date.getMilliseconds()).padStart(4, '0').substr(0, this.token.length);
  }

}

module.exports = Milliseconds;

/***/ }),

/***/ 8756:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(1220);

class Minutes extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setMinutes(this.date.getMinutes() + 1);
  }

  down() {
    this.date.setMinutes(this.date.getMinutes() - 1);
  }

  setTo(val) {
    this.date.setMinutes(parseInt(val.substr(-2)));
  }

  toString() {
    let m = this.date.getMinutes();
    return this.token.length > 1 ? String(m).padStart(2, '0') : m;
  }

}

module.exports = Minutes;

/***/ }),

/***/ 8363:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(1220);

class Month extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setMonth(this.date.getMonth() + 1);
  }

  down() {
    this.date.setMonth(this.date.getMonth() - 1);
  }

  setTo(val) {
    val = parseInt(val.substr(-2)) - 1;
    this.date.setMonth(val < 0 ? 0 : val);
  }

  toString() {
    let month = this.date.getMonth();
    let tl = this.token.length;
    return tl === 2 ? String(month + 1).padStart(2, '0') : tl === 3 ? this.locales.monthsShort[month] : tl === 4 ? this.locales.months[month] : String(month + 1);
  }

}

module.exports = Month;

/***/ }),

/***/ 7940:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(1220);

class Seconds extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setSeconds(this.date.getSeconds() + 1);
  }

  down() {
    this.date.setSeconds(this.date.getSeconds() - 1);
  }

  setTo(val) {
    this.date.setSeconds(parseInt(val.substr(-2)));
  }

  toString() {
    let s = this.date.getSeconds();
    return this.token.length > 1 ? String(s).padStart(2, '0') : s;
  }

}

module.exports = Seconds;

/***/ }),

/***/ 9340:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(1220);

class Year extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setFullYear(this.date.getFullYear() + 1);
  }

  down() {
    this.date.setFullYear(this.date.getFullYear() - 1);
  }

  setTo(val) {
    this.date.setFullYear(val.substr(-4));
  }

  toString() {
    let year = String(this.date.getFullYear()).padStart(4, '0');
    return this.token.length === 2 ? year.substr(-2) : year;
  }

}

module.exports = Year;

/***/ }),

/***/ 2050:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const color = __nccwpck_require__(6401);

const Prompt = __nccwpck_require__(7332);

const _require = __nccwpck_require__(9798),
      erase = _require.erase,
      cursor = _require.cursor;

const _require2 = __nccwpck_require__(8985),
      style = _require2.style,
      clear = _require2.clear,
      figures = _require2.figures,
      wrap = _require2.wrap,
      entriesToDisplay = _require2.entriesToDisplay;

const getVal = (arr, i) => arr[i] && (arr[i].value || arr[i].title || arr[i]);

const getTitle = (arr, i) => arr[i] && (arr[i].title || arr[i].value || arr[i]);

const getIndex = (arr, valOrTitle) => {
  const index = arr.findIndex(el => el.value === valOrTitle || el.title === valOrTitle);
  return index > -1 ? index : undefined;
};
/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of auto-complete choices objects
 * @param {Function} [opts.suggest] Filter function. Defaults to sort by title
 * @param {Number} [opts.limit=10] Max number of results to show
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.fallback] Fallback message - initial to default value
 * @param {String} [opts.initial] Index of the default value
 * @param {Boolean} [opts.clearFirst] The first ESCAPE keypress will clear the input
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.noMatches] The no matches found label
 */


class AutocompletePrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.suggest = opts.suggest;
    this.choices = opts.choices;
    this.initial = typeof opts.initial === 'number' ? opts.initial : getIndex(opts.choices, opts.initial);
    this.select = this.initial || opts.cursor || 0;
    this.i18n = {
      noMatches: opts.noMatches || 'no matches found'
    };
    this.fallback = opts.fallback || this.initial;
    this.clearFirst = opts.clearFirst || false;
    this.suggestions = [];
    this.input = '';
    this.limit = opts.limit || 10;
    this.cursor = 0;
    this.transform = style.render(opts.style);
    this.scale = this.transform.scale;
    this.render = this.render.bind(this);
    this.complete = this.complete.bind(this);
    this.clear = clear('', this.out.columns);
    this.complete(this.render);
    this.render();
  }

  set fallback(fb) {
    this._fb = Number.isSafeInteger(parseInt(fb)) ? parseInt(fb) : fb;
  }

  get fallback() {
    let choice;
    if (typeof this._fb === 'number') choice = this.choices[this._fb];else if (typeof this._fb === 'string') choice = {
      title: this._fb
    };
    return choice || this._fb || {
      title: this.i18n.noMatches
    };
  }

  moveSelect(i) {
    this.select = i;
    if (this.suggestions.length > 0) this.value = getVal(this.suggestions, i);else this.value = this.fallback.value;
    this.fire();
  }

  complete(cb) {
    var _this = this;

    return _asyncToGenerator(function* () {
      const p = _this.completing = _this.suggest(_this.input, _this.choices);

      const suggestions = yield p;
      if (_this.completing !== p) return;
      _this.suggestions = suggestions.map((s, i, arr) => ({
        title: getTitle(arr, i),
        value: getVal(arr, i),
        description: s.description
      }));
      _this.completing = false;
      const l = Math.max(suggestions.length - 1, 0);

      _this.moveSelect(Math.min(l, _this.select));

      cb && cb();
    })();
  }

  reset() {
    this.input = '';
    this.complete(() => {
      this.moveSelect(this.initial !== void 0 ? this.initial : 0);
      this.render();
    });
    this.render();
  }

  exit() {
    if (this.clearFirst && this.input.length > 0) {
      this.reset();
    } else {
      this.done = this.exited = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    }
  }

  abort() {
    this.done = this.aborted = true;
    this.exited = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.done = true;
    this.aborted = this.exited = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  _(c, key) {
    let s1 = this.input.slice(0, this.cursor);
    let s2 = this.input.slice(this.cursor);
    this.input = `${s1}${c}${s2}`;
    this.cursor = s1.length + 1;
    this.complete(this.render);
    this.render();
  }

  delete() {
    if (this.cursor === 0) return this.bell();
    let s1 = this.input.slice(0, this.cursor - 1);
    let s2 = this.input.slice(this.cursor);
    this.input = `${s1}${s2}`;
    this.complete(this.render);
    this.cursor = this.cursor - 1;
    this.render();
  }

  deleteForward() {
    if (this.cursor * this.scale >= this.rendered.length) return this.bell();
    let s1 = this.input.slice(0, this.cursor);
    let s2 = this.input.slice(this.cursor + 1);
    this.input = `${s1}${s2}`;
    this.complete(this.render);
    this.render();
  }

  first() {
    this.moveSelect(0);
    this.render();
  }

  last() {
    this.moveSelect(this.suggestions.length - 1);
    this.render();
  }

  up() {
    if (this.select === 0) {
      this.moveSelect(this.suggestions.length - 1);
    } else {
      this.moveSelect(this.select - 1);
    }

    this.render();
  }

  down() {
    if (this.select === this.suggestions.length - 1) {
      this.moveSelect(0);
    } else {
      this.moveSelect(this.select + 1);
    }

    this.render();
  }

  next() {
    if (this.select === this.suggestions.length - 1) {
      this.moveSelect(0);
    } else this.moveSelect(this.select + 1);

    this.render();
  }

  nextPage() {
    this.moveSelect(Math.min(this.select + this.limit, this.suggestions.length - 1));
    this.render();
  }

  prevPage() {
    this.moveSelect(Math.max(this.select - this.limit, 0));
    this.render();
  }

  left() {
    if (this.cursor <= 0) return this.bell();
    this.cursor = this.cursor - 1;
    this.render();
  }

  right() {
    if (this.cursor * this.scale >= this.rendered.length) return this.bell();
    this.cursor = this.cursor + 1;
    this.render();
  }

  renderOption(v, hovered, isStart, isEnd) {
    let desc;
    let prefix = isStart ? figures.arrowUp : isEnd ? figures.arrowDown : ' ';
    let title = hovered ? color.cyan().underline(v.title) : v.title;
    prefix = (hovered ? color.cyan(figures.pointer) + ' ' : '  ') + prefix;

    if (v.description) {
      desc = ` - ${v.description}`;

      if (prefix.length + title.length + desc.length >= this.out.columns || v.description.split(/\r?\n/).length > 1) {
        desc = '\n' + wrap(v.description, {
          margin: 3,
          width: this.out.columns
        });
      }
    }

    return prefix + ' ' + title + color.gray(desc || '');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    let _entriesToDisplay = entriesToDisplay(this.select, this.choices.length, this.limit),
        startIndex = _entriesToDisplay.startIndex,
        endIndex = _entriesToDisplay.endIndex;

    this.outputText = [style.symbol(this.done, this.aborted, this.exited), color.bold(this.msg), style.delimiter(this.completing), this.done && this.suggestions[this.select] ? this.suggestions[this.select].title : this.rendered = this.transform.render(this.input)].join(' ');

    if (!this.done) {
      const suggestions = this.suggestions.slice(startIndex, endIndex).map((item, i) => this.renderOption(item, this.select === i + startIndex, i === 0 && startIndex > 0, i + startIndex === endIndex - 1 && endIndex < this.choices.length)).join('\n');
      this.outputText += `\n` + (suggestions || color.gray(this.fallback.title));
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }

}

module.exports = AutocompletePrompt;

/***/ }),

/***/ 7081:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const color = __nccwpck_require__(6401);

const _require = __nccwpck_require__(9798),
      cursor = _require.cursor;

const MultiselectPrompt = __nccwpck_require__(8065);

const _require2 = __nccwpck_require__(8985),
      clear = _require2.clear,
      style = _require2.style,
      figures = _require2.figures;
/**
 * MultiselectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {String} [opts.warn] Hint shown for disabled choices
 * @param {Number} [opts.max] Max choices
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */


class AutocompleteMultiselectPrompt extends MultiselectPrompt {
  constructor(opts = {}) {
    opts.overrideRender = true;
    super(opts);
    this.inputValue = '';
    this.clear = clear('', this.out.columns);
    this.filteredOptions = this.value;
    this.render();
  }

  last() {
    this.cursor = this.filteredOptions.length - 1;
    this.render();
  }

  next() {
    this.cursor = (this.cursor + 1) % this.filteredOptions.length;
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.cursor = this.filteredOptions.length - 1;
    } else {
      this.cursor--;
    }

    this.render();
  }

  down() {
    if (this.cursor === this.filteredOptions.length - 1) {
      this.cursor = 0;
    } else {
      this.cursor++;
    }

    this.render();
  }

  left() {
    this.filteredOptions[this.cursor].selected = false;
    this.render();
  }

  right() {
    if (this.value.filter(e => e.selected).length >= this.maxChoices) return this.bell();
    this.filteredOptions[this.cursor].selected = true;
    this.render();
  }

  delete() {
    if (this.inputValue.length) {
      this.inputValue = this.inputValue.substr(0, this.inputValue.length - 1);
      this.updateFilteredOptions();
    }
  }

  updateFilteredOptions() {
    const currentHighlight = this.filteredOptions[this.cursor];
    this.filteredOptions = this.value.filter(v => {
      if (this.inputValue) {
        if (typeof v.title === 'string') {
          if (v.title.toLowerCase().includes(this.inputValue.toLowerCase())) {
            return true;
          }
        }

        if (typeof v.value === 'string') {
          if (v.value.toLowerCase().includes(this.inputValue.toLowerCase())) {
            return true;
          }
        }

        return false;
      }

      return true;
    });
    const newHighlightIndex = this.filteredOptions.findIndex(v => v === currentHighlight);
    this.cursor = newHighlightIndex < 0 ? 0 : newHighlightIndex;
    this.render();
  }

  handleSpaceToggle() {
    const v = this.filteredOptions[this.cursor];

    if (v.selected) {
      v.selected = false;
      this.render();
    } else if (v.disabled || this.value.filter(e => e.selected).length >= this.maxChoices) {
      return this.bell();
    } else {
      v.selected = true;
      this.render();
    }
  }

  handleInputChange(c) {
    this.inputValue = this.inputValue + c;
    this.updateFilteredOptions();
  }

  _(c, key) {
    if (c === ' ') {
      this.handleSpaceToggle();
    } else {
      this.handleInputChange(c);
    }
  }

  renderInstructions() {
    if (this.instructions === undefined || this.instructions) {
      if (typeof this.instructions === 'string') {
        return this.instructions;
      }

      return `
Instructions:
    ${figures.arrowUp}/${figures.arrowDown}: Highlight option
    ${figures.arrowLeft}/${figures.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
`;
    }

    return '';
  }

  renderCurrentInput() {
    return `
Filtered results for: ${this.inputValue ? this.inputValue : color.gray('Enter something to filter')}\n`;
  }

  renderOption(cursor, v, i) {
    let title;
    if (v.disabled) title = cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);else title = cursor === i ? color.cyan().underline(v.title) : v.title;
    return (v.selected ? color.green(figures.radioOn) : figures.radioOff) + '  ' + title;
  }

  renderDoneOrInstructions() {
    if (this.done) {
      return this.value.filter(e => e.selected).map(v => v.title).join(', ');
    }

    const output = [color.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];

    if (this.filteredOptions.length && this.filteredOptions[this.cursor].disabled) {
      output.push(color.yellow(this.warn));
    }

    return output.join(' ');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    super.render(); // print prompt

    let prompt = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(false), this.renderDoneOrInstructions()].join(' ');

    if (this.showMinError) {
      prompt += color.red(`You must select a minimum of ${this.minSelected} choices.`);
      this.showMinError = false;
    }

    prompt += this.renderOptions(this.filteredOptions);
    this.out.write(this.clear + prompt);
    this.clear = clear(prompt, this.out.columns);
  }

}

module.exports = AutocompleteMultiselectPrompt;

/***/ }),

/***/ 6352:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const color = __nccwpck_require__(6401);

const Prompt = __nccwpck_require__(7332);

const _require = __nccwpck_require__(8985),
      style = _require.style,
      clear = _require.clear;

const _require2 = __nccwpck_require__(9798),
      erase = _require2.erase,
      cursor = _require2.cursor;
/**
 * ConfirmPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Boolean} [opts.initial] Default value (true/false)
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.yes] The "Yes" label
 * @param {String} [opts.yesOption] The "Yes" option when choosing between yes/no
 * @param {String} [opts.no] The "No" label
 * @param {String} [opts.noOption] The "No" option when choosing between yes/no
 */


class ConfirmPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.value = opts.initial;
    this.initialValue = !!opts.initial;
    this.yesMsg = opts.yes || 'yes';
    this.yesOption = opts.yesOption || '(Y/n)';
    this.noMsg = opts.no || 'no';
    this.noOption = opts.noOption || '(y/N)';
    this.render();
  }

  reset() {
    this.value = this.initialValue;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.value = this.value || false;
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  _(c, key) {
    if (c.toLowerCase() === 'y') {
      this.value = true;
      return this.submit();
    }

    if (c.toLowerCase() === 'n') {
      this.value = false;
      return this.submit();
    }

    return this.bell();
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);else this.out.write(clear(this.outputText, this.out.columns));
    super.render();
    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(this.done), this.done ? this.value ? this.yesMsg : this.noMsg : color.gray(this.initialValue ? this.yesOption : this.noOption)].join(' ');
    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }

}

module.exports = ConfirmPrompt;

/***/ }),

/***/ 8614:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const color = __nccwpck_require__(6401);

const Prompt = __nccwpck_require__(7332);

const _require = __nccwpck_require__(8985),
      style = _require.style,
      clear = _require.clear,
      figures = _require.figures;

const _require2 = __nccwpck_require__(9798),
      erase = _require2.erase,
      cursor = _require2.cursor;

const _require3 = __nccwpck_require__(4889),
      DatePart = _require3.DatePart,
      Meridiem = _require3.Meridiem,
      Day = _require3.Day,
      Hours = _require3.Hours,
      Milliseconds = _require3.Milliseconds,
      Minutes = _require3.Minutes,
      Month = _require3.Month,
      Seconds = _require3.Seconds,
      Year = _require3.Year;

const regex = /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g;
const regexGroups = {
  1: ({
    token
  }) => token.replace(/\\(.)/g, '$1'),
  2: opts => new Day(opts),
  // Day // TODO
  3: opts => new Month(opts),
  // Month
  4: opts => new Year(opts),
  // Year
  5: opts => new Meridiem(opts),
  // AM/PM // TODO (special)
  6: opts => new Hours(opts),
  // Hours
  7: opts => new Minutes(opts),
  // Minutes
  8: opts => new Seconds(opts),
  // Seconds
  9: opts => new Milliseconds(opts) // Fractional seconds

};
const dfltLocales = {
  months: 'January,February,March,April,May,June,July,August,September,October,November,December'.split(','),
  monthsShort: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(','),
  weekdays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(','),
  weekdaysShort: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'.split(',')
};
/**
 * DatePrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Number} [opts.initial] Index of default value
 * @param {String} [opts.mask] The format mask
 * @param {object} [opts.locales] The date locales
 * @param {String} [opts.error] The error message shown on invalid value
 * @param {Function} [opts.validate] Function to validate the submitted value
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */

class DatePrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.cursor = 0;
    this.typed = '';
    this.locales = Object.assign(dfltLocales, opts.locales);
    this._date = opts.initial || new Date();
    this.errorMsg = opts.error || 'Please Enter A Valid Value';

    this.validator = opts.validate || (() => true);

    this.mask = opts.mask || 'YYYY-MM-DD HH:mm:ss';
    this.clear = clear('', this.out.columns);
    this.render();
  }

  get value() {
    return this.date;
  }

  get date() {
    return this._date;
  }

  set date(date) {
    if (date) this._date.setTime(date.getTime());
  }

  set mask(mask) {
    let result;
    this.parts = [];

    while (result = regex.exec(mask)) {
      let match = result.shift();
      let idx = result.findIndex(gr => gr != null);
      this.parts.push(idx in regexGroups ? regexGroups[idx]({
        token: result[idx] || match,
        date: this.date,
        parts: this.parts,
        locales: this.locales
      }) : result[idx] || match);
    }

    let parts = this.parts.reduce((arr, i) => {
      if (typeof i === 'string' && typeof arr[arr.length - 1] === 'string') arr[arr.length - 1] += i;else arr.push(i);
      return arr;
    }, []);
    this.parts.splice(0);
    this.parts.push(...parts);
    this.reset();
  }

  moveCursor(n) {
    this.typed = '';
    this.cursor = n;
    this.fire();
  }

  reset() {
    this.moveCursor(this.parts.findIndex(p => p instanceof DatePart));
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.error = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  validate() {
    var _this = this;

    return _asyncToGenerator(function* () {
      let valid = yield _this.validator(_this.value);

      if (typeof valid === 'string') {
        _this.errorMsg = valid;
        valid = false;
      }

      _this.error = !valid;
    })();
  }

  submit() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      yield _this2.validate();

      if (_this2.error) {
        _this2.color = 'red';

        _this2.fire();

        _this2.render();

        return;
      }

      _this2.done = true;
      _this2.aborted = false;

      _this2.fire();

      _this2.render();

      _this2.out.write('\n');

      _this2.close();
    })();
  }

  up() {
    this.typed = '';
    this.parts[this.cursor].up();
    this.render();
  }

  down() {
    this.typed = '';
    this.parts[this.cursor].down();
    this.render();
  }

  left() {
    let prev = this.parts[this.cursor].prev();
    if (prev == null) return this.bell();
    this.moveCursor(this.parts.indexOf(prev));
    this.render();
  }

  right() {
    let next = this.parts[this.cursor].next();
    if (next == null) return this.bell();
    this.moveCursor(this.parts.indexOf(next));
    this.render();
  }

  next() {
    let next = this.parts[this.cursor].next();
    this.moveCursor(next ? this.parts.indexOf(next) : this.parts.findIndex(part => part instanceof DatePart));
    this.render();
  }

  _(c) {
    if (/\d/.test(c)) {
      this.typed += c;
      this.parts[this.cursor].setTo(this.typed);
      this.render();
    }
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);else this.out.write(clear(this.outputText, this.out.columns));
    super.render(); // Print prompt

    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(false), this.parts.reduce((arr, p, idx) => arr.concat(idx === this.cursor && !this.done ? color.cyan().underline(p.toString()) : p), []).join('')].join(' '); // Print error

    if (this.error) {
      this.outputText += this.errorMsg.split('\n').reduce((a, l, i) => a + `\n${i ? ` ` : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }

}

module.exports = DatePrompt;

/***/ }),

/***/ 7444:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = {
  TextPrompt: __nccwpck_require__(8717),
  SelectPrompt: __nccwpck_require__(4850),
  TogglePrompt: __nccwpck_require__(7994),
  DatePrompt: __nccwpck_require__(8614),
  NumberPrompt: __nccwpck_require__(5651),
  MultiselectPrompt: __nccwpck_require__(8065),
  AutocompletePrompt: __nccwpck_require__(2050),
  AutocompleteMultiselectPrompt: __nccwpck_require__(7081),
  ConfirmPrompt: __nccwpck_require__(6352)
};

/***/ }),

/***/ 8065:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const color = __nccwpck_require__(6401);

const _require = __nccwpck_require__(9798),
      cursor = _require.cursor;

const Prompt = __nccwpck_require__(7332);

const _require2 = __nccwpck_require__(8985),
      clear = _require2.clear,
      figures = _require2.figures,
      style = _require2.style,
      wrap = _require2.wrap,
      entriesToDisplay = _require2.entriesToDisplay;
/**
 * MultiselectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {String} [opts.warn] Hint shown for disabled choices
 * @param {Number} [opts.max] Max choices
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {Number} [opts.optionsPerPage=10] Max options to display at once
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */


class MultiselectPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.cursor = opts.cursor || 0;
    this.scrollIndex = opts.cursor || 0;
    this.hint = opts.hint || '';
    this.warn = opts.warn || '- This option is disabled -';
    this.minSelected = opts.min;
    this.showMinError = false;
    this.maxChoices = opts.max;
    this.instructions = opts.instructions;
    this.optionsPerPage = opts.optionsPerPage || 10;
    this.value = opts.choices.map((ch, idx) => {
      if (typeof ch === 'string') ch = {
        title: ch,
        value: idx
      };
      return {
        title: ch && (ch.title || ch.value || ch),
        description: ch && ch.description,
        value: ch && (ch.value === undefined ? idx : ch.value),
        selected: ch && ch.selected,
        disabled: ch && ch.disabled
      };
    });
    this.clear = clear('', this.out.columns);

    if (!opts.overrideRender) {
      this.render();
    }
  }

  reset() {
    this.value.map(v => !v.selected);
    this.cursor = 0;
    this.fire();
    this.render();
  }

  selected() {
    return this.value.filter(v => v.selected);
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    const selected = this.value.filter(e => e.selected);

    if (this.minSelected && selected.length < this.minSelected) {
      this.showMinError = true;
      this.render();
    } else {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    }
  }

  first() {
    this.cursor = 0;
    this.render();
  }

  last() {
    this.cursor = this.value.length - 1;
    this.render();
  }

  next() {
    this.cursor = (this.cursor + 1) % this.value.length;
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.cursor = this.value.length - 1;
    } else {
      this.cursor--;
    }

    this.render();
  }

  down() {
    if (this.cursor === this.value.length - 1) {
      this.cursor = 0;
    } else {
      this.cursor++;
    }

    this.render();
  }

  left() {
    this.value[this.cursor].selected = false;
    this.render();
  }

  right() {
    if (this.value.filter(e => e.selected).length >= this.maxChoices) return this.bell();
    this.value[this.cursor].selected = true;
    this.render();
  }

  handleSpaceToggle() {
    const v = this.value[this.cursor];

    if (v.selected) {
      v.selected = false;
      this.render();
    } else if (v.disabled || this.value.filter(e => e.selected).length >= this.maxChoices) {
      return this.bell();
    } else {
      v.selected = true;
      this.render();
    }
  }

  toggleAll() {
    if (this.maxChoices !== undefined || this.value[this.cursor].disabled) {
      return this.bell();
    }

    const newSelected = !this.value[this.cursor].selected;
    this.value.filter(v => !v.disabled).forEach(v => v.selected = newSelected);
    this.render();
  }

  _(c, key) {
    if (c === ' ') {
      this.handleSpaceToggle();
    } else if (c === 'a') {
      this.toggleAll();
    } else {
      return this.bell();
    }
  }

  renderInstructions() {
    if (this.instructions === undefined || this.instructions) {
      if (typeof this.instructions === 'string') {
        return this.instructions;
      }

      return '\nInstructions:\n' + `    ${figures.arrowUp}/${figures.arrowDown}: Highlight option\n` + `    ${figures.arrowLeft}/${figures.arrowRight}/[space]: Toggle selection\n` + (this.maxChoices === undefined ? `    a: Toggle all\n` : '') + `    enter/return: Complete answer`;
    }

    return '';
  }

  renderOption(cursor, v, i, arrowIndicator) {
    const prefix = (v.selected ? color.green(figures.radioOn) : figures.radioOff) + ' ' + arrowIndicator + ' ';
    let title, desc;

    if (v.disabled) {
      title = cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);
    } else {
      title = cursor === i ? color.cyan().underline(v.title) : v.title;

      if (cursor === i && v.description) {
        desc = ` - ${v.description}`;

        if (prefix.length + title.length + desc.length >= this.out.columns || v.description.split(/\r?\n/).length > 1) {
          desc = '\n' + wrap(v.description, {
            margin: prefix.length,
            width: this.out.columns
          });
        }
      }
    }

    return prefix + title + color.gray(desc || '');
  } // shared with autocompleteMultiselect


  paginateOptions(options) {
    if (options.length === 0) {
      return color.red('No matches for this query.');
    }

    let _entriesToDisplay = entriesToDisplay(this.cursor, options.length, this.optionsPerPage),
        startIndex = _entriesToDisplay.startIndex,
        endIndex = _entriesToDisplay.endIndex;

    let prefix,
        styledOptions = [];

    for (let i = startIndex; i < endIndex; i++) {
      if (i === startIndex && startIndex > 0) {
        prefix = figures.arrowUp;
      } else if (i === endIndex - 1 && endIndex < options.length) {
        prefix = figures.arrowDown;
      } else {
        prefix = ' ';
      }

      styledOptions.push(this.renderOption(this.cursor, options[i], i, prefix));
    }

    return '\n' + styledOptions.join('\n');
  } // shared with autocomleteMultiselect


  renderOptions(options) {
    if (!this.done) {
      return this.paginateOptions(options);
    }

    return '';
  }

  renderDoneOrInstructions() {
    if (this.done) {
      return this.value.filter(e => e.selected).map(v => v.title).join(', ');
    }

    const output = [color.gray(this.hint), this.renderInstructions()];

    if (this.value[this.cursor].disabled) {
      output.push(color.yellow(this.warn));
    }

    return output.join(' ');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    super.render(); // print prompt

    let prompt = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(false), this.renderDoneOrInstructions()].join(' ');

    if (this.showMinError) {
      prompt += color.red(`You must select a minimum of ${this.minSelected} choices.`);
      this.showMinError = false;
    }

    prompt += this.renderOptions(this.value);
    this.out.write(this.clear + prompt);
    this.clear = clear(prompt, this.out.columns);
  }

}

module.exports = MultiselectPrompt;

/***/ }),

/***/ 5651:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const color = __nccwpck_require__(6401);

const Prompt = __nccwpck_require__(7332);

const _require = __nccwpck_require__(9798),
      cursor = _require.cursor,
      erase = _require.erase;

const _require2 = __nccwpck_require__(8985),
      style = _require2.style,
      figures = _require2.figures,
      clear = _require2.clear,
      lines = _require2.lines;

const isNumber = /[0-9]/;

const isDef = any => any !== undefined;

const round = (number, precision) => {
  let factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
};
/**
 * NumberPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {Number} [opts.initial] Default value
 * @param {Number} [opts.max=+Infinity] Max value
 * @param {Number} [opts.min=-Infinity] Min value
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {Function} [opts.validate] Validate function
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.error] The invalid error label
 */


class NumberPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.transform = style.render(opts.style);
    this.msg = opts.message;
    this.initial = isDef(opts.initial) ? opts.initial : '';
    this.float = !!opts.float;
    this.round = opts.round || 2;
    this.inc = opts.increment || 1;
    this.min = isDef(opts.min) ? opts.min : -Infinity;
    this.max = isDef(opts.max) ? opts.max : Infinity;
    this.errorMsg = opts.error || `Please Enter A Valid Value`;

    this.validator = opts.validate || (() => true);

    this.color = `cyan`;
    this.value = ``;
    this.typed = ``;
    this.lastHit = 0;
    this.render();
  }

  set value(v) {
    if (!v && v !== 0) {
      this.placeholder = true;
      this.rendered = color.gray(this.transform.render(`${this.initial}`));
      this._value = ``;
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(`${round(v, this.round)}`);
      this._value = round(v, this.round);
    }

    this.fire();
  }

  get value() {
    return this._value;
  }

  parse(x) {
    return this.float ? parseFloat(x) : parseInt(x);
  }

  valid(c) {
    return c === `-` || c === `.` && this.float || isNumber.test(c);
  }

  reset() {
    this.typed = ``;
    this.value = ``;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    let x = this.value;
    this.value = x !== `` ? x : this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.fire();
    this.render();
    this.out.write(`\n`);
    this.close();
  }

  validate() {
    var _this = this;

    return _asyncToGenerator(function* () {
      let valid = yield _this.validator(_this.value);

      if (typeof valid === `string`) {
        _this.errorMsg = valid;
        valid = false;
      }

      _this.error = !valid;
    })();
  }

  submit() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      yield _this2.validate();

      if (_this2.error) {
        _this2.color = `red`;

        _this2.fire();

        _this2.render();

        return;
      }

      let x = _this2.value;
      _this2.value = x !== `` ? x : _this2.initial;
      _this2.done = true;
      _this2.aborted = false;
      _this2.error = false;

      _this2.fire();

      _this2.render();

      _this2.out.write(`\n`);

      _this2.close();
    })();
  }

  up() {
    this.typed = ``;

    if (this.value === '') {
      this.value = this.min - this.inc;
    }

    if (this.value >= this.max) return this.bell();
    this.value += this.inc;
    this.color = `cyan`;
    this.fire();
    this.render();
  }

  down() {
    this.typed = ``;

    if (this.value === '') {
      this.value = this.min + this.inc;
    }

    if (this.value <= this.min) return this.bell();
    this.value -= this.inc;
    this.color = `cyan`;
    this.fire();
    this.render();
  }

  delete() {
    let val = this.value.toString();
    if (val.length === 0) return this.bell();
    this.value = this.parse(val = val.slice(0, -1)) || ``;

    if (this.value !== '' && this.value < this.min) {
      this.value = this.min;
    }

    this.color = `cyan`;
    this.fire();
    this.render();
  }

  next() {
    this.value = this.initial;
    this.fire();
    this.render();
  }

  _(c, key) {
    if (!this.valid(c)) return this.bell();
    const now = Date.now();
    if (now - this.lastHit > 1000) this.typed = ``; // 1s elapsed

    this.typed += c;
    this.lastHit = now;
    this.color = `cyan`;
    if (c === `.`) return this.fire();
    this.value = Math.min(this.parse(this.typed), this.max);
    if (this.value > this.max) this.value = this.max;
    if (this.value < this.min) this.value = this.min;
    this.fire();
    this.render();
  }

  render() {
    if (this.closed) return;

    if (!this.firstRender) {
      if (this.outputError) this.out.write(cursor.down(lines(this.outputError, this.out.columns) - 1) + clear(this.outputError, this.out.columns));
      this.out.write(clear(this.outputText, this.out.columns));
    }

    super.render();
    this.outputError = ''; // Print prompt

    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(this.done), !this.done || !this.done && !this.placeholder ? color[this.color]().underline(this.rendered) : this.rendered].join(` `); // Print error

    if (this.error) {
      this.outputError += this.errorMsg.split(`\n`).reduce((a, l, i) => a + `\n${i ? ` ` : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText + cursor.save + this.outputError + cursor.restore);
  }

}

module.exports = NumberPrompt;

/***/ }),

/***/ 7332:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const readline = __nccwpck_require__(3785);

const _require = __nccwpck_require__(8985),
      action = _require.action;

const EventEmitter = __nccwpck_require__(4434);

const _require2 = __nccwpck_require__(9798),
      beep = _require2.beep,
      cursor = _require2.cursor;

const color = __nccwpck_require__(6401);
/**
 * Base prompt skeleton
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */


class Prompt extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.firstRender = true;
    this.in = opts.stdin || process.stdin;
    this.out = opts.stdout || process.stdout;

    this.onRender = (opts.onRender || (() => void 0)).bind(this);

    const rl = readline.createInterface({
      input: this.in,
      escapeCodeTimeout: 50
    });
    readline.emitKeypressEvents(this.in, rl);
    if (this.in.isTTY) this.in.setRawMode(true);
    const isSelect = ['SelectPrompt', 'MultiselectPrompt'].indexOf(this.constructor.name) > -1;

    const keypress = (str, key) => {
      let a = action(key, isSelect);

      if (a === false) {
        this._ && this._(str, key);
      } else if (typeof this[a] === 'function') {
        this[a](key);
      } else {
        this.bell();
      }
    };

    this.close = () => {
      this.out.write(cursor.show);
      this.in.removeListener('keypress', keypress);
      if (this.in.isTTY) this.in.setRawMode(false);
      rl.close();
      this.emit(this.aborted ? 'abort' : this.exited ? 'exit' : 'submit', this.value);
      this.closed = true;
    };

    this.in.on('keypress', keypress);
  }

  fire() {
    this.emit('state', {
      value: this.value,
      aborted: !!this.aborted,
      exited: !!this.exited
    });
  }

  bell() {
    this.out.write(beep);
  }

  render() {
    this.onRender(color);
    if (this.firstRender) this.firstRender = false;
  }

}

module.exports = Prompt;

/***/ }),

/***/ 4850:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const color = __nccwpck_require__(6401);

const Prompt = __nccwpck_require__(7332);

const _require = __nccwpck_require__(8985),
      style = _require.style,
      clear = _require.clear,
      figures = _require.figures,
      wrap = _require.wrap,
      entriesToDisplay = _require.entriesToDisplay;

const _require2 = __nccwpck_require__(9798),
      cursor = _require2.cursor;
/**
 * SelectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {Number} [opts.initial] Index of default value
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {Number} [opts.optionsPerPage=10] Max options to display at once
 */


class SelectPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.hint = opts.hint || '- Use arrow-keys. Return to submit.';
    this.warn = opts.warn || '- This option is disabled';
    this.cursor = opts.initial || 0;
    this.choices = opts.choices.map((ch, idx) => {
      if (typeof ch === 'string') ch = {
        title: ch,
        value: idx
      };
      return {
        title: ch && (ch.title || ch.value || ch),
        value: ch && (ch.value === undefined ? idx : ch.value),
        description: ch && ch.description,
        selected: ch && ch.selected,
        disabled: ch && ch.disabled
      };
    });
    this.optionsPerPage = opts.optionsPerPage || 10;
    this.value = (this.choices[this.cursor] || {}).value;
    this.clear = clear('', this.out.columns);
    this.render();
  }

  moveCursor(n) {
    this.cursor = n;
    this.value = this.choices[n].value;
    this.fire();
  }

  reset() {
    this.moveCursor(0);
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    if (!this.selection.disabled) {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    } else this.bell();
  }

  first() {
    this.moveCursor(0);
    this.render();
  }

  last() {
    this.moveCursor(this.choices.length - 1);
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.moveCursor(this.choices.length - 1);
    } else {
      this.moveCursor(this.cursor - 1);
    }

    this.render();
  }

  down() {
    if (this.cursor === this.choices.length - 1) {
      this.moveCursor(0);
    } else {
      this.moveCursor(this.cursor + 1);
    }

    this.render();
  }

  next() {
    this.moveCursor((this.cursor + 1) % this.choices.length);
    this.render();
  }

  _(c, key) {
    if (c === ' ') return this.submit();
  }

  get selection() {
    return this.choices[this.cursor];
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    let _entriesToDisplay = entriesToDisplay(this.cursor, this.choices.length, this.optionsPerPage),
        startIndex = _entriesToDisplay.startIndex,
        endIndex = _entriesToDisplay.endIndex; // Print prompt


    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(false), this.done ? this.selection.title : this.selection.disabled ? color.yellow(this.warn) : color.gray(this.hint)].join(' '); // Print choices

    if (!this.done) {
      this.outputText += '\n';

      for (let i = startIndex; i < endIndex; i++) {
        let title,
            prefix,
            desc = '',
            v = this.choices[i]; // Determine whether to display "more choices" indicators

        if (i === startIndex && startIndex > 0) {
          prefix = figures.arrowUp;
        } else if (i === endIndex - 1 && endIndex < this.choices.length) {
          prefix = figures.arrowDown;
        } else {
          prefix = ' ';
        }

        if (v.disabled) {
          title = this.cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);
          prefix = (this.cursor === i ? color.bold().gray(figures.pointer) + ' ' : '  ') + prefix;
        } else {
          title = this.cursor === i ? color.cyan().underline(v.title) : v.title;
          prefix = (this.cursor === i ? color.cyan(figures.pointer) + ' ' : '  ') + prefix;

          if (v.description && this.cursor === i) {
            desc = ` - ${v.description}`;

            if (prefix.length + title.length + desc.length >= this.out.columns || v.description.split(/\r?\n/).length > 1) {
              desc = '\n' + wrap(v.description, {
                margin: 3,
                width: this.out.columns
              });
            }
          }
        }

        this.outputText += `${prefix} ${title}${color.gray(desc)}\n`;
      }
    }

    this.out.write(this.outputText);
  }

}

module.exports = SelectPrompt;

/***/ }),

/***/ 8717:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const color = __nccwpck_require__(6401);

const Prompt = __nccwpck_require__(7332);

const _require = __nccwpck_require__(9798),
      erase = _require.erase,
      cursor = _require.cursor;

const _require2 = __nccwpck_require__(8985),
      style = _require2.style,
      clear = _require2.clear,
      lines = _require2.lines,
      figures = _require2.figures;
/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.initial] Default value
 * @param {Function} [opts.validate] Validate function
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.error] The invalid error label
 */


class TextPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.transform = style.render(opts.style);
    this.scale = this.transform.scale;
    this.msg = opts.message;
    this.initial = opts.initial || ``;

    this.validator = opts.validate || (() => true);

    this.value = ``;
    this.errorMsg = opts.error || `Please Enter A Valid Value`;
    this.cursor = Number(!!this.initial);
    this.cursorOffset = 0;
    this.clear = clear(``, this.out.columns);
    this.render();
  }

  set value(v) {
    if (!v && this.initial) {
      this.placeholder = true;
      this.rendered = color.gray(this.transform.render(this.initial));
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(v);
    }

    this._value = v;
    this.fire();
  }

  get value() {
    return this._value;
  }

  reset() {
    this.value = ``;
    this.cursor = Number(!!this.initial);
    this.cursorOffset = 0;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.value = this.value || this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.red = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  validate() {
    var _this = this;

    return _asyncToGenerator(function* () {
      let valid = yield _this.validator(_this.value);

      if (typeof valid === `string`) {
        _this.errorMsg = valid;
        valid = false;
      }

      _this.error = !valid;
    })();
  }

  submit() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      _this2.value = _this2.value || _this2.initial;
      _this2.cursorOffset = 0;
      _this2.cursor = _this2.rendered.length;
      yield _this2.validate();

      if (_this2.error) {
        _this2.red = true;

        _this2.fire();

        _this2.render();

        return;
      }

      _this2.done = true;
      _this2.aborted = false;

      _this2.fire();

      _this2.render();

      _this2.out.write('\n');

      _this2.close();
    })();
  }

  next() {
    if (!this.placeholder) return this.bell();
    this.value = this.initial;
    this.cursor = this.rendered.length;
    this.fire();
    this.render();
  }

  moveCursor(n) {
    if (this.placeholder) return;
    this.cursor = this.cursor + n;
    this.cursorOffset += n;
  }

  _(c, key) {
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${c}${s2}`;
    this.red = false;
    this.cursor = this.placeholder ? 0 : s1.length + 1;
    this.render();
  }

  delete() {
    if (this.isCursorAtStart()) return this.bell();
    let s1 = this.value.slice(0, this.cursor - 1);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${s2}`;
    this.red = false;

    if (this.isCursorAtStart()) {
      this.cursorOffset = 0;
    } else {
      this.cursorOffset++;
      this.moveCursor(-1);
    }

    this.render();
  }

  deleteForward() {
    if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor + 1);
    this.value = `${s1}${s2}`;
    this.red = false;

    if (this.isCursorAtEnd()) {
      this.cursorOffset = 0;
    } else {
      this.cursorOffset++;
    }

    this.render();
  }

  first() {
    this.cursor = 0;
    this.render();
  }

  last() {
    this.cursor = this.value.length;
    this.render();
  }

  left() {
    if (this.cursor <= 0 || this.placeholder) return this.bell();
    this.moveCursor(-1);
    this.render();
  }

  right() {
    if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
    this.moveCursor(1);
    this.render();
  }

  isCursorAtStart() {
    return this.cursor === 0 || this.placeholder && this.cursor === 1;
  }

  isCursorAtEnd() {
    return this.cursor === this.rendered.length || this.placeholder && this.cursor === this.rendered.length + 1;
  }

  render() {
    if (this.closed) return;

    if (!this.firstRender) {
      if (this.outputError) this.out.write(cursor.down(lines(this.outputError, this.out.columns) - 1) + clear(this.outputError, this.out.columns));
      this.out.write(clear(this.outputText, this.out.columns));
    }

    super.render();
    this.outputError = '';
    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(this.done), this.red ? color.red(this.rendered) : this.rendered].join(` `);

    if (this.error) {
      this.outputError += this.errorMsg.split(`\n`).reduce((a, l, i) => a + `\n${i ? ' ' : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText + cursor.save + this.outputError + cursor.restore + cursor.move(this.cursorOffset, 0));
  }

}

module.exports = TextPrompt;

/***/ }),

/***/ 7994:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const color = __nccwpck_require__(6401);

const Prompt = __nccwpck_require__(7332);

const _require = __nccwpck_require__(8985),
      style = _require.style,
      clear = _require.clear;

const _require2 = __nccwpck_require__(9798),
      cursor = _require2.cursor,
      erase = _require2.erase;
/**
 * TogglePrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Boolean} [opts.initial=false] Default value
 * @param {String} [opts.active='no'] Active label
 * @param {String} [opts.inactive='off'] Inactive label
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */


class TogglePrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.value = !!opts.initial;
    this.active = opts.active || 'on';
    this.inactive = opts.inactive || 'off';
    this.initialValue = this.value;
    this.render();
  }

  reset() {
    this.value = this.initialValue;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  deactivate() {
    if (this.value === false) return this.bell();
    this.value = false;
    this.render();
  }

  activate() {
    if (this.value === true) return this.bell();
    this.value = true;
    this.render();
  }

  delete() {
    this.deactivate();
  }

  left() {
    this.deactivate();
  }

  right() {
    this.activate();
  }

  down() {
    this.deactivate();
  }

  up() {
    this.activate();
  }

  next() {
    this.value = !this.value;
    this.fire();
    this.render();
  }

  _(c, key) {
    if (c === ' ') {
      this.value = !this.value;
    } else if (c === '1') {
      this.value = true;
    } else if (c === '0') {
      this.value = false;
    } else return this.bell();

    this.render();
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);else this.out.write(clear(this.outputText, this.out.columns));
    super.render();
    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(this.done), this.value ? this.inactive : color.cyan().underline(this.inactive), color.gray('/'), this.value ? color.cyan().underline(this.active) : this.active].join(' ');
    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }

}

module.exports = TogglePrompt;

/***/ }),

/***/ 3744:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const prompts = __nccwpck_require__(1447);

const passOn = ['suggest', 'format', 'onState', 'validate', 'onRender', 'type'];

const noop = () => {};
/**
 * Prompt for a series of questions
 * @param {Array|Object} questions Single question object or Array of question objects
 * @param {Function} [onSubmit] Callback function called on prompt submit
 * @param {Function} [onCancel] Callback function called on cancel/abort
 * @returns {Object} Object with values from user input
 */


function prompt() {
  return _prompt.apply(this, arguments);
}

function _prompt() {
  _prompt = _asyncToGenerator(function* (questions = [], {
    onSubmit = noop,
    onCancel = noop
  } = {}) {
    const answers = {};
    const override = prompt._override || {};
    questions = [].concat(questions);
    let answer, question, quit, name, type, lastPrompt;

    const getFormattedAnswer = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator(function* (question, answer, skipValidation = false) {
        if (!skipValidation && question.validate && question.validate(answer) !== true) {
          return;
        }

        return question.format ? yield question.format(answer, answers) : answer;
      });

      return function getFormattedAnswer(_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }();

    var _iterator = _createForOfIteratorHelper(questions),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        question = _step.value;
        var _question = question;
        name = _question.name;
        type = _question.type;

        // evaluate type first and skip if type is a falsy value
        if (typeof type === 'function') {
          type = yield type(answer, _objectSpread({}, answers), question);
          question['type'] = type;
        }

        if (!type) continue; // if property is a function, invoke it unless it's a special function

        for (let key in question) {
          if (passOn.includes(key)) continue;
          let value = question[key];
          question[key] = typeof value === 'function' ? yield value(answer, _objectSpread({}, answers), lastPrompt) : value;
        }

        lastPrompt = question;

        if (typeof question.message !== 'string') {
          throw new Error('prompt message is required');
        } // update vars in case they changed


        var _question2 = question;
        name = _question2.name;
        type = _question2.type;

        if (prompts[type] === void 0) {
          throw new Error(`prompt type (${type}) is not defined`);
        }

        if (override[question.name] !== undefined) {
          answer = yield getFormattedAnswer(question, override[question.name]);

          if (answer !== undefined) {
            answers[name] = answer;
            continue;
          }
        }

        try {
          // Get the injected answer if there is one or prompt the user
          answer = prompt._injected ? getInjectedAnswer(prompt._injected, question.initial) : yield prompts[type](question);
          answers[name] = answer = yield getFormattedAnswer(question, answer, true);
          quit = yield onSubmit(question, answer, answers);
        } catch (err) {
          quit = !(yield onCancel(question, answers));
        }

        if (quit) return answers;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return answers;
  });
  return _prompt.apply(this, arguments);
}

function getInjectedAnswer(injected, deafultValue) {
  const answer = injected.shift();

  if (answer instanceof Error) {
    throw answer;
  }

  return answer === undefined ? deafultValue : answer;
}

function inject(answers) {
  prompt._injected = (prompt._injected || []).concat(answers);
}

function override(answers) {
  prompt._override = Object.assign({}, answers);
}

module.exports = Object.assign(prompt, {
  prompt,
  prompts,
  inject,
  override
});

/***/ }),

/***/ 1447:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


const $ = exports;

const el = __nccwpck_require__(7444);

const noop = v => v;

function toPrompt(type, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = new el[type](args);
    const onAbort = opts.onAbort || noop;
    const onSubmit = opts.onSubmit || noop;
    const onExit = opts.onExit || noop;
    p.on('state', args.onState || noop);
    p.on('submit', x => res(onSubmit(x)));
    p.on('exit', x => res(onExit(x)));
    p.on('abort', x => rej(onAbort(x)));
  });
}
/**
 * Text prompt
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.text = args => toPrompt('TextPrompt', args);
/**
 * Password prompt with masked input
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.password = args => {
  args.style = 'password';
  return $.text(args);
};
/**
 * Prompt where input is invisible, like sudo
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.invisible = args => {
  args.style = 'invisible';
  return $.text(args);
};
/**
 * Number prompt
 * @param {string} args.message Prompt message to display
 * @param {number} args.initial Default number value
 * @param {function} [args.onState] On state change callback
 * @param {number} [args.max] Max value
 * @param {number} [args.min] Min value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.number = args => toPrompt('NumberPrompt', args);
/**
 * Date prompt
 * @param {string} args.message Prompt message to display
 * @param {number} args.initial Default number value
 * @param {function} [args.onState] On state change callback
 * @param {number} [args.max] Max value
 * @param {number} [args.min] Min value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.date = args => toPrompt('DatePrompt', args);
/**
 * Classic yes/no prompt
 * @param {string} args.message Prompt message to display
 * @param {boolean} [args.initial=false] Default value
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.confirm = args => toPrompt('ConfirmPrompt', args);
/**
 * List prompt, split intput string by `seperator`
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {string} [args.separator] String separator
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input, in form of an `Array`
 */


$.list = args => {
  const sep = args.separator || ',';
  return toPrompt('TextPrompt', args, {
    onSubmit: str => str.split(sep).map(s => s.trim())
  });
};
/**
 * Toggle/switch prompt
 * @param {string} args.message Prompt message to display
 * @param {boolean} [args.initial=false] Default value
 * @param {string} [args.active="on"] Text for `active` state
 * @param {string} [args.inactive="off"] Text for `inactive` state
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.toggle = args => toPrompt('TogglePrompt', args);
/**
 * Interactive select prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of choices objects `[{ title, value }, ...]`
 * @param {number} [args.initial] Index of default value
 * @param {String} [args.hint] Hint to display
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.select = args => toPrompt('SelectPrompt', args);
/**
 * Interactive multi-select / autocompleteMultiselect prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of choices objects `[{ title, value, [selected] }, ...]`
 * @param {number} [args.max] Max select
 * @param {string} [args.hint] Hint to display user
 * @param {Number} [args.cursor=0] Cursor start position
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.multiselect = args => {
  args.choices = [].concat(args.choices || []);

  const toSelected = items => items.filter(item => item.selected).map(item => item.value);

  return toPrompt('MultiselectPrompt', args, {
    onAbort: toSelected,
    onSubmit: toSelected
  });
};

$.autocompleteMultiselect = args => {
  args.choices = [].concat(args.choices || []);

  const toSelected = items => items.filter(item => item.selected).map(item => item.value);

  return toPrompt('AutocompleteMultiselectPrompt', args, {
    onAbort: toSelected,
    onSubmit: toSelected
  });
};

const byTitle = (input, choices) => Promise.resolve(choices.filter(item => item.title.slice(0, input.length).toLowerCase() === input.toLowerCase()));
/**
 * Interactive auto-complete prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of auto-complete choices objects `[{ title, value }, ...]`
 * @param {Function} [args.suggest] Function to filter results based on user input. Defaults to sort by `title`
 * @param {number} [args.limit=10] Max number of results to show
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {String} [args.initial] Index of the default value
 * @param {boolean} [opts.clearFirst] The first ESCAPE keypress will clear the input
 * @param {String} [args.fallback] Fallback message - defaults to initial value
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.autocomplete = args => {
  args.suggest = args.suggest || byTitle;
  args.choices = [].concat(args.choices || []);
  return toPrompt('AutocompletePrompt', args);
};

/***/ }),

/***/ 5823:
/***/ ((module) => {

"use strict";


module.exports = (key, isSelect) => {
  if (key.meta && key.name !== 'escape') return;

  if (key.ctrl) {
    if (key.name === 'a') return 'first';
    if (key.name === 'c') return 'abort';
    if (key.name === 'd') return 'abort';
    if (key.name === 'e') return 'last';
    if (key.name === 'g') return 'reset';
  }

  if (isSelect) {
    if (key.name === 'j') return 'down';
    if (key.name === 'k') return 'up';
  }

  if (key.name === 'return') return 'submit';
  if (key.name === 'enter') return 'submit'; // ctrl + J

  if (key.name === 'backspace') return 'delete';
  if (key.name === 'delete') return 'deleteForward';
  if (key.name === 'abort') return 'abort';
  if (key.name === 'escape') return 'exit';
  if (key.name === 'tab') return 'next';
  if (key.name === 'pagedown') return 'nextPage';
  if (key.name === 'pageup') return 'prevPage'; // TODO create home() in prompt types (e.g. TextPrompt)

  if (key.name === 'home') return 'home'; // TODO create end() in prompt types (e.g. TextPrompt)

  if (key.name === 'end') return 'end';
  if (key.name === 'up') return 'up';
  if (key.name === 'down') return 'down';
  if (key.name === 'right') return 'right';
  if (key.name === 'left') return 'left';
  return false;
};

/***/ }),

/***/ 2704:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const strip = __nccwpck_require__(3147);

const _require = __nccwpck_require__(9798),
      erase = _require.erase,
      cursor = _require.cursor;

const width = str => [...strip(str)].length;
/**
 * @param {string} prompt
 * @param {number} perLine
 */


module.exports = function (prompt, perLine) {
  if (!perLine) return erase.line + cursor.to(0);
  let rows = 0;
  const lines = prompt.split(/\r?\n/);

  var _iterator = _createForOfIteratorHelper(lines),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      let line = _step.value;
      rows += 1 + Math.floor(Math.max(width(line) - 1, 0) / perLine);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return erase.lines(rows);
};

/***/ }),

/***/ 604:
/***/ ((module) => {

"use strict";

/**
 * Determine what entries should be displayed on the screen, based on the
 * currently selected index and the maximum visible. Used in list-based
 * prompts like `select` and `multiselect`.
 *
 * @param {number} cursor the currently selected entry
 * @param {number} total the total entries available to display
 * @param {number} [maxVisible] the number of entries that can be displayed
 */

module.exports = (cursor, total, maxVisible) => {
  maxVisible = maxVisible || total;
  let startIndex = Math.min(total - maxVisible, cursor - Math.floor(maxVisible / 2));
  if (startIndex < 0) startIndex = 0;
  let endIndex = Math.min(startIndex + maxVisible, total);
  return {
    startIndex,
    endIndex
  };
};

/***/ }),

/***/ 2612:
/***/ ((module) => {

"use strict";


const main = {
  arrowUp: '↑',
  arrowDown: '↓',
  arrowLeft: '←',
  arrowRight: '→',
  radioOn: '◉',
  radioOff: '◯',
  tick: '✔',
  cross: '✖',
  ellipsis: '…',
  pointerSmall: '›',
  line: '─',
  pointer: '❯'
};
const win = {
  arrowUp: main.arrowUp,
  arrowDown: main.arrowDown,
  arrowLeft: main.arrowLeft,
  arrowRight: main.arrowRight,
  radioOn: '(*)',
  radioOff: '( )',
  tick: '√',
  cross: '×',
  ellipsis: '...',
  pointerSmall: '»',
  line: '─',
  pointer: '>'
};
const figures = process.platform === 'win32' ? win : main;
module.exports = figures;

/***/ }),

/***/ 8985:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = {
  action: __nccwpck_require__(5823),
  clear: __nccwpck_require__(2704),
  style: __nccwpck_require__(6428),
  strip: __nccwpck_require__(3147),
  figures: __nccwpck_require__(2612),
  lines: __nccwpck_require__(8170),
  wrap: __nccwpck_require__(1697),
  entriesToDisplay: __nccwpck_require__(604)
};

/***/ }),

/***/ 8170:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const strip = __nccwpck_require__(3147);
/**
 * @param {string} msg
 * @param {number} perLine
 */


module.exports = function (msg, perLine) {
  let lines = String(strip(msg) || '').split(/\r?\n/);
  if (!perLine) return lines.length;
  return lines.map(l => Math.ceil(l.length / perLine)).reduce((a, b) => a + b);
};

/***/ }),

/***/ 3147:
/***/ ((module) => {

"use strict";


module.exports = str => {
  const pattern = ['[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)', '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))'].join('|');
  const RGX = new RegExp(pattern, 'g');
  return typeof str === 'string' ? str.replace(RGX, '') : str;
};

/***/ }),

/***/ 6428:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const c = __nccwpck_require__(6401);

const figures = __nccwpck_require__(2612); // rendering user input.


const styles = Object.freeze({
  password: {
    scale: 1,
    render: input => '*'.repeat(input.length)
  },
  emoji: {
    scale: 2,
    render: input => '😃'.repeat(input.length)
  },
  invisible: {
    scale: 0,
    render: input => ''
  },
  default: {
    scale: 1,
    render: input => `${input}`
  }
});

const render = type => styles[type] || styles.default; // icon to signalize a prompt.


const symbols = Object.freeze({
  aborted: c.red(figures.cross),
  done: c.green(figures.tick),
  exited: c.yellow(figures.cross),
  default: c.cyan('?')
});

const symbol = (done, aborted, exited) => aborted ? symbols.aborted : exited ? symbols.exited : done ? symbols.done : symbols.default; // between the question and the user's input.


const delimiter = completing => c.gray(completing ? figures.ellipsis : figures.pointerSmall);

const item = (expandable, expanded) => c.gray(expandable ? expanded ? figures.pointerSmall : '+' : figures.line);

module.exports = {
  styles,
  render,
  symbols,
  symbol,
  delimiter,
  item
};

/***/ }),

/***/ 1697:
/***/ ((module) => {

"use strict";

/**
 * @param {string} msg The message to wrap
 * @param {object} opts
 * @param {number|string} [opts.margin] Left margin
 * @param {number} opts.width Maximum characters per line including the margin
 */

module.exports = (msg, opts = {}) => {
  const tab = Number.isSafeInteger(parseInt(opts.margin)) ? new Array(parseInt(opts.margin)).fill(' ').join('') : opts.margin || '';
  const width = opts.width;
  return (msg || '').split(/\r?\n/g).map(line => line.split(/\s+/g).reduce((arr, w) => {
    if (w.length + tab.length >= width || arr[arr.length - 1].length + w.length + 1 < width) arr[arr.length - 1] += ` ${w}`;else arr.push(`${tab}${w}`);
    return arr;
  }, [tab]).join('\n')).join('\n');
};

/***/ }),

/***/ 2171:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

function isNodeLT(tar) {
  tar = (Array.isArray(tar) ? tar : tar.split('.')).map(Number);
  let i=0, src=process.versions.node.split('.').map(Number);
  for (; i < tar.length; i++) {
    if (src[i] > tar[i]) return false;
    if (tar[i] > src[i]) return true;
  }
  return false;
}

module.exports =
  isNodeLT('8.6.0')
    ? __nccwpck_require__(3744)
    : __nccwpck_require__(9819);


/***/ }),

/***/ 4437:
/***/ ((module) => {

"use strict";


class DatePart {
  constructor({token, date, parts, locales}) {
    this.token = token;
    this.date = date || new Date();
    this.parts = parts || [this];
    this.locales = locales || {};
  }

  up() {}

  down() {}

  next() {
    const currentIdx = this.parts.indexOf(this);
    return this.parts.find((part, idx) => idx > currentIdx && part instanceof DatePart);
  }

  setTo(val) {}

  prev() {
    let parts = [].concat(this.parts).reverse();
    const currentIdx = parts.indexOf(this);
    return parts.find((part, idx) => idx > currentIdx && part instanceof DatePart);
  }

  toString() {
    return String(this.date);
  }
}

module.exports = DatePart;




/***/ }),

/***/ 6324:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(4437);

const pos = n => {
  n = n % 10;
  return n === 1 ? 'st'
       : n === 2 ? 'nd'
       : n === 3 ? 'rd'
       : 'th';
}

class Day extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setDate(this.date.getDate() + 1);
  }

  down() {
    this.date.setDate(this.date.getDate() - 1);
  }

  setTo(val) {
    this.date.setDate(parseInt(val.substr(-2)));
  }

  toString() {
    let date = this.date.getDate();
    let day = this.date.getDay();
    return this.token === 'DD' ? String(date).padStart(2, '0')
         : this.token === 'Do' ? date + pos(date)
         : this.token === 'd' ? day + 1
         : this.token === 'ddd' ? this.locales.weekdaysShort[day]
         : this.token === 'dddd' ? this.locales.weekdays[day]
         : date;
  }
}

module.exports = Day;


/***/ }),

/***/ 3181:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(4437);

class Hours extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setHours(this.date.getHours() + 1);
  }

  down() {
    this.date.setHours(this.date.getHours() - 1);
  }

  setTo(val) {
    this.date.setHours(parseInt(val.substr(-2)));
  }

  toString() {
    let hours = this.date.getHours();
    if (/h/.test(this.token))
      hours = (hours % 12) || 12;
    return this.token.length > 1 ? String(hours).padStart(2, '0') : hours;
  }
}

module.exports = Hours;


/***/ }),

/***/ 698:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = {
  DatePart: __nccwpck_require__(4437),
  Meridiem: __nccwpck_require__(9342),
  Day: __nccwpck_require__(6324),
  Hours: __nccwpck_require__(3181),
  Milliseconds: __nccwpck_require__(9230),
  Minutes: __nccwpck_require__(3535),
  Month: __nccwpck_require__(5300),
  Seconds: __nccwpck_require__(9799),
  Year: __nccwpck_require__(2913),
}


/***/ }),

/***/ 9342:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(4437);

class Meridiem extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setHours((this.date.getHours() + 12) % 24);
  }

  down() {
    this.up();
  }

  toString() {
    let meridiem = this.date.getHours() > 12 ? 'pm' : 'am';
    return /\A/.test(this.token) ? meridiem.toUpperCase() : meridiem;
  }
}

module.exports = Meridiem;


/***/ }),

/***/ 9230:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(4437);

class Milliseconds extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setMilliseconds(this.date.getMilliseconds() + 1);
  }

  down() {
    this.date.setMilliseconds(this.date.getMilliseconds() - 1);
  }

  setTo(val) {
    this.date.setMilliseconds(parseInt(val.substr(-(this.token.length))));
  }

  toString() {
    return String(this.date.getMilliseconds()).padStart(4, '0')
                                              .substr(0, this.token.length);
  }
}

module.exports = Milliseconds;


/***/ }),

/***/ 3535:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(4437);

class Minutes extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setMinutes(this.date.getMinutes() + 1);
  }

  down() {
    this.date.setMinutes(this.date.getMinutes() - 1);
  }

  setTo(val) {
    this.date.setMinutes(parseInt(val.substr(-2)));
  }

  toString() {
    let m = this.date.getMinutes();
    return this.token.length > 1 ? String(m).padStart(2, '0') : m;
  }
}

module.exports = Minutes;


/***/ }),

/***/ 5300:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(4437);

class Month extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setMonth(this.date.getMonth() + 1);
  }

  down() {
    this.date.setMonth(this.date.getMonth() - 1);
  }

  setTo(val) {
    val = parseInt(val.substr(-2)) - 1;
    this.date.setMonth(val < 0 ? 0 : val);
  }

  toString() {
    let month = this.date.getMonth();
    let tl = this.token.length;
    return tl === 2 ? String(month + 1).padStart(2, '0')
           : tl === 3 ? this.locales.monthsShort[month]
             : tl === 4 ? this.locales.months[month]
               : String(month + 1);
  }
}

module.exports = Month;


/***/ }),

/***/ 9799:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(4437);

class Seconds extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setSeconds(this.date.getSeconds() + 1);
  }

  down() {
    this.date.setSeconds(this.date.getSeconds() - 1);
  }

  setTo(val) {
    this.date.setSeconds(parseInt(val.substr(-2)));
  }

  toString() {
    let s = this.date.getSeconds();
    return this.token.length > 1 ? String(s).padStart(2, '0') : s;
  }
}

module.exports = Seconds;


/***/ }),

/***/ 2913:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DatePart = __nccwpck_require__(4437);

class Year extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setFullYear(this.date.getFullYear() + 1);
  }

  down() {
    this.date.setFullYear(this.date.getFullYear() - 1);
  }

  setTo(val) {
    this.date.setFullYear(val.substr(-4));
  }

  toString() {
    let year = String(this.date.getFullYear()).padStart(4, '0');
    return this.token.length === 2 ? year.substr(-2) : year;
  }
}

module.exports = Year;


/***/ }),

/***/ 5629:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const color = __nccwpck_require__(6401);
const Prompt = __nccwpck_require__(1903);
const { erase, cursor } = __nccwpck_require__(9798);
const { style, clear, figures, wrap, entriesToDisplay } = __nccwpck_require__(2876);

const getVal = (arr, i) => arr[i] && (arr[i].value || arr[i].title || arr[i]);
const getTitle = (arr, i) => arr[i] && (arr[i].title || arr[i].value || arr[i]);
const getIndex = (arr, valOrTitle) => {
  const index = arr.findIndex(el => el.value === valOrTitle || el.title === valOrTitle);
  return index > -1 ? index : undefined;
};

/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of auto-complete choices objects
 * @param {Function} [opts.suggest] Filter function. Defaults to sort by title
 * @param {Number} [opts.limit=10] Max number of results to show
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.fallback] Fallback message - initial to default value
 * @param {String} [opts.initial] Index of the default value
 * @param {Boolean} [opts.clearFirst] The first ESCAPE keypress will clear the input
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.noMatches] The no matches found label
 */
class AutocompletePrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.suggest = opts.suggest;
    this.choices = opts.choices;
    this.initial = typeof opts.initial === 'number'
      ? opts.initial
      : getIndex(opts.choices, opts.initial);
    this.select = this.initial || opts.cursor || 0;
    this.i18n = { noMatches: opts.noMatches || 'no matches found' };
    this.fallback = opts.fallback || this.initial;
    this.clearFirst = opts.clearFirst || false;
    this.suggestions = [];
    this.input = '';
    this.limit = opts.limit || 10;
    this.cursor = 0;
    this.transform = style.render(opts.style);
    this.scale = this.transform.scale;
    this.render = this.render.bind(this);
    this.complete = this.complete.bind(this);
    this.clear = clear('', this.out.columns);
    this.complete(this.render);
    this.render();
  }

  set fallback(fb) {
    this._fb = Number.isSafeInteger(parseInt(fb)) ? parseInt(fb) : fb;
  }

  get fallback() {
    let choice;
    if (typeof this._fb === 'number')
      choice = this.choices[this._fb];
    else if (typeof this._fb === 'string')
      choice = { title: this._fb };
    return choice || this._fb || { title: this.i18n.noMatches };
  }

  moveSelect(i) {
    this.select = i;
    if (this.suggestions.length > 0)
      this.value = getVal(this.suggestions, i);
    else this.value = this.fallback.value;
    this.fire();
  }

  async complete(cb) {
    const p = (this.completing = this.suggest(this.input, this.choices));
    const suggestions = await p;

    if (this.completing !== p) return;
    this.suggestions = suggestions
      .map((s, i, arr) => ({ title: getTitle(arr, i), value: getVal(arr, i), description: s.description }));
    this.completing = false;
    const l = Math.max(suggestions.length - 1, 0);
    this.moveSelect(Math.min(l, this.select));

    cb && cb();
  }

  reset() {
    this.input = '';
    this.complete(() => {
      this.moveSelect(this.initial !== void 0 ? this.initial : 0);
      this.render();
    });
    this.render();
  }

  exit() {
    if (this.clearFirst && this.input.length > 0) {
      this.reset();
    } else {
      this.done = this.exited = true; 
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    }
  }

  abort() {
    this.done = this.aborted = true;
    this.exited = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.done = true;
    this.aborted = this.exited = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  _(c, key) {
    let s1 = this.input.slice(0, this.cursor);
    let s2 = this.input.slice(this.cursor);
    this.input = `${s1}${c}${s2}`;
    this.cursor = s1.length+1;
    this.complete(this.render);
    this.render();
  }

  delete() {
    if (this.cursor === 0) return this.bell();
    let s1 = this.input.slice(0, this.cursor-1);
    let s2 = this.input.slice(this.cursor);
    this.input = `${s1}${s2}`;
    this.complete(this.render);
    this.cursor = this.cursor-1;
    this.render();
  }

  deleteForward() {
    if(this.cursor*this.scale >= this.rendered.length) return this.bell();
    let s1 = this.input.slice(0, this.cursor);
    let s2 = this.input.slice(this.cursor+1);
    this.input = `${s1}${s2}`;
    this.complete(this.render);
    this.render();
  }

  first() {
    this.moveSelect(0);
    this.render();
  }

  last() {
    this.moveSelect(this.suggestions.length - 1);
    this.render();
  }

  up() {
    if (this.select === 0) {
      this.moveSelect(this.suggestions.length - 1);
    } else {
      this.moveSelect(this.select - 1);
    }
    this.render();
  }

  down() {
    if (this.select === this.suggestions.length - 1) {
      this.moveSelect(0);
    } else {
      this.moveSelect(this.select + 1);
    }
    this.render();
  }

  next() {
    if (this.select === this.suggestions.length - 1) {
      this.moveSelect(0);
    } else this.moveSelect(this.select + 1);
    this.render();
  }

  nextPage() {
    this.moveSelect(Math.min(this.select + this.limit, this.suggestions.length - 1));
    this.render();
  }

  prevPage() {
    this.moveSelect(Math.max(this.select - this.limit, 0));
    this.render();
  }

  left() {
    if (this.cursor <= 0) return this.bell();
    this.cursor = this.cursor-1;
    this.render();
  }

  right() {
    if (this.cursor*this.scale >= this.rendered.length) return this.bell();
    this.cursor = this.cursor+1;
    this.render();
  }

  renderOption(v, hovered, isStart, isEnd) {
    let desc;
    let prefix = isStart ? figures.arrowUp : isEnd ? figures.arrowDown : ' ';
    let title = hovered ? color.cyan().underline(v.title) : v.title;
    prefix = (hovered ? color.cyan(figures.pointer) + ' ' : '  ') + prefix;
    if (v.description) {
      desc = ` - ${v.description}`;
      if (prefix.length + title.length + desc.length >= this.out.columns
        || v.description.split(/\r?\n/).length > 1) {
        desc = '\n' + wrap(v.description, { margin: 3, width: this.out.columns })
      }
    }
    return prefix + ' ' + title + color.gray(desc || '');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    let { startIndex, endIndex } = entriesToDisplay(this.select, this.choices.length, this.limit);

    this.outputText = [
      style.symbol(this.done, this.aborted, this.exited),
      color.bold(this.msg),
      style.delimiter(this.completing),
      this.done && this.suggestions[this.select]
        ? this.suggestions[this.select].title
        : this.rendered = this.transform.render(this.input)
    ].join(' ');

    if (!this.done) {
      const suggestions = this.suggestions
        .slice(startIndex, endIndex)
        .map((item, i) =>  this.renderOption(item,
          this.select === i + startIndex,
          i === 0 && startIndex > 0,
          i + startIndex === endIndex - 1 && endIndex < this.choices.length))
        .join('\n');
      this.outputText += `\n` + (suggestions || color.gray(this.fallback.title));
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }
}

module.exports = AutocompletePrompt;


/***/ }),

/***/ 5688:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const color = __nccwpck_require__(6401);
const { cursor } = __nccwpck_require__(9798);
const MultiselectPrompt = __nccwpck_require__(9752);
const { clear, style, figures } = __nccwpck_require__(2876);
/**
 * MultiselectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {String} [opts.warn] Hint shown for disabled choices
 * @param {Number} [opts.max] Max choices
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class AutocompleteMultiselectPrompt extends MultiselectPrompt {
  constructor(opts={}) {
    opts.overrideRender = true;
    super(opts);
    this.inputValue = '';
    this.clear = clear('', this.out.columns);
    this.filteredOptions = this.value;
    this.render();
  }

  last() {
    this.cursor = this.filteredOptions.length - 1;
    this.render();
  }
  next() {
    this.cursor = (this.cursor + 1) % this.filteredOptions.length;
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.cursor = this.filteredOptions.length - 1;
    } else {
      this.cursor--;
    }
    this.render();
  }

  down() {
    if (this.cursor === this.filteredOptions.length - 1) {
      this.cursor = 0;
    } else {
      this.cursor++;
    }
    this.render();
  }

  left() {
    this.filteredOptions[this.cursor].selected = false;
    this.render();
  }

  right() {
    if (this.value.filter(e => e.selected).length >= this.maxChoices) return this.bell();
    this.filteredOptions[this.cursor].selected = true;
    this.render();
  }

  delete() {
    if (this.inputValue.length) {
      this.inputValue = this.inputValue.substr(0, this.inputValue.length - 1);
      this.updateFilteredOptions();
    }
  }

  updateFilteredOptions() {
    const currentHighlight = this.filteredOptions[this.cursor];
    this.filteredOptions = this.value
      .filter(v => {
        if (this.inputValue) {
          if (typeof v.title === 'string') {
            if (v.title.toLowerCase().includes(this.inputValue.toLowerCase())) {
              return true;
            }
          }
          if (typeof v.value === 'string') {
            if (v.value.toLowerCase().includes(this.inputValue.toLowerCase())) {
              return true;
            }
          }
          return false;
        }
        return true;
      });
    const newHighlightIndex = this.filteredOptions.findIndex(v => v === currentHighlight)
    this.cursor = newHighlightIndex < 0 ? 0 : newHighlightIndex;
    this.render();
  }

  handleSpaceToggle() {
    const v = this.filteredOptions[this.cursor];

    if (v.selected) {
      v.selected = false;
      this.render();
    } else if (v.disabled || this.value.filter(e => e.selected).length >= this.maxChoices) {
      return this.bell();
    } else {
      v.selected = true;
      this.render();
    }
  }

  handleInputChange(c) {
    this.inputValue = this.inputValue + c;
    this.updateFilteredOptions();
  }

  _(c, key) {
    if (c === ' ') {
      this.handleSpaceToggle();
    } else {
      this.handleInputChange(c);
    }
  }

  renderInstructions() {
    if (this.instructions === undefined || this.instructions) {
      if (typeof this.instructions === 'string') {
        return this.instructions;
      }
      return `
Instructions:
    ${figures.arrowUp}/${figures.arrowDown}: Highlight option
    ${figures.arrowLeft}/${figures.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
`;
    }
    return '';
  }

  renderCurrentInput() {
    return `
Filtered results for: ${this.inputValue ? this.inputValue : color.gray('Enter something to filter')}\n`;
  }

  renderOption(cursor, v, i) {
    let title;
    if (v.disabled) title = cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);
    else title = cursor === i ? color.cyan().underline(v.title) : v.title;
    return (v.selected ? color.green(figures.radioOn) : figures.radioOff) + '  ' + title
  }

  renderDoneOrInstructions() {
    if (this.done) {
      return this.value
        .filter(e => e.selected)
        .map(v => v.title)
        .join(', ');
    }

    const output = [color.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];

    if (this.filteredOptions.length && this.filteredOptions[this.cursor].disabled) {
      output.push(color.yellow(this.warn));
    }
    return output.join(' ');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    super.render();

    // print prompt

    let prompt = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(false),
      this.renderDoneOrInstructions()
    ].join(' ');

    if (this.showMinError) {
      prompt += color.red(`You must select a minimum of ${this.minSelected} choices.`);
      this.showMinError = false;
    }
    prompt += this.renderOptions(this.filteredOptions);

    this.out.write(this.clear + prompt);
    this.clear = clear(prompt, this.out.columns);
  }
}

module.exports = AutocompleteMultiselectPrompt;


/***/ }),

/***/ 909:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const color = __nccwpck_require__(6401);
const Prompt = __nccwpck_require__(1903);
const { style, clear } = __nccwpck_require__(2876);
const { erase, cursor } = __nccwpck_require__(9798);

/**
 * ConfirmPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Boolean} [opts.initial] Default value (true/false)
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.yes] The "Yes" label
 * @param {String} [opts.yesOption] The "Yes" option when choosing between yes/no
 * @param {String} [opts.no] The "No" label
 * @param {String} [opts.noOption] The "No" option when choosing between yes/no
 */
class ConfirmPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.value = opts.initial;
    this.initialValue = !!opts.initial;
    this.yesMsg = opts.yes || 'yes';
    this.yesOption = opts.yesOption || '(Y/n)';
    this.noMsg = opts.no || 'no';
    this.noOption = opts.noOption || '(y/N)';
    this.render();
  }

  reset() {
    this.value = this.initialValue;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.value = this.value || false;
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  _(c, key) {
    if (c.toLowerCase() === 'y') {
      this.value = true;
      return this.submit();
    }
    if (c.toLowerCase() === 'n') {
      this.value = false;
      return this.submit();
    }
    return this.bell();
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(this.done),
      this.done ? (this.value ? this.yesMsg : this.noMsg)
          : color.gray(this.initialValue ? this.yesOption : this.noOption)
    ].join(' ');

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }
}

module.exports = ConfirmPrompt;


/***/ }),

/***/ 1473:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const color = __nccwpck_require__(6401);
const Prompt = __nccwpck_require__(1903);
const { style, clear, figures } = __nccwpck_require__(2876);
const { erase, cursor } = __nccwpck_require__(9798);
const { DatePart, Meridiem, Day, Hours, Milliseconds, Minutes, Month, Seconds, Year } = __nccwpck_require__(698);

const regex = /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g;
const regexGroups = {
  1: ({token}) => token.replace(/\\(.)/g, '$1'),
  2: (opts) => new Day(opts), // Day // TODO
  3: (opts) => new Month(opts), // Month
  4: (opts) => new Year(opts), // Year
  5: (opts) => new Meridiem(opts), // AM/PM // TODO (special)
  6: (opts) => new Hours(opts), // Hours
  7: (opts) => new Minutes(opts), // Minutes
  8: (opts) => new Seconds(opts), // Seconds
  9: (opts) => new Milliseconds(opts), // Fractional seconds
}

const dfltLocales = {
  months: 'January,February,March,April,May,June,July,August,September,October,November,December'.split(','),
  monthsShort: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(','),
  weekdays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(','),
  weekdaysShort: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'.split(',')
}


/**
 * DatePrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Number} [opts.initial] Index of default value
 * @param {String} [opts.mask] The format mask
 * @param {object} [opts.locales] The date locales
 * @param {String} [opts.error] The error message shown on invalid value
 * @param {Function} [opts.validate] Function to validate the submitted value
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class DatePrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.cursor = 0;
    this.typed = '';
    this.locales = Object.assign(dfltLocales, opts.locales);
    this._date = opts.initial || new Date();
    this.errorMsg = opts.error || 'Please Enter A Valid Value';
    this.validator = opts.validate || (() => true);
    this.mask = opts.mask || 'YYYY-MM-DD HH:mm:ss';
    this.clear = clear('', this.out.columns);
    this.render();
  }

  get value() {
    return this.date
  }

  get date() {
    return this._date;
  }

  set date(date) {
    if (date) this._date.setTime(date.getTime());
  }

  set mask(mask) {
    let result;
    this.parts = [];
    while(result = regex.exec(mask)) {
      let match = result.shift();
      let idx = result.findIndex(gr => gr != null);
      this.parts.push(idx in regexGroups
        ? regexGroups[idx]({ token: result[idx] || match, date: this.date, parts: this.parts, locales: this.locales })
        : result[idx] || match);
    }

    let parts = this.parts.reduce((arr, i) => {
      if (typeof i === 'string' && typeof arr[arr.length - 1] === 'string')
        arr[arr.length - 1] += i;
      else arr.push(i);
      return arr;
    }, []);

    this.parts.splice(0);
    this.parts.push(...parts);
    this.reset();
  }

  moveCursor(n) {
    this.typed = '';
    this.cursor = n;
    this.fire();
  }

  reset() {
    this.moveCursor(this.parts.findIndex(p => p instanceof DatePart));
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.error = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  async validate() {
    let valid = await this.validator(this.value);
    if (typeof valid === 'string') {
      this.errorMsg = valid;
      valid = false;
    }
    this.error = !valid;
  }

  async submit() {
    await this.validate();
    if (this.error) {
      this.color = 'red';
      this.fire();
      this.render();
      return;
    }
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  up() {
    this.typed = '';
    this.parts[this.cursor].up();
    this.render();
  }

  down() {
    this.typed = '';
    this.parts[this.cursor].down();
    this.render();
  }

  left() {
    let prev = this.parts[this.cursor].prev();
    if (prev == null) return this.bell();
    this.moveCursor(this.parts.indexOf(prev));
    this.render();
  }

  right() {
    let next = this.parts[this.cursor].next();
    if (next == null) return this.bell();
    this.moveCursor(this.parts.indexOf(next));
    this.render();
  }

  next() {
    let next = this.parts[this.cursor].next();
    this.moveCursor(next
      ? this.parts.indexOf(next)
      : this.parts.findIndex((part) => part instanceof DatePart));
    this.render();
  }

  _(c) {
    if (/\d/.test(c)) {
      this.typed += c;
      this.parts[this.cursor].setTo(this.typed);
      this.render();
    }
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    // Print prompt
    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(false),
      this.parts.reduce((arr, p, idx) => arr.concat(idx === this.cursor && !this.done ? color.cyan().underline(p.toString()) : p), [])
          .join('')
    ].join(' ');

    // Print error
    if (this.error) {
      this.outputText += this.errorMsg.split('\n').reduce(
          (a, l, i) => a + `\n${i ? ` ` : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }
}

module.exports = DatePrompt;


/***/ }),

/***/ 5945:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = {
  TextPrompt: __nccwpck_require__(9362),
  SelectPrompt: __nccwpck_require__(6661),
  TogglePrompt: __nccwpck_require__(3157),
  DatePrompt: __nccwpck_require__(1473),
  NumberPrompt: __nccwpck_require__(9412),
  MultiselectPrompt: __nccwpck_require__(9752),
  AutocompletePrompt: __nccwpck_require__(5629),
  AutocompleteMultiselectPrompt: __nccwpck_require__(5688),
  ConfirmPrompt: __nccwpck_require__(909)
};


/***/ }),

/***/ 9752:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const color = __nccwpck_require__(6401);
const { cursor } = __nccwpck_require__(9798);
const Prompt = __nccwpck_require__(1903);
const { clear, figures, style, wrap, entriesToDisplay } = __nccwpck_require__(2876);

/**
 * MultiselectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {String} [opts.warn] Hint shown for disabled choices
 * @param {Number} [opts.max] Max choices
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {Number} [opts.optionsPerPage=10] Max options to display at once
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class MultiselectPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.cursor = opts.cursor || 0;
    this.scrollIndex = opts.cursor || 0;
    this.hint = opts.hint || '';
    this.warn = opts.warn || '- This option is disabled -';
    this.minSelected = opts.min;
    this.showMinError = false;
    this.maxChoices = opts.max;
    this.instructions = opts.instructions;
    this.optionsPerPage = opts.optionsPerPage || 10;
    this.value = opts.choices.map((ch, idx) => {
      if (typeof ch === 'string')
        ch = {title: ch, value: idx};
      return {
        title: ch && (ch.title || ch.value || ch),
        description: ch && ch.description,
        value: ch && (ch.value === undefined ? idx : ch.value),
        selected: ch && ch.selected,
        disabled: ch && ch.disabled
      };
    });
    this.clear = clear('', this.out.columns);
    if (!opts.overrideRender) {
      this.render();
    }
  }

  reset() {
    this.value.map(v => !v.selected);
    this.cursor = 0;
    this.fire();
    this.render();
  }

  selected() {
    return this.value.filter(v => v.selected);
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    const selected = this.value
      .filter(e => e.selected);
    if (this.minSelected && selected.length < this.minSelected) {
      this.showMinError = true;
      this.render();
    } else {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    }
  }

  first() {
    this.cursor = 0;
    this.render();
  }

  last() {
    this.cursor = this.value.length - 1;
    this.render();
  }
  next() {
    this.cursor = (this.cursor + 1) % this.value.length;
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.cursor = this.value.length - 1;
    } else {
      this.cursor--;
    }
    this.render();
  }

  down() {
    if (this.cursor === this.value.length - 1) {
      this.cursor = 0;
    } else {
      this.cursor++;
    }
    this.render();
  }

  left() {
    this.value[this.cursor].selected = false;
    this.render();
  }

  right() {
    if (this.value.filter(e => e.selected).length >= this.maxChoices) return this.bell();
    this.value[this.cursor].selected = true;
    this.render();
  }

  handleSpaceToggle() {
    const v = this.value[this.cursor];

    if (v.selected) {
      v.selected = false;
      this.render();
    } else if (v.disabled || this.value.filter(e => e.selected).length >= this.maxChoices) {
      return this.bell();
    } else {
      v.selected = true;
      this.render();
    }
  }

  toggleAll() {
    if (this.maxChoices !== undefined || this.value[this.cursor].disabled) {
      return this.bell();
    }

    const newSelected = !this.value[this.cursor].selected;
    this.value.filter(v => !v.disabled).forEach(v => v.selected = newSelected);
    this.render();
  }

  _(c, key) {
    if (c === ' ') {
      this.handleSpaceToggle();
    } else if (c === 'a') {
      this.toggleAll();
    } else {
      return this.bell();
    }
  }

  renderInstructions() {
    if (this.instructions === undefined || this.instructions) {
      if (typeof this.instructions === 'string') {
        return this.instructions;
      }
      return '\nInstructions:\n'
        + `    ${figures.arrowUp}/${figures.arrowDown}: Highlight option\n`
        + `    ${figures.arrowLeft}/${figures.arrowRight}/[space]: Toggle selection\n`
        + (this.maxChoices === undefined ? `    a: Toggle all\n` : '')
        + `    enter/return: Complete answer`;
    }
    return '';
  }

  renderOption(cursor, v, i, arrowIndicator) {
    const prefix = (v.selected ? color.green(figures.radioOn) : figures.radioOff) + ' ' + arrowIndicator + ' ';
    let title, desc;

    if (v.disabled) {
      title = cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);
    } else {
      title = cursor === i ? color.cyan().underline(v.title) : v.title;
      if (cursor === i && v.description) {
        desc = ` - ${v.description}`;
        if (prefix.length + title.length + desc.length >= this.out.columns
          || v.description.split(/\r?\n/).length > 1) {
          desc = '\n' + wrap(v.description, { margin: prefix.length, width: this.out.columns });
        }
      }
    }

    return prefix + title + color.gray(desc || '');
  }

  // shared with autocompleteMultiselect
  paginateOptions(options) {
    if (options.length === 0) {
      return color.red('No matches for this query.');
    }

    let { startIndex, endIndex } = entriesToDisplay(this.cursor, options.length, this.optionsPerPage);
    let prefix, styledOptions = [];

    for (let i = startIndex; i < endIndex; i++) {
      if (i === startIndex && startIndex > 0) {
        prefix = figures.arrowUp;
      } else if (i === endIndex - 1 && endIndex < options.length) {
        prefix = figures.arrowDown;
      } else {
        prefix = ' ';
      }
      styledOptions.push(this.renderOption(this.cursor, options[i], i, prefix));
    }

    return '\n' + styledOptions.join('\n');
  }

  // shared with autocomleteMultiselect
  renderOptions(options) {
    if (!this.done) {
      return this.paginateOptions(options);
    }
    return '';
  }

  renderDoneOrInstructions() {
    if (this.done) {
      return this.value
        .filter(e => e.selected)
        .map(v => v.title)
        .join(', ');
    }

    const output = [color.gray(this.hint), this.renderInstructions()];

    if (this.value[this.cursor].disabled) {
      output.push(color.yellow(this.warn));
    }
    return output.join(' ');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    super.render();

    // print prompt
    let prompt = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(false),
      this.renderDoneOrInstructions()
    ].join(' ');
    if (this.showMinError) {
      prompt += color.red(`You must select a minimum of ${this.minSelected} choices.`);
      this.showMinError = false;
    }
    prompt += this.renderOptions(this.value);

    this.out.write(this.clear + prompt);
    this.clear = clear(prompt, this.out.columns);
  }
}

module.exports = MultiselectPrompt;


/***/ }),

/***/ 9412:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const color = __nccwpck_require__(6401);
const Prompt = __nccwpck_require__(1903);
const { cursor, erase } = __nccwpck_require__(9798);
const { style, figures, clear, lines } = __nccwpck_require__(2876);

const isNumber = /[0-9]/;
const isDef = any => any !== undefined;
const round = (number, precision) => {
  let factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

/**
 * NumberPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {Number} [opts.initial] Default value
 * @param {Number} [opts.max=+Infinity] Max value
 * @param {Number} [opts.min=-Infinity] Min value
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {Function} [opts.validate] Validate function
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.error] The invalid error label
 */
class NumberPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.transform = style.render(opts.style);
    this.msg = opts.message;
    this.initial = isDef(opts.initial) ? opts.initial : '';
    this.float = !!opts.float;
    this.round = opts.round || 2;
    this.inc = opts.increment || 1;
    this.min = isDef(opts.min) ? opts.min : -Infinity;
    this.max = isDef(opts.max) ? opts.max : Infinity;
    this.errorMsg = opts.error || `Please Enter A Valid Value`;
    this.validator = opts.validate || (() => true);
    this.color = `cyan`;
    this.value = ``;
    this.typed = ``;
    this.lastHit = 0;
    this.render();
  }

  set value(v) {
    if (!v && v !== 0) {
      this.placeholder = true;
      this.rendered = color.gray(this.transform.render(`${this.initial}`));
      this._value = ``;
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(`${round(v, this.round)}`);
      this._value = round(v, this.round);
    }
    this.fire();
  }

  get value() {
    return this._value;
  }

  parse(x) {
    return this.float ? parseFloat(x) : parseInt(x);
  }

  valid(c) {
    return c === `-` || c === `.` && this.float || isNumber.test(c)
  }

  reset() {
    this.typed = ``;
    this.value = ``;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    let x = this.value;
    this.value = x !== `` ? x : this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.fire();
    this.render();
    this.out.write(`\n`);
    this.close();
  }

  async validate() {
    let valid = await this.validator(this.value);
    if (typeof valid === `string`) {
      this.errorMsg = valid;
      valid = false;
    }
    this.error = !valid;
  }

  async submit() {
    await this.validate();
    if (this.error) {
      this.color = `red`;
      this.fire();
      this.render();
      return;
    }
    let x = this.value;
    this.value = x !== `` ? x : this.initial;
    this.done = true;
    this.aborted = false;
    this.error = false;
    this.fire();
    this.render();
    this.out.write(`\n`);
    this.close();
  }

  up() {
    this.typed = ``;
    if(this.value === '') {
      this.value = this.min - this.inc;
    }
    if (this.value >= this.max) return this.bell();
    this.value += this.inc;
    this.color = `cyan`;
    this.fire();
    this.render();
  }

  down() {
    this.typed = ``;
    if(this.value === '') {
      this.value = this.min + this.inc;
    }
    if (this.value <= this.min) return this.bell();
    this.value -= this.inc;
    this.color = `cyan`;
    this.fire();
    this.render();
  }

  delete() {
    let val = this.value.toString();
    if (val.length === 0) return this.bell();
    this.value = this.parse((val = val.slice(0, -1))) || ``;
    if (this.value !== '' && this.value < this.min) {
      this.value = this.min;
    }
    this.color = `cyan`;
    this.fire();
    this.render();
  }

  next() {
    this.value = this.initial;
    this.fire();
    this.render();
  }

  _(c, key) {
    if (!this.valid(c)) return this.bell();

    const now = Date.now();
    if (now - this.lastHit > 1000) this.typed = ``; // 1s elapsed
    this.typed += c;
    this.lastHit = now;
    this.color = `cyan`;

    if (c === `.`) return this.fire();

    this.value = Math.min(this.parse(this.typed), this.max);
    if (this.value > this.max) this.value = this.max;
    if (this.value < this.min) this.value = this.min;
    this.fire();
    this.render();
  }

  render() {
    if (this.closed) return;
    if (!this.firstRender) {
      if (this.outputError)
        this.out.write(cursor.down(lines(this.outputError, this.out.columns) - 1) + clear(this.outputError, this.out.columns));
      this.out.write(clear(this.outputText, this.out.columns));
    }
    super.render();
    this.outputError = '';

    // Print prompt
    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(this.done),
      !this.done || (!this.done && !this.placeholder)
          ? color[this.color]().underline(this.rendered) : this.rendered
    ].join(` `);

    // Print error
    if (this.error) {
      this.outputError += this.errorMsg.split(`\n`)
          .reduce((a, l, i) => a + `\n${i ? ` ` : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText + cursor.save + this.outputError + cursor.restore);
  }
}

module.exports = NumberPrompt;


/***/ }),

/***/ 1903:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const readline = __nccwpck_require__(3785);
const { action } = __nccwpck_require__(2876);
const EventEmitter = __nccwpck_require__(4434);
const { beep, cursor } = __nccwpck_require__(9798);
const color = __nccwpck_require__(6401);

/**
 * Base prompt skeleton
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class Prompt extends EventEmitter {
  constructor(opts={}) {
    super();

    this.firstRender = true;
    this.in = opts.stdin || process.stdin;
    this.out = opts.stdout || process.stdout;
    this.onRender = (opts.onRender || (() => void 0)).bind(this);
    const rl = readline.createInterface({ input:this.in, escapeCodeTimeout:50 });
    readline.emitKeypressEvents(this.in, rl);

    if (this.in.isTTY) this.in.setRawMode(true);
    const isSelect = [ 'SelectPrompt', 'MultiselectPrompt' ].indexOf(this.constructor.name) > -1;
    const keypress = (str, key) => {
      let a = action(key, isSelect);
      if (a === false) {
        this._ && this._(str, key);
      } else if (typeof this[a] === 'function') {
        this[a](key);
      } else {
        this.bell();
      }
    };

    this.close = () => {
      this.out.write(cursor.show);
      this.in.removeListener('keypress', keypress);
      if (this.in.isTTY) this.in.setRawMode(false);
      rl.close();
      this.emit(this.aborted ? 'abort' : this.exited ? 'exit' : 'submit', this.value);
      this.closed = true;
    };

    this.in.on('keypress', keypress);
  }

  fire() {
    this.emit('state', {
      value: this.value,
      aborted: !!this.aborted,
      exited: !!this.exited
    });
  }

  bell() {
    this.out.write(beep);
  }

  render() {
    this.onRender(color);
    if (this.firstRender) this.firstRender = false;
  }
}

module.exports = Prompt;


/***/ }),

/***/ 6661:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const color = __nccwpck_require__(6401);
const Prompt = __nccwpck_require__(1903);
const { style, clear, figures, wrap, entriesToDisplay } = __nccwpck_require__(2876);
const { cursor } = __nccwpck_require__(9798);

/**
 * SelectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {Number} [opts.initial] Index of default value
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {Number} [opts.optionsPerPage=10] Max options to display at once
 */
class SelectPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.hint = opts.hint || '- Use arrow-keys. Return to submit.';
    this.warn = opts.warn || '- This option is disabled';
    this.cursor = opts.initial || 0;
    this.choices = opts.choices.map((ch, idx) => {
      if (typeof ch === 'string')
        ch = {title: ch, value: idx};
      return {
        title: ch && (ch.title || ch.value || ch),
        value: ch && (ch.value === undefined ? idx : ch.value),
        description: ch && ch.description,
        selected: ch && ch.selected,
        disabled: ch && ch.disabled
      };
    });
    this.optionsPerPage = opts.optionsPerPage || 10;
    this.value = (this.choices[this.cursor] || {}).value;
    this.clear = clear('', this.out.columns);
    this.render();
  }

  moveCursor(n) {
    this.cursor = n;
    this.value = this.choices[n].value;
    this.fire();
  }

  reset() {
    this.moveCursor(0);
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    if (!this.selection.disabled) {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    } else
      this.bell();
  }

  first() {
    this.moveCursor(0);
    this.render();
  }

  last() {
    this.moveCursor(this.choices.length - 1);
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.moveCursor(this.choices.length - 1);
    } else {
      this.moveCursor(this.cursor - 1);
    }
    this.render();
  }

  down() {
    if (this.cursor === this.choices.length - 1) {
      this.moveCursor(0);
    } else {
      this.moveCursor(this.cursor + 1);
    }
    this.render();
  }

  next() {
    this.moveCursor((this.cursor + 1) % this.choices.length);
    this.render();
  }

  _(c, key) {
    if (c === ' ') return this.submit();
  }

  get selection() {
    return this.choices[this.cursor];
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    let { startIndex, endIndex } = entriesToDisplay(this.cursor, this.choices.length, this.optionsPerPage);

    // Print prompt
    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(false),
      this.done ? this.selection.title : this.selection.disabled
          ? color.yellow(this.warn) : color.gray(this.hint)
    ].join(' ');

    // Print choices
    if (!this.done) {
      this.outputText += '\n';
      for (let i = startIndex; i < endIndex; i++) {
        let title, prefix, desc = '', v = this.choices[i];

        // Determine whether to display "more choices" indicators
        if (i === startIndex && startIndex > 0) {
          prefix = figures.arrowUp;
        } else if (i === endIndex - 1 && endIndex < this.choices.length) {
          prefix = figures.arrowDown;
        } else {
          prefix = ' ';
        }

        if (v.disabled) {
          title = this.cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);
          prefix = (this.cursor === i ? color.bold().gray(figures.pointer) + ' ' : '  ') + prefix;
        } else {
          title = this.cursor === i ? color.cyan().underline(v.title) : v.title;
          prefix = (this.cursor === i ? color.cyan(figures.pointer) + ' ' : '  ') + prefix;
          if (v.description && this.cursor === i) {
            desc = ` - ${v.description}`;
            if (prefix.length + title.length + desc.length >= this.out.columns
                || v.description.split(/\r?\n/).length > 1) {
              desc = '\n' + wrap(v.description, { margin: 3, width: this.out.columns });
            }
          }
        }

        this.outputText += `${prefix} ${title}${color.gray(desc)}\n`;
      }
    }

    this.out.write(this.outputText);
  }
}

module.exports = SelectPrompt;


/***/ }),

/***/ 9362:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const color = __nccwpck_require__(6401);
const Prompt = __nccwpck_require__(1903);
const { erase, cursor } = __nccwpck_require__(9798);
const { style, clear, lines, figures } = __nccwpck_require__(2876);

/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.initial] Default value
 * @param {Function} [opts.validate] Validate function
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.error] The invalid error label
 */
class TextPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.transform = style.render(opts.style);
    this.scale = this.transform.scale;
    this.msg = opts.message;
    this.initial = opts.initial || ``;
    this.validator = opts.validate || (() => true);
    this.value = ``;
    this.errorMsg = opts.error || `Please Enter A Valid Value`;
    this.cursor = Number(!!this.initial);
    this.cursorOffset = 0;
    this.clear = clear(``, this.out.columns);
    this.render();
  }

  set value(v) {
    if (!v && this.initial) {
      this.placeholder = true;
      this.rendered = color.gray(this.transform.render(this.initial));
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(v);
    }
    this._value = v;
    this.fire();
  }

  get value() {
    return this._value;
  }

  reset() {
    this.value = ``;
    this.cursor = Number(!!this.initial);
    this.cursorOffset = 0;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.value = this.value || this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.red = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  async validate() {
    let valid = await this.validator(this.value);
    if (typeof valid === `string`) {
      this.errorMsg = valid;
      valid = false;
    }
    this.error = !valid;
  }

  async submit() {
    this.value = this.value || this.initial;
    this.cursorOffset = 0;
    this.cursor = this.rendered.length;
    await this.validate();
    if (this.error) {
      this.red = true;
      this.fire();
      this.render();
      return;
    }
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  next() {
    if (!this.placeholder) return this.bell();
    this.value = this.initial;
    this.cursor = this.rendered.length;
    this.fire();
    this.render();
  }

  moveCursor(n) {
    if (this.placeholder) return;
    this.cursor = this.cursor+n;
    this.cursorOffset += n;
  }

  _(c, key) {
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${c}${s2}`;
    this.red = false;
    this.cursor = this.placeholder ? 0 : s1.length+1;
    this.render();
  }

  delete() {
    if (this.isCursorAtStart()) return this.bell();
    let s1 = this.value.slice(0, this.cursor-1);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${s2}`;
    this.red = false;
    if (this.isCursorAtStart()) {
      this.cursorOffset = 0
    } else {
      this.cursorOffset++;
      this.moveCursor(-1);
    }
    this.render();
  }

  deleteForward() {
    if(this.cursor*this.scale >= this.rendered.length || this.placeholder) return this.bell();
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor+1);
    this.value = `${s1}${s2}`;
    this.red = false;
    if (this.isCursorAtEnd()) {
      this.cursorOffset = 0;
    } else {
      this.cursorOffset++;
    }
    this.render();
  }

  first() {
    this.cursor = 0;
    this.render();
  }

  last() {
    this.cursor = this.value.length;
    this.render();
  }

  left() {
    if (this.cursor <= 0 || this.placeholder) return this.bell();
    this.moveCursor(-1);
    this.render();
  }

  right() {
    if (this.cursor*this.scale >= this.rendered.length || this.placeholder) return this.bell();
    this.moveCursor(1);
    this.render();
  }

  isCursorAtStart() {
    return this.cursor === 0 || (this.placeholder && this.cursor === 1);
  }

  isCursorAtEnd() {
    return this.cursor === this.rendered.length || (this.placeholder && this.cursor === this.rendered.length + 1)
  }

  render() {
    if (this.closed) return;
    if (!this.firstRender) {
      if (this.outputError)
        this.out.write(cursor.down(lines(this.outputError, this.out.columns) - 1) + clear(this.outputError, this.out.columns));
      this.out.write(clear(this.outputText, this.out.columns));
    }
    super.render();
    this.outputError = '';

    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(this.done),
      this.red ? color.red(this.rendered) : this.rendered
    ].join(` `);

    if (this.error) {
      this.outputError += this.errorMsg.split(`\n`)
          .reduce((a, l, i) => a + `\n${i ? ' ' : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText + cursor.save + this.outputError + cursor.restore + cursor.move(this.cursorOffset, 0));
  }
}

module.exports = TextPrompt;

/***/ }),

/***/ 3157:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const color = __nccwpck_require__(6401);
const Prompt = __nccwpck_require__(1903);
const { style, clear } = __nccwpck_require__(2876);
const { cursor, erase } = __nccwpck_require__(9798);

/**
 * TogglePrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Boolean} [opts.initial=false] Default value
 * @param {String} [opts.active='no'] Active label
 * @param {String} [opts.inactive='off'] Inactive label
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class TogglePrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.value = !!opts.initial;
    this.active = opts.active || 'on';
    this.inactive = opts.inactive || 'off';
    this.initialValue = this.value;
    this.render();
  }

  reset() {
    this.value = this.initialValue;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  deactivate() {
    if (this.value === false) return this.bell();
    this.value = false;
    this.render();
  }

  activate() {
    if (this.value === true) return this.bell();
    this.value = true;
    this.render();
  }

  delete() {
    this.deactivate();
  }
  left() {
    this.deactivate();
  }
  right() {
    this.activate();
  }
  down() {
    this.deactivate();
  }
  up() {
    this.activate();
  }

  next() {
    this.value = !this.value;
    this.fire();
    this.render();
  }

  _(c, key) {
    if (c === ' ') {
      this.value = !this.value;
    } else if (c === '1') {
      this.value = true;
    } else if (c === '0') {
      this.value = false;
    } else return this.bell();
    this.render();
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(this.done),
      this.value ? this.inactive : color.cyan().underline(this.inactive),
      color.gray('/'),
      this.value ? color.cyan().underline(this.active) : this.active
    ].join(' ');

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }
}

module.exports = TogglePrompt;


/***/ }),

/***/ 9819:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const prompts = __nccwpck_require__(3908);

const passOn = ['suggest', 'format', 'onState', 'validate', 'onRender', 'type'];
const noop = () => {};

/**
 * Prompt for a series of questions
 * @param {Array|Object} questions Single question object or Array of question objects
 * @param {Function} [onSubmit] Callback function called on prompt submit
 * @param {Function} [onCancel] Callback function called on cancel/abort
 * @returns {Object} Object with values from user input
 */
async function prompt(questions=[], { onSubmit=noop, onCancel=noop }={}) {
  const answers = {};
  const override = prompt._override || {};
  questions = [].concat(questions);
  let answer, question, quit, name, type, lastPrompt;

  const getFormattedAnswer = async (question, answer, skipValidation = false) => {
    if (!skipValidation && question.validate && question.validate(answer) !== true) {
      return;
    }
    return question.format ? await question.format(answer, answers) : answer
  };

  for (question of questions) {
    ({ name, type } = question);

    // evaluate type first and skip if type is a falsy value
    if (typeof type === 'function') {
      type = await type(answer, { ...answers }, question)
      question['type'] = type
    }
    if (!type) continue;

    // if property is a function, invoke it unless it's a special function
    for (let key in question) {
      if (passOn.includes(key)) continue;
      let value = question[key];
      question[key] = typeof value === 'function' ? await value(answer, { ...answers }, lastPrompt) : value;
    }

    lastPrompt = question;

    if (typeof question.message !== 'string') {
      throw new Error('prompt message is required');
    }

    // update vars in case they changed
    ({ name, type } = question);

    if (prompts[type] === void 0) {
      throw new Error(`prompt type (${type}) is not defined`);
    }

    if (override[question.name] !== undefined) {
      answer = await getFormattedAnswer(question, override[question.name]);
      if (answer !== undefined) {
        answers[name] = answer;
        continue;
      }
    }

    try {
      // Get the injected answer if there is one or prompt the user
      answer = prompt._injected ? getInjectedAnswer(prompt._injected, question.initial) : await prompts[type](question);
      answers[name] = answer = await getFormattedAnswer(question, answer, true);
      quit = await onSubmit(question, answer, answers);
    } catch (err) {
      quit = !(await onCancel(question, answers));
    }

    if (quit) return answers;
  }

  return answers;
}

function getInjectedAnswer(injected, deafultValue) {
  const answer = injected.shift();
    if (answer instanceof Error) {
      throw answer;
    }

    return (answer === undefined) ? deafultValue : answer;
}

function inject(answers) {
  prompt._injected = (prompt._injected || []).concat(answers);
}

function override(answers) {
  prompt._override = Object.assign({}, answers);
}

module.exports = Object.assign(prompt, { prompt, prompts, inject, override });


/***/ }),

/***/ 3908:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

const $ = exports;
const el = __nccwpck_require__(5945);
const noop = v => v;

function toPrompt(type, args, opts={}) {
  return new Promise((res, rej) => {
    const p = new el[type](args);
    const onAbort = opts.onAbort || noop;
    const onSubmit = opts.onSubmit || noop;
    const onExit = opts.onExit || noop;
    p.on('state', args.onState || noop);
    p.on('submit', x => res(onSubmit(x)));
    p.on('exit', x => res(onExit(x)));
    p.on('abort', x => rej(onAbort(x)));
  });
}

/**
 * Text prompt
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.text = args => toPrompt('TextPrompt', args);

/**
 * Password prompt with masked input
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.password = args => {
  args.style = 'password';
  return $.text(args);
};

/**
 * Prompt where input is invisible, like sudo
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.invisible = args => {
  args.style = 'invisible';
  return $.text(args);
};

/**
 * Number prompt
 * @param {string} args.message Prompt message to display
 * @param {number} args.initial Default number value
 * @param {function} [args.onState] On state change callback
 * @param {number} [args.max] Max value
 * @param {number} [args.min] Min value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.number = args => toPrompt('NumberPrompt', args);

/**
 * Date prompt
 * @param {string} args.message Prompt message to display
 * @param {number} args.initial Default number value
 * @param {function} [args.onState] On state change callback
 * @param {number} [args.max] Max value
 * @param {number} [args.min] Min value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.date = args => toPrompt('DatePrompt', args);

/**
 * Classic yes/no prompt
 * @param {string} args.message Prompt message to display
 * @param {boolean} [args.initial=false] Default value
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.confirm = args => toPrompt('ConfirmPrompt', args);

/**
 * List prompt, split intput string by `seperator`
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {string} [args.separator] String separator
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input, in form of an `Array`
 */
$.list = args => {
  const sep = args.separator || ',';
  return toPrompt('TextPrompt', args, {
    onSubmit: str => str.split(sep).map(s => s.trim())
  });
};

/**
 * Toggle/switch prompt
 * @param {string} args.message Prompt message to display
 * @param {boolean} [args.initial=false] Default value
 * @param {string} [args.active="on"] Text for `active` state
 * @param {string} [args.inactive="off"] Text for `inactive` state
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.toggle = args => toPrompt('TogglePrompt', args);

/**
 * Interactive select prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of choices objects `[{ title, value }, ...]`
 * @param {number} [args.initial] Index of default value
 * @param {String} [args.hint] Hint to display
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.select = args => toPrompt('SelectPrompt', args);

/**
 * Interactive multi-select / autocompleteMultiselect prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of choices objects `[{ title, value, [selected] }, ...]`
 * @param {number} [args.max] Max select
 * @param {string} [args.hint] Hint to display user
 * @param {Number} [args.cursor=0] Cursor start position
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.multiselect = args => {
  args.choices = [].concat(args.choices || []);
  const toSelected = items => items.filter(item => item.selected).map(item => item.value);
  return toPrompt('MultiselectPrompt', args, {
    onAbort: toSelected,
    onSubmit: toSelected
  });
};

$.autocompleteMultiselect = args => {
  args.choices = [].concat(args.choices || []);
  const toSelected = items => items.filter(item => item.selected).map(item => item.value);
  return toPrompt('AutocompleteMultiselectPrompt', args, {
    onAbort: toSelected,
    onSubmit: toSelected
  });
};

const byTitle = (input, choices) => Promise.resolve(
  choices.filter(item => item.title.slice(0, input.length).toLowerCase() === input.toLowerCase())
);

/**
 * Interactive auto-complete prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of auto-complete choices objects `[{ title, value }, ...]`
 * @param {Function} [args.suggest] Function to filter results based on user input. Defaults to sort by `title`
 * @param {number} [args.limit=10] Max number of results to show
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {String} [args.initial] Index of the default value
 * @param {boolean} [opts.clearFirst] The first ESCAPE keypress will clear the input
 * @param {String} [args.fallback] Fallback message - defaults to initial value
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.autocomplete = args => {
  args.suggest = args.suggest || byTitle;
  args.choices = [].concat(args.choices || []);
  return toPrompt('AutocompletePrompt', args);
};


/***/ }),

/***/ 3496:
/***/ ((module) => {

"use strict";


module.exports = (key, isSelect) => {
  if (key.meta && key.name !== 'escape') return;
  
  if (key.ctrl) {
    if (key.name === 'a') return 'first';
    if (key.name === 'c') return 'abort';
    if (key.name === 'd') return 'abort';
    if (key.name === 'e') return 'last';
    if (key.name === 'g') return 'reset';
  }
  
  if (isSelect) {
    if (key.name === 'j') return 'down';
    if (key.name === 'k') return 'up';
  }

  if (key.name === 'return') return 'submit';
  if (key.name === 'enter') return 'submit'; // ctrl + J
  if (key.name === 'backspace') return 'delete';
  if (key.name === 'delete') return 'deleteForward';
  if (key.name === 'abort') return 'abort';
  if (key.name === 'escape') return 'exit';
  if (key.name === 'tab') return 'next';
  if (key.name === 'pagedown') return 'nextPage';
  if (key.name === 'pageup') return 'prevPage';
  // TODO create home() in prompt types (e.g. TextPrompt)
  if (key.name === 'home') return 'home';
  // TODO create end() in prompt types (e.g. TextPrompt)
  if (key.name === 'end') return 'end';

  if (key.name === 'up') return 'up';
  if (key.name === 'down') return 'down';
  if (key.name === 'right') return 'right';
  if (key.name === 'left') return 'left';

  return false;
};


/***/ }),

/***/ 3761:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const strip = __nccwpck_require__(4566);
const { erase, cursor } = __nccwpck_require__(9798);

const width = str => [...strip(str)].length;

/**
 * @param {string} prompt
 * @param {number} perLine
 */
module.exports = function(prompt, perLine) {
  if (!perLine) return erase.line + cursor.to(0);

  let rows = 0;
  const lines = prompt.split(/\r?\n/);
  for (let line of lines) {
    rows += 1 + Math.floor(Math.max(width(line) - 1, 0) / perLine);
  }

  return erase.lines(rows);
};


/***/ }),

/***/ 6431:
/***/ ((module) => {

"use strict";


/**
 * Determine what entries should be displayed on the screen, based on the
 * currently selected index and the maximum visible. Used in list-based
 * prompts like `select` and `multiselect`.
 *
 * @param {number} cursor the currently selected entry
 * @param {number} total the total entries available to display
 * @param {number} [maxVisible] the number of entries that can be displayed
 */
module.exports = (cursor, total, maxVisible)  => {
  maxVisible = maxVisible || total;

  let startIndex = Math.min(total- maxVisible, cursor - Math.floor(maxVisible / 2));
  if (startIndex < 0) startIndex = 0;

  let endIndex = Math.min(startIndex + maxVisible, total);

  return { startIndex, endIndex };
};


/***/ }),

/***/ 3525:
/***/ ((module) => {

"use strict";
	

 const main = {
  arrowUp: '↑',
  arrowDown: '↓',
  arrowLeft: '←',
  arrowRight: '→',
  radioOn: '◉',
  radioOff: '◯',
  tick: '✔',	
  cross: '✖',	
  ellipsis: '…',	
  pointerSmall: '›',	
  line: '─',	
  pointer: '❯'	
};	
const win = {
  arrowUp: main.arrowUp,
  arrowDown: main.arrowDown,
  arrowLeft: main.arrowLeft,
  arrowRight: main.arrowRight,
  radioOn: '(*)',
  radioOff: '( )',	
  tick: '√',	
  cross: '×',	
  ellipsis: '...',	
  pointerSmall: '»',	
  line: '─',	
  pointer: '>'	
};	
const figures = process.platform === 'win32' ? win : main;	

 module.exports = figures;


/***/ }),

/***/ 2876:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = {
  action: __nccwpck_require__(3496),
  clear: __nccwpck_require__(3761),
  style: __nccwpck_require__(189),
  strip: __nccwpck_require__(4566),
  figures: __nccwpck_require__(3525),
  lines: __nccwpck_require__(4255),
  wrap: __nccwpck_require__(50),
  entriesToDisplay: __nccwpck_require__(6431)
};


/***/ }),

/***/ 4255:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const strip = __nccwpck_require__(4566);

/**
 * @param {string} msg
 * @param {number} perLine
 */
module.exports = function (msg, perLine) {
  let lines = String(strip(msg) || '').split(/\r?\n/);

  if (!perLine) return lines.length;
  return lines.map(l => Math.ceil(l.length / perLine))
      .reduce((a, b) => a + b);
};


/***/ }),

/***/ 4566:
/***/ ((module) => {

"use strict";


module.exports = str => {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))'
  ].join('|');

  const RGX = new RegExp(pattern, 'g');
  return typeof str === 'string' ? str.replace(RGX, '') : str;
};


/***/ }),

/***/ 189:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const c = __nccwpck_require__(6401);
const figures = __nccwpck_require__(3525);

// rendering user input.
const styles = Object.freeze({
  password: { scale: 1, render: input => '*'.repeat(input.length) },
  emoji: { scale: 2, render: input => '😃'.repeat(input.length) },
  invisible: { scale: 0, render: input => '' },
  default: { scale: 1, render: input => `${input}` }
});
const render = type => styles[type] || styles.default;

// icon to signalize a prompt.
const symbols = Object.freeze({
  aborted: c.red(figures.cross),
  done: c.green(figures.tick),
  exited: c.yellow(figures.cross),
  default: c.cyan('?')
});

const symbol = (done, aborted, exited) =>
  aborted ? symbols.aborted : exited ? symbols.exited : done ? symbols.done : symbols.default;

// between the question and the user's input.
const delimiter = completing =>
  c.gray(completing ? figures.ellipsis : figures.pointerSmall);

const item = (expandable, expanded) =>
  c.gray(expandable ? (expanded ? figures.pointerSmall : '+') : figures.line);

module.exports = {
  styles,
  render,
  symbols,
  symbol,
  delimiter,
  item
};


/***/ }),

/***/ 50:
/***/ ((module) => {

"use strict";


/**
 * @param {string} msg The message to wrap
 * @param {object} opts
 * @param {number|string} [opts.margin] Left margin
 * @param {number} opts.width Maximum characters per line including the margin
 */
module.exports = (msg, opts = {}) => {
  const tab = Number.isSafeInteger(parseInt(opts.margin))
    ? new Array(parseInt(opts.margin)).fill(' ').join('')
    : (opts.margin || '');

  const width = opts.width;

  return (msg || '').split(/\r?\n/g)
    .map(line => line
      .split(/\s+/g)
      .reduce((arr, w) => {
        if (w.length + tab.length >= width || arr[arr.length - 1].length + w.length + 1 < width)
          arr[arr.length - 1] += ` ${w}`;
        else arr.push(`${tab}${w}`);
        return arr;
      }, [ tab ])
      .join('\n'))
    .join('\n');
};


/***/ }),

/***/ 9798:
/***/ ((module) => {

"use strict";


const ESC = '\x1B';
const CSI = `${ESC}[`;
const beep = '\u0007';

const cursor = {
  to(x, y) {
    if (!y) return `${CSI}${x + 1}G`;
    return `${CSI}${y + 1};${x + 1}H`;
  },
  move(x, y) {
    let ret = '';

    if (x < 0) ret += `${CSI}${-x}D`;
    else if (x > 0) ret += `${CSI}${x}C`;

    if (y < 0) ret += `${CSI}${-y}A`;
    else if (y > 0) ret += `${CSI}${y}B`;

    return ret;
  },
  up: (count = 1) => `${CSI}${count}A`,
  down: (count = 1) => `${CSI}${count}B`,
  forward: (count = 1) => `${CSI}${count}C`,
  backward: (count = 1) => `${CSI}${count}D`,
  nextLine: (count = 1) => `${CSI}E`.repeat(count),
  prevLine: (count = 1) => `${CSI}F`.repeat(count),
  left: `${CSI}G`,
  hide: `${CSI}?25l`,
  show: `${CSI}?25h`,
  save: `${ESC}7`,
  restore: `${ESC}8`
}

const scroll = {
  up: (count = 1) => `${CSI}S`.repeat(count),
  down: (count = 1) => `${CSI}T`.repeat(count)
}

const erase = {
  screen: `${CSI}2J`,
  up: (count = 1) => `${CSI}1J`.repeat(count),
  down: (count = 1) => `${CSI}J`.repeat(count),
  line: `${CSI}2K`,
  lineEnd: `${CSI}K`,
  lineStart: `${CSI}1K`,
  lines(count) {
    let clear = '';
    for (let i = 0; i < count; i++)
      clear += this.line + (i < count - 1 ? cursor.up() : '');
    if (count)
      clear += cursor.left;
    return clear;
  }
}

module.exports = { cursor, scroll, erase, beep };


/***/ }),

/***/ 3662:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const os = __nccwpck_require__(857);
const tty = __nccwpck_require__(2018);
const hasFlag = __nccwpck_require__(9473);

const {env} = process;

let forceColor;
if (hasFlag('no-color') ||
	hasFlag('no-colors') ||
	hasFlag('color=false') ||
	hasFlag('color=never')) {
	forceColor = 0;
} else if (hasFlag('color') ||
	hasFlag('colors') ||
	hasFlag('color=true') ||
	hasFlag('color=always')) {
	forceColor = 1;
}

if ('FORCE_COLOR' in env) {
	if (env.FORCE_COLOR === 'true') {
		forceColor = 1;
	} else if (env.FORCE_COLOR === 'false') {
		forceColor = 0;
	} else {
		forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
	}
}

function translateLevel(level) {
	if (level === 0) {
		return false;
	}

	return {
		level,
		hasBasic: true,
		has256: level >= 2,
		has16m: level >= 3
	};
}

function supportsColor(haveStream, streamIsTTY) {
	if (forceColor === 0) {
		return 0;
	}

	if (hasFlag('color=16m') ||
		hasFlag('color=full') ||
		hasFlag('color=truecolor')) {
		return 3;
	}

	if (hasFlag('color=256')) {
		return 2;
	}

	if (haveStream && !streamIsTTY && forceColor === undefined) {
		return 0;
	}

	const min = forceColor || 0;

	if (env.TERM === 'dumb') {
		return min;
	}

	if (process.platform === 'win32') {
		// Windows 10 build 10586 is the first Windows release that supports 256 colors.
		// Windows 10 build 14931 is the first release that supports 16m/TrueColor.
		const osRelease = os.release().split('.');
		if (
			Number(osRelease[0]) >= 10 &&
			Number(osRelease[2]) >= 10586
		) {
			return Number(osRelease[2]) >= 14931 ? 3 : 2;
		}

		return 1;
	}

	if ('CI' in env) {
		if (['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI', 'GITHUB_ACTIONS', 'BUILDKITE'].some(sign => sign in env) || env.CI_NAME === 'codeship') {
			return 1;
		}

		return min;
	}

	if ('TEAMCITY_VERSION' in env) {
		return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
	}

	if (env.COLORTERM === 'truecolor') {
		return 3;
	}

	if ('TERM_PROGRAM' in env) {
		const version = parseInt((env.TERM_PROGRAM_VERSION || '').split('.')[0], 10);

		switch (env.TERM_PROGRAM) {
			case 'iTerm.app':
				return version >= 3 ? 3 : 2;
			case 'Apple_Terminal':
				return 2;
			// No default
		}
	}

	if (/-256(color)?$/i.test(env.TERM)) {
		return 2;
	}

	if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
		return 1;
	}

	if ('COLORTERM' in env) {
		return 1;
	}

	return min;
}

function getSupportLevel(stream) {
	const level = supportsColor(stream, stream && stream.isTTY);
	return translateLevel(level);
}

module.exports = {
	supportsColor: getSupportLevel,
	stdout: translateLevel(supportsColor(true, tty.isatty(1))),
	stderr: translateLevel(supportsColor(true, tty.isatty(2)))
};


/***/ }),

/***/ 2977:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


exports.fromCallback = function (fn) {
  return Object.defineProperty(function (...args) {
    if (typeof args[args.length - 1] === 'function') fn.apply(this, args)
    else {
      return new Promise((resolve, reject) => {
        args.push((err, res) => (err != null) ? reject(err) : resolve(res))
        fn.apply(this, args)
      })
    }
  }, 'name', { value: fn.name })
}

exports.fromPromise = function (fn) {
  return Object.defineProperty(function (...args) {
    const cb = args[args.length - 1]
    if (typeof cb !== 'function') return fn.apply(this, args)
    else {
      args.pop()
      fn.apply(this, args).then(r => cb(null, r), cb)
    }
  }, 'name', { value: fn.name })
}


/***/ }),

/***/ 7884:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addAfvLibraryCommand = addAfvLibraryCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
const AFV_FILES = ['docs/afv-library.md', 'docs/skills-ecosystem.md'];
function addAfvLibraryCommand() {
    return new commander_1.Command('add-afv-library')
        .description('Add Salesforce AFV Library documentation and optional setup guide')
        .option('--path <path>', 'Path to project root')
        .option('--dry-run', 'Preview changes without applying them')
        // --install flag placeholder: not executed in MVP
        .option('--install', '[Future] Run npx skills add forcedotcom/afv-library (NOT active in MVP)')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('Adding Salesforce AFV Library support...');
        console.log('');
        ui.info('Salesforce AFV Library is Salesforce\'s curated collection of agent skills.');
        ui.info('Repository: https://github.com/forcedotcom/afv-library');
        console.log('');
        if (options.install) {
            console.log('');
            ui.warn('--install flag detected.');
            ui.warn('MVP: Auto-install is NOT active. Review the source before running:');
            ui.item('  npx skills add forcedotcom/afv-library');
            ui.warn('AI-Kit does not automatically install external skills.');
            console.log('');
        }
        const plan = await (0, core_1.planSetup)(rootPath, { preset: 'core', dryRun });
        const afvPlan = {
            ...plan,
            files: plan.files.filter((f) => AFV_FILES.includes(f.relativePath)),
            packageJsonScripts: {},
            forceIgnoreLines: [],
        };
        const result = await (0, core_1.applySetup)(rootPath, afvPlan);
        for (const f of result.filesCreated)
            ui.success(f);
        for (const f of result.filesSkipped)
            ui.info(`skipped: ${f}`);
        for (const e of result.errors)
            ui.error(e);
        if (dryRun) {
            ui.warn('Dry run — no files were created.');
        }
        else {
            ui.success('AFV Library docs created.');
            console.log('');
            ui.info('To install Salesforce AFV Library (review source first):');
            ui.item('  npx skills add forcedotcom/afv-library');
            ui.info('See docs/afv-library.md for details and security guidance.');
        }
    });
}
//# sourceMappingURL=add-afv-library.js.map

/***/ }),

/***/ 5155:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addClaudeMemCommand = addClaudeMemCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const fs = __importStar(__nccwpck_require__(1348));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
function addClaudeMemCommand() {
    return new commander_1.Command('add-claude-mem')
        .description('Generate salesforce-dx.json claude-mem mode for cross-session memory')
        .option('--path <path>', 'Path to project root (default: current directory)')
        .option('--output <dir>', 'Output directory for the mode file (default: docs/claude-mem/)')
        .option('--claude-mem-dir <dir>', 'Path to local claude-mem plugin/modes/ folder to write directly')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        ui.header('Adding claude-mem Salesforce DX mode...');
        console.log('');
        ui.info('This generates salesforce-dx.json — a claude-mem mode file that captures');
        ui.info('Apex patterns, deployment decisions, org config, and security findings');
        ui.info('as persistent memory across coding sessions.');
        console.log('');
        const json = (0, core_1.generateClaudeMemModeJson)();
        // Write to project docs so it's committed alongside the project
        const docsOutputDir = options.output
            ? path.resolve(options.output)
            : path.join(rootPath, 'docs', 'claude-mem');
        await fs.ensureDir(docsOutputDir);
        const docsOutputPath = path.join(docsOutputDir, 'salesforce-dx.json');
        if (await fs.pathExists(docsOutputPath)) {
            ui.info(`Already exists — skipped: ${path.relative(rootPath, docsOutputPath)}`);
        }
        else {
            await fs.writeFile(docsOutputPath, json, 'utf8');
            ui.success(`Created: ${path.relative(rootPath, docsOutputPath)}`);
        }
        // Optionally write directly into a local claude-mem installation
        if (options.claudeMemDir) {
            const targetPath = path.join(options.claudeMemDir, 'salesforce-dx.json');
            await fs.ensureDir(options.claudeMemDir);
            await fs.writeFile(targetPath, json, 'utf8');
            ui.success(`Written to claude-mem modes: ${targetPath}`);
        }
        console.log('');
        ui.info('To activate this mode in claude-mem:');
        ui.item(`  1. Copy docs/claude-mem/salesforce-dx.json to your claude-mem plugin/modes/ folder.`);
        ui.item(`  2. Or use: ai-kit-sf add-claude-mem --claude-mem-dir ~/.claude-mem/plugin/modes/`);
        ui.item(`  3. Set mode in claude-mem settings: "salesforce-dx"`);
        ui.item(`  4. Restart Claude Code.`);
        console.log('');
        ui.info('claude-mem captures: apex-pattern, deployment-issue, permission-rule,');
        ui.info('org-config, mcp-operation, security-finding, lwc-decision, test-strategy,');
        ui.info('agentforce-pattern — persisted across sessions.');
    });
}
//# sourceMappingURL=add-claude-mem.js.map

/***/ }),

/***/ 3223:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addClaudeCommand = addClaudeCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
const CLAUDE_FILES = [
    'AGENTS.md',
    'CLAUDE.md',
    '.claude/commands/review-security.md',
    '.claude/commands/validate-deploy.md',
    '.claude/commands/write-tests.md',
    '.claude/commands/create-apex.md',
    '.claude/commands/create-lwc.md',
    '.claude/commands/prepare-pr.md',
    '.claude/agents/salesforce-architect.md',
    '.claude/agents/apex-developer.md',
    '.claude/agents/lwc-developer.md',
    '.claude/agents/qa-tester.md',
    '.claude/agents/security-reviewer.md',
];
function addClaudeCommand() {
    return new commander_1.Command('add-claude')
        .description('Add CLAUDE.md, Claude commands, and Claude subagents')
        .option('--path <path>', 'Path to project root')
        .option('--dry-run', 'Preview changes without applying them')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('Adding Claude Code setup...');
        const plan = await (0, core_1.planSetup)(rootPath, { preset: 'core', dryRun });
        const claudePlan = {
            ...plan,
            files: plan.files.filter((f) => CLAUDE_FILES.includes(f.relativePath)),
            packageJsonScripts: {},
            forceIgnoreLines: [],
        };
        const result = await (0, core_1.applySetup)(rootPath, claudePlan);
        for (const f of result.filesCreated)
            ui.success(f);
        for (const f of result.filesSkipped)
            ui.info(`skipped: ${f}`);
        for (const e of result.errors)
            ui.error(e);
        if (dryRun) {
            ui.warn('Dry run — no files were created.');
        }
        else {
            ui.success('Claude Code setup complete.');
        }
    });
}
//# sourceMappingURL=add-claude.js.map

/***/ }),

/***/ 6119:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addCursorCommand = addCursorCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
const CURSOR_FILES = [
    '.cursor/rules/salesforce-mcp.mdc',
    '.cursor/rules/apex.mdc',
    '.cursor/rules/lwc.mdc',
    '.cursor/rules/deployment.mdc',
    '.cursor/rules/safety.mdc',
    '.cursor/skills/salesforce-apex/SKILL.md',
    '.cursor/skills/salesforce-lwc/SKILL.md',
    '.cursor/skills/salesforce-flow/SKILL.md',
    '.cursor/skills/salesforce-security-review/SKILL.md',
    '.cursor/skills/salesforce-agentforce/SKILL.md',
    '.cursor/skills/salesforce-data-cloud/SKILL.md',
];
function addCursorCommand() {
    return new commander_1.Command('add-cursor')
        .description('Add Cursor rules and skill templates to the project')
        .option('--path <path>', 'Path to project root')
        .option('--dry-run', 'Preview changes without applying them')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('Adding Cursor rules and skills...');
        const plan = await (0, core_1.planSetup)(rootPath, { preset: 'core', dryRun });
        const cursorPlan = {
            ...plan,
            files: plan.files.filter((f) => CURSOR_FILES.includes(f.relativePath)),
            packageJsonScripts: {},
            forceIgnoreLines: [],
        };
        const result = await (0, core_1.applySetup)(rootPath, cursorPlan);
        for (const f of result.filesCreated)
            ui.success(f);
        for (const f of result.filesSkipped)
            ui.info(`skipped: ${f}`);
        for (const e of result.errors)
            ui.error(e);
        if (dryRun) {
            ui.warn('Dry run — no files were created.');
        }
        else {
            ui.success('Cursor setup complete.');
        }
    });
}
//# sourceMappingURL=add-cursor.js.map

/***/ }),

/***/ 3461:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addJagsSkillsCommand = addJagsSkillsCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
const SKILL_FILES = [
    '.cursor/skills/salesforce-apex/SKILL.md',
    '.cursor/skills/salesforce-lwc/SKILL.md',
    '.cursor/skills/salesforce-flow/SKILL.md',
    '.cursor/skills/salesforce-security-review/SKILL.md',
    '.cursor/skills/salesforce-agentforce/SKILL.md',
    '.cursor/skills/salesforce-data-cloud/SKILL.md',
    'docs/jags-skills.md',
    'docs/skills-ecosystem.md',
];
function addJagsSkillsCommand() {
    return new commander_1.Command('add-jags-skills')
        .description('Add local AI-Kit Salesforce skill templates (Cursor-compatible)')
        .option('--path <path>', 'Path to project root')
        .option('--dry-run', 'Preview changes without applying them')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('Adding AI-Kit Salesforce skill templates...');
        console.log('');
        ui.info('These are AI-Kit local Salesforce skill templates — compatible with Cursor skills workflow.');
        ui.info('They are NOT official Jag files. See docs/jags-skills.md for Jag installation options.');
        console.log('');
        const plan = await (0, core_1.planSetup)(rootPath, { preset: 'core', dryRun });
        const skillsPlan = {
            ...plan,
            files: plan.files.filter((f) => SKILL_FILES.includes(f.relativePath)),
            packageJsonScripts: {},
            forceIgnoreLines: [],
        };
        const result = await (0, core_1.applySetup)(rootPath, skillsPlan);
        for (const f of result.filesCreated)
            ui.success(f);
        for (const f of result.filesSkipped)
            ui.info(`skipped: ${f}`);
        for (const e of result.errors)
            ui.error(e);
        if (dryRun) {
            ui.warn('Dry run — no files were created.');
        }
        else {
            ui.success('Skill templates created.');
            console.log('');
            ui.info('TODO: To install Jag\'s actual Salesforce skills in the future:');
            ui.item('  npx skills add Jaganpro/sf-skills');
            ui.info('Review the source before running.');
        }
    });
}
//# sourceMappingURL=add-jags-skills.js.map

/***/ }),

/***/ 8001:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addMcpCommand = addMcpCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
const MCP_FILES = ['docs/mcp-usage.md', '.cursor/rules/salesforce-mcp.mdc'];
function addMcpCommand() {
    return new commander_1.Command('add-mcp')
        .description('Add Salesforce DX MCP usage guide and MCP Cursor rule')
        .option('--path <path>', 'Path to project root')
        .option('--dry-run', 'Preview changes without applying them')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('Adding MCP setup...');
        const plan = await (0, core_1.planSetup)(rootPath, { preset: 'core', dryRun });
        const mcpPlan = {
            ...plan,
            files: plan.files.filter((f) => MCP_FILES.includes(f.relativePath)),
            packageJsonScripts: {},
            forceIgnoreLines: [],
        };
        const result = await (0, core_1.applySetup)(rootPath, mcpPlan);
        for (const f of result.filesCreated)
            ui.success(f);
        for (const f of result.filesSkipped)
            ui.info(`skipped: ${f}`);
        for (const e of result.errors)
            ui.error(e);
        if (dryRun) {
            ui.warn('Dry run — no files were created.');
        }
        else {
            ui.success('MCP setup complete.');
            ui.info('Next: Copy the example config from docs/mcp-usage.md to .cursor/mcp.json');
            ui.info('Update DEFAULT_TARGET_ORG with your org alias.');
        }
    });
}
//# sourceMappingURL=add-mcp.js.map

/***/ }),

/***/ 1073:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.agentforceScanCommand = agentforceScanCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
function agentforceScanCommand() {
    return new commander_1.Command('agentforce-scan')
        .description('Scan the project for Agentforce metadata and show recommendations')
        .option('--path <path>', 'Path to project root (defaults to current directory)')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        ui.header('Agentforce Scan');
        console.log('');
        ui.info('Scanning force-app/ for Agentforce metadata...');
        console.log('');
        let ctx;
        try {
            ctx = await (0, core_1.detectAgentforceContext)(rootPath);
        }
        catch (err) {
            ui.error(`Scan failed: ${String(err)}`);
            process.exit(1);
        }
        if (!ctx.hasAgentforceMetadata) {
            ui.info('No Agentforce metadata detected in force-app/');
            console.log('');
            return;
        }
        // Invocable Actions
        if (ctx.invocableActions.length > 0) {
            ui.section('Invocable Actions (@InvocableMethod):');
            for (const name of ctx.invocableActions) {
                ui.success(`  ${name}`);
            }
        }
        // Prompt Templates
        if (ctx.promptTemplates.length > 0) {
            ui.section('Prompt Templates (.prompt-meta.xml):');
            for (const name of ctx.promptTemplates) {
                ui.item(`  ${name}`);
            }
        }
        // Agent Topics
        if (ctx.agentTopics.length > 0) {
            ui.section('Agent Topics / Bots:');
            for (const name of ctx.agentTopics) {
                ui.item(`  ${name}`);
            }
        }
        // AFV Library status
        console.log('');
        if (ctx.afvLibraryInstalled) {
            ui.success('AFV Library skills: installed');
        }
        else {
            ui.warn('AFV Library skills: not installed');
        }
        // Recommendations
        if (ctx.recommendations.length > 0) {
            ui.section('Recommendations:');
            for (const rec of ctx.recommendations) {
                ui.warn(`  ${rec}`);
            }
        }
        console.log('');
    });
}
//# sourceMappingURL=agentforce-scan.js.map

/***/ }),

/***/ 6188:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.bootstrapMcpCommand = bootstrapMcpCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const prompts_1 = __importDefault(__nccwpck_require__(2171));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
function bootstrapMcpCommand() {
    return new commander_1.Command('bootstrap-mcp')
        .description('Write correctly-formatted .cursor/mcp.json and .mcp.json for Salesforce DX MCP')
        .option('--path <path>', 'Path to project root')
        .option('--org <alias>', 'Salesforce org alias to configure')
        .option('--dry-run', 'Preview the config without writing files')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('MCP Bootstrap');
        console.log('');
        // Try to detect org from project
        const orgCtx = await (0, core_1.readOrgContext)(rootPath);
        let orgAlias = options.org;
        if (!orgAlias) {
            if (orgCtx.defaultOrg && orgCtx.source !== 'none') {
                ui.info(`Detected org from ${orgCtx.source}: ${orgCtx.defaultOrg}`);
            }
            const response = await (0, prompts_1.default)({
                type: 'text',
                name: 'org',
                message: 'Enter your Salesforce org alias:',
                initial: orgCtx.defaultOrg ?? '',
                validate: (v) => (v.trim().length > 0 ? true : 'Org alias is required'),
            });
            if (!response.org) {
                ui.info('Cancelled.');
                process.exit(0);
            }
            orgAlias = response.org;
        }
        if (dryRun) {
            const { buildMcpConfig } = await Promise.resolve().then(() => __importStar(__nccwpck_require__(6808)));
            const config = buildMcpConfig({ orgAlias: orgAlias });
            console.log('');
            ui.warn('Dry run — would write these files:');
            ui.item('.cursor/mcp.json');
            ui.item('.mcp.json');
            console.log('');
            console.log(JSON.stringify(config, null, 2));
            return;
        }
        const result = await (0, core_1.bootstrapMcp)(rootPath, { orgAlias: orgAlias });
        console.log('');
        if (!result.alreadyExisted.cursor) {
            ui.success('.cursor/mcp.json created');
        }
        else {
            ui.info('.cursor/mcp.json already exists — skipped');
        }
        if (!result.alreadyExisted.claude) {
            ui.success('.mcp.json created');
        }
        else {
            ui.info('.mcp.json already exists — skipped');
        }
        // Validate what was written
        console.log('');
        ui.info('Validating config...');
        const validation = await (0, core_1.validateMcpConfig)(result.cursorConfigPath);
        if (validation.valid) {
            ui.success('Config is valid');
        }
        else {
            for (const issue of validation.issues)
                ui.warn(issue);
            for (const sug of validation.suggestions)
                ui.item('  → ' + sug);
        }
        console.log('');
        ui.info(`Org alias configured: ${orgAlias}`);
        ui.info('Restart Cursor/Claude Code to activate MCP.');
    });
}
//# sourceMappingURL=bootstrap-mcp.js.map

/***/ }),

/***/ 2205:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.checkDriftCommand = checkDriftCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
function checkDriftCommand() {
    return new commander_1.Command('check-drift')
        .description('Check if local AI setup has drifted from current AI-Kit templates or a team config')
        .option('--path <path>', 'Path to project root')
        .option('--team-config <url>', 'URL to a team config JSON file for team sync check')
        .option('--team-config-file <file>', 'Local path to a team config JSON file')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        ui.header('Drift Detection');
        console.log('');
        // ── Team sync mode ────────────────────────────────────────────────────
        if (options.teamConfig || options.teamConfigFile) {
            let teamCfg = null;
            if (options.teamConfigFile) {
                try {
                    const fs = await Promise.resolve().then(() => __importStar(__nccwpck_require__(1348)));
                    teamCfg = await fs.readJson(options.teamConfigFile);
                }
                catch {
                    ui.error(`Could not read team config file: ${options.teamConfigFile}`);
                    process.exit(1);
                }
            }
            else if (options.teamConfig) {
                ui.info(`Fetching team config from: ${options.teamConfig}`);
                teamCfg = await (0, core_1.fetchTeamConfig)(options.teamConfig);
                if (!teamCfg) {
                    ui.error('Could not fetch team config. Check the URL and your network connection.');
                    process.exit(1);
                }
            }
            const syncResult = await (0, core_1.checkTeamSync)(rootPath, teamCfg);
            console.log('');
            ui.bold(`Team Config v${syncResult.configVersion}`);
            if (teamCfg?.description)
                ui.info(teamCfg.description);
            console.log('');
            if (syncResult.drifted.length === 0 && syncResult.missing.length === 0) {
                ui.success(syncResult.summary);
            }
            else {
                ui.warn(syncResult.summary);
                printDriftResults(syncResult.drifted, syncResult.missing, syncResult.upToDate);
            }
            return;
        }
        // ── Local template drift check ────────────────────────────────────────
        ui.info('Comparing project files against current AI-Kit templates...');
        const result = await (0, core_1.detectDrift)(rootPath);
        console.log('');
        if (result.drifted.length === 0 && result.missing.length === 0) {
            ui.success(`All ${result.upToDate.length} tracked file(s) are up to date.`);
            return;
        }
        printDriftResults(result.drifted, result.missing, result.upToDate);
        console.log('');
        ui.info('To refresh drifted files:');
        ui.item('  1. Back up your customisations first.');
        ui.item('  2. Delete the drifted file(s).');
        ui.item('  3. Run: ai-kit-sf init --preset core --yes');
        ui.item('  4. Re-apply your customisations.');
    });
}
function printDriftResults(drifted, missing, upToDate) {
    if (drifted.length > 0) {
        ui.section('Drifted files:');
        for (const d of drifted) {
            ui.warn(`  ${d.relativePath}`);
            ui.item(`    ${d.reason}`);
            for (const s of d.missingSignals) {
                ui.item(`    Missing: "${s}"`);
            }
        }
    }
    if (missing.length > 0) {
        ui.section('Missing files:');
        for (const m of missing) {
            ui.error(`  ${m}`);
        }
    }
    if (upToDate.length > 0) {
        ui.section('Up to date:');
        for (const f of upToDate) {
            ui.success(`  ${f}`);
        }
    }
}
//# sourceMappingURL=check-drift.js.map

/***/ }),

/***/ 9361:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deployPreviewCommand = deployPreviewCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
function deployPreviewCommand() {
    return new commander_1.Command('deploy-preview')
        .description('Preview what would be deployed to the target org, including risks')
        .option('--path <path>', 'Path to project root (defaults to current directory)')
        .option('--target-org <org>', 'Target org alias or username (overrides project default)')
        .option('--source-dir <dir>', 'Source directory to deploy from (default: force-app)')
        .option('--confirm-production', 'Required flag to proceed when target org is production')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        ui.header('Deploy Preview');
        console.log('');
        ui.info('Scanning source directory...');
        let result;
        try {
            result = await (0, core_1.buildDeployPreview)({
                rootPath,
                targetOrg: options.targetOrg,
                sourceDir: options.sourceDir,
            });
        }
        catch (err) {
            ui.error(`Failed to build deploy preview: ${String(err)}`);
            process.exit(1);
        }
        // Production safety gate
        if (result.isProduction && !options.confirmProduction) {
            console.log('');
            ui.error('━'.repeat(60));
            ui.error('  TARGET ORG APPEARS TO BE PRODUCTION');
            ui.error('━'.repeat(60));
            ui.error(`  Org: ${result.targetOrg}`);
            ui.error('  Deploying to production without validation is dangerous.');
            ui.error('  Re-run with --confirm-production to acknowledge this risk.');
            ui.error('━'.repeat(60));
            console.log('');
            process.exit(1);
        }
        // Org header
        console.log('');
        if (result.isProduction) {
            ui.warn(`Target Org: ${result.targetOrg}  ⚠  PRODUCTION`);
        }
        else {
            ui.info(`Target Org: ${result.targetOrg}`);
        }
        console.log('');
        // Component counts by type
        const allComponents = [
            ...result.componentsToAdd,
            ...result.componentsToModify,
            ...result.componentsToDelete,
        ];
        const byType = new Map();
        for (const c of allComponents) {
            if (!byType.has(c.type))
                byType.set(c.type, []);
            byType.get(c.type).push(c);
        }
        if (byType.size === 0) {
            ui.info('No components found in source directory.');
        }
        else {
            ui.section('Components by Type:');
            for (const [type, comps] of [...byType.entries()].sort()) {
                ui.item(`${type}: ${comps.length}`);
            }
            ui.section('Component Details:');
            if (result.componentsToAdd.length > 0) {
                console.log('');
                ui.bold('  To Add:');
                for (const c of result.componentsToAdd) {
                    ui.item(`  + ${c.name}  (${c.type})  ${c.filePath}`);
                }
            }
            if (result.componentsToModify.length > 0) {
                console.log('');
                ui.bold('  To Modify:');
                for (const c of result.componentsToModify) {
                    ui.item(`  ~ ${c.name}  (${c.type})  ${c.filePath}`);
                }
            }
            if (result.componentsToDelete.length > 0) {
                console.log('');
                ui.bold('  To Delete:');
                for (const c of result.componentsToDelete) {
                    ui.item(`  - ${c.name}  (${c.type})  ${c.filePath}`);
                }
            }
        }
        // Risks
        if (result.risks.length > 0) {
            ui.section('Risks:');
            for (const risk of result.risks) {
                const isError = risk.toLowerCase().includes('production') ||
                    risk.toLowerCase().includes('destructive');
                if (isError) {
                    ui.error(`  ${risk}`);
                }
                else {
                    ui.warn(`  ${risk}`);
                }
            }
        }
        else {
            console.log('');
            ui.success('No deployment risks detected.');
        }
        // Commands
        ui.section('Commands:');
        console.log('');
        ui.bold('  Validate:');
        ui.item(`  ${result.validationCommand}`);
        console.log('');
        ui.bold('  Deploy:');
        ui.item(`  ${result.deployCommand}`);
        console.log('');
        if (result.isProduction) {
            ui.warn('Remember: Always validate before deploying to production!');
            console.log('');
        }
    });
}
//# sourceMappingURL=deploy-preview.js.map

/***/ }),

/***/ 7584:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.doctorCommand = doctorCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
function doctorCommand() {
    return new commander_1.Command('doctor')
        .description('Full health check — AI setup, org context, MCP config, and drift detection')
        .option('--path <path>', 'Path to project root')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        ui.header('AI-Kit Doctor');
        console.log('');
        // ── Org context ───────────────────────────────────────────────────────
        const orgCtx = await (0, core_1.readOrgContext)(rootPath);
        if (orgCtx.source !== 'none') {
            ui.success(`Org context: ${orgCtx.defaultOrg}  (${orgCtx.source})`);
        }
        else {
            ui.warn('No org context detected (.sf/config.json, sfdx-project.json, .sfdx/)');
            ui.item('  Run: sf org list  to see available orgs');
            ui.item('  Run: ai-kit-sf bootstrap-mcp  to configure MCP with your org alias');
        }
        // ── AI setup scan ────────────────────────────────────────────────────
        console.log('');
        const result = await (0, core_1.scanProject)(rootPath);
        console.log((0, core_1.generateReadinessReport)(result));
        // ── MCP config validation ────────────────────────────────────────────
        const mcpPaths = [
            { label: '.cursor/mcp.json', p: path.join(rootPath, '.cursor', 'mcp.json') },
            { label: '.mcp.json', p: path.join(rootPath, '.mcp.json') },
        ];
        let anyMcpFound = false;
        for (const { label, p } of mcpPaths) {
            const validation = await (0, core_1.validateMcpConfig)(p);
            if (validation.issues[0] === 'Config file not found')
                continue;
            anyMcpFound = true;
            if (validation.valid) {
                ui.success(`${label}: valid`);
            }
            else {
                ui.section(`${label}: issues found`);
                for (const issue of validation.issues)
                    ui.warn(`  ${issue}`);
                for (const sug of validation.suggestions)
                    ui.item(`  → ${sug}`);
            }
        }
        if (!anyMcpFound) {
            ui.warn('No MCP config found.');
            ui.item('  Run: ai-kit-sf bootstrap-mcp  to create one');
        }
        // ── Drift detection ─────────────────────────────────────────────────
        console.log('');
        ui.bold('Drift check:');
        const drift = await (0, core_1.detectDrift)(rootPath);
        if (drift.drifted.length === 0 && drift.missing.length === 0) {
            ui.success(`All ${drift.upToDate.length} tracked template file(s) are current`);
        }
        else {
            if (drift.drifted.length > 0) {
                ui.warn(`${drift.drifted.length} file(s) have drifted from AI-Kit templates:`);
                for (const d of drift.drifted) {
                    ui.item(`  ${d.relativePath} — ${d.missingSignals.slice(0, 2).join(', ')}`);
                }
            }
            if (drift.missing.length > 0) {
                ui.warn(`${drift.missing.length} tracked template file(s) not found`);
            }
            ui.info('Run: ai-kit-sf check-drift  for full details');
        }
        // ── Summary ──────────────────────────────────────────────────────────
        const issues = result.missing.length + drift.drifted.length;
        console.log('');
        if (issues === 0 && orgCtx.source !== 'none' && anyMcpFound) {
            ui.success('Project is fully configured and healthy.');
        }
        else {
            if (result.missing.length > 0)
                ui.info('Fix setup: ai-kit-sf init --preset core');
            if (drift.drifted.length > 0)
                ui.info('Fix drift: ai-kit-sf check-drift');
            if (!anyMcpFound)
                ui.info('Bootstrap MCP: ai-kit-sf bootstrap-mcp');
        }
    });
}
//# sourceMappingURL=doctor.js.map

/***/ }),

/***/ 29:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.initCommand = initCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const prompts_1 = __importDefault(__nccwpck_require__(2171));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
const PRESETS = [
    { title: 'core', value: 'core', description: 'Standard Salesforce DX project' },
    { title: 'lwc', value: 'lwc', description: 'Adds extra LWC rules and skills' },
    { title: 'agentforce', value: 'agentforce', description: 'Adds Agentforce / AFV Library support' },
    { title: 'data-cloud', value: 'data-cloud', description: 'Adds Data Cloud docs and rules' },
    { title: 'experience-cloud', value: 'experience-cloud', description: 'Adds Experience Cloud rules' },
];
function initCommand() {
    return new commander_1.Command('init')
        .description('Initialise AI setup for the current Salesforce DX project')
        .option('--path <path>', 'Path to project root (defaults to current directory)')
        .option('--preset <preset>', 'Setup preset: core, lwc, agentforce, data-cloud, experience-cloud')
        .option('--dry-run', 'Preview what would be created without making changes')
        .option('--yes', 'Skip confirmation prompts')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('');
        // Scan first
        ui.info('Scanning project...');
        let scanResult;
        try {
            scanResult = await (0, core_1.scanProject)(rootPath);
        }
        catch (err) {
            ui.error('Scan failed: ' + String(err));
            process.exit(1);
        }
        console.log((0, core_1.generateReadinessReport)(scanResult));
        if (!scanResult.isSalesforceDx) {
            ui.warn('No sfdx-project.json found. AI-Kit works best with Salesforce DX projects.');
            ui.warn('Continuing anyway...');
        }
        // Select preset
        let preset = options.preset ?? 'core';
        if (!options.preset && !options.yes) {
            const response = await (0, prompts_1.default)({
                type: 'select',
                name: 'preset',
                message: 'Select a setup preset:',
                choices: PRESETS.map((p) => ({
                    title: `${p.title} — ${p.description}`,
                    value: p.value,
                })),
                initial: 0,
            });
            if (!response.preset) {
                ui.info('Cancelled.');
                process.exit(0);
            }
            preset = response.preset;
        }
        ui.info(`Using preset: ${preset}${dryRun ? ' (dry run)' : ''}`);
        // Plan
        const plan = await (0, core_1.planSetup)(rootPath, { preset, dryRun });
        const toCreate = plan.files.filter((f) => f.action === 'create');
        const toSkip = plan.files.filter((f) => f.action === 'skip');
        ui.section('Proposed changes:');
        if (toCreate.length > 0) {
            console.log('');
            console.log('  Files to create:');
            for (const f of toCreate) {
                ui.item(`  + ${f.relativePath}`);
            }
        }
        if (toSkip.length > 0) {
            console.log('');
            console.log('  Files to skip (already exist):');
            for (const f of toSkip) {
                ui.item(`  ~ ${f.relativePath}`);
            }
        }
        if (plan.forceIgnoreLines.length > 0) {
            console.log('');
            console.log(`  .forceignore: ${plan.forceIgnoreLines.length} lines to add`);
        }
        if (Object.keys(plan.packageJsonScripts).length > 0) {
            console.log('');
            console.log(`  package.json scripts to add: ${Object.keys(plan.packageJsonScripts).join(', ')}`);
        }
        console.log('');
        if (dryRun) {
            ui.warn('Dry run — no files were created or modified.');
            return;
        }
        // Confirm
        if (!options.yes) {
            const confirm = await (0, prompts_1.default)({
                type: 'confirm',
                name: 'go',
                message: `Apply ${toCreate.length} file(s)? This will not overwrite existing files.`,
                initial: true,
            });
            if (!confirm.go) {
                ui.info('Cancelled.');
                process.exit(0);
            }
        }
        // Apply
        const result = await (0, core_1.applySetup)(rootPath, plan);
        console.log('');
        if (result.filesCreated.length > 0) {
            ui.section('Created:');
            for (const f of result.filesCreated) {
                ui.success(f);
            }
        }
        if (result.filesModified.length > 0) {
            ui.section('Modified:');
            for (const f of result.filesModified) {
                ui.success(f);
            }
        }
        if (result.filesSkipped.length > 0) {
            ui.section('Skipped (already exist):');
            for (const f of result.filesSkipped) {
                ui.info(f);
            }
        }
        if (result.forceIgnoreUpdated) {
            ui.success('.forceignore updated');
        }
        if (result.packageJsonUpdated) {
            ui.success('package.json scripts updated');
        }
        if (result.backupPath) {
            ui.info(`Backup created: ${result.backupPath}`);
        }
        if (result.errors.length > 0) {
            for (const e of result.errors) {
                ui.error(e);
            }
        }
        console.log('');
        ui.success(`AI-Kit setup complete! Your project is now AI-ready.`);
        ui.info('Next steps:');
        ui.item('1. Open AGENTS.md and CLAUDE.md and update the project placeholder sections.');
        ui.item('2. Configure .cursor/mcp.json with your org alias (see docs/mcp-usage.md).');
        ui.item('3. Review docs/skills-ecosystem.md for AFV Library and Jag skill options.');
    });
}
//# sourceMappingURL=init.js.map

/***/ }),

/***/ 8970:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pickSkillCommand = pickSkillCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
function pickSkillCommand() {
    return new commander_1.Command('pick-skill')
        .description('List installed Cursor skills and show the @mention reference for each')
        .option('--path <path>', 'Path to project root')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const skills = await (0, core_1.listInstalledSkills)(rootPath);
        if (skills.length === 0) {
            ui.warn('No Cursor skills found under .cursor/skills/');
            ui.info('Run: ai-kit-sf add-cursor to install AI-Kit skill templates.');
            return;
        }
        ui.header('Installed Cursor Skills');
        console.log('');
        ui.info('Use these @mentions in Cursor chat to invoke a skill:');
        console.log('');
        const maxName = Math.max(...skills.map((s) => s.name.length)) + 1;
        for (const skill of skills) {
            const ref = `@${skill.name}`.padEnd(maxName + 1);
            console.log(`  ${ref}  ${skill.description || '(no description)'}`);
        }
        console.log('');
        ui.info('Example: "@salesforce-apex review this trigger for bulkification issues"');
    });
}
//# sourceMappingURL=pick-skill.js.map

/***/ }),

/***/ 6978:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.scanCommand = scanCommand;
const commander_1 = __nccwpck_require__(7313);
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const ui = __importStar(__nccwpck_require__(1244));
function scanCommand() {
    return new commander_1.Command('scan')
        .description('Scan the current Salesforce DX project and show AI readiness score')
        .option('--path <path>', 'Path to project root (defaults to current directory)')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        try {
            const [result, orgCtx] = await Promise.all([
                (0, core_1.scanProject)(rootPath),
                (0, core_1.readOrgContext)(rootPath),
            ]);
            if (orgCtx.source !== 'none') {
                console.log('');
                ui.info(`Working against org: ${orgCtx.defaultOrg}  (from ${orgCtx.source})`);
            }
            const report = (0, core_1.generateReadinessReport)(result);
            console.log(report);
        }
        catch (err) {
            console.error('Scan failed:', String(err));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=scan.js.map

/***/ }),

/***/ 1244:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.header = header;
exports.success = success;
exports.warn = warn;
exports.error = error;
exports.info = info;
exports.bold = bold;
exports.section = section;
exports.item = item;
const chalk_1 = __importDefault(__nccwpck_require__(2325));
function header(text) {
    console.log('');
    console.log(chalk_1.default.bold.cyan('AI-Kit for Salesforce'));
    console.log(chalk_1.default.gray('─'.repeat(50)));
    if (text)
        console.log(text);
}
function success(msg) {
    console.log(chalk_1.default.green('✓ ' + msg));
}
function warn(msg) {
    console.log(chalk_1.default.yellow('! ' + msg));
}
function error(msg) {
    console.log(chalk_1.default.red('✗ ' + msg));
}
function info(msg) {
    console.log(chalk_1.default.gray('  ' + msg));
}
function bold(msg) {
    console.log(chalk_1.default.bold(msg));
}
function section(msg) {
    console.log('');
    console.log(chalk_1.default.bold(msg));
}
function item(msg) {
    console.log('  ' + msg);
}
//# sourceMappingURL=ui.js.map

/***/ }),

/***/ 4737:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

/**
 * Agentforce context detector.
 * Scans the project for Agentforce-related metadata and provides recommendations.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.detectAgentforceContext = detectAgentforceContext;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const AFV_SKILL_NAMES = [
    'agentforce', 'lightning', 'apex', 'soql', 'lwc', 'flow',
    'permissions', 'objects', 'fields', 'ui-bundle', 'samples',
];
async function detectAfvLibraryInstalled(rootPath) {
    const skillsDir = path.join(rootPath, '.cursor', 'skills');
    if (!(await fs.pathExists(skillsDir)))
        return false;
    try {
        const entries = await fs.readdir(skillsDir);
        return entries.some((e) => AFV_SKILL_NAMES.some((name) => e.toLowerCase().includes(name)));
    }
    catch {
        return false;
    }
}
/**
 * Walk a directory recursively and collect all files matching a predicate.
 */
async function findFiles(dir, predicate) {
    const results = [];
    if (!(await fs.pathExists(dir)))
        return results;
    async function recurse(current) {
        let entries;
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await recurse(fullPath);
            }
            else if (predicate(entry.name)) {
                results.push(fullPath);
            }
        }
    }
    await recurse(dir);
    return results;
}
/**
 * Extract the Apex class name from a .cls file path or content.
 * Falls back to the file basename without extension.
 */
function extractClassName(filePath, content) {
    // Try to find the class declaration
    const match = content.match(/\bclass\s+(\w+)\b/);
    if (match)
        return match[1];
    return path.basename(filePath, '.cls');
}
async function detectAgentforceContext(rootPath) {
    const forceAppDir = path.join(rootPath, 'force-app');
    // Run all scans in parallel
    const [clsFiles, promptFiles, topicFiles, botFiles, afvLibraryInstalled] = await Promise.all([
        findFiles(forceAppDir, (name) => name.endsWith('.cls')),
        findFiles(forceAppDir, (name) => name.endsWith('.prompt-meta.xml')),
        findFiles(forceAppDir, (name) => name.endsWith('.agentTopic-meta.xml')),
        findFiles(forceAppDir, (name) => name.endsWith('.bot-meta.xml')),
        detectAfvLibraryInstalled(rootPath),
    ]);
    // Find classes with @InvocableMethod
    const invocableActions = [];
    await Promise.all(clsFiles.map(async (filePath) => {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            if (/@InvocableMethod\b/i.test(content)) {
                invocableActions.push(extractClassName(filePath, content));
            }
        }
        catch {
            // skip unreadable files
        }
    }));
    // Prompt templates — filename without the double extension
    const promptTemplates = promptFiles.map((f) => path.basename(f).replace('.prompt-meta.xml', ''));
    // Agent topics — merge both kinds
    const agentTopics = [
        ...topicFiles.map((f) => path.basename(f).replace('.agentTopic-meta.xml', '')),
        ...botFiles.map((f) => path.basename(f).replace('.bot-meta.xml', '')),
    ];
    const hasAgentforceMetadata = invocableActions.length > 0 ||
        promptTemplates.length > 0 ||
        agentTopics.length > 0;
    const recommendations = [];
    if (invocableActions.length > 0 && !afvLibraryInstalled) {
        recommendations.push('AFV Library skills available for Agentforce development — run: npx skills add forcedotcom/afv-library');
    }
    if (promptTemplates.length > 0) {
        recommendations.push('Review Prompt Templates for security — use /review-security command');
    }
    return {
        hasAgentforceMetadata,
        invocableActions,
        promptTemplates,
        agentTopics,
        afvLibraryInstalled,
        recommendations,
    };
}
//# sourceMappingURL=agentforce-detector.js.map

/***/ }),

/***/ 6616:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.applySetup = applySetup;
const path = __importStar(__nccwpck_require__(6928));
const fs = __importStar(__nccwpck_require__(1348));
const templates_1 = __nccwpck_require__(9639);
const safe_write_1 = __nccwpck_require__(6157);
const backup_1 = __nccwpck_require__(3452);
async function applySetup(rootPath, plan) {
    const result = {
        filesCreated: [],
        filesModified: [],
        filesSkipped: [],
        packageJsonUpdated: false,
        forceIgnoreUpdated: false,
        errors: [],
    };
    // Collect existing files that will be modified for backup
    const filesToBackup = [];
    for (const planned of plan.files) {
        if (planned.action !== 'create') {
            filesToBackup.push(path.join(rootPath, planned.relativePath));
        }
    }
    if (plan.forceIgnoreLines.length > 0) {
        const fi = path.join(rootPath, '.forceignore');
        if (await fs.pathExists(fi))
            filesToBackup.push(fi);
    }
    if (Object.keys(plan.packageJsonScripts).length > 0) {
        filesToBackup.push(path.join(rootPath, 'package.json'));
    }
    if (!plan.dryRun && filesToBackup.length > 0) {
        try {
            const backupPath = await (0, backup_1.createBackup)(rootPath, filesToBackup);
            result.backupPath = backupPath;
        }
        catch (err) {
            result.errors.push(`Backup failed: ${String(err)}`);
        }
    }
    // Apply file operations
    for (const planned of plan.files) {
        if (planned.action === 'skip') {
            result.filesSkipped.push(planned.relativePath);
            continue;
        }
        const fullPath = path.join(rootPath, planned.relativePath);
        const content = templates_1.TEMPLATES[planned.templateKey] ?? `# ${planned.relativePath}\n\n<!-- TODO: Add content -->\n`;
        try {
            const writeResult = await (0, safe_write_1.writeFileSafe)(fullPath, content, { dryRun: plan.dryRun });
            if (writeResult.action === 'create') {
                result.filesCreated.push(planned.relativePath);
            }
            else if (writeResult.action === 'append' || writeResult.action === 'merge') {
                result.filesModified.push(planned.relativePath);
            }
            else {
                result.filesSkipped.push(planned.relativePath);
            }
        }
        catch (err) {
            result.errors.push(`Failed to write ${planned.relativePath}: ${String(err)}`);
        }
    }
    // Update .forceignore
    if (plan.forceIgnoreLines.length > 0) {
        try {
            const fiPath = path.join(rootPath, '.forceignore');
            if (!plan.dryRun) {
                await (0, safe_write_1.appendMissingLines)(fiPath, plan.forceIgnoreLines);
            }
            result.forceIgnoreUpdated = true;
        }
        catch (err) {
            result.errors.push(`Failed to update .forceignore: ${String(err)}`);
        }
    }
    // Update package.json scripts
    if (Object.keys(plan.packageJsonScripts).length > 0) {
        try {
            if (!plan.dryRun) {
                const added = await (0, safe_write_1.mergePackageJsonScripts)(rootPath, plan.packageJsonScripts);
                result.packageJsonUpdated = added.length > 0;
            }
            else {
                result.packageJsonUpdated = true;
            }
        }
        catch (err) {
            result.errors.push(`Failed to update package.json: ${String(err)}`);
        }
    }
    return result;
}
//# sourceMappingURL=apply.js.map

/***/ }),

/***/ 3452:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createBackup = createBackup;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
function timestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return (`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-` +
        `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`);
}
async function createBackup(rootPath, filePaths) {
    const backupDir = path.join(rootPath, '.ai-kit-salesforce-backup', timestamp());
    await fs.ensureDir(backupDir);
    for (const filePath of filePaths) {
        const exists = await fs.pathExists(filePath);
        if (!exists)
            continue;
        const relativePath = path.relative(rootPath, filePath);
        const backupFilePath = path.join(backupDir, relativePath + '.bak');
        await fs.ensureDir(path.dirname(backupFilePath));
        await fs.copy(filePath, backupFilePath);
    }
    return backupDir;
}
//# sourceMappingURL=backup.js.map

/***/ }),

/***/ 3994:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/**
 * Generates the salesforce-dx.json claude-mem mode file.
 * Drop it in the claude-mem plugin/modes/ directory to teach claude-mem
 * to capture Salesforce-specific observations across sessions.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SALESFORCE_DX_MODE = void 0;
exports.generateClaudeMemModeJson = generateClaudeMemModeJson;
exports.SALESFORCE_DX_MODE = {
    name: 'salesforce-dx',
    description: 'Captures Salesforce DX development observations — Apex patterns, deployment decisions, org config, MCP operations, security rules, and permission model choices.',
    version: '1.0.0',
    observation_types: [
        {
            id: 'apex-pattern',
            label: 'Apex Pattern',
            description: 'A reusable Apex design decision — service layer, trigger handler, selector, domain pattern, bulk handling approach, or async strategy.',
            emoji: '⚡',
            work_emoji: '🔨',
        },
        {
            id: 'deployment-issue',
            label: 'Deployment Issue',
            description: 'A deployment decision, validation error, test failure, coverage gap, or rollback action encountered during deployment.',
            emoji: '🚀',
            work_emoji: '🔧',
        },
        {
            id: 'permission-rule',
            label: 'Permission Rule',
            description: 'A decision about Permission Sets, Profiles, CRUD/FLS enforcement, sharing rules, or guest user access configuration.',
            emoji: '🔒',
            work_emoji: '🛡️',
        },
        {
            id: 'org-config',
            label: 'Org Config',
            description: 'An org alias, scratch org definition, sandbox configuration, Connected App setting, Named Credential setup, or remote site setting.',
            emoji: '🏢',
            work_emoji: '⚙️',
        },
        {
            id: 'mcp-operation',
            label: 'MCP Operation',
            description: 'A Salesforce DX MCP tool use — org query, metadata retrieval, deployment via MCP, SOQL run, or LWC expert guidance call.',
            emoji: '🤖',
            work_emoji: '🔗',
        },
        {
            id: 'security-finding',
            label: 'Security Finding',
            description: 'A SOQL injection risk, missing CRUD/FLS check, sharing violation, exposed credential, guest user gap, or production safety concern.',
            emoji: '🚨',
            work_emoji: '🔍',
        },
        {
            id: 'lwc-decision',
            label: 'LWC Decision',
            description: 'A Lightning Web Component design choice — wire adapter selection, component decomposition, state management, Apex integration pattern, or UX state handling.',
            emoji: '⚡',
            work_emoji: '🎨',
        },
        {
            id: 'test-strategy',
            label: 'Test Strategy',
            description: 'An Apex test design decision — test data strategy, mock approach, coverage gap fix, bulk test pattern, or security test scenario.',
            emoji: '🧪',
            work_emoji: '✅',
        },
        {
            id: 'agentforce-pattern',
            label: 'Agentforce Pattern',
            description: 'An Agentforce agent design decision — topic scope, invocable action design, Prompt Template approach, or AFV Library skill usage.',
            emoji: '🧠',
            work_emoji: '🤖',
        },
    ],
    observation_concepts: [
        {
            id: 'governor-limit',
            label: 'Governor Limit',
            description: 'Relates to Apex governor limits — SOQL rows, DML statements, CPU time, heap size.',
        },
        {
            id: 'security-critical',
            label: 'Security Critical',
            description: 'Relates to CRUD/FLS, sharing, SOQL injection, secrets, or production safety.',
        },
        {
            id: 'production-risk',
            label: 'Production Risk',
            description: 'Affects production org — deployment, permission change, data mutation, or metadata deletion.',
        },
        {
            id: 'reusable-pattern',
            label: 'Reusable Pattern',
            description: 'A pattern worth applying to other areas of the codebase.',
        },
        {
            id: 'mcp-preferred',
            label: 'MCP Preferred',
            description: 'This operation should use Salesforce DX MCP rather than CLI commands.',
        },
        {
            id: 'org-specific',
            label: 'Org Specific',
            description: 'Only applies to a particular org alias, sandbox, or production configuration.',
        },
        {
            id: 'ai-kit-generated',
            label: 'AI-Kit Generated',
            description: 'Created or modified by AI-Kit for Salesforce scaffold.',
        },
    ],
    prompts: {
        system_identity: 'You are a senior Salesforce DX observer embedded in the development session. ' +
            'Your role is to capture high-signal observations about Salesforce Apex patterns, ' +
            'deployment decisions, permission model choices, org configuration, MCP operations, ' +
            'and security findings. You help the team build institutional memory about this org.',
        spatial_awareness: 'This is a Salesforce DX project. Source lives under force-app/. ' +
            'The team uses sf CLI, Salesforce DX MCP, Cursor with project rules, ' +
            'Claude Code with CLAUDE.md rules, and AI-Kit for Salesforce scaffolding. ' +
            'Org operations prefer MCP over direct CLI. Production is read-only by default.',
        observer_role: 'Observe the development session and capture decisions that would be valuable to remember ' +
            'across sessions — especially patterns that are non-obvious, project-specific, or that ' +
            'took effort to figure out. Prioritise: Apex design patterns, deployment learnings, ' +
            'security decisions, org-specific configuration, and MCP operation results.',
        recording_focus: 'Focus on: Apex patterns (bulkification, service layer, trigger handler), ' +
            'deployment outcomes (what failed, what worked, why), ' +
            'permission model decisions (which Permission Sets, which CRUD/FLS patterns), ' +
            'org config (org aliases, Connected Apps, Named Credentials), ' +
            'MCP operations (what was queried, what was deployed), ' +
            'security findings (SOQL injection risks, sharing decisions), ' +
            'LWC decisions (wire adapters, component decomposition), ' +
            'test strategies (test data approach, coverage gaps fixed).',
        skip_guidance: 'Skip: trivial variable renames, minor formatting changes, ' +
            'obvious syntax fixes that are not project-specific, ' +
            'standard boilerplate that any Salesforce developer would know, ' +
            'and file saves without meaningful code changes.',
        type_guidance: 'Use apex-pattern for any reusable Apex design decision. ' +
            'Use deployment-issue for any deployment action, validation result, or test failure. ' +
            'Use permission-rule for any CRUD/FLS, sharing, or Permission Set decision. ' +
            'Use org-config for any org alias, auth, or integration configuration. ' +
            'Use mcp-operation when MCP tools are used for org interaction. ' +
            'Use security-finding for any security risk identified or resolved. ' +
            'Use lwc-decision for any LWC design or integration choice. ' +
            'Use test-strategy for any test design or coverage decision. ' +
            'Use agentforce-pattern for any Agentforce agent or invocable action design.',
        concept_guidance: 'Tag governor-limit for anything that could hit Apex limits. ' +
            'Tag security-critical for CRUD/FLS, sharing, injection, or secrets. ' +
            'Tag production-risk for anything affecting production org. ' +
            'Tag reusable-pattern for patterns worth applying elsewhere. ' +
            'Tag mcp-preferred when MCP should be used instead of CLI. ' +
            'Tag org-specific when the observation only applies to one org.',
        field_guidance: 'Include the org alias when known. ' +
            'Reference the specific Apex class, trigger, or component when relevant. ' +
            'Include the sf CLI or MCP command used when it is part of the observation. ' +
            'Note whether this applies to sandbox, scratch org, or production.',
    },
};
function generateClaudeMemModeJson() {
    return JSON.stringify(exports.SALESFORCE_DX_MODE, null, 2) + '\n';
}
//# sourceMappingURL=claude-mem-mode.js.map

/***/ }),

/***/ 3736:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

/**
 * Org-aware deploy diff preview.
 * Walks the source directory, classifies components by file extension/name,
 * reads org context, and assembles a deploy preview report.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildDeployPreview = buildDeployPreview;
exports.formatDeployPreview = formatDeployPreview;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const org_context_1 = __nccwpck_require__(140);
// ─── File extension → component type mapping ──────────────────────────────
function classifyFile(filePath, relativePath) {
    const basename = path.basename(filePath);
    const name = basename.replace(/\.[^.]+$/, '').replace(/\.[^.]+$/, ''); // strip double extension
    if (basename.endsWith('.cls')) {
        return { name: basename.replace('.cls', ''), type: 'ApexClass', filePath: relativePath };
    }
    if (basename.endsWith('.trigger')) {
        return { name: basename.replace('.trigger', ''), type: 'ApexTrigger', filePath: relativePath };
    }
    if (basename.endsWith('.js') && filePath.includes(`${path.sep}lwc${path.sep}`)) {
        // Only count the component folder once — use the JS file as the representative
        const parts = filePath.split(path.sep);
        const lwcIdx = parts.lastIndexOf('lwc');
        const compName = lwcIdx !== -1 ? parts[lwcIdx + 1] : name;
        // Only emit for the main component JS (same name as folder)
        if (basename === `${compName}.js`) {
            return { name: compName, type: 'LightningComponentBundle', filePath: relativePath };
        }
        return null;
    }
    if (basename.endsWith('.flow-meta.xml')) {
        return { name: basename.replace('.flow-meta.xml', ''), type: 'Flow', filePath: relativePath };
    }
    if (basename.endsWith('-meta.xml')) {
        if (basename.toLowerCase().includes('permissionset')) {
            return { name: basename.replace('-meta.xml', ''), type: 'PermissionSet', filePath: relativePath };
        }
        if (basename.toLowerCase().includes('profile')) {
            return { name: basename.replace('-meta.xml', ''), type: 'Profile', filePath: relativePath };
        }
    }
    // Fall-through — check parent directory name conventions for meta.xml files
    if (basename.endsWith('.permissionset-meta.xml')) {
        return { name: basename.replace('.permissionset-meta.xml', ''), type: 'PermissionSet', filePath: relativePath };
    }
    if (basename.endsWith('.profile-meta.xml')) {
        return { name: basename.replace('.profile-meta.xml', ''), type: 'Profile', filePath: relativePath };
    }
    return null;
}
async function walkDir(dir, rootPath) {
    const components = [];
    if (!(await fs.pathExists(dir)))
        return components;
    async function recurse(current) {
        let entries;
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await recurse(fullPath);
            }
            else {
                const relativePath = path.relative(rootPath, fullPath);
                const component = classifyFile(fullPath, relativePath);
                if (component) {
                    components.push(component);
                }
            }
        }
    }
    await recurse(dir);
    return components;
}
async function hasDestructiveChanges(rootPath) {
    // Check common locations for destructiveChanges.xml
    const candidates = [
        path.join(rootPath, 'destructiveChanges.xml'),
        path.join(rootPath, 'force-app', 'destructiveChanges.xml'),
        path.join(rootPath, 'manifest', 'destructiveChanges.xml'),
        path.join(rootPath, 'destructiveChangesPre.xml'),
        path.join(rootPath, 'destructiveChangesPost.xml'),
    ];
    const results = await Promise.all(candidates.map((c) => fs.pathExists(c)));
    return results.some(Boolean);
}
/**
 * Build a deploy preview for the given project root.
 * All found components are treated as "to add" (we don't have org-side state without auth).
 */
async function buildDeployPreview(options) {
    const { rootPath, sourceDir = 'force-app' } = options;
    const sourceDirPath = path.join(rootPath, sourceDir);
    // Resolve org context
    const orgCtx = await (0, org_context_1.readOrgContext)(rootPath);
    const resolvedOrg = options.targetOrg ?? orgCtx.defaultOrg ?? orgCtx.targetOrg ?? 'unknown';
    const lowerOrg = resolvedOrg.toLowerCase();
    const isProduction = lowerOrg === 'production' ||
        lowerOrg === 'prod' ||
        lowerOrg.includes('production') ||
        lowerOrg.includes('prod');
    // Walk source directory
    const components = await walkDir(sourceDirPath, rootPath);
    const risks = [];
    // Profile detection
    const hasProfiles = components.some((c) => c.type === 'Profile');
    if (hasProfiles) {
        risks.push('Profile metadata detected — consider using Permission Sets instead');
    }
    // Destructive changes detection
    const hasDestructive = await hasDestructiveChanges(rootPath);
    if (hasDestructive) {
        risks.push('Destructive changes file found — review before deploying');
    }
    // Flow detection
    const hasFlows = components.some((c) => c.type === 'Flow');
    if (hasFlows) {
        risks.push('Flow metadata included — test in sandbox first');
    }
    // Production warning
    if (isProduction) {
        risks.push('⚠ Target org appears to be production — explicit confirmation required');
    }
    const validationCommand = `sf project deploy validate --source-dir ${sourceDir} --test-level RunLocalTests --wait 60`;
    const deployCommand = `sf project deploy start --source-dir ${sourceDir} --test-level RunLocalTests --wait 60`;
    return {
        targetOrg: resolvedOrg,
        isProduction,
        componentsToAdd: components,
        componentsToModify: [],
        componentsToDelete: [],
        risks,
        validationCommand,
        deployCommand,
    };
}
/**
 * Returns a markdown-formatted string suitable for a VS Code webview.
 */
function formatDeployPreview(result) {
    const lines = [];
    lines.push('# Deploy Preview');
    lines.push('');
    lines.push(`**Target Org:** ${result.targetOrg}${result.isProduction ? ' ⚠ (PRODUCTION)' : ''}`);
    lines.push('');
    // Component counts by type
    const byType = new Map();
    for (const c of result.componentsToAdd) {
        byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
    }
    for (const c of result.componentsToModify) {
        byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
    }
    const totalComponents = result.componentsToAdd.length +
        result.componentsToModify.length +
        result.componentsToDelete.length;
    lines.push(`## Components (${totalComponents} total)`);
    lines.push('');
    if (byType.size > 0) {
        lines.push('| Type | Count |');
        lines.push('|------|-------|');
        for (const [type, count] of [...byType.entries()].sort()) {
            lines.push(`| ${type} | ${count} |`);
        }
    }
    else {
        lines.push('_No components found in source directory._');
    }
    lines.push('');
    if (result.componentsToAdd.length > 0) {
        lines.push('### Components to Add');
        lines.push('');
        for (const c of result.componentsToAdd) {
            lines.push(`- **${c.name}** (${c.type}) — \`${c.filePath}\``);
        }
        lines.push('');
    }
    if (result.componentsToModify.length > 0) {
        lines.push('### Components to Modify');
        lines.push('');
        for (const c of result.componentsToModify) {
            lines.push(`- **${c.name}** (${c.type}) — \`${c.filePath}\``);
        }
        lines.push('');
    }
    if (result.componentsToDelete.length > 0) {
        lines.push('### Components to Delete');
        lines.push('');
        for (const c of result.componentsToDelete) {
            lines.push(`- **${c.name}** (${c.type}) — \`${c.filePath}\``);
        }
        lines.push('');
    }
    if (result.risks.length > 0) {
        lines.push('## Risks');
        lines.push('');
        for (const risk of result.risks) {
            lines.push(`- ${risk}`);
        }
        lines.push('');
    }
    lines.push('## Commands');
    lines.push('');
    lines.push('**Validate:**');
    lines.push('```sh');
    lines.push(result.validationCommand);
    lines.push('```');
    lines.push('');
    lines.push('**Deploy:**');
    lines.push('```sh');
    lines.push(result.deployCommand);
    lines.push('```');
    return lines.join('\n');
}
//# sourceMappingURL=deploy-preview.js.map

/***/ }),

/***/ 4546:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FILE_SIGNALS = void 0;
exports.detectDrift = detectDrift;
exports.checkTeamSync = checkTeamSync;
exports.fetchTeamConfig = fetchTeamConfig;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
/** Key phrases that must be present in a file for it to be considered current */
const FILE_SIGNALS = {
    'CLAUDE.md': [
        'Workflow Orchestration',
        'Plan Mode Default',
        'Self-Improvement Loop',
        'Verification Before Done',
        'tasks/todo.md',
    ],
    '.cursor/rules/project.mdc': [
        'Plan Mode Default',
        'tasks/todo.md',
        'tasks/lessons.md',
        'Definition of Done',
    ],
    '.cursor/rules/apex.mdc': [
        'Bulkify',
        'SOQL or DML inside loops',
        'with sharing',
        'CRUD/FLS',
    ],
    '.cursor/rules/safety.mdc': [
        'Never expose secrets',
        'Named Credentials',
        'anonymous Apex',
    ],
    '.cursor/rules/salesforce-mcp.mdc': [
        'MCP',
        'read-only mode for production',
        'confirm the target org alias',
    ],
    'AGENTS.md': [
        'Salesforce DX Structure',
        'Deployment Safety Rules',
        'AI Tool Usage Rules',
    ],
};
exports.FILE_SIGNALS = FILE_SIGNALS;
/** Check local files for the tracked key-phrase signals */
async function detectDrift(rootPath, filesToCheck) {
    const targets = filesToCheck ?? Object.keys(FILE_SIGNALS);
    const drifted = [];
    const missing = [];
    const upToDate = [];
    await Promise.all(targets.map(async (relativePath) => {
        const fullPath = path.join(rootPath, relativePath);
        const signals = FILE_SIGNALS[relativePath];
        if (!signals)
            return; // no signals defined — skip
        const exists = await fs.pathExists(fullPath);
        if (!exists) {
            missing.push(relativePath);
            return;
        }
        const content = await fs.readFile(fullPath, 'utf8');
        const missingSignals = signals.filter((s) => !content.includes(s));
        if (missingSignals.length > 0) {
            drifted.push({
                relativePath,
                reason: `Missing ${missingSignals.length} expected section(s) from current AI-Kit template`,
                missingSignals: missingSignals.slice(0, 3),
            });
        }
        else {
            upToDate.push(relativePath);
        }
    }));
    return { drifted, missing, upToDate };
}
async function checkTeamSync(rootPath, teamConfig) {
    const mergedSignals = {
        ...FILE_SIGNALS,
        ...(teamConfig.signals ?? {}),
    };
    const allTargets = [
        ...new Set([...Object.keys(mergedSignals), ...teamConfig.requiredFiles]),
    ];
    const drift = await detectDrift(rootPath, allTargets);
    // Also check required files that aren't in signals
    for (const f of teamConfig.requiredFiles) {
        if (!FILE_SIGNALS[f] && !(teamConfig.signals?.[f])) {
            const exists = await fs.pathExists(path.join(rootPath, f));
            if (!exists && !drift.missing.includes(f)) {
                drift.missing.push(f);
            }
            else if (exists && !drift.upToDate.includes(f) && !drift.drifted.find((d) => d.relativePath === f)) {
                drift.upToDate.push(f);
            }
        }
    }
    const issues = drift.drifted.length + drift.missing.length;
    const summary = issues === 0
        ? `In sync with team config v${teamConfig.version}. All ${drift.upToDate.length} tracked file(s) up to date.`
        : `${issues} issue(s) found vs team config v${teamConfig.version}. ${drift.drifted.length} drifted, ${drift.missing.length} missing.`;
    return {
        configVersion: teamConfig.version,
        drifted: drift.drifted,
        missing: drift.missing,
        upToDate: drift.upToDate,
        summary,
    };
}
/** Fetch a team config from a URL (for CLI/extension use). Returns null on failure. */
async function fetchTeamConfig(url) {
    try {
        // Use global fetch (Node 18+) or fall back gracefully
        const fetchFn = typeof globalThis.fetch === 'function'
            ? globalThis.fetch
            : // eslint-disable-next-line @typescript-eslint/no-var-requires
                (__nccwpck_require__(7009)["default"]);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await fetchFn(url, { signal: controller.signal });
            if (!res.ok)
                return null;
            return (await res.json());
        }
        finally {
            clearTimeout(timeout);
        }
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=drift-detector.js.map

/***/ }),

/***/ 5046:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/**
 * Provides hover explanation content for AI-Kit diagnostics.
 * Maps diagnostic ruleFile → human-readable explanation with a link to the rule file.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getHoverContent = getHoverContent;
// ─── Lookup table keyed by ruleId or message keyword ──────────────────────
const RULE_ENTRIES = {
    // ── apex.mdc rules ────────────────────────────────────────────────────────
    'no-soql-in-loop': {
        title: 'SOQL inside a loop (no-soql-in-loop)',
        explanation: 'Executing SOQL queries inside loops causes N+1 database query problems and will hit Salesforce governor limits (max 100 SOQL queries per transaction). Always bulk-query before the loop.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Move the SOQL query outside the loop. Collect all required IDs first, then query in bulk using a WHERE ... IN :ids clause.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm',
    },
    'no-dml-in-loop': {
        title: 'DML inside a loop (no-dml-in-loop)',
        explanation: 'Performing DML (insert/update/delete/upsert) inside loops hits the Salesforce governor limit of 150 DML statements per transaction and causes poor performance.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Collect records in a List inside the loop, then perform a single bulk DML operation (e.g. insert recordList) after the loop completes.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm',
    },
    'missing-sharing-declaration': {
        title: 'Missing sharing declaration (missing-sharing-declaration)',
        explanation: 'Apex classes without an explicit sharing keyword default to `without sharing` behavior in some contexts, which can expose records the running user should not see. Always declare sharing mode explicitly.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Add `with sharing` to your class declaration: `public with sharing class MyClass`. Use `without sharing` only when you have a documented business reason.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_keywords_sharing.htm',
    },
    'no-without-sharing-bypass': {
        title: 'Undocumented without sharing bypass (no-without-sharing-bypass)',
        explanation: '`without sharing` grants the code system-level record access regardless of the running user\'s permissions. This is a security-sensitive decision that must be justified.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Add a comment on the line before the class declaration explaining why `without sharing` is required, e.g.: `// Intentionally without sharing — bulk data processing job runs in system context`.',
    },
    'no-hardcoded-id': {
        title: 'Hardcoded Salesforce ID (no-hardcoded-id)',
        explanation: 'Hardcoded IDs are org-specific and will break when code is deployed to a different sandbox or production. They also make automated testing impossible.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Replace hardcoded IDs with Custom Metadata Types, Custom Settings, or pass the ID as a parameter. Example: `MyConfig__mdt.getInstance(\'Default\').RecordId__c`.',
    },
    'missing-test-setup': {
        title: 'Missing @TestSetup method (missing-test-setup)',
        explanation: 'Test classes with multiple test methods that each create their own data can be slow and brittle. A shared @TestSetup method creates data once and is rolled back between tests.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Add a static `@TestSetup` method to create shared test data once:\n```apex\n@TestSetup\nstatic void makeData() {\n  // insert shared test records\n}\n```',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_testing_testsetup_annotation.htm',
    },
    'no-seealldata': {
        title: 'SeeAllData=true is dangerous (no-seealldata)',
        explanation: '`SeeAllData=true` allows tests to access real org data, making tests fragile, environment-dependent, and a potential data security risk. Tests should create their own data.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Remove `SeeAllData=true` from `@IsTest(SeeAllData=true)`. Use `@TestSetup` or test factory classes to create isolated test data instead.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_testing_seealldata_using.htm',
    },
    'no-naked-catch': {
        title: 'Empty catch block (no-naked-catch)',
        explanation: 'Empty catch blocks silently swallow exceptions, making bugs invisible. They hide problems that could corrupt data or leave transactions in an inconsistent state.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Always handle exceptions explicitly:\n```apex\ncatch (Exception e) {\n  System.debug(LoggingLevel.ERROR, \'Error: \' + e.getMessage());\n  throw e; // or AuraHandledException, etc.\n}\n```',
    },
    // ── lwc.mdc rules ─────────────────────────────────────────────────────────
    'no-console-log': {
        title: 'console.log() in LWC (no-console-log)',
        explanation: 'console.log and related methods left in production LWC code clutter browser dev-tools, can expose sensitive data, and fail security reviews. Use a custom logger service instead.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Remove the console statement or replace with a lwc/logger import, e.g.:\n```js\nimport { createLogger } from \'c/logger\';\nconst logger = createLogger();\nlogger.info(\'message\');\n```',
    },
    'no-inner-html': {
        title: 'innerHTML assignment in LWC (no-inner-html)',
        explanation: 'Setting innerHTML directly in an LWC component bypasses the Locker Service sandbox and creates XSS vulnerabilities. LWC\'s template engine already escapes values safely.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Use LWC template bindings ({property}) or lightning-formatted-rich-text for user content. If you need dynamic HTML, sanitize with DOMPurify first.',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/security-locker-service.html',
    },
    'no-hardcoded-url': {
        title: 'Hardcoded Salesforce URL (no-hardcoded-url)',
        explanation: 'Hardcoded /apex/, /lightning/, or /setup/ URLs break across Experience Cloud sites, sandbox migrations, and org renames. They also fail when the org\'s My Domain changes.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Use NavigationMixin for navigation:\n```js\nimport { NavigationMixin } from \'lightning/navigation\';\nthis[NavigationMixin.Navigate]({ type: \'standard__recordPage\', ... });\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/use-navigate-basic.html',
    },
    'missing-wire-error-handler': {
        title: 'Missing @wire error handler (missing-wire-error-handler)',
        explanation: '@wire adapters can fail if the user lacks permissions, the record doesn\'t exist, or the network is unavailable. Without error handling, the component silently shows blank content.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Destructure both data and error from the wired property:\n```js\n@wire(getRecord, { recordId: \'$recordId\', fields })\nwiredRecord({ data, error }) {\n  if (error) { this.error = error; }\n  else if (data) { this.record = data; }\n}\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/wire-service-component.html',
    },
    'missing-key-iterator': {
        title: 'Missing key in for:each (missing-key-iterator)',
        explanation: 'LWC requires a unique key= attribute on the direct child of for:each iterators. Without it, LWC cannot efficiently reconcile the DOM when the list changes, causing rendering bugs.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Add key={item.Id} (or another unique field) to the direct child element:\n```html\n<template for:each={items} for:item="item">\n  <c-my-item key={item.Id} item={item}></c-my-item>\n</template>\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/create-render-list.html',
    },
    'no-aura-syntax': {
        title: 'Aura syntax in LWC template (no-aura-syntax)',
        explanation: 'aura:* tags and attributes are only valid in Aura components. Using them in LWC templates causes runtime errors and will not compile.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Replace Aura equivalents: aura:if → lwc:if, aura:iteration → for:each, aura:attribute → @api property.',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/migrate-aura-to-lwc.html',
    },
    'no-onclick-inline': {
        title: 'Inline onclick string in LWC template (no-onclick-inline)',
        explanation: 'LWC requires event bindings to be expressions, not strings. onclick="handler()" is HTML syntax that won\'t work in LWC and may raise a compile error.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Use LWC expression binding:\n```html\n<!-- Wrong -->\n<button onclick="handleClick()">Click</button>\n<!-- Right -->\n<button onclick={handleClick}>Click</button>\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/events-add-handler.html',
    },
    // ── safety.mdc rules ──────────────────────────────────────────────────────
    'no-debug-pii': {
        title: 'PII / credentials in debug log (no-debug-pii)',
        explanation: 'Logging sensitive data (passwords, tokens, SSNs, email addresses, credit card info) creates compliance and security risks. Salesforce debug logs can be accessed by admins.',
        ruleFile: '.cursor/rules/safety.mdc',
        fixSuggestion: 'Remove sensitive data from debug statements. If you must debug auth issues, log only non-sensitive identifiers, not the actual secret values.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_debug_log.htm',
    },
};
// ─── Rule-file fallback tables ─────────────────────────────────────────────
const RULEFILE_DEFAULTS = {
    '.cursor/rules/apex.mdc': {
        explanation: 'This diagnostic is governed by the Apex coding rules defined in your project.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Open the rule file for detailed guidance.',
    },
    '.cursor/rules/safety.mdc': {
        explanation: 'This diagnostic is governed by the security and safety rules defined in your project.',
        ruleFile: '.cursor/rules/safety.mdc',
        fixSuggestion: 'Review the safety rule file and ensure no sensitive data is exposed.',
    },
    '.cursor/rules/deployment.mdc': {
        explanation: 'This diagnostic is governed by the deployment safety rules defined in your project.',
        ruleFile: '.cursor/rules/deployment.mdc',
        fixSuggestion: 'Review the deployment rule file before proceeding.',
    },
    '.cursor/rules/lwc.mdc': {
        explanation: 'This diagnostic is governed by the LWC development rules defined in your project.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Review the LWC rule file and follow component best practices.',
    },
};
/**
 * Returns appropriate HoverContent based on ruleId (preferred), message patterns, or ruleFile fallback.
 */
function getHoverContent(ruleFile, message, ruleId) {
    // Direct ruleId lookup — fastest and most precise
    if (ruleId && RULE_ENTRIES[ruleId])
        return RULE_ENTRIES[ruleId];
    // Match by specific message patterns (for callers that don't pass ruleId)
    if (/SOQL query inside a loop/i.test(message))
        return RULE_ENTRIES['no-soql-in-loop'];
    if (/DML operation.*inside a loop/i.test(message))
        return RULE_ENTRIES['no-dml-in-loop'];
    if (/SeeAllData/i.test(message))
        return RULE_ENTRIES['no-seealldata'];
    if (/Empty catch block/i.test(message))
        return RULE_ENTRIES['no-naked-catch'];
    if (/hardcoded Salesforce ID/i.test(message))
        return RULE_ENTRIES['no-hardcoded-id'];
    if (/without sharing.*explanatory comment/i.test(message))
        return RULE_ENTRIES['no-without-sharing-bypass'];
    if (/Class declared without sharing/i.test(message))
        return RULE_ENTRIES['missing-sharing-declaration'];
    if (/@TestSetup/i.test(message))
        return RULE_ENTRIES['missing-test-setup'];
    if (/Debug statement may log sensitive/i.test(message))
        return RULE_ENTRIES['no-debug-pii'];
    if (/console\.\w+\(\) found/i.test(message))
        return RULE_ENTRIES['no-console-log'];
    if (/innerHTML assignment/i.test(message))
        return RULE_ENTRIES['no-inner-html'];
    if (/Hardcoded Salesforce URL/i.test(message))
        return RULE_ENTRIES['no-hardcoded-url'];
    if (/@wire adapter used without error/i.test(message))
        return RULE_ENTRIES['missing-wire-error-handler'];
    if (/for:each iterator is missing a key/i.test(message))
        return RULE_ENTRIES['missing-key-iterator'];
    if (/Aura syntax.*in an LWC/i.test(message))
        return RULE_ENTRIES['no-aura-syntax'];
    if (/Inline onclick/i.test(message))
        return RULE_ENTRIES['no-onclick-inline'];
    // Fall back to rule-file-level defaults
    const ruleFileDefault = RULEFILE_DEFAULTS[ruleFile];
    if (ruleFileDefault) {
        return {
            title: `AI-Kit Diagnostic (${ruleFile})`,
            ...ruleFileDefault,
        };
    }
    // Generic fallback
    return {
        title: 'AI-Kit Diagnostic',
        explanation: 'This location was flagged by an AI-Kit rule check.',
        ruleFile: ruleFile || 'unknown',
        fixSuggestion: 'Review the flagged code and the associated rule file for guidance.',
    };
}
//# sourceMappingURL=hover-provider.js.map

/***/ }),

/***/ 6808:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SALESFORCE_DX_MODE = exports.generateClaudeMemModeJson = exports.detectAgentforceContext = exports.formatDeployPreview = exports.buildDeployPreview = exports.getHoverContent = exports.getDiagnosticSummary = exports.detectFileType = exports.analyseFile = exports.skillToPickItem = exports.formatSkillReference = exports.listInstalledSkills = exports.validateMcpConfig = exports.bootstrapMcp = exports.buildMcpConfig = exports.FILE_SIGNALS = exports.fetchTeamConfig = exports.checkTeamSync = exports.detectDrift = exports.formatOrgContext = exports.readOrgContext = exports.wrapInMarker = exports.hasTemplate = exports.getTemplate = exports.MARKER_END = exports.MARKER_START = exports.TEMPLATES = exports.generateReadinessReport = exports.writeFileSafe = exports.appendMissingLines = exports.mergePackageJsonScripts = exports.createBackup = exports.applySetup = exports.planSetup = exports.scanProject = void 0;
var scanner_1 = __nccwpck_require__(9774);
Object.defineProperty(exports, "scanProject", ({ enumerable: true, get: function () { return scanner_1.scanProject; } }));
var planner_1 = __nccwpck_require__(5816);
Object.defineProperty(exports, "planSetup", ({ enumerable: true, get: function () { return planner_1.planSetup; } }));
var apply_1 = __nccwpck_require__(6616);
Object.defineProperty(exports, "applySetup", ({ enumerable: true, get: function () { return apply_1.applySetup; } }));
var backup_1 = __nccwpck_require__(3452);
Object.defineProperty(exports, "createBackup", ({ enumerable: true, get: function () { return backup_1.createBackup; } }));
var safe_write_1 = __nccwpck_require__(6157);
Object.defineProperty(exports, "mergePackageJsonScripts", ({ enumerable: true, get: function () { return safe_write_1.mergePackageJsonScripts; } }));
Object.defineProperty(exports, "appendMissingLines", ({ enumerable: true, get: function () { return safe_write_1.appendMissingLines; } }));
Object.defineProperty(exports, "writeFileSafe", ({ enumerable: true, get: function () { return safe_write_1.writeFileSafe; } }));
var reporter_1 = __nccwpck_require__(6591);
Object.defineProperty(exports, "generateReadinessReport", ({ enumerable: true, get: function () { return reporter_1.generateReadinessReport; } }));
__exportStar(__nccwpck_require__(5117), exports);
var templates_1 = __nccwpck_require__(9639);
Object.defineProperty(exports, "TEMPLATES", ({ enumerable: true, get: function () { return templates_1.TEMPLATES; } }));
Object.defineProperty(exports, "MARKER_START", ({ enumerable: true, get: function () { return templates_1.MARKER_START; } }));
Object.defineProperty(exports, "MARKER_END", ({ enumerable: true, get: function () { return templates_1.MARKER_END; } }));
Object.defineProperty(exports, "getTemplate", ({ enumerable: true, get: function () { return templates_1.getTemplate; } }));
Object.defineProperty(exports, "hasTemplate", ({ enumerable: true, get: function () { return templates_1.hasTemplate; } }));
Object.defineProperty(exports, "wrapInMarker", ({ enumerable: true, get: function () { return templates_1.wrapInMarker; } }));
var org_context_1 = __nccwpck_require__(140);
Object.defineProperty(exports, "readOrgContext", ({ enumerable: true, get: function () { return org_context_1.readOrgContext; } }));
Object.defineProperty(exports, "formatOrgContext", ({ enumerable: true, get: function () { return org_context_1.formatOrgContext; } }));
var drift_detector_1 = __nccwpck_require__(4546);
Object.defineProperty(exports, "detectDrift", ({ enumerable: true, get: function () { return drift_detector_1.detectDrift; } }));
Object.defineProperty(exports, "checkTeamSync", ({ enumerable: true, get: function () { return drift_detector_1.checkTeamSync; } }));
Object.defineProperty(exports, "fetchTeamConfig", ({ enumerable: true, get: function () { return drift_detector_1.fetchTeamConfig; } }));
Object.defineProperty(exports, "FILE_SIGNALS", ({ enumerable: true, get: function () { return drift_detector_1.FILE_SIGNALS; } }));
var mcp_bootstrap_1 = __nccwpck_require__(9167);
Object.defineProperty(exports, "buildMcpConfig", ({ enumerable: true, get: function () { return mcp_bootstrap_1.buildMcpConfig; } }));
Object.defineProperty(exports, "bootstrapMcp", ({ enumerable: true, get: function () { return mcp_bootstrap_1.bootstrapMcp; } }));
Object.defineProperty(exports, "validateMcpConfig", ({ enumerable: true, get: function () { return mcp_bootstrap_1.validateMcpConfig; } }));
var skills_picker_1 = __nccwpck_require__(3683);
Object.defineProperty(exports, "listInstalledSkills", ({ enumerable: true, get: function () { return skills_picker_1.listInstalledSkills; } }));
Object.defineProperty(exports, "formatSkillReference", ({ enumerable: true, get: function () { return skills_picker_1.formatSkillReference; } }));
Object.defineProperty(exports, "skillToPickItem", ({ enumerable: true, get: function () { return skills_picker_1.skillToPickItem; } }));
var inline_diagnostics_1 = __nccwpck_require__(3970);
Object.defineProperty(exports, "analyseFile", ({ enumerable: true, get: function () { return inline_diagnostics_1.analyseFile; } }));
Object.defineProperty(exports, "detectFileType", ({ enumerable: true, get: function () { return inline_diagnostics_1.detectFileType; } }));
Object.defineProperty(exports, "getDiagnosticSummary", ({ enumerable: true, get: function () { return inline_diagnostics_1.getDiagnosticSummary; } }));
var hover_provider_1 = __nccwpck_require__(5046);
Object.defineProperty(exports, "getHoverContent", ({ enumerable: true, get: function () { return hover_provider_1.getHoverContent; } }));
var deploy_preview_1 = __nccwpck_require__(3736);
Object.defineProperty(exports, "buildDeployPreview", ({ enumerable: true, get: function () { return deploy_preview_1.buildDeployPreview; } }));
Object.defineProperty(exports, "formatDeployPreview", ({ enumerable: true, get: function () { return deploy_preview_1.formatDeployPreview; } }));
var agentforce_detector_1 = __nccwpck_require__(4737);
Object.defineProperty(exports, "detectAgentforceContext", ({ enumerable: true, get: function () { return agentforce_detector_1.detectAgentforceContext; } }));
var claude_mem_mode_1 = __nccwpck_require__(3994);
Object.defineProperty(exports, "generateClaudeMemModeJson", ({ enumerable: true, get: function () { return claude_mem_mode_1.generateClaudeMemModeJson; } }));
Object.defineProperty(exports, "SALESFORCE_DX_MODE", ({ enumerable: true, get: function () { return claude_mem_mode_1.SALESFORCE_DX_MODE; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 3970:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/**
 * Inline rule annotations — detects Salesforce anti-patterns in source files
 * and maps them back to the Cursor rule that governs them.
 *
 * Each rule produces zero or more Diagnostic entries with a file range,
 * message, and the source rule file for quick navigation.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.detectFileType = detectFileType;
exports.analyseFile = analyseFile;
exports.getDiagnosticSummary = getDiagnosticSummary;
// ─── SOQL-in-loop / DML-in-loop detection ─────────────────────────────────
// We track loop depth and flag any SOQL SELECT or DML found inside a loop block.
function apexDiagnostics(lines) {
    const diagnostics = [];
    let loopDepth = 0;
    let braceDepth = 0;
    // Track brace depths when a loop opened so we can close properly
    const loopOpenDepths = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        // Count brace opens/closes on this line
        const opens = (line.match(/\{/g) ?? []).length;
        const closes = (line.match(/\}/g) ?? []).length;
        // Loop openers — for, while, do, forEach
        const isLoopOpener = /\b(for|while)\s*\(/.test(trimmed) ||
            /\.forEach\s*\(/.test(trimmed) ||
            /\bdo\s*\{/.test(trimmed);
        if (isLoopOpener) {
            loopDepth++;
            loopOpenDepths.push(braceDepth + opens - closes);
        }
        braceDepth += opens - closes;
        // Pop loop depth when we close back past the loop's open depth
        while (loopOpenDepths.length > 0 &&
            braceDepth < loopOpenDepths[loopOpenDepths.length - 1]) {
            loopOpenDepths.pop();
            loopDepth = Math.max(0, loopDepth - 1);
        }
        if (loopDepth > 0) {
            // SOQL inside loop
            if (/\[\s*SELECT\b/i.test(line)) {
                const col = line.search(/\[\s*SELECT/i);
                diagnostics.push({
                    line: i,
                    startCol: col,
                    endCol: -1,
                    message: 'SOQL query inside a loop — violates bulkification rules. Move query outside the loop.',
                    ruleFile: '.cursor/rules/apex.mdc',
                    severity: 'error',
                    ruleId: 'no-soql-in-loop',
                });
            }
            // DML inside loop
            const dmlMatch = line.match(/\b(insert|update|delete|upsert|undelete|merge)\s+/i);
            if (dmlMatch && !/\/\//.test(line.slice(0, (dmlMatch.index ?? 0)))) {
                diagnostics.push({
                    line: i,
                    startCol: dmlMatch.index ?? 0,
                    endCol: -1,
                    message: `DML operation (${dmlMatch[1]}) inside a loop — violates bulkification rules. Collect records first, then DML outside loop.`,
                    ruleFile: '.cursor/rules/apex.mdc',
                    severity: 'error',
                    ruleId: 'no-dml-in-loop',
                });
            }
        }
    }
    return diagnostics;
}
// ─── missing-test-setup detection ─────────────────────────────────────────
// In test classes (name ends with Test), warn if no @TestSetup and > 1 test method.
function testSetupDiagnostics(lines) {
    const diagnostics = [];
    // Check if this looks like a test class (class name ends with Test)
    const classLine = lines.findIndex((l) => /\bclass\s+\w+Test\b/.test(l));
    if (classLine === -1)
        return diagnostics;
    const hasTestSetup = lines.some((l) => /@TestSetup\b/i.test(l));
    if (hasTestSetup)
        return diagnostics;
    // Count @IsTest annotations (test methods)
    const testMethodCount = lines.filter((l) => /@IsTest\b/i.test(l)).length;
    if (testMethodCount > 1) {
        diagnostics.push({
            line: classLine,
            startCol: 0,
            endCol: -1,
            message: `Test class has ${testMethodCount} test methods but no @TestSetup method — consider adding a @TestSetup to avoid data setup duplication.`,
            ruleFile: '.cursor/rules/apex.mdc',
            severity: 'warning',
            ruleId: 'missing-test-setup',
        });
    }
    return diagnostics;
}
// ─── no-naked-catch detection ──────────────────────────────────────────────
// Flag empty catch blocks.
function nakedCatchDiagnostics(lines) {
    const diagnostics = [];
    const joined = lines.join('\n');
    // Match catch blocks that are effectively empty: only whitespace between braces
    // Handles: } catch (Exception e) { } or multiline empty catch
    const catchPattern = /\}\s*catch\s*\([^)]+\)\s*\{(\s*)\}/g;
    let match;
    while ((match = catchPattern.exec(joined)) !== null) {
        // Find which line this is on
        const before = joined.slice(0, match.index);
        const lineIndex = (before.match(/\n/g) ?? []).length;
        // Only flag if the body is truly empty (no statements)
        const body = match[1];
        if (/^\s*$/.test(body)) {
            diagnostics.push({
                line: lineIndex,
                startCol: 0,
                endCol: -1,
                message: 'Empty catch block (naked catch) — log or rethrow the exception instead of swallowing it.',
                ruleFile: '.cursor/rules/apex.mdc',
                severity: 'warning',
                ruleId: 'no-naked-catch',
            });
        }
    }
    return diagnostics;
}
const SIMPLE_CHECKS = [
    // ── without sharing class declaration (no sharing keyword at all) ──────────
    {
        ruleId: 'missing-sharing-declaration',
        message: 'Class declared without sharing — use `with sharing` by default. See .cursor/rules/apex.mdc.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'warning',
        test: (line) => {
            if (!/\bclass\b/.test(line))
                return false;
            if (/\bwith sharing\b|\bwithout sharing\b|\binherited sharing\b/.test(line))
                return false;
            return /\b(public|global|private)\b.*\bclass\b/.test(line);
        },
    },
    // ── no-without-sharing-bypass ─────────────────────────────────────────────
    // Flags `without sharing` unless the previous line has an explanatory comment.
    {
        ruleId: 'no-without-sharing-bypass',
        message: '`without sharing` detected without an explanatory comment on the previous line. Add a comment explaining why this bypass is intentional.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'warning',
        test: (line, i, all) => {
            if (!/\bwithout sharing\b/.test(line))
                return false;
            if (!/\bclass\b/.test(line))
                return false;
            // Check previous line for a comment
            if (i === 0)
                return true; // no previous line
            const prevLine = all[i - 1].trim();
            return !prevLine.startsWith('//') && !prevLine.startsWith('/*') && !prevLine.startsWith('*');
        },
    },
    // ── Hardcoded Salesforce-style IDs ────────────────────────────────────────
    {
        ruleId: 'no-hardcoded-id',
        message: 'Possible hardcoded Salesforce ID — use Custom Metadata or pass IDs as parameters. See .cursor/rules/apex.mdc.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'warning',
        test: (line) => {
            return /['"][a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?['"]/.test(line) && !/\/\/.*['"]/.test(line);
        },
    },
    // ── no-debug-pii ──────────────────────────────────────────────────────────
    // Expanded: also flags password, token, key, secret, jwt, ssn, credit
    {
        ruleId: 'no-debug-pii',
        message: 'Debug statement may log sensitive data — ensure no PII or credentials are included. See .cursor/rules/safety.mdc.',
        ruleFile: '.cursor/rules/safety.mdc',
        severity: 'warning',
        test: (line) => /System\.debug/i.test(line) &&
            /email|phone|ssn|password|token|secret|key|credential|jwt|credit/i.test(line),
    },
    // ── no-seealldata ─────────────────────────────────────────────────────────
    {
        ruleId: 'no-seealldata',
        message: 'SeeAllData=true is dangerous — tests should create their own data. Remove SeeAllData=true. See .cursor/rules/apex.mdc.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'error',
        test: (line) => /SeeAllData\s*=\s*true/i.test(line),
    },
];
// ─── LWC JS diagnostics ───────────────────────────────────────────────────────
function lwcJsDiagnostics(lines) {
    const diagnostics = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // no-console-log
        const consoleMatch = line.match(/\bconsole\.(log|warn|error|info|debug)\s*\(/);
        if (consoleMatch && !/^\s*\/\//.test(line)) {
            diagnostics.push({
                line: i,
                startCol: consoleMatch.index ?? 0,
                endCol: -1,
                message: `console.${consoleMatch[1]}() found — remove before production. Use the lwc/logger module or a custom service instead.`,
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'warning',
                ruleId: 'no-console-log',
            });
        }
        // no-inner-html
        const innerHtmlIdx = line.search(/\.innerHTML\s*=/);
        if (innerHtmlIdx !== -1 && !/^\s*\/\//.test(line)) {
            diagnostics.push({
                line: i,
                startCol: innerHtmlIdx,
                endCol: -1,
                message: 'Direct innerHTML assignment is an XSS risk in LWC — use template-based rendering instead.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'no-inner-html',
            });
        }
        // no-hardcoded-url
        if (/['"][^'"]*\/(apex|lightning|setup|s\/)\/[^'"]+['"]/.test(line) && !/^\s*\/\//.test(line)) {
            diagnostics.push({
                line: i,
                startCol: 0,
                endCol: -1,
                message: 'Hardcoded Salesforce URL detected — use NavigationMixin or a site-relative URL to support Experience Cloud and org migrations.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'warning',
                ruleId: 'no-hardcoded-url',
            });
        }
    }
    // missing-wire-error-handler: @wire property wiring without error handling
    const hasWire = lines.some((l) => /@wire\s*\(/.test(l));
    if (hasWire) {
        const fullContent = lines.join('\n');
        const hasErrorHandling = /\{\s*data\s*,\s*error\s*\}/.test(fullContent) ||
            /\{\s*error\s*,\s*data\s*\}/.test(fullContent) ||
            /this\.\w+\.error\b/.test(fullContent) ||
            /get\s+error\s*\(\)/.test(fullContent);
        if (!hasErrorHandling) {
            const wireLineIdx = lines.findIndex((l) => /@wire\s*\(/.test(l));
            diagnostics.push({
                line: wireLineIdx,
                startCol: 0,
                endCol: -1,
                message: '@wire adapter used without error property handling — destructure { data, error } or handle .error to display failures gracefully.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'warning',
                ruleId: 'missing-wire-error-handler',
            });
        }
    }
    return diagnostics;
}
// ─── LWC HTML diagnostics ─────────────────────────────────────────────────────
function lwcHtmlDiagnostics(lines) {
    const diagnostics = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // missing-key-iterator: for:each without key on the same or next line
        if (/for:each\s*=/.test(line) && !/\bkey\s*=/.test(line)) {
            diagnostics.push({
                line: i,
                startCol: Math.max(0, line.search(/for:each/)),
                endCol: -1,
                message: 'for:each iterator is missing a key= attribute — required by LWC for efficient DOM reconciliation.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'missing-key-iterator',
            });
        }
        // no-aura-syntax
        const auraIdx = line.search(/\baura:/);
        if (auraIdx !== -1) {
            diagnostics.push({
                line: i,
                startCol: auraIdx,
                endCol: -1,
                message: 'Aura syntax (aura:*) found in an LWC template — use lwc:* directives instead.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'no-aura-syntax',
            });
        }
        // no-onclick-inline: raw onclick="handler()" without LWC binding
        if (/\bonclick\s*=\s*["'][^{]/.test(line)) {
            diagnostics.push({
                line: i,
                startCol: Math.max(0, line.search(/\bonclick/)),
                endCol: -1,
                message: 'Inline onclick handler string detected — LWC requires event bindings like onclick={handleClick}, not onclick="handleClick()".',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'no-onclick-inline',
            });
        }
    }
    return diagnostics;
}
function detectFileType(filePath) {
    if (filePath.endsWith('.cls') || filePath.endsWith('.trigger'))
        return 'apex';
    if (filePath.endsWith('.js') && filePath.includes('/lwc/'))
        return 'lwc-js';
    if (filePath.endsWith('.html') && filePath.includes('/lwc/'))
        return 'lwc-html';
    return 'unknown';
}
function analyseFile(content, fileType) {
    const lines = content.split('\n');
    const diagnostics = [];
    if (fileType === 'apex') {
        diagnostics.push(...apexDiagnostics(lines));
        diagnostics.push(...testSetupDiagnostics(lines));
        diagnostics.push(...nakedCatchDiagnostics(lines));
        for (let i = 0; i < lines.length; i++) {
            for (const check of SIMPLE_CHECKS) {
                if (check.test(lines[i], i, lines)) {
                    const range = check.getRange ? check.getRange(lines[i]) : [0, -1];
                    diagnostics.push({
                        line: i,
                        startCol: range[0],
                        endCol: range[1],
                        message: check.message,
                        ruleFile: check.ruleFile,
                        severity: check.severity,
                        ruleId: check.ruleId,
                    });
                }
            }
        }
    }
    else if (fileType === 'lwc-js') {
        diagnostics.push(...lwcJsDiagnostics(lines));
    }
    else if (fileType === 'lwc-html') {
        diagnostics.push(...lwcHtmlDiagnostics(lines));
    }
    return diagnostics;
}
/**
 * Returns a 1-line summary like "3 errors, 2 warnings" or "No issues"
 */
function getDiagnosticSummary(diagnostics) {
    if (diagnostics.length === 0)
        return 'No issues';
    const errors = diagnostics.filter((d) => d.severity === 'error').length;
    const warnings = diagnostics.filter((d) => d.severity === 'warning').length;
    const infos = diagnostics.filter((d) => d.severity === 'info').length;
    const parts = [];
    if (errors > 0)
        parts.push(`${errors} ${errors === 1 ? 'error' : 'errors'}`);
    if (warnings > 0)
        parts.push(`${warnings} ${warnings === 1 ? 'warning' : 'warnings'}`);
    if (infos > 0)
        parts.push(`${infos} ${infos === 1 ? 'info' : 'infos'}`);
    return parts.join(', ');
}
//# sourceMappingURL=inline-diagnostics.js.map

/***/ }),

/***/ 9167:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildMcpConfig = buildMcpConfig;
exports.bootstrapMcp = bootstrapMcp;
exports.validateMcpConfig = validateMcpConfig;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const DEFAULT_TOOLSETS = ['orgs', 'metadata', 'data', 'users', 'lwc-experts'];
const DEFAULT_TOOLS = ['run_apex_test', 'guide_design_general'];
function buildMcpConfig(options) {
    const { orgAlias, allowNonGaTools = true } = options;
    const toolsets = options.toolsets ?? DEFAULT_TOOLSETS;
    const tools = options.tools ?? DEFAULT_TOOLS;
    const args = [
        '-y',
        '@salesforce/mcp@latest',
        '--orgs', orgAlias,
        '--toolsets', toolsets.join(','),
        '--tools', tools.join(','),
    ];
    if (allowNonGaTools) {
        args.push('--allow-non-ga-tools');
    }
    return {
        mcpServers: {
            'Salesforce DX': {
                command: 'npx',
                args,
            },
        },
    };
}
async function bootstrapMcp(rootPath, options) {
    const config = buildMcpConfig(options);
    const json = JSON.stringify(config, null, 2) + '\n';
    const cursorConfigPath = path.join(rootPath, '.cursor', 'mcp.json');
    const claudeConfigPath = path.join(rootPath, '.mcp.json');
    const cursorExists = await fs.pathExists(cursorConfigPath);
    const claudeExists = await fs.pathExists(claudeConfigPath);
    if (!cursorExists) {
        await fs.ensureDir(path.dirname(cursorConfigPath));
        await fs.writeFile(cursorConfigPath, json, 'utf8');
    }
    if (!claudeExists) {
        await fs.writeFile(claudeConfigPath, json, 'utf8');
    }
    return {
        cursorConfigPath,
        claudeConfigPath,
        config,
        alreadyExisted: { cursor: cursorExists, claude: claudeExists },
    };
}
async function validateMcpConfig(configPath) {
    const issues = [];
    const suggestions = [];
    if (!(await fs.pathExists(configPath))) {
        return {
            valid: false,
            issues: ['Config file not found'],
            suggestions: ['Run: ai-kit-sf bootstrap-mcp to create it'],
        };
    }
    let config;
    try {
        config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    }
    catch {
        return { valid: false, issues: ['Invalid JSON'], suggestions: ['Fix the JSON syntax'] };
    }
    const cfg = config;
    if (!cfg.mcpServers) {
        issues.push('Missing mcpServers key');
    }
    else {
        const servers = cfg.mcpServers;
        for (const [name, server] of Object.entries(servers)) {
            const s = server;
            if (!s.command)
                issues.push(`Server "${name}" missing command`);
            if (!Array.isArray(s.args)) {
                issues.push(`Server "${name}" args must be an array — do not use a single string`);
                suggestions.push('Each CLI flag and value must be a separate array item');
            }
            else {
                // Check for common mistake: all args in one string
                const combined = s.args.some((a) => typeof a === 'string' && a.includes('--orgs') && a.includes('--toolsets'));
                if (combined) {
                    issues.push(`Server "${name}" args appear to be combined into one string`);
                    suggestions.push('Split each flag and value into separate array items');
                }
                // Warn if DEFAULT_TARGET_ORG placeholder still present
                if (s.args.includes('DEFAULT_TARGET_ORG')) {
                    issues.push(`Server "${name}" still uses DEFAULT_TARGET_ORG placeholder`);
                    suggestions.push('Replace DEFAULT_TARGET_ORG with your actual org alias');
                }
            }
        }
    }
    return { valid: issues.length === 0, issues, suggestions };
}
//# sourceMappingURL=mcp-bootstrap.js.map

/***/ }),

/***/ 140:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readOrgContext = readOrgContext;
exports.formatOrgContext = formatOrgContext;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
async function readJsonSafe(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
async function readOrgContext(rootPath) {
    const p = (...parts) => path.join(rootPath, ...parts);
    // 1. .sf/config.json — modern SF CLI auth
    const sfConfig = await readJsonSafe(p('.sf', 'config.json'));
    if (sfConfig) {
        const target = sfConfig['target-org'];
        const defaultOrg = sfConfig['target-org'];
        if (target || defaultOrg) {
            return { defaultOrg: defaultOrg ?? target, targetOrg: target, source: 'sf-config' };
        }
    }
    // 2. sfdx-project.json — may carry defaultOrg key
    const sfdxProject = await readJsonSafe(p('sfdx-project.json'));
    if (sfdxProject) {
        const defaultOrg = sfdxProject['defaultOrg'];
        if (defaultOrg) {
            return { defaultOrg, source: 'sfdx-project' };
        }
    }
    // 3. .sfdx/sfdx-config.json — legacy
    const sfdxConfig = await readJsonSafe(p('.sfdx', 'sfdx-config.json'));
    if (sfdxConfig) {
        const defaultusername = sfdxConfig['defaultusername'];
        if (defaultusername) {
            return { defaultOrg: defaultusername, source: 'sfdx-config' };
        }
    }
    return { source: 'none' };
}
function formatOrgContext(ctx) {
    if (ctx.targetOrg)
        return ctx.targetOrg;
    if (ctx.defaultOrg)
        return ctx.defaultOrg;
    return 'unknown';
}
//# sourceMappingURL=org-context.js.map

/***/ }),

/***/ 5816:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.planSetup = planSetup;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const templates_1 = __nccwpck_require__(9639);
const RECOMMENDED_SCRIPTS = {
    'lint:lwc': 'eslint force-app/main/default/lwc',
    'format': 'prettier --write "force-app/**/*.{cls,trigger,js,html,css,xml,json}"',
    'format:check': 'prettier --check "force-app/**/*.{cls,trigger,js,html,css,xml,json}"',
    'test:apex': 'sf apex run test --test-level RunLocalTests --wait 30 --result-format human',
    'validate': 'sf project deploy validate --source-dir force-app --test-level RunLocalTests --wait 60',
    'deploy': 'sf project deploy start --source-dir force-app --test-level RunLocalTests --wait 60',
    'org:list': 'sf org list',
};
const FORCE_IGNORE_LINES = [
    '.env',
    '.env.*',
    '.sf/',
    '.sfdx/',
    'node_modules/',
    'coverage/',
    '.localdevserver/',
    '**/profiles/**',
    '**/installedPackages/**',
    '**/*.mpd-meta.xml',
];
const CORE_FILES = [
    'AGENTS.md',
    'CLAUDE.md',
    'tasks/todo.md',
    'tasks/lessons.md',
    '.cursor/rules/project.mdc',
    '.cursor/rules/salesforce-mcp.mdc',
    '.cursor/rules/apex.mdc',
    '.cursor/rules/lwc.mdc',
    '.cursor/rules/deployment.mdc',
    '.cursor/rules/safety.mdc',
    '.cursor/skills/salesforce-apex/SKILL.md',
    '.cursor/skills/salesforce-lwc/SKILL.md',
    '.cursor/skills/salesforce-flow/SKILL.md',
    '.cursor/skills/salesforce-security-review/SKILL.md',
    '.cursor/skills/salesforce-agentforce/SKILL.md',
    '.cursor/skills/salesforce-data-cloud/SKILL.md',
    '.claude/commands/review-security.md',
    '.claude/commands/validate-deploy.md',
    '.claude/commands/write-tests.md',
    '.claude/commands/create-apex.md',
    '.claude/commands/create-lwc.md',
    '.claude/commands/prepare-pr.md',
    '.claude/agents/salesforce-architect.md',
    '.claude/agents/apex-developer.md',
    '.claude/agents/lwc-developer.md',
    '.claude/agents/qa-tester.md',
    '.claude/agents/security-reviewer.md',
    'docs/security.md',
    'docs/testing.md',
    'docs/deployment.md',
    'docs/mcp-usage.md',
    'docs/cursor-setup.md',
    'docs/claude-code-setup.md',
    'docs/jags-skills.md',
    'docs/afv-library.md',
    'docs/skills-ecosystem.md',
];
const PRESET_EXTRA_FILES = {
    core: [],
    lwc: [], // placeholder
    agentforce: [], // afv-library docs included via core for agentforce
    'data-cloud': [],
    'experience-cloud': [],
};
async function planSetup(rootPath, options) {
    const { preset = 'core', dryRun = false } = options;
    const allFiles = [...CORE_FILES, ...(PRESET_EXTRA_FILES[preset] ?? [])];
    const files = await Promise.all(allFiles.map(async (relativePath) => {
        const fullPath = path.join(rootPath, relativePath);
        const fileExists = await fs.pathExists(fullPath);
        const templateKey = relativePath;
        const hasTemplate = templateKey in templates_1.TEMPLATES;
        return {
            relativePath,
            action: fileExists ? 'skip' : 'create',
            reason: fileExists
                ? 'File already exists — will not overwrite'
                : hasTemplate
                    ? 'Will be created from template'
                    : 'Template placeholder — will be created empty',
            templateKey,
        };
    }));
    // Determine which scripts are missing from package.json
    const packageJsonScripts = {};
    const pkgPath = path.join(rootPath, 'package.json');
    const hasPkg = await fs.pathExists(pkgPath);
    if (hasPkg) {
        const raw = await fs.readFile(pkgPath, 'utf8');
        const pkg = JSON.parse(raw);
        for (const [name, cmd] of Object.entries(RECOMMENDED_SCRIPTS)) {
            if (!pkg.scripts?.[name]) {
                packageJsonScripts[name] = cmd;
            }
        }
    }
    // Determine which .forceignore lines are missing
    const forceIgnoreLines = [];
    const fiPath = path.join(rootPath, '.forceignore');
    const hasFi = await fs.pathExists(fiPath);
    if (!hasFi) {
        forceIgnoreLines.push(...FORCE_IGNORE_LINES);
    }
    else {
        const content = await fs.readFile(fiPath, 'utf8');
        for (const line of FORCE_IGNORE_LINES) {
            if (!content.includes(line)) {
                forceIgnoreLines.push(line);
            }
        }
    }
    return {
        rootPath,
        preset,
        dryRun,
        files,
        packageJsonScripts,
        forceIgnoreLines,
    };
}
//# sourceMappingURL=planner.js.map

/***/ }),

/***/ 6591:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.generateReadinessReport = generateReadinessReport;
function generateReadinessReport(result) {
    const lines = [];
    const score = result.score;
    const bar = buildBar(score);
    lines.push('');
    lines.push('AI-Kit for Salesforce — Readiness Report');
    lines.push('─'.repeat(50));
    lines.push('');
    if (result.isSalesforceDx) {
        lines.push('Salesforce DX project detected ✓');
    }
    else {
        lines.push('Salesforce DX project: NOT detected ✗');
    }
    if (result.hasForceApp) {
        lines.push('force-app found ✓');
    }
    else {
        lines.push('force-app: NOT found ✗');
    }
    lines.push('');
    lines.push(`AI Readiness Score: ${score}/100`);
    lines.push(`[${bar}] ${score}%`);
    lines.push('');
    if (result.missing.length > 0) {
        lines.push('Missing:');
        for (const m of result.missing) {
            lines.push(`  - ${m}`);
        }
        lines.push('');
    }
    if (result.warnings.length > 0) {
        lines.push('Warnings:');
        for (const w of result.warnings) {
            lines.push(`  ! ${w}`);
        }
        lines.push('');
    }
    if (result.recommendations.length > 0) {
        lines.push('Recommended:');
        for (const r of result.recommendations) {
            lines.push(`  → ${r}`);
        }
        lines.push('');
    }
    const details = [
        ['AGENTS.md', result.hasAgentsMd],
        ['CLAUDE.md', result.hasClaudeMd],
        ['.cursor/rules/project.mdc (Cursor workflow rules)', result.hasCursorProjectRule],
        ['tasks/todo.md + tasks/lessons.md', result.hasTasksTodo && result.hasTasksLessons],
        ['.cursor/rules/ (Apex, LWC, MCP, safety)', result.hasCursorRules],
        ['.cursor/skills/', result.hasCursorSkills],
        ['.claude/commands/', result.hasClaudeCommands],
        ['.claude/agents/', result.hasClaudeAgents],
        ['Security/testing/deployment docs', result.hasDocs],
        ['MCP guide/config', result.hasMcpGuide || result.hasMcpConfig],
        ['Jag-compatible skill templates', result.hasJagsSkills],
        ['AFV Library docs/skills', result.hasAfvLibraryDocs || result.hasAfvLibrarySkills],
    ];
    lines.push('Detail:');
    for (const [label, found] of details) {
        lines.push(`  ${found ? '✓' : '✗'} ${label}`);
    }
    lines.push('');
    return lines.join('\n');
}
function buildBar(score) {
    const filled = Math.round(score / 5);
    const empty = 20 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}
//# sourceMappingURL=reporter.js.map

/***/ }),

/***/ 6157:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.writeFileSafe = writeFileSafe;
exports.appendMissingLines = appendMissingLines;
exports.mergePackageJsonScripts = mergePackageJsonScripts;
exports.determineAction = determineAction;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const templates_1 = __nccwpck_require__(9639);
async function writeFileSafe(filePath, content, options = {}) {
    const { dryRun = false, overwrite = false, markerLabel } = options;
    const exists = await fs.pathExists(filePath);
    if (!exists) {
        if (!dryRun) {
            await fs.ensureDir(path.dirname(filePath));
            const finalContent = markerLabel ? (0, templates_1.wrapInMarker)(content) : content;
            await fs.writeFile(filePath, finalContent, 'utf8');
        }
        return { path: filePath, action: 'create', skipped: false };
    }
    // File exists — decide what to do
    if (overwrite) {
        if (!dryRun) {
            await fs.writeFile(filePath, content, 'utf8');
        }
        return { path: filePath, action: 'create', skipped: false };
    }
    if (markerLabel) {
        // Append or replace inside marker block
        return updateMarkerBlock(filePath, content, dryRun);
    }
    // No marker, no overwrite — skip
    return {
        path: filePath,
        action: 'skip',
        skipped: true,
        reason: 'File already exists and overwrite is disabled',
    };
}
async function updateMarkerBlock(filePath, newContent, dryRun) {
    const existing = await fs.readFile(filePath, 'utf8');
    const startIdx = existing.indexOf(templates_1.MARKER_START);
    const endIdx = existing.indexOf(templates_1.MARKER_END);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        // Replace content inside existing marker block
        const before = existing.slice(0, startIdx);
        const after = existing.slice(endIdx + templates_1.MARKER_END.length);
        const updated = before + (0, templates_1.wrapInMarker)(newContent) + after;
        if (!dryRun) {
            await fs.writeFile(filePath, updated, 'utf8');
        }
        return { path: filePath, action: 'merge', skipped: false };
    }
    // No marker found — append new marker block
    const appended = existing.trimEnd() + '\n\n' + (0, templates_1.wrapInMarker)(newContent);
    if (!dryRun) {
        await fs.writeFile(filePath, appended, 'utf8');
    }
    return { path: filePath, action: 'append', skipped: false };
}
async function appendMissingLines(filePath, lines) {
    const exists = await fs.pathExists(filePath);
    let currentContent = '';
    if (exists) {
        currentContent = await fs.readFile(filePath, 'utf8');
    }
    const missing = lines.filter((line) => !currentContent.includes(line));
    if (missing.length === 0)
        return [];
    const toAppend = '\n' + missing.join('\n') + '\n';
    await fs.ensureDir(path.dirname(filePath));
    await fs.appendFile(filePath, toAppend, 'utf8');
    return missing;
}
async function mergePackageJsonScripts(rootPath, scripts) {
    const pkgPath = path.join(rootPath, 'package.json');
    const exists = await fs.pathExists(pkgPath);
    if (!exists)
        return [];
    const raw = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    if (!pkg.scripts)
        pkg.scripts = {};
    const added = [];
    for (const [name, cmd] of Object.entries(scripts)) {
        if (!pkg.scripts[name]) {
            pkg.scripts[name] = cmd;
            added.push(name);
        }
    }
    if (added.length > 0) {
        await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    }
    return added;
}
function determineAction(filePath, fileExists) {
    if (!fileExists)
        return 'create';
    return 'skip';
}
//# sourceMappingURL=safe-write.js.map

/***/ }),

/***/ 9774:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.scanProject = scanProject;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const AFV_SKILL_NAMES = [
    'agentforce', 'lightning', 'apex', 'soql', 'lwc', 'flow',
    'permissions', 'objects', 'fields', 'ui-bundle', 'samples',
];
async function exists(p) {
    try {
        await fs.access(p);
        return true;
    }
    catch {
        return false;
    }
}
async function isDirectory(p) {
    try {
        const stat = await fs.stat(p);
        return stat.isDirectory();
    }
    catch {
        return false;
    }
}
async function detectAfvLibrarySkills(skillsDir) {
    if (!(await isDirectory(skillsDir)))
        return false;
    try {
        const entries = await fs.readdir(skillsDir);
        return entries.some((e) => AFV_SKILL_NAMES.some((name) => e.toLowerCase().includes(name)));
    }
    catch {
        return false;
    }
}
async function scanProject(rootPath) {
    const p = (...parts) => path.join(rootPath, ...parts);
    const [isSalesforceDx, hasForceApp, hasPackageJson, hasAgentsMd, hasClaudeMd, hasCursorRulesDir, hasCursorSkillsDir, hasClaudeCommandsDir, hasClaudeAgentsDir, hasSecurityDoc, hasTestingDoc, hasDeploymentDoc, hasMcpGuideDoc, hasForceIgnore, hasMcpConfig, hasAfvLibraryDocs, hasAfvLibrarySkills, hasTasksTodo, hasTasksLessons, hasCursorProjectRule,] = await Promise.all([
        exists(p('sfdx-project.json')),
        isDirectory(p('force-app')),
        exists(p('package.json')),
        exists(p('AGENTS.md')),
        exists(p('CLAUDE.md')),
        isDirectory(p('.cursor', 'rules')),
        isDirectory(p('.cursor', 'skills')),
        isDirectory(p('.claude', 'commands')),
        isDirectory(p('.claude', 'agents')),
        exists(p('docs', 'security.md')),
        exists(p('docs', 'testing.md')),
        exists(p('docs', 'deployment.md')),
        exists(p('docs', 'mcp-usage.md')),
        exists(p('.forceignore')),
        exists(p('.mcp.json')).then(async (v) => v || exists(p('.cursor', 'mcp.json'))),
        exists(p('docs', 'afv-library.md')),
        detectAfvLibrarySkills(p('.cursor', 'skills')),
        exists(p('tasks', 'todo.md')),
        exists(p('tasks', 'lessons.md')),
        exists(p('.cursor', 'rules', 'project.mdc')),
    ]);
    const hasJagsSkills = hasCursorSkillsDir;
    const hasDocs = hasSecurityDoc && hasTestingDoc && hasDeploymentDoc;
    const hasTaskManagement = hasTasksTodo && hasTasksLessons;
    let score = 0;
    const missing = [];
    const warnings = [];
    const recommendations = [];
    if (isSalesforceDx) {
        score += 20;
    }
    else {
        missing.push('sfdx-project.json (not a Salesforce DX project)');
        warnings.push('No sfdx-project.json found. AI-Kit works best with Salesforce DX projects.');
    }
    if (hasForceApp) {
        score += 10;
    }
    else {
        missing.push('force-app/ directory');
    }
    if (hasAgentsMd) {
        score += 10;
    }
    else {
        missing.push('AGENTS.md');
        recommendations.push('Add AGENTS.md with project context and AI tool usage rules.');
    }
    if (hasClaudeMd) {
        score += 8;
    }
    else {
        missing.push('CLAUDE.md');
        recommendations.push('Add CLAUDE.md with Claude Code workflow orchestration and Salesforce DX rules.');
    }
    if (hasCursorProjectRule) {
        score += 4;
    }
    else {
        missing.push('.cursor/rules/project.mdc (Cursor workflow rules)');
        recommendations.push('Add .cursor/rules/project.mdc — Cursor equivalent of CLAUDE.md.');
    }
    if (hasCursorRulesDir) {
        score += 8;
    }
    else {
        missing.push('.cursor/rules/ (Apex, LWC, MCP, deployment, safety rules)');
        recommendations.push('Add Cursor rules for Apex, LWC, MCP, deployment, and safety.');
    }
    if (hasCursorSkillsDir) {
        score += 8;
    }
    else {
        missing.push('.cursor/skills/');
        recommendations.push('Add Cursor skill templates for Apex, LWC, Flow, Agentforce, and Data Cloud.');
    }
    if (hasClaudeCommandsDir) {
        score += 6;
    }
    else {
        missing.push('.claude/commands/');
        recommendations.push('Add Claude commands for security review, deploy validation, test writing, and PR prep.');
    }
    if (hasClaudeAgentsDir) {
        score += 6;
    }
    else {
        missing.push('.claude/agents/');
        recommendations.push('Add Claude subagents for architect, Apex developer, LWC developer, QA, and security review.');
    }
    if (hasTaskManagement) {
        score += 6;
    }
    else {
        if (!hasTasksTodo) {
            missing.push('tasks/todo.md');
        }
        if (!hasTasksLessons) {
            missing.push('tasks/lessons.md');
        }
        recommendations.push('Add tasks/ folder for plan-first task tracking and lessons learned.');
    }
    if (hasDocs) {
        score += 6;
    }
    else {
        if (!hasSecurityDoc) {
            missing.push('docs/security.md');
        }
        if (!hasTestingDoc) {
            missing.push('docs/testing.md');
        }
        if (!hasDeploymentDoc) {
            missing.push('docs/deployment.md');
        }
        recommendations.push('Add security, testing, and deployment docs.');
    }
    if (hasMcpGuideDoc || hasMcpConfig) {
        score += 4;
    }
    else {
        missing.push('docs/mcp-usage.md');
        recommendations.push('Add Salesforce DX MCP usage guide and config.');
    }
    if (hasJagsSkills) {
        score += 2;
    }
    else {
        missing.push('Jag-compatible Salesforce skill templates');
        recommendations.push('Add AI-Kit Salesforce skill templates (compatible with Cursor skills workflow).');
    }
    if (hasAfvLibraryDocs || hasAfvLibrarySkills) {
        score += 2;
    }
    else {
        missing.push('Salesforce AFV Library docs/support');
        recommendations.push('Add AFV Library documentation (Salesforce curated agent skills).');
    }
    if (!hasPackageJson) {
        warnings.push('No package.json found. Script merging will be skipped.');
    }
    if (!hasForceIgnore) {
        warnings.push('.forceignore not found — recommended entries will be created.');
    }
    if (recommendations.length === 0 && missing.length === 0) {
        recommendations.push('Your project looks great! Run ai-kit-sf scan periodically to keep it up to date.');
    }
    else if (missing.length > 0) {
        recommendations.unshift(`Run: ai-kit-sf init --preset core`);
    }
    return {
        rootPath,
        isSalesforceDx,
        hasForceApp,
        hasPackageJson,
        hasAgentsMd,
        hasClaudeMd,
        hasCursorRules: hasCursorRulesDir,
        hasCursorSkills: hasCursorSkillsDir,
        hasClaudeCommands: hasClaudeCommandsDir,
        hasClaudeAgents: hasClaudeAgentsDir,
        hasDocs,
        hasMcpGuide: hasMcpGuideDoc,
        hasForceIgnore,
        hasMcpConfig,
        hasJagsSkills,
        hasAfvLibraryDocs,
        hasAfvLibrarySkills,
        hasTasksTodo,
        hasTasksLessons,
        hasCursorProjectRule,
        score,
        missing,
        warnings,
        recommendations,
    };
}
//# sourceMappingURL=scanner.js.map

/***/ }),

/***/ 3683:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.listInstalledSkills = listInstalledSkills;
exports.formatSkillReference = formatSkillReference;
exports.skillToPickItem = skillToPickItem;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
async function readSkillDescription(skillDir) {
    const skillMd = path.join(skillDir, 'SKILL.md');
    try {
        const content = await fs.readFile(skillMd, 'utf8');
        const lines = content.split('\n');
        // Find the "When to Use" section or first meaningful description line
        const whenIdx = lines.findIndex((l) => l.toLowerCase().includes('when to use'));
        if (whenIdx !== -1) {
            for (let i = whenIdx + 1; i < lines.length; i++) {
                const line = lines[i].trim().replace(/^[-*>]/, '').trim();
                if (line.length > 10)
                    return line.slice(0, 120);
            }
        }
        // Fallback: first non-heading non-blank line
        for (const line of lines) {
            const clean = line.trim().replace(/^#+\s*/, '').replace(/^[-*>]/, '').trim();
            if (clean.length > 10 && !clean.startsWith('<!--'))
                return clean.slice(0, 120);
        }
        return '';
    }
    catch {
        return '';
    }
}
async function scanSkillsDir(dir, scope) {
    if (!(await fs.pathExists(dir)))
        return [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const skills = [];
    await Promise.all(entries
        .filter((e) => e.isDirectory())
        .map(async (entry) => {
        const skillDir = path.join(dir, entry.name);
        const hasMd = await fs.pathExists(path.join(skillDir, 'SKILL.md'));
        if (!hasMd)
            return;
        const description = await readSkillDescription(skillDir);
        skills.push({ name: entry.name, directory: skillDir, description, scope });
    }));
    return skills.sort((a, b) => a.name.localeCompare(b.name));
}
/** Discover all installed project-level skills */
async function listInstalledSkills(rootPath) {
    const projectSkillsDir = path.join(rootPath, '.cursor', 'skills');
    return scanSkillsDir(projectSkillsDir, 'project');
}
/** Format a skill reference for insertion into a chat prompt */
function formatSkillReference(skill) {
    return `@${skill.name}`;
}
/** Build a display label for a quick-pick UI */
function skillToPickItem(skill) {
    return {
        label: `@${skill.name}`,
        description: skill.scope === 'project' ? '(project skill)' : '(user skill)',
        detail: skill.description,
    };
}
//# sourceMappingURL=skills-picker.js.map

/***/ }),

/***/ 9639:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/**
 * All template content is defined inline here so the package is self-contained
 * with no runtime template file dependencies.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TEMPLATES = exports.MARKER_END = exports.MARKER_START = void 0;
exports.getTemplate = getTemplate;
exports.hasTemplate = hasTemplate;
exports.wrapInMarker = wrapInMarker;
exports.MARKER_START = '<!-- AI-KIT-SALESFORCE:START -->';
exports.MARKER_END = '<!-- AI-KIT-SALESFORCE:END -->';
exports.TEMPLATES = {
    // ─── Root markdown ──────────────────────────────────────────────────────────
    'AGENTS.md': `# AGENTS.md — AI Tool Usage Guide

> This file was generated by AI-Kit for Salesforce.
> Update the placeholders below to reflect your project.

## Project Overview

<!-- TODO: Describe your Salesforce project, its purpose, and key stakeholders -->
- **Project name:** _your project name_
- **Org type:** Sandbox / Scratch org / Production
- **Primary workstreams:** Apex, LWC, Flow, Agentforce, Data Cloud, etc.

## Salesforce DX Structure

\`\`\`
force-app/
  main/
    default/
      classes/       Apex classes and tests
      triggers/      Apex triggers
      lwc/           Lightning Web Components
      flows/         Flow metadata
      permissionsets/ Permission sets
      profiles/      Profiles (avoid committing unless required)
      objects/       Custom objects and fields
\`\`\`

## Org Alias Notes

- Use \`sf org list\` to see available orgs.
- Confirm the target org alias before every deploy.
- Use scratch orgs or sandboxes for development.
- Never run destructive operations against production without explicit confirmation.

## Cursor and Claude Code Usage

- Cursor uses \`.cursor/rules/\` for project-wide AI coding rules.
- Cursor uses \`.cursor/skills/\` for domain-specific Salesforce guidance.
- Claude Code uses \`CLAUDE.md\` for project rules.
- Claude Code uses \`.claude/commands/\` for slash commands.
- Claude Code uses \`.claude/agents/\` for specialised subagents.

## Salesforce DX MCP Usage

Salesforce DX MCP allows Cursor and Claude Code to interact with your Salesforce org safely.

- Prefer MCP for org operations (metadata, queries, deploys, LWC guidance).
- Confirm the target org before any write operation.
- Use read-only mode for production orgs.
- See \`docs/mcp-usage.md\` for setup and safety rules.

## Cursor Skills / Jag's Salesforce Skills / AFV Library

- Project-level skill templates are under \`.cursor/skills/\`.
- These are AI-Kit local Salesforce skill templates (Cursor-compatible).
- Jag's Salesforce Skills and Salesforce AFV Library can be optionally installed later.
- See \`docs/skills-ecosystem.md\` for the full skills strategy.

## Development Rules

- Use \`sf\` CLI (not deprecated \`sfdx\`) unless required.
- Bulkify all Apex logic — no SOQL or DML inside loops.
- Use \`with sharing\` unless there is a documented reason not to.
- Avoid hardcoded IDs. Use Custom Metadata or Custom Labels.
- Enforce CRUD/FLS where user-accessible data is involved.
- Use Named Credentials for all external callouts.

## Deployment Safety Rules

- Always validate before deploying: \`npm run validate\`
- Confirm org alias before every deploy.
- Do not deploy Profiles unless explicitly required. Prefer Permission Sets.
- Be careful with destructive changes — review before applying.
- Never deploy to production without explicit confirmation and sign-off.

## Testing Expectations

- Every Apex class should have a corresponding test class.
- Tests must cover positive, negative, bulk, and security scenarios.
- Minimum 75% code coverage. Target 85%+.
- Run \`npm run test:apex\` to execute tests.
- See \`docs/testing.md\` for full testing standards.

## Security Expectations

- Never expose secrets, tokens, JWTs, session IDs, or private keys.
- Never log or paste sensitive customer data.
- Do not run anonymous Apex that mutates data without approval.
- Review CRUD/FLS, sharing, SOQL injection, and guest user access.
- See \`docs/security.md\` for full security standards.

## AI Tool Usage Rules

- AI tools should read project files before making changes.
- AI tools must confirm the target org before any deployment.
- AI tools must not deploy to production without explicit human confirmation.
- AI tools must not delete metadata without approval.
- AI tools must not store credentials or create auth files.
- AI tools must not collect telemetry.

## What Not To Do

- Do not hardcode org IDs, user IDs, or record IDs.
- Do not deploy Profiles without a documented reason.
- Do not run destructive metadata operations without a rollback plan.
- Do not bypass sharing rules without a documented exception.
- Do not use \`sfdx\` deprecated commands when \`sf\` equivalents exist.
- Do not expose sensitive data in Apex debug logs or test assertions.
`,
    'CLAUDE.md': `# CLAUDE.md — Claude Code Project Rules

> This file was generated by AI-Kit for Salesforce.
> Claude Code reads this file automatically when you open this project.

---

# Workflow Orchestration

## 1. Plan Mode Default

For any non-trivial task, Claude must enter plan mode first.

Use plan mode when:
- The task has 3 or more steps
- The task involves architectural decisions
- The task affects multiple files
- The task changes deployment behaviour
- The task changes security, permissions, data access, or Salesforce metadata
- The task requires verification or testing

Rules:
- Write a clear plan before implementation.
- Write detailed specs upfront to reduce ambiguity.
- If something goes sideways, stop and re-plan immediately.
- Do not keep pushing through a broken approach.
- Use plan mode for verification steps, not just building.
- For simple and obvious fixes, keep the plan short.

## 2. Subagent Strategy

Use subagents liberally to keep the main context clean.

Rules:
- Offload research, exploration, and parallel analysis to subagents.
- For complex problems, use more compute through focused subagents.
- Give each subagent one clear task.
- Do not give one subagent multiple unrelated responsibilities.
- Use specialist subagents for:
  - Salesforce architecture review
  - Apex implementation
  - LWC implementation
  - Security review
  - Test strategy
  - Deployment validation
  - Documentation review

## 3. Self-Improvement Loop

After any correction from the user, Claude must update:

\`tasks/lessons.md\`

Rules:
- Capture the mistake pattern.
- Write a rule that prevents the same mistake from happening again.
- Review relevant lessons at the start of each new task.
- Ruthlessly iterate on lessons until mistake rate drops.
- Keep lessons practical, specific, and project-relevant.

Example:

\`\`\`
## Lesson: Do not overwrite existing project files

When updating AI-Kit generated files, never replace an existing file without
checking for marker blocks first. Use safe merge mode and create backups before
modification.
\`\`\`

## 4. Verification Before Done

Never mark a task complete without proving it works.

Rules:
- Run relevant tests where possible.
- Run lint or formatting checks where relevant.
- Check logs when debugging.
- Demonstrate correctness with evidence.
- Diff behaviour between main and the new changes when relevant.
- Ask: "Would a staff engineer approve this?"
- If tests cannot be run, explain exactly why and provide the command the user should run.

Before saying the task is done, include:
- What changed
- What was verified
- What tests or commands were run
- Any remaining risks or manual steps

## 5. Demand Elegance, But Stay Practical

For non-trivial changes, pause and ask:

> "Is there a more elegant way?"

Rules:
- If a fix feels hacky, rethink it.
- Prefer clean, simple, maintainable solutions.
- Avoid over-engineering simple fixes.
- Keep impact minimal.
- Challenge your own work before presenting it.
- Use the smallest change that solves the root cause properly.

Guiding question:

> "Knowing everything I know now, what is the cleanest implementation?"

## 6. Autonomous Bug Fixing

When given a bug report, Claude should investigate and fix it.

Rules:
- Do not ask the user for hand-holding.
- Inspect logs, errors, failing tests, and relevant files.
- Identify the root cause.
- Implement the fix.
- Verify the fix.
- Explain the result clearly.

For failing CI:
- Read the failure.
- Reproduce locally where possible.
- Fix the issue.
- Re-run the relevant validation command.
- Summarise the fix.

---

# Task Management

Claude must use local task files for non-trivial work.

## Plan First

Before implementation, write the plan to:

\`tasks/todo.md\`

Use checkable items:

\`\`\`markdown
- [ ] Scan existing project structure
- [ ] Identify missing AI-Kit assets
- [ ] Generate safe setup plan
- [ ] Apply file changes in safe merge mode
- [ ] Run tests
- [ ] Document results
\`\`\`

## Verify Plan

Before starting implementation:
- Review the plan.
- Confirm assumptions.
- Identify files likely to change.
- Identify risks.

For high-risk work, ask for confirmation before continuing.

High-risk work includes:
- Production deployment
- Destructive metadata
- Permission changes
- Anonymous Apex that mutates data
- Large refactors
- Package/dependency changes

## Track Progress

As work progresses:
- Mark completed items in \`tasks/todo.md\`.
- Add notes when the plan changes.
- Do not silently change direction.

## Explain Changes

At meaningful checkpoints, provide a short high-level summary:
- What changed
- Why it changed
- What remains

## Document Results

At the end of the task, add a review section to \`tasks/todo.md\`:

\`\`\`markdown
## Review

- **Summary:** What was done
- **Files changed:** list
- **Tests run:** commands and results
- **Verification:** what was confirmed
- **Known risks:** anything the developer should watch
- **Follow-up:** remaining items
\`\`\`

## Capture Lessons

After any user correction or failed approach, update \`tasks/lessons.md\`:

\`\`\`markdown
## Lesson: <short title>

- **What went wrong:** description
- **Root cause:** why it happened
- **New rule:** how to prevent it
- **Example:** (optional)
\`\`\`

---

# Core Principles

## Simplicity First

Make every change as simple as possible.

Rules:
- Touch the minimum amount of code.
- Avoid unnecessary abstractions.
- Prefer readable code over clever code.
- Do not introduce new dependencies unless clearly justified.
- Keep generated project setup easy to understand.

## No Laziness

Work like a senior developer.

Rules:
- Find root causes.
- Do not apply temporary fixes unless explicitly requested.
- Do not hide uncertainty.
- Do not skip verification.
- Do not leave broken tests unexplained.
- Do not mark incomplete work as done.

## Minimal Impact

Changes should only touch what is necessary.

Rules:
- Avoid unrelated refactors.
- Avoid formatting unrelated files.
- Avoid changing existing project conventions without reason.
- Preserve user code.
- Preserve existing project structure.
- Avoid introducing bugs through broad changes.

## Secure by Default

For Salesforce projects:
- Never store secrets.
- Never expose org auth files.
- Never log tokens, session IDs, JWTs, private keys, or PII.
- Never deploy to production without explicit confirmation.
- Never run anonymous Apex that mutates data without approval.
- Prefer read-only inspection first.
- Use Salesforce DX MCP safely.
- Confirm target org before deployment.

## Definition of Done

A task is only done when:
- [ ] The planned work is complete
- [ ] Relevant files are updated
- [ ] Tests or validation commands were run where possible
- [ ] Results are documented
- [ ] Risks are clearly stated
- [ ] \`tasks/todo.md\` has a review section
- [ ] \`tasks/lessons.md\` is updated if any correction or mistake occurred

---

# Project Context

This is a Salesforce DX project. Use \`sf\` CLI commands (not deprecated \`sfdx\`) unless a specific command requires it.

Source lives under \`force-app/\`. Configuration is in \`sfdx-project.json\`.

## Salesforce DX Rules

- Read existing files before making changes.
- Follow existing naming conventions and patterns.
- Do not create files outside \`force-app/\` unless explicitly asked.
- Prefer Permission Sets and Permission Set Groups over Profiles.
- Bulkify all Apex: no SOQL or DML inside loops.
- Use \`with sharing\` by default.
- Avoid hardcoded IDs. Use Custom Metadata for configurable values.
- Enforce CRUD/FLS where needed.
- Use Named Credentials for callouts.
- Add \`@SuppressWarnings('PMD')\` only with a written justification.

## MCP Rules

- Prefer Salesforce DX MCP for org operations where available.
- Use MCP for: list orgs, metadata queries, data queries, deploys, LWC expert guidance.
- Fall back to \`sf\` CLI only if MCP is unavailable.
- Confirm org alias before any write operation.
- Use read-only mode for production orgs.

## Security Rules

- Never expose secrets, tokens, session IDs, JWTs, or private keys.
- Never log or paste sensitive customer data.
- Do not run anonymous Apex that mutates data without explicit approval.
- Do not make production changes without human confirmation.
- Avoid destructive metadata operations.
- Do not store credentials or create auth files.
- Do not collect telemetry.

## Testing Rules

- Write Apex tests for every class you create or modify.
- Cover: positive cases, negative cases, bulk scenarios (200+ records), and security (with/without sharing).
- Use \`@TestSetup\` for shared test data. Use \`Test.startTest()\` / \`Test.stopTest()\` around DML.
- Do not use \`SeeAllData=true\` unless explicitly required.
- Run tests with: \`npm run test:apex\`

## Deployment Rules

- Validate before deploying: \`npm run validate\`
- Confirm target org alias before every deploy.
- Do not deploy Profiles unless explicitly required.
- Explain deployment impact before running deploy commands.
- Never deploy to production without explicit human confirmation.

## Subagents

Use subagents from \`.claude/agents/\` for non-trivial work:
- \`salesforce-architect\` — architecture decisions, metadata structure, data model
- \`apex-developer\` — Apex, triggers, async jobs, invocable actions
- \`lwc-developer\` — LWC components, JS, HTML, CSS, Apex integration
- \`qa-tester\` — test strategy, Apex tests, LWC tests, regression
- \`security-reviewer\` — security, CRUD/FLS, sharing, SOQL injection, production risks
`,
    // ─── Cursor rules ───────────────────────────────────────────────────────────
    '.cursor/rules/salesforce-mcp.mdc': `---
description: Always prefer Salesforce DX MCP for org operations. Use MCP for orgs, metadata, queries, deploys, users, and LWC guidance when available.
globs: ["**/*.cls", "**/*.trigger", "**/*.js", "**/*.html", "**/*.xml"]
alwaysApply: true
---

# Salesforce DX MCP Rules

## Core Rule
Always prefer Salesforce DX MCP for Salesforce org operations. Fall back to \`sf\` CLI only if MCP is unavailable or the operation is not supported.

## MCP First

Use MCP for:
- Listing and switching orgs
- Querying metadata
- Running SOQL queries
- Deploying and validating metadata
- Managing users and permissions
- LWC expert guidance

## Org Safety

- **Always confirm the target org alias before any write operation.**
- Use read-only mode for production orgs.
- Ask before running any destructive operation (delete metadata, modify permissions, run data mutations).
- Never expose org tokens, auth files, or secrets.

## Example MCP Config

\`\`\`json
{
  "mcpServers": {
    "Salesforce DX": {
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp@latest",
        "--orgs",
        "DEFAULT_TARGET_ORG",
        "--toolsets",
        "orgs,metadata,data,users,lwc-experts",
        "--tools",
        "run_apex_test,guide_design_general",
        "--allow-non-ga-tools"
      ]
    }
  }
}
\`\`\`

## Never

- Never deploy to production without explicit human confirmation.
- Never delete metadata without approval.
- Never modify users or permissions without approval.
- Never run anonymous Apex that mutates data without approval.
`,
    '.cursor/rules/apex.mdc': `---
description: Apex coding standards for Salesforce DX projects.
globs: ["**/*.cls", "**/*.trigger"]
alwaysApply: false
---

# Apex Coding Standards

## Core Rules

- **Bulkify all logic.** Handle collections, not single records.
- **No SOQL or DML inside loops.** Ever.
- **Use \`with sharing\`** by default unless there is a documented reason.
- **Avoid hardcoded IDs.** Use Custom Metadata or Custom Labels.
- **Use Custom Metadata for configurable values.**
- **Enforce CRUD/FLS** where user-accessible data is involved.
- **Use Named Credentials** for all external callouts.

## Testing

- Write tests for every class and trigger.
- Cover: positive, negative, bulk (200+ records), and security scenarios.
- Use \`@TestSetup\` for shared test data.
- Never use \`SeeAllData=true\` unless required.
- Minimum 75% coverage. Target 85%+.
- Do not log PII or secrets in debug statements.

## Patterns

- Use Service layer pattern for reusable logic.
- Use Trigger Handler pattern — keep triggers thin.
- Use Domain classes for object-specific business logic.
- Use Selector classes for SOQL queries.

## Naming

- Classes: \`PascalCase\`
- Methods: \`camelCase\`
- Test classes: \`ClassNameTest\`
- Constants: \`ALL_CAPS_WITH_UNDERSCORES\`
`,
    '.cursor/rules/lwc.mdc': `---
description: LWC coding standards for Salesforce DX projects.
globs: ["**/lwc/**/*.js", "**/lwc/**/*.html", "**/lwc/**/*.css"]
alwaysApply: false
---

# LWC Coding Standards

## Core Rules

- Keep components small and focused on a single responsibility.
- Always handle loading, error, and empty states explicitly.
- Do not hardcode labels — use Custom Labels where appropriate.
- Use wire adapters for reactive data where suitable.
- Keep Apex controllers cacheable where appropriate (\`@AuraEnabled(cacheable=true)\`).
- Run ESLint after changes: \`npm run lint:lwc\`
- Follow existing component patterns in the project.

## Accessibility

- Use ARIA attributes and semantic HTML.
- Ensure keyboard navigation works.
- Test with screen readers where possible.

## Security

- Validate all inputs in Apex controllers.
- Never expose sensitive data through wire adapters.
- Enforce CRUD/FLS in Apex methods.
- Do not pass sensitive data in component attributes.

## Patterns

- Parent-to-child: properties and attributes
- Child-to-parent: custom events
- Cross-component: Lightning Message Service
- Server data: wire service or imperative Apex

## Testing

- Write Jest tests for non-trivial component logic.
- Mock wire adapters and Apex calls in tests.
- Test user interactions and error states.
`,
    '.cursor/rules/deployment.mdc': `---
description: Deployment safety rules for Salesforce DX projects.
globs: ["**/sfdx-project.json", "**/.forceignore", "**/package.json"]
alwaysApply: true
---

# Deployment Safety Rules

## Before Every Deploy

1. Confirm the target org alias: \`sf org display\`
2. Validate first: \`npm run validate\`
3. Review the list of components being deployed.
4. Check for destructive changes.

## Rules

- **Always validate before deploying.**
- **Never deploy to production without explicit human confirmation.**
- Do not deploy Profiles unless explicitly required. Prefer Permission Sets.
- Be careful with destructive changes — explain the impact before applying.
- Do not use \`--ignore-errors\` or bypass validation in CI pipelines.
- Explain deployment impact clearly before running deploy commands.

## Commands

\`\`\`bash
# Validate only (no deploy)
npm run validate

# Deploy with tests
npm run deploy

# Org info
npm run org:list
\`\`\`

## Production Checklist

- [ ] Validation passed in sandbox/scratch org
- [ ] All tests passing (75%+ coverage)
- [ ] Change set reviewed by second developer
- [ ] Rollback plan documented
- [ ] Deployment window confirmed with team
- [ ] Human sign-off obtained
`,
    '.cursor/rules/safety.mdc': `---
description: Security and AI safety rules — always applied.
globs: ["**/*"]
alwaysApply: true
---

# Security and AI Safety Rules

## Secrets and Credentials

- **Never expose secrets, tokens, session IDs, JWTs, or private keys.**
- Do not paste credentials in code, comments, or logs.
- Do not create \`.env\` files with real credentials.
- Use Named Credentials for all external callouts.
- Use Connected App settings, not hardcoded consumer keys.

## Data Safety

- Never paste or log sensitive customer data.
- Do not expose PII in Apex debug logs or test assertions.
- Do not store sensitive data in Custom Metadata if it is not encrypted.

## Org Safety

- Do not run anonymous Apex that mutates data without explicit approval.
- Do not make production changes without human confirmation.
- Avoid destructive metadata operations without a rollback plan.
- Do not modify users or permission assignments without approval.

## AI Tool Safety

- Do not collect telemetry from the project or org.
- Do not store credentials or create org auth files.
- Do not run external package installs without user approval.
- Do not use AI-generated code in production without review.

## Guest User

- Review all publicly accessible Apex and API endpoints.
- Enforce CRUD/FLS for guest user access.
- Never expose internal data through guest user accessible components.
`,
    // ─── Cursor skills ──────────────────────────────────────────────────────────
    '.cursor/skills/salesforce-apex/SKILL.md': `# Salesforce Apex Skill

> AI-Kit Salesforce skill template — compatible with Cursor skills workflow.
> This is a local project-level skill, not an official Jag or AFV Library file.

## When to Use

Load this skill when:
- Writing new Apex classes, triggers, or batch jobs
- Reviewing existing Apex for security or quality issues
- Creating invocable actions or scheduled jobs
- Writing Apex tests

## Rules

1. **Bulkify everything.** Collections in, collections out.
2. **No SOQL or DML inside loops.** Use maps and collections.
3. **Use \`with sharing\` by default.**
4. **Avoid hardcoded IDs.** Use Custom Metadata or Custom Labels.
5. **Enforce CRUD/FLS** with \`Schema.DescribeFieldResult\` checks where needed.
6. **Use Named Credentials** for callouts — never hardcode endpoints or auth.
7. **Use Service/Selector/Domain pattern** for clean separation of concerns.
8. **Write meaningful test methods** — not just to hit coverage numbers.

## Checklist

- [ ] All SOQL queries are outside loops
- [ ] All DML operations are outside loops
- [ ] Class uses \`with sharing\` (or has documented reason not to)
- [ ] No hardcoded IDs
- [ ] Tests cover positive, negative, bulk, and security scenarios
- [ ] Test coverage ≥ 75% (target 85%+)
- [ ] No PII or secrets in debug logs or assertions
- [ ] Apex follows naming conventions (PascalCase for classes, camelCase for methods)

## Done Criteria

Code is ready when all checklist items pass and tests execute without errors.
`,
    '.cursor/skills/salesforce-lwc/SKILL.md': `# Salesforce LWC Skill

> AI-Kit Salesforce skill template — compatible with Cursor skills workflow.
> This is a local project-level skill, not an official Jag or AFV Library file.

## When to Use

Load this skill when:
- Building new Lightning Web Components
- Reviewing existing LWC for quality or security issues
- Integrating components with Apex or external services
- Writing LWC Jest tests

## Rules

1. **Single responsibility.** One component does one thing well.
2. **Always show loading, error, and empty states.**
3. **Use Custom Labels** for user-visible strings where appropriate.
4. **Use wire adapters** for reactive Salesforce data.
5. **Keep Apex controllers cacheable** where appropriate.
6. **Validate all inputs** in Apex methods — never trust client-side data.
7. **Enforce CRUD/FLS** in Apex controllers.
8. **Use Lightning Message Service** for cross-component communication.

## Checklist

- [ ] Component handles loading state
- [ ] Component handles error state
- [ ] Component handles empty state
- [ ] User-facing strings use Custom Labels (not hardcoded)
- [ ] Apex methods enforce CRUD/FLS
- [ ] No sensitive data in component attributes or events
- [ ] ESLint passes: \`npm run lint:lwc\`
- [ ] Jest tests cover main user interactions and error scenarios

## Done Criteria

Component renders correctly in all states, passes ESLint, and tests are green.
`,
    '.cursor/skills/salesforce-flow/SKILL.md': `# Salesforce Flow Skill

> AI-Kit Salesforce skill template — compatible with Cursor skills workflow.
> This is a local project-level skill, not an official Jag or AFV Library file.

## When to Use

Load this skill when:
- Reviewing Flow metadata files (\`.flow-meta.xml\`)
- Documenting Flow logic for review or handover
- Analysing Flow performance or bulk handling
- Identifying Flow risks before deployment

## Rules

1. **Check for loops** — Flow loops that call DML or SOQL can cause limits errors.
2. **Prefer Record-Triggered Flows** over Process Builder (deprecated).
3. **Use \`Before Save\` flows** for field updates when no DML on related records is needed.
4. **Document complex decisions** with Flow descriptions.
5. **Test with bulk records** — check governor limit impacts.
6. **Avoid hardcoded IDs** in Flow conditions and assignments.

## Checklist

- [ ] Flow does not call DML inside a loop without collection handling
- [ ] Flow uses Before Save where appropriate
- [ ] No hardcoded record IDs in conditions
- [ ] Flow description explains purpose
- [ ] Flow has been tested with a representative data volume
- [ ] Flow handles null/empty conditions gracefully

## Done Criteria

Flow is documented, reviewed for governor limits, and tested in scratch org.
`,
    '.cursor/skills/salesforce-security-review/SKILL.md': `# Salesforce Security Review Skill

> AI-Kit Salesforce skill template — compatible with Cursor skills workflow.
> This is a local project-level skill, not an official Jag or AFV Library file.

## When to Use

Load this skill when:
- Reviewing any Apex, LWC, Flow, or configuration change for security
- Preparing a deployment for production
- Running a pre-release security checklist
- Investigating a security concern or vulnerability

## Rules

1. **SOQL Injection.** Ensure dynamic SOQL uses \`String.escapeSingleQuotes()\` or bind variables.
2. **CRUD/FLS.** Check create, read, update, delete and field-level security on all data access.
3. **Sharing.** Verify \`with sharing\` is used on all classes that access user data.
4. **Guest User.** Review all Apex/APIs accessible without authentication.
5. **Secrets.** No tokens, passwords, or credentials in code, metadata, or logs.
6. **Named Credentials.** All external callouts must use Named Credentials.
7. **Production.** No write operations to production without explicit confirmation.

## Checklist

- [ ] No dynamic SOQL without \`escapeSingleQuotes\` or bind variables
- [ ] CRUD/FLS enforced on all DML and queries
- [ ] All classes use \`with sharing\` (or have documented exceptions)
- [ ] Guest user access reviewed and restricted appropriately
- [ ] No secrets, tokens, or credentials in code or metadata
- [ ] All callouts use Named Credentials
- [ ] Permission Sets reviewed — no over-privileged assignments
- [ ] No hardcoded org IDs, record IDs, or user IDs

## Done Criteria

Security checklist passes with no critical or high findings.
`,
    '.cursor/skills/salesforce-agentforce/SKILL.md': `# Salesforce Agentforce Skill

> AI-Kit Salesforce skill template — compatible with Cursor skills workflow.
> This is a local project-level skill, not an official Jag or AFV Library file.
> See also: Salesforce AFV Library — Salesforce's curated agent skills for Agentforce Vibes.

## When to Use

Load this skill when:
- Building or reviewing Agentforce agents and topics
- Creating invocable actions for Agentforce
- Reviewing Prompt Templates
- Working with Einstein AI features
- Integrating Agentforce with external systems

## Rules

1. **Use invocable actions** to expose Apex functionality to Agentforce.
2. **Keep agent topics focused** — one topic, one domain.
3. **Use Prompt Templates** for consistent AI instructions.
4. **Test agent responses** in sandbox before production.
5. **Review data access** — agents should not access data beyond their scope.
6. **Document agent capabilities** clearly for end users.

## Checklist

- [ ] Invocable actions are bulkified and handle errors gracefully
- [ ] Agent topics are scoped and well-described
- [ ] Prompt Templates use appropriate guardrails
- [ ] Agent tested in sandbox/scratch org
- [ ] Data access reviewed (CRUD/FLS enforced in invocable Apex)
- [ ] No sensitive data exposed in agent responses
- [ ] AFV Library skills reviewed for reusable patterns

## Done Criteria

Agentforce agent is tested, documented, and approved for deployment.

## AFV Library Reference

Salesforce AFV Library provides curated Agentforce skill patterns:
- See: \`docs/afv-library.md\`
- Install guide: \`npx skills add forcedotcom/afv-library\` (review before installing)
`,
    '.cursor/skills/salesforce-data-cloud/SKILL.md': `# Salesforce Data Cloud Skill

> AI-Kit Salesforce skill template — compatible with Cursor skills workflow.
> This is a local project-level skill, not an official Jag or AFV Library file.

## When to Use

Load this skill when:
- Working with Data Cloud data streams, data models, or segments
- Building integrations that write to or read from Data Cloud
- Reviewing Data Cloud query performance
- Setting up calculated insights or activation targets

## Rules

1. **Understand data residency** — Data Cloud data may have compliance implications.
2. **Use Data Cloud APIs** for ingestion where batch size allows.
3. **Review segment refresh schedules** before changing segment criteria.
4. **Test calculated insights** with representative data samples.
5. **Activation targets must be reviewed** before connecting to external systems.
6. **Do not expose PII** from Data Cloud in debug logs, test assertions, or AI prompts.

## Checklist

- [ ] Data stream schema reviewed and approved
- [ ] Data model mapped correctly (Individual, Engagement, etc.)
- [ ] Segment criteria validated in sandbox
- [ ] Calculated insights tested with sample data
- [ ] Activation target reviewed for privacy compliance
- [ ] No PII in debug logs or test data
- [ ] Data Cloud / Salesforce org connection permissions reviewed

## Done Criteria

Data Cloud changes tested, compliance reviewed, and approved for production.
`,
    // ─── Claude commands ─────────────────────────────────────────────────────────
    '.claude/commands/review-security.md': `# /review-security

Review the changed files in this project for Salesforce security issues.

## What to check

1. **SOQL injection** — dynamic SOQL without \`escapeSingleQuotes\` or bind variables
2. **CRUD/FLS** — all DML and queries enforce appropriate object and field permissions
3. **Sharing** — all Apex classes use \`with sharing\` (or have documented exceptions)
4. **Secrets** — no tokens, credentials, session IDs, JWTs, or private keys in code or metadata
5. **Named Credentials** — all external callouts use Named Credentials
6. **Guest user** — no sensitive data accessible without authentication
7. **Hardcoded IDs** — no hardcoded org IDs, record IDs, or user IDs
8. **Permissions** — no over-privileged Permission Set assignments

## Output format

For each file reviewed:
- List any security issues found (severity: Critical / High / Medium / Low)
- Provide the specific line or code that is the concern
- Suggest the fix

End with a summary table: File | Issues Found | Severity.

If no issues found, state clearly: "No security issues found."
`,
    '.claude/commands/validate-deploy.md': `# /validate-deploy

Validate the deployment safely before applying it to any org.

## Steps

1. Identify the target org alias from \`sfdx-project.json\` or ask the developer.
2. Confirm this is NOT production, or get explicit confirmation if it is.
3. Show the list of components that will be deployed.
4. Run: \`npm run validate\`
5. Review the output for errors.
6. Report: tests passed, coverage %, any failures.

## Safety checks

- [ ] Target org alias confirmed
- [ ] Not deploying to production without sign-off
- [ ] All tests passing
- [ ] Coverage ≥ 75%
- [ ] No destructive changes included (unless approved)
- [ ] Profiles not included (unless required)

## If validation fails

- Show the exact error messages.
- Identify the affected component.
- Suggest the fix.
- Do not apply the deployment until validation passes.
`,
    '.claude/commands/write-tests.md': `# /write-tests

Create or update Apex tests and LWC tests for the specified code.

## For Apex tests

1. Read the existing class or trigger being tested.
2. Identify the main scenarios: positive, negative, bulk (200+ records), security.
3. Create or update the test class using this structure:
   - \`@TestSetup\` for shared test data
   - Individual test methods for each scenario
   - \`Test.startTest()\` / \`Test.stopTest()\` around DML
4. Do not use \`SeeAllData=true\`.
5. Cover at least: positive case, null/empty inputs, bulk (200 records), with/without sharing.

## For LWC Jest tests

1. Read the component JS file.
2. Create a Jest test file that:
   - Tests initial render
   - Tests user interactions
   - Mocks wire adapters and Apex calls
   - Tests error states
3. Follow the patterns in the existing \`__tests__\` folders.

## Output

Provide the complete test file(s). State the expected coverage improvement.
`,
    '.claude/commands/create-apex.md': `# /create-apex

Create a new Apex class with service/test structure and security checks.

## Required input

- Class purpose and name
- Object(s) involved
- Operations needed (query, insert, update, delete, callout, etc.)
- Sharing model requirement

## What to create

1. **Service class** (\`ClassName.cls\`) — bulkified business logic
2. **Test class** (\`ClassNameTest.cls\`) — positive, negative, bulk, security tests

## Rules

- Use \`with sharing\` unless told otherwise
- No SOQL or DML inside loops
- Use Collections and Maps for bulk handling
- Enforce CRUD/FLS where needed
- Use Custom Metadata for any configurable values
- Use Named Credentials for any callouts
- Add class-level Javadoc comment explaining purpose

## Output

Provide both files. Explain the design choices made.
`,
    '.claude/commands/create-lwc.md': `# /create-lwc

Create a new Lightning Web Component with loading, error, empty state, and secure Apex integration.

## Required input

- Component name and purpose
- Data needed (object, fields)
- User interactions required
- Whether an Apex controller is needed

## What to create

1. **HTML template** — with loading spinner, error display, empty state, and main content
2. **JavaScript controller** — wire or imperative Apex, error handling, loading state
3. **CSS** — minimal, follows existing patterns
4. **Apex controller** (if needed) — cacheable where appropriate, CRUD/FLS enforced
5. **Jest test** — renders correctly, handles wire data and errors

## Rules

- Always show loading, error, and empty states
- Use Custom Labels for user-visible strings
- Enforce CRUD/FLS in Apex controller
- No sensitive data in component attributes or events
- Follow existing component patterns in the project

## Output

Provide all files. Explain the component structure and data flow.
`,
    '.claude/commands/prepare-pr.md': `# /prepare-pr

Summarise this branch's changes and prepare it for pull request.

## What to produce

### 1. Change summary

List every file changed. For each file:
- Type of change (new / modified / deleted)
- One-sentence description of what changed and why

### 2. Apex tests

- Which test classes cover these changes?
- What is the expected code coverage?
- Run command: \`npm run test:apex\`

### 3. Deployment impact

- What metadata components are included?
- Any destructive changes?
- Any Profiles (flag if yes — requires review)?
- Estimated deployment time?
- Any dependencies (packages, other orgs, data)?

### 4. Risks

- Security concerns?
- Governor limit risks?
- User-visible changes?
- Production risk level: Low / Medium / High

### 5. Checklist

- [ ] Tests written and passing
- [ ] Security reviewed
- [ ] Deployment validated
- [ ] Profiles excluded (or justified)
- [ ] No hardcoded IDs
- [ ] No secrets exposed
- [ ] Reviewer assigned
`,
    // ─── Claude agents ───────────────────────────────────────────────────────────
    '.claude/agents/salesforce-architect.md': `---
name: salesforce-architect
description: Reviews Salesforce project architecture, metadata structure, data model design, integration patterns, and deployment risk. Use for non-trivial architecture decisions, large feature design, or pre-release review.
---

# Salesforce Architect Agent

You are a senior Salesforce architect reviewing this project.

## Your role

- Review the overall metadata structure and data model.
- Evaluate integration patterns (Named Credentials, callouts, platform events).
- Assess governor limit risks at scale.
- Review deployment strategy and rollback approach.
- Identify technical debt or anti-patterns.
- Recommend the right Salesforce feature for the use case (Apex vs Flow vs Configuration).

## Rules

- Read \`AGENTS.md\`, \`CLAUDE.md\`, and relevant metadata files before reviewing.
- Be specific — name the files, classes, or components with concerns.
- Rate risk: Low / Medium / High / Critical.
- Suggest the minimal viable change rather than a complete rewrite.
- Do not make changes — report findings only unless asked.

## Output format

1. Architecture summary (what the change does at a high level)
2. Concerns found (specific, with file references)
3. Recommendations (specific, actionable)
4. Risk rating and justification
`,
    '.claude/agents/apex-developer.md': `---
name: apex-developer
description: Builds and reviews Apex classes, triggers, batch jobs, queueable jobs, scheduled jobs, invocable actions, and Apex tests. Follows Salesforce DX best practices and bulkification patterns.
---

# Apex Developer Agent

You are a senior Salesforce Apex developer.

## Your role

- Build and review Apex classes, triggers, and asynchronous jobs.
- Create invocable actions for Agentforce and Flow.
- Write comprehensive Apex tests (positive, negative, bulk, security).
- Follow Service/Selector/Domain patterns.
- Enforce CRUD/FLS, sharing, and SOQL/DML rules.

## Rules

- Always bulkify. Handle collections. No SOQL or DML inside loops.
- Use \`with sharing\` by default.
- Avoid hardcoded IDs. Use Custom Metadata for config.
- Enforce CRUD/FLS where user-accessible data is involved.
- Use Named Credentials for callouts.
- Minimum 75% test coverage. Target 85%+.
- Do not log PII or secrets in debug statements.
- Use \`Test.startTest()\` / \`Test.stopTest()\` around DML in tests.

## Output format

Provide complete code files. Explain key design decisions. List the test scenarios covered.
`,
    '.claude/agents/lwc-developer.md': `---
name: lwc-developer
description: Builds and reviews Lightning Web Components — HTML, JavaScript, CSS, Apex integration, wire adapters, events, and Jest tests. Follows LWC best practices and accessibility standards.
---

# LWC Developer Agent

You are a senior Salesforce LWC developer.

## Your role

- Build and review Lightning Web Components.
- Create secure, accessible, and well-tested UI components.
- Integrate components with Apex controllers and wire services.
- Write Jest tests for component logic.
- Follow existing project component patterns.

## Rules

- Always handle loading, error, and empty states.
- Use Custom Labels for user-visible strings.
- Use wire adapters for reactive data.
- Keep Apex methods cacheable where appropriate.
- Enforce CRUD/FLS in all Apex controllers.
- No sensitive data in component attributes or events.
- Run ESLint before completing: \`npm run lint:lwc\`
- Follow SLDS design system patterns.

## Output format

Provide all component files (HTML, JS, CSS, Apex if needed, Jest test). Explain the component's data flow and state management.
`,
    '.claude/agents/qa-tester.md': `---
name: qa-tester
description: Creates test strategy, Apex test classes, LWC Jest tests, validation checklists, and regression checklists. Ensures code coverage, edge cases, and security scenarios are covered.
---

# QA Tester Agent

You are a senior Salesforce QA engineer.

## Your role

- Create comprehensive test strategies for Apex and LWC changes.
- Write Apex test classes with full scenario coverage.
- Write LWC Jest tests for component logic and interactions.
- Create validation and regression checklists.
- Identify missing test coverage and edge cases.

## Apex testing rules

- Test each public method.
- Cover: positive case, null/empty inputs, bulk (200 records), permission boundary.
- Use \`@TestSetup\` for shared data.
- Use \`Test.startTest()\` / \`Test.stopTest()\`.
- Never use \`SeeAllData=true\`.
- Minimum 75% coverage per class.

## LWC testing rules

- Test initial render with expected data.
- Test user interactions (clicks, input changes).
- Test wire adapter responses (data, errors).
- Test loading and error states.
- Mock Apex calls and wire adapters.

## Output format

1. Test strategy summary
2. Apex test class(es) — complete code
3. LWC Jest test file(s) — complete code
4. Validation checklist
5. Coverage estimate
`,
    '.claude/agents/security-reviewer.md': `---
name: security-reviewer
description: Reviews Salesforce code and configuration for security issues — SOQL injection, CRUD/FLS, sharing violations, exposed secrets, guest user risk, and production change safety.
---

# Security Reviewer Agent

You are a senior Salesforce security engineer.

## Your role

- Review Apex, LWC, Flow, and configuration changes for security vulnerabilities.
- Check SOQL injection, CRUD/FLS, sharing, guest user access, secrets, and production risks.
- Rate findings by severity: Critical / High / Medium / Low.
- Provide specific remediation steps.

## What to check

1. **SOQL injection** — dynamic SOQL without bind variables or \`escapeSingleQuotes\`
2. **CRUD/FLS** — object and field permissions enforced on all data access
3. **Sharing** — \`with sharing\` on all user-data-touching classes
4. **Secrets** — no tokens, passwords, keys, session IDs in code, metadata, or logs
5. **Named Credentials** — all callouts use Named Credentials, not hardcoded URLs/auth
6. **Guest user** — no sensitive data or operations accessible without authentication
7. **Permissions** — no over-privileged Permission Set assignments
8. **Hardcoded IDs** — no org IDs, record IDs, or user IDs
9. **Production safety** — changes that could affect production flagged explicitly

## Output format

For each file reviewed:
- Security issues found (severity, line reference, explanation)
- Recommended fix (specific code change)

Summary table: File | Issue Count | Highest Severity
Final recommendation: Approve / Request Changes / Reject
`,
    // ─── Docs ─────────────────────────────────────────────────────────────────
    'docs/security.md': `# Security Standards

> Generated by AI-Kit for Salesforce. Review and customise for your project.

## Secrets Policy

- **Never** store tokens, passwords, session IDs, JWTs, or private keys in code, metadata, comments, or logs.
- Use **Named Credentials** for all external system credentials.
- Use **Connected App settings** for OAuth flows — not hardcoded consumer keys.
- Rotate credentials immediately if accidentally exposed.
- Add \`.env\` and \`.env.*\` to \`.forceignore\` and \`.gitignore\`.

## PII Policy

- Do not log or print PII (names, emails, phone numbers, SSNs, etc.) in Apex debug statements.
- Do not use real customer data in test methods.
- Do not expose PII through LWC component attributes or custom events.
- Review Data Cloud data streams for PII compliance before activation.

## Named Credentials

- All HTTP callouts must use Named Credentials.
- Do not hardcode endpoint URLs or authentication headers.
- Review Named Credential permissions — restrict to necessary profiles/permission sets.

## CRUD and FLS

- Enforce object-level CRUD using \`Schema.DescribeSObjectResult.isAccessible()\` etc.
- Enforce field-level security using \`Schema.DescribeFieldResult.isAccessible()\` etc.
- Use \`Security.stripInaccessible()\` for lightweight FLS enforcement.
- Document any intentional bypasses with a clear comment.

## Sharing

- Use \`with sharing\` on all Apex classes that access user data by default.
- Use \`without sharing\` only when there is a documented business reason.
- Use \`inherited sharing\` for utility classes called from both contexts.

## SOQL Injection

- Never concatenate user input directly into SOQL strings.
- Use bind variables (e.g., \`WHERE Id = :recordId\`) wherever possible.
- Use \`String.escapeSingleQuotes()\` when dynamic SOQL is unavoidable.
- Review all dynamic SOQL in code review.

## Guest User Risk

- Review all Apex and APIs accessible without authentication.
- Guest user should never access sensitive objects or fields.
- Apply IP restrictions to Experience Cloud guest user profile where appropriate.
- Regularly audit guest user profile permissions.

## Production Safety

- No direct write operations against production without explicit sign-off.
- All production deployments require validation in sandbox first.
- All production deployments require a rollback plan.
- Production read-only access only for AI tools and MCP by default.

## AI Prompt and Data Safety

- Do not paste sensitive customer data into AI tool prompts.
- Do not include org credentials in prompts or context.
- Review AI-generated code before deploying — do not auto-deploy.
- Do not use AI tools against production orgs without read-only restrictions.
`,
    'docs/testing.md': `# Testing Standards

> Generated by AI-Kit for Salesforce. Review and customise for your project.

## Apex Testing Standards

### Coverage

- Minimum: 75% code coverage per class (Salesforce requirement).
- Target: 85%+ for all business logic.
- 100% target for security-critical methods.

### Test structure

\`\`\`apex
@IsTest
private class MyClassTest {

    @TestSetup
    static void makeData() {
        // Insert shared test records here
    }

    @IsTest
    static void testPositiveCase() {
        // Arrange
        // Act
        Test.startTest();
        // ... call your method
        Test.stopTest();
        // Assert
    }

    @IsTest
    static void testNegativeCase() { ... }

    @IsTest
    static void testBulkCase() {
        // Create 200 records
    }

    @IsTest
    static void testSecurityCase() {
        // Run as a limited-permission user
        User limitedUser = [SELECT Id FROM User WHERE ...];
        System.runAs(limitedUser) {
            ...
        }
    }
}
\`\`\`

### Rules

- Use \`@TestSetup\` for shared test data.
- Use \`Test.startTest()\` / \`Test.stopTest()\` around DML and async operations.
- Never use \`SeeAllData=true\` unless absolutely required.
- Do not test for coverage only — test for correctness.
- Use \`System.assertEquals\`, \`System.assertNotEquals\`, \`System.assert\` with descriptive messages.

## LWC Testing Standards

- Use Jest for LWC unit tests.
- Test initial render, user interactions, wire responses, and error states.
- Mock wire adapters and Apex calls — do not make real callouts in Jest.
- Store tests in \`__tests__\` folder alongside the component.

## Deployment Validation

\`\`\`bash
# Validate without deploying
npm run validate

# Run Apex tests
npm run test:apex

# Run LWC Jest tests
npx jest
\`\`\`

## Test Data Strategy

- Use \`@TestSetup\` for data shared across multiple test methods.
- Create minimal test data — only what the test needs.
- Do not rely on existing org data (\`SeeAllData=false\`).
- Use \`Test.createStub()\` for mocking external callouts.
- Use \`StaticResourceCalloutMock\` for HTTP callout mocks.

## Scenarios to Cover

Every feature must include tests for:
- **Positive:** Happy path works correctly.
- **Negative:** Invalid inputs, missing data, errors handled gracefully.
- **Bulk:** 200 records processed without hitting governor limits.
- **Security:** Correct behaviour when run as a restricted user.
`,
    'docs/deployment.md': `# Deployment Standards

> Generated by AI-Kit for Salesforce. Review and customise for your project.

## Validate Before Deploy

Always validate your changes before deploying:

\`\`\`bash
npm run validate
\`\`\`

This runs: \`sf project deploy validate --source-dir force-app --test-level RunLocalTests --wait 60\`

Validation runs all local tests and checks the metadata without committing it to the org.

## Dry-Run Process

1. Run \`npm run validate\` — check for errors.
2. Review the components list in the output.
3. Check test results and coverage.
4. Only proceed to deploy if validation passes.

## Production Checklist

Before deploying to production:

- [ ] Validation passed in a sandbox or scratch org
- [ ] All tests passing with ≥ 75% coverage
- [ ] Security review completed
- [ ] Changes reviewed by a second developer
- [ ] Destructive changes reviewed and approved
- [ ] Profiles excluded (or explicitly justified)
- [ ] Rollback plan documented
- [ ] Deployment window confirmed with team and stakeholders
- [ ] Human sign-off obtained (manager or tech lead)

## Destructive Changes Checklist

Destructive changes remove metadata from the org. Extra care required:

- [ ] Confirm the metadata being deleted is no longer used
- [ ] Check if deleted fields/objects have dependencies
- [ ] Test in sandbox that deletion does not break anything
- [ ] Get explicit approval from the project owner
- [ ] Ensure rollback is possible (recreate from Git if needed)

## Rollback Notes

- Metadata deployed via source tracking can be reverted by redeploying the previous version.
- For data changes (DML in anonymous Apex), ensure a data backup or reversible script exists.
- For schema changes (new fields), removal requires a destructive change deployment.
- Keep Git tags or branch snapshots at each production deployment for reference.

## Target Org Confirmation

Before every deployment:

\`\`\`bash
sf org display
sf org list
\`\`\`

Confirm the org alias and type (Sandbox / Scratch / Production) before proceeding.

## Deploy Commands

\`\`\`bash
# Validate only
npm run validate

# Deploy with tests
npm run deploy

# List orgs
npm run org:list
\`\`\`
`,
    'docs/mcp-usage.md': `# Salesforce DX MCP Usage Guide

> Generated by AI-Kit for Salesforce.

## What is Salesforce DX MCP?

Salesforce DX MCP (Model Context Protocol) is a server that allows AI tools like Cursor and Claude Code to interact with your Salesforce org in a structured, controlled way.

Instead of copy-pasting metadata or running CLI commands manually, Cursor and Claude Code can use MCP to:
- Query org metadata
- Run SOQL queries
- List and manage orgs
- Deploy and validate metadata
- Get LWC expert guidance
- Manage users and permissions

## Why Should Teams Use It?

- **Faster development** — AI tools have live org context without manual copy-paste.
- **Fewer errors** — structured API access reduces misinterpretation.
- **Auditable** — MCP operations are explicit and confirmable.
- **Safer** — production can be locked to read-only via config.

## How Cursor and Claude Code Use It

Once MCP is configured in \`.cursor/mcp.json\` or \`.mcp.json\`, Cursor and Claude Code will automatically use the Salesforce DX MCP server when they need org data.

They will:
1. Ask the MCP server for metadata or org info.
2. Show you what they found.
3. Propose changes for your review before applying them.

## Example MCP Configuration

Create \`.cursor/mcp.json\` (for Cursor) or \`.mcp.json\` (for Claude Code):

\`\`\`json
{
  "mcpServers": {
    "Salesforce DX": {
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp@latest",
        "--orgs",
        "DEFAULT_TARGET_ORG",
        "--toolsets",
        "orgs,metadata,data,users,lwc-experts",
        "--tools",
        "run_apex_test,guide_design_general",
        "--allow-non-ga-tools"
      ]
    }
  }
}
\`\`\`

**Important:** Replace \`DEFAULT_TARGET_ORG\` with your default org alias (e.g., \`my-sandbox\`).

Each CLI flag and value must be a separate item in the \`args\` array — do not combine them into a single string.

## Toolset Explanation

| Toolset | What it gives the AI |
|---------|----------------------|
| \`orgs\` | List orgs, get org info, switch default org |
| \`metadata\` | Query and retrieve metadata components |
| \`data\` | Run SOQL queries, view records |
| \`users\` | List users, view permission assignments |
| \`lwc-experts\` | LWC expert guidance and patterns |

## Safe Org Rules

- **Always confirm the target org alias** before any write operation.
- **Read-only mode for production** — do not allow writes to production via MCP.
- **Confirm before destructive operations** — metadata deletion, permission changes.
- **Never expose org tokens or auth files** — MCP uses existing \`sf\` CLI auth.

## Production Read-Only Recommendation

For production orgs, restrict MCP to read-only toolsets:

\`\`\`json
{
  "mcpServers": {
    "Salesforce DX (Production - READ ONLY)": {
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp@latest",
        "--orgs",
        "production",
        "--toolsets",
        "orgs,metadata,data",
        "--allow-non-ga-tools"
      ]
    }
  }
}
\`\`\`

## Risky Operations Requiring Confirmation

The following operations must always require explicit human confirmation before the AI proceeds:

- Deploying metadata to production
- Deleting or destructive-deploying metadata
- Running anonymous Apex that modifies data
- Modifying user profiles or permission assignments
- Accessing sensitive customer data
`,
    'docs/cursor-setup.md': `# Cursor Setup Guide

> Generated by AI-Kit for Salesforce.

## Cursor Rules

Project-level Cursor rules are stored in \`.cursor/rules/\`.

| Rule file | Purpose |
|-----------|---------|
| \`salesforce-mcp.mdc\` | MCP-first org operations, org safety |
| \`apex.mdc\` | Apex coding standards |
| \`lwc.mdc\` | LWC coding standards |
| \`deployment.mdc\` | Deployment safety |
| \`safety.mdc\` | Security and AI safety (always applied) |

Rules with \`alwaysApply: true\` are applied to every conversation. Rules with \`globs\` are applied when matching files are open.

## Cursor Skills

Project-level skills are stored in \`.cursor/skills/\`. Each skill is a directory with a \`SKILL.md\` file.

| Skill | When to use |
|-------|-------------|
| \`salesforce-apex\` | Writing, reviewing, or fixing Apex |
| \`salesforce-lwc\` | Building or reviewing LWC |
| \`salesforce-flow\` | Reviewing or documenting Flow |
| \`salesforce-security-review\` | Security review before deploy |
| \`salesforce-agentforce\` | Agentforce and invocable actions |
| \`salesforce-data-cloud\` | Data Cloud integrations |

### How to manually invoke a skill

In Cursor chat:
1. Type \`@\` and select the skill from the dropdown.
2. Or mention the skill name in your prompt: _"Using the salesforce-apex skill, review this trigger."_

### Project-level vs user-level skills

- **Project-level** (this project): \`.cursor/skills/\`
- **User-level** (all projects): \`~/.cursor/skills/\`

AI-Kit for Salesforce creates project-level skills so the whole team shares the same standards.

## MCP Configuration

See \`docs/mcp-usage.md\` for the full Salesforce DX MCP setup guide.

Quick setup:
1. Copy the example config from \`docs/mcp-usage.md\`.
2. Save it as \`.cursor/mcp.json\` for Cursor.
3. Replace \`DEFAULT_TARGET_ORG\` with your org alias.
4. Restart Cursor.

## Skills Ecosystem

See \`docs/skills-ecosystem.md\` for the full guide to AI-Kit templates, Jag's Salesforce Skills, and Salesforce AFV Library.
`,
    'docs/claude-code-setup.md': `# Claude Code Setup Guide

> Generated by AI-Kit for Salesforce.

## CLAUDE.md Purpose

\`CLAUDE.md\` is the main project rules file for Claude Code. Claude reads it automatically when you open the project. It tells Claude:
- What kind of project this is
- What rules to follow
- What tools to use
- What is off-limits

Keep \`CLAUDE.md\` up to date as your project evolves.

## Claude Commands

Claude commands are slash commands stored in \`.claude/commands/\`. Run them in Claude Code chat.

| Command | Purpose |
|---------|---------|
| \`/review-security\` | Review changed files for Salesforce security issues |
| \`/validate-deploy\` | Validate deployment safely before applying |
| \`/write-tests\` | Create or update Apex and LWC tests |
| \`/create-apex\` | Create Apex service class with tests |
| \`/create-lwc\` | Create LWC with full state handling |
| \`/prepare-pr\` | Summarise changes and prepare PR description |

## Claude Agents (Subagents)

Subagents are specialised Claude instances stored in \`.claude/agents/\`. Use them for complex tasks.

| Agent | Role |
|-------|------|
| \`salesforce-architect\` | Architecture, data model, deployment risk |
| \`apex-developer\` | Apex, triggers, tests, async jobs |
| \`lwc-developer\` | LWC components, JS, HTML, Apex integration |
| \`qa-tester\` | Test strategy, Apex tests, LWC Jest tests |
| \`security-reviewer\` | Security, CRUD/FLS, SOQL injection, production risk |

To use a subagent, mention it in Claude Code: _"Ask the security-reviewer agent to review this class."_

## Hooks (Placeholder)

Claude Code supports pre/post-tool hooks for automation. Examples:

- Run \`sf project deploy validate\` before any deployment command.
- Run \`npm run lint:lwc\` after LWC file edits.
- Post a Slack notification when a deploy is complete.

Hook configuration goes in \`.claude/hooks/\`. See Claude Code documentation for setup.

## Multi-Terminal Orchestration (Placeholder)

Claude Code supports running multiple agents in parallel terminals. Example setup:

- Terminal 1: Apex developer agent — builds the service class.
- Terminal 2: QA tester agent — writes the test class in parallel.
- Terminal 3: Security reviewer agent — reviews both in parallel.

This is supported in Claude Code Max plan. See Claude Code documentation for setup.

## MCP Configuration

See \`docs/mcp-usage.md\`. Save the MCP config as \`.mcp.json\` for Claude Code to use.
`,
    'docs/jags-skills.md': `# Jag's Salesforce Skills

> Generated by AI-Kit for Salesforce.

## What Are Jag's Salesforce Skills?

Jag's Salesforce Skills are a community-maintained collection of reusable Cursor skill packs for Salesforce development. They provide domain-specific Salesforce guidance that Cursor can load when relevant — helping AI tools give better, more accurate Salesforce advice.

Skills can be installed at:
- **Project level:** \`.cursor/skills/\` — shared by everyone on the project
- **User level:** \`~/.cursor/skills/\` — personal skills on your machine

## How AI-Kit Skill Templates Relate to Jag's Skills

AI-Kit for Salesforce creates **local project-level skill templates** under \`.cursor/skills/\`. These are:

- Inspired by Salesforce best practices
- Formatted to be compatible with the Cursor skills workflow
- Safe to use offline without any external dependencies
- Clearly labelled as AI-Kit templates, not official Jag files

They are **not** Jag's official skill files. They are a practical starting point your team can use immediately.

## Optional: Installing Jag's Actual Skills

If your team wants to install Jag's actual Salesforce skills in the future, the command is:

\`\`\`bash
# TODO: Install Jag's Salesforce skills (review before running)
# npx skills add Jaganpro/sf-skills
\`\`\`

**Before running this:**
- Review the skill content at the source repository.
- Ensure your team is comfortable with the content in enterprise/customer projects.
- Pin the version where possible to avoid unexpected updates.

> AI-Kit for Salesforce does not automatically install external skills in the MVP. Teams should review external skills before adding them to customer or enterprise projects.

## See Also

- \`docs/skills-ecosystem.md\` — Full skills strategy including Jag's skills and Salesforce AFV Library.
- \`docs/afv-library.md\` — Salesforce's official curated agent skills library.
`,
    'docs/afv-library.md': `# Salesforce AFV Library

> Generated by AI-Kit for Salesforce.

## What is Salesforce AFV Library?

Salesforce AFV Library is Salesforce's curated collection of agent skills for building applications. It is maintained by Salesforce's engineering teams and is optimized for **Agentforce Vibes** — the AI-native development workflow for Salesforce.

Official repository: [https://github.com/forcedotcom/afv-library](https://github.com/forcedotcom/afv-library)

## Why It Matters

AFV Library provides battle-tested skill patterns for:
- Agentforce agents and topics
- Lightning app development
- Salesforce Flow
- Apex development
- SOQL queries
- Lightning Web Components
- UI bundles
- Objects and fields
- Permission sets
- And more

These skills help AI tools like Cursor and Claude Code give more accurate, Salesforce-specific guidance when working on your org.

## Relationship to Agentforce Vibes

Agentforce Vibes is Salesforce's approach to AI-native development — where AI agents assist with the full development lifecycle on Salesforce. AFV Library provides the skill layer that makes AI tools aware of Salesforce-specific patterns, APIs, and best practices.

## How It Relates to Cursor and Claude Code

AFV Library skills follow the same \`SKILL.md\`-based format used by Cursor skills. When installed, they live under \`.cursor/skills/\` and are picked up automatically by skill-aware AI tools.

## How It Differs from AI-Kit Local Templates

| | AI-Kit Local Templates | Salesforce AFV Library |
|--|------------------------|----------------------|
| Source | Bundled with AI-Kit | External — Salesforce GitHub |
| Maintenance | AI-Kit team | Salesforce engineering |
| Install | Auto-created offline | Manual install required |
| Connectivity | Works offline | Requires internet to install |
| Review needed | No — included by AI-Kit | Yes — review before installing |

## How Teams Can Optionally Install It

To install Salesforce AFV Library in your project:

\`\`\`bash
# Review the source first: https://github.com/forcedotcom/afv-library
# Then run:
npx skills add forcedotcom/afv-library
\`\`\`

Or use AI-Kit CLI (generates docs and optional setup guide only in MVP):

\`\`\`bash
ai-kit-sf add-afv-library
\`\`\`

## Security Note

> **AI-Kit for Salesforce does not automatically install external skills in the MVP.**
>
> Teams should review external skills before adding them to customer or enterprise projects.
> Pin versions where possible to avoid unexpected updates.
> Commit project-level skills to Git only after review.

## Recommended Approach

1. Start with AI-Kit local Salesforce skill templates (already installed).
2. Review AFV Library at [https://github.com/forcedotcom/afv-library](https://github.com/forcedotcom/afv-library).
3. If appropriate for your project, install with \`npx skills add forcedotcom/afv-library\`.
4. Commit the installed skills to your project repo after review.

For Agentforce projects, AFV Library is especially recommended.
`,
    'docs/skills-ecosystem.md': `# Salesforce Skills Ecosystem

> Generated by AI-Kit for Salesforce.

## Overview

AI-Kit for Salesforce supports three complementary approaches to Salesforce AI skills:

1. **AI-Kit Local Salesforce Skill Templates** — bundled, offline, immediate
2. **Jag's Salesforce Skills** — community-maintained Cursor skill packs
3. **Salesforce AFV Library** — Salesforce's curated official agent skills

Each serves a different need. This guide explains when to use each.

---

## 1. AI-Kit Local Salesforce Skill Templates

**What:** Local skill templates generated by AI-Kit for Salesforce under \`.cursor/skills/\`.

**Skills included:**
- \`salesforce-apex\` — Apex coding standards and checklist
- \`salesforce-lwc\` — LWC coding standards and checklist
- \`salesforce-flow\` — Flow review and documentation
- \`salesforce-security-review\` — Security review checklist
- \`salesforce-agentforce\` — Agentforce and invocable actions
- \`salesforce-data-cloud\` — Data Cloud integrations

**When to use:** Always — these are safe, bundled, and available offline. A good starting point for any Salesforce DX project.

**Install:** Auto-created by \`ai-kit-sf init\` or \`ai-kit-sf add-cursor\`.

---

## 2. Jag's Salesforce Skills

**What:** Community-maintained reusable Cursor skill packs for Salesforce development.

**When to use:** When your team wants additional community-maintained Salesforce guidance beyond the AI-Kit templates.

**Optional install (review before running):**

\`\`\`bash
# TODO: Review source before installing
# npx skills add Jaganpro/sf-skills
\`\`\`

See \`docs/jags-skills.md\` for more details.

---

## 3. Salesforce AFV Library

**What:** Salesforce's curated collection of agent skills for building applications — optimized for Agentforce Vibes.

**Repository:** [https://github.com/forcedotcom/afv-library](https://github.com/forcedotcom/afv-library)

**When to use:** Recommended for Agentforce projects. Useful for any project that wants Salesforce-official guidance patterns.

**Optional install (review before running):**

\`\`\`bash
# Review source first: https://github.com/forcedotcom/afv-library
npx skills add forcedotcom/afv-library
\`\`\`

See \`docs/afv-library.md\` for more details.

---

## Recommended Enterprise Approach

1. **Start with AI-Kit local templates** — safe, offline, immediately useful.
2. **Review Jag's skills and AFV Library** before installing — read the source.
3. **Pin versions** where possible to avoid unexpected updates.
4. **Commit project-level skills to Git** only after review.
5. **Avoid auto-updating skills** in sensitive customer or enterprise projects without approval.

---

## Summary Table

| | AI-Kit Templates | Jag's Skills | AFV Library |
|--|--|--|--|
| Source | Bundled | Community | Salesforce |
| Offline | Yes | No | No |
| Auto-install | Yes | No (MVP) | No (MVP) |
| Agentforce focus | Partial | General | Strong |
| Enterprise review | Not needed | Recommended | Recommended |
| Install command | auto | \`npx skills add Jaganpro/sf-skills\` | \`npx skills add forcedotcom/afv-library\` |
`,
    // ─── Task management ─────────────────────────────────────────────────────────
    'tasks/todo.md': `# Task Tracker

> This file is managed by Claude Code following the workflow standards in CLAUDE.md.
> Use it to plan, track, and review work on this Salesforce DX project.

<!-- AI-KIT-SALESFORCE:START -->

## How to use this file

Before any non-trivial task, write a plan here using checkable items:

\`\`\`markdown
## Task: <short title>

- [ ] Step one
- [ ] Step two
- [ ] Run tests
- [ ] Document results
\`\`\`

As work progresses, mark items complete. At the end of each task, add a Review section:

\`\`\`markdown
## Review

- **Summary:** What was done
- **Files changed:** list
- **Tests run:** commands and results
- **Verification:** what was confirmed
- **Known risks:** anything to watch
- **Follow-up:** remaining items
\`\`\`

<!-- AI-KIT-SALESFORCE:END -->
`,
    'tasks/lessons.md': `# Lessons Learned

> Claude Code updates this file after any correction or failed approach.
> Review relevant lessons at the start of each new task.

<!-- AI-KIT-SALESFORCE:START -->

## How to use this file

After any correction from the user or failed approach, Claude should add an entry:

\`\`\`markdown
## Lesson: <short title>

- **What went wrong:** description
- **Root cause:** why it happened
- **New rule:** how to prevent it
- **Example:** (optional)
\`\`\`

Keep lessons practical, specific, and project-relevant.
Ruthlessly iterate — if a mistake repeats, strengthen the rule.

---

## Lesson: Do not overwrite existing project files

- **What went wrong:** AI-Kit generated files replaced developer customisations.
- **Root cause:** Wrote to file without checking if it already existed.
- **New rule:** Always check for existing files before writing. Use safe merge mode with marker blocks. Create backups before modification.

<!-- AI-KIT-SALESFORCE:END -->
`,
    // ─── Cursor project rule ──────────────────────────────────────────────────
    '.cursor/rules/project.mdc': `---
description: Project-wide workflow orchestration rules for Cursor. Mirrors CLAUDE.md. Applies to all files in this Salesforce DX project.
globs: ["**/*"]
alwaysApply: true
---

# Project Workflow Rules

> This is the Cursor equivalent of CLAUDE.md.
> AGENTS.md = shared project briefing for all AI tools.
> CLAUDE.md = Claude Code workflow rules.
> This file = Cursor workflow rules.

---

## 1. Plan Mode Default

For any non-trivial task, plan before you implement.

Use a plan when:
- The task has 3 or more steps
- The task involves architectural decisions
- The task affects multiple files
- The task changes deployment behaviour
- The task changes security, permissions, data access, or Salesforce metadata
- The task requires verification or testing

Rules:
- Write a clear plan before writing code.
- Write specs upfront to reduce ambiguity.
- If something goes sideways, stop and re-plan.
- Do not keep pushing through a broken approach.
- For simple fixes, keep the plan short.

## 2. Task Management

Write plans and progress to \`tasks/todo.md\`.

Use checkable items:

\`\`\`markdown
- [ ] Step one
- [ ] Step two
- [ ] Run tests
- [ ] Document results
\`\`\`

Add a review section when the task is done:

\`\`\`markdown
## Review
- Summary, files changed, tests run, risks, follow-ups
\`\`\`

## 3. Capture Lessons

After any correction or failed approach, update \`tasks/lessons.md\`.

Include:
- What went wrong
- Root cause
- New rule to prevent it

## 4. Verification Before Done

Never mark a task complete without proving it works.

- Run relevant tests where possible.
- Run lint or formatting checks where relevant.
- Check logs when debugging.
- Demonstrate correctness with evidence.
- If tests cannot be run, explain why and give the command.

Before finishing, include:
- What changed
- What was verified
- What tests or commands were run
- Any remaining risks or manual steps

## 5. Demand Elegance, But Stay Practical

For non-trivial changes, ask: "Is there a more elegant way?"

- If a fix feels hacky, rethink it.
- Prefer clean, simple, maintainable solutions.
- Avoid over-engineering simple fixes.
- Use the smallest change that solves the root cause properly.

Guiding question: "Knowing everything I know now, what is the cleanest implementation?"

## 6. Autonomous Bug Fixing

When given a bug report:
- Do not ask for hand-holding.
- Inspect logs, errors, failing tests, and relevant files.
- Identify the root cause.
- Implement the fix.
- Verify the fix.
- Explain the result clearly.

---

## Salesforce DX Rules

- Use \`sf\` CLI (not deprecated \`sfdx\`) unless required.
- Read existing files before making changes.
- Bulkify all Apex: no SOQL or DML inside loops.
- Use \`with sharing\` by default.
- Avoid hardcoded IDs. Use Custom Metadata for configurable values.
- Enforce CRUD/FLS where needed.
- Use Named Credentials for callouts.
- Prefer Permission Sets over Profiles.

## MCP Rules

- Prefer Salesforce DX MCP for all org operations.
- Confirm org alias before any write operation.
- Use read-only mode for production orgs.
- Ask before any destructive or data-mutating operation.

## Security Rules

- Never expose secrets, tokens, session IDs, JWTs, or private keys.
- Never log or paste sensitive customer data.
- Do not run anonymous Apex that mutates data without explicit approval.
- Do not make production changes without human confirmation.
- Do not store credentials or create auth files.

## Minimal Impact

- Touch the minimum amount of code.
- Avoid unrelated refactors or formatting changes.
- Preserve existing project conventions and structure.
- Avoid introducing bugs through broad changes.

---

## Definition of Done

A task is only done when:
- [ ] The planned work is complete
- [ ] Relevant files are updated
- [ ] Tests or validation commands were run where possible
- [ ] Results are documented in \`tasks/todo.md\`
- [ ] \`tasks/lessons.md\` is updated if any correction occurred
- [ ] No credentials or secrets are exposed
- [ ] Security reviewed where relevant
`,
};
function getTemplate(key) {
    const tpl = exports.TEMPLATES[key];
    if (!tpl)
        throw new Error(`Template not found: ${key}`);
    return tpl;
}
function hasTemplate(key) {
    return key in exports.TEMPLATES;
}
/** Returns template content wrapped in AI-KIT marker block */
function wrapInMarker(content) {
    return `${exports.MARKER_START}\n${content}\n${exports.MARKER_END}\n`;
}
//# sourceMappingURL=templates.js.map

/***/ }),

/***/ 5117:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=types.js.map

/***/ }),

/***/ 7009:
/***/ ((module) => {

module.exports = eval("require")("node-fetch");


/***/ }),

/***/ 2613:
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ 9140:
/***/ ((module) => {

"use strict";
module.exports = require("constants");

/***/ }),

/***/ 4434:
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 9896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 1421:
/***/ ((module) => {

"use strict";
module.exports = require("node:child_process");

/***/ }),

/***/ 8474:
/***/ ((module) => {

"use strict";
module.exports = require("node:events");

/***/ }),

/***/ 3024:
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ 6760:
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ 1708:
/***/ ((module) => {

"use strict";
module.exports = require("node:process");

/***/ }),

/***/ 857:
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 6928:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 3785:
/***/ ((module) => {

"use strict";
module.exports = require("readline");

/***/ }),

/***/ 2203:
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ 2018:
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ 9023:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ 7313:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const { Argument } = __nccwpck_require__(854);
const { Command } = __nccwpck_require__(9600);
const { CommanderError, InvalidArgumentError } = __nccwpck_require__(9851);
const { Help } = __nccwpck_require__(1518);
const { Option } = __nccwpck_require__(7596);

exports.program = new Command();

exports.createCommand = (name) => new Command(name);
exports.createOption = (flags, description) => new Option(flags, description);
exports.createArgument = (name, description) => new Argument(name, description);

/**
 * Expose classes
 */

exports.Command = Command;
exports.Option = Option;
exports.Argument = Argument;
exports.Help = Help;

exports.CommanderError = CommanderError;
exports.InvalidArgumentError = InvalidArgumentError;
exports.InvalidOptionArgumentError = InvalidArgumentError; // Deprecated


/***/ }),

/***/ 854:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const { InvalidArgumentError } = __nccwpck_require__(9851);

class Argument {
  /**
   * Initialize a new command argument with the given name and description.
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @param {string} name
   * @param {string} [description]
   */

  constructor(name, description) {
    this.description = description || '';
    this.variadic = false;
    this.parseArg = undefined;
    this.defaultValue = undefined;
    this.defaultValueDescription = undefined;
    this.argChoices = undefined;

    switch (name[0]) {
      case '<': // e.g. <required>
        this.required = true;
        this._name = name.slice(1, -1);
        break;
      case '[': // e.g. [optional]
        this.required = false;
        this._name = name.slice(1, -1);
        break;
      default:
        this.required = true;
        this._name = name;
        break;
    }

    if (this._name.length > 3 && this._name.slice(-3) === '...') {
      this.variadic = true;
      this._name = this._name.slice(0, -3);
    }
  }

  /**
   * Return argument name.
   *
   * @return {string}
   */

  name() {
    return this._name;
  }

  /**
   * @package
   */

  _concatValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }

    return previous.concat(value);
  }

  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {*} value
   * @param {string} [description]
   * @return {Argument}
   */

  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }

  /**
   * Set the custom handler for processing CLI command arguments into argument values.
   *
   * @param {Function} [fn]
   * @return {Argument}
   */

  argParser(fn) {
    this.parseArg = fn;
    return this;
  }

  /**
   * Only allow argument value to be one of choices.
   *
   * @param {string[]} values
   * @return {Argument}
   */

  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError(
          `Allowed choices are ${this.argChoices.join(', ')}.`,
        );
      }
      if (this.variadic) {
        return this._concatValue(arg, previous);
      }
      return arg;
    };
    return this;
  }

  /**
   * Make argument required.
   *
   * @returns {Argument}
   */
  argRequired() {
    this.required = true;
    return this;
  }

  /**
   * Make argument optional.
   *
   * @returns {Argument}
   */
  argOptional() {
    this.required = false;
    return this;
  }
}

/**
 * Takes an argument and returns its human readable equivalent for help usage.
 *
 * @param {Argument} arg
 * @return {string}
 * @private
 */

function humanReadableArgName(arg) {
  const nameOutput = arg.name() + (arg.variadic === true ? '...' : '');

  return arg.required ? '<' + nameOutput + '>' : '[' + nameOutput + ']';
}

exports.Argument = Argument;
exports.humanReadableArgName = humanReadableArgName;


/***/ }),

/***/ 9600:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const EventEmitter = (__nccwpck_require__(8474).EventEmitter);
const childProcess = __nccwpck_require__(1421);
const path = __nccwpck_require__(6760);
const fs = __nccwpck_require__(3024);
const process = __nccwpck_require__(1708);

const { Argument, humanReadableArgName } = __nccwpck_require__(854);
const { CommanderError } = __nccwpck_require__(9851);
const { Help } = __nccwpck_require__(1518);
const { Option, DualOptions } = __nccwpck_require__(7596);
const { suggestSimilar } = __nccwpck_require__(9266);

class Command extends EventEmitter {
  /**
   * Initialize a new `Command`.
   *
   * @param {string} [name]
   */

  constructor(name) {
    super();
    /** @type {Command[]} */
    this.commands = [];
    /** @type {Option[]} */
    this.options = [];
    this.parent = null;
    this._allowUnknownOption = false;
    this._allowExcessArguments = true;
    /** @type {Argument[]} */
    this.registeredArguments = [];
    this._args = this.registeredArguments; // deprecated old name
    /** @type {string[]} */
    this.args = []; // cli args with options removed
    this.rawArgs = [];
    this.processedArgs = []; // like .args but after custom processing and collecting variadic
    this._scriptPath = null;
    this._name = name || '';
    this._optionValues = {};
    this._optionValueSources = {}; // default, env, cli etc
    this._storeOptionsAsProperties = false;
    this._actionHandler = null;
    this._executableHandler = false;
    this._executableFile = null; // custom name for executable
    this._executableDir = null; // custom search directory for subcommands
    this._defaultCommandName = null;
    this._exitCallback = null;
    this._aliases = [];
    this._combineFlagAndOptionalValue = true;
    this._description = '';
    this._summary = '';
    this._argsDescription = undefined; // legacy
    this._enablePositionalOptions = false;
    this._passThroughOptions = false;
    this._lifeCycleHooks = {}; // a hash of arrays
    /** @type {(boolean | string)} */
    this._showHelpAfterError = false;
    this._showSuggestionAfterError = true;

    // see .configureOutput() for docs
    this._outputConfiguration = {
      writeOut: (str) => process.stdout.write(str),
      writeErr: (str) => process.stderr.write(str),
      getOutHelpWidth: () =>
        process.stdout.isTTY ? process.stdout.columns : undefined,
      getErrHelpWidth: () =>
        process.stderr.isTTY ? process.stderr.columns : undefined,
      outputError: (str, write) => write(str),
    };

    this._hidden = false;
    /** @type {(Option | null | undefined)} */
    this._helpOption = undefined; // Lazy created on demand. May be null if help option is disabled.
    this._addImplicitHelpCommand = undefined; // undecided whether true or false yet, not inherited
    /** @type {Command} */
    this._helpCommand = undefined; // lazy initialised, inherited
    this._helpConfiguration = {};
  }

  /**
   * Copy settings that are useful to have in common across root command and subcommands.
   *
   * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
   *
   * @param {Command} sourceCommand
   * @return {Command} `this` command for chaining
   */
  copyInheritedSettings(sourceCommand) {
    this._outputConfiguration = sourceCommand._outputConfiguration;
    this._helpOption = sourceCommand._helpOption;
    this._helpCommand = sourceCommand._helpCommand;
    this._helpConfiguration = sourceCommand._helpConfiguration;
    this._exitCallback = sourceCommand._exitCallback;
    this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
    this._combineFlagAndOptionalValue =
      sourceCommand._combineFlagAndOptionalValue;
    this._allowExcessArguments = sourceCommand._allowExcessArguments;
    this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
    this._showHelpAfterError = sourceCommand._showHelpAfterError;
    this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;

    return this;
  }

  /**
   * @returns {Command[]}
   * @private
   */

  _getCommandAndAncestors() {
    const result = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    for (let command = this; command; command = command.parent) {
      result.push(command);
    }
    return result;
  }

  /**
   * Define a command.
   *
   * There are two styles of command: pay attention to where to put the description.
   *
   * @example
   * // Command implemented using action handler (description is supplied separately to `.command`)
   * program
   *   .command('clone <source> [destination]')
   *   .description('clone a repository into a newly created directory')
   *   .action((source, destination) => {
   *     console.log('clone command called');
   *   });
   *
   * // Command implemented using separate executable file (description is second parameter to `.command`)
   * program
   *   .command('start <service>', 'start named service')
   *   .command('stop [service]', 'stop named service, or all if no name supplied');
   *
   * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
   * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
   * @param {object} [execOpts] - configuration options (for executable)
   * @return {Command} returns new command for action handler, or `this` for executable command
   */

  command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
    let desc = actionOptsOrExecDesc;
    let opts = execOpts;
    if (typeof desc === 'object' && desc !== null) {
      opts = desc;
      desc = null;
    }
    opts = opts || {};
    const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);

    const cmd = this.createCommand(name);
    if (desc) {
      cmd.description(desc);
      cmd._executableHandler = true;
    }
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    cmd._hidden = !!(opts.noHelp || opts.hidden); // noHelp is deprecated old name for hidden
    cmd._executableFile = opts.executableFile || null; // Custom name for executable file, set missing to null to match constructor
    if (args) cmd.arguments(args);
    this._registerCommand(cmd);
    cmd.parent = this;
    cmd.copyInheritedSettings(this);

    if (desc) return this;
    return cmd;
  }

  /**
   * Factory routine to create a new unattached command.
   *
   * See .command() for creating an attached subcommand, which uses this routine to
   * create the command. You can override createCommand to customise subcommands.
   *
   * @param {string} [name]
   * @return {Command} new command
   */

  createCommand(name) {
    return new Command(name);
  }

  /**
   * You can customise the help with a subclass of Help by overriding createHelp,
   * or by overriding Help properties using configureHelp().
   *
   * @return {Help}
   */

  createHelp() {
    return Object.assign(new Help(), this.configureHelp());
  }

  /**
   * You can customise the help by overriding Help properties using configureHelp(),
   * or with a subclass of Help by overriding createHelp().
   *
   * @param {object} [configuration] - configuration options
   * @return {(Command | object)} `this` command for chaining, or stored configuration
   */

  configureHelp(configuration) {
    if (configuration === undefined) return this._helpConfiguration;

    this._helpConfiguration = configuration;
    return this;
  }

  /**
   * The default output goes to stdout and stderr. You can customise this for special
   * applications. You can also customise the display of errors by overriding outputError.
   *
   * The configuration properties are all functions:
   *
   *     // functions to change where being written, stdout and stderr
   *     writeOut(str)
   *     writeErr(str)
   *     // matching functions to specify width for wrapping help
   *     getOutHelpWidth()
   *     getErrHelpWidth()
   *     // functions based on what is being written out
   *     outputError(str, write) // used for displaying errors, and not used for displaying help
   *
   * @param {object} [configuration] - configuration options
   * @return {(Command | object)} `this` command for chaining, or stored configuration
   */

  configureOutput(configuration) {
    if (configuration === undefined) return this._outputConfiguration;

    Object.assign(this._outputConfiguration, configuration);
    return this;
  }

  /**
   * Display the help or a custom message after an error occurs.
   *
   * @param {(boolean|string)} [displayHelp]
   * @return {Command} `this` command for chaining
   */
  showHelpAfterError(displayHelp = true) {
    if (typeof displayHelp !== 'string') displayHelp = !!displayHelp;
    this._showHelpAfterError = displayHelp;
    return this;
  }

  /**
   * Display suggestion of similar commands for unknown commands, or options for unknown options.
   *
   * @param {boolean} [displaySuggestion]
   * @return {Command} `this` command for chaining
   */
  showSuggestionAfterError(displaySuggestion = true) {
    this._showSuggestionAfterError = !!displaySuggestion;
    return this;
  }

  /**
   * Add a prepared subcommand.
   *
   * See .command() for creating an attached subcommand which inherits settings from its parent.
   *
   * @param {Command} cmd - new subcommand
   * @param {object} [opts] - configuration options
   * @return {Command} `this` command for chaining
   */

  addCommand(cmd, opts) {
    if (!cmd._name) {
      throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
    }

    opts = opts || {};
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    if (opts.noHelp || opts.hidden) cmd._hidden = true; // modifying passed command due to existing implementation

    this._registerCommand(cmd);
    cmd.parent = this;
    cmd._checkForBrokenPassThrough();

    return this;
  }

  /**
   * Factory routine to create a new unattached argument.
   *
   * See .argument() for creating an attached argument, which uses this routine to
   * create the argument. You can override createArgument to return a custom argument.
   *
   * @param {string} name
   * @param {string} [description]
   * @return {Argument} new argument
   */

  createArgument(name, description) {
    return new Argument(name, description);
  }

  /**
   * Define argument syntax for command.
   *
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @example
   * program.argument('<input-file>');
   * program.argument('[output-file]');
   *
   * @param {string} name
   * @param {string} [description]
   * @param {(Function|*)} [fn] - custom argument processing function
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */
  argument(name, description, fn, defaultValue) {
    const argument = this.createArgument(name, description);
    if (typeof fn === 'function') {
      argument.default(defaultValue).argParser(fn);
    } else {
      argument.default(fn);
    }
    this.addArgument(argument);
    return this;
  }

  /**
   * Define argument syntax for command, adding multiple at once (without descriptions).
   *
   * See also .argument().
   *
   * @example
   * program.arguments('<cmd> [env]');
   *
   * @param {string} names
   * @return {Command} `this` command for chaining
   */

  arguments(names) {
    names
      .trim()
      .split(/ +/)
      .forEach((detail) => {
        this.argument(detail);
      });
    return this;
  }

  /**
   * Define argument syntax for command, adding a prepared argument.
   *
   * @param {Argument} argument
   * @return {Command} `this` command for chaining
   */
  addArgument(argument) {
    const previousArgument = this.registeredArguments.slice(-1)[0];
    if (previousArgument && previousArgument.variadic) {
      throw new Error(
        `only the last argument can be variadic '${previousArgument.name()}'`,
      );
    }
    if (
      argument.required &&
      argument.defaultValue !== undefined &&
      argument.parseArg === undefined
    ) {
      throw new Error(
        `a default value for a required argument is never used: '${argument.name()}'`,
      );
    }
    this.registeredArguments.push(argument);
    return this;
  }

  /**
   * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
   *
   * @example
   *    program.helpCommand('help [cmd]');
   *    program.helpCommand('help [cmd]', 'show help');
   *    program.helpCommand(false); // suppress default help command
   *    program.helpCommand(true); // add help command even if no subcommands
   *
   * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
   * @param {string} [description] - custom description
   * @return {Command} `this` command for chaining
   */

  helpCommand(enableOrNameAndArgs, description) {
    if (typeof enableOrNameAndArgs === 'boolean') {
      this._addImplicitHelpCommand = enableOrNameAndArgs;
      return this;
    }

    enableOrNameAndArgs = enableOrNameAndArgs ?? 'help [command]';
    const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
    const helpDescription = description ?? 'display help for command';

    const helpCommand = this.createCommand(helpName);
    helpCommand.helpOption(false);
    if (helpArgs) helpCommand.arguments(helpArgs);
    if (helpDescription) helpCommand.description(helpDescription);

    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;

    return this;
  }

  /**
   * Add prepared custom help command.
   *
   * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
   * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
   * @return {Command} `this` command for chaining
   */
  addHelpCommand(helpCommand, deprecatedDescription) {
    // If not passed an object, call through to helpCommand for backwards compatibility,
    // as addHelpCommand was originally used like helpCommand is now.
    if (typeof helpCommand !== 'object') {
      this.helpCommand(helpCommand, deprecatedDescription);
      return this;
    }

    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;
    return this;
  }

  /**
   * Lazy create help command.
   *
   * @return {(Command|null)}
   * @package
   */
  _getHelpCommand() {
    const hasImplicitHelpCommand =
      this._addImplicitHelpCommand ??
      (this.commands.length &&
        !this._actionHandler &&
        !this._findCommand('help'));

    if (hasImplicitHelpCommand) {
      if (this._helpCommand === undefined) {
        this.helpCommand(undefined, undefined); // use default name and description
      }
      return this._helpCommand;
    }
    return null;
  }

  /**
   * Add hook for life cycle event.
   *
   * @param {string} event
   * @param {Function} listener
   * @return {Command} `this` command for chaining
   */

  hook(event, listener) {
    const allowedValues = ['preSubcommand', 'preAction', 'postAction'];
    if (!allowedValues.includes(event)) {
      throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    if (this._lifeCycleHooks[event]) {
      this._lifeCycleHooks[event].push(listener);
    } else {
      this._lifeCycleHooks[event] = [listener];
    }
    return this;
  }

  /**
   * Register callback to use as replacement for calling process.exit.
   *
   * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
   * @return {Command} `this` command for chaining
   */

  exitOverride(fn) {
    if (fn) {
      this._exitCallback = fn;
    } else {
      this._exitCallback = (err) => {
        if (err.code !== 'commander.executeSubCommandAsync') {
          throw err;
        } else {
          // Async callback from spawn events, not useful to throw.
        }
      };
    }
    return this;
  }

  /**
   * Call process.exit, and _exitCallback if defined.
   *
   * @param {number} exitCode exit code for using with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   * @return never
   * @private
   */

  _exit(exitCode, code, message) {
    if (this._exitCallback) {
      this._exitCallback(new CommanderError(exitCode, code, message));
      // Expecting this line is not reached.
    }
    process.exit(exitCode);
  }

  /**
   * Register callback `fn` for the command.
   *
   * @example
   * program
   *   .command('serve')
   *   .description('start service')
   *   .action(function() {
   *      // do work here
   *   });
   *
   * @param {Function} fn
   * @return {Command} `this` command for chaining
   */

  action(fn) {
    const listener = (args) => {
      // The .action callback takes an extra parameter which is the command or options.
      const expectedArgsCount = this.registeredArguments.length;
      const actionArgs = args.slice(0, expectedArgsCount);
      if (this._storeOptionsAsProperties) {
        actionArgs[expectedArgsCount] = this; // backwards compatible "options"
      } else {
        actionArgs[expectedArgsCount] = this.opts();
      }
      actionArgs.push(this);

      return fn.apply(this, actionArgs);
    };
    this._actionHandler = listener;
    return this;
  }

  /**
   * Factory routine to create a new unattached option.
   *
   * See .option() for creating an attached option, which uses this routine to
   * create the option. You can override createOption to return a custom option.
   *
   * @param {string} flags
   * @param {string} [description]
   * @return {Option} new option
   */

  createOption(flags, description) {
    return new Option(flags, description);
  }

  /**
   * Wrap parseArgs to catch 'commander.invalidArgument'.
   *
   * @param {(Option | Argument)} target
   * @param {string} value
   * @param {*} previous
   * @param {string} invalidArgumentMessage
   * @private
   */

  _callParseArg(target, value, previous, invalidArgumentMessage) {
    try {
      return target.parseArg(value, previous);
    } catch (err) {
      if (err.code === 'commander.invalidArgument') {
        const message = `${invalidArgumentMessage} ${err.message}`;
        this.error(message, { exitCode: err.exitCode, code: err.code });
      }
      throw err;
    }
  }

  /**
   * Check for option flag conflicts.
   * Register option if no conflicts found, or throw on conflict.
   *
   * @param {Option} option
   * @private
   */

  _registerOption(option) {
    const matchingOption =
      (option.short && this._findOption(option.short)) ||
      (option.long && this._findOption(option.long));
    if (matchingOption) {
      const matchingFlag =
        option.long && this._findOption(option.long)
          ? option.long
          : option.short;
      throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
    }

    this.options.push(option);
  }

  /**
   * Check for command name and alias conflicts with existing commands.
   * Register command if no conflicts found, or throw on conflict.
   *
   * @param {Command} command
   * @private
   */

  _registerCommand(command) {
    const knownBy = (cmd) => {
      return [cmd.name()].concat(cmd.aliases());
    };

    const alreadyUsed = knownBy(command).find((name) =>
      this._findCommand(name),
    );
    if (alreadyUsed) {
      const existingCmd = knownBy(this._findCommand(alreadyUsed)).join('|');
      const newCmd = knownBy(command).join('|');
      throw new Error(
        `cannot add command '${newCmd}' as already have command '${existingCmd}'`,
      );
    }

    this.commands.push(command);
  }

  /**
   * Add an option.
   *
   * @param {Option} option
   * @return {Command} `this` command for chaining
   */
  addOption(option) {
    this._registerOption(option);

    const oname = option.name();
    const name = option.attributeName();

    // store default value
    if (option.negate) {
      // --no-foo is special and defaults foo to true, unless a --foo option is already defined
      const positiveLongFlag = option.long.replace(/^--no-/, '--');
      if (!this._findOption(positiveLongFlag)) {
        this.setOptionValueWithSource(
          name,
          option.defaultValue === undefined ? true : option.defaultValue,
          'default',
        );
      }
    } else if (option.defaultValue !== undefined) {
      this.setOptionValueWithSource(name, option.defaultValue, 'default');
    }

    // handler for cli and env supplied values
    const handleOptionValue = (val, invalidValueMessage, valueSource) => {
      // val is null for optional option used without an optional-argument.
      // val is undefined for boolean and negated option.
      if (val == null && option.presetArg !== undefined) {
        val = option.presetArg;
      }

      // custom processing
      const oldValue = this.getOptionValue(name);
      if (val !== null && option.parseArg) {
        val = this._callParseArg(option, val, oldValue, invalidValueMessage);
      } else if (val !== null && option.variadic) {
        val = option._concatValue(val, oldValue);
      }

      // Fill-in appropriate missing values. Long winded but easy to follow.
      if (val == null) {
        if (option.negate) {
          val = false;
        } else if (option.isBoolean() || option.optional) {
          val = true;
        } else {
          val = ''; // not normal, parseArg might have failed or be a mock function for testing
        }
      }
      this.setOptionValueWithSource(name, val, valueSource);
    };

    this.on('option:' + oname, (val) => {
      const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
      handleOptionValue(val, invalidValueMessage, 'cli');
    });

    if (option.envVar) {
      this.on('optionEnv:' + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, 'env');
      });
    }

    return this;
  }

  /**
   * Internal implementation shared by .option() and .requiredOption()
   *
   * @return {Command} `this` command for chaining
   * @private
   */
  _optionEx(config, flags, description, fn, defaultValue) {
    if (typeof flags === 'object' && flags instanceof Option) {
      throw new Error(
        'To add an Option object use addOption() instead of option() or requiredOption()',
      );
    }
    const option = this.createOption(flags, description);
    option.makeOptionMandatory(!!config.mandatory);
    if (typeof fn === 'function') {
      option.default(defaultValue).argParser(fn);
    } else if (fn instanceof RegExp) {
      // deprecated
      const regex = fn;
      fn = (val, def) => {
        const m = regex.exec(val);
        return m ? m[0] : def;
      };
      option.default(defaultValue).argParser(fn);
    } else {
      option.default(fn);
    }

    return this.addOption(option);
  }

  /**
   * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
   * option-argument is indicated by `<>` and an optional option-argument by `[]`.
   *
   * See the README for more details, and see also addOption() and requiredOption().
   *
   * @example
   * program
   *     .option('-p, --pepper', 'add pepper')
   *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
   *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
   *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
   *
   * @param {string} flags
   * @param {string} [description]
   * @param {(Function|*)} [parseArg] - custom option processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */

  option(flags, description, parseArg, defaultValue) {
    return this._optionEx({}, flags, description, parseArg, defaultValue);
  }

  /**
   * Add a required option which must have a value after parsing. This usually means
   * the option must be specified on the command line. (Otherwise the same as .option().)
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
   *
   * @param {string} flags
   * @param {string} [description]
   * @param {(Function|*)} [parseArg] - custom option processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */

  requiredOption(flags, description, parseArg, defaultValue) {
    return this._optionEx(
      { mandatory: true },
      flags,
      description,
      parseArg,
      defaultValue,
    );
  }

  /**
   * Alter parsing of short flags with optional values.
   *
   * @example
   * // for `.option('-f,--flag [value]'):
   * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
   * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
   *
   * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
   * @return {Command} `this` command for chaining
   */
  combineFlagAndOptionalValue(combine = true) {
    this._combineFlagAndOptionalValue = !!combine;
    return this;
  }

  /**
   * Allow unknown options on the command line.
   *
   * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
   * @return {Command} `this` command for chaining
   */
  allowUnknownOption(allowUnknown = true) {
    this._allowUnknownOption = !!allowUnknown;
    return this;
  }

  /**
   * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
   *
   * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
   * @return {Command} `this` command for chaining
   */
  allowExcessArguments(allowExcess = true) {
    this._allowExcessArguments = !!allowExcess;
    return this;
  }

  /**
   * Enable positional options. Positional means global options are specified before subcommands which lets
   * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
   * The default behaviour is non-positional and global options may appear anywhere on the command line.
   *
   * @param {boolean} [positional]
   * @return {Command} `this` command for chaining
   */
  enablePositionalOptions(positional = true) {
    this._enablePositionalOptions = !!positional;
    return this;
  }

  /**
   * Pass through options that come after command-arguments rather than treat them as command-options,
   * so actual command-options come before command-arguments. Turning this on for a subcommand requires
   * positional options to have been enabled on the program (parent commands).
   * The default behaviour is non-positional and options may appear before or after command-arguments.
   *
   * @param {boolean} [passThrough] for unknown options.
   * @return {Command} `this` command for chaining
   */
  passThroughOptions(passThrough = true) {
    this._passThroughOptions = !!passThrough;
    this._checkForBrokenPassThrough();
    return this;
  }

  /**
   * @private
   */

  _checkForBrokenPassThrough() {
    if (
      this.parent &&
      this._passThroughOptions &&
      !this.parent._enablePositionalOptions
    ) {
      throw new Error(
        `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`,
      );
    }
  }

  /**
   * Whether to store option values as properties on command object,
   * or store separately (specify false). In both cases the option values can be accessed using .opts().
   *
   * @param {boolean} [storeAsProperties=true]
   * @return {Command} `this` command for chaining
   */

  storeOptionsAsProperties(storeAsProperties = true) {
    if (this.options.length) {
      throw new Error('call .storeOptionsAsProperties() before adding options');
    }
    if (Object.keys(this._optionValues).length) {
      throw new Error(
        'call .storeOptionsAsProperties() before setting option values',
      );
    }
    this._storeOptionsAsProperties = !!storeAsProperties;
    return this;
  }

  /**
   * Retrieve option value.
   *
   * @param {string} key
   * @return {object} value
   */

  getOptionValue(key) {
    if (this._storeOptionsAsProperties) {
      return this[key];
    }
    return this._optionValues[key];
  }

  /**
   * Store option value.
   *
   * @param {string} key
   * @param {object} value
   * @return {Command} `this` command for chaining
   */

  setOptionValue(key, value) {
    return this.setOptionValueWithSource(key, value, undefined);
  }

  /**
   * Store option value and where the value came from.
   *
   * @param {string} key
   * @param {object} value
   * @param {string} source - expected values are default/config/env/cli/implied
   * @return {Command} `this` command for chaining
   */

  setOptionValueWithSource(key, value, source) {
    if (this._storeOptionsAsProperties) {
      this[key] = value;
    } else {
      this._optionValues[key] = value;
    }
    this._optionValueSources[key] = source;
    return this;
  }

  /**
   * Get source of option value.
   * Expected values are default | config | env | cli | implied
   *
   * @param {string} key
   * @return {string}
   */

  getOptionValueSource(key) {
    return this._optionValueSources[key];
  }

  /**
   * Get source of option value. See also .optsWithGlobals().
   * Expected values are default | config | env | cli | implied
   *
   * @param {string} key
   * @return {string}
   */

  getOptionValueSourceWithGlobals(key) {
    // global overwrites local, like optsWithGlobals
    let source;
    this._getCommandAndAncestors().forEach((cmd) => {
      if (cmd.getOptionValueSource(key) !== undefined) {
        source = cmd.getOptionValueSource(key);
      }
    });
    return source;
  }

  /**
   * Get user arguments from implied or explicit arguments.
   * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
   *
   * @private
   */

  _prepareUserArgs(argv, parseOptions) {
    if (argv !== undefined && !Array.isArray(argv)) {
      throw new Error('first parameter to parse must be array or undefined');
    }
    parseOptions = parseOptions || {};

    // auto-detect argument conventions if nothing supplied
    if (argv === undefined && parseOptions.from === undefined) {
      if (process.versions?.electron) {
        parseOptions.from = 'electron';
      }
      // check node specific options for scenarios where user CLI args follow executable without scriptname
      const execArgv = process.execArgv ?? [];
      if (
        execArgv.includes('-e') ||
        execArgv.includes('--eval') ||
        execArgv.includes('-p') ||
        execArgv.includes('--print')
      ) {
        parseOptions.from = 'eval'; // internal usage, not documented
      }
    }

    // default to using process.argv
    if (argv === undefined) {
      argv = process.argv;
    }
    this.rawArgs = argv.slice();

    // extract the user args and scriptPath
    let userArgs;
    switch (parseOptions.from) {
      case undefined:
      case 'node':
        this._scriptPath = argv[1];
        userArgs = argv.slice(2);
        break;
      case 'electron':
        // @ts-ignore: because defaultApp is an unknown property
        if (process.defaultApp) {
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
        } else {
          userArgs = argv.slice(1);
        }
        break;
      case 'user':
        userArgs = argv.slice(0);
        break;
      case 'eval':
        userArgs = argv.slice(1);
        break;
      default:
        throw new Error(
          `unexpected parse option { from: '${parseOptions.from}' }`,
        );
    }

    // Find default name for program from arguments.
    if (!this._name && this._scriptPath)
      this.nameFromFilename(this._scriptPath);
    this._name = this._name || 'program';

    return userArgs;
  }

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Use parseAsync instead of parse if any of your action handlers are async.
   *
   * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
   *
   * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
   * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
   * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
   * - `'user'`: just user arguments
   *
   * @example
   * program.parse(); // parse process.argv and auto-detect electron and special node flags
   * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
   * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv] - optional, defaults to process.argv
   * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
   * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
   * @return {Command} `this` command for chaining
   */

  parse(argv, parseOptions) {
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    this._parseCommand([], userArgs);

    return this;
  }

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
   *
   * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
   * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
   * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
   * - `'user'`: just user arguments
   *
   * @example
   * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
   * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
   * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv]
   * @param {object} [parseOptions]
   * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
   * @return {Promise}
   */

  async parseAsync(argv, parseOptions) {
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    await this._parseCommand([], userArgs);

    return this;
  }

  /**
   * Execute a sub-command executable.
   *
   * @private
   */

  _executeSubCommand(subcommand, args) {
    args = args.slice();
    let launchWithNode = false; // Use node for source targets so do not need to get permissions correct, and on Windows.
    const sourceExt = ['.js', '.ts', '.tsx', '.mjs', '.cjs'];

    function findFile(baseDir, baseName) {
      // Look for specified file
      const localBin = path.resolve(baseDir, baseName);
      if (fs.existsSync(localBin)) return localBin;

      // Stop looking if candidate already has an expected extension.
      if (sourceExt.includes(path.extname(baseName))) return undefined;

      // Try all the extensions.
      const foundExt = sourceExt.find((ext) =>
        fs.existsSync(`${localBin}${ext}`),
      );
      if (foundExt) return `${localBin}${foundExt}`;

      return undefined;
    }

    // Not checking for help first. Unlikely to have mandatory and executable, and can't robustly test for help flags in external command.
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();

    // executableFile and executableDir might be full path, or just a name
    let executableFile =
      subcommand._executableFile || `${this._name}-${subcommand._name}`;
    let executableDir = this._executableDir || '';
    if (this._scriptPath) {
      let resolvedScriptPath; // resolve possible symlink for installed npm binary
      try {
        resolvedScriptPath = fs.realpathSync(this._scriptPath);
      } catch (err) {
        resolvedScriptPath = this._scriptPath;
      }
      executableDir = path.resolve(
        path.dirname(resolvedScriptPath),
        executableDir,
      );
    }

    // Look for a local file in preference to a command in PATH.
    if (executableDir) {
      let localFile = findFile(executableDir, executableFile);

      // Legacy search using prefix of script name instead of command name
      if (!localFile && !subcommand._executableFile && this._scriptPath) {
        const legacyName = path.basename(
          this._scriptPath,
          path.extname(this._scriptPath),
        );
        if (legacyName !== this._name) {
          localFile = findFile(
            executableDir,
            `${legacyName}-${subcommand._name}`,
          );
        }
      }
      executableFile = localFile || executableFile;
    }

    launchWithNode = sourceExt.includes(path.extname(executableFile));

    let proc;
    if (process.platform !== 'win32') {
      if (launchWithNode) {
        args.unshift(executableFile);
        // add executable arguments to spawn
        args = incrementNodeInspectorPort(process.execArgv).concat(args);

        proc = childProcess.spawn(process.argv[0], args, { stdio: 'inherit' });
      } else {
        proc = childProcess.spawn(executableFile, args, { stdio: 'inherit' });
      }
    } else {
      args.unshift(executableFile);
      // add executable arguments to spawn
      args = incrementNodeInspectorPort(process.execArgv).concat(args);
      proc = childProcess.spawn(process.execPath, args, { stdio: 'inherit' });
    }

    if (!proc.killed) {
      // testing mainly to avoid leak warnings during unit tests with mocked spawn
      const signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
      signals.forEach((signal) => {
        process.on(signal, () => {
          if (proc.killed === false && proc.exitCode === null) {
            // @ts-ignore because signals not typed to known strings
            proc.kill(signal);
          }
        });
      });
    }

    // By default terminate process when spawned process terminates.
    const exitCallback = this._exitCallback;
    proc.on('close', (code) => {
      code = code ?? 1; // code is null if spawned process terminated due to a signal
      if (!exitCallback) {
        process.exit(code);
      } else {
        exitCallback(
          new CommanderError(
            code,
            'commander.executeSubCommandAsync',
            '(close)',
          ),
        );
      }
    });
    proc.on('error', (err) => {
      // @ts-ignore: because err.code is an unknown property
      if (err.code === 'ENOENT') {
        const executableDirMessage = executableDir
          ? `searched for local subcommand relative to directory '${executableDir}'`
          : 'no directory for search for local subcommand, use .executableDir() to supply a custom directory';
        const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
        throw new Error(executableMissing);
        // @ts-ignore: because err.code is an unknown property
      } else if (err.code === 'EACCES') {
        throw new Error(`'${executableFile}' not executable`);
      }
      if (!exitCallback) {
        process.exit(1);
      } else {
        const wrappedError = new CommanderError(
          1,
          'commander.executeSubCommandAsync',
          '(error)',
        );
        wrappedError.nestedError = err;
        exitCallback(wrappedError);
      }
    });

    // Store the reference to the child process
    this.runningCommand = proc;
  }

  /**
   * @private
   */

  _dispatchSubcommand(commandName, operands, unknown) {
    const subCommand = this._findCommand(commandName);
    if (!subCommand) this.help({ error: true });

    let promiseChain;
    promiseChain = this._chainOrCallSubCommandHook(
      promiseChain,
      subCommand,
      'preSubcommand',
    );
    promiseChain = this._chainOrCall(promiseChain, () => {
      if (subCommand._executableHandler) {
        this._executeSubCommand(subCommand, operands.concat(unknown));
      } else {
        return subCommand._parseCommand(operands, unknown);
      }
    });
    return promiseChain;
  }

  /**
   * Invoke help directly if possible, or dispatch if necessary.
   * e.g. help foo
   *
   * @private
   */

  _dispatchHelpCommand(subcommandName) {
    if (!subcommandName) {
      this.help();
    }
    const subCommand = this._findCommand(subcommandName);
    if (subCommand && !subCommand._executableHandler) {
      subCommand.help();
    }

    // Fallback to parsing the help flag to invoke the help.
    return this._dispatchSubcommand(
      subcommandName,
      [],
      [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? '--help'],
    );
  }

  /**
   * Check this.args against expected this.registeredArguments.
   *
   * @private
   */

  _checkNumberOfArguments() {
    // too few
    this.registeredArguments.forEach((arg, i) => {
      if (arg.required && this.args[i] == null) {
        this.missingArgument(arg.name());
      }
    });
    // too many
    if (
      this.registeredArguments.length > 0 &&
      this.registeredArguments[this.registeredArguments.length - 1].variadic
    ) {
      return;
    }
    if (this.args.length > this.registeredArguments.length) {
      this._excessArguments(this.args);
    }
  }

  /**
   * Process this.args using this.registeredArguments and save as this.processedArgs!
   *
   * @private
   */

  _processArguments() {
    const myParseArg = (argument, value, previous) => {
      // Extra processing for nice error message on parsing failure.
      let parsedValue = value;
      if (value !== null && argument.parseArg) {
        const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
        parsedValue = this._callParseArg(
          argument,
          value,
          previous,
          invalidValueMessage,
        );
      }
      return parsedValue;
    };

    this._checkNumberOfArguments();

    const processedArgs = [];
    this.registeredArguments.forEach((declaredArg, index) => {
      let value = declaredArg.defaultValue;
      if (declaredArg.variadic) {
        // Collect together remaining arguments for passing together as an array.
        if (index < this.args.length) {
          value = this.args.slice(index);
          if (declaredArg.parseArg) {
            value = value.reduce((processed, v) => {
              return myParseArg(declaredArg, v, processed);
            }, declaredArg.defaultValue);
          }
        } else if (value === undefined) {
          value = [];
        }
      } else if (index < this.args.length) {
        value = this.args[index];
        if (declaredArg.parseArg) {
          value = myParseArg(declaredArg, value, declaredArg.defaultValue);
        }
      }
      processedArgs[index] = value;
    });
    this.processedArgs = processedArgs;
  }

  /**
   * Once we have a promise we chain, but call synchronously until then.
   *
   * @param {(Promise|undefined)} promise
   * @param {Function} fn
   * @return {(Promise|undefined)}
   * @private
   */

  _chainOrCall(promise, fn) {
    // thenable
    if (promise && promise.then && typeof promise.then === 'function') {
      // already have a promise, chain callback
      return promise.then(() => fn());
    }
    // callback might return a promise
    return fn();
  }

  /**
   *
   * @param {(Promise|undefined)} promise
   * @param {string} event
   * @return {(Promise|undefined)}
   * @private
   */

  _chainOrCallHooks(promise, event) {
    let result = promise;
    const hooks = [];
    this._getCommandAndAncestors()
      .reverse()
      .filter((cmd) => cmd._lifeCycleHooks[event] !== undefined)
      .forEach((hookedCommand) => {
        hookedCommand._lifeCycleHooks[event].forEach((callback) => {
          hooks.push({ hookedCommand, callback });
        });
      });
    if (event === 'postAction') {
      hooks.reverse();
    }

    hooks.forEach((hookDetail) => {
      result = this._chainOrCall(result, () => {
        return hookDetail.callback(hookDetail.hookedCommand, this);
      });
    });
    return result;
  }

  /**
   *
   * @param {(Promise|undefined)} promise
   * @param {Command} subCommand
   * @param {string} event
   * @return {(Promise|undefined)}
   * @private
   */

  _chainOrCallSubCommandHook(promise, subCommand, event) {
    let result = promise;
    if (this._lifeCycleHooks[event] !== undefined) {
      this._lifeCycleHooks[event].forEach((hook) => {
        result = this._chainOrCall(result, () => {
          return hook(this, subCommand);
        });
      });
    }
    return result;
  }

  /**
   * Process arguments in context of this command.
   * Returns action result, in case it is a promise.
   *
   * @private
   */

  _parseCommand(operands, unknown) {
    const parsed = this.parseOptions(unknown);
    this._parseOptionsEnv(); // after cli, so parseArg not called on both cli and env
    this._parseOptionsImplied();
    operands = operands.concat(parsed.operands);
    unknown = parsed.unknown;
    this.args = operands.concat(unknown);

    if (operands && this._findCommand(operands[0])) {
      return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
    }
    if (
      this._getHelpCommand() &&
      operands[0] === this._getHelpCommand().name()
    ) {
      return this._dispatchHelpCommand(operands[1]);
    }
    if (this._defaultCommandName) {
      this._outputHelpIfRequested(unknown); // Run the help for default command from parent rather than passing to default command
      return this._dispatchSubcommand(
        this._defaultCommandName,
        operands,
        unknown,
      );
    }
    if (
      this.commands.length &&
      this.args.length === 0 &&
      !this._actionHandler &&
      !this._defaultCommandName
    ) {
      // probably missing subcommand and no handler, user needs help (and exit)
      this.help({ error: true });
    }

    this._outputHelpIfRequested(parsed.unknown);
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();

    // We do not always call this check to avoid masking a "better" error, like unknown command.
    const checkForUnknownOptions = () => {
      if (parsed.unknown.length > 0) {
        this.unknownOption(parsed.unknown[0]);
      }
    };

    const commandEvent = `command:${this.name()}`;
    if (this._actionHandler) {
      checkForUnknownOptions();
      this._processArguments();

      let promiseChain;
      promiseChain = this._chainOrCallHooks(promiseChain, 'preAction');
      promiseChain = this._chainOrCall(promiseChain, () =>
        this._actionHandler(this.processedArgs),
      );
      if (this.parent) {
        promiseChain = this._chainOrCall(promiseChain, () => {
          this.parent.emit(commandEvent, operands, unknown); // legacy
        });
      }
      promiseChain = this._chainOrCallHooks(promiseChain, 'postAction');
      return promiseChain;
    }
    if (this.parent && this.parent.listenerCount(commandEvent)) {
      checkForUnknownOptions();
      this._processArguments();
      this.parent.emit(commandEvent, operands, unknown); // legacy
    } else if (operands.length) {
      if (this._findCommand('*')) {
        // legacy default command
        return this._dispatchSubcommand('*', operands, unknown);
      }
      if (this.listenerCount('command:*')) {
        // skip option check, emit event for possible misspelling suggestion
        this.emit('command:*', operands, unknown);
      } else if (this.commands.length) {
        this.unknownCommand();
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    } else if (this.commands.length) {
      checkForUnknownOptions();
      // This command has subcommands and nothing hooked up at this level, so display help (and exit).
      this.help({ error: true });
    } else {
      checkForUnknownOptions();
      this._processArguments();
      // fall through for caller to handle after calling .parse()
    }
  }

  /**
   * Find matching command.
   *
   * @private
   * @return {Command | undefined}
   */
  _findCommand(name) {
    if (!name) return undefined;
    return this.commands.find(
      (cmd) => cmd._name === name || cmd._aliases.includes(name),
    );
  }

  /**
   * Return an option matching `arg` if any.
   *
   * @param {string} arg
   * @return {Option}
   * @package
   */

  _findOption(arg) {
    return this.options.find((option) => option.is(arg));
  }

  /**
   * Display an error message if a mandatory option does not have a value.
   * Called after checking for help flags in leaf subcommand.
   *
   * @private
   */

  _checkForMissingMandatoryOptions() {
    // Walk up hierarchy so can call in subcommand after checking for displaying help.
    this._getCommandAndAncestors().forEach((cmd) => {
      cmd.options.forEach((anOption) => {
        if (
          anOption.mandatory &&
          cmd.getOptionValue(anOption.attributeName()) === undefined
        ) {
          cmd.missingMandatoryOptionValue(anOption);
        }
      });
    });
  }

  /**
   * Display an error message if conflicting options are used together in this.
   *
   * @private
   */
  _checkForConflictingLocalOptions() {
    const definedNonDefaultOptions = this.options.filter((option) => {
      const optionKey = option.attributeName();
      if (this.getOptionValue(optionKey) === undefined) {
        return false;
      }
      return this.getOptionValueSource(optionKey) !== 'default';
    });

    const optionsWithConflicting = definedNonDefaultOptions.filter(
      (option) => option.conflictsWith.length > 0,
    );

    optionsWithConflicting.forEach((option) => {
      const conflictingAndDefined = definedNonDefaultOptions.find((defined) =>
        option.conflictsWith.includes(defined.attributeName()),
      );
      if (conflictingAndDefined) {
        this._conflictingOption(option, conflictingAndDefined);
      }
    });
  }

  /**
   * Display an error message if conflicting options are used together.
   * Called after checking for help flags in leaf subcommand.
   *
   * @private
   */
  _checkForConflictingOptions() {
    // Walk up hierarchy so can call in subcommand after checking for displaying help.
    this._getCommandAndAncestors().forEach((cmd) => {
      cmd._checkForConflictingLocalOptions();
    });
  }

  /**
   * Parse options from `argv` removing known options,
   * and return argv split into operands and unknown arguments.
   *
   * Examples:
   *
   *     argv => operands, unknown
   *     --known kkk op => [op], []
   *     op --known kkk => [op], []
   *     sub --unknown uuu op => [sub], [--unknown uuu op]
   *     sub -- --unknown uuu op => [sub --unknown uuu op], []
   *
   * @param {string[]} argv
   * @return {{operands: string[], unknown: string[]}}
   */

  parseOptions(argv) {
    const operands = []; // operands, not options or values
    const unknown = []; // first unknown option and remaining unknown args
    let dest = operands;
    const args = argv.slice();

    function maybeOption(arg) {
      return arg.length > 1 && arg[0] === '-';
    }

    // parse options
    let activeVariadicOption = null;
    while (args.length) {
      const arg = args.shift();

      // literal
      if (arg === '--') {
        if (dest === unknown) dest.push(arg);
        dest.push(...args);
        break;
      }

      if (activeVariadicOption && !maybeOption(arg)) {
        this.emit(`option:${activeVariadicOption.name()}`, arg);
        continue;
      }
      activeVariadicOption = null;

      if (maybeOption(arg)) {
        const option = this._findOption(arg);
        // recognised option, call listener to assign value with possible custom processing
        if (option) {
          if (option.required) {
            const value = args.shift();
            if (value === undefined) this.optionMissingArgument(option);
            this.emit(`option:${option.name()}`, value);
          } else if (option.optional) {
            let value = null;
            // historical behaviour is optional value is following arg unless an option
            if (args.length > 0 && !maybeOption(args[0])) {
              value = args.shift();
            }
            this.emit(`option:${option.name()}`, value);
          } else {
            // boolean flag
            this.emit(`option:${option.name()}`);
          }
          activeVariadicOption = option.variadic ? option : null;
          continue;
        }
      }

      // Look for combo options following single dash, eat first one if known.
      if (arg.length > 2 && arg[0] === '-' && arg[1] !== '-') {
        const option = this._findOption(`-${arg[1]}`);
        if (option) {
          if (
            option.required ||
            (option.optional && this._combineFlagAndOptionalValue)
          ) {
            // option with value following in same argument
            this.emit(`option:${option.name()}`, arg.slice(2));
          } else {
            // boolean option, emit and put back remainder of arg for further processing
            this.emit(`option:${option.name()}`);
            args.unshift(`-${arg.slice(2)}`);
          }
          continue;
        }
      }

      // Look for known long flag with value, like --foo=bar
      if (/^--[^=]+=/.test(arg)) {
        const index = arg.indexOf('=');
        const option = this._findOption(arg.slice(0, index));
        if (option && (option.required || option.optional)) {
          this.emit(`option:${option.name()}`, arg.slice(index + 1));
          continue;
        }
      }

      // Not a recognised option by this command.
      // Might be a command-argument, or subcommand option, or unknown option, or help command or option.

      // An unknown option means further arguments also classified as unknown so can be reprocessed by subcommands.
      if (maybeOption(arg)) {
        dest = unknown;
      }

      // If using positionalOptions, stop processing our options at subcommand.
      if (
        (this._enablePositionalOptions || this._passThroughOptions) &&
        operands.length === 0 &&
        unknown.length === 0
      ) {
        if (this._findCommand(arg)) {
          operands.push(arg);
          if (args.length > 0) unknown.push(...args);
          break;
        } else if (
          this._getHelpCommand() &&
          arg === this._getHelpCommand().name()
        ) {
          operands.push(arg);
          if (args.length > 0) operands.push(...args);
          break;
        } else if (this._defaultCommandName) {
          unknown.push(arg);
          if (args.length > 0) unknown.push(...args);
          break;
        }
      }

      // If using passThroughOptions, stop processing options at first command-argument.
      if (this._passThroughOptions) {
        dest.push(arg);
        if (args.length > 0) dest.push(...args);
        break;
      }

      // add arg
      dest.push(arg);
    }

    return { operands, unknown };
  }

  /**
   * Return an object containing local option values as key-value pairs.
   *
   * @return {object}
   */
  opts() {
    if (this._storeOptionsAsProperties) {
      // Preserve original behaviour so backwards compatible when still using properties
      const result = {};
      const len = this.options.length;

      for (let i = 0; i < len; i++) {
        const key = this.options[i].attributeName();
        result[key] =
          key === this._versionOptionName ? this._version : this[key];
      }
      return result;
    }

    return this._optionValues;
  }

  /**
   * Return an object containing merged local and global option values as key-value pairs.
   *
   * @return {object}
   */
  optsWithGlobals() {
    // globals overwrite locals
    return this._getCommandAndAncestors().reduce(
      (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
      {},
    );
  }

  /**
   * Display error message and exit (or call exitOverride).
   *
   * @param {string} message
   * @param {object} [errorOptions]
   * @param {string} [errorOptions.code] - an id string representing the error
   * @param {number} [errorOptions.exitCode] - used with process.exit
   */
  error(message, errorOptions) {
    // output handling
    this._outputConfiguration.outputError(
      `${message}\n`,
      this._outputConfiguration.writeErr,
    );
    if (typeof this._showHelpAfterError === 'string') {
      this._outputConfiguration.writeErr(`${this._showHelpAfterError}\n`);
    } else if (this._showHelpAfterError) {
      this._outputConfiguration.writeErr('\n');
      this.outputHelp({ error: true });
    }

    // exit handling
    const config = errorOptions || {};
    const exitCode = config.exitCode || 1;
    const code = config.code || 'commander.error';
    this._exit(exitCode, code, message);
  }

  /**
   * Apply any option related environment variables, if option does
   * not have a value from cli or client code.
   *
   * @private
   */
  _parseOptionsEnv() {
    this.options.forEach((option) => {
      if (option.envVar && option.envVar in process.env) {
        const optionKey = option.attributeName();
        // Priority check. Do not overwrite cli or options from unknown source (client-code).
        if (
          this.getOptionValue(optionKey) === undefined ||
          ['default', 'config', 'env'].includes(
            this.getOptionValueSource(optionKey),
          )
        ) {
          if (option.required || option.optional) {
            // option can take a value
            // keep very simple, optional always takes value
            this.emit(`optionEnv:${option.name()}`, process.env[option.envVar]);
          } else {
            // boolean
            // keep very simple, only care that envVar defined and not the value
            this.emit(`optionEnv:${option.name()}`);
          }
        }
      }
    });
  }

  /**
   * Apply any implied option values, if option is undefined or default value.
   *
   * @private
   */
  _parseOptionsImplied() {
    const dualHelper = new DualOptions(this.options);
    const hasCustomOptionValue = (optionKey) => {
      return (
        this.getOptionValue(optionKey) !== undefined &&
        !['default', 'implied'].includes(this.getOptionValueSource(optionKey))
      );
    };
    this.options
      .filter(
        (option) =>
          option.implied !== undefined &&
          hasCustomOptionValue(option.attributeName()) &&
          dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option,
          ),
      )
      .forEach((option) => {
        Object.keys(option.implied)
          .filter((impliedKey) => !hasCustomOptionValue(impliedKey))
          .forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              'implied',
            );
          });
      });
  }

  /**
   * Argument `name` is missing.
   *
   * @param {string} name
   * @private
   */

  missingArgument(name) {
    const message = `error: missing required argument '${name}'`;
    this.error(message, { code: 'commander.missingArgument' });
  }

  /**
   * `Option` is missing an argument.
   *
   * @param {Option} option
   * @private
   */

  optionMissingArgument(option) {
    const message = `error: option '${option.flags}' argument missing`;
    this.error(message, { code: 'commander.optionMissingArgument' });
  }

  /**
   * `Option` does not have a value, and is a mandatory option.
   *
   * @param {Option} option
   * @private
   */

  missingMandatoryOptionValue(option) {
    const message = `error: required option '${option.flags}' not specified`;
    this.error(message, { code: 'commander.missingMandatoryOptionValue' });
  }

  /**
   * `Option` conflicts with another option.
   *
   * @param {Option} option
   * @param {Option} conflictingOption
   * @private
   */
  _conflictingOption(option, conflictingOption) {
    // The calling code does not know whether a negated option is the source of the
    // value, so do some work to take an educated guess.
    const findBestOptionFromValue = (option) => {
      const optionKey = option.attributeName();
      const optionValue = this.getOptionValue(optionKey);
      const negativeOption = this.options.find(
        (target) => target.negate && optionKey === target.attributeName(),
      );
      const positiveOption = this.options.find(
        (target) => !target.negate && optionKey === target.attributeName(),
      );
      if (
        negativeOption &&
        ((negativeOption.presetArg === undefined && optionValue === false) ||
          (negativeOption.presetArg !== undefined &&
            optionValue === negativeOption.presetArg))
      ) {
        return negativeOption;
      }
      return positiveOption || option;
    };

    const getErrorMessage = (option) => {
      const bestOption = findBestOptionFromValue(option);
      const optionKey = bestOption.attributeName();
      const source = this.getOptionValueSource(optionKey);
      if (source === 'env') {
        return `environment variable '${bestOption.envVar}'`;
      }
      return `option '${bestOption.flags}'`;
    };

    const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
    this.error(message, { code: 'commander.conflictingOption' });
  }

  /**
   * Unknown option `flag`.
   *
   * @param {string} flag
   * @private
   */

  unknownOption(flag) {
    if (this._allowUnknownOption) return;
    let suggestion = '';

    if (flag.startsWith('--') && this._showSuggestionAfterError) {
      // Looping to pick up the global options too
      let candidateFlags = [];
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let command = this;
      do {
        const moreFlags = command
          .createHelp()
          .visibleOptions(command)
          .filter((option) => option.long)
          .map((option) => option.long);
        candidateFlags = candidateFlags.concat(moreFlags);
        command = command.parent;
      } while (command && !command._enablePositionalOptions);
      suggestion = suggestSimilar(flag, candidateFlags);
    }

    const message = `error: unknown option '${flag}'${suggestion}`;
    this.error(message, { code: 'commander.unknownOption' });
  }

  /**
   * Excess arguments, more than expected.
   *
   * @param {string[]} receivedArgs
   * @private
   */

  _excessArguments(receivedArgs) {
    if (this._allowExcessArguments) return;

    const expected = this.registeredArguments.length;
    const s = expected === 1 ? '' : 's';
    const forSubcommand = this.parent ? ` for '${this.name()}'` : '';
    const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
    this.error(message, { code: 'commander.excessArguments' });
  }

  /**
   * Unknown command.
   *
   * @private
   */

  unknownCommand() {
    const unknownName = this.args[0];
    let suggestion = '';

    if (this._showSuggestionAfterError) {
      const candidateNames = [];
      this.createHelp()
        .visibleCommands(this)
        .forEach((command) => {
          candidateNames.push(command.name());
          // just visible alias
          if (command.alias()) candidateNames.push(command.alias());
        });
      suggestion = suggestSimilar(unknownName, candidateNames);
    }

    const message = `error: unknown command '${unknownName}'${suggestion}`;
    this.error(message, { code: 'commander.unknownCommand' });
  }

  /**
   * Get or set the program version.
   *
   * This method auto-registers the "-V, --version" option which will print the version number.
   *
   * You can optionally supply the flags and description to override the defaults.
   *
   * @param {string} [str]
   * @param {string} [flags]
   * @param {string} [description]
   * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
   */

  version(str, flags, description) {
    if (str === undefined) return this._version;
    this._version = str;
    flags = flags || '-V, --version';
    description = description || 'output the version number';
    const versionOption = this.createOption(flags, description);
    this._versionOptionName = versionOption.attributeName();
    this._registerOption(versionOption);

    this.on('option:' + versionOption.name(), () => {
      this._outputConfiguration.writeOut(`${str}\n`);
      this._exit(0, 'commander.version', str);
    });
    return this;
  }

  /**
   * Set the description.
   *
   * @param {string} [str]
   * @param {object} [argsDescription]
   * @return {(string|Command)}
   */
  description(str, argsDescription) {
    if (str === undefined && argsDescription === undefined)
      return this._description;
    this._description = str;
    if (argsDescription) {
      this._argsDescription = argsDescription;
    }
    return this;
  }

  /**
   * Set the summary. Used when listed as subcommand of parent.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */
  summary(str) {
    if (str === undefined) return this._summary;
    this._summary = str;
    return this;
  }

  /**
   * Set an alias for the command.
   *
   * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
   *
   * @param {string} [alias]
   * @return {(string|Command)}
   */

  alias(alias) {
    if (alias === undefined) return this._aliases[0]; // just return first, for backwards compatibility

    /** @type {Command} */
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let command = this;
    if (
      this.commands.length !== 0 &&
      this.commands[this.commands.length - 1]._executableHandler
    ) {
      // assume adding alias for last added executable subcommand, rather than this
      command = this.commands[this.commands.length - 1];
    }

    if (alias === command._name)
      throw new Error("Command alias can't be the same as its name");
    const matchingCommand = this.parent?._findCommand(alias);
    if (matchingCommand) {
      // c.f. _registerCommand
      const existingCmd = [matchingCommand.name()]
        .concat(matchingCommand.aliases())
        .join('|');
      throw new Error(
        `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`,
      );
    }

    command._aliases.push(alias);
    return this;
  }

  /**
   * Set aliases for the command.
   *
   * Only the first alias is shown in the auto-generated help.
   *
   * @param {string[]} [aliases]
   * @return {(string[]|Command)}
   */

  aliases(aliases) {
    // Getter for the array of aliases is the main reason for having aliases() in addition to alias().
    if (aliases === undefined) return this._aliases;

    aliases.forEach((alias) => this.alias(alias));
    return this;
  }

  /**
   * Set / get the command usage `str`.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */

  usage(str) {
    if (str === undefined) {
      if (this._usage) return this._usage;

      const args = this.registeredArguments.map((arg) => {
        return humanReadableArgName(arg);
      });
      return []
        .concat(
          this.options.length || this._helpOption !== null ? '[options]' : [],
          this.commands.length ? '[command]' : [],
          this.registeredArguments.length ? args : [],
        )
        .join(' ');
    }

    this._usage = str;
    return this;
  }

  /**
   * Get or set the name of the command.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */

  name(str) {
    if (str === undefined) return this._name;
    this._name = str;
    return this;
  }

  /**
   * Set the name of the command from script filename, such as process.argv[1],
   * or require.main.filename, or __filename.
   *
   * (Used internally and public although not documented in README.)
   *
   * @example
   * program.nameFromFilename(require.main.filename);
   *
   * @param {string} filename
   * @return {Command}
   */

  nameFromFilename(filename) {
    this._name = path.basename(filename, path.extname(filename));

    return this;
  }

  /**
   * Get or set the directory for searching for executable subcommands of this command.
   *
   * @example
   * program.executableDir(__dirname);
   * // or
   * program.executableDir('subcommands');
   *
   * @param {string} [path]
   * @return {(string|null|Command)}
   */

  executableDir(path) {
    if (path === undefined) return this._executableDir;
    this._executableDir = path;
    return this;
  }

  /**
   * Return program help documentation.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
   * @return {string}
   */

  helpInformation(contextOptions) {
    const helper = this.createHelp();
    if (helper.helpWidth === undefined) {
      helper.helpWidth =
        contextOptions && contextOptions.error
          ? this._outputConfiguration.getErrHelpWidth()
          : this._outputConfiguration.getOutHelpWidth();
    }
    return helper.formatHelp(this, helper);
  }

  /**
   * @private
   */

  _getHelpContext(contextOptions) {
    contextOptions = contextOptions || {};
    const context = { error: !!contextOptions.error };
    let write;
    if (context.error) {
      write = (arg) => this._outputConfiguration.writeErr(arg);
    } else {
      write = (arg) => this._outputConfiguration.writeOut(arg);
    }
    context.write = contextOptions.write || write;
    context.command = this;
    return context;
  }

  /**
   * Output help information for this command.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */

  outputHelp(contextOptions) {
    let deprecatedCallback;
    if (typeof contextOptions === 'function') {
      deprecatedCallback = contextOptions;
      contextOptions = undefined;
    }
    const context = this._getHelpContext(contextOptions);

    this._getCommandAndAncestors()
      .reverse()
      .forEach((command) => command.emit('beforeAllHelp', context));
    this.emit('beforeHelp', context);

    let helpInformation = this.helpInformation(context);
    if (deprecatedCallback) {
      helpInformation = deprecatedCallback(helpInformation);
      if (
        typeof helpInformation !== 'string' &&
        !Buffer.isBuffer(helpInformation)
      ) {
        throw new Error('outputHelp callback must return a string or a Buffer');
      }
    }
    context.write(helpInformation);

    if (this._getHelpOption()?.long) {
      this.emit(this._getHelpOption().long); // deprecated
    }
    this.emit('afterHelp', context);
    this._getCommandAndAncestors().forEach((command) =>
      command.emit('afterAllHelp', context),
    );
  }

  /**
   * You can pass in flags and a description to customise the built-in help option.
   * Pass in false to disable the built-in help option.
   *
   * @example
   * program.helpOption('-?, --help' 'show help'); // customise
   * program.helpOption(false); // disable
   *
   * @param {(string | boolean)} flags
   * @param {string} [description]
   * @return {Command} `this` command for chaining
   */

  helpOption(flags, description) {
    // Support disabling built-in help option.
    if (typeof flags === 'boolean') {
      if (flags) {
        this._helpOption = this._helpOption ?? undefined; // preserve existing option
      } else {
        this._helpOption = null; // disable
      }
      return this;
    }

    // Customise flags and description.
    flags = flags ?? '-h, --help';
    description = description ?? 'display help for command';
    this._helpOption = this.createOption(flags, description);

    return this;
  }

  /**
   * Lazy create help option.
   * Returns null if has been disabled with .helpOption(false).
   *
   * @returns {(Option | null)} the help option
   * @package
   */
  _getHelpOption() {
    // Lazy create help option on demand.
    if (this._helpOption === undefined) {
      this.helpOption(undefined, undefined);
    }
    return this._helpOption;
  }

  /**
   * Supply your own option to use for the built-in help option.
   * This is an alternative to using helpOption() to customise the flags and description etc.
   *
   * @param {Option} option
   * @return {Command} `this` command for chaining
   */
  addHelpOption(option) {
    this._helpOption = option;
    return this;
  }

  /**
   * Output help information and exit.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */

  help(contextOptions) {
    this.outputHelp(contextOptions);
    let exitCode = process.exitCode || 0;
    if (
      exitCode === 0 &&
      contextOptions &&
      typeof contextOptions !== 'function' &&
      contextOptions.error
    ) {
      exitCode = 1;
    }
    // message: do not have all displayed text available so only passing placeholder.
    this._exit(exitCode, 'commander.help', '(outputHelp)');
  }

  /**
   * Add additional text to be displayed with the built-in help.
   *
   * Position is 'before' or 'after' to affect just this command,
   * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
   *
   * @param {string} position - before or after built-in help
   * @param {(string | Function)} text - string to add, or a function returning a string
   * @return {Command} `this` command for chaining
   */
  addHelpText(position, text) {
    const allowedValues = ['beforeAll', 'before', 'after', 'afterAll'];
    if (!allowedValues.includes(position)) {
      throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    const helpEvent = `${position}Help`;
    this.on(helpEvent, (context) => {
      let helpStr;
      if (typeof text === 'function') {
        helpStr = text({ error: context.error, command: context.command });
      } else {
        helpStr = text;
      }
      // Ignore falsy value when nothing to output.
      if (helpStr) {
        context.write(`${helpStr}\n`);
      }
    });
    return this;
  }

  /**
   * Output help information if help flags specified
   *
   * @param {Array} args - array of options to search for help flags
   * @private
   */

  _outputHelpIfRequested(args) {
    const helpOption = this._getHelpOption();
    const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
    if (helpRequested) {
      this.outputHelp();
      // (Do not have all displayed text available so only passing placeholder.)
      this._exit(0, 'commander.helpDisplayed', '(outputHelp)');
    }
  }
}

/**
 * Scan arguments and increment port number for inspect calls (to avoid conflicts when spawning new command).
 *
 * @param {string[]} args - array of arguments from node.execArgv
 * @returns {string[]}
 * @private
 */

function incrementNodeInspectorPort(args) {
  // Testing for these options:
  //  --inspect[=[host:]port]
  //  --inspect-brk[=[host:]port]
  //  --inspect-port=[host:]port
  return args.map((arg) => {
    if (!arg.startsWith('--inspect')) {
      return arg;
    }
    let debugOption;
    let debugHost = '127.0.0.1';
    let debugPort = '9229';
    let match;
    if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
      // e.g. --inspect
      debugOption = match[1];
    } else if (
      (match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null
    ) {
      debugOption = match[1];
      if (/^\d+$/.test(match[3])) {
        // e.g. --inspect=1234
        debugPort = match[3];
      } else {
        // e.g. --inspect=localhost
        debugHost = match[3];
      }
    } else if (
      (match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null
    ) {
      // e.g. --inspect=localhost:1234
      debugOption = match[1];
      debugHost = match[3];
      debugPort = match[4];
    }

    if (debugOption && debugPort !== '0') {
      return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
    }
    return arg;
  });
}

exports.Command = Command;


/***/ }),

/***/ 9851:
/***/ ((__unused_webpack_module, exports) => {

/**
 * CommanderError class
 */
class CommanderError extends Error {
  /**
   * Constructs the CommanderError class
   * @param {number} exitCode suggested exit code which could be used with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   */
  constructor(exitCode, code, message) {
    super(message);
    // properly capture stack trace in Node.js
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.code = code;
    this.exitCode = exitCode;
    this.nestedError = undefined;
  }
}

/**
 * InvalidArgumentError class
 */
class InvalidArgumentError extends CommanderError {
  /**
   * Constructs the InvalidArgumentError class
   * @param {string} [message] explanation of why argument is invalid
   */
  constructor(message) {
    super(1, 'commander.invalidArgument', message);
    // properly capture stack trace in Node.js
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

exports.CommanderError = CommanderError;
exports.InvalidArgumentError = InvalidArgumentError;


/***/ }),

/***/ 1518:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const { humanReadableArgName } = __nccwpck_require__(854);

/**
 * TypeScript import types for JSDoc, used by Visual Studio Code IntelliSense and `npm run typescript-checkJS`
 * https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#import-types
 * @typedef { import("./argument.js").Argument } Argument
 * @typedef { import("./command.js").Command } Command
 * @typedef { import("./option.js").Option } Option
 */

// Although this is a class, methods are static in style to allow override using subclass or just functions.
class Help {
  constructor() {
    this.helpWidth = undefined;
    this.sortSubcommands = false;
    this.sortOptions = false;
    this.showGlobalOptions = false;
  }

  /**
   * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
   *
   * @param {Command} cmd
   * @returns {Command[]}
   */

  visibleCommands(cmd) {
    const visibleCommands = cmd.commands.filter((cmd) => !cmd._hidden);
    const helpCommand = cmd._getHelpCommand();
    if (helpCommand && !helpCommand._hidden) {
      visibleCommands.push(helpCommand);
    }
    if (this.sortSubcommands) {
      visibleCommands.sort((a, b) => {
        // @ts-ignore: because overloaded return type
        return a.name().localeCompare(b.name());
      });
    }
    return visibleCommands;
  }

  /**
   * Compare options for sort.
   *
   * @param {Option} a
   * @param {Option} b
   * @returns {number}
   */
  compareOptions(a, b) {
    const getSortKey = (option) => {
      // WYSIWYG for order displayed in help. Short used for comparison if present. No special handling for negated.
      return option.short
        ? option.short.replace(/^-/, '')
        : option.long.replace(/^--/, '');
    };
    return getSortKey(a).localeCompare(getSortKey(b));
  }

  /**
   * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */

  visibleOptions(cmd) {
    const visibleOptions = cmd.options.filter((option) => !option.hidden);
    // Built-in help option.
    const helpOption = cmd._getHelpOption();
    if (helpOption && !helpOption.hidden) {
      // Automatically hide conflicting flags. Bit dubious but a historical behaviour that is convenient for single-command programs.
      const removeShort = helpOption.short && cmd._findOption(helpOption.short);
      const removeLong = helpOption.long && cmd._findOption(helpOption.long);
      if (!removeShort && !removeLong) {
        visibleOptions.push(helpOption); // no changes needed
      } else if (helpOption.long && !removeLong) {
        visibleOptions.push(
          cmd.createOption(helpOption.long, helpOption.description),
        );
      } else if (helpOption.short && !removeShort) {
        visibleOptions.push(
          cmd.createOption(helpOption.short, helpOption.description),
        );
      }
    }
    if (this.sortOptions) {
      visibleOptions.sort(this.compareOptions);
    }
    return visibleOptions;
  }

  /**
   * Get an array of the visible global options. (Not including help.)
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */

  visibleGlobalOptions(cmd) {
    if (!this.showGlobalOptions) return [];

    const globalOptions = [];
    for (
      let ancestorCmd = cmd.parent;
      ancestorCmd;
      ancestorCmd = ancestorCmd.parent
    ) {
      const visibleOptions = ancestorCmd.options.filter(
        (option) => !option.hidden,
      );
      globalOptions.push(...visibleOptions);
    }
    if (this.sortOptions) {
      globalOptions.sort(this.compareOptions);
    }
    return globalOptions;
  }

  /**
   * Get an array of the arguments if any have a description.
   *
   * @param {Command} cmd
   * @returns {Argument[]}
   */

  visibleArguments(cmd) {
    // Side effect! Apply the legacy descriptions before the arguments are displayed.
    if (cmd._argsDescription) {
      cmd.registeredArguments.forEach((argument) => {
        argument.description =
          argument.description || cmd._argsDescription[argument.name()] || '';
      });
    }

    // If there are any arguments with a description then return all the arguments.
    if (cmd.registeredArguments.find((argument) => argument.description)) {
      return cmd.registeredArguments;
    }
    return [];
  }

  /**
   * Get the command term to show in the list of subcommands.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  subcommandTerm(cmd) {
    // Legacy. Ignores custom usage string, and nested commands.
    const args = cmd.registeredArguments
      .map((arg) => humanReadableArgName(arg))
      .join(' ');
    return (
      cmd._name +
      (cmd._aliases[0] ? '|' + cmd._aliases[0] : '') +
      (cmd.options.length ? ' [options]' : '') + // simplistic check for non-help option
      (args ? ' ' + args : '')
    );
  }

  /**
   * Get the option term to show in the list of options.
   *
   * @param {Option} option
   * @returns {string}
   */

  optionTerm(option) {
    return option.flags;
  }

  /**
   * Get the argument term to show in the list of arguments.
   *
   * @param {Argument} argument
   * @returns {string}
   */

  argumentTerm(argument) {
    return argument.name();
  }

  /**
   * Get the longest command term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestSubcommandTermLength(cmd, helper) {
    return helper.visibleCommands(cmd).reduce((max, command) => {
      return Math.max(max, helper.subcommandTerm(command).length);
    }, 0);
  }

  /**
   * Get the longest option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestOptionTermLength(cmd, helper) {
    return helper.visibleOptions(cmd).reduce((max, option) => {
      return Math.max(max, helper.optionTerm(option).length);
    }, 0);
  }

  /**
   * Get the longest global option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestGlobalOptionTermLength(cmd, helper) {
    return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
      return Math.max(max, helper.optionTerm(option).length);
    }, 0);
  }

  /**
   * Get the longest argument term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestArgumentTermLength(cmd, helper) {
    return helper.visibleArguments(cmd).reduce((max, argument) => {
      return Math.max(max, helper.argumentTerm(argument).length);
    }, 0);
  }

  /**
   * Get the command usage to be displayed at the top of the built-in help.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  commandUsage(cmd) {
    // Usage
    let cmdName = cmd._name;
    if (cmd._aliases[0]) {
      cmdName = cmdName + '|' + cmd._aliases[0];
    }
    let ancestorCmdNames = '';
    for (
      let ancestorCmd = cmd.parent;
      ancestorCmd;
      ancestorCmd = ancestorCmd.parent
    ) {
      ancestorCmdNames = ancestorCmd.name() + ' ' + ancestorCmdNames;
    }
    return ancestorCmdNames + cmdName + ' ' + cmd.usage();
  }

  /**
   * Get the description for the command.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  commandDescription(cmd) {
    // @ts-ignore: because overloaded return type
    return cmd.description();
  }

  /**
   * Get the subcommand summary to show in the list of subcommands.
   * (Fallback to description for backwards compatibility.)
   *
   * @param {Command} cmd
   * @returns {string}
   */

  subcommandDescription(cmd) {
    // @ts-ignore: because overloaded return type
    return cmd.summary() || cmd.description();
  }

  /**
   * Get the option description to show in the list of options.
   *
   * @param {Option} option
   * @return {string}
   */

  optionDescription(option) {
    const extraInfo = [];

    if (option.argChoices) {
      extraInfo.push(
        // use stringify to match the display of the default value
        `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(', ')}`,
      );
    }
    if (option.defaultValue !== undefined) {
      // default for boolean and negated more for programmer than end user,
      // but show true/false for boolean option as may be for hand-rolled env or config processing.
      const showDefault =
        option.required ||
        option.optional ||
        (option.isBoolean() && typeof option.defaultValue === 'boolean');
      if (showDefault) {
        extraInfo.push(
          `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`,
        );
      }
    }
    // preset for boolean and negated are more for programmer than end user
    if (option.presetArg !== undefined && option.optional) {
      extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
    }
    if (option.envVar !== undefined) {
      extraInfo.push(`env: ${option.envVar}`);
    }
    if (extraInfo.length > 0) {
      return `${option.description} (${extraInfo.join(', ')})`;
    }

    return option.description;
  }

  /**
   * Get the argument description to show in the list of arguments.
   *
   * @param {Argument} argument
   * @return {string}
   */

  argumentDescription(argument) {
    const extraInfo = [];
    if (argument.argChoices) {
      extraInfo.push(
        // use stringify to match the display of the default value
        `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(', ')}`,
      );
    }
    if (argument.defaultValue !== undefined) {
      extraInfo.push(
        `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`,
      );
    }
    if (extraInfo.length > 0) {
      const extraDescripton = `(${extraInfo.join(', ')})`;
      if (argument.description) {
        return `${argument.description} ${extraDescripton}`;
      }
      return extraDescripton;
    }
    return argument.description;
  }

  /**
   * Generate the built-in help text.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {string}
   */

  formatHelp(cmd, helper) {
    const termWidth = helper.padWidth(cmd, helper);
    const helpWidth = helper.helpWidth || 80;
    const itemIndentWidth = 2;
    const itemSeparatorWidth = 2; // between term and description
    function formatItem(term, description) {
      if (description) {
        const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
        return helper.wrap(
          fullText,
          helpWidth - itemIndentWidth,
          termWidth + itemSeparatorWidth,
        );
      }
      return term;
    }
    function formatList(textArray) {
      return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
    }

    // Usage
    let output = [`Usage: ${helper.commandUsage(cmd)}`, ''];

    // Description
    const commandDescription = helper.commandDescription(cmd);
    if (commandDescription.length > 0) {
      output = output.concat([
        helper.wrap(commandDescription, helpWidth, 0),
        '',
      ]);
    }

    // Arguments
    const argumentList = helper.visibleArguments(cmd).map((argument) => {
      return formatItem(
        helper.argumentTerm(argument),
        helper.argumentDescription(argument),
      );
    });
    if (argumentList.length > 0) {
      output = output.concat(['Arguments:', formatList(argumentList), '']);
    }

    // Options
    const optionList = helper.visibleOptions(cmd).map((option) => {
      return formatItem(
        helper.optionTerm(option),
        helper.optionDescription(option),
      );
    });
    if (optionList.length > 0) {
      output = output.concat(['Options:', formatList(optionList), '']);
    }

    if (this.showGlobalOptions) {
      const globalOptionList = helper
        .visibleGlobalOptions(cmd)
        .map((option) => {
          return formatItem(
            helper.optionTerm(option),
            helper.optionDescription(option),
          );
        });
      if (globalOptionList.length > 0) {
        output = output.concat([
          'Global Options:',
          formatList(globalOptionList),
          '',
        ]);
      }
    }

    // Commands
    const commandList = helper.visibleCommands(cmd).map((cmd) => {
      return formatItem(
        helper.subcommandTerm(cmd),
        helper.subcommandDescription(cmd),
      );
    });
    if (commandList.length > 0) {
      output = output.concat(['Commands:', formatList(commandList), '']);
    }

    return output.join('\n');
  }

  /**
   * Calculate the pad width from the maximum term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  padWidth(cmd, helper) {
    return Math.max(
      helper.longestOptionTermLength(cmd, helper),
      helper.longestGlobalOptionTermLength(cmd, helper),
      helper.longestSubcommandTermLength(cmd, helper),
      helper.longestArgumentTermLength(cmd, helper),
    );
  }

  /**
   * Wrap the given string to width characters per line, with lines after the first indented.
   * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
   *
   * @param {string} str
   * @param {number} width
   * @param {number} indent
   * @param {number} [minColumnWidth=40]
   * @return {string}
   *
   */

  wrap(str, width, indent, minColumnWidth = 40) {
    // Full \s characters, minus the linefeeds.
    const indents =
      ' \\f\\t\\v\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff';
    // Detect manually wrapped and indented strings by searching for line break followed by spaces.
    const manualIndent = new RegExp(`[\\n][${indents}]+`);
    if (str.match(manualIndent)) return str;
    // Do not wrap if not enough room for a wrapped column of text (as could end up with a word per line).
    const columnWidth = width - indent;
    if (columnWidth < minColumnWidth) return str;

    const leadingStr = str.slice(0, indent);
    const columnText = str.slice(indent).replace('\r\n', '\n');
    const indentString = ' '.repeat(indent);
    const zeroWidthSpace = '\u200B';
    const breaks = `\\s${zeroWidthSpace}`;
    // Match line end (so empty lines don't collapse),
    // or as much text as will fit in column, or excess text up to first break.
    const regex = new RegExp(
      `\n|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
      'g',
    );
    const lines = columnText.match(regex) || [];
    return (
      leadingStr +
      lines
        .map((line, i) => {
          if (line === '\n') return ''; // preserve empty lines
          return (i > 0 ? indentString : '') + line.trimEnd();
        })
        .join('\n')
    );
  }
}

exports.Help = Help;


/***/ }),

/***/ 7596:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

const { InvalidArgumentError } = __nccwpck_require__(9851);

class Option {
  /**
   * Initialize a new `Option` with the given `flags` and `description`.
   *
   * @param {string} flags
   * @param {string} [description]
   */

  constructor(flags, description) {
    this.flags = flags;
    this.description = description || '';

    this.required = flags.includes('<'); // A value must be supplied when the option is specified.
    this.optional = flags.includes('['); // A value is optional when the option is specified.
    // variadic test ignores <value,...> et al which might be used to describe custom splitting of single argument
    this.variadic = /\w\.\.\.[>\]]$/.test(flags); // The option can take multiple values.
    this.mandatory = false; // The option must have a value after parsing, which usually means it must be specified on command line.
    const optionFlags = splitOptionFlags(flags);
    this.short = optionFlags.shortFlag;
    this.long = optionFlags.longFlag;
    this.negate = false;
    if (this.long) {
      this.negate = this.long.startsWith('--no-');
    }
    this.defaultValue = undefined;
    this.defaultValueDescription = undefined;
    this.presetArg = undefined;
    this.envVar = undefined;
    this.parseArg = undefined;
    this.hidden = false;
    this.argChoices = undefined;
    this.conflictsWith = [];
    this.implied = undefined;
  }

  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {*} value
   * @param {string} [description]
   * @return {Option}
   */

  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }

  /**
   * Preset to use when option used without option-argument, especially optional but also boolean and negated.
   * The custom processing (parseArg) is called.
   *
   * @example
   * new Option('--color').default('GREYSCALE').preset('RGB');
   * new Option('--donate [amount]').preset('20').argParser(parseFloat);
   *
   * @param {*} arg
   * @return {Option}
   */

  preset(arg) {
    this.presetArg = arg;
    return this;
  }

  /**
   * Add option name(s) that conflict with this option.
   * An error will be displayed if conflicting options are found during parsing.
   *
   * @example
   * new Option('--rgb').conflicts('cmyk');
   * new Option('--js').conflicts(['ts', 'jsx']);
   *
   * @param {(string | string[])} names
   * @return {Option}
   */

  conflicts(names) {
    this.conflictsWith = this.conflictsWith.concat(names);
    return this;
  }

  /**
   * Specify implied option values for when this option is set and the implied options are not.
   *
   * The custom processing (parseArg) is not called on the implied values.
   *
   * @example
   * program
   *   .addOption(new Option('--log', 'write logging information to file'))
   *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
   *
   * @param {object} impliedOptionValues
   * @return {Option}
   */
  implies(impliedOptionValues) {
    let newImplied = impliedOptionValues;
    if (typeof impliedOptionValues === 'string') {
      // string is not documented, but easy mistake and we can do what user probably intended.
      newImplied = { [impliedOptionValues]: true };
    }
    this.implied = Object.assign(this.implied || {}, newImplied);
    return this;
  }

  /**
   * Set environment variable to check for option value.
   *
   * An environment variable is only used if when processed the current option value is
   * undefined, or the source of the current value is 'default' or 'config' or 'env'.
   *
   * @param {string} name
   * @return {Option}
   */

  env(name) {
    this.envVar = name;
    return this;
  }

  /**
   * Set the custom handler for processing CLI option arguments into option values.
   *
   * @param {Function} [fn]
   * @return {Option}
   */

  argParser(fn) {
    this.parseArg = fn;
    return this;
  }

  /**
   * Whether the option is mandatory and must have a value after parsing.
   *
   * @param {boolean} [mandatory=true]
   * @return {Option}
   */

  makeOptionMandatory(mandatory = true) {
    this.mandatory = !!mandatory;
    return this;
  }

  /**
   * Hide option in help.
   *
   * @param {boolean} [hide=true]
   * @return {Option}
   */

  hideHelp(hide = true) {
    this.hidden = !!hide;
    return this;
  }

  /**
   * @package
   */

  _concatValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }

    return previous.concat(value);
  }

  /**
   * Only allow option value to be one of choices.
   *
   * @param {string[]} values
   * @return {Option}
   */

  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError(
          `Allowed choices are ${this.argChoices.join(', ')}.`,
        );
      }
      if (this.variadic) {
        return this._concatValue(arg, previous);
      }
      return arg;
    };
    return this;
  }

  /**
   * Return option name.
   *
   * @return {string}
   */

  name() {
    if (this.long) {
      return this.long.replace(/^--/, '');
    }
    return this.short.replace(/^-/, '');
  }

  /**
   * Return option name, in a camelcase format that can be used
   * as a object attribute key.
   *
   * @return {string}
   */

  attributeName() {
    return camelcase(this.name().replace(/^no-/, ''));
  }

  /**
   * Check if `arg` matches the short or long flag.
   *
   * @param {string} arg
   * @return {boolean}
   * @package
   */

  is(arg) {
    return this.short === arg || this.long === arg;
  }

  /**
   * Return whether a boolean option.
   *
   * Options are one of boolean, negated, required argument, or optional argument.
   *
   * @return {boolean}
   * @package
   */

  isBoolean() {
    return !this.required && !this.optional && !this.negate;
  }
}

/**
 * This class is to make it easier to work with dual options, without changing the existing
 * implementation. We support separate dual options for separate positive and negative options,
 * like `--build` and `--no-build`, which share a single option value. This works nicely for some
 * use cases, but is tricky for others where we want separate behaviours despite
 * the single shared option value.
 */
class DualOptions {
  /**
   * @param {Option[]} options
   */
  constructor(options) {
    this.positiveOptions = new Map();
    this.negativeOptions = new Map();
    this.dualOptions = new Set();
    options.forEach((option) => {
      if (option.negate) {
        this.negativeOptions.set(option.attributeName(), option);
      } else {
        this.positiveOptions.set(option.attributeName(), option);
      }
    });
    this.negativeOptions.forEach((value, key) => {
      if (this.positiveOptions.has(key)) {
        this.dualOptions.add(key);
      }
    });
  }

  /**
   * Did the value come from the option, and not from possible matching dual option?
   *
   * @param {*} value
   * @param {Option} option
   * @returns {boolean}
   */
  valueFromOption(value, option) {
    const optionKey = option.attributeName();
    if (!this.dualOptions.has(optionKey)) return true;

    // Use the value to deduce if (probably) came from the option.
    const preset = this.negativeOptions.get(optionKey).presetArg;
    const negativeValue = preset !== undefined ? preset : false;
    return option.negate === (negativeValue === value);
  }
}

/**
 * Convert string from kebab-case to camelCase.
 *
 * @param {string} str
 * @return {string}
 * @private
 */

function camelcase(str) {
  return str.split('-').reduce((str, word) => {
    return str + word[0].toUpperCase() + word.slice(1);
  });
}

/**
 * Split the short and long flag out of something like '-m,--mixed <value>'
 *
 * @private
 */

function splitOptionFlags(flags) {
  let shortFlag;
  let longFlag;
  // Use original very loose parsing to maintain backwards compatibility for now,
  // which allowed for example unintended `-sw, --short-word` [sic].
  const flagParts = flags.split(/[ |,]+/);
  if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
    shortFlag = flagParts.shift();
  longFlag = flagParts.shift();
  // Add support for lone short flag without significantly changing parsing!
  if (!shortFlag && /^-[^-]$/.test(longFlag)) {
    shortFlag = longFlag;
    longFlag = undefined;
  }
  return { shortFlag, longFlag };
}

exports.Option = Option;
exports.DualOptions = DualOptions;


/***/ }),

/***/ 9266:
/***/ ((__unused_webpack_module, exports) => {

const maxDistance = 3;

function editDistance(a, b) {
  // https://en.wikipedia.org/wiki/Damerau–Levenshtein_distance
  // Calculating optimal string alignment distance, no substring is edited more than once.
  // (Simple implementation.)

  // Quick early exit, return worst case.
  if (Math.abs(a.length - b.length) > maxDistance)
    return Math.max(a.length, b.length);

  // distance between prefix substrings of a and b
  const d = [];

  // pure deletions turn a into empty string
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
  }
  // pure insertions turn empty string into b
  for (let j = 0; j <= b.length; j++) {
    d[0][j] = j;
  }

  // fill matrix
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      let cost = 1;
      if (a[i - 1] === b[j - 1]) {
        cost = 0;
      } else {
        cost = 1;
      }
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost, // substitution
      );
      // transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[a.length][b.length];
}

/**
 * Find close matches, restricted to same number of edits.
 *
 * @param {string} word
 * @param {string[]} candidates
 * @returns {string}
 */

function suggestSimilar(word, candidates) {
  if (!candidates || candidates.length === 0) return '';
  // remove possible duplicates
  candidates = Array.from(new Set(candidates));

  const searchingOptions = word.startsWith('--');
  if (searchingOptions) {
    word = word.slice(2);
    candidates = candidates.map((candidate) => candidate.slice(2));
  }

  let similar = [];
  let bestDistance = maxDistance;
  const minSimilarity = 0.4;
  candidates.forEach((candidate) => {
    if (candidate.length <= 1) return; // no one character guesses

    const distance = editDistance(word, candidate);
    const length = Math.max(word.length, candidate.length);
    const similarity = (length - distance) / length;
    if (similarity > minSimilarity) {
      if (distance < bestDistance) {
        // better edit distance, throw away previous worse matches
        bestDistance = distance;
        similar = [candidate];
      } else if (distance === bestDistance) {
        similar.push(candidate);
      }
    }
  });

  similar.sort((a, b) => a.localeCompare(b));
  if (searchingOptions) {
    similar = similar.map((candidate) => `--${candidate}`);
  }

  if (similar.length > 1) {
    return `\n(Did you mean one of ${similar.join(', ')}?)`;
  }
  if (similar.length === 1) {
    return `\n(Did you mean ${similar[0]}?)`;
  }
  return '';
}

exports.suggestSimilar = suggestSimilar;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__nccwpck_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const commander_1 = __nccwpck_require__(7313);
const scan_1 = __nccwpck_require__(6978);
const init_1 = __nccwpck_require__(29);
const add_cursor_1 = __nccwpck_require__(6119);
const add_claude_1 = __nccwpck_require__(3223);
const add_mcp_1 = __nccwpck_require__(8001);
const add_jags_skills_1 = __nccwpck_require__(3461);
const add_afv_library_1 = __nccwpck_require__(7884);
const doctor_1 = __nccwpck_require__(7584);
const bootstrap_mcp_1 = __nccwpck_require__(6188);
const check_drift_1 = __nccwpck_require__(2205);
const add_claude_mem_1 = __nccwpck_require__(5155);
const pick_skill_1 = __nccwpck_require__(8970);
const deploy_preview_1 = __nccwpck_require__(9361);
const agentforce_scan_1 = __nccwpck_require__(1073);
commander_1.program
    .name('ai-kit-sf')
    .description('AI-Kit for Salesforce — Make every Salesforce DX project AI-ready in minutes.')
    .version('0.1.0');
commander_1.program.addCommand((0, scan_1.scanCommand)());
commander_1.program.addCommand((0, init_1.initCommand)());
commander_1.program.addCommand((0, add_cursor_1.addCursorCommand)());
commander_1.program.addCommand((0, add_claude_1.addClaudeCommand)());
commander_1.program.addCommand((0, add_mcp_1.addMcpCommand)());
commander_1.program.addCommand((0, add_jags_skills_1.addJagsSkillsCommand)());
commander_1.program.addCommand((0, add_afv_library_1.addAfvLibraryCommand)());
commander_1.program.addCommand((0, doctor_1.doctorCommand)());
commander_1.program.addCommand((0, bootstrap_mcp_1.bootstrapMcpCommand)());
commander_1.program.addCommand((0, check_drift_1.checkDriftCommand)());
commander_1.program.addCommand((0, add_claude_mem_1.addClaudeMemCommand)());
commander_1.program.addCommand((0, pick_skill_1.pickSkillCommand)());
commander_1.program.addCommand((0, deploy_preview_1.deployPreviewCommand)());
commander_1.program.addCommand((0, agentforce_scan_1.agentforceScanCommand)());
commander_1.program.parse(process.argv);
//# sourceMappingURL=index.js.map
})();

module.exports = __webpack_exports__;
/******/ })()
;