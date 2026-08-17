# Maculis Team & Agents Architecture Report

Parallelle architectuurvoorbereiding. Uitsluitend onderzoek en ontwerp.
Geen wijziging aan de live Cockpit, Slice 5, First Lens, Comm Layer of productie.

Status: DESIGN ONLY. Deze map (`docs/architecture/`) bevat documentatie, contracten,
een kandidaat-migratie (NIET in het live migratiepad) en een acceptatieplan. Er wordt
niets gedeployed, gemergd of geactiveerd.

Schrijfregel gerespecteerd: geen koppeltekens of gedachtestreepjes als stijlmiddel in de
lopende tekst. Koppeltekens komen alleen voor in code, identifiers, tabelnamen en enums.

---

## Leeswijzer

Dit rapport volgt exact de gevraagde 28 hoofdstukken (§50). De kern in één zin:

> Maculis heeft al een sterke gedeelde relationele werkelijkheid (de Communication Layer).
> Bouw geen agentplatform. Voeg een minimale agentfundering toe, maak aandacht persoonlijk,
> en bouw eerst één digitale collega: SCOUT, veilig begrensd tot lezen en voorstellen.

Bronverwijzingen wijzen naar echte bestanden in deze repository (`ftrprf-labs/website`).

---

## 1. EXECUTIVE CONCLUSION

Maculis hoeft geen agentplatform te bouwen om digitale collega's te laten bestaan. De
Communication Layer (`server/comm/`) is al gebouwd als een gedeelde relationele werkelijkheid
met precies de eigenschappen die agents nodig hebben: één permanente identiteit per mens
(`contact.identity_key`), tenant-isolatie op elke rij, een append-only audit trail
(`audit_event`), een unified activity timeline (`activity`), een epistemisch correcte
Relationship Memory (`relationship_memory` met `source` en `confidence`), en een AI-laag die
structureel nooit zelf verstuurt (`ai_draft.status='proposed'`).

Er ontbreken drie dingen, en meer niet, om de eerste digitale collega verantwoord te laten
werken:

1. **Een actor die geen mens is.** Vandaag is authenticatie binair (één gedeeld
   admin-wachtwoord, `server/auth.mjs`). Er is geen persoonsidentiteit en dus ook geen
   agentidentiteit. We hebben een minimale `actor` nodig (HUMAN of AGENT) zodat werk,
   eigenaarschap en audit een naam kunnen dragen.
2. **Werk als expliciet object.** Vandaag bestaan `follow_up` (menselijke reminder) en
   `ai_draft` (één AI-output), maar geen expliciet werkstuk met opdracht, eigenaar, status,
   mandaat en herkomst. Dat is `work_item`.
3. **Persoonlijke aandacht.** De attention-laag (`server/comm/attention.mjs`) is vandaag
   tenant-breed, niet per mens. Voor "Shared truth, personal attention" moet dezelfde
   afgeleide waarheid per actor gerouteerd worden op basis van eigenaarschap, toewijzing,
   relatie-eigenaarschap, expertise en rol.

De aanbevolen eerste digitale collega is **SCOUT**, niet Radar. Radar (relationele relevantie
en aandacht) is geen agent maar de deterministische orchestration-laag die Slice 5 nu al
bouwt. Een Radar Agent zou die logica dupliceren (§13). Scout is de enige echt nieuwe actor
met een eigen werk-lifecycle die Slice 5 niet raakt, en Scout kan veilig getest worden omdat
zijn mandaat beperkt is tot lezen en voorstellen: Scout schrijft nooit gedeelde relatiestaat,
verstuurt nooit, en promoveert nooit zelf een kandidaat naar relatie.

De minimale fundering is drie tabellen (`actor`, `work_item`, `agent_run`), plus hergebruik van
`notification` voor escalatie, `audit_event` en `activity` voor herkomst, `relationship_stage`
en `relationship_memory` voor de kandidaat-lifecycle. Geen generiek enterprise-platform.

---

## 2. WHAT EXISTS TODAY

Concreet aanwezige bouwstenen, met bestand. Alles hieronder kan hergebruikt worden.

**Gedeelde identiteit en relatie-spine**
- `organization` en `contact` (permanent, campagne-onafhankelijk). `contact.identity_key`
  (`email:<addr>` of `mobile:<e164>`) is uniek per tenant: één mens is één Contact.
  `server/comm/migrations/001_init.sql`, `002_omnichannel_tenant.sql`.
- `channel_identity`: één Contact, meerdere kanaalhandles. Basis voor identity resolution en
  deduplicatie. `server/comm/identity.mjs`, `repo.mjs`.
- `conversation`, `message`, `attachment`, threading op RFC-headers
  (`server/comm/threading.mjs`, niet op onderwerp-matching).

**Tenant en collaboratie**
- `tenant` en `tenant_id` op elke relatietabel; elke lees- en schrijfquery is tenant-scoped
  (`server/comm/tenant.mjs`, `db.mjs`). Vandaag één tenant (`maculis`), met de naden voor meer.
- `team`, `team_member`, `conversation.owner_user_id`, `conversation.team_id`,
  `conversation.assigned_to`. Eigenaarschap en toewijzing bestaan al in het schema.

**Waarheid, geheugen en herkomst**
- `relationship_memory` met `source` (`human`|`ai`) en `confidence` (`confirmed`|`proposed`),
  `source_ref` (jsonb) terug naar de oorsprong, `confirmed_by`/`confirmed_at`, `superseded_at`.
  Dit is het epistemische model in werkende vorm. `server/comm/memory.mjs`.
- `activity`: unified timeline (niet alles is een bericht). `server/comm/activity.mjs`.
- `audit_event`: append-only, `actor_user_id`, `action`, `entity_type/id`, `meta`.
  `server/comm/audit.mjs`.
- `webhook_event` (idempotentie) en `delivery_event` (leverstatus).

**AI als werklaag, nooit als afzender**
- Vendor-neutrale provider (`mock`|`anthropic`), `server/comm/ai/provider.mjs`.
  `COMM_AI_PROVIDER`, `COMM_AI_API_KEY`, `COMM_AI_MODEL` (default `claude-sonnet-5`).
- Bounded Relationship Context Engine `server/comm/ai/context.mjs`: tenant-scoped, purpose-
  limited, alleen `confidence='confirmed'` memory in de generatiecontext, `refs[]` als
  transparantiespoor. Signature en geciteerde historie worden gestript
  (`server/comm/signature.mjs` `stripForContext`).
- Copilot `server/comm/ai/copilot.mjs`: getriggerd door inbound, produceert een `ai_draft`
  met `status='proposed'` en een `relationship_memory` met `source='ai'`, `confidence='proposed'`.
  Structureel geen send-pad. Dit is feitelijk een naamloze proto-agent.

**Aandacht**
- `attention.mjs`: `deriveAttention()` is een pure functie van drie duurzame feiten
  (`last_inbound_at`, `last_read_at` watermerk, `last_dir`) plus `has_ai_proposed` en
  `has_delivery_problem`. `attentionOverview()` levert de tenant-brede queue en byEmail/byContact
  maps. Lezen is strikt een menselijk signaal (watermerk).

**Lead-lifecycle seed**
- `organization.relationship_stage` en `contact.relationship_stage`
  (`LEAD|PROSPECT|ACTIVE|CUSTOMER|PAST_CUSTOMER|PARTNER`), migratie 003. Nog niet actief
  gebruikt, wel aanwezig.
