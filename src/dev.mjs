import http from 'node:http';
import handler from './server.mjs';

const port = Number(process.env.PORT || 4173);
http.createServer(handler).listen(port, '127.0.0.1', () => console.log(`Project Workbench running at http://127.0.0.1:${port}`));
