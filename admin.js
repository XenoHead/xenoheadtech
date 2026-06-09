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

// --- PROJECTS API ---

app.get('/api/projects', (req, res) => {
    res.json(readData('projects.json'));
});

app.post('/api/projects', (req, res) => {
    const projects = readData('projects.json');
    const newProject = { ...req.body, id: 'p' + Date.now() };
    projects.push(newProject);
    writeData('projects.json', projects);
    pushToGithub();
    res.json(newProject);
});

app.put('/api/projects/:id', (req, res) => {
    const projects = readData('projects.json');
    const index = projects.findIndex(p => p.id === req.params.id);
    if (index !== -1) {
        projects[index] = { ...projects[index], ...req.body, id: req.params.id };
        writeData('projects.json', projects);
        pushToGithub();
        res.json(projects[index]);
    } else {
        res.status(404).send('Not found');
    }
});

app.delete('/api/projects/:id', (req, res) => {
    let projects = readData('projects.json');
    projects = projects.filter(p => p.id !== req.params.id);
    writeData('projects.json', projects);
    pushToGithub();
    res.json({ success: true });
});

// --- WRITING API ---

app.get('/api/writing', (req, res) => {
    res.json(readData('writing.json'));
});

app.post('/api/writing', (req, res) => {
    const writing = readData('writing.json');
    const newEntry = { ...req.body, id: 'w' + Date.now() };
    writing.push(newEntry);
    writeData('writing.json', writing);
    pushToGithub();
    res.json(newEntry);
});

app.put('/api/writing/:id', (req, res) => {
    const writing = readData('writing.json');
    const index = writing.findIndex(w => w.id === req.params.id);
    if (index !== -1) {
        writing[index] = { ...writing[index], ...req.body, id: req.params.id };
        writeData('writing.json', writing);
        pushToGithub();
        res.json(writing[index]);
    } else {
        res.status(404).send('Not found');
    }
});

app.delete('/api/writing/:id', (req, res) => {
    let writing = readData('writing.json');
    writing = writing.filter(w => w.id !== req.params.id);
    writeData('writing.json', writing);
    pushToGithub();
    res.json({ success: true });
});

// Tech-Work Routes
app.get('/api/tech-work', (req, res) => {
    res.json(readData('tech-work.json'));
});

app.post('/api/tech-work', (req, res) => {
    const techwork = readData('tech-work.json');
    const newEntry = { ...req.body, id: 'tw' + Date.now() };
    techwork.push(newEntry);
    writeData('tech-work.json', techwork);
    pushToGithub();
    res.json(newEntry);
});

app.put('/api/tech-work/:id', (req, res) => {
    const techwork = readData('tech-work.json');
    const index = techwork.findIndex(w => w.id === req.params.id);
    if (index !== -1) {
        techwork[index] = { ...techwork[index], ...req.body, id: req.params.id };
        writeData('tech-work.json', techwork);
        pushToGithub();
        res.json(techwork[index]);
    } else {
        res.status(404).send('Not found');
    }
});

app.delete('/api/tech-work/:id', (req, res) => {
    let techwork = readData('tech-work.json');
    techwork = techwork.filter(w => w.id !== req.params.id);
    writeData('tech-work.json', techwork);
    pushToGithub();
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`XenoHead Admin Server running at http://localhost:${PORT}/admin`);
});
