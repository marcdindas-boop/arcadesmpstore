// ========= Daten (kein data.yml) =========
const shopData = {
    shop: {
        name: "ArcadeSMP Store",
        supportDiscord: "SIGMA",
        discordWebhook: "YOUR_DISCORD_WEBHOOK_URL_HERE", // optional
        summerSale: {
            enabled: true,
            countdownEnd: "2025-09-15T23:59:59Z"
        }
    },
    crates: [
        { id: "rare_crate",   name: "SIGMA SIGMA Crate", price: 1.99, image: "images/image.png",  description: "Seltene Items & Belohnungen." },
        { id: "nitro_crate",  name: "Nitro Crate",       price: 2.99, image: "images/image2.png", description: "Explosive Rewards & Boosts." },
        { id: "spawner_crate",name: "Spawner Crate",     price: 4.99, image: "images/image3.png", description: "OP Spawner für deine Farm." },
        { id: "arcade_crate", name: "Arcade Crate",      price: 6.99, image: "images/image4.png", description: "Arcade-Themed Loot Drop." },
        { id: "ultra_crate",  name: "Ultra Crate",       price: 9.99, image: "",                  description: "Die seltensten Items im ganzen Server." }
    ],
    ranks: [
        {
            id: "premium",
            name: "Premium",
            price: 1.99,
            image: "images/image.png",
            description: "Basic Premium Vorteile.",
            features: ["Colored Chat", "Kit Premium", "2 Homes"]
        },
        {
            id: "premium_plus",
            name: "Premium+",
            price: 3.99,
            image: "images/image6.png",
            description: "Erweiterte Vorteile.",
            features: ["Alle Premium Vorteile", "Kit Premium+", "5 Homes", "Fly in Spawn"]
        },
        {
            id: "premium_plus_plus",
            name: "Premium++",
            price: 5.99,
            image: "images/image7.png",
            description: "Maximum Premium Experience.",
            features: ["Alle Premium+ Vorteile", "Kit Premium++", "10 Homes", "Workbench Command"]
        },
        {
            id: "arcade_rank",
            name: "Arcade Rank",
            price: 7.99,
            image: "images/image8.png",
            description: "Der höchste ArcadeSMP Rank.",
            features: ["Alle Premium++ Vorteile", "Kit Arcade", "Unlimited Homes", "Enderchest Command", "Nickname Command"]
        }
    ],
    tools: [
        { id: "drill",        name: "Drill",        price: 5.99, image: "images/image10.png", description: "OP Mining Drill." },
        { id: "sell_axe",     name: "Sell Axe",     price: 7.99, image: "",                  description: "Axt zum Sofortverkauf." },
        { id: "tree_chopper", name: "Tree Chopper", price: 3.99, image: "images/image12.png",description: "Fällt ganze Bäume auf einmal." }
    ],
    coins: [
        { id: "coins_100",  name: "100 Coins",  price: 0.99, image: "images/image.png",  description: "Kleines Startpaket.", amount: 100 },
        { id: "coins_500",  name: "500 Coins",  price: 4.99, image: "images/image2.png", description: "Beliebtes Paket.", amount: 500 },
        { id: "coins_1000", name: "1000 Coins", price: 9.99, image: "images/image3.png", description: "Gutes Preis-Leistungs-Verhältnis.", amount: 1000 },
        { id: "coins_2500", name: "2500 Coins", price: 19.99,image: "images/image4.png", description: "Großes Paket für aktive Spieler.", amount: 2500 },
        { id: "coins_5000", name: "5000 Coins", price: 39.99,image: "",                   description: "Das ultimative Coin-Paket.", amount: 5000 }
    ]
};

// ========= State =========
let cart = JSON.parse(localStorage.getItem("arcadesmp_cart_v2") || "[]");
let currentProduct = null;
let paypalButtonsInstance = null;
let countdownInterval = null;

// DOM Refs
const productsGrid   = document.getElementById("products-grid");
const cartCount      = document.getElementById("cart-count");
const productModal   = document.getElementById("product-modal");
const cartModal      = document.getElementById("cart-modal");
const checkoutModal  = document.getElementById("checkout-modal");
const successModal   = document.getElementById("success-modal");
const loadingOverlay = document.getElementById("loading-overlay");