- Pass the Lens (`server/comm/pass-the-lens.mjs`, `server/store.mjs` `intake()`): gecontroleerde
  referral-intake met dedup op `person_key` en append-only `introductions[]` provenance. Een
  bewezen patroon voor "kandidaat binnenbrengen zonder CRM-vervuiling".

**Consent en privacy**
- `consent.mjs` `channelAllowed()`: fail-closed, server-side, per kanaal en doel. Privacy-
  conversations worden overal uitgesloten van automatische AI en van de cockpit.

**Wat NIET in deze repo zit (sibling workstream)**
- First Lens, Lens 1/2, Reveal Engine, Future Cockpit, GrowBrain, de relationele Radar/Slice 5.
  De BUILD_LOG legt die eigendomsgrens expliciet vast (`docs/BUILD_LOG.md`, 2026-08-15). De Comm
  Layer is bewust gebouwd als betrouwbare onderlaag die een Future Cockpit later consumeert.

---

## 3. SHARED TRUTH, PERSONAL ATTENTION

**Gedeeld (organisatiebreed, tenant-scoped):** de relatie-spine (`organization`, `contact`,
`channel_identity`, `conversation`, `message`), bevestigde `relationship_memory`, `activity`,
`follow_up`, en straks `work_item`. Dit is de gedeelde relationele werkelijkheid. Iedereen kijkt
naar dezelfde onderliggende feiten.

**Persoonlijk (per actor, afgeleid):** wat van al die gedeelde werkelijkheid nu jouw aandacht
verdient. Dit is vandaag nog niet persoonlijk. `attentionOverview(tenantId)` is tenant-breed.

**De technische kern van "personal attention":** attention blijft afgeleid en deterministisch
(nooit een opgeslagen dubbele waarheid, precies zoals `attention.mjs` het nu doet), maar krijgt
een tweede argument: de actor. De routing-functie beantwoordt per mens de vraag "is dit voor
jou?" uit expliciete, uitlegbare factoren:

- eigenaarschap (`conversation.owner_user_id`, relatie-eigenaar),
- toewijzing (`conversation.assigned_to`, `work_item.assigned_to`),
- teamlidmaatschap (`team_member`),
- rol (business development ziet nieuwe kandidaten, relationship owner ziet zijn relaties),
- relatie-eigenaarschap (wie kent deze persoon warm),
- expertise en zichtbaarheid/privacy.

Belangrijk: dit is geen black-box score. Elke Vandaag-regel draagt een `reasons[]` array
("Jij bent eigenaar van deze relatie", "Mark onderzoekt Acme, jij kent Pieter daar"). Zie §15.

Productmatig: de onderliggende waarheid is één. De betekenis per gebruiker verschilt. Vandaag is
persoonlijk, Relaties is gedeeld, en de nieuwe beweging Ontdekken (§8) is grotendeels rolgebonden.

---

## 4. HUMAN ROLE MAP

Niet als vaststaand organogram, wel genoeg om aandacht, toewijzing, eigenaarschap en escalatie te
kunnen ontwerpen. Vandaag kent de code één rol (admin, alles). Het `app_user.capabilities`-model
(`{communication, privacy, admin}`) bestaat in het schema maar wordt nog niet per persoon gebruikt.

Voorgestelde rollen als waarden op `actor.role` (config, geen hard organogram):

| Rol | Verantwoordelijkheid | Ziet primair op Vandaag | Escalatiedoel voor |
|---|---|---|---|
| `owner` / `directie` | eindverantwoordelijk, strategische relaties | eigen relaties, hoog-impact escalaties | reputatie, strategische keuzes |
| `business_development` | nieuwe relaties ontdekken en kwalificeren | nieuwe kandidaten, warme ingangen | promotie kandidaat naar lead |
| `relationship_manager` | bestaande relaties onderhouden | eigen relaties die aandacht vragen | relatie-inschatting, stilte |
| `communications` | uitgaande communicatie, toon | concepten die goedkeuring vragen | externe verzending |
| `research` | verdiepend onderzoek op verzoek | onderzoeksverzoeken | onvoldoende bewijs, tegenstrijdige bronnen |
| `operations` | proces, data-kwaliteit, governance | duplicaten, datakwaliteit, retentie | identiteitsconflicten, export/verwijdering |

Minimale informatie per mens (voor routing en Beheer, §26): naam, rol(len), team(s), welke
relaties hij bezit, expertise-tags, zichtbaarheidsniveau (mag privacy zien), status
(actief/afwezig). Dit hoeft nu niet gebouwd te worden; het is de datavorm die `actor` en de
routing later nodig hebben.

De belangrijkste eis: meerdere mensen werken in dezelfde relationele werkelijkheid zonder allemaal
dezelfde Vandaag te krijgen.

---

## 5. DIGITAL COLLEAGUE MAP

Aanbevolen digitale collega's. Minder en scherper is beter (§16). Slechts één wordt nu bouwrijp
gemaakt.

### SCOUT (bouw eerst). Zie §22 en §23 voor de volledige specificatie

| Veld | Inhoud |
|---|---|
| Doel | Nieuwe organisaties en mensen vinden waarvoor een aantoonbare reden bestaat om ze nader te onderzoeken. Niet: zoveel mogelijk leads. Niet: cold outreach. Niet: bulk scraping. |
| Waarom aparte agent | Het is de enige echt nieuwe actor met een eigen werk-lifecycle (vinden, kwalificeren, escaleren) die Slice 5/Radar niet raakt. Zijn output zijn PROPOSALS, geen waarheid, wat het veilig maakt om als eerste de fundering te bewijzen. |
| Verantwoordelijkheden | kandidaat vinden, bron/evidence bewaren, relevantie uitleggen, controleren of persoon/org al bestaat, netwerkverbindingen zoeken, klaarzetten voor beoordeling, juiste mens inschakelen. |
| Inputs (v1) | gecontroleerde interne signalen: UNKNOWN inbound-conversations, Pass the Lens-kandidaten, nieuwe organisaties uit inbound. Externe webdiscovery is een latere, expliciet gemandateerde capability. |
| Capabilities | identity resolution (bestaand, `repo.resolveContactTx`), network lookup (bestaand, `relationship.mjs`), evidence store (nieuw, hergebruikt `relationship_memory` patroon), later web-research (capability, §14). |
| Access | lezen: `organization`, `contact`, `channel_identity`, `activity` (tenant-scoped). Schrijven: alleen kandidaat-objecten (`work_item` + proposed memory), nooit bevestigde relatiestaat. |
| Mandate | MAG: zoeken, onderzoeken (intern), kandidaat voorstellen, escaleren. MAG NIET: externe mail sturen, kandidaat automatisch relatie maken, consent zetten, privacy-conversations lezen. |
| Verboden acties | promoveren, verzenden, mergen van identiteiten, externe scraping. |
| Output | een `work_item` van type `qualify_candidate` met `output` = kandidaatkaart (evidence refs, relevantiereden, mogelijke netwerkingang, epistemische status per claim). |
| Handoffs | kan Research vragen (verdieping) en levert kandidaat aan Radar/personal attention voor de juiste mens. Zie §13. |
| Escalations | twee mogelijke identity-matches, lage zekerheid, privacygevoelig, mogelijk reputatierisico. Naar `business_development` of relatie-eigenaar. Zie §14. |
| Human owner | `business_development` (verantwoordelijk voor Scout-kwaliteit). |
| Success metrics | percentage kandidaten dat mens relevant vindt, duplicate rejection rate, evidence quality, promoted-to-lead ratio, false-positive rate. Zie §27-metrics in dit hoofdstuk (§/27 van het rapport). |
| Bouwprioriteit | EERST. |

### RESEARCH (later, begint als capability)

