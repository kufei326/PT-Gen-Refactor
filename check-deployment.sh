#!/bin/bash

# PT-Gen-Refactor 部署状态检查脚本

set -e

echo "🔍 PT-Gen-Refactor 部署状态检查"
echo "================================"

# 检查 Wrangler 认证
echo "1. 检查 Wrangler 认证状态..."
if npx wrangler whoami &> /dev/null; then
    USER=$(npx wrangler whoami 2>/dev/null | head -1)
    echo "✅ 已认证: $USER"
else
    echo "❌ 未认证，请运行: npx wrangler login"
    exit 1
fi

# 检查配置文件
echo -e "\n2. 检查配置文件..."
if [ -f "wrangler.toml" ]; then
    echo "✅ wrangler.toml 存在"
    
    # 检查关键配置
    if grep -q "name =" wrangler.toml; then
        WORKER_NAME=$(grep "name =" wrangler.toml | sed 's/name = "\(.*\)"/\1/')
        echo "   Worker 名称: $WORKER_NAME"
    fi
    
    if grep -q "TMDB_API_KEY" wrangler.toml; then
        TMDB_KEY=$(grep "TMDB_API_KEY" wrangler.toml | sed 's/.*= "\(.*\)"/\1/')
        if [ -n "$TMDB_KEY" ] && [ "$TMDB_KEY" != "" ]; then
            echo "   ✅ TMDB API Key 已配置"
        else
            echo "   ⚠️ TMDB API Key 未配置（中文搜索功能将受限）"
        fi
    fi
else
    echo "❌ wrangler.toml 不存在"
    exit 1
fi

# 检查前端构建
echo -e "\n3. 检查前端构建..."
if [ -d "frontend/dist" ]; then
    echo "✅ 前端已构建"
    
    # 检查关键文件
    if [ -f "frontend/dist/index.html" ]; then
        echo "   ✅ index.html 存在"
    else
        echo "   ❌ index.html 缺失"
    fi
    
    # 检查文件大小
    DIST_SIZE=$(du -sh frontend/dist 2>/dev/null | cut -f1 || echo "未知")
    echo "   构建大小: $DIST_SIZE"
else
    echo "⚠️ 前端未构建，运行: npm run build:frontend"
fi

# 检查部署状态
echo -e "\n4. 检查部署状态..."
cd worker

if npx wrangler deployments list --limit 1 &> /dev/null; then
    echo "✅ Worker 已部署"
    
    # 获取部署信息
    DEPLOYMENT_INFO=$(npx wrangler deployments list --limit 1 2>/dev/null | tail -n +2 | head -1)
    if [ -n "$DEPLOYMENT_INFO" ]; then
        echo "   最新部署: $DEPLOYMENT_INFO"
    fi
    
    # 获取访问地址
    DEPLOY_URL=$(npx wrangler deployments list --limit 1 2>/dev/null | grep -oP 'https://[^\s]+' | head -1 || echo "")
    if [ -n "$DEPLOY_URL" ]; then
        echo "   🔗 访问地址: $DEPLOY_URL"
        
        # 测试访问
        echo -e "\n5. 测试访问..."
        if curl -s --max-time 10 "$DEPLOY_URL" > /dev/null; then
            echo "✅ 网站可正常访问"
        else
            echo "⚠️ 网站访问测试失败"
        fi
    fi
else
    echo "❌ Worker 未部署"
fi

cd ..

# 显示有用命令
echo -e "\n📋 有用的命令:"
echo "  查看实时日志: cd worker && npx wrangler tail"
echo "  重新部署: npm run deploy"
echo "  查看部署历史: cd worker && npx wrangler deployments list"
echo "  检查 Worker 状态: cd worker && npx wrangler status"

echo -e "\n✅ 检查完成！"