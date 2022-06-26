import algosdk from "algosdk";
import { loadAssetImage } from "./asset-details";

export class SwapLinkForm {
  constructor(currencies, defaultRoyalties, submitCallback, walletConnect, algoIndexer) {
    this.ui = document.createElement("div");
    this.defaultRoyalties = defaultRoyalties;
    this.submitCallback = submitCallback;
    this.walletConnect = walletConnect;
    this.algoIndexer = algoIndexer;
    this.data = {};
    this.isAssetCreator = false;

    this.ui.innerHTML = `<h4>Create swap link</h4>
        <form>
                    <div class="mb-3">
                        <div class="row">
                            <div class="col-6">
                              <label for="inputAssetId" class="form-label">NFT</label>
                              <input type="text" class="form-control" id="inputAssetId" aria-describedby="assetIdHelp"
                                  pattern="\\d*" required>
                              <div id="assetIdHelp" class="form-text">ASA asset ID</div>
                            </div>
                            <div class="col-6">
                              <img src="default.png" id="imgAssetPreview" width="auto" height="95">
                            </div>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="inputAlgoAddress" class="form-label">Receiver</label>
                        <input type="text" class="form-control" id="inputAlgoAddress" pattern="[A-Z2-7]{58}"
                            aria-describedby="AlgoAddressdHelp" required>
                        <div id="AlgoAddressdHelp" class="form-text">Algorand Wallet Address</div>
                    </div>
                    <div class="mb-3">
                        <label for="inputPrice" class="form-label">Price</label>

                        <div class="row">
                            <div class="col">
                                <input type="number" class="form-control" id="inputPrice" min="0" step="1" required>
                            </div>
                            <div class="col">
                                <select class="form-select" id="inputCurrency" aria-label="Select currency">
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="mb-3">
                      <div class="row">
                        <div class="col-6">
                          <div class="d-flex justify-content-between">
                          <label for="inputRoyalties" class="form-label">Creator royalty</label>
                          <span id="royaltiesValueLabel" class="royalties">0&percnt;</span>
                      </div>

                      <input type="range" class="form-range" value="${this.defaultRoyalties}" min="0" max="10" step="0.5" id="inputRoyalties"
                          aria-describedby="royaltiesdHelp">
                      <div id="royaltiesdHelp" class="form-text"></div>
                        </div>
                        <div class="col-6 position-relative">
                        <span class="position-absolute heart" id="royaltiesLoveRed" hidden>&#10084;</span>
                        <span class="position-absolute heart" id="royaltiesLoveGreen">&#128154;</span>
                        
                        </div>
                      </div>
                       
                    </div>
                    <div class="mb-3 form-check">
                        <input type="checkbox" class="form-check-input" id="checkAcceptRisk" required>
                        <label class="form-check-label" for="checkAcceptRisk">I accept to use this tool at my own
                            risk</label>
                    </div>
                    <button type="submit" id="buttonSubmit" class="btn btn-generate fw-bold">Preview</button>


                </form>`;

    //add currencies
    const inputCurrency = this.ui.querySelector("#inputCurrency");

    let first = true;

    for (const currency of currencies) {
      const option = document.createElement("option");
      option.textContent = currency.name;
      option.value = currency.assetId;

      if (first) {
        option.selected = true;
      }

      inputCurrency.append(option);

      first = false;
    }

    

    //listen to change events
    this.ui
      .querySelector("#inputRoyalties")
      .addEventListener("input", this.royaltiesChange.bind(this), false);

    this.ui
      .querySelector("#inputAssetId")
      .addEventListener("focusout", this.assetIdFocusOut.bind(this), false);

    this.ui
      .querySelector("#inputCurrency")
      .addEventListener("change", this.currencyChange.bind(this), false);

    //listen to form submit event
    this.ui
      .querySelector("form")
      .addEventListener("submit", this.submitForm.bind(this), false);

    //update royalties
    this.ui.querySelector("#inputRoyalties").dispatchEvent(new Event("input"))
  }

  async assetIdFocusOut(event) {

    const assetIdHelp = this.ui.querySelector("#assetIdHelp");
    const inputAssetId = this.ui.querySelector("#inputAssetId");
    const inputRoyalties = this.ui.querySelector("#inputRoyalties");
    const royaltiesdHelp = this.ui.querySelector("#royaltiesdHelp");
    const assetID = parseInt(inputAssetId.value);

    //retreive asset infos
    if (!isNaN(assetID)) {
      try {
        const result = await this.algoIndexer.lookupAssetByID(assetID).do();

        assetIdHelp.innerHTML = `<span class="text-success">${result.asset.params.name} (${result.asset.params["unit-name"]})</span>`;

        const creatorAddress = result.asset.params.creator;

        if (creatorAddress === this.walletConnect.walletAddress) {
          this.isAssetCreator = true;
        } else {
          this.isAssetCreator = false;
        }

      } catch (err) {
        console.log(err);
        assetIdHelp.innerHTML = `<span class="text-danger">Error: Asset with ID ${assetID} not found</span>`;

        this.isAssetCreator = false;
      }

      this.checkRoyaltiesAvailability();

      //load asset imazge
      loadAssetImage(assetID, this.ui.querySelector('#imgAssetPreview'), 200);

    } else {
      assetIdHelp.innerHTML = `<span class="text-danger">Wrong asset ID format</span>`;

      inputRoyalties.disabled = false;
      royaltiesdHelp.textContent = "";
    }
  }

