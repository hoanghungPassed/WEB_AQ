const http = require('http');

const data = JSON.stringify({ username: '01', password: '123456' });

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('statusCode', res.statusCode);
    console.log('body', body);
  });
});

req.on('error', (error) => {
  console.error(error);
});
req.write(data);
req.end();
