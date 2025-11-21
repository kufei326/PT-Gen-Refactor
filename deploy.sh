#!/bin/bash

##############################################################################
# PT-Gen-Refactor 一键部署脚本 (Linux/macOS)
# 
# 使用方法:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# 环境要求:
#   - Node.js 16+
#   - npm
#   - Git (可选)
##############################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 图标定义
SUCCESS="✅"
ERROR="❌"
INFO="ℹ️"
WARNING="⚠️"
ROCKET="🚀"
GEAR="⚙️"

# 日志函数
log_info() {
    echo -e "${BLUE}${INFO}${NC} $1"
}

log_success() {
    echo -e "${GREEN}${SUCCESS}${NC} $1"
}

log_error() {
    echo -e "${RED}${ERROR}${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}${WARNING}${NC} $1"
}

log_step() {
    echo -e "\n${CYAN}${BOLD}${GEAR} $1${NC}"
}

# 显示横幅
show_banner() {
    echo -e "${BOLD}${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════╗
║            PT-Gen-Refactor                   ║
║         一键部署到 Cloudflare Workers          ║
║                                              ║
║     🚀 快速部署 | 🛠️ 自动配置 | 📦 完整构建      ║
╚══════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 未安装或不在 PATH 中"
        return 1
    fi
    return 0
}

# 检查依赖
check_dependencies() {
    log_step "检查系统依赖"
    
    local missing_deps=()
    
    if ! check_command "node"; then
        missing_deps+=("Node.js")
    else
        NODE_VERSION=$(node --version)
        log_success "Node.js 已安装 ($NODE_VERSION)"
    fi
    
    if ! check_command "npm"; then
        missing_deps+=("npm")
    else
        NPM_VERSION=$(npm --version)
        log_success "npm 已安装 (v$NPM_VERSION)"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少必要依赖: ${missing_deps[*]}"
        echo ""
        echo "请安装以下软件:"
        echo "  - Node.js 16+ (https://nodejs.org/)"
        echo "  - npm (通常随 Node.js 一起安装)"
        exit 1
    fi
    
    # 检查可选依赖
    if check_command "git"; then
        GIT_VERSION=$(git --version)
        log_success "Git 已安装 ($GIT_VERSION)"
    else
        log_warning "Git 未安装 (可选，用于版本控制)"
    fi
}

# 检查 Wrangler 认证
check_wrangler_auth() {
    log_step "检查 Wrangler 认证状态"
    
    if npx wrangler whoami &> /dev/null; then
        WRANGLER_USER=$(npx wrangler whoami 2>/dev/null | head -1 || echo "未知用户")
        log_success "Wrangler 已认证 ($WRANGLER_USER)"
        return 0
    else
        log_warning "Wrangler 未认证"
        echo ""
        echo "请选择认证方式:"
        echo "  1) 自动登录 (推荐)"
        echo "  2) 手动登录"
        echo "  3) 跳过认证检查"
        echo ""
        read -p "请选择 (1-3): " auth_choice
        
        case $auth_choice in
            1)
                log_info "正在启动 Wrangler 登录..."
                npx wrangler login
                if npx wrangler whoami &> /dev/null; then
                    log_success "认证成功"
                else
                    log_error "认证失败"
                    exit 1
                fi
                ;;
            2)
                log_info "请在另一个终端运行: npx wrangler login"
                read -p "完成登录后按 Enter 继续..."
                if ! npx wrangler whoami &> /dev/null; then
                    log_error "认证验证失败"
                    exit 1
                fi
                ;;
            3)
                log_warning "跳过认证检查，部署时可能失败"
                ;;
            *)
                log_error "无效选择"
                exit 1
                ;;
        esac
    fi
}

# 用户输入函数
prompt_input() {
    local prompt="$1"
    local default="$2"
    local value
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        echo "${value:-$default}"
    else
        read -p "$prompt: " value
        echo "$value"
    fi
}

# 询问是否配置
prompt_yes_no() {
    local prompt="$1"
    local response
    
    while true; do
        read -p "$prompt (y/n): " response
        case $response in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "请输入 y 或 n";;
        esac
    done
}

