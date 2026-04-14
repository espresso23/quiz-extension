// generate-icons.js - Auto-generate PNG icons
// This creates gradient icons with "AI" text using raw PNG encoding

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

  // Create pixel data (blue-purple gradient with white "AI" text approximation)
  const rowSize = width * 3 + 1; // +1 for filter byte
  const rawData = Buffer.alloc(height * rowSize);

  // Colors
  const blue = [74, 144, 217];   // #4a90d9
  const purple = [108, 92, 231];  // #6c5ce7

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    rawData[rowStart] = 0; // No filter

    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;

      // Gradient from blue (top-left) to purple (bottom-right)
      const t = (x + y) / (width + height);
      rawData[pixelStart] = Math.round(blue[0] + (purple[0] - blue[0]) * t);
      rawData[pixelStart + 1] = Math.round(blue[1] + (purple[1] - blue[1]) * t);
      rawData[pixelStart + 2] = Math.round(blue[2] + (purple[2] - blue[2]) * t);
    }
  }

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
