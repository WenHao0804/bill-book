package mongo

import (
	"bill-book/conf"
	"context"
	"fmt"

	"github.com/cloudwego/hertz/pkg/common/hlog"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var db *mongo.Database

func Init() {
	ctx := context.Background()
	mongoConfig := conf.GetConfig().Mongo
	clientOptions := options.Client().ApplyURI(mongoConfig.Addr)

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		panic(fmt.Sprintf("initialize mongodb Connect failed, err: %v", err))
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		panic(fmt.Sprintf("initialize mongodb Ping failed, err: %v", err))
	}
	db = client.Database(mongoConfig.DbName)
	if err := ExpenseDal.EnsureIndexes(ctx); err != nil {
		panic(fmt.Sprintf("initialize expense indexes failed, err: %v", err))
	}
	hlog.CtxInfof(ctx, "initialize mongodb success")
}
