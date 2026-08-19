import https from 'https';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try to generate certificates using Node's https module with OpenSSL
function generateCertificates() {
  const certPath = path.join(__dirname, 'server.crt');
  const keyPath = path.join(__dirname, 'server.key');

  // Check if certificates already exist and are valid
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const certContent = fs.readFileSync(certPath, 'utf-8');
    const keyContent = fs.readFileSync(keyPath, 'utf-8');
    
    if (certContent.includes('BEGIN CERTIFICATE') && keyContent.includes('BEGIN PRIVATE KEY')) {
      console.log('✓ Valid SSL certificates already exist');
      return true;
    }
  }

  // Try to use OpenSSL via PowerShell
  try {
    console.log('Generating self-signed certificate...');
    
    const cmd = `
      $ErrorActionPreference = 'Stop'
      [System.Security.Cryptography.X509Certificates.X509Certificate2] $cert = $null
      $cert = New-SelfSignedCertificate -DnsName "smartassistai","localhost" -CertStoreLocation "cert:\\CurrentUser\\My" -NotAfter (Get-Date).AddYears(1) -KeyUsage DigitalSignature -ErrorAction Stop
      
      $pwd = ConvertTo-SecureString -String "temp123" -Force -AsPlainText
      $pfxPath = "${path.join(__dirname, 'temp-cert.pfx')}"
      Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd -Force -ErrorAction Stop | Out-Null
      
      Write-Output "✓ Certificate created"
    `;

    const result = require('child_process').execSync(cmd, { 
      shell: 'powershell.exe',
      stdio: 'pipe'
    });
    
    console.log(result.toString());
    return true;
  } catch (err) {
    console.log('PowerShell method failed. Using fallback...');
    return false;
  }
}

generateCertificates();
