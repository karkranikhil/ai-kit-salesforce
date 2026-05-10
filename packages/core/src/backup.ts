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
  const backupDir = path.join(rootPath, '.ai-kit-salesforce-backup', timestamp());
  await fs.ensureDir(backupDir);

  for (const filePath of filePaths) {
    const exists = await fs.pathExists(filePath);
    if (!exists) continue;

    const relativePath = path.relative(rootPath, filePath);
    const backupFilePath = path.join(backupDir, relativePath + '.bak');
    await fs.ensureDir(path.dirname(backupFilePath));
    await fs.copy(filePath, backupFilePath);
  }

  return backupDir;
}
