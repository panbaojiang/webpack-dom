const path = require('path');
const { HotModuleReplacementPlugin } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  devServer: {
    hot: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html', // 指定 HTML 模板
    }),
    new HotModuleReplacementPlugin()
  ],
}