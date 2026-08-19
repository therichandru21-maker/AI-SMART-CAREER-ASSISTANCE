import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pem from 'pem';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certFile = path.join(__dirname, 'server.crt');
const keyFile = path.join(__dirname, 'server.key');

// Check if certificates already exist
if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
  console.log('✓ SSL certificates already exist');
  process.exit(0);
}

// Generate self-signed certificate
pem.createCertificate(
  {
    days: 365,
    selfSigned: true,
    commonName: 'smartassistai',
  },
  (err, keys) => {
    if (err) {
      console.error('✗ Error generating certificate:', err.message);
      process.exit(1);
    }

    // Write certificate and key files
    fs.writeFileSync(certFile, keys.certificate);
    fs.writeFileSync(keyFile, keys.clientKey);

    console.log('✓ SSL certificate generated successfully');
    console.log(`  Certificate: ${certFile}`);
    console.log(`  Private Key: ${keyFile}`);
    process.exit(0);
  }
);
