import * as path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mocha = require("mocha");
import { glob } from "glob";

async function main() {
  const mochaRunner = new mocha({ ui: "tdd", color: true });
  const testsRoot = path.resolve(__dirname, ".");

  const files = await glob("**/*.test.js", { cwd: testsRoot });
  for (const f of files) {
    mochaRunner.addFile(path.resolve(testsRoot, f));
  }

  return new Promise<void>((resolve, reject) => {
    mochaRunner.run((failures: number) => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed.`));
      } else {
        resolve();
      }
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
