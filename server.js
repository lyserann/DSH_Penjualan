const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. DATA CADANGAN UNTUK DI HOSTING (Hanya dipakai jika Atlas & Lokal beneran mati)
const DATA_CADANGAN = [];
const daftarNama = ["Budi Santoso", "Siti Aminah", "Jono Adriansyah", "Rian Hidayat", "Dewi Lestari", "Andi Wijaya"];
const daftarKategori = ["Elektronik", "Furniture", "Fashion", "Kuliner"];
const daftarMetode = ["Transfer Bank", "E-Wallet (OVO/Dana)", "COD", "Kartu Kredit"];
const daftarKota = ["Jakarta", "Bandung", "Sukabumi", "Surabaya", "Semarang", "Medan", "Makassar"];

for(let i=0; i<3500; i++) {
    const total = Math.floor(Math.random() * 500000) + 50000;
    DATA_CADANGAN.push({
        id_transaksi: `TRX-${i}`,
        tanggal: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        pelanggan: { nama: daftarNama[i % daftarNama.length], tipe: i % 2 === 0 ? "Member" : "Non-Member" },
        produk: { nama_produk: "Barang Dummy", kategori: daftarKategori[i % daftarKategori.length], jumlah: 1 },
        pembayaran: { total_bayar: total, metode: daftarMetode[i % daftarMetode.length] },
        lokasi: { kota: daftarKota[i % daftarKota.length] }
    });
}

// 2. KONEKSI DATABASE (OTOMATIS PILIH ATLAS ATAU LOKAL)
// Saat di-hosting, isi MONGODB_URI di env Render dengan URL Atlas-mu.
const url = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'; 
const dbName = 'db_penjualan';
let db = null;
let isDbConnected = false; // Status koneksi database (apapun jenis databasenya)

async function connectDB() {
    try {
        // serverSelectionTimeoutMS diperpanjang jadi 5000 agar koneksi ke cloud Atlas tidak gampang timeout
        const client = await MongoClient.connect(url, { serverSelectionTimeoutMS: 5000 });
        db = client.db(dbName);
        isDbConnected = true;
        console.log("✅ Sukses terhubung ke Database (MongoDB Atlas/Lokal)!");
    } catch (e) {
        isDbConnected = false;
        console.log("⚠️ Gagal konek ke database. Beralih ke Memory Buffer (Data Cadangan). Error:", e.message);
    }
}
connectDB();

// ==================== ENDPOINT API ANALYTICS ====================

// API 1: Kategori
app.get('/api/analytics/kategori', async (req, res) => {
    if (isDbConnected) {
        const data = await db.collection('transaksi').aggregate([
            { $group: { _id: "$produk.kategori", totalPendapatan: { $sum: "$pembayaran.total_bayar" } } }
        ]).toArray();
        return res.json(data);
    } else {
        const hasil = {};
        DATA_CADANGAN.forEach(d => {
            hasil[d.produk.kategori] = (hasil[d.produk.kategori] || 0) + d.pembayaran.total_bayar;
        });
        res.json(Object.keys(hasil).map(k => ({ _id: k, totalPendapatan: hasil[k] })));
    }
});

// API 2: Pembayaran
app.get('/api/analytics/pembayaran', async (req, res) => {
    if (isDbConnected) {
        const data = await db.collection('transaksi').aggregate([
            { $group: { _id: "$pembayaran.metode", jumlahPengguna: { $sum: 1 } } }
        ]).toArray();
        return res.json(data);
    } else {
        const hasil = {};
        DATA_CADANGAN.forEach(d => {
            hasil[d.pembayaran.metode] = (hasil[d.pembayaran.metode] || 0) + 1;
        });
        res.json(Object.keys(hasil).map(k => ({ _id: k, jumlahPengguna: hasil[k] })));
    }
});

// API 3: Tren Bulanan
app.get('/api/analytics/tren', async (req, res) => {
    if (isDbConnected) {
        const data = await db.collection('transaksi').aggregate([
            { $project: { bulan: { $dateToString: { format: "%Y-%m", date: "$tanggal" } }, total: "$pembayaran.total_bayar" } },
            { $group: { _id: "$bulan", totalOmset: { $sum: "$total" } } },
            { $sort: { _id: 1 } }
        ]).toArray();
        return res.json(data);
    } else {
        const hasil = {};
        DATA_CADANGAN.forEach(d => {
            const bln = d.tanggal.toISOString().substring(0, 7);
            hasil[bln] = (hasil[bln] || 0) + d.pembayaran.total_bayar;
        });
        res.json(Object.keys(hasil).sort().map(k => ({ _id: k, totalOmset: hasil[k] })));
    }
});

