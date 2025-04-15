const { setupFdk } = require('@gofynd/fdk-extension-javascript/express');
const { SQLiteStorage } = require('@gofynd/fdk-extension-javascript/express/storage');
const sqlite3 = require('sqlite3').verbose();
const { logger } = require('../src/utils/logger');

const sqliteInstance = new sqlite3.Database('session_storage.db');

const fdkExtension = setupFdk({
  api_key: process.env.EXTENSION_API_KEY,
  api_secret: process.env.EXTENSION_API_SECRET,
  base_url: process.env.EXTENSION_BASE_URL,
  cluster: process.env.FP_API_DOMAIN,
  callbacks: {
    auth: async (req, res) => {
      const companyId = req.extension?.company_id || req.query.company_id;
      const applicationId = req.extension?.application_id || req.query.application_id;
      const requestId = req.requestId || 'unknown';

      logger.info(`Authentication callback triggered`, {
        requestId,
        companyId,
        applicationId,
      });

      // Save companyId in storage
      await req.extension.storage.set('company_id', companyId);
      await req.extension.storage.set('app_id', applicationId);

      // return `${req.extension.base_url}/company/${req.query.company_id}`;
      if (req.query.application_id) {
        return `${req.extension.base_url}/company/${req.query.company_id}/application/${req.query.application_id}`;
      } else {
        return `${req.extension.base_url}/company/${req.query.company_id}`;
      }
    },
    uninstall: async (req) => {
      const requestId = req.requestId || 'unknown';
      logger.info('Uninstall callback triggered', { requestId });
      // Cleanup logic here
      logger.debug('Performing uninstall cleanup actions', { requestId });
    },
  },
  storage: new SQLiteStorage(sqliteInstance, 'example-fynd-platform-extension'),
  access_mode: 'offline',
  webhook_config: {
    api_path: '/api/webhook-events',
    notification_email: 'useremail@example.com',
    event_map: {
      'company/product/delete': {
        handler: (eventName) => {
          console.log(eventName);
        },
        version: '1',
      },
    },
  },
});

logger.info(`FDK Extension initialized with base URL: ${fdkExtension.extension.configData.base_url}`);

const extensionId = fdkExtension.extension.api_key;
logger.info(`Extension ID: ${extensionId}`);

fdkExtension.getPlatformClient('9095');

module.exports = { fdkExtension, extensionId };
