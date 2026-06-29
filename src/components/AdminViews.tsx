import React, { useState, useEffect } from 'react';
import { Member, KoperasiSetup, PendapatanLain, BebanKoperasi, Simpanan, Pinjaman, Angsuran } from '../types';
import { formatRupiah } from '../utils/finance';
import { 
  Building, MapPin, Sparkles, RefreshCw, Key, Shield, User,
  TrendingUp, TrendingDown, DollarSign, Tag, Calendar, Plus, Trash2, Save, Upload,
  Database, Wifi, WifiOff, CloudUpload, CloudDownload, CheckCircle, AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  testFirestoreConnection,
  pushCollectionToFirestore,
  fetchCollectionFromFirestore,
  initializeDynamicFirebase,
  FirebaseClientConfig
} from '../utils/firebase';

// ================= PRIVATE AUTH LAYOUT =================
interface LoginProps {
  setup: KoperasiSetup;
  onLoginSuccess: () => void;
}

export function LoginScreen({ setup, onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('d4n45egar');
  const [errorInput, setErrorInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'admin' && password === 'd4n45egar') {
      setIsLoading(true);
      setErrorInput('');
      setTimeout(() => {
        onLoginSuccess();
        setIsLoading(false);
      }, 700);
    } else {
      setErrorInput('Username atau password yang Anda masukkan salah!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-700 overflow-hidden"
      >
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 p-8 text-center text-white relative">
          <div className="absolute top-4 right-4 bg-white/10 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Secure Portal
          </div>
          <div className="flex justify-center mb-3">
            {setup.logoUrl && setup.logoUrl.startsWith('data:image') ? (
              <img src={setup.logoUrl} alt="Logo" className="w-16 h-16 object-cover rounded-full border-2 border-white/20 select-none shadow" />
            ) : (
              <span className="text-5xl inline-block animate-pulse">{setup.logoUrl || '🌱'}</span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{setup.namaKoperasi || "Koperasi Dana Segar"}</h2>
          <p className="text-emerald-105/90 text-sm mt-1 italic font-light">{setup.slogan}</p>
          {setup.noBadanHukum && (
            <p className="text-[10px] text-emerald-300 font-mono mt-2 bg-emerald-900/40 rounded-full px-3 py-0.5 inline-block border border-white/10">Badan Hukum: {setup.noBadanHukum}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs p-3.5 rounded-lg border border-emerald-100 dark:border-emerald-900 flex items-start gap-2.5">
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Simulasi Akun Demo Aktif:</p>
              <p className="mt-0.5">Semper-persisten menggunakan Username: <span className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">admin</span> & Password: <span className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">admin</span>.</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 label-id">
              <User className="w-3.5 h-3.5" /> USERNAME SAYA
            </label>
            <input 
              id="auth-username"
              type="text"
              required
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 label-id">
              <Key className="w-3.5 h-3.5" /> KATA SANDI
            </label>
            <input 
              id="auth-password"
              type="password"
              required
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorInput && (
            <p className="text-rose-600 text-xs font-medium bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900">
              {errorInput}
            </p>
          )}

          <button
            id="btn-submit-login"
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-lg text-sm font-semibold tracking-wide transition shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Mengecek Kredensial...
              </>
            ) : (
              'Masuk Ke Dashboard Koperasi'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ================= CASHFLOW MANAGEMENT (ARUS KAS) =================
interface ArusKasProps {
  income: PendapatanLain[];
  expenses: BebanKoperasi[];
  onAddIncome: (item: Omit<PendapatanLain, 'id'>) => void;
  onAddExpense: (item: Omit<BebanKoperasi, 'id'>) => void;
  onDeleteIncome: (id: string) => void;
  onDeleteExpense: (id: string) => void;
  onClearArusKas?: () => void;
  isDarkMode: boolean;
}

export function ArusKasView({ 
  income, expenses, onAddIncome, onAddExpense, onDeleteIncome, onDeleteExpense, onClearArusKas, isDarkMode 
}: ArusKasProps) {
  const [incAmount, setIncAmount] = useState('');
  const [incSource, setIncSource] = useState<'warung' | 'bunga_simpanan' | 'denda' | 'lain_lain'>('warung');
  const [incNotes, setIncNotes] = useState('');
  const [incDate, setIncDate] = useState(new Date().toISOString().substring(0, 10));

  const [expAmount, setExpAmount] = useState('');
  const [expCat, setExpCat] = useState<'gaji_karyawan' | 'listrik' | 'gaji_pengurus' | 'gaji_pengawas' | 'operasional_kantor' | 'beban_lain'>('gaji_karyawan');
  const [expNotes, setExpNotes] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().substring(0, 10));

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(incAmount);
    if (isNaN(val) || val <= 0) return;
    onAddIncome({
      tanggal: incDate,
      sumber: incSource,
      nominal: val,
      keterangan: incNotes || `Pendapatan ${incSource}`
    });
    setIncAmount('');
    setIncNotes('');
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(expAmount);
    if (isNaN(val) || val <= 0) return;
    onAddExpense({
      tanggal: expDate,
      kategori: expCat,
      nominal: val,
      keterangan: expNotes || `Beban ${expCat}`
    });
    setExpAmount('');
    setExpNotes('');
  };

  const handleClearTrigger = () => {
    if (window.confirm("PERINGATAN: Tindakan ini akan menghapus semua catatan historis pendapatan non-operasional dan beban koperasi secara permanen dari database. Lanjutkan?")) {
      if (onClearArusKas) {
        onClearArusKas();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Clear Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-150 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600"/> Buku Jurnal Arus Kas & Biaya
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Catat pendapatan di luar simpanan-pinjaman serta beban/pengeluaran operasional koperasi.
          </p>
        </div>
        {onClearArusKas && (income.length > 0 || expenses.length > 0) && (
          <button
            onClick={handleClearTrigger}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-900 text-rose-755 dark:text-rose-300 text-xs font-bold rounded-xl transition cursor-pointer shadow-sm shrink-0"
          >
            <Trash2 className="w-4 h-4"/> Kosongkan Semua Data Kas
          </button>
        )}
      </div>

      {/* Forms Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Pendapatan */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 rounded-lg"><TrendingUp className="w-5 h-5"/></span>
            Catat Pendapatan Non-Operasional / Toko
          </h3>
          <form onSubmit={handleIncomeSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Tanggal</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  value={incDate}
                  onChange={(e) => setIncDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Sumber Pendapatan</label>
                <select 
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  value={incSource}
                  onChange={(e) => setIncSource(e.target.value as any)}
                >
                  <option value="warung">Laba Warung Toko</option>
                  <option value="bunga_simpanan">Bunga Simpanan Bank</option>
                  <option value="denda">Uang Denda Keterlambatan</option>
                  <option value="lain_lain">Pendapatan Lain-lain</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Nominal Pendapatan (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-slate-400 font-medium">Rp</span>
                <input 
                  type="number"
                  placeholder="Contoh: 1500000"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  value={incAmount}
                  onChange={(e) => setIncAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Keterangan Tambahan</label>
              <textarea 
                placeholder="Deskripsi peroleh atau transaksi kas..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                value={incNotes}
                onChange={(e) => setIncNotes(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="w-full mt-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4"/> Catat Pendapatan
            </button>
          </form>
        </div>

        {/* Input Beban/Biaya */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <span className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 rounded-lg"><TrendingDown className="w-5 h-5"/></span>
            Catat Pengeluaran Beban Koperasi
          </h3>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Tanggal</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Kategori Beban</label>
                <select 
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  value={expCat}
                  onChange={(e) => setExpCat(e.target.value as any)}
                >
                  <option value="gaji_karyawan">Beban Gaji Karyawan</option>
                  <option value="listrik">Beban Listrik & PDAM</option>
                  <option value="gaji_pengurus">Gaji/Honor Kehormatan Pengurus</option>
                  <option value="gaji_pengawas">Gaji/Honor Kehormatan Pengawas</option>
                  <option value="operasional_kantor">Beban Operasional Kantor / ATK</option>
                  <option value="beban_lain">Kategori Beban Lainnya</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Nominal Biaya (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-slate-400 font-medium">Rp</span>
                <input 
                  type="number"
                  placeholder="Contoh: 500000"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Keterangan Pengeluaran</label>
              <textarea 
                placeholder="Deskripsi keperluaan biaya kantor..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                value={expNotes}
                onChange={(e) => setExpNotes(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="w-full mt-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4"/> Catat Penyaluran Beban
            </button>
          </form>
        </div>
      </div>

      {/* Tabular Records */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Income Log */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-150 dark:border-slate-700 flex justify-between items-center">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600"/> Historis Pendapatan Koperasi
            </h4>
            <span className="text-xs text-white bg-emerald-700 px-3 py-1 rounded-full font-medium">
              Tot: {formatRupiah(income.reduce((acc, c) => acc + c.nominal, 0))}
            </span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Sumber</th>
                  <th className="px-4 py-2.5">Jumlah</th>
                  <th className="px-4 py-2.5">Ket</th>
                  <th className="px-4 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                {income.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Belum ada pendapatan terekam</td>
                  </tr>
                ) : (
                  income.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-700/35">
                      <td className="px-4 py-2 text-xs">{inc.tanggal}</td>
                      <td className="px-4 py-2 text-xs capitalize text-emerald-600 dark:text-emerald-400 font-medium">
                        {inc.sumber.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">{formatRupiah(inc.nominal)}</td>
                      <td className="px-4 py-2 text-xs max-w-[120px] truncate" title={inc.keterangan}>{inc.keterangan}</td>
                      <td className="px-4 py-2 text-center">
                        <button 
                          onClick={() => {
                            if(window.confirm('Yakin ingin menghapus pendapatan ini?')) onDeleteIncome(inc.id);
                          }}
                          className="p-1 hover:text-rose-600 text-slate-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Log */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-150 dark:border-slate-700 flex justify-between items-center">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600"/> Historis Beban Penyaluran
            </h4>
            <span className="text-xs text-white bg-slate-800 dark:bg-slate-900 px-3 py-1 rounded-full font-medium">
              Tot: {formatRupiah(expenses.reduce((acc, c) => acc + c.nominal, 0))}
            </span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Kategori</th>
                  <th className="px-4 py-2.5">Jumlah</th>
                  <th className="px-4 py-2.5">Ket</th>
                  <th className="px-4 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Belum ada beban dikeluarkan</td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-700/35">
                      <td className="px-4 py-2 text-xs">{exp.tanggal}</td>
                      <td className="px-4 py-2 text-xs capitalize text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">
                        {exp.kategori.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">{formatRupiah(exp.nominal)}</td>
                      <td className="px-4 py-2 text-xs max-w-[120px] truncate" title={exp.keterangan}>{exp.keterangan}</td>
                      <td className="px-4 py-2 text-center">
                        <button 
                          onClick={() => {
                            if(window.confirm('Yakin ingin menghapus beban ini?')) onDeleteExpense(exp.id);
                          }}
                          className="p-1 hover:text-rose-600 text-slate-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= ADMIN & BRANDING PROFILE =================
interface ProfilProps {
  setup: KoperasiSetup;
  onUpdateSetup: (newSetup: KoperasiSetup) => void;
  onResetData: () => void;
  onSyncFromFirebase?: (data: {
    setup?: KoperasiSetup;
    members?: Member[];
    simpanan?: Simpanan[];
    pinjaman?: Pinjaman[];
    angsuran?: Angsuran[];
    income?: PendapatanLain[];
    expenses?: BebanKoperasi[];
  }) => void;
}

export function ProfilKoperasiView({ setup, onUpdateSetup, onResetData, onSyncFromFirebase }: ProfilProps) {
  const [namaKop, setNamaKop] = useState(setup.namaKoperasi);
  const [sloganKop, setSloganKop] = useState(setup.slogan);
  const [alamatKop, setAlamatKop] = useState(setup.alamatKantor);
  const [logoKop, setLogoKop] = useState(setup.logoUrl);
  const [noBadanHukum, setNoBadanHukum] = useState(setup.noBadanHukum || "AHU-00123.AH.01.2026");
  
  // New config fields
  const [jenisBungaPinjaman, setJenisBungaPinjaman] = useState<'flat' | 'menurun'>(setup.jenisBungaPinjaman || 'flat');
  const [biayaProvisiPersen, setBiayaProvisiPersen] = useState<number>(setup.biayaProvisiPersen ?? 1.0);
  const [jasaSimpananSukarelaPersen, setJasaSimpananSukarelaPersen] = useState<number>(setup.jasaSimpananSukarelaPersen ?? 0.5);

  // Setup Awal Neraca states
  const [kasAwal, setKasAwal] = useState<number>(setup.kasAwal ?? 0);
  const [piutangAwal, setPiutangAwal] = useState<number>(setup.piutangAwal ?? 0);
  const [persediaanWarungAwal, setPersediaanWarungAwal] = useState<number>(setup.persediaanWarungAwal ?? 0);
  const [inventarisAwal, setInventarisAwal] = useState<number>(setup.inventarisAwal ?? 0);
  const [simpananPokokAwal, setSimpananPokokAwal] = useState<number>(setup.simpananPokokAwal ?? 0);
  const [simpananWajibAwal, setSimpananWajibAwal] = useState<number>(setup.simpananWajibAwal ?? 0);
  const [simpananSukarelaAwal, setSimpananSukarelaAwal] = useState<number>(setup.simpananSukarelaAwal ?? 0);
  const [modalAwalForm, setModalAwalForm] = useState<number>(setup.modalAwal ?? 0);
  const [danaCadanganAwal, setDanaCadanganAwal] = useState<number>(setup.danaCadanganAwal ?? 0);

  const totalAktivaAwal = kasAwal + piutangAwal + persediaanWarungAwal + inventarisAwal;
  const totalPasivaAwal = simpananPokokAwal + simpananWajibAwal + simpananSukarelaAwal + modalAwalForm + danaCadanganAwal;
  const isBalanced = Math.abs(totalAktivaAwal - totalPasivaAwal) < 1;

  const handleAutoBalance = () => {
    const otherPasiva = simpananPokokAwal + simpananWajibAwal + simpananSukarelaAwal + danaCadanganAwal;
    const balancedModal = totalAktivaAwal - otherPasiva;
    setModalAwalForm(balancedModal);
  };

  const [savedNotif, setSavedNotif] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Firebase integration states
  const [firebaseApiKey, setFirebaseApiKey] = useState('');
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState('');
  const [firebaseProjectId, setFirebaseProjectId] = useState('');
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState('');
  const [firebaseSenderId, setFirebaseSenderId] = useState('');
  const [firebaseAppId, setFirebaseAppId] = useState('');

  const [fbStatus, setFbStatus] = useState<{ type: 'IDLE' | 'LOADING' | 'CONNECTED' | 'ERROR'; message?: string }>({ type: 'IDLE' });
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: 'SUCCESS' | 'ERROR'; message: string } | null>(null);

  useEffect(() => {
    const config = getStoredFirebaseConfig();
    if (config) {
      setFirebaseApiKey(config.apiKey || '');
      setFirebaseAuthDomain(config.authDomain || '');
      setFirebaseProjectId(config.projectId || '');
      setFirebaseStorageBucket(config.storageBucket || '');
      setFirebaseSenderId(config.messagingSenderId || '');
      setFirebaseAppId(config.appId || '');
      
      const res = initializeDynamicFirebase();
      if (res.success) {
        setFbStatus({ type: 'CONNECTED', message: `Terhubung dengan Firebase database (${config.projectId})` });
      } else {
        setFbStatus({ type: 'IDLE' });
      }
    }
  }, []);

  // File processors helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Hanya berkas gambar/foto yang diperbolehkan!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoKop(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSetup({
      namaKoperasi: namaKop,
      slogan: sloganKop,
      alamatKantor: alamatKop,
      noBadanHukum: noBadanHukum,
      logoUrl: logoKop,
      jenisBungaPinjaman,
      biayaProvisiPersen: parseFloat(biayaProvisiPersen as any) || 0,
      jasaSimpananSukarelaPersen: parseFloat(jasaSimpananSukarelaPersen as any) || 0,
      kasAwal: parseFloat(kasAwal as any) || 0,
      piutangAwal: parseFloat(piutangAwal as any) || 0,
      persediaanWarungAwal: parseFloat(persediaanWarungAwal as any) || 0,
      inventarisAwal: parseFloat(inventarisAwal as any) || 0,
      simpananPokokAwal: parseFloat(simpananPokokAwal as any) || 0,
      simpananWajibAwal: parseFloat(simpananWajibAwal as any) || 0,
      simpananSukarelaAwal: parseFloat(simpananSukarelaAwal as any) || 0,
      modalAwal: parseFloat(modalAwalForm as any) || 0,
      danaCadanganAwal: parseFloat(danaCadanganAwal as any) || 0
    });
    setSavedNotif(true);
    setTimeout(() => setSavedNotif(false), 3000);
  };

  const handleTestAndSaveFirebase = async () => {
    if (!firebaseApiKey || !firebaseProjectId) {
      setFbStatus({ type: 'ERROR', message: 'API Key dan Project ID wajib diisi.' });
      return;
    }

    setFbStatus({ type: 'LOADING' });
    const config: FirebaseClientConfig = {
      apiKey: firebaseApiKey,
      authDomain: firebaseAuthDomain || `${firebaseProjectId}.firebaseapp.com`,
      projectId: firebaseProjectId,
      storageBucket: firebaseStorageBucket || `${firebaseProjectId}.appspot.com`,
      messagingSenderId: firebaseSenderId,
      appId: firebaseAppId
    };

    const res = await testFirestoreConnection(config);
    if (res.success) {
      saveFirebaseConfig(config);
      setFbStatus({ type: 'CONNECTED', message: `Berhasil terhubung ke database "${firebaseProjectId}"` });
      setSyncResult({ type: 'SUCCESS', message: 'Konfigurasi Firebase berhasil disimpan dan diverifikasi aktif!' });
      setTimeout(() => setSyncResult(null), 5000);
    } else {
      setFbStatus({ type: 'ERROR', message: res.error });
    }
  };

  const handleDisconnectFirebase = () => {
    if (window.confirm("Apakah Anda ingin memutuskan koneksi Firebase dan kembali ke mode penyimpanan lokal?")) {
      clearFirebaseConfig();
      setFirebaseApiKey('');
      setFirebaseAuthDomain('');
      setFirebaseProjectId('');
      setFirebaseStorageBucket('');
      setFirebaseSenderId('');
      setFirebaseAppId('');
      setFbStatus({ type: 'IDLE' });
      setSyncResult({ type: 'SUCCESS', message: 'Koneksi Firebase berhasil dilepas.' });
      setTimeout(() => setSyncResult(null), 3000);
    }
  };

  const handlePushToFirebase = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const currentSetup = [setup];
      const currentMembers = JSON.parse(localStorage.getItem('kop_members') || '[]');
      const currentSimpanan = JSON.parse(localStorage.getItem('kop_simpanan') || '[]');
      const currentPinjaman = JSON.parse(localStorage.getItem('kop_pinjaman') || '[]');
      const currentAngsuran = JSON.parse(localStorage.getItem('kop_angsuran') || '[]');
      const currentIncome = JSON.parse(localStorage.getItem('kop_income') || '[]');
      const currentExpenses = JSON.parse(localStorage.getItem('kop_expenses') || '[]');

      const resSetup = await pushCollectionToFirestore('koperasi_setup', currentSetup);
      const resMembers = await pushCollectionToFirestore('koperasi_members', currentMembers);
      const resSimpanan = await pushCollectionToFirestore('koperasi_simpanan', currentSimpanan);
      const resPinjaman = await pushCollectionToFirestore('koperasi_pinjaman', currentPinjaman);
      const resAngsuran = await pushCollectionToFirestore('koperasi_angsuran', currentAngsuran);
      const resIncome = await pushCollectionToFirestore('koperasi_income', currentIncome);
      const resExpenses = await pushCollectionToFirestore('koperasi_expenses', currentExpenses);

      if (resSetup.success && resMembers.success && resSimpanan.success && resPinjaman.success && resAngsuran.success && resIncome.success && resExpenses.success) {
        setSyncResult({ 
          type: 'SUCCESS', 
          message: `Berhasil mencadangkan seluruh data lokal ke Firebase (${currentMembers.length} Anggota, ${currentSimpanan.length} Simpanan, ${currentPinjaman.length} Pinjaman, ${currentAngsuran.length} Angsuran)` 
        });
      } else {
        const errMsg = [resSetup.error, resMembers.error, resSimpanan.error, resPinjaman.error, resAngsuran.error, resIncome.error, resExpenses.error].filter(Boolean).join('; ');
        setSyncResult({ type: 'ERROR', message: `Beberapa data gagal dikirim: ${errMsg}` });
      }
    } catch (err: any) {
      setSyncResult({ type: 'ERROR', message: `Kesalahan saat sinkronisasi: ${err?.message || String(err)}` });
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePullFromFirebase = async () => {
    if (!onSyncFromFirebase) {
      setSyncResult({ type: 'ERROR', message: 'Perayap sinkronisasi tidak terpasang di modul utama.' });
      return;
    }
    if (!window.confirm("PERINGATAN: Tindakan ini akan menimpa data koperasi lokal Anda dengan data yang diambil dari Firebase Firestore. Lanjutkan?")) {
      return;
    }

    setSyncLoading(true);
    setSyncResult(null);
    try {
      const resSetup = await fetchCollectionFromFirestore('koperasi_setup');
      const resMembers = await fetchCollectionFromFirestore('koperasi_members');
      const resSimpanan = await fetchCollectionFromFirestore('koperasi_simpanan');
      const resPinjaman = await fetchCollectionFromFirestore('koperasi_pinjaman');
      const resAngsuran = await fetchCollectionFromFirestore('koperasi_angsuran');
      const resIncome = await fetchCollectionFromFirestore('koperasi_income');
      const resExpenses = await fetchCollectionFromFirestore('koperasi_expenses');

      if (resSetup.success && resMembers.success && resSimpanan.success && resPinjaman.success && resAngsuran.success && resIncome.success && resExpenses.success) {
        
        const fbSetup: KoperasiSetup = resSetup.data?.[0] || setup;
        const fbMembers: Member[] = resMembers.data || [];
        const fbSimpanan: Simpanan[] = resSimpanan.data || [];
        const fbPinjaman: Pinjaman[] = resPinjaman.data || [];
        const fbAngsuran: Angsuran[] = resAngsuran.data || [];
        const fbIncome: PendapatanLain[] = resIncome.data || [];
        const fbExpenses: BebanKoperasi[] = resExpenses.data || [];

        onSyncFromFirebase({
          setup: fbSetup,
          members: fbMembers,
          simpanan: fbSimpanan,
          pinjaman: fbPinjaman,
          angsuran: fbAngsuran,
          income: fbIncome,
          expenses: fbExpenses
        });

        // Update local component state as well contextually
        setNamaKop(fbSetup.namaKoperasi);
        setSloganKop(fbSetup.slogan);
        setAlamatKop(fbSetup.alamatKantor);
        setNoBadanHukum(fbSetup.noBadanHukum || "AHU-00123.AH.01.2026");
        setLogoKop(fbSetup.logoUrl);
        setJenisBungaPinjaman(fbSetup.jenisBungaPinjaman);
        setBiayaProvisiPersen(fbSetup.biayaProvisiPersen);
        setJasaSimpananSukarelaPersen(fbSetup.jasaSimpananSukarelaPersen);

        setSyncResult({ 
          type: 'SUCCESS', 
          message: `Sukses memuat & mensinkronkan data dari Firebase Firestore! (${fbMembers.length} Anggota, ${fbSimpanan.length} Simpanan, ${fbPinjaman.length} Pinjaman)` 
        });
      } else {
        setSyncResult({ type: 'ERROR', message: "Gagal mengunduh dataset lengkap dari Firestore." });
      }
    } catch (err: any) {
      setSyncResult({ type: 'ERROR', message: `Kesalahan saat sinkronisasi turun: ${err?.message || String(err)}` });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleClearTrigger = () => {
    if (window.confirm("PERINGATAN KRITIKAL: Tindakan ini akan menghapus semua anggota, simpanan, pinjaman, angsuran, kas masuk, kas keluar, pembelian, dan piutang warung secara permanen dari database. Lanjutkan?")) {
      onResetData();
      alert("Seluruh data koperasi berhasil dikosongkan!");
      window.location.reload();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
          <span className="p-2 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 rounded-lg"><Building className="w-5 h-5"/></span>
          Profil & Personalisasi Koperasi
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Sesuaikan nama koperasi, slogan, logo foto kantor, serta aturan perhitungan keuangan dan bunga simpanan/pinjaman di bawah ini.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">NAMA KOPERASI</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                value={namaKop}
                onChange={(e) => setNamaKop(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">LOGOGRAM EMOTICON SEBAGAI ALTERNATIF</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                value={logoKop && logoKop.startsWith('data:image') ? '' : logoKop}
                placeholder="Contoh: 🌱, 🏛️, 💼 (Kosongkan jika memakai upload foto)"
                onChange={(e) => setLogoKop(e.target.value)}
              />
            </div>
          </div>

          {/* DRAG AND DROP FILE UPLOADER FOR MANUAL LOGO PHOTO */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">UPLOAD LOGO FOTO KOPERASI</label>
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all ${
                isDragging 
                  ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-900/20 shadow-md' 
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-slate-900/80 cursor-pointer'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-5 w-full justify-center">
                <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-800 text-3xl font-bold overflow-hidden select-none shadow-sm shrink-0">
                  {logoKop && logoKop.startsWith('data:image') ? (
                    <img src={logoKop} alt="Preview Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{logoKop || '🌱'}</span>
                  )}
                </div>
                <div className="text-center sm:text-left space-y-1.5 flex-1 md:max-w-md">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Tarik dan lepaskan foto/logo Koperasi Anda di sini, atau <label className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer">
                      Pilih Foto Manual
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange} 
                      />
                    </label>
                  </p>
                  <p className="text-[10px] text-slate-450">Format berkas: PNG, JPG, JPEG, GIF. Dimensi direkomendasikan memiliki rasio 1:1.</p>
                  {logoKop && logoKop.startsWith('data:image') && (
                    <button 
                      type="button"
                      onClick={() => setLogoKop('🌱')}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-bold border border-rose-200 dark:border-rose-900 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 transition cursor-pointer"
                    >
                      Reset Ke Emoticon Default
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">TAGLINE / SLOGAN KOPERASI</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                value={sloganKop}
                onChange={(e) => setSloganKop(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">NOMOR BADAN HUKUM KOPERASI</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                value={noBadanHukum}
                onChange={(e) => setNoBadanHukum(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">ALAMAT UTAMA KANTOR OPRASIONAL</label>
            <textarea 
              rows={2}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              value={alamatKop}
              onChange={(e) => setAlamatKop(e.target.value)}
              required
            />
          </div>

          {/* SETUP PARAMETER FINANCIAL DAN KOPERASI */}
          <div className="border-t border-slate-150 dark:border-slate-700 pt-5 mt-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600"/> 
              Aturan Jasa Finansial, Provisi, & Bunga
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">METODE BUNGA PINJAMAN</label>
                <select
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none font-bold"
                  value={jenisBungaPinjaman}
                  onChange={(e) => setJenisBungaPinjaman(e.target.value as 'flat' | 'menurun')}
                >
                  <option value="flat">Bunga Tetap (Flat)</option>
                  <option value="menurun">Bunga Menurun (Efektif)</option>
                </select>
                <p className="text-[10px] text-slate-400">Menentukan metode hitung pokok & jasa pinjaman anggota.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">BIAYA PROVISI AKAD (%)</label>
                <div className="relative">
                  <input 
                    type="number" step="0.1" min="0" max="100"
                    className="w-full px-3 py-2 pr-8 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono font-bold"
                    value={biayaProvisiPersen}
                    onChange={(e) => setBiayaProvisiPersen(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-400">Persentase potongan administrasi saat akad dicarikan.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">JASA TABUNGAN MANASUKA (%)</label>
                <div className="relative">
                  <input 
                    type="number" step="0.05" min="0" max="100"
                    className="w-full px-3 py-2 pr-12 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono font-bold"
                    value={jasaSimpananSukarelaPersen}
                    onChange={(e) => setJasaSimpananSukarelaPersen(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-450 font-bold">% / bln</span>
                </div>
                <p className="text-[10px] text-slate-400">Suku bunga bulanan dalam pembagian dividen manasuka.</p>
              </div>

            </div>
          </div>

          {/* SETUP AWAL NERACA KOPERASI */}
          <div className="border-t border-slate-150 dark:border-slate-700 pt-5 mt-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600"/> 
                Setup / Saldo Awal Neraca Koperasi
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isBalanced ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/45 dark:text-amber-450'}`}>
                {isBalanced ? "✓ Neraca Seimbang" : "⚠ Belum Seimbang"}
              </span>
            </h4>
            <p className="text-xs text-slate-500">
              Isi data saldo awal neraca sebelum koperasi berjalan. Sisi Aktiva (Aset) wajib berimbang dengan sisi Pasiva (Liabilitas + Ekuitas) untuk kepatuhan double-entry bookkeeping.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              {/* Aktiva (Aset) */}
              <div>
                <h5 className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2.5">
                  SISI AKTIVA / ASET (TOTAL: <span className="font-mono">{formatRupiah(totalAktivaAwal)}</span>)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">KAS & BANK UTAMA (IDR)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold"
                      value={kasAwal}
                      onChange={(e) => setKasAwal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">PIUTANG ANGGOTA AWAL (IDR)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold"
                      value={piutangAwal}
                      onChange={(e) => setPiutangAwal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">PERSEDIAAN WARUNG AWAL (IDR)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold"
                      value={persediaanWarungAwal}
                      onChange={(e) => setPersediaanWarungAwal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">INVENTARIS & ASET TETAP (IDR)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold"
                      value={inventarisAwal}
                      onChange={(e) => setInventarisAwal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Pasiva (Liabilitas & Ekuitas) */}
              <div className="border-t border-slate-200/60 dark:border-slate-800 pt-3">
                <h5 className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2.5">
                  SISI PASIVA / KEWAJIBAN & EKUITAS (TOTAL: <span className="font-mono">{formatRupiah(totalPasivaAwal)}</span>)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">SIMPANAN POKOK AWAL</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold"
                      value={simpananPokokAwal}
                      onChange={(e) => setSimpananPokokAwal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">SIMPANAN WAJIB AWAL</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold"
                      value={simpananWajibAwal}
                      onChange={(e) => setSimpananWajibAwal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">SIMPANAN SUKARELA AWAL</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold"
                      value={simpananSukarelaAwal}
                      onChange={(e) => setSimpananSukarelaAwal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">MODAL SENDIRI / POKOK</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold"
                      value={modalAwalForm}
                      onChange={(e) => setModalAwalForm(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">DANA CADANGAN AWAL</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold"
                      value={danaCadanganAwal}
                      onChange={(e) => setDanaCadanganAwal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Balance Warning and Auto-balancer helper */}
              {!isBalanced && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 animate-pulse"/>
                    <span>
                      Neraca belum seimbang! Selisih Aktiva & Pasiva: <strong className="font-mono text-rose-700 dark:text-rose-400">{formatRupiah(Math.abs(totalAktivaAwal - totalPasivaAwal))}</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoBalance}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer select-none shadow transition"
                  >
                    Seimbangkan via Modal Sendiri
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-150 dark:border-slate-700">
            {savedNotif && (
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 px-3.5 py-1.5 rounded-lg border border-emerald-150 dark:border-emerald-800">
                Konfigurasi profil & aturan koperasi sukses diperbarui!
              </span>
            )}
            <button 
              type="submit"
              className="ml-auto bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-1.5 cursor-pointer shadow animate-hover"
            >
              <Save className="w-4 h-4"/> Simpan Perubahan Profil & Aturan
            </button>
          </div>
        </form>
      </div>

      {/* SECTION: FIREBASE DATABASE SYNCHRONIZATION */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">
                <Database className="w-5 h-5 text-emerald-600"/>
              </span>
              Sinkronisasi Cloud Google Firebase
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Hubungkan koperasi ke basis data Firestore Anda sendiri (misal nama project <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded font-bold text-emerald-700 dark:text-emerald-400">danasegar</span>).
            </p>
          </div>
          
          {/* Badge statuses */}
          <div>
            {fbStatus.type === 'CONNECTED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Wifi className="w-3.5 h-3.5 animate-pulse" /> Terhubung Firestore
              </span>
            ) : fbStatus.type === 'LOADING' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifikasi...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                <WifiOff className="w-3.5 h-3.5" /> Offline Lokal
              </span>
            )}
          </div>
        </div>

        {/* Input credentials form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">FIREBASE API KEY</label>
            <input 
              type="password" 
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono"
              value={firebaseApiKey}
              onChange={(e) => setFirebaseApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">PROJECT ID (Contoh: danasegar)</label>
            <input 
              type="text" 
              placeholder="danasegar"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono font-bold"
              value={firebaseProjectId}
              onChange={(e) => setFirebaseProjectId(e.target.value)}
            />
          </div>
        </div>

        {/* Accordioned More advanced credentials (optional) */}
        <details className="group border border-slate-150 dark:border-slate-750 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 overflow-hidden">
          <summary className="list-none flex items-center justify-between p-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-800/10">
            <span>PARAMETER CREDENTIALS TAMBAHAN (OPTIONAL)</span>
            <span className="transition group-open:rotate-180 text-[10px]">▼</span>
          </summary>
          <div className="p-4 border-t border-slate-150 dark:border-slate-750 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-450">AUTH DOMAIN</label>
              <input 
                type="text" 
                placeholder="danasegar.firebaseapp.com"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono"
                value={firebaseAuthDomain}
                onChange={(e) => setFirebaseAuthDomain(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-450">STORAGE BUCKET</label>
              <input 
                type="text" 
                placeholder="danasegar.appspot.com"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono"
                value={firebaseStorageBucket}
                onChange={(e) => setFirebaseStorageBucket(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-450">MESSAGING SENDER ID</label>
              <input 
                type="text" 
                placeholder="987654321012"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono"
                value={firebaseSenderId}
                onChange={(e) => setFirebaseSenderId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-450">APP ID</label>
              <input 
                type="text" 
                placeholder="1:987654321012:web:abcdef..."
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono"
                value={firebaseAppId}
                onChange={(e) => setFirebaseAppId(e.target.value)}
              />
            </div>
          </div>
        </details>

        {/* Sync results notifications */}
        {syncResult && (
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
            syncResult.type === 'SUCCESS'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-150 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-150 dark:border-rose-950 text-rose-800 dark:text-rose-300'
          }`}>
            {syncResult.type === 'SUCCESS' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-605" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />}
            <div>
              <p className="font-semibold">{syncResult.type === 'SUCCESS' ? 'Aksi Berhasil' : 'Kesalahan Aksi'}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed font-mono opacity-90">{syncResult.message}</p>
            </div>
          </div>
        )}

        {/* Button Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div>
            {fbStatus.type === 'CONNECTED' ? (
              <button
                type="button"
                onClick={handleDisconnectFirebase}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold cursor-pointer hover:underline"
              >
                Putuskan Koneksi Firebase
              </button>
            ) : (
              <button
                type="button"
                disabled={fbStatus.type === 'LOADING'}
                onClick={handleTestAndSaveFirebase}
                className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg text-xs cursor-pointer shadow-sm disabled:opacity-50"
              >
                {fbStatus.type === 'LOADING' ? 'Mencoba Koneksi...' : 'Verifikasi & Simpan Kredensial Firebase'}
              </button>
            )}
          </div>

          {fbStatus.type === 'CONNECTED' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={syncLoading}
                onClick={handlePullFromFirebase}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CloudDownload className="w-3.5 h-3.5" /> 
                {syncLoading ? 'Sinkron...' : 'Impor dari Firestore'}
              </button>
              <button
                type="button"
                disabled={syncLoading}
                onClick={handlePushToFirebase}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CloudUpload className="w-3.5 h-3.5" /> 
                {syncLoading ? 'Sinkron...' : 'Ekspor ke Firestore'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 uppercase tracking-wide">
            <RefreshCw className="w-4 h-4 text-rose-700 animate-spin"/> Pusat Pembersihan Data Kritis
          </h4>
          <p className="text-xs text-rose-700/80 dark:text-rose-450 mt-1">
            Ingin mengosongkan seluruh data transaksi beserta data anggota di database koperasi untuk mulai dari awal? Lakukan lewat tombol di samping.
          </p>
        </div>
        <button 
          onClick={handleClearTrigger}
          className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg shrink-0 transition cursor-pointer shadow-md"
        >
          Kosongkan Semua Data Koperasi
        </button>
      </div>
    </div>
  );
}
