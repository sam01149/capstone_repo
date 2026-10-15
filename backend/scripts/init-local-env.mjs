import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../.env', import.meta.url);
let content = await readFile(path, 'utf8');
const randomSecret = (bytes) => randomBytes(bytes).toString('base64url');

function currentValue(key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match?.[1] ?? '';
}

function setValue(key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  content = pattern.test(content)
    ? content.replace(pattern, line)
    : `${content.trimEnd()}\n${line}\n`;
}

if (currentValue('JWT_ACCESS_SECRET').length < 64) {
  setValue('JWT_ACCESS_SECRET', randomSecret(64));
}
if (currentValue('PASSWORD_PEPPER').length < 32) {
  setValue('PASSWORD_PEPPER', randomSecret(48));
}
if (currentValue('SESSION_TOKEN_PEPPER').length < 32) {
  setValue('SESSION_TOKEN_PEPPER', randomSecret(48));
}

setValue('FRONTEND_ORIGIN', currentValue('FRONTEND_ORIGIN') || 'http://localhost:5173');
setValue('COOKIE_SECURE', currentValue('COOKIE_SECURE') || 'false');
setValue('ACCESS_TOKEN_TTL_SECONDS', '900');
setValue('SESSION_IDLE_TTL_SECONDS', '7200');
setValue('SESSION_ABSOLUTE_TTL_SECONDS', '43200');
setValue('TEMP_PASSWORD_TTL_SECONDS', '86400');

const whatsapp = process.env.FARMSIGHT_LOCAL_WHATSAPP_NUMBER;
if (whatsapp) {
  const normalized = whatsapp.replace(/^\+/, '');
  if (!/^[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error('Nomor WhatsApp harus memakai format internasional yang valid.');
  }
  setValue('PUBLIC_WHATSAPP_NUMBER', normalized);
}

await writeFile(path, content, { encoding: 'utf8', mode: 0o600 });
console.log('Konfigurasi lokal diperbarui tanpa menampilkan secret atau nomor.');
