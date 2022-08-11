import { SwapLinkManager } from "./swap-link-manager";
import algosdk from "algosdk";
import { loadAssetImage } from "./asset-details";

export class SwapLinkAccept {
  constructor(swapData, walletConnect, algodClient, algoIndexer) {
    this.walletConnect = walletConnect;
    this.algodClient = algodClient;
    this.algoIndexer = algoIndexer;

    this.ui = document.createElement("div");

    this.fields = {};
    this.signedTxTransfer;
    this.signedOptinCurrencyTx;

    this.resolveData(swapData);
  }

  async resolveData(swapData) {
    //decode data
    const decodedData = atob(swapData);
    const jsonData = JSON.parse(decodedData);

    this.signedTxTransfer = SwapLinkManager.base64ToSignedTx(
      jsonData.signedTransferTx
    );

    const decodedSignedTransaction = algosdk.decodeSignedTransaction(
      this.signedTxTransfer
    );

    if (jsonData.signedOptinCurrencyTx) {
      this.signedOptinCurrencyTx = SwapLinkManager.base64ToSignedTx(
        jsonData.signedOptinCurrencyTx
      );
    }

    this.fields = {
      assetId: decodedSignedTransaction.txn.assetIndex,
      sellerAddress: algosdk.encodeAddress(
        decodedSignedTransaction.txn.from.publicKey
      ),
      buyerAddress: algosdk.encodeAddress(
        decodedSignedTransaction.txn.to.publicKey
      ),
      price: jsonData.price,
      currency: jsonData.currency,
      royalties: jsonData.royalties,
      groupID: decodedSignedTransaction.txn.group,
      firstRound: decodedSignedTransaction.txn.firstRound,
      lastRound: decodedSignedTransaction.txn.lastRound,
    };

    //load current block
    const nodeStatus = await this.algodClient.status().do();
    const lastRound = nodeStatus["last-round"];

    if (lastRound >= this.fields.lastRound) {
      this.ui.innerHTML = `<h4>Accept swap</h4>
        <div class="alert alert-danger" role="alert">This link expired.`;
    } else if (this.fields.buyerAddress !== this.walletConnect.walletAddress) {
      this.ui.innerHTML = `<h4>Accept swap</h4>
        <div class="alert alert-warning" role="alert">This swap can only be accepted by the following wallet:<br><span style="word-break: break-all;">${this.fields.buyerAddress}</span></div>`;
    } else {
      this.ui.innerHTML = `<h4>Accept swap</h4>
        Loading...`;

      this.swapLinkManager = new SwapLinkManager(
        this.walletConnect,
        this.algodClient,
        this.algoIndexer
      );
      this.generateTransactions();
    }
  }

  async generateTransactions() {
    
    try {
      await this.swapLinkManager.generateTransactions(this.fields);
    } catch (err) {
      this.ui.innerHTML = `<h4>Accept swap</h4>
        <div class="alert alert-danger" role="alert">${err.message}</div>`;
    }
    

    this.displayUI();
  }

  displayUI() {
    //add royalties if needed
    const transactions = this.swapLinkManager.transactions;

    const assetId = transactions.assetTransfer.assetIndex;
    const buyerAddress = algosdk.encodeAddress(
      transactions.assetTransfer.to.publicKey
    );
    const sellerAddress = algosdk.encodeAddress(
      transactions.assetTransfer.from.publicKey
    );

    let priceLI = "";

    if (transactions.payment) {
      let price = transactions.payment.amount;
      let currencyString;

      if (transactions.payment.type === "pay") {
        //convert microalgo to algo
        price = price / 1000000;
        currencyString = "ALGO";
      } else {

        let emoji = '';

        if (this.swapLinkManager.currencyAsset.index === 360019122){
            emoji = '&#127844; '
        }

        currencyString = `${this.swapLinkManager.currencyAsset.params["unit-name"]} ${emoji}(ASA ${this.swapLinkManager.currencyAsset.index})`;
      }

      priceLI = `<li>You'll send <span class="price">${price} ${currencyString}</span><br>
      <span class="wallet-info">TO ${sellerAddress}</span></li>`;
    }

    this.ui.innerHTML = `<h4>Accept swap</h4>
        <div class="row">
            <div class="col-md-6">
              <ul>
                ${priceLI}
                <li>You'll receive asset <strong><a href="https://www.nftexplorer.app/asset/${assetId}" target="_blank">${assetId}</a></strong><br><span id="assetName">(${this.swapLinkManager.asset.params.name})</span></li>
              </ul>
            </div>
            <div class="col-md-6 ">
                <img src="default.png" id="imgAssetPreview" class="img-fluid">
            </div>
        </div>
        <form>
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" id="checkAcceptRisk" required>
                <label class="form-check-label" for="checkAcceptRisk">I accept to use this tool at my own
                    risk</label>
            </div>
            
            <button type="submit" class="btn btn-generate fw-bold" id="buttonAccept">Accept & sign</button>
        </form>`;

    this.ui
      .querySelector("form")
      .addEventListener("submit", this.submitAccept.bind(this));

    if (transactions.royaltiesPayment) {
      const listPreview = this.ui.querySelector("ul");
      const royaltiesPoint = document.createElement("li");

      let royaltiesAmount = transactions.royaltiesPayment.amount;
      let currency;

      if (transactions.royaltiesPayment.type === "pay") {
        //convert microalgo to algo
        royaltiesAmount = royaltiesAmount / 1000000;
        currency = "ALGO";
      } else {
        currency = transactions.royaltiesPayment.assetIndex;
      }

      const creatorAddress = algosdk.encodeAddress(
        transactions.royaltiesPayment.to.publicKey
      );

      royaltiesPoint.innerHTML = `You'll send <span class="price">${royaltiesAmount} ${currency}</span> to asset's creator &#128154;<br>
      <span class="wallet-info">TO ${creatorAddress}</span>`;

      listPreview.append(royaltiesPoint);
    }

    //load asset imazge
    loadAssetImage(assetId, this.ui.querySelector("#imgAssetPreview"), 512);
  }

  async submitAccept(event) {
    //cancel default behaviour when submiting a form
    event.preventDefault();

    const buttonAccept = this.ui.querySelector("#buttonAccept");
    buttonAccept.disabled = true;
    buttonAccept.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
    Waiting for signatures...`;

    /*if (this.walletConnect.walletType === "pera") {
      this.ui.querySelector("#sign-info").innerHTML = `
      <div class="alert alert-primary d-flex align-items-center" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-phone" viewBox="0 0 16 16">
          <path d="M11 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H5z"/>
          <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
          </svg>
          Please open your Pera Algo Wallet app to sign.
      </div>`;
    }*/

    this.swapLinkManager.signAndCommitTransactions(
      this.signedTxTransfer,
      this.signedOptinCurrencyTx,
      () => {
        //signed
        //this.ui.querySelector("#sign-info").textContent = '';
        buttonAccept.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Sending transactions...`;
      },
      () => {
        //success
        buttonAccept.hidden = true;

        this.ui.innerHTML = `<h4>Swapped 🥳</h4>
        You received asset <a href="https://www.nftexplorer.app/asset/${this.swapLinkManager.asset.index}">${this.swapLinkManager.asset.index}</a> (${this.swapLinkManager.asset.params.name}).`;
      },
      (err) => {
        //failed
        buttonAccept.hidden = true;

        this.ui.innerHTML = `<h4>Accept swap</h4>
            <div class="alert alert-danger" role="alert">Error:<br>${err}</div>`;
      }
    );
  }
}
