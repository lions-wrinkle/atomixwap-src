import algosdk from "algosdk";
import { loadAssetImage } from "./asset-details";

export class SwapLinkConfirm {

    constructor(swapLinkGenerator, walletConnect, baseURL){

        this.swapLinkGenerator = swapLinkGenerator;
        this.walletConnect = walletConnect;
        this.baseURL = baseURL;

        this.ui = document.createElement("div");

        this.displayUI();
        
    }

    displayUI(){

        const transactions = this.swapLinkGenerator.transactions;

        const assetId = transactions.assetTransfer.assetIndex;
        const buyerAddress = algosdk.encodeAddress(transactions.assetTransfer.to.publicKey);
        const sellerAddress = algosdk.encodeAddress(transactions.assetTransfer.from.publicKey);

        let price;
        let currencyString;

        if (transactions.payment){

            price = transactions.payment.amount;

            if (transactions.payment.type === "pay"){
                //convert microalgo to algo
                price = price/1000000;
                currencyString = "ALGO";
            } else {

                let emoji = '';

                if (this.swapLinkGenerator.currencyAsset.index === 360019122){
                    emoji = '&#127844; '
                }
                
                currencyString = `${this.swapLinkGenerator.currencyAsset.params["unit-name"]} ${emoji}(ASA ${this.swapLinkGenerator.currencyAsset.index})`;
            }
        } else {
            price = 'nothing';
            currencyString = '';
        }
        

        this.ui.innerHTML = `<h4>Swap link</h4>
        <div class="row mb-3">
            <div class="col-md-6">
                <ul>
                    <li>You'll send asset <strong><a href="https://www.nftexplorer.app/asset/${assetId}" target="_blank">${assetId}</a></strong><br>(${this.swapLinkGenerator.asset.params.name})<br>
                    <span class="wallet-info">TO ${buyerAddress}</span></li>
                    <li>You'll receive <span class="price">${price} ${currencyString}</span></li>
                </ul>
            </div>
            <div class="col-md-6 ">
                <img src="default.png" id="imgAssetPreview" class="img-fluid">
            </div>
            
        </div>
        
        <a href="" id="swapLink" style="word-break: break-all;"></a><br>
        <span id="linkInfo" class="form-text mt-3" hidden>This link will expire in about 1h15.</span><br>
        <button class="btn btn-secondary" id="buttonCopy" hidden>copy</button>
        <div id="sign-info" class="mb-3"></div>
        <button class="btn btn-generate" id="buttonSign">Sign</button>`;

        //add royalties if needed
        if (transactions.royaltiesPayment){

            const listPreview = this.ui.querySelector('ul');
            const royaltiesPoint = document.createElement('li');

            let royaltiesAmount = transactions.royaltiesPayment.amount;

            if (transactions.royaltiesPayment.type === "pay"){
                //convert microalgo to algo
                royaltiesAmount = royaltiesAmount/1000000;
                currencyString = "ALGO";
            } else {
                currencyString = transactions.royaltiesPayment.assetIndex
            }

            const creatorAddress = algosdk.encodeAddress(transactions.royaltiesPayment.to.publicKey);

            royaltiesPoint.innerHTML = `Creator will receive <span class="price">${royaltiesAmount} ${currencyString}</span><br>
            <span class="wallet-info">TO ${creatorAddress}</span>`;

            listPreview.append(royaltiesPoint);

        }

        //load asset imazge
        loadAssetImage(assetId, this.ui.querySelector('#imgAssetPreview'), 512);


        this.ui.querySelector("#buttonSign").addEventListener('click', this.sign.bind(this))

    }

    makeBusy(){

        const submitButton = this.ui.querySelector('#buttonSign');
        submitButton.disabled = true;

        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Waiting for signature...`;

        if (this.walletConnect.walletType === 'pera'){
            this.ui.querySelector('#sign-info').innerHTML = `
            <div class="alert alert-primary d-flex align-items-center" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-phone" viewBox="0 0 16 16">
                <path d="M11 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H5z"/>
                <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                </svg>
                Please open your Pera Algo Wallet app to sign.
            </div>`;
        } 
        
        
    
      }

    async sign(event){

        const submitButton = this.ui.querySelector('#buttonSign');
        submitButton.disabled = true;
        this.makeBusy();

        try {
            const swapLink = await this.swapLinkGenerator.signAndGetLink(this.baseURL);
            this.displayLink(swapLink);

        } catch (err){

            submitButton.disabled = false;
            submitButton.innerHTML = 'Sign';

            alert(err);
        }

    }

    displayLink(url){

        this.ui.querySelector("#buttonSign").hidden = true;
        this.ui.querySelector('#sign-info').textContent = '';
        
        const swapLink = this.ui.querySelector("#swapLink");
        swapLink.href = url;
        swapLink.textContent = url;

        //display copy button
        this.ui.querySelector("#buttonCopy").hidden = false;
        this.ui.querySelector("#buttonCopy").addEventListener('click', (event) => {
            navigator.clipboard.writeText(url);
            event.currentTarget.textContent = "copied";
        })

        //display link info
        this.ui.querySelector("#linkInfo").hidden = false;

    }


}