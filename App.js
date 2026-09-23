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
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  subscribeToProducts,
  subscribeToTransactions,
  subscribeToMutations,
  subscribeToUsers,
  addProduct as fbAddProduct,
  updateProduct as fbUpdateProduct,
  deleteProductFromDB,
  updateProductStock,
  batchUpdateProductStocks,
  addTransaction as fbAddTransaction,
  addMutation as fbAddMutation,
  addUser as fbAddUser,
  seedInitialData,
} from './src/firebaseService';

const { width } = Dimensions.get('window');

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

const getOffsetDate = (daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
};

const QRIS_IMAGE_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=QRIS-DEMO-TIPSY-POINT';

const DEFAULT_USERS = [
  { id: 'U01', name: 'Windy', username: 'windy', password: 'admin123', role: 'Kasir' },
  { id: 'U02', name: 'Renal', username: 'renal', password: 'admin123', role: 'Kasir' },
];

const escapeCsvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

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
  const [activeTab, setActiveTab] = useState('pos');

  // Users & Multi-user session
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isUserSwitchOpen, setIsUserSwitchOpen] = useState(false);
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
    let unsubProducts, unsubTransactions, unsubMutations, unsubUsers;
    let firebaseErrorShown = false;
    let loadedFlags = { products: false, transactions: false, mutations: false, users: false };

    const handleFirebaseError = (error) => {
      console.error('Firebase error:', error);
      if (firebaseErrorShown) return;
      firebaseErrorShown = true;

      setProducts(INITIAL_PRODUCTS);
      setTransactions(INITIAL_TRANSACTIONS);
      setMutations(INITIAL_MUTATIONS);
      setUsers(DEFAULT_USERS);
      setIsLoading(false);

      const detail = error?.code === 'permission-denied'
        ? 'Firestore menolak akses. Periksa Firestore Rules atau aktifkan login Firebase.'
        : error?.code === 'failed-precondition'
          ? 'Firestore belum dibuat atau konfigurasi database belum selesai di Firebase Console.'
          : `Kode error: ${error?.code || 'tidak diketahui'}`;

      Alert.alert('Database Offline', `Gagal terhubung ke Firebase. ${detail} Data lokal sementara digunakan.`);
    };

    const checkAllLoaded = () => {
      if (loadedFlags.products && loadedFlags.transactions && loadedFlags.mutations && loadedFlags.users) {
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
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('pos');
    setCart([]);
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

  // POS Kasir Cart & Modals
  const [cart, setCart] = useState([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Keranjang Kosong', 'Pilih produk terlebih dahulu.');
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
      date: new Date(),
      cashier: currentUser.name,
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
          <Text style={styles.loginHint}>Akun tersedia: windy dan renal</Text>
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
              <Text style={styles.sectionTitle}>Laporan Transaksi</Text>
              <View style={styles.reportDownloadRow}>
                <TouchableOpacity style={styles.reportDownloadBtn} onPress={downloadSalesReport}>
                  <Feather name="download" size={15} color="#fff" />
                  <Text style={styles.reportDownloadText}>Penjualan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reportDownloadBtn, { backgroundColor: '#7c3aed' }]} onPress={downloadStockReport}>
                  <Feather name="download" size={15} color="#fff" />
                  <Text style={styles.reportDownloadText}>Penambahan Stok</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.reportHint}>Unduh seluruh data, tidak hanya periode yang sedang dipilih.</Text>
            <Text style={styles.sectionTitle}>Riwayat Transaksi Penjualan</Text>

            {financialMetrics.filteredTx.map((tx) => (
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
            <TouchableOpacity style={styles.logoutBtn} onPress={() => { setIsUserSwitchOpen(false); handleLogout(); }}>
              <Feather name="log-out" size={16} color="#fff" />
              <Text style={styles.addUserBtnText}>Keluar dari Akun</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cart Drawer Modal */}
      <Modal visible={isCartModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { height: '85%' }]}>
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
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryVal}>{formatRp(cartCalculations.subtotal)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Diskon ({discountType === 'percent' ? '%' : 'Rp'})</Text>
                <TextInput
                  style={styles.discInput}
                  keyboardType="numeric"
                  value={discountValue}
                  onChangeText={setDiscountValue}
                />
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
          <View style={[styles.modalBox, { alignItems: 'center' }]}>
            <MaterialCommunityIcons name="check-circle" size={48} color="#10b981" />
            <Text style={styles.receiptSuccessTitle}>Transaksi Berhasil!</Text>
            <Text style={styles.receiptSub}>ID: {currentReceipt?.id} | Kasir: {currentReceipt?.cashier}</Text>

            <View style={styles.receiptBox}>
              {currentReceipt?.items.map((i, idx) => (
                <View key={idx} style={styles.receiptRow}>
                  <Text style={styles.receiptItemName}>{i.name} x{i.qty}</Text>
                  <Text style={styles.receiptItemPrice}>{formatRp(i.price * i.qty)}</Text>
                </View>
              ))}
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>TOTAL:</Text>
                <Text style={styles.receiptTotalVal}>{formatRp(currentReceipt?.total)}</Text>
              </View>
              <View style={styles.receiptPaymentRow}>
                <Text style={styles.receiptPaymentLabel}>Pembayaran:</Text>
                <Text style={styles.receiptPaymentValue}>{currentReceipt?.method}</Text>
              </View>
              {currentReceipt?.method === 'Tunai' && (
                <View style={styles.receiptPaymentRow}>
                  <Text style={styles.receiptPaymentLabel}>Kembalian:</Text>
                  <Text style={styles.receiptPaymentValue}>{formatRp(currentReceipt?.changeAmount)}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.receiptDoneBtn} onPress={() => setIsReceiptModalOpen(false)}>
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
    width: (width - 48) / 2,
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
  reportDownloadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reportDownloadBtn: {
    flex: 1,
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
  discInput: {
    backgroundColor: '#0f172a',
    color: '#fff',
    borderRadius: 6,
    width: 60,
    textAlign: 'center',
    height: 30,
    fontSize: 12,
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
