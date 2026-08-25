package middleware

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/google/uuid"
)

const RequestIdHeader = "X-Request-Id"

// Trace assigns a request id (reusing one supplied by the caller if present),
// echoes it back in the response header, and logs each access — replacing the
// private go_lib TraceServerMiddleware used by the reference project.
func Trace() app.HandlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		requestId := string(c.GetHeader(RequestIdHeader))
		if requestId == "" {
			requestId = uuid.NewString()
		}
		c.Response.Header.Set(RequestIdHeader, requestId)

		c.Next(ctx)

		hlog.CtxInfof(ctx, "[%s] %s %s %d", requestId, string(c.Method()), string(c.Path()), c.Response.StatusCode())
	}
}
