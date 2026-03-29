/**
 * 段落大意之凝聚 - 后端服务
 * 处理文件上传、内容提取、调用大模型进行总结
 */
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { extractContent } = require('./extractor');
const { summarize } = require('./llm');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 文件上传配置
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * POST /api/summarize
 * 上传文件并总结
 */
app.post('/api/summarize', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ code: 1, message: '未收到文件' });
    }

    const { fileName, fileType, prompt } = req.body;
    console.log(`[总结请求] 文件: ${fileName}, 类型: ${fileType}`);

    // 1. 提取文件内容
    const content = await extractContent(req.file.path, fileName, fileType);

    if (!content || content.trim().length === 0) {
      return res.json({ code: 1, message: '无法从文件中提取有效内容' });
    }

    // 2. 调用大模型总结
    const result = await summarize(content, prompt);

    // 3. 清理临时文件
    fs.unlink(req.file.path, () => {});

    res.json({
      code: 0,
      data: result
    });

  } catch (err) {
    console.error('[总结失败]', err);
    // 清理临时文件
    if (req.file) fs.unlink(req.file.path, () => {});
    res.json({ code: 1, message: err.message || '总结失败' });
  }
});

/**
 * POST /api/summarize-text
 * 纯文本总结
 */
app.post('/api/summarize-text', async (req, res) => {
  try {
    const { text, prompt } = req.body;

    if (!text || text.trim().length === 0) {
      return res.json({ code: 1, message: '文本内容不能为空' });
    }

    console.log(`[文本总结] 长度: ${text.length}`);

    const result = await summarize(text, prompt);

    res.json({
      code: 0,
      data: result
    });

  } catch (err) {
    console.error('[文本总结失败]', err);
    res.json({ code: 1, message: err.message || '总结失败' });
  }
});

/**
 * GET /api/health
 * 健康检查
 */
app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: 'OK', provider: process.env.LLM_PROVIDER });
});

app.listen(PORT, () => {
  console.log(`[段落大意之凝聚] 服务已启动，端口: ${PORT}`);
  console.log(`[大模型] 使用: ${process.env.LLM_PROVIDER || '未配置'}`);
});
