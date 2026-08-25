# 一起花 (bill-book)

多人多币种记账分摊工具。支持记录支出、自动换算汇率、一键结算欠款，并提供按人 / 分类 / 日期 / 币种维度的报表统计。前后端打包成单一二进制，部署简单。

## 功能

- 多账本管理，每个账本可设置多个参与人、本位币和汇率表
- 记录支出，支持平均分摊或自定义分摊
- 一键结算：自动计算最简转账方案，减少互相还款的次数
- 支出报表：按参与人、分类、日期、币种多维度统计
- 账本锁定：归档后禁止再新增/编辑/删除支出
- 移动端优先的 UI，基于 antd-mobile

## 技术栈

- **后端**：Go 1.25 + [CloudWeGo Hertz](https://www.cloudwego.io/zh/docs/hertz/) + MongoDB + Redis
- **前端**：React 19 + TypeScript + Vite + antd-mobile + React Query
- **部署**：前端构建产物通过 `go:embed` 打包进 Go 二进制，单文件部署，无需额外的静态资源服务器

## 快速开始

### 依赖

- Go 1.25+
- Node.js（用于构建前端）
- 可访问的 MongoDB 与 Redis 实例

### 配置

复制并按需修改配置文件（默认读取 `conf/config_dev.yaml`，由 `MODE_ENV` 环境变量选择对应的 `conf/config_{env}.yaml`）：

```yaml
server:
  port: ":8800"
mongo:
  addr: "mongodb://localhost:27017"
  db_name: "bill-book"
redis:
  addrs: ["127.0.0.1:6379"]
```

`API_KEY` 只能通过环境变量或 `.env` 文件设置（用于接口鉴权，缺省会启动失败）：

```bash
echo 'API_KEY=your-secret-key' > .env
```

### 本地开发

```bash
# 后端（默认监听 :8800）
make dev

# 前端（Vite dev server，代理 /api 到 :8800）
make web-dev
```

### 构建生产版本

```bash
make build        # 构建前端并编译为单一二进制 output/bill-book
./output/bill-book
```

### 其他常用命令

```bash
make idl        # 根据 idl/bill_book.thrift 重新生成路由/handler/model
make test       # 运行 Go 测试
```

## 目录结构

```
biz/            handler、router、model（部分由 thrift IDL 生成）
service/api/    业务逻辑层
dal/mongo/      数据访问层
pkg/settlement/ 结算算法（贪心简化转账）
idl/            thrift 接口定义
web/            React 前端源码
main.go         入口，注册路由并托管前端静态资源
```
