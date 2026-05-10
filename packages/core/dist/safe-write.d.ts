import { SafeWriteOptions, WriteResult, FileAction } from './types';
export declare function writeFileSafe(filePath: string, content: string, options?: SafeWriteOptions): Promise<WriteResult>;
export declare function appendMissingLines(filePath: string, lines: string[]): Promise<string[]>;
export declare function mergePackageJsonScripts(rootPath: string, scripts: Record<string, string>): Promise<string[]>;
export declare function determineAction(filePath: string, fileExists: boolean): FileAction;
//# sourceMappingURL=safe-write.d.ts.map