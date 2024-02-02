import algosdk from "algosdk";
import { loadAssetImage } from "./asset-details";
import config from "./config.js";

export class SwapLinkForm {
  constructor(
    currencies,
    defaultRoyalties,
    submitCallback,
    walletConnect,
    algoIndexer
  ) {
    this.ui = document.createElement("div");
    this.defaultRoyalties = defaultRoyalties;
    this.submitCallback = submitCallback;
    this.walletConnect = walletConnect;
    this.algoIndexer = algoIndexer;
    this.data = {};
    this.isAssetCreator = false;
    this.numNfts = 0;
    this.ndfWalletAddress;

    this.ui.innerHTML = `<h4>Create swap link</h4>
        <form>
                    <div class="mb-3" id="nfts">
                    </div>
                    <div class="mb-3">
                        <label for="inputAlgoAddress" class="form-label">Receiver</label>
                        <input type="text" class="form-control" id="inputAlgoAddress"
                            aria-describedby="AlgoAddressdHelp" required>
                        <div id="AlgoAddressdHelp" class="form-text">Algorand Wallet Address or NFD</div>
                    </div>
                    <div class="mb-3">
                        <div class="row">
                        <label for="inputPrice" class="form-label" id="price-label">Price</label>
                        <label for="inputPriceAssetId" class="form-label" id="nft-label" hidden>NFT to receive</label>
                            <div class="col" id="price-div">
                                <input type="number" class="form-control" id="inputPrice" min="0" step="1">
                            </div>
                            <div class="col" id="nft-div" hidden>
                                <input type="text" class="form-control" id="inputPriceAssetId" aria-describedby="priceAssetIdHelp"
                                    pattern="\\d*">
                                <div id="priceAssetIdHelp" class="form-text">ASA asset ID</div>
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

    //add nft form
    this.addNFT();

    //add currencies
    const inputCurrency = this.ui.querySelector("#inputCurrency");

    //add algo by default
    const algoOption = document.createElement("option");
    algoOption.textContent = "ALGO";
    algoOption.value = "algo";
    algoOption.selected = true;

    inputCurrency.append(algoOption);

    //add nft option
    const nftOption = document.createElement("option");
    nftOption.textContent = "NFT";
    nftOption.value = "nft";

    inputCurrency.append(nftOption);

    //add asa option
    const asaOptGroup = document.createElement("optgroup");
    asaOptGroup.label = "ASAs";
    inputCurrency.append(asaOptGroup);

    for (const currency of currencies) {
      const option = document.createElement("option");
      option.textContent = currency.name;
      option.value = currency.assetId;
      asaOptGroup.append(option);
    }

    //listen to change events
    this.ui
      .querySelector("#inputRoyalties")
      .addEventListener("input", this.royaltiesChange.bind(this), false);

    this.ui
      .querySelector("#inputCurrency")
      .addEventListener("change", this.currencyChange.bind(this), false);

    //listen to form submit event
    this.ui
      .querySelector("form")
      .addEventListener("submit", this.submitForm.bind(this), false);

    //find nfd
    this.ui
      .querySelector("#inputAlgoAddress")
      .addEventListener("focusout", this.checkNfd.bind(this), false);

    //update royalties
    this.ui.querySelector("#inputRoyalties").dispatchEvent(new Event("input"));
  }

  addNFT(event) {
    //hide '+' button that have been just clicked
    if (event && event.currentTarget) {
      event.currentTarget.hidden = true;
    }

    if (this.numNfts >= config.maxNfts) {
      return;
    }

    const nftsDiv = this.ui.querySelector("#nfts");

    const newNft = document.createElement("div");
    newNft.className = "row mt-2";
    newNft.innerHTML = `
      <div class="col-6">
        <label for="inputAssetId" class="form-label">NFT</label>
        <input type="text" class="form-control" id="inputAssetId" data-id="${this.numNfts}" aria-describedby="assetIdHelp"
            pattern="\\d*">
        <div id="assetIdHelp" class="form-text">ASA asset ID</div>
      </div>
      <div class="col-1">
        <br>
        <a href="javascript:void(0);" id="add-nft" hidden>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-plus-square mt-3" viewBox="0 0 16 16">
            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
        </a>
      </div>
      <div class="col-5 text-center">
        <img src="default.png" id="imgAssetPreview" width="auto" height="95">
      </div>
    `;

    const inputAssetId = newNft.querySelector(`#inputAssetId`);

    if (this.numNfts === 0) {
      inputAssetId.required = true;
    }

    inputAssetId.addEventListener(
      "focusout",
      this.assetIdFocusOut.bind(this),
      false
    );

    const addLink = newNft.querySelector(`#add-nft`);

    if (this.numNfts < config.maxNfts - 1) {
      addLink.hidden = false;
      addLink.addEventListener("click", this.addNFT.bind(this), false);
    }

    nftsDiv.append(newNft);

    this.numNfts++;
  }

