# Design Overview

## UI

The UI is a webview that is displayed in the vscode sidebar. It is a table of todo items.

- All todo items without due dates are listed first.
- Then all items that are due or past due are listed. This is in order of due date (earlier first.)
- Finally, all items that are not yet due are listed, in order of due date.
- All items will also include the file they are defined in within parentheses next to the item.

### Linking

Each todo-item should be clickable, which will point to the exact todo item.

### One-click to complete

There should be a checkbox on each todo item. Once clicked, it will resolve the item in the actual file.

## Identifying a todo item

A todo item is identified via an open checkbox in a markdown file:

```markdown
- [ ] follow up on the design document.
```

The extension aggregates all of these items, and displays them.

## Due Dates

Due dates are specified via an additional annotation in line with the item:

```markdown
- [ ] follow up on the design document (DUE: 2026-05-13)
```

- ISO8601 timestamps are supported, as are YYYY-MM-DD.


## Features