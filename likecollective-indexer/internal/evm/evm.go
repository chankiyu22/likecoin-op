package evm

import (
	"likecollective-indexer/internal/evm/like_collective"
	"likecollective-indexer/internal/evm/like_stake_position"
	"likecollective-indexer/internal/evm/util/logconverter"

	"github.com/ethereum/go-ethereum/accounts/abi"
)

var (
	LikeCollectiveABI    *abi.ABI
	LikeStakePositionABI *abi.ABI

	LikeCollectiveLogConverter    *logconverter.LogConverter
	LikeStakePositionLogConverter *logconverter.LogConverter
)

func init() {
	var err error

	LikeCollectiveABI, err = like_collective.LikeCollectiveMetaData.GetAbi()
	if err != nil {
		panic(err)
	}
	LikeCollectiveLogConverter = logconverter.NewLogConverter(LikeCollectiveABI)

	LikeStakePositionABI, err = like_stake_position.LikeStakePositionMetaData.GetAbi()
	if err != nil {
		panic(err)
	}
	LikeStakePositionLogConverter = logconverter.NewLogConverter(LikeStakePositionABI)
}
