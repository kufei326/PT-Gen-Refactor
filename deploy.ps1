# PT-Gen-Refactor 一键部署脚本 (Windows PowerShell)
#
# 使用方法:
#   PowerShell -ExecutionPolicy Bypass -File deploy.ps1
#   或者在 PowerShell 中: .\deploy.ps1
#
# 环境要求:
#   - Node.js 16+
#   - npm
#   - PowerShell 5.0+ (Windows 10+)

param(
    [switch]$SkipAuth = $false,
    [switch]$SkipFrontend = $false,
    [string]$ConfigFile = ""
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色定义
$Colors = @{
    Red = 'Red'
    Green = 'Green'
    Yellow = 'Yellow'
    Blue = 'Blue'
    Cyan = 'Cyan'
    Magenta = 'Magenta'
    White = 'White'
}

# 图标和符号
$Icons = @{
    Success = "✅"
    Error = "❌"
    Info = "ℹ️"
    Warning = "⚠️"
    Rocket = "🚀"
    Gear = "⚙️"
    Check = "✓"
}

# 日志函数
function Write-LogInfo {
    param([string]$Message)
    Write-Host "$($Icons.Info) $Message" -ForegroundColor $Colors.Blue
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "$($Icons.Success) $Message" -ForegroundColor $Colors.Green
}

function Write-LogError {
    param([string]$Message)
    Write-Host "$($Icons.Error) $Message" -ForegroundColor $Colors.Red
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "$($Icons.Warning) $Message" -ForegroundColor $Colors.Yellow
}

function Write-LogStep {
    param([string]$Message)
    Write-Host ""
    Write-Host "$($Icons.Gear) $Message" -ForegroundColor $Colors.Cyan -NoNewline
    Write-Host " " -ForegroundColor $Colors.White
}

# 显示横幅
function Show-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor $Colors.Cyan
    Write-Host "║            PT-Gen-Refactor                   ║" -ForegroundColor $Colors.Cyan
    Write-Host "║         一键部署到 Cloudflare Workers          ║" -ForegroundColor $Colors.Cyan
    Write-Host "║                                              ║" -ForegroundColor $Colors.Cyan
    Write-Host "║     🚀 快速部署 | 🛠️ 自动配置 | 📦 完整构建      ║" -ForegroundColor $Colors.Cyan
    Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor $Colors.Cyan
    Write-Host ""
}

# 检查命令是否存在
function Test-Command {
    param([string]$Command)
    
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# 检查系统依赖
function Test-Dependencies {
    Write-LogStep "检查系统依赖"
    
    $missingDeps = @()
    
    # 检查 Node.js
    if (Test-Command "node") {
        $nodeVersion = node --version
        Write-LogSuccess "Node.js 已安装 ($nodeVersion)"
    }
    else {
        $missingDeps += "Node.js"
    }
    
    # 检查 npm
    if (Test-Command "npm") {
        $npmVersion = npm --version
        Write-LogSuccess "npm 已安装 (v$npmVersion)"
    }
    else {
        $missingDeps += "npm"
    }
    
    # 检查 Git (可选)
    if (Test-Command "git") {
        $gitVersion = git --version
        Write-LogSuccess "Git 已安装 ($gitVersion)"
    }
    else {
        Write-LogWarning "Git 未安装 (可选，用于版本控制)"
    }
    
    if ($missingDeps.Count -gt 0) {
        Write-LogError "缺少必要依赖: $($missingDeps -join ', ')"
        Write-Host ""
        Write-Host "请安装以下软件:" -ForegroundColor $Colors.Yellow
        Write-Host "  - Node.js 16+ (https://nodejs.org/)" -ForegroundColor $Colors.White
        Write-Host "  - npm (通常随 Node.js 一起安装)" -ForegroundColor $Colors.White
        exit 1
    }
}

# 检查 Wrangler 认证
function Test-WranglerAuth {
    if ($SkipAuth) {
        Write-LogWarning "跳过 Wrangler 认证检查"
        return
    }
    
    Write-LogStep "检查 Wrangler 认证状态"
    
    try {
        $wranglerUser = npx wrangler whoami 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess "Wrangler 已认证 ($wranglerUser)"
            return
        }
    }
    catch {}
    
    Write-LogWarning "Wrangler 未认证"
    Write-Host ""
    Write-Host "请选择认证方式:" -ForegroundColor $Colors.Yellow
    Write-Host "  1) 自动登录 (推荐)" -ForegroundColor $Colors.White
    Write-Host "  2) 手动登录" -ForegroundColor $Colors.White  
    Write-Host "  3) 跳过认证检查" -ForegroundColor $Colors.White
    Write-Host ""
    
    $choice = Read-Host "请选择 (1-3)"
    
    switch ($choice) {
        "1" {
            Write-LogInfo "正在启动 Wrangler 登录..."
            npx wrangler login
            
            try {
                npx wrangler whoami | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-LogSuccess "认证成功"
                }
                else {
                    Write-LogError "认证失败"
                    exit 1
                }
            }
            catch {
                Write-LogError "认证验证失败"
                exit 1
            }
        }
        "2" {
            Write-LogInfo "请在另一个 PowerShell 窗口运行: npx wrangler login"
            Read-Host "完成登录后按 Enter 继续..."
            
            try {
                npx wrangler whoami | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    Write-LogError "认证验证失败"
                    exit 1
                }
            }
            catch {
                Write-LogError "认证验证失败"
                exit 1
            }
        }
        "3" {
            Write-LogWarning "跳过认证检查，部署时可能失败"
        }
        default {
            Write-LogError "无效选择"
            exit 1
        }
    }
}

