#!/usr/bin/env node

/**
 * add-wifi-label.js
 *
 * Adds two labeled rows (Network / Password) below an existing Wi-Fi QR code
 * image and writes a new PNG, leaving the original untouched.
 *
 * Usage:
 *   node add-wifi-label.js <qr-image.png> <ssid> <password> [-o out.png] [-c color]
 */

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const { Canvas, loadImage, FontLibrary } = require('skia-canvas');

/**
 * Pick a sans-serif font family that actually exists on this machine so text
 * renders instead of falling back to a missing-glyph box.
 */
function resolveFontFamily() {
  const preferred = ['Helvetica Neue', 'Helvetica', 'Arial', 'DejaVu Sans', 'Liberation Sans'];
  const available = new Set(FontLibrary.families);
  for (const family of preferred) {
    if (available.has(family)) return family;
  }
  return 'sans-serif';
}

/**
 * Detect the dominant module color of the QR code (the non-background ink),
 * so the label text can be tinted to match. Returns a CSS rgb() string.
 */
function detectQrColor(image) {
  const canvas = new Canvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);

  const counts = new Map();
  // Sample every other pixel — plenty for finding the dominant color, and fast.
  for (let i = 0; i < data.length; i += 8) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;                 // skip transparent
    if (r > 235 && g > 235 && b > 235) continue; // skip white/near-white background
    // Quantize into buckets of 16 so anti-aliased edges collapse onto the solid color.
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  if (counts.size === 0) return '#000000';
  let bestKey = null;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }
  const [qr, qg, qb] = bestKey.split(',').map((n) => (parseInt(n, 10) << 4) + 8);
  return `rgb(${qr}, ${qg}, ${qb})`;
}

/**
 * Compose the QR image with a caption strip holding two labeled rows.
 */
async function buildLabeledImage({ imagePath, ssid, password, output, color }) {
  const qr = await loadImage(imagePath);
  const W = qr.width;
  const H = qr.height;

  const textColor = color === 'auto' ? detectQrColor(qr) : color;
  const labelColor = '#555555';
  const family = resolveFontFamily();

  const rows = [
    { label: 'Network: ', value: ssid },
    { label: 'Password: ', value: password },
  ];

  const marginX = Math.round(W * 0.06);
  const maxTextWidth = W - marginX * 2;

  // Start from a comfortable size, then shrink uniformly until the widest row fits.
  let fontSize = Math.round(W * 0.055);
  const measure = new Canvas(1, 1).getContext('2d');
  const widthOf = (row, size) => {
    measure.font = `${size}px "${family}"`;
    const labelW = measure.measureText(row.label).width;
    measure.font = `bold ${size}px "${family}"`;
    const valueW = measure.measureText(row.value).width;
    return labelW + valueW;
  };
  while (fontSize > 12) {
    const widest = Math.max(...rows.map((r) => widthOf(r, fontSize)));
    if (widest <= maxTextWidth) break;
    fontSize -= 1;
  }

  const lineGap = Math.round(fontSize * 0.5);
  const padTop = Math.round(fontSize * 0.9);
  const padBottom = Math.round(fontSize * 0.9);
  const stripHeight = padTop + fontSize + lineGap + fontSize + padBottom;

  const canvas = new Canvas(W, H + stripHeight);
  const ctx = canvas.getContext('2d');

  // White backdrop so transparent QR PNGs still print cleanly.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H + stripHeight);
  ctx.drawImage(qr, 0, 0);

  // Subtle separator between the QR and the caption.
  ctx.strokeStyle = '#e6e6e6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX, H + 0.5);
  ctx.lineTo(W - marginX, H + 0.5);
  ctx.stroke();

  ctx.textBaseline = 'top';
  rows.forEach((row, idx) => {
    const y = H + padTop + idx * (fontSize + lineGap);
    ctx.font = `${fontSize}px "${family}"`;
    const labelW = ctx.measureText(row.label).width;
    ctx.font = `bold ${fontSize}px "${family}"`;
    const valueW = ctx.measureText(row.value).width;
    const startX = Math.round((W - (labelW + valueW)) / 2);

    ctx.font = `${fontSize}px "${family}"`;
    ctx.fillStyle = labelColor;
    ctx.fillText(row.label, startX, y);

    ctx.font = `bold ${fontSize}px "${family}"`;
    ctx.fillStyle = textColor;
    ctx.fillText(row.value, startX + labelW, y);
  });

  const buffer = await canvas.toBuffer('png');
  fs.writeFileSync(output, buffer);
  return { output, textColor };
}

function defaultOutput(imagePath) {
  const dir = path.dirname(imagePath);
  const ext = path.extname(imagePath);
  const base = path.basename(imagePath, ext);
  return path.join(dir, `${base}-labeled.png`);
}

const program = new Command();
program
  .name('add-wifi-label')
  .description('Add SSID and password labels below a Wi-Fi QR code image')
  .argument('<image>', 'path to the QR code PNG')
  .argument('<ssid>', 'Wi-Fi network name (SSID)')
  .argument('<password>', 'Wi-Fi password')
  .option('-o, --output <path>', 'output image path (default: <name>-labeled.png)')
  .option('-c, --color <color>', 'text color: "auto" (match QR), a hex code, or a CSS name', 'auto')
  .action(async (image, ssid, password, options) => {
    if (!fs.existsSync(image)) {
      console.error(`Error: image not found: ${image}`);
      process.exit(1);
    }
    const output = options.output || defaultOutput(image);
    try {
      const result = await buildLabeledImage({
        imagePath: image,
        ssid,
        password,
        output,
        color: options.color,
      });
      console.log(`✅ Wrote ${result.output} (text color ${result.textColor})`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
