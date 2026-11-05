const mongoose = require('mongoose');
const { Schema } = mongoose;

// 1. User Schema (Virtual Bankroll & Harm-Reduction Metrics)
const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    virtualBalance: { type: Number, required: true, default: 1000, min: 0 },
    harmReduction: {
      resetCount: { type: Number, default: 0 },
      totalStaked: { type: Number, default: 0 },
      netVirtualLoss: { type: Number, default: 0 },
      dailyWagerLimit: { type: Number, default: 500 },
      lastResetAt: { type: Date, default: Date.now }
    }
  },
  { timestamps: true }
);

// 2. Fixture Schema (Match Events & Live Decimal Odds)
const fixtureSchema = new Schema(
  {
    homeTeam: { type: String, required: true },
    awayTeam: { type: String, required: true },
    sport: { type: String, default: 'NFL' },
    odds: {
      homeDecimal: { type: Number, required: true, min: 1.01 },
      awayDecimal: { type: Number, required: true, min: 1.01 }
    },
    status: {
      type: String,
      enum: ['OPEN', 'LOCKED', 'SETTLED'],
      default: 'OPEN',
      index: true
    },
    winner: {
      type: String,
      enum: ['HOME', 'AWAY', 'PUSH', null],
      default: null
    }
  },
  { timestamps: true }
);

// 3. Wager Schema (Transactional Bet Records)
const wagerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fixtureId: { type: Schema.Types.ObjectId, ref: 'Fixture', required: true },
    selection: { type: String, enum: ['HOME', 'AWAY'], required: true },
    stake: { type: Number, required: true, min: 1 },
    oddsTaken: { type: Number, required: true },
    potentialPayout: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'WON', 'LOST', 'REFUNDED'],
      default: 'PENDING'
    }
  },
  { timestamps: true }
);

// Compound indexes for settlement worker scans and user history queries
wagerSchema.index({ fixtureId: 1, status: 1 });
wagerSchema.index({ userId: 1, createdAt: -1 });

module.exports = {
  User: mongoose.model('User', userSchema),
  Fixture: mongoose.model('Fixture', fixtureSchema),
  Wager: mongoose.model('Wager', wagerSchema)
};
