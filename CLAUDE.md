# 一起花 (bill-book)

Multi-person, multi-currency expense-splitting ledger app. Go/Hertz backend, embedded React frontend, single-binary deployment. Go module name is `bill-book` and stays unchanged even though the product is branded "一起花" — don't rename the module/directory.

## Architecture

- **Backend**: Go 1.25, CloudWeGo **Hertz** framework, MongoDB (via official driver) + Redis.
- **Frontend**: React 19 + Vite + TypeScript, antd-mobile (mobile UI kit), React Query, react-router-dom, axios, recharts. Lives in `web/`.
- **Deployment**: `main.go` embeds `web/dist` via `//go:embed` and serves it directly — the built frontend ships inside the Go binary. No separate static file server needed in production.

## Code generation (hz)

The API surface is defined in `idl/bill_book.thrift` and generated via `make idl` (`hz update -idl ./idl/bill_book.thrift`). This generates/overwrites:
- `biz/router/*`
- `biz/handler/*`
- `biz/model/bill_book/bill_book.go` (18k+ lines of DTOs — never hand-edit)

**Hand-editable insertion points that survive regeneration:**
- `router.go`'s `customizedRegister` — for routes outside the generated IDL routing.
- `biz/router/bill_book/middleware.go`'s per-route `_xxxMw()` functions — e.g. `_apiMw()` returns `[]app.HandlerFunc{middleware.Auth()}` to apply auth to the whole `/api` group; all other `_xxxMw()` are `nil` placeholders.

When adding a new endpoint: edit the thrift IDL first, run `make idl`, then implement the service method.

## Response convention

Every handler returns HTTP 200 with a `{code, msg, ...data}` envelope (`consts.BizCode{Code int32, Msg string}`). `code: 0` means success. Biz code numbering:
- `201xx` — param/auth errors (`InvalidParam=20101`, `ErrUnauthorized=20102`)
- `202xx` — domain/business-rule errors (`ErrLedgerNotFound=20201` … `ErrLedgerLocked=20207`)
- `203xx` — DB errors (`ErrSearchDb`/`ErrCreateDb`/`ErrUpdateDb`/`ErrDeleteDb` = 20301-20304)
- `205xx` — system errors (`ErrorSystemFailed=20501`)

Frontend's `web/src/api/client.ts` treats any non-zero `code` in a 200 response as an `ApiError`.

## Config

`conf/config.go`: `MODE_ENV` env var (default `dev`) selects `conf/config_{env}.yaml`. `.env` is loaded first via `godotenv`, then YAML is unmarshalled, then `cleanenv.ReadEnv` overlays env-tagged fields (`MONGO_ADDR`, `REDIS_USERNAME`, `REDIS_PASSWORD`, `API_KEY`). `API_KEY` has no yaml tag — it can only come from the environment. Config loading fails closed via `panic` on any error, including an empty `API_KEY`.

## Auth

Single shared API key, not a user account system. `middleware.Auth()` (`middleware/auth.go`) checks the `X-Api-Key` header against `conf.GetConfig().ApiKey` and returns `ErrUnauthorized` (20102) via the standard `{code,msg}` envelope on mismatch — wired in only for the `/api` group via `_apiMw()`.

Frontend has no route guard component; auth is enforced reactively:
- `web/src/utils/auth.ts` wraps `localStorage` (`getApiKey`/`setApiKey`/`clearApiKey`).
- `web/src/api/client.ts`'s request interceptor attaches `X-Api-Key` to every request.
- Its response interceptor detects `code === 20102`, clears the stored key, and hard-redirects (`window.location.href`) to `/login` if not already there.
- `web/src/pages/Login/index.tsx` "verifies" a candidate key by calling `listLedgers()` — there's no dedicated verify endpoint.

## Service layer pattern (`service/api/*.go`)

One `XxxService` struct per domain (`LedgerService`, `ExpenseService`, etc.), constructed via `NewXxxService()`. Methods: `(ctx context.Context, req *bill_book.XxxReq) (*bill_book.XxxResp, *consts.BizCode)`. They delegate to package-level DAL singletons (`mongo.LedgerDal`, `mongo.ExpenseDal`), use `primitive.ObjectIDFromHex` for Mongo ObjectIDs, distinguish not-found (`mongo.IsNoDocuments(err)`) from generic DB errors, and call `invalidateLedgerCache(ctx, id)` after any balance-affecting write.

## Caching (`service/api/cache.go`)

Redis, 10-minute TTL. Keys: `bill-book:ledger:<id>:settlement`, `bill-book:ledger:<id>:report`. `invalidateLedgerCache` deletes both. Generic `getCachedJSON`/`setCachedJSON` helpers wrap `redis.GetVal`/`redis.KeySet` with JSON marshal/unmarshal.

## Settlement algorithm (`pkg/settlement/simplify.go`)

Standalone, unit-tested package. `Balance{ParticipantID, AmountCents int64}` (positive = creditor, negative = debtor; integer cents to avoid float rounding). `Simplify(balances []Balance) []Transfer` implements the greedy "largest creditor ↔ largest debtor" heuristic (same as Splitwise) — documented as NP-hard for the true minimum, guarantees at most `len(balances)-1` transfers.

## Domain model (`idl/bill_book.thrift`)

`Ledger` (id, name, description, base_currency, participants, exchange_rates, create_time, update_time, `locked`), `Participant`, `ExchangeRate`, `Expense` (`ExpenseSplitType` {Equal, Custom}, `ExpenseCategory` {Other, Food, Transport, Lodging, Ticket, Shopping, Entertainment}), `ExpenseSplit`, `Balance`, `SettlementTransfer`, and report DTOs (`ReportByParticipant`, `ReportByCategory`, `ReportByDate`, `ReportByCurrency`, `ReportByParticipantCategory`). `BillBookService` declares all RPCs with `api.post="/api/v1/..."` route annotations.

## Frontend structure (`web/src`)

- `App.tsx` — routes: `/login`, `/` (ledger list), `/ledger/:id` (tabs: expenses/report/settlement/members/settings), `/ledger/:id/expense/new|:expenseId/edit`.
- `pages/LedgerDetail/` — tabbed detail view; tabs read shared ledger data via `useOutletContext<LedgerOutletContext>()`.
- `api/*.ts` — one file per domain, thin wrappers around `post()` from `api/client.ts`.
- `utils/money.ts` — money formatting; `utils/currency.ts` — currency selector options.
- Vite dev server proxies `/api` to `http://localhost:8800` (see `vite.config.ts`) — run the Go backend on that port during frontend dev.

**TypeScript note**: `npm run build` runs `tsc -b` (strict project-references mode), which is stricter than `tsc --noEmit`. Always verify with `make web-build` (or `npm run build`), not just `tsc --noEmit` — recharts' `Tooltip` `content` prop in particular has typing gaps (`readonly` payload, `label: string | number`) that only surface under `tsc -b`.

## Make targets

- `make idl` — regenerate from thrift.
- `make web-build` — `cd web && npm install && npm run build`.
- `make build` — depends on `web-build`, then `go build -o output/bill-book .`.
- `make run` / `make dev` — `go run .` (dev sets `MODE_ENV=dev`).
- `make web-dev` — `cd web && npm install && npm run dev`.
- `make test` — `go test ./...`.
