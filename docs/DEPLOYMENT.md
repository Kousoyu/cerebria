# 🚀 Deployment Guide

## Supported Modes

### Light Mode
- Usage: IoT, Raspberry Pi, minimal resources
- Memory: ~20MB
- Cache Size: 10
- Max Backups: 3

### Standard Mode
- Usage: Personal development, small teams
- Memory: ~50MB
- Cache Size: 50
- Max Backups: 10

### Performance Mode
- Usage: Enterprise, high concurrency
- Memory: ~200MB
- Cache Size: 200
- Max Backups: 20

## Installation

npm install cogni-core

## Quick Start

const CogniCore = require('cogni-core');
const system = await CogniCore.initialize({
  mode: 'standard',
  dataDir: './data'
});
