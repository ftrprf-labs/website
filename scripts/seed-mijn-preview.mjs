// Preview seeding CLI for Mijn Maculis. Refuses to run in production (see seed.mjs).
// Usage: COMM_LAYER_ENABLED=1 DATABASE_URL=... node scripts/seed-mijn-preview.mjs
import { seedPreview } from '../server/mijn/seed.mjs';
import { closePool } from '../server/comm/db.mjs';

try {
  const r = await seedPreview();
  console.log('\n  Mijn Maculis — preview seeded');
  console.log(`  Organisatie : ${r.organizationName}`);
  console.log(`  Preview link: ${r.link}\n`);
} catch (e) {
  console.error('\n  Seeding failed:', e.message, '\n');
  process.exitCode = 1;
} finally {
  await closePool();
}
