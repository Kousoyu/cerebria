/**
 * PersistentPolicyManager - 持久化策略管理
 * 升级版PersonalityManager，提供完整的策略生命周期管理
 */

const CogniDatabase = require('./Database');

class PersistentPolicyManager {
  constructor(options = {}) {
    this.dbOptions = {
      dataDir: options.dataDir || './data',
      memory: options.memory || false,
      readonly: false,
      verbose: options.verbose || false
    };

    this.db = null;
    this.usePersistentStorage = options.persistent !== false; // 默认启用持久化

    // 延迟初始化数据库连接
    this.initialized = false;
  }

  /**
   * 初始化数据库连接
   */
  async initialize() {
    if (this.initialized || !this.usePersistentStorage) {
      return;
    }

    try {
      this.db = new CogniDatabase(this.dbOptions);
      await this.db.connect();
      this.initialized = true;

      console.log('✅ PersistentPolicyManager initialized with database storage');
    } catch (error) {
      console.warn('⚠️  Failed to initialize persistent storage, falling back to memory:', error.message);
      this.usePersistentStorage = false;
      this.initialized = true;
    }
  }

  /**
   * 确保数据库已初始化
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * 创建新策略
   */
  async createPolicy(name, content, options = {}) {
    await this.ensureInitialized();

    const policy = {
      id: `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      version: 1,
      content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
      is_active: options.isActive !== false ? 1 : 0, // 默认激活，转换为SQLite整数
      created_at: Date.now(),
      updated_at: Date.now(),
      created_by: options.createdBy || 'system'
    };

    if (this.usePersistentStorage) {
      try {
        await this.db.insert('policies', policy);
        console.log(`✅ Policy ${policy.id} created`);
        
        // 记录创建变更
        await this.recordPolicyChange(policy.id, 'create', null, policy.content, 'Initial creation');
        
        return policy;
      } catch (error) {
        console.warn('⚠️  Failed to create policy in database:', error.message);
        throw error;
      }
    } else {
      // 内存存储（简化版）
      return policy;
    }
  }

  /**
   * 获取策略
   */
  async getPolicy(policyId, options = {}) {
    await this.ensureInitialized();

    if (this.usePersistentStorage) {
      try {
        const policy = await this.db.getById('policies', policyId);
        if (!policy) {
          throw new Error(`Policy ${policyId} not found`);
        }
        return policy;
      } catch (error) {
        console.warn('⚠️  Failed to get policy from database:', error.message);
        throw error;
      }
    } else {
      throw new Error('Memory storage not implemented for policies');
    }
  }

  /**
   * 更新策略（创建新版本）
   */
  async updatePolicy(policyId, newContent, options = {}) {
    await this.ensureInitialized();

    if (this.usePersistentStorage) {
      try {
        // 获取当前策略
        const currentPolicy = await this.getPolicy(policyId);
        
        // 创建新版本
        const updatedPolicy = {
          ...currentPolicy,
          version: currentPolicy.version + 1,
          content: typeof newContent === 'string' ? newContent : JSON.stringify(newContent, null, 2),
          updated_at: Date.now()
        };

        // 更新数据库
        await this.db.update('policies', policyId, updatedPolicy);
        
        // 记录变更
        await this.recordPolicyChange(
          policyId,
          'update',
          currentPolicy.content,
          updatedPolicy.content,
          options.reason || 'Policy update'
        );

        console.log(`✅ Policy ${policyId} updated to version ${updatedPolicy.version}`);
        return updatedPolicy;
      } catch (error) {
        console.warn('⚠️  Failed to update policy in database:', error.message);
        throw error;
      }
    } else {
      throw new Error('Memory storage not implemented for policies');
    }
  }

  /**
   * 删除策略（软删除）
   */
  async deletePolicy(policyId, options = {}) {
    await this.ensureInitialized();

    if (this.usePersistentStorage) {
      try {
        const currentPolicy = await this.getPolicy(policyId);
        
        // 标记为不活跃（软删除）
        await this.db.update('policies', policyId, { is_active: false, updated_at: Date.now() });
        
        // 记录删除变更
        await this.recordPolicyChange(
          policyId,
          'delete',
          currentPolicy.content,
          null,
          options.reason || 'Policy deletion'
        );

        console.log(`✅ Policy ${policyId} deleted (deactivated)`);
        return true;
      } catch (error) {
        console.warn('⚠️  Failed to delete policy:', error.message);
        throw error;
      }
    } else {
      throw new Error('Memory storage not implemented for policies');
    }
  }

  /**
   * 列出所有策略
   */
  async listPolicies(options = {}) {
    await this.ensureInitialized();

    const { activeOnly = true, limit = 100, offset = 0 } = options;

    if (this.usePersistentStorage) {
      try {
        let query = 'SELECT * FROM policies';
        const params = [];

        if (activeOnly) {
          query += ' WHERE is_active = ?';
          params.push(1);
        }

        query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const policies = await this.db.query(query, params);
        return policies;
      } catch (error) {
        console.warn('⚠️  Failed to list policies:', error.message);
        return [];
      }
    } else {
      return []; // 内存存储未实现
    }
  }

  /**
   * 提出策略变更（需要审批）
   */
  async proposePolicyChange(policyId, proposedContent, options = {}) {
    await this.ensureInitialized();

    if (this.usePersistentStorage) {
      try {
        const currentPolicy = await this.getPolicy(policyId);
        
        const changeId = `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const changeRecord = {
          id: changeId,
          policy_id: policyId,
          change_type: 'propose',
          previous_content: currentPolicy.content,
          new_content: typeof proposedContent === 'string' ? proposedContent : JSON.stringify(proposedContent, null, 2),
          reason: options.reason || 'Proposed change',
          status: 'pending',
          created_at: Date.now(),
          approved_at: null,
          approved_by: null,
          applied_at: null
        };

        await this.db.insert('policy_changes', changeRecord);
        
        console.log(`✅ Policy change proposed: ${changeId} for policy ${policyId}`);
        return changeRecord;
      } catch (error) {
        console.warn('⚠️  Failed to propose policy change:', error.message);
        throw error;
      }
    } else {
      throw new Error('Memory storage not implemented for policy changes');
    }
  }

  /**
   * 审批策略变更
   */
  async approvePolicyChange(changeId, options = {}) {
    await this.ensureInitialized();

    if (this.usePersistentStorage) {
      try {
        // 获取变更记录
        const change = await this.db.getById('policy_changes', changeId);
        if (!change) {
          throw new Error(`Change ${changeId} not found`);
        }

        if (change.status !== 'pending') {
          throw new Error(`Change ${changeId} is not pending (current status: ${change.status})`);
        }

        // 更新变更状态
        await this.db.update('policy_changes', changeId, {
          status: 'approved',
          approved_at: Date.now(),
          approved_by: options.approvedBy || 'system'
        });

        // 如果变更类型是propose，应用变更到策略
        if (change.change_type === 'propose') {
          const policy = await this.getPolicy(change.policy_id);
          
          const updatedPolicy = {
            ...policy,
            version: policy.version + 1,
            content: change.new_content,
            updated_at: Date.now()
          };

          await this.db.update('policies', change.policy_id, updatedPolicy);
          
          // 更新变更记录为已应用
          await this.db.update('policy_changes', changeId, {
            applied_at: Date.now()
          });

          console.log(`✅ Policy change ${changeId} approved and applied to policy ${change.policy_id}`);
        } else {
          console.log(`✅ Policy change ${changeId} approved`);
        }

        return change;
      } catch (error) {
        console.warn('⚠️  Failed to approve policy change:', error.message);
        throw error;
      }
    } else {
      throw new Error('Memory storage not implemented for policy changes');
    }
  }

  /**
   * 拒绝策略变更
   */
  async rejectPolicyChange(changeId, options = {}) {
    await this.ensureInitialized();

    if (this.usePersistentStorage) {
      try {
        await this.db.update('policy_changes', changeId, {
          status: 'rejected',
          approved_at: Date.now(),
          approved_by: options.rejectedBy || 'system'
        });

        console.log(`✅ Policy change ${changeId} rejected`);
        return true;
      } catch (error) {
        console.warn('⚠️  Failed to reject policy change:', error.message);
        throw error;
      }
    } else {
      throw new Error('Memory storage not implemented for policy changes');
    }
  }

  /**
   * 获取策略变更历史
   */
  async getPolicyChanges(policyId, options = {}) {
    await this.ensureInitialized();

    const { limit = 50, offset = 0 } = options;

    if (this.usePersistentStorage) {
      try {
        const changes = await this.db.query(
          'SELECT * FROM policy_changes WHERE policy_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [policyId, limit, offset]
        );
        return changes;
      } catch (error) {
        console.warn('⚠️  Failed to get policy changes:', error.message);
        return [];
      }
    } else {
      return [];
    }
  }

  /**
   * 记录策略变更
   */
  async recordPolicyChange(policyId, changeType, previousContent, newContent, reason) {
    if (!this.usePersistentStorage) {
      return;
    }

    try {
      const changeId = `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const changeRecord = {
        id: changeId,
        policy_id: policyId,
        change_type: changeType,
        previous_content: previousContent,
        new_content: newContent,
        reason,
        status: 'applied', // 直接应用的变更（非审批流程）
        created_at: Date.now(),
        applied_at: Date.now()
      };

      await this.db.insert('policy_changes', changeRecord);
    } catch (error) {
      console.warn('⚠️  Failed to record policy change:', error.message);
    }
  }

  /**
   * 搜索策略
   */
  async searchPolicies(query, options = {}) {
    await this.ensureInitialized();

    const { limit = 50 } = options;

    if (this.usePersistentStorage) {
      try {
        const policies = await this.db.query(
          'SELECT * FROM policies WHERE (name LIKE ? OR content LIKE ?) AND is_active = ? LIMIT ?',
          [`%${query}%`, `%${query}%`, 1, limit]
        );
        return policies;
      } catch (error) {
        console.warn('⚠️  Failed to search policies:', error.message);
        return [];
      }
    } else {
      return [];
    }
  }

  /**
   * 获取策略统计信息
   */
  async getStats() {
    await this.ensureInitialized();

    if (this.usePersistentStorage) {
      try {
        const total = await this.db.count('policies');
        const active = await this.db.count('policies', 'is_active = ?', [1]);
        const changes = await this.db.count('policy_changes');

        const changeStats = await this.db.query(
          'SELECT change_type, status, COUNT(*) as count FROM policy_changes GROUP BY change_type, status'
        );

        return {
          total,
          active,
          inactive: total - active,
          changes,
          changeStats: changeStats.reduce((acc, stat) => {
            const key = `${stat.change_type}_${stat.status}`;
            acc[key] = stat.count;
            return acc;
          }, {})
        };
      } catch (error) {
        console.warn('⚠️  Failed to get policy stats:', error.message);
        return { total: 0, active: 0, inactive: 0, changes: 0, changeStats: {} };
      }
    } else {
      return { total: 0, active: 0, inactive: 0, changes: 0, changeStats: {} };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      await this.ensureInitialized();
      
      if (this.usePersistentStorage) {
        const policyCount = await this.db.count('policies');
        const changeCount = await this.db.count('policy_changes');
        
        return {
          healthy: true,
          storage: 'database',
          policyCount,
          changeCount
        };
      } else {
        return {
          healthy: true,
          storage: 'memory',
          policyCount: 0,
          changeCount: 0
        };
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        storage: this.usePersistentStorage ? 'database (error)' : 'memory'
      };
    }
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('✅ PersistentPolicyManager closed');
    }
  }
}

module.exports = PersistentPolicyManager;