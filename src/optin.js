import { loadAssetImage } from "./asset-details.js";
import algosdk from "algosdk";

export class OptIn {
  constructor(walletConnect, algodClient, query) {
    this.walletConnect = walletConnect;
    this.algodClient = algodClient;

    this.ui = document.createElement("div");
    this.suggestedParams;

    this.displayUI();
    this.loadAssets(query);
  }

  displayUI() {
    this.ui.innerHTML = `
        <h4 id="claim-title">Opt-in assets</h4>
        <div id="optin-list">Loading...</div>
        `;
  }

  async loadAssets(query) {

    //load params now to avoid popup blocking
    this.suggestedParams = await this.algodClient.getTransactionParams().do();

    const maxTx = 16;

    //parse assets
    let assetsIds = query.split(",");
    assetsIds = assetsIds.map((a) => parseInt(a.trim()));

    let txCount = 0;
    let assetIds = [];

    const contentDiv = document.createElement("div");
    const list = this.ui.querySelector("#optin-list");
    list.textContent = "";
    list.append(contentDiv);

    let i = 0;
    let blockCount = 0;

    let batchDiv;
    let batchRow;

    for (const assetId of assetsIds) {
      if (!assetId) {
        console.error(new Error(`Error parsing asset ${assetId}`));
        continue;
      }

      if (blockCount === 0) {
        batchDiv = document.createElement("div");
        batchDiv.className = "mt-4 mb-1";
        contentDiv.append(batchDiv);

        batchRow = batchRow = document.createElement("div");
        batchRow.className = "row text-center gx-2 gy-2 mb-3";
        batchDiv.append(batchRow);
      }

      const resultAsset = await this.algodClient.getAssetByID(assetId).do();

      let optinStr = "";

      try {
        const resultBalance = await this.algodClient
          .accountAssetInformation(this.walletConnect.walletAddress, assetId)
          .do();

        optinStr = `<br><span class="opted-in"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
      </svg> Already opted-in</span>`;
      } catch (err) {
        //asset not opted-in
        assetIds.push(assetId);
        txCount++;
      }

      const col = document.createElement("div");
      col.className = "col-6 col-md-3";
      col.innerHTML = `<div class="h-100 nft-card"><img src="default.png" class="img-fluid" id="nft-${assetId}"><div class="nft-card-info"><strong>${resultAsset.params.name}</strong><br>
      <small><a href="https://www.nftexplorer.app/asset/${assetId}" target="_blank">${assetId}</a></small>${optinStr}</div></div>`;

      loadAssetImage(assetId, col.querySelector(`#nft-${assetId}`), 400);

      batchRow.append(col);

      blockCount++;

      if (txCount > 0 && (i === assetsIds.length - 1 || txCount === maxTx)) {
        const button = document.createElement("button");
        button.className = "btn btn-generate";

        button.textContent = `Opt-in ${txCount > 1 ? `(${txCount})` : ""}`;
        button.dataset.assetIds = assetIds.join(",");
        button.addEventListener("click", this.optin.bind(this), false);

        batchDiv.append(button);

        txCount = 0;
        assetIds = [];
        blockCount = 0;
      }

      i++;
    }
  }

  async optin(event) {
    const callingButton = event.currentTarget;

    try {
      callingButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Waiting for signatures...`;
      callingButton.disabled = true;

      const assetIds = event.currentTarget.dataset.assetIds.split(",");

      let optinTxns = [];

      

      for (const assetId of assetIds) {
        //prepare optin txn
        let optinTxn =
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: this.walletConnect.walletAddress,
            to: this.walletConnect.walletAddress,
            amount: 0,
            assetIndex: parseInt(assetId),
            suggestedParams: this.suggestedParams,
          });

        optinTxns.push(optinTxn);
      }

      algosdk.assignGroupID(optinTxns);

      const signedTxns = await this.walletConnect.signTransactions(optinTxns);

      callingButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Sending transactions...`;
      callingButton.disabled = true;

      //send tx
      try {
        const tx = await this.algodClient.sendRawTransaction(signedTxns).do();

        callingButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Waiting for confirmation...`;
        callingButton.disabled = true;

        // Wait for transaction to be confirmed
        const confirmedTxn = await algosdk.waitForConfirmation(
          this.algodClient,
          tx.txId,
          4
        );

        callingButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
      </svg>
        Opted-in`;
        callingButton.disabled = true;
      } catch (err) {
        throw err;
      }
    } catch (err) {
      console.error(err);
      alert(err.message);

      callingButton.textContent = "Opt-in";
      callingButton.disabled = false;
    }
  }
}