// ========= Notifications =========
function showNotification(title, message, type = "info", duration = 4000) {
    const container = document.getElementById("notification-container");
    const n = document.createElement("div");
    const id = Date.now();
    n.className = `notification ${type}`;
    n.dataset.id = id;
    n.innerHTML = `
        <div class="notification-header">
            <span class="notification-title">${getNotificationIcon(type)} ${title}</span>
            <button class="notification-close" onclick="closeNotification(${id})">×</button>
        </div>
        <div class="notification-message">${message}</div>
    `;
    container.appendChild(n);
    requestAnimationFrame(() => n.classList.add("show"));
    setTimeout(() => closeNotification(id), duration);
}

function getNotificationIcon(type) {
    const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
    return icons[type] || icons.info;
}

function closeNotification(id) {
    const n = document.querySelector(`.notification[data-id="${id}"]`);
    if (!n) return;
    n.classList.remove("show");
    setTimeout(() => n.remove(), 180);
}

// ========= Init =========
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    attachEvents();
    displayProducts("all");
    updateCartCount();
    initSummerSaleCountdown();
});

// ========= Theme =========
function initTheme() {
    const saved = localStorage.getItem("arcadesmp_theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeIcon(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("arcadesmp_theme", next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById("theme-icon");
    icon.textContent = theme === "dark" ? "☀️" : "🌙";
}

// ========= Products =========
function displayProducts(category) {
    productsGrid.innerHTML = "";

    const addType = (arr, type) => (arr || []).map(p => ({ ...p, type }));

    let list = [];
    if (category === "all" || category === "crates") list = list.concat(addType(shopData.crates, "crate"));
    if (category === "all" || category === "ranks")  list = list.concat(addType(shopData.ranks, "rank"));
    if (category === "all" || category === "tools")  list = list.concat(addType(shopData.tools, "tool"));
    if (category === "all" || category === "coins")  list = list.concat(addType(shopData.coins, "coin"));

    list.forEach(p => productsGrid.appendChild(createProductCard(p)));
}

function getProductIcon(type) {
    switch (type) {
        case "crate": return "fa-box-open";
        case "rank":  return "fa-crown";
        case "tool":  return "fa-tools";
        case "coin":  return "fa-coins";
        default:      return "fa-box";
    }
}

function createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";

    const iconClass = getProductIcon(product.type);

    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image || ""}" alt="${product.name}">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.description || ""}</p>
            ${
                product.features
                    ? `<div class="product-features"><ul>${
                        product.features.slice(0, 3).map(f => `<li>${f}</li>`).join("")
                      }${product.features.length > 3 ? "<li>...mehr</li>" : ""}</ul></div>`
                    : ""
            }
            <div class="product-price">${product.price.toFixed(2)}€</div>
        </div>
    `;

    const imgWrap = card.querySelector(".product-image");
    const img = imgWrap.querySelector("img");
    const icon = imgWrap.querySelector("i");

    icon.style.display = "none";

    if (!product.image) {
        img.style.display = "none";
        imgWrap.classList.add("no-image");
        icon.style.display = "block";
    } else {
        img.onerror = () => {
            img.style.display = "none";
            imgWrap.classList.add("no-image");
            icon.style.display = "block";
        };
    }

    card.addEventListener("click", () => openProductModal(product));
    return card;
}

// ========= Product Modal =========
function openProductModal(product) {
    currentProduct = product;

    const img = document.getElementById("modal-image");
    const wrap = img.parentElement;
    const icon = wrap.querySelector("i");
    wrap.classList.remove("no-image");
    icon.className = `fas ${getProductIcon(product.type)}`;
    icon.style.display = "none";
    img.style.display = "block";

    if (!product.image) {
        img.src = "";
        img.style.display = "none";
        wrap.classList.add("no-image");
        icon.style.display = "block";
    } else {
        img.src = product.image;
        img.alt = product.name;
        img.onerror = () => {
            img.style.display = "none";
            wrap.classList.add("no-image");
            icon.style.display = "block";
        };
    }

    document.getElementById("modal-title").textContent = product.name;
    document.getElementById("modal-description").textContent = product.description || "";
    document.getElementById("modal-price").textContent = `${product.price.toFixed(2)}€`;

    const featuresDiv = document.getElementById("modal-features");
    if (product.features && product.features.length) {
        featuresDiv.innerHTML = `
            <div class="product-features">
                <h4>Features</h4>
                <ul>${product.features.map(f => `<li>${f}</li>`).join("")}</ul>
            </div>`;
    } else {
        featuresDiv.innerHTML = "";
    }

    document.getElementById("quantity").value = 1;
    showModal(productModal);
}

// ========= Cart =========
function addToCart() {
    if (!currentProduct) return;
    const qty = Math.max(1, Math.min(99, parseInt(document.getElementById("quantity").value) || 1));

    const existing = cart.find(i => i.id === currentProduct.id);
    if (existing) existing.quantity += qty;
    else cart.push({ id: currentProduct.id, name: currentProduct.name, price: currentProduct.price, type: currentProduct.type, quantity: qty });

    saveCart();
    updateCartCount();
    hideModal(productModal);
    showNotification("Hinzugefügt", `${currentProduct.name} wurde in den Warenkorb gelegt.`, "success");
}

function saveCart() {
    localStorage.setItem("arcadesmp_cart_v2", JSON.stringify(cart));
}

function updateCartCount() {
    const total = cart.reduce((s, i) => s + i.quantity, 0);
    cartCount.textContent = total;
}

function openCartModal() {
    const cartItems = document.getElementById("cart-items");
    const totalPrice = document.getElementById("total-price");

    if (!cart.length) {
        cartItems.innerHTML = `<p style="text-align:center;color:#9ca3af;font-size:.85rem;">Dein Warenkorb ist leer.</p>`;
        totalPrice.textContent = "0.00€";
    } else {
        cartItems.innerHTML = cart.map(i => `
            <div class="cart-item">
                <div>
                    <div class="cart-item-name">${i.name}</div>
                    <div class="cart-item-price">${i.price.toFixed(2)}€ / Stück</div>
                </div>
                <div class="cart-item-quantity">x${i.quantity}</div>
                <button onclick="removeFromCart('${i.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join("");
        const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        totalPrice.textContent = `${total.toFixed(2)}€`;
    }

    showModal(cartModal);
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    updateCartCount();
    openCartModal();
}

