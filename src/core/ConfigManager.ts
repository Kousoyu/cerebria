/**
 * ConfigManager - Centralized Configuration Management
 */

class ConfigManager {
  [key: string]: any;
  constructor(mode: string = 'standard') {
    this.mode = mode;
    this.config = this.loadConfig(mode);
  }

  loadConfig(mode: string) {
    const configs: Record<string, any> = {
      light: { cacheSize: 10, maxBackups: 3 },
      standard: { cacheSize: 50, maxBackups: 10 },
      performance: { cacheSize: 200, maxBackups: 20 }
    };
    return configs[mode] || configs.standard;
  }

  get(key: string) {
    return this.config[key];
  }

  set(key: string, value: any) {
    this.config[key] = value;
  }
}

export default ConfigManager;
