# 🚀 部署指南

PT-Gen-Refactor 提供多种部署方式，选择最适合您的方式快速部署到 Cloudflare Workers。

## 📋 部署方式对比

| 方式 | 难度 | 时间 | 适用场景 |
|------|------|------|----------|
| [一键部署按钮](#一键部署按钮) | ⭐ | 2分钟 | 新用户、快速体验 |
| [本地自动部署](#本地自动部署) | ⭐⭐ | 5分钟 | 个人使用、自定义配置 |
| [GitHub Actions](#github-actions-部署) | ⭐⭐⭐ | 10分钟 | 团队开发、CI/CD |
| [手动部署](#手动部署) | ⭐⭐⭐⭐ | 15分钟 | 高级用户、完全控制 |

## 🎯 一键部署按钮

**最简单的部署方式** - 点击按钮即可完成部署。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/rabbitwit/PT-Gen-Refactor)

### 步骤说明

1. **点击部署按钮** - 系统会自动 fork 项目
2. **连接 Cloudflare** - 授权访问您的 Cloudflare 账户
3. **配置项目** - 设置 Worker 名称和环境变量
4. **自动部署** - 系统自动构建和部署
5. **获取地址** - 部署完成后获得访问链接

### 注意事项

- 需要 Cloudflare 账户（免费即可）
- 部署后可在 Cloudflare 控制台管理
- 默认使用基本配置，可后续自定义

## 🖥️ 本地自动部署

**推荐方式** - 支持交互式配置，适合个人使用。

### 前置要求

- Node.js 16+ 
- npm
- Git（可选）

### 部署命令

```bash
# 克隆项目
git clone https://github.com/rabbitwit/PT-Gen-Refactor.git
cd PT-Gen-Refactor

# 选择一种方式部署

# 方式1：交互式自动部署（推荐）
chmod +x deploy.sh && ./deploy.sh          # Linux/macOS
# 或
.\deploy.ps1                                # Windows
# 或  
npm run deploy:auto                         # 跨平台

# 方式2：快速部署
chmod +x quick-deploy.sh && ./quick-deploy.sh

# 方式3：分步部署
npm run install:all                         # 安装依赖
npm run build:frontend                      # 构建前端
npm run deploy                              # 部署
```

### 配置选项

部署脚本支持配置以下选项：

| 配置项 | 说明 | 必需 |
|--------|------|------|
| Worker 名称 | Cloudflare Worker 的名称 | 否 |
| 作者信息 | 显示在应用中的作者名 | 否 |
| TMDB API Key | 用于电影数据查询 | 否* |
| 豆瓣 Cookie | 获取更多豆瓣信息 | 否 |
| API Key | 保护 API 访问 | 否 |
| 缓存配置 | R2 或 D1 缓存设置 | 否 |

*注：使用中文搜索功能需要 TMDB API Key

### 部署流程

1. **环境检查** - 自动检测 Node.js、npm、Wrangler
2. **认证验证** - 检查 Cloudflare 登录状态
3. **交互配置** - 引导设置各项参数
4. **依赖安装** - 自动安装所需依赖
5. **应用构建** - 构建前端和后端
6. **自动部署** - 部署到 Cloudflare Workers
7. **结果展示** - 显示访问地址和配置信息

## 🔄 GitHub Actions 部署

**最佳实践** - 适合团队开发和持续部署。

### 设置步骤

1. **Fork 项目**
   ```bash
   # 在 GitHub 上 Fork 项目
   # 然后克隆到本地
   git clone https://github.com/YOUR_USERNAME/PT-Gen-Refactor.git
   ```

2. **配置 Secrets**
   
   在 GitHub 项目的 `Settings > Secrets and variables > Actions` 中添加：

   | Secret 名称 | 说明 | 获取方式 |
   |-------------|------|----------|
   | `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | [API Tokens 页面](https://dash.cloudflare.com/profile/api-tokens) |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | [右侧边栏](https://dash.cloudflare.com/) |
   | `TMDB_API_KEY` | TMDB API Key（可选） | [TMDB Settings](https://www.themoviedb.org/settings/api) |
   | `DOUBAN_COOKIE` | 豆瓣 Cookie（可选） | 浏览器开发者工具 |
   | `API_KEY` | 安全 API Key（可选） | 自定义字符串 |

3. **触发部署**
   
   **自动触发**：推送代码到 `main` 分支
   ```bash
   git push origin main
   ```
   
   **手动触发**：在 Actions 页面点击 "Run workflow"

### Cloudflare API Token 配置

创建自定义 API Token，需要以下权限：

```
Zone:Zone:Read
Zone:Zone Settings:Edit
User:User Details:Read
Account:Cloudflare Workers:Edit
Account:Account Settings:Read
```

### 工作流特性

- ✅ 自动构建前端和后端
- ✅ 智能缓存依赖
- ✅ 多环境支持（生产/测试）
- ✅ 部署状态通知
- ✅ 构建产物管理

## ⚙️ 手动部署

**完全控制** - 适合高级用户和自定义需求。

### 详细步骤

1. **环境准备**
   ```bash
   # 安装 Node.js 16+
   node --version
   npm --version
   
   # 安装 Wrangler CLI
   npm install -g wrangler
   
   # 登录 Cloudflare
   wrangler login
   ```

2. **项目设置**
   ```bash
   # 克隆项目
   git clone https://github.com/rabbitwit/PT-Gen-Refactor.git
   cd PT-Gen-Refactor
   
   # 安装依赖
   npm install
   cd worker && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

3. **配置文件**
   
   编辑 `wrangler.toml`：
   ```toml
   name = "your-worker-name"
   main = "worker/index.js"
   compatibility_date = "2025-01-15"
   
   [assets]
   directory = "./frontend/dist"
   binding = "ASSETS"
   
   [vars]
   AUTHOR = "Your Name"
   TMDB_API_KEY = "your_tmdb_api_key"
   ```

4. **构建应用**
   ```bash
   # 构建前端
   cd frontend
   npm run build
   cd ..
   ```

5. **部署 Worker**
   ```bash
   # 部署到 Cloudflare
   cd worker
   wrangler deploy
   cd ..
   ```

### 高级配置

**R2 缓存设置**
```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "pt-gen-cache"
```

**D1 数据库设置**
```toml
[[d1_databases]]
binding = "DB"
database_name = "pt-gen-cache" 
database_id = "your-database-id"
```

**D1 表结构初始化**
```sql
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
```

## 🔧 环境变量详解

### 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `CLOUDFLARE_API_TOKEN` | 部署权限 | `abc123...` |
| `CLOUDFLARE_ACCOUNT_ID` | 账户标识 | `def456...` |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AUTHOR` | 作者信息 | `Hares` |
| `TMDB_API_KEY` | TMDB API 密钥 | 空 |
| `DOUBAN_COOKIE` | 豆瓣认证 | 空 |
| `API_KEY` | API 保护密钥 | 空 |

### 获取 TMDB API Key

1. 注册 [TMDB 账户](https://www.themoviedb.org/signup)
2. 前往 [API 设置页面](https://www.themoviedb.org/settings/api)
3. 申请 API Key（免费）
4. 复制 API Key 到配置中

### 获取豆瓣 Cookie

1. 登录豆瓣网站
2. 打开浏览器开发者工具（F12）
3. 前往 Network 标签
4. 刷新页面，找到豆瓣请求
5. 复制 Cookie 头部内容

## 🐛 故障排除

### 常见问题

**1. Wrangler 认证失败**
```bash
# 解决方案
wrangler logout
wrangler login
```

**2. 前端构建失败**
```bash
# 清理缓存重试
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**3. 部署权限错误**
- 检查 API Token 权限设置
- 确认 Account ID 正确
- 验证 Token 未过期

**4. 访问 404 错误**
- 确认前端已正确构建
- 检查 `wrangler.toml` 中的 assets 配置
- 验证部署是否成功

**5. 功能异常**
- 检查环境变量配置
- 查看 Worker 运行日志：`wrangler tail`
- 确认 API Key 等配置正确

### 日志查看

```bash
# 查看实时日志
cd worker
wrangler tail

# 查看部署历史
wrangler deployments list

# 查看 Worker 信息
wrangler status
```

### 性能优化

**缓存配置**
- 优先使用 R2 存储（成本更低）
- D1 适合复杂查询场景
- 设置合理的缓存过期时间

**请求优化**  
- 配置 API Key 防止滥用
- 设置合理的频率限制
- 使用 CDN 加速静态资源

## 📞 获取帮助

- **项目文档**：[GitHub Wiki](https://github.com/rabbitwit/PT-Gen-Refactor/wiki)
- **问题反馈**：[GitHub Issues](https://github.com/rabbitwit/PT-Gen-Refactor/issues)
- **功能建议**：[GitHub Discussions](https://github.com/rabbitwit/PT-Gen-Refactor/discussions)
- **官方文档**：[Cloudflare Workers](https://developers.cloudflare.com/workers/)

## 🎉 部署成功

部署完成后，您将获得：

- ✅ 完全可用的 PT 资源描述生成器
- ✅ 支持多平台数据抓取
- ✅ 现代化的 Web 界面
- ✅ 自动化的缓存机制
- ✅ 全球 CDN 加速访问

立即开始使用您的 PT-Gen-Refactor 实例！