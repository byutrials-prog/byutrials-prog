import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, authReady } from '../src/firebaseConfig.js';
import { collection, doc, writeBatch, Timestamp, getDocs } from 'firebase/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const csvPath = 'C:/Users/hp/.gemini/antigravity/brain/f8e528a4-9026-4422-b06b-a0962c66c016/.user_uploaded/media_1793992814789_f09abb20.csv';
const csvLines = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/).slice(1);

// Load previous mapping from update-stock-opname.js
const scriptContent = fs.readFileSync(path.resolve(__dirname, 'update-stock-opname.js'), 'utf8');
const opnameMatch = scriptContent.match(/const opnameItems = (\[[\s\S]*?\]);\r?\n\r?\nasync function run/);
const opnameItems = eval(opnameMatch[1]);

// Load current App.js INITIAL_PRODUCTS
const appPath = path.resolve(__dirname, '../App.js');
const appContent = fs.readFileSync(appPath, 'utf8');
const startMarker = 'const INITIAL_PRODUCTS = ';
const startIndex = appContent.indexOf(startMarker);
const endMarker = 'const INITIAL_TRANSACTIONS = ';
const endIndex = appContent.indexOf(endMarker);
const arrayStr = appContent.substring(startIndex + startMarker.length, endIndex).trim().replace(/;$/, '');
const currentProducts = JSON.parse(arrayStr);

const currentMap = new Map();
currentProducts.forEach(p => currentMap.set(p.id, p));

const updatedProducts = [];

for (let i = 0; i < 125; i++) {
  const op = opnameItems[i];
  const parts = csvLines[i].split(';');
  const name = parts[1].trim();
  const sellingPrice = Number(parts[2]);
  const costPrice = Number(parts[3]);
  const stock = Number(parts[4]);

  const curr = currentMap.get(op.pid) || {};

  const updated = {
    id: op.pid,
    name: name,
    category: curr.category || op.appCat || 'Vodka & Spirits',
    price: sellingPrice, // Harga Jual dari CSV
    hpp: costPrice,      // Harga Modal dari CSV
    stock: stock,        // Stok dari PDF/CSV
    minStock: curr.minStock !== undefined ? curr.minStock : 5,
    barcode: curr.barcode || op.barcode || `8991000${String(i + 1).padStart(4, '0')}`,
    image: curr.image || 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80'
  };

  updatedProducts.push(updated);
}

console.log(`Prepared ${updatedProducts.length} updated products.`);

// Update App.js
const newArrayStr = JSON.stringify(updatedProducts, null, 2);
const newAppContent = appContent.substring(0, startIndex + startMarker.length) +
  newArrayStr + ';\n\n' +
  appContent.substring(endIndex);

fs.writeFileSync(appPath, newAppContent, 'utf8');
console.log('✅ App.js updated with new stock and prices.');

// Update Firestore
async function updateFirestore() {
  console.log('Waiting for Firebase Auth...');
  await authReady;

  console.log('Updating Firestore products...');
  // Firestore batches have limit of 500 ops. We have 125 products + 1 mutation = 126 ops, perfect for single batch.
  const batch = writeBatch(db);

  for (const prod of updatedProducts) {
    const docRef = doc(db, 'products', prod.id);
    batch.set(docRef, prod, { merge: true });
  }

  // Record mutation for audit trail
  const mutationId = 'MUT-' + Date.now();
  const mutationDocRef = doc(db, 'mutations', mutationId);
  batch.set(mutationDocRef, {
    id: mutationId,
    date: Timestamp.now(),
    productId: 'ALL',
    shiftId: 'SHIFT-1',
    type: 'koreksi',
    qty: 0,
    note: 'Update Stok Lembar Opname & Harga Jual CSV (7 Nov 2026 02:16)',
    operator: 'Super Admin'
  });

  console.log('Committing Firestore batch update...');
  await batch.commit();
  console.log('✅ Firestore products successfully updated with new stock and prices!');
}

updateFirestore().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Firestore update failed:', err);
  process.exit(1);
});

