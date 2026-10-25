import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
assert.equal(account, '545718e4dcfcd2b69d21a90ae91343fc');
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/moemail`, {
  headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }
});
assert(response.ok, `Cannot read existing Pages project: HTTP ${response.status}`);
const payload = await response.json();
assert(payload.success);
const project = payload.result;
assert.equal(project.name, 'moemail');
assert.equal(project.subdomain, 'moemail-a1m.pages.dev');
assert.equal(project.production_branch, 'main');
assert.equal(project.canonical_deployment.id, '7b96edba-51ed-484a-932e-b65ef2bcffbf', 'Production changed; stop for review');
const env = project.deployment_configs.production;
assert(env.d1_databases.DB.id, 'Existing DB binding required');
assert.equal(env.kv_namespaces.SITE_CONFIG.namespace_id, '86d621d4436048dc845e23bd92f7ef0e');
for (const key of ['AUTH_SECRET', 'AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET']) assert(env.env_vars[key], `Missing ${key}`);
const config = {
  name: 'moemail',
  compatibility_date: env.compatibility_date,
  compatibility_flags: env.compatibility_flags,
  pages_build_output_dir: '.vercel/output/static',
  d1_databases: Object.entries(env.d1_databases).map(([binding, value]) => ({ binding, database_id: value.id })),
  kv_namespaces: Object.entries(env.kv_namespaces).map(([binding, value]) => ({ binding, id: value.namespace_id }))
};
if (process.argv.includes('--verify')) {
  assert.deepEqual(JSON.parse(readFileSync('wrangler.json', 'utf8')), config, 'Bindings changed during build');
  console.log('Existing production deployment and bindings are unchanged.');
} else {
  writeFileSync('wrangler.json', JSON.stringify(config, null, 2));
  console.log('Prepared Pages configuration from existing production bindings. Secrets remain in Cloudflare.');
}
