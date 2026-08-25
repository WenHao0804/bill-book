package api

import (
	"context"
	"time"

	"bill-book/biz/model/bill_book"
	"bill-book/consts"
	"bill-book/dal/mongo"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ParticipantService struct{}

func NewParticipantService() *ParticipantService { return &ParticipantService{} }

func (s *ParticipantService) CreateParticipant(ctx context.Context, req *bill_book.CreateParticipantReq) (*bill_book.CreateParticipantResp, *consts.BizCode) {
	ledgerId, err := primitive.ObjectIDFromHex(req.LedgerID)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
	}
	if _, err := mongo.LedgerDal.Get(ctx, ledgerId); err != nil {
		if mongo.IsNoDocuments(err) {
			return nil, consts.NewBizErrFromErr(consts.ErrLedgerNotFound, nil)
		}
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}

	participant := mongo.TableParticipant{
		Id:         primitive.NewObjectID().Hex(),
		Name:       req.Name,
		Color:      req.Color,
		CreateTime: time.Now(),
	}
	if err := mongo.LedgerDal.AddParticipant(ctx, ledgerId, participant); err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrCreateDb, err)
	}

	invalidateLedgerCache(ctx, req.LedgerID)

	resp := bill_book.NewCreateParticipantResp()
	resp.Participant = toDTOParticipant(participant)
	return resp, nil
}

func (s *ParticipantService) UpdateParticipant(ctx context.Context, req *bill_book.UpdateParticipantReq) (*bill_book.UpdateParticipantResp, *consts.BizCode) {
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

	var current *mongo.TableParticipant
	for i := range ledger.Participants {
		if ledger.Participants[i].Id == req.ID {
			current = &ledger.Participants[i]
			break
		}
	}
	if current == nil {
		return nil, consts.NewBizErrFromErr(consts.ErrParticipantNotFound, nil)
	}

	set := map[string]interface{}{}
	if req.IsSetName() {
		current.Name = req.GetName()
		set["name"] = current.Name
	}
	if req.IsSetColor() {
		current.Color = req.GetColor()
		set["color"] = current.Color
	}
	if len(set) > 0 {
		if err := mongo.LedgerDal.UpdateParticipant(ctx, ledgerId, req.ID, set); err != nil {
			return nil, consts.NewBizErrFromErr(consts.ErrUpdateDb, err)
		}
	}

	invalidateLedgerCache(ctx, req.LedgerID)

	resp := bill_book.NewUpdateParticipantResp()
	resp.Participant = toDTOParticipant(*current)
	return resp, nil
}

func (s *ParticipantService) DeleteParticipant(ctx context.Context, req *bill_book.DeleteParticipantReq) (*bill_book.DeleteParticipantResp, *consts.BizCode) {
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
	if !participantExists(ledger, req.ID) {
		return nil, consts.NewBizErrFromErr(consts.ErrParticipantNotFound, nil)
	}

	count, err := mongo.ExpenseDal.CountByParticipant(ctx, ledgerId, req.ID)
	if err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrSearchDb, err)
	}
	if count > 0 {
		return nil, consts.NewBizErrFromErr(consts.ErrParticipantInUse, nil)
	}

	if err := mongo.LedgerDal.RemoveParticipant(ctx, ledgerId, req.ID); err != nil {
		return nil, consts.NewBizErrFromErr(consts.ErrDeleteDb, err)
	}

	invalidateLedgerCache(ctx, req.LedgerID)
	return bill_book.NewDeleteParticipantResp(), nil
}
