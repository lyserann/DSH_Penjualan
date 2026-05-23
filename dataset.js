const { MongoClient } = require('mongodb');

// Konfigurasi Database
// GANTI BARIS 4 DENGAN URL DI BAWAH INI (FORMAT ANTI-BLOKIR DNS):
const url = 'mongodb://127.0.0.1:27017'; // Pakai IP lokal langsung
const dbName = 'db_penjualan';
const client = new MongoClient(url);

// Data Variasi untuk Acak
const daftarNama = ["Budi Santoso", "Siti Aminah", "Jono Adriansyah", "Rian Hidayat", "Dewi Lestari", "Andi Wijaya", "Mega Pertiwi", "Fahmi Idris", "Novianti", "Eko Prasetyo"];
const daftarTipe = ["Member", "Non-Member"];
const daftarMetode = ["Transfer Bank", "E-Wallet (OVO/Dana)", "COD", "Kartu Kredit"];

const daftarProduk = [
    { nama: "Smartphone Samsung S24", kategori: "Elektronik", harga: 13000000 },
    { nama: "Laptop ASUS ROG", kategori: "Elektronik", harga: 20000000 },
    { nama: "Meja Kerja Minimalis", kategori: "Furniture", harga: 1200000 },
    { nama: "Kursi Gaming Premium", kategori: "Furniture", harga: 2500000 },
    { nama: "Kemeja Flanel Oversize", kategori: "Fashion", harga: 250000 },
    { nama: "Sepatu Sneaker Lokal", kategori: "Fashion", harga: 450000 },
    { nama: "Paket Ayam Bakar Madu", kategori: "Kuliner", harga: 35000 },
    { nama: "Kopi Susu Gula Aren 1L", kategori: "Kuliner", harga: 65000 }
];

const daftarKota = [
    { kota: "Jakarta", provinsi: "DKI Jakarta" },
    { kota: "Bandung", provinsi: "Jawa Barat" },
    { kota: "Sukabumi", provinsi: "Jawa Barat" },
    { kota: "Surabaya", provinsi: "Jawa Timur" },
    { kota: "Semarang", provinsi: "Jawa Tengah" },
    { kota: "Medan", provinsi: "Sumatera Utara" },
    { kota: "Makassar", provinsi: "Sulawesi Selatan" }
];

async function main() {
    try {
        await client.connect();
        console.log('Terhubung ke MongoDB...');
        
        const db = client.db(dbName);
        const collection = db.collection('transaksi');

        // 1. Bersihkan database lama biar tidak menumpuk
        await collection.drop().catch(() => console.log("Collection bersih, siap diisi baru..."));

        console.log('Memulai generate 3.500 data transaksi otomatis...');
        const dataDummy = [];

        // Loop untuk membuat 3.500 data acak
        for (let i = 0; i < 3500; i++) {
            const produkPilihan = daftarProduk[Math.floor(Math.random() * daftarProduk.length)];
            const kotaPilihan = daftarKota[Math.floor(Math.random() * daftarKota.length)];
            const jumlahBeli = Math.floor(Math.random() * 4) + 1; // 1 - 4 barang
            const totalHarga = produkPilihan.harga * jumlahBeli;

            // Generate tanggal acak antara Januari 2025 s.d. Mei 2026
            const tahun = Math.random() > 0.3 ? 2025 : 2026;
            const bulan = tahun === 2026 ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 12); // Maks Mei kalau 2026
            const tanggal = Math.floor(Math.random() * 28) + 1;
            const tanggalAcak = new Date(tahun, bulan, tanggal);

            const transaksi = {
                id_transaksi: `TRX-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
                tanggal: tanggalAcak,
                pelanggan: {
                    nama: daftarNama[Math.floor(Math.random() * daftarNama.length)],
                    email: `user${i}@example.com`,
                    tipe: daftarTipe[Math.floor(Math.random() * daftarTipe.length)]
                },
                produk: {
                    nama_produk: produkPilihan.nama,
                    kategori: produkPilihan.kategori,
                    harga_satuan: produkPilihan.harga,
                    jumlah: jumlahBeli
                },
                pembayaran: {
                    metode: daftarMetode[Math.floor(Math.random() * daftarMetode.length)],
                    total_harga: totalHarga,
                    diskon: 0,
                    total_bayar: totalHarga
                },
                lokasi: {
                    kota: kotaPilihan.kota,
                    provinsi: kotaPilihan.provinsi
                }
            };

            dataDummy.push(transaksi);
        }

        // 2. Insert sekaligus banyak (Bulk Insert) biar cepat
        await collection.insertMany(dataDummy);
        console.log('✅ SUKSES! 3.500 Data transaksi otomatis berhasil masuk ke MongoDB.');

    } catch (err) {
        console.error('Error saat menjalanakan script:', err);
    } finally {
        await client.close();
    }
}

main();