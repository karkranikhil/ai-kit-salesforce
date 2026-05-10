# /validate-deploy

Validate the deployment safely before applying it to any org.

## Steps

1. Identify the target org alias from `sfdx-project.json` or ask the developer.
2. Confirm this is NOT production, or get explicit confirmation if it is.
3. Show the list of components that will be deployed.
4. Run: `npm run validate`
5. Review the output for errors.
6. Report: tests passed, coverage %, any failures.

## Safety checks

- [ ] Target org alias confirmed
- [ ] Not deploying to production without sign-off
- [ ] All tests passing
- [ ] Coverage ≥ 75%
- [ ] No destructive changes included (unless approved)
- [ ] Profiles not included (unless required)

## If validation fails

- Show the exact error messages.
- Identify the affected component.
- Suggest the fix.
- Do not apply the deployment until validation passes.
