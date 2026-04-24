import 'dotenv/config';
import {createApp} from './app.js';
import {env} from './config/env.js';

const app = createApp();

app.listen(env.port, '0.0.0.0', () => {
  console.log(`[VoteSecure API] Backend running on frontend-nevs-pk4c.vercel.app`);
});
