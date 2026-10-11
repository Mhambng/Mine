// Interfaces liées à la monétisation : fenêtre générique, porte parentale, « Deuxième chance »,
// packs cosmétiques, section Achats des réglages, écran de premier lancement.
// Aucune de ces fenêtres n'a de compte à rebours ni de message culpabilisant.
'use strict';

// ---------- Fenêtre générique ----------
let modalOnCancel = null;
function showModal(html, onCancel) {
  $('modal-card').innerHTML = html;
  modalOnCancel = onCancel || null;
  openDialog('modal');
}
function hideModal() {
  modalOnCancel = null;
  closeDialog('modal');
}
// Appelée par Échap, le bouton retour Android ou un clic sur le fond sombre
function modalCancel() {
  const cb = modalOnCancel;
  hideModal();
  if (cb) cb();
}

// ---------- Porte parentale ----------
// Avant TOUT achat en argent réel, un adulte doit répondre à une multiplication.
// C'est une première barrière ; la vraie protection reste le contrôle parental du store
// (Google Family Link, « Demander l'achat » d'Apple), qui s'applique ensuite automatiquement.
function parentalGate(product) {
  return new Promise(resolve => {
    let tries = 0, a, b;
    const ask = () => {
      a = 11 + Math.floor(Math.random() * 9);   // 11 à 19
      b = 3 + Math.floor(Math.random() * 7);    // 3 à 9
      showModal(`
        <h3>Demande à un adulte</h3>
        <p>Cet achat utilise de l’<strong>argent réel</strong> :<br>${product.title} · <strong>${product.priceString}</strong></p>
        <label for="gate-answer">Pour continuer, un adulte doit répondre : combien font ${a} × ${b} ?</label>
        <input id="gate-answer" type="number" inputmode="numeric" autocomplete="off">
        <p class="error" id="gate-error" hidden>Ce n’est pas la bonne réponse.</p>
        <div class="row">
          <button class="btn" type="button" data-gate-ok>Continuer</button>
          <button class="btn ghost" type="button" data-gate-cancel>Annuler</button>
        </div>
        ${Monetization.isDemo ? '<p class="muted">Mode démo : aucun vrai paiement ne sera fait.</p>' : ''}`, () => resolve(false));
      const card = $('modal-card'), input = $('gate-answer');
      input.focus();
      const check = () => {
        if (+input.value === a * b) { hideModal(); resolve(true); return; }
        tries++;
        if (tries >= 3) { hideModal(); toast('Achat annulé.'); resolve(false); return; }
        $('gate-error').hidden = false;
        input.value = '';
        input.focus();
      };
      card.querySelector('[data-gate-ok]').addEventListener('click', check);
      card.querySelector('[data-gate-cancel]').addEventListener('click', () => { hideModal(); resolve(false); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    };
    ask();
  });
}

// ---------- Achat en argent réel ----------
async function buyRealMoney(id) {
  const p = Monetization.product(id);
  if (!p || Monetization.owns(id)) return;
  if (!(await parentalGate(p))) return;
  showModal(`<h3>Connexion au store…</h3><p class="muted">Suis les instructions qui s’affichent. Tu peux annuler à tout moment.</p>`);
  const r = await Monetization.purchase(id);
  hideModal();
  if (r.ok) {
    sfx.buy();
    toast(id === 'no_ads' ? 'Merci ! Les pubs sont supprimées.' : `Merci ! ${p.title} est débloqué.`, 3000);
  } else if (r.cancelled) {
    toast('Achat annulé. Rien n’a été payé.', 3000);
  } else {
    toast(STORE_ERRORS[r.error] || STORE_ERRORS.unknown, 4000);
  }
  renderShop();
  updateStats();
  if (!$('settings').hidden) renderSettings();
}

// ---------- Packs cosmétiques (dans la boutique) ----------
function renderPacks() {
  const box = $('packs');
  if (!box) return;
  const packs = Monetization.products.filter(p => p.grants.length);
  box.hidden = !packs.length;
  if (!packs.length) return;
  box.innerHTML = `
    <h3>Packs <span class="real-money">argent réel</span></h3>
    <p class="muted">Purement décoratifs : ils ne rendent pas Pépin plus fort. Tous ces objets s’obtiennent aussi avec les pièces du jeu.</p>
    <div class="packs-grid">
      ${packs.map(p => {
        const owned = Monetization.owns(p.id);
        // Si le joueur a déjà tout gagné avec ses pièces, le pack ne lui apporterait rien : on ne le vend pas
        const nothingNew = !owned && p.grants.every(([cat, id]) => save.owned[cat].includes(id));
        return `<div class="pack">
          <strong>${p.title}</strong>
          <ul>${p.grants.map(([cat, id]) => `<li>${find(cat, id).name} <small>(${CATS.find(c => c.id === cat).one.toLowerCase()})</small></li>`).join('')}</ul>
          <button class="btn small ${owned || nothingNew ? 'ghost' : ''}" type="button" data-pack="${p.id}" ${owned || nothingNew || !p.available ? 'disabled' : ''}>
            ${owned ? 'Acheté' : nothingNew ? 'Déjà tout débloqué' : p.available ? `Acheter · ${p.priceString}` : 'Indisponible'}
          </button>
        </div>`;
      }).join('')}
    </div>
    ${Monetization.isDemo ? '<p class="muted">Mode démo : aucun vrai paiement.</p>' : ''}`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pack], [data-buy-real], [data-restore]');
  if (!b) return;
  if (b.dataset.pack) buyRealMoney(b.dataset.pack);
  else if (b.dataset.buyReal) buyRealMoney(b.dataset.buyReal);
  else if (b.dataset.restore !== undefined) restorePurchases(b);
});

