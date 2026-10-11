/* =========================================================
   KhayStore — Boutique en ligne
   Modifiez le catalogue et les réglages ci-dessous.
   ========================================================= */

const SETTINGS = {
  currency: "FCFA",
  freeShippingFrom: 50000,
  shippingCost: 2000,
  coupons: { KHAY10: 0.10, BIENVENUE: 0.15 },
  // Mettez votre numéro WhatsApp (format international sans "+", ex. "221771234567")
  // pour recevoir les commandes directement sur WhatsApp. Laissez vide pour désactiver.
  whatsappNumber: "",
  promoEndsInDays: 3,
};

const CATEGORIES = [
  { id: "mode",        name: "Mode",        desc: "Vêtements tendance",    emoji: "👗", bg: "linear-gradient(135deg,#c8553d,#8f3a5a)" },
  { id: "accessoires", name: "Accessoires", desc: "Sacs, bijoux, lunettes", emoji: "👜", bg: "linear-gradient(135deg,#e4a24a,#c8553d)" },
  { id: "beaute",      name: "Beauté",      desc: "Soins & parfums",       emoji: "💄", bg: "linear-gradient(135deg,#d17a9a,#7d3c6b)" },
  { id: "maison",      name: "Maison",      desc: "Déco & art de vivre",   emoji: "🪴", bg: "linear-gradient(135deg,#4f7a65,#2d4a3e)" },
];

const PRODUCTS = [
  { id: 1,  name: "Robe Wax Élégance",      cat: "mode",        price: 28000, old: 38000, rating: 4.9, reviews: 128, emoji: "👗", bg: "#f7e1d7", tag: "promo", desc: "Robe mi-longue en tissu wax 100 % coton, coupe fluide et ceinture assortie. Idéale pour les cérémonies comme pour le quotidien." },
  { id: 2,  name: "Sac Cuir Signature",     cat: "accessoires", price: 45000, old: 64000, rating: 5.0, reviews: 96,  emoji: "👜", bg: "#f3e3c9", tag: "promo", desc: "Sac à main en cuir véritable, finitions cousues main, grande contenance et bandoulière amovible." },
  { id: 3,  name: "Sneakers Urban Flow",    cat: "mode",        price: 35000, rating: 4.7, reviews: 210, emoji: "👟", bg: "#e3ebe6", tag: "new", desc: "Baskets légères et respirantes, semelle à mémoire de forme pour un confort toute la journée." },
  { id: 4,  name: "Lunettes Soleil Riviera", cat: "accessoires", price: 15000, old: 22000, rating: 4.6, reviews: 74, emoji: "🕶️", bg: "#e6e1f2", tag: "promo", desc: "Verres polarisés anti-UV400, monture légère et étui de protection inclus." },
  { id: 5,  name: "Parfum Ambre Nuit",      cat: "beaute",      price: 32000, rating: 4.8, reviews: 152, emoji: "🧴", bg: "#f6dde6", tag: "new", desc: "Eau de parfum 100 ml aux notes d'ambre, de vanille et de bois de santal. Tenue longue durée." },
  { id: 6,  name: "Montre Or Minimal",      cat: "accessoires", price: 55000, rating: 4.9, reviews: 88,  emoji: "⌚", bg: "#f5ecd5", desc: "Montre à quartz, boîtier acier doré, bracelet milanais ajustable. Étanche 3 ATM." },
  { id: 7,  name: "Coffret Soins Karité",   cat: "beaute",      price: 18000, old: 24000, rating: 4.8, reviews: 301, emoji: "🧖🏾‍♀️", bg: "#fbe7d3", tag: "promo", desc: "Coffret naturel : beurre de karité pur, huile de baobab et savon noir. Fabriqué au Sénégal." },
  { id: 8,  name: "Bougie Parfumée Bissap", cat: "maison",      price: 9500,  rating: 4.7, reviews: 67,  emoji: "🕯️", bg: "#f4dcdc", desc: "Bougie à la cire de soja, parfum fleur d'hibiscus. 40 heures de combustion." },
  { id: 9,  name: "Plante Monstera",        cat: "maison",      price: 16000, rating: 4.6, reviews: 45,  emoji: "🪴", bg: "#dfeee3", tag: "new", desc: "Monstera deliciosa en pot céramique fait main. Facile d'entretien, parfaite pour le salon." },
  { id: 10, name: "Chemise Lin Premium",    cat: "mode",        price: 22000, rating: 4.5, reviews: 59,  emoji: "👔", bg: "#e1e8f0", desc: "Chemise en lin lavé, coupe droite, idéale pour les journées chaudes." },
  { id: 11, name: "Rouge à Lèvres Velours", cat: "beaute",      price: 7500,  old: 10000, rating: 4.7, reviews: 188, emoji: "💄", bg: "#f8d9de", tag: "promo", desc: "Fini mat velouré, longue tenue 12 h, enrichi en huile d'argan." },
  { id: 12, name: "Coussin Bogolan",        cat: "maison",      price: 12000, rating: 4.8, reviews: 39,  emoji: "🛋️", bg: "#efe4d6", desc: "Housse de coussin en tissu bogolan authentique, 45 × 45 cm, garnissage inclus." },
];

