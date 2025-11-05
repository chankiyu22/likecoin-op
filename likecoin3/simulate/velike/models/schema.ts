import { z } from "zod";

const AddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((val) => val as `0x${string}`);
export type Address = z.infer<typeof AddressSchema>;

const BigIntStringSchema = z
  .string()
  .regex(/^\d+$/)
  .transform((val) => BigInt(val));
export type BigIntString = z.infer<typeof BigIntStringSchema>;

const DepositCallParamsSchema = z.object({
  type: z.literal("deposit"),
  assets: BigIntStringSchema,
  receiver: AddressSchema,
});
export type DepositCallParams = z.infer<typeof DepositCallParamsSchema>;

const MintCallParamsSchema = z.object({
  type: z.literal("mint"),
  shares: BigIntStringSchema,
  receiver: AddressSchema,
});
export type MintCallParams = z.infer<typeof MintCallParamsSchema>;

const WithdrawCallParamsSchema = z.object({
  type: z.literal("withdraw"),
  assets: BigIntStringSchema,
  receiver: AddressSchema,
  owner: AddressSchema,
});
export type WithdrawCallParams = z.infer<typeof WithdrawCallParamsSchema>;

const RedeemCallParamsSchema = z.object({
  type: z.literal("redeem"),
  shares: BigIntStringSchema,
  receiver: AddressSchema,
  owner: AddressSchema,
});
export type RedeemCallParams = z.infer<typeof RedeemCallParamsSchema>;

const ClaimRewardCallParamsSchema = z.object({
  type: z.literal("claimReward"),
  account: AddressSchema,
});
export type ClaimRewardCallParams = z.infer<typeof ClaimRewardCallParamsSchema>;

const RestakeRewardCallParamsSchema = z.object({
  type: z.literal("restakeReward"),
  account: AddressSchema,
});
export type RestakeRewardCallParams = z.infer<
  typeof RestakeRewardCallParamsSchema
>;

const AddRewardCallParamsSchema = z.object({
  type: z.literal("addReward"),
  drawer: AddressSchema,
  rewardAmount: BigIntStringSchema,
  startTime: BigIntStringSchema,
  endTime: BigIntStringSchema,
});
export type AddRewardCallParams = z.infer<typeof AddRewardCallParamsSchema>;

const AddRewardWithDurationCallParamsSchema = z.object({
  type: z.literal("addRewardWithDuration"),
  drawer: AddressSchema,
  rewardAmount: BigIntStringSchema,
  startTime: BigIntStringSchema.optional(),
  durationSeconds: BigIntStringSchema,
});
export type AddRewardWithDurationCallParams = z.infer<
  typeof AddRewardWithDurationCallParamsSchema
>;

const WaitCallParamsSchema = z.object({
  type: z.literal("wait"),
  milliseconds: z.number(),
});
export type WaitCallParams = z.infer<typeof WaitCallParamsSchema>;

const CallParamsSchema = z.discriminatedUnion("type", [
  DepositCallParamsSchema,
  MintCallParamsSchema,
  WithdrawCallParamsSchema,
  RedeemCallParamsSchema,
  ClaimRewardCallParamsSchema,
  RestakeRewardCallParamsSchema,
  AddRewardCallParamsSchema,
  AddRewardWithDurationCallParamsSchema,
  WaitCallParamsSchema,
]);
export type CallParams = z.infer<typeof CallParamsSchema>;

const StateSchema = z.object({
  likecoinBalance: z.record(AddressSchema, BigIntStringSchema),
  veLikeBalance: z.record(AddressSchema, BigIntStringSchema),
  claimedReward: z.record(AddressSchema, BigIntStringSchema),
  pendingReward: z.record(AddressSchema, BigIntStringSchema),
});
export type State = z.infer<typeof StateSchema>;

const SetupSchema = z.object({
  deployer: AddressSchema,
  accounts: z.array(
    z.object({
      address: AddressSchema,
      likecoin: BigIntStringSchema,
    }),
  ),
});
export type Setup = z.infer<typeof SetupSchema>;

export const SimulationSchema = z.object({
  name: z.string(),
  setup: SetupSchema,
  steps: z.array(
    z.object({
      name: z.string(),
      calls: z.array(CallParamsSchema),
      expectedState: StateSchema,
    }),
  ),
});
export type Simulation = z.infer<typeof SimulationSchema>;
