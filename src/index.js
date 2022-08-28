import 'bootstrap'
import './wallet-connect'
import { WalletConnect } from './wallet-connect';
import { SwapLinkManager } from './swap-link-manager';
import { SwapLinkConfirm } from './swap-link-confirm';
import algosdk from "algosdk";
import config from './config.js';


const algodURL = config.urls[config.network].algodUrl;
const algoIndexerURL = config.urls[config.network].algoIndexerUrl;
let currencies;

if (config.network === "testnet"){

    currencies = [
        {
            name: "ALGO",
            assetId: "algo"
        },
        {
            name: "TEST DEGEN",
            assetId: "94799644"
        }
    
    ];

} else if (config.network === "mainnet"){

    currencies = [
        {
            name: "ALGO",
            assetId: "algo"
        },
        {
            name: "DEGEN",
            assetId: "417708610"
        },
        {
            name: "SHRIMP",
            assetId: "360019122"
        },
        {
            name: "ALCH",
            assetId: "310014962"
        }
        
    ];

}

const baseURL = "https://atomixwap.xyz/";
const defaultRoyalties = 5.0;

const algodClient = new algosdk.Algodv2("", algodURL, '');
const algoIndexer = new algosdk.Indexer("",algoIndexerURL,"443",{ "User-Agent": "XXX" });

const title = document.getElementById("content-title");
const walletConnectTitle = document.getElementById("wallet-connect-title");
const walletConnectDiv = document.getElementById("wallet-connect-content");
const contentDiv = document.getElementById("content");
const infoDiv = document.getElementById("atomixwap-info");

//set network badge (testnet only)
const networkBadge = document.getElementById("networkBadge");
if (networkBadge && config.network !== "mainnet"){
    networkBadge.hidden = false;
    networkBadge.textContent = config.network.toLowerCase();
}


//append wallet connect ui
const walletConnect = new WalletConnect(connected, disconnected, 'btn');
walletConnectDiv.append(walletConnect.ui);

//retreive URL parameters
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

/*if (walletConnect.walletAddress){
    connected();
}*/

async function connected(){

    walletConnectTitle.textContent = "Connected wallet";
    infoDiv.hidden = true;

    contentDiv.hidden = false;
    contentDiv.textContent = '';

    if (urlParams.get('swap')){

        //display accept swap
        try {

            const swapLinkModule = await import('./swap-link-accept');
            const swapLinkAccept = new swapLinkModule.SwapLinkAccept(urlParams.get('swap'), walletConnect, algodClient, algoIndexer)
            contentDiv.append(swapLinkAccept.ui);

        } catch (err) {
            alert(err);
        }
    
    } else if (urlParams.get('optin')){

        //display optin page
        const optinModule = await import('./optin.js');
        const optin = new optinModule.OptIn(walletConnect, algodClient, urlParams.get('optin'));

        contentDiv.append(optin.ui);
        
    } else if (urlParams.has('claim')){

        //display claim page
        const claimModule = await import('./claim.js');
        const claim = new claimModule.Claim(walletConnect, algodClient);

        contentDiv.append(claim.ui);
    
    } else {
    
        //display form
        const swapLinkFormModule = await import('./swap-link-form');
        const swapLinkForm = new swapLinkFormModule.SwapLinkForm(currencies, defaultRoyalties, submitForm, walletConnect, algoIndexer);
        contentDiv.append(swapLinkForm.ui);
    
    }

}

function disconnected(){

    walletConnectTitle.textContent = "Connect wallet";
    infoDiv.hidden = false;

    contentDiv.hidden = true;
    contentDiv.textContent = '';
}

async function submitForm(form){

    form.makeBusy();

    //generate swap link
    const swapLinkGenerator = new SwapLinkManager(walletConnect, algodClient, algoIndexer);

    const fields = {
        assetId: parseInt(form.data.assetId, 10),
        sellerAddress: walletConnect.walletAddress,
        buyerAddress: form.data.buyerAddress,
        price: Number(form.data.price),
        currency: form.data.currency,
        royalties: Number(((form.data.price*form.data.royaltiesPercent)/100).toFixed(2)),
    }

    try {
        await swapLinkGenerator.generateTransactions(fields);
    } catch (err){
        form.stopBusy();
        alert(err);
        
    }
    

    const swapLinkConfirm = new SwapLinkConfirm(swapLinkGenerator, walletConnect, baseURL);

    contentDiv.textContent = '';
    contentDiv.append(swapLinkConfirm.ui);

}
