// scripts/deploy.js
// Deploy QRStore.sol to Ethereum Sepolia testnet using Hardhat.
//
// Usage:
//   SEPOLIA_RPC_URL=<url> PRIVATE_KEY=<0x…> npx hardhat run scripts/deploy.js --network sepolia
//
// After deployment the contract address is written to deployments/sepolia.json
// so that the Python backend and front-end can pick it up automatically.

const { ethers, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("  GodWorld.org · QRStore Deployment");
  console.log("=".repeat(60));
  console.log(`Network  : ${network.name}`);
  console.log(`Deployer : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance  : ${ethers.formatEther(balance)} ETH`);
  console.log("-".repeat(60));

  if (balance === 0n) {
    throw new Error(
      "Deployer has zero ETH. " +
      "Top up your Sepolia wallet at https://sepoliafaucet.com before deploying."
    );
  }

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log("Deploying QRStore…");
  const QRStore = await ethers.getContractFactory("QRStore");
  const qrStore = await QRStore.deploy();
  await qrStore.waitForDeployment();

  const contractAddress = await qrStore.getAddress();
  const deployTx        = qrStore.deploymentTransaction();

  console.log(`✅  QRStore deployed to : ${contractAddress}`);
  console.log(`    Transaction hash    : ${deployTx.hash}`);
  console.log(`    Block explorer      : https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log("=".repeat(60));

  // ── Persist deployment info ───────────────────────────────────────────────
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const info = {
    network:         network.name,
    contractName:    "QRStore",
    address:         contractAddress,
    deployer:        deployer.address,
    transactionHash: deployTx.hash,
    deployedAt:      new Date().toISOString(),
    blockExplorer:   `https://sepolia.etherscan.io/address/${contractAddress}`,
  };

  const outFile = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(info, null, 2));
  console.log(`Deployment info saved to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
