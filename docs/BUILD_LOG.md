# Build log — Maculis Testerbeheer

Compacte, chronologische bouwlog van de Testerbeheer-portal (`ftrprf-labs/website`).
Geen persoonlijke of gevoelige data. Uitsluitend architectuur- en testbeslissingen.

---

## 2026-08-14 — Pass the Lens → consent → Testerbeheer (intake-keten)

**Feature.** De ontbrekende ruggengraat tussen de Maculis-journey ("Pass the Lens")
en Testerbeheer: consent uit de journey wordt vastgelegd met provenance en er is een
beveiligd automatisch intake-endpoint.

**Architectuurbeslissingen (na read-only inventarisatie van `website`,
`maculis-first-five` en `ftrlabs-docs`):**

- **Consent-bron = bestaande Maculis inner-circle opt-in.** De journey heeft al een
  expliciete, niet-vooraangevinkte consent-stap (`inner_circle_opt_in` /
  `inner_circle_declined`, knoppen "Houd me op de hoogte" / "Nog niet"). Deze wordt
  hergebruikt; er is geen nieuwe consent-tekst of -UX gebouwd.
- **Twee kanalen (gebruikerskeuze).**
  1. *Pull* — de bestaande Option-B session-export-pull leidt consent af
     (`inner_circle_opt_in` → OPTED_IN, `inner_circle_declined` → OPTED_OUT, geen
     keuze → UNKNOWN) en past die idempotent toe met `consent_source=pass_the_lens`.
  2. *Push* — `POST /api/intake` als beveiligd ontvangstcontract voor een
     toekomstige Pass the Lens (nu nog geen live caller).
- **Drie dimensies strikt gescheiden.** Lifecycle, evaluatiestatus en consent
  overschrijven elkaar nooit. `COMPLETED ≠ OPTED_IN`: een afgeronde journey zonder
  expliciete keuze blijft UNKNOWN.
- **`consent_version = null`** tot een officiële consent-versie is vastgesteld (geen
  verzonnen versie).
- **Dedup via `person_key`** (genormaliseerde e-mail primair, mobiel als fallback,
  binnen campagne) — bewust níét het participant/session-token.
- **Intake-auth** apart van de admin-gate: header `x-intake-key` = `INTAKE_KEY`;
  ontbreekt de key → 503 (uitgeschakeld), verkeerd → 403. Nooit een publieke intake.
- **Geen lifecycle-reset** bij her-intake van een bestaande tester; consent wordt
  alleen bij een expliciete nieuwe keuze bijgewerkt. Migratie additief/non-destructief.

**Datamodel toegevoegd:** `consent_source`, `consent_version`, `person_key`
(migratie-veilig, legacy → null / afgeleid). History-event `consent_recorded`
(eerste consent) naast `consent_changed`.

**Testresultaten (fictieve data):**
- Unit: 16/16.
- E2E intake (scenario A–I + pull-consent + auth + disabled): 38/38.
- Browser (desktop + 375px): 18/18, 0 console-errors, geen horizontale scroll.
- Regressie: Step 3-integratie, Evaluaties-UX 38/38, WhatsApp-bevestiging 30/30.
- Privacy/log-audit: logs alleen `METHOD PATH -> status`; geen keys/tokens/PII;
  history bevat geen bodies/tokens/antwoorden.

**Resterend (infrastructuur, buiten deze code):** een echte Pass the Lens-caller die
`POST /api/intake` aanroept bestaat nog niet; `www.maculis.nl` moet via DNS/host naar
de Maculis-server wijzen; officiële `consent_version` moet worden vastgesteld.

**Commit:** zie git-historie op branch `claude/invitation-manager-mvp-d5r5h8`.

---

## Eerder (samengevat)

- **V1 basis:** import (CSV/XLSX), opaque tokens, persoonlijke `MACULIS_HOST/?p=<token>`-link,
  WhatsApp/e-mail-uitnodiging, publish naar Maculis, systeemgestuurde lifecycle.
- **Evaluaties/Inzichten (Optie B):** Maculis is source of truth; read-only pull,
  join op participant-token; geen tweede vragenlijst.
- **Consent (opt-in/opt-out):** onafhankelijke dimensie met server-side OPTED_OUT-blokkade.
- **Uitnodigingshistorie + provenance:** append-only `history[]`, `source`.
- **Evaluaties-UX:** KPI-kaarten, testerreis-funnel, verdelingen, open inzichten.
- **Canonieke host:** één `MACULIS_HOST` (default `https://www.maculis.nl`).
- **WhatsApp:** handmatige "Uitnodiging verzonden"-bevestiging (openen ≠ verzenden).
