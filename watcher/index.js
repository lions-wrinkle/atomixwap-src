import "./algosdk.min.js";

const algoIndexerURL = "https://algoindexer.algoexplorerapi.io";
const algoIndexer = new algosdk.Indexer("", algoIndexerURL, "443", {
  "User-Agent": "XXX",
});

const algodURL = "https://node.algoexplorerapi.io";
const algodClient = new algosdk.Algodv2("", algodURL, "");

(async () => {
  const result = await algodClient.status().do();
  let round = result["last-round"];
  //round = 21602137;

  const txListUL = document.querySelector("#tx-list");
  const roundDiv = document.querySelector("#round");

  while (true) {
    try {
      const currentResult = await algodClient.statusAfterBlock(round).do();

      const block = await algoIndexer.lookupBlock(round).do();
      const transactions = block.transactions;

      for (const tx of transactions) {
        try {
          const note = atob(tx.note);
          if (note === "atomixwap") {
            console.log(note);

            const li = document.createElement("li");
            li.innerHTML = `<a href="https://algoexplorer.io/tx/${
              tx.id
            }" target="_blank">${tx.id}</a> ${new Date()}`;
            txListUL.append(li);
          }
        } catch (err) {
          //console.log(err)
          roundDiv.textContent = "Broke";
        }
      }

      console.log(round);
      roundDiv.textContent = `${round} - ${transactions.length} tx`;
      round++;

    } catch (err) {
        roundDiv.textContent = "Broke";
      console.log(err);
    }
  }

  //const result = await algoIndexer.searchForTransactions().notePrefix().do();
  //console.log(result)
})();
