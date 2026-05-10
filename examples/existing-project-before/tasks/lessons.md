# Lessons Learned

> Claude Code updates this file after any correction or failed approach.
> Review relevant lessons at the start of each new task.

<!-- AI-KIT-SALESFORCE:START -->

## How to use this file

After any correction from the user or failed approach, Claude should add an entry:

```markdown
## Lesson: <short title>

- **What went wrong:** description
- **Root cause:** why it happened
- **New rule:** how to prevent it
- **Example:** (optional)
```

Keep lessons practical, specific, and project-relevant.
Ruthlessly iterate — if a mistake repeats, strengthen the rule.

---

## Lesson: Do not overwrite existing project files

- **What went wrong:** AI-Kit generated files replaced developer customisations.
- **Root cause:** Wrote to file without checking if it already existed.
- **New rule:** Always check for existing files before writing. Use safe merge mode with marker blocks. Create backups before modification.

<!-- AI-KIT-SALESFORCE:END -->
