import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';

// Public metadata service only. No diary, user, or AI-key endpoints.
export function createApp() {
  const app = new Hono();
  app.use('*', requestId());
  app.use('*', secureHeaders());
  app.get('/health', (c) => c.json({ status: 'ok', service: 'mogu-api', schemaVersion: 1 }));
  app.notFound((c) =>
    c.json(
      {
        error: { code: 'NOT_FOUND', message: 'Endpoint not found.' },
        requestId: c.get('requestId'),
      },
      404,
    ),
  );
  app.onError((_error, c) =>
    c.json(
      {
        error: { code: 'INTERNAL_ERROR', message: 'Please try again.' },
        requestId: c.get('requestId'),
      },
      500,
    ),
  );
  return app;
}
