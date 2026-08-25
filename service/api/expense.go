package api

import (
	"context"
	"math"
	"time"

	"bill-book/biz/model/bill_book"
	"bill-book/consts"
	"bill-book/dal/mongo"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ExpenseService struct{}

func NewExpenseService() *ExpenseService { return &ExpenseService{} }

func validateExpenseInputs(ledger *mongo.TableLedger, payerId string, participantIds []string, splitType bill_book.ExpenseSplitType, splits []*bill_book.ExpenseSplit, amount float64) *consts.BizCode {
	if !participantExists(ledger, payerId) {
		return consts.NewBizErrFromErr(consts.ErrParticipantNotFound, nil)
	}
	for _, pid := range participantIds {
		if !participantExists(ledger, pid) {
			return consts.NewBizErrFromErr(consts.ErrParticipantNotFound, nil)
		}
	}
	if splitType == bill_book.ExpenseSplitType_Custom {
		var sum float64
		for _, sp := range splits {
			if !participantExists(ledger, sp.ParticipantID) {
				return consts.NewBizErrFromErr(consts.ErrParticipantNotFound, nil)
			}
			sum += sp.Amount
		}
		if math.Abs(sum-amount) > 0.005 {
			return consts.NewBizErrFromErr(consts.ErrSplitAmountMismatch, nil)
		}
	}
	return nil
}

func toTableSplits(splits []*bill_book.ExpenseSplit) []mongo.TableExpenseSplit {
	result := make([]mongo.TableExpenseSplit, 0, len(splits))
	for _, sp := range splits {
		result = append(result, mongo.TableExpenseSplit{ParticipantId: sp.ParticipantID, Amount: sp.Amount})
	}
	return result
}

func (s *ExpenseService) CreateExpense(ctx context.Context, req *bill_book.CreateExpenseReq) (*bill_book.CreateExpenseResp, *consts.BizCode) {
	ledgerId, err := primitive.ObjectIDFromHex(req.LedgerID)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
	}
	ledger, err := mongo.LedgerDal.Get(ctx, ledgerId)
	if err != nil {
		if mongo.IsNoDocuments(err) {
			return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
		}
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}

	if bizErr := validateExpenseInputs(ledger, req.PayerID, req.ParticipantIds, req.SplitType, req.Splits, req.Amount); bizErr != nil {
		return nil, bizErr
	}

	amountInBase, bizErr := convertToBase(ledger, req.Currency, req.Amount)
	if bizErr != nil {
		return nil, bizErr
	}

	expense := &mongo.TableExpense{
		LedgerId:       ledgerId,
		PayerId:        req.PayerID,
		ParticipantIds: req.ParticipantIds,
		SplitType:      int32(req.SplitType),
		Splits:         toTableSplits(req.Splits),
		Amount:         req.Amount,
		Currency:       req.Currency,
		AmountInBase:   amountInBase,
		Category:       int32(req.Category),
		Note:           req.Note,
		ExpenseTime:    time.Unix(req.ExpenseTime, 0),
	}
	if err := mongo.ExpenseDal.Create(ctx, expense); err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrCreateDb, err)
	}

	invalidateLedgerCache(ctx, req.LedgerID)

	resp := bill_book.NewCreateExpenseResp()
	resp.Expense = toDTOExpense(expense)
	return resp, nil
}

func (s *ExpenseService) GetExpense(ctx context.Context, req *bill_book.GetExpenseReq) (*bill_book.GetExpenseResp, *consts.BizCode) {
	ledgerId, id, bizErr := parseLedgerAndExpenseId(req.LedgerID, req.ID)
	if bizErr != nil {
		return nil, bizErr
	}

	expense, err := mongo.ExpenseDal.Get(ctx, ledgerId, id)
	if err != nil {
		if mongo.IsNoDocuments(err) {
			return nil, consts.NewBizErrFromErr(consts.ErrExpenseNotFound, nil)
		}
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}

	resp := bill_book.NewGetExpenseResp()
	resp.Expense = toDTOExpense(expense)
	return resp, nil
}

