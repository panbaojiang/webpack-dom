/**
 * 为了实现客户端跟服务端通信，需要往入口里注入2个文件
 *  @url webpack-dev-server/client/index.js
 *  @url webpack/hot/dev-server.js  webpack源码
 *  @url ./src/index.js是webpack.config.js 入口文件
 *  @params {*} compiler
 */


const path = require("path");
const updateCompiler = (compiler) => {
  const config = compiler.options;
  config.entry = {
    main: [
      path.resolve(__dirname, '../../client/index.js'),
      path.resolve(__dirname, '../../../webpack/hot/dev-server.js'),
      config.entry
    ]
  }
}

module.exports = updateCompiler;