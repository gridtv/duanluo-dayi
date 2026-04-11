const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    historyList: []
  },

  onShow() {
    this.loadHistory();
  },

  loadHistory() {
    const history = app.getHistory();
    const list = history.map(item => ({
      ...item,
      icon: api.getFileTypeIcon(item.type),
      summaryPreview: item.summary ? item.summary.substring(0, 80) + (item.summary.length > 80 ? '...' : '') : ''
    }));
    this.setData({ historyList: list });
  },

  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/result/result?id=${id}`
    });
  },

  deleteItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
      confirmColor: '#7C6EE7',
      success: (res) => {
        if (res.confirm) {
          app.deleteHistory(id);
          this.loadHistory();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  clearAll() {
    wx.showModal({
      title: '清空历史',
      content: '确定要清空所有历史记录吗？',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('summary_history', []);
          this.loadHistory();
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
