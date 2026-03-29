const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    record: null,
    typeIcon: '',
    summary: ''
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      const history = app.getHistory();
      const record = history.find(item => item.id === id);
      if (record) {
        this.setData({
          record: record,
          typeIcon: api.getFileTypeIcon(record.type),
          summary: record.summary || ''
        });
      }
    }
  },

  goBack() {
    wx.navigateBack();
  },

  copyResult() {
    const summary = this.data.summary;
    if (!summary) return;

    wx.setClipboardData({
      data: summary,
      success() {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
      }
    });
  },

  shareResult() {
    this.copyResult();
  },

  newSummary() {
    wx.navigateBack();
  },

  onShareAppMessage() {
    return {
      title: '段落大意之凝聚 - 智能总结工具',
      path: '/pages/index/index'
    };
  }
});