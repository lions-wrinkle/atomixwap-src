import { encodeAddress } from "algosdk";

export class WalletConnect {

  constructor(connectedCallback, disconnectedCallback, btnClass = "") {
    this.connectedCallback = connectedCallback;
    this.disconnectedCallback = disconnectedCallback;

    this.ui = document.createElement("div");

    this.wallet;
    this.walletType;
    this.walletAddress;

    this.btnClass = btnClass;

    this.loadState().then(() => {

      if (this.walletType && this.walletAddress) {
        this.connectedCallback();
      } else {
        this.disconnectedCallback();
      }

      this.updateUI();
    });
  }

  //UI
  updateUI() {
    this.ui.textContent = "";

    if (this.walletType && this.walletAddress) {
      this.displayConnectedUI();
    } else {
      this.displayConnectUI();
    }
  }

  displayConnectUI() {
    this.ui.innerHTML = `
    <button class="btn-myalgo ${this.btnClass}" id="buttonMyAlgo">MyAlgo</button>
    <button class="btn-pera ${this.btnClass}" id="buttonPera">Pera</button>
    `;

    this.ui
      .querySelector("#buttonMyAlgo")
      .addEventListener("click", this.connectMyAlgo.bind(this));
    this.ui
      .querySelector("#buttonPera")
      .addEventListener("click", this.connectPera.bind(this));
  }

  displayConnectedUI() {
    this.ui.innerHTML = `
    <span style="word-break: break-all;">${this.walletAddress}</span>
    <a href="#" id="buttonDisconnect"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
  </svg></a>
    `;

    this.ui
      .querySelector("#buttonDisconnect")
      .addEventListener("click", this.disconnect.bind(this));
  }

  //State
  async loadState() {

    this.walletType = localStorage.getItem("wallet-connect-type");
    this.walletAddress = localStorage.getItem("wallet-connect-address");

    if (this.walletType === "myalgo" && this.walletAddress) {

      const MyAlgoConnect = await import('@randlabs/myalgo-connect');
      this.wallet = new MyAlgoConnect.default();

    } else if (this.walletType === "pera" && this.walletAddress) {

      const { PeraWalletConnect } = await import('@perawallet/connect');
      this.wallet = new PeraWalletConnect();

      this.wallet.reconnectSession().then((accounts) => {
        console.log(`Reconnected ${accounts}`);

        if (accounts[0]) {
          this.walletAddress = accounts[0];
          this.saveState();
        }

        // Setup the disconnect event listener
        this.wallet.connector?.on("disconnect", this.disconnect.bind(this));
      });
    }
  }

  saveState() {
    localStorage.setItem("wallet-connect-type", this.walletType);
    localStorage.setItem("wallet-connect-address", this.walletAddress);
  }

  clearState() {
    this.wallet = null;
    this.walletType = null;
    this.walletAddress = null;

    localStorage.removeItem("wallet-connect-type");
    localStorage.removeItem("wallet-connect-address");
  }

  //Connect

  async connectMyAlgo() {

    const MyAlgoConnect = await import('@randlabs/myalgo-connect');

    this.wallet = new MyAlgoConnect.default();
    const accountsSharedByUser = await this.wallet.connect({
      shouldSelectOneAccount: true,
      openManager: true,
    });

    if (accountsSharedByUser[0]) {
      this.walletType = "myalgo";
      this.walletAddress = accountsSharedByUser[0].address;
      this.saveState();
      this.updateUI();

      this.connectedCallback();
    }
  }

  async connectPera() {

    const { PeraWalletConnect } = await import('@perawallet/connect');

    this.wallet = new PeraWalletConnect();

    this.wallet.connector?.killSession();

    await this.wallet.disconnect();
    
    const accountsSharedByUser = await this.wallet.connect();

    if (accountsSharedByUser[0]) {
      this.walletType = "pera";
      this.walletAddress = accountsSharedByUser[0];
      this.saveState();
      this.updateUI();

      this.connectedCallback();
    }
  }

  disconnect() {
    if (this.walletType === "pera") {
      this.wallet.disconnect();
    }

    this.clearState();
    this.updateUI();

    this.disconnectedCallback();
  }

  //Sign

  async signTransactions(transactions) {
    let signedTransactions;

    if (this.walletType === "myalgo") {
      const transactionsToSign = [];

      for (const tx of transactions) {
        if (encodeAddress(tx.from.publicKey) === this.walletAddress) {
          transactionsToSign.push(tx.toByte());
        }
      }

      try {
        signedTransactions = await this.wallet.signTransaction(
          transactionsToSign
        );

        signedTransactions = signedTransactions.map((tx) => tx.blob);
      } catch (err) {
        throw err;
      }
    } else if (this.walletType === "pera") {
      const transactionsToSign = transactions.map((tx) => ({
        txn: tx,
        signers: [encodeAddress(tx.from.publicKey)],
      }));

      try {
        signedTransactions = await this.wallet.signTransaction(
          [transactionsToSign],
          this.walletAddress
        );
      } catch (err) {
        throw err;
      }
    } else {
      throw new Error("No wallet connected");
    }

    return signedTransactions;
  }
}
