package api

import (
	"context"

	"bill-book/biz/model/bill_book"
	"bill-book/consts"
	"bill-book/dal/mongo"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type LedgerService struct{}

func NewLedgerService() *LedgerService { return &LedgerService{} }

func (s *LedgerService) CreateLedger(ctx context.Context, req *bill_book.CreateLedgerReq) (*bill_book.CreateLedgerResp, *consts.BizCode) {
	ledger := &mongo.TableLedger{
		Name:          req.Name,
		Description:   req.Description,
		BaseCurrency:  req.BaseCurrency,
		Participants:  []mongo.TableParticipant{},
		ExchangeRates: []mongo.TableExchangeRate{},
	}
	if err := mongo.LedgerDal.Create(ctx, ledger); err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrCreateDb, err)
	}

	resp := bill_book.NewCreateLedgerResp()
	resp.Ledger = toDTOLedger(ledger)
	return resp, nil
}

func (s *LedgerService) GetLedger(ctx context.Context, req *bill_book.GetLedgerReq) (*bill_book.GetLedgerResp, *consts.BizCode) {
	ledgerId, err := primitive.ObjectIDFromHex(req.ID)
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

	resp := bill_book.NewGetLedgerResp()
	resp.Ledger = toDTOLedger(ledger)
	return resp, nil
}

func (s *LedgerService) UpdateLedger(ctx context.Context, req *bill_book.UpdateLedgerReq) (*bill_book.UpdateLedgerResp, *consts.BizCode) {
	ledgerId, err := primitive.ObjectIDFromHex(req.ID)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
	}

	set := map[string]interface{}{}
	if req.IsSetName() {
		set["name"] = req.GetName()
	}
	if req.IsSetDescription() {
		set["description"] = req.GetDescription()
	}
	if len(set) > 0 {
		if err := mongo.LedgerDal.Update(ctx, ledgerId, set); err != nil {
			if mongo.IsNoDocuments(err) {
				return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
			}
			return nil, consts.NewBizErrFromErr(consts.ErrUpdateDb, err)
		}
	}

	ledger, err := mongo.LedgerDal.Get(ctx, ledgerId)
	if err != nil {
		if mongo.IsNoDocuments(err) {
			return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
		}
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}

	resp := bill_book.NewUpdateLedgerResp()
	resp.Ledger = toDTOLedger(ledger)
	return resp, nil
}

func (s *LedgerService) DeleteLedger(ctx context.Context, req *bill_book.DeleteLedgerReq) (*bill_book.DeleteLedgerResp, *consts.BizCode) {
	ledgerId, err := primitive.ObjectIDFromHex(req.ID)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
	}

	if err := mongo.ExpenseDal.DeleteAllByLedger(ctx, ledgerId); err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrDeleteDb, err)
	}
	if err := mongo.LedgerDal.Delete(ctx, ledgerId); err != nil {
		if mongo.IsNoDocuments(err) {
			return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
		}
		return nil, consts.NewBizErrFromErr(consts.ErrDeleteDb, err)
	}

	invalidateLedgerCache(ctx, req.ID)
	return bill_book.NewDeleteLedgerResp(), nil
}

func (s *LedgerService) ListLedgers(ctx context.Context, req *bill_book.ListLedgersReq) (*bill_book.ListLedgersResp, *consts.BizCode) {
	ledgers, err := mongo.LedgerDal.List(ctx)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}

	resp := bill_book.NewListLedgersResp()
	resp.Ledgers = make([]*bill_book.Ledger, 0, len(ledgers))
	for _, l := range ledgers {
		resp.Ledgers = append(resp.Ledgers, toDTOLedger(l))
	}
	return resp, nil
}

func (s *LedgerService) UpdateExchangeRates(ctx context.Context, req *bill_book.UpdateExchangeRatesReq) (*bill_book.UpdateExchangeRatesResp, *consts.BizCode) {
	ledgerId, err := primitive.ObjectIDFromHex(req.LedgerID)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
	}

	rates := make([]mongo.TableExchangeRate, 0, len(req.ExchangeRates))
	for _, r := range req.ExchangeRates {
		rates = append(rates, mongo.TableExchangeRate{Currency: r.Currency, RateToBase: r.RateToBase})
	}

	if err := mongo.LedgerDal.UpdateExchangeRates(ctx, ledgerId, rates); err != nil {
		if mongo.IsNoDocuments(err) {
			return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
		}
		return nil, consts.NewBizErrFromErr(consts.ErrUpdateDb, err)
	}

	ledger, err := mongo.LedgerDal.Get(ctx, ledgerId)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}

	invalidateLedgerCache(ctx, req.LedgerID)

	resp := bill_book.NewUpdateExchangeRatesResp()
	resp.Ledger = toDTOLedger(ledger)
	return resp, nil
}
