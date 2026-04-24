import 'dotenv/config';
import {createApp} from './app.js';
import {env} from './config/env.js';

const app = createApp();

app.listen(env.port, '0.0.0.0', () => {
  console.log(`[VoteSecure API] Backend listening on port ${env.port}`);
  console.log(`[VoteSecure API] Allowed origins: ${env.corsOrigin}`);
});
