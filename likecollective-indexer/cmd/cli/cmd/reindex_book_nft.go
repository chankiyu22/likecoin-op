package cmd

import (
	"fmt"
	"log/slog"
	"math/big"
	"strconv"

	"likecollective-indexer/ent"
	clicontext "likecollective-indexer/internal/cli/context"
	"likecollective-indexer/internal/database"
	"likecollective-indexer/internal/evm"
	"likecollective-indexer/internal/evm/util/logconverter"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/spf13/cobra"
)

/**
./cli reindex-book-nft 0x3F6aF09987148aaf2B7f74f3C9cCd9DF321a1102 31390801 \
	--rpc https://sepolia.base.org \
	--like-collective-address 0x4506Ac2dD1e9A470d92a3D1656E1a99C676E1c8E \
	--like-stake-position-address 0x508610D3009cda82Ac1a40D2b322Ed31932D16b1 \
	--end-block 31466106 \
	--query-event-block-limit 500
*/

var reindexBookNFTCmd = &cobra.Command{
	Use:   "reindex-book-nft <book-nft-address> <start-block>",
	Short: "Reindex Book NFT",
	Long:  `Reindex Book NFT`,
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		envCfg := clicontext.ConfigFromContext(cmd.Context())
		logger := slog.New(slog.Default().Handler())

		// Parse arguments

		bookNFTAddressStr := args[0]
		bookNFTAddress := common.HexToAddress(bookNFTAddressStr)

		startBlockStr := args[1]
		startBlockUint64, err := strconv.ParseUint(startBlockStr, 10, 64)
		if err != nil {
			return fmt.Errorf("failed to parse start block: %w", err)
		}
		startBlock := big.NewInt(0).SetUint64(startBlockUint64)

		ethNetworkPublicRPCURL, err := cmd.Flags().GetString("rpc")
		if err != nil {
			return fmt.Errorf("failed to get rpc: %w", err)
		}
		if ethNetworkPublicRPCURL == "" {
			ethNetworkPublicRPCURL = envCfg.EthNetworkPublicRPCURL
		}

		likeCollectiveAddressStr, err := cmd.Flags().GetString("like-collective-address")
		if err != nil {
			return fmt.Errorf("failed to get like collective address: %w", err)
		}
		if likeCollectiveAddressStr == "" {
			likeCollectiveAddressStr = envCfg.LikeCollectiveAddress
		}
		likeCollectiveAddress := common.HexToAddress(likeCollectiveAddressStr)

		likeStakePositionAddressStr, err := cmd.Flags().GetString("like-stake-position-address")
		if err != nil {
			return fmt.Errorf("failed to get like stake position address: %w", err)
		}
		if likeStakePositionAddressStr == "" {
			likeStakePositionAddressStr = envCfg.LikeStakePositionAddress
		}
		likeStakePositionAddress := common.HexToAddress(likeStakePositionAddressStr)

		endBlockUint64, err := cmd.Flags().GetUint64("end-block")
		if err != nil {
			return fmt.Errorf("failed to get end block: %w", err)
		}
		var endBlock *big.Int
		if endBlockUint64 != 0 {
			endBlock = big.NewInt(0).SetUint64(endBlockUint64)
		}

		queryEventBlockLimitUint64, err := cmd.Flags().GetUint64("query-event-block-limit")
		if err != nil {
			return fmt.Errorf("failed to get query event block limit: %w", err)
		}
		queryEventBlockLimit := big.NewInt(0).SetUint64(queryEventBlockLimitUint64)

		logger.Info("params",
			"bookNFTAddress", bookNFTAddressStr,
			"startBlock", startBlockStr,
			"ethNetworkPublicRPCURL", ethNetworkPublicRPCURL,
			"likeCollectiveAddress", likeCollectiveAddressStr,
			"likeStakePositionAddress", likeStakePositionAddressStr,
			"endBlock", endBlockUint64,
			"queryEventBlockLimit", queryEventBlockLimitUint64,
		)

		// Setup dependencies

		ethClient, err := ethclient.Dial(ethNetworkPublicRPCURL)
		if err != nil {
			return fmt.Errorf("failed to dial eth client: %w", err)
		}

		queryClient, err := evm.NewQueryClient(
			likeCollectiveAddress,
			likeStakePositionAddress,
			ethClient,
		)
		if err != nil {
			return fmt.Errorf("failed to create query client: %w", err)
		}

		dbService := database.New()
		evmEventRepository := database.MakeEVMEventRepository(dbService)

		// Do work

		if endBlock == nil {
			endBlockUint64, err := ethClient.BlockNumber(cmd.Context())
			if err != nil {
				return fmt.Errorf("failed to get end block: %w", err)
			}
			endBlock = big.NewInt(0).SetUint64(endBlockUint64)
		}

		blockStarts := make([]*big.Int, 0)
		for i := startBlock; i.Cmp(endBlock) < 0; i = big.NewInt(0).Add(i, queryEventBlockLimit) {
			blockStarts = append(blockStarts, i)
		}

		logs := make([]types.Log, 0)

		for i, currentBlockStart := range blockStarts {
			currentBlockEnd := big.NewInt(0).Add(currentBlockStart, queryEventBlockLimit)
			if currentBlockEnd.Cmp(endBlock) > 0 {
				currentBlockEnd = endBlock
			}

			logger.Info(
				"querying book nft staking logs",
				"totalPages", len(blockStarts),
				"currentPage", i+1,
				"blockStart", currentBlockStart.String(),
				"blockEnd", currentBlockEnd.String(),
			)

			currentLogs, err := queryClient.QueryBookNFTStakingLogs(
				cmd.Context(),
				bookNFTAddress,
				currentBlockStart,
				currentBlockEnd,
			)
			if err != nil {
				return fmt.Errorf("failed to query book nft staking logs: %w", err)
			}

			if len(currentLogs) > 0 {
				logger.Info("found logs", "count", len(currentLogs))
				logs = append(logs, currentLogs...)
			}
		}

		if len(logs) == 0 {
			return fmt.Errorf("no logs found")
		}

		blockNumbers := make([]uint64, len(logs))

		for i, log := range logs {
			blockNumbers[i] = log.BlockNumber
		}

		headerMap, err := queryClient.GetHeaderMapByBlockNumbers(cmd.Context(), blockNumbers)
		if err != nil {
			return fmt.Errorf("failed to get header map by block numbers: %w", err)
		}

		likeCollectiveLogConverter := logconverter.NewLogConverter(evm.LikeCollectiveABI)
		likeStakePositionLogConverter := logconverter.NewLogConverter(evm.LikeStakePositionABI)

		evmEvents := make([]*ent.EVMEvent, len(logs))

		for i, log := range logs {
			var (
				evmEvent *ent.EVMEvent
				err      error
			)

			header := headerMap[log.BlockNumber]

			evmEvent, err = likeCollectiveLogConverter.ConvertLogToEvmEvent(log, header)
			if err != nil {
				evmEvent, err = likeStakePositionLogConverter.ConvertLogToEvmEvent(log, header)
				if err != nil {
					return fmt.Errorf("failed to convert log to evm event: %w", err)
				}
			}

			evmEvents[i] = evmEvent
		}

		_, err = evmEventRepository.InsertEvmEventsIfNeeded(cmd.Context(), evmEvents)
		if err != nil {
			return fmt.Errorf("failed to insert evm events: %w", err)
		}

		fmt.Println(len(evmEvents))

		return nil
	},
}

func init() {
	reindexBookNFTCmd.Flags().String("rpc", "", "RPC URL")
	reindexBookNFTCmd.Flags().String("like-collective-address", "", "Like Collective Address")
	reindexBookNFTCmd.Flags().String("like-stake-position-address", "", "Like Stake Position Address")
	reindexBookNFTCmd.Flags().Uint64("end-block", 0, "End Block")
	reindexBookNFTCmd.Flags().Uint64("query-event-block-limit", 1000, "Query Event Block Limit")

	rootCmd.AddCommand(reindexBookNFTCmd)
}
