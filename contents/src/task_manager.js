/**
 * TaskManager - Dynamic Task Management System
 * Supports: creation, retrieval, update, deletion, completion, dependencies, stats
 */
class TaskManager {
  constructor(options = {}) {
    this.options = options;
    this.tasks = new Map();
    this.taskIdCounter = 0;
  }

  async createTask(title, description, options) {
    const taskId = 'task_' + Date.now() + '_' + (++this.taskIdCounter);
    const task = {
      id: taskId,
      title: String(title),
      description: String(description || ''),
      priority: validatePriority((options && options.priority) || 'medium'),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      failedAt: null,
      error: null,
      dependencies: (options && options.dependencies && Array.isArray(options.dependencies)) ? options.dependencies : [],
      tags: (options && options.tags && Array.isArray(options.tags)) ? options.tags : [],
      metadata: (options && options.metadata) || {},
    };
    this.tasks.set(taskId, task);
    return taskId;
  }

  async getTask(taskId) { return this.tasks.get(taskId) || null; }

  async updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    if (updates && updates.title !== undefined) task.title = String(updates.title);
    if (updates && updates.description !== undefined) task.description = String(updates.description);
    if (updates && updates.priority !== undefined) task.priority = validatePriority(updates.priority);
    if (updates && updates.status !== undefined) task.status = validateStatus(updates.status);
    if (updates && Array.isArray(updates.tags)) task.tags = updates.tags;
    if (updates && Array.isArray(updates.dependencies)) task.dependencies = updates.dependencies;
    if (updates && updates.metadata !== undefined) task.metadata = Object.assign({}, task.metadata, updates.metadata);
    task.updatedAt = new Date().toISOString();
    return task;
  }

  async completeTask(taskId) { return this.updateTask(taskId, { status: 'completed', completedAt: new Date().toISOString() }); }
  async failTask(taskId, errorMsg) { return this.updateTask(taskId, { status: 'failed', failedAt: new Date().toISOString(), error: String(errorMsg || '') }); }
  async deleteTask(taskId) { return this.tasks.delete(taskId); }
  async getAllTasks() { return Array.from(this.tasks.values()); }

  async listTasks(filter) {
    filter = filter || {};
    let tasks = Array.from(this.tasks.values());
    if (filter.status) tasks = tasks.filter(t => t.status === filter.status);
    if (filter.priority) tasks = tasks.filter(t => t.priority === filter.priority);
    if (filter.tags && filter.tags.length) tasks = tasks.filter(t => filter.tags.some(tag => t.tags.includes(tag)));
    if (filter.search) {
      const q = filter.search.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    if (filter.createdAfter) tasks = tasks.filter(t => new Date(t.createdAt) > new Date(filter.createdAfter));
    if (filter.createdBefore) tasks = tasks.filter(t => new Date(t.createdAt) < new Date(filter.createdBefore));
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (filter.limit) tasks = tasks.slice(filter.offset || 0, (filter.offset || 0) + filter.limit);
    return tasks;
  }

  async addDependency(taskId, dependsOnId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    if (!task.dependencies.includes(dependsOnId)) { task.dependencies.push(dependsOnId); task.updatedAt = new Date().toISOString(); }
    return true;
  }

  async removeDependency(taskId, dependsOnId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.dependencies = task.dependencies.filter(id => id !== dependsOnId);
    task.updatedAt = new Date().toISOString();
    return true;
  }

  getDependentTasks(taskId) { return Array.from(this.tasks.values()).filter(t => t.dependencies.includes(taskId)); }

  async getStats() {
    const tasks = Array.from(this.tasks.values());
    const stats = { total: tasks.length, active: 0, completed: 0, failed: 0, byPriority: {} };
    for (const task of tasks) {
      if (task.status === 'active') stats.active++;
      else if (task.status === 'completed') stats.completed++;
      else if (task.status === 'failed') stats.failed++;
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
    }
    return stats;
  }

  async cleanupOldTasks(options) {
    options = options || {};
    const keepCompletedDays = options.keepCompletedDays || 90;
    const keepAllTasks = options.keepAllTasks || false;
    const before = this.tasks.size;
    if (keepAllTasks) return { deleted: 0, message: 'Skipped (keepAllTasks=true)' };
    const cutoff = Date.now() - keepCompletedDays * 24 * 60 * 60 * 1000;
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed' && task.completedAt && new Date(task.completedAt).getTime() < cutoff) this.tasks.delete(id);
    }
    return { deleted: before - this.tasks.size, message: 'Deleted ' + (before - this.tasks.size) + ' old completed tasks' };
  }

  async persistAll() { return { persisted: this.tasks.size }; }
  async close() {}
  async healthCheck() { return { healthy: true, storage: 'memory', taskCount: this.tasks.size }; }
}

function validatePriority(value) { return ['low','medium','high','critical'].includes(value) ? value : 'medium'; }
function validateStatus(value) { return ['active','completed','failed','cancelled'].includes(value) ? value : 'active'; }
module.exports = TaskManager;
