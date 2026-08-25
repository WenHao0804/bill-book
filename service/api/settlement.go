package api

import (
	"context"
	"sort"

	"bill-book/biz/model/bill_book"
	"bill-book/consts"
	"bill-book/dal/mongo"
	"bill-book/pkg/settlement"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SettlementService struct{}

func NewSettlementService() *SettlementService { return &SettlementService{} }

func (s *SettlementService) GetSettlement(ctx context.Context, req *bill_book.GetSettlementReq) (*bill_book.GetSettlementResp, *consts.BizCode) {
	cacheKey := settlementCacheKey(req.LedgerID)
	var cached bill_book.GetSettlementResp
	if getCachedJSON(ctx, cacheKey, &cached) {
		return &cached, nil
	}

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
	expenses, err := mongo.ExpenseDal.ListAllForLedger(ctx, ledgerId)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}

	netCents := map[string]int64{}
	for _, p := range ledger.Participants {
		netCents[p.Id] = 0
	}
	for _, e := range expenses {
		amountInBase, bizErr := convertToBase(ledger, e.Currency, e.Amount)
		if bizErr != nil {
			return nil, bizErr
		}
		cents := centsFromAmount(amountInBase)
		netCents[e.PayerId] += cents
		for participantId, share := range splitCents(e, cents) {
			netCents[participantId] -= share
		}
	}

	participantIds := make([]string, 0, len(netCents))
	for id := range netCents {
		participantIds = append(participantIds, id)
	}
	sort.Strings(participantIds)

	balances := make([]settlement.Balance, 0, len(participantIds))
	for _, id := range participantIds {
		balances = append(balances, settlement.Balance{ParticipantID: id, AmountCents: netCents[id]})
	}
	transfers := settlement.Simplify(balances)

	resp := bill_book.NewGetSettlementResp()
	resp.BaseCurrency = ledger.BaseCurrency
	resp.Balances = make([]*bill_book.Balance, 0, len(balances))
	for _, b := range balances {
		resp.Balances = append(resp.Balances, &bill_book.Balance{ParticipantID: b.ParticipantID, Balance: amountFromCents(b.AmountCents)})
	}
	resp.Transfers = make([]*bill_book.SettlementTransfer, 0, len(transfers))
	for _, t := range transfers {
		resp.Transfers = append(resp.Transfers, &bill_book.SettlementTransfer{
			FromParticipantID: t.FromParticipantID,
			ToParticipantID:   t.ToParticipantID,
			Amount:            amountFromCents(t.AmountCents),
		})
	}

	setCachedJSON(ctx, cacheKey, resp)
	return resp, nil
}
