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
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickSkillCommand = pickSkillCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const core_1 = require("@ai-kit-salesforce/core");
const ui = __importStar(require("../ui"));
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