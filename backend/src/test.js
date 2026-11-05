async function runTest() {
  console.log('--- 1. Seeding test user ---');
  const seedRes = await fetch('http://localhost:3000/api/seed', { method: 'POST' });
  const seedData = await seedRes.json();
  const userId = seedData.user._id;
  console.log('Created User ID:', userId);

  console.log('\n--- 2. Placing first valid bet (YES, 50) ---');
  const bet1Res = await fetch('http://localhost:3000/api/bet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, prediction: 'YES', amount: 50 })
  });
  const bet1Data = await bet1Res.json();
  console.log(`Response Status: ${bet1Res.status}`);
  console.log('Response Body:', bet1Data);

  console.log('\n--- 3. Attempting duplicate bet (NO, 100) ---');
  const bet2Res = await fetch('http://localhost:3000/api/bet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, prediction: 'NO', amount: 100 })
  });
  const bet2Data = await bet2Res.json();
  console.log(`Response Status: ${bet2Res.status} (Expected: 409)`);
  console.log('Response Body:', bet2Data);
}

runTest().catch(console.error);
