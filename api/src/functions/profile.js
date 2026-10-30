const { app } = require('@azure/functions');
const { createPlayerProfileHandlers } = require('../profile/handlers');

const handlers = createPlayerProfileHandlers();

app.http('profileGet', {
  route: 'profile', methods: ['GET'], authLevel: 'anonymous',
  handler: request => handlers.get(request)
});

app.http('profileSnowClear', {
  route: 'profile/snow-clear', methods: ['POST'], authLevel: 'anonymous',
  handler: request => handlers.unlockSnow(request)
});
