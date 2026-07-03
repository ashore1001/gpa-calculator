# GPA Calculator

一个面向大学生的 GPA 与升学规划工具。项目使用原生 HTML、CSS、JavaScript 开发，课程、学生档案、目标院校和接口配置都保存在浏览器 `localStorage` 中。前端可以继续放在 GitHub Pages，AI 分析通过 Vercel 后端代理调用 OpenAI，API key 不会写入前端代码或 GitHub。

本项目默认采用学校分段绩点：

| 分数 | 等级 | 绩点 |
| --- | --- | --- |
| 96-100 | A+ | 4.8 |
| 93-95 | A | 4.5 |
| 90-92 | A- | 4.0 |
| 86-89 | B+ | 3.8 |
| 83-85 | B | 3.5 |
| 80-82 | B- | 3.0 |
| 76-79 | C+ | 2.8 |
| 73-75 | C | 2.5 |
| 70-72 | C- | 2.0 |
| 66-69 | D+ | 1.8 |
| 63-65 | D | 1.5 |
| 60-62 | D- | 1.0 |
| <60 | F | 0 |

例如：工科数学分析 5 学分，成绩 95 分，课程绩点为 4.50，学分绩点贡献为 `5 * 4.50 = 22.50`。

## 功能列表

- 添加、编辑、删除课程
- 记录课程名称、学期、学分、百分制分数，支持 0.25 学分
- 自动计算总 GPA、学分加权均分、普通均分、总学分、课程数量、每学期 GPA 和每学期均分
- 成绩诊断：指出高学分拖累、低分风险、90 分以下课程和优先提分课程
- 支持按学期筛选课程
- 支持目标 GPA 计算，估算未来课程需要达到的平均 GPA
- 支持导出 CSV
- 支持 CSV 导入，批量录入课程
- 支持完整 JSON 备份和恢复
- 支持清空课程数据，并带确认提示
- GPA 趋势图：学期 GPA、累计 GPA、累计学分
- 成绩影响模拟器：估算未来课程对总 GPA 的影响
- 进阶规划：本校保研、外校推免、考研、出国、就业多路径评分
- 短板雷达：GPA、排名、英语、科研、项目竞赛、材料准备
- 升学时间线：按年级给出阶段重点和下一步硬任务
- 学生档案：学校、专业、年级、GPA、排名、英语、科研、竞赛、项目、奖项、目标方向
- 目标院校：填写目标学校、项目、方向，也可联网查找公开网页参考来辅助补充 GPA、英语和科研偏好
- 目标院校对照表：逐项对比 GPA、排名、英语和科研要求
- 本地规则分析：综合竞争力评分、可能性等级、粗略区间、优势、短板、行动建议
- AI 分析：通过 Vercel API 生成严师型中文报告
- 手机和电脑自适应

## 使用方法

1. 打开 `index.html`，或访问 GitHub Pages 公开网站。
2. 在“添加课程”区域填写课程名称、学期、学分和百分制分数。
3. 在“学生档案”里填写排名、英语、科研、竞赛、目标方向等信息。
4. 在“目标院校”里添加目标；如果不清楚门槛，可以先点“联网查找参考”，再打开来源核实。
5. 点击“生成本地分析”，查看非官方的规划建议。
6. 在“成绩影响模拟器”里输入未来课程学分和预计分数，查看总 GPA 变化。
7. 在“数据管理”里导入 CSV，或导出/恢复完整 JSON 备份。
8. 查看“升学驾驶舱”，对比不同路径的竞争力和短板。
9. 如果已配置 Vercel API，填写 `/api/analyze` 接口地址后点击“生成 AI 分析”。

CSV 导入支持以下列名：

```text
课程名称,学期,学分,分数
```

也兼容 `课程`、`成绩`、`course`、`semester`、`credits`、`score` 等列名。

本地运行：

```bash
npm start
```

然后访问：

```text
http://localhost:8080
```

代码检查：

```bash
npm run check
```

## AI 后端配置

AI 分析使用 Vercel 后端代理：

```text
POST /api/analyze
```

请求内容只包含：

- `profile`
- `coursesSummary`
- `targets`
- `localAnalysis`

默认使用 OpenAI：

```text
AI_PROVIDER=openai
OPENAI_API_KEY=你的 OpenAI API key
OPENAI_MODEL=gpt-5.5
```

也可以使用 DeepSeek：

```text
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的 DeepSeek API key
DEEPSEEK_MODEL=deepseek-v4-flash
```

`AI_PROVIDER` 可填 `openai` 或 `deepseek`。`OPENAI_MODEL` 可不填，默认使用 `gpt-5.5`；`DEEPSEEK_MODEL` 可不填，默认使用 `deepseek-v4-flash`。不要把任何 API key 写到 `script.js`、`index.html`、README 或 GitHub。

目标院校资料检索接口：

```text
POST /api/research-target
```

它只检索公开网页并返回来源链接和可提取的参考字段，不代表官方门槛或录取概率。最终仍要以学院官网、招生简章、夏令营通知和当年推免细则为准。

## 发布到 GitHub Pages

本项目已准备好发布脚本。完成 GitHub CLI 登录后运行：

```bash
./tools/publish-github-pages.sh
```

发布后网站地址通常是：

```text
https://ashore1001.github.io/gpa-calculator/
```

如果遇到本机权限或 GitHub 授权问题，可以先运行：

```bash
./tools/check-agent-setup.sh
```

更多配置说明见 `AGENT_SETUP.md`。

## 发布到 Vercel

安装并登录 Vercel CLI：

```bash
npm i -g vercel
vercel login
```

使用 OpenAI 时添加环境变量：

```bash
vercel env add AI_PROVIDER production
vercel env add OPENAI_API_KEY production
```

使用 DeepSeek 时添加环境变量：

```bash
vercel env add AI_PROVIDER production
vercel env add DEEPSEEK_API_KEY production
```

部署生产环境：

```bash
vercel --prod
```

部署完成后，把 Vercel 给出的接口地址填到网页的“AI 接口地址”中，例如：

```text
https://你的项目.vercel.app/api/analyze
```

现在本项目线上接口是：

```text
https://gpa-calculator-ashore1.vercel.app/api/analyze
```

直接在浏览器打开这个地址只会看到接口说明。真正生成 AI 报告时，需要回到 GPA 网站点击“生成 AI 分析”，网页会自动用 POST 请求把你的档案、课程摘要、目标院校和本地分析结果发给这个接口。

接入 DeepSeek 的最短步骤：

1. 在 DeepSeek 平台创建 API key。
2. 打开 Vercel 项目的 Environment Variables。
3. 添加 `AI_PROVIDER=deepseek`。
4. 添加 `DEEPSEEK_API_KEY=你的 key`。
5. 重新部署 Vercel 生产环境。
6. 回到 GPA 网站点击“生成 AI 分析”。

接入 OpenAI 时，把 `AI_PROVIDER` 改为 `openai`，并添加 `OPENAI_API_KEY` 即可。API key 只放在 Vercel 环境变量里，不要写进前端代码、README 或 GitHub。

## 后续可改进方向

- 支持导入 CSV
- 支持自定义成绩到绩点的映射规则
- 支持 GPA 趋势图和学期雷达图
- 支持不同学校的政策模板，但必须标注来源和日期
- 支持目标院校材料清单和截止日期提醒
- 支持把本地数据导出为 JSON 备份
- 支持暗色模式
