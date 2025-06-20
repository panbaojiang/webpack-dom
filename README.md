
## webpack执行流程
  1. 初始化：将配置文件作为参数传给webpack函数解析，生成Compiler对象

    ```js
    const config = require('./webpack.config.js');
    const Compiler = webpack(config);
    ```

    > Compiler 对象是 Webpack 的核心对象，它负责整个编译过程，包括解析配置、编译模块、输出文件等。

  2. 开始编译：调用 Compiler 对象 run 方法开始执行编译
    ```js
    Compiler.run((err, stats) => {...});
    ```
    > Compiler.run() 方法会触发 Compiler 对象的 compilation 事件，开始编译过程。

  3. 确定入口：根据配置中的 entry 找出所有的文件的入口作为编译的起点
    ```js
    const entry = config.entry;
    ```
  4. 编译模块：从入口文件出发，调用所有配置的 Loader 对模块进行编译，再找出该模块依赖的模块，递归直到所有模块被加载进来
    ```js
    const normalModuleLoader = new NormalModuleLoader(compiler.context);
    const module = normalModuleLoader.loadModule(entry, (err, source, sourceMap, module) => {...});
    ```
    > NormalModuleLoader 是 Webpack 内置的模块加载器，用于加载和编译模块。

  5. 完成模块编译：所有模块构建完成后触发 finishModules 钩子，建立模块间的依赖关系图，准备进行代码生成阶段。
    ```js
    compilation.finish((err) => {...});
    ```
    > compilation 是 Compiler 对象的一个实例，用于管理编译过程中的所有模块和依赖关系。

  6. 输出资源：根据入口和模块之间的依赖关系，组装成一个个包含多个模块的 chunk，再把每个 chunk 转换成一个单独的文件加入到输出列表。
    ```js
    compilation.seal((err, chunks) => {...});
    ```
    > seal() 方法会触发 compilation 的 seal 事件，开始生成输出文件。
  7. 输出完成：再确定好输出内容后，根据配置确定输出的路径和文件名，把文件内容写入到文件系统
    ```js
    compilation.createChunkAssets((err, chunk) => {...});
    ```
    > createChunkAssets() 方法会触发 compilation 的 createChunkAssets 事件，开始生成输出文件。

## webpack-dev-server
  1. 创建一个 Webpack 编译器
    ```js
      const compiler = webpack(config);
    ```

  2. 创建开发服务器实例
    ```js
      //引入express模块，用于创建Express应用程序
      const express = require('express');

      // 引入http模块，用于创建HTTP服务器
      const http = require('http');

      class Server {
          /**
          * Server类的构造函数
          * @param {Object} compiler - Webpack编译器实例
          * 该实例用于与Webpack打包过程进行交互，提供编译状态等信息
          */
        constructor (compiler) {
          // 将传入的编译器实例赋值给类的实例属性
          this.compiler = compiler;
          // 初始化Express应用程序
          this.setApp();
          // 创建HTTP服务器
          this.createServer();
        }
        /**
        * 初始化Express应用程序
        * 创建一个新的Express应用实例，并将其赋值给类的实例属性
        */
        setApp () {
          // 使用express()函数创建一个新的Express应用实例
          this.app = express();
        }
        /**
         * 创建HTTP服务器
        * 使用Node.js的http模块创建HTTP服务器，并将Express应用作为请求处理器
        */
        createServer () {
          // 使用http.createServer方法创建HTTP服务器，传入Express应用作为请求处理器
          this.server = http.createServer(this.app);
        }
        /**
         * 启动HTTP服务器并监听指定端口和主机
        *
        * @param {number} port - 服务器监听的端口号
        * @param {string} host - 服务器监听的主机名
        * @param {function} callback - 服务器启动后的回调函数
        */
        listen (port, host, callback) {
          // 调用HTTP服务器实例的listen方法，启动服务器并监听指定的端口和主机
          this.server.listen(port, host, callback);
        }
      }
    ```
    > 传入编译器实例，使开发服务器能够与 Webpack 的打包过程进行交互。
    > 开发服务器通常提供实时重新加载、模块热更新等功能。

  4. 启动开发服务器
    ```js
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
    ```
    > server.listen() 方法会启动开发服务器，监听指定的端口和主机名。

## webpack-HMR

- 热加载原理
  - HMR的核心就是客户端从服务端拉去更新后的文件，准确的说是 chunk diff (chunk 需要更新的部分)
  - 实际上 WDS 与浏览器之间维护了一个Websocket，当本地资源发生变化时，WDS 会向浏览器推送更新，并带上构建时的 hash，让客户端与上一次资源进行对比。
  - 客户端对比出差异后会向 WDS 发起Ajax请求来获取更改内容(文件列表、hash)，
  - 这样客户端就可以再借助这些信息继续向 WDS 发起jsonp请求获取该chunk的增量更新。

- hotModuleReplacementPlugin
  + 它会生成2个布丁文件
    - 上一次编译生成的has.hot-update.json 说明上次编译到现在哪些代码块发生改变
    - chunk名字.上一次编译生成的has.hot-update.js 存放着此代码块最新的模块定义，里面会调用webpackHotUpdate 方法

  + 向代码块中注入`HMR runtime`代码，热更新的主要逻辑，拉取代码、执行代码、执行accpet回调都是它注入到chunk中的

  + hotCreateRequire 会帮我们给模块module 的parents children赋值
