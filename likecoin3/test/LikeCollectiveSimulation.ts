import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import fs from "fs";
import yaml from "js-yaml";
import { CallExecutor } from "../simulate/likecollective/calls";
import { EventRetriever } from "../simulate/likecollective/events";
import { SimulationSchema } from "../simulate/likecollective/models/schema";
import { setupFundLikecoin } from "../simulate/likecollective/setup";
import { StateRetriever } from "../simulate/likecollective/state";
import { deployCollective } from "./factory";

const testDataFiles = fs.readdirSync("simulate/likecollective/simulations");
for (const testDataFile of testDataFiles) {
  describe(`LikeCollectiveSimulation:${testDataFile}`, async function () {
    it("should simulate the likecollective contract", async function () {
      const { likecoin, likeCollective, likeStakePosition, publicClient } =
        await loadFixture(deployCollective);

      const callExecutor = new CallExecutor(
        publicClient,
        likecoin,
        likeCollective,
        likeStakePosition,
      );
      const eventRetriever = new EventRetriever(
        publicClient,
        likeCollective,
        likeStakePosition,
      );
      const stateRetriever = new StateRetriever(
        likeCollective,
        likeStakePosition,
        likecoin,
      );

      let currentBlock = await publicClient.getBlockNumber();

      const testData = fs.readFileSync(
        `simulate/likecollective/simulations/${testDataFile}`,
        "utf8",
      );
      const testDataJson = yaml.load(testData);
      const {
        name: testDataName,
        setup,
        steps,
      } = SimulationSchema.parse(testDataJson);
      for (const account of setup.accounts) {
        await setupFundLikecoin(
          likecoin,
          setup.deployer,
          account.address,
          account.likecoin,
        );
      }
      for (const step of steps) {
        const { name, calls, expectedLogs, expectedState } = step;
        const txHash = await callExecutor.execute(calls[0], ...calls.slice(1));
        const txReceipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });
        const logs = await eventRetriever.getEvents(
          txReceipt.blockNumber,
          currentBlock + 1n,
        );
        expect(logs.length, `${testDataFile} ${testDataName} ${name}`).to.equal(
          expectedLogs.length,
        );

        for (let i = 0; i < logs.length; i++) {
          const log = logs[i];
          const expectedLog = expectedLogs[i];
          expect(log.log, `${testDataFile} ${testDataName} ${name}`).to.include(
            expectedLog,
          );
        }

        const state = await stateRetriever.retrieve();
        expect(state, `${testDataFile} ${testDataName} ${name}`).to.deep.equal(
          expectedState,
        );

        currentBlock = txReceipt.blockNumber;
      }
    });
  });
}
