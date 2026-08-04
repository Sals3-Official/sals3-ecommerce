import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const projectRoot = process.cwd();
const nextDir = join(projectRoot, '.next');
const temporaryNextDir = join(
  tmpdir(),
  `sals3-ecommerce-next-${process.pid}-${Date.now()}`,
);
const tscBin = join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
);

let movedNextDir = false;

try {
  if (existsSync(nextDir)) {
    rmSync(temporaryNextDir, { force: true, recursive: true });
    renameSync(nextDir, temporaryNextDir);
    movedNextDir = true;
  }

  const result = spawnSync(tscBin, ['--noEmit'], {
    stdio: 'inherit',
  });

  process.exitCode = result.status ?? 1;
} finally {
  if (movedNextDir) {
    rmSync(nextDir, { force: true, recursive: true });
    renameSync(temporaryNextDir, nextDir);
  }
}
