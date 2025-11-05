import { ViemIgnitionHelper } from "@nomicfoundation/hardhat-ignition-viem/dist/src/viem-ignition-helper";
import veLikeModule from "../../ignition/modules/veLike";
import { Address, Setup } from "./models/schema";
import veLikeRewardModule from "../../ignition/modules/veLikeReward";

export async function deployVeLike(ignition: ViemIgnitionHelper, setup: Setup) {
  const { veLike, likecoin } = await ignition.deploy(veLikeModule, {
    parameters: {
      veLikeV0Module: {
        initOwner: setup.deployer,
      },
      LikecoinModule: {
        initOwner: setup.deployer,
      },
    },
    defaultSender: setup.deployer,
    strategy: "create2",
  });

  const { veLikeReward } = await ignition.deploy(veLikeRewardModule, {
    parameters: {
      veLikeRewardModule: {
        initOwner: setup.deployer,
      },
    },
    defaultSender: setup.deployer,
    strategy: "create2",
  });

  return {
    likecoin,
    veLike,
    veLikeReward,
  };
}

export async function setupFundLikecoin(
  likecoin: LikeCoin,
  callerAddress: Address,
  fundedAddress: Address,
  amount: bigint,
): Promise<void> {
  await likecoin.write.mint([fundedAddress, amount], {
    account: callerAddress,
  });
}

export type Contracts = Awaited<ReturnType<typeof deployVeLike>>;
export type LikeCoin = Contracts["likecoin"];
export type VeLike = Contracts["veLike"];
export type VeLikeReward = Contracts["veLikeReward"];
