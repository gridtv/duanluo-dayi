# 段落大意之凝聚 - 微信小程序后端

## 项目说明
微信小程序"段落大意之凝聚"的服务端，基于 Express + 阿里云通义千问大模型。

## 支持功能
- 文本摘要分析（/api/summarize-text）
- 文件上传分析（/api/summarize-file）支持 txt/docx/pdf/xlsx/csv/json/md
- 图片识别分析（/api/summarize-image）支持 jpg/png/gif/webp
- 健康检查（/api/health）

## 部署
npm install
设置环境变量 DASHSCOPE_API_KEY
node app.js

## 技术栈
- Node.js + Express
- 阿里云通义千问 qwen3.5-plus
- Multer 文件上传
- PM2 进程管理
