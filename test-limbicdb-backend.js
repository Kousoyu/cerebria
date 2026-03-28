// test-limbicdb-backend.js
const { LimbicDBBackend } = require('./dist/memory/backends/LimbicDBBackend');

async function testLimbicDBBackend() {
  console.log('🧪 Testing LimbicDBBackend...');
  
  const backend = new LimbicDBBackend('./test-agent.limbic');
  
  try {
    // Test remember
    console.log('1. Remembering memory...');
    const memory = await backend.remember('This is a test memory from cogni-core', 'fact');
    console.log('✅ Remembered:', memory.content);
    
    // Test recall
    console.log('2. Recalling memory...');
    const result = await backend.recall('test');
    console.log('✅ Recalled:', result.memories.length, 'memories');
    console.log('   First memory:', result.memories[0]?.content);
    console.log('   Latency:', result.meta.latencyMs, 'ms');
    
    // Test with options
    console.log('3. Recalling with options...');
    const resultWithOptions = await backend.recall('test', { 
      limit: 1, 
      types: ['fact'] 
    });
    console.log('✅ Recalled with options:', resultWithOptions.memories.length, 'memories');
    
    // Test forget
    console.log('4. Forgetting memory...');
    if (result.memories.length > 0) {
      await backend.forget(result.memories[0].id);
      console.log('✅ Forgot memory');
    }
    
    // Test close
    console.log('5. Closing backend...');
    await backend.close();
    console.log('✅ Backend closed');
    
    console.log('\n🎉 LimbicDBBackend integration successful!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testLimbicDBBackend().catch(console.error);