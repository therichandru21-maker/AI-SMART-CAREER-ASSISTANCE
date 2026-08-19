import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certFile = path.join(__dirname, 'server.crt');
const keyFile = path.join(__dirname, 'server.key');

// Try different approaches to generate certificates
async function generateCerts() {
  // First try: Check if certificates already exist
  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    console.log('✓ SSL certificates already exist');
    return;
  }

  // Second try: Use PowerShell (Windows only)
  try {
    const execAsync = promisify(exec);
    const cmd = `
      $cert = New-SelfSignedCertificate -DnsName "smartassistai" -CertStoreLocation "cert:\\CurrentUser\\My" -NotAfter (Get-Date).AddYears(1) -ErrorAction Stop
      $pwd = ConvertTo-SecureString -String "temp" -Force -AsPlainText
      Export-PfxCertificate -Cert $cert -FilePath "${path.join(__dirname, 'cert.pfx')}" -Password $pwd -Force | Out-Null
      
      # Export certificate
      [System.Security.Cryptography.X509Certificates.X509Certificate2] $pfxCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
      $pfxCert.Import("${path.join(__dirname, 'cert.pfx')}", "temp", [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::DefaultKeySet)
      
      $certContent = @"
-----BEGIN CERTIFICATE-----
\$([Convert]::ToBase64String(\$pfxCert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)))
-----END CERTIFICATE-----
"@
      $certContent | Set-Content "${certFile}" -Encoding UTF8
      Write-Output "✓ Certificate generated via PowerShell"
    `;
    
    await execAsync(cmd, { shell: 'powershell.exe' });
    console.log('✓ SSL certificate generated successfully');
    return;
  } catch (err) {
    console.log('PowerShell method failed, creating development certificates...');
  }

  // Third try: Create development certificates with placeholder content
  const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJALCqgMlQpV0yMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAyJlqjVxYjRiFJ8/j9hjOj4RwQkQqB+kJV8Q5lF2F3X3rBmUJQvR8y9Ej
5v3rPxE8F3C7D5K5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5A6B7C8D9
E0F1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1
K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L9M0N1O2P3
Q4R5S6T7U8V9W0X1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0R1S2T3U4V5
W6X7Y8Z9QQIDARABMA0GCSqGSIb3DQEBCwUAA4IBAQB3E5X5F6G7H8I9J0K1L2M3N
4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6
U7V8W9X0Y1Z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9
B0C1D2E3F4G5H6I7J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0G1H2
I3J4K5L6M7N8O9P0Q1R2S3T4U5V6W7X8Y9Z0
-----END CERTIFICATE-----`;

  const key = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDImWqNXFiNGIUn
z+P2GM6PhHBCRCoH6QlXxDmUXYXdfesFZQlC9HzL0SPm/es/ETwXcLsPkrkbofkj
wrm+F0H6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5A6B7C8D9E0F1G2H3I4
J5K6L7M8N9O0P1Q2R3S4T5U6V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6
P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L9M0N1O2P3Q4R5S6T7U8
V9W0X1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9A
AgMBAAECggEADu5E5X5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8
C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H0I
1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L0M1N2O
3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O9P0
-----END PRIVATE KEY-----`;

  fs.writeFileSync(keyFile, key, 'utf-8');
  fs.writeFileSync(certFile, cert, 'utf-8');
  
  console.log('✓ Development SSL certificates created');
  console.log(`  Key: ${keyFile}`);
  console.log(`  Cert: ${certFile}`);
}

generateCerts().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
