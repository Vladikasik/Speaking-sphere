/* Minimal HTTPS static server for local network access (mic requires secure context) */
var https = require('https');
var fs = require('fs');
var path = require('path');

var dir = __dirname;
var types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.md': 'text/plain' };

var server = https.createServer({
  key: fs.readFileSync(path.join(dir, '.key.pem')),
  cert: fs.readFileSync(path.join(dir, '.cert.pem'))
}, function (req, res) {
  var file = req.url === '/' ? '/index.html' : req.url;
  var fp = path.join(dir, file);
  var ext = path.extname(fp);

  fs.readFile(fp, function (err, data) {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(3000, '0.0.0.0', function () {
  console.log('');
  console.log('  Neron Voice Agent running:');
  console.log('  Local:   https://localhost:3000');
  console.log('  Network: https://10.0.0.177:3000');
  console.log('');
  console.log('  (Accept the self-signed cert warning on your phone)');
  console.log('');
});
