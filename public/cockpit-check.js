// Admin-gated boundary proof for Mijn Maculis (§25). Runs on the same origin as Testerbeheer, so the
// admin session cookie authenticates the call. Shows only what Maculis is authorized to use (SHARED)
// and a COUNT of withheld private insights — never their content. CSP-safe: no inline handlers.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // The organization to inspect. Default is the preview demo org; override with ?name= or ?org=.
  const url = new URL(location.href);
  const name = url.searchParams.get('name');
  const org = url.searchParams.get('org');
  const qs = org ? `org=${encodeURIComponent(org)}` : `name=${encodeURIComponent(name || 'De Voorbeeld Groep')}`;

  const STANCE = { reveal: 'Dit valt op', tension: 'Hier zit spanning', consistency: 'Hier zien we consistentie', non_reveal: 'Hier zien we géén verschil', unknown: 'Dit weten we nog niet' };

  async function run() {
    let res;
    try { res = await fetch(`/api/comm/mijn-boundary?${qs}`, { headers: { 'Accept': 'application/json' } }); }
    catch { $('cc-status').innerHTML = '<span class="error">Kon de controle niet laden.</span>'; return; }

    if (res.status === 401) {
      $('cc-status').innerHTML = 'Log eerst in bij <a href="/">Testerbeheer</a> (Cockpit). Daarna verschijnt de grenscontrole hier.';
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (res.status !== 200) { $('cc-status').innerHTML = `<span class="error">${esc(data.error || 'Onbekende fout')}</span>`; return; }

    const auth = data.authorized || [];
    $('cc-authorized').innerHTML = auth.length
      ? auth.map((i) => `<div class="qa" style="border-top:1px solid var(--line-soft);padding:14px 0">
          <div class="detail-head" style="margin:0 0 6px"><span class="chip stance-${esc(i.stance)}"><span class="dot"></span>${esc(STANCE[i.stance] || 'Dit zien we')}</span><span class="share-tag shared">Gedeeld</span></div>
          <h3 style="font-family:var(--serif);font-weight:600;font-size:17px;margin:2px 0 4px">${esc(i.title)}</h3>
          <p style="margin:0;color:var(--ink-soft);font-size:14px">${esc(i.observation || '')}</p>
        </div>`).join('')
      : '<p class="empty">Maculis heeft (nog) geen gedeeld inzicht van deze organisatie. Deel er een in Mijn Maculis en herlaad.</p>';

    const n = data.withheldPrivateCount || 0;
    $('cc-withheld').textContent = String(n);
    $('cc-withheld-note').textContent = `${n === 1 ? 'privé-inzicht' : 'privé-inzichten'} blijven volledig buiten het bereik van Maculis (${data.sharedCount || 0} gedeeld van ${data.totalCount || 0} totaal).`;

    $('cc-status').classList.add('hidden');
    $('cc-body').classList.remove('hidden');
  }
  run();
})();
