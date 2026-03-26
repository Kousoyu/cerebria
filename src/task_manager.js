/**
 * TaskManager - Dynamic Task Management System
 */

class TaskManager {
  constructor(options = {}) {
    this.dataDir = options.dataDir || './data';
    this.tasks = new Map();
    this.taskId = 0;
  }

  async createTask(title, description, options = {}) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.tasks.set(taskId, {
      id: taskId,
      title,
      description,
      priority: options.priority || 'medium',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return taskId;
  }

  async getTask(taskId) {
    return this.tasks.get(taskId);
  }

  async completeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'completed';
      task.updatedAt = new Date().toISOString();
    }
    return task;
  }

  async getAllTasks() {
    return Array.from(this.tasks.values());
  }
}

module.exports = TaskManager;
