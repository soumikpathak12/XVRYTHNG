import http from 'http';

const data = JSON.stringify({
  inspected_at: "2026-03-13T10:00",
  inspector_name: "Test User",
  roof_type: "Metal"
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/leads/69/site-inspection/submit',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(res.statusCode, body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
