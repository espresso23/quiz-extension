// generate-icons.js - Auto-generate PNG icons
// This creates a retro floppy-disk style icon (no AI visual cues).

const fs = require('fs');
const path = require('path');

// Minimal PNG encoder (no dependencies needed)
function createPNG(width, height) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // Create pixel data (retro sunset gradient + floppy disk)
  const rowSize = width * 3 + 1; // +1 for filter byte
  const rawData = Buffer.alloc(height * rowSize);

  const palette = {
    bgStart: [255, 126, 95],
    bgEnd: [254, 180, 123],
    frameShade: [36, 20, 60],
    diskBody: [34, 46, 66],
    diskEdge: [67, 83, 109],
    shutter: [161, 176, 194],
    shutterDark: [104, 120, 140],
    label: [245, 236, 212],
    labelAccent: [233, 103, 86],
    notch: [22, 31, 47],
    led: [238, 84, 84]
  };

  function setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const rowStart = y * rowSize;
    const pixelStart = rowStart + 1 + x * 3;
    rawData[pixelStart] = color[0];
    rawData[pixelStart + 1] = color[1];
    rawData[pixelStart + 2] = color[2];
  }

  function blendPixel(x, y, color, alpha) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const rowStart = y * rowSize;
    const pixelStart = rowStart + 1 + x * 3;
    rawData[pixelStart] = Math.round(rawData[pixelStart] * (1 - alpha) + color[0] * alpha);
    rawData[pixelStart + 1] = Math.round(rawData[pixelStart + 1] * (1 - alpha) + color[1] * alpha);
    rawData[pixelStart + 2] = Math.round(rawData[pixelStart + 2] * (1 - alpha) + color[2] * alpha);
  }

  function lerpColor(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function fillRoundedRect(x, y, w, h, r, color, alpha = 1) {
    const r2 = r * r;
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        const dx = px < x + r ? x + r - px : (px > x + w - r - 1 ? px - (x + w - r - 1) : 0);
        const dy = py < y + r ? y + r - py : (py > y + h - r - 1 ? py - (y + h - r - 1) : 0);
        if (dx * dx + dy * dy <= r2) {
          if (alpha >= 1) setPixel(px, py, color);
          else blendPixel(px, py, color, alpha);
        }
      }
    }
  }

  function fillRect(x, y, w, h, color, alpha = 1) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        if (alpha >= 1) setPixel(px, py, color);
        else blendPixel(px, py, color, alpha);
      }
    }
  }

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    rawData[rowStart] = 0; // No filter

    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;

      // Background gradient with slight radial lift toward top-left.
      const t = (x + y) / (width + height);
      const base = lerpColor(palette.bgStart, palette.bgEnd, t);
      const dx = x - width * 0.2;
      const dy = y - height * 0.2;
      const dist = Math.sqrt(dx * dx + dy * dy) / (Math.sqrt(width * width + height * height) * 0.7);
      const glow = Math.max(0, 1 - dist) * 0.18;

      rawData[pixelStart] = Math.min(255, Math.round(base[0] + 255 * glow));
      rawData[pixelStart + 1] = Math.min(255, Math.round(base[1] + 255 * glow));
      rawData[pixelStart + 2] = Math.min(255, Math.round(base[2] + 255 * glow));
    }
  }

  // Slight rounded frame to help tiny sizes stay legible.
  const frameRadius = Math.max(2, Math.round(width * 0.2));
  fillRoundedRect(0, 0, width, height, frameRadius, palette.frameShade, 0.08);

  // Retro scanlines for subtle 80s texture.
  for (let y = 2; y < height; y += 4) {
    fillRect(0, y, width, 1, [255, 255, 255], 0.06);
  }

  // Floppy disk body.
  const diskX = Math.round(width * 0.18);
  const diskY = Math.round(height * 0.15);
  const diskW = Math.round(width * 0.64);
  const diskH = Math.round(height * 0.7);
  const diskR = Math.max(2, Math.round(width * 0.09));

  fillRoundedRect(diskX + Math.max(1, Math.round(width * 0.02)), diskY + Math.max(1, Math.round(height * 0.02)), diskW, diskH, diskR, [0, 0, 0], 0.18);
  fillRoundedRect(diskX, diskY, diskW, diskH, diskR, palette.diskBody);
  fillRoundedRect(diskX + 1, diskY + 1, diskW - 2, diskH - 2, Math.max(1, diskR - 1), palette.diskEdge, 0.2);

  // Metal shutter area.
  const shutterX = diskX + Math.round(diskW * 0.13);
  const shutterY = diskY + Math.round(diskH * 0.11);
  const shutterW = Math.round(diskW * 0.74);
  const shutterH = Math.max(2, Math.round(diskH * 0.22));
  fillRoundedRect(shutterX, shutterY, shutterW, shutterH, Math.max(1, Math.round(width * 0.03)), palette.shutter);
  fillRect(shutterX, shutterY + Math.max(1, Math.round(shutterH * 0.45)), shutterW, Math.max(1, Math.round(shutterH * 0.2)), palette.shutterDark, 0.75);

  // Label area.
  const labelX = diskX + Math.round(diskW * 0.13);
  const labelY = diskY + Math.round(diskH * 0.43);
  const labelW = Math.round(diskW * 0.74);
  const labelH = Math.round(diskH * 0.36);
  fillRoundedRect(labelX, labelY, labelW, labelH, Math.max(1, Math.round(width * 0.03)), palette.label);
  fillRect(labelX + 1, labelY + Math.max(1, Math.round(labelH * 0.24)), labelW - 2, Math.max(1, Math.round(labelH * 0.1)), palette.labelAccent, 0.9);
  fillRect(labelX + 1, labelY + Math.max(1, Math.round(labelH * 0.52)), labelW - 2, Math.max(1, Math.round(labelH * 0.07)), palette.diskEdge, 0.4);

  // Write-protect notch and tiny LED detail.
  const notchW = Math.max(2, Math.round(diskW * 0.14));
  const notchH = Math.max(2, Math.round(diskH * 0.13));
  fillRect(diskX + diskW - notchW - 1, diskY + 1, notchW, notchH, palette.notch);

  const ledSize = Math.max(1, Math.round(width * 0.05));
  fillRect(diskX + Math.round(diskW * 0.16), diskY + diskH - Math.round(diskH * 0.13), ledSize, ledSize, palette.led);

  // Compress pixel data (simple deflate - zlib)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);

  // IDAT chunk
  const idatData = compressed;

  // Build PNG
  const chunks = [
    buildChunk('IHDR', ihdrData),
    buildChunk('IDAT', idatData),
    buildChunk('IEND', Buffer.alloc(0))
  ];

  return Buffer.concat([signature, ...chunks]);
}

function buildChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  
  // CRC32 calculation
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  const table = getCRC32Table();

  for (let i = 0; i < buffer.length; i++) {
    const index = (crc ^ buffer[i]) & 0xFF;
    crc = (crc >>> 8) ^ table[index];
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

let crcTable = null;
function getCRC32Table() {
  if (crcTable) return crcTable;

  crcTable = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c >>> 0;
  }

  return crcTable;
}

// Generate icons
const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of sizes) {
  const png = createPNG(size, size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${size}x${size})`);
}

console.log('\nIcons generated successfully!');
console.log('Reload the extension at chrome://extensions/');
