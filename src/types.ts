export interface Member {
  id: string;
  noAnggota: string;
  nama: string;
  alamat: string;
  noHp: string;
  tanggalBergabung: string;
  jenisKelamin?: 'Laki-laki' | 'Perempuan';
  isVerified?: boolean; // true = active member, false/undefined = pending verification
}

export interface KoperasiSetup {
  namaKoperasi: string;
  slogan: string;
  alamatKantor: string;
  noBadanHukum?: string; // Custom legal status number
  logoUrl: string; // Base64 or icon name
  jenisBungaPinjaman: 'flat' | 'menurun';
  biayaProvisiPersen: number;
  jasaSimpananSukarelaPersen: number;

  // Setup Awal Neraca (Initial Balance Sheet)
  kasAwal?: number;
  piutangAwal?: number;
  persediaanWarungAwal?: number;
  inventarisAwal?: number;
  simpananPokokAwal?: number;
  simpananWajibAwal?: number;
  simpananSukarelaAwal?: number;
  modalAwal?: number;
  danaCadanganAwal?: number;
}

export interface Simpanan {
  id: string;
  anggotaId: string;
  tanggal: string;
  jenis: 'Pokok' | 'Wajib' | 'Sukarela';
  jumlah: number;
  keterangan: string;
  transaksiId?: string; // Groups multiple savings in a single receipt
}

export interface Pinjaman {
  id: string;
  anggotaId: string;
  tanggal: string;
  nominalPinjaman: number;
  tenor: number; // in months
  bungaFlatPersen: number; // e.g., 1.5%
  biayaProvisiPersen: number; // e.g., 1%
  provisiDipotong: number; // provisi deducted (nominal * 1%)
  jumlahDiterima: number; // nominal - provisi
  status: 'Belum Lunas' | 'Lunas';
  angsuranPokokPerBulan: number;
  jasaPerBulan: number;
  totalAngsuranPerBulan: number;
  totalWajibBayar: number;
}

export interface Angsuran {
  id: string;
  pinjamanId: string;
  anggotaId: string;
  tanggal: string;
  jumlahBayar: number;
  bulanKe: number;
  keterangan: string;
}

export interface PendapatanLain {
  id: string;
  tanggal: string;
  sumber: 'warung' | 'bunga_simpanan' | 'denda' | 'lain_lain';
  nominal: number;
  keterangan: string;
}

export interface BebanKoperasi {
  id: string;
  tanggal: string;
  kategori: 'gaji_karyawan' | 'listrik' | 'gaji_pengurus' | 'gaji_pengawas' | 'operasional_kantor' | 'beban_lain';
  nominal: number;
  keterangan: string;
}

export interface ManasukaBungaLog {
  id: string;
  anggotaId: string;
  bulanTahun: string; // "MM-YYYY"
  totalSimpanan: number;
  bungaPersen: number; // e.g. 0.5%
  jumlahApresiasi: number;
  statusNotifikasi: 'Belum Kirim' | 'Terkirim';
  tanggalKalkulasi: string;
}

export interface Pembelian {
  id: string;
  tanggal: string;
  namaBarang: string;
  kategori: 'persediaan_warung' | 'seragam' | 'persediaan_barang' | 'inventaris' | 'lain_lain';
  kuantitas: number;
  hargaSatuan: number;
  totalHarga: number;
  keterangan: string;
}

export interface PiutangWarung {
  id: string;
  anggotaId: string;
  tanggal: string;
  jenis: 'hutang_baru' | 'pelunasan';
  nominal: number;
  keterangan: string;
}

export interface Pengumuman {
  id: string;
  tanggal: string;
  judul: string;
  konten: string;
  isUrgent: boolean;
  status: 'Aktif' | 'Nonaktif';
}
