---
description: Turn an approved plan or planning discussion into a resumable implementation plan
argument-hint: (optional) feature name, slug, or spec file path
allowed-tools: Read, Write, Glob, Grep, Bash(git status:*), Bash(git branch:*), Bash(git rev-parse:*)
---

You are capturing work that has already been thought through into a durable implementation plan on disk. Always adhere to any rules or requirements set out in any CLAUDE.md files when responding.

User input: $ARGUMENTS

## High level behavior

This command is the last step before implementation begins:

1. `/create-feature-spec` turns an idea into a spec, or `/create-feature-branch` picks up a spec written elsewhere. Either way you are on a feature branch with a spec.
2. Plan mode works out **how** to build it.
3. This command writes that plan to `_plans/<feature-slug>.md`.

**Why this exists.** A long plan cannot be executed in one session — the context window runs out, and everything worked out in conversation is lost with it. This file is what survives. Write it so that a fresh session, with no memory of any discussion, can open it and continue correctly.

That single constraint governs every choice below. If a detail was decided in conversation and is not written here, it is gone.

## Step 1. Establish the source

Work through these in order and use the first that applies.

**A. A plan already exists in this conversation.** The user has been in plan mode, or a plan has otherwise been agreed. This is the primary source. Transcribe and structure it — do not re-plan it, do not quietly improve it, and do not drop steps you personally would have done differently. Mine the surrounding discussion for the technical specifics the plan itself leaves implicit.

**B. There is a planning discussion but no explicit plan.** Derive the phases and tasks from what was discussed. Where the discussion left something genuinely undecided, record it under Open questions rather than inventing an answer.

**C. There is neither.** Ask the user what they want planned before writing anything. Offer to read an existing spec if one is present under `_specs/`. Do not guess a feature into existence, and do not write a placeholder file.

In cases A and B, if the conversation contradicts itself because the approach changed partway through, follow the **latest** decision and note the change under Decisions so a later session does not revive the abandoned approach.

## Step 2. Identify the feature and find its spec

Determine `feature_slug`, in this order:

1. From `$ARGUMENTS`, if given — a name, a slug, or a spec file path.
2. From the current git branch, if it matches `claude/feature/<slug>` — take `<slug>`.
3. Otherwise ask the user.

Apply the usual slug rules: lowercase, kebab-case, only `a-z`, `0-9` and `-`, collapsed and trimmed, maximum 40 characters.

Then look for a matching spec at `_specs/<feature_slug>.md`, or anywhere else in the repository. If you find one, **link to it rather than restating it**. The spec owns the *what* and the *why*; this plan owns the *how*. Duplicating requirements here creates two documents that will disagree later.

If no spec exists, that is fine — the plan carries a short Context section instead.

## Step 3. Write the plan

Save to `_plans/<feature_slug>.md`. The `_plans/` directory will not exist on the first run — create it as needed.

Use the exact structure given in the Appendix below. It is stack-agnostic on purpose: adapt the terminology to whatever this project actually uses, following any CLAUDE.md and the conventions already visible in the surrounding code.

Rules for the content:

- **Phases must be session-sized.** Each one should be completable, and leave the project working, within a single session. If a phase looks too big to finish before context runs out, split it. This is the whole point of the document.
- **Capture every technical specific.** Commands, schema definitions, field names, configuration values, file locations, endpoint shapes, third-party details — all of it, in the `Technical details` of the phase that needs it. This is the one place where implementation detail belongs; the spec deliberately excludes it.
- **Record decisions and their reasons.** A later session that does not know why an approach was rejected will cheerfully re-introduce it.
- **Tasks must be atomic and checkable.** Each should be implementable on its own and produce working code.
- **Mark a task `[complex]`** only when it has sub-tasks needing individual tracking, requires real architectural judgement, or spans multiple systems. Most tasks should not be marked.
- **Note dependencies explicitly** where order matters.
- **Do not add unit or e2e testing tasks** unless the user asked for them, or the spec's own testing section calls for them.
- **Separate out human-only work** — account creation, credentials, third-party configuration, DNS, billing — into Action required, where a person will see it before starting.

If files were already changed for this feature before the plan was written, say so in the Progress section rather than assuming a clean start.

## Step 4. Final output to the user

After the file is saved, respond with a short summary in this exact format:

