# 验收记录 · 0.3.0

本轮复核日期：2026-10-29；字符预览实现与 PTY 验收日期：2026-10-28。所有临时检查目录、草稿、安装前缀和图形输出都位于 lab1 内；用户现有 demo.svg 未修改。

## 0.3.0：终端字符预览

10/28 按用户要求保留本地修改；10/29 经授权重新复核，版本更新为 0.3.0。以下本地检查在提交前通过，远程 CI 在推送后验收。

| 检查 | 本地结果 |
| --- | --- |
| `npm run check` | 通过 |
| `npm test` | **54 项全部通过**，包含原有 46 项与新增 8 项字符预览检查 |
| `npm run test:package` | 通过；最终复核使用 `npm_config_offline=true`，全新前缀中的安装包可执行 view 与 --terminal-preview |
| `git diff --check` | 通过 |
| 实际 macOS PTY | 单矩形、中文、移动、undo/redo、手动 view 和自动输出均正常；70 列缩至 42 列后重新适配，退出码 0 |
| 同时启用浏览器预览 | 终端继续输出字符画，HTTP state 返回当前 400×200、2 个图形、dirty 与 revision；退出后关闭服务 |
| UML 与关系图 | 更新组件图、核心类图、编辑时序，新增字符预览关系图；PlantUML 均成功导出并检查布局 |

`terminal-view.test.ts` 覆盖：只绘制真实内容、不添加节点/箭头；六种图元与组合继承；层叠遮挡和 front/back；裁剪、比例、终端尺寸与极端有限坐标；中文、控制符和宽字符覆盖；自动刷新与默认脚本兼容；真实可执行入口；读取/保存/调整画布与恢复后的状态。view 同时验证不改文档、revision、撤销或重做。

字符预览使用普通文本，没有图像协议或 ANSI 重画依赖。颜色、精确字号/描边宽度、复杂字形与极小几何属于近似显示边界。常见中文已在本机 PTY 检查；不同终端字体与复杂 emoji 仍会影响字宽。

联网安装的重复复核曾在 npm 依赖获取阶段超时；使用本机已有 npm 缓存重新运行安装包检查后通过。检查仍在全新安装前缀进行，运行时不使用项目 node_modules 或开发依赖。

本地环境为 macOS、Node.js 25.1.0。Windows 安装检查代码已扩展为在真实 .cmd 启动器下检查手动/自动字符预览。工作流覆盖 Windows/Linux × Node.js 22/24，每次推送执行类型、54 项功能与安装包检查；实际结果见[当前分支的 CI](https://github.com/cqsh01/fudan-lab1-svg-editor/actions?query=branch%3Amain)。下方的 46 项与旧平台结果属于历史 0.2.1，独立保留。

## 已发布 0.2.1：自动检查

| 命令 | 本轮结果 | 作用 |
| --- | --- | --- |
| `npm run check` | 通过 | TypeScript 严格类型检查 |
| `npm test` | **46 项全部通过** | 原有行为和新增入口、保护、恢复、预览、架构边界 |
| `npm run test:package` | 通过 | 在全新临时前缀安装 tarball，仅使用运行依赖；验证 bin/help/version/stdin，以及 Windows cmd.exe/.cmd、原生路径和 CRLF |
| `git diff --check` | 通过 | 核对空白错误与补丁格式 |

检查分布：

- `domain.test.ts`：递归几何、结构顺序、循环、id、数值与克隆隔离。
- `application.test.ts`：命令粒度、浮点恢复、原子失败、redo 分支、IO 屏障。
- `cli.test.ts`：全部命令、六类型、in、引号、错误、真实文件、脚本退出码与示例逐字回放。
- `paths.test.ts`：盘符、UNC、相对路径、中文/空格、文字转义隔离，以及真实原生文件路径往返。
- `launch.test.ts`：独立 help/version、非法参数与预览端口验证。
- `protection.test.ts`：dirty 基线、取消保护、确认后读取失败、退出/草稿生命周期、备份失败不误报编辑失败。
- `recovery.test.ts`：独立草稿、验证后认领、损坏草稿保留、大小限制、旧检查点在失败后仍可使用。
- `preview.test.ts`：空文档、实时内存 SVG、undo/redo 隔离、只读路由、Host 校验、停止服务与端口冲突。
- `architecture.test.ts`：模块方向、类文件命名和生产函数边界的静态扫描。

安装包检查也确认用户 demo.svg、测试目录、node_modules 和 TypeScript 开发依赖不进入运行包。包中保留技术文档、PlantUML 图源和导出 SVG，便于独立审阅。

## 实际终端检查

本地使用真实 PTY / 交互入口执行：

| 场景 | 实际结果 |
| --- | --- |
| 读取 gallery、移动一组、执行 init 后按 Enter | init 取消，图形与原历史保留，status 仍为 unsaved |
| 执行 undo | 原坐标恢复，status 变为 saved，预览同步显示已保存 |
| redo 后 Ctrl+D | 服务退出，终端打印实际草稿位置与恢复命令 |
| 新进程 --recover | 还原未保存坐标、文本、尺寸与原路径，状态为 unsaved |
| 显式另存后 exit | 原示例没有被覆盖，本会话草稿清理 |
| 完成检查点后 SIGKILL | 新的真实 CLI 进程可以恢复最后完整检查点并保存 |
| Ctrl+C | 正常保留检查点，退出码 130；新进程恢复并保存后草稿清理 |
| 一次粘贴命令与确认答案 | 同一个输入迭代器按顺序消费，确认答案未被误作编辑命令 |

SIGKILL / Ctrl+C 检查通过 PTY 子进程执行；保存目标和临时草稿在检查结束后清理。强制中断时不会保证尚未写完的最后一次操作，验收点明确选在下一次提示符出现之后。

## 浏览器与视觉检查

已在本地预览页面检查：空画布、读取 gallery、移动后自动刷新、undo 后保存状态、实际大小/适应画布切换、窄屏上下布局。页面没有外部字体或图片依赖；技术文档附实际截图 [preview.png](preview.png)。

[组件关系图](architecture.svg)、[核心类图](classes.svg)、[编辑预览时序](workflow.svg)、[恢复时序](recovery.svg)均提供对应 PlantUML 图源，并核对名称与当前依赖方向。

## 平台覆盖与结果边界

本地环境为 macOS、Node.js 25.1.0。CI 配置覆盖 ubuntu-latest / windows-latest 与 Node.js 22 / 24，均执行类型检查、46 项功能检查及安装包检查；实际结果见 [GitHub Actions](https://github.com/cqsh01/fudan-lab1-svg-editor/actions)。Windows 包检查现通过真实 cmd.exe 执行已安装 .cmd 启动器，并验证中文/空格安装目录、原生文件路径、UTF-8/CRLF 脚本、特殊文本与失败退出码。Windows 的交互键盘和字体显示尚未进行人工验收，不能由非交互 CMD 检查推定。

这些检查不表示已完成商业市场验证。当前 SVG 子集、全量快照、16 MiB 草稿和最后完整检查点的恢复边界均在 [主技术文档](README.md) 明确说明。
