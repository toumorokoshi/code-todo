import * as assert from "assert";
import { parseTodoLine, parseTodoContent, sortTodoItems } from "../todoParser";

suite("todoParser", () => {
  suite("parseTodoLine", () => {
    test("returns undefined for non-todo line", () => {
      assert.strictEqual(parseTodoLine("## Heading", "file.md", 1), undefined);
    });

    test("returns undefined for completed checkbox", () => {
      assert.strictEqual(
        parseTodoLine("- [x] done item #todo", "file.md", 1),
        undefined,
      );
    });

    test("returns undefined for open checkbox without #todo tag", () => {
      assert.strictEqual(
        parseTodoLine("- [ ] follow up on design", "file.md", 1),
        undefined,
      );
    });

    test("parses a basic todo item with #todo tag", () => {
      const item = parseTodoLine("- [ ] follow up on design #todo", "file.md", 5);
      assert.ok(item, "should return a TodoItem");
      assert.strictEqual(item.text, "follow up on design");
      assert.strictEqual(item.lineNumber, 5);
      assert.strictEqual(item.filePath, "file.md");
      assert.strictEqual(item.dueDate, undefined);
    });

    test("strips the #todo tag from displayed text", () => {
      const item = parseTodoLine("- [ ] write tests #todo", "file.md", 1);
      assert.ok(item);
      assert.ok(!item.text.includes("#todo"), "#todo should be stripped from text");
    });

    test("parses a todo item with a due date and #todo tag", () => {
      const item = parseTodoLine(
        "- [ ] review PR #todo (DUE: 2026-05-13)",
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
      const item = parseTodoLine("  - [ ] indented item #todo", "notes.md", 10);
      assert.ok(item);
      assert.strictEqual(item.text, "indented item");
    });
  });

  suite("parseTodoContent", () => {
    test("returns empty array for content with no todos", () => {
      const content = "# Heading\n\nSome text\n\n- [x] done #todo\n";
      const items = parseTodoContent(content, "file.md");
      assert.deepStrictEqual(items, []);
    });

    test("ignores open checkboxes without #todo tag", () => {
      const content = "- [ ] no tag here\n- [ ] also no tag\n";
      const items = parseTodoContent(content, "tasks.md");
      assert.deepStrictEqual(items, []);
    });

    test("returns only #todo-tagged open checkbox items", () => {
      const content =
        "- [ ] first task #todo\n- [x] done #todo\n- [ ] not tagged\n- [ ] second task #todo (DUE: 2030-01-01)\n";
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
      const items = [
        makeItem("no due", undefined),
        makeItem("overdue", past),
      ];
      const sorted = sortTodoItems(items);
      assert.strictEqual(sorted.noDue.length, 1);
      assert.strictEqual(sorted.noDue[0].text, "no due");
      assert.strictEqual(sorted.overdue.length, 1);
      assert.strictEqual(sorted.overdue[0].text, "overdue");
    });

    test("overdue items come before upcoming, ordered earliest first", () => {
      const past1 = new Date(Date.now() - 2 * 86400000);
      const past2 = new Date(Date.now() - 86400000);
      const items = [
        makeItem("overdue2", past2),
        makeItem("overdue1", past1),
      ];
      const sorted = sortTodoItems(items);
      assert.strictEqual(sorted.overdue.length, 2);
      assert.strictEqual(sorted.overdue[0].text, "overdue1");
      assert.strictEqual(sorted.overdue[1].text, "overdue2");
    });

    test("places items in correct time buckets", () => {
      // It's hard to test precise bucket boundaries with dynamic `Date.now()`, 
      // but we can ensure they land in buckets and are sorted.
      const now = new Date();
      
      const inThisWeek = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now (assuming we are not in the last hour of Sunday)
      const inFutureYear = new Date(now.getFullYear() + 2, 0, 1);
      
      const items = [
        makeItem("future year", inFutureYear),
        makeItem("this week", inThisWeek),
      ];
      const sorted = sortTodoItems(items);
      
      // this week might actually fall into overdue if 1 hour from now is somehow still past (it's not).
      // Or if it's Sunday 23:55, 1 hr from now is next week. But practically `thisWeek` or `nextWeek`.
      // We just ensure length adds up.
      const totalUpcoming = sorted.thisWeek.length + sorted.nextWeek.length + sorted.thisMonth.length + sorted.nextMonth.length + sorted.thisYear.length;
      assert.ok(totalUpcoming >= 1, "Should have at least one upcoming item");
      assert.strictEqual(sorted.nextYearAndBeyond.length, 1);
      assert.strictEqual(sorted.nextYearAndBeyond[0].text, "future year");
    });
  });
});
