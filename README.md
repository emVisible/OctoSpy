# 简介
基于Node Crawlee(Playwright)的github repo爬虫, 根据repo published history作为依据
速度约为每秒一条

- 数据爬取: 指定内容 爬取对应日期的repo信息
- 数据调和:
  - 去重: 根据repo和update获取仓库最新一次的记录
  - 统一: 将update的相对时间转为绝对时间

具体地日期处理分为这几个步骤 (基于英文, 输出时区为GMT+8)
- seconds ago -> 1分钟之内
- minutes ago -> 1小时之内
- hours ago -> 今天 && 24小时之内
- yesterday -> 昨天 && 24小时-48小时
- days ago -> 一个月内 && 超过两天
- on Feb 24 -> 在今年 && 超过一个月
- on Feb 25, 2024 -> 不在今年
## 依赖安装
```
pnpm i
```

初次安装需要额外安装环境
```
pnpm exec playwright install
```

## env配置
1. .env.example设置爬取所需信息

2. 将.env.example重命名为.env文件

## 运行
### 爬取
```
pnpm crawl
```

### 合并
将爬取到的结果转为单个json文件
```
pnpm merge
```

### 调和
将json文件的内容进行调和处理, 转为统一格式
```
pnpm reconcile
```

### 拆分
进行拆分, 用于AI数据清洗
```
pnpm padding
```

### 过滤
结合AI回答进行数据清洗, 这一步需要一个字符串数组, 值是AI检查后确认重复或者无效的repo值
```
pnpm filter
```