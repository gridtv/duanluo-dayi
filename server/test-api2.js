const axios = require('axios');
axios.post('http://localhost:3000/api/summarize-text', {
  text: '人工智能是当今科技发展的前沿领域，它正在改变我们的生活方式。',
  prompt: '请提炼出核心要点'
}).then(res => {
  console.log('✅ Success:', JSON.stringify(res.data, null, 2));
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  process.exit(1);
});