Plan: _plans/<feature_slug>.md
Spec: <path to spec, or "none">
Phases: <n>
Action required: <count, or "none">

Then state the first phase to be executed, and remind the user that a new session should be pointed at the plan file. Do not reproduce the plan in the chat.

---

## Appendix. Implementation plan template

Reproduce this structure, filled in, with the HTML comments removed.

````markdown
# Implementation Plan: <Feature Title>

| | |
|---|---|
| **Slug** | `<feature-slug>` |
| **Spec** | `_specs/<feature-slug>.md` <!-- or "None" --> |
| **Branch** | `claude/feature/<feature-slug>` |
| **Status** | Not started |
| **Created** | <YYYY-MM-DD> |
| **Updated** | <YYYY-MM-DD> |

## How to resume this plan

<!-- Keep this section as written. It is the instruction set for a session that has no
     memory of the conversation this plan came from. -->

1. Read the spec linked above for the *why*. This plan covers only the *how*.
2. Find the first phase in **Progress** below that is not `Done`.
3. Read that phase in full — its goal, prerequisites, tasks, technical details, and its
   "Done when" criteria — before changing any code.
4. Check **Decisions** before choosing an approach. Anything already settled there is not
   open for reconsideration without saying so.
5. As you work: tick each task, keep **Progress** current, and add a line to the
   **Session log**. A plan that is not updated as it goes is worse than no plan.
6. If reality contradicts the plan, correct the plan in place and record it under
   **Deviations**. Do not silently diverge.

## Overview

<!-- A short paragraph: what will exist when this is finished. Enough for a cold reader to
     orient without opening the spec. -->

## Context

<!-- Only if there is no spec: the minimum background needed to implement sensibly — the
     problem, the users, the constraints. If a spec exists, write "See spec." and stop. -->

## Progress

<!-- The resume pointer. Update it at the end of every working session. -->

| Phase | Name | Status |
|---|---|---|
| 1 | | Not started |
| 2 | | Not started |

<!-- Status values: Not started / In progress / Done / Blocked -->

**Current state of the working tree** — <!-- Anything already changed before or during this
     plan, so a fresh session is not surprised. "Nothing yet" is a valid answer. -->

## Action required

<!-- Human-only steps. Keep this above the phases so it is seen before work starts.
     If there are none, write "No manual steps required." and keep the heading. -->

| When | Action | Why it is needed |
|---|---|---|
| Before / During / After | | |

## Phase 1: <Phase Name>

**Goal** — <!-- One sentence: what is true at the end of this phase that was not true before. -->

**Prerequisites** — <!-- What must already be done. "None" for the first phase. -->

### Tasks

- [ ] <!-- Atomic, checkable, specific enough to act on without further questions. -->
- [ ] <!-- Note dependencies inline, e.g. "(depends on task 1)". -->
- [ ] <!-- Mark [complex] only where genuinely warranted, with sub-tasks: -->
  - [ ] 
  - [ ] 

### Technical details

<!-- Everything needed to execute the tasks above without the original conversation:
     exact commands, schema and field definitions, configuration keys and values, file
     locations, endpoint shapes, library names and versions, third-party specifics.
     Be concrete. This section is why the plan survives a lost context window. -->

### Done when

<!-- Observable, checkable conditions. How a fresh session confirms this phase is finished
     rather than assuming it. -->

- 

## Phase 2: <Phase Name>

<!-- Repeat the Phase 1 structure for each subsequent phase. -->

**Goal** — 

**Prerequisites** — 

### Tasks

- [ ] 

### Technical details

### Done when

- 

## Decisions

<!-- What was settled during planning, and why. Include rejected alternatives — this is what
     stops a later session re-opening a closed question or undoing a deliberate choice. -->

| Decision | Reasoning | Alternatives rejected |
|---|---|---|
| | | |

## Open questions

<!-- Anything still genuinely undecided, and who needs to resolve it. Blocking questions
     should also show up as Blocked in Progress. -->

| Question | Blocking? | Owner |
|---|---|---|
| | | |

## Deviations

<!-- Filled in during implementation, not at planning time. Where the work departed from
     this plan and why. Leave the heading with "None so far." -->

None so far.

## Session log

<!-- One line per working session, appended as work proceeds. This is how the next session
     learns what actually happened, as opposed to what was intended. -->

| Date | Phases touched | Notes |
|---|---|---|
| | | |
````
