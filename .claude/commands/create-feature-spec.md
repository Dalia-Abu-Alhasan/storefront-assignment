---
description: Create a feature spec file and branch from a short idea
argument-hint: Short feature description
allowed-tools: Read, Write, Glob, Bash(git status:*), Bash(git branch:*), Bash(git switch:*), Bash(git rev-parse:*)
---

You are helping to spin up a new feature spec for this application, from a short idea provided in the user input below. Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

Your job will be to turn the user input above into:

- A human friendly feature title in Title Case (e.g. New Heist Form)
- A git safe slug in kebab-case (e.g. new-heist-form)
- A safe git branch name not already taken (e.g. claude/feature/new-heist-form)
- A detailed markdown spec file under the _specs/ directory

Then save the spec file to disk and print a short summary of what you did.

## Step 1. Check the current branch

Check the current Git branch, and abort this entire process if there are any uncommitted, unstaged, or untracked files in the working directory. Tell the user to commit or stash changes before proceeding, and DO NOT GO ANY FURTHER.

## Step 2. Parse the arguments

From `$ARGUMENTS`, extract:

1. `feature_title`  
   - A short, human readable title in Title Case.  
   - Example: "Card Component for Dashboard Stats".

2. `feature_slug`  
   - A git safe slug.  
   - Rules:  
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

If you cannot infer a sensible `feature_title` and `feature_slug`, ask the user to clarify instead of guessing.

## Step 3. Switch to a new Git branch

Before making any content, switch to a new Git branch using the `branch_name` derived from the `$ARGUMENTS`. If the branch name is already taken, then append a version number to it: e.g. `claude/feature/card-component-01`

## Step 4. Draft the spec content

Create a markdown spec document that Plan mode can use directly and save it to `_specs/<feature_slug>.md`. The `_specs/` directory will not exist on the first run of this command — create it as needed.

Use the exact structure given in the Appendix below. That template is stack-agnostic on purpose: adapt the terminology in each section to whatever this project actually uses, following any CLAUDE.md and the conventions already visible in the surrounding code rather than inventing new ones.

When filling it in:

- Fill every section. If one genuinely does not apply, keep the heading and write "None." so the reader knows it was considered rather than forgotten.
- Do not add technical implementation details such as code examples, class names or file paths. Field tables and endpoint tables are fine; they are contract, not code.
- Delete every HTML comment from the finished spec. They are guidance for you, not content for the reader.

## Step 5. Final output to the user

After the file is saved, respond to the user with a short summary in this exact format:

Branch: <branch_name>
Spec file: _specs/<feature_slug>.md
Title: <feature_title>

Do not repeat the full spec in the chat output unless the user explicitly asks to see it. The main goal is to save the spec file and report where it lives and what branch name to use.

Then tell the user the next step: review the spec, then use plan mode to work out how to build it. If that plan is long enough to need more than one session, `/create-implementation-plan` will write it to `_plans/` so it survives a lost context window.

---

## Appendix. Spec template

Reproduce this structure exactly, with the placeholders filled in and the HTML comments removed.

````markdown
# <Feature Title>

| | |
|---|---|
| **Slug** | `<feature-slug>` |
| **Branch** | `claude/feature/<feature-slug>` |
| **Status** | Draft |
| **Created** | <YYYY-MM-DD> |

## 1. Summary

<!-- Two or three sentences. What is being added, for whom, and what becomes possible.
     Someone should be able to read only this section and know whether to keep reading. -->

## 2. Problem

<!-- Why this is worth building. The user need or business pressure behind it. Describe the
     situation today and what is unsatisfactory about it. Avoid jumping to a solution. -->

## 3. Goals and non-goals

**Goals**

<!-- Bullet list. Each one an outcome, not a task. -->

- 

**Non-goals**

<!-- Bullet list. The adjacent things a reader might reasonably assume are included, stated
     plainly as excluded. This section prevents scope drift more than any other. -->

- 

## 4. User stories

<!-- One line each, in the form: As a <role>, I want <capability>, so that <benefit>.
     Cover the primary path and any secondary roles. -->

- 

## 5. User experience

<!-- Behaviour as a user perceives it. No component or framework names. -->

**Entry point** — <!-- How the user reaches this feature: which screen, which navigation. -->

