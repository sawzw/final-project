const fs = require('fs');
const zlib = require('zlib');
const QRCode = require('./node_modules/qrcode-terminal/vendor/QRCode');
const QRErrorCorrectLevel = require('./node_modules/qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel');

const url = process.argv[2] || 'exp://192.168.100.62:8082';
const qr = new QRCode(-1, QRErrorCorrectLevel.L);
qr.addData(url);
qr.make();

const modules = qr.modules;
const moduleCount = qr.getModuleCount();
const quiet = 4;
const cell = 16;
const size = (moduleCount + quiet * 2) * cell;

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
svg += '<rect width="100%" height="100%" fill="white"/>';

for (let row = 0; row < moduleCount; row += 1) {
  for (let col = 0; col < moduleCount; col += 1) {
    if (modules[row][col]) {
      svg += `<rect x="${(col + quiet) * cell}" y="${(row + quiet) * cell}" width="${cell}" height="${cell}" fill="black"/>`;
    }
  }
}

svg += '</svg>';

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Expo QR</title>
    <style>
      body {
        margin: 0;
        display: grid;
        place-items: center;
        min-height: 100vh;
        background: #f4f4f4;
        font-family: Arial, sans-serif;
      }
      .wrap {
        text-align: center;
      }
      svg {
        width: min(86vw, 620px);
        height: auto;
        background: white;
        padding: 20px;
        box-shadow: 0 8px 30px #0002;
      }
      .url {
        margin-top: 18px;
        font-size: 22px;
        font-weight: 700;
        color: #111;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      ${svg}
      <div class="url">${url}</div>
    </div>
  </body>
</html>
`;

fs.writeFileSync('expo-qr.svg', svg);
fs.writeFileSync('expo-qr.html', html);

// Write a portable PNG copy too, so the QR code can be opened directly in
// image viewers without needing an SVG-capable browser.
const pngPixels = Buffer.alloc((size * 4 + 1) * size);
for (let y = 0; y < size; y += 1) {
  const rowOffset = y * (size * 4 + 1);
  pngPixels[rowOffset] = 0; // PNG filter: none
  for (let x = 0; x < size; x += 1) {
    const qrRow = Math.floor(y / cell) - quiet;
    const qrCol = Math.floor(x / cell) - quiet;
    const dark = qrRow >= 0 && qrRow < moduleCount && qrCol >= 0 && qrCol < moduleCount && modules[qrRow][qrCol];
    const pixelOffset = rowOffset + 1 + x * 4;
    const color = dark ? 0 : 255;
    pngPixels[pixelOffset] = color;
    pngPixels[pixelOffset + 1] = color;
    pngPixels[pixelOffset + 2] = color;
    pngPixels[pixelOffset + 3] = 255;
  }
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});
const crc32 = (buffer) => {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
};
const pngChunk = (type, data) => {
  const label = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([label, data])));
  return Buffer.concat([length, label, data, checksum]);
};
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8; // bit depth
header[9] = 6; // RGBA
fs.writeFileSync('expo-qr.png', Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  pngChunk('IHDR', header),
  pngChunk('IDAT', zlib.deflateSync(pngPixels)),
  pngChunk('IEND', Buffer.alloc(0)),
]));
console.log(url);