// ========= Checkout =========
function openCheckoutModal() {
    if (!cart.length) {
        showNotification("Warenkorb leer", "Füge zuerst Produkte hinzu.", "warning");
        return;
    }

    const checkoutItems = document.getElementById("checkout-items");
    const checkoutTotal = document.getElementById("checkout-total");

    checkoutItems.innerHTML = cart.map(i => `
        <div class="checkout-item">
            <span>${i.name} x${i.quantity}</span>
            <span>${(i.price * i.quantity).toFixed(2)}€</span>
        </div>
    `).join("");
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    checkoutTotal.textContent = `${total.toFixed(2)}€`;

    // Reset payment UI
    document.getElementById("payment-method").value = "";
    document.getElementById("payment-code").value = "";
    document.getElementById("paypal-hint").classList.add("hidden");
    document.getElementById("paypal-button-container").classList.add("hidden");
    document.getElementById("complete-order-btn").classList.remove("hidden");

    showModal(checkoutModal);
}

// PayPal Buttons
function setupPaypalButtons() {
    const container = document.getElementById("paypal-button-container");
    if (!window.paypal || !container) {
        showNotification("PayPal", "PayPal SDK nicht geladen. Prüfe deine Client ID.", "error");
        return;
    }

    container.innerHTML = "";

    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

    paypalButtonsInstance = paypal.Buttons({
        style: { layout: "horizontal", color: "blue", shape: "pill", label: "paypal" },
        createOrder(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    amount: { currency_code: "EUR", value: total.toFixed(2) }
                }]
            });
        },
        onApprove(data, actions) {
            return actions.order.capture().then(details => {
                completeOrder(details);
            });
        },
        onError(err) {
            console.error("PayPal error:", err);
            showNotification("PayPal Fehler", "Die Zahlung ist fehlgeschlagen. Bitte erneut versuchen.", "error");
        }
    });

    paypalButtonsInstance.render("#paypal-button-container");
}

