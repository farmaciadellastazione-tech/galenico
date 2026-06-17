# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Italian-language single-page web app for **Farmacia della Stazione** (La Spezia) to handle galenical/magistral compounding: preparation calculations, legal pricing per Italian **D.M. 22/09/2017**, preparation sheets (schede), inventory with GHS hazard codes, Dymo label printing, and an AI formulary assistant. All user-facing text is in Italian and that should stay Italian — pricing/legal terms (Allegato A, Allegato B, Art. 5, Art. 7, Art. 8a) are regulatory names, do not translate or rename them.

## Branches (read this first)

Be careful which branch you commit to:

- **`root` is the production branch.** GitHub Pages serves this. New work goes here.
- `main` is stale legacy and points to an older, smaller version of the same file. Do not commit there.
- `index.html` is another stale legacy branch. Ignore.

The git default may say `main`; verify with `git status` and switch with `git checkout root` if needed. The history is dominated by "Add files via upload" commits — the user often edits in another tool and uploads through the GitHub web UI, so be ready for the local clone to be behind the remote.

## Run / build / test

The app itself is a single static file `index.html` (~6,000 lines, vanilla JS inlined in `<script>`, CSS in `<style>`) — no bundler. The pricing/inventory **pure logic is extracted into `pricing.js`** (loaded via `<script src="pricing.js">` before the inline script, exposed on `globalThis`), so it can be unit-tested in Node. To run:

- Open `index.html` directly in a browser, or serve the folder over any static HTTP server.
- Deployment is automatic via GitHub Pages from `root`. A push is live within ~1 minute.

**There IS a test suite** (Vitest): `npm test` runs `tests/pricing.test.js` (pure pricing/Allegato A+B unit tests) and `tests/engines-consistency.test.js` (loads the real `index.html` inline script in a vm with a DOM stub and checks that Tariffazione and Scheda give the same total — the "motore unico" invariant). Run it after any pricing change. Still **manually verify in a browser** after non-trivial UI edits: click through all seven pages, run a `libera`-mode calculation for each form, generate a Scheda, confirm no console errors.

## Architecture

Seven pages live in one DOM, each `<div class="page" id="page-{name}">`, toggled by `showPage(id, btn)`. Pages: `preparazione`, `tariffazione`, `scheda`, `archivio`, `inventario`, `etichette`, `formulario` (AI).

No framework, no component model, no store. State lives in:

- **DOM input IDs** — most communication between pages happens by writing into the target page's input fields and calling that page's render function.
- **Module-level `let`s** at the top of `<script>`: `tipoPrep`, `liberaRighe`, `liberaRigheExtra`, `aiHistory`, `tipoScheda`, `tipoTariff`, `tarPADaAllegatoA`, `opTecnologicheDesc`, `_suppManRighe`. (The pure pricing constants/helpers — `ALLEGATO_A`, `ALLEGATO_B_VOCI`, `calcAllegatoB`, `calcCompAggiuntivi`, etc. — live in `pricing.js` on `globalThis`.)
- **localStorage** under `gal_*` keys (see Persistence below).

Re-rendering is manual: after mutating state, call the relevant function — `calcPrep()`, `calcTariff()`, `aggiornaScheda()`, `invRender()`, `archivioRender()`, `etiqAggiorna()`, `ordiniRender()`. Some inputs already have `oninput=...` that chain these together.

### Cross-page sync

`sincronizzaTariffazione()` is the explicit bridge from Preparazione to Tariffazione: it propagates the PA name and price (Allegato A / inventario lookup), the prep type (`tipoPrep → tipoTariff` via a `mapTipo` table), quantity, concentration, and toggles tariffazione UI for `libera` mode. Most preparazione inputs call it on change. If you add a new field that should affect pricing, write into both places or pipe it through here.

### Preparation mode (libera)

There is now a SINGLE preparation mode, **"formula libera"**: the user adds N rows of substances (`liberaRighe`), each with its own name search, quantity, unit and price. The old `'perc'` (concentration-based) mode and its dead code (`modoPrepara`, `prepComps`, `setModoPrepara`, the `extra` array) were removed in the v46–v51 refactor. `calcPrep()` computes everything from `liberaRighe` / `liberaRigheExtra`; it still propagates the first/PA ingredient into `prep-pa-nome` / `t-pa-nome` so tariffazione works.

`tipoPrep` is the form (`soluzione | tintura | sospensione | unguento | polvere | capsule | cartine`). `tipoTariff` is the tariffazione-side equivalent (`liquida | tintura | sospensione | semisolida | polvere | capsule | cartine`). They're mapped (`mapTipo`), not identical. `tintura` (Estratti/tinture, Allegato B voce 2 €8,00) behaves as a liquid solution but with its own voce.

### Pricing engine (legal)

`ALLEGATO_A` is a large object mapping substance name → €/g; these are **legally mandated** prices (D.M. 22/09/2017). When a PA matches Allegato A, the price field becomes read-only and is highlighted — preserve that behavior. Tariff calculation in `calcTariff()` and the Scheda's own `aggiornaScheda()` follows the D.M. structure: materie prime + Allegato B base voice + per-component adders (Art. 5) + operations technologiche + 40% increment (Art. 7) + supplementi (Art. 8) + recipiente, then IVA 10%.

**Art. 8a hazard supplement (€2.50)** is now **auto-applied** based on H-codes (`hasHazard()` / `getHDaInventario()`): any PA with a health-hazard H-code triggers it, and for liquids/sospensioni any non-zero etanolo content triggers it via H225. Don't downgrade this to a manual checkbox.