// ---------- Section « Achats » des réglages ----------
function renderStoreSettings(box) {
  const p = Monetization.product('no_ads');
  const adFree = Monetization.isAdFree();
  box.innerHTML = `
    <h3>Achats</h3>
    <div class="store-row">
      <span><strong>Supprimer les pubs</strong><small>${p ? p.description : ''}</small></span>
      ${adFree
        ? '<span class="owned-tag">Acheté ✓</span>'
        : `<button class="btn small" type="button" data-buy-real="no_ads" ${p && p.available ? '' : 'disabled'}>${p && p.available ? p.priceString : 'Indisponible'}</button>`}
    </div>
    <button class="btn ghost small" type="button" data-restore>Restaurer mes achats</button>
    <p class="muted">Les achats sont protégés par une question pour les adultes, puis par le contrôle parental du store.${Monetization.isDemo ? ' Mode démo : aucun vrai paiement.' : ''}</p>`;
}
async function restorePurchases(btn) {
  btn.disabled = true;
  btn.textContent = 'Recherche…';
  const r = await Monetization.restore();
  if (r.ok) toast(r.restored ? `${r.restored} achat(s) restauré(s).` : 'Aucun achat à restaurer.', 3000);
  else toast(STORE_ERRORS[r.error] || STORE_ERRORS.unknown, 4000);
  renderShop();
  if (!$('settings').hidden) renderSettings();
}

// ---------- Deuxième chance (pub récompensée, choisie par le joueur) ----------
function offerRevive() {
  G.awaitingRevive = true;
  const free = Monetization.isAdFree();
  showModal(`
    <h3>Deuxième chance ?</h3>
    <p>${free ? 'Continue ta course là où tu t’es arrêté.' : 'Regarde une courte pub pour continuer ta course là où tu t’es arrêté.'}</p>
    <p class="muted">Une seule fois par partie. Tu peux aussi simplement voir ton score.</p>
    <div class="row">
      <button class="btn" type="button" data-revive>${free ? 'Continuer' : 'Regarder une pub'}</button>
      <button class="btn ghost" type="button" data-decline>Voir mon score</button>
    </div>`, declineRevive);
  const card = $('modal-card');
  // Boutons inactifs une demi-seconde : évite un appui accidentel juste après la chute
  card.querySelectorAll('button').forEach(btn => { btn.disabled = true; setTimeout(() => { btn.disabled = false; }, 500); });
  card.querySelector('[data-decline]').addEventListener('click', () => { hideModal(); declineRevive(); });
  card.querySelector('[data-revive]').addEventListener('click', async () => {
    hideModal();
    const r = await Monetization.showRewarded('revive');
    if (r.rewarded) doRevive();
    else {
      if (r.error) toast(STORE_ERRORS[r.error] || STORE_ERRORS.unknown, 3500);
      declineRevive();
    }
  });
}
function declineRevive() {
  if (!G.awaitingRevive) return;
  G.awaitingRevive = false;
  endRun();
}
function doRevive() {
  G.awaitingRevive = false;
  G.revives++;
  // On retire les obstacles proches pour repartir sereinement
  compact(G.obs, o => o.x > PX + 520);
  Object.assign(G, { state: 'play', py: GROUND, vy: 0, ground: true, jumps: 0, slide: 0, slideQueued: false, buffer: 0, invuln: 2.5 });
  G.spring = makeSpring();
  $('pause').hidden = false;
  showOverlay(null);
  Music.start();
  sfx.start();
  showBanner('C’est reparti !', '#7df9c8');
}

// ---------- Premier lancement ----------
// Pas de question sur l'âge : le jeu est conçu pour être sans risque pour tout le monde
// (pubs non personnalisées, aucune donnée personnelle collectée).
function firstLaunch() {
  if (save.firstLaunchDone) return;
  const done = () => { save.firstLaunchDone = true; persist(); };
  showModal(`
    <h3>Bienvenue dans Pépin Sprint !</h3>
    <ul class="welcome-list">
      <li>Pas de compte, aucune donnée personnelle collectée. Ta progression reste sur cet appareil.</li>
      <li>Une pub ne s’affiche que si <strong>tu choisis</strong> d’en regarder une, pour continuer une partie. Elles sont adaptées aux enfants.</li>
      <li>Tout ce qui s’achète est décoratif. Chaque achat en argent réel demande l’accord d’un adulte.</li>
    </ul>
    <div class="row">
      <button class="btn" type="button" data-welcome>C’est parti !</button>
    </div>
    <p class="muted"><a href="${CONFIG.app.privacyUrl}" target="_blank" rel="noopener">Politique de confidentialité</a></p>`, done);
  $('modal-card').querySelector('[data-welcome]').addEventListener('click', () => { hideModal(); done(); });
}
