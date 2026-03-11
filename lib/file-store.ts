import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname } from "path";
import { randomUUID } from "crypto";

export function ensureParentDir(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!existsSync(filePath)) return fallback;
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFileAtomic(filePath: string, data: unknown, _replacer?: unknown, _space?: number) {
  ensureParentDir(filePath);
  const tmpPath = `${filePath}.${randomUUID()}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(data, null, typeof _space === "number" ? _space : 2), "utf-8");
  renameSync(tmpPath, filePath);
}
