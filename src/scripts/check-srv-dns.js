const dns = require('dns');
const name = '_mongodb._tcp.aq-media-cluster.uwjtsq1.mongodb.net';

console.log('Node DNS servers before:', dns.getServers());
if (dns.getServers().length === 1 && dns.getServers()[0] === '127.0.0.1') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('Forced DNS to Google (8.8.8.8)');
}
console.log('Node DNS servers after:', dns.getServers());

dns.resolveSrv(name, (err, records) => {
  if (err) {
    console.error('SRV error:', err);
    process.exit(1);
  }
  console.log('SRV records:', records);
});