Doel: op verzoek van mens of agent verdiepend onderzoek. Output: evidence + observations +
expliciete onzekerheden + eventueel hypotheses, nooit een ongefundeerde samenvatting als feit.
Begint als een **capability** (`ai/service.mjs` uitbreiding met een research-capability achter een
mandaat en cost guard). Wordt pas een aparte **agent** wanneer research jobs een eigen queue,
budget en asynchrone lifecycle nodig hebben (Voorbeeldflow 4). Zie §6 en §14.

### PREPARATION (later, begint als capability)

Doel: werk voorbereiden zodat een mens niet vanaf nul begint (briefing, gesprekspunten,
introductieroute, concept-antwoord). Mag voorbereiden, nooit zonder mandaat extern uitvoeren. De
bestaande copilot en `draftReply`/`reviseDraft` zijn hier al 80% van. Begint als capability;
wordt alleen agent als het zelfstandig getriggerd werk moet oppakken los van een inbound-bericht.

### RADAR: GEEN aparte agent (zie §6 en §17)

Radar = de deterministische relevantie- en attention-orchestration (Slice 5 + `attention.mjs`).
Dit is een engine/service, geen digitale collega. Een Radar Agent zou dezelfde logica dupliceren.

---

## 6. AGENTS WE SHOULD NOT BUILD

Expliciet: deze blijven capability, service of engine. Reden per stuk.

- **Radar Agent.** Relationele relevantie en aandacht zijn deterministisch en moeten dat blijven
  (uitlegbaar, testbaar, geen black box). Slice 5 bouwt dit als engine. Een agent er bovenop die
  "signalen interpreteert" is óf Preparation óf niets. Bouw de engine, niet de agent. (§13, §17)
- **First Lens Agent.** First Lens is een observatie-engine (SOURCE → OBSERVATION → EVIDENCE) in
  de sibling workstream. Het is een capability die meerdere agents aanroepen, geen collega. (§12, §16)
- **Reply/Draft Agent.** De copilot produceert al concepten. Dat is een capability van de
  Communication Layer, niet een aparte collega. Een tweede "schrijf-agent" zou verwarrend
  eigenaarschap creëren over dezelfde `comm_draft`.
- **Memory Agent.** `relationship_memory` is een service met een bewezen proposed/confirmed
  lifecycle. Extractie is een capability (`extractMemory`). Geen agent nodig.
- **Attention/Notification Agent.** Aandacht is afgeleid, niet geproduceerd. Een agent die
  aandacht "bepaalt" zou de deterministische afleiding vervangen door iets ondoorzichtigs.

Regel: geen agent maken omdat een zelfstandig naamwoord een agent kan worden (§16).

---

## 7. LEAD VS RELATIONSHIP MODEL

De harde grens: een gevonden persoon of organisatie is geen relatie.

**Lifecycle (semantisch, hergebruikt `relationship_stage` waar mogelijk):**

```
SIGNAL      een waargenomen aanleiding (Scout vond iets, Pass the Lens, inbound)
  -> CANDIDATE   een voorgestelde persoon/org met evidence, nog niet beoordeeld
  -> LEAD        een mens vond de kandidaat relevant genoeg om te onderzoeken/benaderen
  -> CONTACT     er is daadwerkelijk contact geweest
  -> RELATIONSHIP een echte relationele werkelijkheid (ACTIVE/QUIET/...)
```

**Hoe dit CRM-vervuiling voorkomt:**

1. **Een kandidaat is een PROPOSAL, geen relatie.** Scout schrijft geen `relationship_stage`
   op de gedeelde spine. Een kandidaat leeft als `work_item` (type `qualify_candidate`) plus
   evidence als `relationship_memory` met `source='scout'`, `confidence='proposed'`. Precies het
   bewezen proposed/confirmed patroon (`memory.mjs`).
2. **Promotie is een menselijke, geauditeerde transitie.** Pas bij expliciete menselijke
   bevestiging schuift een kandidaat naar `LEAD` op `contact.relationship_stage`, met audit
   (`recordAudit('candidate_promoted', ...)`). Dit spiegelt `confirmMemory()`.
3. **Kandidaten zijn niet benaderbaar.** `mayContact`/`channelAllowed` blijft fail-closed: een
   kandidaat zonder consent kan nooit automatisch outbound krijgen. Duizenden namen zonder
   consent zijn dus onschadelijk: ze kunnen niets triggeren.
4. **Dedup op identiteit.** `contact.identity_key` en `channel_identity` voorkomen dubbele
   personen. Scout controleert bestaan vóór voorstel (Voorbeeldflow 1: "Acme bestaat al").
5. **Kandidaten komen niet in de gedeelde Relaties-lijst.** Ze verschijnen in Ontdekken (§8) en
   alleen bij de juiste rol, niet als relatie in ieders Vandaag.

Neem de exacte woorden niet als verplicht datamodel: technisch is een kandidaat een `work_item` +
proposed evidence, en `relationship_stage` draagt de bevestigde fase.

---

## 8. DISCOVERY MODEL

Ontdekken als derde hoofdbeweging (productconcept, niet noodzakelijk een nav-item). Betekent:
"waar zouden nieuwe betekenisvolle relaties kunnen ontstaan?"

**De gecontroleerde pijplijn (Scout + mens):**

```
vinden -> onderzoeken -> kwalificeren -> verbinden met bestaande werkelijkheid
       -> menselijke beoordeling -> eventueel promoveren naar lead/relatie
```

**v1 bronnen (geen scraping):** de signalen die er toch al zijn.
- UNKNOWN inbound-conversations (`channel-inbound.mjs` maakt gecontroleerde UNKNOWN threads).
- Pass the Lens-kandidaten (`store.intake()`, `pass-the-lens.mjs`).
- Nieuwe organisaties die uit inbound e-mail ontstaan (`repo.upsertOrganizationTx`, alleen op
  signaal, nooit op bewijs).

**Latere bron (gemandateerd):** externe publieke webdiscovery als aparte capability met eigen
mandaat, cost guard en escalatie. Bewust niet in v1: het is de hoogste-risico, hoogste-cost,
privacygevoeligste stap.

**Passend binnen de Cockpit zonder klassieke lead-funnel:** Ontdekken toont kandidaatkaarten met
"waarom nu" en evidence, niet een pipeline met stages en forecast. De kaart heeft twee menselijke
acties: promoveren (naar lead) of afwijzen (met reden, wat Scout traint). Geen scoring-theater.

---

## 9. ACTOR MODEL

Een unified actor met twee soorten: HUMAN en AGENT.

**Wat gedeeld moet zijn (dezelfde onderlaag):**
- identiteit (`actor.id`, `display_name`, `kind`, `role`),
- eigenaarschap en toewijzing (verwijzingen naar `actor.id` op `work_item`, later op
  `conversation.owner_user_id`),
- audit (`audit_event.actor_user_id` wordt generieker: actor, mens of agent),
- werk (`work_item.created_by`, `assigned_to` zijn actor-refs),
- activity (`activity.actor_user_id` wordt actor-ref).

**Wat expliciet verschillend moet blijven tussen mens en agent:**
- authenticatie: mensen loggen in (`auth.mjs`), agents hebben geen wachtwoord maar een
  service-identiteit en een mandaat.
- mandaat: alleen agents hebben een expliciet, technisch afdwingbaar mandaat (§21). Mensen worden
  begrensd door rol/capabilities.
- capabilities/tools: agents hebben een expliciete capability-lijst; mensen gebruiken de UI.
- cost/budget: agents hebben een budget en resource governance (§20); mensen niet.
- human owner: elke agent heeft een verantwoordelijke mens; mensen zijn zelf verantwoordelijk.

