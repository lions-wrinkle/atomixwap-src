import algosdk from "algosdk";
import { loadAssetImage } from "./asset-details";

export class SwapLinkConfirm {

    constructor(swapLinkManager, walletConnect, baseURL){

        this.swapLinkManager = swapLinkManager;
        this.walletConnect = walletConnect;
        this.baseURL = baseURL;

        this.ui = document.createElement("div");

        this.displayUI();
        
    }

    displayUI(){

        const transactions = this.swapLinkManager.transactions;

        const assetIds = transactions.assetTransfers.map(tx => tx.assetIndex);
        const buyerAddress = algosdk.encodeAddress(transactions.assetTransfers[0].to.publicKey);
        const sellerAddress = algosdk.encodeAddress(transactions.assetTransfers[0].from.publicKey);

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

                if (this.swapLinkManager.currencyAsset.index === 360019122){
                    emoji = '&#127844; '
                }
                
                currencyString = `${this.swapLinkManager.currencyAsset.params["name"]} ${emoji}(ASA ${this.swapLinkManager.currencyAsset.index})`;
            }
        } else {
            price = 'nothing';
            currencyString = '';
        }
        
        const assetList = this.swapLinkManager.assets.map(asset => {
            return `<strong><a href="https://www.nftexplorer.app/asset/${asset.index}" target="_blank">${asset.index}</a></strong> (${asset.params.name})`
        })

        this.ui.innerHTML = `<h4>Swap link</h4>
        <div class="row mb-3">
            <div class="col-md-6">
                <ul>
                    <li>You'll send asset${assetList.length > 1 ? 's' : ''} ${assetList.join(', ')}<br>
                    <span class="wallet-info">TO ${buyerAddress}</span></li>
                    <li>You'll receive <span class="price">${price} ${currencyString}</span></li>
                </ul>
            </div>
            <div class="col-md-6 ">
                <img src="default.png" id="imgAssetPreview" class="img-fluid">
            </div>
            
        </div>
        
        <a href="" id="swapLink" style="word-break: break-all;"></a><br>
        <span id="linkInfo" class="form-text mt-3" hidden>This link will expire in about 1h15. (<a href="https://developer.algorand.org/docs/get-details/transactions/#sending-a-transaction-in-the-future" target="_blank">Why?</a>)</span><br>
        <button class="btn btn-secondary" id="buttonCopy" hidden>copy</button>
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
        loadAssetImage(assetIds[0], this.ui.querySelector('#imgAssetPreview'), 512);


        this.ui.querySelector("#buttonSign").addEventListener('click', this.sign.bind(this))

    }

    makeBusy(){

        const submitButton = this.ui.querySelector('#buttonSign');
        submitButton.disabled = true;

        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Waiting for signature...`;

        /*if (this.walletConnect.walletType === 'pera'){
            this.ui.querySelector('#sign-info').innerHTML = `
            <div class="alert alert-primary d-flex align-items-center" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-phone" viewBox="0 0 16 16">
                <path d="M11 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H5z"/>
                <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                </svg>
                Please open your Pera Algo Wallet app to sign.
            </div>`;
        } */
        
        
    
      }

    async sign(event){

        const submitButton = this.ui.querySelector('#buttonSign');
        submitButton.disabled = true;
        this.makeBusy();

        try {
            const swapLink = await this.swapLinkManager.signAndGetLink(this.baseURL);
            this.displayLink(swapLink);

        } catch (err){

            console.error(err);

            submitButton.disabled = false;
            submitButton.innerHTML = 'Sign';

            alert(err);
        }

    }

    displayLink(url){

        this.ui.querySelector("#buttonSign").hidden = true;
        //this.ui.querySelector('#sign-info').textContent = '';
        
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