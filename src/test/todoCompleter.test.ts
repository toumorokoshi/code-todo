import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { completeTodoItem } from "../todoCompleter";

/** Create a temp file with the given content, return its path. */
function makeTempFile(content: string): string {
  const tmpPath = path.join(os.tmpdir(), `code-todo-test-${Date.now()}.md`);
  fs.writeFileSync(tmpPath, content, "utf-8");
  return tmpPath;
}

suite("todoCompleter", () => {
  suite("completeTodoItem", () => {
    test("replaces open checkbox with checked checkbox", () => {
      const tmpFile = makeTempFile("- [ ] do the thing\n");
      const result = completeTodoItem(tmpFile, 1);
      assert.strictEqual(result, true);
      assert.strictEqual(fs.readFileSync(tmpFile, "utf-8"), "- [x] do the thing\n");
      fs.unlinkSync(tmpFile);
    });

    test("handles leading whitespace", () => {
      const tmpFile = makeTempFile("  - [ ] indented item\n");
      completeTodoItem(tmpFile, 1);
      assert.ok(fs.readFileSync(tmpFile, "utf-8").startsWith("  - [x]"));
      fs.unlinkSync(tmpFile);
    });

    test("returns false when line has no open checkbox", () => {
      const tmpFile = makeTempFile("- [x] already done\n");
      const result = completeTodoItem(tmpFile, 1);
      assert.strictEqual(result, false);
      fs.unlinkSync(tmpFile);
    });

    test("only modifies the target line, not others", () => {
      const content = "- [ ] first\n- [ ] second\n- [ ] third\n";
      const tmpFile = makeTempFile(content);
      completeTodoItem(tmpFile, 2);
      const updated = fs.readFileSync(tmpFile, "utf-8");
      const lines = updated.split("\n");
      assert.ok(lines[0].includes("[ ]"), "line 1 should stay open");
      assert.ok(lines[1].includes("[x]"), "line 2 should be completed");
      assert.ok(lines[2].includes("[ ]"), "line 3 should stay open");
      fs.unlinkSync(tmpFile);
    });

    test("returns false for out-of-range line number", () => {
      const tmpFile = makeTempFile("- [ ] only one line\n");
      const result = completeTodoItem(tmpFile, 99);
      assert.strictEqual(result, false);
      fs.unlinkSync(tmpFile);
    });

    test("returns false for line number 0", () => {
      const tmpFile = makeTempFile("- [ ] item\n");
      const result = completeTodoItem(tmpFile, 0);
      assert.strictEqual(result, false);
      fs.unlinkSync(tmpFile);
    });
  });
});
