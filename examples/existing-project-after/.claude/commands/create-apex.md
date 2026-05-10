# /create-apex

Create a new Apex class with service/test structure and security checks.

## Required input

- Class purpose and name
- Object(s) involved
- Operations needed (query, insert, update, delete, callout, etc.)
- Sharing model requirement

## What to create

1. **Service class** (`ClassName.cls`) — bulkified business logic
2. **Test class** (`ClassNameTest.cls`) — positive, negative, bulk, security tests

## Rules

- Use `with sharing` unless told otherwise
- No SOQL or DML inside loops
- Use Collections and Maps for bulk handling
- Enforce CRUD/FLS where needed
- Use Custom Metadata for any configurable values
- Use Named Credentials for any callouts
- Add class-level Javadoc comment explaining purpose

## Output

Provide both files. Explain the design choices made.
