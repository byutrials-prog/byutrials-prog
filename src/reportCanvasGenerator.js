// Generator Laporan Gambar PNG Langsung (Canvas 2D Engine)
// 100% Independen dari DOM, Menjamin Resolusi Retina Tajam & Anti Blank Putih

function formatRp(val) {
  const n = Number(val) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawDivider(ctx, x1, x2, y, color = '#e2e8f0', width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function wrapText(ctx, value, maxWidth) {
  const lines = [];
  String(value ?? '').split('\n').forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      return;
    }

    let line = '';
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    lines.push(line);
  });
  return lines;
}

// ==========================================
// 1. LAPORAN PENJUALAN PNG
// Format: Produk, Qty, Harga Ambil (HPP) + Total Ambil,
//         Harga Jual + Total Jual ke bawah, Laba Bersih/Kotor
// ==========================================
export function generateSalesReportPng({
  title = 'LAPORAN PENJUALAN',
  periodLabel = '',
  printedAt = new Date().toLocaleString('id-ID'),
  items = [], // [{ date, txId, cashier, name, qty, hpp, price, totalHpp, totalRevenue, margin, method }]
  totalRevenue = 0,
  totalHpp = 0,
  grossProfit = 0,
  totalUnitsSold = 0,
}) {
  const width = 800; // Lebar standar kertas laporan
  const margin = 28;
  const contentWidth = width - margin * 2;

  // Hitung perkiraan tinggi kanvas dinamis
  let estimatedHeight = 180; // Header & Ringkasan KPI
  estimatedHeight += 44; // Table header
  estimatedHeight += Math.max(1, items.length) * 58 + 40; // Tiap baris ada 2 tingkat (harga jual ke bawah)
  estimatedHeight += 120; // Footer summary

  const scale = 2; // Retina Scale
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = estimatedHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background Putih Bersih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, estimatedHeight);

  let y = 30;

  // Kop / Brand Header
  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TIPSY POINT', margin, y);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(title, width - margin, y);

  y += 20;
  ctx.fillStyle = '#64748b';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Jalan Kepiting · Telp: 085196980785', margin, y);

  ctx.textAlign = 'right';
  ctx.fillText(`${periodLabel ? `Periode: ${periodLabel} · ` : ''}Dicetak: ${printedAt}`, width - margin, y);

  y += 16;
  drawDivider(ctx, margin, width - margin, y, '#047857', 2);
  y += 20;

  // Kartu Ringkasan KPI (Total Penjualan, Total HPP/Ambil, Laba Kotor, Total Unit)
  const kpiBoxWidth = (contentWidth - 24) / 4;
  const kpiBoxes = [
    { label: 'TOTAL PENJUALAN', val: formatRp(totalRevenue), color: '#047857', bg: '#ecfdf5' },
    { label: 'TOTAL HARGA AMBIL', val: formatRp(totalHpp), color: '#b45309', bg: '#fffbeb' },
    { label: 'LABA KOTOR', val: formatRp(grossProfit), color: '#1d4ed8', bg: '#eff6ff' },
    { label: 'UNIT TERJUAL', val: `${totalUnitsSold} unit`, color: '#475569', bg: '#f8fafc' },
  ];

  kpiBoxes.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiBoxWidth + 8);
    ctx.fillStyle = kpi.bg;
    roundRect(ctx, kpiX, y, kpiBoxWidth, 48, 8);
    ctx.fill();

    ctx.strokeStyle = kpi.color + '40';
    ctx.lineWidth = 1;
    roundRect(ctx, kpiX, y, kpiBoxWidth, 48, 8);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(kpi.label, kpiX + 10, y + 16);

    ctx.fillStyle = kpi.color;
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(kpi.val, kpiX + 10, y + 36);
  });

  y += 62;

  // Header Tabel
  const colX = {
    tanggal: margin + 8,
    produk: margin + 95,
    qty: margin + 280,
    ambil: margin + 335,
    jual: margin + 490,
    laba: width - margin - 8,
  };

  ctx.fillStyle = '#0f172a';
  roundRect(ctx, margin, y, contentWidth, 32, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Waktu / TRX', colX.tanggal, y + 20);
  ctx.fillText('Produk & Kasir', colX.produk, y + 20);
  ctx.fillText('Qty', colX.qty, y + 20);
  ctx.fillText('Harga Ambil (HPP)', colX.ambil, y + 20);
  ctx.fillText('Harga Jual (Kebawah)', colX.jual, y + 20);
  ctx.textAlign = 'right';
  ctx.fillText('Laba', colX.laba, y + 20);

  y += 36;

  // Baris-baris Data
  if (!items || items.length === 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(margin, y, contentWidth, 40);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tidak ada data penjualan pada periode ini.', width / 2, y + 25);
    y += 50;
  } else {
    items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
      ctx.fillRect(margin, y, contentWidth, 54);

      // Border bawah baris
      drawDivider(ctx, margin, width - margin, y + 54, '#f1f5f9', 1);

      // Baris 1: Informasi Pokok
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.fillText(item.date || '-', colX.tanggal, y + 18);

      ctx.fillText(item.name || '-', colX.produk, y + 18);

      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(`${item.qty} pcs`, colX.qty, y + 18);

      // Harga Ambil / HPP (Satuan & Total)
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.fillText(formatRp(item.totalHpp), colX.ambil, y + 18);

      // Harga Jual (Total)
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(formatRp(item.totalRevenue), colX.jual, y + 18);

      // Margin Laba
      const marginVal = item.margin !== undefined ? item.margin : (item.totalRevenue - item.totalHpp);
      ctx.textAlign = 'right';
      ctx.fillStyle = marginVal >= 0 ? '#10b981' : '#ef4444';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(`+${formatRp(marginVal)}`, colX.laba, y + 18);

      // Baris 2: Rincian Tambahan (Kebawah)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Arial, sans-serif';
      ctx.fillText(`ID: ${item.txId || '-'}`, colX.tanggal, y + 36);
      ctx.fillText(`Kasir: ${item.cashier || '-'} · ${item.method || 'Tunai'}`, colX.produk, y + 36);

      ctx.fillStyle = '#78350f';
      ctx.fillText(`@ ${formatRp(item.hpp)} / unit`, colX.ambil, y + 36);

      ctx.fillStyle = '#065f46';
      ctx.fillText(`@ ${formatRp(item.price)} / unit`, colX.jual, y + 36);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#64748b';
      const marginPercent = item.totalRevenue > 0 ? Math.round((marginVal / item.totalRevenue) * 100) : 0;
      ctx.fillText(`${marginPercent}% margin`, colX.laba, y + 36);

      y += 56;
    });
  }

  // Footer & Ringkasan Akhir
  y += 10;
  drawDivider(ctx, margin, width - margin, y, '#047857', 2);
  y += 24;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 11px Arial, sans-serif';
  ctx.fillText('Laporan Penjualan Tipsy Point · Data real-time sinkron database cloud', margin, y);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText(`Total Transaksi: ${items.length} transaksi · Laba Bersih: ${formatRp(grossProfit)}`, width - margin, y);

  y += 30; // Padding bawah

  // Potong canvas ke ukuran tinggi aktual
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width * scale;
  finalCanvas.height = y * scale;
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.drawImage(canvas, 0, 0, width * scale, y * scale, 0, 0, width * scale, y * scale);

  return finalCanvas.toDataURL('image/png');
}

