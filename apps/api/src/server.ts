import { serve } from '@hono/node-server';
import { createApp } from './app';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be between 1 and 65535.');
serve({ fetch: createApp().fetch, port }, () =>
  console.log(`Mogu public API listening on port ${port}`),
);