// Bestellung abschließen (Gift Card oder PayPal)
async function completeOrder(paypalDetails = null) {
    const mcName   = document.getElementById("minecraft-name").value.trim();
    const dcName   = document.getElementById("discord-name").value.trim();
    const country  = document.getElementById("country").value.trim();
    const method   = document.getElementById("payment-method").value;
    const codeIn   = document.getElementById("payment-code");
    let   codeVal  = codeIn.value.trim();

    if (!mcName)   return showNotification("Fehler", "Bitte Minecraft-Namen eingeben.", "error");
    if (!dcName)   return showNotification("Fehler", "Bitte Discord-Namen eingeben.", "error");
    if (!country)  return showNotification("Fehler", "Bitte Land eingeben.", "error");
    if (!method)   return showNotification("Fehler", "Bitte Zahlungsmethode wählen.", "error");

    if (method === "paypal" && !paypalDetails) {
        showNotification("PayPal", "Nutze den PayPal-Button, um die Zahlung zu starten.", "info");
        return;
    }
    if (method !== "paypal" && !codeVal) {
        showNotification("Fehler", "Bitte Gift Card Code eingeben.", "error");
        return;
    }

    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

    const paymentNames = {
        paypal: "PayPal",
        amazon: "Amazon Gift Card",
        google: "Google Play Gift Card",
        paysafe: "Paysafecard",
        steam: "Steam Gift Card",
        apple: "Apple Gift Card"
    };

    if (method === "paypal") {
        if (paypalDetails && paypalDetails.id) {
            codeVal = `PayPal ID: ${paypalDetails.id}`;
        } else if (!codeVal) {
            codeVal = "PayPal – Details im PayPal-Konto einsehbar";
        }
    }

    hideModal(checkoutModal);
    loadingOverlay.classList.add("show");

    const orderData = {
        orderNumber: generateOrderNumber(),
        minecraftName: mcName,
        discordName: dcName,
        country,
        paymentMethod: paymentNames[method] || method,
        paymentCode: codeVal,
        items: cart.slice(),
        total: total.toFixed(2),
        orderTime: new Date().toLocaleString(),
        supportContact: shopData.shop.supportDiscord
    };

    await sendToDiscord(orderData);

    setTimeout(() => {
        loadingOverlay.classList.remove("show");
        showSuccessModal(orderData);
        cart = [];
        saveCart();
        updateCartCount();
    }, 800);
}

// Discord Webhook (optional)
async function sendToDiscord(orderData) {
    const webhook = shopData.shop.discordWebhook;
    if (!webhook || webhook === "YOUR_DISCORD_WEBHOOK_URL_HERE") return;

    const itemsList = orderData.items
        .map(i => `• ${i.name} x${i.quantity} – ${(i.price * i.quantity).toFixed(2)}€`)
        .join("\n");

    const payload = {
        embeds: [{
            title: "Neue Bestellung – ArcadeSMP Store",
            color: 0x22c55e,
            fields: [
                { name: "Bestellnummer", value: orderData.orderNumber, inline: true },
                { name: "Zeit", value: orderData.orderTime, inline: true },
                { name: "Kunde", value: `MC: ${orderData.minecraftName}\nDiscord: ${orderData.discordName}\nLand: ${orderData.country}`, inline: false },
                { name: "Zahlung", value: `${orderData.paymentMethod}\n${orderData.paymentCode}`, inline: false },
                { name: "Artikel", value: itemsList || "Keine Artikel?", inline: false },
                { name: "Gesamt", value: `${orderData.total}€`, inline: true },
                { name: "Support", value: orderData.supportContact || "-", inline: true }
            ]
        }]
    };

    try {
        await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error("Discord Webhook Fehler:", err);
    }
}

// Success Modal
function showSuccessModal(orderData) {
    document.getElementById("order-number").textContent = orderData.orderNumber;
    document.getElementById("success-minecraft-name").textContent = orderData.minecraftName;
    document.getElementById("success-discord-name").textContent = orderData.discordName;
    document.getElementById("success-country").textContent = orderData.country;
    document.getElementById("success-payment-method").textContent = orderData.paymentMethod;
    document.getElementById("success-payment-code").textContent = orderData.paymentCode;
    document.getElementById("success-order-time").textContent = orderData.orderTime;
    document.getElementById("success-total-price").textContent = `${orderData.total}€`;
    document.getElementById("support-discord-name").textContent = orderData.supportContact || "SIGMA";

    const itemsList = document.getElementById("success-items-list");
    itemsList.innerHTML = `
        <ul>
            ${orderData.items.map(i => `<li>${i.name} x${i.quantity} – ${(i.price * i.quantity).toFixed(2)}€</li>`).join("")}
        </ul>
    `;

    showModal(successModal);
}

