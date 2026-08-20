// Testopzet, geen productgedrag.
//
// server/config.mjs leest RESEND_WEBHOOK_SECRET één keer, op het moment dat de module wordt
// geladen. Een testbestand dat de variabele pas in de body van een test zet, is dus te laat zodra
// het ook maar één statische import heeft die (indirect) config laadt: de configuratie staat dan al
// vast met een lege secret, signWebhook tekent met '', verifyWebhook antwoordt no_secret en de
// webhook eindigt op 401.
//
// Dit bestand bestaat om die volgorde af te dwingen. Importeer het als ALLEREERSTE import van een
// testbestand: ESM voert modules uit in de volgorde waarin ze worden geïmporteerd, dus dan staat de
// variabele er voordat config wordt geladen. Een secret uit de omgeving wint altijd.
process.env.RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET
  || ('whsec_' + Buffer.from('test-webhook-secret').toString('base64'));
