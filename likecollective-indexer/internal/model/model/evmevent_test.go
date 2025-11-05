package model_test

import (
	"slices"
	"testing"

	"likenft-indexer/ent"
	"likenft-indexer/internal/model"

	. "github.com/smartystreets/goconvey/convey"
)

func TestEvmEventsProcessingComparator(t *testing.T) {
	Convey("Test EvmEventsProcessingComparator", t, func() {
		evmEvents := []*ent.EVMEvent{
			{
				ID:               1,
				BlockNumber:      2790648,
				TransactionIndex: 27,
				LogIndex:         52,
				Topic0:           "OwnershipTransferred",
			},
			{
				ID:               2,
				BlockNumber:      2790648,
				TransactionIndex: 27,
				LogIndex:         53,
				Topic0:           "RoleGranted",
			},
			{
				ID:               3,
				BlockNumber:      2790648,
				TransactionIndex: 27,
				LogIndex:         54,
				Topic0:           "RoleGranted",
			},
			{
				ID:               4,
				BlockNumber:      2790648,
				TransactionIndex: 27,
				LogIndex:         57,
				Topic0:           "Initialized",
			},
			{
				ID:               5,
				BlockNumber:      2790648,
				TransactionIndex: 27,
				LogIndex:         58,
				Topic0:           "NewBookNFT",
			},
		}

		evmEventsInProcessingOrder := slices.Clone(evmEvents)
		slices.SortFunc(evmEventsInProcessingOrder, model.EvmEventsProcessingComparator)

		So(evmEventsInProcessingOrder[0].ID, ShouldEqual, 5)
		So(evmEventsInProcessingOrder[0].Topic0, ShouldEqual, "NewBookNFT")
		So(evmEventsInProcessingOrder[1].ID, ShouldEqual, 1)
		So(evmEventsInProcessingOrder[1].Topic0, ShouldEqual, "OwnershipTransferred")
		So(evmEventsInProcessingOrder[2].ID, ShouldEqual, 2)
		So(evmEventsInProcessingOrder[2].Topic0, ShouldEqual, "RoleGranted")
		So(evmEventsInProcessingOrder[3].ID, ShouldEqual, 3)
		So(evmEventsInProcessingOrder[3].Topic0, ShouldEqual, "RoleGranted")
		So(evmEventsInProcessingOrder[4].ID, ShouldEqual, 4)
		So(evmEventsInProcessingOrder[4].Topic0, ShouldEqual, "Initialized")
	})
}
