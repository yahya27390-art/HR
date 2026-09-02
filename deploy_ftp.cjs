const ftp = require('basic-ftp');
const path = require('path');

async function deploy() {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  try {
    console.log('Connecting to Hostinger FTP at 82.198.228.36...');
    await client.access({
      host: '82.198.228.36',
      user: 'u602943255.gold-hare-970225.hostingersite.com',
      password: 'Dell2020KoKa*',
      port: 21,
      secure: false
    });

    console.log('Connected successfully! Checking remote directory listing...');
    const list = await client.list();
    console.log('Remote contents:', list.map(item => item.name));

    const hasPublicHtml = list.some(item => item.name === 'public_html' && item.isDirectory);
    if (hasPublicHtml) {
      console.log('Navigating into public_html directory...');
      await client.cd('public_html');
    }

    const distPath = path.resolve(__dirname, 'dist');
    console.log(`Uploading all files from ${distPath} to Hostinger...`);
    await client.uploadFromDir(distPath);

    console.log('✓ All production files uploaded successfully!');
  } catch (err) {
    console.error('Deployment error:', err);
  } finally {
    client.close();
  }
}

deploy();