/* ---------- État ---------- */
const store = {
  load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
  },
};

let cart = store.load("khay-cart", []);           // [{ id, qty }]
let wishlist = store.load("khay-wishlist", []);   // [id]
let coupon = store.load("khay-coupon", null);
let activeFilter = "all";
let searchTerm = "";
let sortMode = "featured";

/* ---------- Utilitaires ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (n) => `${Math.round(n).toLocaleString("fr-FR")} ${SETTINGS.currency}`;
const findProduct = (id) => PRODUCTS.find((p) => p.id === id);
const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
const heartSvg = `<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.3 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.7 0 6 3.7 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>`;

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function bump(el) {
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

/* ---------- Catégories & filtres ---------- */
function renderCategories() {
  $("#categoriesGrid").innerHTML = CATEGORIES.map((c) => `
    <button class="category reveal" style="background:${c.bg}" data-cat="${c.id}">
      <span class="category__emoji">${c.emoji}</span>
      <h3>${c.name}</h3>
      <p>${c.desc}</p>
    </button>`).join("");

  const chips = [{ id: "all", name: "Tout" }, ...CATEGORIES, { id: "promo", name: "🔥 Promos" }];
  $("#filters").innerHTML = chips.map((c) =>
    `<button class="chip${c.id === activeFilter ? " active" : ""}" data-filter="${c.id}">${c.name}</button>`).join("");
}

function setFilter(id) {
  activeFilter = id;
  $$(".chip").forEach((c) => c.classList.toggle("active", c.dataset.filter === id));
  renderProducts();
}

