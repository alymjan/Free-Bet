const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const wagerController = require('./controllers/wagerController');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/betting_sim?replicaSet=rs0';

app.get('/api/health', (req, res) => res.json({ status: 'ok', replicaSet: 'rs0' }));
app.post('/api/seed', wagerController.seedDemoData);
app.post('/api/wagers', wagerController.placeWager);
app.get('/api/state/:userId', wagerController.getUserState);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Replica Set (rs0)');
    app.listen(PORT, () => {
      console.log(`Transaction Service listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
