// Fournisseur natif pour l'application Android / iOS (Capacitor).
//   - Pub : AdMob via le plugin @capacitor-community/admob, réglé pour un public d'enfants.
//   - Achats : RevenueCat via @revenuecat/purchases-capacitor (une seule intégration pour
//     Google Play Billing et StoreKit).
//
// IMPORTANT : ce code n'a pas pu être exécuté sur un vrai téléphone dans cette session.
// Les noms de méthodes suivent la documentation des plugins (versions installées : voir package.json).
// À tester sur un appareil réel avec les identifiants de TEST avant la publication
// (voir docs/publication-google-play.md).
'use strict';

const NativeStoreProvider = {
  real: true,
  ads: null,
  purchases: null,
  adReady: false,

  async init() {
    const M = CONFIG.monetization;
    this.ads = Native.plugin('AdMob');
    this.purchases = Native.plugin('Purchases');

    // --- AdMob : public enfant ---
    if (this.ads) {
      try {
        await this.ads.initialize({
          tagForChildDirectedTreatment: true,  // COPPA : contenu destiné aux enfants
          tagForUnderAgeOfConsent: true,       // RGPD : utilisateur sous l'âge du consentement
          maxAdContentRating: 'General',       // pubs « tout public » uniquement
          initializeForTesting: M.admob.testing,
        });
        this.prepareAd();
      } catch (e) { this.ads = null; }
    }

    // --- RevenueCat ---
    if (this.purchases) {
      const apiKey = Native.platform === 'ios' ? M.revenuecat.apiKeyIos : M.revenuecat.apiKeyAndroid;
      if (apiKey) {
        try { await this.purchases.configure({ apiKey }); } catch (e) { this.purchases = null; }
      } else {
        this.purchases = null;  // clé non renseignée : achats désactivés proprement
      }
    }
  },

  adUnitId() {
    const a = CONFIG.monetization.admob;
    return Native.platform === 'ios' ? a.rewardedIos : a.rewardedAndroid;
  },

  // Précharge une pub pour qu'elle s'affiche sans attente quand le joueur la demande
  async prepareAd() {
    if (!this.ads) return;
    try {
      await this.ads.prepareRewardVideoAd({ adId: this.adUnitId(), isTesting: CONFIG.monetization.admob.testing, npa: true /* non personnalisée */ });
      this.adReady = true;
    } catch (e) { this.adReady = false; }
  },

  adsAvailable() { return !!this.ads && this.adReady; },

  async showRewarded() {
    if (!this.ads || !this.adReady) throw new Error('noFill');
    this.adReady = false;
    let rewarded = false;
    const sub = await this.ads.addListener('onRewardedVideoAdReward', () => { rewarded = true; });
    try {
      const item = await this.ads.showRewardVideoAd();
      rewarded = rewarded || !!item;
    } finally {
      sub && sub.remove && sub.remove();
      this.prepareAd();  // prépare la suivante
    }
    return { rewarded };
  },

  async getProducts(ids) {
    if (!this.purchases) return [];
    const r = await this.purchases.getProducts({ productIdentifiers: ids, type: 'NON_SUBSCRIPTION' });
    return (r.products || []).map(p => ({ id: p.identifier, title: p.title, priceString: p.priceString, raw: p }));
  },

  async purchase(id) {
    if (!this.purchases) throw new Error('unavailable');
    const list = await this.getProducts([id]);
    if (!list.length) throw new Error('unavailable');
    try {
      // La fenêtre de paiement du store s'affiche ici (avec le contrôle parental du store :
      // Google Family Link « approbation des achats », « Demander l'achat » sur iOS).
      await this.purchases.purchaseStoreProduct({ product: list[0].raw });
      return { ok: true };
    } catch (e) {
      if (e && (e.userCancelled || e.code === '1' || /cancel/i.test(e.message || ''))) return { ok: false, cancelled: true };
      throw new Error('unknown');
    }
  },

  async restore() {
    if (!this.purchases) throw new Error('unavailable');
    const r = await this.purchases.restorePurchases();
    const tx = (r.customerInfo && r.customerInfo.nonSubscriptionTransactions) || [];
    return [...new Set(tx.map(t => t.productIdentifier))].filter(id => CONFIG.monetization.products[id]);
  },
};