**Ontwerpkeuze:** een lichte `actor`-tabel, geen zware abstractie. Vandaag is er nog geen echte
per-persoon auth (auth is binair), dus we forceren mensen nu niet in `actor`. In v1 bevat `actor`
de agents plus een enkele systeem/admin-actor. Wanneer echte per-user auth landt, worden mensen
als `actor.kind='HUMAN'` toegevoegd zonder datamigratie van de agents. Dit houdt de abstractie
gerechtvaardigd door de eerste echte agent (§47), niet door theorie.

---

## 10. WORK MODEL

Eén minimaal work-model dat mensen en agents delen. Geen vijf taakmodellen (§18).

**`work_item` (nieuw):**

```
id, tenant_id,
type,               qualify_candidate | research | prepare | escalation | ...
objective,          waarom dit werk bestaat (mensleesbaar)
created_by,         actor-ref (mens of agent)
assigned_to,        actor-ref (nullable = nog niet toegewezen)
assigned_role,      rol-hint voor routing als er nog geen persoon is
relationship_id / organization_id / contact_id / conversation_id   (nullable refs)
source_signal_refs, jsonb: waar dit werk vandaan komt (activity/message/candidate)
status,             proposed | assigned | in_progress | awaiting_human | done | superseded | cancelled
priority,           deterministische relevantie-hint (geen verzonnen AI-score)
mandate_required,   welk mandaat nodig is om af te maken
approval_required,  boolean (menselijke goedkeuring voor completion)
input,              jsonb (provenance van wat gebruikt is)
output,             jsonb (resultaat: kandidaatkaart, briefing, ...)
dedupe_key,         idempotentie (§30)
created_at, due_at, completed_at
```

**Hoe dit zich verhoudt tot bestaande concepten (geen duplicatie):**
- `follow_up` blijft de lichte MENSELIJKE reminder ("bel Kim volgende week"). Een `work_item` is
  het bredere werkstuk met herkomst, mandaat en mogelijk een agent-eigenaar. Regel: mens maakt
  een follow_up; systeem/agent maakt een work_item. Een work_item kan een follow_up produceren.
- `attention` blijft AFGELEID. Een `work_item` met `status in (proposed, assigned, awaiting_human)`
  is een aandachtsbron naast conversations. De attention-router (§15) mengt beide.
- `ai_draft`/`comm_draft` blijven de concrete OUTPUT van voorbereidend werk, niet een apart
  taaksysteem. Een prepare-work_item verwijst naar de `comm_draft` die het produceerde.
- `notification` blijft het per-persoon signaal; escalatie schrijft hier (§14).

**Lifecycle:**
```
ontstaan   trigger (§29) maakt een work_item (proposed) met source_signal_refs
assignment routing zet assigned_to of assigned_role
agent      agent_run pakt het op (assigned -> in_progress), roept capabilities aan
output     schrijft output; als approval_required -> awaiting_human, anders done
handoff    reassign naar andere actor/rol (§13), audit + nieuwe agent_run
human      mens bevestigt/afwijst -> done/superseded, audit
```

Provenance blijft behouden omdat `input`, `source_signal_refs`, `agent_run` en `audit_event`
samen de volledige keten dragen (§19, §23).

---

## 11. ROLE, ACCESS & MANDATE

Drie lagen, bewust gescheiden.

- **Access (mag ik het zien?):** tenant-isolatie (bestaat) plus per-actor capabilities. Vandaag
  is `capabilities()` een stub die alles true teruggeeft (`routes.mjs`). We hebben de bestaande
  gates (privacy 403 + audit) al op de juiste plek; ze worden echt zodra actor-capabilities
  landen.
- **Capability (kan ik het technisch?):** welke tools/functies een agent mag aanroepen (identity
  lookup, network lookup, web research, draft). Een lijst per agent-type.
- **Mandate (mag ik het organisatorisch?):** het onderscheid dat de opdracht centraal stelt (§21).
  Kunnen is niet mogen. Scout kan technisch een mail opstellen, maar mag niet verzenden.

**Mandaat technisch afdwingbaar:** een mandaat is een policy (config), geen tabel in v1. Vorm:

```
MANDATE.scout = {
  read:    ['organization','contact','channel_identity','activity'],  // tenant-scoped
  write:   ['work_item','proposed_memory'],
  forbid:  ['send','promote','set_consent','read_privacy','merge_identity','external_web'],
  approval_required: ['promote'],           // altijd mens
  escalate_when: ['identity_ambiguous','low_confidence','privacy_sensitive','reputation_risk'],
}
```