func (s *ExpenseService) UpdateExpense(ctx context.Context, req *bill_book.UpdateExpenseReq) (*bill_book.UpdateExpenseResp, *consts.BizCode) {
	ledgerId, id, bizErr := parseLedgerAndExpenseId(req.LedgerID, req.ID)
	if bizErr != nil {
		return nil, bizErr
	}

	ledger, err := mongo.LedgerDal.Get(ctx, ledgerId)
	if err != nil {
		if mongo.IsNoDocuments(err) {
			return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
		}
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}

	current, err := mongo.ExpenseDal.Get(ctx, ledgerId, id)
	if err != nil {
		if mongo.IsNoDocuments(err) {
			return nil, consts.NewBizErrFromErr(consts.ErrExpenseNotFound, nil)
		}
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}

	if req.IsSetPayerID() {
		current.PayerId = req.GetPayerID()
	}
	if req.ParticipantIds != nil {
		current.ParticipantIds = req.ParticipantIds
	}
	if req.IsSetSplitType() {
		current.SplitType = int32(req.GetSplitType())
	}
	if req.Splits != nil {
		current.Splits = toTableSplits(req.Splits)
	}
	if req.IsSetAmount() {
		current.Amount = req.GetAmount()
	}
	if req.IsSetCurrency() {
		current.Currency = req.GetCurrency()
	}
	if req.IsSetCategory() {
		current.Category = int32(req.GetCategory())
	}
	if req.IsSetNote() {
		current.Note = req.GetNote()
	}
	if req.IsSetExpenseTime() {
		current.ExpenseTime = time.Unix(req.GetExpenseTime(), 0)
	}

	splits := make([]*bill_book.ExpenseSplit, 0, len(current.Splits))
	for _, sp := range current.Splits {
		splits = append(splits, &bill_book.ExpenseSplit{ParticipantID: sp.ParticipantId, Amount: sp.Amount})
	}
	if bizErr := validateExpenseInputs(ledger, current.PayerId, current.ParticipantIds, bill_book.ExpenseSplitType(current.SplitType), splits, current.Amount); bizErr != nil {
		return nil, bizErr
	}

	amountInBase, bizErr := convertToBase(ledger, current.Currency, current.Amount)
	if bizErr != nil {
		return nil, bizErr
	}
	current.AmountInBase = amountInBase

	set := map[string]interface{}{
		"payer_id":        current.PayerId,
		"participant_ids": current.ParticipantIds,
		"split_type":      current.SplitType,
		"splits":          current.Splits,
		"amount":          current.Amount,
		"currency":        current.Currency,
		"amount_in_base":  current.AmountInBase,
		"category":        current.Category,
		"note":            current.Note,
		"expense_time":    current.ExpenseTime,
	}
	if err := mongo.ExpenseDal.Update(ctx, ledgerId, id, set); err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrUpdateDb, err)
	}

	invalidateLedgerCache(ctx, req.LedgerID)

	resp := bill_book.NewUpdateExpenseResp()
	resp.Expense = toDTOExpense(current)
	return resp, nil
}

func (s *ExpenseService) DeleteExpense(ctx context.Context, req *bill_book.DeleteExpenseReq) (*bill_book.DeleteExpenseResp, *consts.BizCode) {
	ledgerId, id, bizErr := parseLedgerAndExpenseId(req.LedgerID, req.ID)
	if bizErr != nil {
		return nil, bizErr
	}

	if err := mongo.ExpenseDal.Delete(ctx, ledgerId, id); err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrDeleteDb, err)
	}

	invalidateLedgerCache(ctx, req.LedgerID)
	return bill_book.NewDeleteExpenseResp(), nil
}

func (s *ExpenseService) ListExpenses(ctx context.Context, req *bill_book.ListExpensesReq) (*bill_book.ListExpensesResp, *consts.BizCode) {
	ledgerId, err := primitive.ObjectIDFromHex(req.LedgerID)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
	}

	var ops []mongo.ExpenseListOptionsFunc
	if req.IsSetCategory() {
		ops = append(ops, mongo.ExpenseWithCategory(int32(req.GetCategory())))
	}
	if req.IsSetParticipantID() {
		ops = append(ops, mongo.ExpenseWithParticipantId(req.GetParticipantID()))
	}
	if req.IsSetStartTime() || req.IsSetEndTime() {
		var start, end time.Time
		if req.IsSetStartTime() {
			start = time.Unix(req.GetStartTime(), 0)
		}
		if req.IsSetEndTime() {
			end = time.Unix(req.GetEndTime(), 0)
		}
		ops = append(ops, mongo.ExpenseWithTimeRange(start, end))
	}

	page := int32(1)
	if req.IsSetPage() && req.GetPage() > 0 {
		page = req.GetPage()
	}
	pageSize := int32(20)
	if req.IsSetPageSize() && req.GetPageSize() > 0 {
		pageSize = req.GetPageSize()
	}
	skip := int((page - 1) * pageSize)

	expenses, err := mongo.ExpenseDal.ListInPage(ctx, ledgerId, skip, int(pageSize), ops...)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}
	total, err := mongo.ExpenseDal.CountWithOptions(ctx, ledgerId, ops...)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}

	resp := bill_book.NewListExpensesResp()
	resp.Expenses = make([]*bill_book.Expense, 0, len(expenses))
	for _, e := range expenses {
		resp.Expenses = append(resp.Expenses, toDTOExpense(e))
	}
	resp.TotalCount = total
	return resp, nil
}

func parseLedgerAndExpenseId(ledgerIdHex, idHex string) (primitive.ObjectID, primitive.ObjectID, *consts.BizCode) {
	ledgerId, err := primitive.ObjectIDFromHex(ledgerIdHex)
	if err != nil {
		return primitive.NilObjectID, primitive.NilObjectID, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
	}
	id, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		return primitive.NilObjectID, primitive.NilObjectID, consts.NewBizErrFromErr(consts.ErrExpenseNotFound, nil)
	}
	return ledgerId, id, nil
}
