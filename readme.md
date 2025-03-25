# 简介
基于Node Crawlee(Playwright)的github repo爬虫, 根据repo published history作为依据
速度约为每秒一条

## 依赖安装
```
pnpm i
```

## env配置
1. .env.example设置爬取所需信息
```
MCP_CRAWL_BASE_URL="https://github.com"
MCP_CRAWL_KEY_WORD="mcp"
MCP_GH_TOKEN=""
MCP_CRAWL_FROM="2025-03-24"
MCP_CRAWL_TO="2025-03-24"
```

2. 将.env.example重命名为.env文件

## 运行
运行命令后会执行crawl.ts,
数据会自动存放到项目根目录下的storage/datasets/default中
```
pnpm crawl
```