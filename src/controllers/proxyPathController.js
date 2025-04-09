// Add a new proxy path
const { fdkExtension } = require('../../fdkSetup/fdk');
exports.addProxyPath = async (req, res) => {
  try {
    console.log('Received request to add proxy path');
    const { platformClient } = req;
    const { application_id, attached_path, proxy_url } = req.body;

    if (!platformClient) return res.status(401).json({ message: 'Platform client is not available' });
    if (!application_id) return res.status(400).json({ message: 'Application ID is required' });
    if (!attached_path) return res.status(400).json({ message: 'Attached path is required' });
    if (!proxy_url) return res.status(400).json({ message: 'Proxy URL is required' });

    // Get the extension ID from your FDK extension
    const extensionId = fdkExtension.extension.configData.api_key;

    // Call the Partner API to add a proxy path
    const data = await platformClient.application(application_id).partner.addProxyPath({
      extensionId,
      body: {
        attached_path,
        proxy_url,
      },
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error adding proxy path:', error);
    return res.status(500).json({ message: 'Failed to add proxy path', error: error.message });
  }
};

// Get all proxy paths for an application
// exports.getProxyPaths = async (req, res) => {
//   try {
//     const { platformClient } = req;
//     const { application_id } = req.params;

//     if (!platformClient) return res.status(401).json({ message: 'Platform client is not available' });

//     // Get the extension ID from your FDK extension
//     const extensionId = fdkExtension.extension.configData.api_key;

//     // Call the Partner API to get all proxy paths
//     const data = await platformClient.application(application_id).partner.getProxyPath({
//       extensionId,
//     });
//     console.log(data)
//     return res.json(data);
//   } catch (error) {
//     console.error('Error getting proxy paths:', error);
//     return res.status(500).json({ message: 'Failed to get proxy paths', error: error.message });
//   }
// };

// Delete a proxy path
exports.removeProxyPath = async (req, res) => {
  try {
    const { platformClient } = req;
    const { application_id } = req.params;
    const { attachedPath } = req.body;

    if (!platformClient) return res.status(401).json({ message: 'Platform client is not available' });

    // Get the extension ID from your FDK extension
    const extensionId = fdkExtension.extension.configData.api_key;

    // Call the Partner API to remove a proxy path
    const data = await platformClient.application(application_id).partner.removeProxyPath({
      extensionId,
      attachedPath,
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error removing proxy path:', error);
    return res.status(500).json({ message: 'Failed to remove proxy path', error: error.message });
  }
};

// const fs = require('fs');
// const path = require('path');
// const { fdkExtension } = require('../../fdkSetup/fdk');

// // Path to your proxy configurations file
// const CONFIG_FILE_PATH = path.join(process.cwd(), 'proxyConfigurations.json');

// // Helper function to read proxy configurations
// const readProxyConfigs = () => {
//   try {
//     if (fs.existsSync(CONFIG_FILE_PATH)) {
//       return JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf8'));
//     }
//     return [];
//   } catch (error) {
//     console.error('Error reading proxy configurations:', error);
//     return [];
//   }
// };

// // Helper function to write proxy configurations
// const writeProxyConfigs = (configs) => {
//   try {
//     fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configs, null, 2));
//     return true;
//   } catch (error) {
//     console.error('Error writing proxy configurations:', error);
//     return false;
//   }
// };

// // Add a new proxy path
// exports.addProxyPath = async (req, res) => {
//   try {
//     console.log('Received request to add proxy path');
//     const { application_id, attached_path, proxy_url } = req.body;

//     if (!application_id) return res.status(400).json({ message: 'Application ID is required' });
//     if (!attached_path) return res.status(400).json({ message: 'Attached path is required' });
//     if (!proxy_url) return res.status(400).json({ message: 'Proxy URL is required' });

//     // Get the extension ID from your FDK extension
//     const extensionId = fdkExtension.extension.configData.api_key || fdkExtension.extension.configData.extension_id;
//     const company_id = req.headers['x-company-id'] || '9095'; // Use header or default

//     // Read existing configurations
//     const configs = readProxyConfigs();

//     // Check if this path already exists
//     const existingIndex = configs.findIndex(c => 
//       c.application_id === application_id && c.attached_path === attached_path);

//     if (existingIndex !== -1) {
//       // Update existing entry
//       configs[existingIndex].proxy_url = proxy_url;
//     } else {
//       // Add new entry
//       configs.push({
//         company_id,
//         application_id,
//         extension_id: extensionId,
//         attached_path,
//         proxy_url
//       });
//     }

//     // Save updated configurations
//     if (writeProxyConfigs(configs)) {
//       return res.json({ 
//         success: true, 
//         message: 'Proxy path added successfully',
//         data: {
//           attached_path,
//           proxy_url
//         }
//       });
//     } else {
//       return res.status(500).json({ message: 'Failed to save proxy configuration' });
//     }
//   } catch (error) {
//     console.error('Error adding proxy path:', error);
//     return res.status(500).json({ message: 'Failed to add proxy path', error: error.message });
//   }
// };

// // Get all proxy paths for an application
// exports.getProxyPaths = async (req, res) => {
//   try {
//     const { application_id } = req.params;

//     // Read existing configurations
//     const configs = readProxyConfigs();
    
//     // Filter by application ID if provided
//     const filteredConfigs = application_id 
//       ? configs.filter(c => c.application_id === application_id)
//       : configs;

//     console.log('Retrieved proxy paths:', filteredConfigs);
    
//     return res.json({ 
//       items: filteredConfigs,
//       page: { current: 1, has_next: false, item_total: filteredConfigs.length }
//     });
//   } catch (error) {
//     console.error('Error getting proxy paths:', error);
//     return res.status(500).json({ message: 'Failed to get proxy paths', error: error.message });
//   }
// };

// // Delete a proxy path
// exports.removeProxyPath = async (req, res) => {
//   try {
//     const { application_id } = req.params;
//     const { attachedPath } = req.body;

//     if (!application_id) return res.status(400).json({ message: 'Application ID is required' });
//     if (!attachedPath) return res.status(400).json({ message: 'Attached path is required' });

//     // Read existing configurations
//     const configs = readProxyConfigs();
    
//     // Filter out the configuration to remove
//     const newConfigs = configs.filter(c => 
//       !(c.application_id === application_id && c.attached_path === attachedPath));
    
//     // Check if any item was removed
//     if (configs.length === newConfigs.length) {
//       return res.status(404).json({ message: 'Proxy path not found' });
//     }

//     // Save updated configurations
//     if (writeProxyConfigs(newConfigs)) {
//       return res.json({ 
//         success: true, 
//         message: 'Proxy path removed successfully' 
//       });
//     } else {
//       return res.status(500).json({ message: 'Failed to save proxy configuration' });
//     }
//   } catch (error) {
//     console.error('Error removing proxy path:', error);
//     return res.status(500).json({ message: 'Failed to remove proxy path', error: error.message });
//   }
// };