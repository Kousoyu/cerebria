/**
 * ConfigManager - Centralized Configuration Management
 */

class ConfigManager {
  [key: string]: any;
  constructor(mode = 'standard') {
    this.mode = mode;
    this.config = this.loadConfig(mode);
  }

  loadConfig(mode) {
    const configs = {
      light: { cacheSize: 10, maxBackups: 3 },
      standard: { cacheSize: 50, maxBackups: 10 },
      performance: { cacheSize: 200, maxBackups: 20 }
    };
    return configs[mode] || configs.standard;
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
  }
}

export default ConfigManager;
