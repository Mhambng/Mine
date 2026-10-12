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
  { id: "parfums",   name: "Parfums",            desc: "Eaux de parfum & colognes",  emoji: "🌸", bg: "linear-gradient(135deg,#c8553d,#8f3a5a)" },
  { id: "senteurs",  name: "Senteurs & encens",  desc: "Parfums d'intérieur, oud",   emoji: "🕯️", bg: "linear-gradient(135deg,#e4a24a,#c8553d)" },
  { id: "soins",     name: "Soins & beauté",     desc: "Savons, lèvres, cheveux",    emoji: "🧼", bg: "linear-gradient(135deg,#d17a9a,#7d3c6b)" },
  { id: "entretien", name: "Maison & entretien", desc: "Ménage & cuisine",           emoji: "🏠", bg: "linear-gradient(135deg,#4f7a65,#2d4a3e)" },
];

// Photos : chaque produit avec "photo" utilise les fichiers
// images/<photo>-principale-400.webp et images/<photo>-principale-800.webp.
// Prix : laissez price à null tant qu'il n'est pas fixé (« Prix bientôt disponible »).
const PRODUCTS = [
  { id: 101, name: "Naseem Marble Whispers", cat: "senteurs", price: null, photo: "naseem-marble-whispers", emoji: "🌸", bg: "#f3ede5", tag: "new",
    desc: "Parfum d'intérieur (home freshener) Naseem, gamme Marble Whispers. Flacon de 500 ml." },
  { id: 102, name: "Charbon Al Musk", cat: "senteurs", price: null, photo: "charbon-al-musk", emoji: "🔥", bg: "#f3ede5",
    desc: "Rouleau de charbons Al Musk pour brûler l'encens et le bakhoor." },
  { id: 103, name: "Gotaz Frescaz – Eau de Cologne", cat: "parfums", price: null, photo: "gotaz-frescaz", emoji: "🍋", bg: "#f3ede5", tag: "new",
    desc: "Agua de Colonia concentrada (eau de Cologne concentrée), flacon spray." },
  { id: 104, name: "Oudh Maattar Fazza", cat: "senteurs", price: null, photo: "oudh-maattar-fazza", emoji: "🪵", bg: "#f3ede5",
    desc: "Oudh Maattar Fazza, présenté dans son coffret." },
  { id: 105, name: "Savon Tomato Luffa", cat: "soins", price: null, photo: "savon-tomato-luffa", emoji: "🧼", bg: "#f3ede5",
    desc: "Savon de beauté Fluffy Luffa à la tomate, avec niacinamide (vitamine B3)." },
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
let recent = store.load("khay-recent", []);       // [id], le plus récent en premier
const PRICES = PRODUCTS.filter((p) => typeof p.price === "number").map((p) => p.price);
const PRICE_CEIL = PRICES.length ? Math.ceil(Math.max(...PRICES) / 1000) * 1000 : 50000;
let maxPrice = PRICE_CEIL;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Utilitaires ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (n) => `${Math.round(n).toLocaleString("fr-FR")} ${SETTINGS.currency}`;
const findProduct = (id) => PRODUCTS.find((p) => p.id === id);
const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
const hasPrice = (p) => typeof p.price === "number";
const priceHtml = (p) => hasPrice(p)
  ? `${money(p.price)}${p.old ? `<del>${money(p.old)}</del>` : ""}`
  : `<span class="price--soon">Prix bientôt disponible</span>`;
const priceText = (p) => (hasPrice(p) ? money(p.price) : "Prix à venir");
const fallback = (p) => `onerror="this.replaceWith(document.createTextNode('${p.emoji}'))"`;
const visual = (p) => {
  if (p.photo) {
    const base = `images/${p.photo}-principale`;
    return `<img src="${base}-800.webp" srcset="${base}-400.webp 400w, ${base}-800.webp 800w"
      sizes="(max-width: 560px) 50vw, (max-width: 1024px) 33vw, 300px"
      alt="${p.name}" loading="lazy" decoding="async" width="800" height="800" ${fallback(p)}>`;
  }
  if (p.img) return `<img src="${p.img}" alt="${p.name}" loading="lazy" decoding="async" ${fallback(p)}>`;
  return p.emoji;
};
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

  const chips = [{ id: "all", name: "Tout" }, ...CATEGORIES];
  if (PRODUCTS.some((p) => p.old)) chips.push({ id: "promo", name: "🔥 Promos" });
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
    return matchFilter && matchSearch && (!hasPrice(p) || maxPrice >= PRICE_CEIL || p.price <= maxPrice);
  });
  const priceOr = (p, dflt) => (hasPrice(p) ? p.price : dflt);
  if (sortMode === "price-asc") list = [...list].sort((a, b) => priceOr(a, Infinity) - priceOr(b, Infinity));
  if (sortMode === "price-desc") list = [...list].sort((a, b) => priceOr(b, -Infinity) - priceOr(a, -Infinity));
  if (sortMode === "rating") list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
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
        <span class="card__visual">${visual(p)}</span>
        <button class="card__wish${wishlist.includes(p.id) ? " active" : ""}" data-wish="${p.id}" aria-label="Ajouter aux favoris">${heartSvg}</button>
        <button class="card__quick" data-view="${p.id}">Aperçu rapide</button>
      </div>
      <div class="card__body">
        <span class="card__cat">${CATEGORIES.find((c) => c.id === p.cat).name}</span>
        <h3 class="card__title">${p.name}</h3>
        ${p.reviews ? `<div class="rating">${stars(p.rating)}<small>(${p.reviews})</small></div>` : ""}
        <div class="card__foot">
          <span class="price">${priceHtml(p)}</span>
          ${hasPrice(p) ? `<button class="add-btn" data-add="${p.id}" aria-label="Ajouter au panier">+</button>` : ""}
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
  addToRecent(id);
  const similar = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 3);
  $("#productModalContent").innerHTML = `
    <div class="quickview">
      <div class="quickview__media" style="background:${p.bg}">${visual(p)}</div>
      <div>
        <span class="eyebrow">${CATEGORIES.find((c) => c.id === p.cat).name}</span>
        <h3>${p.name}</h3>
        ${p.reviews ? `<div class="rating">${stars(p.rating)}<small>${p.rating} · ${p.reviews} avis</small></div>` : ""}
        <p class="quickview__desc">${p.desc}</p>
        <span class="price">${priceHtml(p)}</span>
        ${hasPrice(p) ? `
        <div class="quickview__actions">
          <div class="qty"><button data-qv="-1">−</button><span id="qvQty">1</span><button data-qv="1">+</button></div>
          <button class="btn btn--primary" id="qvAdd">Ajouter au panier</button>
        </div>` : `<p class="quickview__note">Ce produit sera bientôt disponible à la commande.</p>`}
      </div>
    </div>
    ${similar.length ? `
    <div class="similar">
      <h4>Vous aimerez aussi</h4>
      <div class="similar__list">
        ${similar.map((x) => `
          <button class="mini" data-view="${x.id}">
            <span class="mini__img" style="background:${x.bg}">${visual(x)}</span>
            <span class="mini__name">${x.name}</span>
            <span class="mini__price">${priceText(x)}</span>
          </button>`).join("")}
      </div>
    </div>` : ""}`;
  $("#productModal .modal__box").scrollTop = 0;
  let qty = 1;
  $$("[data-qv]").forEach((b) => b.addEventListener("click", () => {
    qty = Math.max(1, qty + Number(b.dataset.qv));
    $("#qvQty").textContent = qty;
  }));
  $("#qvAdd")?.addEventListener("click", () => {
    addToCart(p.id, qty, $(".quickview__media"));
    closeAll();
  });
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
          <div class="line__img" style="background:${p.bg}">${visual(p)}</div>
          <div><p class="line__title">${p.name}</p><p class="line__price">${priceText(p)}</p></div>
          <div class="line__side">
            ${hasPrice(p) ? `<button class="btn btn--small" data-add="${p.id}">Ajouter</button>` : ""}
            <button class="line__remove" data-wish="${p.id}">Retirer</button>
          </div>
        </div>`).join("")
    : `<div class="drawer__empty"><span>🤍</span>Aucun favori pour le moment.</div>`;
}

/* ---------- Vus récemment ---------- */
function addToRecent(id) {
  recent = [id, ...recent.filter((r) => r !== id)].slice(0, 6);
  store.save("khay-recent", recent);
  renderRecent();
}

function renderRecent() {
  const items = recent.map(findProduct).filter(Boolean);
  $("#recent").hidden = !items.length;
  $("#recentList").innerHTML = items.map((p) => `
    <button class="mini" data-view="${p.id}">
      <span class="mini__img" style="background:${p.bg}">${visual(p)}</span>
      <span class="mini__name">${p.name}</span>
      <span class="mini__price">${priceText(p)}</span>
    </button>`).join("");
}

/* ---------- Animation « vers le panier » ---------- */
function flyToCart(sourceEl) {
  const target = $("#cartBtn");
  if (!sourceEl || reduceMotion || !sourceEl.animate) return bump(target);
  const from = sourceEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = Math.min(from.width, from.height, 140);
  const ghost = document.createElement("div");
  ghost.className = "fly";
  ghost.innerHTML = sourceEl.innerHTML;
  Object.assign(ghost.style, {
    width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.6}px`,
    left: `${from.left + from.width / 2 - size / 2}px`, top: `${from.top + from.height / 2 - size / 2}px`,
  });
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  ghost.animate([
    { transform: "translate(0, 0) scale(1)", opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy - 80}px) scale(.6)`, opacity: 1, offset: 0.6 },
    { transform: `translate(${dx}px, ${dy}px) scale(.15)`, opacity: .4 },
  ], { duration: 750, easing: "cubic-bezier(.5,0,.3,1)" }).onfinish = () => {
    ghost.remove();
    target.animate([{ transform: "scale(1)" }, { transform: "scale(1.3) rotate(-10deg)" }, { transform: "scale(1)" }], { duration: 400 });
  };
}

/* ---------- Panier ---------- */
function addToCart(id, qty = 1, sourceEl) {
  const product = findProduct(id);
  if (!product || !hasPrice(product)) { toast("Ce produit sera bientôt disponible"); return; }
  const line = cart.find((l) => l.id === id);
  if (line) line.qty += qty; else cart.push({ id, qty });
  saveCart();
  flyToCart(sourceEl);
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
  cart = cart.filter((l) => findProduct(l.id) && hasPrice(findProduct(l.id)));
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const badge = $("#cartCount");
  badge.textContent = count;
  bump(badge);

  $("#cartItems").innerHTML = cart.length
    ? cart.map((l) => {
        const p = findProduct(l.id);
        return `
        <div class="line">
          <div class="line__img" style="background:${p.bg}">${visual(p)}</div>
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
  confetti();

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

/* ---------- Confettis ---------- */
function confetti() {
  if (reduceMotion) return;
  const colors = ["#c8553d", "#e4a24a", "#2d4a3e", "#d17a9a", "#4f7a65", "#f4c7a1"];
  for (let i = 0; i < 90; i++) {
    const c = document.createElement("span");
    c.className = "confetti";
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = colors[i % colors.length];
    c.style.width = `${6 + Math.random() * 6}px`;
    c.style.height = `${10 + Math.random() * 8}px`;
    document.body.appendChild(c);
    const drift = (Math.random() - 0.5) * 300;
    c.animate([
      { transform: "translate(0, -20px) rotate(0)", opacity: 1 },
      { transform: `translate(${drift}px, 105vh) rotate(${Math.random() * 1080}deg)`, opacity: .8 },
    ], { duration: 2200 + Math.random() * 1800, delay: Math.random() * 300, easing: "cubic-bezier(.25,.6,.4,1)" })
      .onfinish = () => c.remove();
  }
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

/* ---------- Recherche avec suggestions ---------- */
function renderSuggestions() {
  const box = $("#suggest");
  if (!searchTerm) { box.hidden = true; return; }
  const hits = PRODUCTS.filter((p) => p.name.toLowerCase().includes(searchTerm)).slice(0, 5);
  box.innerHTML = hits.length
    ? hits.map((p) => `
        <button class="suggest__item" data-view="${p.id}">
          <span class="mini__img" style="background:${p.bg}">${visual(p)}</span>
          <span>${p.name.replace(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i"), "<mark>$1</mark>")}</span>
          <strong>${priceText(p)}</strong>
        </button>`).join("")
    : `<p class="suggest__empty">Aucun résultat pour « ${searchTerm.replace(/</g, "&lt;")} »</p>`;
  box.hidden = false;
}

/* ---------- Filtre par prix ---------- */
function setupPriceFilter() {
  const range = $("#priceRange");
  // Pas de curseur tant qu'aucun produit n'a de prix
  range.closest(".price-filter").hidden = !PRICES.length;
  range.min = 0;
  range.max = PRICE_CEIL;
  range.value = maxPrice;
  const update = () => {
    maxPrice = Number(range.value);
    $("#priceValue").textContent = money(maxPrice);
    range.style.setProperty("--fill", `${(maxPrice / PRICE_CEIL) * 100}%`);
  };
  update();
  range.addEventListener("input", () => { update(); renderProducts(); });
}

function resetFilters() {
  searchTerm = "";
  $("#searchInput").value = "";
  $("#priceRange").value = PRICE_CEIL;
  $("#priceRange").dispatchEvent(new Event("input"));
  setFilter("all");
}

/* ---------- Thème clair / sombre ---------- */
function setupTheme() {
  const root = document.documentElement;
  const current = () => root.dataset.theme
    || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  $("#themeBtn").addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    store.save("khay-theme", next);
  });
}

