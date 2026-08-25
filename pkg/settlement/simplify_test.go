package settlement

import "testing"

func sumTransfers(transfers []Transfer) map[string]int64 {
	net := map[string]int64{}
	for _, t := range transfers {
		// Paying out reduces a debtor's (negative) balance toward zero;
		// receiving a payment reduces a creditor's (positive) balance toward zero.
		net[t.FromParticipantID] += t.AmountCents
		net[t.ToParticipantID] -= t.AmountCents
	}
	return net
}

func applyAndCheckSettled(t *testing.T, balances []Balance, transfers []Transfer) {
	t.Helper()
	net := sumTransfers(transfers)
	for _, b := range balances {
		if b.AmountCents+net[b.ParticipantID] != 0 {
			t.Fatalf("participant %s not settled: original=%d, net transfers=%d", b.ParticipantID, b.AmountCents, net[b.ParticipantID])
		}
	}
}

func TestSimplify_TwoParticipants(t *testing.T) {
	balances := []Balance{
		{ParticipantID: "A", AmountCents: -10000},
		{ParticipantID: "B", AmountCents: 10000},
	}
	transfers := Simplify(balances)
	if len(transfers) != 1 {
		t.Fatalf("expected 1 transfer, got %d: %+v", len(transfers), transfers)
	}
	if transfers[0].FromParticipantID != "A" || transfers[0].ToParticipantID != "B" || transfers[0].AmountCents != 10000 {
		t.Fatalf("unexpected transfer: %+v", transfers[0])
	}
	applyAndCheckSettled(t, balances, transfers)
}

func TestSimplify_ThreeParticipantsClassic(t *testing.T) {
	balances := []Balance{
		{ParticipantID: "A", AmountCents: 15000},
		{ParticipantID: "B", AmountCents: -5000},
		{ParticipantID: "C", AmountCents: -10000},
	}
	transfers := Simplify(balances)
	if len(transfers) != 2 {
		t.Fatalf("expected 2 transfers, got %d: %+v", len(transfers), transfers)
	}
	applyAndCheckSettled(t, balances, transfers)
}

func TestSimplify_AlreadySettled(t *testing.T) {
	balances := []Balance{
		{ParticipantID: "A", AmountCents: 0},
		{ParticipantID: "B", AmountCents: 0},
		{ParticipantID: "C", AmountCents: 0},
	}
	transfers := Simplify(balances)
	if len(transfers) != 0 {
		t.Fatalf("expected 0 transfers, got %d: %+v", len(transfers), transfers)
	}
}

func TestSimplify_RoundingBoundary(t *testing.T) {
	// 100.00 split three ways: 33.34 + 33.33 + 33.33 = 100.00.
	// A paid the full 100.00 and owes a 33.34 share; B and C each owe 33.33.
	balances := []Balance{
		{ParticipantID: "A", AmountCents: 10000 - 3334}, // +6666
		{ParticipantID: "B", AmountCents: -3333},
		{ParticipantID: "C", AmountCents: -3333},
	}
	var total int64
	for _, b := range balances {
		total += b.AmountCents
	}
	if total != 0 {
		t.Fatalf("test fixture itself doesn't sum to zero: %d", total)
	}

	transfers := Simplify(balances)
	for _, tr := range transfers {
		if tr.AmountCents == 0 {
			t.Fatalf("found a zero-amount transfer: %+v", tr)
		}
	}
	applyAndCheckSettled(t, balances, transfers)
}