# 用户输入函数
function Get-UserInput {
    param(
        [string]$Prompt,
        [string]$Default = ""
    )
    
    if ($Default) {
        $input = Read-Host "$Prompt [$Default]"
        if ([string]::IsNullOrWhiteSpace($input)) {
            return $Default
        }
        return $input
    }
    else {
        return Read-Host $Prompt
    }
}

# 询问是否确认
function Get-Confirmation {
    param([string]$Prompt)
    
    while ($true) {
        $response = Read-Host "$Prompt (y/n)"
        switch ($response.ToLower()) {
            "y" { return $true }
            "n" { return $false }
            default { Write-Host "请输入 y 或 n" -ForegroundColor $Colors.Yellow }
        }
    }
}

# 配置部署参数
function Set-DeploymentConfig {
    Write-LogStep "配置部署参数"
    
    # 检查现有配置
    if ((Test-Path "wrangler.toml") -and -not $ConfigFile) {
        if (Get-Confirmation "检测到现有的 wrangler.toml 配置，是否使用现有配置") {
            Write-LogSuccess "使用现有配置"
            return
        }
    }
    
    Write-Host ""
    Write-Host "请输入配置参数 (留空使用默认值):" -ForegroundColor $Colors.Cyan
    Write-Host ""
    
    # 基本配置
    $global:WorkerName = Get-UserInput "Worker 名称" "pt-gen-refactor"
    $global:AuthorName = Get-UserInput "作者名称" "Hares"
    
    # API 配置
    Write-Host ""
    if (Get-Confirmation "是否需要配置 TMDB API Key") {
        $global:TmdbApiKey = Get-UserInput "TMDB API Key"
    }
    
    if (Get-Confirmation "是否需要配置豆瓣 Cookie") {
        $global:DoubanCookie = Get-UserInput "豆瓣 Cookie"
    }
    
    if (Get-Confirmation "是否需要配置安全 API Key") {
        $global:ApiKey = Get-UserInput "API Key"
    }
    
    # 缓存配置
    Write-Host ""
    if (Get-Confirmation "是否需要配置缓存 (R2 或 D1)") {
        Write-Host ""
        Write-Host "缓存类型:" -ForegroundColor $Colors.Cyan
        Write-Host "  1) R2 对象存储" -ForegroundColor $Colors.White
        Write-Host "  2) D1 数据库" -ForegroundColor $Colors.White
        Write-Host ""
        
        $cacheChoice = Read-Host "请选择 (1-2)"
        
        switch ($cacheChoice) {
            "1" {
                $global:CacheType = "r2"
                $global:R2BucketName = Get-UserInput "R2 存储桶名称" "pt-gen-cache"
            }
            "2" {
                $global:CacheType = "d1"
                $global:D1DatabaseName = Get-UserInput "D1 数据库名称" "pt-gen-cache"
                $global:D1DatabaseId = Get-UserInput "D1 数据库 ID"
            }
            default {
                Write-LogWarning "无效选择，跳过缓存配置"
            }
        }
    }
    
    # 生成配置文件
    New-WranglerConfig
}

