import {
  Address,
  createWalletClient,
  custom,
  PublicClient,
  WalletClient,
  WriteContractReturnType,
} from "viem";
import {
  CallParams,
  DepositCallParams,
  MintCallParams,
  WithdrawCallParams,
  RedeemCallParams,
  ClaimRewardCallParams,
  RestakeRewardCallParams,
  WaitCallParams,
  AddRewardCallParams,
  AddRewardWithDurationCallParams,
} from "./models/schema";
import { LikeCoin, VeLike, VeLikeReward } from "./setup";

class DepositCallExecutor {
  constructor(
    private readonly veLike: VeLike,
    private readonly likeCoin: LikeCoin,
  ) {}

  async execute({
    assets,
    receiver,
  }: DepositCallParams): Promise<WriteContractReturnType> {
    await this.likeCoin.write.approve([this.veLike.address, assets], {
      account: receiver,
    });
    return this.veLike.write.deposit([assets, receiver], {
      account: receiver,
    });
  }
}

class MintCallExecutor {
  constructor(
    private readonly veLike: VeLike,
    private readonly likeCoin: LikeCoin,
  ) {}

  async execute({
    shares,
    receiver,
  }: MintCallParams): Promise<WriteContractReturnType> {
    await this.likeCoin.write.approve([this.veLike.address, shares], {
      account: receiver,
    });
    return this.veLike.write.mint([shares, receiver], {
      account: receiver,
    });
  }
}

class WithdrawCallExecutor {
  constructor(private readonly veLike: VeLike) {}

  async execute({
    assets,
    receiver,
    owner,
  }: WithdrawCallParams): Promise<WriteContractReturnType> {
    return this.veLike.write.withdraw([assets, receiver, owner], {
      account: owner,
    });
  }
}

class RedeemCallExecutor {
  constructor(private readonly veLike: VeLike) {}

  async execute({
    shares,
    receiver,
    owner,
  }: RedeemCallParams): Promise<WriteContractReturnType> {
    return this.veLike.write.redeem([shares, receiver, owner], {
      account: owner,
    });
  }
}

class ClaimRewardCallExecutor {
  constructor(private readonly veLike: VeLike) {}

  async execute({
    account,
  }: ClaimRewardCallParams): Promise<WriteContractReturnType> {
    return this.veLike.write.claimReward([account], {
      account: account,
    });
  }
}

class RestakeRewardCallExecutor {
  constructor(private readonly veLike: VeLike) {}

  async execute({
    account,
  }: RestakeRewardCallParams): Promise<WriteContractReturnType> {
    return this.veLike.write.restakeReward([account], {
      account: account,
    });
  }
}

class AddRewardCallExecutor {
  constructor(private readonly veLikeReward: VeLikeReward) {}

  async execute({
    drawer,
    rewardAmount,
    startTime,
    endTime,
  }: AddRewardCallParams): Promise<WriteContractReturnType> {
    return this.veLikeReward.write.addReward(
      [drawer, rewardAmount, startTime, endTime],
      {
        account: drawer,
      },
    );
  }
}

class AddRewardWithDurationCallExecutor {
  constructor(
    private readonly publicClient: PublicClient,
    private readonly veLikeReward: VeLikeReward,
  ) {}

  async execute({
    drawer,
    rewardAmount,
    durationSeconds,
    startTime,
  }: AddRewardWithDurationCallParams): Promise<WriteContractReturnType> {
    const block = await this.publicClient.getBlock();
    const blockTime = block.timestamp;
    const _startTime = startTime ?? blockTime;
    const endTime = _startTime + durationSeconds;
    console.log(
      `Block time: ${blockTime}, Start time: ${_startTime}, End time: ${endTime}`,
    );
    return this.veLikeReward.write.addReward(
      [drawer, rewardAmount, _startTime, endTime],
      {
        account: drawer,
      },
    );
  }
}

class WaitCallExecutor {
  constructor(
    private readonly publicClient: PublicClient,
    private readonly mineBlockAccount: Address,
  ) {}

  async execute({
    milliseconds,
  }: WaitCallParams): Promise<WriteContractReturnType> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
    const w = createWalletClient({
      transport: custom(this.publicClient.transport),
    });
    const tx = await w.sendTransaction({
      account: this.mineBlockAccount,
      chain: this.publicClient.chain,
      to: "0x0000000000000000000000000000000000000000",
      value: 0n,
    });
    return tx;
  }
}

export class CallExecutor {
  depositCallExecutor: DepositCallExecutor;
  mintCallExecutor: MintCallExecutor;
  withdrawCallExecutor: WithdrawCallExecutor;
  redeemCallExecutor: RedeemCallExecutor;
  claimRewardCallExecutor: ClaimRewardCallExecutor;
  restakeRewardCallExecutor: RestakeRewardCallExecutor;
  addRewardCallExecutor: AddRewardCallExecutor;
  addRewardWithDurationCallExecutor: AddRewardWithDurationCallExecutor;
  waitCallExecutor: WaitCallExecutor;

  constructor(
    publicClient: PublicClient,
    likeCoin: LikeCoin,
    veLike: VeLike,
    veLikeReward: VeLikeReward,
    mineBlockAccount: Address,
  ) {
    this.depositCallExecutor = new DepositCallExecutor(veLike, likeCoin);
    this.mintCallExecutor = new MintCallExecutor(veLike, likeCoin);
    this.withdrawCallExecutor = new WithdrawCallExecutor(veLike);
    this.redeemCallExecutor = new RedeemCallExecutor(veLike);
    this.claimRewardCallExecutor = new ClaimRewardCallExecutor(veLike);
    this.restakeRewardCallExecutor = new RestakeRewardCallExecutor(veLike);
    this.addRewardCallExecutor = new AddRewardCallExecutor(veLikeReward);
    this.addRewardWithDurationCallExecutor =
      new AddRewardWithDurationCallExecutor(publicClient, veLikeReward);
    this.waitCallExecutor = new WaitCallExecutor(
      publicClient,
      mineBlockAccount,
    );
  }

  async executeSingle(callParam: CallParams): Promise<WriteContractReturnType> {
    switch (callParam.type) {
      case "deposit":
        return this.depositCallExecutor.execute(callParam);
      case "mint":
        return this.mintCallExecutor.execute(callParam);
      case "withdraw":
        return this.withdrawCallExecutor.execute(callParam);
      case "redeem":
        return this.redeemCallExecutor.execute(callParam);
      case "claimReward":
        return this.claimRewardCallExecutor.execute(callParam);
      case "restakeReward":
        return this.restakeRewardCallExecutor.execute(callParam);
      case "addReward":
        return this.addRewardCallExecutor.execute(callParam);
      case "addRewardWithDuration":
        return this.addRewardWithDurationCallExecutor.execute(callParam);
      case "wait":
        return this.waitCallExecutor.execute(callParam);
    }
    throw new Error(`Unknown call params: ${callParam}`);
  }

  async execute(
    callParam: CallParams,
    ...callParams: CallParams[]
  ): Promise<WriteContractReturnType> {
    let txHash = await this.executeSingle(callParam);
    for (const callParam of callParams) {
      txHash = await this.executeSingle(callParam);
    }
    return txHash;
  }
}
