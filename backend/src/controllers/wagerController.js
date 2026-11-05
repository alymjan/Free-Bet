const mongoose = require('mongoose');
const { User, Fixture, Wager } = require('../models');


exports.placeWager = async (req, res) => {
  const { userId, fixtureId, selection, stake } = req.body;
  const numericStake = Number(stake);

  if (!userId || !fixtureId || !['HOME', 'AWAY'].includes(selection) || numericStake <= 0) {
    return res.status(400).json({ error: 'Invalid wager payload' });
  }

  const session = await mongoose.startSession();
  let createdWager = null;
  let updatedBalance = null;

  try {
    await session.withTransaction(async () => {
      
      const fixture = await Fixture.findOne({
        _id: fixtureId,
        status: 'OPEN'
      }).session(session);

      if (!fixture) {
        throw new Error('FIXTURE_UNAVAILABLE');
      }

      
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: userId,
          virtualBalance: { $gte: numericStake }
        },
        {
          $inc: {
            virtualBalance: -numericStake,
            'harmReduction.totalStaked': numericStake
          }
        },
        { new: true, session }
      );

      if (!updatedUser) {
        throw new Error('INSUFFICIENT_VIRTUAL_BALANCE');
      }

     
      const oddsTaken =
        selection === 'HOME' ? fixture.odds.homeDecimal : fixture.odds.awayDecimal;
      const potentialPayout = Number((numericStake * oddsTaken).toFixed(2));

      const [wagerDoc] = await Wager.create(
        [
          {
            userId,
            fixtureId,
            selection,
            stake: numericStake,
            oddsTaken,
            potentialPayout,
            status: 'PENDING'
          }
        ],
        { session }
      );

      createdWager = wagerDoc;
      updatedBalance = updatedUser.virtualBalance;
    });

    return res.status(201).json({
      message: 'Wager placed atomically',
      remainingBalance: updatedBalance,
      wager: createdWager
    });
  } catch (err) {
    const statusMap = {
      FIXTURE_UNAVAILABLE: 409,
      INSUFFICIENT_VIRTUAL_BALANCE: 400
    };
    const statusCode = statusMap[err.message] || 500;
    return res.status(statusCode).json({
      error: err.message || 'Transaction aborted'
    });
  } finally {
    await session.endSession();
  }
};


exports.seedDemoData = async (req, res) => {
  try {
    await Promise.all([
      User.deleteMany({}),
      Fixture.deleteMany({}),
      Wager.deleteMany({})
    ]);

    const user = await User.create({
      username: 'test_bettor_01',
      virtualBalance: 100
    });

    const fixture = await Fixture.create({
      homeTeam: 'Philadelphia Eagles',
      awayTeam: 'Dallas Cowboys',
      sport: 'NFL',
      odds: { homeDecimal: 1.85, awayDecimal: 2.05 },
      status: 'OPEN'
    });

    return res.status(201).json({ user, fixture });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


exports.getUserState = async (req, res) => {
  const user = await User.findById(req.params.userId);
  const wagers = await Wager.find({ userId: req.params.userId });
  return res.json({ user, wagerCount: wagers.length, wagers });
};
