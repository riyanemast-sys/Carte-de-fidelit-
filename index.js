const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;
const db = new Database('fidelite.db');

// Créer la table si elle existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    nom TEXT,
    prenom TEXT,
    tel TEXT,
    commerce TEXT,
    tampons INTEGER DEFAULT 0,
    maxTampons INTEGER DEFAULT 10,
    dateCreation TEXT
  )
`);

app.use(express.json());
app.use(express.static('public'));

app.get('/nouveau-client', async (req, res) => {
  const clientId = uuidv4();
  const client = {
    id: clientId,
    nom: req.query.nom || 'Client',
    prenom: req.query.prenom || '',
    tel: req.query.tel || '',
    commerce: req.query.commerce || 'Mon Commerce',
    tampons: 0,
    maxTampons: 10,
    dateCreation: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO clients (id, nom, prenom, tel, commerce, tampons, maxTampons, dateCreation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(client.id, client.nom, client.prenom, client.tel, client.commerce, client.tampons, client.maxTampons, client.dateCreation);

  const qrData = `http://localhost:3000/carte-visuelle/${clientId}`;
  const qrImage = await QRCode.toDataURL(qrData);

  res.json({
    message: 'Client créé !',
    clientId,
    qrCode: qrImage,
    lienCarte: qrData
  });
});

app.get('/carte/:clientId', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) return res.status(404).json({ erreur: 'Client introuvable' });
  res.json(client);
});

app.post('/tampon/:clientId', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) return res.status(404).json({ erreur: 'Client introuvable' });

  let tampons = client.tampons + 1;
  let recompense = false;

  if (tampons >= client.maxTampons) {
    tampons = 0;
    recompense = true;
  }

  db.prepare('UPDATE clients SET tampons = ? WHERE id = ?').run(tampons, client.id);

  res.json({
    message: recompense ? '🎉 Récompense débloquée !' : 'Tampon ajouté !',
    tampons,
    recompense
  });
});

app.get('/carte-visuelle/:clientId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'carte.html'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});