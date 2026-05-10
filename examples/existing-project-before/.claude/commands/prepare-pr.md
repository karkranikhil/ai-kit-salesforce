# /prepare-pr

Summarise this branch's changes and prepare it for pull request.

## What to produce

### 1. Change summary

List every file changed. For each file:
- Type of change (new / modified / deleted)
- One-sentence description of what changed and why

### 2. Apex tests

- Which test classes cover these changes?
- What is the expected code coverage?
- Run command: `npm run test:apex`

### 3. Deployment impact

- What metadata components are included?
- Any destructive changes?
- Any Profiles (flag if yes — requires review)?
- Estimated deployment time?
- Any dependencies (packages, other orgs, data)?

### 4. Risks

- Security concerns?
- Governor limit risks?
- User-visible changes?
- Production risk level: Low / Medium / High

### 5. Checklist

- [ ] Tests written and passing
- [ ] Security reviewed
- [ ] Deployment validated
- [ ] Profiles excluded (or justified)
- [ ] No hardcoded IDs
- [ ] No secrets exposed
- [ ] Reviewer assigned
