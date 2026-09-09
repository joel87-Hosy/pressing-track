import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const source = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/whatsapp/index.ts', import.meta.url), 'utf8').replace(/^import .*\n/, ''));
async function run({ role = 'admin', account_status = 'active', consent = true, ticket = true, previous, networkFailure = false, metaStatus = 200, action = 'send' } = {}) {
  let handler, calls = 0;
  const queries = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: 'manager', app_metadata: { role, account_status, pressing_id: 'pressing-a' } } } }) },
    from(table) {
      const query = { table, op: 'select', filters: [] };
      queries.push(query);
      const chain = {
        select() { return chain; }, eq(...args) { query.filters.push(args); return chain; },
        insert(value) { query.op = 'insert'; query.value = value; return chain; },
        update(value) { query.op = 'update'; query.value = value; return chain; },
        single() { return chain; }, maybeSingle() { return chain; },
        then(resolve, reject) {
          let result;
          if (table === 'pressing_whatsapp_settings') result = { data: { phone_number_id: '12345', access_token: 'secret-token', display_phone: '+2250700000000', template_name: 'ticket_depot', template_language: 'fr' } };
          if (table === 'tickets') result = { data: ticket ? { id: 'ticket-a', client_phone: '0700000000', ticket_number: '#A-1', ready_date: '12/09/2026', total: 3000, item_count: 2 } : null };
          if (table === 'pressings') result = { data: { name: 'Pressing A' } };
          if (table === 'ticket_whatsapp_sends') result = query.op === 'insert' ? { error: previous ? { code: '23505' } : null } : query.op === 'select' ? { data: { status: previous } } : { data: [{ ticket_id: 'ticket-a' }] };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return chain;
    },
  };
  vm.runInNewContext(source, {
    createClient: () => db, Response, AbortSignal,
    Deno: { env: { get: () => 'v99.0' }, serve: (fn) => { handler = fn; } },
    fetch: async (url, options) => {
      calls++;
      assert.match(url, /\/12345\/messages$/);
      const payload = JSON.parse(options.body);
      assert.equal(payload.to, '2250700000000');
      assert.equal(payload.template.components[0].parameters.length, 5);
      if (networkFailure) throw new Error('timeout');
      return new Response(JSON.stringify(metaStatus === 200 ? { messages: [{ id: 'wamid.test' }] } : { error: {} }), { status: metaStatus });
    },
  });
  const response = await handler(new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer valid' }, body: JSON.stringify({ action, ticket_id: 'ticket-a', consent, pressing_id: 'attacker-override' }) }));
  return { status: response.status, body: await response.json(), calls, queries };
}
for (const role of ['client', 'platform_admin']) assert.equal((await run({ role })).status, 403);
assert.equal((await run({ account_status: 'suspended' })).status, 403);
assert.equal((await run({ consent: false })).calls, 0);
assert.equal((await run({ ticket: false })).status, 404);
const sent = await run();
assert.equal(sent.body.status, 'accepted');
assert.equal(sent.calls, 1);
assert.ok(sent.queries.find((q) => q.table === 'tickets').filters.some(([key, value]) => key === 'pressing_id' && value === 'pressing-a'));
assert.equal((await run({ previous: 'accepted' })).calls, 0);
for (const previous of ['sending', 'unknown']) assert.equal((await run({ previous })).status, 409);
assert.equal((await run({ previous: 'failed' })).calls, 1);
for (const options of [{ networkFailure: true }, { metaStatus: 500 }]) {
  const uncertain = await run(options);
  assert.equal(uncertain.queries.at(-1).value.status, 'unknown');
}
assert.equal((await run({ metaStatus: 400 })).queries.at(-1).value.status, 'failed');
const settings = await run({ action: 'settings' });
assert.equal(JSON.stringify(settings.body).includes('secret-token'), false);
console.log('WhatsApp: access, tenant scope, consent, payload, duplicate protection, retries and token privacy passed.');
