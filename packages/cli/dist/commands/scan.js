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
exports.scanCommand = scanCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const core_1 = require("@sf-ai-toolkit/core");
const ui = __importStar(require("../ui"));
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