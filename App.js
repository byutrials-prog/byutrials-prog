import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Switch,
  Modal,
  Image,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import {
  subscribeToProducts,
  subscribeToTransactions,
  subscribeToMutations,
  subscribeToUsers,
  subscribeToCustomers,
  addProduct as fbAddProduct,
  updateProduct as fbUpdateProduct,
  deleteProductFromDB,
  updateProductStock,
  batchUpdateProductStocks,
  addTransaction as fbAddTransaction,
  updateTransactionAndStocks as fbUpdateTransactionAndStocks,
  addMutation as fbAddMutation,
  cancelMutationAndRestoreStock as fbCancelMutationAndRestoreStock,
  addUser as fbAddUser,
  updateUserInDB as fbUpdateUser,
  deleteUserFromDB as fbDeleteUser,
  addCustomer as fbAddCustomer,
  seedInitialData,
} from './src/firebaseService';

const formatRp = (num) => {
  return 'Rp ' + (num || 0).toLocaleString('id-ID');
};

const CONTENT_BOTTOM_PADDING = 128;

const formatDateInput = (dateObj) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

const parseDateInput = (value) => {
  const [year, month, day] = (value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (formatDateInput(date) !== value) return null;
  const now = new Date();
  date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  return date;
};

const getOffsetDate = (daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
};

const QRIS_IMAGE_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=QRIS-DEMO-TIPSY-POINT';

const DEFAULT_USERS = [
  { id: 'U02', name: 'Renal', username: 'renal', password: 'tipsypoint', role: 'Super Admin' },
  { id: 'U1792195948803', name: 'Mei', username: 'mei', password: 'tipsypoint', role: 'Super Admin' },
  { id: 'U01', name: 'Windy', username: 'windy', password: 'admin123', role: 'Kasir' },
];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

let webPdfModulesPromise;

const loadWebPdfModules = () => {
  if (!webPdfModulesPromise) {
    webPdfModulesPromise = Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]).then(([pdfModule, tableModule]) => ({
      jsPDF: pdfModule.jsPDF,
      autoTable: tableModule.default,
    })).catch((error) => {
      webPdfModulesPromise = null;
      throw error;
    });
  }
  return webPdfModulesPromise;
};

