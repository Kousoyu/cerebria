# 🚀 Deployment Guide

## Supported Modes

Cerebria supports three operational modes designed for different use cases:

### Light Mode
- **Usage**: IoT devices, Raspberry Pi, minimal resource environments
- **Memory**: Target ~20MB (current implementation uses variable memory)
- **Cache Size**: 10 items
- **Max Backups**: 3
- **Best for**: Edge computing, low-power devices, simple prototypes

### Standard Mode
- **Usage**: Personal development, small teams, general purpose
- **Memory**: Target ~50MB (current implementation uses variable memory)
- **Cache Size**: 50 items
- **Max Backups**: 10
- **Best for**: Most development and testing scenarios

### Performance Mode
- **Usage**: Enterprise applications, high concurrency, production workloads
- **Memory**: Target ~200MB (current implementation uses variable memory)
- **Cache Size**: 200 items
- **Max Backups**: 20
- **Best for**: High-performance applications, team collaboration

## Installation

### From Source (Current Recommended Method)

Since Cerebria is in active development and not yet published to npm, installation from source is recommended:

```bash
# Clone the repository
git clone https://github.com/Kousoyu/cerebria.git
cd cerebria

# Install dependencies
npm install

# Verify installation
npm test
```

### Planned Package Installation

Once Cerebria reaches stable release status, installation via npm will be available:

```bash
npm install cerebria
```

*Note: Package publishing is planned for version 2.0.0 or later.*

## Quick Start

### Local Development

```javascript
const Cerebria = require('./src/index.js');  // Note: path to source during development

async function main() {
  const system = await Cerebria.initialize({
    mode: 'standard',
    dataDir: './data'
  });
  
  console.log('Cerebria initialized successfully');
  // Your code here
}

main().catch(console.error);
```

### Docker Deployment

```bash
# Build and run with Docker Compose (recommended)
docker-compose up --build

# Or run directly with Docker
docker run --rm -it \
  -e COGNI_MODE=standard \
  -v cogni-data:/app/data \
  -p 3000:3000 \
  ghcr.io/kousoyu/cerebria:latest
```

## Configuration

### Environment Variables

Cerebria can be configured via environment variables:

```bash
# Operational mode
export COGNI_MODE=performance

# Data directory (Docker: mount as volume)
export COGNI_DATA_DIR=/var/lib/cerebria

# Logging level
export COGNI_LOGGING_LEVEL=DEBUG

# Backup settings
export COGNI_BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
```

### Programmatic Configuration

```javascript
const { ConfigManager } = require('cerebria');
const config = new ConfigManager('performance');

// Runtime configuration
config.set('cacheSize', 100);
config.set('maxRetries', 5);
```

## Production Deployment

### Docker Production Configuration

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  cerebria:
    image: ghcr.io/kousoyu/cerebria:latest
    container_name: cerebria
    restart: unless-stopped
    environment:
      COGNI_MODE: performance
      COGNI_DATA_DIR: /data
      NODE_ENV: production
    volumes:
      - cogni-data:/data
      - ./config:/app/config:ro
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "node", "-e", "require('cerebria').start()"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  cogni-data:
```

### Kubernetes Deployment

```yaml
# cerebria-deployment.yaml (example)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cerebria
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cerebria
  template:
    metadata:
      labels:
        app: cerebria
    spec:
      containers:
      - name: cerebria
        image: ghcr.io/kousoyu/cerebria:latest
        env:
        - name: COGNI_MODE
          value: "performance"
        - name: NODE_ENV
          value: "production"
        volumeMounts:
        - name: data
          mountPath: /data
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: cogni-data-pvc
```

## Monitoring and Maintenance

### Health Checks

Cerebria provides built-in health monitoring:

```javascript
const system = await Cerebria.initialize();
const health = await system.healthMonitor.generateReport();

if (health.healthy) {
  console.log('System is healthy:', health.metrics);
} else {
  console.error('System health issues:', health.metrics);
}
```

### Backup and Recovery

```javascript
// Create backup
const backupId = await system.backupManager.createBackup();
console.log('Backup created:', backupId);

// List backups
const backups = await system.backupManager.listBackups();
console.log('Available backups:', backups);

// Restore from backup
const result = await system.backupManager.restoreBackup(backupId);
if (result.success) {
  console.log('Restore successful:', result.backup);
}
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```bash
   sudo chown -R $(whoami) ./data
   chmod 700 ./data
   ```

2. **Memory Issues**
   - Switch to Light mode for resource-constrained environments
   - Adjust cacheSize in configuration
   - Monitor with healthMonitor.generateReport()

3. **Docker Volume Permissions**
   ```bash
   docker run --rm -it -v $(pwd)/data:/app/data:z cerebria
   ```

### Getting Help

- Check the [API Reference](./API_REFERENCE.md) for detailed usage
- Review [Configuration Guide](./CONFIGURATION.md) for setup options
- File issues on [GitHub](https://github.com/Kousoyu/cerebria/issues)

---

*Note: Cerebria is currently in active development. Production deployment recommendations will evolve with the project.*