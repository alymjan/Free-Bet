const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/betting_sim?replicaSet=rs0';

// Simplified Schema: One bet per user
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  hasBet: { type: Boolean, default: false },
  betDetails: {
    prediction: { type: String, enum: ['YES', 'NO', null], default: null },
    amount: { type: Number, default: 0 },
    createdAt: { type: Date, default: null }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Health check endpoint for Kubernetes liveness/readiness probes
app.get('/api/health', (req, res) => res.json({ status: 'healthy', container: process.env.HOSTNAME || 'local' }));

// Seed / Reset endpoint
app.post('/api/seed', async (req, res) => {
  await User.deleteMany({});
  const user = await User.create({ username: 'eagles_fan_01' });
  res.status(201).json({ message: 'Initialized single test user', user });
});

// Single Bet Placement Endpoint
app.post('/api/bet', async (req, res) => {
  const { userId, prediction, amount } = req.body;

  if (!['YES', 'NO'].includes(prediction)) {
    return res.status(400).json({ error: 'Prediction must be YES or NO' });
  }

  try {
    // Atomically ensure user hasn't already bet
    const user = await User.findOneAndUpdate(
      { _id: userId, hasBet: false },
      {
        $set: {
          hasBet: true,
          betDetails: { prediction, amount: Number(amount), createdAt: new Date() }
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(409).json({ error: 'User has already placed their single allowed bet.' });
    }

    return.status(201).json({ message: 'Single bet locked successfully', user });
  } catch (err) {
    return.status(500).json({ error: err.message });
  }
});

app.get('/api/user/:userId', async (req, res) => {
  const user = await User.findById(req.params.paramsId || req.params.userId);
  res.json(user);
});

mongoose.connect(MONGO_URI).then(() => {
  console.log('Connected to MongoDB. Single-bet service running.');
  app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
});
