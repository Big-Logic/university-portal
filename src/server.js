const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.warn(`University Portal API listening on port ${env.port} [${env.nodeEnv}]`);
});
