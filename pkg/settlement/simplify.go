package settlement

import "sort"

// Balance is a participant's net position in integer cents of the ledger's
// base currency. Positive means the participant is owed money (creditor),
// negative means the participant owes money (debtor).
type Balance struct {
	ParticipantID string
	AmountCents   int64
}

// Transfer is a single suggested payment from a debtor to a creditor.
type Transfer struct {
	FromParticipantID string
	ToParticipantID   string
	AmountCents       int64
}

// Simplify computes a minimal-ish set of transfers that settles all balances,
// using the standard greedy "largest creditor <-> largest debtor" algorithm
// (the same approach used by Splitwise and similar apps).
//
// Finding the true minimum number of transactions is NP-hard (it reduces to a
// subset-sum style problem), so this greedy heuristic is used instead. It
// guarantees at most len(balances)-1 transfers, and in most real-world balance
// distributions each person ends up transferring exactly once — but for some
// balance distributions a person may need more than one transfer.
func Simplify(balances []Balance) []Transfer {
	working := make([]Balance, 0, len(balances))
	for _, b := range balances {
		if b.AmountCents != 0 {
			working = append(working, b)
		}
	}

	var transfers []Transfer
	for len(working) > 0 {
		sort.Slice(working, func(i, j int) bool { return working[i].AmountCents < working[j].AmountCents })

		debtor := &working[0]
		creditor := &working[len(working)-1]
		if debtor.AmountCents >= 0 || creditor.AmountCents <= 0 {
			break
		}

		amount := -debtor.AmountCents
		if creditor.AmountCents < amount {
			amount = creditor.AmountCents
		}

		transfers = append(transfers, Transfer{
			FromParticipantID: debtor.ParticipantID,
			ToParticipantID:   creditor.ParticipantID,
			AmountCents:       amount,
		})

		debtor.AmountCents += amount
		creditor.AmountCents -= amount

		filtered := working[:0]
		for _, b := range working {
			if b.AmountCents != 0 {
				filtered = append(filtered, b)
			}
		}
		working = filtered
	}
	return transfers
}
