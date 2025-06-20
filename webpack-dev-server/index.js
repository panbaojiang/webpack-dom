/**
 * 引入 webpack 模块，用于创建编译器实例。
 * Webpack 是一个模块打包工具，可以将多个模块及其依赖打包成一个或多个 bundle。
 */
const webpack = require('webpack');

/**
 * 引入 Webpack 的配置对象。
 * 该配置对象定义了 Webpack 的打包行为，包括入口文件、输出文件、加载器、插件等。
 */
const config = require('../webpack.config');

/**
 * 引入自定义的 Server 类，用于创建开发服务器实例。
 * 该 Server 类是基于 Express 和 HTTP 服务器库实现的，用于创建开发服务器的功能。
 */
const Server = require('./lib/server');

/**
 * 创建 Webpack 编译器实例。
 * 通过调用 webpack 函数并传入配置对象，创建一个编译器实例。
 * 该实例负责执行 Webpack 的打包过程，包括解析配置、构建依赖图、生成输出文件等。
 */
const compiler = webpack(config);

/**
 * 创建开发服务器实例。
 * 传入编译器实例，使开发服务器能够与 Webpack 的打包过程进行交互。
 * 开发服务器通常提供实时重新加载、模块热更新等功能。
 */
const server = new Server(compiler);

/**
 * 启动开发服务器并监听指定端口。
 * 调用服务器实例的 listen 方法，启动服务器并监听指定的端口和主机。
 *
 * @param {number} port - 服务器监听的端口号。
 * @param {string} hostname - 服务器监听的主机名。
 * @param {function} callback - 服务器启动后的回调函数，通常用于处理启动成功或失败的情况。
 */
server.listen(8080, 'localhost', (err) => {
  if (err) {
    // 如果服务器启动过程中发生错误，抛出错误。
    throw err;
  }
  // 服务器成功启动后，输出日志信息。
  console.log('启动8080开发服务器');
});