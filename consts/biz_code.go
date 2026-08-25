package consts

type BizCode struct {
	Code int32  `json:"code"`
	Msg  string `json:"msg"`
}

var (
	ResSuccess = BizCode{0, "success"}

	InvalidParam = BizCode{20101, "无效参数"}

	ErrLedgerNotFound      = BizCode{20201, "账本不存在"}
	ErrParticipantNotFound = BizCode{20202, "参与人不存在"}
	ErrParticipantInUse    = BizCode{20203, "参与人已被支出记录引用，无法删除"}
	ErrExpenseNotFound     = BizCode{20204, "支出记录不存在"}
	ErrSplitAmountMismatch = BizCode{20205, "自定义分摊金额之和与支出总额不一致"}
	ErrCurrencyRateMissing = BizCode{20206, "缺少该币种对本位币的汇率"}
	ErrLedgerLocked        = BizCode{20207, "账本已锁定，无法修改支出记录"}

	ErrSearchDb = BizCode{20301, "数据库查询失败"}
	ErrCreateDb = BizCode{20302, "数据库写入失败"}
	ErrUpdateDb = BizCode{20303, "数据库更新失败"}
	ErrDeleteDb = BizCode{20304, "数据库删除失败"}

	ErrorSystemFailed = BizCode{20501, "系统内部错误"}
)

func NewBizErrFromErr(bizErr BizCode, err error) *BizCode {
	msg := bizErr.Msg
	if err != nil {
		msg += ": " + err.Error()
	}
	return &BizCode{
		Code: bizErr.Code,
		Msg:  msg,
	}
}
