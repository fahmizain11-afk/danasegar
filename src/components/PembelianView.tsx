import React, { useState } from 'react';
import { Member, Pembelian, PiutangWarung, KoperasiSetup } from '../types';
import { formatRupiah } from '../utils/finance';
import { 
  ShoppingCart, Plus, Trash2, Calendar, DollarSign, Tag, FileText, 
  Store, Users, Search, ArrowUpRight, ArrowDownLeft, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PembelianProps {
  setup?: KoperasiSetup;
  members: Member[];
  pembelian: Pembelian[];
  piutangWarung: PiutangWarung[];
  onAddPembelian: (item: Omit<Pembelian, 'id'>) => void;
  onDeletePembelian: (id: string) => void;
  onAddPiutang: (item: Omit<PiutangWarung, 'id'>) => void;
  onDeletePiutang: (id: string) => void;
}

export function PembelianView({
  setup,
  members,
  pembelian,
  piutangWarung,
  onAddPembelian,
  onDeletePembelian,
  onAddPiutang,
  onDeletePiutang
}: PembelianProps) {
  // Tabs for sub-sections: 'pembelian' or 'piutang'
  const [subTab, setSubTab] = useState<'pembelian' | 'piutang'>('pembelian');

  // Form states for Pembelian
  const [pemDate, setPemDate] = useState(new Date().toISOString().substring(0, 10));
  const [pemName, setPemName] = useState('');
  const [pemCat, setPemCat] = useState<'persediaan_warung' | 'seragam' | 'persediaan_barang' | 'inventaris' | 'lain_lain'>('persediaan_warung');
  const [pemQty, setPemQty] = useState('1');
  const [pemPrice, setPemPrice] = useState('');
  const [pemNotes, setPemNotes] = useState('');

  // Form states for Piutang Warung
  const [piuAnggotaId, setPiuAnggotaId] = useState(members[0]?.id || '');
  const [piuDate, setPiuDate] = useState(new Date().toISOString().substring(0, 10));
  const [piuJenis, setPiuJenis] = useState<'hutang_baru' | 'pelunasan'>('hutang_baru');
  const [piuNominal, setPiuNominal] = useState('');
  const [piuNotes, setPiuNotes] = useState('');

  // Local Search state
  const [searchQuery, setSearchQuery] = useState('');

  const handlePembelianSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(pemQty);
    const prc = parseFloat(pemPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(prc) || prc <= 0 || !pemName.trim()) {
      alert("Harap lengkapi formulir pembelian dengan nilai yang valid!");
      return;
    }

    onAddPembelian({
      tanggal: pemDate,
      namaBarang: pemName.trim(),
      kategori: pemCat,
      kuantitas: qty,
      hargaSatuan: prc,
      totalHarga: qty * prc,
      keterangan: pemNotes.trim() || `Pembelian ${pemName.trim()}`
    });

    // Reset Form
    setPemName('');
    setPemQty('1');
    setPemPrice('');
    setPemNotes('');
    alert("Transaksi Pembelian berhasil disimpan ke database!");
  };

  const handlePiutangSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nom = parseFloat(piuNominal);
    if (isNaN(nom) || nom <= 0 || !piuAnggotaId) {
      alert("Harap lengkapi data piutang dengan nominal yang valid!");
      return;
    }

    onAddPiutang({
      anggotaId: piuAnggotaId,
      tanggal: piuDate,
      jenis: piuJenis,
      nominal: nom,
      keterangan: piuNotes.trim() || (piuJenis === 'hutang_baru' ? "Piutang Warung Baru" : "Pelunasan Piutang Warung")
    });

    // Reset Form
    setPiuNominal('');
    setPiuNotes('');
    alert("Transaksi Piutang Warung berhasil disimpan!");
  };

  // Filtered Lists
  const filteredPembelian = pembelian.filter(p => {
    const term = searchQuery.toLowerCase();
    return p.namaBarang.toLowerCase().includes(term) || 
           p.keterangan.toLowerCase().includes(term) ||
           p.kategori.replace('_', ' ').toLowerCase().includes(term);
  }).sort((a,b) => b.tanggal.localeCompare(a.tanggal));

  const filteredPiutang = piutangWarung.filter(pw => {
    const member = members.find(m => m.id === pw.anggotaId);
    const term = searchQuery.toLowerCase();
    return (member?.nama || '').toLowerCase().includes(term) || 
           (member?.noAnggota || '').toLowerCase().includes(term) ||
           pw.keterangan.toLowerCase().includes(term);
  }).sort((a,b) => b.tanggal.localeCompare(a.tanggal));

  // Totals calculations
  const totalPembelianSum = pembelian.reduce((acc, c) => acc + c.totalHarga, 0);
  const totalPiutangWarungSum = piutangWarung.reduce((acc, c) => {
    return acc + (c.jenis === 'hutang_baru' ? c.nominal : -c.nominal);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-3xl border border-emerald-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="p-3 bg-white/10 backdrop-blur-md rounded-2xl"><ShoppingCart className="w-6 h-6 text-white"/></span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Pusat Belanja & Warung Koperasi</h2>
              <p className="text-xs text-emerald-100 mt-1">Kelola perolehan persediaan, aset inventaris, serta catatan piutang warung anggota cooperative shop.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-center min-w-[120px]">
              <span className="text-[10px] text-emerald-200 block uppercase font-mono">Total Pembelian</span>
              <span className="text-sm font-bold font-mono">{formatRupiah(totalPembelianSum)}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-center min-w-[124px]">
              <span className="text-[10px] text-emerald-250 block uppercase font-mono">Baki Piutang Warung</span>
              <span className="text-sm font-bold font-mono text-amber-200">{formatRupiah(Math.max(0, totalPiutangWarungSum))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-NavigationBar Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-750 gap-4">
        <button 
          onClick={() => { setSubTab('pembelian'); setSearchQuery(''); }}
          className={`pb-2.5 text-xs font-bold leading-none cursor-pointer border-b-2 transition ${
            subTab === 'pembelian' 
              ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">🛒 Pembelian Persediaan & Aset</span>
        </button>
        <button 
          onClick={() => { setSubTab('piutang'); setSearchQuery(''); }}
          className={`pb-2.5 text-xs font-bold leading-none cursor-pointer border-b-2 transition ${
            subTab === 'piutang' 
              ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">💳 Manajemen Piutang Warung</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side Form Column (Span 1) */}
        <div className="lg:col-span-1 space-y-6">
          {subTab === 'pembelian' ? (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <Plus className="w-4 h-4 text-emerald-600"/> Catat Pembelian Aset/Persediaan
              </h3>
              <form onSubmit={handlePembelianSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tanggal Transaksi</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-405" />
                    <input 
                      type="date" 
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600"
                      value={pemDate}
                      onChange={(e) => setPemDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Nama Barang / Deskripsi</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-405" />
                    <input 
                      type="text" 
                      placeholder="Contoh: Beras SPHP Rajawali"
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600"
                      value={pemName}
                      onChange={(e) => setPemName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Kategori Rekening / Pos Neraca</label>
                  <select 
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600 font-medium"
                    value={pemCat}
                    onChange={(e) => setPemCat(e.target.value as any)}
                  >
                    <option value="persediaan_warung">🛍️ Persediaan Toko/Warung</option>
                    <option value="persediaan_barang">📦 Persediaan Barang Dagang Lain</option>
                    <option value="seragam">👕 Seragam Anggota / Pengurus</option>
                    <option value="inventaris">🖥️ Inventaris Kantor / Hardware</option>
                    <option value="lain_lain">📝 Pengeluaran Pembelian Lain</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Kuantitas (Qty)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600"
                      value={pemQty}
                      onChange={(e) => setPemQty(e.target.value)}
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Harga Satuan (Rp)</label>
                    <input 
                      type="number" 
                      placeholder="Contoh: 15000"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600"
                      value={pemPrice}
                      onChange={(e) => setPemPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-dashed flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-500">Estimasi Total:</span>
                  <span className="font-bold text-emerald-700">{formatRupiah((parseInt(pemQty) || 0) * (parseFloat(pemPrice) || 0))}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Keterangan / Supplier</label>
                  <textarea 
                    placeholder="Sumber toko, merek, atau nama pabrik..."
                    rows={2}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600"
                    value={pemNotes}
                    onChange={(e) => setPemNotes(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus className="w-4 h-4"/> Catat Pembelian Tunai
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <Plus className="w-4 h-4 text-emerald-600"/> Transaksi Piutang Warung
              </h3>
              <form onSubmit={handlePiutangSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pilih Anggota Debtur</label>
                  <select
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600 font-medium"
                    value={piuAnggotaId}
                    onChange={(e) => setPiuAnggotaId(e.target.value)}
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.noAnggota} - {m.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tanggal Transaksi</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600"
                    value={piuDate}
                    onChange={(e) => setPiuDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Jenis Transaksi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPiuJenis('hutang_baru')}
                      className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer transition flex items-center justify-center gap-1 ${
                        piuJenis === 'hutang_baru' 
                          ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/20 dark:text-amber-400' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-600'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> Piutang Baru
                    </button>
                    <button
                      type="button"
                      onClick={() => setPiuJenis('pelunasan')}
                      className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer transition flex items-center justify-center gap-1 ${
                        piuJenis === 'pelunasan' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-600'
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" /> Pelunasan
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Nominal Transaksi (Rp)</label>
                  <div className="relative font-mono text-xs">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-medium">Rp</span>
                    <input 
                      type="number"
                      placeholder="Contoh: 154000"
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600"
                      value={piuNominal}
                      onChange={(e) => setPiuNominal(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Keterangan Catatan / Sembako</label>
                  <textarea 
                    placeholder="Contoh: Pembelian sembako bon bulan Juni..."
                    rows={2}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600"
                    value={piuNotes}
                    onChange={(e) => setPiuNotes(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className={`w-full text-xs font-bold py-2 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 shadow-sm text-white ${
                    piuJenis === 'hutang_baru' ? 'bg-amber-700 hover:bg-amber-800' : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  <Plus className="w-4 h-4"/> Simpan Piutang
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Side Transaction Lists (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Searching Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-150 dark:border-slate-700 flex gap-3 items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2 text-slate-400"><Search className="w-4 h-4" /></span>
              <input 
                type="text" 
                placeholder={subTab === 'pembelian' ? "Cari nama barang, kategori, rincian pembelian..." : "Cari nama debitur, mutasi utang warung..."}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600 rounded-lg placeholder-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm">
            {subTab === 'pembelian' ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-emerald-600" /> Histori Pembelian Stok & Inventaris
                  </h4>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-350">
                    {filteredPembelian.length} Transaksi
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-medium">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Nama Barang</th>
                        <th className="py-2.5 px-3">Kategori POS</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                        <th className="py-2.5 px-3 text-right">Total Outlay</th>
                        <th className="py-2.5 px-3 text-center">Akutabilitas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-medium">
                      {filteredPembelian.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 font-normal italic">
                            Belum ada dokumen / kecocokan data transaksi pembelian.
                          </td>
                        </tr>
                      ) : (
                        filteredPembelian.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-200 transition">
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{p.tanggal}</td>
                            <td className="py-3 px-3">
                              <p className="font-semibold text-slate-850 dark:text-slate-100 leading-tight">{p.namaBarang}</p>
                              {p.keterangan && <p className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{p.keterangan}</p>}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                                {p.kategori.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono">{p.kuantitas}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-500">{formatRupiah(p.hargaSatuan)}</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-50 font-mono text-[12px]">{formatRupiah(p.totalHarga)}</td>
                            <td className="py-3 px-3 text-center">
                              <button 
                                onClick={() => {
                                  if(confirm("Apakah Anda yakin ingin membatalkan/menghapus catatan pembelian ini?")) {
                                    onDeletePembelian(p.id);
                                  }
                                }}
                                className="p-1 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 transition cursor-pointer"
                                title="Hapus Catatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" /> Mutasi Log Piutang Belanja Anggota
                  </h4>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-350">
                    {filteredPiutang.length} Ledger
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-medium">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Anggota</th>
                        <th className="py-2.5 px-3">Aliran Transaksi</th>
                        <th className="py-2.5 px-3">Catatan / Sembako</th>
                        <th className="py-2.5 px-3 text-right">Besaran Nominal</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-medium">
                      {filteredPiutang.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-normal italic">
                            Belum ada kecocokan data piutang / utang toko.
                          </td>
                        </tr>
                      ) : (
                        filteredPiutang.map(pw => {
                          const member = members.find(m => m.id === pw.anggotaId);
                          return (
                            <tr key={pw.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-200 transition">
                              <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{pw.tanggal}</td>
                              <td className="py-3 px-3">
                                <p className="font-bold text-slate-850 dark:text-slate-100 leading-tight">{member?.nama || "Anggota Terhapus"}</p>
                                <p className="text-[10px] text-slate-400 font-mono font-normal">{member?.noAnggota || '-'}</p>
                              </td>
                              <td className="py-3 px-3">
                                {pw.jenis === 'hutang_baru' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                                    <ArrowUpRight className="w-3 h-3" /> Utang Baru (+Baki)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                                    <ArrowDownLeft className="w-3 h-3" /> Pelunasan Sembako (-Baki)
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <p className="text-[11px] font-normal text-slate-600 dark:text-slate-300 max-w-xs truncate">{pw.keterangan || '-'}</p>
                              </td>
                              <td className={`py-3 px-3 text-right font-bold font-mono text-[12px] ${
                                pw.jenis === 'hutang_baru' ? 'text-amber-600 dark:text-amber-450' : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {pw.jenis === 'hutang_baru' ? '+' : '-'}{formatRupiah(pw.nominal)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button 
                                  onClick={() => {
                                    if(confirm("Apakah Anda yakin ingin menghapus catatan piutang warung ini?")) {
                                      onDeletePiutang(pw.id);
                                    }
                                  }}
                                  className="p-1 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 transition cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
