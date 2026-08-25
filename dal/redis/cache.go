package redis

import (
	"context"
	"time"

	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/redis/go-redis/v9"
)

func KeySet(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return redisClient.Set(ctx, key, value, expiration).Err()
}

// .Val()是实际存的值；.String()返回的是执行的命令+值，不要用这个
func GetVal(ctx context.Context, key string) *redis.StringCmd {
	return redisClient.Get(ctx, key)
}

func DelKey(ctx context.Context, key string) error {
	err := redisClient.Del(ctx, key).Err()
	if err != nil {
		hlog.CtxErrorf(ctx, "del key fail, key:%s, err:%s", key, err.Error())
		return err
	}
	return nil
}
