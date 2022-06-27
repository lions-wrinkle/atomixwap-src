import "./algosdk.min.js";

const algoIndexerURL = "https://algoindexer.algoexplorerapi.io";
const algoIndexer = new algosdk.Indexer("", algoIndexerURL, "443", {
  "User-Agent": "XXX",
});

const algodURL = "https://node.algoexplorerapi.io";
const algodClient = new algosdk.Algodv2("", algodURL, "");

const currencies = [
  {
      name: "ALGO",
      assetId: "algo"
  },
  {
      name: "DEGEN",
      assetId: 417708610
  },
  {
      name: "SHRIMP",
      assetId: 360019122
  }
  
];

const txTable = document.querySelector("#tx-table tbody");
const liveRoundSpan = document.querySelector("#live-round");
const currentRoundSpan = document.querySelector("#current-round");
const numTxSpan = document.querySelector("#num-tx");
const catchupSpan = document.querySelector("#catchup");

const backward = document.querySelector("#backward");

let round = 0;

backward.addEventListener('change', async (event) => {

  const result = await algodClient.status().do();
  console.log(result["last-round"]);
  console.log(event);
  round = result["last-round"] - parseInt(event.target.value);
  
});

(async () => {

  const result = await algodClient.status().do();
  round = result["last-round"];
  //round = 21862367;

  liveRoundSpan.textContent = result["last-round"];
  currentRoundSpan.textContent = round;

  while (true) {
    try {      

      const currentResult = await algodClient.statusAfterBlock(round).do();

      liveRoundSpan.textContent = currentResult["last-round"];
      catchupSpan.textContent = currentResult["last-round"] - round;

      const block = await algoIndexer.lookupBlock(round).do();
      const transactions = block.transactions;

      for (const tx of transactions) {

        if (!tx.note){
          continue;
        }

        try {

          const note = atob(tx.note);

          if (note === "atomixwap") {

            const roundDate = new Date(tx['round-time']*1000);
            const groupID = tx.group;

            let assetID;
            let assetName;
            let paymentsAlgo = [];

            //retreive main asset transfer
            for (const tx2 of transactions) {
              
              if (tx2.group === groupID){

                if (tx2["tx-type"] === "axfer" && tx2["asset-transfer-transaction"]["amount"] === 1){

                  assetID = tx2["asset-transfer-transaction"]["asset-id"];

                } else if (tx2["tx-type"] === "pay" && tx2["payment-transaction"]["amount"] > 0){

                  paymentsAlgo.push(`${tx2["payment-transaction"]["amount"]/1000000}A`);

                } else if (tx2["tx-type"] === "axfer" && tx2["asset-transfer-transaction"]["amount"] > 0 && currencies.map(c => parseInt(c.assetId)).includes(tx2["asset-transfer-transaction"]["asset-id"])){

                  const currency = currencies.filter(c => c.assetId === tx2["asset-transfer-transaction"]["asset-id"])[0].name;
                  paymentsAlgo.push(`${tx2["asset-transfer-transaction"]["amount"]} ${currency}`);

                }

              }

            }


            if (assetID){

              //load asset details
              const assetResult = await algoIndexer.lookupAssetByID(assetID).do();
              console.log(assetResult)
              assetName = assetResult["asset"]["params"]["name"];

            }

            const tr = document.createElement("tr");
            tr.innerHTML = `

            <th scope="row"><a href="https://algoexplorer.io/tx/${tx.id}" target="_blank">${tx.id.substring(0, 10)}...</a></td>
            <td>${roundDate.toLocaleString()}</td>
            <td><a href="https://algoexplorer.io/asset/${assetID}" target="_blank">${assetName}</a><br><small class="text-secondary">${assetID}</small></td>
            <td>${paymentsAlgo.join(', ')}</td>
            <td><a href="https://algoexplorer.io/tx/group/${encodeURIComponent(tx.group)}" target="_blank">${tx.group.substring(0, 10)}...</a></td>
            
            
            `;
            
            txTable.prepend(tr);

          }

        } catch (err) {
          //console.log(err)
          //currentRoundSpan.textContent = "Broke";
          console.log(err);
        }
      }

      currentRoundSpan.textContent = `${round}`
      numTxSpan.textContent = `${transactions.length}`
      

      round++;

    } catch (err) {
      currentRoundSpan.textContent = "Broke";
      alert(err);
    }
  }

  //const result = await algoIndexer.searchForTransactions().notePrefix().do();
  //console.log(result)
})();
