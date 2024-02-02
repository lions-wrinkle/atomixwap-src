import "bootstrap";
import "./wallet-connect";
import { WalletConnect } from "./wallet-connect";
import { SwapLinkManager } from "./swap-link-manager";
import { SwapLinkConfirm } from "./swap-link-confirm";
import algosdk from "algosdk";
import config from "./config.js";

const algodURL = config.urls[config.network].algodUrl;
const algoIndexerURL = config.urls[config.network].algoIndexerUrl;
let currencies;

if (config.network === "testnet") {
  currencies = [
    {
      name: "TEST DEGEN",
      assetId: "94799644",
    },
    {
      name: "TEST PEPE",
      assetId: "210281421",
    },
  ];
} else if (config.network === "mainnet") {
  currencies = [
    
    {
      name: "ROAR",
      assetId: "917962457",
    },
    {
      name: "DEGEN",
      assetId: "417708610",
    },
    {
      name: "SHRIMP",
      assetId: "360019122",
    },
    {
      name: "GRUB",
      assetId: "787168529",
    },
    {
      name: "CRUMB",
      assetId: "751294723",
    },
    {
      name: "WIG",
      assetId: "952755839",
    },
    {
      name: "ALCH",
      assetId: "310014962",
    },
    {
      name: "BSCTS",
      assetId: "765722712",
    },
    {
      name: "ALC",
      assetId: "445905873",
    },
    { name: "PEPE", assetId: "1096015467" },
    {
      name: "COOP",
      assetId: "796425061",
    }
  ];
}

const baseURL = "https://atomixwap.xyz/";
const defaultRoyalties = 5.0;

const algodClient = new algosdk.Algodv2("", algodURL, "443");
const algoIndexer = new algosdk.Indexer("", algoIndexerURL, "443");

const title = document.getElementById("content-title");
const walletConnectTitle = document.getElementById("wallet-connect-title");
const walletConnectDiv = document.getElementById("wallet-connect-content");
const contentDiv = document.getElementById("content");
const infoDiv = document.getElementById("atomixwap-info");

//set network badge (testnet only)
const networkBadge = document.getElementById("networkBadge");
if (networkBadge && config.network !== "mainnet") {
  networkBadge.hidden = false;
  networkBadge.textContent = config.network.toLowerCase();
}

//append wallet connect ui
const walletConnect = new WalletConnect(connected, disconnected, "btn");
walletConnectDiv.append(walletConnect.ui);

//retreive URL parameters
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

/*if (walletConnect.walletAddress){
    connected();
}*/

async function connected() {
  walletConnectTitle.textContent = "Connected wallet";
  infoDiv.hidden = true;

  contentDiv.hidden = false;
  contentDiv.textContent = "";

  if (urlParams.get("swap")) {
    //display accept swap
    try {
      const swapLinkModule = await import("./swap-link-accept");
      const swapLinkAccept = new swapLinkModule.SwapLinkAccept(
        urlParams.get("swap"),
        walletConnect,
        algodClient,
        algoIndexer
      );
      contentDiv.append(swapLinkAccept.ui);
    } catch (err) {
      alert(err);
    }
  } else if (urlParams.get("optin")) {
    //display optin page
    const optinModule = await import("./optin.js");
    const optin = new optinModule.OptIn(
      walletConnect,
      algodClient,
      urlParams.get("optin")
    );

    contentDiv.append(optin.ui);
  } else if (urlParams.get("verify")) {
    //display optin page
    const verifyModule = await import("./verify.js");
    const verify = new verifyModule.verify(
      walletConnect,
      algodClient,
      urlParams
    );

    contentDiv.append(verify.ui);
  } else if (urlParams.has("claim")) {
    //display claim page
    const claimModule = await import("./claim.js");
    const claim = new claimModule.Claim(walletConnect, algodClient);

    contentDiv.append(claim.ui);
  } else {
    //display form
    const swapLinkFormModule = await import("./swap-link-form");
    const swapLinkForm = new swapLinkFormModule.SwapLinkForm(
      currencies,
      defaultRoyalties,
      submitForm,
      walletConnect,
      algoIndexer
    );
    contentDiv.append(swapLinkForm.ui);
  }
}

function disconnected() {
  walletConnectTitle.textContent = "Connect wallet";
  infoDiv.hidden = false;

  contentDiv.hidden = true;
  contentDiv.textContent = "";
}

async function submitForm(form) {
  form.makeBusy();

  //generate swap link
  const swapLinkGenerator = new SwapLinkManager(
    walletConnect,
    algodClient,
    algoIndexer
  );

  const fields = {
    assetIds: form.data.assetIds,
    sellerAddress: walletConnect.walletAddress,
    buyerAddress: form.data.buyerAddress,
    price: Number(form.data.price),
    priceAssetId: form.data.priceAssetId,
    currency: form.data.currency,
    royalties: Number(
      ((form.data.price * form.data.royaltiesPercent) / 100).toFixed(2)
    ),
  };

  try {
    await swapLinkGenerator.generateTransactions(fields);
  } catch (err) {
    form.stopBusy();
    console.error(err);
    alert(err);
    return;
  }

  const swapLinkConfirm = new SwapLinkConfirm(
    swapLinkGenerator,
    walletConnect,
    baseURL
  );

  contentDiv.textContent = "";
  contentDiv.append(swapLinkConfirm.ui);
}

//load stats
async function displayStats() {
  try {
    const result = await fetch("https://api.atomixwap.xyz/swap-stats/");
    //const result = await fetch('https://localhost/swap-stats/');
    const json = await result.json();

    document.querySelector("#stats").innerHTML = `
        7 days volume: <span style="color: var(--white);">${json.volW}A</span> (${json.cntW} swaps)
        `;
  } catch (err) {
    console.error(err);
  }
}

//displayStats();
