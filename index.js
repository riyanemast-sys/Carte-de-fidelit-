const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({ clients: [] }).write();

const app = express();
const PORT = process.env.PORT || 3000;

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

  db.get('clients').push(client).write();

  const qrData = `${req.protocol}://${req.get('host')}/carte-visuelle/${clientId}`;
  const qrImage = await QRCode.toDataURL(qrData);

  res.json({ message: 'Client créé !', clientId, qrCode: qrImage, lienCarte: qrData });
});

app.get('/carte/:clientId', (req, res) => {
  const client = db.get('clients').find({ id: req.params.clientId }).value();
  if (!client) return res.status(404).json({ erreur: 'Client introuvable' });
  res.json(client);
});

app.post('/tampon/:clientId', (req, res) => {
  const client = db.get('clients').find({ id: req.params.clientId }).value();
  if (!client) return res.status(404).json({ erreur: 'Client introuvable' });

  let tampons = client.tampons + 1;
  let recompense = false;

  if (tampons >= client.maxTampons) {
    tampons = 0;
    recompense = true;
  }

  db.get('clients').find({ id: client.id }).assign({ tampons }).write();
  res.json({ message: recompense ? '🎉 Récompense débloquée !' : 'Tampon ajouté !', tampons, recompense });
});

app.get('/carte-visuelle/:clientId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'carte.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/tous-les-clients', (req, res) => {
  db.get('clients').value() !== undefined
    ? res.json(db.get('clients').value())
    : res.json([]);
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});