Elke mandaat-gated actie loopt door één guard (`assertMandate(actor, action, ctx)`) die bij
overtreding weigert en een `audit_event('mandate_denied')` schrijft. De guard zit in de
server-laag, nooit in de UI (dezelfde filosofie als de consent-gate: "hiding a button is never
the control", `consent.mjs`).

---

## 12. PROVENANCE & EPISTEMIC MODEL

Een agent produceert geen waarheid omdat een model iets zegt (§5). Maculis heeft dit onderscheid
al gedeeltelijk: `relationship_memory.source` en `.confidence`, en `ai_draft.status='proposed'`.

**De epistemische ladder (behouden door de hele keten):**

```
FACT               bevestigd door een mens of een betrouwbare bron
OBSERVATION        waargenomen (Scout: "Eva staat vermeld als commercieel directeur")
INFERENCE          afgeleid ("haar rol lijkt relevant voor onderwerp X")
HYPOTHESIS         onzeker vermoeden
PROPOSAL           voorstel voor menselijke beoordeling ("onderzoek Eva als ingang")
PREPARED_ACTION    klaargezet, niet uitgevoerd (concept, introductieroute)
HUMAN_CONFIRMATION mens besluit ("Mark neemt Eva op als lead")
EXECUTED_ACTION    daadwerkelijk uitgevoerd (verstuurd, gepromoveerd)
```

**Hoe dit technisch bewaard blijft:**
- Elke agent-claim draagt een `epistemic_status` uit die ladder plus `evidence_refs[]` (verwijzing
  naar `activity`/`message`/bron). Dit zit in `work_item.output` en, waar het geheugen wordt, in
  `relationship_memory.source_ref`.
- Doorgeven verandert de status niet stilzwijgend. Een OBSERVATION die Scout aan Research doorgeeft
  blijft OBSERVATION in de handoff-envelope (§13). Alleen een menselijke bevestiging tilt iets naar
  FACT/HUMAN_CONFIRMATION, precies zoals `confirmMemory()` proposed naar confirmed tilt.
- AI-afgeleide memory blijft uit de generatiecontext tot bevestiging (`context.mjs` selecteert
  alleen `confidence='confirmed'`). Dit voorkomt dat een vermoeden zich als feit vermenigvuldigt.

Voorbeeld uit de opdracht, concreet: Scout schrijft OBSERVATION "Eva Jansen, commercieel
directeur" met evidence-ref, INFERENCE "rol lijkt relevant", PROPOSAL "onderzoek Eva". Geen van
drieën is een feit. Pas Mark's bevestiging maakt er een lead van, geauditeerd.

---

## 13. AGENT-TO-AGENT HANDOFF

Digitale collega's mogen elkaar werk geven, maar dit mag geen oncontroleerbare swarm worden.

**Mechanisme:** een handoff is een reassignment van een `work_item` plus een expliciete
**handoff-envelope**, niet een vrije agent-naar-agent chat.

```
handoff = {
  work_item_id,
  from_actor, to_actor (of to_role),
  reason,                     waarom overgedragen
  epistemic_payload: [ {claim, epistemic_status, evidence_refs} ],  // §12
  requested_capability,       wat de ontvanger moet doen
  depth,                      hop-teller (zie hieronder)
}
```

**Begrenzingen (tegen swarm):**
- **Depth-limiet:** elke handoff verhoogt `depth`; boven een drempel (bijv. 3) stopt de keten en
  escaleert naar een mens. Geen oneindige agent-naar-agent recursie.
- **Auditeerbaar:** elke handoff schrijft `audit_event('work_handoff', meta:{from,to,reason})` en
  een `agent_run` per uitvoering. De hele keten is reconstrueerbaar (§19).
- **Idempotent:** `work_item.dedupe_key` en `agent_run` met een run-key voorkomen dubbel werk bij
  retries (§30).
- **Alleen expliciete capabilities:** een agent kan alleen een handoff vragen voor een capability
  die de ontvanger daadwerkelijk heeft; anders escalatie.
- **Menselijke terugval:** als een ontvanger niet zeker is of geen mandaat heeft, escaleert hij
  in plaats van te gokken.

Voorbeeldflow 1 (§32) mapt hierop: Scout ontdekt Acme, vraagt Research om verdieping (handoff),
Research levert evidence terug op het work_item, de attention-router (Radar/personal attention)
bepaalt de juiste mens, Preparation zet een introductieroute klaar. Elke stap een work_item-status
en een agent_run.

---

## 14. ESCALATION MODEL

Iedere agent weet wanneer hij moet stoppen en een mens nodig heeft. Escalatie is een expliciet
concept, geen impliciete fout.

**Triggers (Scout-relevant vetgedrukt):**
- **onvoldoende bewijs, lage zekerheid**, tegenstrijdige bronnen,
- **twee mogelijke identity-matches** (Voorbeeldflow 3),
- **privacygevoelige informatie**, potentieel reputatierisico,
- externe actie vereist, menselijke relatie-inschatting nodig,
- **nieuwe lead lijkt relevant maar promotie vereist een mens**,
- agent mist toegang, kostenlimiet bereikt.

**Mechanisme (hergebruikt bestaande primitieven):** een escalatie is een `work_item` van type
`escalation` met `assigned_role` gezet, plus een `notification`-rij naar de juiste mens (de
`notification`-tabel bestaat al, migratie 002). Escalatie gaat naar de juiste rol of relatie-
eigenaar, niet standaard naar iedereen.

- identity-ambiguïteit en promotie -> `business_development` of relatie-eigenaar,
- privacy/reputatie -> `owner`/`directie`,
- kostenlimiet/toegang -> `operations`.

De escalatie draagt de epistemische payload (§12) zodat de mens zonder terugscrollen kan
beoordelen. Voorbeeldflow 3: Scout vindt twee Eva Jansens, mag niet gokken, maakt een
`escalation` work_item met beide kandidaten en evidence; na menselijke keuze gaat het werk verder.

---

## 15. PERSONAL ATTENTION ROUTING

Hoe dezelfde shared truth voor verschillende collega's tot andere Vandaag-items leidt, zonder
black box.

**Ontwerp:** geen globale attention-queue voor iedereen, en geen ondoorzichtige score. De router
is een deterministische functie `routeAttention(actor, signal) -> {relevant, reasons[], priority}`
over expliciete factoren:

```
signalbronnen:  conversations (attention.mjs), open work_items, escalaties, follow-ups
per actor filter/rangschik op:
  - ownership          jij bent eigenaar van deze relatie/conversation
  - assignment         dit werk is aan jou (of jouw rol) toegewezen
  - relationship_owner jij kent deze persoon warm (relatie-eigenaarschap)
  - team_membership    dit hoort bij jouw team
  - role               jouw rol ziet dit type werk (BD ziet kandidaten)
  - expertise          jouw expertise past bij het onderwerp
  - visibility/privacy jij mag dit zien
elke match levert een reason-string; priority blijft deterministisch (urgentie -> oudste wachtend),
nooit een verzonnen AI-ranking (zoals attention.mjs nu al doet).
```

**Waarom uitlegbaar:** elke Vandaag-regel toont zijn reasons. "Mark onderzoekt Acme. Jij kent
Pieter daar" is letterlijk twee reasons (assignment van een ander + relationship_owner van jou).
Dit is precies het voorbeeld uit §8 van de opdracht.

**Hetzelfde signaal, andere betekenis:** Scout ontdekt Acme.
- Voor `business_development`: "Nieuwe kandidaat om te onderzoeken" (role-match).
- Voor Lud: standaard niets. Maar als de router ziet dat Lud `relationship_owner` is van Pieter
  bij Acme, wordt het relevant: "Mark onderzoekt Acme. Jij kent Pieter daar. Wil je beoordelen of
  Pieter een logische ingang is?" (relationship_owner-match).

**Verhouding tot Slice 5:** Slice 5 bouwt de deterministische relevantie-/orchestration-laag. De
personal attention router IS die laag, uitgebreid met de actor-dimensie. Niet apart bouwen; samen
laten komen (§17).

---

## 16. FIRST LENS POSITION

First Lens is geen digitale collega maar een **capability/engine**: observeert organisaties en
relevante veranderingen. Het leeft in de sibling workstream (BUILD_LOG-eigendomsgrens), niet in
deze repo.

**Conceptuele keten (bewaard):**
```
SOURCE -> FIRST LENS OBSERVATION -> EVIDENCE -> RELATIONSHIP/ORGANIZATION CONTEXT -> POSSIBLE SIGNAL
```
en nadrukkelijk NIET automatisch `-> ATTENTION`. De attention/orchestration-laag (Radar/Slice 5 +
personal router) bepaalt betekenis en relevantie.

**Positie in het agentmodel:** First Lens is een capability die meerdere agents kunnen aanroepen
(Scout om een kandidaat te onderbouwen, Research om te verdiepen, Radar om een verandering te
zien). Niet herbouwen. In het contract wordt First Lens aangesproken via een capability-interface
die een `Observation` met evidence teruggeeft, met epistemische status OBSERVATION (§12), nooit een
kant-en-klare conclusie.

---

## 17. RELATIONSHIP RADAR POSITION (Slice 5)

Radar = het deterministische bewaken van bestaande relationele werkelijkheid: signalen, stilte,
commitments, follow-ups, memory, en welke relatie aandacht verdient. Slice 5 bouwt dit als
orchestration-engine.

**Positie:** Radar is de engine, geen agent (§6). De toekomstige personal attention router (§15)
is de actor-bewuste uitbreiding van dezelfde engine. Concreet:
- `attention.mjs` levert vandaag de deterministische conversation-attention.
- Slice 5 verdiept dit met relationele signalen (stilte, commitments, memory-combinaties).
- De personal router voegt de actor-dimensie toe.

**Anti-duplicatie:** een toekomstige Radar Agent implementeert deze logica NIET opnieuw. Agents
(Scout, Research, Preparation) LEVEREN signalen en werk aan de engine; de engine routeert. Deze
scheiding is de belangrijkste reden om Scout eerst te bouwen en Radar-als-engine door Slice 5 te
laten afmaken, en beide lijnen daarna samen te voegen.

---

## 18. SECURITY & PRIVACY

Minimale noodzakelijke grenzen, geen theoretische enterprise-eisen.

- **Tenant-isolatie:** bestaat en is de sterkste garantie. Elke agent-query MOET tenant-scoped
  blijven (dezelfde regel als de hele Comm Layer).
- **Per-actor capabilities:** de bestaande `capabilities()`-stub wordt echt. Agents krijgen nooit
  impliciet meer rechten omdat ze intelligent zijn (§4 van de opdracht). Superuser-agents zijn
  verboden.
- **Privacy-conversations uit agentbereik:** privacy blijft uitgesloten van automatische AI en van
  de cockpit (bestaand). Scout mag privacy-conversations niet lezen (mandaat `forbid: read_privacy`).
- **Consent fail-closed:** ongewijzigd. Kandidaten zijn niet benaderbaar (§7).
- **Scout-specifiek:** geen scraping, alleen evidence-gedragen voorstellen, dedup op identiteit,
  GDPR-grondslag vastgelegd bij eventuele externe bron (`communication_preference.legal_basis`
  bestaat als patroon). Externe webdiscovery is expliciet gemandateerd en apart.
- **Geen echte mails, geen externe acties** in de agentfundering. De opdracht en deze fase
  verbieden dat expliciet.

MUST/SHOULD/LATER staat in §37.

---

## 19. AUDITABILITY

Voor iedere relevante agenthandeling moet later reconstrueerbaar zijn: wie/welke agent, wat,
waarom, op basis waarvan, welk mandaat, welke output, wat gebeurde daarna (§23 van de opdracht).

**Hergebruik + minimale toevoeging:**
- `audit_event` (bestaand, append-only): elke mandaat-gated actie schrijft hier met de actor.
  Nieuwe action-strings: `agent_run_started`, `agent_run_finished`, `candidate_found`,
  `candidate_promoted`, `work_handoff`, `mandate_denied`, `escalation_created`.
- `activity` (bestaand): mensleesbare timeline-events per contact/org (`scout_candidate_found`).
- `agent_run` (nieuw): per uitvoering trigger, capability-calls (jsonb), input/output-refs,
  status, error, cost. Dit is het technische spoor.

**Reconstructievraag** ("wat heeft Scout gedaan met Acme?") wordt één query over `agent_run` +
`audit_event` + `activity` gefilterd op de organization/actor. De gebruiker hoeft niet alle
technische logs te zien, maar accountability blijft behouden. Agents worden geen onzichtbare
achtergrondmagie (§23 van de opdracht).

---

## 20. COST & RESOURCE GOVERNANCE

Conceptueel meegenomen; alleen zo veel als de eerste agent nodig heeft.

- **Budget per agent en per work_item:** `agent_run` draagt `tokens` en een afgeleide `cost`.
  Een work_item kan een `budget` in `input` dragen; overschrijding escaleert (§14).
- **Model selection:** `COMM_AI_MODEL` bestaat al; een agent kan per capability een goedkoper
  model kiezen (mock voor deterministische stappen, `claude-sonnet-5` voor generatie).
- **Retry/concurrency/rate limits:** retries met terminale toestand op `agent_run` (§30);
  concurrency begrensd (Scout draait één run per candidate-signal tegelijk via `dedupe_key`).
- **Human approval voor dure taken:** externe webdiscovery (duur, risicovol) vereist expliciete
  goedkeuring (`approval_required`), net als promotie.

Geen implementatie van een volledig billing-systeem. Wel: `agent_run.tokens`/`cost` en een
budget-veld, zodat governance vanaf dag één zichtbaar is.

---

## 21. RECOMMENDED BUILD ORDER

Concrete verticale slices. Klein genoeg om live te testen. Elke slice: gebruikerswaarde,
afhankelijkheden, risico, definition of done.

**F0. Minimale agentfundering (must-have before first agent).**
- Waarde: maakt een niet-menselijke actor met werk, mandaat en herkomst mogelijk.
- Tech: `actor`, `work_item`, `agent_run` (kandidaat-migratie, §23/§24). Mandaat-guard.
- Risico: laag (additief, feature-flagged, tenant-scoped). Niets live.
- DoD: migratie draait geïsoleerd; guard weigert + audit; geen impact op bestaande routes.

**S1. Scout Triage (eerste digitale collega, inbound-fed).**
- Waarde: UNKNOWN inbound en Pass the Lens-kandidaten worden gekwalificeerde kandidaatkaarten met
  "waarom" en "kennen we deze al".
- Tech: Scout runner + qualify-capability (deterministische mock-modus), work_item lifecycle,
  audit, provenance. Geen externe calls.
- Risico: laag (lezen + voorstellen, nooit schrijven van relatiestaat of verzenden).
- DoD: E2E (echte Postgres, fictieve data) zoals de comm-suite; preview-acceptatie (§23).

**S2. Scout evidence + network + escalatie.**
- Waarde: netwerkingang zoeken ("Lud kent Pieter"), identity-ambiguïteit escaleren.
- Tech: network lookup (hergebruik `relationship.mjs`), escalation work_item + notification.
- Risico: laag/midden (escalatie-routing correct naar rol).
- DoD: Voorbeeldflow 1 en 3 aantoonbaar in test.

**S3. Human promotion + personal attention routing.**
- Waarde: mens promoveert kandidaat naar lead; kandidaten en escalaties verschijnen bij de JUISTE
  mens op Vandaag.
- Tech: promote-transitie (geauditeerd) + `routeAttention(actor, signal)` met reasons.
- Risico: midden (raakt het attention-oppervlak; samenvoegen met Slice 5).
- DoD: dezelfde shared truth levert verschillende Vandaag per rol, met reasons.

**S4. Research capability.**
- Waarde: verdieping op verzoek van mens of Scout (handoff).
- Tech: research-capability + async job als nodig; evidence + onzekerheden.
- DoD: Voorbeeldflow 4.

**S5. Preparation capability.**
- Waarde: briefing/gesprekspunten/introductieroute klaarzetten (Voorbeeldflow 2 en 4).
- Tech: hergebruik copilot/draft; prepare-work_item verwijst naar `comm_draft`.

**S6. Team/Beheer + agent-to-agent handoff op schaal.**
- Waarde: de Beheer-placeholder wordt Team (mensen + agents + mandaten). Handoff-envelope.
- Tech: §26. Depth-limiet, idempotentie, audit.

---

## 22. FIRST DIGITAL COLLEAGUE

**Keuze: SCOUT.** Onderbouwing tegen de criteria van §45.

- **Huidige code:** Scout hergebruikt maximaal (identity resolution, channel_identity,
  relationship_stage, memory-patroon, activity, audit, Pass the Lens-dedup) en botst met niets.
- **Slice 5:** Radar is de deterministische engine die Slice 5 nu bouwt. Een Radar Agent zou die
  dupliceren (§13/§17). Scout is orthogonaal aan Slice 5 en kan er los van bestaan. De twee lijnen
  ontmoeten elkaar netjes via de shared truth (een Scout-kandidaat die later een bestaande relatie
  blijkt te raken, is precies Voorbeeldflow 1).
- **Hergebruik en risico:** Scout's mandaat is lezen + voorstellen. Blast radius nul: geen
  gedeelde relatiestaat, geen verzending, geen promotie. Dit is de veiligste grond om actor, work,
  mandaat, provenance, escalatie en human-approval te bewijzen.
- **Gebruikerswaarde:** Radar-waarde wordt al deterministisch geleverd door Slice 5. De marginale
  waarde van de eerste AGENT is het hoogst waar nog niets bestaat: Discovery. Scout levert direct
  "hier is een onderbouwde kandidaat en we kennen mogelijk al iemand daar".
- **Testbaarheid:** net als de copilot heeft Scout een deterministische offline-modus, dus volledig
  unit- en E2E-testbaar in de bestaande stijl (`node:test`, echte Postgres, fictieve data).
- **Uitbreidbaarheid:** Scout zet de handoff-, escalatie- en work-primitieven op die Research en
  Preparation later hergebruiken.

**Waarom niet Radar eerst:** duplicatie-risico met Slice 5, en afhankelijkheid van een nog niet
gelande engine. **Waarom niet Research/Preparation eerst:** die leveren pas waarde als er werk naar
hen toe stroomt; ze zijn in v1 beter als capability dan als autonome actor.

---

## 23. FIRST AGENT BUILD SPEC

Bouwrijpe specificatie voor Scout (S1, uitbreidbaar naar S2/S3). Concreet genoeg om een volgende
sessie te laten beginnen. De kandidaat-migratie en contracten staan naast dit rapport
(`docs/architecture/proposals/`, `docs/architecture/contracts/`).

### 23.1 Data model changes (kandidaat-migratie 006, NIET in het live migratiepad)

Zie `docs/architecture/proposals/006_agent_foundation.candidate.sql`. Drie tabellen, additief,
tenant-scoped, feature-flagged achter dezelfde `COMM_LAYER_ENABLED`-gate. Samengevat:

- `actor(id, tenant_id, kind[HUMAN|AGENT], slug, display_name, role, status, human_owner_actor_id,
  created_at)`. Seed één rij: Scout (`kind='AGENT'`, `slug='scout'`).
- `work_item(...)` exact zoals §10.
- `agent_run(id, tenant_id, work_item_id, actor_id, trigger, status, input_ref, output_ref,
  capability_calls jsonb, tokens, cost, error, dedupe_key, started_at, ended_at)`.

Kandidaat-evidence gebruikt de bestaande `relationship_memory` (`source='scout'`,
`confidence='proposed'`) en `activity` (`type='scout_candidate_found'`). Kandidaat-fase gebruikt de
bestaande `contact.relationship_stage`.

### 23.2 Services (nieuw, in een aparte map om de live Comm Layer niet te raken)

Voorgestelde plaatsing bij implementatie: `server/agents/` (nieuw), niet in `server/comm/`.
- `server/agents/registry.mjs`: agent-definities + mandaat-policy (§11). `assertMandate()`.
- `server/agents/work.mjs`: `createWorkItem`, `assignWorkItem`, `completeWorkItem`,
  `handoffWorkItem`, `listWorkItems` (alle tenant-scoped, geauditeerd).
- `server/agents/run.mjs`: `startRun`, `finishRun`, idempotentie op `dedupe_key`.
- `server/agents/scout/runner.mjs`: `runScout({tenantId, signal})`.
- `server/agents/scout/capabilities.mjs`: `qualifyCandidate`, `checkExistence`, `findNetworkPath`
  (S2), deterministische mock-modus + optioneel provider-gedragen redenering.

Alle nieuwe services volgen de bestaande idiomen: `db.mjs` `query`/`withTransaction`, tenant-scoped,
best-effort audit/activity die de primaire actie nooit breekt.

### 23.3 Endpoints (mirror van `handleComm`)

Nieuw `handleAgents(req, res, {pathname, method, isAuthed})`, gemount in `handleApi` naast
`handleComm`, achter dezelfde admin-gate en `commEnabled()`-gate. Route-oppervlak:

| Method | Path | Doel | Gate |
|---|---|---|---|
| GET | `/api/agents/status` | agent-registry + mandaat + mock/live status | admin |
| GET | `/api/agents/work` | work_items lijst (`?assigned`, `?role`, `?status`, `?type`) | admin |
| GET | `/api/agents/work/{uuid}` | één work_item + agent_runs + provenance | admin |
| POST | `/api/agents/work/{uuid}/promote` | kandidaat -> lead (menselijke bevestiging) | admin, geauditeerd |
| POST | `/api/agents/work/{uuid}/dismiss` | kandidaat afwijzen met reden (traint Scout) | admin, geauditeerd |
| POST | `/api/agents/scout/run` | Scout draaien op een gecontroleerd signaal (S1: simulatie/echte inbound-ref) | admin |
| GET | `/api/agents/escalations` | open escalaties voor de huidige rol | admin |

Geen publieke routes. Geen send. Geen externe calls in S1.

### 23.4 Agent runner (flow)

```
trigger (§29)  ->  createWorkItem(proposed, source_signal_refs, dedupe_key)
              ->  assertMandate(scout, 'read'/'write')
              ->  startRun(dedupe_key)   // idempotent: bestaande run -> no-op
              ->  qualifyCandidate(): checkExistence + relevance + evidence
                   - bestaat al?         -> observation + link naar bestaande contact/org
                   - identity ambigu?    -> escalation work_item + notification (S2), stop
              ->  write proposed_memory (source='scout', confidence='proposed', source_ref)
              ->  write activity('scout_candidate_found')
              ->  finishRun(output_ref, tokens, cost)
              ->  work_item.status = awaiting_human (approval_required voor promote)
              ->  routeAttention: verschijnt bij business_development / relatie-eigenaar (S3)
```

Sync in S1 (deterministisch, snel). Async pas nodig bij externe research (S4). Timeout, retry en
terminale toestand op `agent_run`. Bij elke fout: `agent_run.error` + audit, nooit een halve
schrijving van gedeelde staat (transacties via `withTransaction`).

### 23.5 Permissions/mandate

`MANDATE.scout` zoals §11. In S1 afgedwongen door `assertMandate` in de runner en in elke service.
Promote en dismiss zijn menselijke routes (admin), niet iets dat Scout zelf doet.

### 23.6 Work lifecycle

Zoals §10. In S1: `proposed -> in_progress -> awaiting_human -> done|superseded`. Geen handoff in
S1 (dat is S2/S4).

### 23.7 UI touchpoints (geen wijziging aan de live Cockpit in deze fase)

Ontworpen, niet gebouwd in deze sessie:
- Een Ontdekken-oppervlak (kan later een tab of sectie zijn) dat kandidaatkaarten toont uit
  `/api/agents/work?type=qualify_candidate`. Twee acties: Promoveren, Afwijzen.
- Kandidaatkaart toont: naam/org, "waarom nu", evidence-refs (klikbaar naar bron), "kennen we deze
  al", mogelijke netwerkingang, epistemische status per claim, en "Voorbereid door Scout" (§25 van
  de opdracht: accountability zichtbaar, persona later).