/* ---------- Effet 3D sur les cartes ---------- */
function setupTilt() {
  if (reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const grid = $("#productsGrid");
  grid.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.setProperty("--ry", `${x * 10}deg`);
    card.style.setProperty("--rx", `${-y * 10}deg`);
  });
  grid.addEventListener("pointerout", (e) => {
    const card = e.target.closest(".card");
    if (card && !card.contains(e.relatedTarget)) {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    }
  });
}

/* ---------- Compteurs animés ---------- */
function animateCounters() {
  $$("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || "";
    const format = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (reduceMotion) { el.textContent = format(end); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 1600);
      el.textContent = format(end * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
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

  if (d.add) addToCart(Number(d.add), 1, t.closest(".card")?.querySelector(".card__visual") || t.closest(".line")?.querySelector(".line__img"));
  else if (d.wish) toggleWishlist(Number(d.wish));
  else if (d.view) { $("#suggest").hidden = true; openQuickView(Number(d.view)); }
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
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeAll(); $("#suggest").hidden = true; }
  // Raccourci « / » pour rechercher
  if (e.key === "/" && !e.target.closest("input, textarea, select")) {
    const input = $("#searchInput");
    if (input.offsetParent) { e.preventDefault(); input.focus(); }
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search")) $("#suggest").hidden = true;
});

$("#menuToggle").addEventListener("click", () => {
  $("#nav").classList.add("open");
  $("#overlay").classList.add("show");
});
$$("#nav a").forEach((a) => a.addEventListener("click", closeAll));

$("#searchInput").addEventListener("input", (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderProducts();
  renderSuggestions();
});
$("#searchInput").addEventListener("focus", renderSuggestions);
$("#searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { $("#suggest").hidden = true; $("#boutique").scrollIntoView(); }
});
$("#resetFilters").addEventListener("click", resetFilters);
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
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  $("#header").classList.toggle("scrolled", y > 10);
  $("#progress").style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  $("#toTop").classList.toggle("show", y > 700);
}, { passive: true });
$("#toTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

if (SETTINGS.whatsappNumber) {
  $("#waFloat").href = `https://wa.me/${SETTINGS.whatsappNumber}`;
  $("#waFloat").hidden = false;
}

/* ---------- Démarrage ---------- */
$("#year").textContent = new Date().getFullYear();
renderCategories();
setupPriceFilter();
renderProducts();
renderRecent();
setupTheme();
setupTilt();
animateCounters();
renderCart();
renderWishlist();
startCountdown();
setupReveal();
