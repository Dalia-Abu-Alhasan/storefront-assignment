# Submission

- Site: https://storefront-assignment-mauve.vercel.app/
- Preview deployment from a feature branch (`claude/feature/cart-and-checkout`):
  https://storefront-assignment-3xreokb2i-dalia-abu-alhasan.vercel.app
- Stack: Next.js 16.3.5 (App Router), React, TypeScript 5.9.3, Playwright
- External service and the variable that holds its key: exchangerate-api.com / `EXCHANGE_RATE_API_KEY`
  (called only from `app/api/rates/route.ts`, 5 s timeout)

## The artifacts

- Scaffold prompt: `_prompts/scaffold-prompt.md`, written with ChatGPT on the web (GPT-5.6 Luna),
  1 round. Merge `d179ca3`. One round was too few. The run exposed four gaps a second round should
  have closed: it pinned eslint 10, specified `next lint`, did not say how the detail page reaches
  `/api/rates`, and let a `setState` in `useEffect` through. Each is now a rule in `CLAUDE.md`.
- Rule file: `CLAUDE.md`, 109 lines. Three rules that earned their place (all from the scaffold run,
  20 Sep 2026):
  1. "Do not upgrade ESLint past 9.x": eslint 10 crashed the `eslint-plugin-react` bundled in `eslint-config-next`.
  2. "Do not use `next lint`": it was removed in Next 16 and the prompt specified it.
  3. "`useEffect` must not call `setState` synchronously": the first `ConvertedPrice` failed lint on it.
- MCP: `.mcp.json` at project scope (Context7 over HTTP with key, Playwright over stdio). `claude mcp list`:
  ```
  context7: https://mcp.context7.com/mcp (HTTP) - ✔ Connected
  playwright: npx -y @playwright/mcp@latest - ✔ Connected
  ```
  Captured after the switch to the `Authorization: Bearer` header, with no "missing variable" warning.
- Skill: `.claude/skills/house-style/` (SKILL.md, references/rules.md, assets/PageHeader.template.tsx).
  It fired on its own during Feature B phase 1 (session "Cart and checkout phase one", 22 Sep 2026),
  when the prompt was only "execute the next phase": `Launching skill: house-style`
- Reviewer: `.claude/agents/site-reviewer.md`, `tools: Read, Grep, Glob` (Bash was left out as well,
  since `cat >` can write files). Starter `be399ff`, then rules added in `86a3cf2`, each with its incident:
  - A. `loading.tsx` must render a real `<PageHeader>`: both loading segments faked it with skeleton divs (20 Sep).
  - B. No synchronous `setState` in `useEffect`: the first `ConvertedPrice` draft (20 Sep).
  - C. A client component may call our own route, never the upstream host. Calling upstream would
    have put the key in the bundle (20 Sep).
- /add-category: `bc4a279` (Board games), `48dbb6b` (Lighting), merged in `d29c7c3`.

## The lifecycle

- Feature A (Path A), categories index at the site root: spec `d7399fa`
  (`_specs/categories-index.md`), plan `df88026` (`_plans/categories-index.md`), branch
  `claude/feature/categories-index`, merge `a60d90c`.
- Feature B (Path B), cart and checkout: spec `99e4d2c` (`_specs/cart-and-checkout.md`), plan
  `fa46891` (`_plans/cart-and-checkout.md`), 4 phases, 5 sessions (plan, then phase 1, phase 2,
  phase 3 and phase 4 with the final review), merges `09a0d6d` and `be2e245`.
- One deviation from the plan and why: phase 4 did not add a `"success"` tone to `StateMessage`.
  The confirmation's reference, date, lines and total are ordinary content, not a state message
  (see Deviations in `_plans/cart-and-checkout.md`).

## What went wrong

- The first site-reviewer run found two BLOCKING defects that had passed typecheck, lint, build and
  every test. `references/rules.md` still told the agent to skeleton the page header, and the root
  segment had no `error.tsx`/`not-found.tsx`. Both were fixed in `f40d303`.
- `/add-category` claimed `npm run typecheck` would catch data-shape errors. A duplicate sku passed
  typecheck and failed only the build, because `assertCatalogue()` runs at import. The command now
  runs the build too (`181ddaf`).
- The Context7 header in `.mcp.json` used the old `CONTEXT7_API_KEY` form. It was changed to
  `Authorization: Bearer ${CONTEXT7_API_KEY}` after checking the Context7 README, in the same
  commit as this file. While editing, the real key was first pasted in place of the variable name.
  The check before commit caught it and it never reached git.

## Secrets check

- `git check-ignore -v .env .env.example`:
  ```
  .gitignore:2:.env	.env
  ```
  It names `.env` and says nothing about `.env.example`, which is not ignored and is tracked.
- History scanned with `git log -p --all | grep -iE` for key, token, secret and bearer patterns
  followed by a long value, and for the Context7 key prefix `ctx7sk`. It found no values, only
  placeholder names.
- No key was ever committed.
