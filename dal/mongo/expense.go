package mongo

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const TableNameExpense = "expenses"

type TableExpenseSplit struct {
	ParticipantId string  `bson:"participant_id"`
	Amount        float64 `bson:"amount"`
}

type TableExpense struct {
	Id             primitive.ObjectID  `bson:"_id,omitempty"`
	LedgerId       primitive.ObjectID  `bson:"ledger_id"`
	PayerId        string              `bson:"payer_id"`
	ParticipantIds []string            `bson:"participant_ids"`
	SplitType      int32               `bson:"split_type"`
	Splits         []TableExpenseSplit `bson:"splits,omitempty"`
	Amount         float64             `bson:"amount"`
	Currency       string              `bson:"currency"`
	AmountInBase   float64             `bson:"amount_in_base"`
	Category       int32               `bson:"category"`
	Note           string              `bson:"note"`
	ExpenseTime    time.Time           `bson:"expense_time"`
	CreateTime     time.Time           `bson:"create_time"`
	UpdateTime     time.Time           `bson:"update_time"`
	Deleted        bool                `bson:"deleted"`
}

var ExpenseDal = &expenseDal{}

type expenseDal struct{}

func (d *expenseDal) EnsureIndexes(ctx context.Context) error {
	collection := db.Collection(TableNameExpense)
	indexModels := []mongo.IndexModel{
		{Keys: bson.D{{Key: "ledger_id", Value: 1}, {Key: "expense_time", Value: -1}}},
		{Keys: bson.D{{Key: "ledger_id", Value: 1}, {Key: "deleted", Value: 1}}},
	}
	_, err := collection.Indexes().CreateMany(ctx, indexModels)
	return err
}

func (d *expenseDal) Create(ctx context.Context, model *TableExpense) error {
	now := time.Now()
	model.Id = primitive.NewObjectID()
	model.CreateTime = now
	model.UpdateTime = now
	_, err := db.Collection(TableNameExpense).InsertOne(ctx, model)
	return err
}

func (d *expenseDal) Get(ctx context.Context, ledgerId, id primitive.ObjectID) (*TableExpense, error) {
	var expense TableExpense
	err := db.Collection(TableNameExpense).FindOne(ctx, bson.M{"_id": id, "ledger_id": ledgerId, "deleted": false}).Decode(&expense)
	if err != nil {
		return nil, err
	}
	return &expense, nil
}

func (d *expenseDal) Update(ctx context.Context, ledgerId, id primitive.ObjectID, set bson.M) error {
	set["update_time"] = time.Now()
	_, err := db.Collection(TableNameExpense).UpdateOne(ctx, bson.M{"_id": id, "ledger_id": ledgerId}, bson.M{"$set": set})
	return err
}

func (d *expenseDal) Delete(ctx context.Context, ledgerId, id primitive.ObjectID) error {
	_, err := db.Collection(TableNameExpense).UpdateOne(ctx, bson.M{"_id": id, "ledger_id": ledgerId},
		bson.M{"$set": bson.M{"deleted": true, "update_time": time.Now()}})
	return err
}

func (d *expenseDal) DeleteAllByLedger(ctx context.Context, ledgerId primitive.ObjectID) error {
	_, err := db.Collection(TableNameExpense).UpdateMany(ctx, bson.M{"ledger_id": ledgerId},
		bson.M{"$set": bson.M{"deleted": true, "update_time": time.Now()}})
	return err
}

type ExpenseListOptions struct {
	Category      *int32
	ParticipantId string
	StartTime     time.Time
	EndTime       time.Time
}

type ExpenseListOptionsFunc func(*ExpenseListOptions)

func ExpenseWithCategory(v int32) ExpenseListOptionsFunc {
	return func(o *ExpenseListOptions) { o.Category = &v }
}
func ExpenseWithParticipantId(v string) ExpenseListOptionsFunc {
	return func(o *ExpenseListOptions) { o.ParticipantId = v }
}
func ExpenseWithTimeRange(start, end time.Time) ExpenseListOptionsFunc {
	return func(o *ExpenseListOptions) { o.StartTime, o.EndTime = start, end }
}

func (d *expenseDal) buildFilter(ledgerId primitive.ObjectID, ops ...ExpenseListOptionsFunc) bson.M {
	cfg := &ExpenseListOptions{}
	for _, op := range ops {
		op(cfg)
	}
	filter := bson.M{"ledger_id": ledgerId, "deleted": false}
	if cfg.Category != nil {
		filter["category"] = *cfg.Category
	}
	if cfg.ParticipantId != "" {
		filter["participant_ids"] = cfg.ParticipantId
	}
	if !cfg.StartTime.IsZero() || !cfg.EndTime.IsZero() {
		timeFilter := bson.M{}
		if !cfg.StartTime.IsZero() {
			timeFilter["$gte"] = cfg.StartTime
		}
		if !cfg.EndTime.IsZero() {
			timeFilter["$lte"] = cfg.EndTime
		}
		filter["expense_time"] = timeFilter
	}
	return filter
}

func (d *expenseDal) ListInPage(ctx context.Context, ledgerId primitive.ObjectID, skip, limit int, ops ...ExpenseListOptionsFunc) ([]*TableExpense, error) {
	findOptions := options.Find().SetSort(bson.M{"expense_time": -1})
	if limit > 0 {
		findOptions.SetSkip(int64(skip)).SetLimit(int64(limit))
	}
	cursor, err := db.Collection(TableNameExpense).Find(ctx, d.buildFilter(ledgerId, ops...), findOptions)
	if err != nil {
		return nil, err
	}
	var expenses []*TableExpense
	if err := cursor.All(ctx, &expenses); err != nil {
		return nil, err
	}
	return expenses, nil
}

func (d *expenseDal) CountWithOptions(ctx context.Context, ledgerId primitive.ObjectID, ops ...ExpenseListOptionsFunc) (int64, error) {
	return db.Collection(TableNameExpense).CountDocuments(ctx, d.buildFilter(ledgerId, ops...))
}

// ListAllForLedger returns all non-deleted expenses of a ledger, used for settlement/report aggregation.
func (d *expenseDal) ListAllForLedger(ctx context.Context, ledgerId primitive.ObjectID) ([]*TableExpense, error) {
	cursor, err := db.Collection(TableNameExpense).Find(ctx, bson.M{"ledger_id": ledgerId, "deleted": false})
	if err != nil {
		return nil, err
	}
	var expenses []*TableExpense
	if err := cursor.All(ctx, &expenses); err != nil {
		return nil, err
	}
	return expenses, nil
}

// CountByParticipant checks whether a participant is referenced by any non-deleted expense in the ledger.
func (d *expenseDal) CountByParticipant(ctx context.Context, ledgerId primitive.ObjectID, participantId string) (int64, error) {
	return db.Collection(TableNameExpense).CountDocuments(ctx, bson.M{
		"ledger_id": ledgerId,
		"deleted":   false,
		"$or": []bson.M{
			{"payer_id": participantId},
			{"participant_ids": participantId},
		},
	})
}
