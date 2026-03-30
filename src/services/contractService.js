/**
 * Contract Service
 *
 * Manages deployment and interaction with the GOS smart contracts
 * using ethers.js v6.
 *
 * Contract ABIs are expected to be compiled artifacts located in:
 *   artifacts/<ContractName>.abi
 *   artifacts/<ContractName>.bin
 *
 * If artifacts are not found, the service falls back to stub responses
 * so the rest of the API remains functional during development.
 */

const fs      = require('fs');
const path    = require('path');
const { ethers } = require('ethers');

const ARTIFACTS_DIR = path.resolve(__dirname, '../../artifacts');

// Cache of deployed contract instances keyed by contract name
const deployedContracts = new Map();

/**
 * Load the ABI for a named contract from the artifacts directory.
 * @param {string} contractName
 * @returns {Array|null} ABI array or null if not found
 */
function loadAbi(contractName) {
  const abiPath = path.join(ARTIFACTS_DIR, `${contractName}.abi`);
  if (!fs.existsSync(abiPath)) return null;
  return JSON.parse(fs.readFileSync(abiPath, 'utf8'));
}

/**
 * Load the bytecode for a named contract from the artifacts directory.
 * @param {string} contractName
 * @returns {string|null} hex bytecode or null if not found
 */
function loadBytecode(contractName) {
  const binPath = path.join(ARTIFACTS_DIR, `${contractName}.bin`);
  if (!fs.existsSync(binPath)) return null;
  return '0x' + fs.readFileSync(binPath, 'utf8').trim();
}

/**
 * Get a configured ethers provider + signer from environment variables.
 */
function getSigner() {
  const rpcUrl     = process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error(
      'BLOCKCHAIN_RPC_URL and DEPLOYER_PRIVATE_KEY must be set to interact with contracts'
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Deploy a named contract to the configured network.
 * @param {string} contractName
 * @param {Array}  constructorArgs
 * @returns {Promise<object>} deployment info
 */
async function deploy(contractName, constructorArgs = []) {
  const abi      = loadAbi(contractName);
  const bytecode = loadBytecode(contractName);

  if (!abi || !bytecode) {
    // Return a stub during development (before contracts are compiled)
    return {
      contractName,
      address:   '0x0000000000000000000000000000000000000000',
      txHash:    '0x' + '0'.repeat(64),
      status:    'stub — compile contracts first (npm run compile-contracts)',
      deployedAt: new Date().toISOString(),
    };
  }

  const signer  = getSigner();
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy(...constructorArgs);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  deployedContracts.set(contractName, contract);

  return {
    contractName,
    address,
    txHash:    contract.deploymentTransaction()?.hash,
    deployedAt: new Date().toISOString(),
  };
}

/**
 * Derive the environment variable name for a contract address.
 * e.g. "QRStore" → "QRSTORE_CONTRACT_ADDRESS"
 * @param {string} contractName
 * @returns {string}
 */
function contractAddressEnvVar(contractName) {
  return `${contractName.toUpperCase().replace(/-/g, '_')}_CONTRACT_ADDRESS`;
}

/**
 * Call a read-only method on a deployed contract.
 */
async function call(contractName, method, args = []) {
  const abi      = loadAbi(contractName);
  const address  = process.env[contractAddressEnvVar(contractName)];

  if (!abi || !address) {
    return { stub: true, message: 'Contract not yet deployed or ABI not compiled' };
  }

  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  const contract = new ethers.Contract(address, abi, provider);
  return contract[method](...args);
}

/**
 * Send a state-changing transaction to a deployed contract.
 */
async function send(contractName, method, args = []) {
  const abi     = loadAbi(contractName);
  const address = process.env[contractAddressEnvVar(contractName)];

  if (!abi || !address) {
    return { stub: true, message: 'Contract not yet deployed or ABI not compiled' };
  }

  const signer   = getSigner();
  const contract = new ethers.Contract(address, abi, signer);
  const tx       = await contract[method](...args);
  return tx.wait();
}

/**
 * Return the ABI of a named contract.
 */
async function getAbi(contractName) {
  const abi = loadAbi(contractName);
  if (!abi) {
    return { stub: true, message: 'ABI not found — run npm run compile-contracts' };
  }
  return abi;
}

module.exports = { deploy, call, send, getAbi };
