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
exports.checkDriftCommand = checkDriftCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const core_1 = require("@ai-kit-salesforce/core");
const ui = __importStar(require("../ui"));
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
                    const fs = await Promise.resolve().then(() => __importStar(require('fs-extra')));
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