# Daily Paper Reader

个人每日论文推荐与阅读器。  
基于 [ziwenhahaha/daily-paper-reader](https://github.com/ziwenhahaha/daily-paper-reader) fork。

## 能做什么

- 按订阅自动抓取、推荐 arXiv / 会议论文
- 侧边栏阅读、收藏、未读管理
- 论文页 AI 问答（可停止 / 编辑重问）
- GitHub Actions + Pages，无需自建服务器

## 快速开始

1. Fork 本仓库  
2. 开启 Actions 与 GitHub Pages（`main` / `/(root)`）  
3. 打开站点，按引导配置 LLM API Key 与 GitHub PAT  

站点示例：`https://<你的用户名>.github.io/daily-paper-reader`

## News

- **2026-08-10** 收藏夹改到侧栏展示；读论文 AI 支持停止与编辑重问；中文总结附带专业名词英文；支持 OpenAI 兼容 API。

## 本地调试

```bash
scripts/bootstrap_local.sh
```

然后访问 `http://127.0.0.1:8567`。

## 致谢

上游项目：[Daily Paper Reader](https://github.com/ziwenhahaha/daily-paper-reader)
