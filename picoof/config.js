const process = require('process');

module.exports.RESOURCES_DIR = process.env.RESOURCES_DIR || '/resources';

const RAW_DISABLE_NETWORK = process.env.DISABLE_NETWORK || 'false';
module.exports.DISABLE_NETWORK = ['1', 'true'].includes(
  RAW_DISABLE_NETWORK.toLowerCase(),
);
