// Generator Struk PNG langsung menggunakan HTML Canvas 2D
// 100% independen dari DOM, tidak mungkin putih polos / blank!

export function generateReceiptCanvas({
  brandTitle = 'Tipsy Point',
  brandSubtitle = 'Jalan Kepiting',
  brandPhone = 'Telp: 085196980785',
  receiptNumber = '-',
  date = new Date().toLocaleString('id-ID'),
  metaRows = [], // [['Kasir', 'Kasir Siti'], ['Jumlah transaksi', '10']]
  soldItems = [], // [{ name: 'Bintang 620ml', qty: 2, price: 40000, amount: 80000 }]
  emptySoldText = 'Tidak ada penjualan pada shift ini.',
  subtotal = 0,
  discount = 0,
  total = 0,
  payments = [], // [{ method: 'Tunai', amount: 50000 }]
  incomingItems = [], // [{ name: 'Item A', qty: 10, note: 'Restock' }]
  emptyIncomingText = 'Tidak ada barang masuk pada shift ini.',
  footer = 'Terima kasih atas kunjungan Anda',
}) {
  const width = 400;
  // Perkirakan tinggi kanvas secara dinamis
  let estimatedHeight = 240; // Kop, Brand, Meta
  estimatedHeight += Math.max(1, soldItems.length) * 44 + 40;
  estimatedHeight += 120; // Totals
  estimatedHeight += Math.max(1, payments.length) * 30 + 20;
  estimatedHeight += Math.max(1, incomingItems.length) * 44 + 40;
  estimatedHeight += 90; // Footer & paddings

  const scale = 2; // High-DPI Retina
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = estimatedHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background Putih Bersih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, estimatedHeight);

  let y = 28;

  // 1. Logo / Badge Tipsy Point
  const logoBoxSize = 54;
  const logoBoxX = (width - logoBoxSize) / 2;
  ctx.fillStyle = '#08090c';
  roundRect(ctx, logoBoxX, y, logoBoxSize, logoBoxSize, 12);
  ctx.fill();

  // Neon Circle Accent
  ctx.strokeStyle = '#e84adc';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(logoBoxX + logoBoxSize / 2, y + logoBoxSize / 2, 21, 0, Math.PI * 1.5);
  ctx.stroke();

  ctx.strokeStyle = '#55e8ed';
  ctx.beginPath();
  ctx.arc(logoBoxX + logoBoxSize / 2, y + logoBoxSize / 2, 21, Math.PI * 1.5, Math.PI * 2);
  ctx.stroke();

  // Logo Text inside badge
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Tipsy', logoBoxX + logoBoxSize / 2, y + logoBoxSize / 2 - 2);
  ctx.fillText('Point', logoBoxX + logoBoxSize / 2, y + logoBoxSize / 2 + 10);

  y += logoBoxSize + 14;

  // Brand Name & Contact
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(brandTitle, width / 2, y);

  y += 20;
  ctx.fillStyle = '#64748b';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText(brandSubtitle, width / 2, y);

  y += 18;
  ctx.fillText(brandPhone, width / 2, y);

  y += 18;
  // Divider 1
  drawDivider(ctx, 20, width - 20, y);
  y += 18;

  // 2. Meta Info (No. Struk, Tanggal, Kasir, dll)
  ctx.font = '13px Arial, sans-serif';
  metaRows.forEach(([label, val]) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.fillText(label, 20, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(String(val || '-'), width - 20, y);
    ctx.font = '13px Arial, sans-serif';
    y += 22;
  });

  y += 4;
  drawDivider(ctx, 20, width - 20, y);
  y += 22;

  // 3. Barang Terjual
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText('Barang Terjual', 20, y);
  y += 20;

  if (soldItems && soldItems.length > 0) {
    soldItems.forEach((item) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.fillText(item.name, 20, y);

      ctx.textAlign = 'right';
      ctx.fillText(formatRp(item.amount), width - 20, y);

      y += 17;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Arial, sans-serif';
      ctx.fillText(`${item.qty} pcs x ${formatRp(item.price)}`, 20, y);

      y += 18;
    });
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 12px Arial, sans-serif';
    ctx.fillText(emptySoldText, 20, y);
    y += 24;
  }

  y += 4;
  drawDivider(ctx, 20, width - 20, y);
  y += 20;

  // 4. Totals (Subtotal, Diskon, TOTAL)
  ctx.font = '13px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Subtotal', 20, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(formatRp(subtotal), width - 20, y);
  y += 22;

  if (discount > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e11d48';
    ctx.fillText('Diskon', 20, y);
    ctx.textAlign = 'right';
    ctx.fillText(`- ${formatRp(discount)}`, width - 20, y);
    y += 22;
  }

  // Grand Total Line
  y += 4;
  drawDashedDivider(ctx, 20, width - 20, y);
  y += 20;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText('TOTAL', 20, y);

  ctx.textAlign = 'right';
  ctx.fillText(formatRp(total), width - 20, y);
  y += 22;

  // 5. Metode Pembayaran
  if (payments && payments.length > 0) {
    drawDivider(ctx, 20, width - 20, y);
    y += 18;
    payments.forEach(({ method, amount }) => {
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#475569';
      ctx.fillText(method, 20, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(formatRp(amount), width - 20, y);
      y += 20;
    });
  }

  // 6. Barang Masuk
  y += 8;
  drawDivider(ctx, 20, width - 20, y);
  y += 20;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('Barang Masuk', 20, y);
  y += 20;

  if (incomingItems && incomingItems.length > 0) {
    incomingItems.forEach((item) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(item.name, 20, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#047857';
      ctx.fillText(`+${item.qty} pcs`, width - 20, y);

      y += 16;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Arial, sans-serif';
      ctx.fillText(item.note ? `Catatan: ${item.note}` : 'Restock', 20, y);
      y += 18;
    });
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 12px Arial, sans-serif';
    ctx.fillText(emptyIncomingText, 20, y);
    y += 22;
  }

  // 7. Footer
  y += 12;
  drawDivider(ctx, 20, width - 20, y);
  y += 26;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 12px Arial, sans-serif';
  ctx.fillText(footer, width / 2, y);

  y += 30; // Final bottom margin

  // Crop Canvas ke tinggi aktual sebenarnya
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width * scale;
  finalCanvas.height = y * scale;
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.drawImage(
    canvas,
    0, 0, width * scale, y * scale,
    0, 0, width * scale, y * scale
  );

  return finalCanvas.toDataURL('image/png');
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

function drawDivider(ctx, x1, x2, y) {
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function drawDashedDivider(ctx, x1, x2, y) {
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function formatRp(val) {
  const n = Number(val) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

