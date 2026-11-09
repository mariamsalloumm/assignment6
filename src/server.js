import { createApp } from './app.js';
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const { app, close } = createApp(process.env.DATABASE_PATH || './data/notes.sqlite');
const server = app.listen(port, () => console.log(`Notes API listening on http://localhost:${port}`));
server.on('error', error => { console.error(error.message); close(); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { close(); process.exit(0); }));
