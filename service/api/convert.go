package api

import (
	"hash/fnv"
	"math"

	"bill-book/biz/model/bill_book"
	"bill-book/consts"
	"bill-book/dal/mongo"
)

func toDTOParticipant(p mongo.TableParticipant) *bill_book.Participant {
	return &bill_book.Participant{
		ID:         p.Id,
		Name:       p.Name,
		Color:      p.Color,
		CreateTime: p.CreateTime.Unix(),
	}
}

func toDTOExchangeRate(r mongo.TableExchangeRate) *bill_book.ExchangeRate {
	return &bill_book.ExchangeRate{Currency: r.Currency, RateToBase: r.RateToBase}
}

func toDTOLedger(l *mongo.TableLedger) *bill_book.Ledger {
	participants := make([]*bill_book.Participant, 0, len(l.Participants))
	for _, p := range l.Participants {
		participants = append(participants, toDTOParticipant(p))
	}
	rates := make([]*bill_book.ExchangeRate, 0, len(l.ExchangeRates))
	for _, r := range l.ExchangeRates {
		rates = append(rates, toDTOExchangeRate(r))
	}
	return &bill_book.Ledger{
		ID:            l.Id.Hex(),
		Name:          l.Name,
		Description:   l.Description,
		BaseCurrency:  l.BaseCurrency,
		Participants:  participants,
		ExchangeRates: rates,
		CreateTime:    l.CreateTime.Unix(),
		UpdateTime:    l.UpdateTime.Unix(),
		Locked:        l.Locked,
	}
}

func toDTOExpense(e *mongo.TableExpense) *bill_book.Expense {
	splits := make([]*bill_book.ExpenseSplit, 0, len(e.Splits))
	for _, sp := range e.Splits {
		splits = append(splits, &bill_book.ExpenseSplit{ParticipantID: sp.ParticipantId, Amount: sp.Amount})
	}
	return &bill_book.Expense{
		ID:             e.Id.Hex(),
		LedgerID:       e.LedgerId.Hex(),
		PayerID:        e.PayerId,
		ParticipantIds: e.ParticipantIds,
		SplitType:      bill_book.ExpenseSplitType(e.SplitType),
		Splits:         splits,
		Amount:         e.Amount,
		Currency:       e.Currency,
		AmountInBase:   e.AmountInBase,
		Category:       bill_book.ExpenseCategory(e.Category),
		Note:           e.Note,
		ExpenseTime:    e.ExpenseTime.Unix(),
		CreateTime:     e.CreateTime.Unix(),
		UpdateTime:     e.UpdateTime.Unix(),
	}
}

func centsFromAmount(amount float64) int64 {
	return int64(math.Round(amount * 100))
}

func amountFromCents(cents int64) float64 {
	return float64(cents) / 100
}

// convertToBase converts an amount from the given currency into the ledger's
// current base currency, using the ledger's *current* exchange rate table
// (not any snapshot stored on an expense) so that editing exchange rates is
// reflected the next time settlement/report is computed.
func convertToBase(ledger *mongo.TableLedger, currency string, amount float64) (float64, *consts.BizCode) {
	if currency == ledger.BaseCurrency {
		return amount, nil
	}
	for _, r := range ledger.ExchangeRates {
		if r.Currency == currency {
			return amount * r.RateToBase, nil
		}
	}
	return 0, consts.NewBizErrFromErr(consts.ErrCurrencyRateMissing, nil)
}

// splitCents distributes totalCents (an expense's amount converted to base
// currency, in integer cents) across the expense's participants according to
// its split type, guaranteeing the returned amounts sum exactly to totalCents.
func splitCents(e *mongo.TableExpense, totalCents int64) map[string]int64 {
	result := map[string]int64{}
	if bill_book.ExpenseSplitType(e.SplitType) == bill_book.ExpenseSplitType_Custom && len(e.Splits) > 0 {
		var assigned int64
		for i, sp := range e.Splits {
			var cents int64
			if i == len(e.Splits)-1 {
				cents = totalCents - assigned
			} else {
				ratio := sp.Amount / e.Amount
				cents = int64(math.Round(ratio * float64(totalCents)))
				assigned += cents
			}
			result[sp.ParticipantId] += cents
		}
		return result
	}

	n := int64(len(e.ParticipantIds))
	if n == 0 {
		return result
	}
	base := totalCents / n
	remainder := totalCents % n
	// Which participants absorb the leftover cent(s) is arbitrary but must be
	// deterministic (settlement results are cached and must be stable). Rotate
	// the starting point per-expense (keyed off the expense's own id) instead
	// of always starting at index 0, so the same participant isn't
	// systematically favored across every expense in a ledger.
	offset := remainderOffset(e.Id.Hex(), n)
	for i, pid := range e.ParticipantIds {
		cents := base
		if (int64(i)-offset+n)%n < remainder {
			cents++
		}
		result[pid] += cents
	}
	return result
}

func remainderOffset(key string, n int64) int64 {
	h := fnv.New32a()
	_, _ = h.Write([]byte(key))
	return int64(h.Sum32()) % n
}

func participantExists(ledger *mongo.TableLedger, id string) bool {
	for _, p := range ledger.Participants {
		if p.Id == id {
			return true
		}
	}
	return false
}
