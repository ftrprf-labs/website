# Security proposal: the `xlsx` (SheetJS) high-severity finding

Status: PROPOSAL for a product/security decision. No code or dependency change is made here. The
finding stays explicitly registered until a decision is taken. Do not silently change the dependency
distribution source or production behaviour.

## The finding

- `npm audit` reports **1 high** in `xlsx@0.18.5`:
  - Prototype Pollution, **CVE-2023-30533 / GHSA-4r6h-8v6p-xvw6**, CVSS 7.8.
  - Regular-Expression Denial of Service (ReDoS), GHSA-5pgg-2g8v-p4x9.
- Both are triggered when **reading** a specially crafted spreadsheet. Export-only workflows are
  unaffected; ours reads uploaded files, so it is in the affected class.
- The `xlsx` package on the npm registry is **unmaintained** and frozen at 0.18.5. The fix exists
  from **0.19.3+** (current 0.20.x) but is distributed **only via `https://cdn.sheetjs.com/`**, not
  npm. So `npm audit fix` cannot resolve it and reports "No fix available."

## Actual exposure in this repo (why it is not urgent, but real)

- The only use is `server/import.mjs` `parseXlsx()` → `XLSX.read(buffer)` + `sheet_to_json`, reached
  from `buildPreview()` when an **authenticated admin** uploads an `.xlsx`/`.xls` for tester import.
- It is an **admin-only** path, not public. It is a dynamic optional import (`await import('xlsx')`)
  that degrades gracefully to CSV when absent.
- Realistic threat: a malicious or crafted spreadsheet reaching an admin (e.g. a supplier list),
  uploaded for import. Prototype pollution could corrupt runtime object state; ReDoS could stall the
  single server instance. Low likelihood (admin gate), non-trivial impact.

## Options (ranked, with trade-offs)

### Option A — Pin SheetJS 0.20.x from the official CDN (recommended primary)
`npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (pin an exact version + integrity).
- Pros: drop-in (same API, no code change beyond package.json), fixes both advisories.
- Cons: changes the install **source** from the npm registry to the SheetJS CDN tarball (the thing to
  decide deliberately, not silently). The CDN URL must be reachable in every build/CI environment,
  and supply-chain trust shifts to that URL + integrity hash. Vendoring the tarball in-repo is an
  alternative that removes the network dependency at the cost of committing a binary.

### Option B — Drop XLSX import, accept CSV only (recommended if Excel import is low-value)
Remove the `xlsx` dependency; `parseXlsx()` already fails with a clear "export as CSV" message.
- Pros: **eliminates the vulnerability and the dependency entirely**; smallest attack surface.
- Cons: admins must convert Excel → CSV before importing (minor friction; the app already instructs
  this). A product decision about whether native Excel import is worth keeping.

### Option C — Migrate to `exceljs` (maintained, on npm)
- Pros: stays on the npm registry, actively maintained, no CDN dependency.
- Cons: different (async/streaming) API → rewrite `parseXlsx()` + tests; larger dependency. Its own
  parsing hardening should be reviewed.

### Defense-in-depth (compose with A or C, cheap)
- Guard the parse: `Object.freeze(Object.prototype)` around the read (blocks the prototype-pollution
  vector), and/or run the parse with a wall-clock timeout / in a worker (bounds the ReDoS).
- Reject oversized/mistyped uploads before parsing (size + magic-byte check).

## Recommendation

Because exposure is admin-only and low, this is not an emergency, but it should not linger. Preferred
path: **Option A** (pin SheetJS 0.20.x from the CDN, exact version + integrity) **plus** the
defense-in-depth guards, IF the build/CI can fetch (or vendor) the CDN tarball. If native Excel
import turns out to be rarely used, **Option B** is the cleanest: delete the dependency and the risk
with it. Either way, keep the finding registered in `maculis.project.json` (`security.knownFindings`)
until the chosen option ships with a test.

## References

- [GHSA-4r6h-8v6p-xvw6 / CVE-2023-30533 (advisory)](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)
- [OSV entry](https://osv.dev/vulnerability/GHSA-4r6h-8v6p-xvw6)
- SheetJS distribution + fixed versions: `https://cdn.sheetjs.com/`
