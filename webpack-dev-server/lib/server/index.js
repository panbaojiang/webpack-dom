// 引入Node.js内置path模块，用于处理文件路径
const path = require('path')

/**
 * 引入http模块，用于创建HTTP服务器
 * Node.js内置的http模块，提供了创建HTTP服务器和客户端的功能
 */
const http = require('http');

/**
 * 引入express模块，用于创建Express应用程序
 * Express是一个轻量级的Web应用框架，用于快速构建Web应用程序和API
 */
const express = require('express');
// 引入mime模块，用于根据文件扩展名获取MIME类型
const mime = require('mime')
// const MemoryFS = require('memory-fs') // 基于内存

// 引入fs-extra模块，提供增强的文件系统操作功能
const fs = require('fs-extra') // 基于硬盘文件系统
// 为fs模块添加join方法，模拟memory-fs的行为
fs.join = path.join
// 引入socket.io模块，用于实现WebSocket通信
const socketIo = require('socket.io')
// 引入自定义的updateCompiler工具函数
const updateCompiler = require('../utils/updateCompiler');

/**
 * 定义Server类，用于封装Web服务器功能
 * 该类封装了Express应用程序的创建和HTTP服务器的设置
 */
class Server {
  /**
   * Server类的构造函数
   *
   * @param {Object} compiler - Webpack编译器实例
   * 该实例用于与Webpack打包过程进行交互，提供编译状态等信息
   */
  constructor (compiler) {
    // 将传入的编译器实例赋值给类的实例属性
    this.compiler = compiler;
    this.currentHash // 存储当前编译的hash值
    this.clientSocketList = [] // 存储连接的客户端Socket列表

    // 初始化Express应用程序
    this.setApp();
    // 设置Webpack编译器钩子
    this.setupHooks()
    // 设置中间件
    this.setupMidlewares();
    // 设置路由
    this.setRoutes()
    // 创建HTTP服务器
    this.createServer();
    // 创建WebSocket服务器
    this.createSocketServer()
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
   * 设置Webpack编译器钩子
   * 监听Webpack编译完成事件，用于通知客户端更新
   */
  setupHooks () {
    const { compiler } = this
    // 监听Webpack的done钩子，当编译完成时触发
    compiler.hooks.done.tap('webpack-dev-server', (stats) => {
      // 更新当前hash值为最新编译的hash
      this.currentHash = stats.hash
      // 向所有连接的客户端发送hash更新和ok信号
      this.clientSocketList.forEach((socket) => {
        socket.emit('hash', stats.hash) // 发送当前hash值
        socket.emit('ok') // 发送编译完成信号
      })
    })
  }

  /**
   * 设置中间件
   * 初始化Webpack中间件
   */
  setupMidlewares () {
    this.midlewares = this.webpackMidleware()
  }

  /**
   * 创建Webpack中间件
   * 处理静态文件请求和Webpack编译输出
   *
   * @returns {Function} Express中间件函数
   */
  webpackMidleware () {
    const { compiler } = this
    // 启动Webpack的监听模式，当文件变化时自动重新编译
    compiler.watch({}, () => {
      console.log('监听编译模式开启')
    })
    // 内存文件系统实例
    // let fs = new MemoryFS()

    // 设置Webpack的输出文件系统为fs-extra
    this.fs = compiler.outputFileSystem = fs

    /**
     * 返回一个Express中间件函数，用于处理静态文件请求
     *
     * @param {string} staticDir - 静态文件目录路径
     * @returns {Function} Express中间件函数
     */
    return (staticDir) => {
      return (req, res, next) => {
        let { url } = req
        // 处理favicon.ico请求
        if (url === 'favicon.ico') {
          return res.sendStatus(404)
        }
        // 如果URL是根路径，默认指向index.html
        url === '/' ? url = '/index.html' : null
        // 构建文件完整路径
        let filePath = path.join(staticDir, url)

        try {
          // 获取文件状态信息
          const statObj = this.fs.statSync(filePath)
          if (statObj.isFile()) { // 如果是文件
            // 读取文件内容
            const content = this.fs.readFileSync(filePath, 'utf-8')
            // 设置Content-Type响应头
            res.setHeader('Content-Type', mime.getType(filePath))
            // 发送文件内容
            res.send(content)
          } else { // 如果是目录
            return res.sendStatus(404) // 返回404
          }
        } catch (error) {
          // 文件不存在或其他错误
          return res.sendStatus(404) // 返回404
        }
      }
    }
  }

  /**
   * 设置路由
   * 将Webpack中间件应用到Express应用
   */
  setRoutes () {
    const { compiler } = this
    const config = compiler.options // 获取Webpack配置
    // 使用中间件处理静态文件请求
    this.app.use(this.midlewares(config.output.path))
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
   * 创建WebSocket服务器
   * 使用socket.io实现实时双向通信
   */
  createSocketServer () {
    // 创建socket.io实例，附加到HTTP服务器上
    const io = socketIo(this.server)
    // 监听客户端连接事件
    io.on('connection', (socket) => {
      // 将新连接的socket添加到客户端列表
      this.clientSocketList.push(socket)
      // 向新连接的客户端发送当前hash值
      socket.emit('hash', this.currentHash)
      // 向新连接的客户端发送ok信号
      socket.emit('ok')
      // 监听客户端断开连接事件
      socket.on('disconnect', () => {
        // 从客户端列表中移除断开连接的socket
        this.clientSocketList = this.clientSocketList.filter((item) => item !== socket)
      })
    })
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

// 导出Server类，以便在其他模块中使用
module.exports = Server;