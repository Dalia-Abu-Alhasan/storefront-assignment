---
description: Add a category and four items to the catalogue, matching the data shape. Typechecks, does not commit.
argument-hint: <Category name>
allowed-tools: Read, Edit, Glob, Grep, Bash(git status:*), Bash(npm run typecheck), Bash(npm run build)
---

Add a new category named **$ARGUMENTS** to the catalogue, with four items.

## 1. Refuse to run on a dirty working tree

Run `git status --porcelain`. If it prints anything at all, stop immediately and say:

> The working tree has uncommitted changes. Commit or stash them first — this command edits
> `data/catalogue.json` and its changes must land as their own commit.

Do not continue. Do not offer to stash on the reader's behalf. This guard exists so the category
addition is never tangled with unrelated work in the same diff.

If `$ARGUMENTS` is empty, stop and say the command needs a category name, e.g.
`/add-category Board games`.

## 2. Read the contract before writing anything

Read, in this order:

- `data/catalogue.json` — the existing shape, and every `slug` and `sku` already in use.
- `lib/catalogue.ts` — the `Item` and `Category` types, and what `assertCatalogue()` enforces.
- `CLAUDE.md`, the Data shape section.

The house-style skill governs how this data is later rendered — images in particular. Follow it.

## 3. Derive the category

- `slug` — kebab-case of `$ARGUMENTS`, in this order: lowercase; replace anything that is not
  `a-z` or `0-9` with a hyphen; **collapse runs of hyphens into one**; **trim leading and trailing
  hyphens**. "Board games" becomes `board-games`; "Board & Games" becomes `board-games`.
  `assertCatalogue()` validates against `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, which rejects doubled,
  leading and trailing hyphens — skipping the collapse and trim produces data that throws at
  import time.
- `name` — `$ARGUMENTS` as given, with its original capitalisation.
- `blurb` — one sentence, under about twelve words, in the voice of the existing blurbs: plain,
  concrete, no marketing language.
- `items` — the four items from step 4. The field is required; a category without it fails
  validation.

If that slug already exists in `data/catalogue.json`, stop and say so. Do not merge into it and do
not invent a variant slug.

## 4. Write four items

Four items, plausible for the category and varied — not four near-identical entries.

Every item needs every field:

| Field | Rule |
| --- | --- |
| `sku` | `XX-NNNN`, always two letters and four digits. `XX` is the uppercased initials of the slug's words (`board-games` → `BG`); for a single-word slug, take its **first two letters** (`lighting` → `LI`). Then find the highest `NNNN` already used with that prefix anywhere in the catalogue and continue from the next number — do not start at `0001` if the prefix is already in use (`DT` already reaches `DT-0004`). Uniqueness is enforced across the **whole** catalogue by `assertCatalogue()`, so check every existing sku, not just this category's. |
| `name` | The product name. |
| `blurb` | One short sentence for the card. |
| `description` | Two or three sentences for the detail page. Concrete detail — material, dimensions, what it is actually like. Match the existing tone. |
| `priceEur` | A **number**, never a string. Vary across the four; two decimals at most. |
| `currency` | Always the string `"EUR"`. |
| `inStock` | Boolean. Make at least one `false`, so the out-of-stock state stays visible. |
| `addedOn` | ISO `YYYY-MM-DD`. Use today's date or a plausible recent one. Never a rendered format. |
| `image.src` | `/images/placeholder.svg` — the existing placeholder. Do not invent image paths and do not reference an external URL. |
| `image.alt` | Real descriptive alt text for that specific item. Never empty, never the bare product name, never the filename. |
| `image.width` | `800` |
| `image.height` | `600` |

## 5. Insert it

Append the new category to the `categories` array in `data/catalogue.json`. Leave every existing
category untouched — this is an addition, not a rewrite. Keep the file's existing indentation.

## 6. Typecheck, then build

Run `npm run typecheck`. It must pass.

Then run `npm run build`. **Typecheck alone proves nothing about the data**: `tsc --noEmit` never
executes module code, so `assertCatalogue()` does not run and a duplicate `sku`, a bad `slug`, a
non-ISO `addedOn` or a `priceEur` written as a string all sail straight through it. The build is
what imports `lib/catalogue.ts` and runs the validator. Fix the data until both pass.

## 7. Report whether a categories index is now needed

Count the categories in `data/catalogue.json` after your addition. If there is now more than one,
say so plainly in your report:

> The catalogue now has N categories. `app/page.tsx` still redirects to the first one and nothing
> links to the others, so this category is unreachable in the UI until a categories index exists.
> That is a feature, not part of this command.

Do not build the index yourself. It needs its own page plus `loading.tsx`, `error.tsx` and
`not-found.tsx`, and it belongs in a feature with a spec and a plan.

## 8. Stop. Do not commit.

**Do not run `git add`, `git commit`, `git push`, or create a branch.** The reader reviews the diff
and commits it themselves.

Finish with a short report:

- The category name and slug you added.
- The four skus and their prices.
- The typecheck result.
- The exact line: `Not committed — review the diff and commit when you are happy with it.`
