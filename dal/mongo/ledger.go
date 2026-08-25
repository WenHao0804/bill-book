package mongo

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const TableNameLedger = "ledgers"

type TableParticipant struct {
	Id         string    `bson:"id"`
	Name       string    `bson:"name"`
	Color      string    `bson:"color"`
	CreateTime time.Time `bson:"create_time"`
}

type TableExchangeRate struct {
	Currency   string  `bson:"currency"`
	RateToBase float64 `bson:"rate_to_base"`
}

type TableLedger struct {
	Id            primitive.ObjectID  `bson:"_id,omitempty"`
	Name          string              `bson:"name"`
	Description   string              `bson:"description"`
	BaseCurrency  string              `bson:"base_currency"`
	Participants  []TableParticipant  `bson:"participants"`
	ExchangeRates []TableExchangeRate `bson:"exchange_rates"`
	CreateTime    time.Time           `bson:"create_time"`
	UpdateTime    time.Time           `bson:"update_time"`
}

var LedgerDal = &ledgerDal{}

type ledgerDal struct{}

func (d *ledgerDal) Create(ctx context.Context, model *TableLedger) error {
	now := time.Now()
	model.Id = primitive.NewObjectID()
	model.CreateTime = now
	model.UpdateTime = now
	_, err := db.Collection(TableNameLedger).InsertOne(ctx, model)
	return err
}

func (d *ledgerDal) Get(ctx context.Context, id primitive.ObjectID) (*TableLedger, error) {
	var ledger TableLedger
	err := db.Collection(TableNameLedger).FindOne(ctx, bson.M{"_id": id}).Decode(&ledger)
	if err != nil {
		return nil, err
	}
	return &ledger, nil
}

func (d *ledgerDal) List(ctx context.Context) ([]*TableLedger, error) {
	cursor, err := db.Collection(TableNameLedger).Find(ctx, bson.M{}, options.Find().SetSort(bson.M{"update_time": -1}))
	if err != nil {
		return nil, err
	}
	var ledgers []*TableLedger
	if err := cursor.All(ctx, &ledgers); err != nil {
		return nil, err
	}
	return ledgers, nil
}

func (d *ledgerDal) Update(ctx context.Context, id primitive.ObjectID, set bson.M) error {
	set["update_time"] = time.Now()
	_, err := db.Collection(TableNameLedger).UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": set})
	return err
}

func (d *ledgerDal) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := db.Collection(TableNameLedger).DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (d *ledgerDal) UpdateExchangeRates(ctx context.Context, id primitive.ObjectID, rates []TableExchangeRate) error {
	_, err := db.Collection(TableNameLedger).UpdateOne(ctx, bson.M{"_id": id},
		bson.M{"$set": bson.M{"exchange_rates": rates, "update_time": time.Now()}})
	return err
}

func (d *ledgerDal) AddParticipant(ctx context.Context, ledgerId primitive.ObjectID, participant TableParticipant) error {
	_, err := db.Collection(TableNameLedger).UpdateOne(ctx, bson.M{"_id": ledgerId},
		bson.M{"$push": bson.M{"participants": participant}, "$set": bson.M{"update_time": time.Now()}})
	return err
}

func (d *ledgerDal) UpdateParticipant(ctx context.Context, ledgerId primitive.ObjectID, participantId string, set bson.M) error {
	arrayFilterSet := bson.M{"update_time": time.Now()}
	for k, v := range set {
		arrayFilterSet["participants.$[elem]."+k] = v
	}
	_, err := db.Collection(TableNameLedger).UpdateOne(ctx, bson.M{"_id": ledgerId},
		bson.M{"$set": arrayFilterSet},
		options.Update().SetArrayFilters(options.ArrayFilters{
			Filters: []interface{}{bson.M{"elem.id": participantId}},
		}))
	return err
}

func (d *ledgerDal) RemoveParticipant(ctx context.Context, ledgerId primitive.ObjectID, participantId string) error {
	_, err := db.Collection(TableNameLedger).UpdateOne(ctx, bson.M{"_id": ledgerId},
		bson.M{"$pull": bson.M{"participants": bson.M{"id": participantId}}, "$set": bson.M{"update_time": time.Now()}})
	return err
}

func IsNoDocuments(err error) bool {
	return err == mongo.ErrNoDocuments
}
