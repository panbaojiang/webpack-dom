let currentHash;
class EventEmiter {
  constructor () {
    this.events = {}
  }
  on (eventName, fn) {
    this.events[eventName] = fn
  }
  emit (eventName, ...args) {
    this.events[eventName] && this.events[eventName](...args)
  }
}

const hotEmiter = new EventEmiter();

const socket = window.io('/')

socket.on('hash', (hash) => {
  console.log(hash, 'hash')
  currentHash = hash
})

socket.on('ok', () => {
  console.log('ok')
  hotEmiter.emit('webpackHotUpdate')
})