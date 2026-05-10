"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.header = header;
exports.success = success;
exports.warn = warn;
exports.error = error;
exports.info = info;
exports.bold = bold;
exports.section = section;
exports.item = item;
const chalk_1 = __importDefault(require("chalk"));
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