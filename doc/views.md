# 关系视图与 UML · 0.2.0

本页中的四组图对应当前代码。图源为 PlantUML，导出 SVG 随仓库与安装包提供，无需安装绘图工具即可查看。

## 组件与依赖关系

![组件依赖关系](architecture.svg)

[architecture.puml](architecture.puml) 表达 domain / application / cli / infrastructure 边界，以及 SvgStore、RecoveryStore、Terminal、Preview、PreviewSource 的实现和使用关系。Main 负责注入，预览的读取方向不会反过来进入命令执行。

## 核心类与所有权

![核心类图](classes.svg)

[classes.puml](classes.puml) 表达 Shape 继承层次、Group 的递归组合、SvgDocument 与根 Group、会话保存基线、命令快照和历史栈。图中没有展开全部命令类，具体命令继承 Command 或 EditCommand，均各自独立一个文件。

EditorSession 中的 current 和 saved 是当前文档与最后成功读入/保存的基线；EditCommand.before/after 是独立的历史快照。恢复草稿不会恢复进程内的 CommandHistory。

## 编辑、确认、备份和预览时序

![编辑与预览时序](workflow.svg)

[workflow.puml](workflow.puml) 说明未保存时确认位于命令执行前，取消不会提交候选文档；成功修改之后、下一次提示符之前更新草稿。浏览器轮询从 PreviewSource 取得副本，不执行 save。

该图展示成功执行路径。失败候选不会进入会话；草稿 IO 失败产生独立 warning，不把已提交的编辑伪装成失败。

## 退出与恢复时序

![退出与恢复时序](recovery.svg)

[recovery.puml](recovery.puml) 说明草稿原子检查点、明确放弃、显式 --recover、验证后认领，以及保存后清理。损坏或不支持的草稿会报错并保留，供检查与后续处理。

## 与上一版的差异

新增 Terminal / RecoveryStore / Preview / PreviewSource 四个端口，Main 原有 readline 职责移入 ConsoleTerminal，交互循环移入 EditorShell。SVG 保存与草稿共用 AtomicFileWriter。Shape 的 Command/Composite 结构保持，SvgDocument 新增内容比较以准确计算 dirty。

图中所有关系均对应真实代码；布局和说明不代表额外的插件、网络编辑或鼠标编辑能力。
