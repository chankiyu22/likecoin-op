import { ethers } from "hardhat";
import { TransactionReceipt } from "ethers";

async function waitForConfirmations(
  receipt: TransactionReceipt,
  targetConfirmations: number
) {
  for (
    let confirmations = await receipt.confirmations();
    confirmations < targetConfirmations;
    confirmations = await receipt.confirmations()
  ) {
    console.log(
      `Awaiting confirmations... ${confirmations}/${targetConfirmations}`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function fundOperator() {
  let CONFIRMATIONS_TO_WAIT = 5;
  if (process.env.CONFIRMATIONS_TO_WAIT) {
    CONFIRMATIONS_TO_WAIT = parseInt(process.env.CONFIRMATIONS_TO_WAIT, 10);
  }

  console.log("Funding operator");
  const funderKey = process.env.LOCALHOST_FUNDING_WALLET_PRIVATE_KEY;
  if (!funderKey) {
    throw new Error("LOCALHOST_FUNDING_WALLET_PRIVATE_KEY is not set");
  }
  const wallet = new ethers.Wallet(funderKey, ethers.provider);

  const signer = await ethers.provider.getSigner();

  const operatorAddress = process.env.OPERATOR_ADDRESS || signer.address;
  if (!operatorAddress) {
    throw new Error("OPERATOR_ADDRESS is not set");
  }
  console.log("Funding operator address", operatorAddress);
  const payload = {
    to: operatorAddress,
    value: ethers.parseEther("12.0"), // Sending 1 ETH
  };
  const tx = await wallet.sendTransaction(payload);
  console.log("Transaction hash", tx.hash);
  const receipt = await tx.wait();
  console.log("Transaction receipt", receipt);

  if (receipt == null) {
    throw new Error("Transaction receipt is null");
  }

  await waitForConfirmations(receipt, CONFIRMATIONS_TO_WAIT);

  const signerETH = await ethers.provider.getBalance(signer.address);
  console.log("Operator address balance", signerETH);
}

export default fundOperator;