import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import LikeProtocolModule from "./LikeProtocol";
import LikeCollectiveModule from "./LikeCollective";

const AllInOneModule = buildModule("AllInOneModule", (m) => {
  const likeProtocolModule = m.useModule(LikeProtocolModule);
  const likeCollectiveModule = m.useModule(LikeCollectiveModule);

  return {
    ...likeProtocolModule,
    ...likeCollectiveModule,
  };
});

export default AllInOneModule;
