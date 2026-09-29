import http from 'http';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: { 'Content-Type': 'application/json', ...(data && { 'Content-Length': Buffer.byteLength(data) }) },
    };
    const r = http.request(opts, (res) => {
      let out = '';
      res.on('data', d => out += d);
      res.on('end', () => resolve({ status: res.statusCode, body: out }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('=== Test: Place order on PRD-003 ===');
  const order = await req('POST', '/products/PRD-003/orders', { quantity: 1 });
  console.log('Status:', order.status);
  console.log('Product:', JSON.parse(order.body).stockLevel, 'units left');

  console.log('\nWaiting 2s for agentic loop...');
  await sleep(2000);

  console.log('\n=== Test: Check pricing suggestions ===');
  const ps = await req('GET', '/pricing-suggestions?status=PENDING&productId=PRD-003');
  const pricing = JSON.parse(ps.body);
  console.log(`Found ${pricing.length} pending pricing suggestions`);
  pricing.forEach(s => console.log(` - ${s.triggerReason} | ${s.direction} | $${s.recommendedPrice} | source=${s.source}`));

  console.log('\n=== Test: Check reorder suggestions ===');
  const rs = await req('GET', '/reorder-suggestions?status=PENDING&productId=PRD-003');
  const reorders = JSON.parse(rs.body);
  console.log(`Found ${reorders.length} pending reorder suggestions`);
  reorders.forEach(s => console.log(` - ${s.triggerReason} | qty=${s.recommendedQuantity} | source=${s.source}`));

  if (pricing.length > 0) {
    console.log('\n=== Test: Accept a pricing suggestion ===');
    const sid = pricing.find(s => s.triggerReason === 'INVENTORY_LOW')?.id || pricing[0].id;
    const accept = await req('PATCH', `/pricing-suggestions/${sid}`, { status: 'ACCEPTED' });
    console.log('Accept status:', accept.status);
    console.log('Accept body:', accept.body.slice(0, 200));

    console.log('\n=== Test: Double-accept (expect 409) ===');
    const dupe = await req('PATCH', `/pricing-suggestions/${sid}`, { status: 'ACCEPTED' });
    console.log('Double-accept status (expect 409):', dupe.status);
  }

  console.log('\n=== Test: Config endpoint ===');
  const cfg = await req('GET', '/config');
  console.log('Config:', JSON.parse(cfg.body));

  console.log('\n=== Test: Switch strategy to ai ===');
  const sw = await req('PUT', '/config', { pricingStrategy: 'ai' });
  console.log('Switch result:', JSON.parse(sw.body).pricingStrategy);

  console.log('\n✅ All tests done');
}

run().catch(console.error);
