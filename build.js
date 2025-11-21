#!/usr/bin/env node

/**
 * PT-Gen-Refactor 构建脚本
 * 用于 Deploy to Cloudflare Workers 按钮
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 开始构建 PT-Gen-Refactor...');

function execCommand(command, cwd = process.cwd()) {
  try {
    console.log(`执行: ${command}`);
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      encoding: 'utf8' 
    });
  } catch (error) {
    console.error(`命令失败: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 16) {
    console.error(`❌ Node.js 版本过低 (${nodeVersion})，需要 16.0.0 或更高版本`);
    process.exit(1);
  }
  
  console.log(`✅ Node.js 版本检查通过 (${nodeVersion})`);
}

function installDependencies() {
  console.log('\n📦 安装依赖...');
  
  // 安装根目录依赖
  if (fs.existsSync('package.json')) {
    console.log('安装根目录依赖...');
    execCommand('npm install --production=false');
  }
  
  // 安装 Worker 依赖
  if (fs.existsSync('worker/package.json')) {
    console.log('安装 Worker 依赖...');
    execCommand('npm install --production=false', './worker');
  }
  
  // 安装前端依赖
  if (fs.existsSync('frontend/package.json')) {
    console.log('安装前端依赖...');
    execCommand('npm install --production=false', './frontend');
  }
}

function buildFrontend() {
  console.log('\n🏗️ 构建前端应用...');
  
  if (!fs.existsSync('frontend/package.json')) {
    console.log('⚠️ 未找到前端项目，跳过构建');
    return;
  }
  
  // 确保前端依赖已安装
  console.log('安装前端依赖...');
  execCommand('npm install', './frontend');
  
  // 构建前端
  console.log('构建前端应用...');
  execCommand('npm run build', './frontend');
  
  // 验证构建结果
  if (!fs.existsSync('frontend/dist')) {
    console.error('❌ 前端构建失败，未找到 dist 目录');
    process.exit(1);
  }
  
  if (!fs.existsSync('frontend/dist/index.html')) {
    console.error('❌ 前端构建不完整，缺少 index.html');
    process.exit(1);
  }
  
  console.log('✅ 前端构建完成');
  
  // 显示构建信息
  try {
    const files = fs.readdirSync('frontend/dist');
    console.log(`   构建文件: ${files.length} 个文件`);
    
    // 显示主要文件大小
    const indexPath = path.join('frontend/dist/index.html');
    const indexSize = (fs.statSync(indexPath).size / 1024).toFixed(2);
    console.log(`   index.html: ${indexSize} KB`);
  } catch (error) {
    // 忽略统计错误
  }
}

function validateWorker() {
  console.log('\n🔍 验证 Worker 文件...');
  
  if (!fs.existsSync('worker/index.js')) {
    console.error('❌ Worker 入口文件不存在: worker/index.js');
    process.exit(1);
  }
  
  if (!fs.existsSync('wrangler.toml')) {
    console.error('❌ Wrangler 配置文件不存在: wrangler.toml');
    process.exit(1);
  }
  
  console.log('✅ Worker 文件验证通过');
}

function showSummary() {
  console.log('\n📋 构建总结');
  console.log('='.repeat(30));
  
  // Worker 信息
  console.log('📦 Worker: worker/index.js');
  
  // 前端信息
  if (fs.existsSync('frontend/dist')) {
    const files = fs.readdirSync('frontend/dist');
    console.log(`🎨 前端: ${files.length} 个构建文件`);
  }
  
  // 配置信息
  if (fs.existsSync('wrangler.toml')) {
    console.log('⚙️ 配置: wrangler.toml');
  }
  
  console.log('\n🎉 构建完成！准备部署...');
}

// 主流程
async function main() {
  try {
    checkNodeVersion();
    installDependencies();
    buildFrontend();
    validateWorker();
    showSummary();
  } catch (error) {
    console.error('\n❌ 构建失败:', error.message);
    process.exit(1);
  }
}

main();