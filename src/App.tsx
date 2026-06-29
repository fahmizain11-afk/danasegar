import React, { useState, useEffect } from 'react';
import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, KoperasiSetup, ManasukaBungaLog, Pembelian, PiutangWarung, Pengumuman } from './types';
import { initialMembers, initialSimpanan, initialPinjaman, initialAngsuran, initialPendapatan, initialBeban, initialSetup, initialPembelian, initialPiutangWarung, initialAnnouncements } from './dummyData';
import { 
  fetchKoperasiSetup, 
  saveKoperasiSetup, 
  fetchCollection, 
  saveCollectionItem, 
  deleteCollectionItem, 
  seedCollection,
  clearCollection
} from './utils/firebaseStorage';
import { LoginScreen, ArusKasView, ProfilKoperasiView } from './components/AdminViews';
import { AnggotaView, PinjamanView } from './components/CoreViews';
import { KasMasukView } from './components/KasMasukView';
import { DashboardView, LaporanView } from './components/LaporanViews';
import { PembelianView } from './components/PembelianView';
import { PengingatView } from './components/PengingatView';
import { PengumumanView } from './components/PengumumanView';
import { PortalKoperasi, MemberDashboardView } from './components/PortalKoperasi';
import { 
  Building, LayoutDashboard, Users, Wallet, HandCoins, CheckCircle2, 
  TrendingUp, Scale, Sun, Moon, LogOut, HeartHandshake, UserCog, Menu, X, ShoppingCart, Lock, Bell, Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function getInitials(name: string) {
  if (!name) return 'DS';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function App() {
  // Dark mode trigger state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('koperasi_dark_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('koperasi_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Authenticated & Role State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('koperasi_session_active') === 'true';
  });

  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(() => {
    const active = localStorage.getItem('koperasi_session_active') === 'true';
    if (!active) return null;
    return (localStorage.getItem('koperasi_user_role') as 'admin' | 'member') || 'admin';
  });

  const [loggedMember, setLoggedMember] = useState<Member | null>(() => {
    const memStr = localStorage.getItem('koperasi_logged_member');
    if (memStr) {
      try {
        return JSON.parse(memStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const handleLoginSuccess = (role: 'admin' | 'member', member?: Member) => {
    setIsLoggedIn(true);
    setUserRole(role);
    localStorage.setItem('koperasi_session_active', 'true');
    localStorage.setItem('koperasi_user_role', role);
    if (role === 'member' && member) {
      setLoggedMember(member);
      localStorage.setItem('koperasi_logged_member', JSON.stringify(member));
    } else {
      setLoggedMember(null);
      localStorage.removeItem('koperasi_logged_member');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setLoggedMember(null);
    localStorage.removeItem('koperasi_session_active');
    localStorage.removeItem('koperasi_user_role');
    localStorage.removeItem('koperasi_logged_member');
  };

  // Centralised Financial Stores connected to Cloud Firestore (with LocalStorage fallback)
  const [setup, setSetup] = useState<KoperasiSetup>(initialSetup);
  const [members, setMembers] = useState<Member[]>([]);
  const [simpanan, setSimpanan] = useState<Simpanan[]>([]);
  const [pinjaman, setPinjaman] = useState<Pinjaman[]>([]);
  const [angsuran, setAngsuran] = useState<Angsuran[]>([]);
  const [income, setIncome] = useState<PendapatanLain[]>([]);
  const [expenses, setExpenses] = useState<BebanKoperasi[]>([]);
  const [pembelian, setPembelian] = useState<Pembelian[]>([]);
  const [piutangWarung, setPiutangWarung] = useState<PiutangWarung[]>([]);
  const [announcements, setAnnouncements] = useState<Pengumuman[]>([]);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(true);

  // Firestore & local storage loader effect
  useEffect(() => {
    async function initAndSyncDatabase() {
      setIsDbLoading(true);
      try {
        console.log("Checking cooperative setup in cloud database...");
        const dbSetup = await fetchKoperasiSetup();

        if (!dbSetup) {
          console.log("Database is empty. Seeding initial cooperative records...");
          await saveKoperasiSetup(initialSetup);
          await seedCollection<Member>('members', initialMembers);
          await seedCollection<Simpanan>('simpanan', initialSimpanan);
          await seedCollection<Pinjaman>('pinjaman', initialPinjaman);
          await seedCollection<Angsuran>('angsuran', initialAngsuran);
          await seedCollection<PendapatanLain>('income', initialPendapatan);
          await seedCollection<BebanKoperasi>('expenses', initialBeban);
          await seedCollection<Pembelian>('pembelian', initialPembelian);
          await seedCollection<PiutangWarung>('piutang_warung', initialPiutangWarung);
          await seedCollection<Pengumuman>('announcements', initialAnnouncements);

          setSetup(initialSetup);
          setMembers(initialMembers);
          setSimpanan(initialSimpanan);
          setPinjaman(initialPinjaman);
          setAngsuran(initialAngsuran);
          setIncome(initialPendapatan);
          setExpenses(initialBeban);
          setPembelian(initialPembelian);
          setPiutangWarung(initialPiutangWarung);
          setAnnouncements(initialAnnouncements);
        } else {
          console.log("Found existing cloud data. Loading all cooperative records...");
          const [dbMembers, dbSimpanan, dbPinjaman, dbAngsuran, dbIncome, dbExpenses, dbPembelian, dbPiutang, dbAnnouncements] = await Promise.all([
            fetchCollection<Member>('members'),
            fetchCollection<Simpanan>('simpanan'),
            fetchCollection<Pinjaman>('pinjaman'),
            fetchCollection<Angsuran>('angsuran'),
            fetchCollection<PendapatanLain>('income'),
            fetchCollection<BebanKoperasi>('expenses'),
            fetchCollection<Pembelian>('pembelian'),
            fetchCollection<PiutangWarung>('piutang_warung'),
            fetchCollection<Pengumuman>('announcements')
          ]);

          // Automatic cleanup of legacy dummy records on cold load
          const hasDummyMembers = dbMembers && dbMembers.some(m => m.id === 'm-1' || m.id === 'm-2' || m.id === 'm-3' || m.id === 'm-4' || m.id === 'm-5');
          if (hasDummyMembers) {
            console.log("Detected legacy dummy records in cloud. Cleansing Firestore database for real empty deployment...");
            try {
              await clearCollection('members');
              await clearCollection('simpanan');
              await clearCollection('pinjaman');
              await clearCollection('angsuran');
              await clearCollection('income');
              await clearCollection('expenses');
              await clearCollection('pembelian');
              await clearCollection('piutang_warung');
              await clearCollection('announcements');
            } catch (clearErr) {
              console.error("Error auto-clearing legacy dummy records:", clearErr);
            }

            setSetup(dbSetup);
            setMembers([]);
            setSimpanan([]);
            setPinjaman([]);
            setAngsuran([]);
            setIncome([]);
            setExpenses([]);
            setPembelian([]);
            setPiutangWarung([]);
            setAnnouncements([]);
          } else {
            setSetup(dbSetup);
            setMembers(dbMembers || []);
            setSimpanan(dbSimpanan || []);
            setPinjaman(dbPinjaman || []);
            setAngsuran(dbAngsuran || []);
            setIncome(dbIncome || []);
            setExpenses(dbExpenses || []);
            setPembelian(dbPembelian || []);
            setPiutangWarung(dbPiutang || []);
            setAnnouncements(dbAnnouncements || []);
          }
        }
      } catch (err) {
        console.error("Cloud database syncing failed, utilizing local storage backup", err);
        const dataSetup = localStorage.getItem('kop_setup');
        const dataMembers = localStorage.getItem('kop_members');
        const dataSimpanan = localStorage.getItem('kop_simpanan');
        const dataPinjaman = localStorage.getItem('kop_pinjaman');
        const dataAngsuran = localStorage.getItem('kop_angsuran');
        const dataIncome = localStorage.getItem('kop_income');
        const dataExpenses = localStorage.getItem('kop_expenses');
        const dataPembelian = localStorage.getItem('kop_pembelian');
        const dataPiutang = localStorage.getItem('kop_piutang_warung');
        const dataAnnouncements = localStorage.getItem('kop_announcements');

        if (dataSetup) setSetup(JSON.parse(dataSetup));
        if (dataMembers) setMembers(JSON.parse(dataMembers));
        if (dataSimpanan) setSimpanan(JSON.parse(dataSimpanan));
        if (dataPinjaman) setPinjaman(JSON.parse(dataPinjaman));
        if (dataAngsuran) setAngsuran(JSON.parse(dataAngsuran));
        if (dataIncome) setIncome(JSON.parse(dataIncome));
        if (dataExpenses) setExpenses(JSON.parse(dataExpenses));
        if (dataPembelian) setPembelian(JSON.parse(dataPembelian));
        if (dataPiutang) setPiutangWarung(JSON.parse(dataPiutang));
        if (dataAnnouncements) setAnnouncements(JSON.parse(dataAnnouncements));
      } finally {
        setIsDbLoading(false);
      }
    }
    initAndSyncDatabase();
  }, []);

  // Sync to localStorage as progressive web offline backup
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_setup', JSON.stringify(setup)); }, [setup, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_members', JSON.stringify(members)); }, [members, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_simpanan', JSON.stringify(simpanan)); }, [simpanan, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_pinjaman', JSON.stringify(pinjaman)); }, [pinjaman, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_angsuran', JSON.stringify(angsuran)); }, [angsuran, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_income', JSON.stringify(income)); }, [income, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_expenses', JSON.stringify(expenses)); }, [expenses, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_pembelian', JSON.stringify(pembelian)); }, [pembelian, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_piutang_warung', JSON.stringify(piutangWarung)); }, [piutangWarung, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_announcements', JSON.stringify(announcements)); }, [announcements, isDbLoading]);

  // Active Routing state
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'anggota' | 'kasmasuk' | 'pinjaman' | 'aruskas' | 'pembelian' | 'laporan' | 'profil' | 'pengingat' | 'pengumuman'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Password protection states for Profil Koperasi
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [pendingTab, setPendingTab] = useState<'dashboard' | 'anggota' | 'kasmasuk' | 'pinjaman' | 'aruskas' | 'pembelian' | 'laporan' | 'profil' | 'pengingat' | 'pengumuman' | null>(null);

  const handleNavigation = (tabId: 'dashboard' | 'anggota' | 'kasmasuk' | 'pinjaman' | 'aruskas' | 'pembelian' | 'laporan' | 'profil' | 'pengingat' | 'pengumuman') => {
    setActiveTab(tabId);
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'D4nasegar') {
      sessionStorage.setItem('kop_profil_verified', 'true');
      setShowPasswordModal(false);
      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      }
    } else {
      setPasswordError('Password salah. Silakan coba lagi.');
    }
  };

  // Mutations writing instantly to UI (Optimistic) and saving to Firestore in background
  const handleAddMember = async (newM: Omit<Member, 'id'>) => {
    const id = `m-${Date.now()}`;
    const item: Member = { ...newM, id };
    setMembers(prev => [...prev, item]);
    await saveCollectionItem<Member>('members', item);
  };

  const handleEditMember = async (updatedM: Member) => {
    setMembers(prev => prev.map(m => m.id === updatedM.id ? updatedM : m));
    await saveCollectionItem<Member>('members', updatedM);
  };

  const handleDeleteMember = async (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    setSimpanan(prev => prev.filter(s => s.anggotaId !== id));
    setPinjaman(prev => prev.filter(p => p.anggotaId !== id));
    setAngsuran(prev => prev.filter(a => a.anggotaId !== id));

    await deleteCollectionItem('members', id);
  };

  const handleAddSimpanan = async (newS: Omit<Simpanan, 'id'> | Omit<Simpanan, 'id'>[]) => {
    if (Array.isArray(newS)) {
      const freshSavings = newS.map((s, idx) => ({ ...s, id: `s-${Date.now()}-${idx}` }));
      setSimpanan(prev => [...prev, ...freshSavings]);
      for (const item of freshSavings) {
        await saveCollectionItem<Simpanan>('simpanan', item);
      }
    } else {
      const item: Simpanan = { ...newS, id: `s-${Date.now()}` };
      setSimpanan(prev => [...prev, item]);
      await saveCollectionItem<Simpanan>('simpanan', item);
    }
  };

  const handleAddPinjaman = async (newP: Omit<Pinjaman, 'id'>) => {
    const id = `p-${Date.now()}`;
    const item: Pinjaman = { ...newP, id };
    setPinjaman(prev => [...prev, item]);
    await saveCollectionItem<Pinjaman>('pinjaman', item);
  };

  const handleEditPinjaman = async (updatedP: Pinjaman) => {
    setPinjaman(prev => prev.map(p => p.id === updatedP.id ? updatedP : p));
    await saveCollectionItem<Pinjaman>('pinjaman', updatedP);
  };

  const handleDeletePinjaman = async (id: string) => {
    setPinjaman(prev => prev.filter(p => p.id !== id));
    await deleteCollectionItem('pinjaman', id);
  };

  const handleAddAngsuran = async (newA: Omit<Angsuran, 'id'>, markAsLunas: boolean) => {
    const id = `a-${Date.now()}`;
    const item: Angsuran = { ...newA, id };
    setAngsuran(prev => [...prev, item]);
    await saveCollectionItem<Angsuran>('angsuran', item);

    if (markAsLunas) {
      setPinjaman(prev => prev.map(p => {
        if (p.id === newA.pinjamanId) {
          const updated = { ...p, status: 'Lunas' as const };
          saveCollectionItem<Pinjaman>('pinjaman', updated);
          return updated;
        }
        return p;
      }));
    }
  };

  const handleAddIncome = async (newI: Omit<PendapatanLain, 'id'>) => {
    const id = `pe-${Date.now()}`;
    const item: PendapatanLain = { ...newI, id };
    setIncome(prev => [...prev, item]);
    await saveCollectionItem<PendapatanLain>('income', item);
  };

  const handleAddExpense = async (newE: Omit<BebanKoperasi, 'id'>) => {
    const id = `b-${Date.now()}`;
    const item: BebanKoperasi = { ...newE, id };
    setExpenses(prev => [...prev, item]);
    await saveCollectionItem<BebanKoperasi>('expenses', item);
  };

  const handleDeleteIncome = async (id: string) => {
    setIncome(prev => prev.filter(i => i.id !== id));
    await deleteCollectionItem('income', id);
  };

  const handleDeleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    await deleteCollectionItem('expenses', id);
  };

  const handleClearArusKas = async () => {
    try {
      await clearCollection('income');
      await clearCollection('expenses');
      setIncome([]);
      setExpenses([]);
    } catch (err) {
      console.error("Gagal mengosongkan data kas:", err);
    }
  };

  const handleAddPembelian = async (newP: Omit<Pembelian, 'id'>) => {
    const id = `pem-${Date.now()}`;
    const item: Pembelian = { ...newP, id };
    setPembelian(prev => [...prev, item]);
    await saveCollectionItem<Pembelian>('pembelian', item);
  };

  const handleDeletePembelian = async (id: string) => {
    setPembelian(prev => prev.filter(p => p.id !== id));
    await deleteCollectionItem('pembelian', id);
  };

  const handleAddPiutang = async (newP: Omit<PiutangWarung, 'id'>) => {
    const id = `pw-${Date.now()}`;
    const item: PiutangWarung = { ...newP, id };
    setPiutangWarung(prev => [...prev, item]);
    await saveCollectionItem<PiutangWarung>('piutang_warung', item);
  };

  const handleDeletePiutang = async (id: string) => {
    setPiutangWarung(prev => prev.filter(p => p.id !== id));
    await deleteCollectionItem('piutang_warung', id);
  };

  const handleUpdateSetup = async (newSetup: KoperasiSetup) => {
    setSetup(newSetup);
    await saveKoperasiSetup(newSetup);
  };

  const handleSyncFromFirebase = (newData: {
    setup?: KoperasiSetup;
    members?: Member[];
    simpanan?: Simpanan[];
    pinjaman?: Pinjaman[];
    angsuran?: Angsuran[];
    income?: PendapatanLain[];
    expenses?: BebanKoperasi[];
    pembelian?: Pembelian[];
    piutangWarung?: PiutangWarung[];
  }) => {
    if (newData.setup) setSetup(newData.setup);
    if (newData.members) setMembers(newData.members);
    if (newData.simpanan) setSimpanan(newData.simpanan);
    if (newData.pinjaman) setPinjaman(newData.pinjaman);
    if (newData.angsuran) setAngsuran(newData.angsuran);
    if (newData.income) setIncome(newData.income);
    if (newData.expenses) setExpenses(newData.expenses);
    if (newData.pembelian) setPembelian(newData.pembelian);
    if (newData.piutangWarung) setPiutangWarung(newData.piutangWarung);
  };

  const handleAddAnnouncement = async (item: Omit<Pengumuman, 'id'>) => {
    const id = `ann-${Date.now()}`;
    const newItem: Pengumuman = { ...item, id };
    setAnnouncements(prev => [newItem, ...prev]);
    try {
      await saveCollectionItem<Pengumuman>('announcements', newItem);
    } catch (err) {
      console.warn("Offline/Permission warning: Gagal menyimpan pengumuman ke cloud. Disimpan secara lokal.", err);
    }
  };

  const handleEditAnnouncement = async (item: Pengumuman) => {
    setAnnouncements(prev => prev.map(a => a.id === item.id ? item : a));
    try {
      await saveCollectionItem<Pengumuman>('announcements', item);
    } catch (err) {
      console.warn("Offline/Permission warning: Gagal mengubah pengumuman di cloud. Diubah secara lokal.", err);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    try {
      await deleteCollectionItem('announcements', id);
    } catch (err) {
      console.warn("Offline/Permission warning: Gagal menghapus pengumuman dari cloud. Dihapus secara lokal.", err);
    }
  };

  const handlePostManasukaBunga = (log: Omit<ManasukaBungaLog, 'id'>, autoPostSukarela: boolean) => {
    console.log("Manasuka dividend log registered:", log, autoPostSukarela);
  };

  const handleResetData = async () => {
    localStorage.clear();
    setSetup(initialSetup);
    setMembers([]);
    setSimpanan([]);
    setPinjaman([]);
    setAngsuran([]);
    setIncome([]);
    setExpenses([]);
    setPembelian([]);
    setPiutangWarung([]);
    setAnnouncements([]);

    // Clear all Firestore collections to delete existing dummy/old documents
    try {
      await clearCollection('members');
      await clearCollection('simpanan');
      await clearCollection('pinjaman');
      await clearCollection('angsuran');
      await clearCollection('income');
      await clearCollection('expenses');
      await clearCollection('pembelian');
      await clearCollection('piutang_warung');
      await clearCollection('announcements');
      
      // Also reset/update the setup profile configuration in the cloud
      await saveKoperasiSetup(initialSetup);
    } catch (err) {
      console.error("Gagal membersihkan koleksi Cloud Firestore saat reset:", err);
    }
  };

  // Database loading spinner
  if (isDbLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 dark:border-emerald-500/10"></div>
          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-sm font-sans font-semibold tracking-tight text-slate-700 dark:text-slate-300">Menghubungkan Database Cloud Koperasi...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Mengambil data simpan pinjam secara real-time</p>
      </div>
    );
  }

  // Auth gate check
  if (!isLoggedIn || userRole === null) {
    return (
      <PortalKoperasi
        setup={setup}
        members={members}
        simpanan={simpanan}
        pinjaman={pinjaman}
        angsuran={angsuran}
        income={income}
        expenses={expenses}
        pembelian={pembelian}
        piutangWarung={piutangWarung}
        announcements={announcements}
        onAddMember={handleAddMember}
        onLoginSuccess={handleLoginSuccess}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
    );
  }

  if (userRole === 'member' && loggedMember) {
    return (
      <MemberDashboardView
        member={loggedMember}
        setup={setup}
        members={members}
        simpanan={simpanan}
        pinjaman={pinjaman}
        angsuran={angsuran}
        announcements={announcements}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
    );
  }

  // Navigations links matching
  const navItems = [
    { id: 'dashboard', label: 'Beranda Analitik', icon: LayoutDashboard },
    { id: 'anggota', label: 'Manajemen Anggota', icon: Users },
    { id: 'kasmasuk', label: 'Kas Masuk', icon: Wallet },
    { id: 'pinjaman', label: 'Akad Pinjaman', icon: HandCoins },
    { id: 'pembelian', label: 'Menu Pembelian', icon: ShoppingCart },
    { id: 'aruskas', label: 'Arus Kas Toko & Beban', icon: TrendingUp },
    { id: 'pengingat', label: 'Pengingat Tagihan', icon: Bell },
    { id: 'pengumuman', label: 'Pengumuman Koperasi', icon: Megaphone },
    { id: 'laporan', label: 'Laporan Keuangan', icon: Scale },
    { id: 'profil', label: 'Profil Koperasi', icon: UserCog }
  ] as const;

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300 font-sans">
      
      {/* Left Persistent Sidebar (Desktop View) */}
      <aside className="w-64 bg-emerald-900 text-white flex flex-col shrink-0 hidden lg:flex">
        {/* Branding Area */}
        <div className="p-5 border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-lg select-none shadow-sm overflow-hidden shrink-0">
              {setup.logoUrl && setup.logoUrl.startsWith('data:image') ? (
                <img src={setup.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                setup.logoUrl || '🌱'
              )}
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold leading-tight truncate text-sm tracking-wide">{setup.namaKoperasi || "Dana Segar"}</h1>
              <p className="text-[10px] text-emerald-300 font-medium uppercase tracking-widest truncate">{setup.slogan || "Koperasi Modern"}</p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-3.5 space-y-1 text-xs overflow-y-auto">
          <div className="text-emerald-400 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider">Main Navigator</div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-medium text-xs transition duration-150 cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-950 text-white shadow-sm font-semibold' 
                    : 'text-emerald-100 hover:bg-emerald-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-300/85'}`}/>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer Admin Summary */}
        <div className="p-4 bg-emerald-950 border-t border-emerald-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs select-none shadow">
              {getInitials(setup.namaKoperasi)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate leading-tight">Admin Utama</p>
              <p className="text-[9px] text-emerald-400 truncate mt-0.5">admin@danasegar.com</p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-emerald-400 hover:text-white p-1 rounded-sm transition cursor-pointer hover:bg-emerald-850/50"
              title="Keluar"
            >
              <LogOut className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* Top Header */}
        <header className="h-14 bg-white dark:bg-slate-800 border-b border-slate-150 dark:border-slate-750 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2 text-xs sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            {/* Mobile Hamburger menu */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg lg:hidden transition cursor-pointer text-slate-700 dark:text-slate-200"
            >
              <Menu className="w-5 h-5"/>
            </button>

            <span>{navItems.find(n => n.id === activeTab)?.label || "Dashboard Analitik"}</span>
            <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
            </svg>
            <span className="text-emerald-600 dark:text-emerald-450 font-bold select-none uppercase tracking-wide text-[10px]">Real-time Overview</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Placeholder */}
            <div className="relative hidden md:block">
              <input 
                type="text" 
                placeholder="Cari data..." 
                disabled 
                className="bg-slate-50 dark:bg-slate-900 border-slate-250 dark:border-slate-700 border rounded-lg py-1 pl-8 pr-3 text-[11px] w-48 outline-none" 
              />
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-1.5 text-slate-450" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>

            {/* Theme switcher */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Ganti Tema Visual"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400"/> : <Moon className="w-4 h-4 text-emerald-800"/>}
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

            {/* Quick Actions */}
            <button 
              onClick={() => handleNavigation('kasmasuk')}
              className="hidden sm:flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition cursor-pointer active:scale-95"
            >
              <span>+ Kas Masuk</span>
            </button>

            {/* Logout Admin Button (Visible in header on all viewports) */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition cursor-pointer active:scale-95 shrink-0"
              title="Keluar dari Sistem Administrasi"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Mobile drawer side panel overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              {/* black mask */}
              <div onClick={() => setIsMobileMenuOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-xs"/>
              
              <motion.aside 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                className="absolute top-0 bottom-0 left-0 w-64 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-5 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Navigasi Utama</span>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400">
                      <X className="w-5 h-5"/>
                    </button>
                  </div>
                  
                  <nav className="space-y-1">
                    {navItems.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            handleNavigation(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                            isActive 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold' 
                              : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}/>
                          {item.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="border-t border-slate-150 dark:border-slate-800 pt-4 flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Keluar Admin
                  </button>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono space-y-0.5 select-none">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">{setup.namaKoperasi || "Koperasi Dana Segar"}</p>
                    {setup.noBadanHukum && <p className="opacity-75">BH: {setup.noBadanHukum}</p>}
                  </div>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Dashboard/Tab Contents display panel */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-900/60">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              {/* Router Render Tab view components */}
              {activeTab === 'dashboard' && (
                <DashboardView 
                  members={members} simpanan={simpanan} pinjaman={pinjaman} 
                  angsuran={angsuran} income={income} expenses={expenses} 
                  setup={setup}
                  announcements={announcements}
                />
              )}

              {activeTab === 'anggota' && (
                <AnggotaView 
                  setup={setup}
                  members={members} simpanan={simpanan} pinjaman={pinjaman} angsuran={angsuran}
                  onAddMember={handleAddMember} onEditMember={handleEditMember} onDeleteMember={handleDeleteMember}
                />
              )}

              {activeTab === 'kasmasuk' && (
                <KasMasukView 
                  setup={setup}
                  members={members} simpanan={simpanan} pinjaman={pinjaman} angsuran={angsuran}
                  onAddSimpanan={handleAddSimpanan}
                  onPostManasukaBunga={handlePostManasukaBunga}
                  onAddAngsuran={handleAddAngsuran}
                />
              )}

              {activeTab === 'pinjaman' && (
                <PinjamanView 
                  setup={setup}
                  members={members} pinjaman={pinjaman} angsuran={angsuran}
                  onAddPinjaman={handleAddPinjaman}
                  onEditPinjaman={handleEditPinjaman}
                  onDeletePinjaman={handleDeletePinjaman}
                />
              )}

              {activeTab === 'pembelian' && (
                <PembelianView 
                  setup={setup}
                  members={members}
                  pembelian={pembelian}
                  piutangWarung={piutangWarung}
                  onAddPembelian={handleAddPembelian}
                  onDeletePembelian={handleDeletePembelian}
                  onAddPiutang={handleAddPiutang}
                  onDeletePiutang={handleDeletePiutang}
                />
              )}

              {activeTab === 'aruskas' && (
                <ArusKasView 
                  income={income} expenses={expenses}
                  onAddIncome={handleAddIncome} onAddExpense={handleAddExpense}
                  onDeleteIncome={handleDeleteIncome} onDeleteExpense={handleDeleteExpense}
                  onClearArusKas={handleClearArusKas}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'laporan' && (
                <LaporanView 
                  members={members} simpanan={simpanan} pinjaman={pinjaman} 
                  angsuran={angsuran} income={income} expenses={expenses}
                  pembelian={pembelian} piutangWarung={piutangWarung}
                  setup={setup}
                />
              )}

              {activeTab === 'pengingat' && (
                <PengingatView 
                  members={members}
                  simpanan={simpanan}
                  pinjaman={pinjaman}
                  angsuran={angsuran}
                  setup={setup}
                />
              )}

              {activeTab === 'pengumuman' && (
                <PengumumanView 
                  setup={setup}
                  announcements={announcements}
                  onAddAnnouncement={handleAddAnnouncement}
                  onEditAnnouncement={handleEditAnnouncement}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                />
              )}

              {activeTab === 'profil' && (
                <ProfilKoperasiView 
                  setup={setup} 
                  onUpdateSetup={handleUpdateSetup} 
                  onResetData={handleResetData}
                  onSyncFromFirebase={handleSyncFromFirebase}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Password Verification Modal for Profil Koperasi */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPasswordModal(false);
                setPendingTab(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-850 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/80 overflow-hidden z-10"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Verifikasi Keamanan</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Diperlukan password untuk melihat menu ini</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPendingTab(null);
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleVerifyPassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Password Profil Koperasi
                    </label>
                    <input 
                      type="password"
                      placeholder="Masukkan password..."
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setPasswordError('');
                      }}
                      autoFocus
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition font-sans placeholder:text-slate-400"
                    />
                    {passwordError && (
                      <p className="text-[10.5px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
                        ⚠️ {passwordError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowPasswordModal(false);
                        setPendingTab(null);
                      }}
                      className="flex-1 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750 text-xs font-semibold transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition cursor-pointer active:scale-98"
                    >
                      Verifikasi
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
