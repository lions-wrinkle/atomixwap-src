import { encodeAddress } from "algosdk";

export class WalletConnect {
  constructor(connectedCallback, disconnectedCallback, btnClass = "") {
    this.connectedCallback = connectedCallback;
    this.disconnectedCallback = disconnectedCallback;

    this.ui = document.createElement("div");

    this.wallet;
    this.walletType;
    this.walletAddress;
    this.nfd;

    this.btnClass = btnClass;

    this.loadState().then(() => {
      if (this.walletType && this.walletAddress) {
        this.connectedCallback();
        this.loadNfd();
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
    <button class="btn-pera ${this.btnClass}" id="buttonPera">Pera</button>
    <button class="btn-defly ${this.btnClass}" id="buttonDefly">Defly</button>
    <br />
    
    `;

    /*this.ui
      .querySelector("#buttonMyAlgo")
      .addEventListener("click", this.connectMyAlgo.bind(this));*/
    this.ui
      .querySelector("#buttonPera")
      .addEventListener("click", this.connectPera.bind(this));
    this.ui
      .querySelector("#buttonDefly")
      .addEventListener("click", this.connectDefly.bind(this));
  }

  displayConnectedUI() {
    let displayAddress;

    if (this.nfd) {
      displayAddress = this.nfd;
    } else {
      displayAddress = this.walletAddress;
    }

    this.ui.innerHTML = `
    <span style="word-break: break-all;">${displayAddress}</span>
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
      const MyAlgoConnect = await import("@randlabs/myalgo-connect");
      this.wallet = new MyAlgoConnect.default();
    } else if (this.walletType === "pera" && this.walletAddress) {
      const { PeraWalletConnect } = await import("@perawallet/connect");
      this.wallet = new PeraWalletConnect();

      try {
        this.wallet.connector?.on("disconnect", this.disconnect.bind(this));
        const accounts = await this.wallet.reconnectSession();

        if (accounts?.[0]) {
          this.walletAddress = accounts[0];
          this.saveState();
        }
      } catch (err) {
        console.error(err);
        this.wallet.disconnect();
      }

      // Setup the disconnect event listener
      //this.wallet.connector?.on("disconnect", this.disconnect.bind(this));
    } else if (this.walletType === "defly" && this.walletAddress) {
      const { DeflyWalletConnect } = await import("@blockshake/defly-connect");
      this.wallet = new DeflyWalletConnect();

      try {
        this.wallet.connector?.on("disconnect", this.disconnect.bind(this));
        const accounts = await this.wallet.reconnectSession();

        if (accounts?.[0]) {
          this.walletAddress = accounts[0];
          this.saveState();
        }
      } catch (err) {
        console.error(err);
        this.wallet.disconnect();
      }

      // Setup the disconnect event listener
      //this.wallet.connector?.on("disconnect", this.disconnect.bind(this));
    }
  }

  saveState() {
    localStorage.setItem("wallet-connect-type", this.walletType);
    localStorage.setItem("wallet-connect-address", this.walletAddress);
  }

  clearState() {
    this.nfd = null;
    this.wallet = null;
    this.walletType = null;
    this.walletAddress = null;

    localStorage.removeItem("wallet-connect-type");
    localStorage.removeItem("wallet-connect-address");
  }

  //load nfd domain
  async loadNfd() {
    if (this.walletAddress) {
      const response = await fetch(
        "https://api.nf.domains/nfd/address?address=" +
          this.walletAddress +
          "&limit=1&view=thumbnail"
      );

      if (response.status === 200) {
        const json = await response.json();

        if (
          json.length > 0 &&
          json[0].caAlgo &&
          json[0].caAlgo.includes(this.walletAddress)
        ) {
          this.nfd = json[0].name;
          this.updateUI();
        }
      }
    }
  }

  //Connect

  async connectMyAlgo() {
    const MyAlgoConnect = await import("@randlabs/myalgo-connect");

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
      this.loadNfd();

      this.connectedCallback();
    }
  }

  async connectPera() {
    const { PeraWalletConnect } = await import("@perawallet/connect");

    this.wallet = new PeraWalletConnect();

    //this.wallet.connector?.killSession();

    if (this.wallet?.connector?.connected) {
      await this.wallet.disconnect();
    }

    try {
      await this.wallet.disconnect();
      const accountsSharedByUser = await this.wallet.connect();

      if (accountsSharedByUser[0]) {
        this.walletType = "pera";
        this.walletAddress = accountsSharedByUser[0];
        this.saveState();
        this.updateUI();
        this.loadNfd();

        // Setup the disconnect event listener
        this.wallet.connector?.on("disconnect", this.disconnect.bind(this));

        this.connectedCallback();
      }
    } catch (err) {
      if (err?.data?.type !== "CONNECT_MODAL_CLOSED") {
        alert(err.message);
      }
    }
  }

  async connectDefly() {
    const { DeflyWalletConnect } = await import("@blockshake/defly-connect");

    this.wallet = new DeflyWalletConnect();

    //this.wallet.connector?.killSession();

    if (this.wallet?.connector?.connected) {
      await this.wallet.disconnect();
    }

    try {
      await this.wallet.disconnect();
      const accountsSharedByUser = await this.wallet.connect();

      if (accountsSharedByUser[0]) {
        this.walletType = "defly";
        this.walletAddress = accountsSharedByUser[0];
        this.saveState();
        this.updateUI();
        this.loadNfd();

        // Setup the disconnect event listener
        this.wallet.connector?.on("disconnect", this.disconnect.bind(this));

        this.connectedCallback();
      }
    } catch (err) {
      if (err?.data?.type !== "CONNECT_MODAL_CLOSED") {
        alert(err.message);
      }
    }
  }

  disconnect() {
    if (this.walletType === "pera" || this.walletType === "defly") {
      this.wallet?.disconnect();
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
    } else if (this.walletType === "pera" || this.walletType === "defly") {
      ``;

      const transactionsToSign = transactions.map((tx) => ({
        txn: tx,
        signers: [encodeAddress(tx.from.publicKey)],
      }));

      try {
        signedTransactions = await this.wallet.signTransaction([
          transactionsToSign,
        ]);
      } catch (err) {
        throw err;
      }
    } else {
      throw new Error("No wallet connected");
    }

    return signedTransactions;
  }
}