**Manual extra surcharges** live in `_suppManRighe` (description + amount, summed by `suppManTotale()`) — these are not Art. 8a; they're operator-entered ad-hoc costs (e.g. "polverizzazione CBD").

**Capsule pricing** has its own branch in `calcTariff()`: Allegato B voce capsule starts at €22 for 120 capsules, ±€1 per 10 below / +€2 per 10 above. Empty capsules are searched in inventory by size (`taglia`) via `capsTagliaChanged()` — only items with `unit === 'pz'` are eligible. If the user manually types a final price in `s-prezzo`, that overrides the computed total.

### Persistence

All state is in `localStorage` under `gal_*` keys:

- `gal_inventario_v1` — inventory (substances, lotti, prices, H-codes, SDS URLs)
- `gal_archivio_schede_v1` — saved Schede
- `gal_ordini` — substances to order
- `gal_scheda_counter_<anno>` — yearly counter, incremented **only on definitive save** via `salvaInArchivio()`, not on preview
- `gal_gh_token` — GitHub PAT (gist scope)
- `gal_groq_key` — Groq API key (must start with `gsk_`)

Inventory mirrors to a **hardcoded GitHub Gist** (`GIST_ID = '6e97567a6b7e6408930936807c327144'`, file `galenico_inventario.json`) when a token is present. `invSave()` writes locally then PATCHes the Gist. `invSyncFromGist()` runs on init and overwrites local with remote. The list shown to users is always `invLoadMerged()` = `INV_HARDCODED` (built-in baseline) merged with localStorage by normalized name; `INV_OBBLIGATORIE` is a set that pins certain substances to the top of search results.

### Inventory specifics

- **QR / barcode scan** (`invParseQR`): Farmalabor QR codes scanned via keyboard wedge often arrive with `ç` instead of `:` and `-` instead of `/` due to Italian keyboard layout — the parser un-mangles that. Expected pattern: `http://www.farmalabor.it/certificati/<LOTTO>.pdf`. The lotto is extracted and the SDS URL is auto-filled.
- **Price per unit** is computed from `prezzoBolla / qty` (`invCalcolaPrezzo` for add, `invCalcolaPrezzoMod` for edit). Store/display unit comes from `inv-unit`.
- **H-codes**: stored per inventory entry as a free-text string of GHS codes (e.g. "H302, H318"). `hasHazard()` looks for health hazards.

### AI (Formulario)

Calls Groq's OpenAI-compatible endpoint (`api.groq.com/openai/v1/chat/completions`, model `llama-3.1-8b-instant`) directly from the browser with the user's key. The system prompt (`aiGetSystemPrompt`) restricts the assistant to galenica topics and injects the current inventory. Responses are expected to follow a strict `FORMULA: / PROCEDURA: / NOTE: / DA ORDINARE:` format that `aiParseFormula` regex-parses. If you change the prompt format, update the parser too. Missing substances detected in `DA ORDINARE:` are auto-added to the orders list via `ordinaAggiungi()`.

### Labels (Etichette)

Renders two Dymo labels (32×57 mm, format S0722540) and prints via the local **DYMO Connect** software (`stampaDymo()`). This requires DYMO Connect installed on the user's PC and will not work in a generic browser environment.

## Conventions and gotchas

- **`APP_VERSION`** is a manual integer in `index.html` (currently 137, near line 3720 — grep `const APP_VERSION`). Bump it when you ship a user-visible change; the colored header badge is keyed off it (`VER_COLORS` cycles every 8). Treat this as the user's release marker. Confirm in the browser that the badge updated.
- **Italian decimals**: `fmt()` outputs `,` as decimal separator. `parseFloat` accepts only `.`. Inputs that round-trip through `fmt()` need conversion on read. Don't introduce `toLocaleString` without checking.
- **Substance name matching** is fuzzy via `invNominalizza()` (lowercase + trim). Allegato A keys are lowercase. Normalize on both sides when adding lookups. `invGetPrezzo()` is the canonical lookup — it returns `{prezzo, fonte}` where `fonte` is `'allegatoA' | 'inv' | null`; respect the precedence (Allegato A wins).
- **Densities** are a small hardcoded `DENSITA` map used to convert g↔ml and to detect liquids; etanolo is 0.807.
- **`showPage` is monkey-patched** near the bottom of `<script>` to also trigger `archivioRender` when entering the archive — if you wrap it again, preserve the chain.
- **DOM-rebuild avoidance**: `liberaRenderRighe()` skips full innerHTML replacement if a child input has focus (to avoid stealing focus mid-type). Follow this pattern if you add similar dynamic rows.
- **Farmalabor as upstream supplier**: hardcoded into the order email (`ordini@farmalabor.it`), the QR parser, and the SDS URL pattern. If the user changes supplier, those three places all need updating.

## Pharmacy identity (hardcoded)

`Farmacia della Stazione`, `Via Fiume 75 — 19122 La Spezia`, `Tel. 0187-706147`, `P.I. 01317570115`, `Cod. QU Farma 6706`. This appears in the Scheda header, label defaults, and order email. If the user asks to change branding, search for these strings rather than assuming a single config location.

## Testing rules
- Never modify existing tests to make them pass (fix the implementation)
- Never update snapshots without explicit instruction
- Use transactions for database tests (roll back after each test)
- Mark flaky tests with @pytest.mark.flaky
- Write the failing test before fixing any reported bug
- Run the full suite before declaring work complete
