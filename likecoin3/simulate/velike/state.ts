import { Address, State } from "./models/schema";
import { VeLike, LikeCoin, VeLikeReward } from "./setup";

type Account = Address;

export class StateRetriever {
  constructor(
    private readonly likeCoin: LikeCoin,
    private readonly veLike: VeLike,
    private readonly veLikeReward: VeLikeReward,
  ) {}

  retrieveAccounts(state: State): Account[] {
    return [
      ...new Set([
        ...Object.keys(state.likecoinBalance).map(
          (address) => address as Address,
        ),
        ...Object.keys(state.veLikeBalance).map(
          (address) => address as Address,
        ),
        ...Object.keys(state.claimedReward).map(
          (address) => address as Address,
        ),
        ...Object.keys(state.pendingReward).map(
          (address) => address as Address,
        ),
      ]),
    ];
  }

  async retrieve(accounts: Account[]): Promise<State> {
    const state: State = {
      likecoinBalance: {},
      veLikeBalance: {},
      claimedReward: {},
      pendingReward: {},
    };

    for (const account of accounts) {
      state.likecoinBalance[account] = await this.likeCoin.read.balanceOf([
        account,
      ]);
      state.veLikeBalance[account] = await this.veLike.read.balanceOf([
        account,
      ]);
      state.claimedReward[account] =
        await this.veLikeReward.read.getClaimedReward([account]);
      state.pendingReward[account] = await this.veLike.read.getPendingReward([
        account,
      ]);
    }

    return state;
  }
}
