-- Twee stemmen naast elkaar. ADDITIEF en herdraaibaar op 001-012.
--
-- WAAROM DIT BESTAAT
--
-- "Shared truth, personal attention" was tot nu toe alleen een principe. Technisch smolten de twee
-- stemmen samen: het antwoord dat iemand tijdens de Lens gaf en de reflectie die hij later in Mijn
-- Maculis geeft, deelden één rij. De unieke sleutel stond op (insight_id, contact_id), dus de
-- tweede stem overschreef de eerste. Zetten we er dan `origin` bij, dan bleef die kolom staan op
-- 'lens' terwijl er een reflectie uit de kamer in stond, want de upsert raakte hem niet aan.
--
-- Gevolg: de enige kolom die de twee stemmen uit elkaar kon houden, was na de eerste bewerking
-- onjuist, en de kamer kon niet laten zien wat wij zagen naast wat jij toevoegt.
--
-- WAT HIER VERANDERT
--
-- De sleutel wordt (insight_id, contact_id, origin). Daarmee bestaat het Lens-antwoord naast de
-- reflectie uit de kamer, elk met een eigen antwoord, eigen woorden en een eigen datum. Niets wordt
-- overschreven en niets wordt verwijderd.
--
-- WAT HIER NIET VERANDERT
--
-- insight_recognition_event blijft de append-only geschiedenis. Die was al goed en wordt niet
-- aangeraakt. En de persoonlijke laag blijft persoonlijk: een reflectie hangt aan (inzicht, mens)
-- en reist nooit mee met het delen van een inzicht.

-- ---- 1. origin bestaat sinds 012, maar niet elke rij heeft hem -----------------------------------
-- Rijen van vóór 012 hebben null. Die komen uit de kamer, want de Lens schreef er toen nog niet.
update insight_recognition set origin = 'mijn' where origin is null;

do $$ begin
  alter table insight_recognition alter column origin set default 'mijn';
exception when undefined_column or undefined_table then null; end $$;

do $$ begin
  alter table insight_recognition alter column origin set not null;
exception when undefined_column or undefined_table then null; end $$;

-- ---- 2. de sleutel maakt ruimte voor twee stemmen ------------------------------------------------
-- Eerst de oude sleutel weg, dan de nieuwe erbij. Beide stappen zijn herdraaibaar: draait dit een
-- tweede keer, dan bestaat de oude sleutel niet meer en bestaat de nieuwe al.
do $$ begin
  alter table insight_recognition drop constraint insight_recognition_insight_id_contact_id_key;
exception when undefined_object or undefined_table then null; end $$;

do $$ begin
  alter table insight_recognition add constraint insight_recognition_stem_key
    unique (insight_id, contact_id, origin);
exception when duplicate_table or duplicate_object or undefined_table then null; end $$;

-- ---- 3. lezen per stem ---------------------------------------------------------------------------
create index if not exists insight_recognition_stem_idx
  on insight_recognition (insight_id, contact_id, origin);
