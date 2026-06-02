# Briefs

Each brief tells you what to build for a given task, where to start, what the contract is, and what done looks like. Tests in the matching `.test.ts` file are the definition of done.

## Layout

```
briefs/
├── sprint-1/
│   ├── a-register.md
│   ├── a-login.md
│   ├── b-preferences-storage.md
│   ├── c-bottom-nav.md
│   └── c-home-screen.md
├── sprint-2/
│   └── ...
├── sprint-3/
│   └── ...
└── sprint-4/
    └── ...
```

Filenames follow the pattern `<owner-letter>-<short-slug>.md`:

- `a-` prefix means Yvonne (A) owns the task. Listed for completeness but you would not normally pick these up.
- `b-` prefix means Bikash (B).
- `c-` prefix means Tracy (C).

## Picking up a task

1. Find the brief for your task under the matching sprint folder.
2. Read it. The "Where to start" section names the real file you open first.
3. Open the scaffold file. Function signatures, imports, and the pointer comment are already in place. Replace the placeholder bodies.
4. Run the tests: `npm test -- <feature-area>`. Iterate until they pass.
5. Push. Open a PR. The brief stays in the repo as the record.

## When you finish

The brief and tests are the contract. The scaffold gets overwritten by your real implementation when you push. If something in the brief or the tests was wrong, say so in the PR description and we adjust as a group.
