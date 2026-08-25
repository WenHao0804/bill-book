package api

import (
	"context"
	"sort"

	"bill-book/biz/model/bill_book"
	"bill-book/consts"
	"bill-book/dal/mongo"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ReportService struct{}

func NewReportService() *ReportService { return &ReportService{} }

func (s *ReportService) GetReport(ctx context.Context, req *bill_book.GetReportReq) (*bill_book.GetReportResp, *consts.BizCode) {
	cacheKey := reportCacheKey(req.LedgerID)
	var cached bill_book.GetReportResp
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

	paidCents := map[string]int64{}
	shareCentsTotal := map[string]int64{}
	categoryCents := map[int32]int64{}
	dateCents := map[string]int64{}
	currencyOriginal := map[string]float64{}
	currencyBaseCents := map[string]int64{}
	participantCategoryShareCents := map[string]map[int32]int64{}
	participantCategoryPaidCents := map[string]map[int32]int64{}
	var totalCents int64

	for _, p := range ledger.Participants {
		paidCents[p.Id] = 0
		shareCentsTotal[p.Id] = 0
		participantCategoryShareCents[p.Id] = map[int32]int64{}
		participantCategoryPaidCents[p.Id] = map[int32]int64{}
	}

	for _, e := range expenses {
		amountInBase, bizErr := convertToBase(ledger, e.Currency, e.Amount)
		if bizErr != nil {
			return nil, bizErr
		}
		cents := centsFromAmount(amountInBase)

		totalCents += cents
		paidCents[e.PayerId] += cents
		categoryCents[e.Category] += cents
		dateCents[e.ExpenseTime.UTC().Format("2006-01-02")] += cents
		currencyOriginal[e.Currency] += e.Amount
		currencyBaseCents[e.Currency] += cents
		participantCategoryPaidCents[e.PayerId][e.Category] += cents

		for participantId, share := range splitCents(e, cents) {
			shareCentsTotal[participantId] += share
			participantCategoryShareCents[participantId][e.Category] += share
		}
	}

	resp := bill_book.NewGetReportResp()
	resp.TotalInBase = amountFromCents(totalCents)
	resp.ExpenseCount = int64(len(expenses))

	participantIds := make([]string, 0, len(paidCents))
	for id := range paidCents {
		participantIds = append(participantIds, id)
	}
	sort.Strings(participantIds)
	resp.ByParticipant = make([]*bill_book.ReportByParticipant, 0, len(participantIds))
	for _, id := range participantIds {
		resp.ByParticipant = append(resp.ByParticipant, &bill_book.ReportByParticipant{
			ParticipantID: id,
			PaidTotal:     amountFromCents(paidCents[id]),
			ShareTotal:    amountFromCents(shareCentsTotal[id]),
			Balance:       amountFromCents(paidCents[id] - shareCentsTotal[id]),
		})
	}

	categories := make([]int32, 0, len(categoryCents))
	for c := range categoryCents {
		categories = append(categories, c)
	}
	sort.Slice(categories, func(i, j int) bool { return categories[i] < categories[j] })
	resp.ByCategory = make([]*bill_book.ReportByCategory, 0, len(categories))
	for _, c := range categories {
		resp.ByCategory = append(resp.ByCategory, &bill_book.ReportByCategory{
			Category:    bill_book.ExpenseCategory(c),
			TotalInBase: amountFromCents(categoryCents[c]),
		})
	}

	dates := make([]string, 0, len(dateCents))
	for d := range dateCents {
		dates = append(dates, d)
	}
	sort.Strings(dates)
	resp.ByDate = make([]*bill_book.ReportByDate, 0, len(dates))
	for _, d := range dates {
		resp.ByDate = append(resp.ByDate, &bill_book.ReportByDate{Date: d, TotalInBase: amountFromCents(dateCents[d])})
	}

	currencies := make([]string, 0, len(currencyBaseCents))
	for c := range currencyBaseCents {
		currencies = append(currencies, c)
	}
	sort.Strings(currencies)
	resp.ByCurrency = make([]*bill_book.ReportByCurrency, 0, len(currencies))
	for _, c := range currencies {
		resp.ByCurrency = append(resp.ByCurrency, &bill_book.ReportByCurrency{
			Currency:      c,
			TotalOriginal: currencyOriginal[c],
			TotalInBase:   amountFromCents(currencyBaseCents[c]),
		})
	}

	resp.ByParticipantCategory = make([]*bill_book.ReportByParticipantCategory, 0, len(participantIds)*len(categories))
	for _, id := range participantIds {
		shareForParticipant := participantCategoryShareCents[id]
		paidForParticipant := participantCategoryPaidCents[id]
		categorySet := map[int32]struct{}{}
		for c := range shareForParticipant {
			categorySet[c] = struct{}{}
		}
		for c := range paidForParticipant {
			categorySet[c] = struct{}{}
		}
		cs := make([]int32, 0, len(categorySet))
		for c := range categorySet {
			cs = append(cs, c)
		}
		sort.Slice(cs, func(i, j int) bool { return cs[i] < cs[j] })
		for _, c := range cs {
			paidValue := paidForParticipant[c]
			shareValue := shareForParticipant[c]
			if paidValue == 0 && shareValue == 0 {
				continue
			}
			resp.ByParticipantCategory = append(resp.ByParticipantCategory, &bill_book.ReportByParticipantCategory{
				ParticipantID: id,
				Category:      bill_book.ExpenseCategory(c),
				PaidInBase:    amountFromCents(paidValue),
				ShareInBase:   amountFromCents(shareValue),
			})
		}
	}

	setCachedJSON(ctx, cacheKey, resp)
	return resp, nil
}