// ========= Summer Sale Countdown (klein im Hero) =========
function initSummerSaleCountdown() {
    const cfg = shopData.shop.summerSale;
    if (!cfg || !cfg.enabled || !cfg.countdownEnd) return;

    const el = document.getElementById("hero-sale-countdown");
    if (!el) return;

    function update() {
        const target = new Date(cfg.countdownEnd).getTime();
        const now = Date.now();
        const diff = target - now;
        if (diff <= 0) {
            el.textContent = "Aktion beendet";
            clearInterval(countdownInterval);
            return;
        }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        el.textContent = `Endet in ${d}d ${h}h`;
    }

    update();
    countdownInterval = setInterval(update, 60 * 1000);
}

// ========= Helpers =========
function showModal(modal) {
    modal.style.display = "block";
}
function hideModal(modal) {
    modal.style.display = "none";
}
function generateOrderNumber() {
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `ARC-${Date.now().toString().slice(-6)}-${rand}`;
}

// ========= Events =========
function attachEvents() {
    // Navbar Kategorie
    document.querySelectorAll(".nav-link[data-category]").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            displayProducts(link.dataset.category);
        });
    });

    // Filter Buttons
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            displayProducts(btn.dataset.filter);
        });
    });

    // Hero Buttons
    document.getElementById("hero-crates-btn").addEventListener("click", () => {
        displayProducts("crates");
        setActiveFilter("crates");
    });
    document.getElementById("hero-ranks-btn").addEventListener("click", () => {
        displayProducts("ranks");
        setActiveFilter("ranks");
    });
    document.getElementById("featured-cta").addEventListener("click", () => {
        displayProducts("crates");
        setActiveFilter("crates");
    });

    // Cart
    document.getElementById("cart-btn").addEventListener("click", e => {
        e.preventDefault();
        openCartModal();
    });

    // Close buttons
    document.querySelectorAll(".modal .close").forEach(btn => {
        btn.addEventListener("click", () => hideModal(btn.closest(".modal")));
    });

    window.addEventListener("click", e => {
        if (e.target.classList.contains("modal")) hideModal(e.target);
    });

    // Quantity
    document.getElementById("decrease-qty").addEventListener("click", () => {
        const input = document.getElementById("quantity");
        const v = parseInt(input.value) || 1;
        if (v > 1) input.value = v - 1;
    });
    document.getElementById("increase-qty").addEventListener("click", () => {
        const input = document.getElementById("quantity");
        const v = parseInt(input.value) || 1;
        if (v < 99) input.value = v + 1;
    });

    document.getElementById("add-to-cart-btn").addEventListener("click", addToCart);
    document.getElementById("checkout-btn").addEventListener("click", openCheckoutModal);

    // Theme
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

    // Payment method
    document.getElementById("payment-method").addEventListener("change", e => {
        const val = e.target.value;
        const hint = document.getElementById("paypal-hint");
        const container = document.getElementById("paypal-button-container");
        const completeBtn = document.getElementById("complete-order-btn");
        const codeInput = document.getElementById("payment-code");
        const codeGroup = document.getElementById("payment-code-group");

        if (val === "paypal") {
            hint.classList.remove("hidden");
            container.classList.remove("hidden");
            completeBtn.classList.add("hidden");
            codeInput.placeholder = "PayPal Referenz (optional)";
            codeGroup.classList.remove("hidden");
            setupPaypalButtons();
        } else if (val) {
            hint.classList.add("hidden");
            container.classList.add("hidden");
            completeBtn.classList.remove("hidden");
            codeInput.placeholder = "Gift Card Code eingeben";
            codeGroup.classList.remove("hidden");
        } else {
            hint.classList.add("hidden");
            container.classList.add("hidden");
            completeBtn.classList.remove("hidden");
        }
    });

    // Complete Order (Gift Card)
    document.getElementById("complete-order-btn").addEventListener("click", () => {
        const method = document.getElementById("payment-method").value;
        if (method === "paypal") {
            showNotification("Info", "Bitte PayPal-Button verwenden.", "info");
            return;
        }
        completeOrder(null);
    });
}

function setActiveFilter(filter) {
    document.querySelectorAll(".filter-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.filter === filter);
    });
}
