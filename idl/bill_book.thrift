namespace go bill_book

enum ExpenseSplitType {
    Equal = 0
    Custom = 1
}

enum ExpenseCategory {
    Other = 0
    Food = 1
    Transport = 2
    Lodging = 3
    Ticket = 4
    Shopping = 5
    Entertainment = 6
}

struct Participant {
    1: string id
    2: string name
    3: string color
    4: i64 create_time
}

struct ExchangeRate {
    1: string currency
    2: double rate_to_base
}

struct Ledger {
    1: string id
    2: string name
    3: string description
    4: string base_currency
    5: list<Participant> participants
    6: list<ExchangeRate> exchange_rates
    7: i64 create_time
    8: i64 update_time
    9: bool locked
}

struct ExpenseSplit {
    1: string participant_id
    2: double amount
}

struct Expense {
    1: string id
    2: string ledger_id
    3: string payer_id
    4: list<string> participant_ids
    5: ExpenseSplitType split_type
    6: list<ExpenseSplit> splits
    7: double amount
    8: string currency
    9: double amount_in_base
    10: ExpenseCategory category
    11: string note
    12: i64 expense_time
    13: i64 create_time
    14: i64 update_time
}

struct Balance {
    1: string participant_id
    2: double balance
}

struct SettlementTransfer {
    1: string from_participant_id
    2: string to_participant_id
    3: double amount
}

struct ReportByParticipant {
    1: string participant_id
    2: double paid_total
    3: double share_total
    4: double balance
}

struct ReportByCategory {
    1: ExpenseCategory category
    2: double total_in_base
}

struct ReportByDate {
    1: string date
    2: double total_in_base
}

struct ReportByCurrency {
    1: string currency
    2: double total_original
    3: double total_in_base
}

struct ReportByParticipantCategory {
    1: string participant_id
    2: ExpenseCategory category
    3: double paid_in_base
    4: double share_in_base
}

// ---- Ledger ----
struct CreateLedgerReq {
    1: required string name
    2: string description
    3: required string base_currency
}
struct CreateLedgerResp { 1: i64 code, 2: string msg, 3: Ledger ledger }

struct GetLedgerReq { 1: required string id }
struct GetLedgerResp { 1: i64 code, 2: string msg, 3: Ledger ledger }

struct UpdateLedgerReq {
    1: required string id
    2: optional string name
    3: optional string description
    4: optional bool locked
}
struct UpdateLedgerResp { 1: i64 code, 2: string msg, 3: Ledger ledger }

struct DeleteLedgerReq { 1: required string id }
struct DeleteLedgerResp { 1: i64 code, 2: string msg }

struct ListLedgersReq {}
struct ListLedgersResp { 1: i64 code, 2: string msg, 3: list<Ledger> ledgers }

struct UpdateExchangeRatesReq {
    1: required string ledger_id
    2: required list<ExchangeRate> exchange_rates
}
struct UpdateExchangeRatesResp { 1: i64 code, 2: string msg, 3: Ledger ledger }

// ---- Participant ----
struct CreateParticipantReq { 1: required string ledger_id, 2: required string name, 3: string color }
struct CreateParticipantResp { 1: i64 code, 2: string msg, 3: Participant participant }

struct UpdateParticipantReq { 1: required string ledger_id, 2: required string id, 3: optional string name, 4: optional string color }
struct UpdateParticipantResp { 1: i64 code, 2: string msg, 3: Participant participant }

struct DeleteParticipantReq { 1: required string ledger_id, 2: required string id }
struct DeleteParticipantResp { 1: i64 code, 2: string msg }

// ---- Expense ----
struct CreateExpenseReq {
    1: required string ledger_id
    2: required string payer_id
    3: required list<string> participant_ids
    4: ExpenseSplitType split_type
    5: optional list<ExpenseSplit> splits
    6: required double amount
    7: required string currency
    8: ExpenseCategory category
    9: string note
    10: required i64 expense_time
}
struct CreateExpenseResp { 1: i64 code, 2: string msg, 3: Expense expense }

