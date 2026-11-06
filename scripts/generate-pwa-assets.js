// Script untuk generate semua icon & splash screen PWA dari satu file icon
// Jalankan: node generate-pwa-assets.js

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_ICON = path.join(__dirname, '../assets/icon.png');
const ICONS_DIR = path.join(__dirname, '../public/icons');
const SPLASH_DIR = path.join(__dirname, '../public/splash');

// Pastikan direktori ada
fs.mkdirSync(ICONS_DIR, { recursive: true });
fs.mkdirSync(SPLASH_DIR, { recursive: true });

// Ukuran icon yang dibutuhkan
const ICON_SIZES = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512];

// Ukuran splash screen iOS (portrait)
const SPLASH_SIZES = [
  { width: 1320, height: 2868, name: 'splash-1320x2868' },  // iPhone 16 Pro Max
  { width: 1179, height: 2556, name: 'splash-1179x2556' },  // iPhone 15 Pro / 14 Pro
  { width: 1170, height: 2532, name: 'splash-1170x2532' },  // iPhone 14 / 13 / 12
  { width: 750,  height: 1334, name: 'splash-750x1334'  },  // iPhone SE / 8 / 7
  { width: 2048, height: 2732, name: 'splash-2048x2732' },  // iPad Pro 12.9"
  { width: 1668, height: 2388, name: 'splash-1668x2388' },  // iPad Pro 11" / Air 10.9"
  { width: 1668, height: 2224, name: 'splash-1668x2224' },  // iPad Mini / Air 10.5"
  { width: 1536, height: 2048, name: 'splash-1536x2048' },  // iPad 10.2"
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');
  for (const size of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(SOURCE_ICON)
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`  ✅ icon-${size}x${size}.png`);
  }
}

async function generateSplashScreens() {
  console.log('\n🖼️  Generating iOS splash screens...');

  // Load icon dan resize ke 200px untuk splash center
  const iconBuffer = await sharp(SOURCE_ICON)
    .resize(200, 200, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toBuffer();

  for (const splash of SPLASH_SIZES) {
    const outputPath = path.join(SPLASH_DIR, `${splash.name}.png`);

    // Buat background gelap
    const background = await sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 }
      }
    })
    .composite([{
      input: iconBuffer,
      gravity: 'center',
    }])
    .png()
    .toFile(outputPath);

    console.log(`  ✅ ${splash.name}.png (${splash.width}x${splash.height})`);
  }
}

async function main() {
  try {
    if (!fs.existsSync(SOURCE_ICON)) {
      throw new Error(`Source icon tidak ditemukan: ${SOURCE_ICON}`);
    }
    await generateIcons();
    await generateSplashScreens();
    console.log('\n✨ Semua aset PWA berhasil dibuat!');
    console.log(`   📁 Icons: ${ICONS_DIR}`);
    console.log(`   📁 Splash: ${SPLASH_DIR}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
