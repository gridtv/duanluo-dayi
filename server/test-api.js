const axios = require('axios');
axios.post('http://localhost:3000/api/summarize-text', {
  text: '人工智能是当今科技发展的前沿领域。机器学习是人工智能的核心技术之一。深度学习在图像识别、自然语言处理等领域取得了突破性进展。',
  prompt: '请提炼出核心要点'
}).then(res => {
  console.log('Success:', JSON.stringify(res.data, null, 2));
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.response ? err.response.data : err.message);
  process.exit(1);
});