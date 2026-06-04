# Codex 操作环境配置

这个文件用于解决以后让 Codex 操作 GitHub、发布网页、控制本机时经常被权限或工具卡住的问题。

## 当前已完成

- 已安装 GitHub CLI：`gh`
- 已把本地仓库远程地址设置为：`https://github.com/ashore1001/gpa-calculator.git`
- 已创建 GitHub 公开仓库：`https://github.com/ashore1001/gpa-calculator`
- 已添加 GitHub SSH 主机信任记录，减少首次连接提示

## 还需要你亲自点一次

### 1. 登录 GitHub CLI

运行：

```bash
gh auth login
```

推荐选择：

```text
GitHub.com
HTTPS
Authenticate Git with your GitHub credentials: Yes
Login with a web browser
```

浏览器里点 `Authorize github` 后，运行：

```bash
gh auth status
```

如果显示已登录，就成功了。

### 2. 给终端辅助功能权限

如果以后需要 Codex 操作系统弹窗、文件选择器、按键输入，macOS 需要授权。

打开：

```text
系统设置 → 隐私与安全性 → 辅助功能
```

把你运行 Codex 的终端应用打开权限，例如：

- Terminal
- iTerm
- Codex
- Cursor
- VS Code

具体显示哪个，看你当时是从哪个应用启动 Codex。

## 发布这个 GPA 网站

授权完成后，在项目目录运行：

```bash
./tools/publish-github-pages.sh
```

成功后网站地址一般是：

```text
https://ashore1001.github.io/gpa-calculator/
```

GitHub Pages 第一次生效可能需要 1 到 3 分钟。
