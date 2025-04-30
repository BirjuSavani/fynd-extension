require('dotenv').config();
const app = require('./server');
const { logger } = require('./src/utils/logger');
const port = process.env.BACKEND_PORT || 8080;

// Add process error handlers
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  // Give logger time to flush before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

app.listen(port, () => {
  logger.info(`Server started successfully`, {
    port,
    // environment: process.env.NODE_ENV || 'development',
    url: `http://localhost:${port}`,
  });
});

// 'use strict';

// require("dotenv").config();
// const app = require("./server");
// const port = process.env.BACKEND_PORT || 8081;

// app.listen(port, () => {
//     console.log(`Example app listening at http://localhost:${port}`)
// });'use strict';
