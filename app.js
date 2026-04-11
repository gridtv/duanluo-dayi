require("dotenv").config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { marked } = require('marked');
const fs = require('fs');

const app = express();
const PORT = 3000;
const API_KEY = process.env.DASHSCOPE_API_KEY;
const API_BASE = 'https://coding.dashscope.aliyuncs.com/v1';
const TEXT_MODEL = 'qwen3.5-plus';
const VISION_MODEL = 'qwen3.5-plus';

if (!API_KEY) {
  console.error('❌ 请设置环境变量 DASHSCOPE_API_KEY');
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const SYSTEM_PROMPT = `你是专业语文教学助手"段落大意之凝聚"。对给定文本进行深度分析，输出必须包含以下三个部分，每个部分都要充实、具体：

## 分析要求
1. **段落大意**：用1-2句话概括本段的核心内容，不能只是抄原文，要有归纳提炼
2. **核心要点**：列出3-6个关键要点，每个要点用"要点+说明"的形式，具体且有深度
3. **写作手法**：分析作者使用的修辞手法、表达方式、写作技巧（如比喻、拟人、排比、动静结合、虚实结合等）

注意：必须完整输出以上三个部分，每个部分都要充分展开，不要省略。用中文回答。`;
async function callAPI(messages, model, retries = 2) {
  const url = API_BASE + '/chat/completions';
  const body = JSON.stringify({
    model: model || TEXT_MODEL,
    messages,
    enable_thinking: false,
    max_tokens: 3072,
    temperature: 0.3,
  });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000);
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + API_KEY,
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) {
        const errText = await resp.text();
        var errMsg;
        try { errMsg = JSON.parse(errText).error?.message; } catch(e) { errMsg = errText; }
        throw new Error('API ' + resp.status + ': ' + (errMsg || '未知错误'));
      }

      const data = await resp.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('API 返回内容为空');
      return content;
    } catch (err) {
      console.error('[API] 第' + (attempt + 1) + '次尝试失败:', err.message);
      if (attempt === retries) throw err;
      await new Promise(function(r) { setTimeout(r, 2000); });
    }
  }
}

async function extractText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  try {
    switch (ext) {
      case '.txt': case '.md': case '.csv': case '.log':
      case '.json': case '.js': case '.py': case '.html':
      case '.css': case '.xml':
        return fs.readFileSync(filePath, 'utf-8');
      case '.docx': {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
      }
      case '.pdf': {
        const pdfParse = require('pdf-parse');
        const buf = fs.readFileSync(filePath);
        const data = await pdfParse(buf);
        return data.text;
      }
      case '.xlsx': case '.xls': {
        const XLSX = require('xlsx');
        const wb = XLSX.readFile(filePath);
        var text = '';
        for (var i = 0; i < wb.SheetNames.length; i++) {
          text += '\n--- Sheet: ' + wb.SheetNames[i] + ' ---\n';
          text += XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[i]]);
        }
        return text;
      }
      default:
        return '[不支持的文件格式: ' + ext + '，文件名: ' + originalName + ']';
    }
  } catch (err) {
    console.error('[Extract] 提取 ' + originalName + ' 失败:', err.message);
    return '[文件内容提取失败: ' + err.message + ']';
  }
}

function cleanup(filePath) {
  try { fs.unlinkSync(filePath); } catch(e) {}
}

app.post('/api/summarize-text', async function(req, res) {
  try {
    const text = req.body.text;
    if (!text || !text.trim()) return res.status(400).json({ error: '请输入文本内容' });

    const result = await callAPI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: '请对以下文本进行深度分析：\n\n' + text.trim() },
    ]);
    res.json({ success: true, result: marked(result) });
  } catch (err) {
    console.error('[summarize]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/summarize-file', upload.single('file'), async function(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });

    const filePath = req.file.path;
    const originalname = req.file.originalname;
    const content = await extractText(filePath, originalname);

    if (!content || content.trim().length === 0) {
      cleanup(filePath);
      return res.status(400).json({ error: '文件内容为空或无法提取文本' });
    }

    const truncated = content.length > 30000
      ? content.substring(0, 30000) + '\n...(内容已截断)'
      : content;

    const result = await callAPI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: '请对以下文件内容进行深度分析（文件名：' + originalname + '）：\n\n' + truncated },
    ]);

    cleanup(filePath);
    res.json({ success: true, result: marked(result) });
  } catch (err) {
    console.error('[summarize-file]', err);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/summarize-image', upload.single('image'), async function(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传图片' });

    const filePath = req.file.path;
    const mimetype = req.file.mimetype;
    const buf = fs.readFileSync(filePath);

    if (buf.length > 10 * 1024 * 1024) {
      cleanup(filePath);
      return res.status(400).json({ error: '图片文件过大，请压缩到10MB以内' });
    }

    const b64 = buf.toString('base64');
    const result = await callAPI([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: 'data:' + mimetype + ';base64,' + b64 } },
          { type: 'text', text: '请先详细描述图片内容（画面主体、场景、色彩、构图等），如图中有文字也一并识别。如果图中有值得分析的完整文字（如文章、段落、通知等），则对文字进行深度分析（段落大意、核心要点、写作手法）；如果只是水印、标语等简短标注文字，则重点分析图片画面本身。' },
        ],
      },
    ], VISION_MODEL);

    cleanup(filePath);
    res.json({ success: true, result: marked(result) });
  } catch (err) {
    console.error('[summarize-image]', err);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', function(req, res) {
  res.json({ status: 'ok', service: '段落大意之凝聚-小程序后端', time: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', function() {
  console.log('✅ 段落大意之凝聚 - 小程序后端启动: http://0.0.0.0:' + PORT);
  console.log('📄 支持格式: txt/docx/pdf/xlsx/csv/json/md');
  console.log('🖼️  图片识别: jpg/png/gif/webp');
});
