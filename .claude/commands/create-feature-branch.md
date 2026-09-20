---
description: Create a feature branch from an existing spec file
argument-hint: Spec file path or name (e.g. card-component or _specs/card-component.md)
allowed-tools: Read, Glob, Bash(git status:*), Bash(git branch:*), Bash(git switch:*), Bash(git rev-parse:*)
---

You are helping to start work on a feature that has **already been specced**, from the spec file identified in the user input below. Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

This command assumes the spec **already exists** — written by hand, produced elsewhere, or brought in from another project. It does not care where the spec came from. Its only job is to read that spec, derive a name from it, and get you onto a branch.

Use `/create-feature-spec` instead when you have an idea but no spec yet; that command writes the spec and creates the branch in one go, and this one is then unnecessary.

Your job is to turn the spec file identified above into:

- A human friendly feature title in Title Case (e.g. "Card Component for Dashboard Stats")
- A safe git branch name not already taken (e.g. `claude/feature/card-component`)

Then switch to that branch and print a short summary of what you did.

**You do not create, rewrite, or extend any spec file.** The spec is an input, not an output. `Write` is deliberately absent from `allowed-tools` above so this cannot happen by accident. If the user's input describes an idea rather than pointing at an existing spec, tell them to run `/create-feature-spec` instead and stop.

The spec may have been written for any stack. Do not assume the conventions of this repository apply to it; read what it says.

## Step 1. Locate the spec file

Resolve `$ARGUMENTS` to exactly one existing spec file, in this order:

1. **A path.** If `$ARGUMENTS` looks like a path and that file exists, use it.
2. **A name or slug.** Otherwise treat it as a name and look for a match in `_specs/`, trying `_specs/<name>.md` first, then any spec file whose name contains it.
3. **Anywhere in the repo.** If nothing matches under `_specs/`, search the wider repository for a matching `*.md` file that looks like a spec.

Rules for this step:

- **Never** count a blank template as a candidate — a file such as `_specs/template.md`, or anything still full of unfilled placeholders, is a template rather than a spec.
- `_specs/` does not exist until `/create-feature-spec` first writes to it. If it is missing and nothing matches elsewhere, tell the user there are no specs yet and that they should run `/create-feature-spec` first. Do not create the folder.
- If `$ARGUMENTS` is empty, list the spec files you found under `_specs/` and ask the user which one to use. Do not guess, and do not pick the most recent one on their behalf.
- If more than one file matches, list the candidates and ask the user to pick. Do not guess.
- Once resolved, read the file to confirm it is genuinely a spec rather than an unrelated markdown document.

Record the resolved path as `spec_path`.

## Step 2. Check the working directory

Note the current Git branch, so the summary at the end can say where the new branch was cut from.

Then check for uncommitted changes to **tracked** files, staged or unstaged. If there are any, abort this entire process. Tell the user to commit or stash them before proceeding, and DO NOT GO ANY FURTHER.

**Untracked files are not a reason to abort.** Do not block on them.

This distinction matters. A spec that has just been added to the repository — written by hand, copied in from elsewhere, handed over by someone else — is an untracked file. Refusing to run because of it would make this command reject the very situation it exists to handle, and the only way out would be committing the spec to whatever branch you happen to be on, which is the wrong branch by definition.

Untracked files are carried across a branch switch unchanged, so an uncommitted spec arrives on the new branch with you. That is the desired outcome: commit it there, alongside the work it describes.

## Step 3. Derive the feature name

From the spec file, extract:

1. `feature_title`
   - A short, human readable title in Title Case.
   - Prefer the spec's top level `#` heading. Fall back to the filename if there is no usable heading.
   - Example: "Card Component for Dashboard Stats".

2. `feature_slug`
   - A git safe slug.
   - Prefer the spec's **filename without its `.md` extension** — `/create-feature-spec` already named the file after the slug, so this keeps the spec and its branch in step.
   - Only if the filename is unsuitable, derive the slug from `feature_title` using these rules:
     - Lowercase
     - Kebab-case
     - Only `a-z`, `0-9` and `-`
     - Replace spaces and punctuation with `-`
     - Collapse multiple `-` into one
     - Trim `-` from start and end
     - Maximum length 40 characters
   - Example: `card-component` or `card-component-dashboard`.

3. `branch_name`
   - Format: `claude/feature/<feature_slug>`
   - Example: `claude/feature/card-component`.

If you cannot infer a sensible `feature_title` and `feature_slug` from the spec, ask the user to clarify instead of guessing.

## Step 4. Switch to a new Git branch

Switch to a new Git branch using the `branch_name` derived above. If the branch name is already taken, then append a version number to it: e.g. `claude/feature/card-component-01`, then `-02`, and so on.

Check both local and remote branches when deciding whether a name is taken.

If the switch fails because an untracked file would be overwritten on the new branch, do not force it and do not delete anything. Report the conflicting file and stop.

Make no other changes to the working directory. Creating the branch is the only side effect of this command.

## Step 5. Final output to the user

After the branch is created, respond to the user with a short summary in this exact format:

Branch: <branch_name>
Spec file: <spec_path>
Title: <feature_title>

Do not repeat the contents of the spec in the chat output unless the user explicitly asks to see it. The main goal is to get onto the right branch and report which spec it is tied to.

Then tell the user the next step: use plan mode to work out how to build what the spec describes. If that plan is long enough to need more than one session, `/create-implementation-plan` will write it to `_plans/` so it survives a lost context window.
