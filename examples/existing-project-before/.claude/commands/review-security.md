# /review-security

Review the changed files in this project for Salesforce security issues.

## What to check

1. **SOQL injection** — dynamic SOQL without `escapeSingleQuotes` or bind variables
2. **CRUD/FLS** — all DML and queries enforce appropriate object and field permissions
3. **Sharing** — all Apex classes use `with sharing` (or have documented exceptions)
4. **Secrets** — no tokens, credentials, session IDs, JWTs, or private keys in code or metadata
5. **Named Credentials** — all external callouts use Named Credentials
6. **Guest user** — no sensitive data accessible without authentication
7. **Hardcoded IDs** — no hardcoded org IDs, record IDs, or user IDs
8. **Permissions** — no over-privileged Permission Set assignments

## Output format

For each file reviewed:
- List any security issues found (severity: Critical / High / Medium / Low)
- Provide the specific line or code that is the concern
- Suggest the fix

End with a summary table: File | Issues Found | Severity.

If no issues found, state clearly: "No security issues found."
