const http = require('http');
const fs = require('fs');

const envFile = fs.readFileSync('/home/ec2-user/aroha-backend/.env', 'utf8');
const secretLine = envFile.split('\n').find(line => line.startsWith('CRON_SECRET='));
const secret = secretLine.split('=')[1].replace(/\"/g, '').trim();

const data = JSON.stringify({ force: true });

const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/internal/cron/daily-horoscopes',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cron-Secret': secret,
      'Content-Length': Buffer.byteLength(data)
    }
  },
  (res) => {
    let output = '';
    res.on('data', (chunk) => { output += chunk; });
    res.on('end', () => { console.log(output); });
  }
);
req.write(data);
req.end();
