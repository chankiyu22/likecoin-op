import { ViemIgnitionHelper } from "@nomicfoundation/hardhat-ignition-viem/dist/src/viem-ignition-helper";
import { PublicClient } from "@nomicfoundation/hardhat-viem/src/types";
import { CallExecutor } from "./calls";
import { Simulation } from "./models/schema";
import { deployVeLike, setupFundLikecoin } from "./setup";
import { StateRetriever } from "./state";

export async function simulate(
  ignition: ViemIgnitionHelper,
  publicClient: PublicClient,
  simulate: Simulation,
) {
  const { likecoin, veLike, veLikeReward } = await deployVeLike(
    ignition,
    simulate.setup,
  );

  const accounts = simulate.setup.accounts.map((account) => account.address);

  for (const account of simulate.setup.accounts) {
    await setupFundLikecoin(
      likecoin,
      simulate.setup.deployer,
      account.address,
      account.likecoin,
    );
  }

  const callExecutor = new CallExecutor(
    publicClient,
    likecoin,
    veLike,
    veLikeReward,
    simulate.setup.deployer,
  );
  const stateRetriever = new StateRetriever(likecoin, veLike, veLikeReward);

  for (const step of simulate.steps) {
    const { calls } = step;
    const txHash = await callExecutor.execute(calls[0], ...calls.slice(1));
    await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
  }

  const state = await stateRetriever.retrieve(accounts);

  return {
    state,
  };
}
