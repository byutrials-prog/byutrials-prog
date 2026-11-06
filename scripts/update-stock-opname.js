import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, authReady } from '../src/firebaseConfig.js';
import { collection, doc, writeBatch, Timestamp, getDocs } from 'firebase/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const categoryImages = {
  'Anggur & Wine': 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80',
  'Beer & RTD': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80',
  'Vodka & Spirits': 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80',
  'Soju': 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80',
  'Whisky': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80',
  'Premium Liquors': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80'
};

const opnameItems = [
  { no: 1, name: '23 Vodka 500ml', stock: 2, pid: 'P38' },
  { no: 2, name: '23 Vodka 700ml', stock: 2, pid: 'P39' },
  { no: 3, name: 'Absolut Vodka', stock: 1, pid: 'P93', appCat: 'Vodka & Spirits', price: 420000, hpp: 320000, barcode: '89910000930' },
  { no: 4, name: 'Alexis Hijau', stock: 11, pid: 'P04' },
  { no: 5, name: 'Alexis Lychee', stock: 7, pid: 'P94', appCat: 'Anggur & Wine', price: 75000, hpp: 55000, barcode: '89910000940' },
  { no: 6, name: 'Am Biasa', stock: 11, pid: 'P02' },
  { no: 7, name: 'Am Spesial', stock: 16, pid: 'P03' },
  { no: 8, name: 'Anggur Aloy', stock: 1, pid: 'P95', appCat: 'Anggur & Wine', price: 70000, hpp: 55000, barcode: '89910000950' },
  { no: 9, name: 'Anggur Putih', stock: 5, pid: 'P01' },
  { no: 10, name: 'Api Blackcurrant', stock: 8, pid: 'P96', appCat: 'Anggur & Wine', price: 75000, hpp: 55000, barcode: '89910000960' },
  { no: 11, name: 'Api Hijau', stock: 10, pid: 'P05' },
  { no: 12, name: 'Api Putih', stock: 10, pid: 'P06' },
  { no: 13, name: 'Atlas Peach', stock: 6, pid: 'P08' },
  { no: 14, name: 'Atlas Rambutan', stock: 7, pid: 'P09' },
  { no: 15, name: 'Atlas Rose', stock: 5, pid: 'P97', appCat: 'Anggur & Wine', price: 80000, hpp: 60000, barcode: '89910000970' },
  { no: 16, name: 'Atlas Strawberry', stock: 10, pid: 'P98', appCat: 'Anggur & Wine', price: 80000, hpp: 60000, barcode: '89910000980' },
  { no: 17, name: 'Atlas leci', stock: 9, pid: 'P07' },
  { no: 18, name: 'Bacardi', stock: 3, pid: 'P31' },
  { no: 19, name: 'Bae Soju Ori', stock: 6, pid: 'P35' },
  { no: 20, name: 'Bae Soju lychee', stock: 3, pid: 'P34' },
  { no: 21, name: 'Baileys Chocolate', stock: 1, pid: 'P99', appCat: 'Premium Liquors', price: 520000, hpp: 420000, barcode: '89910000990' },
  { no: 22, name: 'Baileys Original (nc)', stock: 2, pid: 'P56' },
  { no: 23, name: 'Baileys Strawberry (nc)', stock: 2, pid: 'P57' },
  { no: 24, name: 'Balvenie 12', stock: 1, pid: 'P58' },
  { no: 25, name: 'Balvenie 14', stock: 1, pid: 'P59' },
  { no: 26, name: 'Batavia', stock: 2, pid: 'P50' },
  { no: 27, name: 'Bells Whisky', stock: 1, pid: 'P100', appCat: 'Whisky', price: 280000, hpp: 200000, barcode: '89910001000' },
  { no: 28, name: 'Bintang 620ml', stock: 42, pid: 'P14' },
  { no: 29, name: 'Bintang Arak', stock: 6, pid: 'P15' },
  { no: 30, name: 'Bintang Can 320ml', stock: 42, pid: 'P16' },
  { no: 31, name: 'Bintang Can 500ml', stock: 24, pid: 'P101', appCat: 'Beer & RTD', price: 45000, hpp: 35000, barcode: '89910001010' },
  { no: 32, name: 'Bintang Radler', stock: 8, pid: 'P17' },
  { no: 33, name: 'Black Label', stock: 2, pid: 'P60' },
  { no: 34, name: 'Black Label (nc)', stock: 0, pid: 'P61' },
  { no: 35, name: 'Captain Morgan', stock: 7, pid: 'P32' },
  { no: 36, name: 'Chivas Regal 12 (nc)', stock: 1, pid: 'P62' },
  { no: 37, name: 'Chivas Regal 18', stock: 0, pid: 'P102', appCat: 'Premium Liquors', price: 1150000, hpp: 900000, barcode: '89910001020' },
  { no: 38, name: 'Chivas XV', stock: 1, pid: 'P103', appCat: 'Premium Liquors', price: 950000, hpp: 750000, barcode: '89910001030' },
  { no: 39, name: 'Chivas regal 12', stock: 0, pid: 'P63' },
  { no: 40, name: 'Cointrue (nc)', stock: 1, pid: 'P64' },
  { no: 41, name: 'Congyang 330ml', stock: 7, pid: 'P104', appCat: 'Anggur & Wine', price: 50000, hpp: 35000, barcode: '89910001040' },
  { no: 42, name: 'Don Julio Reposado', stock: 1, pid: 'P105', appCat: 'Premium Liquors', price: 1100000, hpp: 850000, barcode: '89910001050' },
  { no: 43, name: 'Draft Beer', stock: 15, pid: 'P18' },
  { no: 44, name: 'Drum 350ml', stock: 0, pid: 'P51' },
  { no: 45, name: 'Drum 700ml', stock: 4, pid: 'P52' },
  { no: 46, name: 'Friendship Blacktea', stock: 6, pid: 'P24' },
  { no: 47, name: 'Friendship Coffe', stock: 5, pid: 'P25' },
  { no: 48, name: 'Gilbeys Gin', stock: 2, pid: 'P22' },
  { no: 49, name: 'Gilbeys Whisky', stock: 4, pid: 'P54' },
  { no: 50, name: 'Gilbeys Whisky 350ml', stock: 3, pid: 'P53' },
  { no: 51, name: 'Glenfiddich 12', stock: 2, pid: 'P65' },
  { no: 52, name: 'Glenfiddich 21 Gran Reserva', stock: 1, pid: 'P106', appCat: 'Premium Liquors', price: 2400000, hpp: 1800000, barcode: '89910001060' },
  { no: 53, name: 'Glenlivet 12', stock: 2, pid: 'P66' },
  { no: 54, name: 'Gordon Dry', stock: 1, pid: 'P107', appCat: 'Vodka & Spirits', price: 290000, hpp: 220000, barcode: '89910001070' },
  { no: 55, name: 'Gordon Pink', stock: 2, pid: 'P23' },
  { no: 56, name: 'Greygoose Vodka (nc)', stock: 1, pid: 'P67' },
  { no: 57, name: 'Guinnes 620ml', stock: 15, pid: 'P19' },
  { no: 58, name: 'Hennesy Vsop', stock: 0, pid: 'P68' },
  { no: 59, name: 'Hennesy Vsop (nc)', stock: 1, pid: 'P69' },
  { no: 60, name: 'Iceland 500ml', stock: 5, pid: 'P40' },
  { no: 61, name: 'Iceland 700ml', stock: 6, pid: 'P41' },
  { no: 62, name: 'Iceland Blacktea 700ml', stock: 6, pid: 'P42' },
  { no: 63, name: 'Iceland Citrus 700ml', stock: 4, pid: 'P43' },
  { no: 64, name: 'Iceland Lychee 700ml', stock: 4, pid: 'P44' },
  { no: 65, name: 'Iceland Orange', stock: 4, pid: 'P108', appCat: 'Vodka & Spirits', price: 85000, hpp: 65000, barcode: '89910001080' },
  { no: 66, name: 'Jack Daniel', stock: 2, pid: 'P70' },
  { no: 67, name: 'Jack Daniel Honey', stock: 2, pid: 'P71' },
  { no: 68, name: 'Jack Daniels (nc)', stock: 0, pid: 'P72' },
  { no: 69, name: 'Jagermeister (nc)', stock: 1, pid: 'P73' },
  { no: 70, name: 'Jameson', stock: 2, pid: 'P74' },
  { no: 71, name: 'Jameson (nc)', stock: 3, pid: 'P75' },
  { no: 72, name: 'Jimbeam Appel', stock: 1, pid: 'P76' },
  { no: 73, name: 'Jimbeam Appel (nc)', stock: 1, pid: 'P77' },
  { no: 74, name: 'Jimbeam Blackcherry', stock: 2, pid: 'P109', appCat: 'Premium Liquors', price: 480000, hpp: 380000, barcode: '89910001090' },
  { no: 75, name: 'Jimbeam White', stock: 1, pid: 'P110', appCat: 'Premium Liquors', price: 460000, hpp: 360000, barcode: '89910001100' },
  { no: 76, name: 'Jinro Strawberry', stock: 6, pid: 'P37' },
  { no: 77, name: 'Jinro Greengrape', stock: 5, pid: 'P36' },
  { no: 78, name: 'Jose Cuervo', stock: 0, pid: 'P78' },
  { no: 79, name: 'Jose Cuervo (nc)', stock: 2, pid: 'P79' },
  { no: 80, name: 'Kahlua', stock: 1, pid: 'P111', appCat: 'Premium Liquors', price: 480000, hpp: 380000, barcode: '89910001110' },
  { no: 81, name: 'Kawa Blackcurrant', stock: 10, pid: 'P10' },
  { no: 82, name: 'Kawa Hijau', stock: 3, pid: 'P11' },
  { no: 83, name: 'Kawa Merah', stock: 9, pid: 'P12' },
  { no: 84, name: 'Kolesom Kuning', stock: 0, pid: 'P13' },
  { no: 85, name: 'Lunazul Reposado', stock: 1, pid: 'P112', appCat: 'Premium Liquors', price: 550000, hpp: 420000, barcode: '89910001120' },
  { no: 86, name: 'MCD Vodka Mix 1L', stock: 4, pid: 'P26' },
  { no: 87, name: 'Maccalan 12 Double Cask Blue', stock: 1, pid: 'P80' },
  { no: 88, name: 'Maccalan 12 red sherry', stock: 1, pid: 'P81' },
  { no: 89, name: 'Malibu', stock: 1, pid: 'P113', appCat: 'Vodka & Spirits', price: 450000, hpp: 350000, barcode: '89910001130' },
  { no: 90, name: 'Martell Noblige', stock: 0, pid: 'P114', appCat: 'Premium Liquors', price: 1550000, hpp: 1200000, barcode: '89910001140' },
  { no: 91, name: 'Martell Vsop', stock: 3, pid: 'P82' },
  { no: 92, name: 'Mcd mix 500 ml', stock: 7, pid: 'P115', appCat: 'Vodka & Spirits', price: 45000, hpp: 30000, barcode: '89910001150' },
  { no: 93, name: 'Mh Whisky 350ml', stock: 3, pid: 'P55' },
  { no: 94, name: 'Mix Max All Varian', stock: 6, pid: 'P20' },
  { no: 95, name: 'Morgan Appel', stock: 0, pid: 'P33' },
  { no: 96, name: 'Morgan Black', stock: 1, pid: 'P116', appCat: 'Vodka & Spirits', price: 290000, hpp: 220000, barcode: '89910001160' },
  { no: 97, name: 'Morgan White', stock: 1, pid: 'P117', appCat: 'Vodka & Spirits', price: 290000, hpp: 220000, barcode: '89910001170' },
  { no: 98, name: 'Newport All Varian', stock: 19, pid: 'P28' },
  { no: 99, name: 'Newport Golen', stock: 3, pid: 'P27' },
  { no: 100, name: 'Red Label', stock: 0, pid: 'P83' },
  { no: 101, name: 'Red Label (nc)', stock: 2, pid: 'P84' },
  { no: 102, name: 'Sababay Ludisia (nc)', stock: 1, pid: 'P85' },
  { no: 103, name: 'Sababay Mascetti (nc)', stock: 1, pid: 'P86' },
  { no: 104, name: 'Sababay Mistelle', stock: 0, pid: 'P118', appCat: 'Anggur & Wine', price: 320000, hpp: 250000, barcode: '89910001180' },
  { no: 105, name: 'Sababay Moscato De Bali (nc)', stock: 0, pid: 'P87' },
  { no: 106, name: 'Sababay Pink Blossom (nc)', stock: 1, pid: 'P88' },
  { no: 107, name: 'Santana Spiced', stock: 1, pid: 'P119', appCat: 'Vodka & Spirits', price: 250000, hpp: 180000, barcode: '89910001190' },
  { no: 108, name: 'Schweppes', stock: 1, pid: 'P120', appCat: 'Beer & RTD', price: 15000, hpp: 10000, barcode: '89910001200' },
  { no: 109, name: 'Singaraja 600ml', stock: 14, pid: 'P21' },
  { no: 110, name: 'Singleton 12 Go', stock: 1, pid: 'P89' },
  { no: 111, name: 'Singleton GO (nc)', stock: 0, pid: 'P90' },
  { no: 112, name: 'Singleton GO 12 Sherry', stock: 0, pid: 'P91' },
  { no: 113, name: 'Singleton Go 15', stock: 1, pid: 'P121', appCat: 'Premium Liquors', price: 1100000, hpp: 850000, barcode: '89910001210' },
  { no: 114, name: 'Singleton LN 12', stock: 2, pid: 'P92' },
  { no: 115, name: 'Siren Lychee', stock: 1, pid: 'P122', appCat: 'Vodka & Spirits', price: 220000, hpp: 150000, barcode: '89910001220' },
  { no: 116, name: 'Skyy Vodka (nc)', stock: 1, pid: 'P123', appCat: 'Vodka & Spirits', price: 420000, hpp: 320000, barcode: '89910001230' },
  { no: 117, name: 'Smirnoff 750ml', stock: 3, pid: 'P47' },
  { no: 118, name: 'Smirnoff Greenapple', stock: 2, pid: 'P46' },
  { no: 119, name: 'Smirnoff Ice All Varian', stock: 14, pid: 'P45' },
  { no: 120, name: 'Smirnoff Pink Lemonade', stock: 2, pid: 'P124', appCat: 'Vodka & Spirits', price: 85000, hpp: 65000, barcode: '89910001240' },
  { no: 121, name: 'Topi Miring', stock: 4, pid: 'P48' },
  { no: 122, name: 'Topi Miring Lemon', stock: 4, pid: 'P49' },
  { no: 123, name: 'Vibe Blacktea', stock: 3, pid: 'P29' },
  { no: 124, name: 'Vibe Lychee', stock: 3, pid: 'P30' },
  { no: 125, name: 'William Lawson', stock: 1, pid: 'P125', appCat: 'Whisky', price: 300000, hpp: 220000, barcode: '89910001250' }
];

