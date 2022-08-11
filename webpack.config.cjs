const path = require('path');
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: './src/index.js',
  'mode': 'production',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify")
    }
    
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "./src/assets", to: "" },
        { from: "./src/index.html", to: "index.html" },
      ],
    }),
  ]
  
};

