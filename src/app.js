const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');

const app = express();

app.use(helmet());
app.use(cors()); // mobile app + web frontend both need cross-origin access
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/v1', routes);

// Unknown route -> 404, before the error handler
app.use((req, res, next) => {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);

module.exports = app;
