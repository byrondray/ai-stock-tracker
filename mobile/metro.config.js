const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Suppress Metro logs for demo
config.reporter = {
  update: () => {},
};

module.exports = config;
