import React, { useState, useMemo } from 'react';
import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, KoperasiSetup, Pembelian, PiutangWarung, Pengumuman } from '../types';
import { formatRupiah, terbilang } from '../utils/finance';
import { 
  Building, Users, Wallet, HandCoins, TrendingUp, Scale, 
  Shield, User, Lock, Printer, Clock, FileText, CheckCircle2, 
  AlertCircle, X, ChevronRight, Phone, MapPin, Send, HelpCircle, LogOut, Download, Menu, Megaphone, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ================= TYPES & INTERFACES =================
interface PortalKoperasiProps {
  setup: KoperasiSetup;
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  income: PendapatanLain[];
  expenses: BebanKoperasi[];
  pembelian: Pembelian[];
  piutangWarung: PiutangWarung[];
  announcements?: Pengumuman[];
  onAddMember: (newMember: Omit<Member, 'id'>) => Promise<void>;
  onVerifyMember?: (id: string) => Promise<void>;
  onLoginSuccess: (role: 'admin' | 'member', member?: Member) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export function PortalKoperasi({
  setup,
  members,
  simpanan,
  pinjaman,
  angsuran,
  income,
  expenses,
  pembelian,
  piutangWarung,
  announcements = [],
  onAddMember,
  onVerifyMember,
  onLoginSuccess,
  isDarkMode,
  setIsDarkMode
}: PortalKoperasiProps) {
  
  // Navigation states
  const [currentSection, setCurrentSection] = useState<'home' | 'profile' | 'finance' | 'register' | 'login'>('home');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  // Login Form States
  const [loginTab, setLoginTab] = useState<'admin' | 'member'>('member');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('d4n45egar');
  const [memberNo, setMemberNo] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Auto-set the first verified member as the default selected member
  React.useEffect(() => {
    const verified = members.filter(m => m.isVerified !== false);
    if (verified.length > 0 && !selectedMemberId) {
      setSelectedMemberId(verified[0].id);
    }
  }, [members, selectedMemberId]);

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  // Financial calculations derived from central state
  const finances = useMemo(() => {
    const kasAwal = setup.kasAwal ?? 0;
    const piutangAwal = setup.piutangAwal ?? 0;
    const persediaanWarungAwal = setup.persediaanWarungAwal ?? 0;
    const inventarisAwal = setup.inventarisAwal ?? 0;
    const modalAwal = setup.modalAwal ?? 0;
    const danaCadanganAwal = setup.danaCadanganAwal ?? 0;

    const totalSimpanan = simpanan.reduce((a, c) => a + c.jumlah, 0);
    const totalDisbursed = pinjaman.reduce((a, c) => a + c.nominalPinjaman, 0);
    const totalAngsuran = angsuran.reduce((a, c) => a + c.jumlahBayar, 0);
    const totalInc = income.reduce((a, c) => a + c.nominal, 0);
    const totalExp = expenses.reduce((a, c) => a + c.nominal, 0);
    const totalPembelian = pembelian.reduce((a, c) => a + c.totalHarga, 0);
    const totalHutangWarung = piutangWarung.filter(pw => pw.jenis === 'hutang_baru').reduce((a, c) => a + c.nominal, 0);
    const totalPelunasanWarung = piutangWarung.filter(pw => pw.jenis === 'pelunasan').reduce((a, c) => a + c.nominal, 0);

    // Kas Akhir
    const kasAkhir = kasAwal + totalSimpanan + totalAngsuran + totalInc + totalPelunasanWarung - totalDisbursed - totalExp - totalPembelian - totalHutangWarung;

    // Outstanding Loan Receivables (Piutang)
    const piutangBeredar = piutangAwal + pinjaman.reduce((acc, p) => {
      const repays = angsuran.filter(a => a.pinjamanId === p.id);
      const principalCollected = repays.reduce((a, c) => a + p.angsuranPokokPerBulan, 0);
      const remaining = p.status === 'Belum Lunas' ? (p.nominalPinjaman - principalCollected) : 0;
      return acc + Math.max(0, remaining);
    }, 0);

    const persediaanWarung = persediaanWarungAwal + pembelian.filter(p => p.kategori === 'persediaan_warung').reduce((a, c) => a + c.totalHarga, 0);
    const inventaris = inventarisAwal + pembelian.filter(p => p.kategori === 'inventaris').reduce((a, c) => a + c.totalHarga, 0);
    const piutangWarungVal = totalHutangWarung - totalPelunasanWarung;

    // Total Assets
    const totalAssets = kasAkhir + piutangBeredar + persediaanWarung + inventaris + piutangWarungVal;

    // Profit & Loss details (Laba Rugi)
    const pToko = income.filter(i => i.sumber === 'warung').reduce((a, c) => a + c.nominal, 0);
    const pBungaBank = income.filter(i => i.sumber === 'bunga_simpanan').reduce((a, c) => a + c.nominal, 0);
    const pDenda = income.filter(i => i.sumber === 'denda').reduce((a, c) => a + c.nominal, 0);
    const pLain = income.filter(i => i.sumber === 'lain_lain').reduce((a, c) => a + c.nominal, 0);
    const pProvisi = pinjaman.reduce((a, c) => a + c.provisiDipotong, 0);
    const pJasaBunga = angsuran.reduce((acc, a) => {
      const matchP = pinjaman.find(p => p.id === a.pinjamanId);
      return acc + (matchP ? matchP.jasaPerBulan : 0);
    }, 0);

    const totalRevenue = pToko + pBungaBank + pDenda + pLain + pProvisi + pJasaBunga;

    const bGajiKaryawan = expenses.filter(e => e.kategori === 'gaji_karyawan').reduce((a, c) => a + c.nominal, 0);
    const bListrik = expenses.filter(e => e.kategori === 'listrik').reduce((a, c) => a + c.nominal, 0);
    const bGajiPengurus = expenses.filter(e => e.kategori === 'gaji_pengurus').reduce((a, c) => a + c.nominal, 0);
    const bGajiPengawas = expenses.filter(e => e.kategori === 'gaji_pengawas').reduce((a, c) => a + c.nominal, 0);
    const bOperasional = expenses.filter(e => e.kategori === 'operasional_kantor').reduce((a, c) => a + c.nominal, 0);
    const bLain = expenses.filter(e => e.kategori === 'beban_lain').reduce((a, c) => a + c.nominal, 0);

    const totalExpenses = bGajiKaryawan + bListrik + bGajiPengurus + bGajiPengawas + bOperasional + bLain;
    const netProfit = totalRevenue - totalExpenses;

    const sPokok = simpanan.filter(s => s.jenis === 'Pokok').reduce((a, c) => a + c.jumlah, 0);
    const sWajib = simpanan.filter(s => s.jenis === 'Wajib').reduce((a, c) => a + c.jumlah, 0);
    const sSukarela = simpanan.filter(s => s.jenis === 'Sukarela').reduce((a, c) => a + c.jumlah, 0);

    return {
      kasAkhir,
      piutangBeredar,
      persediaanWarung,
      inventaris,
      piutangWarungVal,
      totalAssets,
      totalSimpanan,
      sPokok,
      sWajib,
      sSukarela,
      pToko,
      pBungaBank,
      pDenda,
      pLain,
      pProvisi,
      pJasaBunga,
      totalRevenue,
      bGajiKaryawan,
      bListrik,
      bGajiPengurus,
      bGajiPengawas,
      bOperasional,
      bLain,
      totalExpenses,
      netProfit,
      activeMembersCount: members.filter(m => m.isVerified !== false).length,
      pendingMembersCount: members.filter(m => m.isVerified === false).length
    };
  }, [setup, members, simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung]);

  const activeAnnouncements = useMemo(() => {
    return announcements.filter(a => a.status === 'Aktif');
  }, [announcements]);

  // Handle new member self-registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regAddress.trim() || !regPhone.trim()) {
      setRegError('Semua kolom registrasi harus diisi!');
      return;
    }

    setIsSubmittingReg(true);
    setRegError('');
    try {
      const rawReg = {
        noAnggota: 'MENUNGGU VERIFIKASI',
        nama: regName.trim(),
        alamat: regAddress.trim(),
        noHp: regPhone.trim(),
        tanggalBergabung: new Date().toLocaleDateString('id-ID'),
        jenisKelamin: regGender,
        isVerified: false
      };
      await onAddMember(rawReg);
      setRegSuccess(true);
      setRegName('');
      setRegAddress('');
      setRegPhone('');
      setRegGender('Laki-laki');
    } catch (err: any) {
      setRegError('Terjadi kesalahan saat menyimpan data pendaftaran.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Handle member/admin login submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    setTimeout(() => {
      if (loginTab === 'admin') {
        if (adminUsername.trim().toLowerCase() === 'admin' && adminPassword === 'd4n45egar') {
          onLoginSuccess('admin');
        } else {
          setLoginError('Kredensial Pengurus salah. Gunakan Username: admin & Password: d4n45egar.');
        }
      } else {
        const cleanedPhone = memberPhone.replace(/[^0-9]/g, '');
        const found = members.find(m => {
          const matchNo = m.noAnggota.trim().toLowerCase() === memberNo.trim().toLowerCase();
          const matchPhone = m.noHp.replace(/[^0-9]/g, '') === cleanedPhone;
          return matchNo && matchPhone && m.isVerified !== false;
        });

        if (found) {
          onLoginSuccess('member', found);
        } else {
          setLoginError('Kombinasi Nomor Anggota & Nomor HP salah, atau status keanggotaan Anda belum diverifikasi oleh pengurus!');
        }
      }
      setIsLoggingIn(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans flex flex-col">
      
      {/* ================= WEBSITE HEADER ================= */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentSection('home')}>
            <div className="w-10 h-10 bg-emerald-600 dark:bg-emerald-500 rounded-xl flex items-center justify-center font-bold text-white shadow-sm overflow-hidden shrink-0 text-lg">
              {setup.logoUrl && setup.logoUrl.startsWith('data:image') ? (
                <img src={setup.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                setup.logoUrl || '🌱'
              )}
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                {setup.namaKoperasi || "Koperasi Dana Segar"}
              </h1>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest leading-none mt-0.5">
                {setup.slogan || "Maju Bersama"}
              </p>
            </div>
          </div>
 
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button 
              onClick={() => setCurrentSection('home')}
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition py-1 cursor-pointer ${currentSection === 'home' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold' : ''}`}
            >
              Beranda
            </button>
            <button 
              onClick={() => setCurrentSection('profile')}
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition py-1 cursor-pointer ${currentSection === 'profile' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold' : ''}`}
            >
              Profil & Visi Misi
            </button>
            <button 
              onClick={() => setCurrentSection('finance')}
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition py-1 cursor-pointer ${currentSection === 'finance' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold' : ''}`}
            >
              Ikhtisar & Laba Rugi
            </button>
            <button 
              onClick={() => setCurrentSection('register')}
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition py-1 cursor-pointer ${currentSection === 'register' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold' : ''}`}
            >
              Pendaftaran Anggota
            </button>
          </nav>
 
          {/* Dark Mode & CTA Portal Login (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Ganti Tema Visual"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            
            <button
              onClick={() => setCurrentSection('login')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Login Portal</span>
            </button>
          </div>
 
          {/* Hamburger button on Mobile */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Ganti Tema"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="p-2 rounded-xl text-slate-750 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center"
              title="Menu Navigasi"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-4 py-4 space-y-1.5 flex flex-col font-sans shrink-0 overflow-hidden"
          >
            <button 
              onClick={() => { setCurrentSection('home'); setIsMobileNavOpen(false); }}
              className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${currentSection === 'home' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Beranda
            </button>
            <button 
              onClick={() => { setCurrentSection('profile'); setIsMobileNavOpen(false); }}
              className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${currentSection === 'profile' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Profil & Visi Misi
            </button>
            <button 
              onClick={() => { setCurrentSection('finance'); setIsMobileNavOpen(false); }}
              className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${currentSection === 'finance' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Ikhtisar & Laba Rugi
            </button>
            <button 
              onClick={() => { setCurrentSection('register'); setIsMobileNavOpen(false); }}
              className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${currentSection === 'register' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Pendaftaran Anggota
            </button>
            <div className="pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => { setCurrentSection('login'); setIsMobileNavOpen(false); }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Masuk Login Portal</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= WEBSITE CONTENT BODY ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <AnimatePresence mode="wait">
          
          {/* 1. HOME / LANDING VIEW */}
          {currentSection === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-12"
            >
              {/* Hero Banner Grid */}
              <div className="flex flex-col gap-8 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10" />
                
                <div className="space-y-6 max-w-4xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-100 dark:border-emerald-900">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Portal Resmi Koperasi Digital
                  </span>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-50 tracking-tight leading-tight font-sans">
                    Solusi Keuangan Gotong Royong yang <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 rounded-lg">Amanah & Modern</span>
                  </h2>
                  <p className="text-slate-550 dark:text-slate-350 text-sm leading-relaxed whitespace-pre-line">
                    {setup.kataPembuka || `Selamat datang di website resmi Koperasi ${setup.namaKoperasi || "Dana Segar"}. Kami memadukan prinsip luhur kekeluargaan dengan teknologi digital terintegrasi untuk mendukung kesejahteraan seluruh anggota dan kemandirian usaha komunitas.`}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button 
                      onClick={() => setCurrentSection('register')}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Gabung Anggota Sekarang</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCurrentSection('finance')}
                      className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Scale className="w-4 h-4" />
                      <span>Lihat Transparansi Laporan</span>
                    </button>
                  </div>
                </div>

                {/* Cooperative Quick Stats Card */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full pt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1.5">
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 rounded-xl w-10 h-10 flex items-center justify-center mx-auto">
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Anggota Aktif</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-150 font-sans">{finances.activeMembersCount} Orang</p>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1.5">
                    <div className="p-2.5 bg-indigo-105 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-xl w-10 h-10 flex items-center justify-center mx-auto">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dana Simpanan</p>
                    <p className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-150 font-sans truncate">{formatRupiah(finances.totalSimpanan)}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1.5">
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-xl w-10 h-10 flex items-center justify-center mx-auto">
                      <HandCoins className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kredit Beredar</p>
                    <p className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-150 font-sans truncate">{formatRupiah(finances.piutangBeredar)}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1.5">
                    <div className="p-2.5 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 rounded-xl w-10 h-10 flex items-center justify-center mx-auto">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SHU Berjalan</p>
                    <p className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-150 font-sans truncate">{formatRupiah(finances.netProfit)}</p>
                  </div>
                </div>
              </div>

              {/* 📢 BULLETIN BOARD: ANNOUNCEMENTS */}
              {activeAnnouncements.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <Megaphone className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        Pengumuman Resmi Koperasi
                      </h3>
                      <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
                        Informasi dan instruksi terbaru dari pengurus {setup.namaKoperasi || "Koperasi Dana Segar"}.
                      </p>
                    </div>
                  </div>

                  {/* 📢 TEKS BERJALAN (MARQUEE) */}
                  <div className="bg-white/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl p-3 flex items-center gap-3 overflow-hidden shadow-xs">
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

              {/* Visi Misi & Overview Snippet */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-xs">
                  <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Profil Koperasi
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Didirikan dengan tujuan menyejahterakan anggota, kami senantiasa menjaga kepatuhan legalitas dengan nomor badan hukum resmi dan prinsip pelaporan terbuka.
                  </p>
                  <button onClick={() => setCurrentSection('profile')} className="text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                    Baca selengkapnya &rarr;
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-xs">
                  <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Laporan Transparan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Setiap sen dana dipertanggungjawabkan dalam neraca real-time. Kami percaya bahwa transparansi adalah kunci utama kepercayaan anggota koperasi.
                  </p>
                  <button onClick={() => setCurrentSection('finance')} className="text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                    Buka laporan berkala &rarr;
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-xs">
                  <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Pendaftaran Mudah
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Daftarkan diri Anda secara online untuk ditinjau oleh pengurus. Nikmati berbagai manfaat simpanan berkeadilan dan pembiayaan bunga ringan.
                  </p>
                  <button onClick={() => setCurrentSection('register')} className="text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                    Isi formulir online &rarr;
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. PROFILE VIEW */}
          {currentSection === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-50 tracking-tight">Profil & Visi Misi Koperasi</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Mengenal lebih dekat identitas luhur dan landasan dasar koperasi kami.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* Identity table */}
                  <div className="space-y-5 bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-900">
                    <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400 border-b pb-2 uppercase tracking-wider">Identitas Hukum</h4>
                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between border-b pb-1.5 border-dashed">
                        <span className="text-slate-400">Nama Resmi</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{setup.namaKoperasi || "Koperasi Dana Segar"}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-dashed">
                        <span className="text-slate-400">Slogan</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-150 italic">"{setup.slogan}"</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-dashed">
                        <span className="text-slate-400">No. Badan Hukum</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{setup.noBadanHukum || "Dalam Pengajuan"}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-dashed">
                        <span className="text-slate-400">Alamat Kantor</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-150 max-w-[220px] text-right truncate" title={setup.alamatKantor}>{setup.alamatKantor}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-dashed">
                        <span className="text-slate-400">Suku Bunga Akad</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{setup.jenisBungaPinjaman} (Flat)</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-slate-400">Biaya Administrasi</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">{setup.biayaProvisiPersen}% Provisi</span>
                      </div>
                    </div>
                  </div>

                  {/* Visi Misi */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-emerald-600 rounded" />
                        VISI UTAMA KOPERASI
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-3.5 italic whitespace-pre-line">
                        "{setup.visi || "Menjadi lembaga keuangan mikro koperasi terpercaya, mandiri, unggul dalam pelayanan, dan berorientasi penuh pada pemberdayaan potensi ekonomi seluruh anggota koperasi."}"
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-emerald-600 rounded" />
                        MISI KERJA KOPERASI
                      </h4>
                      <ul className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-3.5 space-y-2 list-decimal">
                        {setup.misi && setup.misi.length > 0 ? (
                          setup.misi.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))
                        ) : (
                          <>
                            <li>Memberikan pelayanan prima di bidang tabungan berkeadilan serta kredit berbunga ringan secara cepat dan transparan.</li>
                            <li>Menumbuhkan budaya hemat melestarikan tabungan masyarakat guna memperkuat ketahanan modal internal.</li>
                            <li>Menjunjung tinggi azas mufakat gotong royong, transparansi pelaporan, serta kepatuhan penuh terhadap undang-undang koperasi.</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. FINANCE & LABA RUGI OVERVIEW */}
          {currentSection === 'finance' && (
            <motion.div 
              key="finance"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              
              {/* Ikhtisar Keuangan Mini Dashboard */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-50 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-emerald-600" />
                    Ikhtisar Posisi Keuangan Koperasi (Neraca Ringkas)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Menunjukkan posisi saldo kas, piutang kredit anggota, dan simpanan modal terhimpun secara real-time.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-sans">
                  
                  <div className="p-4 border rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border-slate-150 dark:border-slate-850">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saldo Kas Akhir</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{formatRupiah(finances.kasAkhir)}</p>
                    <p className="text-[9px] text-slate-400 mt-1">Kas riil siap disalurkan</p>
                  </div>

                  <div className="p-4 border rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border-slate-150 dark:border-slate-850">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Piutang Kredit Anggota</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-indigo-650 dark:text-indigo-400 mt-1">{formatRupiah(finances.piutangBeredar)}</p>
                    <p className="text-[9px] text-slate-400 mt-1">Sisa pokok pinjaman berjalan</p>
                  </div>

                  <div className="p-4 border rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border-slate-150 dark:border-slate-850">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aset Warung & Inventaris</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-slate-700 dark:text-slate-300 mt-1">{formatRupiah(finances.persediaanWarung + finances.inventaris + finances.piutangWarungVal)}</p>
                    <p className="text-[9px] text-slate-400 mt-1">Aset fisik dan warung berjalan</p>
                  </div>

                  <div className="p-4 border rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border-slate-150 dark:border-slate-850">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Aset Koperasi</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-teal-650 dark:text-teal-400 mt-1">{formatRupiah(finances.totalAssets)}</p>
                    <p className="text-[9px] text-slate-455 mt-1 font-semibold text-emerald-600">Sama dengan Pasiva (Balanced)</p>
                  </div>
                </div>
              </div>

              {/* Laporan Laba Rugi Real-Time */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-50 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      Laporan Perhitungan Sisa Hasil Usaha (Laba Rugi)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Perhitungan pendapatan operasional dikurangi beban operasional berjalan secara real-time.</p>
                  </div>
                  <span className="text-[10px] font-bold font-mono bg-emerald-50 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900">
                    SISA HASIL USAHA (SHU)
                  </span>
                </div>

                <div className="max-w-3xl mx-auto space-y-5 font-mono text-xs">
                  
                  {/* Pendapatan */}
                  <div className="space-y-2">
                    <h4 className="font-sans font-bold border-b text-teal-600 dark:text-teal-400 text-[10px] pb-1 uppercase tracking-wider">I. PENDAPATAN OPERASIONAL</h4>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[+] Laba Bersih Sembako & Warung</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pToko)}</span>
                    </div>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[+] Pendapatan Biaya Provisi Akad (1%)</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pProvisi)}</span>
                    </div>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[+] Pendapatan Jasa Bunga Akad</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pJasaBunga)}</span>
                    </div>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[+] Denda Keterlambatan Anggota</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pDenda)}</span>
                    </div>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[+] Pendapatan Simpanan Bank</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pBungaBank)}</span>
                    </div>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[+] Hasil Sukarela & Pendapatan Lain</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pLain)}</span>
                    </div>
                    <div className="flex justify-between bg-teal-50/50 dark:bg-teal-950/20 border-y py-2 px-3 font-bold text-teal-800 dark:text-teal-350">
                      <span>TOTAL REVENUE PENDAPATAN (A)</span>
                      <span>{formatRupiah(finances.totalRevenue)}</span>
                    </div>
                  </div>

                  {/* Beban */}
                  <div className="space-y-2">
                    <h4 className="font-sans font-bold border-b text-rose-600 dark:text-rose-450 text-[10px] pb-1 uppercase tracking-wider">II. BEBAN OPERASIONAL KANTOR</h4>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[-] Beban Gaji Karyawan & Staff Toko</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bGajiKaryawan)}</span>
                    </div>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[-] Beban Rekening Listrik, Air & Internet</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bListrik)}</span>
                    </div>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[-] Insentif Honorarium Pengurus Koperasi</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bGajiPengurus)}</span>
                    </div>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[-] Insentif Honorarium Pengawas</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bGajiPengawas)}</span>
                    </div>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[-] Beban ATK, Cetak & Operasional</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bOperasional)}</span>
                    </div>
                    <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <span>[-] Beban Pengeluaran Lain-lain</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bLain)}</span>
                    </div>
                    <div className="flex justify-between bg-rose-50/50 dark:bg-rose-950/20 border-y py-2 px-3 font-bold text-rose-800 dark:text-rose-350">
                      <span>TOTAL EXPENSES BEBAN OPERASIONAL (B)</span>
                      <span>{formatRupiah(finances.totalExpenses)}</span>
                    </div>
                  </div>

                  {/* Sisa Hasil Usaha */}
                  <div className="pt-3 border-t-2 border-double border-slate-300 dark:border-slate-700">
                    <div className="flex justify-between items-center bg-emerald-600 dark:bg-emerald-900 text-white rounded-xl py-3 px-4 text-sm font-bold">
                      <span className="font-sans text-[11px] tracking-wider uppercase">SISA HASIL USAHA BERJALAN (SHU BERSIH = A - B)</span>
                      <span className="font-mono text-base">{formatRupiah(finances.netProfit)}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 italic text-right font-sans">
                      Terbilang: {terbilang(Math.max(0, finances.netProfit))} Rupiah
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 4. MEMBER REGISTRATION FORM */}
          {currentSection === 'register' && (
            <motion.div 
              key="register"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-50 tracking-tight flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    Formulir Pendaftaran Anggota Baru
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Lengkapi data diri Anda untuk mendaftar sebagai anggota koperasi digital.</p>
                </div>

                {regSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-150 dark:border-emerald-900 rounded-xl space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm">Pendaftaran Sukses Dikirim!</h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                          Terima kasih! Formulir pendaftaran Anda telah berhasil disimpan di dalam database koperasi. Status pendaftaran Anda saat ini adalah **Menunggu Verifikasi (Pending)**.
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2 leading-relaxed font-semibold">
                          Langkah Selanjutnya: Silakan hubungi pengurus koperasi di kantor atau melalui WhatsApp untuk verifikasi berkas dan penerbitan Nomor Anggota resmi Anda agar dapat login ke sistem.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setRegSuccess(false);
                        setCurrentSection('home');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Kembali ke Beranda
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">NAMA LENGKAP PENDAFTAR</label>
                      <input 
                        type="text"
                        required
                        placeholder="Masukkan nama lengkap Anda..."
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">JENIS KELAMIN</label>
                      <select 
                        required
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value as 'Laki-laki' | 'Perempuan')}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition text-slate-800 dark:text-slate-200"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">ALAMAT LENGKAP DOMISILI</label>
                      <textarea 
                        required
                        rows={3}
                        placeholder="Masukkan alamat rumah lengkap Anda..."
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">NOMOR HP / WHATSAPP AKTIF</label>
                      <input 
                        type="tel"
                        required
                        placeholder="Contoh: 081234567890"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                      />
                    </div>

                    {regError && (
                      <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900">
                        ⚠️ {regError}
                      </p>
                    )}

                    <div className="flex gap-2.5 pt-2">
                      <button 
                        type="button"
                        onClick={() => setCurrentSection('home')}
                        className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmittingReg}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingReg ? 'Menyimpan...' : 'Kirim Formulir Pendaftaran'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          )}

          {/* 5. USER TABBED LOGIN PORTAL */}
          {currentSection === 'login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-colors duration-300">
                <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 p-6 text-center text-white">
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">
                      🔑
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight">Portal Keamanan Koperasi</h3>
                  <p className="text-[10px] text-emerald-300 font-medium uppercase tracking-widest mt-0.5">Secure Authentication Gate</p>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  
                  {/* Role tab selector */}
                  <div className="grid grid-cols-2 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-150 dark:border-slate-850">
                    <button
                      onClick={() => {
                        setLoginTab('member');
                        setLoginError('');
                      }}
                      className={`py-2 text-center text-xs font-bold rounded-lg transition cursor-pointer ${loginTab === 'member' ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-750' : 'text-slate-450 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                      Anggota Koperasi
                    </button>
                    <button
                      onClick={() => {
                        setLoginTab('admin');
                        setLoginError('');
                      }}
                      className={`py-2 text-center text-xs font-bold rounded-lg transition cursor-pointer ${loginTab === 'admin' ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-750' : 'text-slate-450 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                      Pengurus (Admin)
                    </button>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    
                    {/* ADMIN LOGIN */}
                    {loginTab === 'admin' ? (
                      <div className="space-y-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[11px] p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/60 leading-relaxed">
                          <p className="font-bold text-emerald-900 dark:text-emerald-200">Kredensial Pengurus (Admin):</p>
                          <p className="mt-1 opacity-90 text-xs">Masukkan Username dan Kata Sandi Pengurus untuk mengakses panel administrasi penuh koperasi.</p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-600" /> USERNAME PENGURUS
                          </label>
                          <input 
                            type="text"
                            required
                            value={adminUsername}
                            onChange={(e) => setAdminUsername(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                            placeholder="Username admin"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-600" /> KATA SANDI
                          </label>
                          <input 
                            type="password"
                            required
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                            placeholder="Kata sandi admin"
                          />
                        </div>
                      </div>
                    ) : (
                      /* MEMBER LOGIN */
                      <div className="space-y-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[11px] p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/60 leading-relaxed">
                          <p className="font-bold text-emerald-900 dark:text-emerald-200">Autentikasi Anggota Resmi:</p>
                          <p className="mt-1 opacity-90 text-xs">Gunakan **Nomor Anggota** resmi Anda (misal: AG001) dan **Nomor Handphone** terdaftar sebagai kata sandi pembuka untuk masuk.</p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-600" /> NOMOR ANGGOTA KOPERASI
                          </label>
                          <input 
                            type="text"
                            required
                            placeholder="Contoh: AG001"
                            value={memberNo}
                            onChange={(e) => setMemberNo(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" /> NOMOR HANDPHONE (SEBAGAI SANDI)
                          </label>
                          <input 
                            type="password"
                            required
                            placeholder="Masukkan nomor HP terdaftar Anda"
                            value={memberPhone}
                            onChange={(e) => setMemberPhone(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                          />
                        </div>
                      </div>
                    )}

                    {loginError && (
                      <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900 font-medium">
                        ⚠️ {loginError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoggingIn ? 'Memvalidasi...' : 'Masuk ke Sistem Aplikasi'}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ================= WEBSITE FOOTER ================= */}
      <footer className="bg-slate-100 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-900 py-6 text-center text-[10px] text-slate-400 dark:text-slate-500 shrink-0 select-none">
        <p className="font-semibold">{setup.namaKoperasi || "Koperasi Dana Segar"}</p>
        <p className="mt-1">Kantor: {setup.alamatKantor}</p>
        <p className="mt-0.5 opacity-75">Badan Hukum: {setup.noBadanHukum || "-"}</p>
        <p className="mt-2 text-[9px] opacity-60">&copy; {new Date().getFullYear()} Sistem Informasi Koperasi Berkeadilan. All rights reserved.</p>
      </footer>
    </div>
  );
}


// ==========================================================
// ==================== MEMBER CABINET VIEW =================
// ==========================================================
interface MemberDashboardViewProps {
  member: Member;
  setup: KoperasiSetup;
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  announcements?: Pengumuman[];
  onLogout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export function MemberDashboardView({
  member,
  setup,
  members,
  simpanan,
  pinjaman,
  angsuran,
  announcements = [],
  onLogout,
  isDarkMode,
  setIsDarkMode
}: MemberDashboardViewProps) {
  
  const [activeTab, setActiveTab] = useState<'overview' | 'nominatif' | 'ledger'>('overview');
  
  const activeAnnouncements = useMemo(() => {
    return announcements.filter(a => a.status === 'Aktif');
  }, [announcements]);
  
  // States for Print Account Statement / Rekening Koran Modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filter personal data
  const mySimpanan = useMemo(() => {
    return simpanan.filter(s => s.anggotaId === member.id);
  }, [simpanan, member]);

  const myPinjaman = useMemo(() => {
    return pinjaman.filter(p => p.anggotaId === member.id);
  }, [pinjaman, member]);

  const myAngsuran = useMemo(() => {
    return angsuran.filter(a => a.anggotaId === member.id);
  }, [angsuran, member]);

  // Personal Totals
  const totals = useMemo(() => {
    const sPokok = mySimpanan.filter(s => s.jenis === 'Pokok').reduce((a, c) => a + c.jumlah, 0);
    const sWajib = mySimpanan.filter(s => s.jenis === 'Wajib').reduce((a, c) => a + c.jumlah, 0);
    const sSukarela = mySimpanan.filter(s => s.jenis === 'Sukarela').reduce((a, c) => a + c.jumlah, 0);
    const totalS = sPokok + sWajib + sSukarela;

    // Loan stats
    const totalLoans = myPinjaman.reduce((a, p) => a + p.nominalPinjaman, 0);
    const totalWajibBayar = myPinjaman.reduce((a, p) => a + p.totalWajibBayar, 0);
    const totalPaid = myAngsuran.reduce((a, ans) => a + ans.jumlahBayar, 0);
    const remainingLoanDebt = Math.max(0, totalWajibBayar - totalPaid);

    return {
      sPokok, sWajib, sSukarela, totalS,
      totalLoans, totalPaid, remainingLoanDebt,
      loansCount: myPinjaman.length,
      paidCount: myAngsuran.length
    };
  }, [mySimpanan, myPinjaman, myAngsuran]);

  // Calculate cooperative total statistics (overview for transparency)
  const coopOverview = useMemo(() => {
    const totalSimpananAll = simpanan.reduce((a, c) => a + c.jumlah, 0);
    const totalLoansAll = pinjaman.reduce((a, c) => a + c.nominalPinjaman, 0);
    const totalPaidAll = angsuran.reduce((a, c) => a + c.jumlahBayar, 0);
    
    // Outstanding credit principal remaining
    const outstandingPrincipalAll = pinjaman.reduce((acc, p) => {
      const repays = angsuran.filter(a => a.pinjamanId === p.id);
      const principalPaid = repays.reduce((sum, c) => sum + p.angsuranPokokPerBulan, 0);
      const rem = p.status === 'Belum Lunas' ? (p.nominalPinjaman - principalPaid) : 0;
      return acc + Math.max(0, rem);
    }, 0);

    return {
      totalSimpananAll,
      outstandingPrincipalAll,
      activeMembersCount: members.filter(m => m.isVerified !== false).length
    };
  }, [simpanan, pinjaman, angsuran, members]);

  // Generate nominative list of other members' total savings (with transparency)
  const nominatifList = useMemo(() => {
    return members.filter(m => m.isVerified !== false).map(m => {
      const relatedS = simpanan.filter(s => s.anggotaId === m.id);
      const sPokok = relatedS.filter(s => s.jenis === 'Pokok').reduce((a, c) => a + c.jumlah, 0);
      const sWajib = relatedS.filter(s => s.jenis === 'Wajib').reduce((a, c) => a + c.jumlah, 0);
      const sSukarela = relatedS.filter(s => s.jenis === 'Sukarela').reduce((a, c) => a + c.jumlah, 0);
      const total = sPokok + sWajib + sSukarela;
      return {
        id: m.id,
        noAnggota: m.noAnggota,
        nama: m.nama,
        jenisKelamin: m.jenisKelamin,
        sPokok,
        sWajib,
        sSukarela,
        total
      };
    }).sort((a, b) => b.total - a.total);
  }, [members, simpanan]);

  // Print function for Member Statement (Koran Account Statement)
  const handlePrintStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const kopName = setup.namaKoperasi || "Koperasi Dana Segar";
    const bhStr = setup.noBadanHukum ? `BH: ${setup.noBadanHukum}` : '';

    const savingRows = mySimpanan.map(s => `
      <tr>
        <td style="padding: 6px; font-size: 11px;">${s.tanggal}</td>
        <td style="padding: 6px; font-size: 11px; font-family: monospace;">${s.transaksiId || 'TRX-S' + s.id.substring(0,6).toUpperCase()}</td>
        <td style="padding: 6px; font-size: 11px;">Simpanan ${s.jenis}</td>
        <td style="padding: 6px; font-size: 11px; text-align: right; font-family: monospace;">${formatRupiah(s.jumlah)}</td>
        <td style="padding: 6px; font-size: 11px;">${s.keterangan || '-'}</td>
      </tr>
    `).join('');

    const loanRows = myPinjaman.map(p => {
      const repays = myAngsuran.filter(a => a.pinjamanId === p.id);
      const paidAmt = repays.reduce((sum, c) => sum + c.jumlahBayar, 0);
      return `
        <tr>
          <td style="padding: 6px; font-size: 11px;">${p.tanggal}</td>
          <td style="padding: 6px; font-size: 11px; font-family: monospace;">CTR-${p.id.substring(0,8).toUpperCase()}</td>
          <td style="padding: 6px; font-size: 11px;">Pinjaman Tenor ${p.tenor} Bln</td>
          <td style="padding: 6px; font-size: 11px; text-align: right; font-family: monospace;">${formatRupiah(p.nominalPinjaman)}</td>
          <td style="padding: 6px; font-size: 11px; text-align: right; font-family: monospace;">${formatRupiah(p.totalWajibBayar)}</td>
          <td style="padding: 6px; font-size: 11px; text-align: right; font-family: monospace;">${formatRupiah(paidAmt)}</td>
          <td style="padding: 6px; font-size: 11px; font-weight: bold;">${p.status}</td>
        </tr>
      `;
    }).join('');

    const installmentRows = myAngsuran.map(a => `
      <tr>
        <td style="padding: 6px; font-size: 11px;">${a.tanggal}</td>
        <td style="padding: 6px; font-size: 11px; font-family: monospace;">TRX-${a.id.substring(0,8).toUpperCase()}</td>
        <td style="padding: 6px; font-size: 11px;">Angsuran Ke-${a.bulanKe}</td>
        <td style="padding: 6px; font-size: 11px; text-align: right; font-family: monospace;">${formatRupiah(a.jumlahBayar)}</td>
        <td style="padding: 6px; font-size: 11px;">${a.keterangan || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Buku Ledger Anggota - ${member.nama}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 30px; color: #1e293b; }
            .header { text-align: center; border-b: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .coop-title { font-size: 18px; font-weight: bold; margin: 0; }
            .coop-subtitle { font-size: 11px; margin: 3px 0 0 0; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 4px; font-size: 11px; }
            .ledger-section-title { font-size: 12px; font-weight: bold; margin: 15px 0 6px 0; border-bottom: 1px double #000; padding-bottom: 3px; }
            .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .data-table th { background-color: #f1f5f9; padding: 6px; font-size: 11px; text-align: left; border-bottom: 1px solid #000; }
            .data-table td { border-bottom: 1px dashed #e2e8f0; }
            .totals-box { margin-top: 15px; background-color: #fafafa; padding: 10px; border: 1px solid #ddd; font-size: 11px; }
            .footer-sign { width: 100%; margin-top: 50px; text-align: right; font-size: 11px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <h1 class="coop-title">${kopName}</h1>
            <p class="coop-subtitle">${setup.slogan} | ${setup.alamatKantor}</p>
            <p style="font-size: 10px; font-weight: bold; margin: 4px 0 0 0;">${bhStr}</p>
          </div>

          <h3 style="text-align: center; margin: 0 0 20px 0; font-size: 14px; text-decoration: underline;">BUKU LEDGER REKENING ANGGOTA</h3>

          <table class="info-table">
            <tr>
              <td width="20%">No. Anggota:</td>
              <td width="30%"><b>${member.noAnggota}</b></td>
              <td width="20%">Tanggal Gabung:</td>
              <td width="30%"><b>${member.tanggalBergabung}</b></td>
            </tr>
            <tr>
              <td>Nama Anggota:</td>
              <td><b>${member.nama}</b></td>
              <td>Nomor Handphone:</td>
              <td><b>${member.noHp}</b></td>
            </tr>
            <tr>
              <td>Alamat:</td>
              <td colspan="3"><b>${member.alamat}</b></td>
            </tr>
          </table>

          <div class="ledger-section-title">I. RIWAYAT SALDO SIMPANAN (POKOK, WAJIB, SUKARELA)</div>
          <table class="data-table">
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="20%">No. Transaksi</th>
                <th width="25%">Jenis Simpanan</th>
                <th width="20%" style="text-align: right;">Jumlah</th>
                <th width="20%">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${savingRows || '<tr><td colspan="5" style="text-align: center; padding: 10px;">Belum ada riwayat transaksi simpanan</td></tr>'}
            </tbody>
          </table>

          <div class="ledger-section-title">II. DAFTAR KONTRAK PINJAMAN AKTIF</div>
          <table class="data-table">
            <thead>
              <tr>
                <th width="12%">Realisasi</th>
                <th width="15%">No. Kontrak</th>
                <th width="18%">Deskripsi</th>
                <th width="15%" style="text-align: right;">Pencairan</th>
                <th width="15%" style="text-align: right;">Wajib Bayar</th>
                <th width="15%" style="text-align: right;">Total Bayar</th>
                <th width="10%">Status</th>
              </tr>
            </thead>
            <tbody>
              ${loanRows || '<tr><td colspan="7" style="text-align: center; padding: 10px;">Belum ada kontrak pinjaman aktif</td></tr>'}
            </tbody>
          </table>

          <div class="ledger-section-title">III. RIWAYAT BAYAR ANGSURAN PINJAMAN</div>
          <table class="data-table">
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="20%">No. Transaksi</th>
                <th width="25%">Angsuran Periode</th>
                <th width="20%" style="text-align: right;">Jumlah Bayar</th>
                <th width="20%">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${installmentRows || '<tr><td colspan="5" style="text-align: center; padding: 10px;">Belum ada riwayat bayar angsuran</td></tr>'}
            </tbody>
          </table>

          <div class="totals-box">
            <b>RINGKASAN SALDO BERJALAN SAYA:</b><br/>
            - Total Saldo Simpanan Pokok: ${formatRupiah(totals.sPokok)}<br/>
            - Total Saldo Simpanan Wajib: ${formatRupiah(totals.sWajib)}<br/>
            - Total Saldo Simpanan Sukarela: ${formatRupiah(totals.sSukarela)}<br/>
            - <b>TOTAL AKUMULASI SIMPANAN: ${formatRupiah(totals.totalS)}</b><br/>
            --------------------------------------------------------<br/>
            - Total Sisa Hutang Pinjaman (Kewajiban): <b>${formatRupiah(totals.remainingLoanDebt)}</b>
          </div>

          <div class="footer-sign">
            <p>Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p>Petugas Administrasi Koperasi</p>
            <br/><br/><br/>
            <p><b>( ____________________________ )</b></p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans flex flex-col">
      
      {/* Member Cabinet Header */}
      <header className="sticky top-0 z-40 bg-emerald-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-lg select-none shadow">
              🌱
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base leading-tight">Portal Anggota Koperasi</h2>
              <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">{setup.namaKoperasi || "Dana Segar"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded-lg text-emerald-200 hover:bg-emerald-800 transition cursor-pointer"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            
            <div className="h-5 w-px bg-emerald-700 hidden sm:block"></div>
            
            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 bg-emerald-950 hover:bg-emerald-990 border border-emerald-800 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout Anggota</span>
            </button>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white py-8 border-b border-emerald-900 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold bg-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider">ANGGOTA RESMI VERIFIKASI</span>
            <h1 className="text-xl sm:text-2xl font-black">Selamat Datang, Bpk/Ibu {member.nama}!</h1>
            <p className="text-xs text-emerald-300 font-mono">No. Anggota: {member.noAnggota} | Gabung Sejak: {member.tanggalBergabung} | HP: {member.noHp}</p>
          </div>
          
          <button 
            onClick={handlePrintStatement}
            className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Ledger Saya (Rekening Koran)
          </button>
        </div>
      </div>

      {/* Main navigation tabs for member cabinet */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 transition cursor-pointer ${activeTab === 'overview' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-extrabold' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'}`}
          >
            Ikhtisar Koperasi
          </button>
          <button
            onClick={() => setActiveTab('nominatif')}
            className={`py-4 transition cursor-pointer ${activeTab === 'nominatif' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-extrabold' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'}`}
          >
            Daftar Nominatif Simpanan
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`py-4 transition cursor-pointer ${activeTab === 'ledger' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-extrabold' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'}`}
          >
            Buku Ledger Saya ({mySimpanan.length + myPinjaman.length} Log)
          </button>
        </div>
      </div>

      {/* Member Content area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto space-y-6">
        
        {/* 📢 BULLETIN BOARD: ANNOUNCEMENTS FOR MEMBER CABINET */}
        {activeAnnouncements.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Megaphone className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Pengumuman & Pemberitahuan Resmi Koperasi
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
                  Informasi resmi, rilis dividen SHU, agenda rapat, dan imbauan penting pengurus koperasi.
                </p>
              </div>
            </div>

            {/* 📢 TEKS BERJALAN (MARQUEE) */}
            <div className="bg-white/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl p-3 flex items-center gap-3 overflow-hidden shadow-xs">
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

        <AnimatePresence mode="wait">
          
          {/* Tab 1: Ikhtisar Koperasi */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Personal snapshot card banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl border-slate-150 dark:border-slate-800 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tabungan Saya</p>
                    <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-0.5">{formatRupiah(totals.totalS)}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl border-slate-150 dark:border-slate-800 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
                    <HandCoins className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kewajiban Hutang Saya</p>
                    <p className="text-xl font-bold font-mono text-rose-650 dark:text-rose-400 mt-0.5">{formatRupiah(totals.remainingLoanDebt)}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl border-slate-150 dark:border-slate-800 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aset Dana Koperasi</p>
                    <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-0.5">{formatRupiah(coopOverview.totalSimpananAll + coopOverview.outstandingPrincipalAll)}</p>
                  </div>
                </div>
              </div>

              {/* Cooperative dynamic profile overview */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b pb-2 uppercase tracking-wider">Visi & Identitas Koperasi</h3>
                  <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
                    <p><b>Nama Koperasi:</b> {setup.namaKoperasi || "Dana Segar"}</p>
                    {setup.noBadanHukum && <p><b>Legalitas:</b> Badan Hukum {setup.noBadanHukum}</p>}
                    <p><b>Alamat Kantor:</b> {setup.alamatKantor}</p>
                    <p><b>Slogan Bersama:</b> "{setup.slogan}"</p>
                    <p className="italic">Koperasi didirikan atas dasar kekeluargaan dengan pengawasan ketat manajemen untuk penyaluran simpanan modal dari anggota dan penyaluran kredit produktif bagi kesejahteraan masyarakat.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b pb-2 uppercase tracking-wider">Transparansi Keuangan Komunitas</h3>
                  <div className="space-y-3 text-xs text-slate-600 dark:text-slate-350">
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span>Total Anggota Terverifikasi</span>
                      <span className="font-bold">{coopOverview.activeMembersCount} Orang</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span>Total Dana Simpanan Komunitas</span>
                      <span className="font-bold font-mono">{formatRupiah(coopOverview.totalSimpananAll)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span>Total Kredit Produktif Berjalan</span>
                      <span className="font-bold font-mono">{formatRupiah(coopOverview.outstandingPrincipalAll)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span>Prinsip Suku Bunga Akad</span>
                      <span className="font-bold uppercase text-emerald-600">{setup.jenisBungaPinjaman} (Flat)</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Nominatif Simpanan */}
          {activeTab === 'nominatif' && (
            <motion.div
              key="nominatif"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    Daftar Nominatif Simpanan Anggota Koperasi
                  </h3>
                  <p className="text-xs text-slate-450 mt-0.5">Daftar terbuka seluruh anggota aktif terverifikasi beserta total simpanan masing-masing (asas kebersamaan transparan).</p>
                </div>

                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-3">No. Anggota</th>
                        <th className="py-2.5 px-3">Nama Anggota</th>
                        <th className="py-2.5 px-3 text-right">Simpanan Pokok</th>
                        <th className="py-2.5 px-3 text-right">Simpanan Wajib</th>
                        <th className="py-2.5 px-3 text-right">Simpanan Sukarela</th>
                        <th className="py-2.5 px-3 text-right">Total Tabungan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {nominatifList.map((row) => {
                        const isMe = row.id === member.id;
                        return (
                          <tr key={row.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition ${isMe ? 'bg-emerald-500/5 dark:bg-emerald-500/10 font-semibold' : ''}`}>
                            <td className="py-3 px-3 font-mono">
                              {row.noAnggota} {isMe && <span className="bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded ml-1">SAYA</span>}
                            </td>
                            <td className="py-3 px-3 text-slate-800 dark:text-slate-150">
                              <div className="flex items-center gap-1.5">
                                <span>{row.nama}</span>
                                {row.jenisKelamin && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${row.jenisKelamin === 'Laki-laki' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450'}`}>
                                    {row.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono">{formatRupiah(row.sPokok)}</td>
                            <td className="py-3 px-3 text-right font-mono">{formatRupiah(row.sWajib)}</td>
                            <td className="py-3 px-3 text-right font-mono">{formatRupiah(row.sSukarela)}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{formatRupiah(row.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: Buku Ledger */}
          {activeTab === 'ledger' && (
            <motion.div
              key="ledger"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              
              {/* Saving ledger */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Riwayat Saldo Simpanan (Pokok, Wajib, Sukarela)
                </h3>

                {mySimpanan.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">Belum ada riwayat transaksi simpanan terdaftar.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase tracking-wider font-bold">
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">No. Transaksi</th>
                          <th className="py-2 px-3">Jenis</th>
                          <th className="py-2 px-3 text-right">Jumlah Setoran</th>
                          <th className="py-2 px-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-650 dark:text-slate-350">
                        {mySimpanan.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3">{s.tanggal}</td>
                            <td className="py-2.5 px-3 font-mono">{s.transaksiId || `TRX-S-${s.id.substring(0, 6).toUpperCase()}`}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${s.jenis === 'Pokok' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-750 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900' : s.jenis === 'Wajib' ? 'bg-amber-50 dark:bg-amber-950 text-amber-750 dark:text-amber-400 border border-amber-100 dark:border-amber-900' : 'bg-emerald-50 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900'}`}>
                                Simpanan {s.jenis}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-905 dark:text-slate-100">{formatRupiah(s.jumlah)}</td>
                            <td className="py-2.5 px-3 text-slate-450">{s.keterangan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pinjaman Ledger */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
                  <HandCoins className="w-4 h-4 text-emerald-600" />
                  Daftar Kontrak Pinjaman & Kewajiban
                </h3>

                {myPinjaman.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">Anda tidak memiliki kontrak pinjaman berjalan.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase tracking-wider font-bold">
                          <th className="py-2 px-3">Tanggal Realisasi</th>
                          <th className="py-2 px-3">No. Kontrak</th>
                          <th className="py-2 px-3 text-right">Pencairan Nominal</th>
                          <th className="py-2 px-3 text-right">Wajib Bayar</th>
                          <th className="py-2 px-3 text-right">Telah Dibayar</th>
                          <th className="py-2 px-3 text-right">Sisa Kewajiban</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-650 dark:text-slate-350">
                        {myPinjaman.map((p) => {
                          const repays = myAngsuran.filter(a => a.pinjamanId === p.id);
                          const paidAmt = repays.reduce((sum, c) => sum + c.jumlahBayar, 0);
                          const remainingDebt = Math.max(0, p.totalWajibBayar - paidAmt);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                              <td className="py-2.5 px-3">{p.tanggal}</td>
                              <td className="py-2.5 px-3 font-mono">CTR-{p.id.substring(0, 8).toUpperCase()}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(p.nominalPinjaman)}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(p.totalWajibBayar)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{formatRupiah(paidAmt)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-450 font-bold">{formatRupiah(remainingDebt)}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.status === 'Lunas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Installment Repays Ledger */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Riwayat Angsuran Pinjaman (Kewajiban Dibayar)
                </h3>

                {myAngsuran.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">Belum ada riwayat transaksi pembayaran angsuran.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase tracking-wider font-bold">
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">No. Transaksi</th>
                          <th className="py-2 px-3">No. Kontrak</th>
                          <th className="py-2 px-3">Angsuran Ke</th>
                          <th className="py-2 px-3 text-right">Jumlah Bayar</th>
                          <th className="py-2 px-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-650 dark:text-slate-350">
                        {myAngsuran.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3">{a.tanggal}</td>
                            <td className="py-2.5 px-3 font-mono">TRX-{a.id.substring(0, 8).toUpperCase()}</td>
                            <td className="py-2.5 px-3 font-mono">CTR-{a.pinjamanId.substring(0, 8).toUpperCase()}</td>
                            <td className="py-2.5 px-3 font-semibold">Bulan Ke-{a.bulanKe}</td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-indigo-700 dark:text-indigo-400">{formatRupiah(a.jumlahBayar)}</td>
                            <td className="py-2.5 px-3 text-slate-450">{a.keterangan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