  async assetIdFocusOut(event) {
    const inputAssetId = event.currentTarget;
    this.displayAssetInfo(inputAssetId);
  }

  async displayAssetInfo(inputAssetId) {
    const parent = inputAssetId.parentNode.parentNode;

    const assetIdHelp = parent.querySelector("#assetIdHelp");
    const assetImg = parent.querySelector("#imgAssetPreview");
    //const inputAssetId = this.ui.querySelector("#inputAssetId");
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
        console.error(err);
        assetIdHelp.innerHTML = `<span class="text-danger">Error: Asset with ID ${assetID} not found</span>`;

        this.isAssetCreator = false;
      }

      this.checkRoyaltiesAvailability();

      //load asset imazge
      loadAssetImage(assetID, assetImg, 200);
    } else {
      assetIdHelp.innerHTML = `<span class="text-danger">Wrong asset ID format</span>`;

      inputRoyalties.disabled = false;
      royaltiesdHelp.textContent = "";
    }
  }

  async checkNfd(event) {
    const address = event.currentTarget.value;

    const addressHelp = this.ui.querySelector("#AlgoAddressdHelp");

    this.ndfWalletAddress = undefined;

    if (address.endsWith(".algo")) {
      try {
        const response = await fetch("https://api.nf.domains/nfd/" + address +"?view=brief" );

        if (response.status === 200) {
          const json = await response.json();

          if (json.caAlgo && json.caAlgo.length > 0){
            this.ndfWalletAddress = json.caAlgo[0];
          } else if (json.unverifiedCaAlgo && json.unverifiedCaAlgo.length > 0){
            this.ndfWalletAddress = json.unverifiedCaAlgo[0];
          } else if (json.state === 'owned' && json.owner){
            this.ndfWalletAddress = json.owner;
          }

          if (this.ndfWalletAddress) {
            addressHelp.innerHTML = `<span class="text-success">${this.ndfWalletAddress}</span>`;
          }
          
        } else {
          addressHelp.innerHTML = `<span class="text-danger">Error: NFD ${address} not found</span>`;
        }
      } catch (err) {
        console.error(err);
        addressHelp.innerHTML = `<span class="text-danger">Error: Can't load NFD</span>`;
      }
    } else if (!algosdk.isValidAddress(address)) {
      addressHelp.innerHTML = `<span class="text-danger">Wrong wallet address format</span>`;
    } else {
      addressHelp.textContent = 'Algorand Wallet Address or NFD';
    }
  }

  currencyChange(event) {
    const currency = event.currentTarget.value;

    const nftInput = this.ui.querySelector("#nft-div");
    const nftLabel = this.ui.querySelector("#nft-label");
    const priceInput = this.ui.querySelector("#price-div");
    const priceLabel = this.ui.querySelector("#price-label");

    if (currency === "nft") {
      nftInput.hidden = false;
      nftLabel.hidden = false;
      nftInput.querySelector("input").required = true;

      priceInput.hidden = true;
      priceLabel.hidden = true;
      priceInput.querySelector("input").required = false;
    } else {
      nftInput.hidden = true;
      nftLabel.hidden = true;
      nftInput.querySelector("input").required = false;

      priceInput.hidden = false;
      priceLabel.hidden = false;
      priceInput.querySelector("input").required = true;
    }

    this.checkRoyaltiesAvailability();
  }

  async checkRoyaltiesAvailability() {
    const inputCurrency = this.ui.querySelector("#inputCurrency");
    const inputRoyalties = this.ui.querySelector("#inputRoyalties");
    const royaltiesdHelp = this.ui.querySelector("#royaltiesdHelp");
    const greenHeart = this.ui.querySelector("#royaltiesLoveGreen");
    const redHeart = this.ui.querySelector("#royaltiesLoveRed");

    //if there if multiple assets, check if they're from multiple creators
    let multipleCreators = false;

    if (this.numNfts > 1) {
      const assetIds = [];

      let prevCreator = "";

      for (const e of this.ui.querySelectorAll("#inputAssetId")) {
        if (e.value && !isNaN(e.value)) {
          try {
            const result = await this.algoIndexer
              .lookupAssetByID(parseInt(e.value))
              .do();

              if (prevCreator && prevCreator != result.asset.params.creator) {
              multipleCreators = true;
            }

            prevCreator = result.asset.params.creator;
          } catch (err) {
            console.error(err);
          }
        }
      }
    }


    if (
      inputCurrency.value !== "algo" ||
      this.isAssetCreator ||
      multipleCreators
    ) {
      inputRoyalties.value = 0;
      inputRoyalties.disabled = true;

      if (inputCurrency.value !== "algo") {
        royaltiesdHelp.textContent =
          "Royalty not available for other token than Algo";
      } else if (this.isAssetCreator) {
        royaltiesdHelp.textContent =
          "You're the creator of this asset, royalty disabled.";
      } else if (multipleCreators) {
        royaltiesdHelp.textContent =
          "Multiple creators detected, royalty disabled.";
      }

      greenHeart.hidden = true;
      redHeart.hidden = true;
    } else {
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

    const fontSize =
      minFontSize +
      (maxFontSize - minFontSize) *
        ((royaltiesSlider.value - royaltiesSlider.min) /
          (royaltiesSlider.max - royaltiesSlider.min));

    greenHeart.style = `font-size: ${fontSize}rem`;

    if (royaltiesSlider.value > sliderMin + (sliderMax - sliderMin) / 2) {
      const redHeartOpacity =
        (royaltiesSlider.value - (sliderMin + (sliderMax - sliderMin) / 2)) /
        ((sliderMax - sliderMin) / 2);

      let animation = "";
      if (royaltiesSlider.value === royaltiesSlider.max) {
        animation = "animation: animateHeart 1.2s infinite;";
      }

      redHeart.hidden = false;
      redHeart.style = `font-size: ${fontSize}rem; ${animation}`;
      greenHeart.style = `font-size: ${fontSize}rem; opacity: ${
        1 - redHeartOpacity
      }`;
    } else {
      redHeart.hidden = true;
    }
  }

  async validate() {

    await this.checkRoyaltiesAvailability();

    const assetIds = [];
    this.ui.querySelectorAll("#inputAssetId").forEach(async (e) => {
      if (e.value && !isNaN(e.value)) {
        assetIds.push(parseInt(e.value, 10));
        await this.displayAssetInfo(e);
      } else if (e.value && isNaN(e.value)) {
        throw new Error(`Wrong format for asset id ${e.value}`);
      }
    });

    this.data.assetIds = assetIds;
    this.data.buyerAddress = this.ui.querySelector("#inputAlgoAddress").value;
    this.data.price = this.ui.querySelector("#inputPrice").value;
    this.data.currency = this.ui.querySelector("#inputCurrency").value;
    this.data.royaltiesPercent = this.ui.querySelector("#inputRoyalties").value;
    this.data.acceptRisk = this.ui.querySelector("#checkAcceptRisk").checked;

    

    if (this.data.assetIds.length === 0) {
      throw new Error("No asset id provided or wrong format");
    } else if (this.data.buyerAddress.endsWith('.algo') && !this.ndfWalletAddress){
      throw new Error("NFD not found");
    } else if (!this.data.buyerAddress.endsWith('.algo') && !algosdk.isValidAddress(this.data.buyerAddress)) {
      throw new Error("Algorand wallet address is not valid");
    } else if (isNaN(this.data.price)) {
      throw new Error("Price is not a number");
    } else if (isNaN(this.data.royaltiesPercent)) {
      throw new Error("Royalties value is not a number");
    } else if (!this.data.acceptRisk) {
      throw new Error("Risk not accepted");
    } else if (
      this.data.currency === "nft" &&
      isNaN(this.ui.querySelector("#inputPriceAssetId").value)
    ) {
      throw new Error(
        `Wrong format for asset id ${
          this.ui.querySelector("#inputPriceAssetId").value
        }`
      );
    } 

    if (this.data.buyerAddress.endsWith('.algo')){
      this.data.buyerAddress = this.ndfWalletAddress;
    }

    this.data.priceAssetId = parseInt(
      this.ui.querySelector("#inputPriceAssetId").value
    );

    
  }

  async submitForm(event) {

    this.makeBusy();

    //cancel default behaviour when submiting a form
    event.preventDefault();

    try {
      await this.validate();
    } catch (err) {
      this.stopBusy();
      alert(err);
      return;
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
    submitButton.textContent = "Preview";
    submitButton.disabled = false;
  }
}
