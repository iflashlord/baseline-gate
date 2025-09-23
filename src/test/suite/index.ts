import * as path from 'path';
import * as fs from 'fs';
import Mocha from 'mocha';

export function run(): Promise<void> {
  // Create the mocha test instance
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 10000
  });

  const testsRoot = path.resolve(__dirname);

  function collectTests(dir: string, out: string[] = []) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        collectTests(full, out);
      } else if (entry.endsWith('.test.js')) {
        out.push(full);
      }
    }
    return out;
  }

  return new Promise((resolve, reject) => {
    try {
      const files = collectTests(testsRoot);
      for (const f of files) {
        mocha.addFile(f);
      }

        mocha.run((failures: number) => {
          if (failures > 0) {
            reject(new Error(`${failures} test(s) failed.`));
          } else {
            resolve();
          }
        });
    } catch (error) {
      reject(error);
    }
  });
}
