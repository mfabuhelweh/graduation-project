import 'dotenv/config';
import {createApp} from './app.js';
import {env} from './config/env.js';

const app = createApp();

app.listen(env.port, '0.0.0.0', () => {
  console.log(`[VoteSecure API] Backend running on http://localhost:${env.port}`);
});
