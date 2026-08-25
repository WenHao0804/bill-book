package conf

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/ilyakaznacheev/cleanenv"
	"github.com/joho/godotenv"
	"gopkg.in/yaml.v3"
)

const (
	ModeEnvName = "MODE_ENV"
	ModeEnvDev  = "dev"
	ModeEnvProd = "prod"
)

type Config struct {
	Server Server `yaml:"server"`
	Mongo  Mongo  `yaml:"mongo"`
	Redis  Redis  `yaml:"redis"`
	Logger Logger `yaml:"logger"`
	ApiKey string `env:"API_KEY"`
}

type Server struct {
	Port string `yaml:"port"`
	Name string `yaml:"name"`
}

type Mongo struct {
	Addr   string `yaml:"addr" env:"MONGO_ADDR"`
	DbName string `yaml:"db_name"`
}

type Redis struct {
	Addrs    []string `yaml:"addrs"`
	Username string   `yaml:"username" env:"REDIS_USERNAME"`
	Password string   `yaml:"password" env:"REDIS_PASSWORD"`
	UseTls   bool     `yaml:"use_tls"`
}

type Logger struct {
	LogPath  string `yaml:"log_path"`
	LogLevel string `yaml:"log_level"`
}

var ConfigData Config

func GetConfig() Config {
	return ConfigData
}

func Init() {
	env := os.Getenv(ModeEnvName)
	if env == "" {
		env = ModeEnvDev
	}
	godotenv.Load(filepath.Join(GetProjectPath(), ".env"))

	filePath := fmt.Sprintf(filepath.Join(GetProjectPath(), "./conf/config_%s.yaml"), env)
	fmt.Println("配置文件：" + filePath)
	dataBytes, err := os.ReadFile(filePath)
	if err != nil {
		panic(fmt.Sprintf("读取配置文件失败：%s", err))
	}

	err = yaml.Unmarshal(dataBytes, &ConfigData)
	if err != nil {
		panic(fmt.Sprintf("解析配置文件失败：%s", err))
	}

	if err := cleanenv.ReadEnv(&ConfigData); err != nil {
		panic(fmt.Sprintf("读取环境变量失败：%s", err))
	}

	if ConfigData.ApiKey == "" {
		panic("必须通过环境变量 API_KEY 设置接口鉴权密钥")
	}
}

var projPath = ""

func GetProjectPath() string {
	if projPath != "" {
		return projPath
	}
	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}

	for {
		info, err := os.Stat(filepath.Join(cwd, "go.mod"))
		if err == nil && !info.IsDir() {
			return cwd
		} else if !os.IsNotExist(err) {
			return ""
		}

		cwd = filepath.Dir(cwd)
		if cwd == "/" || cwd == "" {
			return ""
		}
	}
}
