const ftp = require('basic-ftp');
const path = require('path');

async function deploy() {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  client.ftp.timeout = 60000;

  let retries = 3;
  while (retries > 0) {
    try {
      console.log(`Connecting to Hostinger FTP (Attempt ${4 - retries}/3)...`);
      await client.access({
        host: '82.198.228.36',
        user: 'u602943255.gold-hare-970225.hostingersite.com',
        password: 'Dell2020KoKa*',
        port: 21,
        secure: false
      });

      console.log('Connected successfully!');
      const distPath = path.resolve(__dirname, 'dist');
      console.log(`Uploading all files from ${distPath} to Hostinger...`);
      
      await client.uploadFromDir(distPath);

      console.log('✓ All production files uploaded successfully to Hostinger!');
      break;
    } catch (err) {
      console.error(`Error during deployment: ${err.message}`);
      retries--;
      if (retries === 0) {
        console.error('All 3 deployment attempts failed.');
      } else {
        console.log('Retrying in 3 seconds...');
        await new Promise(r => setTimeout(r, 3000));
      }
    } finally {
      client.close();
    }
  }
}

deploy();
