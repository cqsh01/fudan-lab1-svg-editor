# 0.2.1 验收记录

日期：2026-10-28。所有临时检查目录、草稿、安装前缀和图形输出都位于 lab1 内；用户现有 demo.svg 未修改。

## 自动检查

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
