const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
// Serve admin files from 'admin' directory on '/admin'
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve main site static files (so the admin can access assets if needed)
app.use(express.static(path.join(__dirname)));

const readData = (filename) => {
    const filepath = path.join(__dirname, 'data', filename);
    if (!fs.existsSync(filepath)) return [];
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
};

const writeData = (filename, data) => {
    const filepath = path.join(__dirname, 'data', filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
};

const pushToGithub = () => {
    console.log('Pushing changes to GitHub...');
    exec('git add . && git commit -m "Auto-update from Admin Dashboard" && git push', (error, stdout, stderr) => {
        if (error) {
            if (!stdout.includes('nothing to commit')) {
                console.error(`Git push error: ${error.message}`);
            }
            return;
        }
        console.log('GitHub push successful.');
    });
};

app.post('/api/push', (req, res) => {
    console.log('Manual push requested...');
    exec('git add . && git commit -m "Manual update from Admin Dashboard" && git push', (error, stdout, stderr) => {
        if (error && (!stdout || !stdout.includes('nothing to commit'))) {
            console.error(`Git push error: ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }
        console.log('Manual push successful.');
        res.json({ success: true, message: 'Pushed successfully!' });
    });
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'assets');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, 'upload-' + Date.now() + ext);
    }
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    pushToGithub();
    res.json({ imagePath: 'assets/' + req.file.filename });
});

// --- DYNAMIC API ---

app.get('/api/categories', (req, res) => {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    const files = fs.readdirSync(dataDir);
    const categories = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    res.json(categories);
});

app.post('/api/categories', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).send('Name required');
    const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const filepath = path.join(__dirname, 'data', `${safeName}.json`);
    if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, '[]');
        pushToGithub();
    }
    res.json({ success: true, name: safeName });
});

app.get('/api/:type', (req, res) => {
    if (req.params.type === 'push' || req.params.type === 'upload' || req.params.type === 'categories') return res.status(404).send('Not found');
    res.json(readData(`${req.params.type}.json`));
});

app.post('/api/:type', (req, res) => {
    if (req.params.type === 'push' || req.params.type === 'upload' || req.params.type === 'categories') return res.status(404).send('Not found');
    const items = readData(`${req.params.type}.json`);
    const newItem = { ...req.body, id: req.params.type.charAt(0) + Date.now() };
    items.push(newItem);
    writeData(`${req.params.type}.json`, items);
    pushToGithub();
    res.json(newItem);
});

app.put('/api/:type/:id', (req, res) => {
    const items = readData(`${req.params.type}.json`);
    const index = items.findIndex(i => i.id === req.params.id);
    if (index !== -1) {
        items[index] = { ...items[index], ...req.body, id: req.params.id };
        writeData(`${req.params.type}.json`, items);
        pushToGithub();
        res.json(items[index]);
    } else {
        res.status(404).send('Not found');
    }
});

app.delete('/api/:type/:id', (req, res) => {
    let items = readData(`${req.params.type}.json`);
    items = items.filter(i => i.id !== req.params.id);
    writeData(`${req.params.type}.json`, items);
    pushToGithub();
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`XenoHead Admin Server running at http://localhost:${PORT}/admin`);
});