// ==========================================
// 2. LAPORAN BARANG MASUK / RESTOCK PNG
// Format: Tanggal, ID Mutasi, Nama Produk, Qty Masuk,
//         HPP Beli, Total Nilai Masuk, Petugas, Keterangan
// ==========================================
export function generateIncomingStockReportPng({
  title = 'LAPORAN BARANG MASUK & RESTOCK',
  printedAt = new Date().toLocaleString('id-ID'),
  items = [], // [{ date, id, name, qty, hpp, totalCost, operator, note }]
  totalUnitsIn = 0,
  totalValueIn = 0,
}) {
  const width = 800;
  const margin = 28;
  const contentWidth = width - margin * 2;

  let estimatedHeight = 170;
  estimatedHeight += 44;
  estimatedHeight += Math.max(1, items.length) * 54 + 40;
  estimatedHeight += 100;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = estimatedHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, estimatedHeight);

  let y = 30;

  // Kop Brand
  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TIPSY POINT', margin, y);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(title, width - margin, y);

  y += 20;
  ctx.fillStyle = '#64748b';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Jalan Kepiting · Telp: 085196980785', margin, y);

  ctx.textAlign = 'right';
  ctx.fillText(`Dicetak: ${printedAt}`, width - margin, y);

  y += 16;
  drawDivider(ctx, margin, width - margin, y, '#0284c7', 2);
  y += 20;

  // KPI Summary Card
  const kpiBoxWidth = (contentWidth - 16) / 3;
  const kpiBoxes = [
    { label: 'TOTAL BARANG MASUK', val: `+${totalUnitsIn} unit`, color: '#0284c7', bg: '#f0f9ff' },
    { label: 'TOTAL NILAI PEMBELIAN', val: formatRp(totalValueIn), color: '#047857', bg: '#ecfdf5' },
    { label: 'JUMLAH AKTIVITAS RESTOCK', val: `${items.length} kali`, color: '#6366f1', bg: '#eef2ff' },
  ];

  kpiBoxes.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiBoxWidth + 8);
    ctx.fillStyle = kpi.bg;
    roundRect(ctx, kpiX, y, kpiBoxWidth, 48, 8);
    ctx.fill();

    ctx.strokeStyle = kpi.color + '40';
    ctx.lineWidth = 1;
    roundRect(ctx, kpiX, y, kpiBoxWidth, 48, 8);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(kpi.label, kpiX + 10, y + 16);

    ctx.fillStyle = kpi.color;
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(kpi.val, kpiX + 10, y + 36);
  });

  y += 62;

  // Header Tabel
  const colX = {
    tanggal: margin + 8,
    produk: margin + 110,
    qty: margin + 330,
    hpp: margin + 410,
    total: margin + 540,
    petugas: width - margin - 8,
  };

  ctx.fillStyle = '#0f172a';
  roundRect(ctx, margin, y, contentWidth, 32, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Tanggal & Mutasi', colX.tanggal, y + 20);
  ctx.fillText('Nama Produk & Kategori', colX.produk, y + 20);
  ctx.fillText('Qty Masuk', colX.qty, y + 20);
  ctx.fillText('Harga Beli (HPP)', colX.hpp, y + 20);
  ctx.fillText('Total Nilai Masuk', colX.total, y + 20);
  ctx.textAlign = 'right';
  ctx.fillText('Petugas & Catatan', colX.petugas, y + 20);

  y += 36;

  // Baris-baris Data
  if (!items || items.length === 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(margin, y, contentWidth, 40);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tidak ada catatan barang masuk / restock.', width / 2, y + 25);
    y += 50;
  } else {
    items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
      ctx.fillRect(margin, y, contentWidth, 50);

      drawDivider(ctx, margin, width - margin, y + 50, '#f1f5f9', 1);

      // Baris 1
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.fillText(item.date || '-', colX.tanggal, y + 18);
      ctx.fillText(item.name || '-', colX.produk, y + 18);

      ctx.fillStyle = '#047857';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(`+${item.qty} pcs`, colX.qty, y + 18);

      ctx.fillStyle = '#b45309';
      ctx.font = '11px Arial, sans-serif';
      ctx.fillText(formatRp(item.hpp), colX.hpp, y + 18);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(formatRp(item.totalCost), colX.total, y + 18);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.fillText(item.operator || '-', colX.petugas, y + 18);

      // Baris 2
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Arial, sans-serif';
      ctx.fillText(`ID: ${item.id || '-'}`, colX.tanggal, y + 34);
      ctx.fillText(item.category ? `Kategori: ${item.category}` : 'Produk Toko', colX.produk, y + 34);
      ctx.fillText('Restock Masuk', colX.qty, y + 34);
      ctx.fillText('Modal per botol/kaleng', colX.hpp, y + 34);
      ctx.fillText('Subtotal Modal Beli', colX.total, y + 34);

      ctx.textAlign = 'right';
      ctx.fillText(item.note ? `Ket: ${item.note}` : 'Restock dari distributor', colX.petugas, y + 34);

      y += 52;
    });
  }

  y += 10;
  drawDivider(ctx, margin, width - margin, y, '#0284c7', 2);
  y += 24;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 11px Arial, sans-serif';
  ctx.fillText('Laporan Barang Masuk Tipsy Point · Dicetak langsung ke format gambar PNG', margin, y);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText(`Total Masuk: +${totalUnitsIn} unit · Nilai Belanja: ${formatRp(totalValueIn)}`, width - margin, y);

  y += 30;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width * scale;
  finalCanvas.height = y * scale;
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.drawImage(canvas, 0, 0, width * scale, y * scale, 0, 0, width * scale, y * scale);

  return finalCanvas.toDataURL('image/png');
}

