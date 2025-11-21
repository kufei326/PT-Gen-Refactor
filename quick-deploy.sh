#!/bin/bash

# PT-Gen-Refactor 快速部署脚本
# 最简化的一键部署流程

set -e

echo "🚀 PT-Gen-Refactor 快速部署"
echo "================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查 Wrangler 认证
if ! npx wrangler whoami &> /dev/null; then
    echo "🔑 请先登录 Wrangler:"
    npx wrangler login
fi

echo "📦 安装依赖..."
npm run install:all

echo "🏗️ 构建前端..."
npm run build:frontend

echo "🚀 部署到 Cloudflare Workers..."
npm run deploy

echo "✅ 部署完成！"