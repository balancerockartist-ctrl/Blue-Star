/**
 * FreePay QR Store – Frontend JavaScript
 *
 * Handles view navigation, product display, checkout flow (credit → pay),
 * QR code generation, and G.L.S. stats display.
 * Communicates with the FreePay REST API served by server.js.
 */

"use strict";

// ── Sample product catalogue ──────────────────────────────────────────────
const PRODUCTS = [
  { itemId: "item-001", name: "Fresh Bread Loaf",    price: 2,   emoji: "🍞", description: "Whole-grain artisan loaf, baked daily." },
  { itemId: "item-002", name: "Winter Jacket",       price: 45,  emoji: "🧥", description: "Warm, weatherproof jacket for all sizes." },
  { itemId: "item-003", name: "Reusable Water Bottle", price: 8, emoji: "🍶", description: "BPA-free, keeps drinks cold for 24 hours." },
  { itemId: "item-004", name: "Solar Lantern",       price: 12,  emoji: "🔦", description: "USB-rechargeable, 200-lumen output." },
  { itemId: "item-005", name: "Seeds Pack (Veggies)",price: 3,   emoji: "🌱", description: "Mixed vegetable seeds for a small garden." },
  { itemId: "item-006", name: "First Aid Kit",       price: 15,  emoji: "🩺", description: "Basic essentials for home emergencies." },
];

// ── Utility helpers ───────────────────────────────────────────────────────

/** @returns {string} current FreePay user ID from the store input, or empty */
function getUserId() {
  return (document.getElementById("userIdInput").value || "").trim();
}

let toastTimer = null;
/**
 * Show a brief toast notification.
 * @param {string}  msg
 * @param {"ok"|"error"} [type="ok"]
 */
function showToast(msg, type = "ok") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast${type === "error" ? " error" : ""}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

/**
 * Switch to the named view ("store" | "checkout" | "stats").
 * @param {string} name
 */
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`${name}View`).classList.add("active");
}

// ── Balance refresh ───────────────────────────────────────────────────────

async function refreshBalance(userId) {
  if (!userId) return;
  try {
    const res = await fetch(`/api/balance/${encodeURIComponent(userId)}`);
    const data = await res.json();
    document.getElementById("walletBalance").textContent = data.balance;
  } catch {
    // non-critical; silently ignore network errors for balance display
  }
}

// ── Product grid ──────────────────────────────────────────────────────────

function renderProducts() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";
  PRODUCTS.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-img" aria-hidden="true">${product.emoji}</div>
      <div class="product-body">
        <div class="product-name">${escapeHtml(product.name)}</div>
        <div class="product-desc">${escapeHtml(product.description)}</div>
        <div class="product-price">${product.price} ₣P</div>
        <div class="product-actions">
          <button class="btn btn-secondary qr-btn"
                  data-item='${JSON.stringify(product)}'>QR Code</button>
          <button class="btn btn-primary buy-btn"
                  data-item='${JSON.stringify(product)}'>Buy</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

/** Minimal HTML escaping to prevent XSS from product data. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Checkout flow ─────────────────────────────────────────────────────────

/** Currently selected product for checkout. */
let currentItem = null;

/**
 * Populate the checkout view with the selected item and switch to it.
 * Before doing so, the system issues a FreePay credit equal to the item price
 * so the user can immediately pay (the QR Store "issue a credit" step).
 *
 * @param {Object} item
 */
async function startCheckout(item) {
  const userId = getUserId();
  if (!userId) {
    showToast("Please enter your FreePay ID first.", "error");
    return;
  }

  // Issue the credit for this item
  try {
    const creditRes = await fetch("/api/credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount: item.price, itemId: item.itemId }),
    });
    if (!creditRes.ok) {
      const err = await creditRes.json();
      showToast(`Credit error: ${err.error}`, "error");
      return;
    }
    showToast(`${item.price} ₣P credited to your wallet!`);
  } catch {
    showToast("Network error while issuing credit.", "error");
    return;
  }

  await refreshBalance(userId);

  currentItem = item;
  document.getElementById("checkoutUserId").value = userId;
  document.getElementById("tipInput").value = "0";

  const display = document.getElementById("checkoutItemDisplay");
  display.innerHTML = `
    <div class="checkout-item-name">${escapeHtml(item.emoji)} ${escapeHtml(item.name)}</div>
    <div class="checkout-item-price">${item.price} ₣P</div>`;

  updateCheckoutSummary();
  document.getElementById("receipt").hidden = true;
  showView("checkout");
}

/** Recalculate and display price + tip + total. */
function updateCheckoutSummary() {
  if (!currentItem) return;
  const tip = Math.max(0, parseFloat(document.getElementById("tipInput").value) || 0);
  const total = currentItem.price + tip;
  const el = document.getElementById("checkoutSummary");
  el.innerHTML = `
    <div class="row"><span>Item price</span><span>${currentItem.price} ₣P</span></div>
    <div class="row"><span>Tip</span><span>${tip.toFixed(2)} ₣P</span></div>
    <div class="row total"><span>Total</span><span>${total.toFixed(2)} ₣P</span></div>`;
}