# 生成 wrangler.toml 配置
function New-WranglerConfig {
    Write-LogInfo "生成 wrangler.toml 配置文件..."
    
    $currentDate = Get-Date -Format "yyyy-MM-dd"
    $config = @"
name = "$($global:WorkerName ?? 'pt-gen-refactor')"
main = "worker/index.js"
compatibility_date = "$currentDate"

[assets]
directory = "./frontend/dist"
binding = "ASSETS"

[vars]
AUTHOR = "$($global:AuthorName ?? 'Hares')"
"@

    # 添加 API 配置
    if ($global:TmdbApiKey) {
        $config += "`nTMDB_API_KEY = `"$($global:TmdbApiKey)`""
    }
    else {
        $config += "`nTMDB_API_KEY = `"`""
    }
    
    if ($global:DoubanCookie) {
        $config += "`nDOUBAN_COOKIE = `"$($global:DoubanCookie)`""
    }
    else {
        $config += "`n#DOUBAN_COOKIE = `"`""
    }
    
    if ($global:ApiKey) {
        $config += "`nAPI_KEY = `"$($global:ApiKey)`""
    }
    else {
        $config += "`n#API_KEY = `"`""
    }
    
    # 添加缓存配置
    $config += "`n"
    
    if ($global:CacheType -eq "r2") {
        $config += @"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "$($global:R2BucketName ?? 'pt-gen-cache')"

# D1 数据库配置（可选）
#[[d1_databases]]
#binding = "DB"
#database_name = "pt-gen-cache"
#database_id = ""
"@
    }
    elseif ($global:CacheType -eq "d1") {
        $config += @"

# R2 存储桶配置（可选）
#[[r2_buckets]]
#binding = "R2_BUCKET"
#bucket_name = "pt-gen-cache"

[[d1_databases]]
binding = "DB"
database_name = "$($global:D1DatabaseName ?? 'pt-gen-cache')"
database_id = "$($global:D1DatabaseId)"
"@
    }
    else {
        $config += @"

# R2 存储桶配置（可选，选择一种缓存方式即可）
#[[r2_buckets]]
#binding = "R2_BUCKET"
#bucket_name = "pt-gen-cache"

# D1 数据库配置（可选，选择一种缓存方式即可）
#[[d1_databases]]
#binding = "DB"
#database_name = "pt-gen-cache"
#database_id = ""
"@
    }
    
    $config | Out-File -FilePath "wrangler.toml" -Encoding UTF8
    Write-LogSuccess "wrangler.toml 配置文件已生成"
}

# 安装依赖
function Install-Dependencies {
    Write-LogStep "安装项目依赖"
    
    # 根目录依赖
    if (Test-Path "package.json") {
        Write-LogInfo "安装根目录依赖..."
        npm install
    }
    
    # Worker 依赖
    if (Test-Path "worker/package.json") {
        Write-LogInfo "安装 Worker 依赖..."
        Push-Location "worker"
        npm install
        Pop-Location
    }
    
    # 前端依赖
    if ((Test-Path "frontend/package.json") -and -not $SkipFrontend) {
        Write-LogInfo "安装前端依赖..."
        Push-Location "frontend"
        npm install
        Pop-Location
    }
    
    Write-LogSuccess "依赖安装完成"
}

# 构建前端
function Build-Frontend {
    if ($SkipFrontend) {
        Write-LogWarning "跳过前端构建"
        return
    }
    
    Write-LogStep "构建前端应用"
    
    if (-not (Test-Path "frontend/package.json")) {
        Write-LogWarning "未找到前端项目，跳过前端构建"
        return
    }
    
    Write-LogInfo "正在构建前端..."
    Push-Location "frontend"
    
    try {
        npm run build
        
        if (-not (Test-Path "dist")) {
            Write-LogError "前端构建失败，未找到 dist 目录"
            exit 1
        }
        
        Write-LogSuccess "前端构建完成"
    }
    finally {
        Pop-Location
    }
}

