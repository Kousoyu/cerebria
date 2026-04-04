# Configuration Guide

## Config Files

Configuration files are in config/ directory:
- light.json - Minimal resource usage
- standard.json - General purpose
- performance.json - High concurrency

## Environment Variables

COGNI_MODE=performance
COGNI_DATA_DIR=/var/lib/cerebria
COGNI_LOGGING__LEVEL=DEBUG

## Runtime Configuration

const ConfigManager = require('cerebria').ConfigManager;
const config = new ConfigManager('standard');
config.set('maxBackups', 15);
