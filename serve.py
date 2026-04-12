#!/usr/bin/env python3
"""Simple HTTPS dev server for testing on local network (mic requires HTTPS)."""
import http.server, ssl, sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8443
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain('cert.pem', 'key.pem')

srv = http.server.HTTPServer(('0.0.0.0', port), http.server.SimpleHTTPRequestHandler)
srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
print(f'Serving HTTPS on https://10.0.0.177:{port}')
srv.serve_forever()
