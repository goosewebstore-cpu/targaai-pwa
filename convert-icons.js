const sharp = require('sharp');
const sizes = [192, 512];
async function main() {
  for (const size of sizes) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size*0.23)}" fill="#007AFF"/>
      <text x="${size/2}" y="${Math.round(size*0.66)}" font-family="sans-serif" font-size="${Math.round(size*0.5)}" font-weight="700" fill="white" text-anchor="middle">T</text>
    </svg>`;
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`icon-${size}.png`);
    console.log(`Created icon-${size}.png`);
  }
}
main().catch(console.error);
