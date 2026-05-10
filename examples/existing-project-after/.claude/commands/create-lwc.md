# /create-lwc

Create a new Lightning Web Component with loading, error, empty state, and secure Apex integration.

## Required input

- Component name and purpose
- Data needed (object, fields)
- User interactions required
- Whether an Apex controller is needed

## What to create

1. **HTML template** — with loading spinner, error display, empty state, and main content
2. **JavaScript controller** — wire or imperative Apex, error handling, loading state
3. **CSS** — minimal, follows existing patterns
4. **Apex controller** (if needed) — cacheable where appropriate, CRUD/FLS enforced
5. **Jest test** — renders correctly, handles wire data and errors

## Rules

- Always show loading, error, and empty states
- Use Custom Labels for user-visible strings
- Enforce CRUD/FLS in Apex controller
- No sensitive data in component attributes or events
- Follow existing component patterns in the project

## Output

Provide all files. Explain the component structure and data flow.