struct GetExpenseReq { 1: required string ledger_id, 2: required string id }
struct GetExpenseResp { 1: i64 code, 2: string msg, 3: Expense expense }

struct UpdateExpenseReq {
    1: required string ledger_id
    2: required string id
    3: optional string payer_id
    4: optional list<string> participant_ids
    5: optional ExpenseSplitType split_type
    6: optional list<ExpenseSplit> splits
    7: optional double amount
    8: optional string currency
    9: optional ExpenseCategory category
    10: optional string note
    11: optional i64 expense_time
}
struct UpdateExpenseResp { 1: i64 code, 2: string msg, 3: Expense expense }

struct DeleteExpenseReq { 1: required string ledger_id, 2: required string id }
struct DeleteExpenseResp { 1: i64 code, 2: string msg }

struct ListExpensesReq {
    1: required string ledger_id
    2: optional ExpenseCategory category
    3: optional string participant_id
    4: optional i64 start_time
    5: optional i64 end_time
    6: optional i32 page
    7: optional i32 page_size
}
struct ListExpensesResp { 1: i64 code, 2: string msg, 3: list<Expense> expenses, 4: i64 total_count }

// ---- Settlement / Report ----
struct GetSettlementReq { 1: required string ledger_id }
struct GetSettlementResp {
    1: i64 code, 2: string msg
    3: list<Balance> balances
    4: list<SettlementTransfer> transfers
    5: string base_currency
}

struct GetReportReq { 1: required string ledger_id }
struct GetReportResp {
    1: i64 code, 2: string msg
    3: list<ReportByParticipant> by_participant
    4: list<ReportByCategory> by_category
    5: list<ReportByDate> by_date
    6: list<ReportByCurrency> by_currency
    7: double total_in_base
    8: i64 expense_count
    9: list<ReportByParticipantCategory> by_participant_category
}

service BillBookService {
    CreateLedgerResp CreateLedger(1: CreateLedgerReq req)(api.post="/api/v1/ledger/create")
    GetLedgerResp GetLedger(1: GetLedgerReq req)(api.post="/api/v1/ledger/get")
    UpdateLedgerResp UpdateLedger(1: UpdateLedgerReq req)(api.post="/api/v1/ledger/update")
    DeleteLedgerResp DeleteLedger(1: DeleteLedgerReq req)(api.post="/api/v1/ledger/delete")
    ListLedgersResp ListLedgers(1: ListLedgersReq req)(api.post="/api/v1/ledger/list")
    UpdateExchangeRatesResp UpdateExchangeRates(1: UpdateExchangeRatesReq req)(api.post="/api/v1/exchange_rate/update")

    CreateParticipantResp CreateParticipant(1: CreateParticipantReq req)(api.post="/api/v1/participant/create")
    UpdateParticipantResp UpdateParticipant(1: UpdateParticipantReq req)(api.post="/api/v1/participant/update")
    DeleteParticipantResp DeleteParticipant(1: DeleteParticipantReq req)(api.post="/api/v1/participant/delete")

    CreateExpenseResp CreateExpense(1: CreateExpenseReq req)(api.post="/api/v1/expense/create")
    GetExpenseResp GetExpense(1: GetExpenseReq req)(api.post="/api/v1/expense/get")
    UpdateExpenseResp UpdateExpense(1: UpdateExpenseReq req)(api.post="/api/v1/expense/update")
    DeleteExpenseResp DeleteExpense(1: DeleteExpenseReq req)(api.post="/api/v1/expense/delete")
    ListExpensesResp ListExpenses(1: ListExpensesReq req)(api.post="/api/v1/expense/list")

    GetSettlementResp GetSettlement(1: GetSettlementReq req)(api.post="/api/v1/settlement/get")
    GetReportResp GetReport(1: GetReportReq req)(api.post="/api/v1/report/get")
}
