App({
  globalData: {
        baseUrl: 'https://api.duanluodayi.cn',
    userInfo: null
  },

  onLaunch() {
    const history = wx.getStorageSync('summary_history');
    if (!history) {
      wx.setStorageSync('summary_history', []);
    }
  },

  addHistory(record) {
    const history = wx.getStorageSync('summary_history') || [];
    record.id = Date.now().toString();
    record.createTime = new Date().toLocaleString('zh-CN');
    history.unshift(record);
    if (history.length > 50) history.pop();
    wx.setStorageSync('summary_history', history);
  },

  getHistory() {
    return wx.getStorageSync('summary_history') || [];
  },

  deleteHistory(id) {
    let history = wx.getStorageSync('summary_history') || [];
    history = history.filter(item => item.id !== id);
    wx.setStorageSync('summary_history', history);
  }
});