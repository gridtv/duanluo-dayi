const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    selectedFile: null,
    fileIcon: '',
    fileTypeLabel: '',
    fileSize: '',
    fileType: '',
    inputText: '',
    promptText: '',
    activePreset: -1,
    presetPrompts: [
      { label: '提炼要点', value: '请提炼出核心要点，以条目形式列出' },
      { label: '总结结论', value: '请总结主要结论和关键发现' },
      { label: '生成摘要', value: '请生成一段简明扼要的摘要，不超过 200 字' },
      { label: '分析观点', value: '请分析其中的主要观点和论据，并给出评价' },
      { label: '会议纪要', value: '请将内容整理为会议纪要格式，包括议题、讨论内容和决议' },
      { label: '学习笔记', value: '请将内容整理为学习笔记，包括知识点和重点标注' }
    ],
    isLoading: false,
    canSubmit: false
  },

  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        this.handleFileSelected(res.tempFiles[0]);
      }
    });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles[0];
        this.handleFileSelected({
          path: file.tempFilePath,
          name: '拍摄/选取的图片.jpg',
          size: file.size,
          type: 'image'
        });
      }
    });
  },

  chooseDocument() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'md'],
      success: (res) => {
        this.handleFileSelected(res.tempFiles[0]);
      }
    });
  },

  handleFileSelected(file) {
    const fileName = file.name || '未命名文件';
    const fileType = file.type || api.getFileType(fileName);
    const fileSize = this.formatFileSize(file.size);
    this.setData({
      selectedFile: {
        path: file.path || file.tempFilePath,
        name: fileName,
        size: file.size
      },
      fileType: fileType,
      fileIcon: api.getFileTypeIcon(fileType),
      fileTypeLabel: api.getFileTypeLabel(fileType),
      fileSize: fileSize,
      canSubmit: true
    });
  },

  removeFile() {
    this.setData({
      selectedFile: null,
      fileIcon: '',
      fileTypeLabel: '',
      fileSize: '',
      fileType: '',
      canSubmit: !!this.data.inputText.trim()
    });
  },

  onTextInput(e) {
    const text = e.detail.value;
    this.setData({
      inputText: text,
      canSubmit: !!text.trim() || !!this.data.selectedFile
    });
  },

  onPromptInput(e) {
    this.setData({
      promptText: e.detail.value,
      activePreset: -1
    });
  },

  selectPreset(e) {
    const index = e.currentTarget.dataset.index;
    const prompt = this.data.presetPrompts[index];
    this.setData({
      promptText: prompt.value,
      activePreset: index
    });
  },

  async startSummarize() {
    const hasFile = !!this.data.selectedFile;
    const hasText = this.data.inputText && this.data.inputText.trim().length > 0;
    
    if (!hasFile && !hasText) {
      wx.showToast({ title: '请选择文件或输入文本', icon: 'none' });
      return;
    }
    if (!this.data.canSubmit || this.data.isLoading) return;

    this.setData({ isLoading: true });

    try {
      let result;
      if (this.data.selectedFile) {
        result = await api.uploadAndSummarize(
          this.data.selectedFile.path,
          this.data.selectedFile.name,
          this.data.fileType,
          this.data.promptText
        );
      } else if (this.data.inputText.trim()) {
        result = await api.summarizeText(
          this.data.inputText,
          this.data.promptText
        );
      }

      const summaryText = (typeof result === 'string') ? result : (result.summary || '');

      app.addHistory({
        title: this.data.selectedFile ? this.data.selectedFile.name : this.data.inputText.substring(0, 50) + '...',
        type: this.data.selectedFile ? this.data.fileType : 'text',
        typeLabel: this.data.selectedFile ? this.data.fileTypeLabel : '文本',
        prompt: this.data.promptText,
        summary: summaryText,
        keyPoints: [],
        conclusion: ''
      });

      wx.navigateTo({
        url: `/pages/result/result?id=${app.getHistory()[0].id}`
      });

    } catch (err) {
      wx.showToast({
        title: err.message || '总结失败，请重试',
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
});