- Escalaties verschijnen bij de juiste rol met beide kandidaten en evidence (Voorbeeldflow 3).

### 23.8 Vandaag-integratie

Kandidaten en escalaties zijn work_items en voeden de attention-router (§15). Voor
`business_development`: "Nieuwe kandidaat bij Acme. Er bestaat al een warme ingang via Lud." Voor de
relatie-eigenaar alleen als zijn menselijke bijdrage nodig is. Dit is de S3-samenvoeging met Slice 5.

### 23.9 Audit & provenance

Elke stap schrijft `agent_run` + `audit_event` + waar zinvol `activity`. `work_item.input`,
`source_signal_refs` en `relationship_memory.source_ref` dragen de herkomst. Reconstructie zoals §19.

### 23.10 Tests (bestaande stijl: `node:test`, serieel, echte Postgres, fictieve data)

Zie `docs/architecture/proposals/scout.acceptance.md` voor het volledige plan. Kern:
- Pure unit: mandaat-guard weigert verboden acties; `qualifyCandidate` deterministisch; epistemische
  status correct gestempeld.
- DB-E2E: signal -> work_item (proposed) -> run -> proposed_memory + activity -> awaiting_human;
  bestaande org wordt herkend (geen duplicaat); identity-ambiguïteit -> escalation + notification;
  promote -> relationship_stage=LEAD + audit; dismiss -> superseded + reden.
