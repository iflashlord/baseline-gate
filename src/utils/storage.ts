import * as vscode from 'vscode';

export const STORAGE_DIR_NAME = '.baseline-gate';

async function ensureStorageDirectory(): Promise<vscode.Uri | undefined> {
  const [folder] = vscode.workspace.workspaceFolders ?? [];
  if (!folder) {
    return undefined;
  }

  const storageDir = vscode.Uri.joinPath(folder.uri, STORAGE_DIR_NAME);
  try {
    await vscode.workspace.fs.createDirectory(storageDir);
    return storageDir;
  } catch (error) {
    console.warn('[baseline-gate] Failed to ensure storage directory:', error);
    return undefined;
  }
}

export async function readStorageJson<T>(filename: string): Promise<T | undefined> {
  const storageDir = await ensureStorageDirectory();
  if (!storageDir) {
    return undefined;
  }

  const fileUri = vscode.Uri.joinPath(storageDir, filename);
  try {
    const content = await vscode.workspace.fs.readFile(fileUri);
    const text = Buffer.from(content).toString('utf8');
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
      return undefined;
    }
    console.warn(`[baseline-gate] Failed to read ${filename}:`, error);
    return undefined;
  }
}

export async function writeStorageJson<T>(filename: string, data: T): Promise<void> {
  const storageDir = await ensureStorageDirectory();
  if (!storageDir) {
    return;
  }

  const fileUri = vscode.Uri.joinPath(storageDir, filename);
  try {
    const encoded = Buffer.from(JSON.stringify(data, null, 2), 'utf8');
    await vscode.workspace.fs.writeFile(fileUri, encoded);
  } catch (error) {
    console.warn(`[baseline-gate] Failed to write ${filename}:`, error);
  }
}
