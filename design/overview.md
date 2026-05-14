# Design Overview

## UI

The UI is a webview that is displayed in the vscode sidebar. It is a table of todo items.

- All todo items without due dates are listed first.
- Then all items that are due or past due are listed. This is in order of due date (earlier first.)
- Items that are not yet due are further grouped into "This Week", "Next Week", "This Month", "Next Month", "This Year", and "Next Year and Beyond", each in their own section, ordered by due date.
- All items will also include the file they are defined in within parentheses next to the item.

Each of the preceeding categories is put into their own headers. The sections are collapsible, for example to minimize user distractions by showing upcoming items that are not yet due.

### Linking

Each todo-item should be clickable, which will point to the exact todo item.

### One-click to complete

There should be a checkbox on each todo item. Once clicked, it will resolve the item in the actual file.

## Identifying a todo item

A todo item is identified via an open checkbox in a markdown file:

```markdown
- [ ] follow up on the design document. #todo
```

The extension aggregates all of these items, and displays them.

## Due Dates

Due dates are specified via an additional annotation in line with the item:

```markdown
- [ ] follow up on the design document #todo (DUE: 2026-05-13)
```

- ISO8601 timestamps are supported, as are YYYY-MM-DD.


## Features