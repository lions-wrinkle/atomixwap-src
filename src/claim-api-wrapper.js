import algosdk from "algosdk";
import config from "./config.js";
import { loadAssetImage } from "./asset-details.js";

export default class ClaimApiWrapper {
  constructor(walletConnect, algodClient) {

    this.API_URL = config.urls[config.network].claimApiUrl;

    this.walletConnect = walletConnect;
    this.algodClient = algodClient;

    this.claimables;
    this.suggestedParams;
    this.escrowAddress;
  }

  async load() {
    try {
      const response = await fetch(
        this.API_URL +
          "/claim/get?recipient=" +
          this.walletConnect.walletAddress
      );

      const data = await response.json();

      this.claimables = data.claimables;
      this.suggestedParams = data.suggestedParams;
      this.escrowAddress = data.escrowAddress;

      //load assets details
      for (const claimable of this.claimables) {
        const result = await this.algodClient
          .getAssetByID(claimable.assetId)
          .do();
        claimable.params = result.params;
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
      return;
    }
  }

  getClaimablesUI() {

    const maxTx = 2;

    let txCount = 0;
    let assetIds = [];

    const contentDiv = document.createElement("div");

    let i = 0;

    let batchDiv;
    let batchRow;

    for (const claimable of this.claimables) {

      if (txCount === 0){

        batchDiv = document.createElement("div");
        batchDiv.className = "mt-4 mb-1";
        contentDiv.append(batchDiv);

        batchRow = batchRow = document.createElement("div");
        batchRow.className = "row text-center gx-2 gy-2 mb-3";
        batchDiv.append(batchRow);

      }

      const col = document.createElement("div");
      col.className = "col-6 col-md-3";
      col.innerHTML = `<div class="h-100 nft-card"><img src="default.png" class="img-fluid" id="nft-${claimable.assetId}"><div class="nft-card-info"><strong>${claimable.params.name}</strong><br>
      <small><a href="https://www.nftexplorer.app/asset/${claimable.assetId}" target="_blank">${claimable.assetId}</a></small></div></div>`;

      loadAssetImage(claimable.assetId, col.querySelector(`#nft-${claimable.assetId}`), 400);

      assetIds.push(claimable.assetId);

      batchRow.append(col);

      txCount++;

      if (i === this.claimables.length - 1 || txCount === maxTx) {

        const button = document.createElement("button");
        button.className = "btn btn-generate";

        button.textContent = `Claim ${txCount > 1 ? `(${txCount})` : ""}`;
        button.dataset.assetIds = assetIds.join(",");
        button.addEventListener("click", this.claim.bind(this), false);

        batchDiv.append(button);

        txCount = 0;
        assetIds = [];
        
        
      }

      i++;
    }

    return contentDiv;
  }

  async claim(event) {

    const callingButton = event.currentTarget;

    try {

      callingButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Waiting for signatures...`;
      callingButton.disabled = true;

      const assetIds = event.currentTarget.dataset.assetIds.split(",");

      let optinTxns = [];
      let transferTxns = [];

      for (const assetId of assetIds) {

        //prepare optin txn
        let optinTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: this.walletConnect.walletAddress,
          to: this.walletConnect.walletAddress,
          amount: 0,
          assetIndex: parseInt(assetId),
          suggestedParams: this.suggestedParams,
        });

        optinTxns.push(optinTxn);

        //prepare transfer txn
        let transferTxn =
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: this.escrowAddress,
            to: this.walletConnect.walletAddress,
            amount: 1,
            assetIndex: parseInt(assetId),
            suggestedParams: this.suggestedParams,
          });

        transferTxns.push(transferTxn);
      }

      let allTxns = optinTxns.concat(transferTxns);
      algosdk.assignGroupID(allTxns);

      const signedTxns = await this.walletConnect.signTransactions(allTxns);

      const signedTxnsRaw = signedTxns.map((txBlob) =>
        btoa(String.fromCharCode.apply(null, txBlob))
      );

      callingButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Claiming...`;
      callingButton.disabled = true;

      //call api
      const response = await fetch(this.API_URL + "/claim/claim", {
        method: "POST",
        body: JSON.stringify({ signedTxns: signedTxnsRaw }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200){

        const data = await response.json();

        callingButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
      </svg>
        Claimed`;
        callingButton.disabled = true;

      } else {

        const data = await response.json();

        throw(new Error(data.error));

      }
      

    } catch (err) {

      console.error(err);
      alert(err.message);

      callingButton.textContent = "Claim";
      callingButton.disabled = false;

    }
  }

    
}
