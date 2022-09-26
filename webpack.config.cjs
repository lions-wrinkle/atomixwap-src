const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInjector = require('html-webpack-injector');

module.exports = {
  entry: "./src/index.js",
  mode: "production",
  //devtool: "inline-source-map",
  output: {
    //filename: "main.js",
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  resolve: {
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "./src/assets", to: "" },
        { from: "./src/CNAME", to: "CNAME", toType: 'file'},
        //{ from: "./src/index.html", to: "index.html" },
      ],
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "./index.html",
      chunks: ["main"]
    }),
    new HtmlWebpackInjector() 
  ],
};