# 配置部署参数
configure_deployment() {
    log_step "配置部署参数"
    
    # 检查是否存在现有配置
    if [ -f "wrangler.toml" ]; then
        if prompt_yes_no "检测到现有的 wrangler.toml 配置，是否使用现有配置"; then
            log_success "使用现有配置"
            return 0
        fi
    fi
    
    echo ""
    echo "请输入配置参数 (留空使用默认值):"
    echo ""
    
    # 基本配置
    WORKER_NAME=$(prompt_input "Worker 名称" "pt-gen-refactor")
    AUTHOR_NAME=$(prompt_input "作者名称" "Hares")
    
    # API 配置
    echo ""
    if prompt_yes_no "是否需要配置 TMDB API Key"; then
        TMDB_API_KEY=$(prompt_input "TMDB API Key" "")
    fi
    
    if prompt_yes_no "是否需要配置豆瓣 Cookie"; then
        DOUBAN_COOKIE=$(prompt_input "豆瓣 Cookie" "")
    fi
    
    if prompt_yes_no "是否需要配置安全 API Key"; then
        API_KEY=$(prompt_input "API Key" "")
    fi
    
    # 缓存配置
    echo ""
    if prompt_yes_no "是否需要配置缓存 (R2 或 D1)"; then
        echo ""
        echo "缓存类型:"
        echo "  1) R2 对象存储"
        echo "  2) D1 数据库"
        echo ""
        read -p "请选择 (1-2): " cache_choice
        
        case $cache_choice in
            1)
                CACHE_TYPE="r2"
                R2_BUCKET_NAME=$(prompt_input "R2 存储桶名称" "pt-gen-cache")
                ;;
            2)
                CACHE_TYPE="d1"
                D1_DATABASE_NAME=$(prompt_input "D1 数据库名称" "pt-gen-cache")
                D1_DATABASE_ID=$(prompt_input "D1 数据库 ID" "")
                ;;
            *)
                log_warning "无效选择，跳过缓存配置"
                ;;
        esac
    fi
    
    # 生成配置文件
    generate_wrangler_config
}

# 生成 wrangler.toml 配置
generate_wrangler_config() {
    log_info "生成 wrangler.toml 配置文件..."
    
    cat > wrangler.toml << EOF
name = "${WORKER_NAME:-pt-gen-refactor}"
main = "worker/index.js"
compatibility_date = "$(date +%Y-%m-%d)"

[assets]
directory = "./frontend/dist"
binding = "ASSETS"

[vars]
AUTHOR = "${AUTHOR_NAME:-Hares}"
EOF

    # 添加 API 配置
    if [ -n "$TMDB_API_KEY" ]; then
        echo "TMDB_API_KEY = \"$TMDB_API_KEY\"" >> wrangler.toml
    else
        echo 'TMDB_API_KEY = ""' >> wrangler.toml
    fi
    
    if [ -n "$DOUBAN_COOKIE" ]; then
        echo "DOUBAN_COOKIE = \"$DOUBAN_COOKIE\"" >> wrangler.toml
    else
        echo '#DOUBAN_COOKIE = ""' >> wrangler.toml
    fi
    
    if [ -n "$API_KEY" ]; then
        echo "API_KEY = \"$API_KEY\"" >> wrangler.toml
    else
        echo '#API_KEY = ""' >> wrangler.toml
    fi
    
    # 添加缓存配置
    echo "" >> wrangler.toml
    if [ "$CACHE_TYPE" = "r2" ]; then
        cat >> wrangler.toml << EOF
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "${R2_BUCKET_NAME:-pt-gen-cache}"
EOF
        echo "" >> wrangler.toml
        echo "# D1 数据库配置（可选）" >> wrangler.toml
        echo "#[[d1_databases]]" >> wrangler.toml
        echo "#binding = \"DB\"" >> wrangler.toml
        echo "#database_name = \"pt-gen-cache\"" >> wrangler.toml
        echo "#database_id = \"\"" >> wrangler.toml
    elif [ "$CACHE_TYPE" = "d1" ]; then
        echo "# R2 存储桶配置（可选）" >> wrangler.toml
        echo "#[[r2_buckets]]" >> wrangler.toml
        echo "#binding = \"R2_BUCKET\"" >> wrangler.toml
        echo "#bucket_name = \"pt-gen-cache\"" >> wrangler.toml
        echo "" >> wrangler.toml
        cat >> wrangler.toml << EOF
[[d1_databases]]
binding = "DB"
database_name = "${D1_DATABASE_NAME:-pt-gen-cache}"
database_id = "${D1_DATABASE_ID}"
EOF
    else
        cat >> wrangler.toml << EOF
# R2 存储桶配置（可选，选择一种缓存方式即可）
#[[r2_buckets]]
#binding = "R2_BUCKET"
#bucket_name = "pt-gen-cache"

# D1 数据库配置（可选，选择一种缓存方式即可）
#[[d1_databases]]
#binding = "DB"
#database_name = "pt-gen-cache"
#database_id = ""
EOF
    fi
    
    log_success "wrangler.toml 配置文件已生成"
}