# 部署到 Cloudflare Workers
function Deploy-Worker {
    Write-LogStep "部署到 Cloudflare Workers"
    
    Push-Location "worker"
    
    try {
        Write-LogInfo "正在部署..."
        npx wrangler deploy
        
        # 获取部署信息
        Write-LogInfo "获取部署信息..."
        try {
            $deploymentOutput = npx wrangler deployments list --limit 1 2>$null
            $deployUrl = [regex]::Match($deploymentOutput, 'https://[^\s]+').Value
            
            if ($deployUrl) {
                Write-Host ""
                Write-LogSuccess "部署成功! $($Icons.Rocket)"
                Write-Host ""
                Write-Host "🔗 访问地址: " -ForegroundColor $Colors.White -NoNewline
                Write-Host $deployUrl -ForegroundColor $Colors.Green
                Write-Host ""
            }
            else {
                Write-LogSuccess "部署成功! $($Icons.Rocket)"
                Write-LogWarning "无法自动获取访问地址，请在 Cloudflare 控制台查看"
            }
        }
        catch {
            Write-LogSuccess "部署成功! $($Icons.Rocket)"
            Write-LogWarning "无法获取部署信息"
        }
    }
    finally {
        Pop-Location
    }
}

# 显示部署后信息
function Show-PostDeployInfo {
    Write-Host ""
    Write-Host "📋 部署完成信息" -ForegroundColor $Colors.Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Colors.Cyan
    Write-Host ""
    Write-Host "后续步骤:" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "1. $($Icons.Success) 验证部署地址功能是否正常" -ForegroundColor $Colors.White
    
    if ($global:CacheType -eq "r2") {
        Write-Host "2. $($Icons.Info) 确保在 Cloudflare 控制台中创建了 R2 存储桶: $($global:R2BucketName ?? 'pt-gen-cache')" -ForegroundColor $Colors.White
    }
    elseif ($global:CacheType -eq "d1") {
        Write-Host "2. $($Icons.Info) 确保在 Cloudflare 控制台中创建了 D1 数据库: $($global:D1DatabaseName ?? 'pt-gen-cache')" -ForegroundColor $Colors.White
        Write-Host "   $($Icons.Info) 并初始化了缓存表结构" -ForegroundColor $Colors.White
    }
    
    Write-Host "3. $($Icons.Info) 如需自定义域名，请在 Cloudflare 控制台配置" -ForegroundColor $Colors.White
    Write-Host "4. $($Icons.Info) 如需更新代码，重新运行此脚本即可" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "有用的命令:" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "  # 查看部署状态" -ForegroundColor $Colors.Yellow
    Write-Host "  cd worker; npx wrangler deployments list" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "  # 查看实时日志" -ForegroundColor $Colors.Yellow
    Write-Host "  cd worker; npx wrangler tail" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "  # 重新部署" -ForegroundColor $Colors.Yellow
    Write-Host "  .\deploy.ps1" -ForegroundColor $Colors.White
    Write-Host ""
}

# 主函数
function Main {
    try {
        Show-Banner
        
        # 检查依赖
        Test-Dependencies
        
        # 检查认证
        Test-WranglerAuth
        
        # 配置部署参数
        Set-DeploymentConfig
        
        # 安装依赖
        Install-Dependencies
        
        # 构建前端
        Build-Frontend
        
        # 部署 Worker
        Deploy-Worker
        
        # 显示部署后信息
        Show-PostDeployInfo
        
        Write-LogSuccess "全部完成! 🎉"
    }
    catch {
        Write-LogError "脚本执行过程中发生错误: $($_.Exception.Message)"
        exit 1
    }
}

# 处理 Ctrl+C
$null = [Console]::TreatControlCAsInput = $false
[Console]::CancelKeyPress += {
    Write-Host ""
    Write-LogWarning "用户取消操作"
    exit 0
}

# 运行主函数
Main