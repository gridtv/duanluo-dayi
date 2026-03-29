const axios = require('axios');

async function testAPI() {
  try {
    console.log('正在测试通义千问 API...');
    const resp = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: 'qwen-plus',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      },
      {
        headers: {
          'Authorization': 'Bearer sk-e8dfc2b2b86a4f2e82dc707f1b0566d9',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    console.log('✅ API 调用成功!');
    console.log('Response:', JSON.stringify(resp.data, null, 2));
  } catch (err) {
    console.error('❌ API 调用失败!');
    if (err.response) {
      console.error('状态码:', err.response.status);
      console.error('响应数据:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('错误:', err.message);
    }
  }
}

testAPI();