**Main flow** — <!-- Numbered walkthrough of the successful path, step by step. -->

1. 

**States** — <!-- Every screen has more than the happy path. Say what each looks like. -->

| State | Behaviour |
|---|---|
| Loading | |
| Empty | |
| Error | |
| Success | |

**Interaction details** — <!-- Sorting, filtering, pagination, keyboard access,
     confirmation before destructive actions, what happens on cancel, what persists on
     navigation away. -->

**Accessibility** — <!-- Anything beyond the project's baseline: focus handling, live
     regions for async updates, meaningful labels on icon-only controls. -->

## 6. Interface contract

<!-- The boundary between client and server, in whatever form this project uses: REST
     endpoints, GraphQL operations, server actions, RPC methods. Describe the contract, not
     the handler code. Omit only for a purely presentational change. -->

| Operation | Trigger | Purpose | Success result |
|---|---|---|---|
| | | | |

**Inputs**

| Field | Type | Required | Rules |
|---|---|---|---|
| | | | |

**Outputs**

| Field | Type | Notes |
|---|---|---|
| | | |

**Errors**

<!-- Which failures are expected and what each returns. Use the project's existing error
     format rather than introducing a new one; note here if this feature adds a new error
     type or code. Say what the user actually sees in each case. -->

| Condition | Status / code | What the user sees |
|---|---|---|
| | | |

## 7. Data model

<!-- New or changed persisted data. Fields and constraints, not entity or schema code. -->

**New or changed records**

| Field | Type | Required | Constraints / default |
|---|---|---|---|
| | | | |

**Access patterns** — <!-- The queries this data must serve, and any index or key they
     imply. Write the questions the data answers, not the query syntax. -->

**Migration impact** — <!-- Does the schema change? If the project uses migrations, one is
     implied. Is existing data affected, does anything need backfilling, and is the change
     reversible? -->

**Retention and growth** — <!-- Does this data grow without bound? What archives, expires or
     caps it? Note any storage limit in the target environment that this could approach. -->

## 8. Validation rules

<!-- Server-side rules are the contract; client-side rules are a convenience that must never
     contradict them. List each rule once and say where it is enforced. -->

| Rule | Message | Enforced |
|---|---|---|
| | | Server / Both |

## 9. Background and scheduled work

<!-- Anything recurring or deferred: cleanup, notifications, report generation, retries.
     Say where it runs and what triggers it. Environments differ sharply here — some
     database editions ship no job scheduler, some hosts cap function duration — so confirm
     the mechanism exists in this project's environment before specifying it.
     If the feature needs none, write "None." -->

## 10. Security and access

<!-- Who may see and do what. Any data that must not leak into a response or a log. Any new
     input that reaches a query, a file path, a shell, or a rendered page. If the feature is
     open to anyone who can reach the app, say so explicitly rather than leaving it blank. -->

## 11. Performance and scale

<!-- Expected data volumes and request rates. Any operation that grows with the size of the
     dataset. Any response that could grow unbounded and therefore needs paging or limits.
     Note any known ceiling in the target environment — memory, CPU, storage, request size,
     execution timeout — that this feature could plausibly meet. -->

## 12. Testing

<!-- What proves this works. Be specific enough that the cases can be written from this list
     without further questions. Match the project's existing test layers; drop any that do
     not exist here rather than inventing a new one. -->

**Integration** — <!-- Behaviour end to end, across the real boundaries. -->

- 

**Unit** — <!-- Logic worth isolating from I/O. -->

- 

**Frontend** — <!-- Component and state behaviour. -->

- 

**Manual** — <!-- Anything only a human can confirm, such as layout or interaction feel. -->

- 

## 13. Acceptance criteria

<!-- The definition of done. Each line independently checkable and phrased so it is
     unambiguously true or false. This is what the feature is reviewed against. -->

- [ ] 

## 14. Open questions

<!-- Anything genuinely undecided, with the options and who needs to decide. An empty list
     here on a non-trivial feature usually means the questions have not been looked for. -->

| Question | Options | Owner |
|---|---|---|
| | | |

## 15. Out of scope and follow-ups

<!-- Deliberately deferred work, so it is captured rather than lost or quietly built. -->

- 
````
