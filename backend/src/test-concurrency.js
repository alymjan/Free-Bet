const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function runConcurrencyTest() {
  console.log('1. Seeding demo user (Virtual Balance = 100) and open fixture...');
  const seedRes = await fetch(`${API_URL}/seed`, { method: 'POST' });
  const { user, fixture } = await seedRes.json();

  console.log(`   User ID: ${user._id} | Starting Balance: ${user.virtualBalance}`);
  console.log('2. Firing 10 simultaneous 100-credit wager requests...');

  const parallelRequests = Array.from({ length: 10 }, (_, idx) =>
    fetch(`${API_URL}/wagers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user._id,
        fixtureId: fixture._id,
        selection: 'HOME',
        stake: 100
      })
    }).then(async (res) => ({
      attempt: idx + 1,
      status: res.status,
      body: await res.json()
    }))
  );

  const results = await Promise.all(parallelRequests);
  const succeeded = results.filter((r) => r.status === 201);
  const aborted = results.filter((r) => r.status !== 201);

  console.log(`   Succeeded (201 Created): ${succeeded.length}`);
  console.log(`   Aborted (400 Insufficient Balance): ${aborted.length}`);

  const stateRes = await fetch(`${API_URL}/state/${user._id}`);
  const finalState = await stateRes.json();

  console.log('3. Final Database State Verification:');
  console.log(`   Final Virtual Balance: ${finalState.user.virtualBalance} (Expected: 0)`);
  console.log(`   Total Wagers Recorded: ${finalState.wagerCount} (Expected: 1)`);
}

runConcurrencyTest().catch(console.error);
