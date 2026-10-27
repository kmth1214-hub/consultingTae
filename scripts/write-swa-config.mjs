import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const tenantId = process.env.ENTRA_TENANT_ID?.trim();
if (!tenantId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
  console.error('Azure build requires ENTRA_TENANT_ID as a valid Microsoft Entra tenant UUID.');
  process.exit(1);
}

const templatePath = resolve('config/staticwebapp.config.template.json');
const outputPath = resolve('dist/staticwebapp.config.json');
const template = await readFile(templatePath, 'utf8');
const marker = '__ENTRA_TENANT_ID__';
if (template.split(marker).length !== 2) {
  throw new Error(`Expected exactly one ${marker} placeholder in ${templatePath}`);
}

const rendered = template.replace(marker, tenantId);
const config = JSON.parse(rendered);
if (config.platform?.apiRuntime !== 'node:22'
  || config.auth?.identityProviders?.azureActiveDirectory?.userDetailsClaim !== 'name'
  || config.routes?.[0]?.route !== '/api/*'
  || !config.routes[0].allowedRoles?.includes('authenticated')
  || !config.routes?.[1]?.allowedRoles?.includes('authenticated')
  || config.auth?.identityProviders?.azureActiveDirectory?.registration?.openIdIssuer !== `https://login.microsoftonline.com/${tenantId}`
  || rendered.includes(marker)) {
  throw new Error('Generated Azure Static Web Apps config failed the tenant and route policy checks.');
}

await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log('Generated dist/staticwebapp.config.json with tenant-restricted authentication.');
