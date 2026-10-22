import { listen } from '@colyseus/tools';
import server from './app.config.js';

const port = Number(process.env.PORT ?? 2567);
await listen(server, port);