// ==========================================
// 3. LAPORAN KEUANGAN & LABA RUGI PNG
// ==========================================
export function generateFinancialReportPng({
  title = 'LAPORAN KEUANGAN & LABA RUGI',
  periodLabel = '',
  printedAt = new Date().toLocaleString('id-ID'),
  metrics = [], // [['Penjualan sebelum diskon', 1000000], ...]
  paymentSummary = [], // [{ method: 'Tunai', count: 5, total: 500000 }]
  soldList = [], // [{ id, name, qty, total }]
  sections = [], // [{ title, headers, rows }]
}) {
  const width = 800;
  const margin = 28;
  const contentWidth = width - margin * 2;

  let estimatedHeight = 160;
  estimatedHeight += Math.ceil(metrics.length / 2) * 36 + 60;
  estimatedHeight += paymentSummary.length * 28 + 60;
  estimatedHeight += soldList.length * 28 + 80;
  estimatedHeight += sections.reduce((total, section) => {
    const columnCount = Math.max(1, section.headers?.length || 1);
    const approximateColumnWidth = contentWidth / columnCount;
    const rowsHeight = (section.rows || []).reduce((rowTotal, row) => {
      const lineCount = Math.max(1, ...row.map((cell) => Math.ceil(String(cell ?? '').length / Math.max(8, approximateColumnWidth / 6))));
      return rowTotal + Math.max(26, lineCount * 13 + 8);
    }, 0);
    return total + 56 + rowsHeight;
  }, 0);

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = estimatedHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, estimatedHeight);

  let y = 30;

  // Header Brand
  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TIPSY POINT', margin, y);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(title, width - margin, y);

  y += 20;
  ctx.fillStyle = '#64748b';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Jalan Kepiting · Telp: 085196980785', margin, y);

  ctx.textAlign = 'right';
  ctx.fillText(`${periodLabel ? `Periode: ${periodLabel} · ` : ''}Dicetak: ${printedAt}`, width - margin, y);

  y += 16;
  drawDivider(ctx, margin, width - margin, y, '#047857', 2);
  y += 22;

  // Bagian 1: Ringkasan Metrik Finansial
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RINGKASAN ARUS KAS DAN LABA RUGI', margin, y);
  y += 14;

  const colWidth = (contentWidth - 16) / 2;
  metrics.forEach(([label, val], idx) => {
    const isCol2 = idx % 2 === 1;
    const itemX = isCol2 ? margin + colWidth + 16 : margin;
    const itemY = y + Math.floor(idx / 2) * 32;

    ctx.fillStyle = '#f8fafc';
    roundRect(ctx, itemX, itemY, colWidth, 26, 4);
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, itemX + 8, itemY + 17);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(typeof val === 'number' ? formatRp(val) : String(val), itemX + colWidth - 8, itemY + 17);
  });

  y += Math.ceil(metrics.length / 2) * 32 + 24;

  // Bagian 2: Metode Pembayaran
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RINGKASAN METODE PEMBAYARAN', margin, y);
  y += 14;

  paymentSummary.forEach((p, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
    roundRect(ctx, margin, y, contentWidth, 26, 4);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(p.method, margin + 8, y + 17);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px Arial, sans-serif';
    ctx.fillText(`(${p.count} transaksi)`, margin + 140, y + 17);

    ctx.fillStyle = '#047857';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatRp(p.total), width - margin - 8, y + 17);

    y += 28;
  });

  y += 18;

  // Bagian 3: Ringkasan Produk Terjual
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RINGKASAN PENJUALAN PRODUK', margin, y);
  y += 14;

  if (!soldList || soldList.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 11px Arial, sans-serif';
    ctx.fillText('Belum ada produk terjual pada periode ini.', margin, y + 14);
    y += 28;
  } else {
    soldList.forEach((prod, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      roundRect(ctx, margin, y, contentWidth, 26, 4);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${idx + 1}. ${prod.name}`, margin + 8, y + 17);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px Arial, sans-serif';
      ctx.fillText(`x${prod.qty} pcs`, margin + 350, y + 17);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatRp(prod.total), width - margin - 8, y + 17);

      y += 28;
    });
  }

  sections.forEach((section) => {
    y += 18;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(section.title || 'Rincian', margin, y);
    y += 10;

    const headers = section.headers || [];
    const columnCount = Math.max(1, headers.length);
    const columnWidth = contentWidth / columnCount;
    const headerHeight = 32;
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, margin, y, contentWidth, headerHeight, 5);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Arial, sans-serif';
    headers.forEach((header, index) => {
      const cellLines = wrapText(ctx, header, columnWidth - 8);
      cellLines.slice(0, 2).forEach((line, lineIndex) => {
        ctx.textAlign = 'left';
        ctx.fillText(line, margin + index * columnWidth + 4, y + 13 + lineIndex * 11);
      });
    });
    y += headerHeight;

    const rows = section.rows || [];
    if (!rows.length) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(margin, y, contentWidth, 30);
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 10px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Tidak ada data pada bagian ini.', margin + 6, y + 19);
      y += 30;
      return;
    }

    rows.forEach((row, rowIndex) => {
      ctx.font = '9px Arial, sans-serif';
      const cellLines = Array.from({ length: columnCount }, (_, columnIndex) => (
        wrapText(ctx, row[columnIndex], columnWidth - 8)
      ));
      const rowHeight = Math.max(26, Math.max(...cellLines.map((lines) => lines.length)) * 12 + 8);
      ctx.fillStyle = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(margin, y, contentWidth, rowHeight);
      drawDivider(ctx, margin, width - margin, y + rowHeight, '#e2e8f0', 1);

      ctx.fillStyle = '#334155';
      cellLines.forEach((lines, columnIndex) => {
        lines.forEach((line, lineIndex) => {
          ctx.textAlign = 'left';
          ctx.fillText(line, margin + columnIndex * columnWidth + 4, y + 14 + lineIndex * 12);
        });
      });
      y += rowHeight;
    });
  });

  y += 20;
  drawDivider(ctx, margin, width - margin, y, '#047857', 2);
  y += 24;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 11px Arial, sans-serif';
  ctx.fillText('Laporan Keuangan Tipsy Point · Diekspor langsung ke format gambar PNG', width / 2, y);

  y += 30;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width * scale;
  finalCanvas.height = y * scale;
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.drawImage(canvas, 0, 0, width * scale, y * scale, 0, 0, width * scale, y * scale);

  return finalCanvas.toDataURL('image/png');
}
