import * as assert from "assert";
import { parseTodoLine, parseTodoContent, sortTodoItems } from "../todoParser";

suite("todoParser", () => {
  suite("parseTodoLine", () => {
    test("returns undefined for non-todo line", () => {
      assert.strictEqual(parseTodoLine("## Heading", "file.md", 1), undefined);
    });

    test("returns undefined for completed checkbox", () => {
      assert.strictEqual(
        parseTodoLine("- [x] done item", "file.md", 1),
        undefined,
      );
    });

    test("parses a basic todo item", () => {
      const item = parseTodoLine("- [ ] follow up on design", "file.md", 5);
      assert.ok(item, "should return a TodoItem");
      assert.strictEqual(item.text, "follow up on design");
      assert.strictEqual(item.lineNumber, 5);
      assert.strictEqual(item.filePath, "file.md");
      assert.strictEqual(item.dueDate, undefined);
    });

    test("parses a todo item with a due date", () => {
      const item = parseTodoLine(
        "- [ ] review PR (DUE: 2026-05-13)",
        "file.md",
        3,
      );
      assert.ok(item, "should return a TodoItem");
      assert.strictEqual(item.text, "review PR");
      assert.ok(item.dueDate instanceof Date, "dueDate should be a Date");
      assert.strictEqual(
        item.dueDate!.toISOString().slice(0, 10),
        "2026-05-13",
      );
    });

    test("handles leading whitespace in checkbox line", () => {
      const item = parseTodoLine("  - [ ] indented item", "notes.md", 10);
      assert.ok(item);
      assert.strictEqual(item.text, "indented item");
    });
  });

  suite("parseTodoContent", () => {
    test("returns empty array for content with no todos", () => {
      const content = "# Heading\n\nSome text\n\n- [x] done\n";
      const items = parseTodoContent(content, "file.md");
      assert.deepStrictEqual(items, []);
    });

    test("returns all open checkbox items", () => {
      const content =
        "- [ ] first task\n- [x] done\n- [ ] second task (DUE: 2030-01-01)\n";
      const items = parseTodoContent(content, "tasks.md");
      assert.strictEqual(items.length, 2);
      assert.strictEqual(items[0].text, "first task");
      assert.strictEqual(items[1].text, "second task");
    });
  });

  suite("sortTodoItems", () => {
    const makeItem = (
      text: string,
      dueDate: Date | undefined,
      line = 1,
    ) => ({
      filePath: "file.md",
      lineNumber: line,
      text,
      dueDate,
    });

    test("no-due items come first", () => {
      const past = new Date(Date.now() - 86400000);
      const future = new Date(Date.now() + 86400000);
      const items = [
        makeItem("upcoming", future),
        makeItem("no due", undefined),
        makeItem("overdue", past),
      ];
      const sorted = sortTodoItems(items);
      assert.strictEqual(sorted[0].text, "no due");
    });

    test("overdue items come before upcoming, ordered earliest first", () => {
      const past1 = new Date(Date.now() - 2 * 86400000);
      const past2 = new Date(Date.now() - 86400000);
      const future = new Date(Date.now() + 86400000);
      const items = [
        makeItem("future", future),
        makeItem("overdue2", past2),
        makeItem("overdue1", past1),
      ];
      const sorted = sortTodoItems(items);
      assert.strictEqual(sorted[0].text, "overdue1");
      assert.strictEqual(sorted[1].text, "overdue2");
      assert.strictEqual(sorted[2].text, "future");
    });

    test("upcoming items ordered earliest first", () => {
      const near = new Date(Date.now() + 86400000);
      const far = new Date(Date.now() + 2 * 86400000);
      const items = [makeItem("far", far), makeItem("near", near)];
      const sorted = sortTodoItems(items);
      assert.strictEqual(sorted[0].text, "near");
      assert.strictEqual(sorted[1].text, "far");
    });
  });
});