const downloadPdfDocument = (pdf, filename) => {
  const url = URL.createObjectURL(pdf.output('blob'));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const buildReceiptHtml = ({ receiptNumber, date, detailsHtml, itemsHtml, subtotal, discount, total, paymentsHtml, extraHtml = '', footer = 'Terima kasih atas kunjungan Anda' }) => `
  <!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    @page{size:80mm auto;margin:0}*{box-sizing:border-box}body{width:80mm;margin:0 auto;color:#27313f;background:#fff;font:13px Arial,sans-serif}
    .paper{padding:22px 17px}.brand{text-align:center;padding-bottom:15px;border-bottom:1px solid #e5e7eb}.mark{width:62px;height:62px;margin:0 auto 10px;border-radius:13px;background:#08090c;display:flex;align-items:center;justify-content:center;position:relative;color:#fff}
    .mark:before{content:'';position:absolute;inset:6px;border:2px solid #f14be3;border-right-color:#55e8ed;border-radius:50%}.mark span{z-index:1;font-size:9px;font-weight:bold;text-align:center;line-height:1.05;color:#fff}
    h1{font-size:21px;margin:0 0 6px}.contact{color:#758092;margin:4px 0}.meta{padding:12px 0;border-bottom:1px solid #e5e7eb}.row{display:flex;justify-content:space-between;gap:10px;margin:6px 0}.label{color:#758092}.value{text-align:right}.rule{border:0;border-top:1px solid #e5e7eb;margin:0}
    .items{padding:8px 0}.item{padding:7px 0}.item-main{display:flex;justify-content:space-between;gap:10px;font-weight:600}.item-name{overflow-wrap:anywhere}.item-amount{white-space:nowrap}.item-detail{color:#758092;font-size:12px;margin-top:4px}
    .totals{padding:10px 0;border-top:1px solid #e5e7eb}.discount{color:#d35d64}.grand{border-top:1px solid #e5e7eb;padding-top:10px;font-size:16px;font-weight:bold;color:#192230}.payments{padding:10px 0;border-bottom:1px solid #e5e7eb}.history-title{margin:10px 0 4px;font-size:13px}.stock-entry{padding:5px 0}.footer{text-align:center;color:#758092;font-style:italic;margin:15px 0 0}
  </style></head><body><main class="paper">
    <header class="brand"><div class="mark"><span>Tipsy<br>Point</span></div><h1>Tipsy Point</h1><p class="contact">Jalan Kepiting</p><p class="contact">Telp: 085196980785</p></header>
    <section class="meta"><div class="row"><span class="label">No. Struk</span><strong class="value">${escapeHtml(receiptNumber)}</strong></div><div class="row"><span class="label">Tanggal</span><span class="value">${escapeHtml(date)}</span></div>${detailsHtml}</section>
    <section class="items">${itemsHtml}</section>
    <section class="totals"><div class="row"><span class="label">Subtotal</span><span class="value">${formatRp(subtotal)}</span></div><div class="row discount"><span>Diskon</span><span class="value">- ${formatRp(discount)}</span></div><div class="row grand"><span>TOTAL</span><span class="value">${formatRp(total)}</span></div></section>
    <section class="payments">${paymentsHtml}</section><section class="stock-history">${extraHtml}</section><p class="footer">${escapeHtml(footer)}</p>
  </main></body></html>`;

const exportTablePdf = async (filename, title, headers, rows) => {
  if (Platform.OS === 'web') {
    const { jsPDF, autoTable } = await loadWebPdfModules();
    const pdf = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(25, 55, 43);
    pdf.text(title, 12, 16);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(75, 85, 80);
    pdf.text(`Dicetak ${new Date().toLocaleString('id-ID')}`, 12, 22);
    autoTable(pdf, {
      startY: 27,
      head: [headers],
      body: rows.length ? rows : [['Tidak ada data laporan.', ...Array(headers.length - 1).fill('')]],
      margin: { left: 12, right: 12, top: 12, bottom: 12 },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: headers.length > 6 ? 7 : 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 248] },
    });
    downloadPdfDocument(pdf, filename);
    return;
  }

  const tableRows = rows.length
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}">Tidak ada data laporan.</td></tr>`;
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><style>
    @page{size:A4 ${headers.length > 6 ? 'landscape' : 'portrait'};margin:12mm}
    body{font-family:Arial,sans-serif;color:#1f2937;font-size:10px}
    h1{font-size:18px;color:#19372b;margin:0 0 5px}
    p{font-size:9px;color:#4b5563;margin:0 0 14px}
    table{width:100%;border-collapse:collapse;table-layout:auto}
    th,td{border:1px solid #d1d5db;padding:6px;text-align:left;overflow-wrap:anywhere}
    th{background:#047857;color:#fff}
    tr:nth-child(even){background:#f8faf8}
  </style></head><body><h1>${escapeHtml(title)}</h1><p>Dicetak ${escapeHtml(new Date().toLocaleString('id-ID'))}</p>
    <table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>
    </body></html>`;
  const file = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: `Simpan atau bagikan ${title}`, UTI: 'com.adobe.pdf' });
  } else {
    Alert.alert('PDF dibuat', `Laporan tersimpan di ${file.uri}`);
  }
};

const INITIAL_PRODUCTS = [
  {
    "id": "P38",
    "name": "23 Vodka 500ml",
    "category": "Vodka & Spirits",
    "price": 90000,
    "hpp": 80000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910005206",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P39",
    "name": "23 Vodka 700ml",
    "category": "Vodka & Spirits",
    "price": 235000,
    "hpp": 225000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910005343",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P93",
    "name": "Absolut Vodka",
    "category": "Vodka & Spirits",
    "price": 500000,
    "hpp": 400000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910000930",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P04",
    "name": "Alexis Hijau",
    "category": "Anggur & Wine",
    "price": 80000,
    "hpp": 73000,
    "stock": 11,
    "minStock": 5,
    "barcode": "89910000548",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P94",
    "name": "Alexis Lychee",
    "category": "Anggur & Wine",
    "price": 78000,
    "hpp": 73000,
    "stock": 7,
    "minStock": 5,
    "barcode": "89910000940",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P02",
    "name": "Am Biasa",
    "category": "Anggur & Wine",
    "price": 70000,
    "hpp": 63500,
    "stock": 11,
    "minStock": 5,
    "barcode": "89910000274",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P03",
    "name": "Am Spesial",
    "category": "Anggur & Wine",
    "price": 75000,
    "hpp": 67000,
    "stock": 16,
    "minStock": 5,
    "barcode": "89910000411",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P95",
    "name": "Anggur Aloy",
    "category": "Anggur & Wine",
    "price": 360000,
    "hpp": 335000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910000950",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P01",
    "name": "Anggur Putih",
    "category": "Anggur & Wine",
    "price": 70000,
    "hpp": 63500,
    "stock": 5,
    "minStock": 5,
    "barcode": "89910000137",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P96",
    "name": "Api Blackcurrant",
    "category": "Anggur & Wine",
    "price": 75000,
    "hpp": 73000,
    "stock": 8,
    "minStock": 5,
    "barcode": "89910000960",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P05",
    "name": "Api Hijau",
    "category": "Anggur & Wine",
    "price": 85000,
    "hpp": 73000,
    "stock": 10,
    "minStock": 5,
    "barcode": "89910000685",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P06",
    "name": "Api Putih",
    "category": "Anggur & Wine",
    "price": 85000,
    "hpp": 73000,
    "stock": 10,
    "minStock": 5,
    "barcode": "89910000822",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P08",
    "name": "Atlas Peach",
    "category": "Anggur & Wine",
    "price": 80000,
    "hpp": 69000,
    "stock": 6,
    "minStock": 5,
    "barcode": "89910001096",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P09",
    "name": "Atlas Rambutan",
    "category": "Anggur & Wine",
    "price": 80000,
    "hpp": 69000,
    "stock": 7,
    "minStock": 5,
    "barcode": "89910001233",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P97",
    "name": "Atlas Rose",
    "category": "Anggur & Wine",
    "price": 80000,
    "hpp": 69000,
    "stock": 5,
    "minStock": 5,
    "barcode": "89910000970",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P98",
    "name": "Atlas Strawberry",
    "category": "Anggur & Wine",
    "price": 80000,
    "hpp": 69000,
    "stock": 10,
    "minStock": 5,
    "barcode": "89910000980",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P07",
    "name": "Atlas leci",
    "category": "Anggur & Wine",
    "price": 80000,
    "hpp": 69000,
    "stock": 9,
    "minStock": 5,
    "barcode": "89910000959",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P31",
    "name": "Bacardi",
    "category": "Vodka & Spirits",
    "price": 300000,
    "hpp": 285000,
    "stock": 3,
    "minStock": 5,
    "barcode": "89910004247",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P35",
    "name": "Bae Soju Ori",
    "category": "Soju",
    "price": 75000,
    "hpp": 65000,
    "stock": 6,
    "minStock": 5,
    "barcode": "89910004795",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P34",
    "name": "Bae Soju lychee",
    "category": "Soju",
    "price": 75000,
    "hpp": 65000,
    "stock": 3,
    "minStock": 5,
    "barcode": "89910004658",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P99",
    "name": "Baileys Chocolate",
    "category": "Premium Liquors",
    "price": 850000,
    "hpp": 780000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910000990",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P56",
    "name": "Baileys Original (nc)",
    "category": "Premium Liquors",
    "price": 625000,
    "hpp": 570000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910007672",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P57",
    "name": "Baileys Strawberry (nc)",
    "category": "Premium Liquors",
    "price": 799000,
    "hpp": 720000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910007809",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P58",
    "name": "Balvenie 12",
    "category": "Premium Liquors",
    "price": 1500000,
    "hpp": 825000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910007946",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P59",
    "name": "Balvenie 14",
    "category": "Premium Liquors",
    "price": 1800000,
    "hpp": 1000000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910008083",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P50",
    "name": "Batavia",
    "category": "Vodka & Spirits",
    "price": 320000,
    "hpp": 305000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910006850",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P100",
    "name": "Bells Whisky",
    "category": "Whisky",
    "price": 320000,
    "hpp": 290000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001000",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P14",
    "name": "Bintang 620ml",
    "category": "Beer & RTD",
    "price": 40000,
    "hpp": 38000,
    "stock": 42,
    "minStock": 5,
    "barcode": "89910001918",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P15",
    "name": "Bintang Arak",
    "category": "Beer & RTD",
    "price": 45000,
    "hpp": 42000,
    "stock": 6,
    "minStock": 5,
    "barcode": "89910002055",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P16",
    "name": "Bintang Can 320ml",
    "category": "Beer & RTD",
    "price": 26000,
    "hpp": 23500,
    "stock": 42,
    "minStock": 5,
    "barcode": "89910002192",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P101",
    "name": "Bintang Can 500ml",
    "category": "Beer & RTD",
    "price": 35000,
    "hpp": 31500,
    "stock": 24,
    "minStock": 5,
    "barcode": "89910001010",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P17",
    "name": "Bintang Radler",
    "category": "Beer & RTD",
    "price": 30000,
    "hpp": 25000,
    "stock": 8,
    "minStock": 5,
    "barcode": "89910002329",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P60",
    "name": "Black Label",
    "category": "Whisky",
    "price": 800000,
    "hpp": 550000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910008220",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P61",
    "name": "Black Label (nc)",
    "category": "Whisky",
    "price": 860000,
    "hpp": 750000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910008357",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P32",
    "name": "Captain Morgan",
    "category": "Vodka & Spirits",
    "price": 300000,
    "hpp": 290000,
    "stock": 7,
    "minStock": 5,
    "barcode": "89910004384",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P62",
    "name": "Chivas Regal 12 (nc)",
    "category": "Whisky",
    "price": 850000,
    "hpp": 720000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910008494",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P102",
    "name": "Chivas Regal 18",
    "category": "Premium Liquors",
    "price": 1350000,
    "hpp": 1197500,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910001020",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P103",
    "name": "Chivas XV",
    "category": "Premium Liquors",
    "price": 1300000,
    "hpp": 1034500,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001030",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P63",
    "name": "Chivas regal 12",
    "category": "Whisky",
    "price": 850000,
    "hpp": 600000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910008631",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P64",
    "name": "Cointrue (nc)",
    "category": "Premium Liquors",
    "price": 585000,
    "hpp": 550000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910008768",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P104",
    "name": "Congyang 330ml",
    "category": "Anggur & Wine",
    "price": 55000,
    "hpp": 50000,
    "stock": 7,
    "minStock": 5,
    "barcode": "89910001040",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P105",
    "name": "Don Julio Reposado",
    "category": "Premium Liquors",
    "price": 1200000,
    "hpp": 900000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001050",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P18",
    "name": "Draft Beer",
    "category": "Beer & RTD",
    "price": 35000,
    "hpp": 33000,
    "stock": 15,
    "minStock": 5,
    "barcode": "89910002466",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P51",
    "name": "Drum 350ml",
    "category": "Whisky",
    "price": 90000,
    "hpp": 80000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910006987",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P52",
    "name": "Drum 700ml",
    "category": "Whisky",
    "price": 175000,
    "hpp": 158000,
    "stock": 4,
    "minStock": 5,
    "barcode": "89910007124",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P24",
    "name": "Friendship Blacktea",
    "category": "Vodka & Spirits",
    "price": 80000,
    "hpp": 72000,
    "stock": 6,
    "minStock": 5,
    "barcode": "89910003288",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P25",
    "name": "Friendship Coffe",
    "category": "Vodka & Spirits",
    "price": 80000,
    "hpp": 72000,
    "stock": 5,
    "minStock": 5,
    "barcode": "89910003425",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P22",
    "name": "Gilbeys Gin",
    "category": "Vodka & Spirits",
    "price": 245000,
    "hpp": 225000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910003014",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P54",
    "name": "Gilbeys Whisky",
    "category": "Whisky",
    "price": 245000,
    "hpp": 225000,
    "stock": 4,
    "minStock": 5,
    "barcode": "89910007398",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P53",
    "name": "Gilbeys Whisky 350ml",
    "category": "Whisky",
    "price": 130000,
    "hpp": 118500,
    "stock": 3,
    "minStock": 5,
    "barcode": "89910007261",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P65",
    "name": "Glenfiddich 12",
    "category": "Whisky",
    "price": 1000000,
    "hpp": 770000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910008905",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P106",
    "name": "Glenfiddich 21 Gran Reserva",
    "category": "Premium Liquors",
    "price": 3600000,
    "hpp": 2200000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001060",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P66",
    "name": "Glenlivet 12",
    "category": "Whisky",
    "price": 900000,
    "hpp": 695000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910009042",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P107",
    "name": "Gordon Dry",
    "category": "Vodka & Spirits",
    "price": 330000,
    "hpp": 300000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001070",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P23",
    "name": "Gordon Pink",
    "category": "Vodka & Spirits",
    "price": 350000,
    "hpp": 300000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910003151",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P67",
    "name": "Greygoose Vodka (nc)",
    "category": "Vodka & Spirits",
    "price": 885000,
    "hpp": 820000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910009179",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P19",
    "name": "Guinnes 620ml",
    "category": "Beer & RTD",
    "price": 50000,
    "hpp": 46000,
    "stock": 15,
    "minStock": 5,
    "barcode": "89910002603",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P68",
    "name": "Hennesy Vsop",
    "category": "Premium Liquors",
    "price": 1250000,
    "hpp": 855000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910009316",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P69",
    "name": "Hennesy Vsop (nc)",
    "category": "Premium Liquors",
    "price": 1250000,
    "hpp": 1150000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910009453",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P40",
    "name": "Iceland 500ml",
    "category": "Vodka & Spirits",
    "price": 120000,
    "hpp": 114000,
    "stock": 5,
    "minStock": 5,
    "barcode": "89910005480",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P41",
    "name": "Iceland 700ml",
    "category": "Vodka & Spirits",
    "price": 175000,
    "hpp": 162000,
    "stock": 6,
    "minStock": 5,
    "barcode": "89910005617",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P42",
    "name": "Iceland Blacktea 700ml",
    "category": "Vodka & Spirits",
    "price": 200000,
    "hpp": 180000,
    "stock": 6,
    "minStock": 5,
    "barcode": "89910005754",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P43",
    "name": "Iceland Citrus 700ml",
    "category": "Vodka & Spirits",
    "price": 200000,
    "hpp": 180000,
    "stock": 4,
    "minStock": 5,
    "barcode": "89910005891",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P44",
    "name": "Iceland Lychee 700ml",
    "category": "Vodka & Spirits",
    "price": 200000,
    "hpp": 180000,
    "stock": 4,
    "minStock": 5,
    "barcode": "89910006028",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P108",
    "name": "Iceland Orange",
    "category": "Vodka & Spirits",
    "price": 200000,
    "hpp": 180000,
    "stock": 4,
    "minStock": 5,
    "barcode": "89910001080",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P70",
    "name": "Jack Daniel",
    "category": "Whisky",
    "price": 650000,
    "hpp": 500000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910009590",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P71",
    "name": "Jack Daniel Honey",
    "category": "Whisky",
    "price": 750000,
    "hpp": 600000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910009727",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P72",
    "name": "Jack Daniels (nc)",
    "category": "Whisky",
    "price": 685000,
    "hpp": 620000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910009864",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P73",
    "name": "Jagermeister (nc)",
    "category": "Premium Liquors",
    "price": 520000,
    "hpp": 470000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910010001",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P74",
    "name": "Jameson",
    "category": "Whisky",
    "price": 550000,
    "hpp": 475000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910010138",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P75",
    "name": "Jameson (nc)",
    "category": "Whisky",
    "price": 550000,
    "hpp": 520000,
    "stock": 3,
    "minStock": 5,
    "barcode": "89910010275",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P76",
    "name": "Jimbeam Appel",
    "category": "Whisky",
    "price": 580000,
    "hpp": 480000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910010412",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P77",
    "name": "Jimbeam Appel (nc)",
    "category": "Whisky",
    "price": 600000,
    "hpp": 520000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910010549",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P109",
    "name": "Jimbeam Blackcherry",
    "category": "Premium Liquors",
    "price": 580000,
    "hpp": 480000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910001090",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P110",
    "name": "Jimbeam White",
    "category": "Premium Liquors",
    "price": 600000,
    "hpp": 500000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001100",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P37",
    "name": "Jinro  Strawberry",
    "category": "Soju",
    "price": 110000,
    "hpp": 100000,
    "stock": 6,
    "minStock": 5,
    "barcode": "89910005069",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P36",
    "name": "Jinro Greengrape",
    "category": "Soju",
    "price": 110000,
    "hpp": 100000,
    "stock": 5,
    "minStock": 5,
    "barcode": "89910004932",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P78",
    "name": "Jose Cuervo",
    "category": "Vodka & Spirits",
    "price": 550000,
    "hpp": 450000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910010686",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P79",
    "name": "Jose Cuervo (nc)",
    "category": "Vodka & Spirits",
    "price": 550000,
    "hpp": 520000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910010823",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P111",
    "name": "Kahlua",
    "category": "Premium Liquors",
    "price": 500000,
    "hpp": 445000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001110",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P10",
    "name": "Kawa Blackcurrant",
    "category": "Anggur & Wine",
    "price": 75000,
    "hpp": 69000,
    "stock": 10,
    "minStock": 5,
    "barcode": "89910001370",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P11",
    "name": "Kawa Hijau",
    "category": "Anggur & Wine",
    "price": 85000,
    "hpp": 78000,
    "stock": 3,
    "minStock": 5,
    "barcode": "89910001507",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P12",
    "name": "Kawa Merah",
    "category": "Anggur & Wine",
    "price": 75000,
    "hpp": 67000,
    "stock": 9,
    "minStock": 5,
    "barcode": "89910001644",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P13",
    "name": "Kolesom Kuning",
    "category": "Anggur & Wine",
    "price": 80000,
    "hpp": 71000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910001781",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P112",
    "name": "Lunazul Reposado",
    "category": "Premium Liquors",
    "price": 750000,
    "hpp": 696500,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001120",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P26",
    "name": "MCD Vodka Mix 1L",
    "category": "Vodka & Spirits",
    "price": 115000,
    "hpp": 107000,
    "stock": 4,
    "minStock": 5,
    "barcode": "89910003562",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P80",
    "name": "Maccalan 12 Double Cask Blue",
    "category": "Premium Liquors",
    "price": 2000000,
    "hpp": 1050000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910010960",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P81",
    "name": "Maccalan 12 red sherry",
    "category": "Premium Liquors",
    "price": 2100000,
    "hpp": 1100000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910011097",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P113",
    "name": "Malibu",
    "category": "Vodka & Spirits",
    "price": 500000,
    "hpp": 420000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001130",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P114",
    "name": "Martell Noblige",
    "category": "Premium Liquors",
    "price": 1450000,
    "hpp": 1250000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910001140",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P82",
    "name": "Martell Vsop",
    "category": "Premium Liquors",
    "price": 1150000,
    "hpp": 855000,
    "stock": 3,
    "minStock": 5,
    "barcode": "89910011234",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P115",
    "name": "Mcd mix 500 ml",
    "category": "Vodka & Spirits",
    "price": 70000,
    "hpp": 62000,
    "stock": 7,
    "minStock": 5,
    "barcode": "89910001150",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P55",
    "name": "Mh Whisky 350ml",
    "category": "Whisky",
    "price": 115000,
    "hpp": 108000,
    "stock": 3,
    "minStock": 5,
    "barcode": "89910007535",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P20",
    "name": "Mix Max All Varian",
    "category": "Beer & RTD",
    "price": 28000,
    "hpp": 24500,
    "stock": 6,
    "minStock": 5,
    "barcode": "89910002740",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P33",
    "name": "Morgan Appel",
    "category": "Vodka & Spirits",
    "price": 175000,
    "hpp": 148500,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910004521",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P116",
    "name": "Morgan Black",
    "category": "Vodka & Spirits",
    "price": 380000,
    "hpp": 362000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001160",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P117",
    "name": "Morgan White",
    "category": "Vodka & Spirits",
    "price": 300000,
    "hpp": 290000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001170",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P28",
    "name": "Newport All Varian",
    "category": "Vodka & Spirits",
    "price": 75000,
    "hpp": 70000,
    "stock": 19,
    "minStock": 5,
    "barcode": "89910003836",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P27",
    "name": "Newport Golen",
    "category": "Vodka & Spirits",
    "price": 110000,
    "hpp": 100000,
    "stock": 3,
    "minStock": 5,
    "barcode": "89910003699",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P83",
    "name": "Red Label",
    "category": "Whisky",
    "price": 550000,
    "hpp": 450000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910011371",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P84",
    "name": "Red Label (nc)",
    "category": "Whisky",
    "price": 580000,
    "hpp": 500000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910011508",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P85",
    "name": "Sababay Ludisia (nc)",
    "category": "Anggur & Wine",
    "price": 300000,
    "hpp": 250000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910011645",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P86",
    "name": "Sababay Mascetti (nc)",
    "category": "Anggur & Wine",
    "price": 425000,
    "hpp": 400000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910011782",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P118",
    "name": "Sababay Mistelle",
    "category": "Anggur & Wine",
    "price": 350000,
    "hpp": 330000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910001180",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P87",
    "name": "Sababay Moscato De Bali (nc)",
    "category": "Anggur & Wine",
    "price": 350000,
    "hpp": 300000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910011919",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P88",
    "name": "Sababay Pink Blossom (nc)",
    "category": "Anggur & Wine",
    "price": 300000,
    "hpp": 250000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910012056",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P119",
    "name": "Santana Spiced",
    "category": "Vodka & Spirits",
    "price": 300000,
    "hpp": 276000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001190",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P120",
    "name": "Schweppes",
    "category": "Beer & RTD",
    "price": 8000,
    "hpp": 6500,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001200",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P21",
    "name": "Singaraja 600ml",
    "category": "Beer & RTD",
    "price": 35000,
    "hpp": 32000,
    "stock": 14,
    "minStock": 5,
    "barcode": "89910002877",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P89",
    "name": "Singleton 12 Go",
    "category": "Whisky",
    "price": 1050000,
    "hpp": 750000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910012193",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P90",
    "name": "Singleton GO (nc)",
    "category": "Whisky",
    "price": 1150000,
    "hpp": 1100000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910012330",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P91",
    "name": "Singleton GO 12 Sherry",
    "category": "Whisky",
    "price": 1150000,
    "hpp": 855000,
    "stock": 0,
    "minStock": 5,
    "barcode": "89910012467",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P121",
    "name": "Singleton Go 15",
    "category": "Premium Liquors",
    "price": 1500000,
    "hpp": 1050000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001210",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P92",
    "name": "Singleton LN 12",
    "category": "Whisky",
    "price": 900000,
    "hpp": 650000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910012604",
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P122",
    "name": "Siren Lychee",
    "category": "Vodka & Spirits",
    "price": 280000,
    "hpp": 240000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001220",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P123",
    "name": "Skyy Vodka (nc)",
    "category": "Vodka & Spirits",
    "price": 300000,
    "hpp": 300000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001230",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P47",
    "name": "Smirnoff 750ml",
    "category": "Vodka & Spirits",
    "price": 290000,
    "hpp": 246000,
    "stock": 3,
    "minStock": 5,
    "barcode": "89910006439",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P46",
    "name": "Smirnoff Greenapple",
    "category": "Vodka & Spirits",
    "price": 300000,
    "hpp": 258000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910006302",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P45",
    "name": "Smirnoff Ice All Varian",
    "category": "Beer & RTD",
    "price": 26000,
    "hpp": 23000,
    "stock": 14,
    "minStock": 5,
    "barcode": "89910006165",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P124",
    "name": "Smirnoff Pink Lemonade",
    "category": "Vodka & Spirits",
    "price": 300000,
    "hpp": 258000,
    "stock": 2,
    "minStock": 5,
    "barcode": "89910001240",
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P48",
    "name": "Topi Miring",
    "category": "Anggur & Wine",
    "price": 105000,
    "hpp": 96000,
    "stock": 4,
    "minStock": 5,
    "barcode": "89910006576",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P49",
    "name": "Topi Miring Lemon",
    "category": "Anggur & Wine",
    "price": 105000,
    "hpp": 96000,
    "stock": 4,
    "minStock": 5,
    "barcode": "89910006713",
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P29",
    "name": "Vibe Blacktea",
    "category": "Vodka & Spirits",
    "price": 320000,
    "hpp": 300000,
    "stock": 3,
    "minStock": 5,
    "barcode": "89910003973",
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P30",
    "name": "Vibe Lychee",
    "category": "Vodka & Spirits",
    "price": 320000,
    "hpp": 300000,
    "stock": 3,
    "minStock": 5,
    "barcode": "89910004110",
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P125",
    "name": "William Lawson",
    "category": "Whisky",
    "price": 530000,
    "hpp": 500000,
    "stock": 1,
    "minStock": 5,
    "barcode": "89910001250",
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  }
];

const INITIAL_TRANSACTIONS = [];

const INITIAL_MUTATIONS = [];

export default function App() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const productColumns = windowWidth < 430 ? 1 : windowWidth >= 768 ? 3 : 2;
  const shiftReceiptCaptureRef = useRef(null);
  const salesReceiptCaptureRef = useRef(null);
  const [activeTab, setActiveTab] = useState('pos');
  const [pdfModulesReady, setPdfModulesReady] = useState(Platform.OS !== 'web');
  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfExportStatus, setPdfExportStatus] = useState(Platform.OS === 'web' ? 'Menyiapkan fitur PDF...' : '');

  // Users & Multi-user session
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [cashierTabs, setCashierTabs] = useState([{
    id: 'cashier-tab-1',
    user: null,
    shiftId: null,
    cart: [],
    selectedCustomer: null,
    selectedTransactionDate: formatDateInput(new Date()),
    discountType: 'percent',
    discountValue: '0',
    payMethod: 'Tunai',
    cashAmount: '',
    activeTab: 'pos',
  }]);
  const [activeCashierTabId, setActiveCashierTabId] = useState('cashier-tab-1');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isUserSwitchOpen, setIsUserSwitchOpen] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState(null);
  const [closedShiftSummary, setClosedShiftSummary] = useState(null);
  const [isShiftReceiptOpen, setIsShiftReceiptOpen] = useState(false);
  const [isReceiptPngSaving, setIsReceiptPngSaving] = useState(false);
  const [receiptPngPreview, setReceiptPngPreview] = useState(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('Kasir');
  const [isAddingUser, setIsAddingUser] = useState(false);
  // Tambah kasir from login page
  const [isAddKasirLoginOpen, setIsAddKasirLoginOpen] = useState(false);
  const [addKasirName, setAddKasirName] = useState('');
  const [addKasirUsername, setAddKasirUsername] = useState('');
  const [addKasirPassword, setAddKasirPassword] = useState('');
  const [addKasirConfirm, setAddKasirConfirm] = useState('');
  const [addKasirError, setAddKasirError] = useState('');
  const [addKasirRole, setAddKasirRole] = useState('Kasir');

  // Edit user state (Super Admin)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState('Kasir');
  const [editUserError, setEditUserError] = useState('');

  // Core Data — loaded from Firestore
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [mutations, setMutations] = useState([]);

  // Loading state for Firestore
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Menghubungkan ke database...');

  const isSuperAdmin = currentUser?.role?.toLowerCase() === 'super admin' || currentUser?.role?.toLowerCase() === 'superadmin' || currentUser?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (currentUser && !isSuperAdmin && (activeTab === 'dashboard' || activeTab === 'crud' || activeTab === 'mutation')) {
      setActiveTab('pos');
    }
  }, [currentUser, isSuperAdmin, activeTab]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    let active = true;
    loadWebPdfModules().then(() => {
      if (active) {
        setPdfModulesReady(true);
        setPdfExportStatus('');
      }
    }).catch((error) => {
      console.error('PDF module preload error:', error);
      if (active) {
        setPdfExportStatus('Fitur PDF gagal dimuat. Muat ulang aplikasi lalu coba lagi.');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // ==========================================
  // Firebase: Seed data & Real-time subscriptions
  // ==========================================
  useEffect(() => {
    let unsubProducts, unsubTransactions, unsubMutations, unsubUsers, unsubCustomers;
    let firebaseErrorShown = false;
    let startupTimeout;
    let loadedFlags = { products: false, transactions: false, mutations: false, users: false, customers: false };

    const handleFirebaseError = (error) => {
      console.error('Firebase error:', error);
      if (firebaseErrorShown) return;
      firebaseErrorShown = true;
      if (startupTimeout) clearTimeout(startupTimeout);

      setProducts(INITIAL_PRODUCTS);
      setTransactions(INITIAL_TRANSACTIONS);
      setMutations(INITIAL_MUTATIONS);
      setUsers(DEFAULT_USERS);
      setCustomers([]);
      setIsLoading(false);

      const detail = error?.code === 'permission-denied'
        ? 'Firestore menolak akses. Periksa Firestore Rules atau aktifkan login Firebase.'
        : error?.code === 'failed-precondition'
          ? 'Firestore belum dibuat atau konfigurasi database belum selesai di Firebase Console.'
          : error?.code === 'startup-timeout'
            ? 'Koneksi Firebase terlalu lama. Periksa koneksi internet, lalu muat ulang aplikasi.'
          : `Kode error: ${error?.code || 'tidak diketahui'}`;

      Alert.alert('Database Offline', `Gagal terhubung ke Firebase. ${detail} Data lokal sementara digunakan.`);
    };

    const checkAllLoaded = () => {
      if (loadedFlags.products && loadedFlags.transactions && loadedFlags.mutations && loadedFlags.users && loadedFlags.customers) {
        if (startupTimeout) clearTimeout(startupTimeout);
        setIsLoading(false);
      }
    };

    const initFirebase = async () => {
      try {
        // Seed initial data if Firestore is empty
        setLoadingMessage('Memeriksa data awal...');
        await seedInitialData(INITIAL_PRODUCTS, INITIAL_TRANSACTIONS, INITIAL_MUTATIONS, DEFAULT_USERS);

        // Subscribe to real-time updates
        setLoadingMessage('Memuat data produk...');
        unsubProducts = subscribeToProducts((data) => {
          setProducts(data);
          if (!loadedFlags.products) {
            loadedFlags.products = true;
            setLoadingMessage('Memuat transaksi...');
            checkAllLoaded();
          }
        }, handleFirebaseError);

        unsubTransactions = subscribeToTransactions((data) => {
          setTransactions(data);
          if (!loadedFlags.transactions) {
            loadedFlags.transactions = true;
            setLoadingMessage('Memuat data stok...');
            checkAllLoaded();
          }
        }, handleFirebaseError);

        unsubMutations = subscribeToMutations((data) => {
          setMutations(data);
          if (!loadedFlags.mutations) {
            loadedFlags.mutations = true;
            setLoadingMessage('Memuat data pengguna...');
            checkAllLoaded();
          }
        }, handleFirebaseError);

        unsubUsers = subscribeToUsers((data) => {
          const usersWithCredentials = data.map((user) => {
            const defaultUser = DEFAULT_USERS.find((item) => item.id === user.id || item.name.toLowerCase() === user.name?.toLowerCase() || item.username?.toLowerCase() === user.username?.toLowerCase());
            return {
              ...user,
              username: user.username || defaultUser?.username,
              password: user.password || defaultUser?.password,
              role: user.role || defaultUser?.role || 'Kasir',
            };
          });
          setUsers(usersWithCredentials);
          if (!loadedFlags.users) {
            loadedFlags.users = true;
            checkAllLoaded();
          }
        }, handleFirebaseError);

        unsubCustomers = subscribeToCustomers((data) => {
          setCustomers(data);
          if (!loadedFlags.customers) {
            loadedFlags.customers = true;
            checkAllLoaded();
          }
        }, handleFirebaseError);
      } catch (error) {
        handleFirebaseError(error);
      }
    };

    startupTimeout = setTimeout(() => {
      handleFirebaseError({ code: 'startup-timeout' });
    }, 15000);

    initFirebase();

    // Cleanup subscriptions on unmount
    return () => {
      if (startupTimeout) clearTimeout(startupTimeout);
      if (unsubProducts) unsubProducts();
      if (unsubTransactions) unsubTransactions();
      if (unsubMutations) unsubMutations();
      if (unsubUsers) unsubUsers();
      if (unsubCustomers) unsubCustomers();
    };
  }, []);

  const handleAddKasirFromLogin = async () => {
    const name = addKasirName.trim();
    const username = addKasirUsername.trim().toLowerCase();
    const password = addKasirPassword;
    const confirm = addKasirConfirm;
    if (!name) { setAddKasirError('Nama wajib diisi.'); return; }
    if (!username) { setAddKasirError('Username wajib diisi.'); return; }
    if (username.length < 3) { setAddKasirError('Username minimal 3 karakter.'); return; }
    if (users.some((u) => u.username?.toLowerCase() === username)) {
      setAddKasirError('Username sudah digunakan, pilih yang lain.');
      return;
    }
    if (!password) { setAddKasirError('Sandi wajib diisi.'); return; }
    if (password.length < 6) { setAddKasirError('Sandi minimal 6 karakter.'); return; }
    if (password !== confirm) { setAddKasirError('Konfirmasi sandi tidak cocok.'); return; }
    const role = addKasirRole || 'Kasir';
    const newKasir = {
      id: 'U' + Date.now(),
      name,
      username,
      password,
      role,
    };
    setUsers((prev) => [...prev, newKasir]);
    try { await fbAddUser(newKasir); } catch (e) { console.error('fbAddUser error', e); }
    setAddKasirName('');
    setAddKasirUsername('');
    setAddKasirPassword('');
    setAddKasirConfirm('');
    setAddKasirRole('Kasir');
    setAddKasirError('');
    setIsAddKasirLoginOpen(false);
    Alert.alert('Akun Ditambahkan', `Akun "${name}" (${username}) dengan role "${role}" berhasil dibuat. Silakan login sekarang.`);
  };

  const handleLogin = () => {
    const username = loginUsername.trim().toLowerCase();
    const user = users.find((item) => item.username?.toLowerCase() === username);
    if (!user || user.password !== loginPassword) {
      setLoginError('Username atau sandi salah.');
      return;
    }

    setCurrentUser(user);
    const activeCashierTab = cashierTabs.find((tab) => tab.id === activeCashierTabId);
    setActiveShiftId(activeCashierTab?.shiftId || `SHIFT-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    setActiveTab(activeCashierTab?.activeTab || 'pos');
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveShiftId(null);
    setActiveTab('pos');
    setCart([]);
    setSelectedCustomer(null);
    setSelectedTransactionDate(formatDateInput(new Date()));
    setDiscountType('percent');
    setDiscountValue('0');
    setPayMethod('Tunai');
    setCashAmount('');
  };

  const handleCloseShift = () => {
    if (cart.length > 0) {
      Alert.alert('Keranjang belum kosong', 'Selesaikan atau kosongkan transaksi sebelum menutup shift.');
      return;
    }

    const shiftTransactions = transactions.filter((transaction) => transaction.shiftId === activeShiftId);
    const shiftIncomingStock = mutations.filter((mutation) => mutation.shiftId === activeShiftId && mutation.type === 'in');
    const itemSales = new Map();
    const paymentTotals = new Map();
    shiftTransactions.forEach((transaction) => {
      transaction.items?.forEach((item) => {
        const itemKey = `${item.productId || item.name}:${item.price}`;
        const sale = itemSales.get(itemKey) || { ...item, qty: 0, amount: 0 };
        sale.qty += item.qty || 0;
        sale.amount += (item.price || 0) * (item.qty || 0);
        itemSales.set(itemKey, sale);
      });
      const method = transaction.method || 'Lainnya';
      paymentTotals.set(method, (paymentTotals.get(method) || 0) + (transaction.total || 0));
    });

    const summary = {
      cashier: currentUser.name,
      shiftId: activeShiftId,
      closedAt: new Date(),
      transactions: shiftTransactions,
      items: [...itemSales.values()],
      incomingStock: shiftIncomingStock.map((mutation) => ({
        id: mutation.id,
        name: products.find((product) => product.id === mutation.productId)?.name || mutation.productId,
        qty: mutation.qty,
        date: mutation.date,
        note: mutation.note,
      })),
      subtotal: shiftTransactions.reduce((sum, transaction) => sum + (transaction.subtotal || transaction.total || 0), 0),
      discount: shiftTransactions.reduce((sum, transaction) => sum + (transaction.discountAmount || 0) + (transaction.promotionDiscountAmount || 0), 0),
      payments: [...paymentTotals.entries()].map(([method, amount]) => ({ method, amount })),
      total: shiftTransactions.reduce((sum, transaction) => sum + (transaction.total || 0), 0),
      cashTotal: shiftTransactions
        .filter((transaction) => transaction.method === 'Tunai')
        .reduce((sum, transaction) => sum + (transaction.total || 0), 0),
      nonCashTotal: shiftTransactions
        .filter((transaction) => transaction.method !== 'Tunai')
        .reduce((sum, transaction) => sum + (transaction.total || 0), 0),
      totalItems: shiftTransactions.reduce(
        (sum, transaction) => sum + (transaction.items || []).reduce((itemSum, item) => itemSum + (item.qty || 0), 0),
        0,
      ),
    };

    setClosedShiftSummary(summary);
    setIsUserSwitchOpen(false);
    setIsShiftReceiptOpen(true);
  };

  const printShiftReceipt = async () => {
    if (!closedShiftSummary) return;

    const itemsHtml = `<h2 class="history-title">Barang Terjual</h2>${closedShiftSummary.items.length
      ? closedShiftSummary.items.map((item) => `<article class="item"><div class="item-main"><span class="item-name">${escapeHtml(item.name)}</span><span class="item-amount">${formatRp(item.amount)}</span></div><div class="item-detail">${item.qty} pcs x ${formatRp(item.price)}</div></article>`).join('')
      : '<p class="item-detail">Tidak ada penjualan pada shift ini.</p>'}`;
    const incomingStockHtml = `<h2 class="history-title">Barang Masuk</h2>${closedShiftSummary.incomingStock.length
      ? closedShiftSummary.incomingStock.map((item) => `<article class="stock-entry"><div class="item-main"><span class="item-name">${escapeHtml(item.name)}</span><span class="item-amount">+${item.qty} pcs</span></div><div class="item-detail">${item.date ? escapeHtml(new Date(item.date).toLocaleString('id-ID')) : ''}${item.note ? ` · ${escapeHtml(item.note)}` : ''}</div></article>`).join('')
      : '<p class="item-detail">Tidak ada barang masuk pada shift ini.</p>'}`;
    const detailsHtml = `<div class="row"><span class="label">Kasir</span><span class="value">${escapeHtml(closedShiftSummary.cashier)}</span></div><div class="row"><span class="label">Jumlah transaksi</span><span class="value">${closedShiftSummary.transactions.length}</span></div><div class="row"><span class="label">Item terjual</span><span class="value">${closedShiftSummary.totalItems}</span></div>`;
    const paymentsHtml = closedShiftSummary.payments.map(({ method, amount }) => `<div class="row"><span>${escapeHtml(method)}</span><span class="value">${formatRp(amount)}</span></div>`).join('');
    const html = buildReceiptHtml({
      receiptNumber: closedShiftSummary.shiftId,
      date: closedShiftSummary.closedAt.toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      detailsHtml,
      itemsHtml,
      subtotal: closedShiftSummary.subtotal,
      discount: closedShiftSummary.discount,
      total: closedShiftSummary.total,
      paymentsHtml,
      extraHtml: incomingStockHtml,
    });

    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Shift receipt print error:', error);
      Alert.alert('Gagal mencetak struk shift', 'Pastikan printer atau layanan cetak perangkat tersedia, lalu coba lagi.');
    }
  };

  const finishShiftAndLogout = () => {
    setIsShiftReceiptOpen(false);
    setClosedShiftSummary(null);
    handleLogout();
  };

  const printCurrentReceipt = async () => {
    if (!currentReceipt) return;

    const itemsHtml = currentReceipt.items.map((item) => {
      const componentDetails = item.components?.length
        ? `<div class="item-detail">Isi paket: ${item.components.map((component) => `${escapeHtml(component.name)} x${component.qty}`).join(' + ')}</div>`
        : '';
      const promoSaving = item.regularPrice > item.price
        ? `<div class="item-detail">Hemat promo: ${formatRp((item.regularPrice - item.price) * item.qty)}</div>`
        : '';
      return `<article class="item"><div class="item-main"><span class="item-name">${escapeHtml(item.name)}</span><span class="item-amount">${formatRp(item.price * item.qty)}</span></div><div class="item-detail">${item.qty} pcs x ${formatRp(item.price)}</div>${componentDetails}${promoSaving}</article>`;
    }).join('');
    const detailsHtml = `<div class="row"><span class="label">Pelanggan</span><span class="value">${escapeHtml(currentReceipt.customer?.name || 'Pelanggan Umum')}</span></div>`;
    const paymentsHtml = `<div class="row"><span>${escapeHtml(currentReceipt.method || 'Pembayaran')}</span><span class="value">${formatRp(currentReceipt.total)}</span></div>${currentReceipt.method === 'Tunai' ? `<div class="row"><span class="label">Uang diterima</span><span class="value">${formatRp(currentReceipt.cashAmount)}</span></div><div class="row"><span class="label">Kembalian</span><span class="value">${formatRp(currentReceipt.changeAmount)}</span></div>` : ''}`;
    const html = buildReceiptHtml({
      receiptNumber: currentReceipt.id,
      date: new Date(currentReceipt.date).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      detailsHtml,
      itemsHtml,
      subtotal: currentReceipt.subtotal,
      discount: (currentReceipt.discountAmount || 0) + (currentReceipt.promotionDiscountAmount || 0),
      total: currentReceipt.total,
      paymentsHtml,
    });

    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Transaction receipt print error:', error);
      Alert.alert('Gagal mencetak struk', 'Pastikan printer atau layanan cetak perangkat tersedia, lalu coba lagi.');
    }
  };

  const downloadSalesReport = async () => {
    const rows = transactions.flatMap((tx) => tx.items.map((item) => [
      formatDateInput(tx.date),
      tx.id,
      tx.cashier || '-',
      item.name,
      item.qty,
      formatRp(item.price),
      formatRp(item.price * item.qty),
      formatRp(tx.total),
      tx.method || '-',
    ]));
    await exportTablePdf(
      `laporan-penjualan-${formatDateInput(new Date())}.pdf`,
      'Laporan Penjualan',
      ['Tanggal', 'ID Transaksi', 'Kasir', 'Produk', 'Qty', 'Harga Satuan', 'Total Item', 'Total Transaksi', 'Metode Pembayaran'],
      rows,
    );
  };

  const downloadStockReport = async () => {
    const rows = mutations
      .filter((mutation) => mutation.type === 'in')
      .map((mutation) => {
        const product = products.find((item) => item.id === mutation.productId);
        return [
          formatDateInput(mutation.date),
          mutation.id,
          product?.name || mutation.productId,
          mutation.qty,
          mutation.operator || '-',
          mutation.note || '-',
        ];
      });
    await exportTablePdf(
      `laporan-penambahan-stok-${formatDateInput(new Date())}.pdf`,
      'Laporan Penambahan Stok',
      ['Tanggal', 'ID Mutasi', 'Produk', 'Qty Ditambahkan', 'Petugas', 'Keterangan'],
      rows,
    );
  };

  const runPdfExport = async (exporter) => {
    if (pdfExporting || !pdfModulesReady) return;
    setPdfExporting(true);
    setPdfExportStatus('Sedang membuat PDF...');
    try {
      await exporter();
      setPdfExportStatus(Platform.OS === 'web'
        ? 'PDF selesai dibuat. Periksa folder Unduhan browser.'
        : 'PDF siap disimpan atau dibagikan.');
    } catch (error) {
      console.error('Report PDF export error:', error);
      setPdfExportStatus('PDF gagal dibuat. Coba lagi dan periksa izin penyimpanan perangkat.');
      if (Platform.OS !== 'web') {
        Alert.alert('Gagal membuat PDF', 'Coba lagi setelah memastikan perangkat dapat membuat atau membagikan file.');
      }
    } finally {
      setPdfExporting(false);
    }
  };

  // Period Filters
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [reportPeriod, setReportPeriod] = useState('day');
  const [reportsSubTab, setReportsSubTab] = useState('history'); // 'history' | 'finance'
  const [txSearch, setTxSearch] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editedTransactionItems, setEditedTransactionItems] = useState([]);
  const [editedTransactionCash, setEditedTransactionCash] = useState('');
  const [isTransactionSaving, setIsTransactionSaving] = useState(false);

  // POS Kasir Cart & Modals
  const [cart, setCart] = useState([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedTransactionDate, setSelectedTransactionDate] = useState(formatDateInput(new Date()));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [posSearch, setPosSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [payMethod, setPayMethod] = useState('Tunai');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState('0');
  const [cashAmount, setCashAmount] = useState('');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Anggur & Wine');
  const [prodStock, setProdStock] = useState('');
  const [prodHpp, setProdHpp] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [isPromotionProduct, setIsPromotionProduct] = useState(false);
  const [promotionItems, setPromotionItems] = useState([]);
  const [promotionSearch, setPromotionSearch] = useState('');

  // Mutation Modal
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [mutProdId, setMutProdId] = useState(INITIAL_PRODUCTS[0]?.id || '');
  const [mutType, setMutType] = useState('in');
  const [mutQty, setMutQty] = useState('');
  const [mutNote, setMutNote] = useState('');
  const [stockHistoryFilter, setStockHistoryFilter] = useState('all');

  // Stock Correction Modal
  const [isStockCorrectionOpen, setIsStockCorrectionOpen] = useState(false);
  const [corrProdId, setCorrProdId] = useState(INITIAL_PRODUCTS[0]?.id || '');
  const [corrPhysicalStock, setCorrPhysicalStock] = useState('');
  const [corrReason, setCorrReason] = useState('Koreksi Stok Fisik / Opname');

  // Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  const saveReceiptPng = async (receiptRef, filename, scrollRef) => {
    try {
      setIsReceiptPngSaving(true);
      if (!receiptRef.current) throw new Error('Receipt content is not available.');

      if (Platform.OS === 'web') {
        const { toPng } = await import('html-to-image');
        await document.fonts?.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const originalElement = receiptRef.current;
        const domNode = originalElement instanceof HTMLElement
          ? originalElement
          : (originalElement.getScrollableNode?.() || originalElement._nativeNode || originalElement);

        if (!domNode || typeof domNode.cloneNode !== 'function') {
          throw new Error('Elemen struk tidak valid untuk pembuatan gambar.');
        }

        // Buat container wrapper tersembunyi tanpa offset koordinat negatif pada clone
        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.width = '380px';
        wrapper.style.height = '100px';
        wrapper.style.overflow = 'hidden';
        wrapper.style.zIndex = '-99999';
        wrapper.style.opacity = '0';
        wrapper.style.pointerEvents = 'none';

        const clone = domNode.cloneNode(true);
        clone.style.position = 'relative';
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.margin = '0';
        clone.style.width = '380px';
        clone.style.maxWidth = '380px';
        clone.style.height = 'auto';
        clone.style.maxHeight = 'none';
        clone.style.overflow = 'visible';
        clone.style.backgroundColor = '#ffffff';
        clone.style.padding = '20px 16px 28px 16px';
        clone.style.boxSizing = 'border-box';

        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        await new Promise((resolve) => setTimeout(resolve, 150));
        const fullHeight = Math.ceil(Math.max(clone.scrollHeight, clone.offsetHeight)) + 24;
        const fullWidth = 380;

        let dataUrl;
        try {
          dataUrl = await toPng(clone, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            cacheBust: true,
            width: fullWidth,
            height: fullHeight,
            style: {
              position: 'static',
              top: '0',
              left: '0',
              margin: '0',
              width: `${fullWidth}px`,
              height: `${fullHeight}px`,
              maxHeight: 'none',
              overflow: 'visible',
              opacity: '1',
              transform: 'none',
            },
          });
        } finally {
          if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
          }
        }

        if (!dataUrl || dataUrl.length < 500) {
          throw new Error('Gagal merender gambar struk.');
        }

        // Siapkan Blob & File untuk Download / Share
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const file = new File([blob], filename, { type: 'image/png' });

        // 1. Coba Web Share API (Khusus iOS / iPhone Safari & PWA agar langsung muncul Sheet Simpan Gambar ke Galeri Foto)
        if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: filename,
            });
            return;
          } catch (shareErr) {
            if (shareErr.name === 'AbortError') return;
            console.warn('Web Share API error:', shareErr);
          }
        }

        // 2. Download otomatis via Blob URL (Desktop & Android)
        try {
          const blobUrl = URL.createObjectURL(blob);
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = filename;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          setTimeout(() => {
            if (downloadLink.parentNode) {
              downloadLink.parentNode.removeChild(downloadLink);
            }
            URL.revokeObjectURL(blobUrl);
          }, 1000);
        } catch (dlErr) {
          console.warn('Download link fallback error:', dlErr);
        }

        // 3. Tampilkan Preview Modal (Sangat membantu di iPhone/Safari jika unduhan otomatis terblokir)
        setReceiptPngPreview({
          url: dataUrl,
          filename: filename,
        });
        return;
      }

      const { captureRef } = await import('react-native-view-shot');
      const imageUri = await captureRef(scrollRef?.current || receiptRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        snapshotContentContainer: Boolean(scrollRef?.current),
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(imageUri, {
          mimeType: 'image/png',
          dialogTitle: 'Simpan atau bagikan struk PNG',
          UTI: 'public.png',
        });
      } else {
        Alert.alert('PNG dibuat', `Gambar struk tersimpan sementara di ${imageUri}`);
      }
    } catch (error) {
      console.error('Receipt PNG export error:', error);
      Alert.alert('Gagal membuat PNG', 'Coba lagi setelah struk selesai dimuat.');
    } finally {
      setIsReceiptPngSaving(false);
    }
  };

  // CRUD Search
  const [crudSearch, setCrudSearch] = useState('');

  const activeTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.status !== 'cancelled'),
    [transactions],
  );

  const transactionHistory = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [transactions],
  );

  const filteredTransactions = useMemo(() => {
    if (!txSearch.trim()) return transactionHistory;
    const q = txSearch.trim().toLowerCase();
    return transactionHistory.filter((tx) => {
      const matchId = tx.id && tx.id.toLowerCase().includes(q);
      const matchCashier = tx.cashier && tx.cashier.toLowerCase().includes(q);
      const matchCust = tx.customer?.name && tx.customer.name.toLowerCase().includes(q);
      const matchMethod = tx.method && tx.method.toLowerCase().includes(q);
      const matchItem = (tx.items || []).some(
        (it) => (it.name && it.name.toLowerCase().includes(q)) || (it.productId && String(it.productId).toLowerCase().includes(q))
      );
      return matchId || matchCashier || matchCust || matchMethod || matchItem;
    });
  }, [transactionHistory, txSearch]);

  const openReceiptForTransaction = (transaction) => {
    setCurrentReceipt(transaction);
    setIsReceiptModalOpen(true);
  };

  const getTransactionStockDemand = (items = []) => {
    const demand = new Map();
    items.forEach((item) => {
      const components = item.components?.length
        ? item.components
        : [{ productId: item.productId, qty: 1 }];
      components.forEach((component) => {
        if (!component.productId) return;
        const currentQty = demand.get(component.productId) || 0;
        demand.set(
          component.productId,
          currentQty + (Number(component.qty) || 0) * (Number(item.qty) || 0),
        );
      });
    });
    return demand;
  };

  const openTransactionEditor = (transaction) => {
    if (transaction.status === 'cancelled') return;
    setEditingTransaction(transaction);
    setEditedTransactionItems((transaction.items || []).map((item) => ({
      ...item,
      editQty: String(item.qty || 0),
    })));
    setEditedTransactionCash(String(transaction.cashAmount ?? transaction.total ?? 0));
  };

  const editedTransactionTotal = useMemo(() => {
    if (!editingTransaction) return 0;
    const items = editedTransactionItems.filter((item) => Number(item.editQty) > 0);
    const subtotal = items.reduce(
      (sum, item) => sum + (Number(item.regularPrice ?? item.price) || 0) * Number(item.editQty),
      0,
    );
    const promotionDiscount = items.reduce(
      (sum, item) => sum + Math.max(0, (Number(item.regularPrice ?? item.price) || 0) - (Number(item.price) || 0)) * Number(item.editQty),
      0,
    );
    const discountedSubtotal = Math.max(0, subtotal - promotionDiscount);
    const discountValue = Number(editingTransaction.discountValue) || 0;
    const discountAmount = Math.min(
      discountedSubtotal,
      editingTransaction.discountType === 'percent'
        ? (discountedSubtotal * discountValue) / 100
        : discountValue,
    );
    return Math.max(0, discountedSubtotal - discountAmount + (Number(editingTransaction.taxAmount) || 0));
  }, [editingTransaction, editedTransactionItems]);

  const saveTransactionEdit = async () => {
    if (!editingTransaction || isTransactionSaving) return;

    const hasInvalidQty = editedTransactionItems.some(
      (item) => !/^\d+$/.test(item.editQty.trim()),
    );
    if (hasInvalidQty) {
      Alert.alert('Jumlah tidak valid', 'Masukkan jumlah barang berupa bilangan bulat nol atau lebih.');
      return;
    }

    const updatedItems = editedTransactionItems
      .map(({ editQty, ...item }) => ({ ...item, qty: Number(editQty) }))
      .filter((item) => item.qty > 0);
    if (!updatedItems.length) {
      Alert.alert('Transaksi kosong', 'Sisakan minimal satu barang atau batalkan transaksi.');
      return;
    }

    const oldDemand = getTransactionStockDemand(editingTransaction.items || []);
    const newDemand = getTransactionStockDemand(updatedItems);
    const stockUpdates = [];
    for (const productId of new Set([...oldDemand.keys(), ...newDemand.keys()])) {
      const stockDelta = (oldDemand.get(productId) || 0) - (newDemand.get(productId) || 0);
      if (!stockDelta) continue;
      const product = products.find((candidate) => candidate.id === productId);
      if (!product) {
        Alert.alert('Produk tidak tersedia', `Stok produk ${productId} tidak ditemukan; transaksi tidak diubah.`);
        return;
      }
      const newStock = (Number(product.stock) || 0) + stockDelta;
      if (newStock < 0) {
        Alert.alert('Stok Tidak Cukup', `${product.name} hanya tersedia ${product.stock} unit.`);
        return;
      }
      stockUpdates.push({ id: productId, newStock });
    }

    const subtotal = updatedItems.reduce(
      (sum, item) => sum + (Number(item.regularPrice ?? item.price) || 0) * item.qty,
      0,
    );
    const promotionDiscountAmount = updatedItems.reduce(
      (sum, item) => sum + Math.max(0, (Number(item.regularPrice ?? item.price) || 0) - (Number(item.price) || 0)) * item.qty,
      0,
    );
    const discountedSubtotal = Math.max(0, subtotal - promotionDiscountAmount);
    const discountValue = Number(editingTransaction.discountValue) || 0;
    const discountAmount = Math.min(
      discountedSubtotal,
      editingTransaction.discountType === 'percent'
        ? (discountedSubtotal * discountValue) / 100
        : discountValue,
    );
    const total = Math.max(0, discountedSubtotal - discountAmount + (Number(editingTransaction.taxAmount) || 0));
    const cashAmount = editingTransaction.method === 'Tunai'
      ? Number(editedTransactionCash)
      : total;
    if (!Number.isFinite(cashAmount) || cashAmount < total) {
      Alert.alert('Pembayaran Kurang', 'Uang yang diterima harus sama dengan atau lebih besar dari total transaksi.');
      return;
    }

    const updatedTransaction = {
      ...editingTransaction,
      items: updatedItems,
      subtotal,
      promotionDiscountAmount,
      discountAmount,
      total,
      cashAmount,
      changeAmount: Math.max(0, cashAmount - total),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Pengguna',
    };
    const { id, ...transactionData } = updatedTransaction;

    setIsTransactionSaving(true);
    try {
      await fbUpdateTransactionAndStocks(id, transactionData, stockUpdates);
      setProducts((previous) => previous.map((product) => {
        const stockUpdate = stockUpdates.find((update) => update.id === product.id);
        return stockUpdate ? { ...product, stock: stockUpdate.newStock } : product;
      }));
      setTransactions((previous) => previous.map((transaction) => (
        transaction.id === id ? updatedTransaction : transaction
      )));
      setEditingTransaction(null);
      Alert.alert('Transaksi diperbarui', 'Perubahan transaksi dan penyesuaian stok berhasil disimpan.');
    } catch (error) {
      console.error('Firestore update transaction error:', error);
      Alert.alert('Gagal menyimpan transaksi', 'Perubahan tidak tersimpan. Periksa koneksi database lalu coba lagi.');
    } finally {
      setIsTransactionSaving(false);
    }
  };

  const cancelTransaction = async (transaction) => {
    if (transaction.status === 'cancelled' || isTransactionSaving) return;

    const stockDemand = getTransactionStockDemand(transaction.items || []);
    const stockUpdates = [];
    stockDemand.forEach((qty, productId) => {
      const product = products.find((candidate) => candidate.id === productId);
      if (product && qty > 0) {
        stockUpdates.push({ id: productId, newStock: (Number(product.stock) || 0) + qty });
      }
    });
    const cancelledTransaction = {
      ...transaction,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: currentUser?.name || 'Pengguna',
    };
    const { id, ...transactionData } = cancelledTransaction;

    setIsTransactionSaving(true);
    try {
      await fbUpdateTransactionAndStocks(id, transactionData, stockUpdates);
      setProducts((previous) => previous.map((product) => {
        const stockUpdate = stockUpdates.find((update) => update.id === product.id);
        return stockUpdate ? { ...product, stock: stockUpdate.newStock } : product;
      }));
      setTransactions((previous) => previous.map((item) => (
        item.id === id ? cancelledTransaction : item
      )));
      Alert.alert('Transaksi dibatalkan', `Transaksi ${id} berhasil dibatalkan dan stok dikembalikan.`);
    } catch (error) {
      console.error('Firestore cancel transaction error:', error);
      Alert.alert('Gagal membatalkan transaksi', 'Perubahan tidak tersimpan. Periksa koneksi database lalu coba lagi.');
    } finally {
      setIsTransactionSaving(false);
    }
  };

  const cancelMutation = async (mutation) => {
    if (!isSuperAdmin) {
      Alert.alert('Akses Ditolak', 'Hanya Super Admin yang berhak membatalkan mutasi stok.');
      return;
    }

    const prod = products.find((p) => p.id === mutation.productId);
    if (!prod) {
      Alert.alert('Error', 'Produk tidak ditemukan.');
      return;
    }

    let restoredStock = prod.stock;
    const qty = Number(mutation.qty) || 0;
    if (mutation.type === 'in') {
      // Dibatalkan: kurangi kembali stok yang sebelumnya ditambah
      restoredStock = Math.max(0, prod.stock - qty);
    } else if (mutation.type === 'out') {
      // Dibatalkan: kembalikan stok yang sebelumnya dikurangi
      restoredStock = prod.stock + Math.abs(qty);
    } else if (mutation.type === 'koreksi') {
      // Koreksi opname selisihnya qty; dibatalkan: kurangi kembali selisih tersebut
      restoredStock = Math.max(0, prod.stock - qty);
    }

    setIsTransactionSaving(true);
    try {
      await fbCancelMutationAndRestoreStock(mutation.id, mutation.productId, restoredStock);
      setProducts((prev) => prev.map((p) => (p.id === mutation.productId ? { ...p, stock: restoredStock } : p)));
      setMutations((prev) => prev.filter((m) => m.id !== mutation.id));
      Alert.alert('Mutasi Dibatalkan', `Catatan mutasi ${mutation.id} dihapus dan stok ${prod.name} diperbarui menjadi ${restoredStock} unit.`);
    } catch (e) {
      console.error('Cancel mutation error:', e);
      Alert.alert('Gagal membatalkan mutasi', 'Periksa koneksi database lalu coba lagi.');
    } finally {
      setIsTransactionSaving(false);
    }
  };

  const confirmCancelMutation = (mutation) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      const ok = window.confirm(`Batalkan catatan mutasi stok ini?` +
        `\n\nID: ${mutation.id}` +
        `\nProduk: ${mutation.productName}` +
        `\nJumlah: ${mutation.qty} unit` +
        `\n\nStok akan langsung dikembalikan ke kondisi sebelum mutasi dicatat.`);
      if (ok) {
        cancelMutation(mutation);
      }
      return;
    }
    Alert.alert(
      'Batalkan Mutasi Stok?',
      `Catatan mutasi ${mutation.id} akan dibatalkan dan stok ${mutation.productName} akan langsung diperbarui kembali.`,
      [
        { text: 'Kembali', style: 'cancel' },
        { text: 'Batalkan Mutasi', style: 'destructive', onPress: () => cancelMutation(mutation) },
      ],
    );
  };

  const cancelTransactionFromStock = (transactionId) => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) {
      Alert.alert('Transaksi Tidak Ditemukan', `Transaksi dengan nomor ${transactionId} tidak ditemukan.`);
      return;
    }
    confirmCancelTransaction(tx);
  };

  const confirmCancelTransaction = (transaction) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      const ok = window.confirm(`Batalkan transaksi ${transaction.id}?\n\nTransaksi akan ditandai batal dan stok barang akan otomatis dikembalikan ke inventori.`);
      if (ok) {
        cancelTransaction(transaction);
      }
      return;
    }
    Alert.alert(
      'Batalkan transaksi?',
      `Transaksi ${transaction.id} akan ditandai batal dan stok barang dikembalikan.`,
      [
        { text: 'Kembali', style: 'cancel' },
        { text: 'Batalkan Transaksi', style: 'destructive', onPress: () => cancelTransaction(transaction) },
      ],
    );
  };

  const stockHistory = useMemo(() => {
    const mutationEntries = mutations.map((mutation) => ({
      ...mutation,
      source: 'mutation',
      productName: products.find((product) => product.id === mutation.productId)?.name || mutation.productId || 'Produk tidak tersedia',
    }));
    const saleEntries = transactions.flatMap((transaction) =>
      (transaction.items || [])
        .filter((item) => item.qty > 0)
        .map((item, index) => ({
          id: `sale-${transaction.id}-${index}`,
          transactionId: transaction.id,
          transactionStatus: transaction.status,
          isCancelled: transaction.status === 'cancelled',
          date: transaction.date,
          productId: item.productId,
          productName: item.name || products.find((product) => product.id === item.productId)?.name || item.productId || 'Produk tidak tersedia',
          type: 'out',
          qty: item.qty,
          note: transaction.status === 'cancelled'
            ? `Penjualan Batal · ${transaction.id}`
            : `Penjualan · ${transaction.id}`,
          operator: transaction.cashier || 'Kasir',
          source: 'sale',
        })),
    );
    return [...mutationEntries, ...saleEntries].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
    );
  }, [mutations, products, transactions]);

  const stockHistoryTotals = useMemo(() => ({
    restocked: stockHistory
      .filter((entry) => entry.type === 'in')
      .reduce((total, entry) => total + Math.abs(Number(entry.qty) || 0), 0),
    removed: stockHistory
      .filter((entry) => entry.type === 'out')
      .reduce((total, entry) => total + Math.abs(Number(entry.qty) || 0), 0),
  }), [stockHistory]);

  const filteredStockHistory = useMemo(() => (
    stockHistoryFilter === 'all'
      ? stockHistory
      : stockHistory.filter((entry) => entry.type === stockHistoryFilter)
  ), [stockHistory, stockHistoryFilter]);

  const financialMetrics = useMemo(() => {
    const todayStr = formatDateInput(new Date());
    const yesterdayObj = getOffsetDate(1);
    const yesterdayStr = formatDateInput(yesterdayObj);

    const filteredTx = transactions.filter((t) => {
      const tDate = new Date(t.date);
      const tDateStr = formatDateInput(tDate);

      if (selectedPeriod === 'today') return tDateStr === todayStr;
      if (selectedPeriod === 'yesterday') return tDateStr === yesterdayStr;
      if (selectedPeriod === 'month') {
        const now = new Date();
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      }
      if (selectedPeriod === 'year') {
        return tDate.getFullYear() === new Date().getFullYear();
      }
      return true;
    });

    const filteredMutations = mutations.filter((m) => {
      const mDate = new Date(m.date);
      const mDateStr = formatDateInput(mDate);

      if (selectedPeriod === 'today') return mDateStr === todayStr;
      if (selectedPeriod === 'yesterday') return mDateStr === yesterdayStr;
      if (selectedPeriod === 'month') {
        const now = new Date();
        return mDate.getMonth() === now.getMonth() && mDate.getFullYear() === now.getFullYear();
      }
      if (selectedPeriod === 'year') return mDate.getFullYear() === new Date().getFullYear();
      return true;
    });

    let omzet = 0;
    let totalHpp = 0;
    let totalDiscountGiven = 0;

    filteredTx.forEach((t) => {
      omzet += t.total;
      totalDiscountGiven += (t.discountAmount || 0) + (t.promotionDiscountAmount || 0);
      t.items.forEach((i) => {
        totalHpp += i.hpp * i.qty;
      });
    });

    let totalNonSalesExpense = 0;
    filteredMutations.forEach((m) => {
      const p = products.find((prod) => prod.id === m.productId);
      if (p) {
        if (m.type === 'out') {
          totalNonSalesExpense += p.hpp * m.qty;
        } else if (m.type === 'koreksi' && m.qty < 0) {
          totalNonSalesExpense += p.hpp * Math.abs(m.qty);
        }
      }
    });

    const grossProfit = omzet - totalHpp;
    const netProfit = grossProfit - totalNonSalesExpense;
    const transactionCount = filteredTx.length;

    return {
      omzet,
      totalHpp,
      grossProfit,
      totalExpense: totalNonSalesExpense,
      netProfit,
      totalDiscountGiven,
      transactionCount,
      filteredTx,
    };
  }, [transactions, mutations, products, selectedPeriod]);

  const reportData = useMemo(() => {
    const now = new Date();
    const inPeriod = (dateValue) => {
      const date = new Date(dateValue);
      if (reportPeriod === 'day') {
        return formatDateInput(date) === formatDateInput(now);
      }
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    };
    const periodTransactions = transactions.filter((transaction) => inPeriod(transaction.date));
    const periodMutations = mutations.filter((mutation) => inPeriod(mutation.date));
    const soldProducts = new Map();
    const paymentSummary = new Map();

    let revenue = 0;
    let costOfGoodsSold = 0;
    let discountTotal = 0;
    periodTransactions.forEach((transaction) => {
      revenue += transaction.total || 0;
      discountTotal += (transaction.discountAmount || 0) + (transaction.promotionDiscountAmount || 0);
      const payment = paymentSummary.get(transaction.method) || { count: 0, total: 0 };
      payment.count += 1;
      payment.total += transaction.total || 0;
      paymentSummary.set(transaction.method, payment);
      (transaction.items || []).forEach((item) => {
        const sold = soldProducts.get(item.productId) || {
          id: item.productId,
          name: item.name,
          qty: 0,
          total: 0,
          hpp: 0,
          promotionDiscount: 0,
        };
        sold.qty += item.qty || 0;
        sold.total += (item.price || 0) * (item.qty || 0);
        sold.promotionDiscount += Math.max(0, (item.regularPrice || item.price || 0) - (item.price || 0)) * (item.qty || 0);
        sold.hpp += (item.hpp || 0) * (item.qty || 0);
        soldProducts.set(item.productId, sold);
        costOfGoodsSold += (item.hpp || 0) * (item.qty || 0);
      });
    });

    let stockPurchaseCashOut = 0;
    let operationalLoss = 0;
    periodMutations.forEach((mutation) => {
      const product = products.find((item) => item.id === mutation.productId);
      const unitCost = product?.hpp || 0;
      if (mutation.type === 'in') stockPurchaseCashOut += unitCost * Math.max(0, mutation.qty || 0);
      if (mutation.type === 'out') operationalLoss += unitCost * Math.max(0, mutation.qty || 0);
      if (mutation.type === 'koreksi' && mutation.qty < 0) operationalLoss += unitCost * Math.abs(mutation.qty);
    });

    const grossProfit = revenue - costOfGoodsSold;
    const netProfit = grossProfit - operationalLoss;
    const estimatedNetCashFlow = revenue - stockPurchaseCashOut - operationalLoss;
    const soldList = Array.from(soldProducts.values()).sort((a, b) => b.qty - a.qty);
    const unsoldProducts = products
      .filter((product) => !soldProducts.has(product.id))
      .map((product) => {
        if (!product.isPromotion) return product;
        const componentAvailability = (product.promotionItems || []).map((component) => {
          const sourceProduct = products.find((item) => item.id === component.productId);
          return sourceProduct ? Math.floor(sourceProduct.stock / component.qty) : 0;
        });
        return { ...product, stock: componentAvailability.length ? Math.min(...componentAvailability) : 0 };
      });

    return {
      periodTransactions,
      periodMutations,
      revenue,
      costOfGoodsSold,
      discountTotal,
      grossProfit,
      operationalLoss,
      netProfit,
      stockPurchaseCashOut,
      estimatedNetCashFlow,
      soldList,
      unsoldProducts,
      paymentSummary: Array.from(paymentSummary.entries()).map(([method, summary]) => ({ method, ...summary })),
      periodLabel: reportPeriod === 'day'
        ? `Harian - ${formatDateInput(now)}`
        : `Bulanan - ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
    };
  }, [transactions, mutations, products, reportPeriod]);

  const downloadFinancialPdf = async () => {
    const productRows = (items, emptyText) => items.length
      ? items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.qty}</td><td>${formatRp(item.hpp)}</td><td>${formatRp(item.promotionDiscount)}</td><td>${formatRp(item.total)}</td><td>${formatRp(item.total - item.hpp)}</td></tr>`).join('')
      : `<tr><td colspan="6">${emptyText}</td></tr>`;
    const unsoldRows = reportData.unsoldProducts.length
      ? reportData.unsoldProducts.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.category || '-')}</td><td>${item.stock}</td></tr>`).join('')
      : '<tr><td colspan="3">Semua produk memiliki penjualan pada periode ini.</td></tr>';
    const paymentRows = reportData.paymentSummary.length
      ? reportData.paymentSummary.map((item) => `<tr><td>${escapeHtml(item.method || 'Tidak diketahui')}</td><td>${item.count}</td><td>${formatRp(item.total)}</td></tr>`).join('')
      : '<tr><td colspan="3">Belum ada transaksi.</td></tr>';
    const stockMutationRows = reportData.periodMutations.length
      ? reportData.periodMutations.map((mutation) => {
        const product = products.find((item) => item.id === mutation.productId);
        const typeLabel = mutation.type === 'in' ? 'Stok masuk' : mutation.type === 'out' ? 'Stok keluar' : 'Koreksi stok';
        const unitCost = product?.hpp || 0;
        return `<tr><td>${escapeHtml(formatDateInput(mutation.date))}</td><td>${escapeHtml(typeLabel)}</td><td>${escapeHtml(product?.name || mutation.productId)}</td><td>${mutation.qty > 0 ? '+' : ''}${mutation.qty}</td><td>${formatRp(unitCost)}</td><td>${formatRp(Math.abs(mutation.qty || 0) * unitCost)}</td><td>${escapeHtml(mutation.operator || '-')}</td><td>${escapeHtml(mutation.note || '-')}</td></tr>`;
      }).join('')
      : '<tr><td colspan="8">Tidak ada mutasi stok pada periode ini.</td></tr>';
    // Group transactions by cashier
    const txByCashier = reportData.periodTransactions.reduce((groups, tx) => {
      const key = tx.cashier || '-';
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
      return groups;
    }, {});
    const cashierNames = Object.keys(txByCashier).sort();
    const renderTxHtml = (transaction) => {
      const items = transaction.items || [];
      const itemSubtotal = items.reduce((sum, item) => sum + (item.regularPrice ?? item.price ?? 0) * (item.qty || 0), 0);
      const subtotal = transaction.subtotal ?? itemSubtotal;
      const discount = transaction.discountAmount || 0;
      const promotionDiscount = transaction.promotionDiscountAmount ?? items.reduce((sum, item) => (
        sum + Math.max(0, (item.regularPrice || item.price || 0) - (item.price || 0)) * (item.qty || 0)
      ), 0);
      const total = transaction.total ?? Math.max(0, subtotal - promotionDiscount - discount);
      const discountLabel = transaction.discountType === 'percent'
        ? `${transaction.discountValue || 0}%`
        : formatRp(transaction.discountValue || discount);
      const itemRows = items.map((item) => {
        const qty = item.qty || 0;
        const sales = (item.price || 0) * qty;
        const itemHpp = (item.hpp || 0) * qty;
        const regularPrice = item.regularPrice ?? item.price ?? 0;
        const bundleContents = item.components?.length
          ? `<br><small>Paket: ${item.components.map((c) => `${escapeHtml(c.name)} x${c.qty}`).join(' + ')}</small>`
          : '';
        const promotionSaving = regularPrice > item.price
          ? `<br><small>Hemat ${formatRp((regularPrice - item.price) * qty)}</small>`
          : '';
        return `<tr><td>${escapeHtml(item.name)}${bundleContents}</td><td>${qty}</td><td>${formatRp(regularPrice)} / ${formatRp(item.price || 0)}</td><td>${formatRp(item.hpp || 0)}</td><td>${formatRp(sales)}${promotionSaving}</td><td>${formatRp(itemHpp)}</td><td>${formatRp(sales - itemHpp)}</td></tr>`;
      }).join('');
      const customerName = transaction.customer?.name || transaction.customerName || 'Pelanggan Umum';
      const received = transaction.cashAmount ?? total;
      return `<article class="transaction"><div class="transactionTitle"><strong>Transaksi ${escapeHtml(transaction.id)}</strong><strong>${formatRp(total)}</strong></div><div class="transactionMeta"><span>Tanggal: ${escapeHtml(new Date(transaction.date).toLocaleString('id-ID'))}</span><span>Pelanggan: ${escapeHtml(customerName)}${transaction.customer?.phone ? ` (${escapeHtml(transaction.customer.phone)})` : ''}</span><span>Metode: ${escapeHtml(transaction.method || '-')}</span></div><table><thead><tr><th>Barang</th><th>Qty</th><th>Harga Normal / Promo</th><th>HPP/Unit</th><th>Penjualan</th><th>HPP</th><th>Laba Kotor</th></tr></thead><tbody>${itemRows || '<tr><td colspan="7">Rincian barang tidak tersedia.</td></tr>'}</tbody></table><div class="transactionTotals"><span>Subtotal normal: ${formatRp(subtotal)}</span>${promotionDiscount ? `<span>Hemat paket promo: -${formatRp(promotionDiscount)}</span>` : ''}<span>Diskon tambahan (${escapeHtml(discountLabel)}): -${formatRp(discount)}</span><strong>Total Tagihan: ${formatRp(total)}</strong><span>${transaction.method === 'Tunai' ? `Uang diterima: ${formatRp(received)}` : `Dibayar: ${formatRp(received)}`}</span>${transaction.method === 'Tunai' ? `<span>Kembalian: ${formatRp(transaction.changeAmount ?? Math.max(0, received - total))}</span>` : ''}</div></article>`;
    };
    const transactionRows = reportData.periodTransactions.length
      ? cashierNames.map((cashierName) => {
        const txList = txByCashier[cashierName];
        const cashierTotal = txList.reduce((sum, tx) => sum + (tx.total || 0), 0);
        const cashierUnits = txList.reduce((sum, tx) => sum + (tx.items || []).reduce((s, i) => s + (i.qty || 0), 0), 0);
        return `<div class="cashierGroup"><div class="cashierHeader"><span>&#128100; Kasir: <strong>${escapeHtml(cashierName)}</strong></span><span>${txList.length} transaksi &nbsp;|&nbsp; ${cashierUnits} unit &nbsp;|&nbsp; <strong>${formatRp(cashierTotal)}</strong></span></div>${txList.map(renderTxHtml).join('')}<div class="cashierSubtotal"><span>Sub-total Kasir <strong>${escapeHtml(cashierName)}</strong></span><span>${txList.length} transaksi &nbsp;&bull;&nbsp; ${cashierUnits} unit &nbsp;&bull;&nbsp; <strong>${formatRp(cashierTotal)}</strong></span></div></div>`;
      }).join('')
      : '<p>Belum ada penjualan pada periode ini.</p>';
    const totalUnitsSold = reportData.soldList.reduce((sum, item) => sum + item.qty, 0);
    const grossSales = reportData.soldList.reduce((sum, item) => sum + item.total, 0)
      + reportData.periodTransactions.reduce((sum, transaction) => sum + (transaction.discountAmount || 0) + (transaction.promotionDiscountAmount || 0), 0);
    const cashTransactions = reportData.periodTransactions.filter((transaction) => transaction.method === 'Tunai');
    const cashReceipts = cashTransactions.reduce((sum, transaction) => sum + (transaction.total || 0), 0);
    const nonCashReceipts = reportData.revenue - cashReceipts;
    const cashCollected = cashTransactions.reduce((sum, transaction) => sum + (transaction.cashAmount || 0), 0);
    const cashChange = cashTransactions.reduce((sum, transaction) => sum + (transaction.changeAmount || 0), 0);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1f2937;font-size:9px;margin:0}h1{font-size:19px;margin:0 0 4px;color:#111827}h2{font-size:11px;margin:13px 0 5px;border-bottom:1px solid #9ca3af;padding-bottom:4px;color:#111827;break-after:avoid}.reportHeader{border-bottom:2px solid #047857;padding-bottom:8px;margin-bottom:8px}.subtitle{color:#4b5563;font-size:9px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.metric{padding:6px;border:1px solid #d1d5db}.metric span{display:block;color:#4b5563;font-size:8px}.metric strong{display:block;margin-top:3px;font-size:10px;color:#111827}p{line-height:1.4;margin:5px 0}table{width:100%;border-collapse:collapse;margin:4px 0 8px;table-layout:auto}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid #bfc5cc;padding:4px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eef5f1;color:#1f2937;font-size:8px}.transaction{border:1px solid #aeb6bf;padding:6px;margin:7px 0;break-inside:auto;page-break-inside:auto}.transactionTitle{display:flex;justify-content:space-between;gap:10px;font-size:10px;color:#111827}.transactionMeta{display:flex;flex-wrap:wrap;gap:4px 14px;color:#374151;font-size:8px;line-height:1.4;margin:5px 0}.transaction table{font-size:8px}.transactionTotals{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:5px;padding-top:5px;border-top:1px solid #cbd5e1;font-size:8px}.cashierGroup{margin:10px 0 16px;border:2px solid #047857;border-radius:4px;overflow:hidden}.cashierHeader{background:#047857;color:#fff;padding:6px 10px;display:flex;justify-content:space-between;align-items:center;font-size:9px;break-after:avoid}.cashierHeader strong{font-size:10px}.cashierSubtotal{background:#eef5f1;border-top:2px solid #047857;padding:5px 10px;display:flex;justify-content:space-between;align-items:center;font-size:8px;color:#1f2937}.cashierSubtotal strong{color:#047857}.cashierGroup .transaction{margin:6px 8px;border-radius:2px}.foot{margin-top:12px;padding-top:5px;border-top:1px solid #d1d5db;color:#4b5563;font-size:8px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body>
      <header class="reportHeader"><h1>LAPORAN KEUANGAN DAN PENJUALAN</h1><div class="subtitle">${escapeHtml(reportData.periodLabel)} | Dicetak ${escapeHtml(new Date().toLocaleString('id-ID'))}</div></header>
      <h2>Ringkasan Arus Kas dan Laba</h2><div class="grid">
      <div class="metric"><span>Penjualan Sebelum Diskon</span><strong>${formatRp(grossSales)}</strong></div>
      <div class="metric"><span>Penerimaan Setelah Diskon</span><strong>${formatRp(reportData.revenue)}</strong></div>
      <div class="metric"><span>Arus Kas Bersih Estimasi</span><strong>${formatRp(reportData.estimatedNetCashFlow)}</strong></div>
      <div class="metric"><span>HPP Barang Terjual</span><strong>${formatRp(reportData.costOfGoodsSold)}</strong></div>
      <div class="metric"><span>Laba Kotor</span><strong>${formatRp(reportData.grossProfit)}</strong></div>
      <div class="metric"><span>Laba Bersih Estimasi</span><strong>${formatRp(reportData.netProfit)}</strong></div>
      <div class="metric"><span>Diskon Penjualan</span><strong>${formatRp(reportData.discountTotal)}</strong></div>
      <div class="metric"><span>Pengeluaran Pembelian Stok</span><strong>${formatRp(reportData.stockPurchaseCashOut)}</strong></div>
      <div class="metric"><span>Kerugian Barang Keluar/Opname</span><strong>${formatRp(reportData.operationalLoss)}</strong></div>
      <div class="metric"><span>Penerimaan Tunai</span><strong>${formatRp(cashReceipts)}</strong></div>
      <div class="metric"><span>Penerimaan Non-Tunai</span><strong>${formatRp(nonCashReceipts)}</strong></div>
      <div class="metric"><span>Uang Tunai Diterima</span><strong>${formatRp(cashCollected)}</strong></div>
      <div class="metric"><span>Total Kembalian</span><strong>${formatRp(cashChange)}</strong></div>
      <div class="metric"><span>Jumlah Transaksi</span><strong>${reportData.periodTransactions.length}</strong></div>
      <div class="metric"><span>Total Unit Terjual</span><strong>${totalUnitsSold}</strong></div></div>
      <h2>Analisis</h2><p>Periode ini mencatat ${reportData.periodTransactions.length} transaksi dan ${totalUnitsSold} unit terjual dengan penerimaan bersih setelah diskon sebesar ${formatRp(reportData.revenue)}. Total diskon tercatat ${formatRp(reportData.discountTotal)}. Margin laba kotor ${reportData.revenue ? `${((reportData.grossProfit / reportData.revenue) * 100).toFixed(1)}%` : '0%'} dari penerimaan. Arus kas bersih estimasi memperhitungkan penerimaan penjualan dikurangi penambahan stok dan kehilangan stok. Laba bersih estimasi memperhitungkan HPP barang terjual dan kehilangan stok; pembelian stok merupakan arus kas persediaan, bukan beban laba langsung.</p>
      <h2>Ringkasan Produk Terjual</h2><table><thead><tr><th>Produk</th><th>Qty</th><th>HPP</th><th>Hemat Promo</th><th>Penjualan Setelah Promo</th><th>Laba Kotor</th></tr></thead><tbody>${productRows(reportData.soldList, 'Belum ada produk terjual.')}</tbody></table>
      <h2>Produk Tidak Terjual</h2><table><thead><tr><th>Produk</th><th>Kategori</th><th>Stok Saat Ini</th></tr></thead><tbody>${unsoldRows}</tbody></table>
      <h2>Metode Pembayaran</h2><table><thead><tr><th>Metode</th><th>Transaksi</th><th>Total</th></tr></thead><tbody>${paymentRows}</tbody></table>
      <h2>Rincian Penjualan Per Transaksi</h2>${transactionRows}
      <h2>Mutasi Stok Periode Ini</h2><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Produk</th><th>Selisih Qty</th><th>HPP/Unit</th><th>Nilai HPP</th><th>Petugas</th><th>Keterangan</th></tr></thead><tbody>${stockMutationRows}</tbody></table>
      <div class="foot">Laporan lengkap berdasarkan transaksi dan mutasi dalam periode terpilih. Laba dan nilai mutasi dihitung sebagai estimasi menggunakan HPP produk yang tersimpan. Dokumen ini tidak menggunakan logo agar ruang laporan maksimal dan kolom tetap rapi.</div></body></html>`;

    try {
      if (Platform.OS === 'web') {
        const { jsPDF, autoTable } = await loadWebPdfModules();
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 12;
        let cursorY = 16;

        const drawPageHeader = () => {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(90, 100, 95);
          pdf.text(`LAPORAN KEUANGAN DAN PENJUALAN | ${reportData.periodLabel}`, margin, 8);
          pdf.text(`Halaman ${pdf.internal.getNumberOfPages()}`, pageWidth - margin, 8, { align: 'right' });
        };

        const addSection = (title) => {
          if (cursorY > pageHeight - 20) {
            pdf.addPage();
            cursorY = 16;
          }
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(25, 55, 43);
          pdf.text(title, margin, cursorY);
          cursorY += 3;
          pdf.setDrawColor(35, 120, 82);
          pdf.line(margin, cursorY, pageWidth - margin, cursorY);
          cursorY += 3;
        };

        const addTable = (head, body, options = {}) => {
          autoTable(pdf, {
            startY: cursorY,
            head: [head],
            body,
            margin: { left: margin, right: margin, top: 14, bottom: 12 },
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, overflow: 'linebreak', textColor: [35, 40, 38] },
            headStyles: { fillColor: [231, 242, 235], textColor: [25, 55, 43], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 248] },
            didDrawPage: drawPageHeader,
            ...options,
          });
          cursorY = pdf.lastAutoTable.finalY + 6;
        };

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(17);
        pdf.setTextColor(25, 55, 43);
        pdf.text('LAPORAN KEUANGAN DAN PENJUALAN', margin, cursorY);
        cursorY += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(75, 85, 80);
        pdf.text(`${reportData.periodLabel} | Dicetak ${new Date().toLocaleString('id-ID')}`, margin, cursorY);
        cursorY += 8;

        addSection('RINGKASAN ARUS KAS DAN LABA');
        const financialSummary = [
          ['Penjualan sebelum diskon', formatRp(grossSales)],
          ['Penerimaan setelah diskon', formatRp(reportData.revenue)],
          ['Arus kas bersih estimasi', formatRp(reportData.estimatedNetCashFlow)],
          ['HPP barang terjual', formatRp(reportData.costOfGoodsSold)],
          ['Laba kotor', formatRp(reportData.grossProfit)],
          ['Laba bersih estimasi', formatRp(reportData.netProfit)],
          ['Total diskon', formatRp(reportData.discountTotal)],
          ['Pembelian stok', formatRp(reportData.stockPurchaseCashOut)],
          ['Kerugian stok', formatRp(reportData.operationalLoss)],
          ['Penerimaan tunai', formatRp(cashReceipts)],
          ['Penerimaan non-tunai', formatRp(nonCashReceipts)],
          ['Uang tunai diterima', formatRp(cashCollected)],
          ['Total kembalian', formatRp(cashChange)],
          ['Jumlah transaksi / unit', `${reportData.periodTransactions.length} / ${totalUnitsSold}`],
        ];
        const financialRows = [];
        for (let index = 0; index < financialSummary.length; index += 2) {
          const left = financialSummary[index];
          const right = financialSummary[index + 1] || ['', ''];
          financialRows.push([left[0], left[1], right[0], right[1]]);
        }
        addTable(['Keterangan', 'Nilai', 'Keterangan', 'Nilai'], financialRows, {
          columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 70 }, 2: { cellWidth: 58 }, 3: { cellWidth: 70 } },
        });

        addSection('ANALISIS');
        const analysisText = `Periode ini mencatat ${reportData.periodTransactions.length} transaksi dan ${totalUnitsSold} unit terjual. Penjualan sebelum diskon ${formatRp(grossSales)}, diskon ${formatRp(reportData.discountTotal)}, dan penerimaan setelah diskon ${formatRp(reportData.revenue)}. Margin laba kotor ${reportData.revenue ? `${((reportData.grossProfit / reportData.revenue) * 100).toFixed(1)}%` : '0%'}. Arus kas bersih estimasi menghitung penerimaan dikurangi pembelian stok dan kerugian stok. Laba bersih estimasi menghitung penjualan dikurangi HPP barang terjual dan kerugian stok.`;
        const analysisLines = pdf.splitTextToSize(analysisText, pageWidth - margin * 2);
        if (cursorY + analysisLines.length * 4 > pageHeight - 12) {
          pdf.addPage();
          cursorY = 16;
        }
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(45, 50, 48);
        pdf.text(analysisLines, margin, cursorY);
        cursorY += analysisLines.length * 4 + 5;

        addSection('RINGKASAN PRODUK TERJUAL');
        addTable(
          ['Produk', 'Qty terjual', 'HPP total', 'Hemat promo', 'Penjualan setelah promo', 'Laba kotor'],
          reportData.soldList.length
            ? reportData.soldList.map((item) => [item.name, item.qty, formatRp(item.hpp), formatRp(item.promotionDiscount), formatRp(item.total), formatRp(item.total - item.hpp)])
            : [['Tidak ada produk terjual pada periode ini.', '', '', '', '', '']],
        );

        addSection(`PRODUK TIDAK TERJUAL (${reportData.unsoldProducts.length})`);
        addTable(
          ['Produk', 'Kategori', 'Stok saat ini'],
          reportData.unsoldProducts.length
            ? reportData.unsoldProducts.map((item) => [item.name, item.category || '-', item.stock])
            : [['Semua produk memiliki penjualan.', '', '']],
        );

        addSection('RINGKASAN METODE PEMBAYARAN');
        addTable(
          ['Metode', 'Jumlah transaksi', 'Total penerimaan'],
          reportData.paymentSummary.length
            ? reportData.paymentSummary.map((item) => [item.method || 'Tidak diketahui', item.count, formatRp(item.total)])
            : [['Belum ada transaksi.', '', '']],
        );

        addSection('RINCIAN PENJUALAN PER TRANSAKSI (DIKELOMPOKKAN PER KASIR)');
        if (!reportData.periodTransactions.length) {
          addTable(['Informasi'], [['Belum ada penjualan pada periode ini.']]);
        }
        cashierNames.forEach((cashierName) => {
          const cashierTxList = txByCashier[cashierName];
          const cashierTotal = cashierTxList.reduce((sum, tx) => sum + (tx.total || 0), 0);
          const cashierUnits = cashierTxList.reduce((sum, tx) => sum + (tx.items || []).reduce((s, i) => s + (i.qty || 0), 0), 0);
          // Cashier header bar
          if (cursorY > pageHeight - 30) { pdf.addPage(); cursorY = 16; }
          pdf.setFillColor(4, 120, 87);
          pdf.rect(margin, cursorY - 4, pageWidth - margin * 2, 8, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(255, 255, 255);
          pdf.text(`Kasir: ${cashierName}`, margin + 2, cursorY + 1);
          pdf.setFontSize(8);
          pdf.text(`${cashierTxList.length} transaksi  |  ${cashierUnits} unit  |  ${formatRp(cashierTotal)}`, pageWidth - margin - 2, cursorY + 1, { align: 'right' });
          cursorY += 8;
          cashierTxList.forEach((transaction) => {
            if (cursorY > pageHeight - 38) {
              pdf.addPage();
              cursorY = 16;
            }
            const items = transaction.items || [];
            const itemSubtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0);
            const subtotal = transaction.subtotal ?? itemSubtotal;
            const discount = transaction.discountAmount || 0;
            const promotionDiscount = transaction.promotionDiscountAmount ?? items.reduce((sum, item) => (
              sum + Math.max(0, (item.regularPrice || item.price || 0) - (item.price || 0)) * (item.qty || 0)
            ), 0);
            const total = transaction.total ?? Math.max(0, subtotal - promotionDiscount - discount);
            const received = transaction.cashAmount ?? total;
            const customerName = transaction.customer?.name || transaction.customerName || 'Pelanggan Umum';
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(25, 55, 43);
            pdf.text(`${transaction.id} | ${new Date(transaction.date).toLocaleString('id-ID')}`, margin, cursorY);
            cursorY += 4;
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(45, 50, 48);
            const meta = `Pelanggan: ${customerName}${transaction.customer?.phone ? ` (${transaction.customer.phone})` : ''} | Pembayaran: ${transaction.method || '-'}`;
            const metaLines = pdf.splitTextToSize(meta, pageWidth - margin * 2);
            pdf.text(metaLines, margin, cursorY);
            cursorY += metaLines.length * 3.5 + 1;
            addTable(
              ['Barang', 'Qty', 'Harga jual/unit', 'HPP/unit', 'Penjualan', 'HPP', 'Laba kotor'],
              items.length
                ? items.map((item) => {
                  const qty = item.qty || 0;
                  const sales = (item.price || 0) * qty;
                  const itemHpp = (item.hpp || 0) * qty;
                  return [item.name, qty, formatRp(item.price || 0), formatRp(item.hpp || 0), formatRp(sales), formatRp(itemHpp), formatRp(sales - itemHpp)];
                })
                : [['Rincian barang tidak tersedia.', '', '', '', '', '', '']],
            );
            const discountLabel = transaction.discountType === 'percent'
              ? `${transaction.discountValue || 0}%`
              : formatRp(transaction.discountValue || discount);
            const settlementRows = [
              ['Subtotal normal', formatRp(subtotal), 'Hemat paket promo', `- ${formatRp(promotionDiscount)}`],
              ['Diskon tambahan', `${discountLabel} (-${formatRp(discount)})`, 'Total tagihan', formatRp(total)],
              [transaction.method === 'Tunai' ? 'Uang diterima' : 'Dibayar', formatRp(received), '', ''],
            ];
            if (transaction.method === 'Tunai') {
              settlementRows.push(['Kembalian', formatRp(transaction.changeAmount ?? Math.max(0, received - total)), '', '']);
            }
            addTable(['Keterangan', 'Nilai', 'Keterangan', 'Nilai'], settlementRows, {
              columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 65 }, 2: { cellWidth: 45 }, 3: { cellWidth: 65 } },
            });
          });
          // Cashier sub-total bar
          if (cursorY > pageHeight - 12) { pdf.addPage(); cursorY = 16; }
          pdf.setFillColor(238, 245, 241);
          pdf.rect(margin, cursorY - 2, pageWidth - margin * 2, 7, 'F');
          pdf.setDrawColor(4, 120, 87);
          pdf.rect(margin, cursorY - 2, pageWidth - margin * 2, 7, 'S');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(25, 55, 43);
          pdf.text(`Sub-total Kasir ${cashierName}:  ${cashierTxList.length} transaksi  |  ${cashierUnits} unit  |  ${formatRp(cashierTotal)}`, margin + 2, cursorY + 3);
          cursorY += 12;
        });

        addSection('MUTASI STOK PADA PERIODE INI');
        addTable(
          ['Tanggal', 'Jenis', 'Produk', 'Selisih qty', 'HPP/unit', 'Nilai HPP', 'Petugas', 'Keterangan'],
          reportData.periodMutations.length
            ? reportData.periodMutations.map((mutation) => {
              const product = products.find((item) => item.id === mutation.productId);
              const typeLabel = mutation.type === 'in' ? 'Stok masuk' : mutation.type === 'out' ? 'Stok keluar' : 'Koreksi stok';
              const unitCost = product?.hpp || 0;
              return [formatDateInput(mutation.date), typeLabel, product?.name || mutation.productId, `${mutation.qty > 0 ? '+' : ''}${mutation.qty}`, formatRp(unitCost), formatRp(Math.abs(mutation.qty || 0) * unitCost), mutation.operator || '-', mutation.note || '-'];
            })
            : [['Tidak ada mutasi stok pada periode ini.', '', '', '', '', '', '', '']],
        );

        downloadPdfDocument(pdf, `laporan-keuangan-${reportPeriod}-${formatDateInput(new Date())}.pdf`);
        return;
      }
      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Simpan atau bagikan laporan PDF', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF dibuat', `Laporan tersimpan di ${file.uri}`);
      }
    } catch (error) {
      console.error('Financial PDF export error:', error);
      throw error;
    }
  };

  const cartCalculations = useMemo(() => {
    let subtotal = 0;
    let promotionDiscount = 0;
    cart.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        const regularPrice = p.isPromotion ? p.regularPrice || p.price : p.price;
        subtotal += regularPrice * item.qty;
        if (p.isPromotion) promotionDiscount += Math.max(0, regularPrice - p.price) * item.qty;
      }
    });

    const discountedSubtotal = subtotal - promotionDiscount;
    const discVal = parseFloat(discountValue) || 0;
    let discountAmount = 0;
    if (discountType === 'percent') {
      discountAmount = (discountedSubtotal * discVal) / 100;
    } else {
      discountAmount = discVal;
    }

    if (discountAmount > discountedSubtotal) discountAmount = discountedSubtotal;

    const grandTotal = discountedSubtotal - discountAmount;
    return { subtotal, promotionDiscount, discountedSubtotal, discountAmount, grandTotal };
  }, [cart, products, discountType, discountValue]);

  const changeDiscountType = (type) => {
    if (type === discountType) return;
    setDiscountType(type);
    setDiscountValue('0');
  };

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.productId === product.id);
      const nextQty = (existing?.qty || 0) + 1;
      const demand = new Map();
      prevCart.filter((item) => item.productId !== product.id).forEach((item) => {
        const cartProduct = products.find((candidate) => candidate.id === item.productId);
        const requirements = cartProduct?.isPromotion
          ? cartProduct.promotionItems || []
          : [{ productId: cartProduct?.id, qty: 1 }];
        requirements.forEach((requirement) => {
          demand.set(requirement.productId, (demand.get(requirement.productId) || 0) + requirement.qty * item.qty);
        });
      });
      const requirements = product.isPromotion
        ? product.promotionItems || []
        : [{ productId: product.id, qty: 1 }];
      const hasEnoughStock = requirements.every((requirement) => {
        const component = products.find((candidate) => candidate.id === requirement.productId);
        return component && component.stock >= (demand.get(component.id) || 0) + requirement.qty * nextQty;
      });
      if (!hasEnoughStock) {
        Alert.alert('Stok Tidak Cukup', 'Stok salah satu barang dalam paket atau keranjang sudah tidak mencukupi.');
        return prevCart;
      }
      if (existing) return prevCart.map((i) => (i.productId === product.id ? { ...i, qty: nextQty } : i));
      return [...prevCart, { productId: product.id, qty: 1 }];
    });
  };

  const updateCartQty = (productId, delta) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return { ...item, qty: newQty };
            const otherDemand = new Map();
            prevCart.filter((otherItem) => otherItem.productId !== productId).forEach((otherItem) => {
              const otherProduct = products.find((candidate) => candidate.id === otherItem.productId);
              const requirements = otherProduct?.isPromotion
                ? otherProduct.promotionItems || []
                : [{ productId: otherProduct?.id, qty: 1 }];
              requirements.forEach((requirement) => {
                otherDemand.set(requirement.productId, (otherDemand.get(requirement.productId) || 0) + requirement.qty * otherItem.qty);
              });
            });
            const requirements = prod.isPromotion
              ? prod.promotionItems || []
              : [{ productId: prod.id, qty: 1 }];
            const hasEnoughStock = requirements.every((requirement) => {
              const component = products.find((candidate) => candidate.id === requirement.productId);
              return component && component.stock >= (otherDemand.get(component.id) || 0) + requirement.qty * newQty;
            });
            if (!hasEnoughStock) {
              Alert.alert('Stok Tidak Cukup', 'Stok salah satu barang dalam paket atau keranjang sudah tidak mencukupi.');
              return item;
            }
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0);
    });
  };

  const handleAddCustomer = async () => {
    const name = newCustomerName.trim();
    if (!name) {
      Alert.alert('Nama pelanggan wajib diisi', 'Masukkan nama pelanggan terlebih dahulu.');
      return;
    }

    const existingCustomer = customers.find((customer) => customer.name.toLowerCase() === name.toLowerCase());
    if (existingCustomer) {
      setSelectedCustomer(existingCustomer);
      setShowCustomerOptions(false);
      setIsAddingCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      return;
    }

    const customer = {
      id: `CUS-${Date.now()}`,
      name,
      phone: newCustomerPhone.trim(),
    };
    setCustomers((previous) => [...previous, customer].sort((a, b) => a.name.localeCompare(b.name, 'id')));
    setSelectedCustomer(customer);
    setShowCustomerOptions(false);
    setIsAddingCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    try {
      await fbAddCustomer(customer);
    } catch (error) {
      console.error('Firestore add customer error:', error);
      Alert.alert('Pelanggan disimpan sementara', 'Data pelanggan akan tersimpan online setelah koneksi database tersedia.');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Keranjang Kosong', 'Pilih produk terlebih dahulu.');
      return;
    }

    const transactionDate = parseDateInput(selectedTransactionDate);
    if (!transactionDate) {
      Alert.alert('Tanggal tidak valid', 'Pilih atau masukkan tanggal transaksi dengan format YYYY-MM-DD.');
      return;
    }

    const enteredCash = parseFloat(cashAmount);
    const payNum = payMethod === 'Tunai' ? (Number.isNaN(enteredCash) ? 0 : enteredCash) : cartCalculations.grandTotal;
    if (payMethod === 'Tunai' && payNum < cartCalculations.grandTotal) {
      Alert.alert('Pembayaran Kurang', 'Uang yang diterima kurang dari total tagihan.');
      return;
    }

    const stockDemand = new Map();
    cart.forEach((cartItem) => {
      const product = products.find((candidate) => candidate.id === cartItem.productId);
      const requirements = product?.isPromotion
        ? product.promotionItems || []
        : [{ productId: product?.id, qty: 1 }];
      requirements.forEach((requirement) => {
        stockDemand.set(requirement.productId, (stockDemand.get(requirement.productId) || 0) + requirement.qty * cartItem.qty);
      });
    });
    const insufficientStock = [...stockDemand.entries()].find(([productId, qty]) => {
      const component = products.find((candidate) => candidate.id === productId);
      return !component || component.stock < qty;
    });
    if (insufficientStock) {
      const component = products.find((candidate) => candidate.id === insufficientStock[0]);
      Alert.alert('Stok Tidak Cukup', `${component?.name || 'Barang paket'} hanya tersedia ${component?.stock || 0} unit.`);
      return;
    }

    const txItems = cart.map((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      const components = p.isPromotion
        ? p.promotionItems.map((component) => {
          const product = products.find((candidate) => candidate.id === component.productId);
          return {
            productId: component.productId,
            name: product?.name || component.productId,
            qty: component.qty,
          };
        })
        : [];
      const bundleHpp = p.isPromotion
        ? p.promotionItems.reduce((sum, component) => {
          const product = products.find((candidate) => candidate.id === component.productId);
          return sum + (product?.hpp || 0) * component.qty;
        }, 0)
        : p.hpp;
      return {
        productId: p.id,
        name: p.name,
        qty: item.qty,
        price: p.price,
        hpp: bundleHpp,
        isPromotion: !!p.isPromotion,
        regularPrice: p.isPromotion ? p.regularPrice : p.price,
        components,
      };
    });

    const stockUpdates = [...stockDemand.entries()].map(([id, qty]) => {
      const product = products.find((candidate) => candidate.id === id);
      return { id, newStock: product.stock - qty };
    });

    setProducts((prev) =>
      prev.map((p) => {
        const quantity = stockDemand.get(p.id) || 0;
        return quantity ? { ...p, stock: p.stock - quantity } : p;
      })
    );

    const newTx = {
      id: 'TRX-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      date: transactionDate,
      cashier: currentUser.name,
      shiftId: activeShiftId,
      customer: selectedCustomer
        ? { id: selectedCustomer.id, name: selectedCustomer.name, phone: selectedCustomer.phone || '' }
        : { id: null, name: 'Pelanggan Umum', phone: '' },
      items: txItems,
      subtotal: cartCalculations.subtotal,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      promotionDiscountAmount: cartCalculations.promotionDiscount,
      discountAmount: cartCalculations.discountAmount,
      total: cartCalculations.grandTotal,
      method: payMethod,
      cashAmount: payNum,
      changeAmount: payNum - cartCalculations.grandTotal,
    };

    // Write to Firestore
    try {
      await fbAddTransaction(newTx);
      await batchUpdateProductStocks(stockUpdates);
    } catch (e) {
      console.error('Firestore checkout error:', e);
    }

    setTransactions((prev) => [newTx, ...prev]);
    setCurrentReceipt(newTx);
    setIsCartModalOpen(false);
    setIsReceiptModalOpen(true);

    setCart([]);
    setDiscountValue('0');
    setCashAmount('');
    setSelectedCustomer(null);
    setSelectedTransactionDate(formatDateInput(new Date()));
    setShowCustomerOptions(false);
    setIsAddingCustomer(false);
  };

  const openProductForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProdBarcode(product.barcode);
      setProdName(product.name);
      setProdCategory(product.category);
      setProdStock((product.stock || 0).toString());
      setProdHpp((product.hpp || 0).toString());
      setProdPrice(product.price.toString());
      setIsPromotionProduct(!!product.isPromotion);
      setPromotionItems(product.promotionItems || []);
    } else {
      setEditingProduct(null);
      setProdBarcode('899' + Math.floor(10000000 + Math.random() * 90000000));
      setProdName('');
      setProdCategory('Anggur & Wine');
      setProdStock('20');
      setProdHpp('50000');
      setProdPrice('70000');
      setIsPromotionProduct(false);
      setPromotionItems([]);
    }
    setPromotionSearch('');
    setIsProductModalOpen(true);
  };

  const saveProduct = async () => {
    if (!isSuperAdmin) {
      Alert.alert('Akses Ditolak', 'Hanya Super Admin yang berhak menambah atau mengubah produk dan stok.');
      return;
    }
    if (!prodName.trim()) {
      Alert.alert('Validasi Error', 'Nama produk wajib diisi.');
      return;
    }

    const stockNum = parseInt(prodStock) || 0;
    const enteredHpp = parseFloat(prodHpp) || 0;
    const priceNum = parseFloat(prodPrice) || 0;
    const selectedPromotionItems = isPromotionProduct
      ? promotionItems.filter((component) => products.some((product) => product.id === component.productId && !product.isPromotion))
      : [];
    if (isPromotionProduct && selectedPromotionItems.length === 0) {
      Alert.alert('Paket belum lengkap', 'Pilih minimal satu barang untuk dimasukkan ke paket promosi.');
      return;
    }
    const regularPrice = isPromotionProduct
      ? selectedPromotionItems.reduce((sum, component) => {
        const product = products.find((item) => item.id === component.productId);
        return sum + (product?.price || 0) * component.qty;
      }, 0)
      : priceNum;
    const hppNum = isPromotionProduct
      ? selectedPromotionItems.reduce((sum, component) => {
        const product = products.find((item) => item.id === component.productId);
        return sum + (product?.hpp || 0) * component.qty;
      }, 0)
      : enteredHpp;
    if (isPromotionProduct && (priceNum <= 0 || priceNum >= regularPrice)) {
      Alert.alert('Harga promo tidak valid', `Harga promo harus lebih murah dari harga normal paket (${formatRp(regularPrice)}).`);
      return;
    }

    if (editingProduct) {
      const updatedData = {
        barcode: prodBarcode,
        name: prodName,
        category: isPromotionProduct ? 'Promo' : prodCategory,
        stock: isPromotionProduct ? 0 : stockNum,
        hpp: hppNum,
        price: priceNum,
        isPromotion: isPromotionProduct,
        regularPrice,
        promotionItems: selectedPromotionItems,
      };
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id ? { ...p, ...updatedData } : p
        )
      );
      // Write to Firestore
      try {
        await fbUpdateProduct(editingProduct.id, updatedData);
      } catch (e) {
        console.error('Firestore update product error:', e);
      }
    } else {
      const newProd = {
        id: 'P' + Date.now(),
        barcode: isPromotionProduct ? `PROMO-${Date.now()}` : prodBarcode,
        name: prodName,
        category: isPromotionProduct ? 'Promo' : prodCategory,
        stock: isPromotionProduct ? 0 : stockNum,
        hpp: hppNum,
        price: priceNum,
        minStock: isPromotionProduct ? 0 : 5,
        image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80',
        isPromotion: isPromotionProduct,
        regularPrice,
        promotionItems: selectedPromotionItems,
      };
      setProducts((prev) => [newProd, ...prev]);
      // Write to Firestore
      try {
        await fbAddProduct(newProd);
      } catch (e) {
        console.error('Firestore add product error:', e);
      }
    }

    setIsProductModalOpen(false);
  };

  const deleteProduct = (id) => {
    if (!isSuperAdmin) {
      Alert.alert('Akses Ditolak', 'Hanya Super Admin yang berhak menghapus produk.');
      return;
    }
    const performDelete = async () => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setCart((prev) => prev.filter((c) => c.productId !== id));
      try {
        await deleteProductFromDB(id);
      } catch (e) {
        console.error('Firestore delete product error:', e);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Yakin ingin menghapus produk ini?')) {
        performDelete();
      }
      return;
    }

    Alert.alert('Konfirmasi Hapus', 'Yakin menghapus produk ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: performDelete,
      },
    ]);
  };

  const handleSaveMutation = async () => {
    if (!isSuperAdmin) {
      Alert.alert('Akses Ditolak', 'Hanya Super Admin yang berhak menambah atau merubah stok.');
      return;
    }
    const qtyNum = parseInt(mutQty);
    if (!qtyNum || qtyNum <= 0) {
      Alert.alert('Error', 'Masukkan jumlah Qty mutasi yang valid.');
      return;
    }

    const prod = products.find((p) => p.id === mutProdId);
    if (!prod) return;

    if (mutType === 'out' && qtyNum > prod.stock) {
      Alert.alert('Error', 'Stok keluar melebihi sisa stok saat ini.');
      return;
    }

    const newStock = mutType === 'in' ? prod.stock + qtyNum : prod.stock - qtyNum;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === mutProdId) {
          return { ...p, stock: newStock };
        }
        return p;
      })
    );

    const newMutation = {
      id: 'M' + Date.now(),
      date: new Date(),
      productId: mutProdId,
      shiftId: activeShiftId,
      type: mutType,
      qty: qtyNum,
      note: mutNote || (mutType === 'in' ? 'Pembelian Restock' : 'Barang Rusak/Lost'),
      operator: currentUser.name,
    };

    setMutations((prev) => [newMutation, ...prev]);

    // Write to Firestore
    try {
      await fbAddMutation(newMutation);
      await updateProductStock(mutProdId, newStock);
    } catch (e) {
      console.error('Firestore mutation error:', e);
    }

    setIsMutationModalOpen(false);
    setMutQty('');
    setMutNote('');
  };

  const handleSaveStockCorrection = async () => {
    if (!isSuperAdmin) {
      Alert.alert('Akses Ditolak', 'Hanya Super Admin yang berhak melakukan koreksi atau opname stok.');
      return;
    }
    const physQty = parseInt(corrPhysicalStock);
    if (isNaN(physQty) || physQty < 0) {
      Alert.alert('Error', 'Masukkan jumlah stok fisik yang valid.');
      return;
    }

    const prod = products.find((p) => p.id === corrProdId);
    if (!prod) return;

    const diff = physQty - prod.stock;

    setProducts((prev) =>
      prev.map((p) => (p.id === corrProdId ? { ...p, stock: physQty } : p))
    );

    const newMutation = {
      id: 'M' + Date.now(),
      date: new Date(),
      productId: corrProdId,
      shiftId: activeShiftId,
      type: 'koreksi',
      qty: diff,
      note: `${corrReason} (Sistem: ${prod.stock} -> Fisik: ${physQty})`,
      operator: currentUser.name,
    };

    setMutations((prev) => [newMutation, ...prev]);

    // Write to Firestore
    try {
      await fbAddMutation(newMutation);
      await updateProductStock(corrProdId, physQty);
    } catch (e) {
      console.error('Firestore stock correction error:', e);
    }

    setIsStockCorrectionOpen(false);
    setCorrPhysicalStock('');
    Alert.alert('Sukses', `Koreksi stok disimpan. Selisih: ${diff > 0 ? '+' : ''}${diff} unit.`);
  };

  const handleAddUser = async () => {
    if (!isSuperAdmin) {
      Alert.alert('Akses Ditolak', 'Hanya Super Admin yang berhak menambah pengguna.');
      return;
    }
    if (!newUserName.trim()) {
      Alert.alert('Error', 'Nama pengguna wajib diisi!');
      return;
    }
    const newUser = {
      id: 'U' + Date.now(),
      name: newUserName.trim(),
      role: newUserRole,
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setActiveShiftId(`SHIFT-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    // Write to Firestore
    try {
      await fbAddUser(newUser);
    } catch (e) {
      console.error('Firestore add user error:', e);
    }
    setNewUserName('');
    setIsAddingUser(false);
    setIsUserSwitchOpen(false);
  };

  const openEditUserForm = (userToEdit) => {
    setEditingUser(userToEdit);
    setEditUserName(userToEdit.name || '');
    setEditUserUsername(userToEdit.username || '');
    setEditUserPassword(userToEdit.password || '');
    setEditUserRole(userToEdit.role || 'Kasir');
    setEditUserError('');
    setIsEditUserModalOpen(true);
  };

  const handleSaveEditUser = async () => {
    if (!isSuperAdmin) {
      Alert.alert('Akses Ditolak', 'Hanya Super Admin yang berhak mengedit akun.');
      return;
    }
    if (!editingUser) return;
    const name = editUserName.trim();
    const username = editUserUsername.trim().toLowerCase();
    const password = editUserPassword;
    const role = editUserRole || 'Kasir';

    if (!name) { setEditUserError('Nama wajib diisi.'); return; }
    if (!username) { setEditUserError('Username wajib diisi.'); return; }
    if (username.length < 3) { setEditUserError('Username minimal 3 karakter.'); return; }

    const duplicate = users.find((u) => u.id !== editingUser.id && u.username?.toLowerCase() === username);
    if (duplicate) {
      setEditUserError('Username sudah digunakan akun lain.');
      return;
    }
    if (!password) { setEditUserError('Sandi wajib diisi.'); return; }
    if (password.length < 6) { setEditUserError('Sandi minimal 6 karakter.'); return; }

    const updatedUser = {
      ...editingUser,
      name,
      username,
      password,
      role,
    };

    setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updatedUser : u)));
    if (currentUser?.id === editingUser.id) {
      setCurrentUser(updatedUser);
    }

    try {
      await fbUpdateUser(editingUser.id, {
        name,
        username,
        password,
        role,
      });
    } catch (e) {
      console.error('fbUpdateUser error:', e);
    }

    setIsEditUserModalOpen(false);
    setEditingUser(null);
    Alert.alert('Sukses', `Akun "${name}" (${username}) berhasil diperbarui.`);
  };

  const handleDeleteUser = (userToDelete) => {
    if (!isSuperAdmin) {
      Alert.alert('Akses Ditolak', 'Hanya Super Admin yang berhak menghapus akun.');
      return;
    }
    if (currentUser?.id === userToDelete.id) {
      Alert.alert('Perhatian', 'Anda tidak dapat menghapus akun yang sedang digunakan saat ini.');
      return;
    }

    const performDeleteUser = async () => {
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      try {
        await fbDeleteUser(userToDelete.id);
        Alert.alert('Terhapus', `Akun "${userToDelete.name}" berhasil dihapus.`);
      } catch (e) {
        console.error('fbDeleteUser error:', e);
        Alert.alert('Gagal menghapus akun', 'Terjadi kesalahan saat menghapus data di database.');
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      const ok = window.confirm(`Yakin ingin menghapus akun kasir "${userToDelete.name}" (${userToDelete.username})?\n\nAkun akan dihapus secara permanen dari sistem.`);
      if (ok) {
        performDeleteUser();
      }
      return;
    }

    Alert.alert('Konfirmasi Hapus', `Yakin ingin menghapus akun "${userToDelete.name}" (${userToDelete.username})?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: performDeleteUser,
      },
    ]);
  };

  const togglePromotionItem = (productId) => {
    setPromotionItems((previous) => previous.some((item) => item.productId === productId)
      ? previous.filter((item) => item.productId !== productId)
      : [...previous, { productId, qty: 1 }]);
  };

  const updatePromotionItemQty = (productId, delta) => {
    setPromotionItems((previous) => previous.map((item) => (
      item.productId === productId ? { ...item, qty: Math.max(1, item.qty + delta) } : item
    )));
  };

  const promotionRegularPrice = promotionItems.reduce((sum, component) => {
    const product = products.find((item) => item.id === component.productId);
    return sum + (product?.price || 0) * component.qty;
  }, 0);

  const availablePromotionProducts = products.filter((product) => (
    !product.isPromotion
    && (product.name.toLowerCase().includes(promotionSearch.toLowerCase())
      || product.barcode.includes(promotionSearch))
  ));

  const categoriesList = useMemo(() => [
    'All',
    'Promo',
    ...new Set(products.filter((product) => !product.isPromotion).map((product) => product.category)),
  ], [products]);

  const getAvailableProductStock = (product) => {
    if (!product.isPromotion) return product.stock || 0;
    const components = product.promotionItems || [];
    if (components.length === 0) return 0;
    return Math.min(...components.map((component) => {
      const sourceProduct = products.find((item) => item.id === component.productId);
      return sourceProduct ? Math.floor(sourceProduct.stock / component.qty) : 0;
    }));
  };

  const filteredPosProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All'
        || (selectedCategory === 'Promo' ? p.isPromotion : !p.isPromotion && p.category === selectedCategory);
      const matchQuery =
        p.name.toLowerCase().includes(posSearch.toLowerCase()) || p.barcode.includes(posSearch);
      return matchCat && matchQuery;
    }).map((product) => ({ ...product, stock: getAvailableProductStock(product) }));
  }, [products, selectedCategory, posSearch]);

  const filteredCrudProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(crudSearch.toLowerCase()) ||
        p.barcode.includes(crudSearch) ||
        p.category.toLowerCase().includes(crudSearch.toLowerCase())
    );
  }, [products, crudSearch]);

  const totalCartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  const getActiveCashierTabSnapshot = () => ({
    id: activeCashierTabId,
    isClosable: cashierTabs.find((tab) => tab.id === activeCashierTabId)?.isClosable || false,
    user: currentUser,
    shiftId: activeShiftId,
    cart,
    selectedCustomer,
    selectedTransactionDate,
    discountType,
    discountValue,
    payMethod,
    cashAmount,
    activeTab,
  });

  const loadCashierTab = (tab) => {
    setActiveCashierTabId(tab.id);
    setCurrentUser(tab.user || null);
    setActiveShiftId(tab.shiftId || null);
    setCart(tab.cart || []);
    setSelectedCustomer(tab.selectedCustomer || null);
    setSelectedTransactionDate(tab.selectedTransactionDate || formatDateInput(new Date()));
    setDiscountType(tab.discountType || 'percent');
    setDiscountValue(tab.discountValue || '0');
    setPayMethod(tab.payMethod || 'Tunai');
    setCashAmount(tab.cashAmount || '');
    setActiveTab(tab.activeTab || 'pos');
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
    setIsCartModalOpen(false);
  };

  const switchCashierTab = (tabId) => {
    if (tabId === activeCashierTabId) return;
    const nextTab = cashierTabs.find((tab) => tab.id === tabId);
    if (!nextTab) return;
    const currentSnapshot = getActiveCashierTabSnapshot();
    setCashierTabs((tabs) => tabs.map((tab) => (
      tab.id === activeCashierTabId ? currentSnapshot : tab
    )));
    loadCashierTab(nextTab);
  };

  const openCashierTab = () => {
    const currentSnapshot = getActiveCashierTabSnapshot();
    const newShiftId = currentUser
      ? `SHIFT-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      : null;
    const newTab = {
      id: `cashier-tab-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isClosable: true,
      user: currentUser,
      shiftId: newShiftId,
      cart: [],
      selectedCustomer: null,
      selectedTransactionDate: formatDateInput(new Date()),
      discountType: 'percent',
      discountValue: '0',
      payMethod: 'Tunai',
      cashAmount: '',
      activeTab: 'pos',
    };
    setCashierTabs((tabs) => [
      ...tabs.map((tab) => (tab.id === activeCashierTabId ? currentSnapshot : tab)),
      newTab,
    ]);
    loadCashierTab(newTab);
  };

  const closeCashierTab = (tabId) => {
    const tabToClose = cashierTabs.find((tab) => tab.id === tabId);
    if (!tabToClose?.isClosable) {
      Alert.alert('Tab tidak dapat ditutup', 'Hanya tab kasir tambahan yang dapat ditutup.');
      return;
    }

    const activeTabSnapshot = tabId === activeCashierTabId
      ? getActiveCashierTabSnapshot()
      : tabToClose;
    if (activeTabSnapshot.cart.length > 0) {
      Alert.alert('Keranjang belum kosong', 'Selesaikan atau kosongkan transaksi sebelum menutup tab ini.');
      return;
    }

    const hasShiftActivity = tabToClose.shiftId && (
      transactions.some((transaction) => transaction.shiftId === tabToClose.shiftId)
      || mutations.some((mutation) => mutation.shiftId === tabToClose.shiftId)
    );
    if (hasShiftActivity) {
      Alert.alert('Shift masih aktif', 'Tutup shift kasir terlebih dahulu sebelum menutup tab ini.');
      return;
    }

    const remainingTabs = cashierTabs
      .map((tab) => (tab.id === activeCashierTabId ? getActiveCashierTabSnapshot() : tab))
      .filter((tab) => tab.id !== tabId);
    if (remainingTabs.length === 0) {
      const freshTab = {
        id: `cashier-tab-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user: null,
        shiftId: null,
        cart: [],
        selectedCustomer: null,
        selectedTransactionDate: formatDateInput(new Date()),
        discountType: 'percent',
        discountValue: '0',
        payMethod: 'Tunai',
        cashAmount: '',
        activeTab: 'pos',
      };
      setCashierTabs([freshTab]);
      loadCashierTab(freshTab);
      return;
    }

    setCashierTabs(remainingTabs);
    if (tabId === activeCashierTabId) loadCashierTab(remainingTabs[remainingTabs.length - 1]);
  };

  useEffect(() => {
    setCashierTabs((tabs) => tabs.map((tab) => (
      tab.id === activeCashierTabId ? getActiveCashierTabSnapshot() : tab
    )));
  }, [
    activeCashierTabId,
    currentUser,
    activeShiftId,
    cart,
    selectedCustomer,
    selectedTransactionDate,
    discountType,
    discountValue,
    payMethod,
    cashAmount,
    activeTab,
  ]);

  const cashierTabBar = (
    <View style={styles.cashierTabsBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cashierTabsScroll}>
        {cashierTabs.map((tab) => {
          const isActive = tab.id === activeCashierTabId;
          const itemCount = tab.id === activeCashierTabId
            ? totalCartCount
            : (tab.cart || []).reduce((sum, item) => sum + item.qty, 0);
          return (
            <View key={tab.id} style={[styles.cashierTab, isActive && styles.cashierTabActive]}>
              <TouchableOpacity style={styles.cashierTabSelect} onPress={() => switchCashierTab(tab.id)}>
                <MaterialCommunityIcons
                  name={tab.user ? 'point-of-sale' : 'account-plus-outline'}
                  size={15}
                  color={isActive ? '#10b981' : '#94a3b8'}
                />
                <Text numberOfLines={1} style={[styles.cashierTabText, isActive && styles.cashierTabTextActive]}>
                  {tab.user?.name || 'Kasir baru'}
                </Text>
                {itemCount > 0 && <Text style={styles.cashierTabCount}>{itemCount}</Text>}
              </TouchableOpacity>
              {tab.isClosable && cashierTabs.length > 1 && (
                <TouchableOpacity
                  style={styles.cashierTabClose}
                  onPress={() => closeCashierTab(tab.id)}
                  accessibilityLabel="Tutup tab kasir"
                >
                  <Feather name="x" size={13} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
      <TouchableOpacity
        style={styles.cashierTabAdd}
        onPress={openCashierTab}
        accessibilityLabel="Buka tab kasir baru"
      >
        <Feather name="plus" size={17} color="#10b981" />
      </TouchableOpacity>
    </View>
  );

  // Loading Screen
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ExpoStatusBar style="light" />
        <View style={{ alignItems: 'center', padding: 40 }}>
          <MaterialCommunityIcons name="database-sync" size={64} color="#10b981" />
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 20 }}>
            Tipsy Point
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
            {loadingMessage}
          </Text>
          <View style={{ marginTop: 24, width: 200, height: 4, backgroundColor: '#334155', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: '60%', height: '100%', backgroundColor: '#10b981', borderRadius: 2 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <ExpoStatusBar style="light" />
        <View style={styles.loginCashierTabs} className={Platform.OS === 'web' ? 'app-login-tabs' : undefined}>{cashierTabBar}</View>
        <ScrollView
          contentContainerStyle={styles.loginScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className={Platform.OS === 'web' ? 'app-login-scroll' : undefined}
        >
        <View style={styles.loginCard}>
          <View style={styles.loginLogo}>
            <MaterialCommunityIcons name="store" size={34} color="#fff" />
          </View>
          <Text style={styles.loginTitle}>Tipsy Point</Text>
          <Text style={styles.loginSubtitle}>
            Masuk sebagai kasir untuk {cashierTabs.find((tab) => tab.id === activeCashierTabId)?.user ? 'melanjutkan sesi' : 'membuka tab kasir ini'}
          </Text>
          <TextInput
            style={styles.loginInput}
            placeholder="Username"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            value={loginUsername}
            onChangeText={setLoginUsername}
          />
          <TextInput
            style={styles.loginInput}
            placeholder="Sandi"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={loginPassword}
            onChangeText={setLoginPassword}
            onSubmitEditing={handleLogin}
          />
          {!!loginError && <Text style={styles.loginError}>{loginError}</Text>}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Masuk</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.loginAddKasirBtn}
            onPress={() => { setAddKasirError(''); setAddKasirRole('Kasir'); setIsAddKasirLoginOpen(true); }}
          >
            <Feather name="user-plus" size={14} color="#10b981" />
            <Text style={styles.loginAddKasirText}>Tambah Akun Baru</Text>
          </TouchableOpacity>
        </View>

        {/* Modal Tambah Akun */}
        <Modal visible={isAddKasirLoginOpen} transparent animationType="slide" onRequestClose={() => setIsAddKasirLoginOpen(false)}>
          <View style={styles.loginModalOverlay}>
            <View style={styles.loginModalCard}>
              <View style={styles.loginModalHeader}>
                <Text style={styles.loginModalTitle}>Tambah Akun Baru</Text>
                <TouchableOpacity onPress={() => setIsAddKasirLoginOpen(false)}>
                  <Feather name="x" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.loginModalLabel}>Tipe Akun (Role)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: addKasirRole === 'Kasir' ? '#10b981' : '#1e293b',
                    borderWidth: 1,
                    borderColor: addKasirRole === 'Kasir' ? '#10b981' : '#334155',
                  }}
                  onPress={() => setAddKasirRole('Kasir')}
                >
                  <Text style={{
                    color: addKasirRole === 'Kasir' ? '#fff' : '#94a3b8',
                    fontWeight: '700',
                    fontSize: 13,
                  }}>
                    Kasir
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: addKasirRole === 'Super Admin' ? '#7c3aed' : '#1e293b',
                    borderWidth: 1,
                    borderColor: addKasirRole === 'Super Admin' ? '#7c3aed' : '#334155',
                  }}
                  onPress={() => setAddKasirRole('Super Admin')}
                >
                  <Text style={{
                    color: addKasirRole === 'Super Admin' ? '#fff' : '#94a3b8',
                    fontWeight: '700',
                    fontSize: 13,
                  }}>
                    Super Admin
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.loginModalLabel}>Nama Lengkap</Text>
              <TextInput
                style={styles.loginInput}
                placeholder="Contoh: Siti Rahma"
                placeholderTextColor="#64748b"
                value={addKasirName}
                onChangeText={(t) => { setAddKasirName(t); setAddKasirError(''); }}
              />
              <Text style={styles.loginModalLabel}>Username</Text>
              <TextInput
                style={styles.loginInput}
                placeholder="Contoh: siti"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                value={addKasirUsername}
                onChangeText={(t) => { setAddKasirUsername(t); setAddKasirError(''); }}
              />
              <Text style={styles.loginModalLabel}>Sandi</Text>
              <TextInput
                style={styles.loginInput}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={addKasirPassword}
                onChangeText={(t) => { setAddKasirPassword(t); setAddKasirError(''); }}
              />
              <Text style={styles.loginModalLabel}>Konfirmasi Sandi</Text>
              <TextInput
                style={styles.loginInput}
                placeholder="Ulangi sandi"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={addKasirConfirm}
                onChangeText={(t) => { setAddKasirConfirm(t); setAddKasirError(''); }}
              />
              {!!addKasirError && <Text style={styles.loginError}>{addKasirError}</Text>}
              <View style={styles.loginModalActions}>
                <TouchableOpacity style={styles.loginModalCancel} onPress={() => setIsAddKasirLoginOpen(false)}>
                  <Text style={styles.loginModalCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loginModalSubmit} onPress={handleAddKasirFromLogin}>
                  <Feather name="user-plus" size={14} color="#fff" />
                  <Text style={styles.loginModalSubmitText}>Tambah Kasir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" />
      {/* Top Mobile Header */}
      <View style={styles.header} className={Platform.OS === 'web' ? 'app-header' : undefined}>
        <View style={styles.headerTitleRow}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="store" size={20} color="#fff" />
          </View>
          <Text style={styles.headerTitle}><Text style={styles.headerTitleAccent}>Tipsy Point</Text></Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.userBadge}
            className={Platform.OS === 'web' ? 'app-user-badge' : undefined}
            onPress={() => setIsUserSwitchOpen(true)}
          >
            <MaterialCommunityIcons name="account-circle" size={18} color={isSuperAdmin ? "#a855f7" : "#10b981"} />
            <Text
              style={styles.userBadgeText}
              className={Platform.OS === 'web' ? 'app-user-name' : undefined}
            >
              {currentUser?.name || 'Belum login'}
            </Text>
            <View style={{
              backgroundColor: isSuperAdmin ? '#7c3aed25' : '#10b98125',
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: isSuperAdmin ? '#a855f7' : '#10b981',
              marginLeft: 4,
            }}>
              <Text style={{
                color: isSuperAdmin ? '#c084fc' : '#34d399',
                fontSize: 9,
                fontWeight: '700'
              }}>
                {isSuperAdmin ? 'ADMIN' : 'KASIR'}
              </Text>
            </View>
            <Feather name="chevron-down" size={14} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cashierNewTabButton}
            onPress={openCashierTab}
            accessibilityLabel="Buka tab kasir baru"
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      {cashierTabBar}

      {activeTab === 'dashboard' && isSuperAdmin && (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: 'month', label: 'Bulan Ini' },
              { id: 'year', label: 'Tahun Ini' },
            ].map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.filterChip, selectedPeriod === p.id && styles.filterChipActive]}
                onPress={() => setSelectedPeriod(p.id)}
              >
                <Text style={[styles.filterChipText, selectedPeriod === p.id && styles.filterChipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Tab Workspace */}
      <View style={styles.workspace}>
        {activeTab === 'dashboard' && isSuperAdmin && (
          <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: CONTENT_BOTTOM_PADDING }}>
            {/* Net Profit Banner */}
            <View
              style={[
                styles.profitCard,
                financialMetrics.netProfit >= 0 ? styles.profitCardGreen : styles.profitCardRed,
              ]}
            >
              <Text style={styles.profitCardSub}>LABA BERSIH (NET PROFIT)</Text>
              <Text style={styles.profitCardAmount}>{formatRp(financialMetrics.netProfit)}</Text>
              <Text style={styles.profitCardNote}>
                {financialMetrics.netProfit >= 0 ? '✓ Performa Bisnis Menguntungkan' : '⚠ Performa Mengalami Kerugian'}
              </Text>
            </View>

            {/* KPI Grid */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiLabel}>TOTAL OMZET</Text>
                  <MaterialCommunityIcons name="currency-usd" size={20} color="#0284c7" />
                </View>
                <Text style={styles.kpiValue}>{formatRp(financialMetrics.omzet)}</Text>
                <Text style={styles.kpiSub}>{financialMetrics.transactionCount} Transaksi</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiLabel}>HPP (MODAL)</Text>
                  <MaterialCommunityIcons name="package-variant-closed" size={20} color="#d97706" />
                </View>
                <Text style={styles.kpiValue}>{formatRp(financialMetrics.totalHpp)}</Text>
                <Text style={styles.kpiSub}>Modal Produk Terjual</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiLabel}>LABA KOTOR</Text>
                  <MaterialCommunityIcons name="trending-up" size={20} color="#10b981" />
                </View>
                <Text style={[styles.kpiValue, { color: '#10b981' }]}>{formatRp(financialMetrics.grossProfit)}</Text>
                <Text style={styles.kpiSub}>Omzet - HPP</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiLabel}>BEBAN & LOST</Text>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#ef4444" />
                </View>
                <Text style={[styles.kpiValue, { color: '#ef4444' }]}>{formatRp(financialMetrics.totalExpense)}</Text>
                <Text style={styles.kpiSub}>Kerugian Mutasi/Lost</Text>
              </View>
            </View>
          </ScrollView>
        )}

        {activeTab === 'pos' && (
          <View style={styles.tabContent}>
            {/* POS Search & Category Filter */}
            <View style={styles.searchBox}>
              <Feather name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari Produk / Scan SKU Barcode..."
                placeholderTextColor="#64748b"
                value={posSearch}
                onChangeText={setPosSearch}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {categoriesList.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Product Cards List */}
            <FlatList
              key={`pos-products-${productColumns}`}
              data={filteredPosProducts}
              keyExtractor={(item) => item.id}
              numColumns={productColumns}
              contentContainerStyle={{ padding: 12, paddingBottom: CONTENT_BOTTOM_PADDING }}
              renderItem={({ item }) => {
                const cartItem = cart.find((c) => c.productId === item.id);
                return (
                  <View style={[styles.productCard, productColumns === 1 && styles.productCardSingleColumn]}>
                    <Image source={{ uri: item.image }} style={styles.productImage} />
                    <View style={styles.productBody}>
                      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                      {item.isPromotion && (
                        <View style={styles.promoCardBadge}>
                          <MaterialCommunityIcons name="tag-outline" size={12} color="#fbbf24" />
                          <Text style={styles.promoCardBadgeText}>PROMO PAKET</Text>
                        </View>
                      )}
                      <Text style={styles.productPrice}>{formatRp(item.price)}</Text>
                      {item.isPromotion && (
                        <>
                          <Text style={styles.promoRegularPrice}>Harga normal {formatRp(item.regularPrice)}</Text>
                          <Text style={styles.promoComponents} numberOfLines={2}>
                            {(item.promotionItems || []).map((component) => {
                              const componentProduct = products.find((product) => product.id === component.productId);
                              return `${componentProduct?.name || 'Barang'} x${component.qty}`;
                            }).join(' + ')}
                          </Text>
                        </>
                      )}
                      <View style={styles.productMeta}>
                        <Text style={[styles.productStock, item.stock < 10 && { color: '#ef4444' }]}>
                          Stok: {item.stock}
                        </Text>
                        <Text style={styles.productCategory}>{item.category}</Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.addBtn, item.stock <= 0 && styles.disabledBtn]}
                        onPress={() => addToCart(item)}
                        disabled={item.stock <= 0}
                      >
                        <MaterialCommunityIcons name="cart-plus" size={16} color="#fff" />
                        <Text style={styles.addBtnText}>
                          {cartItem ? `Tambah (${cartItem.qty})` : 'Pilih'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />

            {/* Floating Cart Button */}
            {totalCartCount > 0 && (
              <TouchableOpacity
                style={styles.cartFAB}
                className={Platform.OS === 'web' ? 'app-cart-fab' : undefined}
                onPress={() => setIsCartModalOpen(true)}
              >
                <View style={styles.cartFABBadge}>
                  <Text style={styles.cartFABBadgeText}>{totalCartCount}</Text>
                </View>
                <MaterialCommunityIcons name="shopping" size={24} color="#fff" />
                <Text style={styles.cartFABText}>Keranjang ({formatRp(cartCalculations.grandTotal)})</Text>
                <Feather name="arrow-right" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'crud' && isSuperAdmin && (
          <View style={styles.tabContent}>
            <View style={styles.crudTopRow}>
              <View style={[styles.searchBox, { flex: 1 }]}>
                <Feather name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari Master Produk..."
                  placeholderTextColor="#64748b"
                  value={crudSearch}
                  onChangeText={setCrudSearch}
                />
              </View>
              <TouchableOpacity style={styles.primaryAddBtn} onPress={() => openProductForm(null)}>
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredCrudProducts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: CONTENT_BOTTOM_PADDING }}
              renderItem={({ item }) => {
                const margin = item.price - item.hpp;
                return (
                  <View style={styles.crudItemRow}>
                    <Image source={{ uri: item.image }} style={styles.crudThumb} />
                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                      <Text style={styles.crudName}>{item.name}</Text>
                      <Text style={styles.crudSku}>SKU: {item.barcode} • {item.category}</Text>
                      <Text style={styles.crudPrices}>
                        Jual: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{formatRp(item.price)}</Text> | HPP: {formatRp(item.hpp)}
                      </Text>
                      <Text style={styles.crudMargin}>Margin: +{formatRp(margin)} | Stok: {item.stock}</Text>
                    </View>

                    <View style={styles.crudActions}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => openProductForm(item)}>
                        <Feather name="edit-2" size={16} color="#0284c7" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => deleteProduct(item.id)}>
                        <Feather name="trash-2" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        )}

        {activeTab === 'mutation' && isSuperAdmin && (
          <View style={styles.tabContent}>
            <FlatList
              data={filteredStockHistory}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: CONTENT_BOTTOM_PADDING, flexGrow: 1 }}
              ListHeaderComponent={(
                <View>
                  <Text style={styles.stockHistoryTitle}>Riwayat Stok</Text>
                  <Text style={styles.stockHistorySubtitle}>Pantau barang restock, terjual, dan keluar lainnya.</Text>

                  <View style={styles.stockSummaryRow}>
                    <View style={[styles.stockSummaryCard, styles.stockSummaryIn]}>
                      <MaterialCommunityIcons name="package-down" size={20} color="#34d399" />
                      <Text style={styles.stockSummaryLabel}>BARANG DIRESTOCK</Text>
                      <Text style={styles.stockSummaryValue}>+{stockHistoryTotals.restocked} unit</Text>
                    </View>
                    <View style={[styles.stockSummaryCard, styles.stockSummaryOut]}>
                      <MaterialCommunityIcons name="package-up" size={20} color="#f87171" />
                      <Text style={styles.stockSummaryLabel}>BARANG KELUAR</Text>
                      <Text style={styles.stockSummaryValue}>-{stockHistoryTotals.removed} unit</Text>
                    </View>
                  </View>

                  <View style={styles.mutationTopBar}>
                    <TouchableOpacity style={[styles.mutActionBtn, { backgroundColor: '#0284c7' }]} onPress={() => setIsMutationModalOpen(true)}>
                      <Feather name="plus-circle" size={16} color="#fff" />
                      <Text style={styles.mutActionBtnText}>Catat Mutasi</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.mutActionBtn, { backgroundColor: '#7c3aed' }]} onPress={() => setIsStockCorrectionOpen(true)}>
                      <Feather name="check-square" size={16} color="#fff" />
                      <Text style={styles.mutActionBtnText}>Stock Opname</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stockHistoryFilters}>
                    {[
                      { id: 'all', label: 'Semua' },
                      { id: 'in', label: 'Restock' },
                      { id: 'out', label: 'Barang Keluar' },
                      { id: 'koreksi', label: 'Opname' },
                    ].map((filter) => (
                      <TouchableOpacity
                        key={filter.id}
                        style={[styles.stockHistoryFilter, stockHistoryFilter === filter.id && styles.stockHistoryFilterActive]}
                        onPress={() => setStockHistoryFilter(filter.id)}
                      >
                        <Text style={[styles.stockHistoryFilterText, stockHistoryFilter === filter.id && styles.stockHistoryFilterTextActive]}>
                          {filter.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              ListEmptyComponent={(
                <View style={styles.stockHistoryEmpty}>
                  <MaterialCommunityIcons name="clipboard-text-clock-outline" size={28} color="#64748b" />
                  <Text style={styles.stockHistoryEmptyText}>Belum ada riwayat untuk kategori ini.</Text>
                </View>
              )}
              renderItem={({ item }) => {
                const quantity = Number(item.qty) || 0;
                const quantityLabel = item.type === 'in'
                  ? `+${Math.abs(quantity)}`
                  : item.type === 'out'
                    ? `-${Math.abs(quantity)}`
                    : `${quantity > 0 ? '+' : ''}${quantity}`;
                const badgeLabel = item.type === 'in'
                  ? 'RESTOCK'
                  : item.type === 'out'
                    ? item.source === 'sale' ? (item.isCancelled ? 'TRANSAKSI BATAL' : 'TERJUAL') : 'KELUAR'
                    : 'OPNAME';
                const isCancelledSale = item.source === 'sale' && item.isCancelled;

                return (
                  <View style={[styles.mutationCard, isCancelledSale && { opacity: 0.65, borderColor: '#ef4444' }]}>
                    <View style={styles.mutCardHeader}>
                      <Text style={styles.mutCardId}>{item.id} • {item.operator}</Text>
                      <Text style={[
                        styles.mutBadge,
                        isCancelledSale
                          ? { backgroundColor: '#7f1d1d', color: '#fca5a5' }
                          : item.type === 'in'
                            ? styles.mutBadgeIn
                            : item.type === 'out'
                              ? styles.mutBadgeOut
                              : styles.mutBadgeKoreksi
                      ]}>
                        {badgeLabel}
                      </Text>
                    </View>
                    <Text style={styles.mutProdName}>{item.productName}</Text>
                    <Text style={[styles.mutQtyText, isCancelledSale && { textDecorationLine: 'line-through', color: '#94a3b8' }]}>
                      Jumlah: <Text style={{ fontWeight: 'bold' }}>{quantityLabel} unit</Text>
                    </Text>
                    <Text style={styles.stockHistoryDate}>
                      {item.date ? new Date(item.date).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Tanggal tidak tersedia'}
                    </Text>
                    <Text style={[styles.mutNote, isCancelledSale && { color: '#fca5a5' }]}>{item.note}</Text>

                    {/* Tombol Pembatalan Transaksi / Mutasi Stok Langsung di Halaman Stok */}
                    {item.source === 'sale' && !item.isCancelled && (
                      <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderColor: '#334155', flexDirection: 'row', justifyContent: 'flex-end' }}>
                        <TouchableOpacity
                          style={{
                            minHeight: 34,
                            paddingHorizontal: 12,
                            borderRadius: 7,
                            backgroundColor: '#991b1b',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                          onPress={() => cancelTransactionFromStock(item.transactionId)}
                        >
                          <Feather name="x-circle" size={13} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                            Batalkan Transaksi & Kembalikan Stok
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {item.source === 'mutation' && (
                      <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderColor: '#334155', flexDirection: 'row', justifyContent: 'flex-end' }}>
                        <TouchableOpacity
                          style={{
                            minHeight: 34,
                            paddingHorizontal: 12,
                            borderRadius: 7,
                            backgroundColor: '#b91c1c',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                          onPress={() => confirmCancelMutation(item)}
                        >
                          <Feather name="trash-2" size={13} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                            Batalkan Catatan Mutasi & Pulihkan Stok
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>
        )}

        {activeTab === 'reports' && (
          <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16, paddingBottom: CONTENT_BOTTOM_PADDING }}>
            {/* Header Riwayat & Laporan Sub-Tab Switcher untuk Super Admin */}
            {isSuperAdmin && (
              <View style={{ flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 10, padding: 4, marginBottom: 14 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    minHeight: 38,
                    borderRadius: 8,
                    backgroundColor: reportsSubTab === 'history' ? '#10b981' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                  onPress={() => setReportsSubTab('history')}
                >
                  <MaterialCommunityIcons name="history" size={17} color={reportsSubTab === 'history' ? '#fff' : '#94a3b8'} />
                  <Text style={{ color: reportsSubTab === 'history' ? '#fff' : '#94a3b8', fontWeight: '700', fontSize: 13 }}>
                    Riwayat Transaksi ({transactionHistory.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    minHeight: 38,
                    borderRadius: 8,
                    backgroundColor: reportsSubTab === 'finance' ? '#0284c7' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                  onPress={() => setReportsSubTab('finance')}
                >
                  <MaterialCommunityIcons name="finance" size={17} color={reportsSubTab === 'finance' ? '#fff' : '#94a3b8'} />
                  <Text style={{ color: reportsSubTab === 'finance' ? '#fff' : '#94a3b8', fontWeight: '700', fontSize: 13 }}>
                    Laporan Keuangan
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB KEUANGAN (Hanya jika Super Admin & reportsSubTab === 'finance') */}
            {isSuperAdmin && reportsSubTab === 'finance' && (
              <>
                <View style={styles.reportToolbar}>
                  <Text style={styles.sectionTitle}>Laporan Keuangan</Text>
                  <View style={styles.reportPeriodRow}>
                    {[
                      { id: 'day', label: 'Harian' },
                      { id: 'month', label: 'Bulanan' },
                    ].map((period) => (
                      <TouchableOpacity
                        key={period.id}
                        style={[styles.reportPeriodBtn, reportPeriod === period.id && styles.reportPeriodBtnActive]}
                        onPress={() => setReportPeriod(period.id)}
                      >
                        <Text style={[styles.reportPeriodText, reportPeriod === period.id && styles.reportPeriodTextActive]}>{period.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.reportPeriodLabel}>{reportData.periodLabel}</Text>
                  <View style={styles.reportDownloadRow}>
                    <TouchableOpacity
                      style={[styles.reportDownloadBtn, styles.reportDownloadBtnFinancial, (!pdfModulesReady || pdfExporting) && styles.reportDownloadBtnDisabled]}
                      onPress={() => runPdfExport(downloadFinancialPdf)}
                      disabled={!pdfModulesReady || pdfExporting}
                    >
                      <Feather name="file-text" size={15} color="#fff" />
                      <Text style={styles.reportDownloadText}>{pdfExporting ? 'Membuat PDF...' : 'Buat PDF Lengkap'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reportDownloadBtn, (!pdfModulesReady || pdfExporting) && styles.reportDownloadBtnDisabled]}
                      onPress={() => runPdfExport(downloadSalesReport)}
                      disabled={!pdfModulesReady || pdfExporting}
                    >
                      <Feather name="download" size={15} color="#fff" />
                      <Text style={styles.reportDownloadText}>{pdfExporting ? 'Membuat PDF...' : 'PDF Penjualan'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reportDownloadBtn, styles.reportDownloadBtnStock, (!pdfModulesReady || pdfExporting) && styles.reportDownloadBtnDisabled]}
                      onPress={() => runPdfExport(downloadStockReport)}
                      disabled={!pdfModulesReady || pdfExporting}
                    >
                      <Feather name="download" size={15} color="#fff" />
                      <Text style={styles.reportDownloadText}>{pdfExporting ? 'Membuat PDF...' : 'PDF Stok'}</Text>
                    </TouchableOpacity>
                  </View>
                  {!!pdfExportStatus && <Text style={styles.reportPdfStatus}>{pdfExportStatus}</Text>}
                </View>

                <Text style={styles.reportHint}>
                  PDF mengikuti periode terpilih dan berisi ringkasan keuangan, analisis produk, pembayaran, serta rincian transaksi.
                </Text>

                <View style={styles.reportMetricGrid}>
                  {[
                    ['Penerimaan Penjualan', reportData.revenue],
                    ['Arus Kas Bersih Estimasi', reportData.estimatedNetCashFlow],
                    ['Laba Kotor', reportData.grossProfit],
                    ['Laba Bersih Estimasi', reportData.netProfit],
                    ['HPP Terjual', reportData.costOfGoodsSold],
                    ['Belanja Stok', reportData.stockPurchaseCashOut],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.reportMetric}>
                      <Text style={styles.reportMetricLabel}>{label}</Text>
                      <Text style={styles.reportMetricValue}>{formatRp(value)}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Ringkasan Penjualan Produk</Text>
                {reportData.soldList.length ? reportData.soldList.map((item) => (
                  <View key={item.id} style={styles.reportDataRow}>
                    <Text style={styles.reportDataName}>{item.name} x{item.qty}</Text>
                    <Text style={styles.reportTotal}>{formatRp(item.total)}</Text>
                  </View>
                )) : <Text style={styles.reportEmpty}>Belum ada produk terjual pada periode ini.</Text>}

                <Text style={styles.sectionTitle}>Produk Tidak Terjual ({reportData.unsoldProducts.length})</Text>
                {reportData.unsoldProducts.slice(0, 20).map((item) => (
                  <View key={item.id} style={styles.reportDataRow}>
                    <Text style={styles.reportDataName}>{item.name}</Text>
                    <Text style={styles.reportMethod}>Stok {item.stock}</Text>
                  </View>
                ))}
                {reportData.unsoldProducts.length > 20 && <Text style={styles.reportEmpty}>Daftar lengkap tersedia di PDF.</Text>}

                <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
                {reportData.paymentSummary.length ? reportData.paymentSummary.map((item) => (
                  <View key={item.method} style={styles.reportDataRow}>
                    <Text style={styles.reportDataName}>{item.method} ({item.count} transaksi)</Text>
                    <Text style={styles.reportTotal}>{formatRp(item.total)}</Text>
                  </View>
                )) : <Text style={styles.reportEmpty}>Belum ada pembayaran pada periode ini.</Text>}
              </>
            )}

            {/* TAB RIWAYAT TRANSAKSI (Bisa diakses Kasir & Super Admin) */}
            {(!isSuperAdmin || reportsSubTab === 'history') && (
              <>
                <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={styles.sectionTitle}>
                    Riwayat Transaksi Penjualan ({filteredTransactions.length})
                  </Text>
                  <TouchableOpacity
                    style={[styles.reportDownloadBtn, { marginVertical: 0, paddingHorizontal: 12, height: 36 }, (!pdfModulesReady || pdfExporting) && styles.reportDownloadBtnDisabled]}
                    onPress={() => runPdfExport(downloadSalesReport)}
                    disabled={!pdfModulesReady || pdfExporting}
                  >
                    <Feather name="download" size={14} color="#fff" />
                    <Text style={[styles.reportDownloadText, { fontSize: 12 }]}>{pdfExporting ? 'Membuat...' : 'Download PDF'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Search Bar Transaksi */}
                <View style={[styles.searchBox, { marginBottom: 14 }]}>
                  <Feather name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Cari ID transaksi, kasir, produk, pembayaran..."
                    placeholderTextColor="#64748b"
                    value={txSearch}
                    onChangeText={setTxSearch}
                  />
                  {!!txSearch && (
                    <TouchableOpacity onPress={() => setTxSearch('')}>
                      <Feather name="x" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                {filteredTransactions.length ? filteredTransactions.map((tx) => {
                  const isCancelled = tx.status === 'cancelled';
                  return (
                    <View key={tx.id} style={[styles.reportCard, isCancelled && { opacity: 0.65, borderColor: '#ef4444' }]}>
                      <View style={styles.reportHeader}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.reportTxId}>{tx.id} • {tx.cashier || 'Kasir'}</Text>
                          {!!tx.customer?.name && (
                            <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                              Pelanggan: {tx.customer.name}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.reportTotal, isCancelled && { color: '#f87171' }]}>
                          {isCancelled ? 'DIBATALKAN' : formatRp(tx.total)}
                        </Text>
                      </View>

                      <Text style={styles.reportMethod}>
                        {tx.date ? new Date(tx.date).toLocaleString('id-ID') : 'Tanggal tidak tersedia'} · {tx.method || 'Pembayaran'}
                      </Text>

                      <View style={styles.reportItems}>
                        {(tx.items || []).map((item, index) => (
                          <Text key={`${item.productId || item.name}-${index}`} style={styles.reportItemText}>
                            • {item.name || item.productId} (x{item.qty}) = {formatRp((item.price || 0) * (item.qty || 0))}
                          </Text>
                        ))}
                      </View>

                      {isCancelled && (
                        <View style={{ marginTop: 8, padding: 8, backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 6 }}>
                          <Text style={{ color: '#fca5a5', fontSize: 12, fontWeight: '600' }}>
                            Dibatalkan: {tx.cancelledAt ? new Date(tx.cancelledAt).toLocaleString('id-ID') : ''}
                            {tx.cancelledBy ? ` oleh ${tx.cancelledBy}` : ''}
                          </Text>
                          <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                            Stok barang telah otomatis dipulihkan ke inventori.
                          </Text>
                        </View>
                      )}

                      {/* Tombol Aksi Transaksi: Buka Struk / Edit / Batalkan */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            minWidth: 90,
                            minHeight: 38,
                            borderRadius: 8,
                            backgroundColor: '#047857',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                          onPress={() => openReceiptForTransaction(tx)}
                        >
                          <Feather name="file-text" size={14} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Struk / PNG</Text>
                        </TouchableOpacity>

                        {!isCancelled && (
                          <>
                            <TouchableOpacity
                              style={{
                                flex: 1,
                                minWidth: 80,
                                minHeight: 38,
                                borderRadius: 8,
                                backgroundColor: '#1d4ed8',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                              }}
                              onPress={() => openTransactionEditor(tx)}
                            >
                              <Feather name="edit-2" size={14} color="#fff" />
                              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={{
                                flex: 1,
                                minWidth: 85,
                                minHeight: 38,
                                borderRadius: 8,
                                backgroundColor: '#991b1b',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                              }}
                              onPress={() => confirmCancelTransaction(tx)}
                            >
                              <Feather name="x-circle" size={14} color="#fff" />
                              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Batalkan</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  );
                }) : (
                  <Text style={styles.reportEmpty}>
                    {txSearch ? 'Tidak ada transaksi yang cocok dengan pencarian.' : 'Belum ada riwayat transaksi.'}
                  </Text>
                )}
              </>
            )}
          </ScrollView>
        )}
      </View>

      {/* Modal Edit Transaksi */}
      <Modal
        visible={!!editingTransaction}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!isTransactionSaving) setEditingTransaction(null);
        }}
      >
        <View style={styles.modalOverlay} className={Platform.OS === 'web' ? 'app-modal-overlay' : undefined}>
          <View
            style={[styles.modalBox, { maxHeight: '90%', maxWidth: 520 }]}
            className={Platform.OS === 'web' ? 'app-modal-box' : undefined}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Transaksi</Text>
              <TouchableOpacity disabled={isTransactionSaving} onPress={() => setEditingTransaction(null)}>
                <Feather name="x" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
              {editingTransaction?.id} · Ubah jumlah barang; isi 0 untuk menghapus barang dari transaksi.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {editedTransactionItems.map((item, index) => (
                <View
                  key={`${item.productId || item.name}-${index}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#334155' }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#f8fafc', fontSize: 13, fontWeight: '700' }}>{item.name || item.productId}</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                      Harga: {formatRp(item.price)} · Subtotal: {formatRp((item.price || 0) * (Number(item.editQty) || 0))}
                    </Text>
                  </View>
                  <View style={{ width: 85 }}>
                    <TextInput
                      style={[styles.prodInput, { textAlign: 'center', paddingHorizontal: 6, minHeight: 40 }]}
                      keyboardType="numeric"
                      value={item.editQty}
                      onChangeText={(val) => {
                        const cleaned = val.replace(/[^0-9]/g, '');
                        setEditedTransactionItems((prev) => prev.map((curr, idx) => (
                          idx === index ? { ...curr, editQty: cleaned } : curr
                        )));
                      }}
                    />
                  </View>
                </View>
              ))}

              <View style={{ marginTop: 14, padding: 12, backgroundColor: '#0f172a', borderRadius: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>Total Baru:</Text>
                  <Text style={{ color: '#10b981', fontSize: 15, fontWeight: '700' }}>{formatRp(editedTransactionTotal)}</Text>
                </View>
                {editingTransaction?.method === 'Tunai' && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Uang Diterima:</Text>
                    <TextInput
                      style={[styles.prodInput, { minHeight: 40 }]}
                      keyboardType="numeric"
                      value={editedTransactionCash}
                      onChangeText={(val) => setEditedTransactionCash(val.replace(/[^0-9]/g, ''))}
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1, marginTop: 0 }]}
                disabled={isTransactionSaving}
                onPress={() => setEditingTransaction(null)}
              >
                <Text style={styles.cancelBtnText}>Kembali</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.receiptDoneBtn, { flex: 1, marginTop: 0, backgroundColor: '#047857', opacity: isTransactionSaving ? 0.6 : 1 }]}
                disabled={isTransactionSaving}
                onPress={saveTransactionEdit}
              >
                <Text style={styles.receiptDoneBtnText}>{isTransactionSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Shift Receipt */}
      <Modal visible={isShiftReceiptOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay} className={Platform.OS === 'web' ? 'app-modal-overlay' : undefined}>
          <View
            style={[styles.modalBox, { backgroundColor: '#fff', maxHeight: '94%', maxWidth: 440, alignItems: 'center' }]}
            className={Platform.OS === 'web' ? 'app-modal-box' : undefined}
          >
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingHorizontal: 4 }}>
              <View ref={shiftReceiptCaptureRef} collapsable={false} style={{ backgroundColor: '#fff', paddingHorizontal: 4, width: '100%' }}>
              <View style={{ alignItems: 'center', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingBottom: 14 }}>
                <View style={{ width: 62, height: 62, borderRadius: 13, backgroundColor: '#08090c', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <View style={{ position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#e84adc', borderRightColor: '#55e8ed' }} />
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', textAlign: 'center' }}>Tipsy{'\n'}Point</Text>
                </View>
                <Text style={{ color: '#27313f', fontSize: 21, fontWeight: '700' }}>Tipsy Point</Text>
                <Text style={{ color: '#758092', marginTop: 4 }}>Jalan Kepiting</Text>
                <Text style={{ color: '#758092', marginTop: 4 }}>Telp: 085196980785</Text>
              </View>

              <View style={{ borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 10 }}>
                {[
                  ['No. Struk', closedShiftSummary?.shiftId],
                  ['Tanggal', closedShiftSummary?.closedAt?.toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
                  ['Kasir', closedShiftSummary?.cashier],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5, gap: 12 }}>
                    <Text style={{ color: '#758092' }}>{label}</Text>
                    <Text style={{ color: '#27313f', textAlign: 'right', flexShrink: 1 }}>{value}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 }}>
                  <Text style={{ color: '#758092' }}>Jumlah transaksi</Text>
                  <Text style={{ color: '#27313f' }}>{closedShiftSummary?.transactions.length || 0}</Text>
                </View>
              </View>

              <Text style={{ color: '#27313f', fontWeight: '700', marginTop: 10 }}>Barang Terjual</Text>
              {(closedShiftSummary?.items || []).length ? closedShiftSummary.items.map((item, index) => (
                <View key={`${item.productId || item.name}-${index}`} style={{ paddingVertical: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Text style={{ color: '#27313f', fontWeight: '600', flexShrink: 1 }}>{item.name}</Text>
                    <Text style={{ color: '#27313f', fontWeight: '600' }}>{formatRp(item.amount)}</Text>
                  </View>
                  <Text style={{ color: '#758092', fontSize: 12, marginTop: 4 }}>{item.qty} pcs x {formatRp(item.price)}</Text>
                </View>
              )) : <Text style={{ color: '#758092', paddingVertical: 8 }}>Tidak ada penjualan pada shift ini.</Text>}

              <View style={{ borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 8 }}>
                {[
                  ['Subtotal', formatRp(closedShiftSummary?.subtotal)],
                  ['Diskon', `- ${formatRp(closedShiftSummary?.discount)}`],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 }}>
                    <Text style={{ color: label === 'Diskon' ? '#d35d64' : '#758092' }}>{label}</Text>
                    <Text style={{ color: label === 'Diskon' ? '#d35d64' : '#27313f' }}>{value}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 10, marginTop: 5 }}>
                  <Text style={{ color: '#192230', fontSize: 16, fontWeight: '700' }}>TOTAL</Text>
                  <Text style={{ color: '#192230', fontSize: 16, fontWeight: '700' }}>{formatRp(closedShiftSummary?.total)}</Text>
                </View>
              </View>

              <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb', marginTop: 10, paddingVertical: 8 }}>
                {(closedShiftSummary?.payments || []).map(({ method, amount }) => (
                  <View key={method} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 }}>
                    <Text style={{ color: '#27313f' }}>{method}</Text>
                    <Text style={{ color: '#27313f' }}>{formatRp(amount)}</Text>
                  </View>
                ))}
              </View>

              <Text style={{ color: '#27313f', fontWeight: '700', marginTop: 10 }}>Barang Masuk</Text>
              {(closedShiftSummary?.incomingStock || []).length ? closedShiftSummary.incomingStock.map((item) => (
                <View key={item.id} style={{ paddingVertical: 7 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Text style={{ color: '#27313f', fontWeight: '600', flexShrink: 1 }}>{item.name}</Text>
                    <Text style={{ color: '#27313f', fontWeight: '600' }}>+{item.qty} pcs</Text>
                  </View>
                  <Text style={{ color: '#758092', fontSize: 12, marginTop: 4 }}>
                    {item.date ? new Date(item.date).toLocaleString('id-ID') : ''}{item.note ? ` · ${item.note}` : ''}
                  </Text>
                </View>
              )) : <Text style={{ color: '#758092', paddingVertical: 8 }}>Tidak ada barang masuk pada shift ini.</Text>}
              <Text style={{ color: '#758092', fontStyle: 'italic', textAlign: 'center', marginTop: 14, marginBottom: 8 }}>Terima kasih atas kunjungan Anda</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.receiptDoneBtn, { backgroundColor: '#2563eb', marginTop: 10, marginBottom: 8 }]}
              onPress={printShiftReceipt}
            >
              <Feather name="printer" size={16} color="#fff" />
              <Text style={styles.receiptDoneBtnText}>Cetak Struk Shift</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.receiptDoneBtn, { backgroundColor: '#047857', marginBottom: 8, opacity: isReceiptPngSaving ? 0.7 : 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }]}
              disabled={isReceiptPngSaving}
              onPress={() => saveReceiptPng(shiftReceiptCaptureRef, `struk-shift-${closedShiftSummary?.shiftId || 'kasir'}.png`)}
            >
              {isReceiptPngSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="image" size={16} color="#fff" />
              )}
              <Text style={styles.receiptDoneBtnText}>{isReceiptPngSaving ? 'Menyiapkan Lembar PNG...' : 'Simpan PNG'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsShiftReceiptOpen(false)}>
              <Text style={styles.cancelBtnText}>Lanjut Shift</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.receiptDoneBtn, { marginTop: 8 }]} onPress={finishShiftAndLogout}>
              <Text style={styles.receiptDoneBtnText}>Selesai & Keluar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal User Switch */}
      <Modal visible={isUserSwitchOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay} className={Platform.OS === 'web' ? 'app-modal-overlay' : undefined}>
          <View style={styles.modalBox} className={Platform.OS === 'web' ? 'app-modal-box' : undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Akun & Sesi</Text>
              <TouchableOpacity onPress={() => setIsUserSwitchOpen(false)}>
                <Feather name="x" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: isSuperAdmin ? '#7c3aed18' : '#10b98118',
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isSuperAdmin ? '#a855f750' : '#10b98150',
              marginBottom: 12,
            }}>
              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>PENGGUNA AKTIF:</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                {currentUser?.name || 'Belum login'}
              </Text>
              <Text style={{ color: isSuperAdmin ? '#c084fc' : '#34d399', fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                Role: {isSuperAdmin ? 'Super Admin (Akses Penuh / Kelola Stok)' : 'Kasir (Transaksi & Riwayat Saja)'}
              </Text>
            </View>

            {isSuperAdmin && (
              <View style={{ marginTop: 10, marginBottom: 10, width: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700' }}>KELOLA AKUN KASIR & ADMIN:</Text>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#10b98125', borderRadius: 6, borderWidth: 1, borderColor: '#10b981' }}
                    onPress={() => {
                      setIsUserSwitchOpen(false);
                      setAddKasirError('');
                      setAddKasirRole('Kasir');
                      setIsAddKasirLoginOpen(true);
                    }}
                  >
                    <Feather name="plus" size={12} color="#10b981" />
                    <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '700' }}>Tambah Akun</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                  {users.map((u) => {
                    const isAdm = u.role?.toLowerCase() === 'super admin' || u.role?.toLowerCase() === 'admin';
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <View
                        key={u.id || u.username}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          backgroundColor: '#1e293b',
                          borderRadius: 8,
                          marginBottom: 6,
                          borderWidth: 1,
                          borderColor: isSelf ? '#a855f7' : '#334155',
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                              {u.name} {isSelf ? '(Anda)' : ''}
                            </Text>
                            <View style={{
                              backgroundColor: isAdm ? '#7c3aed25' : '#10b98125',
                              paddingHorizontal: 5,
                              paddingVertical: 1,
                              borderRadius: 4,
                              borderWidth: 1,
                              borderColor: isAdm ? '#a855f7' : '#10b981',
                            }}>
                              <Text style={{ color: isAdm ? '#c084fc' : '#34d399', fontSize: 9, fontWeight: '700' }}>
                                {isAdm ? 'Super Admin' : 'Kasir'}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                            username: <Text style={{ color: '#cbd5e1' }}>{u.username}</Text>
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#0284c7',
                              padding: 7,
                              borderRadius: 6,
                            }}
                            onPress={() => {
                              setIsUserSwitchOpen(false);
                              openEditUserForm(u);
                            }}
                            accessibilityLabel="Edit akun"
                          >
                            <Feather name="edit-2" size={13} color="#fff" />
                          </TouchableOpacity>

                          {!isSelf && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#ef4444',
                                padding: 7,
                                borderRadius: 6,
                              }}
                              onPress={() => handleDeleteUser(u)}
                              accessibilityLabel="Hapus akun"
                            >
                              <Feather name="trash-2" size={13} color="#fff" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity style={styles.logoutBtn} onPress={handleCloseShift}>
              <Feather name="log-out" size={16} color="#fff" />
              <Text style={styles.addUserBtnText}>Tutup Shift & Buat Struk</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.logoutBtn, { marginTop: 10, backgroundColor: '#ef4444' }]}
              onPress={() => {
                setIsUserSwitchOpen(false);
                handleLogout();
              }}
            >
              <Feather name="power" size={16} color="#fff" />
              <Text style={styles.addUserBtnText}>Keluar / Ganti Akun</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 10 }]}
              onPress={() => setIsUserSwitchOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Kembali</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Akun (Super Admin) */}
      <Modal visible={isEditUserModalOpen} transparent animationType="slide" onRequestClose={() => setIsEditUserModalOpen(false)}>
        <View style={styles.loginModalOverlay} className={Platform.OS === 'web' ? 'app-modal-overlay' : undefined}>
          <View style={styles.loginModalCard} className={Platform.OS === 'web' ? 'app-modal-box' : undefined}>
            <View style={styles.loginModalHeader}>
              <Text style={styles.loginModalTitle}>Edit Akun: {editingUser?.name}</Text>
              <TouchableOpacity onPress={() => setIsEditUserModalOpen(false)}>
                <Feather name="x" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.loginModalLabel}>Tipe Akun (Role)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: editUserRole === 'Kasir' ? '#10b981' : '#1e293b',
                  borderWidth: 1,
                  borderColor: editUserRole === 'Kasir' ? '#10b981' : '#334155',
                }}
                onPress={() => setEditUserRole('Kasir')}
              >
                <Text style={{
                  color: editUserRole === 'Kasir' ? '#fff' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: 13,
                }}>
                  Kasir
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: editUserRole === 'Super Admin' ? '#7c3aed' : '#1e293b',
                  borderWidth: 1,
                  borderColor: editUserRole === 'Super Admin' ? '#7c3aed' : '#334155',
                }}
                onPress={() => setEditUserRole('Super Admin')}
              >
                <Text style={{
                  color: editUserRole === 'Super Admin' ? '#fff' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: 13,
                }}>
                  Super Admin
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.loginModalLabel}>Nama Lengkap</Text>
            <TextInput
              style={styles.loginInput}
              placeholder="Nama Kasir / Admin"
              placeholderTextColor="#64748b"
              value={editUserName}
              onChangeText={(t) => { setEditUserName(t); setEditUserError(''); }}
            />

            <Text style={styles.loginModalLabel}>Username</Text>
            <TextInput
              style={styles.loginInput}
              placeholder="Username"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              value={editUserUsername}
              onChangeText={(t) => { setEditUserUsername(t); setEditUserError(''); }}
            />

            <Text style={styles.loginModalLabel}>Sandi / Password</Text>
            <TextInput
              style={styles.loginInput}
              placeholder="Minimal 6 karakter"
              placeholderTextColor="#64748b"
              value={editUserPassword}
              onChangeText={(t) => { setEditUserPassword(t); setEditUserError(''); }}
            />

            {!!editUserError && <Text style={styles.loginError}>{editUserError}</Text>}

            <View style={styles.loginModalActions}>
              <TouchableOpacity style={styles.loginModalCancel} onPress={() => setIsEditUserModalOpen(false)}>
                <Text style={styles.loginModalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.loginModalSubmit, { backgroundColor: '#0284c7' }]} onPress={handleSaveEditUser}>
                <Feather name="check" size={14} color="#fff" />
                <Text style={styles.loginModalSubmitText}>Simpan Perubahan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cart Drawer Modal */}
      <Modal visible={isCartModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay} className={Platform.OS === 'web' ? 'app-modal-overlay' : undefined}>
          <View
            style={[styles.modalBox, { height: Math.min(windowHeight * 0.9, 760), maxHeight: '94%' }]}
            className={Platform.OS === 'web' ? 'app-modal-box' : undefined}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Keranjang Belanja</Text>
              <TouchableOpacity onPress={() => setIsCartModalOpen(false)}>
                <Feather name="x" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1, minHeight: 0 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {cart.length === 0 && (
                <Text style={{ color: '#94a3b8', paddingVertical: 16, textAlign: 'center' }}>
                  Belum ada barang di keranjang.
                </Text>
              )}
              {cart.map((item) => {
                const p = products.find((prod) => prod.id === item.productId);
                if (!p) return null;
                return (
                  <View key={item.productId} style={styles.cartRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartProdName}>{p.name}</Text>
                      {p.isPromotion && <Text style={styles.promoComponents}>{(p.promotionItems || []).map((component) => {
                        const componentProduct = products.find((product) => product.id === component.productId);
                        return `${componentProduct?.name || 'Barang'} x${component.qty}`;
                      }).join(' + ')}</Text>}
                      <Text style={styles.cartProdPrice}>{formatRp(p.price)}</Text>
                    </View>

                    <View style={styles.qtyBox}>
                      <TouchableOpacity onPress={() => updateCartQty(item.productId, -1)} style={styles.qtyBtn}>
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyNum}>{item.qty}</Text>
                      <TouchableOpacity onPress={() => updateCartQty(item.productId, 1)} style={styles.qtyBtn}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            <View style={styles.cartSummary}>
              <View style={styles.cartCashierField}>
                <Text style={styles.cartFieldLabel}>Kasir</Text>
                <View style={styles.cartCashierValue}>
                  <MaterialCommunityIcons name="account-circle" size={16} color="#10b981" />
                  <Text style={styles.customerSelectText} numberOfLines={1}>
                    {currentUser?.name || 'Belum login'}
                  </Text>
                </View>
              </View>
              <View
                style={styles.cartCustomerDateRow}
                className={Platform.OS === 'web' ? 'app-cart-customer-date-row' : undefined}
              >
                <View style={styles.cartCustomerField}>
                  <Text style={styles.cartFieldLabel}>Pelanggan</Text>
                  <View style={styles.customerSelectRow}>
                    <TouchableOpacity
                      style={styles.customerSelectButton}
                      onPress={() => setShowCustomerOptions((visible) => !visible)}
                    >
                      <Text style={styles.customerSelectText} numberOfLines={1}>{selectedCustomer?.name || 'Pelanggan Umum'}</Text>
                      <Feather name="chevron-down" size={15} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.customerAddButton}
                      onPress={() => {
                        setShowCustomerOptions(true);
                        setIsAddingCustomer((visible) => !visible);
                      }}
                      accessibilityLabel="Tambah pelanggan baru"
                    >
                      <Feather name={isAddingCustomer ? 'x' : 'user-plus'} size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.transactionDateField}>
                  <Text style={styles.cartFieldLabel}>Tanggal Transaksi</Text>
                  {Platform.OS === 'web' ? (
                    <TextInput
                      style={styles.transactionDateInput}
                      type="date"
                      value={selectedTransactionDate}
                      onChangeText={setSelectedTransactionDate}
                    />
                  ) : (
                    <TouchableOpacity style={styles.transactionDateButton} onPress={() => setIsDatePickerOpen(true)}>
                      <Feather name="calendar" size={15} color="#10b981" />
                      <Text style={styles.transactionDateText}>{selectedTransactionDate}</Text>
                    </TouchableOpacity>
                  )}
                  {isDatePickerOpen && Platform.OS !== 'web' && (
                    <DateTimePicker
                      value={new Date(`${selectedTransactionDate}T12:00:00`)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'compact' : 'default'}
                      maximumDate={new Date()}
                      onChange={(event, date) => {
                        setIsDatePickerOpen(false);
                        if (event.type === 'set' && date) setSelectedTransactionDate(formatDateInput(date));
                      }}
                    />
                  )}
                </View>
              </View>

              {showCustomerOptions && (
                <View style={styles.customerOptionsPanel}>
                  <ScrollView style={styles.customerOptionsList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    <TouchableOpacity
                      style={styles.customerOption}
                      onPress={() => {
                        setSelectedCustomer(null);
                        setShowCustomerOptions(false);
                        setIsAddingCustomer(false);
                      }}
                    >
                      <Text style={styles.customerOptionName}>Pelanggan Umum</Text>
                      <Text style={styles.customerOptionDetail}>Tanpa data pelanggan</Text>
                    </TouchableOpacity>
                    {customers.map((customer) => (
                      <TouchableOpacity
                        key={customer.id}
                        style={styles.customerOption}
                        onPress={() => {
                          setSelectedCustomer(customer);
                          setShowCustomerOptions(false);
                          setIsAddingCustomer(false);
                        }}
                      >
                        <Text style={styles.customerOptionName}>{customer.name}</Text>
                        {!!customer.phone && <Text style={styles.customerOptionDetail}>{customer.phone}</Text>}
                      </TouchableOpacity>
                    ))}
                    {!customers.length && <Text style={styles.customerOptionDetail}>Belum ada pelanggan tersimpan.</Text>}
                  </ScrollView>
                  {isAddingCustomer && (
                    <View style={styles.addCustomerForm}>
                      <TextInput
                        style={styles.customerInput}
                        placeholder="Nama pelanggan"
                        placeholderTextColor="#64748b"
                        value={newCustomerName}
                        onChangeText={setNewCustomerName}
                        returnKeyType="next"
                      />
                      <TextInput
                        style={styles.customerInput}
                        placeholder="Nomor telepon (opsional)"
                        placeholderTextColor="#64748b"
                        keyboardType="phone-pad"
                        value={newCustomerPhone}
                        onChangeText={setNewCustomerPhone}
                      />
                      <TouchableOpacity style={styles.saveCustomerButton} onPress={handleAddCustomer}>
                        <Text style={styles.saveCustomerButtonText}>Simpan & Pilih Pelanggan</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal normal</Text>
                <Text style={styles.summaryVal}>{formatRp(cartCalculations.subtotal)}</Text>
              </View>
              {cartCalculations.promotionDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Hemat paket promo</Text>
                  <Text style={[styles.summaryVal, { color: '#34d399' }]}>- {formatRp(cartCalculations.promotionDiscount)}</Text>
                </View>
              )}
              {cartCalculations.promotionDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal setelah promo</Text>
                  <Text style={styles.summaryVal}>{formatRp(cartCalculations.discountedSubtotal)}</Text>
                </View>
              )}

              <View style={styles.discountSection}>
                <View style={styles.discountHeader}>
                  <Text style={styles.summaryLabel}>Diskon</Text>
                  <View style={styles.discountModeSwitch}>
                    {[
                      { id: 'percent', label: 'Persen %' },
                      { id: 'fixed', label: 'Nominal Rp' },
                    ].map((mode) => (
                      <TouchableOpacity
                        key={mode.id}
                        style={[styles.discountModeBtn, discountType === mode.id && styles.discountModeBtnActive]}
                        onPress={() => changeDiscountType(mode.id)}
                      >
                        <Text style={[styles.discountModeText, discountType === mode.id && styles.discountModeTextActive]}>{mode.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TextInput
                  style={styles.discountValueInput}
                  keyboardType="numeric"
                  placeholder={discountType === 'percent' ? 'Masukkan persen diskon' : 'Masukkan nominal diskon (Rp)'}
                  placeholderTextColor="#64748b"
                  value={discountValue}
                  onChangeText={setDiscountValue}
                />
                <Text style={styles.discountApplied}>Diskon tambahan: {formatRp(cartCalculations.discountAmount)}</Text>
              </View>

              <Text style={styles.paymentLabel}>Metode Pembayaran</Text>
              <View style={styles.paymentMethodRow}>
                {['Tunai', 'QRIS'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.paymentMethodBtn, payMethod === method && styles.paymentMethodBtnActive]}
                    onPress={() => {
                      setPayMethod(method);
                      if (method === 'QRIS') setCashAmount('');
                    }}
                  >
                    <MaterialCommunityIcons
                      name={method === 'Tunai' ? 'cash' : 'qrcode-scan'}
                      size={18}
                      color={payMethod === method ? '#fff' : '#94a3b8'}
                    />
                    <Text style={[styles.paymentMethodText, payMethod === method && styles.paymentMethodTextActive]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {payMethod === 'Tunai' && (
                <View style={styles.cashInputRow}>
                  <Text style={styles.summaryLabel}>Uang Diterima</Text>
                  <TextInput
                    style={styles.cashInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    value={cashAmount}
                    onChangeText={setCashAmount}
                  />
                </View>
              )}

              {payMethod === 'QRIS' && (
                <View style={styles.qrisPanel}>
                  <Text style={styles.qrisTitle}>Scan QRIS untuk membayar</Text>
                  <Image source={{ uri: QRIS_IMAGE_URL }} style={styles.qrisImage} />
                  <Text style={styles.qrisAmount}>{formatRp(cartCalculations.grandTotal)}</Text>
                  <Text style={styles.qrisHint}>QR demo. Ganti QRIS_IMAGE_URL dengan QR merchant Anda.</Text>
                </View>
              )}

              <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#334155', paddingTop: 8 }]}>
                <Text style={styles.grandTotalLabel}>TOTAL BAYAR</Text>
                <Text style={styles.grandTotalVal}>{formatRp(cartCalculations.grandTotal)}</Text>
              </View>

              <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                <Text style={styles.checkoutBtnText}>Bayar Now ({formatRp(cartCalculations.grandTotal)})</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal CRUD Product */}
      <Modal visible={isProductModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay} className={Platform.OS === 'web' ? 'app-modal-overlay' : undefined}>
          <View style={[styles.modalBox, { maxHeight: '92%' }]} className={Platform.OS === 'web' ? 'app-modal-box' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.productFormContent}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Edit Master Produk' : 'Tambah Produk Baru'}</Text>

              <TextInput style={styles.modalInput} placeholder="Nama Produk" placeholderTextColor="#64748b" value={prodName} onChangeText={setProdName} />
              <View style={styles.promotionToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.promotionToggleTitle}>Barang Promosi</Text>
                  <Text style={styles.promotionToggleHint}>Gabungkan beberapa produk menjadi satu paket diskon</Text>
                </View>
                <Switch
                  value={isPromotionProduct}
                  onValueChange={(enabled) => {
                    setIsPromotionProduct(enabled);
                    setProdCategory(enabled ? 'Promo' : 'Anggur & Wine');
                    if (enabled) setPromotionItems([]);
                  }}
                  trackColor={{ false: '#475569', true: '#047857' }}
                  thumbColor={isPromotionProduct ? '#d1fae5' : '#e2e8f0'}
                />
              </View>

              {isPromotionProduct ? (
                <View style={styles.promotionEditor}>
                  <Text style={styles.promotionSectionTitle}>Pilih Isi Paket</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Cari nama barang atau barcode"
                    placeholderTextColor="#64748b"
                    value={promotionSearch}
                    onChangeText={setPromotionSearch}
                  />
                  <ScrollView style={styles.promotionProductList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {availablePromotionProducts.map((product) => {
                      const selected = promotionItems.find((item) => item.productId === product.id);
                      return (
                        <View key={product.id} style={styles.promotionProductRow}>
                          <TouchableOpacity style={styles.promotionProductSelect} onPress={() => togglePromotionItem(product.id)}>
                            <MaterialCommunityIcons
                              name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                              size={19}
                              color={selected ? '#10b981' : '#64748b'}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.promotionProductName}>{product.name}</Text>
                              <Text style={styles.promotionProductMeta}>{formatRp(product.price)} | Stok {product.stock}</Text>
                            </View>
                          </TouchableOpacity>
                          {selected && (
                            <View style={styles.promotionQtyControl}>
                              <TouchableOpacity onPress={() => updatePromotionItemQty(product.id, -1)} style={styles.promotionQtyButton}>
                                <Text style={styles.promotionQtyButtonText}>-</Text>
                              </TouchableOpacity>
                              <Text style={styles.promotionQtyValue}>{selected.qty}</Text>
                              <TouchableOpacity onPress={() => updatePromotionItemQty(product.id, 1)} style={styles.promotionQtyButton}>
                                <Text style={styles.promotionQtyButtonText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                    {!availablePromotionProducts.length && <Text style={styles.promotionProductMeta}>Barang tidak ditemukan.</Text>}
                  </ScrollView>
                  <View style={styles.promotionPriceSummary}>
                    <Text style={styles.promotionPriceLabel}>Harga normal paket</Text>
                    <Text style={styles.promotionPriceValue}>{formatRp(promotionRegularPrice)}</Text>
                  </View>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Harga promo (Rp)"
                    keyboardType="numeric"
                    placeholderTextColor="#64748b"
                    value={prodPrice}
                    onChangeText={setProdPrice}
                  />
                  {!!promotionItems.length && Number(prodPrice) > 0 && Number(prodPrice) < promotionRegularPrice && (
                    <Text style={styles.promotionSavingText}>Pelanggan hemat {formatRp(promotionRegularPrice - Number(prodPrice))}</Text>
                  )}
                  <Text style={styles.promotionStockNote}>Stok paket mengikuti jumlah stok paling sedikit dari barang penyusunnya.</Text>
                </View>
              ) : (
                <>
                  <TextInput style={styles.modalInput} placeholder="Barcode SKU" placeholderTextColor="#64748b" value={prodBarcode} onChangeText={setProdBarcode} />
                  <TextInput style={styles.modalInput} placeholder="Kategori" placeholderTextColor="#64748b" value={prodCategory} onChangeText={setProdCategory} />
                  <TextInput style={styles.modalInput} placeholder="Stok Awal" keyboardType="numeric" placeholderTextColor="#64748b" value={prodStock} onChangeText={setProdStock} />
                  <TextInput style={styles.modalInput} placeholder="Modal HPP (Rp)" keyboardType="numeric" placeholderTextColor="#64748b" value={prodHpp} onChangeText={setProdHpp} />
                  <TextInput style={styles.modalInput} placeholder="Harga Jual (Rp)" keyboardType="numeric" placeholderTextColor="#64748b" value={prodPrice} onChangeText={setProdPrice} />
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsProductModalOpen(false)}>
                  <Text style={styles.cancelBtnText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveModalBtn} onPress={saveProduct}>
                  <Text style={styles.saveModalBtnText}>{isPromotionProduct ? 'Simpan Barang Promosi' : 'Simpan Produk'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Mutasi */}
      <Modal visible={isMutationModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay} className={Platform.OS === 'web' ? 'app-modal-overlay' : undefined}>
          <View style={styles.modalBox} className={Platform.OS === 'web' ? 'app-modal-box' : undefined}>
            <Text style={styles.modalTitle}>Catat Mutasi Stok</Text>
            <TextInput style={styles.modalInput} placeholder="Qty Mutasi" keyboardType="numeric" placeholderTextColor="#64748b" value={mutQty} onChangeText={setMutQty} />
            <TextInput style={styles.modalInput} placeholder="Keterangan / Alasan" placeholderTextColor="#64748b" value={mutNote} onChangeText={setMutNote} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsMutationModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveMutation}>
                <Text style={styles.saveModalBtnText}>Simpan Mutasi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Stock Opname */}
      <Modal visible={isStockCorrectionOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay} className={Platform.OS === 'web' ? 'app-modal-overlay' : undefined}>
          <View style={styles.modalBox} className={Platform.OS === 'web' ? 'app-modal-box' : undefined}>
            <Text style={styles.modalTitle}>Stock Opname (Koreksi)</Text>
            <TextInput style={styles.modalInput} placeholder="Stok Fisik Sebenarnya" keyboardType="numeric" placeholderTextColor="#64748b" value={corrPhysicalStock} onChangeText={setCorrPhysicalStock} />
            <TextInput style={styles.modalInput} placeholder="Alasan Koreksi Audit" placeholderTextColor="#64748b" value={corrReason} onChangeText={setCorrReason} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsStockCorrectionOpen(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveModalBtn, { backgroundColor: '#7c3aed' }]} onPress={handleSaveStockCorrection}>
                <Text style={styles.saveModalBtnText}>Simpan Opname</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={isReceiptModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay} className={Platform.OS === 'web' ? 'app-modal-overlay' : undefined}>
          <View
            style={[styles.modalBox, { alignItems: 'center', backgroundColor: '#fff', maxHeight: '92%', maxWidth: 440 }]}
            className={Platform.OS === 'web' ? 'app-modal-box' : undefined}
          >
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingHorizontal: 4 }}>
              <View ref={salesReceiptCaptureRef} collapsable={false} style={{ backgroundColor: '#fff', paddingHorizontal: 4, width: '100%' }}>
              <View style={{ alignItems: 'center', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingBottom: 14 }}>
                <View style={{ width: 62, height: 62, borderRadius: 13, backgroundColor: '#08090c', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <View style={{ position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#e84adc', borderRightColor: '#55e8ed' }} />
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', textAlign: 'center' }}>Tipsy{'\n'}Point</Text>
                </View>
                <Text style={{ color: '#27313f', fontSize: 21, fontWeight: '700' }}>Tipsy Point</Text>
                <Text style={{ color: '#758092', marginTop: 4 }}>Jl. Kepiting No.60, Tukangkayu, Kec. Banyuwangi, Kabupaten Banyuwangi, Jawa Timur 68416</Text>
                <Text style={{ color: '#758092', marginTop: 4 }}>Telp: 085196980785</Text>
              </View>

              <View style={{ borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 10 }}>
                {[
                  ['No. Struk', currentReceipt?.id],
                  ['Tanggal', new Date(currentReceipt?.date || Date.now()).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
                  ['Pelanggan', currentReceipt?.customer?.name || 'Pelanggan Umum'],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5, gap: 12 }}>
                    <Text style={{ color: '#758092' }}>{label}</Text>
                    <Text style={{ color: '#27313f', textAlign: 'right', flexShrink: 1 }}>{value}</Text>
                  </View>
                ))}
              </View>

              {(currentReceipt?.items || []).map((item, index) => (
                <View key={`${item.productId}-${index}`} style={{ paddingVertical: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Text style={{ color: '#27313f', fontWeight: '600', flexShrink: 1 }}>{item.name}</Text>
                    <Text style={{ color: '#27313f', fontWeight: '600' }}>{formatRp(item.price * item.qty)}</Text>
                  </View>
                  <Text style={{ color: '#758092', fontSize: 12, marginTop: 4 }}>{item.qty} pcs x {formatRp(item.price)}</Text>
                  {!!item.components?.length && (
                    <Text style={{ color: '#758092', fontSize: 11, marginTop: 3 }}>
                      Isi paket: {item.components.map((component) => `${component.name} x${component.qty}`).join(' + ')}
                    </Text>
                  )}
                  {item.regularPrice > item.price && (
                    <Text style={{ color: '#047857', fontSize: 11, marginTop: 3 }}>
                      Hemat promo: {formatRp((item.regularPrice - item.price) * item.qty)}
                    </Text>
                  )}
                </View>
              ))}

              <View style={{ borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 8 }}>
                {[
                  ['Subtotal normal', formatRp(currentReceipt?.subtotal)],
                  ['Hemat paket promo', `- ${formatRp(currentReceipt?.promotionDiscountAmount)}`],
                  ['Diskon tambahan', `- ${formatRp(currentReceipt?.discountAmount)}`],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 }}>
                    <Text style={{ color: label.includes('Hemat') || label.includes('Diskon') ? '#d35d64' : '#758092' }}>{label}</Text>
                    <Text style={{ color: label.includes('Hemat') || label.includes('Diskon') ? '#d35d64' : '#27313f' }}>{value}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 10, marginTop: 5 }}>
                  <Text style={{ color: '#192230', fontSize: 16, fontWeight: '700' }}>TOTAL</Text>
                  <Text style={{ color: '#192230', fontSize: 16, fontWeight: '700' }}>{formatRp(currentReceipt?.total)}</Text>
                </View>
              </View>

              <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb', marginTop: 10, paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 }}>
                  <Text style={{ color: '#27313f' }}>{currentReceipt?.method}</Text>
                  <Text style={{ color: '#27313f' }}>{formatRp(currentReceipt?.total)}</Text>
                </View>
                {currentReceipt?.method === 'Tunai' && <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 }}>
                    <Text style={{ color: '#758092' }}>Uang diterima</Text>
                    <Text style={{ color: '#27313f' }}>{formatRp(currentReceipt?.cashAmount)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 }}>
                    <Text style={{ color: '#758092' }}>Kembalian</Text>
                    <Text style={{ color: '#27313f' }}>{formatRp(currentReceipt?.changeAmount)}</Text>
                  </View>
                </>}
              </View>
              <Text style={{ color: '#758092', fontStyle: 'italic', textAlign: 'center', marginTop: 14, marginBottom: 8 }}>Terima kasih atas kunjungan Anda</Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.receiptDoneBtn, { flexDirection: 'row', gap: 8, marginTop: 10 }]} onPress={printCurrentReceipt}>
              <Feather name="printer" size={16} color="#fff" />
              <Text style={styles.receiptDoneBtnText}>Cetak Struk</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.receiptDoneBtn, { flexDirection: 'row', gap: 8, marginTop: 8, backgroundColor: '#047857', opacity: isReceiptPngSaving ? 0.7 : 1, alignItems: 'center', justifyContent: 'center' }]}
              disabled={isReceiptPngSaving}
              onPress={() => saveReceiptPng(salesReceiptCaptureRef, `struk-penjualan-${currentReceipt?.id || 'transaksi'}.png`)}
            >
              {isReceiptPngSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="image" size={16} color="#fff" />
              )}
              <Text style={styles.receiptDoneBtnText}>{isReceiptPngSaving ? 'Menyiapkan Lembar PNG...' : 'Simpan PNG'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.receiptDoneBtn, { marginTop: 8, backgroundColor: '#27313f' }]} onPress={() => setIsReceiptModalOpen(false)}>
              <Text style={styles.receiptDoneBtnText}>Selesai & Transaksi Baru</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Preview PNG Struk */}
      <Modal visible={!!receiptPngPreview} animationType="fade" transparent onRequestClose={() => setReceiptPngPreview(null)}>
        <View style={styles.modalOverlay} className={Platform.OS === 'web' ? 'app-modal-overlay' : undefined}>
          <View style={[styles.modalBox, { maxWidth: 440, maxHeight: '92%', alignItems: 'center', backgroundColor: '#fff', padding: 18 }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#192230', marginBottom: 4 }}>
              Lembar Struk PNG
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 12 }}>
              {Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent || '')
                ? 'Tekan & tahan gambar di bawah untuk "Simpan ke Foto", atau klik tombol Bagikan.'
                : 'Lembar gambar struk lengkap berhasil dibuat.'}
            </Text>
            <ScrollView style={{ width: '100%', maxHeight: 420 }} contentContainerStyle={{ alignItems: 'center', paddingVertical: 4 }}>
              {receiptPngPreview?.url && (
                <Image
                  source={{ uri: receiptPngPreview.url }}
                  style={{ width: 330, height: 490, resizeMode: 'contain', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}
                />
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, width: '100%' }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1, marginTop: 0 }]}
                onPress={() => setReceiptPngPreview(null)}
              >
                <Text style={styles.cancelBtnText}>Tutup</Text>
              </TouchableOpacity>
              {Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.share && (
                <TouchableOpacity
                  style={[styles.receiptDoneBtn, { flex: 1, marginTop: 0, backgroundColor: '#047857', flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }]}
                  onPress={async () => {
                    try {
                      const res = await fetch(receiptPngPreview.url);
                      const blob = await res.blob();
                      const file = new File([blob], receiptPngPreview.filename || 'struk.png', { type: 'image/png' });
                      if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: receiptPngPreview.filename });
                      }
                    } catch (e) {
                      if (e.name !== 'AbortError') console.warn(e);
                    }
                  }}
                >
                  <Feather name="share-2" size={16} color="#fff" />
                  <Text style={styles.receiptDoneBtnText}>Bagikan</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Mobile Tab Bar */}
      <View style={styles.bottomNav} className={Platform.OS === 'web' ? 'app-bottom-nav' : undefined}>
        {(isSuperAdmin
          ? [
              { id: 'pos', label: 'Kasir', icon: 'cart-outline' },
              { id: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline' },
              { id: 'crud', label: 'Produk', icon: 'package-variant-closed' },
              { id: 'mutation', label: 'Stok', icon: 'swap-horizontal' },
              { id: 'reports', label: 'Laporan', icon: 'file-document-outline' },
            ]
          : [
              { id: 'pos', label: 'Kasir', icon: 'cart-outline' },
              { id: 'reports', label: 'Riwayat Transaksi', icon: 'file-document-outline' },
            ]
        ).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.navItem}
            onPress={() => setActiveTab(tab.id)}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={22}
              color={activeTab === tab.id ? '#10b981' : '#64748b'}
            />
            <Text
              style={[styles.navText, activeTab === tab.id && styles.navTextActive]}
              className={Platform.OS === 'web' ? 'app-nav-item-text' : undefined}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 80,
  },
  loginCashierTabs: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    alignSelf: 'center',
    maxWidth: 720,
  },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loginLogo: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
  },
  loginSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  loginInput: {
    height: 46,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#fff',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  loginError: {
    color: '#f87171',
    fontSize: 12,
    marginBottom: 10,
  },
  loginButton: {
    height: 46,
    backgroundColor: '#10b981',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  loginHint: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
  loginAddKasirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#10b981',
  },
  loginAddKasirText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
  },
  loginModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  loginModalCard: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  loginModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  loginModalTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  loginModalLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 2,
  },
  loginModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  loginModalCancel: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginModalCancelText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 13,
  },
  loginModalSubmit: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loginModalSubmitText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    ...(Platform.OS === 'web' ? {
      height: '100%',
      maxHeight: '100dvh',
      overflow: 'hidden',
    } : {}),
  },
  header: {
    height: 56,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerTitleAccent: {
    color: '#10b981',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  userBadgeText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  cashierNewTabButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashierTabsBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  cashierTabsScroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  cashierTab: {
    maxWidth: 190,
    minWidth: 112,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#273449',
    backgroundColor: '#182335',
  },
  cashierTabActive: {
    backgroundColor: '#1e293b',
    borderColor: '#10b981',
  },
  cashierTabSelect: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 9,
  },
  cashierTabText: {
    flexShrink: 1,
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  cashierTabTextActive: {
    color: '#f8fafc',
  },
  cashierTabCount: {
    overflow: 'hidden',
    color: '#fff',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    fontSize: 9,
    fontWeight: '700',
  },
  cashierTabClose: {
    width: 28,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashierTabAdd: {
    width: 42,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#273449',
  },
  filterBar: {
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#10b981',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  workspace: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web' ? {
      paddingBottom: 68,
      overflow: 'hidden',
    } : {}),
  },
  tabContent: {
    flex: 1,
    minHeight: 0,
  },
  profitCard: {
    margin: 16,
    padding: 18,
    borderRadius: 16,
  },
  profitCardGreen: {
    backgroundColor: '#059669',
  },
  profitCardRed: {
    backgroundColor: '#dc2626',
  },
  profitCardSub: {
    color: '#ecfdf5',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  profitCardAmount: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 4,
  },
  profitCardNote: {
    color: '#ecfdf5',
    fontSize: 12,
    fontWeight: '500',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: '#1e293b',
    margin: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  kpiValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  kpiSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
  },
  catBar: {
    maxHeight: 40,
    marginBottom: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: '#0284c7',
  },
  catChipText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  catChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  productCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  productCardSingleColumn: {
    flexBasis: '100%',
  },
  productImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#334155',
  },
  productBody: {
    padding: 10,
  },
  productName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    height: 36,
  },
  productPrice: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '800',
    marginVertical: 2,
  },
  promoCardBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  promoCardBadgeText: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '800',
  },
  promoRegularPrice: {
    color: '#94a3b8',
    fontSize: 9,
    textDecorationLine: 'line-through',
  },
  promoComponents: {
    color: '#cbd5e1',
    fontSize: 9,
    minHeight: 22,
    marginTop: 3,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productStock: {
    color: '#94a3b8',
    fontSize: 10,
  },
  productCategory: {
    color: '#0284c7',
    fontSize: 10,
  },
  addBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  disabledBtn: {
    backgroundColor: '#475569',
  },
  cartFAB: {
    position: 'absolute',
    bottom: 70,
    left: 16,
    right: 16,
    backgroundColor: '#10b981',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    elevation: 6,
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  cartFABBadge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 10,
  },
  cartFABBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartFABText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  crudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  primaryAddBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#10b981',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  crudItemRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  crudThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  crudName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  crudSku: {
    color: '#94a3b8',
    fontSize: 10,
  },
  crudPrices: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
  },
  crudMargin: {
    color: '#10b981',
    fontSize: 10,
  },
  crudActions: {
    flexDirection: 'row',
  },
  iconBtn: {
    padding: 6,
  },
  mutationTopBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  stockHistoryTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stockHistorySubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  stockSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stockSummaryCard: {
    flex: 1,
    minHeight: 116,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  stockSummaryIn: {
    backgroundColor: '#102d2a',
    borderColor: '#14532d',
  },
  stockSummaryOut: {
    backgroundColor: '#321e26',
    borderColor: '#7f1d1d',
  },
  stockSummaryLabel: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
  },
  stockSummaryValue: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  stockHistoryFilters: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  stockHistoryFilter: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stockHistoryFilterActive: {
    backgroundColor: '#065f46',
    borderColor: '#10b981',
  },
  stockHistoryFilterText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  stockHistoryFilterTextActive: {
    color: '#d1fae5',
  },
  stockHistoryDate: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 3,
  },
  stockHistoryEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 8,
  },
  stockHistoryEmptyText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  mutActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mutActionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mutationCard: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mutCardId: {
    color: '#94a3b8',
    fontSize: 11,
  },
  mutBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  mutBadgeIn: {
    backgroundColor: '#065f46',
    color: '#34d399',
  },
  mutBadgeOut: {
    backgroundColor: '#991b1b',
    color: '#f87171',
  },
  mutBadgeKoreksi: {
    backgroundColor: '#581c87',
    color: '#c084fc',
  },
  mutProdName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  mutQtyText: {
    color: '#cbd5e1',
    fontSize: 11,
  },
  mutNote: {
    color: '#64748b',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  reportCard: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportTxId: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reportTotal: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: 'bold',
  },
  reportMethod: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 4,
  },
  reportItems: {
    borderTopWidth: 1,
    borderColor: '#334155',
    paddingTop: 4,
  },
  reportItemText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  reportToolbar: {
    gap: 10,
  },
  reportPeriodRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 9,
    padding: 3,
  },
  reportPeriodBtn: {
    flex: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  reportPeriodBtnActive: {
    backgroundColor: '#0284c7',
  },
  reportPeriodText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  reportPeriodTextActive: {
    color: '#fff',
  },
  reportPeriodLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  reportDownloadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportDownloadBtn: {
    flex: 1,
    minWidth: 92,
    minHeight: 40,
    backgroundColor: '#0284c7',
    borderRadius: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reportDownloadBtnFinancial: {
    backgroundColor: '#047857',
  },
  reportDownloadBtnStock: {
    backgroundColor: '#7c3aed',
  },
  reportDownloadBtnDisabled: {
    opacity: 0.55,
  },
  reportDownloadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  reportPdfStatus: {
    color: '#cbd5e1',
    fontSize: 11,
  },
  reportHint: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 16,
  },
  reportMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 14,
  },
  reportMetric: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 9,
    padding: 10,
    margin: 3,
  },
  reportMetricLabel: {
    color: '#94a3b8',
    fontSize: 10,
  },
  reportMetricValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  reportDataRow: {
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reportDataName: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 11,
  },
  reportEmpty: {
    color: '#64748b',
    fontSize: 11,
    paddingVertical: 8,
  },
  currentAccountText: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 12,
  },
  logoutBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#fff',
    fontSize: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  productFormContent: {
    paddingBottom: 8,
  },
  promotionToggleRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  promotionToggleTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  promotionToggleHint: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 3,
  },
  promotionEditor: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  promotionSectionTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  promotionProductList: {
    maxHeight: 190,
    marginBottom: 8,
  },
  promotionProductRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  promotionProductSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promotionProductName: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  promotionProductMeta: {
    color: '#64748b',
    fontSize: 9,
    paddingVertical: 5,
  },
  promotionQtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 7,
  },
  promotionQtyButton: {
    width: 28,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotionQtyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  promotionQtyValue: {
    minWidth: 20,
    color: '#fff',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  promotionPriceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  promotionPriceLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  promotionPriceValue: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
  },
  promotionSavingText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
    marginTop: -4,
    marginBottom: 8,
  },
  promotionStockNote: {
    color: '#64748b',
    fontSize: 9,
    lineHeight: 13,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  saveModalBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveModalBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  userOption: {
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    marginBottom: 6,
  },
  userOptionActive: {
    borderColor: '#10b981',
    borderWidth: 1,
  },
  userOptionName: {
    color: '#fff',
    fontWeight: 'bold',
  },
  userOptionNameActive: {
    color: '#10b981',
  },
  userOptionRole: {
    color: '#64748b',
    fontSize: 11,
  },
  addUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    gap: 6,
  },
  addUserBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  cartProdName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cartProdPrice: {
    color: '#10b981',
    fontSize: 12,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qtyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyNum: {
    color: '#fff',
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  cartSummary: {
    borderTopWidth: 1,
    borderColor: '#334155',
    paddingTop: 12,
  },
  cartCustomerDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  cartCashierField: {
    marginBottom: 10,
  },
  cartCashierValue: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 9,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
  },
  cartCustomerField: {
    flex: 1.15,
    minWidth: 0,
  },
  transactionDateField: {
    flex: 0.85,
    minWidth: 0,
  },
  cartFieldLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 5,
  },
  customerSelectRow: {
    flexDirection: 'row',
    gap: 5,
  },
  customerSelectButton: {
    flex: 1,
    minWidth: 0,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    paddingHorizontal: 9,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
  },
  customerSelectText: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 11,
  },
  customerAddButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 8,
  },
  transactionDateButton: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
  },
  transactionDateText: {
    color: '#f8fafc',
    fontSize: 11,
  },
  transactionDateInput: {
    height: 38,
    width: '100%',
    color: '#f8fafc',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 7,
    fontSize: 11,
  },
  customerOptionsPanel: {
    maxHeight: 220,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 9,
    padding: 8,
    marginBottom: 10,
  },
  customerOptionsList: {
    maxHeight: 108,
  },
  customerOption: {
    minHeight: 36,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  customerOptionName: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  customerOptionDetail: {
    color: '#64748b',
    fontSize: 10,
    paddingVertical: 5,
  },
  addCustomerForm: {
    paddingTop: 8,
  },
  customerInput: {
    height: 36,
    color: '#fff',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 7,
    paddingHorizontal: 9,
    fontSize: 11,
    marginBottom: 6,
  },
  saveCustomerButton: {
    minHeight: 36,
    backgroundColor: '#0284c7',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  saveCustomerButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  summaryVal: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  discountSection: {
    marginBottom: 8,
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 7,
  },
  discountModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 3,
  },
  discountModeBtn: {
    minHeight: 30,
    minWidth: 74,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountModeBtnActive: {
    backgroundColor: '#0284c7',
  },
  discountModeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  discountModeTextActive: {
    color: '#fff',
  },
  discountValueInput: {
    backgroundColor: '#0f172a',
    color: '#fff',
    borderRadius: 8,
    width: '100%',
    textAlign: 'left',
    height: 40,
    fontSize: 13,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  discountApplied: {
    color: '#94a3b8',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 5,
  },
  paymentLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 6,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  paymentMethodBtn: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
  },
  paymentMethodBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#10b981',
  },
  paymentMethodText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentMethodTextActive: {
    color: '#fff',
  },
  cashInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cashInput: {
    width: 120,
    height: 34,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 10,
    textAlign: 'right',
  },
  qrisPanel: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  qrisTitle: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  qrisImage: {
    width: 150,
    height: 150,
    backgroundColor: '#fff',
  },
  qrisAmount: {
    color: '#059669',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 6,
  },
  qrisHint: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  grandTotalLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  grandTotalVal: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  receiptSuccessTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  receiptSub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  receiptBox: {
    backgroundColor: '#0f172a',
    width: '100%',
    padding: 14,
    borderRadius: 12,
    marginVertical: 14,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  receiptItemName: {
    color: '#cbd5e1',
    fontSize: 11,
  },
  receiptItemPrice: {
    color: '#fff',
    fontSize: 11,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#334155',
    paddingTop: 8,
    marginTop: 8,
  },
  receiptTotalLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
  receiptTotalVal: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  receiptPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  receiptPaymentLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  receiptPaymentValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  receiptDoneBtn: {
    backgroundColor: '#10b981',
    width: '100%',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptDoneBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  bottomNav: {
    height: 64,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingBottom: Platform.OS === 'web' ? 0 : 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  navTextActive: {
    color: '#10b981',
    fontWeight: 'bold',
  },
});
