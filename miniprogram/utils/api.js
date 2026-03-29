/**
 * API 工具模块
 * 封装与后端服务器的通信
 */
const app = getApp();

/**
 * 上传文件并获取总结
 * @param {string} filePath - 本地文件路径
 * @param {string} fileName - 文件名
 * @param {string} fileType - 文件类型：document|image
 * @param {string} prompt - 用户自定义提示词
 * @returns {Promise}
 */
function uploadAndSummarize(filePath, fileName, fileType, prompt) {
  return new Promise((resolve, reject) => {
    const baseUrl = app.globalData.baseUrl;

    wx.uploadFile({
      url: `${baseUrl}/api/summarize`,
      filePath: filePath,
      name: 'file',
      formData: {
        fileName: fileName,
        fileType: fileType,
        prompt: prompt || '请帮我总结这个内容的要点和结论'
      },
      header: {
        'Accept': 'application/json'
      },
      success(res) {
        try {
          const data = JSON.parse(res.data);
          if (data.code === 0) {
            resolve(data.data);
          } else {
            reject(new Error(data.message || '总结失败'));
          }
        } catch (e) {
          reject(new Error('服务器返回数据格式错误'));
        }
      },
      fail(err) {
        reject(new Error('网络请求失败：' + (err.errMsg || '未知错误')));
      }
    });
  });
}

/**
 * 纯文本总结（不上传文件）
 * @param {string} text - 要总结的文本
 * @param {string} prompt - 用户自定义提示词
 * @returns {Promise}
 */
function summarizeText(text, prompt) {
  return new Promise((resolve, reject) => {
    const baseUrl = app.globalData.baseUrl;

    wx.request({
      url: `${baseUrl}/api/summarize-text`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        text: text,
        prompt: prompt || '请帮我总结这段文字的要点和结论'
      },
      success(res) {
        if (res.data && res.data.code === 0) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data?.message || '总结失败'));
        }
      },
      fail(err) {
        reject(new Error('网络请求失败：' + (err.errMsg || '未知错误')));
      }
    });
  });
}

/**
 * 根据文件扩展名判断文件类型
 */
function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'md'];
  const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

  if (docExts.includes(ext)) return 'document';
  if (imgExts.includes(ext)) return 'image';
  return 'document'; // 默认当文档处理
}

/**
 * 获取文件类型的中文标识
 */
function getFileTypeLabel(fileType) {
  const labels = {
    document: '文档',
    image: '图片'
  };
  return labels[fileType] || '文件';
}

/**
 * 获取文件类型的图标名
 */
function getFileTypeIcon(fileType) {
  const icons = {
    document: '📄',
    image: '🖼️'
  };
  return icons[fileType] || '📎';
}

module.exports = {
  uploadAndSummarize,
  summarizeText,
  getFileType,
  getFileTypeLabel,
  getFileTypeIcon
};