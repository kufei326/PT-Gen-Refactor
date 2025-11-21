# 一键部署按钮配置

## Deploy to Cloudflare Workers 按钮

将以下按钮添加到 README.md 中，用户点击后可直接部署：

### 标准部署按钮

```markdown
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/rabbitwit/PT-Gen-Refactor)
```

### 带预配置的部署按钮

```markdown
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/rabbitwit/PT-Gen-Refactor&autofill=1&fields=name,main,compatibility_date)
```

### 自定义样式按钮

```markdown
<a href="https://deploy.workers.cloudflare.com/?url=https://github.com/rabbitwit/PT-Gen-Refactor" target="_blank">
  <img src="https://img.shields.io/badge/Deploy%20to-Cloudflare%20Workers-orange?style=for-the-badge&logo=cloudflare" alt="Deploy to Cloudflare Workers">
</a>
```

### GitHub Actions 部署按钮

```markdown
[![Deploy](https://github.com/rabbitwit/PT-Gen-Refactor/actions/workflows/deploy.yml/badge.svg)](https://github.com/rabbitwit/PT-Gen-Refactor/actions/workflows/deploy.yml)
```

## 使用说明

### 快速开始

用户可以通过以下三种方式一键部署：

#### 1. 使用 Deploy 按钮（推荐）

点击上方的 "Deploy to Cloudflare Workers" 按钮，系统会：

- 自动 fork 项目到您的 GitHub 账户
- 创建 Cloudflare Workers 项目
- 自动配置基本设置
- 立即部署到 Workers

#### 2. GitHub Actions 自动部署

Fork 项目后，在 GitHub Settings > Secrets 中添加：

```
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
TMDB_API_KEY=your_tmdb_key (可选)
DOUBAN_COOKIE=your_douban_cookie (可选)
API_KEY=your_security_key (可选)
```

然后在 Actions 页面手动触发部署，或者推送代码自动触发。

#### 3. 本地一键部署

克隆项目后运行部署脚本：

**Linux/macOS:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Windows:**
```powershell
.\deploy.ps1
```

**Node.js:**
```bash
node deploy.js
```

## 部署配置

### 环境变量配置

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `CLOUDFLARE_API_TOKEN` | 是 | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | 是 | Cloudflare Account ID |
| `TMDB_API_KEY` | 否 | TMDB API 密钥 |
| `DOUBAN_COOKIE` | 否 | 豆瓣 Cookie |
| `API_KEY` | 否 | 安全 API 密钥 |

### 获取 Cloudflare 凭据

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. 创建 API Token，选择 "Custom token"
3. 权限设置：
   - Zone:Zone:Read
   - Zone:Zone Settings:Edit
   - Zone:Zone Zone Settings:Edit
   - User:User Details:Read
   - Account:Cloudflare Workers:Edit
   - Account:Account Settings:Read

### wrangler.toml 配置示例

```toml
name = "pt-gen-refactor"
main = "worker/index.js"
compatibility_date = "2025-01-15"

[assets]
directory = "./frontend/dist"
binding = "ASSETS"

[vars]
AUTHOR = "Hares"
TMDB_API_KEY = ""

# R2 存储桶配置（可选）
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "pt-gen-cache"

# D1 数据库配置（可选）
#[[d1_databases]]
#binding = "DB"
#database_name = "pt-gen-cache"
#database_id = ""
```

## 部署流程

### 自动化部署流程

1. **环境检查** - 验证 Node.js、npm、Wrangler CLI
2. **认证验证** - 检查 Cloudflare 认证状态
3. **配置生成** - 交互式生成 wrangler.toml
4. **依赖安装** - 安装前端和后端依赖
5. **前端构建** - 构建 React 应用
6. **Worker 部署** - 部署到 Cloudflare Workers
7. **结果展示** - 显示部署地址和后续步骤

### 错误处理

- **认证失败**: 自动引导用户完成 Wrangler 登录
- **依赖缺失**: 提示用户安装必要软件
- **构建失败**: 显示详细错误信息和解决建议
- **部署失败**: 提供故障排除指南

## 自定义配置

### 批量部署配置

创建 `deploy-config.json` 文件进行批量配置：

```json
{
  "worker_name": "pt-gen-refactor",
  "author": "Your Name", 
  "tmdb_api_key": "your_key",
  "douban_cookie": "your_cookie",
  "cache_type": "r2",
  "r2_bucket_name": "pt-gen-cache",
  "skip_auth_check": false,
  "skip_frontend_build": false
}
```

使用配置文件部署：

```bash
./deploy.sh --config deploy-config.json
```

### CI/CD 集成

项目包含完整的 GitHub Actions 工作流，支持：

- 自动触发部署（推送到 main 分支）
- 手动触发部署（支持环境选择）
- 分环境部署（production/staging）
- 构建缓存优化
- 部署状态通知

## 故障排除

### 常见问题

1. **Wrangler 认证失败**
   ```bash
   npx wrangler login
   ```

2. **前端构建失败**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

3. **Worker 部署失败**
   - 检查 Cloudflare API Token 权限
   - 验证 Account ID 是否正确
   - 确保 wrangler.toml 配置正确

4. **缓存配置错误**
   - R2: 确保存储桶已创建
   - D1: 确保数据库已创建并初始化表结构

### 支持渠道

- [GitHub Issues](https://github.com/rabbitwit/PT-Gen-Refactor/issues)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [项目文档](https://github.com/rabbitwit/PT-Gen-Refactor/wiki)