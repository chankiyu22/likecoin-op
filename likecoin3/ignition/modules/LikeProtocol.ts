import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import LikeProtocolV0Module from "./LikeProtocolV0";
import BookNFTModule from "./BookNFTV1";

const LikeProtocolModule = buildModule("LikeProtocolModule", (m) => {
  const { likeProtocolV0 } = m.useModule(LikeProtocolV0Module);
  const { bookNFTImpl } = m.useModule(BookNFTModule);

  const initOwner = m.staticCall(likeProtocolV0, "owner");
  const likeProtocolImpl = m.contract("LikeProtocol", [], {
    id: "LikeProtocolImpl",
  });

  const upgradeToData = m.encodeFunctionCall(likeProtocolImpl, "upgradeTo", [
    bookNFTImpl,
  ]);
  m.call(likeProtocolV0, "upgradeToAndCall", [likeProtocolImpl, upgradeToData]);

  const likeProtocol = m.contractAt("LikeProtocol", likeProtocolV0);
  m.call(likeProtocol, "setRoyaltyReceiver", [initOwner]);

  return {
    likeProtocolImpl,
    likeProtocol,
    bookNFTImpl,
  };
});

export default LikeProtocolModule;
