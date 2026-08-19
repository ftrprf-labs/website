-- Mijn Maculis · Het Veld — het bewijs onder een inzicht wordt herleidbaar voor de klant.
--
-- ADDITIEF op 001-007. Niets bestaands wordt verwijderd, hernoemd of anders geïnterpreteerd.
--
-- WAAROM. Het Veld toont per inzicht de waarnemingen waarop het rust, en de straal van het licht
-- volgt dat aantal (canon 7). Zonder een klantveilige beschrijving per waarneming zou dat getal
-- verzonnen zijn, en canon 7 verbiedt gloed waarvan je het bewijs niet kunt benoemen. Deze kolom
-- is dus geen extra functionaliteit maar de voorwaarde om het goedgekeurde concept eerlijk te
-- kunnen bouwen.
--
-- GRENS. insight_observation.provenance en .signal blijven intern en gaan NOOIT naar de klant.
-- customer_label is het enige veld op deze tabel dat voor de klant is geschreven, en het is
-- FAIL-CLOSED: is het leeg, dan telt de waarneming niet mee en wordt zij niet getoond. Er lekt
-- daardoor niets doordat iemand vergeet iets af te schermen; er verschijnt alleen wat iemand
-- bewust heeft opgeschreven.
--
-- De interne leesroute (sharing.mjs sharedContextForOrg) raakt observaties niet aan en verandert
-- hier dus niet. De grens tussen PRIVATE, SHARED en AGGREGATED blijft ongewijzigd.

alter table insight_observation add column if not exists customer_label text;

comment on column insight_observation.customer_label is
  'Klantveilige omschrijving van deze waarneming ("De pagina Over ons op jullie website"). Leeg = niet tonen en niet meetellen. Nooit afgeleid uit provenance.';

-- De klant vraagt per inzicht om zijn waarnemingen, op volgorde van waarneming.
create index if not exists insight_observation_customer_idx
  on insight_observation (insight_id, observed_at)
  where customer_label is not null;