- Tenant-isolatie en privacy-uitsluiting (Scout leest geen privacy).
- Idempotentie: dubbele trigger met dezelfde `dedupe_key` -> één work_item, één run.

### 23.11 Preview acceptance

- Feature-flagged en additief: met de agentfundering uit blijft alles ongewijzigd (zoals de Comm
  Layer nu netjes dormant is zonder `DATABASE_URL`).
- Volledige bestaande comm-suite blijft groen (regressie).
- Nieuwe agent-suite groen tegen een echte Postgres; skippt netjes zonder DB.
- Geen echte externe calls, geen verzending, geen productiegegevens geraakt.

---

## 24. MINIMAL FOUNDATION REQUIRED

De kleinst mogelijke fundering die Scout veilig laat bestaan, gerechtvaardigd door Scout (§47), niet
door theorie:

**Nieuw (3 tabellen):** `actor`, `work_item`, `agent_run`.
**Hergebruikt (niets nieuws nodig):** `notification` (escalatie), `audit_event` (audit),
`activity` (timeline), `relationship_memory` (evidence, proposed/confirmed), `contact.relationship_stage`
(kandidaat-fase), `tenant`/`tenant_id` (isolatie), `channel_identity`/`identity_key` (dedup).
**Config, geen tabel:** mandaat-policy (`MANDATE.scout`) en de guard.

