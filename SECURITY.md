# CogniCore Security Guide

## Data Privacy

- All data stored locally - no cloud communication
- No telemetry or user tracking
- All operations are local-first

## File Permissions

```bash
chmod 700 ./data
chmod 600 ./data/*.json
```

## Input Validation

All public APIs validate parameters strictly.

## Concurrent Safety

FileLock mechanism prevents race conditions.

## Backup Integrity

All backups verified with SHA256 checksums.

For detailed security information, see docs/
