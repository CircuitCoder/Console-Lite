const crypto = require('crypto');
const assert = require('assert');

class Conference {
  constructor(name, db) {
    this.name = name;
    this.db = db;

    this.listeners = [];
    this.runningTimers = new Map();
    this.timerValues = new Map();
  }

  setup(cb) {
    Promise.all([
      (resolve, reject) => this.db.put('timers', [], err => err ? reject(err) : resolve()),
      (resolve, reject) => this.db.put('seats', [], err => err ? reject(err) : resolve()),
    ].map(e => new Promise(e))).then(() => cb(null)).catch(cb);
  }

  _startTimer(id, refkey, cb) {
    if(this.runningTimers.has(id)) return cb('AlreadyStarted');
    this.runningTimers.set(id, 0); // To block following invokes

    this.db.get(refkey, (err, value) => {
      if(err) {
        this.runningTimers.delete(id);
        return cb(err);
      } 

      this.timerValues.set(id, value);
      const intId = setInterval(() => {
        const t = this.timerValues.get(id) - 1;
        assert(t >= 0);
        this.timerValues.set(id);

        for(const l of this.listeners)
          if(l.timerTick) l.timerTick(id, value);

        if(t === 0) {
          clearInterval(intId);
          stopTimer(id, err => {
            if(err) console.error(err);
          });
        }
      }, 1000);

      for(const l of this.listeners)
        if(l.timerStarted) l.timerStarted(id, value);

      cb(null);
    });
  }

  startTimer(id, cb) {
    return this._startTimer(id, `timer:left:${id}`, cb);
  }

  restartTimer(id, cb) {
    return this._startTimer(id, `timer:left:${id}`, cb);
  }

  stopTimer(id, cb) {
    if(!this.runningTimers.has(id)) return cb('AlreadyStopped');
    const intId = this.runningTimers.get(id);

    // TODO: if stopTimer is called right after startTimer, this.timerValues[id] may be undefined

    this.db.put(`timer:left:${id}`, this.timerValues.get(id), (err) => {
      if(err) return cb(err);

      clearInterval(intId);
      this.runningTimers.delete(id);

      for(const l of this.listeners)
        if(l.timerStopped) l.timerStopped(id);

      cb(null);
    });
  }

  updateTimer(id, value, cb) {
    if(this.runningTimers.had(id)) return cb('TimerRunning');

    Promise.all([
      (resolve, reject) => this.db.put(`timers:left:${id}`, value, err => err ? reject(err) : resolve(err)),
      (resolve, reject) => this.db.put(`timers:${id}`, value, err => err ? reject(err) : resolve(err)),
    ].map(e => new Promise(e))).then(() => {
      for(const l of this.listeners)
        if(l.timerUpdated) l.timerUpdated(id, value);
      cb(null);
    }).catch(cb);
  }

  /**
   * Possible values for type:
   * - 'standalone': A standalone timer
   * - 'speaker': A timer for a speaker list, whose name must be identical to the list's id
   */

  addTimer(name, type, value, cb) {
    const id = crypto.randomBytes(16).toString('hex');

    this.db.get('timers', (err, timers) => {
      if(err) return cb(err);
      timers.unshift({ id, name, type });
      Promise.all([
        (resolve, reject) => this.db.put('timers', timers, err ? reject(err) : resolve(err)),
        (resolve, reject) => this.db.put(`timer:${id}`, value, err ? reject(err) : resolve(err)),
        (resolve, reject) => this.db.put(`timer:left:${id}`, value, err ? reject(err) : resolve(err)),
      ].map(e => new Promise(e))).then(() => {
        for(const l of this.listeners)
          if(l.timerAdded) l.timerAdded(id, name, type, value);
        return cb(null, id);
      }).catch(cb);
    });
  }

  updateSeats(seats, cb) {
    this.db.put('seats', seats, (err) => {
      if(err) return cb(err);
      for(const l of this.listeners)
        if(l.seatsUpdated) l.seatsUpdated(seats);
    });
  }

  fetchAll(cb) {
    Promise.all([
      (resolve, reject) => this.db.get(`timers`, (err, timers) => {
        if(err) return reject(err);

        for(const timer of timers)
          if(this.runningTimers.has(timer.id)) {
            timer.left = this.timerValues.get(timer.id);
            timer.active = true;
          }

        const promises = timers.map(timer => (resolve, reject) => {
          this.db.get(`timer:${timer.id}`, (err, value) => {
            if(err) return reject(err);

            this.db.get(`timer:left:${timer.id}`, (err, left) => {
              if(err) return reject(err);

              timer.value = value;
              if(!timer.left) timer.left = left; // Respect running timers
              if(!timer.active) timer.active = false;

              return resolve(timer);
            });
          });
        }).map(e => new Promise(e));

        Promise.all(promises).then(resolve).catch(reject);
      }),

      (resolve, reject) => this.db.get('seats', (err, seats) => {
        if(err) return reject(err);
        else return resolve(seats);
      }),
    ].map(e => new Promise(e))).then(([timers, seats]) => {
      cb(null, { timers, seats })
    }).catch(cb);
  }

  addListener(listener) {
    this.listeners.push(listener);
  }
}

module.exports = Conference;
