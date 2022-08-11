import 'bootstrap'
import './wallet-connect'
import { WalletConnect } from './wallet-connect';
import { SwapLinkForm } from './swap-link-form';
import { SwapLinkManager } from './swap-link-manager';
import { SwapLinkConfirm } from './swap-link-confirm';
import algosdk, { makeApplicationClearStateTxn } from "algosdk";
import { SwapLinkAccept } from './swap-link-accept';

const network = "TESTNET"

let algodURL;
let algoIndexerURL;
let currencies;

if (network === "TESTNET"){

    algodURL = "https://node.testnet.algoexplorerapi.io";
    algoIndexerURL = "https://algoindexer.testnet.algoexplorerapi.io";

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

} else if (network === "MAINNET"){

    algodURL = "https://node.algoexplorerapi.io";
    algoIndexerURL = "https://algoindexer.algoexplorerapi.io";

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
if (networkBadge && network !== "MAINNET"){
    networkBadge.hidden = false;
    networkBadge.textContent = network.toLowerCase();
}


//append wallet connect ui
const walletConnect = new WalletConnect(connected, disconnected, 'btn');
walletConnectDiv.append(walletConnect.ui);

//retreive URL parameters
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

if (walletConnect.walletAddress){
    connected();
}

function connected(){

    walletConnectTitle.textContent = "Connected wallet";
    infoDiv.hidden = true;

    contentDiv.hidden = false;
    contentDiv.textContent = '';

    if (urlParams.get('swap')){

        //display accept swap
        try {
            const swapLinkAccept = new SwapLinkAccept(urlParams.get('swap'), walletConnect, algodClient, algoIndexer)
            contentDiv.append(swapLinkAccept.ui);
        } catch (err) {
            alert(err);
        }
        
    
    } else {
    
        //display form
        const swapLinkForm = new SwapLinkForm(currencies, defaultRoyalties, submitForm, walletConnect, algoIndexer);
        //swapLinkForm.submitCallback = submitForm;
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
