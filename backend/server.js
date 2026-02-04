/**
 * XVRYTHNG Backend - Entry point.
 * Load env first; start HTTP server.
 */
import 'dotenv/config';
import app from './src/app.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log(`XVRYTHNG API listening on port ${PORT}`);
});
