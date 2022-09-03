import ClaimApiWrapper from "./claim-api-wrapper.js";

export class Claim {
  constructor(walletConnect, algodClient) {
    this.walletConnect = walletConnect;
    this.algodClient = algodClient;

    this.ui = document.createElement("div");
    this.claimApi = new ClaimApiWrapper(this.walletConnect, this.algodClient);

    this.displayUI();
    this.loadClaimables();
  }

  displayUI() {
    this.ui.innerHTML = `
        <h4 id="claim-title">Claim</h4>
        <div id="claim-list">Loading...</div>
        `;
  }

  async loadClaimables() {
    try {
      await this.claimApi.load();
    } catch (err) {
        console.error(err);
      this.ui.innerHTML = `
        <h4 id="claim-title">Claim</h4>
        <div class="alert alert-danger" role="alert">${err.message}</div>
        `;
      return;
    }

    const title = this.ui.querySelector("#claim-title");
    const contentDiv = this.ui.querySelector("#claim-list");

    const numClaimables = this.claimApi.claimables.length;

    if (numClaimables === 0) {
      title.textContent = "😞";
      contentDiv.textContent = "No NFTS to claim.";
    } else {
      title.textContent = `${numClaimables} NFT${
        numClaimables > 1 ? "s" : ""
      } to claim! 🥳`;

      contentDiv.textContent = "";
      contentDiv.append(this.claimApi.getClaimablesUI());
    }
  }
}
