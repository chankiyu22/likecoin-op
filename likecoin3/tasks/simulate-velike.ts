import fs from "fs";
import { Log, Block } from "viem";
import { task } from "hardhat/config";
import yaml from "js-yaml";
import { SimulationSchema, State } from "../simulate/velike/models/schema";
import { simulate } from "../simulate/velike/simulate";

type stateMarshaling = {
  likecoinBalance: Record<`0x${string}`, string | null>;
  veLikeBalance: Record<`0x${string}`, string | null>;
  claimedReward: Record<`0x${string}`, string | null>;
  pendingReward: Record<`0x${string}`, string | null>;
};

function marshalState(state: State): stateMarshaling {
  return {
    likecoinBalance: Object.fromEntries(
      Object.entries(state.likecoinBalance).map(([key, value]) => [
        key,
        value != null ? value.toString() : null,
      ]),
    ),
    veLikeBalance: Object.fromEntries(
      Object.entries(state.veLikeBalance).map(([key, value]) => [
        key,
        value != null ? value.toString() : null,
      ]),
    ),
    claimedReward: Object.fromEntries(
      Object.entries(state.claimedReward).map(([key, value]) => [
        key,
        value != null ? value.toString() : null,
      ]),
    ),
    pendingReward: Object.fromEntries(
      Object.entries(state.pendingReward).map(([key, value]) => [
        key,
        value != null ? value.toString() : null,
      ]),
    ),
  };
}

function marshalSimulationResult({ state }: { state: State }) {
  return {
    state: marshalState(state),
  };
}

task("simulate:velike", "Simulate the velike contract")
  .addOptionalParam("outputfile", "The output file to write the results to")
  .addPositionalParam("simulationfile", "The simulation file to run")
  .setAction(async ({ simulationfile, outputfile }, { ignition, viem }) => {
    const publicClient = await viem.getPublicClient();

    const simulationData = fs.readFileSync(simulationfile, "utf8");
    const simulation = SimulationSchema.parse(yaml.load(simulationData));
    const simulationResult = await simulate(ignition, publicClient, simulation);
    const marshaledSimulationResult = marshalSimulationResult(simulationResult);

    if (outputfile) {
      fs.writeFileSync(
        outputfile,
        JSON.stringify(marshaledSimulationResult, null, 2),
      );
    } else {
      console.log(JSON.stringify(marshaledSimulationResult));
    }
  });
