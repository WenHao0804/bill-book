package api

import (
	"context"
	"encoding/json"
	"time"

	"bill-book/dal/redis"
)

const cacheTTL = 10 * time.Minute

func settlementCacheKey(ledgerId string) string {
	return "bill-book:ledger:" + ledgerId + ":settlement"
}

func reportCacheKey(ledgerId string) string {
	return "bill-book:ledger:" + ledgerId + ":report"
}

// invalidateLedgerCache must be called after any write that can change a
// ledger's balances (expense/participant CRUD, exchange rate updates).
func invalidateLedgerCache(ctx context.Context, ledgerId string) {
	_ = redis.DelKey(ctx, settlementCacheKey(ledgerId))
	_ = redis.DelKey(ctx, reportCacheKey(ledgerId))
}

func getCachedJSON(ctx context.Context, key string, out interface{}) bool {
	val, err := redis.GetVal(ctx, key).Result()
	if err != nil {
		return false
	}
	return json.Unmarshal([]byte(val), out) == nil
}

func setCachedJSON(ctx context.Context, key string, value interface{}) {
	data, err := json.Marshal(value)
	if err != nil {
		return
	}
	_ = redis.KeySet(ctx, key, data, cacheTTL)
}
