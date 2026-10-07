import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Image,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
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
  addMutation as fbAddMutation,
  addUser as fbAddUser,
  addCustomer as fbAddCustomer,
  seedInitialData,
} from './src/firebaseService';

const formatRp = (num) => {
  return 'Rp ' + (num || 0).toLocaleString('id-ID');
};

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
  { id: 'U01', name: 'Mei', username: 'mei', password: 'admin123', role: 'Kasir' },
  { id: 'U02', name: 'Renal', username: 'renal', password: 'admin123', role: 'Kasir' },
];

const escapeCsvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

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

const downloadCsv = async (filename, headers, rows) => {
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');

  if (typeof document === 'undefined') {
    try {
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, `\uFEFF${csv}`, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        Alert.alert('Laporan tersimpan', `File laporan tersedia di penyimpanan aplikasi: ${filename}`);
        return;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Bagikan ${filename}`,
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error) {
      console.error('Report export error:', error);
      Alert.alert('Gagal mengunduh laporan', 'Periksa izin penyimpanan perangkat lalu coba lagi.');
    }
    return;
  }

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const INITIAL_PRODUCTS = [
  {
    "id": "P01",
    "barcode": "89910000137",
    "name": "ANGGUR PUTIH",
    "category": "Anggur & Wine",
    "hpp": 55000,
    "price": 70000,
    "stock": 16,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P02",
    "barcode": "89910000274",
    "name": "ANGGUR MERAH BIASA",
    "category": "Anggur & Wine",
    "hpp": 55000,
    "price": 70000,
    "stock": 17,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P03",
    "barcode": "89910000411",
    "name": "ANGGUR MERAH SPESIAL",
    "category": "Anggur & Wine",
    "hpp": 59000,
    "price": 75000,
    "stock": 18,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P04",
    "barcode": "89910000548",
    "name": "ALEXIS",
    "category": "Anggur & Wine",
    "hpp": 62000,
    "price": 80000,
    "stock": 19,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P05",
    "barcode": "89910000685",
    "name": "API HIJAU",
    "category": "Anggur & Wine",
    "hpp": 66000,
    "price": 85000,
    "stock": 20,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P06",
    "barcode": "89910000822",
    "name": "API PUTIH",
    "category": "Anggur & Wine",
    "hpp": 66000,
    "price": 85000,
    "stock": 21,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P07",
    "barcode": "89910000959",
    "name": "ATLAS LYCHEE",
    "category": "Anggur & Wine",
    "hpp": 62000,
    "price": 80000,
    "stock": 22,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P08",
    "barcode": "89910001096",
    "name": "ATLAS PEACH",
    "category": "Anggur & Wine",
    "hpp": 62000,
    "price": 80000,
    "stock": 23,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P09",
    "barcode": "89910001233",
    "name": "ATLAS RAMBUTAN",
    "category": "Anggur & Wine",
    "hpp": 62000,
    "price": 80000,
    "stock": 24,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P10",
    "barcode": "89910001370",
    "name": "KAWA BC",
    "category": "Anggur & Wine",
    "hpp": 59000,
    "price": 75000,
    "stock": 25,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P11",
    "barcode": "89910001507",
    "name": "KAWA HIJAU",
    "category": "Anggur & Wine",
    "hpp": 66000,
    "price": 85000,
    "stock": 26,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P12",
    "barcode": "89910001644",
    "name": "KAWA MERAH",
    "category": "Anggur & Wine",
    "hpp": 59000,
    "price": 75000,
    "stock": 27,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P13",
    "barcode": "89910001781",
    "name": "KOLESOM",
    "category": "Anggur & Wine",
    "hpp": 62000,
    "price": 80000,
    "stock": 28,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P14",
    "barcode": "89910001918",
    "name": "BINTANG 620",
    "category": "Beer & RTD",
    "hpp": 31000,
    "price": 40000,
    "stock": 29,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P15",
    "barcode": "89910002055",
    "name": "BINTANG ARAK",
    "category": "Beer & RTD",
    "hpp": 35000,
    "price": 45000,
    "stock": 30,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P16",
    "barcode": "89910002192",
    "name": "BINTANG CAN 320",
    "category": "Beer & RTD",
    "hpp": 20000,
    "price": 26000,
    "stock": 31,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P17",
    "barcode": "89910002329",
    "name": "BINTANG REDLLER",
    "category": "Beer & RTD",
    "hpp": 23000,
    "price": 30000,
    "stock": 32,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P18",
    "barcode": "89910002466",
    "name": "DRAFT BEER",
    "category": "Beer & RTD",
    "hpp": 27000,
    "price": 35000,
    "stock": 33,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P19",
    "barcode": "89910002603",
    "name": "GUINNESS",
    "category": "Beer & RTD",
    "hpp": 39000,
    "price": 50000,
    "stock": 34,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P20",
    "barcode": "89910002740",
    "name": "MIX MAX",
    "category": "Beer & RTD",
    "hpp": 22000,
    "price": 28000,
    "stock": 35,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P21",
    "barcode": "89910002877",
    "name": "SINGARAJA",
    "category": "Beer & RTD",
    "hpp": 27000,
    "price": 35000,
    "stock": 36,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P22",
    "barcode": "89910003014",
    "name": "GILLBEYS GIN",
    "category": "Vodka & Spirits",
    "hpp": 191000,
    "price": 245000,
    "stock": 37,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P23",
    "barcode": "89910003151",
    "name": "GORDON PINK",
    "category": "Vodka & Spirits",
    "hpp": 273000,
    "price": 350000,
    "stock": 38,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P24",
    "barcode": "89910003288",
    "name": "FRIENDSHIP BLACKTEA",
    "category": "Vodka & Spirits",
    "hpp": 62000,
    "price": 80000,
    "stock": 39,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P25",
    "barcode": "89910003425",
    "name": "FRIENDSHIP COFFE",
    "category": "Vodka & Spirits",
    "hpp": 62000,
    "price": 80000,
    "stock": 15,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P26",
    "barcode": "89910003562",
    "name": "MCD VODKA MIX",
    "category": "Vodka & Spirits",
    "hpp": 90000,
    "price": 115000,
    "stock": 16,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P27",
    "barcode": "89910003699",
    "name": "NEWPORT GOLDEN",
    "category": "Vodka & Spirits",
    "hpp": 86000,
    "price": 110000,
    "stock": 17,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P28",
    "barcode": "89910003836",
    "name": "NEWPORT MIX",
    "category": "Vodka & Spirits",
    "hpp": 59000,
    "price": 75000,
    "stock": 18,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P29",
    "barcode": "89910003973",
    "name": "VIBE BLACKTEA",
    "category": "Vodka & Spirits",
    "hpp": 250000,
    "price": 320000,
    "stock": 19,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P30",
    "barcode": "89910004110",
    "name": "VIBE LYCHEE",
    "category": "Vodka & Spirits",
    "hpp": 250000,
    "price": 320000,
    "stock": 20,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P31",
    "barcode": "89910004247",
    "name": "BACARDI",
    "category": "Vodka & Spirits",
    "hpp": 234000,
    "price": 300000,
    "stock": 21,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P32",
    "barcode": "89910004384",
    "name": "CAPTAIN MORGAN",
    "category": "Vodka & Spirits",
    "hpp": 234000,
    "price": 300000,
    "stock": 22,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P33",
    "barcode": "89910004521",
    "name": "CAPTAIN MORGAN APEL",
    "category": "Vodka & Spirits",
    "hpp": 137000,
    "price": 175000,
    "stock": 23,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P34",
    "barcode": "89910004658",
    "name": "BAE SOJU LYCHEE",
    "category": "Soju",
    "hpp": 59000,
    "price": 75000,
    "stock": 24,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P35",
    "barcode": "89910004795",
    "name": "BAE SOJU ORI",
    "category": "Soju",
    "hpp": 59000,
    "price": 75000,
    "stock": 25,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P36",
    "barcode": "89910004932",
    "name": "JINRO GREENGRAPE",
    "category": "Soju",
    "hpp": 86000,
    "price": 110000,
    "stock": 26,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P37",
    "barcode": "89910005069",
    "name": "JINRO STRAWBERRY",
    "category": "Soju",
    "hpp": 86000,
    "price": 110000,
    "stock": 27,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P38",
    "barcode": "89910005206",
    "name": "23 VODKA 500",
    "category": "Vodka & Spirits",
    "hpp": 70000,
    "price": 90000,
    "stock": 28,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P39",
    "barcode": "89910005343",
    "name": "23 VODKA 700",
    "category": "Vodka & Spirits",
    "hpp": 183000,
    "price": 235000,
    "stock": 29,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P40",
    "barcode": "89910005480",
    "name": "ICELAND 500",
    "category": "Vodka & Spirits",
    "hpp": 94000,
    "price": 120000,
    "stock": 30,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P41",
    "barcode": "89910005617",
    "name": "ICELAND 700",
    "category": "Vodka & Spirits",
    "hpp": 137000,
    "price": 175000,
    "stock": 31,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P42",
    "barcode": "89910005754",
    "name": "ICELAND BLACKTEA",
    "category": "Vodka & Spirits",
    "hpp": 156000,
    "price": 200000,
    "stock": 32,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P43",
    "barcode": "89910005891",
    "name": "ICELAND CITRUS",
    "category": "Vodka & Spirits",
    "hpp": 156000,
    "price": 200000,
    "stock": 33,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P44",
    "barcode": "89910006028",
    "name": "ICELAND LYCHEE",
    "category": "Vodka & Spirits",
    "hpp": 156000,
    "price": 200000,
    "stock": 34,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P45",
    "barcode": "89910006165",
    "name": "SMIRNOFF ICE ALL VARIAN",
    "category": "Beer & RTD",
    "hpp": 20000,
    "price": 26000,
    "stock": 35,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P46",
    "barcode": "89910006302",
    "name": "SMIRNOFF GREEN APPLE",
    "category": "Vodka & Spirits",
    "hpp": 234000,
    "price": 300000,
    "stock": 36,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P47",
    "barcode": "89910006439",
    "name": "SMIRNOFF VODKA",
    "category": "Vodka & Spirits",
    "hpp": 226000,
    "price": 290000,
    "stock": 37,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P48",
    "barcode": "89910006576",
    "name": "TOPI MIRING ORI",
    "category": "Anggur & Wine",
    "hpp": 82000,
    "price": 105000,
    "stock": 38,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P49",
    "barcode": "89910006713",
    "name": "TOPI MIRING LEMON",
    "category": "Anggur & Wine",
    "hpp": 82000,
    "price": 105000,
    "stock": 39,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P50",
    "barcode": "89910006850",
    "name": "BATAVIA",
    "category": "Vodka & Spirits",
    "hpp": 250000,
    "price": 320000,
    "stock": 15,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P51",
    "barcode": "89910006987",
    "name": "DRUM WHISKY 350",
    "category": "Whisky",
    "hpp": 70000,
    "price": 90000,
    "stock": 16,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P52",
    "barcode": "89910007124",
    "name": "DRUM WHISKY 700",
    "category": "Whisky",
    "hpp": 137000,
    "price": 175000,
    "stock": 17,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P53",
    "barcode": "89910007261",
    "name": "GILLBEYS WHISKY 350",
    "category": "Whisky",
    "hpp": 101000,
    "price": 130000,
    "stock": 18,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P54",
    "barcode": "89910007398",
    "name": "GILLBEYS WHISKY 700",
    "category": "Whisky",
    "hpp": 191000,
    "price": 245000,
    "stock": 19,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P55",
    "barcode": "89910007535",
    "name": "MH WHISKY",
    "category": "Whisky",
    "hpp": 90000,
    "price": 115000,
    "stock": 20,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P56",
    "barcode": "89910007672",
    "name": "BAILEYS ORI (NC)",
    "category": "Premium Liquors",
    "hpp": 488000,
    "price": 625000,
    "stock": 21,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P57",
    "barcode": "89910007809",
    "name": "BAILEYS STRAWBERRY (NC)",
    "category": "Premium Liquors",
    "hpp": 623000,
    "price": 799000,
    "stock": 22,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P58",
    "barcode": "89910007946",
    "name": "BALVENIE 12",
    "category": "Premium Liquors",
    "hpp": 1170000,
    "price": 1500000,
    "stock": 23,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P59",
    "barcode": "89910008083",
    "name": "BALVENIE 14",
    "category": "Premium Liquors",
    "hpp": 1404000,
    "price": 1800000,
    "stock": 24,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P60",
    "barcode": "89910008220",
    "name": "BLACK LABEL",
    "category": "Whisky",
    "hpp": 624000,
    "price": 800000,
    "stock": 25,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P61",
    "barcode": "89910008357",
    "name": "BLACK LABEL (NC)",
    "category": "Whisky",
    "hpp": 671000,
    "price": 860000,
    "stock": 26,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P62",
    "barcode": "89910008494",
    "name": "CHIVAS REGAL 12 (NC)",
    "category": "Whisky",
    "hpp": 663000,
    "price": 850000,
    "stock": 27,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P63",
    "barcode": "89910008631",
    "name": "CHIVAS REGAL",
    "category": "Whisky",
    "hpp": 663000,
    "price": 850000,
    "stock": 28,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P64",
    "barcode": "89910008768",
    "name": "COINTRUE (NC)",
    "category": "Premium Liquors",
    "hpp": 456000,
    "price": 585000,
    "stock": 29,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P65",
    "barcode": "89910008905",
    "name": "GLENFIDDICH 12",
    "category": "Whisky",
    "hpp": 780000,
    "price": 1000000,
    "stock": 30,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P66",
    "barcode": "89910009042",
    "name": "GLENLIVET 12",
    "category": "Whisky",
    "hpp": 702000,
    "price": 900000,
    "stock": 31,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P67",
    "barcode": "89910009179",
    "name": "GREEYGOOSE VODKA (NC)",
    "category": "Vodka & Spirits",
    "hpp": 690000,
    "price": 885000,
    "stock": 32,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P68",
    "barcode": "89910009316",
    "name": "HENNESY VSOP",
    "category": "Premium Liquors",
    "hpp": 975000,
    "price": 1250000,
    "stock": 33,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P69",
    "barcode": "89910009453",
    "name": "HENNESY VSOP (NC)",
    "category": "Premium Liquors",
    "hpp": 975000,
    "price": 1250000,
    "stock": 34,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P70",
    "barcode": "89910009590",
    "name": "JACK DANIEL",
    "category": "Whisky",
    "hpp": 507000,
    "price": 650000,
    "stock": 35,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P71",
    "barcode": "89910009727",
    "name": "JACK DANIEL HONEY",
    "category": "Whisky",
    "hpp": 585000,
    "price": 750000,
    "stock": 36,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P72",
    "barcode": "89910009864",
    "name": "JACK DANIEL (NC)",
    "category": "Whisky",
    "hpp": 534000,
    "price": 685000,
    "stock": 37,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P73",
    "barcode": "89910010001",
    "name": "JAGERMAISTER (NC)",
    "category": "Premium Liquors",
    "hpp": 406000,
    "price": 520000,
    "stock": 38,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P74",
    "barcode": "89910010138",
    "name": "JAMESON",
    "category": "Whisky",
    "hpp": 429000,
    "price": 550000,
    "stock": 39,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P75",
    "barcode": "89910010275",
    "name": "JAMESON (NC)",
    "category": "Whisky",
    "hpp": 429000,
    "price": 550000,
    "stock": 15,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P76",
    "barcode": "89910010412",
    "name": "JIMBEAM APEL",
    "category": "Whisky",
    "hpp": 452000,
    "price": 580000,
    "stock": 16,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P77",
    "barcode": "89910010549",
    "name": "JIMBEAM APEL (NC)",
    "category": "Whisky",
    "hpp": 468000,
    "price": 600000,
    "stock": 17,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P78",
    "barcode": "89910010686",
    "name": "JOSE CUERVO",
    "category": "Vodka & Spirits",
    "hpp": 390000,
    "price": 500000,
    "stock": 18,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P79",
    "barcode": "89910010823",
    "name": "JOSE CUERVO (NC)",
    "category": "Vodka & Spirits",
    "hpp": 429000,
    "price": 550000,
    "stock": 19,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P80",
    "barcode": "89910010960",
    "name": "MACCALAN 12 DOUBLE CASK BLUE",
    "category": "Premium Liquors",
    "hpp": 1560000,
    "price": 2000000,
    "stock": 20,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P81",
    "barcode": "89910011097",
    "name": "MACCALAN 12 RED SHERRY",
    "category": "Premium Liquors",
    "hpp": 1638000,
    "price": 2100000,
    "stock": 21,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P82",
    "barcode": "89910011234",
    "name": "MARTELL VSOP",
    "category": "Premium Liquors",
    "hpp": 897000,
    "price": 1150000,
    "stock": 22,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P83",
    "barcode": "89910011371",
    "name": "RED LABEL",
    "category": "Whisky",
    "hpp": 429000,
    "price": 550000,
    "stock": 23,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P84",
    "barcode": "89910011508",
    "name": "RED LABEL (NC)",
    "category": "Whisky",
    "hpp": 452000,
    "price": 580000,
    "stock": 24,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P85",
    "barcode": "89910011645",
    "name": "SABABAY LUDISIA",
    "category": "Anggur & Wine",
    "hpp": 234000,
    "price": 300000,
    "stock": 25,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P86",
    "barcode": "89910011782",
    "name": "SABABAY MASCETTI",
    "category": "Anggur & Wine",
    "hpp": 332000,
    "price": 425000,
    "stock": 26,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P87",
    "barcode": "89910011919",
    "name": "SABABAY MOSCATO",
    "category": "Anggur & Wine",
    "hpp": 273000,
    "price": 350000,
    "stock": 27,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P88",
    "barcode": "89910012056",
    "name": "SABABAY PINK BLOSSOM",
    "category": "Anggur & Wine",
    "hpp": 234000,
    "price": 300000,
    "stock": 28,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P89",
    "barcode": "89910012193",
    "name": "SINGLETON 12 GO",
    "category": "Whisky",
    "hpp": 819000,
    "price": 1050000,
    "stock": 29,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P90",
    "barcode": "89910012330",
    "name": "SINGLETON GO (NC)",
    "category": "Whisky",
    "hpp": 897000,
    "price": 1150000,
    "stock": 30,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P91",
    "barcode": "89910012467",
    "name": "SINGLETOK GO 12 SHERRY",
    "category": "Whisky",
    "hpp": 897000,
    "price": 1150000,
    "stock": 31,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format&fit=crop&q=80"
  },
  {
    "id": "P92",
    "barcode": "89910012604",
    "name": "SINGLETON LN 12",
    "category": "Whisky",
    "hpp": 702000,
    "price": 900000,
    "stock": 32,
    "minStock": 5,
    "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop&q=80"
  }
];

const INITIAL_TRANSACTIONS = [
  {
    id: 'TRX-101',
    date: getOffsetDate(0),
    cashier: 'Kasir Siti',
    items: [
      { productId: 'P01', name: 'ANGGUR PUTIH', qty: 2, price: 70000, hpp: 55000, itemDiscount: 0 },
      { productId: 'P14', name: 'BINTANG 620', qty: 3, price: 40000, hpp: 31000, itemDiscount: 0 },
    ],
    subtotal: 260000,
    discountType: 'fixed',
    discountValue: 10000,
    discountAmount: 10000,
    taxAmount: 0,
    total: 250000,
    method: 'Tunai',
  },
  {
    id: 'TRX-102',
    date: getOffsetDate(1),
    cashier: 'Kasir Budi',
    items: [{ productId: 'P70', name: 'JACK DANIEL', qty: 1, price: 650000, hpp: 507000, itemDiscount: 0 }],
    subtotal: 650000,
    discountType: 'percent',
    discountValue: 5,
    discountAmount: 32500,
    taxAmount: 0,
    total: 617500,
    method: 'QRIS',
  },
  {
    id: 'TRX-103',
    date: getOffsetDate(2),
    cashier: 'Kasir Siti',
    items: [{ productId: 'P34', name: 'BAE SOJU LYCHEE', qty: 4, price: 75000, hpp: 59000, itemDiscount: 0 }],
    subtotal: 300000,
    discountType: 'fixed',
    discountValue: 0,
    discountAmount: 0,
    taxAmount: 0,
    total: 300000,
    method: 'Transfer',
  },
];

const INITIAL_MUTATIONS = [
  {
    id: 'M01',
    date: getOffsetDate(3),
    productId: 'P70',
    type: 'in',
    qty: 20,
    note: 'Restock dari distributor resmi',
    operator: 'Admin Doni',
  },
  {
    id: 'M02',
    date: getOffsetDate(1),
    productId: 'P14',
    type: 'out',
    qty: 1,
    note: 'Botol pecah saat bongkar muat',
    operator: 'Kasir Siti',
  },
  {
    id: 'M03',
    date: getOffsetDate(0),
    productId: 'P01',
    type: 'koreksi',
    qty: -1,
    note: 'Koreksi stok fisik opname',
    operator: 'Admin Doni',
  },
];

export default function App() {
  const { height: windowHeight } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('pos');

  // Users & Multi-user session
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isUserSwitchOpen, setIsUserSwitchOpen] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState(null);
  const [closedShiftSummary, setClosedShiftSummary] = useState(null);
  const [isShiftReceiptOpen, setIsShiftReceiptOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('Kasir');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Core Data — loaded from Firestore
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [mutations, setMutations] = useState([]);

  // Loading state for Firestore
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Menghubungkan ke database...');

  // ==========================================
  // Firebase: Seed data & Real-time subscriptions
  // ==========================================
  useEffect(() => {
    let unsubProducts, unsubTransactions, unsubMutations, unsubUsers, unsubCustomers;
    let firebaseErrorShown = false;
    let loadedFlags = { products: false, transactions: false, mutations: false, users: false, customers: false };

    const handleFirebaseError = (error) => {
      console.error('Firebase error:', error);
      if (firebaseErrorShown) return;
      firebaseErrorShown = true;

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
          : `Kode error: ${error?.code || 'tidak diketahui'}`;

      Alert.alert('Database Offline', `Gagal terhubung ke Firebase. ${detail} Data lokal sementara digunakan.`);
    };

    const checkAllLoaded = () => {
      if (loadedFlags.products && loadedFlags.transactions && loadedFlags.mutations && loadedFlags.users && loadedFlags.customers) {
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
            const defaultUser = DEFAULT_USERS.find((item) => item.id === user.id || item.name.toLowerCase() === user.name?.toLowerCase());
            return {
              ...user,
              username: user.username || defaultUser?.username,
              password: user.password || defaultUser?.password,
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

    initFirebase();

    // Cleanup subscriptions on unmount
    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubTransactions) unsubTransactions();
      if (unsubMutations) unsubMutations();
      if (unsubUsers) unsubUsers();
      if (unsubCustomers) unsubCustomers();
    };
  }, []);

  const handleLogin = () => {
    const username = loginUsername.trim().toLowerCase();
    const user = users.find((item) => item.username?.toLowerCase() === username);
    if (!user || user.password !== loginPassword) {
      setLoginError('Username atau sandi salah.');
      return;
    }

    setCurrentUser(user);
    setActiveShiftId(`SHIFT-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveShiftId(null);
    setActiveTab('pos');
    setCart([]);
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
      discount: shiftTransactions.reduce((sum, transaction) => sum + (transaction.discountAmount || 0), 0),
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

    const itemsHtml = currentReceipt.items.map((item) => `<article class="item"><div class="item-main"><span class="item-name">${escapeHtml(item.name)}</span><span class="item-amount">${formatRp(item.price * item.qty)}</span></div><div class="item-detail">${item.qty} pcs x ${formatRp(item.price)}</div></article>`).join('');
    const detailsHtml = `<div class="row"><span class="label">Pelanggan</span><span class="value">${escapeHtml(currentReceipt.customer?.name || 'Pelanggan Umum')}</span></div>`;
    const paymentsHtml = `<div class="row"><span>${escapeHtml(currentReceipt.method || 'Pembayaran')}</span><span class="value">${formatRp(currentReceipt.total)}</span></div>${currentReceipt.method === 'Tunai' ? `<div class="row"><span class="label">Uang diterima</span><span class="value">${formatRp(currentReceipt.cashAmount)}</span></div><div class="row"><span class="label">Kembalian</span><span class="value">${formatRp(currentReceipt.changeAmount)}</span></div>` : ''}`;
    const html = buildReceiptHtml({
      receiptNumber: currentReceipt.id,
      date: new Date(currentReceipt.date).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      detailsHtml,
      itemsHtml,
      subtotal: currentReceipt.subtotal,
      discount: currentReceipt.discountAmount,
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

  const downloadSalesReport = () => {
    const rows = transactions.flatMap((tx) => tx.items.map((item) => [
      formatDateInput(tx.date),
      tx.id,
      tx.cashier,
      item.name,
      item.qty,
      item.price,
      item.price * item.qty,
      tx.total,
      tx.method,
    ]));
    downloadCsv(
      `laporan-penjualan-${formatDateInput(new Date())}.csv`,
      ['Tanggal', 'ID Transaksi', 'Kasir', 'Produk', 'Qty', 'Harga Satuan', 'Total Item', 'Total Transaksi', 'Metode Pembayaran'],
      rows,
    );
  };

  const downloadStockReport = () => {
    const rows = mutations
      .filter((mutation) => mutation.type === 'in')
      .map((mutation) => {
        const product = products.find((item) => item.id === mutation.productId);
        return [
          formatDateInput(mutation.date),
          mutation.id,
          product?.name || mutation.productId,
          mutation.qty,
          mutation.operator,
          mutation.note,
        ];
      });
    downloadCsv(
      `laporan-penambahan-stok-${formatDateInput(new Date())}.csv`,
      ['Tanggal', 'ID Mutasi', 'Produk', 'Qty Ditambahkan', 'Petugas', 'Keterangan'],
      rows,
    );
  };

  // Period Filters
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [reportPeriod, setReportPeriod] = useState('day');

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

  // Mutation Modal
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [mutProdId, setMutProdId] = useState(INITIAL_PRODUCTS[0]?.id || '');
  const [mutType, setMutType] = useState('in');
  const [mutQty, setMutQty] = useState('');
  const [mutNote, setMutNote] = useState('');

  // Stock Correction Modal
  const [isStockCorrectionOpen, setIsStockCorrectionOpen] = useState(false);
  const [corrProdId, setCorrProdId] = useState(INITIAL_PRODUCTS[0]?.id || '');
  const [corrPhysicalStock, setCorrPhysicalStock] = useState('');
  const [corrReason, setCorrReason] = useState('Koreksi Stok Fisik / Opname');

  // Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  // CRUD Search
  const [crudSearch, setCrudSearch] = useState('');

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
      totalDiscountGiven += t.discountAmount || 0;
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
      discountTotal += transaction.discountAmount || 0;
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
        };
        sold.qty += item.qty || 0;
        sold.total += (item.price || 0) * (item.qty || 0);
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
    const unsoldProducts = products.filter((product) => !soldProducts.has(product.id));

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
      ? items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.qty}</td><td>${formatRp(item.hpp)}</td><td>${formatRp(item.total)}</td><td>${formatRp(item.total - item.hpp)}</td></tr>`).join('')
      : `<tr><td colspan="5">${emptyText}</td></tr>`;
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
    const transactionRows = reportData.periodTransactions.length
      ? reportData.periodTransactions.map((transaction) => {
        const items = transaction.items || [];
        const itemSubtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0);
        const subtotal = transaction.subtotal ?? itemSubtotal;
        const discount = transaction.discountAmount || 0;
        const total = transaction.total ?? Math.max(0, subtotal - discount);
        const discountLabel = transaction.discountType === 'percent'
          ? `${transaction.discountValue || 0}%`
          : formatRp(transaction.discountValue || discount);
        const itemRows = items.map((item) => {
          const qty = item.qty || 0;
          const sales = (item.price || 0) * qty;
          const itemHpp = (item.hpp || 0) * qty;
          return `<tr><td>${escapeHtml(item.name)}</td><td>${qty}</td><td>${formatRp(item.price || 0)}</td><td>${formatRp(item.hpp || 0)}</td><td>${formatRp(sales)}</td><td>${formatRp(itemHpp)}</td><td>${formatRp(sales - itemHpp)}</td></tr>`;
        }).join('');
        const customerName = transaction.customer?.name || transaction.customerName || 'Pelanggan Umum';
        const received = transaction.cashAmount ?? total;
        return `<article class="transaction"><div class="transactionTitle"><strong>Transaksi ${escapeHtml(transaction.id)}</strong><strong>${formatRp(total)}</strong></div><div class="transactionMeta"><span>Tanggal: ${escapeHtml(new Date(transaction.date).toLocaleString('id-ID'))}</span><span>Kasir: ${escapeHtml(transaction.cashier || '-')}</span><span>Pelanggan: ${escapeHtml(customerName)}${transaction.customer?.phone ? ` (${escapeHtml(transaction.customer.phone)})` : ''}</span><span>Metode: ${escapeHtml(transaction.method || '-')}</span></div><table><thead><tr><th>Barang</th><th>Qty</th><th>Harga Jual/Unit</th><th>HPP/Unit</th><th>Penjualan</th><th>HPP</th><th>Laba Kotor</th></tr></thead><tbody>${itemRows || '<tr><td colspan="7">Rincian barang tidak tersedia.</td></tr>'}</tbody></table><div class="transactionTotals"><span>Subtotal: ${formatRp(subtotal)}</span><span>Diskon (${escapeHtml(discountLabel)}): -${formatRp(discount)}</span><strong>Total Tagihan: ${formatRp(total)}</strong><span>${transaction.method === 'Tunai' ? `Uang diterima: ${formatRp(received)}` : `Dibayar: ${formatRp(received)}`}</span>${transaction.method === 'Tunai' ? `<span>Kembalian: ${formatRp(transaction.changeAmount ?? Math.max(0, received - total))}</span>` : ''}</div></article>`;
      }).join('')
      : '<p>Belum ada penjualan pada periode ini.</p>';
    const totalUnitsSold = reportData.soldList.reduce((sum, item) => sum + item.qty, 0);
    const grossSales = reportData.soldList.reduce((sum, item) => sum + item.total, 0);
    const cashTransactions = reportData.periodTransactions.filter((transaction) => transaction.method === 'Tunai');
    const cashReceipts = cashTransactions.reduce((sum, transaction) => sum + (transaction.total || 0), 0);
    const nonCashReceipts = reportData.revenue - cashReceipts;
    const cashCollected = cashTransactions.reduce((sum, transaction) => sum + (transaction.cashAmount || 0), 0);
    const cashChange = cashTransactions.reduce((sum, transaction) => sum + (transaction.changeAmount || 0), 0);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1f2937;font-size:9px;margin:0}h1{font-size:19px;margin:0 0 4px;color:#111827}h2{font-size:11px;margin:13px 0 5px;border-bottom:1px solid #9ca3af;padding-bottom:4px;color:#111827;break-after:avoid}.reportHeader{border-bottom:2px solid #047857;padding-bottom:8px;margin-bottom:8px}.subtitle{color:#4b5563;font-size:9px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.metric{padding:6px;border:1px solid #d1d5db}.metric span{display:block;color:#4b5563;font-size:8px}.metric strong{display:block;margin-top:3px;font-size:10px;color:#111827}p{line-height:1.4;margin:5px 0}table{width:100%;border-collapse:collapse;margin:4px 0 8px;table-layout:auto}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid #bfc5cc;padding:4px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eef5f1;color:#1f2937;font-size:8px}.transaction{border:1px solid #aeb6bf;padding:6px;margin:7px 0;break-inside:auto;page-break-inside:auto}.transactionTitle{display:flex;justify-content:space-between;gap:10px;font-size:10px;color:#111827}.transactionMeta{display:flex;flex-wrap:wrap;gap:4px 14px;color:#374151;font-size:8px;line-height:1.4;margin:5px 0}.transaction table{font-size:8px}.transactionTotals{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:5px;padding-top:5px;border-top:1px solid #cbd5e1;font-size:8px}.foot{margin-top:12px;padding-top:5px;border-top:1px solid #d1d5db;color:#4b5563;font-size:8px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
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
      <h2>Ringkasan Produk Terjual</h2><table><thead><tr><th>Produk</th><th>Qty</th><th>HPP</th><th>Penjualan Bruto</th><th>Laba Kotor</th></tr></thead><tbody>${productRows(reportData.soldList, 'Belum ada produk terjual.')}</tbody></table>
      <h2>Produk Tidak Terjual</h2><table><thead><tr><th>Produk</th><th>Kategori</th><th>Stok Saat Ini</th></tr></thead><tbody>${unsoldRows}</tbody></table>
      <h2>Metode Pembayaran</h2><table><thead><tr><th>Metode</th><th>Transaksi</th><th>Total</th></tr></thead><tbody>${paymentRows}</tbody></table>
      <h2>Rincian Penjualan Per Transaksi</h2>${transactionRows}
      <h2>Mutasi Stok Periode Ini</h2><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Produk</th><th>Selisih Qty</th><th>HPP/Unit</th><th>Nilai HPP</th><th>Petugas</th><th>Keterangan</th></tr></thead><tbody>${stockMutationRows}</tbody></table>
      <div class="foot">Laporan lengkap berdasarkan transaksi dan mutasi dalam periode terpilih. Laba dan nilai mutasi dihitung sebagai estimasi menggunakan HPP produk yang tersimpan. Dokumen ini tidak menggunakan logo agar ruang laporan maksimal dan kolom tetap rapi.</div></body></html>`;

    try {
      if (Platform.OS === 'web') {
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable'),
        ]);
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
          ['Produk', 'Qty terjual', 'HPP total', 'Penjualan bruto', 'Laba kotor'],
          reportData.soldList.length
            ? reportData.soldList.map((item) => [item.name, item.qty, formatRp(item.hpp), formatRp(item.total), formatRp(item.total - item.hpp)])
            : [['Tidak ada produk terjual pada periode ini.', '', '', '', '']],
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

        addSection('RINCIAN PENJUALAN PER TRANSAKSI');
        if (!reportData.periodTransactions.length) {
          addTable(['Informasi'], [['Belum ada penjualan pada periode ini.']]);
        }
        reportData.periodTransactions.forEach((transaction) => {
          if (cursorY > pageHeight - 38) {
            pdf.addPage();
            cursorY = 16;
          }
          const items = transaction.items || [];
          const itemSubtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0);
          const subtotal = transaction.subtotal ?? itemSubtotal;
          const discount = transaction.discountAmount || 0;
          const total = transaction.total ?? Math.max(0, subtotal - discount);
          const received = transaction.cashAmount ?? total;
          const customerName = transaction.customer?.name || transaction.customerName || 'Pelanggan Umum';
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(25, 55, 43);
          pdf.text(`${transaction.id} | ${new Date(transaction.date).toLocaleString('id-ID')}`, margin, cursorY);
          cursorY += 4;
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(45, 50, 48);
          const meta = `Kasir: ${transaction.cashier || '-'} | Pelanggan: ${customerName}${transaction.customer?.phone ? ` (${transaction.customer.phone})` : ''} | Pembayaran: ${transaction.method || '-'}`;
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
            ['Subtotal', formatRp(subtotal), 'Diskon', `${discountLabel} (-${formatRp(discount)})`],
            ['Total tagihan', formatRp(total), transaction.method === 'Tunai' ? 'Uang diterima' : 'Dibayar', formatRp(received)],
          ];
          if (transaction.method === 'Tunai') {
            settlementRows.push(['Kembalian', formatRp(transaction.changeAmount ?? Math.max(0, received - total)), '', '']);
          }
          addTable(['Keterangan', 'Nilai', 'Keterangan', 'Nilai'], settlementRows, {
            columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 65 }, 2: { cellWidth: 45 }, 3: { cellWidth: 65 } },
          });
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

        pdf.save(`laporan-keuangan-${reportPeriod}-${formatDateInput(new Date())}.pdf`);
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
      Alert.alert('Gagal membuat PDF', 'Coba lagi setelah memastikan perangkat dapat membuat atau membagikan file.');
    }
  };

  const cartCalculations = useMemo(() => {
    let subtotal = 0;
    cart.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        subtotal += p.price * item.qty;
      }
    });

    const discVal = parseFloat(discountValue) || 0;
    let discountAmount = 0;
    if (discountType === 'percent') {
      discountAmount = (subtotal * discVal) / 100;
    } else {
      discountAmount = discVal;
    }

    if (discountAmount > subtotal) discountAmount = subtotal;

    const grandTotal = subtotal - discountAmount;
    return { subtotal, discountAmount, grandTotal };
  }, [cart, products, discountType, discountValue]);

  const changeDiscountType = (type) => {
    if (type === discountType) return;
    setDiscountType(type);
    setDiscountValue('0');
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      Alert.alert('Stok Habis', 'Produk ini sudah tidak tersedia.');
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) {
          Alert.alert('Batas Stok', `Hanya tersedia ${product.stock} unit.`);
          return prevCart;
        }
        return prevCart.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prevCart, { productId: product.id, qty: 1 }];
    });
  };

  const updateCartQty = (productId, delta) => {
    const prod = products.find((p) => p.id === productId);
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.qty + delta;
            if (newQty > prod.stock) {
              Alert.alert('Stok Tidak Cukup', 'Melebihi sisa stok.');
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

    const txItems = cart.map((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      return {
        productId: p.id,
        name: p.name,
        qty: item.qty,
        price: p.price,
        hpp: p.hpp,
      };
    });

    // Build stock updates for Firestore batch
    const stockUpdates = cart.map((cartItem) => {
      const p = products.find((prod) => prod.id === cartItem.productId);
      return { id: p.id, newStock: p.stock - cartItem.qty };
    });

    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find((c) => c.productId === p.id);
        if (cartItem) {
          return { ...p, stock: p.stock - cartItem.qty };
        }
        return p;
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
      setProdStock(product.stock.toString());
      setProdHpp(product.hpp.toString());
      setProdPrice(product.price.toString());
    } else {
      setEditingProduct(null);
      setProdBarcode('899' + Math.floor(10000000 + Math.random() * 90000000));
      setProdName('');
      setProdCategory('Anggur & Wine');
      setProdStock('20');
      setProdHpp('50000');
      setProdPrice('70000');
    }
    setIsProductModalOpen(true);
  };

  const saveProduct = async () => {
    if (!prodName.trim()) {
      Alert.alert('Validasi Error', 'Nama produk wajib diisi.');
      return;
    }

    const stockNum = parseInt(prodStock) || 0;
    const hppNum = parseFloat(prodHpp) || 0;
    const priceNum = parseFloat(prodPrice) || 0;

    if (editingProduct) {
      const updatedData = {
        barcode: prodBarcode,
        name: prodName,
        category: prodCategory,
        stock: stockNum,
        hpp: hppNum,
        price: priceNum,
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
        barcode: prodBarcode,
        name: prodName,
        category: prodCategory,
        stock: stockNum,
        hpp: hppNum,
        price: priceNum,
        minStock: 5,
        image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80',
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
    Alert.alert('Konfirmasi Hapus', 'Yakin menghapus produk ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setProducts((prev) => prev.filter((p) => p.id !== id));
          setCart((prev) => prev.filter((c) => c.productId !== id));
          // Delete from Firestore
          try {
            await deleteProductFromDB(id);
          } catch (e) {
            console.error('Firestore delete product error:', e);
          }
        },
      },
    ]);
  };

  const handleSaveMutation = async () => {
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

  const categoriesList = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], [products]);

  const filteredPosProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchQuery =
        p.name.toLowerCase().includes(posSearch.toLowerCase()) || p.barcode.includes(posSearch);
      return matchCat && matchQuery;
    });
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
        <View style={styles.loginCard}>
          <View style={styles.loginLogo}>
            <MaterialCommunityIcons name="store" size={34} color="#fff" />
          </View>
          <Text style={styles.loginTitle}>Tipsy Point</Text>
          <Text style={styles.loginSubtitle}>Masuk sebagai kasir untuk melanjutkan</Text>
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
          <Text style={styles.loginHint}>Akun tersedia: mei dan renal</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" />
      {/* Top Mobile Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="store" size={20} color="#fff" />
          </View>
          <Text style={styles.headerTitle}><Text style={styles.headerTitleAccent}>Tipsy Point</Text></Text>
        </View>

        <TouchableOpacity
          style={styles.userBadge}
          onPress={() => setIsUserSwitchOpen(true)}
        >
          <MaterialCommunityIcons name="account-circle" size={18} color="#10b981" />
          <Text style={styles.userBadgeText}>{currentUser?.name || 'Belum login'}</Text>
          <Feather name="chevron-down" size={14} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {activeTab === 'dashboard' && (
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
        {activeTab === 'dashboard' && (
          <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 100 }}>
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
              data={filteredPosProducts}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
              renderItem={({ item }) => {
                const cartItem = cart.find((c) => c.productId === item.id);
                return (
                  <View style={styles.productCard}>
                    <Image source={{ uri: item.image }} style={styles.productImage} />
                    <View style={styles.productBody}>
                      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.productPrice}>{formatRp(item.price)}</Text>
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
              <TouchableOpacity style={styles.cartFAB} onPress={() => setIsCartModalOpen(true)}>
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

        {activeTab === 'crud' && (
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
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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

        {activeTab === 'mutation' && (
          <View style={styles.tabContent}>
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

            <FlatList
              data={mutations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              renderItem={({ item }) => {
                const prod = products.find((p) => p.id === item.productId);
                return (
                  <View style={styles.mutationCard}>
                    <View style={styles.mutCardHeader}>
                      <Text style={styles.mutCardId}>{item.id} • {item.operator}</Text>
                      <Text style={[
                        styles.mutBadge,
                        item.type === 'in' ? styles.mutBadgeIn : item.type === 'out' ? styles.mutBadgeOut : styles.mutBadgeKoreksi
                      ]}>
                        {item.type === 'in' ? '+ Masuk' : item.type === 'out' ? '- Keluar' : '⚙ Opname'}
                      </Text>
                    </View>
                    <Text style={styles.mutProdName}>{prod ? prod.name : item.productId}</Text>
                    <Text style={styles.mutQtyText}>
                      Jumlah: <Text style={{ fontWeight: 'bold' }}>{item.qty > 0 ? '+' : ''}{item.qty} unit</Text>
                    </Text>
                    <Text style={styles.mutNote}>{item.note}</Text>
                  </View>
                );
              }}
            />
          </View>
        )}

        {activeTab === 'reports' && (
          <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
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
                <TouchableOpacity style={[styles.reportDownloadBtn, { backgroundColor: '#047857' }]} onPress={downloadFinancialPdf}>
                  <Feather name="file-text" size={15} color="#fff" />
                  <Text style={styles.reportDownloadText}>Buat PDF Lengkap</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reportDownloadBtn} onPress={downloadSalesReport}>
                  <Feather name="download" size={15} color="#fff" />
                  <Text style={styles.reportDownloadText}>CSV Penjualan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reportDownloadBtn, { backgroundColor: '#7c3aed' }]} onPress={downloadStockReport}>
                  <Feather name="download" size={15} color="#fff" />
                  <Text style={styles.reportDownloadText}>CSV Stok</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.reportHint}>PDF mengikuti periode terpilih dan berisi ringkasan keuangan, analisis produk, pembayaran, serta rincian transaksi.</Text>

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

            <Text style={styles.sectionTitle}>Rincian Transaksi</Text>

            {reportData.periodTransactions.map((tx) => (
              <View key={tx.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportTxId}>{tx.id} • {tx.cashier}</Text>
                  <Text style={styles.reportTotal}>{formatRp(tx.total)}</Text>
                </View>
                <Text style={styles.reportMethod}>Metode: {tx.method}</Text>
                <View style={styles.reportItems}>
                  {tx.items.map((i, idx) => (
                    <Text key={idx} style={styles.reportItemText}>• {i.name} (x{i.qty}) = {formatRp(i.price * i.qty)}</Text>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Modal Shift Receipt */}
      <Modal visible={isShiftReceiptOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: '#fff', maxHeight: '94%', maxWidth: 440, alignItems: 'center' }]}>
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingHorizontal: 4 }}>
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
            </ScrollView>

            <TouchableOpacity
              style={[styles.receiptDoneBtn, { backgroundColor: '#2563eb', marginTop: 10, marginBottom: 8 }]}
              onPress={printShiftReceipt}
            >
              <Feather name="printer" size={16} color="#fff" />
              <Text style={styles.receiptDoneBtnText}>Cetak Struk Shift</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ganti Akun Kasir</Text>
              <TouchableOpacity onPress={() => setIsUserSwitchOpen(false)}>
                <Feather name="x" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.currentAccountText}>Login sebagai {currentUser?.name || 'Belum login'}</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleCloseShift}>
              <Feather name="log-out" size={16} color="#fff" />
              <Text style={styles.addUserBtnText}>Tutup Shift & Buat Struk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cart Drawer Modal */}
      <Modal visible={isCartModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { height: Math.min(windowHeight * 0.9, 760), maxHeight: '94%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Keranjang Belanja</Text>
              <TouchableOpacity onPress={() => setIsCartModalOpen(false)}>
                <Feather name="x" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {cart.map((item) => {
                const p = products.find((prod) => prod.id === item.productId);
                if (!p) return null;
                return (
                  <View key={item.productId} style={styles.cartRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartProdName}>{p.name}</Text>
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
            </ScrollView>

            <View style={styles.cartSummary}>
              <View style={styles.cartCustomerDateRow}>
                <View style={styles.cartCustomerField}>
                  <Text style={styles.cartFieldLabel}>Kasir</Text>
                  <View style={styles.customerSelectRow}>
                    <TouchableOpacity
                      style={styles.customerSelectButton}
                      onPress={() => setShowCustomerOptions((visible) => !visible)}
                    >
                      <Text style={styles.customerSelectText} numberOfLines={1}>{selectedCustomer?.name || 'Kasir'}</Text>
                      <Feather name="chevron-down" size={15} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.customerAddButton}
                      onPress={() => {
                        setShowCustomerOptions(true);
                        setIsAddingCustomer((visible) => !visible);
                      }}
                      accessibilityLabel="Tambah Kasir baru"
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
                      <Text style={styles.customerOptionName}>Kasir</Text>
                      <Text style={styles.customerOptionDetail}>Tanpa data Kasir</Text>
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
                    {!customers.length && <Text style={styles.customerOptionDetail}>Belum ada kasir tersimpan.</Text>}
                  </ScrollView>
                  {isAddingCustomer && (
                    <View style={styles.addCustomerForm}>
                      <TextInput
                        style={styles.customerInput}
                        placeholder="Nama kasir"
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
                        <Text style={styles.saveCustomerButtonText}>Simpan & Pilih Kasir</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryVal}>{formatRp(cartCalculations.subtotal)}</Text>
              </View>

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
                <Text style={styles.discountApplied}>Potongan: {formatRp(cartCalculations.discountAmount)}</Text>
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
          </View>
        </View>
      </Modal>

      {/* Modal CRUD Product */}
      <Modal visible={isProductModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingProduct ? 'Edit Master Produk' : 'Tambah Produk Baru'}</Text>

            <TextInput style={styles.modalInput} placeholder="Barcode SKU" placeholderTextColor="#64748b" value={prodBarcode} onChangeText={setProdBarcode} />
            <TextInput style={styles.modalInput} placeholder="Nama Produk" placeholderTextColor="#64748b" value={prodName} onChangeText={setProdName} />
            <TextInput style={styles.modalInput} placeholder="Kategori" placeholderTextColor="#64748b" value={prodCategory} onChangeText={setProdCategory} />
            <TextInput style={styles.modalInput} placeholder="Stok Awal" keyboardType="numeric" placeholderTextColor="#64748b" value={prodStock} onChangeText={setProdStock} />
            <TextInput style={styles.modalInput} placeholder="Modal HPP (Rp)" keyboardType="numeric" placeholderTextColor="#64748b" value={prodHpp} onChangeText={setProdHpp} />
            <TextInput style={styles.modalInput} placeholder="Harga Jual (Rp)" keyboardType="numeric" placeholderTextColor="#64748b" value={prodPrice} onChangeText={setProdPrice} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsProductModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={saveProduct}>
                <Text style={styles.saveModalBtnText}>Simpan Produk</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Mutasi */}
      <Modal visible={isMutationModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { alignItems: 'center', backgroundColor: '#fff', maxHeight: '92%', maxWidth: 440 }]}>
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingHorizontal: 4 }}>
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
                </View>
              ))}

              <View style={{ borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 8 }}>
                {[
                  ['Subtotal', formatRp(currentReceipt?.subtotal)],
                  ['Diskon', `- ${formatRp(currentReceipt?.discountAmount)}`],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 }}>
                    <Text style={{ color: label === 'Diskon' ? '#d35d64' : '#758092' }}>{label}</Text>
                    <Text style={{ color: label === 'Diskon' ? '#d35d64' : '#27313f' }}>{value}</Text>
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
            </ScrollView>

            <TouchableOpacity style={[styles.receiptDoneBtn, { flexDirection: 'row', gap: 8, marginTop: 10 }]} onPress={printCurrentReceipt}>
              <Feather name="printer" size={16} color="#fff" />
              <Text style={styles.receiptDoneBtnText}>Cetak Struk</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.receiptDoneBtn, { marginTop: 8, backgroundColor: '#27313f' }]} onPress={() => setIsReceiptModalOpen(false)}>
              <Text style={styles.receiptDoneBtnText}>Selesai & Transaksi Baru</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Mobile Tab Bar */}
      <View style={styles.bottomNav}>
        {[
          { id: 'pos', label: 'Kasir', icon: 'cart-outline' },
          { id: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline' },
          { id: 'crud', label: 'Produk', icon: 'package-variant-closed' },
          { id: 'mutation', label: 'Mutasi', icon: 'swap-horizontal' },
          { id: 'reports', label: 'Laporan', icon: 'file-document-outline' },
        ].map((tab) => (
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
            <Text style={[styles.navText, activeTab === tab.id && styles.navTextActive]}>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    marginTop: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: StatusBar.currentHeight || 0,
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
  },
  tabContent: {
    flex: 1,
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
  reportDownloadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
    height: 56,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
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
