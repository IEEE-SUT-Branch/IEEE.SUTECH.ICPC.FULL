class SimpleQueue {
  constructor(concurrency = 3) {
    this.concurrency = concurrency;
    this.running = 0;
    this.waiting = [];
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.waiting.push({ task, resolve, reject });
      this._next();
    });
  }

  _next() {
    while (this.running < this.concurrency && this.waiting.length > 0) {
      this.running++;
      const { task, resolve, reject } = this.waiting.shift();
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.running--;
          this._next();
        });
    }
  }

  get pending() {
    return this.waiting.length;
  }

  get active() {
    return this.running;
  }
}

module.exports = SimpleQueue;