Wat bewust NIET nu: een generiek permissions-systeem, een aparte `mandate`/`escalation`/`capability`
tabel, een agent-memory-store, een billing-engine. Die worden pas gerechtvaardigd door latere agents
(§16/§42). De actor-tabel bevat in v1 agents plus één systeem-actor; mensen komen erbij zodra echte
per-user auth landt, zonder migratie van de agents.

---

## 25. RISKS

Alleen echte product/architectuurrisico's.

1. **Samenvoeging met Slice 5.** De personal attention router (§15) en Slice 5 raken hetzelfde
   oppervlak. Risico op dubbele of botsende attention-logica. Mitigatie: Scout eerst bouwen
   orthogonaal aan Slice 5 (S1/S2 raken attention niet), en S3 pas na Slice 5 samenvoegen.
2. **Scout false positives en vertrouwen.** Slechte kandidaten ondermijnen vertrouwen sneller dan
   ze waarde leveren. Mitigatie: evidence verplicht, deterministische kwalificatie eerst, dismiss
   traint, success metrics bewaken (relevant-gevonden ratio, false-positive rate).
3. **Identity en dedup.** Verkeerde matches vervuilen de shared truth. Mitigatie: conservatieve
   matching (bestaand: alleen `linked` auto-linkt), ambiguïteit escaleert altijd, nooit gokken.
4. **Foundation over-build.** De verleiding om meteen een agentplatform te bouwen. Mitigatie: 3
   tabellen, mandaat als config, alles gerechtvaardigd door Scout.
5. **Privacy en externe bronnen.** Externe webdiscovery is de grootste privacy/reputatie-risico.
   Mitigatie: expliciet uit v1, apart gemandateerd, GDPR-grondslag vastgelegd, geen scraping.
6. **Attention-personalisatie zonder echte auth.** Vandaag is auth binair; personal routing vraagt
   per-persoon identiteit. Mitigatie: S1/S2 vragen dit niet; S3 landt samen met per-user auth of
   met een minimale actor-mapping.

---

## 26. DECISIONS FOR LUD

Alleen beslissingen waarvoor jouw productoordeel echt nodig is.

1. **Eerste agent = Scout, akkoord?** Het rapport beveelt Scout aan boven Radar (Radar = Slice 5
   engine, geen agent). Als jij Radar-waarde eerder wilt zien, is dat een productkeuze: dan is de
   volgorde S3 (personal attention op bestaande relaties) vóór Scout-discovery.
2. **Scout v1 zonder externe webdiscovery, akkoord?** v1 werkt op gecontroleerde interne signalen.
   Externe discovery is een latere, gemandateerde capability. Wil je externe bronnen eerder, dan
   moeten privacy/GDPR-grondslag en cost-guard eerst worden vastgelegd.
3. **Human roles.** De rollenlijst (§4) is een voorstel, geen organogram. Welke rollen bestaan in
   jouw praktijk nu echt (BD, relationship manager, comms)? Dat bepaalt de escalatie- en
   routing-doelen.
4. **Beheer wordt Team?** Akkoord dat de Beheer-placeholder later evolueert naar Team (mensen +
   agents + mandaten), of houd je Beheer en Team gescheiden?
5. **Persona van Scout.** Accountability eerst ("Voorbereid door Scout"), persona/naming later. Wil
   je een expliciete naam/persona of een neutraal "Maculis bereidde dit voor"?

---

## 27. WHAT YOU PREPARED

Bestanden in deze parallelle architectuurvoorbereiding (documentatie en contracten, geen live code):

- `docs/architecture/TEAM_AND_AGENTS_ARCHITECTURE.md` (dit rapport).
- `docs/architecture/proposals/006_agent_foundation.candidate.sql` (kandidaat-migratie, bewust
  BUITEN `server/comm/migrations/` zodat de boot-runner hem nooit toepast).
- `docs/architecture/contracts/scout-agent.contract.md` (interfaces: work_item, agent_run, mandaat-
  policy, handoff-envelope, epistemische claim, Scout runner en capabilities, route-oppervlak).
- `docs/architecture/proposals/scout.acceptance.md` (test- en preview-acceptatieplan, plus
  illustratief testskelet dat bewust NIET in `tests/` staat zodat `npm test` het niet draait).
- `docs/architecture/README.md` (oriëntatie: deze map is design-only, niets deployt).

Success metrics per digitale collega (samengevat, uit §27 van de opdracht):
- Scout: relevant-gevonden ratio, duplicate rejection rate, evidence quality, promoted-to-lead
  ratio, false-positive rate.
- Radar/attention (engine): relevant attention precision, stale attention, gemiste belangrijke
  signalen, hoeveelheid onnodige aandacht.
- Preparation: menselijke acceptatie, benodigde correctie, groundedness, tijdswinst.
- Research: evidence coverage, factuality, uncertainty calibration.

Commits: op branch `claude/maculis-team-agents-arch-cuybdp`, uitsluitend documentatie/contracten
die de actieve productcode niet beïnvloeden.

---

## 28. NEXT COMMAND

Eén concrete aanbevolen volgende opdracht, te geven NA Slice 5:

> "GO BUILD FIRST AGENT: implementeer Scout Slice 1 (Scout Triage) volgens
> `docs/architecture/TEAM_AND_AGENTS_ARCHITECTURE.md` §23 en de kandidaat-migratie
> `docs/architecture/proposals/006_agent_foundation.candidate.sql`. Bouw de minimale
> fundering (`actor`, `work_item`, `agent_run`) als echte migratie 006, plus `server/agents/`
> (registry + mandaat-guard, work, run, scout runner en qualify-capability in deterministische
> mock-modus), plus `handleAgents` gemount naast `handleComm` achter de admin- en
> `COMM_LAYER_ENABLED`-gate. Scout mag alleen lezen en voorstellen: geen verzending, geen promotie,
> geen externe calls. Lever de agent-testsuite in de bestaande stijl (node:test, serieel, echte
> Postgres, fictieve data) plus preview-acceptatie, met de volledige bestaande comm-suite groen.
> Raak de live Cockpit, Slice 5, First Lens en Comm Layer-gedrag niet aan."

STOP. Bouw en deploy de eerste agent nog niet.
