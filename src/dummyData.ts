import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, KoperasiSetup, Pembelian, PiutangWarung, Pengumuman } from './types';

export const initialSetup: KoperasiSetup = {
  namaKoperasi: "Koperasi Dana Segar",
  slogan: "Solusi Keuangan Amanah & Sahabat Tumbuh Bersama",
  alamatKantor: "Jl. Raya Hijau No. 12, Kebayoran Baru, Jakarta Selatan",
  noBadanHukum: "AHU-00123.AH.01.2026",
  logoUrl: "🌱",
  jenisBungaPinjaman: "flat",
  biayaProvisiPersen: 1.0,
  jasaSimpananSukarelaPersen: 0.5,

  // Default Neraca Awal Koperasi
  kasAwal: 0,
  piutangAwal: 0,
  persediaanWarungAwal: 0,
  inventarisAwal: 0,
  simpananPokokAwal: 0,
  simpananWajibAwal: 0,
  simpananSukarelaAwal: 0,
  modalAwal: 0,
  danaCadanganAwal: 0,

  // Default custom text values
  kataPembuka: "Selamat datang di website resmi Koperasi Dana Segar. Kami memadukan prinsip luhur kekeluargaan dengan teknologi digital terintegrasi untuk mendukung kesejahteraan seluruh anggota dan kemandirian usaha komunitas.",
  visi: "Menjadi lembaga keuangan mikro koperasi terpercaya, mandiri, unggul dalam pelayanan, dan berorientasi penuh pada pemberdayaan potensi ekonomi seluruh anggota koperasi.",
  misi: [
    "Memberikan pelayanan prima di bidang tabungan berkeadilan serta kredit berbunga ringan secara cepat dan transparan.",
    "Menumbuhkan budaya hemat melestarikan tabungan masyarakat guna memperkuat ketahanan modal internal.",
    "Menjunjung tinggi azas mufakat gotong royong, transparansi pelaporan, serta kepatuhan penuh terhadap undang-undang koperasi."
  ]
};

export const initialMembers: Member[] = [];
export const initialSimpanan: Simpanan[] = [];
export const initialPinjaman: Pinjaman[] = [];
export const initialAngsuran: Angsuran[] = [];
export const initialPendapatan: PendapatanLain[] = [];
export const initialBeban: BebanKoperasi[] = [];
export const initialPembelian: Pembelian[] = [];
export const initialPiutangWarung: PiutangWarung[] = [];

export const initialAnnouncements: Pengumuman[] = [
  {
    id: "ann-1",
    tanggal: new Date().toISOString().split('T')[0],
    judul: "Pemberitahuan Pembagian Sisa Hasil Usaha (SHU) Buku Tahun 2025",
    konten: "Yth. Seluruh Anggota Koperasi,\n\nKami informasikan bahwa kalkulasi SHU Tahun Buku 2025 telah rampung. Pembagian SHU kepada masing-masing anggota akan ditransfer langsung ke rekening terdaftar atau dapat diambil tunai di kantor Koperasi mulai tanggal 5 bulan depan.\n\nHarap hubungi admin atau login ke portal anggota masing-masing untuk melihat rincian SHU Anda. Terima kasih.",
    isUrgent: true,
    status: "Aktif"
  },
  {
    id: "ann-2",
    tanggal: new Date().toISOString().split('T')[0],
    judul: "Penyesuaian Jam Operasional Kantor Koperasi Selama Bulan Ramadhan",
    konten: "Selama bulan suci Ramadhan, jam pelayanan operasional kantor koperasi mengalami penyesuaian sebagai berikut:\n\n- Senin s/d Kamis: 08.00 - 14.30 WIB\n- Jumat: 08.00 - 15.00 WIB\n- Sabtu, Minggu & Hari Libur Nasional: Tutup\n\nPelayanan pendaftaran anggota baru, pengajuan pinjaman, dan setoran simpanan sukarela tetap dapat dilayani secara online melalui portal ini 24 jam.\n\nSalam hangat,\nPengurus Koperasi",
    isUrgent: false,
    status: "Aktif"
  }
];
