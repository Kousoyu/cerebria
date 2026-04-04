
/**
 * TaskManager - Dynamic Task Management System
 */

import EventBus from './core/EventBus';

export interface TaskOptions {
  priority?: string;
  callback?: Function;
  intent?: any;
  [key: string]: any; // Allow extensibility for custom metadata
}

export interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  priority: string;
  intent?: any;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

class TaskManager {
  protected dataDir: string;
  protected tasks: Map<string, TaskDefinition>;

  constructor(options: any = {}) {
    this.dataDir = options.dataDir || './data';
    this.tasks = new Map();

    // Listen for DurableContext step completions to patch history block by block in Memory Mode
    EventBus.getInstance().on('workflow:step:completed', (data: any) => {
      const task = this.tasks.get(data.taskId);
      if (task) {
        if (!task.workflowState) task.workflowState = { history: {}, status: 'running' };
        task.workflowState.history[data.stepId] = data.result;
      }
    });
  }

  async createTask(title: string, description: string, options: TaskOptions = {}): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.tasks.set(taskId, {
      id: taskId,
      title,
      description,
      priority: options.priority || 'medium',
      intent: options.intent || null,
      workflowState: { history: {}, status: 'running' },
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Notify scheduling execution
    EventBus.getInstance().emit('task:created', {
      ...this.tasks.get(taskId),
      callback: options.callback
    });

    return taskId;
  }

  async getTask(taskId: string): Promise<TaskDefinition | undefined> {
    return this.tasks.get(taskId);
  }

  async completeTask(taskId: string): Promise<TaskDefinition | undefined> {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'completed';
      task.updatedAt = new Date().toISOString();
    }
    return task;
  }

  async getAllTasks(): Promise<TaskDefinition[]> {
    return Array.from(this.tasks.values());
  }
}

export default TaskManager;
