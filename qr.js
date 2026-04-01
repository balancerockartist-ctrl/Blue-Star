/**
 * QR Code helper for FreePay
 *
 * Generates a QR code data-URL that encodes a FreePay payment request.
 * Scanning the code (e.g. with Google Lens) opens the FreePay checkout
 * flow pre-filled with the item details.
 */

"use strict";

const QRCode = require("qrcode");

/**
 * Build the FreePay deep-link URL that is embedded in the QR code.
 * @param {Object} item
 * @param {string} item.itemId
 * @param {string} item.name
 * @param {number} item.price
 * @param {string} [item.imageUrl]
 * @param {string} baseUrl - The public origin of the FreePay server (e.g. "https://freepay.example.com")
 * @returns {string}
 */
function buildPaymentUrl(item, baseUrl) {
  const url = new URL("/checkout", baseUrl);
  url.searchParams.set("itemId", item.itemId);
  url.searchParams.set("name", item.name);
  url.searchParams.set("price", String(item.price));
  if (item.imageUrl) {
    url.searchParams.set("imageUrl", item.imageUrl);
  }
  return url.toString();
}

/**
 * Generate a QR code as a base-64 PNG data-URL for a given item.
 *
 * @param {Object} item         - Item to encode (see buildPaymentUrl)
 * @param {string} baseUrl      - Public origin of the FreePay server
 * @param {Object} [qrOptions]  - Optional qrcode library options (errorCorrectionLevel, width, …)
 * @returns {Promise<string>}   - Resolves with a data:image/png;base64,… string
 */
async function generateQRCode(item, baseUrl, qrOptions = {}) {
  if (!item || !item.itemId || !item.name || typeof item.price !== "number") {
    throw new Error(
      "generateQRCode: item must have itemId, name, and a numeric price"
    );
  }
  if (!baseUrl || typeof baseUrl !== "string") {
    throw new Error("generateQRCode: baseUrl must be a non-empty string");
  }

  const paymentUrl = buildPaymentUrl(item, baseUrl);
  const options = { errorCorrectionLevel: "M", width: 256, ...qrOptions };
  return QRCode.toDataURL(paymentUrl, options);
}

module.exports = { buildPaymentUrl, generateQRCode };
