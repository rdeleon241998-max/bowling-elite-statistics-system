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

// Ensure Upload directory exists
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
    limits: { fileSize: 500 * 1024 * 1024 }
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

// Connect to SQLite Database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ Database connection error:", err.message);
    } else {
        console.log(`✅ Connected to SQLite database at: ${dbPath}`);
    }
});

// Serve main web page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// File upload API route
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    res.json({ message: 'File uploaded successfully', filename: req.file.filename });
});

// Start listening for HTTP requests
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
