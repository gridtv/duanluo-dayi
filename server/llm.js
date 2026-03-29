/**
 * 大模型调用模块
 * 支持通义千问、智谱ChatGLM、百度文心
 */
const axios = require('axios');

const PROVIDER = process.env.LLM_PROVIDER || 'qwen';

/**
 * 调用大模型进行总结
 * @param {string} content - 要总结的内容
 * @param {string} userPrompt - 用户自定义提示词
 * @returns {Promise<{summary, keyPoints, conclusion}>}
 */
async function summarize(content, userPrompt) {
  const systemPrompt = buildSystemPrompt(userPrompt);

  // 判断是否为图片内容
  const isImage = content.startsWith('__IMAGE__:');

  let rawResult;

  switch (PROVIDER) {
    case 'qwen':
      rawResult = await callQwen(systemPrompt, content, isImage);
      break;
    case 'zhipu':
      rawResult = await callZhipu(systemPrompt, content, isImage);
      break;
    case 'ernie':
      rawResult = await callErnie(systemPrompt, content);
      break;
    default:
      throw new Error(`不支持的大模型: ${PROVIDER}`);
  }

  // 解析结构化结果
  return parseResult(rawResult);
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(userPrompt) {
  let prompt = `你是一个专业的内容分析助手。你的任务是对用户提供的内容进行分析和总结。

请严格按照以下JSON格式返回结果（不要包含任何其他文字）：
{
  "keyPoints": ["要点1", "要点2", "要点3"],
  "summary": "一段完整的内容摘要",
  "conclusion": "基于内容得出的结论"
}

要求：
- keyPoints: 提炼3-7个核心要点，每个要点一句话概括
- summary: 200-500字的完整摘要，涵盖主要信息
- conclusion: 简明的结论或核心观点`;

  if (userPrompt && userPrompt.trim()) {
    prompt += `\n\n用户的额外要求：${userPrompt}`;
  }

  return prompt;
}

/**
 * 调用通义千问
 */
async function callQwen(systemPrompt, content, isImage) {
  const apiKey = process.env.QWEN_API_KEY;
  const model = process.env.QWEN_MODEL || 'qwen-plus';

  if (!apiKey) throw new Error('未配置 QWEN_API_KEY');

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  if (isImage) {
    const imageData = content.replace('__IMAGE__:', '');
    // 使用 qwen-vl 视觉模型
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageData } },
        { type: 'text', text: '请分析并总结这张图片的内容。' }
      ]
    });

    const resp = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: 'qwen-vl-plus',
        messages: messages
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    return resp.data.choices[0].message.content;

  } else {
    messages.push({ role: 'user', content: content });

    const resp = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: model,
        messages: messages
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    return resp.data.choices[0].message.content;
  }
}

/**
 * 调用智谱 ChatGLM
 */
async function callZhipu(systemPrompt, content, isImage) {
  const apiKey = process.env.ZHIPU_API_KEY;
  const model = process.env.ZHIPU_MODEL || 'glm-4';

  if (!apiKey) throw new Error('未配置 ZHIPU_API_KEY');

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  if (isImage) {
    const imageData = content.replace('__IMAGE__:', '');
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageData } },
        { type: 'text', text: '请分析并总结这张图片的内容。' }
      ]
    });

    const resp = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      { model: 'glm-4v', messages },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    return resp.data.choices[0].message.content;

  } else {
    messages.push({ role: 'user', content: content });

    const resp = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      { model, messages },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    return resp.data.choices[0].message.content;
  }
}

/**
 * 调用百度文心一言
 */
async function callErnie(systemPrompt, content) {
  const apiKey = process.env.ERNIE_API_KEY;
  const secretKey = process.env.ERNIE_SECRET_KEY;

  if (!apiKey || !secretKey) throw new Error('未配置 ERNIE_API_KEY / ERNIE_SECRET_KEY');

  // 1. 获取 access_token
  const tokenResp = await axios.post(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  );
  const accessToken = tokenResp.data.access_token;

  // 2. 调用文心
  const resp = await axios.post(
    `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-4.0-8k-latest?access_token=${accessToken}`,
    {
      messages: [
        { role: 'user', content: `${systemPrompt}\n\n以下是需要总结的内容：\n${content}` }
      ]
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    }
  );

  return resp.data.result;
}

/**
 * 解析大模型返回的结果
 */
function parseResult(rawText) {
  try {
    // 尝试直接解析 JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || rawText,
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        conclusion: parsed.conclusion || ''
      };
    }
  } catch (e) {
    // JSON 解析失败，回退到纯文本模式
    console.warn('[解析] JSON解析失败，使用纯文本模式');
  }

  // 回退：将整个文本作为摘要
  return {
    summary: rawText,
    keyPoints: [],
    conclusion: ''
  };
}

module.exports = { summarize };
