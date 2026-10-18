# SVG Editor · Lab 1

一个以结构、命令和可逆编辑为核心的 SVG 命令行编辑器。使用 TypeScript、Command 与 Composite 模式实现。

## 运行

需要 Node.js 22 或以上版本与 npm。

```sh
npm ci
npm run cli
```

交互提示符为 `svg>`；输入 `help` 查看命令，Ctrl+D 退出。支持标准输入回放：

```sh
npm run build
node dist/src/cli/Main.js < examples/flowchart.commands
```

保存的 SVG 可直接用浏览器打开。示例、验证方法、架构方案和开发过程见 [doc/README.md](doc/README.md)。

## 验证

```sh
npm run check
npm test
```

## 仓库

远程仓库地址将在连接远程仓库后补入；当前工程独立位于 `lab1/`，使用本目录的 Git 仓库管理。