  currencyChange(event) {

    this.checkRoyaltiesAvailability();

  }

  checkRoyaltiesAvailability(){

    const inputCurrency = this.ui.querySelector("#inputCurrency");
    const inputRoyalties = this.ui.querySelector("#inputRoyalties");
    const royaltiesdHelp = this.ui.querySelector("#royaltiesdHelp");
    const greenHeart = this.ui.querySelector("#royaltiesLoveGreen");
    const redHeart = this.ui.querySelector("#royaltiesLoveRed");

    if (inputCurrency.value !== "algo" || this.isAssetCreator) {
      inputRoyalties.value = 0;
      inputRoyalties.disabled = true;

      if (inputCurrency.value !== "algo"){
        royaltiesdHelp.textContent =
        "Royalties not available for other cryptocurrencies than Algo";
      } else {
        royaltiesdHelp.textContent =
            "You're the creator of this asset, royalties disabled.";
      }
      
      greenHeart.hidden = true;
      redHeart.hidden = true;
    } else  {
      //inputRoyalties.value = this.defaultRoyalties;
      inputRoyalties.disabled = false;
      royaltiesdHelp.textContent = "";
      greenHeart.hidden = false;
    }

    inputRoyalties.dispatchEvent(new Event("input"));
  }

  royaltiesChange(event) {
    const royaltiesSlider = this.ui.querySelector("#inputRoyalties");
    
    this.ui.querySelector(
      "#royaltiesValueLabel"
    ).textContent = `${royaltiesSlider.value} %`;

    const greenHeart = this.ui.querySelector("#royaltiesLoveGreen");
    const redHeart = this.ui.querySelector("#royaltiesLoveRed");

    const minFontSize = 1.0;
    const maxFontSize = 4.5;
    const sliderMin = Number(royaltiesSlider.min);
    const sliderMax = Number(royaltiesSlider.max);

    const fontSize = minFontSize + (maxFontSize - minFontSize)*((royaltiesSlider.value - royaltiesSlider.min)/(royaltiesSlider.max - royaltiesSlider.min));

    greenHeart.style = `font-size: ${fontSize}rem`;

    if (royaltiesSlider.value > sliderMin + (sliderMax - sliderMin)/2){

      const redHeartOpacity = (royaltiesSlider.value - (sliderMin + (sliderMax - sliderMin)/2))/((sliderMax - sliderMin)/2);

      let animation = '';
      if (royaltiesSlider.value === royaltiesSlider.max){
        animation = 'animation: animateHeart 1.2s infinite;';
      }

      redHeart.hidden = false;
      redHeart.style = `font-size: ${fontSize}rem; ${animation}`;
      greenHeart.style = `font-size: ${fontSize}rem; opacity: ${1-redHeartOpacity}`;

    } else {
      redHeart.hidden = true;
    }
    
  }

  async validate() {

    await this.assetIdFocusOut();

    this.data.assetId = this.ui.querySelector("#inputAssetId").value;
    this.data.buyerAddress = this.ui.querySelector("#inputAlgoAddress").value;
    this.data.price = this.ui.querySelector("#inputPrice").value;
    this.data.currency = this.ui.querySelector("#inputCurrency").value;
    this.data.royaltiesPercent = this.ui.querySelector("#inputRoyalties").value;
    this.data.acceptRisk = this.ui.querySelector("#checkAcceptRisk").checked;

    if (isNaN(this.data.assetId)) {
      throw new Error("Asset ID is not a number");
    } else if (!algosdk.isValidAddress(this.data.buyerAddress)) {
      throw new Error("Alogorand wallet address is not valid");
    } else if (isNaN(this.data.price)) {
      throw new Error("Price is not a number");
    } else if (isNaN(this.data.royaltiesPercent)) {
      throw new Error("Royalties value is not a number");
    } else if (!this.data.acceptRisk) {
      throw new Error("Risk not accepted");
    }
  }

  async submitForm(event) {
    //cancel default behaviour when submiting a form
    event.preventDefault();

    try {
      await this.validate();
    } catch (err) {
      alert(err);
    }

    if (this.submitCallback) {
      this.submitCallback(this);
    }
  }

  makeBusy() {
    const submitButton = this.ui.querySelector("#buttonSubmit");
    submitButton.disabled = true;

    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
    Preview`;
  }

  stopBusy() {
    const submitButton = this.ui.querySelector("#buttonSubmit");
    submitButton.textContent = 'Preview';
    submitButton.disabled = false;
  }
}
