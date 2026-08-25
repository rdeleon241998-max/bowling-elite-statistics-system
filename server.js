const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

// 1. Production Port & Persistent Storage Path Setup
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.RENDER_DISK_PATH || __dirname;

// 2. Enable CORS and High-Capacity JSON Parsing
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Serve static project files
app.use(express.static(path.join(__dirname)));

// Ensure Upload directory exists (Uses persistent storage in cloud if available)
const uploadDir = path.join(DATA_DIR, 'Upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/Upload', express.static(uploadDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = `${file.fieldname}_${Date.now()}_${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Database path using persistent storage
const dbPath = path.join(DATA_DIR, 'testdb.db');

// Self-healing check: Only remove database if strictly 0 bytes
if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    if (stats.size === 0) {
        console.log("⚠️ Found empty 0-byte testdb.db file. Generating clean database...");
        fs.unlinkSync(dbPath);
    }
}