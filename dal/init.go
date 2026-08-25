package dal

import (
	"bill-book/dal/mongo"
	"bill-book/dal/redis"
)

func Init() {
	redis.Init()
	mongo.Init()
}
