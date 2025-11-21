#!/usr/bin/env node

/**
 * 一键部署脚本 - PT-Gen-Refactor
 * 自动化构建前端和部署到 Cloudflare Workers
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}▶${colors.reset} ${colors.bright}${msg}${colors.reset}`)
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function execCommand(command, cwd = process.cwd()) {
  try {
    log.info(`执行命令: ${command}`);
    const result = execSync(command, { 
      cwd, 
      stdio: 'inherit',
      encoding: 'utf8' 
    });
    return result;
  } catch (error) {
    log.error(`命令执行失败: ${command}`);
    log.error(error.message);
    process.exit(1);
  }
}

function checkDependencies() {
  log.step('检查依赖环境...');
  
  try {
    execSync('node --version', { stdio: 'pipe' });
    log.success('Node.js 已安装');
  } catch (error) {
    log.error('Node.js 未安装，请先安装 Node.js');
    process.exit(1);
  }

  try {
    execSync('npm --version', { stdio: 'pipe' });
    log.success('npm 已安装');
  } catch (error) {
    log.error('npm 未安装');
    process.exit(1);
  }

  try {
    execSync('npx wrangler --version', { stdio: 'pipe' });
    log.success('Wrangler CLI 可用');
  } catch (error) {
    log.warn('Wrangler CLI 未全局安装，将使用本地版本');
  }
}

function checkWranglerAuth() {
  log.step('检查 Wrangler 认证状态...');
  
  try {
    execSync('npx wrangler whoami', { stdio: 'pipe' });
    log.success('Wrangler 已认证');
    return true;
  } catch (error) {
    log.warn('Wrangler 未认证');
    return false;
  }
}

async function promptConfig() {
  log.step('配置部署参数...');
  
  const config = {};
  
  // 检查是否存在 wrangler.toml
  const wranglerTomlPath = path.join(process.cwd(), 'wrangler.toml');
  if (fs.existsSync(wranglerTomlPath)) {
    const useExisting = await question('检测到现有的 wrangler.toml 配置，是否使用? (y/n): ');
    if (useExisting.toLowerCase() === 'y') {
      log.success('使用现有配置');
      return config;
    }
  }

  config.name = await question('Worker 名称 (默认: pt-gen-refactor): ') || 'pt-gen-refactor';
  config.author = await question('作者名称 (默认: Hares): ') || 'Hares';
  
  const needTmdb = await question('是否需要配置 TMDB API Key? (y/n): ');
  if (needTmdb.toLowerCase() === 'y') {
    config.tmdbApiKey = await question('请输入 TMDB API Key: ');
  }

  const needDouban = await question('是否需要配置豆瓣 Cookie? (y/n): ');
  if (needDouban.toLowerCase() === 'y') {
    config.doubanCookie = await question('请输入豆瓣 Cookie: ');
  }

  const needApiKey = await question('是否需要配置安全 API Key? (y/n): ');
  if (needApiKey.toLowerCase() === 'y') {
    config.apiKey = await question('请输入 API Key: ');
  }

  const needCache = await question('是否需要配置缓存 (R2/D1)? (y/n): ');
  if (needCache.toLowerCase() === 'y') {
    const cacheType = await question('选择缓存类型 (r2/d1): ');
    config.cacheType = cacheType.toLowerCase();
    
    if (config.cacheType === 'r2') {
      config.r2BucketName = await question('R2 存储桶名称 (默认: pt-gen-cache): ') || 'pt-gen-cache';
    } else if (config.cacheType === 'd1') {
      config.d1DatabaseName = await question('D1 数据库名称 (默认: pt-gen-cache): ') || 'pt-gen-cache';
      config.d1DatabaseId = await question('D1 数据库 ID: ');
    }
  }

  return config;
}

function updateWranglerConfig(config) {
  if (Object.keys(config).length === 0) return;
  
  log.step('更新 wrangler.toml 配置...');
  
  let wranglerContent = `name = "${config.name || 'pt-gen-refactor'}"
main = "worker/index.js"
compatibility_date = "2025-08-27"

[assets]
directory = "./frontend/dist"
binding = "ASSETS"

[vars]
AUTHOR = "${config.author || 'Hares'}"`;

  if (config.tmdbApiKey) {
    wranglerContent += `\nTMDB_API_KEY = "${config.tmdbApiKey}"`;
  } else {
    wranglerContent += `\nTMDB_API_KEY = ""`;
  }

  if (config.doubanCookie) {
    wranglerContent += `\nDOUBAN_COOKIE = "${config.doubanCookie}"`;
  } else {
    wranglerContent += `\n#DOUBAN_COOKIE = ""`;
  }

  if (config.apiKey) {
    wranglerContent += `\nAPI_KEY = "${config.apiKey}"`;
  } else {
    wranglerContent += `\n#API_KEY = ""`;
  }

  if (config.cacheType === 'r2') {
    wranglerContent += `\n
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "${config.r2BucketName}"`;
  } else {
    wranglerContent += `\n
# R2 存储桶配置（可选，选择一种缓存方式即可）
#[[r2_buckets]]
#binding = "R2_BUCKET"
#bucket_name = "pt-gen-cache"`;
  }

  if (config.cacheType === 'd1') {
    wranglerContent += `\n
[[d1_databases]]
binding = "DB"
database_name = "${config.d1DatabaseName}"
database_id = "${config.d1DatabaseId}"`;
  } else {
    wranglerContent += `\n
# D1 数据库配置（可选，选择一种缓存方式即可）
#[[d1_databases]]
#binding = "DB"
#database_name = "pt-gen-cache"
#database_id = ""`;
  }

  fs.writeFileSync('wrangler.toml', wranglerContent);
  log.success('wrangler.toml 配置已更新');
}

function installDependencies() {
  log.step('安装项目依赖...');
  
  // 安装根目录依赖
  if (fs.existsSync('package.json')) {
    execCommand('npm install');
  }
  
  // 安装 Worker 依赖
  if (fs.existsSync('worker/package.json')) {
    execCommand('npm install', './worker');
  }
  
  // 安装前端依赖
  if (fs.existsSync('frontend/package.json')) {
    execCommand('npm install', './frontend');
  }
  
  log.success('依赖安装完成');
}

function buildFrontend() {
  log.step('构建前端应用...');
  
  if (!fs.existsSync('frontend/package.json')) {
    log.warn('未找到前端项目，跳过前端构建');
    return;
  }
  
  execCommand('npm run build', './frontend');
  
  if (!fs.existsSync('frontend/dist')) {
    log.error('前端构建失败，未找到 dist 目录');
    process.exit(1);
  }
  
  log.success('前端构建完成');
}

async function deployWorker() {
  log.step('部署到 Cloudflare Workers...');
  
  try {
    execCommand('npx wrangler deploy', './worker');
    log.success('部署成功! 🎉');
    
    // 尝试获取部署 URL
    try {
      const output = execSync('npx wrangler deployments list --limit 1', { 
        cwd: './worker', 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // 解析部署信息
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('https://')) {
          const url = line.match(/https:\/\/[^\s]+/);
          if (url) {
            log.success(`部署地址: ${colors.green}${url[0]}${colors.reset}`);
            break;
          }
        }
      }
    } catch (error) {
      // 忽略获取 URL 的错误
    }
    
  } catch (error) {
    log.error('部署失败');
    process.exit(1);
  }
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════╗
║            PT-Gen-Refactor                   ║
║            一键部署工具                        ║
╚══════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // 1. 检查依赖
    checkDependencies();
    
    // 2. 检查认证
    const isAuthenticated = checkWranglerAuth();
    if (!isAuthenticated) {
      log.info('请先登录 Wrangler:');
      log.info('  npx wrangler login');
      const proceed = await question('是否已经完成登录? (y/n): ');
      if (proceed.toLowerCase() !== 'y') {
        log.info('请完成 Wrangler 登录后重新运行部署脚本');
        process.exit(0);
      }
    }
    
    // 3. 配置参数
    const config = await promptConfig();
    updateWranglerConfig(config);
    
    // 4. 安装依赖
    installDependencies();
    
    // 5. 构建前端
    buildFrontend();
    
    // 6. 部署 Worker
    await deployWorker();
    
    console.log(`\n${colors.green}${colors.bright}🎉 部署完成! ${colors.reset}`);
    console.log('后续步骤:');
    console.log('• 如果使用了 R2 或 D1 缓存，请确保已在 Cloudflare 控制台中创建对应资源');
    console.log('• 可以通过部署地址访问您的应用');
    console.log('• 如需更新，再次运行此脚本即可');
    
  } catch (error) {
    log.error(`部署过程出现错误: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 处理 Ctrl+C 退出
process.on('SIGINT', () => {
  log.info('\n用户取消操作');
  rl.close();
  process.exit(0);
});

main();