const fs = require('fs');
let text = fs.readFileSync('src/index.ts', 'utf8');
if (!text.includes('MCPRegistry')) {
  text = text.replace("import Scheduler  from './scheduler';", "import Scheduler  from './scheduler';\nimport { MCPRegistry } from './mcp/MCPRegistry';");
  text = text.replace("this.scheduler = new Scheduler(config);", "this.scheduler = new Scheduler(config);\n    this.mcpRegistry = new MCPRegistry();");
  fs.writeFileSync('src/index.ts', text);
}
