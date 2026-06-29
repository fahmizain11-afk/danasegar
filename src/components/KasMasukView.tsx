import React, { useState, useMemo } from 'react';
import { Member, Simpanan, Pinjaman, Angsuran, ManasukaBungaLog, KoperasiSetup } from '../types';
import { formatRupiah, terbilang, getTransactionTime } from '../utils/finance';
import { 
  Users, Wallet, HandCoins, Calendar, CheckCircle2, AlertCircle, Phone, ArrowUpRight, Receipt, X,
  Printer, Info, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface KasMasukProps {
  setup: KoperasiSetup;
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  onAddSimpanan: (s: Omit<Simpanan, 'id'> | Omit<Simpanan, 'id'>[]) => void;
  onPostManasukaBunga: (logs: Omit<ManasukaBungaLog, 'id'>, autoPostSukarela: boolean) => void;
  onAddAngsuran: (a: Omit<Angsuran, 'id'>, updatePinjamanStatus: boolean) => void;
}

export function KasMasukView({
  setup,
  members,
  simpanan,
  pinjaman,
  angsuran,
  onAddSimpanan,
  onPostManasukaBunga,
  onAddAngsuran
}: KasMasukProps) {
  // Form states
  const [anggotaId, setAnggotaId] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().substring(0, 10));
  
  // Savings states
  const [jumlahPokok, setJumlahPokok] = useState('50.000');
  const [jumlahWajib, setJumlahWajib] = useState('50.000');
  const [jumlahSukarela, setJumlahSukarela] = useState('');
  const [keteranganSimpanan, setKeteranganSimpanan] = useState('');
  
  // Installment states
  const [customAmount, setCustomAmount] = useState('');
  const [bulanKe, setBulanKe] = useState(1);
  const [notes, setNotes] = useState('');

  // Dividen Jasa Manasuka states
  const [isManasukaModalOpen, setIsManasukaModalOpen] = useState(false);
  const [targetBulan, setTargetBulan] = useState('06');
  const [targetTahun, setTargetTahun] = useState('2026');
  const [calculatedLogs, setCalculatedLogs] = useState<Omit<ManasukaBungaLog, 'id'>[]>([]);
  const [logsPosted, setLogsPosted] = useState(false);

  // Receipts / modals
  const [receiptData, setReceiptData] = useState<{
    member: Member;
    items: { jenis: 'Pokok' | 'Wajib' | 'Sukarela'; jumlah: number; keterangan: string }[];
    angsuran?: {
      pinjamanId: string;
      bulanKe: number;
      jumlahBayar: number;
      remaining: number;
      keterangan: string;
    };
    txId: string;
    tanggal: string;
  } | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<Angsuran | null>(null);

  // Filters and table switches
  const [activeTab, setActiveTab] = useState<'simpanan' | 'angsuran'>('simpanan');
  const [filterAnggotaOpt, setFilterAnggotaOpt] = useState('');
  const [filterJenisOpt, setFilterJenisOpt] = useState('');

  // Rupiah format and parse helpers
  const formatInputRupiah = (valStr: string) => {
    const clean = valStr.replace(/\D/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('id-ID');
  };

  const parseInputRupiah = (valStr: string) => {
    const clean = (valStr || '').replace(/\./g, '');
    return parseFloat(clean) || 0;
  };

  // Determine if the selected member is already paid Simpanan Pokok
  const hasPokokPaid = useMemo(() => {
    if (!anggotaId) return false;
    return simpanan.some(s => s.anggotaId === anggotaId && s.jenis === 'Pokok');
  }, [anggotaId, simpanan]);

  // Track if the selected member has an active/pending loan (Belum Lunas)
  const activeLoanContract = useMemo(() => {
    if (!anggotaId) return null;
    const contract = pinjaman.find(p => p.anggotaId === anggotaId && p.status === 'Belum Lunas');
    if (!contract) return null;

    const mInfo = members.find(m => m.id === contract.anggotaId);
    const relatedPayments = angsuran.filter(a => a.pinjamanId === contract.id);
    const totalTerbayar = relatedPayments.reduce((acc, c) => acc + c.jumlahBayar, 0);
    const sisa = Math.max(0, contract.totalWajibBayar - totalTerbayar);

    return {
      contract,
      mInfo,
      totalTerbayar,
      sisa,
      relatedPayments
    };
  }, [anggotaId, pinjaman, angsuran, members]);

  // Toggle to optionally include installment when active loan exists
  const [includeInstallment, setIncludeInstallment] = useState(true);

  // Set field defaults when changing selected member
  React.useEffect(() => {
    if (!anggotaId) {
      setJumlahPokok('50.000');
      setJumlahWajib('50.000');
      setJumlahSukarela('');
      return;
    }

    if (hasPokokPaid) {
      setJumlahPokok('0');
    } else {
      setJumlahPokok('50.000');
    }
    setJumlahWajib('50.000');
    setJumlahSukarela('');
    setCustomAmount('');
    setNotes('');
    setIncludeInstallment(true);
  }, [anggotaId, hasPokokPaid]);

  // Set automatic installment bulanKe based on previous logs
  React.useEffect(() => {
    if (activeLoanContract) {
      const related = activeLoanContract.relatedPayments;
      if (related && related.length > 0) {
        const maxBulan = Math.max(...related.map(a => a.bulanKe || 0));
        setBulanKe(maxBulan + 1);
      } else {
        setBulanKe(1);
      }
    } else {
      setBulanKe(1);
    }
  }, [activeLoanContract]);

  // Calculate remaining principal dynamically for print
  const getRemainingPrincipal = (pId: string, totalContractDebt: number) => {
    const historicalPays = angsuran.filter(a => a.pinjamanId === pId);
    const sumPays = historicalPays.reduce((acc, curr) => acc + curr.jumlahBayar, 0);
    return Math.max(0, totalContractDebt - sumPays);
  };

  // Submit consolidated transactions (Simpanan and/or Angsuran)
  const handleUnifiedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anggotaId) {
      alert("Pilih anggota terlebih dahulu!");
      return;
    }

    const valPokok = parseInputRupiah(jumlahPokok);
    const valWajib = parseInputRupiah(jumlahWajib);
    const valSukarela = parseInputRupiah(jumlahSukarela);

    const hasSavingsToBook = valPokok > 0 || valWajib > 0 || valSukarela > 0;
    
    let hasInstallmentToBook = false;
    let nominalToPay = 0;
    let isLunas = false;

    if (activeLoanContract && includeInstallment) {
      nominalToPay = parseFloat(customAmount) || activeLoanContract.contract.totalAngsuranPerBulan;
      if (!isNaN(nominalToPay) && nominalToPay > 0) {
        hasInstallmentToBook = true;
        const afterPayAmount = activeLoanContract.totalTerbayar + nominalToPay;
        isLunas = afterPayAmount >= activeLoanContract.contract.totalWajibBayar;
      }
    }

    if (!hasSavingsToBook && !hasInstallmentToBook) {
      alert("Silakan isi setoran simpanan atau pembayaran angsuran untuk memulai pembukuan kas masuk!");
      return;
    }

    const tId = `TX-${Date.now().toString().substring(5)}`;

    // Process Savings Bookings
    const batchData: Omit<Simpanan, 'id'>[] = [];
    if (hasSavingsToBook) {
      if (valPokok > 0) {
        batchData.push({
          anggotaId,
          tanggal,
          jenis: 'Pokok',
          jumlah: valPokok,
          keterangan: keteranganSimpanan || 'Pembayaran Setoran Pokok',
          transaksiId: tId
        });
      }
      if (valWajib > 0) {
        batchData.push({
          anggotaId,
          tanggal,
          jenis: 'Wajib',
          jumlah: valWajib,
          keterangan: keteranganSimpanan || 'Pembayaran Setoran Wajib',
          transaksiId: tId
        });
      }
      if (valSukarela > 0) {
        batchData.push({
          anggotaId,
          tanggal,
          jenis: 'Sukarela',
          jumlah: valSukarela,
          keterangan: keteranganSimpanan || 'Pembayaran Setoran Sukarela',
          transaksiId: tId
        });
      }

      onAddSimpanan(batchData);
    }

    // Process Installment Booking
    if (hasInstallmentToBook && activeLoanContract) {
      onAddAngsuran({
        pinjamanId: activeLoanContract.contract.id,
        anggotaId: activeLoanContract.contract.anggotaId,
        tanggal,
        jumlahBayar: nominalToPay,
        bulanKe: bulanKe,
        keterangan: notes || `Pembayaran angsuran ke-${bulanKe}`
      }, isLunas);
    }

    // Trigger Consolidated/Unified Receipt Preview Modal
    const member = members.find(m => m.id === anggotaId);
    if (member) {
      setReceiptData({
        member,
        items: batchData.map(b => ({
          jenis: b.jenis as any,
          jumlah: b.jumlah,
          keterangan: b.keterangan
        })),
        angsuran: (hasInstallmentToBook && activeLoanContract) ? {
          pinjamanId: activeLoanContract.contract.id,
          bulanKe: bulanKe,
          jumlahBayar: nominalToPay,
          remaining: Math.max(0, activeLoanContract.sisa - nominalToPay),
          keterangan: notes || `Pembayaran angsuran ke-${bulanKe}`
        } : undefined,
        txId: tId,
        tanggal
      });
    }

    // Feedback
    let feedback = 'Kas Masuk berhasil dibukukan! ';
    if (hasSavingsToBook && hasInstallmentToBook) {
      feedback = 'Pembayaran simpanan & angsuran pinjaman berhasil diproses secara bersamaan!';
    } else if (hasSavingsToBook) {
      feedback = 'Setoran simpanan berhasil diproses!';
    } else if (hasInstallmentToBook) {
      feedback = `Setoran angsuran bulan ke-${bulanKe} sebesar ${formatRupiah(nominalToPay)} berhasil disimpan!`;
    }

    alert(feedback);

    // Reset fields
    setJumlahPokok('');
    setJumlahWajib('');
    setJumlahSukarela('');
    setKeteranganSimpanan('');
    setCustomAmount('');
    setNotes('');
  };

  // Unified Cash Receipt (Kas Masuk) Print Handler
  const handlePrintUnifiedReceipt = (data: typeof receiptData) => {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Izin jendela terblokir. Harap aktifkan jendela popup untuk koperasi ini.");
      return;
    }

    const kopName = setup?.namaKoperasi || "Koperasi Dana Segar";
    const totalSimpanan = data.items ? data.items.reduce((sum, item) => sum + item.jumlah, 0) : 0;
    const totalAngsuran = data.angsuran ? data.angsuran.jumlahBayar : 0;
    const totalAmount = totalSimpanan + totalAngsuran;
    const nominalTerbilang = terbilang(totalAmount) + " Rupiah";

    const savingsRows = data.items ? data.items.map(item => `
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 4px;">
        <span>Simpanan ${item.jenis}</span>
        <span>${formatRupiah(item.jumlah)}</span>
      </div>
      ${item.keterangan ? `<div style="font-size: 9px; font-style: italic; color: #444; margin-left: 10px; margin-bottom: 4px;">${item.keterangan}</div>` : ''}
    `).join('') : '';

    const angsuranSection = data.angsuran ? `
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 4px;">
        <span>Angsuran Bulan Ke-${data.angsuran.bulanKe}</span>
        <span>${formatRupiah(data.angsuran.jumlahBayar)}</span>
      </div>
      <div style="font-size: 8px; font-style: italic; color: #444; margin-left: 10px;">Kontrak: #${data.angsuran.pinjamanId.substring(0, 8)}</div>
      ${data.angsuran.keterangan ? `<div style="font-size: 9px; font-style: italic; color: #444; margin-left: 10px; margin-bottom: 4px;">${data.angsuran.keterangan}</div>` : ''}
      <div style="display: flex; justify-content: space-between; font-size: 10px; color: #b91c1c; margin-top: 2px;">
        <span>Sisa Piutang</span>
        <span>${formatRupiah(Math.max(0, data.angsuran.remaining))}</span>
      </div>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>STRUK_KAS_MASUK_${data.txId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
            body { font-family: 'Courier Prime', monospace; padding: 20px; max-width: 400px; margin: 0 auto; color: #000; }
            .receipt { border: 1px dashed #000; padding: 15px; border-radius: 4px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }
            .title { text-align: center; font-weight: bold; font-size: 13px; margin: 8px 0; text-transform: uppercase; }
            .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .total { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 5px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="receipt">
            <div class="header">
              ${setup?.logoUrl && setup.logoUrl.startsWith('data:image') 
                ? `<img src="${setup.logoUrl}" style="max-height: 48px; max-width: 48px; margin-bottom: 6px; border-radius: 50%; object-fit: cover; vertical-align: middle;" />` 
                : `<span style="font-size: 24px; display: block; margin-bottom: 4px;">${setup?.logoUrl || '🌱'}</span>`}
              <h3>${kopName.toUpperCase()}</h3>
              <p style="font-size: 9px; margin: 2px 0;">${setup?.slogan || 'Pusat Simpan Pinjam Sejahtera'}</p>
              <p style="font-size: 8px; margin: 2px 0;">${setup?.alamatKantor || ''}</p>
            </div>
            <div class="title">Struk Bukti Kas Masuk</div>
            <div class="row"><span>Resi No:</span> <b>${data.txId}</b></div>
            <div class="row"><span>Waktu Transaksi:</span> <b>${data.tanggal} ${getTransactionTime(data.txId)}</b></div>
            <div class="row"><span>Anggota:</span> <b>${data.member.nama}</b></div>
            <div class="row"><span>No. Anggota:</span> <b>${data.member.noAnggota}</b></div>
            <div class="divider"></div>
            
            ${savingsRows}
            ${totalSimpanan > 0 && data.angsuran ? '<div class="divider"></div>' : ''}
            ${angsuranSection}
            
            <div class="divider"></div>
            <div class="total"><span>TOTAL TERIMA:</span> <span>${formatRupiah(totalAmount)}</span></div>
            <div style="font-size: 9px; margin-top: 8px; text-align: center; font-style: italic;">Terbilang: "${nominalTerbilang}"</div>
            <div style="display: flex; justify-content: space-between; margin-top: 25px; font-size: 10px; text-align: center;">
              <div>
                <p>Penyetor</p>
                <div style="height: 35px;"></div>
                <p><b>(${data.member.nama})</b></p>
              </div>
              <div>
                <p>Penerima / Kasir</p>
                <div style="height: 35px;"></div>
                <p><b>(Administrasi)</b></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Installment Thermal Printer
  const handlePrintSingle = (a: Angsuran) => {
    const member = members.find(m => m.id === a.anggotaId);
    const pContract = pinjaman.find(p => p.id === a.pinjamanId);
    const remaining = pContract ? getRemainingPrincipal(a.pinjamanId, pContract.totalWajibBayar) : 0;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Izin jendela terblokir. Harap aktifkan jendela popup untuk koperasi ini.");
      return;
    }

    const kopName = setup?.namaKoperasi || "Koperasi Dana Segar";
    const nominalTerbilang = terbilang(a.jumlahBayar) + " Rupiah";

    printWindow.document.write(`
      <html>
        <head>
          <title>STRUK_ANGSURAN_${a.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
            body { font-family: 'Courier Prime', monospace; padding: 20px; max-width: 400px; margin: 0 auto; color: #000; }
            .receipt { border: 1px dashed #000; padding: 15px; border-radius: 4px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }
            .title { text-align: center; font-weight: bold; font-size: 13px; margin: 8px 0; text-transform: uppercase; }
            .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .total { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 5px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="receipt">
            <div class="header">
              ${setup?.logoUrl && setup.logoUrl.startsWith('data:image') 
                ? `<img src="${setup.logoUrl}" style="max-height: 48px; max-width: 48px; margin-bottom: 6px; border-radius: 50%; object-fit: cover; vertical-align: middle;" />` 
                : `<span style="font-size: 24px; display: block; margin-bottom: 4px;">${setup?.logoUrl || '🌱'}</span>`}
              <h3>${kopName.toUpperCase()}</h3>
              <p style="font-size: 9px; margin: 2px 0;">${setup?.slogan || 'Pusat Simpan Pinjam Sejahtera'}</p>
              <p style="font-size: 8px; margin: 2px 0;">${setup?.alamatKantor || ''}</p>
            </div>
            <div class="title">Bukti Angsuran Pinjaman</div>
            <div class="row"><span>Resi No:</span> <b>TX-${a.id.toUpperCase()}</b></div>
            <div class="row"><span>Waktu Transaksi:</span> <b>${a.tanggal} ${getTransactionTime(a.id)}</b></div>
            <div class="row"><span>Anggota:</span> <b>${member?.nama || 'N/A'}</b></div>
            <div class="row"><span>Angsuran Ke:</span> <b>Bulan Ke-${a.bulanKe}</b></div>
            <div class="divider"></div>
            <div class="row"><span>Jumlah Bayar:</span> <b>${formatRupiah(a.jumlahBayar)}</b></div>
            <div class="row"><span>Sisa Piutang:</span> <b>${formatRupiah(remaining)}</b></div>
            <div class="divider"></div>
            <div class="total"><span>TOTAL BAYAR:</span> <span>${formatRupiah(a.jumlahBayar)}</span></div>
            <div style="font-size: 9px; margin-top: 8px; text-align: center; font-style: italic;">Terbilang: "${nominalTerbilang}"</div>
            <div style="display: flex; justify-content: space-between; margin-top: 25px; font-size: 10px; text-align: center;">
              <div>
                <p>Penyetor</p>
                <div style="height: 35px;"></div>
                <p><b>(${member?.nama || 'N/A'})</b></p>
              </div>
              <div>
                <p>Kasir</p>
                <div style="height: 35px;"></div>
                <p><b>(Administrasi)</b></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print all installment history
  const handlePrintAllHistory = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocker menghalangi pencetakan.");
      return;
    }

    const tableRows = angsuran
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
      .map(a => {
        const m = members.find(mem => mem.id === a.anggotaId);
        const pContract = pinjaman.find(p => p.id === a.pinjamanId);
        const remaining = pContract ? getRemainingPrincipal(a.pinjamanId, pContract.totalWajibBayar) : 0;
        return `
          <tr>
            <td><b>${m?.nama || 'N/A'}</b></td>
            <td>Bulan Ke-${a.bulanKe}</td>
            <td>${a.tanggal}</td>
            <td style="text-align: right; font-weight: bold; color: #15803d;">${formatRupiah(a.jumlahBayar)}</td>
            <td style="text-align: right; color: #b91c1c;">${formatRupiah(remaining)}</td>
            <td>${a.keterangan || '-'}</td>
          </tr>
        `;
      }).join('');

    const kopName = setup?.namaKoperasi || "Koperasi Dana Segar";

    printWindow.document.write(`
      <html>
        <head>
          <title>DAFTAR_ANGSURAN_KOP</title>
          <style>
            body { font-family: sans-serif; padding: 25px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h2>${kopName.toUpperCase()}</h2>
          <p>Laporan Riwayat Pembayaran Angsuran Pinjaman</p>
          <hr />
          <table>
            <thead>
              <tr>
                <th>Nama Anggota</th>
                <th>Angsuran Ke-</th>
                <th>Tanggal</th>
                <th style="text-align: right;">Jumlah Nominal</th>
                <th style="text-align: right;">Sisa Piutang</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Simulated Push Notification
  const handlePushNotice = (nama: string, sisa: number, phone: string) => {
    alert(`NOTIFIKASI SIMULASI PUSH: Tagihan Pinjaman ${nama} tersisa: ${formatRupiah(sisa)}. Pengingat terkirim via WA ke ${phone}.`);
  };

  // Dividen Manasuka calculations
  const handleCalculateManasuka = () => {
    const rate = setup.jasaSimpananSukarelaPersen ?? 0.5;
    const reports: Omit<ManasukaBungaLog, 'id'>[] = members.map(m => {
      const mS = simpanan.filter(s => s.anggotaId === m.id);
      const totalS = mS.reduce((acc, curr) => acc + curr.jumlah, 0);
      const jasaReward = totalS * (rate / 100);

      return {
        anggotaId: m.id,
        bulanTahun: `${targetBulan}-${targetTahun}`,
        totalSimpanan: totalS,
        bungaPersen: rate,
        jumlahApresiasi: Math.round(jasaReward),
        statusNotifikasi: 'Belum Kirim',
        tanggalKalkulasi: new Date().toISOString().substring(0, 10)
      };
    });

    setCalculatedLogs(reports);
    setLogsPosted(false);
  };

  const handlePostAllInterest = () => {
    if (calculatedLogs.length === 0) return;
    const rate = setup.jasaSimpananSukarelaPersen ?? 0.5;
    
    calculatedLogs.forEach(log => {
      if (log.jumlahApresiasi <= 0) return;
      onAddSimpanan({
        anggotaId: log.anggotaId,
        tanggal: log.tanggalKalkulasi,
        jenis: 'Sukarela',
        jumlah: log.jumlahApresiasi,
        keterangan: `Pembagian Jasa Manasuka ${rate}% (${log.bulanTahun})`
      });
      onPostManasukaBunga(log, true);
    });

    setLogsPosted(true);
    alert(`Jasa Manasuka ${rate}% Berhasil Diposting ke Akun Tabungan masing-masing anggota!`);
  };

  const triggerWhatsAppRedirect = (member: Member, total: number, reward: number) => {
    let cleanPhone = member.noHp.trim();
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }
    const rate = setup.jasaSimpananSukarelaPersen ?? 0.5;
    const message = `Halo ${member.nama},%0A%0APerhitungan Bunga Jasa Simpanan Manasuka ${rate}% untuk periode ${targetBulan}/${targetTahun} berhasil didistribusikan ke saldo tabungan Anda.%0A- Total Simpanan: Rp ${total.toLocaleString('id-ID')}%0A- Jasa Manasuka: *Rp ${reward.toLocaleString('id-ID')}*%0A%0ATerima kasih dari ${setup.namaKoperasi}.`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const filteredHistory = useMemo(() => {
    if (activeTab === 'simpanan') {
      return simpanan.filter(s => {
        const matchAnggota = filterAnggotaOpt === '' || s.anggotaId === filterAnggotaOpt;
        const matchJenis = filterJenisOpt === '' || s.jenis === filterJenisOpt;
        return matchAnggota && matchJenis;
      }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    } else {
      return angsuran.filter(a => {
        const matchAnggota = filterAnggotaOpt === '' || a.anggotaId === filterAnggotaOpt;
        return matchAnggota;
      }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    }
  }, [simpanan, angsuran, activeTab, filterAnggotaOpt, filterJenisOpt]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Combined Form */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm self-start">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 rounded-lg"><HandCoins className="w-5 h-5"/></span>
              Penerimaan Kas Masuk
            </h3>
            <button 
              onClick={() => { setIsManasukaModalOpen(true); handleCalculateManasuka(); }}
              className="text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-700 font-bold text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0"/> Dividen Manasuka {setup.jasaSimpananSukarelaPersen}%
            </button>
          </div>

          <form onSubmit={handleUnifiedSubmit} className="space-y-4 text-sm">
            {/* 1. Member Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">PILIH ANGGOTA KOPERASI</label>
              <select 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600 font-semibold"
                value={anggotaId}
                onChange={(e) => setAnggotaId(e.target.value)}
                required
              >
                <option value="">-- Cari Nama / ID Anggota --</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.noAnggota} - {m.nama}</option>
                ))}
              </select>
            </div>

            {/* 2. Transaction Date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">TANGGAL TRANSAKSI</label>
              <input 
                type="date"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-semibold"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
              />
            </div>

            {/* 3. SIMPANAN (Savings Block) */}
            <div className="space-y-3 p-4 bg-emerald-50/25 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center gap-2 border-b border-emerald-100/50 dark:border-emerald-900/50 pb-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 tracking-wider block uppercase">Setoran Simpanan Anggota</span>
              </div>
              
              <div className="space-y-2">
                {/* Pokok */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex justify-between">
                    <span>Simpanan Pokok</span>
                    {hasPokokPaid ? (
                      <span className="text-[9px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 rounded">Sudah Pernah Bayar (0)</span>
                    ) : (
                      <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 rounded">Sekali Saja (50.000)</span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      className={`w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono ${
                        hasPokokPaid ? 'opacity-55 bg-slate-100 dark:bg-slate-800 cursor-not-allowed text-slate-400' : ''
                      }`}
                      value={jumlahPokok}
                      onChange={(e) => setJumlahPokok(formatInputRupiah(e.target.value))}
                      disabled={hasPokokPaid}
                    />
                  </div>
                </div>

                {/* Wajib */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex justify-between">
                    <span>Simpanan Wajib</span>
                    <span className="text-[9px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 rounded">Rutin Bulanan (50.000)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono"
                      value={jumlahWajib}
                      onChange={(e) => setJumlahWajib(formatInputRupiah(e.target.value))}
                    />
                  </div>
                </div>

                {/* Sukarela */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex justify-between">
                    <span>Simpanan Sukarela</span>
                    <span className="text-[9px] text-teal-600 font-bold bg-teal-50 dark:bg-teal-950/40 px-1.5 rounded">Bebas / Fleksibel</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      placeholder="Masukkan Simpanan Sukarela..."
                      className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono"
                      value={jumlahSukarela}
                      onChange={(e) => setJumlahSukarela(formatInputRupiah(e.target.value))}
                    />
                  </div>
                </div>

                {/* Notes Simpanan */}
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Catatan Penerimaan Simpanan</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Titipan setoran bulan Juni"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    value={keteranganSimpanan}
                    onChange={(e) => setKeteranganSimpanan(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 4. ANGSURAN (Installment Block - Shown ONLY when the member has an active loan) */}
            {anggotaId ? (
              activeLoanContract ? (
                <div className="space-y-3 p-4 bg-indigo-50/25 dark:bg-indigo-950/10 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center justify-between border-b border-indigo-100/50 dark:border-indigo-900/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-400 tracking-wider block uppercase">Pembayaran Angsuran</span>
                    </div>
                    {/* Toggle Checkbox */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={includeInstallment}
                        onChange={(e) => setIncludeInstallment(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">Aktif</span>
                    </label>
                  </div>

                  {includeInstallment ? (
                    <div className="space-y-3">
                      {/* Active contract summary */}
                      <div className="p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-indigo-50 dark:border-indigo-905 text-[10px] font-mono space-y-1.5 text-slate-700 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span>Sisa Piutang:</span>
                          <span className="font-bold text-rose-600">{formatRupiah(activeLoanContract.sisa)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Angsuran Bulanan:</span>
                          <span className="font-bold text-indigo-600">{formatRupiah(activeLoanContract.contract.totalAngsuranPerBulan)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1">
                          <span>Total Terbayar:</span>
                          <span className="font-bold text-emerald-600">{formatRupiah(activeLoanContract.totalTerbayar)}</span>
                        </div>
                      </div>

                      {/* Custom Amount */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex justify-between">
                          <span>Jumlah Angsuran (Rp)</span>
                          <span className="text-[9px] text-slate-400">(Kosongkan untuk bayar penuh bulanan)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                          <input 
                            type="text"
                            inputMode="numeric"
                            placeholder={String(activeLoanContract.contract.totalAngsuranPerBulan.toLocaleString('id-ID'))}
                            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(formatInputRupiah(e.target.value))}
                          />
                        </div>
                      </div>

                      {/* Angsuran Ke & Notes */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Angsuran Ke-</label>
                          <input 
                            type="number"
                            min={1}
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                            value={bulanKe}
                            onChange={(e) => setBulanKe(parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Catatan Pembayaran</label>
                          <input 
                            type="text"
                            placeholder="Misal: Lunas bulan Juni"
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-1 text-center font-medium">Pembayaran angsuran diabaikan untuk transaksi ini</p>
                  )}
                </div>
              ) : (
                /* Dynamic Banner: Jika anggota tidak memiliki pinjaman, tidak ada form angsuran */
                <div className="p-3 bg-amber-50/40 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-2 text-xs font-medium">
                  <Info className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Anggota tidak memiliki kontrak pinjaman aktif (Form angsuran disembunyikan).</span>
                </div>
              )
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 italic">
                Pilih anggota untuk memuat rincian transaksi & pinjaman aktif.
              </div>
            )}

            {/* Submit */}
            <button 
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer shadow-sm active:scale-95 duration-100"
            >
              Bukukan Transaksi Kas Masuk
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Audit Trails & History */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col min-h-[450px]">
          {/* Header tabs toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              <button 
                onClick={() => { setActiveTab('simpanan'); setFilterJenisOpt(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'simpanan' 
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Data Mutasi Simpanan
              </button>
              <button 
                onClick={() => { setActiveTab('angsuran'); setFilterJenisOpt(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'angsuran' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Data Mutasi Angsuran
              </button>
            </div>

            {activeTab === 'angsuran' && angsuran.length > 0 && (
              <button
                onClick={handlePrintAllHistory}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 border border-slate-250 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Semua Angsuran
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Filter Anggota</span>
              <select 
                value={filterAnggotaOpt} 
                onChange={(e) => setFilterAnggotaOpt(e.target.value)}
                className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <option value="">-- Semua Anggota --</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>

            {activeTab === 'simpanan' ? (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Filter Jenis Simpanan</span>
                <select 
                  value={filterJenisOpt} 
                  onChange={(e) => setFilterJenisOpt(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <option value="">-- Semua Jenis --</option>
                  <option value="Pokok">Pokok</option>
                  <option value="Wajib">Wajib</option>
                  <option value="Sukarela">Sukarela</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Panduan Angsuran</span>
                <div className="px-3 py-1.5 border bg-slate-50 dark:bg-slate-900/50 rounded-lg text-[10.5px] text-slate-500 font-medium truncate">
                  Riwayat pembayaran tercatat sah
                </div>
              </div>
            )}
          </div>

          {/* Data List Table container */}
          <div className="overflow-x-auto flex-1 max-h-[420px]">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-350">
              <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase sticky top-0 border-b border-slate-100 dark:border-slate-700">
                {activeTab === 'simpanan' ? (
                  <tr>
                    <th className="px-4 py-2">Anggota</th>
                    <th className="px-4 py-2">Jenis Setoran</th>
                    <th className="px-4 py-2">Jumlah</th>
                    <th className="px-4 py-2 text-center">Cetak</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-2">Anggota / Kontrak</th>
                    <th className="px-4 py-2">Angsuran Ke-</th>
                    <th className="px-4 py-2">Jumlah</th>
                    <th className="px-4 py-2 text-center">Aksi</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-mono text-xs">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-450 italic">Tidak ada catatan transaksi ditemukan</td>
                  </tr>
                ) : (
                  filteredHistory.map((item: any) => {
                    const m = members.find(mem => mem.id === item.anggotaId);
                    
                    if (activeTab === 'simpanan') {
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/10">
                          <td className="px-4 py-2.5">
                            <p className="font-sans font-semibold text-slate-800 dark:text-slate-200">{m?.nama || 'N/A'}</p>
                            <span className="text-[9px] text-slate-400 font-sans">{item.tanggal}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              item.jenis === 'Pokok' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' :
                              item.jenis === 'Wajib' ? 'bg-amber-50 text-amber-700 dark:bg-amber-955/40 dark:text-amber-450' :
                              'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400'
                            }`}>
                              {item.jenis}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-850 dark:text-slate-100">{formatRupiah(item.jumlah)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <button 
                              onClick={() => {
                                const fullItems = simpanan.filter(s => s.transaksiId === item.transaksiId);
                                setReceiptData({
                                  member: m || { id: item.anggotaId, nama: 'Unknown', noAnggota: 'N/A', alamat: '', noHp: '', joinDate: '' },
                                  items: (fullItems.length > 0 ? fullItems : [item]).map(s => ({
                                    jenis: s.jenis as any,
                                    jumlah: s.jumlah,
                                    keterangan: s.keterangan || ''
                                  })),
                                  txId: item.transaksiId || `TX-${Date.now()}`,
                                  tanggal: item.tanggal
                                });
                              }}
                              className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-sans font-bold cursor-pointer transition shadow-xs flex items-center gap-1 mx-auto"
                            >
                              <Printer className="w-3 h-3" /> Struk
                            </button>
                          </td>
                        </tr>
                      );
                    } else {
                      // Angsuran display
                      const pContract = pinjaman.find(p => p.id === item.pinjamanId);
                      const remaining = pContract ? getRemainingPrincipal(item.pinjamanId, pContract.totalWajibBayar) : 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/10">
                          <td className="px-4 py-2.5">
                            <p className="font-sans font-semibold text-slate-800 dark:text-slate-200">{m?.nama || 'N/A'}</p>
                            <span className="text-[9px] text-slate-400 font-sans leading-none block">Kontrak ID: {item.pinjamanId} | {item.tanggal}</span>
                          </td>
                          <td className="px-4 py-2.5 text-indigo-600 dark:text-indigo-400 font-bold">
                            Bulan Ke-{item.bulanKe}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-bold text-slate-850 dark:text-slate-100">{formatRupiah(item.jumlahBayar)}</p>
                            <span className="text-[9px] text-rose-500 font-sans block leading-none">Sisa: {formatRupiah(remaining)}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => m && handlePushNotice(m.nama, remaining, m.noHp)}
                                className="p-1 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-350 rounded text-[9px] font-sans font-bold cursor-pointer transition flex items-center gap-0.5"
                                title="Kirim Simulated WhatsApp"
                              >
                                🔔 Push
                              </button>
                              <button 
                                onClick={() => setPreviewReceipt(item)}
                                className="p-1 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-350 rounded text-[9px] font-sans font-bold cursor-pointer transition flex items-center gap-1"
                              >
                                <Printer className="w-2.5 h-2.5" /> Cetak
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: PREVIEW KUITANSI KAS MASUK SYSTEM */}
      <AnimatePresence>
        {receiptData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[85vh] border border-slate-300 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col p-6 space-y-4"
            >
              {/* Close Button X */}
              <button 
                onClick={() => setReceiptData(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer z-50"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="border border-slate-200 dark:border-slate-850 bg-amber-50/5 dark:bg-slate-950/40 p-5 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 shadow-inner relative space-y-4 overflow-y-auto flex-1">
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  {setup.logoUrl && setup.logoUrl.startsWith('data:image') ? (
                    <img src={setup.logoUrl} alt="Logo" className="w-10 h-10 object-cover rounded-full mx-auto mb-1.5 border border-slate-200 dark:border-slate-800" />
                  ) : (
                    <span className="text-2xl block mb-1 text-center">{setup.logoUrl || '🌱'}</span>
                  )}
                  <h4 className="font-sans font-bold text-base tracking-tight">{setup.namaKoperasi}</h4>
                  <p className="text-[9px] font-sans text-slate-500 uppercase tracking-wider mt-0.5">{setup.slogan}</p>
                </div>
                <div className="space-y-1 py-1 text-[10px]">
                  <div className="flex justify-between"><span>RESI NO:</span><span className="font-bold">{receiptData.txId}</span></div>
                  <div className="flex justify-between"><span>WAKTU TRANSAKSI:</span><span>{receiptData.tanggal} {getTransactionTime(receiptData.txId)}</span></div>
                  <div className="flex justify-between"><span>ANGGOTA:</span><span className="font-semibold">{receiptData.member.nama}</span></div>
                  <div className="flex justify-between"><span>ID ANGGOTA:</span><span>{receiptData.member.noAnggota}</span></div>
                </div>
                <div className="space-y-2 py-2 border-t border-b border-dashed border-slate-300">
                  <div className="grid grid-cols-12 font-bold text-[10px] text-slate-400 pb-1">
                    <span className="col-span-7 font-semibold">Rincian Transaksi</span>
                    <span className="col-span-5 text-right font-semibold">Jumlah</span>
                  </div>
                  
                  {/* Savings Items */}
                  {receiptData.items && receiptData.items.map((item, id) => (
                    <div key={`sav-${id}`} className="grid grid-cols-12 py-1 text-[11px]">
                      <div className="col-span-7">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Simpanan {item.jenis}</span>
                        {item.keterangan && <p className="text-[9px] text-slate-400 italic font-sans leading-none">{item.keterangan}</p>}
                      </div>
                      <span className="col-span-5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatRupiah(item.jumlah)}
                      </span>
                    </div>
                  ))}

                  {/* Installment Item */}
                  {receiptData.angsuran && (
                    <div className="grid grid-cols-12 py-1 text-[11px] border-t border-dashed border-slate-100 dark:border-slate-800 pt-1.5">
                      <div className="col-span-7">
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">Angsuran Ke-{receiptData.angsuran.bulanKe}</span>
                        <p className="text-[9px] text-slate-400 italic font-sans leading-none">Kontrak: #{receiptData.angsuran.pinjamanId.substring(0, 8)}</p>
                        {receiptData.angsuran.keterangan && <p className="text-[9px] text-slate-400 italic font-sans leading-none">{receiptData.angsuran.keterangan}</p>}
                      </div>
                      <span className="col-span-5 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        {formatRupiah(receiptData.angsuran.jumlahBayar)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 py-1 text-[11.5px]">
                  {receiptData.angsuran && (
                    <div className="flex justify-between text-rose-600 font-semibold mb-1">
                      <span>SISA PIUTANG KONTRAK:</span>
                      <span className="font-bold font-mono">{formatRupiah(Math.max(0, receiptData.angsuran.remaining))}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center py-2 font-bold text-xs border-t border-dashed border-slate-300 mt-2">
                    <span className="text-slate-700 dark:text-slate-300 text-sm">TOTAL KAS MASUK:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 text-base font-mono font-extrabold">
                      {formatRupiah(
                        (receiptData.items ? receiptData.items.reduce((s, c) => s + c.jumlah, 0) : 0) +
                        (receiptData.angsuran ? receiptData.angsuran.jumlahBayar : 0)
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-[9px] text-slate-400 dark:text-slate-500 font-sans italic text-center leading-normal border-t border-dashed border-slate-200 pt-2">
                  Kuitansi transaksi kas masuk sah. Terbilang:<br />
                  <span className="font-bold text-[9.5px] not-italic text-slate-600 dark:text-slate-350 font-sans">
                    "{terbilang((receiptData.items ? receiptData.items.reduce((s, c) => s + c.jumlah, 0) : 0) + (receiptData.angsuran ? receiptData.angsuran.jumlahBayar : 0)) + " Rupiah"}"
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => handlePrintUnifiedReceipt(receiptData)}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer transition text-center flex items-center justify-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak / Simpan PDF
                </button>
                <button 
                  onClick={() => setReceiptData(null)}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer transition text-center"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: PREVIEW KUITANSI ANGSURAN */}
      <AnimatePresence>
        {previewReceipt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-150 dark:border-slate-800 p-6 flex flex-col space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-sm bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-350 px-2.5 py-1 rounded-lg">Pratinjau Kuitansi Angsuran</h3>
                <button onClick={() => setPreviewReceipt(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="border border-slate-200 bg-slate-50 dark:bg-slate-950/40 p-5 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-350 relative text-left whitespace-normal break-words shadow-inner">
                <p className="text-center font-bold text-base">{setup.namaKoperasi}</p>
                <p className="text-center text-[9px] text-slate-400 border-b border-slate-200 pb-2 mb-2">{setup.slogan}</p>
                
                <div className="space-y-1 text-[10px]">
                  <div>Tgl Bayar: <b>{previewReceipt.tanggal}</b></div>
                  <div>Kontrak Pinjaman: <b>#{previewReceipt.pinjamanId}</b></div>
                  <div>Pembayaran Angsuran: <b>Bulan Ke-{previewReceipt.bulanKe}</b></div>
                  <div className="border-t border-dashed my-2"></div>
                  <div className="flex justify-between text-slate-900 dark:text-white font-bold text-sm">
                    <span>JUMLAH:</span>
                    <span>{formatRupiah(previewReceipt.jumlahBayar)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setPreviewReceipt(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-500"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    handlePrintSingle(previewReceipt);
                    setPreviewReceipt(null);
                  }}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: DIVIDEN JASA MANASUKA POPUP */}
      <AnimatePresence>
        {isManasukaModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden border border-slate-150 dark:border-slate-800 flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  Kalkulator Jasa Dividen Simpanan Manasuka ({setup.jasaSimpananSukarelaPersen}%)
                </h3>
                <button onClick={() => setIsManasukaModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              {/* Toolbar */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b flex flex-wrap gap-4 items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <select value={targetBulan} onChange={(e) => setTargetBulan(e.target.value)} className="p-1.5 border rounded bg-white text-slate-700 font-bold">
                    <option value="01">Januari</option>
                    <option value="02">Februari</option>
                    <option value="03">Maret</option>
                    <option value="04">April</option>
                    <option value="05">Mei</option>
                    <option value="06">Juni</option>
                  </select>
                  <select value={targetTahun} onChange={(e) => setTargetTahun(e.target.value)} className="p-1.5 border rounded bg-white text-slate-700 font-bold">
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                  <button onClick={handleCalculateManasuka} className="bg-slate-800 hover:bg-slate-900 text-white font-bold p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded cursor-pointer shadow">
                    Kalkulasi Jasa
                  </button>
                </div>
                
                <button 
                  onClick={handlePostAllInterest}
                  disabled={calculatedLogs.length === 0 || logsPosted}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-lg cursor-pointer shadow flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5"/> Posting & Distribusikan Bunga
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 font-bold text-slate-400 border-b">
                    <tr>
                      <th className="px-4 py-2">ID Anggota</th>
                      <th className="px-4 py-2">Nama</th>
                      <th className="px-4 py-2">Total Tabungan</th>
                      <th className="px-4 py-2">Dividen ({setup.jasaSimpananSukarelaPersen}%)</th>
                      <th className="px-4 py-2 text-center">WA Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-mono">
                    {calculatedLogs.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Silakan klik 'Kalkulasi Jasa' di atas.</td></tr>
                    ) : (
                      calculatedLogs.map((log, id) => {
                        const m = members.find(mem => mem.id === log.anggotaId);
                        return (
                          <tr key={id} className="hover:bg-slate-50">
                            <td className="px-4 py-2">{m?.noAnggota}</td>
                            <td className="px-4 py-2 font-sans">{m?.nama}</td>
                            <td className="px-4 py-2">{formatRupiah(log.totalSimpanan)}</td>
                            <td className="px-4 py-2 font-bold text-emerald-600">{formatRupiah(log.jumlahApresiasi)}</td>
                            <td className="px-4 py-2 text-center">
                              <button 
                                onClick={() => m && triggerWhatsAppRedirect(m, log.totalSimpanan, log.jumlahApresiasi)}
                                className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white font-sans text-[10px] rounded"
                              >
                                Kirim WA
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
