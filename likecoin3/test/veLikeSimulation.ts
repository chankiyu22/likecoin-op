import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import fs from "fs";
import yaml from "js-yaml";
import { SimulationSchema } from "../simulate/velike/models/schema";
import { setupFundLikecoin } from "../simulate/velike/setup";
import { StateRetriever } from "../simulate/velike/state";
import { deployVeLikeReward } from "./factory";
import { CallExecutor } from "../simulate/velike/calls";

const testDataFiles = fs.readdirSync("simulate/likecollective/simulations");
for (const testDataFile of testDataFiles) {
  describe(`VeLikeSimulation:${testDataFile}`, async function () {
    it("should simulate the velike contract", async function () {
      const testData = fs.readFileSync(
        `simulate/velike/simulations/${testDataFile}`,
        "utf8",
      );
      const testDataJson = yaml.load(testData);
      const {
        name: testDataName,
        setup,
        steps,
      } = SimulationSchema.parse(testDataJson);

      const { likecoin, veLike, veLikeReward, testClient, publicClient } =
        await loadFixture(deployVeLikeReward);

      for (const account of setup.accounts) {
        await setupFundLikecoin(
          likecoin,
          setup.deployer,
          account.address,
          account.likecoin,
        );
      }

      const callExecutor = new CallExecutor(
        publicClient,
        likecoin,
        veLike,
        veLikeReward,
        setup.deployer,
      );
      const stateRetriever = new StateRetriever(likecoin, veLike, veLikeReward);

      for (const step of steps) {
        const { name, calls, expectedState } = step;
        await callExecutor.execute(calls[0], ...calls.slice(1));
        await testClient.mine({
          blocks: 1,
        });

        const accounts = stateRetriever.retrieveAccounts(expectedState);
        const block = await publicClient.getBlock();
        console.log(`Block time: ${block.timestamp}}`);
        const state = await stateRetriever.retrieve(accounts);

        expect(state, `${testDataFile} ${testDataName} ${name}`).to.deep.equal(
          expectedState,
        );
      }
    });
  });
}
