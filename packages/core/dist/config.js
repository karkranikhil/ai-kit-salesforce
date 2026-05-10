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
exports.DEFAULT_TOOLKIT_CONFIG = exports.TOOLKIT_CONFIG_PATH = void 0;
exports.loadToolkitConfig = loadToolkitConfig;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
exports.TOOLKIT_CONFIG_PATH = 'sf-ai-toolkit.config.json';
exports.DEFAULT_TOOLKIT_CONFIG = {
    quality: {
        pmd: {
            enabled: false,
            runCommand: 'pmd check -d "force-app/main/default/classes,force-app/main/default/triggers" -R category/apex/bestpractices.xml',
        },
    },
    git: {
        commitMessage: {
            enabled: true,
            pattern: '^(feat|fix|docs|chore|refactor|test|perf)(\\([a-z0-9_-]+\\))?: .{1,72}$',
            helpText: 'Use Conventional Commit format, e.g. feat(apex): add account service validation',
        },
    },
};
function mergeToolkitConfig(defaults, overrides) {
    if (!overrides)
        return defaults;
    return {
        quality: {
            pmd: {
                ...defaults.quality?.pmd,
                ...overrides.quality?.pmd,
            },
        },
        git: {
            commitMessage: {
                ...defaults.git?.commitMessage,
                ...overrides.git?.commitMessage,
            },
        },
    };
}
async function loadToolkitConfig(rootPath) {
    const configPath = path.join(rootPath, exports.TOOLKIT_CONFIG_PATH);
    const exists = await fs.pathExists(configPath);
    if (!exists)
        return exports.DEFAULT_TOOLKIT_CONFIG;
    try {
        const raw = await fs.readFile(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return mergeToolkitConfig(exports.DEFAULT_TOOLKIT_CONFIG, parsed);
    }
    catch {
        return exports.DEFAULT_TOOLKIT_CONFIG;
    }
}
//# sourceMappingURL=config.js.map