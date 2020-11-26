const Ganache = require("ganache-core");
const Web3 = require("web3");
const util = require("util");

const toBN = Web3.utils.toBN;

/**
 * # Usage
 *
 * ```
 * const evm = new TimedEvm(new Date(), accountsToUnlock);
 * const primaryAccounts = await evm.setupAccounts();
 *
 * Contract.setProvider(evm.provider);
 * const contract = await Contract.new();
 *
 * await evm.fundAccount(accountsToUnlock[0], amount);
 * await contract.method.send({ from: accountsToUnlock[0] });
 *
 * await evm.increaseTime(300);
 * await contract.timeDependentMethod.send();
 * ```
 */

class TimedEvm {
  /**
   * Creates web3 instance with provider that starts mining from specified time
   * @param {Date} start Date to start first block from. Defaults to now.
   * @param {Array<string>} accounts Accounts to unlock in provider
   */
  constructor(start = new Date(), accounts = []) {
    this.providedAccounts = accounts;
    this.provider = Ganache.provider({
      default_balance_ether: toBN("134439500000000000"),
      time: start,
      unlocked_accounts: this.providedAccounts
    });
    this.web3 = new Web3(this.provider);
  }

  /**
   * Sets primary account as web3 default and returns accounts
   */
  async setupAccounts() {
    const response = await this.send("eth_accounts");
    const accounts = response.result;
    this.primaryAccount = accounts[0];
    this.web3.eth.defaultAccount = this.primaryAccount;
    return accounts;
  }

  /**
   * Sends `amount` from primary account to `account`
   * @param {string} account Account to fund
   * @param {BigNumber} amount Amount to send
   */
  async fundAccount(account, amount) {
    await this.web3.eth.sendTransaction({
      from: this.primaryAccount,
      to: account,
      value: amount
    });
  }

  /**
   * Mines a new block with timestamp at current timestamp + `secondsToJump`
   * @param {number} secondsToJump Seconds to increase block timestamp
   */
  async increaseTime(secondsToJump) {
    const err = 0;
    let out = await this.send("evm_increaseTime", [secondsToJump]);
    if (out[err]) throw out[err];
    // Mine a block so new time is recorded
    out = await this.send("evm_mine");
    if (out[err]) throw out[err];
  }

  /**
   * Returns response of JSON RPC call to EVM
   * @param {string} method RPC method to call
   * @param {Array<any>} params List of arguments for the RPC method
   */
  async send(method, params) {
    const sendAsync = util.promisify(this.provider.sendAsync);
    return await sendAsync({
      jsonrpc: "2.0",
      method: method,
      params: params || [],
      id: new Date().getTime()
    });
  }
}

module.exports = { TimedEvm };
