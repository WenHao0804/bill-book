package middleware

import (
	"context"

	"bill-book/conf"
	"bill-book/consts"

	"github.com/cloudwego/hertz/pkg/app"
	hertzconsts "github.com/cloudwego/hertz/pkg/protocol/consts"
)

// Auth rejects any request whose X-Api-Key header doesn't match the
// server's configured API key.
func Auth() app.HandlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		key := string(c.GetHeader("X-Api-Key"))
		if key == "" || key != conf.GetConfig().ApiKey {
			c.JSON(hertzconsts.StatusOK, consts.ErrUnauthorized)
			c.Abort()
			return
		}
		c.Next(ctx)
	}
}
