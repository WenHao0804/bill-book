package redis

import (
	"bill-book/conf"
	"context"
	"crypto/tls"

	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/redis/go-redis/v9"
)

var redisClient *redis.ClusterClient

func Init() {
	ctx := context.Background()
	config := conf.GetConfig().Redis
	var tlsConfig *tls.Config
	if config.UseTls {
		tlsConfig = &tls.Config{
			MinVersion: tls.VersionTLS12,
		}
	}

	redisClient = redis.NewClusterClient(&redis.ClusterOptions{
		Addrs:      config.Addrs,
		Password:   config.Password,
		Username:   config.Username,
		MaxRetries: 3,

		TLSConfig: tlsConfig,
	})

	err := redisClient.Ping(ctx).Err()
	if err != nil {
		panic(err)
	}

	hlog.CtxInfof(ctx, "init redis success")
}

func GetRdb() *redis.ClusterClient {
	return redisClient
}
