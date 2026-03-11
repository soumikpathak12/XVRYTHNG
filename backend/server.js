/**
 * XVRYTHNG Backend - Entry point.
 * HTTP server + WebSocket on /ws for instant chat.
 */
import 'dotenv/config';
import http from 'http';
import { WebSocketServer } from 'ws';
import app from './src/app.js';
import { attach as attachChatSocket } from './src/chatSocket.js';
import { startFollowupWorker } from './src/jobs/followupWorker.js';
import { startOwnerDocReminderWorker } from './src/jobs/ownerDocReminderWorker.js';
import { startProposalFollowupWorker } from './src/jobs/proposalFollowUpWorker.js';
import { runMigrations } from './database/migrationRunner.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });
attachChatSocket(wss);

// Run migrations before accepting connections (Flyway-style)
try {
  await runMigrations();
} catch (err) {
  console.error('💥 Migration failed — server will NOT start.', err.message);
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`XVRYTHNG API listening on port ${PORT} (HTTP + WS /ws)`);
});


//startFollowupWorker();
//startOwnerDocReminderWorker();
//  startProposalFollowupWorker();
