import algosdk from "algosdk";

export class SwapLinkManager {
  constructor(walletConnect, algodClient, algoIndexer) {
    this.walletConnect = walletConnect;
    this.algodClient = algodClient;
    this.algoIndexer = algoIndexer;
    this.transactions;
    this.asset;
    this.currencyAsset;
  }

  static signedTxToBase64(signedTx) {
    return btoa(String.fromCharCode.apply(null, signedTx));
  }

  static base64ToSignedTx(base64Str) {
    const binaryString = atob(base64Str);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (var i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  async generateTransactions(fields) {
    //load asset
    const result = await this.algoIndexer.lookupAssetByID(fields.assetId).do();
    this.asset = result.asset;

    //load currency asset
    if (fields.currency !== "algo") {
      const result = await this.algoIndexer
        .lookupAssetByID(parseInt(fields.currency))
        .do();
      this.currencyAsset = result.asset;
    }

    let params = await this.algodClient.getTransactionParams().do();

    this.transactions = {};

    //optin transaction
    this.transactions.optin =
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: { ...params },
        from: fields.buyerAddress,
        to: fields.buyerAddress,
        assetIndex: fields.assetId,
        amount: 0,
      });

    //asset transfer transaction
    const enc = new TextEncoder();
    const note = enc.encode("atomixwap");

    this.transactions.assetTransfer =
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: { ...params },
        from: fields.sellerAddress,
        to: fields.buyerAddress,
        assetIndex: fields.assetId,
        amount: 1,
        note: note,
      });

    //payment transaction
    if (fields.price > 0) {
      //only if price > 0
      if (fields.currency === "algo") {
        let microAlgosPrice = Math.round(fields.price * 1000000);

        if (
          fields.royalties &&
          fields.royalties > 0 &&
          fields.currency === "algo"
        ) {
          microAlgosPrice =
            microAlgosPrice - Math.round(fields.royalties * 1000000);
        }

        this.transactions.payment =
          algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            suggestedParams: { ...params },
            from: fields.buyerAddress,
            to: fields.sellerAddress,
            amount: microAlgosPrice,
          });
      } else {
        const currencyAssetId = parseInt(fields.currency);

        this.transactions.payment =
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            suggestedParams: { ...params },
            from: fields.buyerAddress,
            to: fields.sellerAddress,
            assetIndex: currencyAssetId,
            amount: Math.round(fields.price),
          });

        this.transactions.optinCurrency =
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            suggestedParams: { ...params },
            from: fields.sellerAddress,
            to: fields.sellerAddress,
            assetIndex: currencyAssetId,
            amount: 0,
          });
      }
    }

    //royalties
    if (
      fields.price > 0 &&
      fields.royalties &&
      fields.royalties > 0 &&
      fields.currency === "algo"
    ) {
      const creatorAddress = this.asset.params.creator;

      const microAlgosRoyalties = Math.round(fields.royalties * 1000000);

      this.transactions.royaltiesPayment =
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          suggestedParams: { ...params },
          from: fields.buyerAddress,
          to: creatorAddress,
          amount: microAlgosRoyalties,
        });
    }

    let transactionsArray = [];

    transactionsArray.push(this.transactions.optin);
    transactionsArray.push(this.transactions.assetTransfer);

    if (this.transactions.optinCurrency) {
      transactionsArray.push(this.transactions.optinCurrency);
    }

    if (this.transactions.payment) {
      transactionsArray.push(this.transactions.payment);
    }

    if (this.transactions.royaltiesPayment) {
      transactionsArray.push(this.transactions.royaltiesPayment);
    }

    if (fields.groupID) {
      transactionsArray.map((tx) => (tx.group = fields.groupID));
    } else {
      //assign group id if not provided in fields
      const txGroup = algosdk.assignGroupID(transactionsArray);
    }

    if (fields.firstRound) {
      transactionsArray.map((tx) => (tx.firstRound = fields.firstRound));
    }

    if (fields.lastRound) {
      transactionsArray.map((tx) => (tx.lastRound = fields.lastRound));
    }
  }

  //seller
  async signAndGetLink(baseURL) {

    let transactionsGroup = [];
    let transactionsIndexes = {};

    let i = 0;

    for (const txName in this.transactions){

      if (this.transactions[txName]){
        transactionsGroup.push(this.transactions[txName]);
        transactionsIndexes[txName] = i;
        i++;
      }

    }

    const signedTransferTransaction = await this.walletConnect.signTransactions(
      transactionsGroup
    );

    let currency = "algo";
    let price = 0;

    if (this.transactions.payment) {
      if (this.transactions.payment.type === "pay") {
        currency = "algo";
        price = this.transactions.payment.amount / 1000000;
      } else {
        currency = this.transactions.payment.assetIndex;
        price = this.transactions.payment.amount;
      }
    }

    let outputJson = {
      price: price,
      currency: currency,
      signedTransferTx: SwapLinkManager.signedTxToBase64(
        signedTransferTransaction[transactionsIndexes['assetTransfer']]
      ),
    };

    if (this.transactions.optinCurrency) {
      outputJson.signedOptinCurrencyTx = SwapLinkManager.signedTxToBase64(
        signedTransferTransaction[transactionsIndexes['optinCurrency']]
      );
    }

    if (this.transactions.royaltiesPayment && this.transactions.payment) {
      outputJson.royalties =
        this.transactions.royaltiesPayment.amount / 1000000;
      outputJson.price =
        (this.transactions.payment.amount +
          this.transactions.royaltiesPayment.amount) /
        1000000;
    }

    const jsonStr = JSON.stringify(outputJson);
    const base64Str = btoa(jsonStr);

    return `${baseURL}?swap=${base64Str}`;
  }

  //buyer
  async signAndCommitTransactions(
    signedTransferTransaction,
    signedOptinCurrencyTransaction,
    signedCallback,
    successCallback,
    failedCallback
  ) {

    let transactionsGroup = [];
    let transactionsIndexes = {};

    let i = 0;
    for (const txName in this.transactions){

      if (this.transactions[txName]){
        transactionsGroup.push(this.transactions[txName]);
        transactionsIndexes[txName] = i;
        i++;
      }

    }

    const signedTransactions = await this.walletConnect.signTransactions(
      transactionsGroup
    );

    //call callback
    signedCallback();

    let finalSignedTransactions;

    if (!this.transactions.optinCurrency) {
      //algo transaction
      finalSignedTransactions = [
        signedTransactions[transactionsIndexes['optin']],
        signedTransferTransaction
      ];

      if (this.transactions.payment) {
        finalSignedTransactions.push(signedTransactions[transactionsIndexes['payment']]);
      }

    } else {
      //other currency transaction
      finalSignedTransactions = [
        signedTransactions[transactionsIndexes['optin']],
        signedTransferTransaction,
        signedOptinCurrencyTransaction,
        signedTransactions[transactionsIndexes['payment']],
      ];
    }

    if (this.transactions.royaltiesPayment) {
      finalSignedTransactions.push(signedTransactions[transactionsIndexes['royaltiesPayment']]);
    }

    //send to the network
    // Submit the transaction
    let tx;
    try {
      tx = await this.algodClient
        .sendRawTransaction(finalSignedTransactions)
        .do();
    } catch (err) {
      console.log(err);
      failedCallback(err);
      return;
    }

    // Wait for confirmation
    let confirmedTxn = await algosdk.waitForConfirmation(
      this.algodClient,
      tx.txId,
      4
    );

    console.log(
      "Transaction " +
        tx.txId +
        " confirmed in round " +
        confirmedTxn["confirmed-round"]
    );

    successCallback();
  }
}
