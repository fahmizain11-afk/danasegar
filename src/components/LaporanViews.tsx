import React, { useState, useMemo } from 'react';
import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, KoperasiSetup, Pembelian, PiutangWarung, Pengumuman } from '../types';
import { formatRupiah, exportToExcel, exportToPDF } from '../utils/finance';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, LayoutDashboard, FileSpreadsheet, 
  HelpCircle, Calendar, Users, Scale, Download, RefreshCw, AlertCircle, CheckCircle2,
  Search, Coins, CreditCard, Receipt, Bell, Clock, MessageSquare, AlertTriangle, Megaphone
} from 'lucide-react';
import { motion } from 'motion/react';

// ================= COOPERATIVE REAL-TIME DASHBOARD =================
interface DashboardProps {
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  income: PendapatanLain[];
  expenses: BebanKoperasi[];
  setup?: KoperasiSetup;
  announcements?: Pengumuman[];
}

export function DashboardView({ members, simpanan, pinjaman, angsuran, income, expenses, setup, announcements = [] }: DashboardProps) {
  const activeAnnouncements = useMemo(() => {
    return announcements.filter(a => a.status === 'Aktif');
  }, [announcements]);

  const summary = useMemo(() => {
    const kasAwal = setup?.kasAwal ?? 0;
    const totalSimpanan = simpanan.reduce((acc, c) => acc + c.jumlah, 0);
    const totalDisbursedPinjaman = pinjaman.reduce((acc, p) => acc + p.nominalPinjaman, 0);
    const totalAngsuranReceived = angsuran.reduce((acc, a) => acc + a.jumlahBayar, 0);
    
    const extraIncome = income.reduce((acc, i) => acc + i.nominal, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.nominal, 0);

    // Kas Akhir = kasAwal + Simpanan + Angsuran + Extra - Disbursed - Expenses
    const kasKoperasi = kasAwal + totalSimpanan + totalAngsuranReceived + extraIncome - totalDisbursedPinjaman - totalExpenses;

    // Pinjaman Beredar (Remaining principal + interest outstanding)
    const pinjamanBeredar = pinjaman.reduce((acc, p) => {
      const pPaid = angsuran.filter(a => a.pinjamanId === p.id).reduce((a,c) => a + c.jumlahBayar, 0);
      const balance = p.totalWajibBayar - pPaid;
      return acc + (p.status === 'Belum Lunas' ? balance : 0);
    }, 0);

    // Revenue streams for SHU
    const provisiRevenue = pinjaman.reduce((acc, p) => acc + p.provisiDipotong, 0);
    const interestRevenue = angsuran.reduce((acc, a) => {
      const contract = pinjaman.find(p => p.id === a.pinjamanId);
      return acc + (contract ? contract.jasaPerBulan : 0);
    }, 0);

    const totalPendapatan = extraIncome + provisiRevenue + interestRevenue;
    const shuSementara = totalPendapatan - totalExpenses;

    return {
      kasKoperasi,
      totalSimpanan,
      pinjamanBeredar,
      totalAnggota: members.length,
      shuSementara,
      totalPendapatan,
      totalExpenses
    };
  }, [members, simpanan, pinjaman, angsuran, income, expenses, setup]);

  // Find members with loan due date within 3 days or overdue
  const dueNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list: {
      loan: Pinjaman;
      member: Member;
      dueDate: Date;
      daysRemaining: number;
      amountDue: number;
      nextMonth: number;
    }[] = [];

    const activeLoans = pinjaman.filter(p => p.status === 'Belum Lunas');

    activeLoans.forEach(p => {
      const m = members.find(mem => mem.id === p.anggotaId);
      if (!m) return;

      const relatedAngsuran = angsuran.filter(a => a.pinjamanId === p.id);
      const paidMonths = relatedAngsuran.map(a => a.bulanKe);
      const nextMonth = paidMonths.length > 0 ? Math.max(...paidMonths) + 1 : 1;

      // If they already paid up to tenor, they shouldn't show in closest schedule
      if (nextMonth > p.tenor) return;

      const startDate = new Date(p.tanggal);
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + nextMonth);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Notification criteria: falling due in the next 3 days, or overdue
      if (diffDays <= 3) {
        list.push({
          loan: p,
          member: m,
          dueDate,
          daysRemaining: diffDays,
          amountDue: p.totalAngsuranPerBulan,
          nextMonth
        });
      }
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [members, pinjaman, angsuran]);

  const handleWhatsAppReminder = (member: Member, amount: number, nextMonth: number, daysRemaining: number, dueDate: Date) => {
    const formattedDate = dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    let timeInfo = '';
    if (daysRemaining === 0) {
      timeInfo = "HARI INI";
    } else if (daysRemaining === 1) {
      timeInfo = "BESOK HARI";
    } else if (daysRemaining < 0) {
      timeInfo = `TELAH TERLEWAT ${Math.abs(daysRemaining)} HARI`;
    } else {
      timeInfo = `dalam ${daysRemaining} hari ke depan`;
    }
    
    const kopName = setup?.namaKoperasi || "Koperasi Dana Segar";
    const message = `Halo Bapak/Ibu ${member.nama},\n\nKami dari *${kopName}* ingin menginformasikan bahwa angsuran pinjaman Anda yang ke-${nextMonth} sebesar *${formatRupiah(amount)}* jatuh tempo pada *${formattedDate}* (${timeInfo}).\n\nMohon lakukan pembayaran atau hubungi petugas administrasi koperasi. Terima kasih. 🙏`;
    
    const cleanPhone = member.noHp.replace(/[^0-9]/g, '');
    let finalPhone = cleanPhone;
    if (finalPhone.startsWith('0')) {
      finalPhone = '62' + finalPhone.substring(1);
    }
    
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Chart data 1: Savings allocation
  const savingsAllocation = useMemo(() => {
    const data = [
      { name: 'Simpanan Pokok', value: simpanan.filter(s => s.jenis === 'Pokok').reduce((a,c) => a + c.jumlah, 0) },
      { name: 'Simpanan Wajib', value: simpanan.filter(s => s.jenis === 'Wajib').reduce((a,c) => a + c.jumlah, 0) },
      { name: 'Simpanan Sukarela', value: simpanan.filter(s => s.jenis === 'Sukarela').reduce((a,c) => a + c.jumlah, 0) }
    ];
    return data;
  }, [simpanan]);

  // Chart data 2: Cashflow simulation trends (Income vs Expenses)
  const monthlyTrends = useMemo(() => {
    return [
      { month: 'Jan', Pendapatan: 1200000, Pengeluaran: 500000 },
      { month: 'Feb', Pendapatan: 1900000, Pengeluaran: 900000 },
      { month: 'Mar', Pendapatan: summary.totalPendapatan * 0.35, Pengeluaran: summary.totalExpenses * 0.4 },
      { month: 'Apr', Pendapatan: summary.totalPendapatan * 0.42, Pengeluaran: summary.totalExpenses * 0.45 },
      { month: 'Mei', Pendapatan: summary.totalPendapatan * 0.55, Pengeluaran: summary.totalExpenses * 0.6 },
      { month: 'Jun', Pendapatan: summary.totalPendapatan, Pengeluaran: summary.totalExpenses }
    ];
  }, [summary]);

  const COLORS = ['#4f46e5', '#f59e0b', '#0d9488'];

  return (
    <div className="space-y-6">
      {/* 📢 PENGUMUMAN KOPERASI TERKINI */}
      {activeAnnouncements.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Papan Pengumuman Koperasi
              </h3>
              <p className="text-xs text-slate-450 mt-0.5">
                Rilis informasi resmi, pemberitahuan pengurus, dan agenda penting koperasi terintegrasi secara real-time.
              </p>
            </div>
          </div>

          {/* 📢 TEKS BERJALAN (MARQUEE) */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/60 rounded-xl p-3 flex items-center gap-3 overflow-hidden shadow-xs">
            <marquee 
              className="text-xs font-medium text-slate-700 dark:text-slate-200" 
              scrollamount="4"
              onMouseOver={(e) => e.currentTarget.stop()}
              onMouseOut={(e) => e.currentTarget.start()}
            >
              {activeAnnouncements.map((ann) => (
                <span key={ann.id} className="mx-6 inline-flex items-center gap-1.5 cursor-pointer">
                  <span>{ann.isUrgent ? '🚨' : '📢'}</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{ann.judul}:</span>
                  <span className="text-slate-650 dark:text-slate-300">{ann.konten.replace(/\n/g, ' ')}</span>
                  <span className="text-slate-350 dark:text-slate-550 mx-2">|</span>
                </span>
              ))}
            </marquee>
          </div>
        </div>
      )}

      {/* 🔔 NOTIFIKASI JATUH TEMPO PINJAMAN (3 HARI KE DEPAN ATAU LEWAT JATUH TEMPO) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 rounded-xl">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Notifikasi Jatuh Tempo Pinjaman
              </h3>
              <p className="text-xs text-slate-450 mt-0.5">
                Pemantauan otomatis bagi anggota dengan sisa jatuh tempo ≤ 3 hari ke depan atau telah terlewati (Overdue).
              </p>
            </div>
          </div>
          {dueNotifications.length > 0 && (
            <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-mono font-bold px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800 animate-pulse self-start sm:self-auto">
              {dueNotifications.length} Perlu Tindakan
            </span>
          )}
        </div>

        {dueNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 rounded-full mb-2">
              <CheckCircle2 className="w-6 h-6 animate-pulse" />
            </span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Semua Tagihan Aman</p>
            <p className="text-xs text-slate-400 mt-0.5">Tidak ada tagihan jatuh tempo dalam 3 hari ke depan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dueNotifications.map(({ loan, member, dueDate, daysRemaining, amountDue, nextMonth }, idx) => {
              const overdue = daysRemaining < 0;
              const formattedDate = dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
              
              let badgeStyle = "bg-rose-100 dark:bg-rose-950 text-rose-750 dark:text-rose-300 border-rose-200 dark:border-rose-900";
              let titleWarning = overdue ? `Terlewat ${Math.abs(daysRemaining)} Hari` : daysRemaining === 0 ? "Hari Ini" : daysRemaining === 1 ? "Besok" : `${daysRemaining} Hari Lagi`;
              
              if (daysRemaining === 2 || daysRemaining === 3) {
                badgeStyle = "bg-amber-100 dark:bg-amber-950 text-amber-750 dark:text-amber-300 border-amber-200 dark:border-amber-900";
              }

              return (
                <div 
                  key={`${loan.id}-${idx}`} 
                  className="p-4 border rounded-xl flex flex-col justify-between transition gap-4 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600 border-slate-150 dark:border-slate-750 shadow-xs"
                >
                  <div className="space-y-1.5 z-10 text-sm">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle} flex items-center gap-1`}>
                        <Clock className="w-2.5 h-2.5" />
                        {titleWarning}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Kontrak #{loan.id.substring(0, 8)}</span>
                    </div>

                    <div className="pt-1.5">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-150 font-sans leading-tight">
                        {member.nama}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {member.noAnggota} | {member.noHp}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700/60 font-mono text-xs text-slate-600 dark:text-slate-350">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider font-sans">Jatuh Tempo</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{formattedDate}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider font-sans">Angsuran Ke-</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{nextMonth} dari {loan.tenor}</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-[9px] text-slate-450 uppercase tracking-wider font-sans">Nominal Tagihan</p>
                      <p className="text-sm font-bold font-mono text-indigo-700 dark:text-indigo-400 mt-0.5">
                        {formatRupiah(amountDue)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleWhatsAppReminder(member, amountDue, nextMonth, daysRemaining, dueDate)}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-350 border border-emerald-200/50 dark:border-emerald-900/50 font-sans font-semibold text-xs py-2 rounded-lg cursor-pointer transition flex items-center justify-center gap-1.5 mt-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-emerald-100 dark:fill-none" />
                    Kirim Pengingat WA
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Kas */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Kas Koperasi</p>
          <p className="text-xl font-mono font-bold text-teal-700 dark:text-teal-400 mt-2">{formatRupiah(summary.kasKoperasi)}</p>
          <span className="text-[10px] text-slate-400 mt-1 italic block font-medium">Buku Kas & Bank Aktif</span>
        </div>

        {/* Total Simpanan */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Simpanan</p>
          <p className="text-xl font-mono font-bold text-slate-800 dark:text-slate-100 mt-2">{formatRupiah(summary.totalSimpanan)}</p>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Pokok, Wajib, Sukarela</span>
        </div>

        {/* Total Pinjaman Beredar */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pinjaman Beredar</p>
          <p className="text-xl font-mono font-bold text-rose-700 dark:text-rose-400 mt-2">{formatRupiah(summary.pinjamanBeredar)}</p>
          <span className="text-[10px] text-rose-500 font-medium mt-1 block">Piutang Pembiayaan</span>
        </div>

        {/* Total Anggota */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Anggota</p>
          <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 mt-2">{summary.totalAnggota} <span className="text-xs text-slate-400 font-normal">Org</span></p>
          <span className="text-[10px] text-indigo-500 font-semibold mt-1 block">Anggota Terdaftar</span>
        </div>

        {/* SHU Lancar */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">SHU Sementara</p>
          <p className={`text-xl font-mono font-bold mt-2 ${summary.shuSementara >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatRupiah(summary.shuSementara)}</p>
          <span className="text-[10px] text-slate-400 mt-1 italic block font-medium">Beban & Jasa Terhitung</span>
        </div>
      </div>

      {/* Analytics Graphics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Bar Income Expenses */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-1.5 label-id">
            <span className="w-1.5 h-4 bg-teal-700 rounded-full inline-block"></span>
            Simulasi Arus Kas & Laba Rugi Berjalan (6 Bulan Terakhir)
          </h3>
          <div className="flex-1 w-full text-xs min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={80} tickFormatter={(v)=>`Rp ${v/1000}k`} />
                <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                <Legend />
                <Bar dataKey="Pendapatan" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation Pie Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-1.5 label-id">
            <span className="w-1.5 h-4 bg-amber-505 rounded-full bg-teal-700 inline-block"></span>
            Alokasi Portofolio Simpanan Anggota Koperasi (%)
          </h3>
          <div className="flex-1 w-full text-xs min-h-0 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={savingsAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {savingsAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                <Legend layout="horizontal" align="center" verticalAlign="bottom"/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= COOPERATIVE FINANCIAL STATEMENTS (LABA RUGI, NERACA, EXPORTS) =================
interface LaporanProps {
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  income: PendapatanLain[];
  expenses: BebanKoperasi[];
  pembelian?: Pembelian[];
  piutangWarung?: PiutangWarung[];
  setup: KoperasiSetup;
}

export function LaporanView({ 
  members, simpanan, pinjaman, angsuran, income, expenses, pembelian = [], piutangWarung = [], setup 
}: LaporanProps) {
  const [filterStartDate, setFilterStartDate] = useState('2026-01-01');
  const [filterEndDate, setFilterEndDate] = useState('2026-12-31');
  
  const [activeReportTab, setActiveReportTab] = useState<'labaRugi' | 'neraca' | 'nominatif' | 'simpanan' | 'pinjaman' | 'angsuran'>('labaRugi');
  const [nominatifSearch, setNominatifSearch] = useState('');

  // New states for individual report filtering
  const [simpananSearch, setSimpananSearch] = useState('');
  const [simpananTypeFilter, setSimpananTypeFilter] = useState('');
  const [pinjamanSearch, setPinjamanSearch] = useState('');
  const [pinjamanStatusFilter, setPinjamanStatusFilter] = useState('');
  const [angsuranSearch, setAngsuranSearch] = useState('');

  // Computations for Nominative report per member
  const nominatifList = useMemo(() => {
    return members.map(m => {
      // 1. Simpanan Pokok
      const pokok = simpanan
        .filter(s => s.anggotaId === m.id && s.jenis === 'Pokok')
        .reduce((sum, s) => sum + s.jumlah, 0);

      // 2. Simpanan Wajib
      const wajib = simpanan
        .filter(s => s.anggotaId === m.id && s.jenis === 'Wajib')
        .reduce((sum, s) => sum + s.jumlah, 0);

      // 3. Simpanan Sukarela
      const sukarela = simpanan
        .filter(s => s.anggotaId === m.id && s.jenis === 'Sukarela')
        .reduce((sum, s) => sum + s.jumlah, 0);

      const totalSimpanan = pokok + wajib + sukarela;

      // 4. Sisa Pinjaman Outstanding (Remaining principal outstanding)
      const mPinjaman = pinjaman.filter(p => p.anggotaId === m.id);
      const sisaPinjaman = mPinjaman.reduce((acc, p) => {
        const historicalRepaysForP = angsuran.filter(a => a.pinjamanId === p.id);
        const principalCollected = historicalRepaysForP.reduce((a, c) => {
          return a + p.angsuranPokokPerBulan;
        }, 0);
        const remainingPrincipal = p.status === 'Belum Lunas' ? (p.nominalPinjaman - principalCollected) : 0;
        return acc + Math.max(0, remainingPrincipal);
      }, 0);

      return {
        id: m.id,
        noAnggota: m.noAnggota,
        nama: m.nama,
        jenisKelamin: m.jenisKelamin,
        pokok,
        wajib,
        sukarela,
        totalSimpanan,
        sisaPinjaman: Math.round(sisaPinjaman)
      };
    });
  }, [members, simpanan, pinjaman, angsuran]);

  const filteredNominatif = useMemo(() => {
    const q = nominatifSearch.toLowerCase().trim();
    if (!q) return nominatifList;
    return nominatifList.filter(item => 
      item.nama.toLowerCase().includes(q) || 
      item.noAnggota.toLowerCase().includes(q)
    );
  }, [nominatifList, nominatifSearch]);

  const nominatifTotals = useMemo(() => {
    return filteredNominatif.reduce((acc, curr) => {
      acc.pokok += curr.pokok;
      acc.wajib += curr.wajib;
      acc.sukarela += curr.sukarela;
      acc.totalSimpanan += curr.totalSimpanan;
      acc.sisaPinjaman += curr.sisaPinjaman;
      return acc;
    }, { pokok: 0, wajib: 0, sukarela: 0, totalSimpanan: 0, sisaPinjaman: 0 });
  }, [filteredNominatif]);

  const handleExportNominatifExcel = () => {
    const dataToExport = filteredNominatif.map((item, idx) => ({
      "No": idx + 1,
      "No Anggota": item.noAnggota,
      "Nama Anggota": item.nama,
      "Jenis Kelamin": item.jenisKelamin || '-',
      "Simpanan Pokok (Rp)": item.pokok,
      "Simpanan Wajib (Rp)": item.wajib,
      "Simpanan Sukarela (Rp)": item.sukarela,
      "Total Simpanan (Rp)": item.totalSimpanan,
      "Sisa Pinjaman (Rp)": item.sisaPinjaman
    }));

    // Add totals row at the bottom for completeness
    dataToExport.push({
      "No": "",
      "No Anggota": "TOTAL",
      "Nama Anggota": "",
      "Simpanan Pokok (Rp)": nominatifTotals.pokok,
      "Simpanan Wajib (Rp)": nominatifTotals.wajib,
      "Simpanan Sukarela (Rp)": nominatifTotals.sukarela,
      "Total Simpanan (Rp)": nominatifTotals.totalSimpanan,
      "Sisa Pinjaman (Rp)": nominatifTotals.sisaPinjaman
    } as any);

    exportToExcel(dataToExport, "Data Nominatif", `Laporan_Nominatif_Simpanan_Pinjaman_${new Date().toISOString().substring(0, 10)}`, setup);
  };

  const handleExportNominatifPDF = () => {
    const cols = ["NO ANGGOTA", "NAMA ANGGOTA", "S. POKOK", "S. WAJIB", "S. SUKARELA", "TOTAL SIMP.", "SISA PINJ."];
    const rows = filteredNominatif.map(item => [
      item.noAnggota,
      item.nama,
      formatRupiah(item.pokok),
      formatRupiah(item.wajib),
      formatRupiah(item.sukarela),
      formatRupiah(item.totalSimpanan),
      formatRupiah(item.sisaPinjaman)
    ]);

    // Add summed totals row as the last row
    rows.push([
      "TOTAL NOMINATIF",
      "",
      formatRupiah(nominatifTotals.pokok),
      formatRupiah(nominatifTotals.wajib),
      formatRupiah(nominatifTotals.sukarela),
      formatRupiah(nominatifTotals.totalSimpanan),
      formatRupiah(nominatifTotals.sisaPinjaman)
    ]);

    exportToPDF(
      "LAPORAN DATA NOMINATIF ANGGOTA",
      `Periode data mutakhir berjalan s/d hari ini`,
      cols,
      rows,
      `Laporan_Nominatif_Koperasi_${new Date().toISOString().substring(0, 10)}`,
      [],
      setup
    );
  };

  // Filter lists inside timestamp context
  const sList = useMemo(() => {
    return simpanan.filter(s => s.tanggal >= filterStartDate && s.tanggal <= filterEndDate);
  }, [simpanan, filterStartDate, filterEndDate]);

  const pList = useMemo(() => {
    return pinjaman.filter(p => p.tanggal >= filterStartDate && p.tanggal <= filterEndDate);
  }, [pinjaman, filterStartDate, filterEndDate]);

  const aList = useMemo(() => {
    return angsuran.filter(a => a.tanggal >= filterStartDate && a.tanggal <= filterEndDate);
  }, [angsuran, filterStartDate, filterEndDate]);

  const incList = useMemo(() => {
    return income.filter(i => i.tanggal >= filterStartDate && i.tanggal <= filterEndDate);
  }, [income, filterStartDate, filterEndDate]);

  const expList = useMemo(() => {
    return expenses.filter(e => e.tanggal >= filterStartDate && e.tanggal <= filterEndDate);
  }, [expenses, filterStartDate, filterEndDate]);

  // LABA RUGI CALCULATOR DATA (With exact real-time sync)
  const profitLoss = useMemo(() => {
    // Pendapatan Non-operasi/Warung
    const pToko = incList.filter(i => i.sumber === 'warung').reduce((a,c) => a + c.nominal, 0);
    const pBungaBank = incList.filter(i => i.sumber === 'bunga_simpanan').reduce((a,c) => a + c.nominal, 0);
    const pDenda = incList.filter(i => i.sumber === 'denda').reduce((a,c) => a + c.nominal, 0);
    const pLain = incList.filter(i => i.sumber === 'lain_lain').reduce((a,c) => a + c.nominal, 0);

    // Provisi (Deducted when lending)
    const pProvisi = pList.reduce((acc, curr) => acc + curr.provisiDipotong, 0);

    // Interest realized (interest fee portion of repayments)
    const pJasaBunga = aList.reduce((acc, curr) => {
      const matchP = pinjaman.find(p => p.id === curr.pinjamanId);
      return acc + (matchP ? matchP.jasaPerBulan : 0);
    }, 0);

    const totalPendapatan = pToko + pBungaBank + pDenda + pLain + pProvisi + pJasaBunga;

    // Beban
    const bGajiKaryawan = expList.filter(e => e.kategori === 'gaji_karyawan').reduce((a,c) => a + c.nominal, 0);
    const bListrik = expList.filter(e => e.kategori === 'listrik').reduce((a,c) => a + c.nominal, 0);
    const bGajiPengurus = expList.filter(e => e.kategori === 'gaji_pengurus').reduce((a,c) => a + c.nominal, 0);
    const bGajiPengawas = expList.filter(e => e.kategori === 'gaji_pengawas').reduce((a,c) => a + c.nominal, 0);
    const bOperasional = expList.filter(e => e.kategori === 'operasional_kantor').reduce((a,c) => a + c.nominal, 0);
    const bLain = expList.filter(e => e.kategori === 'beban_lain').reduce((a,c) => a + c.nominal, 0);

    const totalBeban = bGajiKaryawan + bListrik + bGajiPengurus + bGajiPengawas + bOperasional + bLain;
    const shuBersih = totalPendapatan - totalBeban;

    return {
      pToko, pBungaBank, pDenda, pLain, pProvisi, pJasaBunga, totalPendapatan,
      bGajiKaryawan, bListrik, bGajiPengurus, bGajiPengawas, bOperasional, bLain, totalBeban,
      shuBersih
    };
  }, [incList, expList, pList, aList, pinjaman]);

  // NERACA STATEMENT DATA (With double-entry balance check)
  const balanceSheet = useMemo(() => {
    const kasAwal = setup?.kasAwal ?? 0;
    const piutangAwal = setup?.piutangAwal ?? 0;
    const persediaanWarungAwal = setup?.persediaanWarungAwal ?? 0;
    const inventarisAwal = setup?.inventarisAwal ?? 0;
    const simpananPokokAwal = setup?.simpananPokokAwal ?? 0;
    const simpananWajibAwal = setup?.simpananWajibAwal ?? 0;
    const simpananSukarelaAwal = setup?.simpananSukarelaAwal ?? 0;
    const modalAwal = setup?.modalAwal ?? 0;
    const danaCadanganAwal = setup?.danaCadanganAwal ?? 0;

    const totalSimpananAll = simpanan.reduce((a,c) => a + c.jumlah, 0);
    const totalDisbursedAll = pinjaman.reduce((a,c) => a + c.nominalPinjaman, 0);
    const totalAngsuranAll = angsuran.reduce((a,c) => a + c.jumlahBayar, 0);
    const totalIncAll = income.reduce((a,c) => a + c.nominal, 0);
    const totalExpAll = expenses.reduce((a,c) => a + c.nominal, 0);

    // Double-entry assets integration
    const totalPembelianAll = pembelian.reduce((sum, p) => sum + p.totalHarga, 0);
    const totalHutangBaruWarung = piutangWarung.filter(pw => pw.jenis === 'hutang_baru').reduce((sum, pw) => sum + pw.nominal, 0);
    const totalPelunasanWarung = piutangWarung.filter(pw => pw.jenis === 'pelunasan').reduce((sum, pw) => sum + pw.nominal, 0);

    // Cash balance after purchase & receivables flows
    const kasAkhir = kasAwal + totalSimpananAll + totalAngsuranAll + totalIncAll + totalPelunasanWarung - totalDisbursedAll - totalExpAll - totalPembelianAll - totalHutangBaruWarung;

    // Outstanding Principal PIUTANG = piutangAwal + Pinjaman nominal - principal repaid
    const piutangBeredar = piutangAwal + pinjaman.reduce((acc, p) => {
      const historicalRepaysForP = angsuran.filter(a => a.pinjamanId === p.id);
      const principalCollected = historicalRepaysForP.reduce((a,c) => {
        return a + p.angsuranPokokPerBulan;
      }, 0);
      const remainingPrincipal = p.status === 'Belum Lunas' ? (p.nominalPinjaman - principalCollected) : 0;
      return acc + Math.max(0, remainingPrincipal);
    }, 0);

    // Integration of user-special requested assets
    const persediaanWarung = persediaanWarungAwal + pembelian.filter(p => p.kategori === 'persediaan_warung').reduce((sum, p) => sum + p.totalHarga, 0);
    const seragam = pembelian.filter(p => p.kategori === 'seragam').reduce((sum, p) => sum + p.totalHarga, 0);
    const persediaanBarang = pembelian.filter(p => p.kategori === 'persediaan_barang').reduce((sum, p) => sum + p.totalHarga, 0);
    const inventaris = inventarisAwal + pembelian.filter(p => p.kategori === 'inventaris').reduce((sum, p) => sum + p.totalHarga, 0);
    const piutangWarungVal = totalHutangBaruWarung - totalPelunasanWarung;

    // Total assets (Aktiva)
    const totalAktiva = kasAkhir + piutangBeredar + persediaanWarung + seragam + persediaanBarang + inventaris + piutangWarungVal;

    // Pasiva
    const sPokok = simpanan.filter(s => s.jenis === 'Pokok').reduce((a,c) => a + c.jumlah, 0);
    const sWajib = simpanan.filter(s => s.jenis === 'Wajib').reduce((a,c) => a + c.jumlah, 0);
    const sSukarela = simpanan.filter(s => s.jenis === 'Sukarela').reduce((a,c) => a + c.jumlah, 0);

    // Filter "Jasa Manasuka" and "Bunga Jasa" dividend logs out of sukarela to present separately
    const jasaManasukaAll = simpanan.filter(s => s.jenis === 'Sukarela' && (s.keterangan?.includes('Manasuka') || s.keterangan?.includes('Bunga Jasa'))).reduce((sum, s) => sum + s.jumlah, 0);
    const sSukarelaMurni = sSukarela - jasaManasukaAll;

    const totalSimpanan = sPokok + sWajib + sSukarela;

    // SHU Lancar All Time
    const allProvisi = pinjaman.reduce((acc, p) => acc + p.provisiDipotong, 0);
    const allInterest = angsuran.reduce((acc, a) => {
      const matchP = pinjaman.find(p => p.id === a.pinjamanId);
      return acc + (matchP ? matchP.jasaPerBulan : 0);
    }, 0);
    const shuBersihAll = (totalIncAll + allProvisi + allInterest) - totalExpAll;

    // Split SHU into Dana Cadangan (20%) and SHU Berjalan (80%) for cooperative balance accounting
    const danaCadangan = danaCadanganAwal + (shuBersihAll * 0.20);
    const shuBerjalan = shuBersihAll * 0.80;

    const totalPasiva = (simpananPokokAwal + sPokok) + (simpananWajibAwal + sWajib) + (simpananSukarelaAwal + sSukarelaMurni) + jasaManasukaAll + modalAwal + danaCadangan + shuBerjalan;

    return {
      kasAkhir,
      piutangBeredar,
      persediaanWarung,
      seragam,
      persediaanBarang,
      inventaris,
      piutangWarungVal,
      totalAktiva,
      sPokok: simpananPokokAwal + sPokok,
      sWajib: simpananWajibAwal + sWajib,
      sSukarelaMurni: simpananSukarelaAwal + sSukarelaMurni,
      jasaManasukaAll,
      totalSimpanan: (simpananPokokAwal + sPokok) + (simpananWajibAwal + sWajib) + (simpananSukarelaAwal + sSukarelaMurni) + jasaManasukaAll,
      modalAwal,
      danaCadangan,
      shuBerjalan,
      shuBersihAll,
      totalPasiva
    };
  }, [simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung, setup]);

  // Export handlers
  const handleExportLabaRugiExcel = () => {
    const data = [
      { Kategori: "PENDAPATAN", Subkategori: "Laba Bersih Warung Koperasi", Nominal: profitLoss.pToko },
      { Kategori: "PENDAPATAN", Subkategori: "Bunga Simpanan Buku Bank", Nominal: profitLoss.pBungaBank },
      { Kategori: "PENDAPATAN", Subkategori: "Denda Keterlambatan", Nominal: profitLoss.pDenda },
      { Kategori: "PENDAPATAN", Subkategori: "Provisi Pinjaman (1%)", Nominal: profitLoss.pProvisi },
      { Kategori: "PENDAPATAN", Subkategori: "Jasa Bunga Kredit Anggota", Nominal: profitLoss.pJasaBunga },
      { Kategori: "PENDAPATAN", Subkategori: "Pendapatan Lain-lain", Nominal: profitLoss.pLain },
      { Kategori: "PENDAPATAN TOTAL", Subkategori: "Total Penerimaan Pendapatan", Nominal: profitLoss.totalPendapatan },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Beban Gaji Karyawan Toko/Kasir", Nominal: profitLoss.bGajiKaryawan },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Beban Air Listrik & WiFi", Nominal: profitLoss.bListrik },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Insentif Kehormatan Pengurus", Nominal: profitLoss.bGajiPengurus },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Insentif Kehormatan Pengawas", Nominal: profitLoss.bGajiPengawas },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Beban Operasional Kantor / ATK", Nominal: profitLoss.bOperasional },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Beban Operasi Lainnya", Nominal: profitLoss.bLain },
      { Kategori: "BEBAN TOTAL", Subkategori: "Total Penyaluran Beban", Nominal: profitLoss.totalBeban },
      { Kategori: "SISA HASIL USAHA (SHU)", Subkategori: "SHU Bersih Sementara Berjalan", Nominal: profitLoss.shuBersih }
    ];
    exportToExcel(data, "Laba Rugi", "Laporan_Laba_Rugi_Koperasi", setup);
  };

  const handleExportLabaRugiPDF = () => {
    const cols = ["NAMA TRANSAKSI SAKSI", "NOMINAL RUPIAH"];
    const rows = [
      ["[+] Pendapatan Laba Toko/Warung", formatRupiah(profitLoss.pToko)],
      ["[+] Bunga Simpanan Buku Bank", formatRupiah(profitLoss.pBungaBank)],
      ["[+] Penerimaan Denda Anggota", formatRupiah(profitLoss.pDenda)],
      ["[+] Provisi Akad Pinjaman (1%)", formatRupiah(profitLoss.pProvisi)],
      ["[+] Jasa Bunga Pelunasan Kredit", formatRupiah(profitLoss.pJasaBunga)],
      ["[+] Pendapatan Lain-lain Koperasi", formatRupiah(profitLoss.pLain)],
      ["TOTAL PENDAPATAN kotor (A)", formatRupiah(profitLoss.totalPendapatan)],
      ["[-] Beban Gaji Karyawan Toko/Kasir", formatRupiah(profitLoss.bGajiKaryawan)],
      ["[-] Beban Air, Listrik & WiFi", formatRupiah(profitLoss.bListrik)],
      ["[-] Gaji Kehormatan Board Pengurus", formatRupiah(profitLoss.bGajiPengurus)],
      ["[-] Gaji Kehormatan Board Pengawas", formatRupiah(profitLoss.bGajiPengawas)],
      ["[-] Beban Operasional Kantor & ATK", formatRupiah(profitLoss.bOperasional)],
      ["[-] Beban Operasi Lain-lain", formatRupiah(profitLoss.bLain)],
      ["TOTAL BEBAN pengeluaran (B)", formatRupiah(profitLoss.totalBeban)],
      ["SISA HASIL USAHA (SHU BERSIH SEMENTARA)", formatRupiah(profitLoss.shuBersih)]
    ];

    exportToPDF(
      "LAPORAN LABA RUGI DIGITAL SEMENTARA",
      `Periode: ${filterStartDate} s/d ${filterEndDate}`,
      cols,
      rows,
      "Laba_Rugi_Koperasi",
      [],
      setup
    );
  };

  const handleExportNeracaPDF = () => {
    const cols = ["ELEMEN NERACA DIGITAL", "SISI AKTIVA (ASET)", "SISI PASIVA (LIABILITAS/EKUITAS)"];
    const rows = [
      ["Aset Lancar: Kas & Bank Utama", formatRupiah(balanceSheet.kasAkhir), "-"],
      ["Aset Lancar: Persediaan Warung", formatRupiah(balanceSheet.persediaanWarung), "-"],
      ["Aset Lancar: Seragam", formatRupiah(balanceSheet.seragam), "-"],
      ["Aset Lancar: Persediaan Barang", formatRupiah(balanceSheet.persediaanBarang), "-"],
      ["Aset Lancar: Piutang Warung", formatRupiah(balanceSheet.piutangWarungVal), "-"],
      ["Aset Tetap: Inventaris Koperasi", formatRupiah(balanceSheet.inventaris), "-"],
      ["Aset Tetap: Outstanding Piutang Pokok", formatRupiah(balanceSheet.piutangBeredar), "-"],
      ["Kewajiban: Akumulasi Simpanan Pokok Anggota", "-", formatRupiah(balanceSheet.sPokok)],
      ["Kewajiban: Akumulasi Simpanan Wajib Anggota", "-", formatRupiah(balanceSheet.sWajib)],
      ["Kewajiban: Akumulasi Simpanan Sukarela Anggota", "-", formatRupiah(balanceSheet.sSukarelaMurni)],
      ["Kewajiban: Jasa Manasuka", "-", formatRupiah(balanceSheet.jasaManasukaAll)],
      ["Modal: Modal Awal Pokok Koperasi", "-", formatRupiah(balanceSheet.modalAwal)],
      ["Ekuitas: Dana Cadangan", "-", formatRupiah(balanceSheet.danaCadangan)],
      ["Ekuitas: SHU Berjalan", "-", formatRupiah(balanceSheet.shuBerjalan)],
      ["TOTAL AKUMULASI (SEIMBANG / BALANCED)", formatRupiah(balanceSheet.totalAktiva), formatRupiah(balanceSheet.totalPasiva)]
    ];

    exportToPDF(
      "LAPORAN NERACA KEUANGAN KOPERASI DIGITAL",
      `Sinkronisasi Otoritatif Aktual real-time s/d: ${new Date().toLocaleDateString('id-ID')}`,
      cols,
      rows,
      "Neraca_Koperasi_Sains",
      [],
      setup
    );
  };

  // Filtered Simpanan List
  const filteredSimpananReport = useMemo(() => {
    let result = sList;
    if (simpananTypeFilter) {
      result = result.filter(s => s.jenis === simpananTypeFilter);
    }
    if (simpananSearch.trim()) {
      const q = simpananSearch.toLowerCase().trim();
      result = result.filter(s => {
        const m = members.find(member => member.id === s.anggotaId);
        return m?.nama.toLowerCase().includes(q) || m?.noAnggota.toLowerCase().includes(q);
      });
    }
    return [...result].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [sList, simpananTypeFilter, simpananSearch, members]);

  const totalSimpananReportSum = useMemo(() => {
    return filteredSimpananReport.reduce((sum, item) => sum + item.jumlah, 0);
  }, [filteredSimpananReport]);

  // Filtered Pinjaman List
  const filteredPinjamanReport = useMemo(() => {
    let result = pList;
    if (pinjamanStatusFilter) {
      result = result.filter(p => p.status === pinjamanStatusFilter);
    }
    if (pinjamanSearch.trim()) {
      const q = pinjamanSearch.toLowerCase().trim();
      result = result.filter(p => {
        const m = members.find(member => member.id === p.anggotaId);
        return m?.nama.toLowerCase().includes(q) || m?.noAnggota.toLowerCase().includes(q);
      });
    }
    return [...result].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [pList, pinjamanStatusFilter, pinjamanSearch, members]);

  const pinjamanReportTotals = useMemo(() => {
    return filteredPinjamanReport.reduce((acc, item) => {
      acc.nominalPinjaman += item.nominalPinjaman;
      acc.provisiDipotong += item.provisiDipotong;
      acc.jumlahDiterima += item.jumlahDiterima;
      acc.totalWajibBayar += item.totalWajibBayar;
      return acc;
    }, { nominalPinjaman: 0, provisiDipotong: 0, jumlahDiterima: 0, totalWajibBayar: 0 });
  }, [filteredPinjamanReport]);

  // Filtered Angsuran List
  const filteredAngsuranReport = useMemo(() => {
    let result = aList;
    if (angsuranSearch.trim()) {
      const q = angsuranSearch.toLowerCase().trim();
      result = result.filter(a => {
        const m = members.find(member => member.id === a.anggotaId);
        return m?.nama.toLowerCase().includes(q) || m?.noAnggota.toLowerCase().includes(q);
      });
    }
    return [...result].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [aList, angsuranSearch, members]);

  const totalAngsuranReportSum = useMemo(() => {
    return filteredAngsuranReport.reduce((sum, item) => sum + item.jumlahBayar, 0);
  }, [filteredAngsuranReport]);

  // Export handlers for new reports
  const handleExportSimpananExcel = () => {
    const data = filteredSimpananReport.map((item, idx) => {
      const m = members.find(member => member.id === item.anggotaId);
      return {
        "No": idx + 1,
        "Tanggal": item.tanggal,
        "No Anggota": m?.noAnggota || "",
        "Nama Anggota": m?.nama || "Unknown",
        "Jenis": item.jenis,
        "Jumlah (Rp)": item.jumlah,
        "Keterangan": item.keterangan || ""
      };
    });
    if (data.length > 0) {
      data.push({
        "No": "",
        "Tanggal": "TOTAL",
        "No Anggota": "",
        "Nama Anggota": "",
        "Jenis": "",
        "Jumlah (Rp)": totalSimpananReportSum,
        "Keterangan": ""
      } as any);
    }
    exportToExcel(data, "Simpanan", "Laporan_Aktivitas_Simpanan", setup);
  };

  const handleExportSimpananPDF = () => {
    const cols = ["TANGGAL", "NO ANGGOTA", "NAMA ANGGOTA", "JENIS", "JUMLAH SETORAN", "KETERANGAN"];
    const rows = filteredSimpananReport.map(item => {
      const m = members.find(member => member.id === item.anggotaId);
      return [
        item.tanggal,
        m?.noAnggota || "",
        m?.nama || "Unknown",
        item.jenis,
        formatRupiah(item.jumlah),
        item.keterangan || ""
      ];
    });
    rows.push([
      "TOTAL SIMPANAN",
      "",
      "",
      "",
      formatRupiah(totalSimpananReportSum),
      ""
    ]);
    exportToPDF(
      "LAPORAN DATA MUTASI SIMPANAN",
      `Periode: ${filterStartDate} s/d ${filterEndDate}`,
      cols,
      rows,
      "Laporan_Simpanan_Koperasi",
      [],
      setup
    );
  };

  const handleExportPinjamanExcel = () => {
    const data = filteredPinjamanReport.map((item, idx) => {
      const m = members.find(member => member.id === item.anggotaId);
      return {
        "No": idx + 1,
        "Tanggal": item.tanggal,
        "No Anggota": m?.noAnggota || "",
        "Nama Anggota": m?.nama || "Unknown",
        "Nominal Pinjaman (Rp)": item.nominalPinjaman,
        "Provisi (Rp)": item.provisiDipotong,
        "Diterima (Rp)": item.jumlahDiterima,
        "Tenor (Bulan)": item.tenor,
        "Total Wajib Bayar (Rp)": item.totalWajibBayar,
        "Status": item.status
      };
    });
    if (data.length > 0) {
      data.push({
        "No": "",
        "Tanggal": "TOTAL",
        "No Anggota": "",
        "Nama Anggota": "",
        "Nominal Pinjaman (Rp)": pinjamanReportTotals.nominalPinjaman,
        "Provisi (Rp)": pinjamanReportTotals.provisiDipotong,
        "Diterima (Rp)": pinjamanReportTotals.jumlahDiterima,
        "Tenor (Bulan)": "",
        "Total Wajib Bayar (Rp)": pinjamanReportTotals.totalWajibBayar,
        "Status": ""
      } as any);
    }
    exportToExcel(data, "Pinjaman", "Laporan_Penyaluran_Pinjaman", setup);
  };

  const handleExportPinjamanPDF = () => {
    const cols = ["TANGGAL", "NAMA ANGGOTA", "NOMINAL", "PROVISI", "DITERIMA", "TENOR", "WAJIB BAYAR", "STATUS"];
    const rows = filteredPinjamanReport.map(item => {
      const m = members.find(member => member.id === item.anggotaId);
      return [
        item.tanggal,
        m?.nama || "Unknown",
        formatRupiah(item.nominalPinjaman),
        formatRupiah(item.provisiDipotong),
        formatRupiah(item.jumlahDiterima),
        `${item.tenor} Bulan`,
        formatRupiah(item.totalWajibBayar),
        item.status
      ];
    });
    rows.push([
      "TOTAL PINJAMAN",
      "",
      formatRupiah(pinjamanReportTotals.nominalPinjaman),
      formatRupiah(pinjamanReportTotals.provisiDipotong),
      formatRupiah(pinjamanReportTotals.jumlahDiterima),
      "",
      formatRupiah(pinjamanReportTotals.totalWajibBayar),
      ""
    ]);
    exportToPDF(
      "LAPORAN DATA PENYALURAN PINJAMAN",
      `Periode: ${filterStartDate} s/d ${filterEndDate}`,
      cols,
      rows,
      "Laporan_Pinjaman_Koperasi",
      [],
      setup
    );
  };

  const handleExportAngsuranExcel = () => {
    const data = filteredAngsuranReport.map((item, idx) => {
      const m = members.find(member => member.id === item.anggotaId);
      return {
        "No": idx + 1,
        "Tanggal": item.tanggal,
        "No Anggota": m?.noAnggota || "",
        "Nama Anggota": m?.nama || "Unknown",
        "Angsuran Ke": item.bulanKe,
        "Jumlah Bayar (Rp)": item.jumlahBayar,
        "Keterangan": item.keterangan || ""
      };
    });
    if (data.length > 0) {
      data.push({
        "No": "",
        "Tanggal": "TOTAL",
        "No Anggota": "",
        "Nama Anggota": "",
        "Angsuran Ke": "",
        "Jumlah Bayar (Rp)": totalAngsuranReportSum,
        "Keterangan": ""
      } as any);
    }
    exportToExcel(data, "Angsuran", "Laporan_Penerimaan_Angsuran", setup);
  };

  const handleExportAngsuranPDF = () => {
    const cols = ["TANGGAL", "NO ANGGOTA", "NAMA ANGGOTA", "ANGSURAN KE", "JUMLAH BAYAR", "KETERANGAN"];
    const rows = filteredAngsuranReport.map(item => {
      const m = members.find(member => member.id === item.anggotaId);
      return [
        item.tanggal,
        m?.noAnggota || "",
        m?.nama || "Unknown",
        `Bulan ke-${item.bulanKe}`,
        formatRupiah(item.jumlahBayar),
        item.keterangan || ""
      ];
    });
    rows.push([
      "TOTAL ANGSURAN RECEIVED",
      "",
      "",
      "",
      formatRupiah(totalAngsuranReportSum),
      ""
    ]);
    exportToPDF(
      "LAPORAN DATA MUTASI ANGSURAN PINJAMAN",
      `Periode: ${filterStartDate} s/d ${filterEndDate}`,
      cols,
      rows,
      "Laporan_Angsuran_Koperasi",
      [],
      setup
    );
  };

  return (
    <div className="space-y-6">
      {/* Date contexts selectors */}
      <div className="bg-white dark:bg-slate-800 p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase">
          <Calendar className="w-4 h-4 text-emerald-600"/> Rentang Otoritas Laporan:
        </div>
        <div className="flex items-center gap-3 text-xs w-full sm:w-auto">
          <input 
            type="date" 
            value={filterStartDate} 
            onChange={(e)=>setFilterStartDate(e.target.value)}
            className="p-1 px-3 border rounded bg-slate-50 text-slate-700 pointer-events-auto"
          />
          <span className="text-slate-400">s/d</span>
          <input 
            type="date" 
            value={filterEndDate} 
            onChange={(e)=>setFilterEndDate(e.target.value)}
            className="p-1 px-3 border rounded bg-slate-50 text-slate-700 pointer-events-auto"
          />
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-b border-slate-150 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-2xl w-full gap-1.5">
        <button
          onClick={() => setActiveReportTab('labaRugi')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'labaRugi'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <TrendingUp className="w-4 h-4"/> Laba Rugi
        </button>
        <button
          onClick={() => setActiveReportTab('neraca')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'neraca'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <Scale className="w-4 h-4"/> Neraca Saldo
        </button>
        <button
          onClick={() => setActiveReportTab('nominatif')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'nominatif'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4"/> Data Nominatif
        </button>
        <button
          onClick={() => setActiveReportTab('simpanan')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'simpanan'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <Coins className="w-4 h-4"/> Simpanan
        </button>
        <button
          onClick={() => setActiveReportTab('pinjaman')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'pinjaman'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <CreditCard className="w-4 h-4"/> Pinjaman
        </button>
        <button
          onClick={() => setActiveReportTab('angsuran')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'angsuran'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <Receipt className="w-4 h-4"/> Angsuran
        </button>
      </div>

      <div className="space-y-6">
        {activeReportTab === 'labaRugi' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-3.5">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600"/> Laba Rugi
              </h3>
              <div className="flex gap-1.5 shrink-0">
                <button 
                  onClick={handleExportLabaRugiExcel}
                  className="p-1.5 text-xs text-slate-650 dark:text-slate-300 hover:text-green-700 bg-slate-100 dark:bg-slate-700 hover:bg-green-100 rounded-lg cursor-pointer transition"
                  title="Unduh Excel"
                >
                  <Download className="w-4 h-4"/>
                </button>
                <button 
                  onClick={handleExportLabaRugiPDF}
                  className="p-1.5 text-xs text-slate-650 dark:text-slate-300 hover:text-teal-750 bg-slate-100 dark:bg-slate-700 hover:bg-teal-100 rounded-lg cursor-pointer transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5"/> PDF
                </button>
              </div>
            </div>

            <div className="space-y-4 font-mono text-xs max-w-3xl">
              {/* PENDAPATAN */}
              <div className="space-y-2">
                <p className="font-sans font-bold border-b text-teal-700 text-[10px] pb-1 uppercase tracking-wider">I. PENDAPATAN OPERASIONAL & TOKO</p>
                <div className="flex justify-between pl-2">
                  <span>[+] Laba Penjual Sembako Warung</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pToko)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[+] Pendapatan Biaya Provisi (1%)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pProvisi)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[+] Realisasi Jasa Bunga Kontrak</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pJasaBunga)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[+] Denda Keterlambatan Anggota</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pDenda)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[+] Bunga Simpanan Giro Bank</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pBungaBank)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[+] Hasil Pendapatan Sukarela/Lainnya</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pLain)}</span>
                </div>
                <div className="flex justify-between bg-slate-50 dark:bg-slate-900 border-y py-1.5 px-2 font-bold text-slate-800 dark:text-slate-100">
                  <span>TOTAL PENDAPATAN KOPERASI (A)</span>
                  <span>{formatRupiah(profitLoss.totalPendapatan)}</span>
                </div>
              </div>

              {/* EXPENSES */}
              <div className="space-y-2">
                <p className="font-sans font-bold border-b text-rose-700 text-[10px] pb-1 uppercase tracking-wider">II. BEBAN OPERASIONIK / PENYALURAN</p>
                <div className="flex justify-between pl-2">
                  <span>[-] Beban Biaya Gaji Staff Toko</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bGajiKaryawan)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Beban Rekening Air & Listrik Kantor</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bListrik)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Insentif Honorarium Pengurus</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bGajiPengurus)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Insentif Honorarium Pengawas</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bGajiPengawas)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Beban ATK & Operasi Kantor</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bOperasional)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Pengeluaran Beban Lainnya</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bLain)}</span>
                </div>
                <div className="flex justify-between bg-slate-50 dark:bg-slate-900 border-y py-1.5 px-2 font-bold text-slate-800 dark:text-slate-100">
                  <span>TOTAL EXPENSES PENYALURAN BEBAN (B)</span>
                  <span>{formatRupiah(profitLoss.totalBeban)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3.5 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-400 font-bold border rounded-xl font-sans">
                <span>SISA HASIL USAHA (SHU BERJALAN):</span>
                <span className={`font-mono text-base ${profitLoss.shuBersih >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700'}`}>
                  {formatRupiah(profitLoss.shuBersih)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'neraca' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-3.5">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600 animate-hover"/> Neraca Saldo
              </h3>
              <button 
                onClick={handleExportNeracaPDF}
                className="p-1.5 text-xs text-slate-650 dark:text-slate-300 hover:text-teal-750 bg-slate-100 dark:bg-slate-700 hover:bg-teal-100 rounded-lg cursor-pointer transition flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5"/> PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              {/* AKTIVA (ASSET) */}
              <div className="space-y-3.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 border rounded-xl">
                <p className="font-sans font-bold border-b text-indigo-700 text-[10px] pb-1 uppercase tracking-wider">SISI AKTIVA (ASET / REKENING DEBET)</p>
                <div className="space-y-2">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">KAS & BANK:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.kasAkhir)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">PERSEDIAAN WARUNG:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.persediaanWarung)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">SERAGAM:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.seragam)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400 font-sans">PERSEDIAAN BARANG DAGANG:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.persediaanBarang)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">PIUTANG WARUNG:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.piutangWarungVal)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">INVENTARIS KOPERASI:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.inventaris)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">PIUTANG PINJAMAN BEREDAR:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.piutangBeredar)}</p>
                  </div>
                </div>
                <div className="border-t pt-2 font-bold text-slate-800 dark:text-slate-100 flex justify-between">
                  <span className="text-[10px] font-sans text-indigo-700 block uppercase">Total Aktiva Aset</span>
                  <p className="text-sm font-bold text-teal-700">{formatRupiah(balanceSheet.totalAktiva)}</p>
                </div>
              </div>

              {/* PASIVA (KEWAJIBAN & EKUITAS) */}
              <div className="space-y-3.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 border rounded-xl">
                <p className="font-sans font-bold border-b text-slate-600 text-[10px] pb-1 uppercase tracking-wider">SISI PASIVA (KEWAJIBAN / EKUITAS / REKENING KREDIT)</p>
                <div className="space-y-2">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">SIMPANAN POKOK:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.sPokok)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">SIMPANAN WAJIB:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.sWajib)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">SIMPANAN SUKARELA:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.sSukarelaMurni)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">JASA MANASUKA:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.jasaManasukaAll)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">MODAL AWAL KOPERASI:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.modalAwal)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">DANA CADANGAN (20%):</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.danaCadangan)}</p>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-[10px] text-slate-400">SHU BERJALAN (80%):</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.shuBerjalan)}</p>
                  </div>
                </div>
                <div className="border-t pt-2 font-bold text-slate-800 dark:text-slate-100 flex justify-between">
                  <span className="text-[10px] font-sans text-slate-500 block uppercase">Total Pasiva Koperasi</span>
                  <p className="text-sm font-bold text-slate-700">{formatRupiah(balanceSheet.totalPasiva)}</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2.5 rounded-lg border border-emerald-150 flex items-center justify-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-400 font-bold font-sans">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600"/>
              Verifikasi Neraca: Balanced Seimbang {(Math.abs(balanceSheet.totalAktiva - balanceSheet.totalPasiva) < 1) && "✓"}
            </div>
          </motion.div>
        )}

        {activeReportTab === 'nominatif' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600"/> Data Nominatif
                </h3>
                <p className="text-xs text-slate-400 mt-1">Daftar saldo simpanan pokok, wajib, sukarela, beserta baki sisa outstanding pinjaman per anggota secara terperinci.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportNominatifExcel}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> Excel
                </button>
                <button 
                  onClick={handleExportNominatifPDF}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-55 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> PDF
                </button>
              </div>
            </div>

            {/* Searching & Filter Bar */}
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Search className="w-4 h-4"/>
              </span>
              <input 
                type="text"
                placeholder="Cari berdasarkan nama anggota atau nomor anggota..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-750 focus:outline-emerald-700 font-medium placeholder-slate-400"
                value={nominatifSearch}
                onChange={(e) => setNominatifSearch(e.target.value)}
              />
            </div>

            {/* Responsive Table Container */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
              <table className="w-full table-auto text-left text-xs text-slate-650 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-700 text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">No. Anggota</th>
                    <th className="px-4 py-3 font-sans">Nama Anggota</th>
                    <th className="px-4 py-3 text-right">Simp. Pokok</th>
                    <th className="px-4 py-3 text-right">Simp. Wajib</th>
                    <th className="px-4 py-3 text-right">Simp. Sukarela</th>
                    <th className="px-4 py-3 text-right bg-emerald-50/20 dark:bg-emerald-900/5 font-sans">Total Tabungan</th>
                    <th className="px-4 py-3 text-right text-rose-700 dark:text-rose-450 font-sans">Baki Sisa Pinjaman</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-mono text-[11px]">
                  {filteredNominatif.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400 italic">Data nominatif tidak ditemukan / Anggota kosong</td>
                    </tr>
                  ) : (
                    filteredNominatif.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all duration-150">
                        <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{index + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-200">{item.noAnggota}</td>
                        <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-150">
                          <div className="flex items-center gap-1.5">
                            <span>{item.nama}</span>
                            {item.jenisKelamin && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${item.jenisKelamin === 'Laki-laki' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450'}`}>
                                {item.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right">{formatRupiah(item.pokok)}</td>
                        <td className="px-4 py-2.5 text-right">{formatRupiah(item.wajib)}</td>
                        <td className="px-4 py-2.5 text-right">{formatRupiah(item.sukarela)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-900/5">
                          {formatRupiah(item.totalSimpanan)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-rose-750 dark:text-rose-450">
                          {item.sisaPinjaman > 0 ? formatRupiah(item.sisaPinjaman) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredNominatif.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-sans uppercase text-[10px] tracking-wider text-slate-400 font-bold">TOTAL NOMINATIF:</td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">{formatRupiah(nominatifTotals.pokok)}</td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">{formatRupiah(nominatifTotals.wajib)}</td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">{formatRupiah(nominatifTotals.sukarela)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-900/10 text-xs">{formatRupiah(nominatifTotals.totalSimpanan)}</td>
                      <td className="px-4 py-3 text-right text-rose-700 dark:text-rose-400 text-xs">{formatRupiah(nominatifTotals.sisaPinjaman)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'simpanan' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-600"/> Laporan Mutasi Simpanan
                </h3>
                <p className="text-xs text-slate-450 mt-0.5">Catatan setoran simpanan anggota koperasi</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button 
                  onClick={handleExportSimpananExcel}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-green-55 hover:text-green-805 dark:hover:bg-green-905/30 dark:hover:text-green-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> Excel
                </button>
                <button 
                  onClick={handleExportSimpananPDF}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-55 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> PDF
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative sm:col-span-2">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search className="w-4 h-4"/>
                </span>
                <input 
                  type="text"
                  placeholder="Cari berdasarkan nama atau no anggota..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-medium placeholder-slate-400"
                  value={simpananSearch}
                  onChange={(e) => setSimpananSearch(e.target.value)}
                />
              </div>
              <div>
                <select
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-medium cursor-pointer"
                  value={simpananTypeFilter}
                  onChange={(e) => setSimpananTypeFilter(e.target.value)}
                >
                  <option value="">Semua Jenis Simpanan</option>
                  <option value="Pokok">Simpanan Pokok</option>
                  <option value="Wajib">Simpanan Wajib</option>
                  <option value="Sukarela">Simpanan Sukarela</option>
                </select>
              </div>
            </div>

            {/* Simpanan Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
              <table className="w-full table-auto text-left text-xs text-slate-650 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-700 text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">No. Anggota</th>
                    <th className="px-4 py-3">Nama Anggota</th>
                    <th className="px-4 py-3 text-center">Jenis Simpanan</th>
                    <th className="px-4 py-3 text-right">Jumlah Setoran</th>
                    <th className="px-4 py-3 pl-6">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono text-[11px]">
                  {filteredSimpananReport.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic">Tidak ada data simpanan tercatat pada periode ini</td>
                    </tr>
                  ) : (
                    filteredSimpananReport.map((item, index) => {
                      const m = members.find(member => member.id === item.anggotaId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all duration-150">
                          <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{index + 1}</td>
                          <td className="px-4 py-2.5 text-slate-500 font-medium">{item.tanggal}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-850 dark:text-slate-200">{m?.noAnggota || "-"}</td>
                          <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-150">{m?.nama || "Unknown"}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              item.jenis === 'Pokok' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' :
                              item.jenis === 'Wajib' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                              'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-405'
                            }`}>
                              {item.jenis}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200">{formatRupiah(item.jumlah)}</td>
                          <td className="px-4 py-2.5 font-sans pl-6 italic text-slate-455 text-[10.5px]">{item.keterangan || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredSimpananReport.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right font-sans uppercase text-[10px] tracking-wider text-slate-400 font-bold">TOTAL SIMPANAN SE-PERIODE:</td>
                      <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 text-xs bg-emerald-50/20 dark:bg-emerald-900/10 font-bold">{formatRupiah(totalSimpananReportSum)}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'pinjaman' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600"/> Laporan Penyaluran Pinjaman
                </h3>
                <p className="text-xs text-slate-450 mt-0.5">Catatan penyaluran akad kredit pinjaman anggota</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button 
                  onClick={handleExportPinjamanExcel}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-green-55 hover:text-green-805 dark:hover:bg-green-905/30 dark:hover:text-green-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> Excel
                </button>
                <button 
                  onClick={handleExportPinjamanPDF}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-55 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> PDF
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative sm:col-span-2">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search className="w-4 h-4"/>
                </span>
                <input 
                  type="text"
                  placeholder="Cari berdasarkan nama atau no anggota..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-medium placeholder-slate-400"
                  value={pinjamanSearch}
                  onChange={(e) => setPinjamanSearch(e.target.value)}
                />
              </div>
              <div>
                <select
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-medium cursor-pointer"
                  value={pinjamanStatusFilter}
                  onChange={(e) => setPinjamanStatusFilter(e.target.value)}
                >
                  <option value="">Semua Status Pinjaman</option>
                  <option value="Belum Lunas">Belum Lunas</option>
                  <option value="Lunas">Lunas</option>
                </select>
              </div>
            </div>

            {/* Pinjaman Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
              <table className="w-full table-auto text-left text-xs text-slate-650 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-700 text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Tanggal Akad</th>
                    <th className="px-4 py-3">No. Anggota</th>
                    <th className="px-4 py-3 font-sans">Nama Anggota</th>
                    <th className="px-4 py-3 text-right">Nominal Pinjaman</th>
                    <th className="px-4 py-3 text-right">Potongan Provisi</th>
                    <th className="px-4 py-3 text-right">Jumlah Diterima</th>
                    <th className="px-4 py-3 text-center">Tenor</th>
                    <th className="px-4 py-3 text-right">Wajib Kembalian</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono text-[11px]">
                  {filteredPinjamanReport.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-400 italic">Tidak ada data pinjaman tercatat pada periode ini</td>
                    </tr>
                  ) : (
                    filteredPinjamanReport.map((item, index) => {
                      const m = members.find(member => member.id === item.anggotaId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all duration-150">
                          <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{index + 1}</td>
                          <td className="px-4 py-2.5 text-slate-500 font-medium">{item.tanggal}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{m?.noAnggota || "-"}</td>
                          <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-150">{m?.nama || "Unknown"}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(item.nominalPinjaman)}</td>
                          <td className="px-4 py-2.5 text-right text-rose-600 dark:text-rose-400">-{formatRupiah(item.provisiDipotong)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-emerald-800 dark:text-emerald-400">{formatRupiah(item.jumlahDiterima)}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-600 dark:text-slate-400">{item.tenor} Bln</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">{formatRupiah(item.totalWajibBayar)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              item.status === 'Lunas' 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredPinjamanReport.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-sans uppercase text-[10px] tracking-wider text-slate-400 font-bold">TOTAL PENYALURAN:</td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">{formatRupiah(pinjamanReportTotals.nominalPinjaman)}</td>
                      <td className="px-4 py-3 text-right text-rose-605 dark:text-rose-450">-{formatRupiah(pinjamanReportTotals.provisiDipotong)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">{formatRupiah(pinjamanReportTotals.jumlahDiterima)}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">{formatRupiah(pinjamanReportTotals.totalWajibBayar)}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'angsuran' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600"/> Laporan Realisasi Angsuran
                </h3>
                <p className="text-xs text-slate-450 mt-0.5">Catatan realisasi penerimaan pembayaran cicilan pinjaman anggota</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button 
                  onClick={handleExportAngsuranExcel}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-green-55 hover:text-green-805 dark:hover:bg-green-905/30 dark:hover:text-green-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> Excel
                </button>
                <button 
                  onClick={handleExportAngsuranPDF}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-55 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> PDF
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Search className="w-4 h-4"/>
              </span>
              <input 
                type="text"
                placeholder="Cari berdasarkan nama atau no anggota..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-medium placeholder-slate-400"
                value={angsuranSearch}
                onChange={(e) => setAngsuranSearch(e.target.value)}
              />
            </div>

            {/* Angsuran Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
              <table className="w-full table-auto text-left text-xs text-slate-650 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-700 text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Tanggal Bayar</th>
                    <th className="px-4 py-3">No. Anggota</th>
                    <th className="px-4 py-3">Nama Anggota</th>
                    <th className="px-4 py-3 text-center">Angsuran Ke-</th>
                    <th className="px-4 py-3 text-right">Jumlah Bayar</th>
                    <th className="px-4 py-3 pl-6">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono text-[11px]">
                  {filteredAngsuranReport.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic">Tidak ada data pembayaran angsuran tercatat pada periode ini</td>
                    </tr>
                  ) : (
                    filteredAngsuranReport.map((item, index) => {
                      const m = members.find(member => member.id === item.anggotaId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all duration-150">
                          <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{index + 1}</td>
                          <td className="px-4 py-2.5 text-slate-500 font-medium">{item.tanggal}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{m?.noAnggota || "-"}</td>
                          <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-150">{m?.nama || "Unknown"}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">Bulan Ke-{item.bulanKe}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200">{formatRupiah(item.jumlahBayar)}</td>
                          <td className="px-4 py-2.5 font-sans pl-6 italic text-slate-500 text-[10.5px]">{item.keterangan || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredAngsuranReport.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right font-sans uppercase text-[10px] tracking-wider text-slate-400 font-bold">TOTAL ANGSURAN MASUK:</td>
                      <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 text-xs bg-emerald-50/20 dark:bg-emerald-900/10 font-bold">{formatRupiah(totalAngsuranReportSum)}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
