package model

import (
	"likenft-indexer/ent"
	"likenft-indexer/internal/util/ordered"
)

var cmpBlockNumber ordered.Comparator[*ent.EVMEvent] = func(a, b *ent.EVMEvent) int {
	return ordered.Normalize(a.BlockNumber, b.BlockNumber)
}
var cmpTransactionIndex ordered.Comparator[*ent.EVMEvent] = func(a, b *ent.EVMEvent) int {
	return ordered.Normalize(a.TransactionIndex, b.TransactionIndex)
}

var topic0OrderMap map[string]int = map[string]int{
	// Need to special handle the new book nft event and ownership transferred event
	// The ownership transferred event will be emit earlier than new booknft
	// and there will be no nft class when processing OwnershipTransferred.
	// Thus should process new book nft first
	"NewBookNFT":           0,
	"OwnershipTransferred": 1,
}

var cmpTopic0 ordered.Comparator[*ent.EVMEvent] = func(a, b *ent.EVMEvent) int {
	orderA, ok := topic0OrderMap[a.Topic0]
	if !ok {
		return 1
	}
	orderB, ok := topic0OrderMap[b.Topic0]
	if !ok {
		return -1
	}
	return ordered.Normalize(orderA, orderB)
}

var cmpLogIndex ordered.Comparator[*ent.EVMEvent] = func(a, b *ent.EVMEvent) int {
	return ordered.Normalize(a.LogIndex, b.LogIndex)
}

var EvmEventsProcessingComparator = ordered.CombineComparators(
	cmpBlockNumber,
	cmpTransactionIndex,
	cmpTopic0,
	cmpLogIndex,
)