/* ---------- Produits ---------- */
function visibleProducts() {
  let list = PRODUCTS.filter((p) => {
    const matchFilter = activeFilter === "all" || p.cat === activeFilter || (activeFilter === "promo" && p.old);
    const matchSearch = p.name.toLowerCase().includes(searchTerm) || p.cat.includes(searchTerm);
    return matchFilter && matchSearch;
  });
  if (sortMode === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  if (sortMode === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
  if (sortMode === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
  return list;
}

function productCard(p, i) {
  const discount = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
  const tag = p.old ? `<span class="card__tag">-${discount} %</span>`
            : p.tag === "new" ? `<span class="card__tag card__tag--new">Nouveau</span>` : "";
  return `
    <article class="card" style="animation-delay:${i * 50}ms">
      <div class="card__media" style="background:${p.bg}" data-view="${p.id}">
        ${tag}
        <span>${p.emoji}</span>
        <button class="card__wish${wishlist.includes(p.id) ? " active" : ""}" data-wish="${p.id}" aria-label="Ajouter aux favoris">${heartSvg}</button>
        <button class="card__quick" data-view="${p.id}">Aperçu rapide</button>
      </div>
      <div class="card__body">
        <span class="card__cat">${CATEGORIES.find((c) => c.id === p.cat).name}</span>
        <h3 class="card__title">${p.name}</h3>
        <div class="rating">${stars(p.rating)}<small>(${p.reviews})</small></div>
        <div class="card__foot">
          <span class="price">${money(p.price)}${p.old ? `<del>${money(p.old)}</del>` : ""}</span>
          <button class="add-btn" data-add="${p.id}" aria-label="Ajouter au panier">+</button>
        </div>
      </div>
    </article>`;
}

function renderProducts() {
  const list = visibleProducts();
  $("#productsGrid").innerHTML = list.map(productCard).join("");
  $("#emptyState").hidden = list.length > 0;
}

function openQuickView(id) {
  const p = findProduct(id);
  $("#productModalContent").innerHTML = `
    <div class="quickview">
      <div class="quickview__media" style="background:${p.bg}">${p.emoji}</div>
      <div>
        <span class="eyebrow">${CATEGORIES.find((c) => c.id === p.cat).name}</span>
        <h3>${p.name}</h3>
        <div class="rating">${stars(p.rating)}<small>${p.rating} · ${p.reviews} avis</small></div>
        <p class="quickview__desc">${p.desc}</p>
        <span class="price">${money(p.price)}${p.old ? `<del>${money(p.old)}</del>` : ""}</span>
        <div class="quickview__actions">
          <div class="qty"><button data-qv="-1">−</button><span id="qvQty">1</span><button data-qv="1">+</button></div>
          <button class="btn btn--primary" id="qvAdd">Ajouter au panier</button>
        </div>
      </div>
    </div>`;
  let qty = 1;
  $$("[data-qv]").forEach((b) => b.addEventListener("click", () => {
    qty = Math.max(1, qty + Number(b.dataset.qv));
    $("#qvQty").textContent = qty;
  }));
  $("#qvAdd").addEventListener("click", () => { addToCart(p.id, qty); closeAll(); });
  openPanel("#productModal");
}

/* ---------- Favoris ---------- */
function toggleWishlist(id) {
  const has = wishlist.includes(id);
  wishlist = has ? wishlist.filter((w) => w !== id) : [...wishlist, id];
  store.save("khay-wishlist", wishlist);
  toast(has ? "Retiré des favoris" : "❤️ Ajouté aux favoris");
  $$(`[data-wish="${id}"]`).forEach((b) => b.classList.toggle("active", !has));
  renderWishlist();
}

function renderWishlist() {
  const count = $("#wishlistCount");
  count.textContent = wishlist.length;
  bump(count);
  $("#wishlistItems").innerHTML = wishlist.length
    ? wishlist.map(findProduct).filter(Boolean).map((p) => `
        <div class="line">
          <div class="line__img" style="background:${p.bg}">${p.emoji}</div>
          <div><p class="line__title">${p.name}</p><p class="line__price">${money(p.price)}</p></div>
          <div class="line__side">
            <button class="btn btn--small" data-add="${p.id}">Ajouter</button>
            <button class="line__remove" data-wish="${p.id}">Retirer</button>
          </div>
        </div>`).join("")
    : `<div class="drawer__empty"><span>🤍</span>Aucun favori pour le moment.</div>`;
}

/* ---------- Panier ---------- */
function addToCart(id, qty = 1) {
  const line = cart.find((l) => l.id === id);
  if (line) line.qty += qty; else cart.push({ id, qty });
  saveCart();
  toast(`🛍️ ${findProduct(id).name} ajouté au panier`);
}

function changeQty(id, delta) {
  const line = cart.find((l) => l.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter((l) => l.id !== id);
  saveCart();
}

function removeFromCart(id) {
  cart = cart.filter((l) => l.id !== id);
  saveCart();
}

function saveCart() {
  store.save("khay-cart", cart);
  renderCart();
}

function totals() {
  const subtotal = cart.reduce((s, l) => s + findProduct(l.id).price * l.qty, 0);
  const discount = coupon ? subtotal * SETTINGS.coupons[coupon] : 0;
  const afterDiscount = subtotal - discount;
  const shipping = subtotal === 0 || afterDiscount >= SETTINGS.freeShippingFrom ? 0 : SETTINGS.shippingCost;
  return { subtotal, discount, shipping, total: afterDiscount + shipping, afterDiscount };
}

function renderCart() {
  cart = cart.filter((l) => findProduct(l.id));
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const badge = $("#cartCount");
  badge.textContent = count;
  bump(badge);

  $("#cartItems").innerHTML = cart.length
    ? cart.map((l) => {
        const p = findProduct(l.id);
        return `
        <div class="line">
          <div class="line__img" style="background:${p.bg}">${p.emoji}</div>
          <div>
            <p class="line__title">${p.name}</p>
            <p class="line__price">${money(p.price)}</p>
            <div class="qty"><button data-dec="${p.id}">−</button><span>${l.qty}</span><button data-inc="${p.id}">+</button></div>
          </div>
          <div class="line__side">
            <strong>${money(p.price * l.qty)}</strong>
            <button class="line__remove" data-remove="${p.id}">Retirer</button>
          </div>
        </div>`;
      }).join("")
    : `<div class="drawer__empty"><span>🛒</span>Votre panier est vide.<br><br><a href="#boutique" class="btn btn--primary" data-close>Commencer mes achats</a></div>`;

  const t = totals();
  $("#subtotal").textContent = money(t.subtotal);
  $("#discountRow").hidden = !t.discount;
  $("#discount").textContent = `− ${money(t.discount)}${coupon ? ` (${coupon})` : ""}`;
  $("#shipping").textContent = t.shipping ? money(t.shipping) : "Offerte";
  $("#total").textContent = money(t.total);
  $("#checkoutBtn").disabled = !cart.length;
  $("#checkoutBtn").style.opacity = cart.length ? 1 : .5;

  const remaining = SETTINGS.freeShippingFrom - t.afterDiscount;
  $("#shippingText").innerHTML = remaining > 0
    ? `Plus que <strong>${money(remaining)}</strong> pour la livraison offerte 🚚`
    : `🎉 Bravo, la livraison est <strong>offerte</strong> !`;
  $("#shippingFill").style.width = `${Math.min(100, (t.afterDiscount / SETTINGS.freeShippingFrom) * 100)}%`;
}

/* ---------- Commande ---------- */
function openCheckout() {
  if (!cart.length) return;
  $("#checkoutTotal").textContent = money(totals().total);
  closeAll();
  openPanel("#checkoutModal");
}

function submitOrder(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const t = totals();
  const orderId = `KS-${Date.now().toString().slice(-6)}`;

  if (SETTINGS.whatsappNumber) {
    const lines = cart.map((l) => {
      const p = findProduct(l.id);
      return `• ${l.qty} × ${p.name} — ${money(p.price * l.qty)}`;
    });
    const message = [
      `Nouvelle commande ${orderId}`, "", ...lines, "",
      `Total : ${money(t.total)}`, `Paiement : ${data.payment}`, "",
      `Nom : ${data.name}`, `Téléphone : ${data.phone}`, `Adresse : ${data.address}`,
    ].join("\n");
    window.open(`https://wa.me/${SETTINGS.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
  }

  const content = $("#checkoutContent");
  const formHtml = content.innerHTML;
  content.innerHTML = `
    <div class="success">
      <div class="success__icon">🎉</div>
      <h3>Merci ${data.name.split(" ")[0]} !</h3>
      <p>Votre commande <strong>${orderId}</strong> de <strong>${money(t.total)}</strong> a bien été enregistrée.<br>
      Nous vous contacterons au ${data.phone} pour confirmer la livraison.</p>
      <button class="btn btn--primary" data-close>Continuer mes achats</button>
    </div>`;

  cart = [];
  coupon = null;
  store.save("khay-coupon", null);
  saveCart();

  // Remet le formulaire en place pour la prochaine commande
  $("#checkoutModal").addEventListener("transitionend", function restore() {
    if ($("#checkoutModal").classList.contains("open")) return;
    content.innerHTML = formHtml;
    $("#checkoutForm").addEventListener("submit", submitOrder);
    $("#checkoutModal").removeEventListener("transitionend", restore);
  });
}

/* ---------- Panneaux (tiroirs / modales) ---------- */
function openPanel(sel) {
  $(sel).classList.add("open");
  if ($(sel).classList.contains("drawer")) $("#overlay").classList.add("show");
  document.body.classList.add("no-scroll");
}

function closeAll() {
  $$(".drawer.open, .modal.open, .nav.open").forEach((el) => el.classList.remove("open"));
  $("#overlay").classList.remove("show");
  document.body.classList.remove("no-scroll");
}

/* ---------- Compte à rebours ---------- */
function startCountdown() {
  let end = store.load("khay-promo-end", 0);
  if (!end || end < Date.now()) {
    end = Date.now() + SETTINGS.promoEndsInDays * 864e5;
    store.save("khay-promo-end", end);
  }
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    const diff = Math.max(0, end - Date.now());
    $("#cdDays").textContent = pad(Math.floor(diff / 864e5));
    $("#cdHours").textContent = pad(Math.floor(diff / 36e5) % 24);
    $("#cdMinutes").textContent = pad(Math.floor(diff / 6e4) % 60);
    $("#cdSeconds").textContent = pad(Math.floor(diff / 1e3) % 60);
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- Animations au défilement ---------- */
function setupReveal() {
  if (!("IntersectionObserver" in window)) {
    $$(".reveal").forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  $$(".reveal").forEach((el) => io.observe(el));
}

/* ---------- Événements ---------- */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-add],[data-wish],[data-view],[data-inc],[data-dec],[data-remove],[data-close],[data-cat],[data-filter],[data-filter-link]");
  if (!t) return;
  const d = t.dataset;

  if (d.add) addToCart(Number(d.add));
  else if (d.wish) toggleWishlist(Number(d.wish));
  else if (d.view) openQuickView(Number(d.view));
  else if (d.inc) changeQty(Number(d.inc), 1);
  else if (d.dec) changeQty(Number(d.dec), -1);
  else if (d.remove) removeFromCart(Number(d.remove));
  else if ("close" in d) closeAll();
  else if (d.cat) { setFilter(d.cat); $("#boutique").scrollIntoView(); }
  else if (d.filter) setFilter(d.filter);
  else if (d.filterLink) setFilter(d.filterLink);
});

$("#cartBtn").addEventListener("click", () => openPanel("#cartDrawer"));
$("#wishlistBtn").addEventListener("click", () => openPanel("#wishlistDrawer"));
$("#overlay").addEventListener("click", closeAll);
$("#checkoutBtn").addEventListener("click", openCheckout);
$("#checkoutForm").addEventListener("submit", submitOrder);
$$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) closeAll(); }));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

$("#menuToggle").addEventListener("click", () => {
  $("#nav").classList.add("open");
  $("#overlay").classList.add("show");
});
$$("#nav a").forEach((a) => a.addEventListener("click", closeAll));

$("#searchInput").addEventListener("input", (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderProducts();
});
$("#searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#boutique").scrollIntoView();
});
$("#sortSelect").addEventListener("change", (e) => { sortMode = e.target.value; renderProducts(); });

$("#couponForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = $("#couponInput").value.trim().toUpperCase();
  if (SETTINGS.coupons[code]) {
    coupon = code;
    store.save("khay-coupon", coupon);
    toast(`✅ Code ${code} appliqué : -${SETTINGS.coupons[code] * 100} %`);
    $("#couponInput").value = "";
    renderCart();
  } else {
    toast("❌ Code promo invalide");
  }
});

$("#newsletterForm").addEventListener("submit", (e) => {
  e.preventDefault();
  e.target.reset();
  toast("💌 Merci ! Vous êtes inscrit(e) au club KhayStore.");
});

window.addEventListener("scroll", () => {
  $("#header").classList.toggle("scrolled", window.scrollY > 10);
}, { passive: true });

/* ---------- Démarrage ---------- */
$("#year").textContent = new Date().getFullYear();
renderCategories();
renderProducts();
renderCart();
renderWishlist();
startCountdown();
setupReveal();
