import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import forge from 'node-forge';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certFile = path.join(__dirname, 'server.crt');
const keyFile = path.join(__dirname, 'server.key');

// Check if certificates already exist
if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
  const cert = fs.readFileSync(certFile, 'utf-8');
  const key = fs.readFileSync(keyFile, 'utf-8');
  
  if (cert.includes('BEGIN CERTIFICATE') && key.includes('BEGIN PRIVATE KEY')) {
    console.log('✓ Valid SSL certificates already exist');
    process.exit(0);
  }
}

console.log('Generating self-signed certificate...');

// Generate key pair
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);

const attrs = [
  { name: 'commonName', value: 'smartassistai' },
  { name: 'organizationName', value: 'SmartAssist AI' },
  { name: 'countryName', value: 'US' },
];

cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.setExtensions([
  {
    name: 'basicConstraints',
    cA: false,
  },
  {
    name: 'keyUsage',
    keyCertSign: false,
    digitalSignature: true,
  },
  {
    name: 'subjectAltName',
    altNames: [
      { type: 2, value: 'smartassistai' },
      { type: 2, value: 'localhost' },
      { type: 7, ip: '127.0.0.1' },
    ],
  },
]);

// Self-sign certificate
cert.sign(keys.privateKey, forge.md.sha256.create());

// Export certificate and key
const certPem = forge.pki.certificateToPem(cert);
const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

fs.writeFileSync(certFile, certPem, 'utf-8');
fs.writeFileSync(keyFile, keyPem, 'utf-8');

console.log('✓ SSL certificate generated successfully');
console.log(`  Certificate: ${certFile}`);
console.log(`  Private Key: ${keyFile}`);
