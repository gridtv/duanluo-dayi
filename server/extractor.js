/**
 * 文件内容提取模块
 * 根据文件类型提取文本内容
 */
const fs = require('fs');
const path = require('path');

/**
 * 根据文件类型提取内容
 * @param {string} filePath - 文件路径
 * @param {string} fileName - 原始文件名
 * @param {string} fileType - 文件类型
 * @returns {Promise<string>} 提取的文本内容
 */
async function extractContent(filePath, fileName, fileType) {
  const ext = fileName.split('.').pop().toLowerCase();

  switch (fileType) {
    case 'document':
      return extractDocument(filePath, ext);
    case 'image':
      return extractImage(filePath);
    default:
      return extractDocument(filePath, ext);
  }
}

/**
 * 提取文档内容
 */
async function extractDocument(filePath, ext) {
  switch (ext) {
    case 'txt':
    case 'md':
    case 'csv': {
      return fs.readFileSync(filePath, 'utf-8');
    }

    case 'pdf': {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    }

    case 'doc':
    case 'docx': {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    case 'xls':
    case 'xlsx': {
      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(filePath);
      let text = '';
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        text += `[${sheetName}]\n`;
        text += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
      });
      return text;
    }

    case 'ppt':
    case 'pptx': {
      // PPT提取需要额外处理，这里先返回提示
      return '[PPT文件] 请使用其他格式上传，或将内容复制为文本。';
    }

    default:
      // 尝试作为文本读取
      try {
        return fs.readFileSync(filePath, 'utf-8');
      } catch {
        throw new Error(`不支持的文件格式: .${ext}`);
      }
  }
}

/**
 * 提取图片内容（通过大模型的视觉能力）
 * 返回 base64 编码，供大模型直接识别
 */
async function extractImage(filePath) {
  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(filePath).replace('.', '') || 'png';
  const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  // 返回特殊标记，让 LLM 模块知道这是图片
  return `__IMAGE__:data:${mimeType};base64,${base64}`;
}

module.exports = { extractContent };