/** Execute the FreePay payment. */
async function processPay() {
  if (!currentItem) {
    showToast("No item selected.", "error");
    return;
  }
  const userId = (document.getElementById("checkoutUserId").value || "").trim();
  if (!userId) {
    showToast("Please enter your FreePay ID.", "error");
    return;
  }
  const tip = Math.max(0, parseFloat(document.getElementById("tipInput").value) || 0);

  try {
    const res = await fetch("/api/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, itemId: currentItem.itemId, price: currentItem.price, tip }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(`Payment failed: ${data.error}`, "error");
      return;
    }
    showReceipt(data);
    await refreshBalance(userId);
  } catch {
    showToast("Network error during payment.", "error");
  }
}

/** Render a success receipt. */
function showReceipt(data) {
  const el = document.getElementById("receipt");
  const details = document.getElementById("receiptDetails");
  details.innerHTML = `
    <div class="row"><span>Transaction ID</span><span>${escapeHtml(data.transactionId)}</span></div>
    <div class="row"><span>Item price</span><span>${data.price} ₣P</span></div>
    <div class="row"><span>Tip</span><span>${data.tip} ₣P</span></div>
    <div class="row"><span>Total paid</span><span>${data.total} ₣P</span></div>
    <div class="row"><span>New balance</span><span>${data.newBalance} ₣P</span></div>`;
  el.hidden = false;
}

// ── QR Code modal ─────────────────────────────────────────────────────────

async function showQRCode(item) {
  const params = new URLSearchParams({
    itemId: item.itemId,
    name: item.name,
    price: String(item.price),
  });
  try {
    const res = await fetch(`/api/qr?${params}`);
    const data = await res.json();
    if (!res.ok) {
      showToast(`QR error: ${data.error}`, "error");
      return;
    }
    document.getElementById("qrModalTitle").textContent = `QR – ${item.name}`;
    document.getElementById("qrModalImg").src = data.qrCode;
    document.getElementById("qrModal").hidden = false;
  } catch {
    showToast("Could not generate QR code.", "error");
  }
}

// ── G.L.S. Stats ──────────────────────────────────────────────────────────

async function loadStats(userId) {
  const params = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  try {
    const res = await fetch(`/api/stats${params}`);
    const data = await res.json();
    document.getElementById("statCredits").textContent = data.totalCreditsIssued;
    document.getElementById("statTips").textContent = data.totalTipsCollected.toFixed(2);
    document.getElementById("statTxCount").textContent = data.transactionCount;
  } catch {
    showToast("Could not load stats.", "error");
  }
}

async function loadTransactions(userId) {
  if (!userId) return;
  try {
    const res = await fetch(`/api/transactions/${encodeURIComponent(userId)}`);
    const data = await res.json();
    const list = document.getElementById("txList");
    if (!data.transactions || data.transactions.length === 0) {
      list.innerHTML = '<p class="placeholder-text">No transactions found.</p>';
      return;
    }
    list.innerHTML = data.transactions
      .slice()
      .reverse()
      .map((tx) => {
        const amount =
          tx.type === "credit"
            ? `+${tx.amount} ₣P`
            : `-${tx.total} ₣P`;
        return `
          <div class="tx-row">
            <span class="tx-type ${tx.type}">${tx.type}</span>
            <span>${escapeHtml(tx.itemId || "—")}</span>
            <span class="tx-amount">${amount}</span>
            <span class="tx-time">${new Date(tx.timestamp).toLocaleString()}</span>
          </div>`;
      })
      .join("");
  } catch {
    showToast("Could not load transactions.", "error");
  }
}

// ── Event wiring ──────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  renderProducts();

  // Navigation
  document.getElementById("showStoreBtn").addEventListener("click", () => showView("store"));
  document.getElementById("showCheckoutBtn").addEventListener("click", () => showView("checkout"));
  document.getElementById("showStatsBtn").addEventListener("click", () => {
    showView("stats");
    loadStats();
  });

  // Balance refresh
  document.getElementById("refreshBalanceBtn").addEventListener("click", () => {
    refreshBalance(getUserId());
  });

  // Product grid delegated clicks
  document.getElementById("productGrid").addEventListener("click", (e) => {
    const buyBtn = e.target.closest(".buy-btn");
    const qrBtn  = e.target.closest(".qr-btn");
    if (buyBtn) {
      const item = JSON.parse(buyBtn.dataset.item);
      startCheckout(item);
    }
    if (qrBtn) {
      const item = JSON.parse(qrBtn.dataset.item);
      showQRCode(item);
    }
  });

  // Checkout
  document.getElementById("tipInput").addEventListener("input", updateCheckoutSummary);
  document.getElementById("payBtn").addEventListener("click", processPay);
  document.getElementById("backToStoreBtn").addEventListener("click", () => showView("store"));

  // QR modal
  document.getElementById("closeQrModal").addEventListener("click", () => {
    document.getElementById("qrModal").hidden = true;
  });
  document.getElementById("qrModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("qrModal")) {
      document.getElementById("qrModal").hidden = true;
    }
  });

  // Stats
  document.getElementById("refreshStatsBtn").addEventListener("click", () => loadStats());
  document.getElementById("filterStatsBtn").addEventListener("click", () => {
    const uid = (document.getElementById("statUserIdInput").value || "").trim();
    loadStats(uid);
    loadTransactions(uid);
  });
});
