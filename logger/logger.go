package logger

import (
	"bill-book/conf"
	"os"
	"path/filepath"

	"github.com/cloudwego/hertz/pkg/common/hlog"
	hertzzap "github.com/hertz-contrib/logger/zap"
)

func Init(cfg conf.Logger) {
	hlog.SetLogger(hertzzap.NewLogger())
	hlog.SetLevel(parseLevel(cfg.LogLevel))

	if cfg.LogPath != "" {
		if err := os.MkdirAll(filepath.Dir(cfg.LogPath), 0o755); err != nil {
			panic(err)
		}
		file, err := os.OpenFile(cfg.LogPath+".log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
		if err != nil {
			panic(err)
		}
		hlog.SetOutput(file)
	}
}

func parseLevel(level string) hlog.Level {
	switch level {
	case "debug":
		return hlog.LevelDebug
	case "info":
		return hlog.LevelInfo
	case "warn":
		return hlog.LevelWarn
	case "error":
		return hlog.LevelError
	default:
		return hlog.LevelInfo
	}
}
