const dns = require('dns');
const name = '_mongodb._tcp.aq-media-cluster.uwjtsq1.mongodb.net';

console.log('Node DNS servers:', dns.getServers());

dns.resolveSrv(name, (err, records) => {
  if (err) {
    console.error('SRV error:', err);
    process.exit(1);
  }
  console.log('SRV records:', records);
});
