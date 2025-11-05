package evm

import (
	"context"
	"errors"
	"math/big"

	"likecollective-indexer/internal/evm/like_collective"
	"likecollective-indexer/internal/evm/like_stake_position"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind/v2"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

type QueryClient interface {
	QueryBookNFTStakingLogs(
		ctx context.Context,
		bookNFTAddress common.Address,
		startBlock *big.Int,
		endBlock *big.Int,
	) ([]types.Log, error)

	QueryBookNFTLikeCollectiveLogs(
		ctx context.Context,
		bookNFTAddress common.Address,
		startBlock *big.Int,
		endBlock *big.Int,
	) ([]types.Log, error)

	QueryLikeCollectiveAllRewardClaimedLogs(
		ctx context.Context,
		startBlock *big.Int,
		endBlock *big.Int,
	) ([]types.Log, error)

	QueryStakePositionTransferredLogs(
		ctx context.Context,
		startBlock *big.Int,
		endBlock *big.Int,
	) ([]types.Log, error)

	GetHeaderMapByBlockNumbers(
		ctx context.Context,
		blockNumbers []uint64,
	) (map[uint64]*types.Header, error)

	GetHeaderByBlockNumber(
		ctx context.Context,
		blockNumber uint64,
	) (*types.Header, error)
}

type queryClient struct {
	likeCollectiveAddress    common.Address
	likeStakePositionAddress common.Address
	likeStakePositionClient  *like_stake_position.LikeStakePosition
	client                   *ethclient.Client
}

func NewQueryClient(
	likeCollectiveAddress common.Address,
	likeStakePositionAddress common.Address,
	client *ethclient.Client,
) (QueryClient, error) {
	likeStakePositionClient, err := like_stake_position.NewLikeStakePosition(
		likeStakePositionAddress,
		client,
	)
	if err != nil {
		return nil, err
	}

	return &queryClient{
		likeCollectiveAddress,
		likeStakePositionAddress,
		likeStakePositionClient,
		client,
	}, nil
}

func (q *queryClient) QueryBookNFTStakingLogs(
	ctx context.Context,
	bookNFTAddress common.Address,
	startBlock *big.Int,
	endBlock *big.Int,
) ([]types.Log, error) {
	bookNFTLikeCollectiveLogs, err := q.QueryBookNFTLikeCollectiveLogs(ctx, bookNFTAddress, startBlock, endBlock)
	if err != nil {
		return nil, err
	}

	likeCollectiveAllRewardClaimedLogs, err := q.QueryLikeCollectiveAllRewardClaimedLogs(ctx, startBlock, endBlock)
	if err != nil {
		return nil, err
	}

	bookNFTLikeCollectiveAllRewardClaimedLogs := make([]types.Log, 0)
	for _, log := range likeCollectiveAllRewardClaimedLogs {
		allRewardClaimedEvent := new(like_collective.LikeCollectiveAllRewardClaimed)
		if err := LikeCollectiveLogConverter.UnpackLog(log, allRewardClaimedEvent); err != nil {
			return nil, err
		}

		for _, rewardData := range allRewardClaimedEvent.RewardedAmount {
			if rewardData.BookNFT == bookNFTAddress {
				bookNFTLikeCollectiveAllRewardClaimedLogs = append(bookNFTLikeCollectiveAllRewardClaimedLogs, log)
			}
		}
	}

	stakePositionTransferredLogs, err := q.QueryStakePositionTransferredLogs(ctx, startBlock, endBlock)
	if err != nil {
		return nil, err
	}
	bookNFTStakePositionTransferredLogs := make([]types.Log, 0)
	for _, log := range stakePositionTransferredLogs {
		transferEvent := new(like_stake_position.LikeStakePositionTransfer)
		if err := LikeStakePositionLogConverter.UnpackLog(log, transferEvent); err != nil {
			return nil, err
		}

		position, err := q.likeStakePositionClient.GetPosition(&bind.CallOpts{
			Context:     ctx,
			BlockNumber: big.NewInt(0).SetUint64(uint64(log.BlockNumber)),
		}, transferEvent.TokenId)
		if err != nil {
			return nil, err
		}

		if position.BookNFT == bookNFTAddress {
			bookNFTStakePositionTransferredLogs = append(bookNFTStakePositionTransferredLogs, log)
		}
	}

	return append(
		bookNFTLikeCollectiveLogs,
		append(bookNFTLikeCollectiveAllRewardClaimedLogs,
			bookNFTStakePositionTransferredLogs...,
		)...,
	), nil
}

func (q *queryClient) QueryBookNFTLikeCollectiveLogs(
	ctx context.Context,
	bookNFTAddress common.Address,
	startBlock *big.Int,
	endBlock *big.Int,
) ([]types.Log, error) {
	stakedEvent, ok := LikeCollectiveABI.Events["Staked"]
	if !ok {
		return nil, errors.New("staked event not found")
	}

	unstakedEvent, ok := LikeCollectiveABI.Events["Unstaked"]
	if !ok {
		return nil, errors.New("unstaked event not found")
	}

	rewardClaimedEvent, ok := LikeCollectiveABI.Events["RewardClaimed"]
	if !ok {
		return nil, errors.New("reward claimed event not found")
	}

	rewardDepositedEvent, ok := LikeCollectiveABI.Events["RewardDeposited"]
	if !ok {
		return nil, errors.New("reward deposited event not found")
	}

	logs, err := q.client.FilterLogs(ctx, ethereum.FilterQuery{
		FromBlock: startBlock,
		ToBlock:   endBlock,
		Addresses: []common.Address{q.likeCollectiveAddress},
		Topics: [][]common.Hash{{
			stakedEvent.ID,
			unstakedEvent.ID,
			rewardClaimedEvent.ID,
			rewardDepositedEvent.ID,
		}, {
			common.BytesToHash(bookNFTAddress.Bytes()),
		}},
	})

	if err != nil {
		return nil, err
	}
	return logs, nil
}

func (q *queryClient) QueryLikeCollectiveAllRewardClaimedLogs(
	ctx context.Context,
	startBlock *big.Int,
	endBlock *big.Int,
) ([]types.Log, error) {
	allRewardClaimedEvent, ok := LikeCollectiveABI.Events["AllRewardClaimed"]
	if !ok {
		return nil, errors.New("all reward claimed event not found")
	}

	return q.client.FilterLogs(ctx, ethereum.FilterQuery{
		FromBlock: startBlock,
		ToBlock:   endBlock,
		Addresses: []common.Address{q.likeCollectiveAddress},
		Topics:    [][]common.Hash{{allRewardClaimedEvent.ID}},
	})
}

func (q *queryClient) QueryStakePositionTransferredLogs(
	ctx context.Context,
	startBlock *big.Int,
	endBlock *big.Int,
) ([]types.Log, error) {
	transferEvent, ok := LikeStakePositionABI.Events["Transfer"]
	if !ok {
		return nil, errors.New("transfer event not found")
	}

	return q.client.FilterLogs(ctx, ethereum.FilterQuery{
		FromBlock: startBlock,
		ToBlock:   endBlock,
		Addresses: []common.Address{q.likeStakePositionAddress},
		Topics:    [][]common.Hash{{transferEvent.ID}},
	})
}

func (q *queryClient) GetHeaderByBlockNumber(
	ctx context.Context,
	blockNumber uint64,
) (*types.Header, error) {
	return q.client.HeaderByNumber(ctx, new(big.Int).SetUint64(blockNumber))
}

func (q *queryClient) GetHeaderMapByBlockNumbers(
	ctx context.Context,
	blockNumbers []uint64,
) (map[uint64]*types.Header, error) {
	headerMap := make(map[uint64]*types.Header)

	for _, blockNumber := range blockNumbers {
		_, ok := headerMap[blockNumber]
		if ok {
			continue
		}

		header, err := q.GetHeaderByBlockNumber(ctx, blockNumber)
		if err != nil {
			return nil, err
		}
		headerMap[header.Number.Uint64()] = header
	}

	return headerMap, nil
}
