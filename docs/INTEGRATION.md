# Integration Guide

## Event-Driven Architecture

const { EventBus } = require('cogni-core');
const bus = EventBus.getInstance();

bus.on('TASK_CREATED', (data) => {
  console.log('Task created:', data.taskId);
});

bus.on('TASK_COMPLETED', (data) => {
  console.log('Task completed:', data.taskId);
});

## External System Integration

See examples/ for complete integration examples.

For detailed information, see documentation.
