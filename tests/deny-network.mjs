// Local validation guard; provider adapters in tests supply their own fixtures.
globalThis.fetch = async () => { throw new Error('External fetch prohibited in isolated readiness checks'); };
const net = await import('node:net');
const http = await import('node:http');
const https = await import('node:https');
const deny = () => { throw new Error('Network sockets prohibited in isolated readiness checks'); };
net.Socket.prototype.connect = deny;
http.default.request = deny;
http.default.get = deny;
https.default.request = deny;
https.default.get = deny;