# 安装依赖
install_dependencies() {
    log_step "安装项目依赖"
    
    # 根目录依赖
    if [ -f "package.json" ]; then
        log_info "安装根目录依赖..."
        npm install
    fi
    
    # Worker 依赖
    if [ -f "worker/package.json" ]; then
        log_info "安装 Worker 依赖..."
        cd worker
        npm install
        cd ..
    fi
    
    # 前端依赖
    if [ -f "frontend/package.json" ]; then
        log_info "安装前端依赖..."
        cd frontend
        npm install
        cd ..
    fi
    
    log_success "依赖安装完成"
}

# 构建前端
build_frontend() {
    log_step "构建前端应用"
    
    if [ ! -f "frontend/package.json" ]; then
        log_warning "未找到前端项目，跳过前端构建"
        return 0
    fi
    
    log_info "正在构建前端..."
    cd frontend
    npm run build
    
    if [ ! -d "dist" ]; then
        log_error "前端构建失败，未找到 dist 目录"
        exit 1
    fi
    
    cd ..
    log_success "前端构建完成"
}

# 部署到 Cloudflare Workers
deploy_worker() {
    log_step "部署到 Cloudflare Workers"
    
    cd worker
    
    log_info "正在部署..."
    npx wrangler deploy
    
    # 获取部署信息
    log_info "获取部署信息..."
    if DEPLOY_URL=$(npx wrangler deployments list --limit 1 2>/dev/null | grep -oP 'https://[^\s]+' | head -1); then
        echo ""
        log_success "部署成功! ${ROCKET}"
        echo ""
        echo -e "${BOLD}${GREEN}🔗 访问地址: $DEPLOY_URL${NC}"
        echo ""
    else
        log_success "部署成功! ${ROCKET}"
        log_warning "无法自动获取访问地址，请在 Cloudflare 控制台查看"
    fi
    
    cd ..
}

# 显示部署后信息
show_post_deploy_info() {
    echo ""
    echo -e "${BOLD}${CYAN}📋 部署完成信息${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${BOLD}后续步骤:${NC}"
    echo ""
    echo "1. ${SUCCESS} 验证部署地址功能是否正常"
    
    if [ "$CACHE_TYPE" = "r2" ]; then
        echo "2. ${INFO} 确保在 Cloudflare 控制台中创建了 R2 存储桶: ${R2_BUCKET_NAME:-pt-gen-cache}"
    elif [ "$CACHE_TYPE" = "d1" ]; then
        echo "2. ${INFO} 确保在 Cloudflare 控制台中创建了 D1 数据库: ${D1_DATABASE_NAME:-pt-gen-cache}"
        echo "   ${INFO} 并初始化了缓存表结构"
    fi
    
    echo "3. ${INFO} 如需自定义域名，请在 Cloudflare 控制台配置"
    echo "4. ${INFO} 如需更新代码，重新运行此脚本即可"
    echo ""
    echo -e "${BOLD}有用的命令:${NC}"
    echo ""
    echo "  # 查看部署状态"
    echo "  cd worker && npx wrangler deployments list"
    echo ""
    echo "  # 查看实时日志"
    echo "  cd worker && npx wrangler tail"
    echo ""
    echo "  # 重新部署"
    echo "  ./deploy.sh"
    echo ""
}

# 主函数
main() {
    show_banner
    
    # 检查依赖
    check_dependencies
    
    # 检查认证
    check_wrangler_auth
    
    # 配置部署参数
    configure_deployment
    
    # 安装依赖
    install_dependencies
    
    # 构建前端
    build_frontend
    
    # 部署 Worker
    deploy_worker
    
    # 显示部署后信息
    show_post_deploy_info
    
    log_success "全部完成! 🎉"
}

# 错误处理
trap 'log_error "脚本执行过程中发生错误"; exit 1' ERR

# 处理 Ctrl+C
trap 'echo ""; log_warning "用户取消操作"; exit 0' INT

# 运行主函数
main "$@"