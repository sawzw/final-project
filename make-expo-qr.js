const fs = require('fs');
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
console.log(url);
