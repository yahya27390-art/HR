/**
 * Real-time Biometric Bridge for Ektefa AI Face Device (EK0201000044)
 * Continuously polls http://192.168.8.110/api and streams punches to Hostinger Cloud
 */

const http = require('http');
const https = require('https');

const DEVICE_IP = '192.168.8.110';
const DEVICE_PWD = '12345678';
const CLOUD_URL = 'https://gold-hare-970225.hostingersite.com/iclock/cdata.php?SN=EK0201000044&table=ATTLOG';
const POLL_INTERVAL_MS = 10000; // Check every 10 seconds

const sentPunches = new Set();

function fetchDeviceLogs() {
  const postData = JSON.stringify({
    cmd: 'getlog',
    password: DEVICE_PWD,
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    index: 0
  });

  const req = http.request(`http://${DEVICE_IP}/api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 5000
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.result && Array.isArray(json.record)) {
          handleRecords(json.record);
        }
      } catch (e) {
        console.error('JSON parse error:', e.message);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`Device ${DEVICE_IP} unreachable:`, err.message);
  });

  req.write(postData);
  req.end();
}

function handleRecords(records) {
  const newLines = [];
  for (const r of records) {
    const key = `${r.enrollid}_${r.time}`;
    if (!sentPunches.has(key)) {
      sentPunches.add(key);
      newLines.push(`${r.enrollid}\t${r.time}\t${r.inout || 0}\t1`);
    }
  }

  if (newLines.length > 0) {
    console.log(`[${new Date().toISOString()}] Streaming ${newLines.length} new punch(es) to cloud...`);
    forwardToCloud(newLines.join('\n'));
  }
}

function forwardToCloud(payload) {
  const req = https.request(CLOUD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload)
    },
    timeout: 10000
  }, (res) => {
    let resp = '';
    res.on('data', c => resp += c);
    res.on('end', () => {
      console.log('Cloud response:', resp.trim());
    });
  });

  req.on('error', (e) => {
    console.error('Failed to forward to cloud:', e.message);
  });

  req.write(payload);
  req.end();
}

console.log('=== Biometric Live Bridge started for ' + DEVICE_IP + ' ===');
fetchDeviceLogs();
setInterval(fetchDeviceLogs, POLL_INTERVAL_MS);
