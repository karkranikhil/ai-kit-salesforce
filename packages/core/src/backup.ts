import * as fs from 'fs-extra';
import * as path from 'path';

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

export async function createBackup(rootPath: string, filePaths: string[]): Promise<string> {
  const normalizedRoot = path.resolve(rootPath);
  const backupDir = path.join(normalizedRoot, '.sf-ai-toolkit-backup', timestamp());
  await fs.ensureDir(backupDir);

  for (const filePath of filePaths) {
    const resolvedFilePath = path.resolve(filePath);
    if (resolvedFilePath !== normalizedRoot && !resolvedFilePath.startsWith(normalizedRoot + path.sep)) {
      throw new Error(`Refusing to back up file outside project root: ${filePath}`);
    }

    const exists = await fs.pathExists(resolvedFilePath);
    if (!exists) continue;

    const relativePath = path.relative(normalizedRoot, resolvedFilePath);
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`Invalid backup path: ${filePath}`);
    }

    const backupFilePath = path.join(backupDir, relativePath + '.bak');
    const resolvedBackupPath = path.resolve(backupFilePath);
    if (resolvedBackupPath !== backupDir && !resolvedBackupPath.startsWith(backupDir + path.sep)) {
      throw new Error(`Refusing to write backup outside backup directory: ${backupFilePath}`);
    }

    await fs.ensureDir(path.dirname(backupFilePath));
    await fs.copy(resolvedFilePath, resolvedBackupPath);
  }

  return backupDir;
}