async function run() {
  console.log('Connecting to Firebase...');
  await authReady;

  console.log('Fetching existing Firestore products...');
  const snapshot = await getDocs(collection(db, 'products'));
  const currentDocs = new Map();
  snapshot.docs.forEach(docSnap => {
    currentDocs.set(docSnap.id, docSnap.data());
  });
  console.log(`Current Firestore products: ${currentDocs.size}`);

  const batch = writeBatch(db);
  let updatedExisting = 0;
  let insertedNew = 0;
  const allFinalProducts = [];

  for (const item of opnameItems) {
    if (currentDocs.has(item.pid)) {
      const existing = currentDocs.get(item.pid);
      const docRef = doc(db, 'products', item.pid);
      batch.update(docRef, { stock: item.stock });
      updatedExisting++;
      allFinalProducts.push({
        ...existing,
        id: item.pid,
        stock: item.stock
      });
    } else {
      const docRef = doc(db, 'products', item.pid);
      const newProduct = {
        id: item.pid,
        barcode: item.barcode,
        name: item.name,
        category: item.appCat,
        hpp: item.hpp,
        price: item.price,
        stock: item.stock,
        minStock: 5,
        image: categoryImages[item.appCat] || categoryImages['Vodka & Spirits']
      };
      batch.set(docRef, newProduct);
      insertedNew++;
      allFinalProducts.push(newProduct);
    }
  }

  // Also record a mutation log entry in Firestore for the audit of this stock opname
  const mutationId = 'MUT-' + Date.now();
  const mutationDocRef = doc(db, 'mutations', mutationId);
  batch.set(mutationDocRef, {
    id: mutationId,
    date: Timestamp.now(),
    productId: 'ALL',
    shiftId: 'SHIFT-1',
    type: 'koreksi',
    qty: 0,
    note: 'Koreksi Lembar Stock Opname 125 Produk (7 Nov 2026)',
    operator: 'Admin'
  });

  console.log(`Committing batch update: ${updatedExisting} updated, ${insertedNew} inserted...`);
  await batch.commit();
  console.log('✅ Firestore successfully updated!');

  // Save the full updated list for App.js synchronization
  fs.writeFileSync(path.resolve(__dirname, '../all_updated_products.json'), JSON.stringify(allFinalProducts, null, 2));
  console.log('✅ all_updated_products.json saved.');
}

run().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});