// API 4: Top 5 Kota
app.get('/api/analytics/kota', async (req, res) => {
    if (isDbConnected) {
        const data = await db.collection('transaksi').aggregate([
            { $group: { _id: "$lokasi.kota", totalPenjualan: { $sum: "$pembayaran.total_bayar" } } },
            { $sort: { totalPenjualan: -1 } },
            { $limit: 5 }
        ]).toArray();
        return res.json(data);
    } else {
        const hasil = {};
        DATA_CADANGAN.forEach(d => {
            hasil[d.lokasi.kota] = (hasil[d.lokasi.kota] || 0) + d.pembayaran.total_bayar;
        });
        const urut = Object.keys(hasil).map(k => ({ _id: k, totalPenjualan: hasil[k] })).sort((a,b) => b.totalPenjualan - a.totalPenjualan);
        res.json(urut.slice(0, 5));
    }
});

// API 5: Tipe Pelanggan
app.get('/api/analytics/pelanggan', async (req, res) => {
    if (isDbConnected) {
        const data = await db.collection('transaksi').aggregate([
            { $group: { _id: "$pelanggan.tipe", totalTransaksi: { $sum: 1 } } }
        ]).toArray();
        return res.json(data);
    } else {
        const hasil = {};
        DATA_CADANGAN.forEach(d => {
            hasil[d.pelanggan.tipe] = (hasil[d.pelanggan.tipe] || 0) + 1;
        });
        res.json(Object.keys(hasil).map(k => ({ _id: k, totalTransaksi: hasil[k] })));
    }
});

// API CRUD Ambil 10 data terbaru
app.get('/api/transaksi', async (req, res) => {
    if (isDbConnected) {
        const data = await db.collection('transaksi').find().sort({ _id: -1 }).limit(10).toArray();
        res.json(data);
    } else {
        res.json(DATA_CADANGAN.slice(0, 10));
    }
});

// API CRUD Tambah Data
app.post('/api/transaksi', async (req, res) => {
    const input = req.body;
    const doc = {
        id_transaksi: `TRX-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        tanggal: new Date(),
        pelanggan: { nama: input.nama_pelanggan, tipe: input.tipe_pelanggan },
        produk: { nama_produk: input.nama_produk, kategori: input.kategori_produk, harga_satuan: Number(input.harga_satuan), jumlah: Number(input.jumlah_beli) },
        pembayaran: { total_bayar: Number(input.harga_satuan) * Number(input.jumlah_beli), metode: input.metode_pembayaran },
        lokasi: { kota: input.kota }
    };

    if (isDbConnected) {
        await db.collection('transaksi').insertOne(doc);
    } else {
        DATA_CADANGAN.unshift(doc);
    }
    res.sendStatus(200);
});

// API CRUD Edit Nama Pelanggan (Tambahkan ini sebelum app.delete)
app.put('/api/transaksi/:id', async (req, res) => {
    const idTarget = req.params.id;
    const namaBaru = req.body.nama_pelanggan;

    if (isDbConnected) {
        // Mengupdate field nama di dalam objek pelanggan di MongoDB
        await db.collection('transaksi').updateOne(
            { id_transaksi: idTarget },
            { $set: { "pelanggan.nama": namaBaru } }
        );
    } else {
        // Mengupdate jika sedang dalam mode memory buffer (data cadangan)
        const transaksi = DATA_CADANGAN.find(d => d.id_transaksi === idTarget);
        if (transaksi) {
            transaksi.pelanggan.nama = namaBaru;
        }
    }
    res.sendStatus(200);
});

// API CRUD Hapus Data
app.delete('/api/transaksi/:id', async (req, res) => {
    if (isDbConnected) {
        await db.collection('transaksi').deleteOne({ id_transaksi: req.params.id });
    } else {
        const idx = DATA_CADANGAN.findIndex(d => d.id_transaksi === req.params.id);
        if (idx > -1) DATA_CADANGAN.splice(idx, 1);
    }
    res.sendStatus(200);
});

app.listen(port, () => console.log(`🚀 Server on target: http://localhost:${port}`));