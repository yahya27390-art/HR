const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

async function deploy() {
  const distPath = path.resolve(__dirname, 'dist');
  
  // Dynamically collect all files in dist and dist/assets
  const files = [];
  function scanDir(dir, prefix) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      const relPath = path.posix.join(prefix, ent.name);
      if (ent.isDirectory()) {
        scanDir(fullPath, relPath);
      } else {
        files.push({ local: fullPath, remote: `/public_html/${relPath}` });
      }
    }
  }
  scanDir(distPath, '');

  for (const item of files) {
    if (!fs.existsSync(item.local)) continue;
    let uploaded = false;

    for (let t = 1; t <= 5; t++) {
      const client = new ftp.Client();
      client.ftp.verbose = false;
      client.ftp.timeout = 25000;

      try {
        await client.access({
          host: '82.198.228.36',
          user: 'u602943255.gold-hare-970225.hostingersite.com',
          password: 'Dell2020KoKa*',
          port: 21,
          secure: false
        });

        await client.ensureDir(path.posix.dirname(item.remote));
        await client.uploadFrom(item.local, item.remote);
        console.log(`✓ Uploaded: ${path.basename(item.remote)}`);
        uploaded = true;
        client.close();
        break;
      } catch (e) {
        client.close();
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    if (!uploaded) {
      console.warn(`Warning: Could not upload ${item.remote}`);
    }
  }

  console.log('✓ Deployment process finished!');
}

deploy();
