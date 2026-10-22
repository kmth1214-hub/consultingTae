const { app } = require('@azure/functions');
const { createLeaderboardHandlers } = require('../leaderboard/handlers');

const handlers = createLeaderboardHandlers();

app.http('leaderboardGet', {
  route: 'leaderboard',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: request => handlers.get(request)
});

app.http('leaderboardPost', {
  route: 'leaderboard',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: request => handlers.post(request)
});
