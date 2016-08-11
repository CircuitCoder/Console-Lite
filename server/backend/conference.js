const crypto = require('crypto');

class Conference {
  constructor(name, db) {
    this.name = name;
    this.db = db;

    this.listeners = [];
    this.runningTimers = new Set();
  }

  setup(cb) {
    this.db.put('timers', {}, cb);
  }

  startTimer(id) {
    this.runningTimers.add(id);
    this.listeners.forEach(e => {
      if(e.timerStarted) e.timerStarted(id);
    });
  }

  stopTimer(id, notify = false) {
    this.runningTimers.delete(id);
    this.listeners.forEach(e => {
      if(e.timerStopped) e.timerStopped(id, notify);
    });
  }

  updateTimer(id, value, cb) {
    // TODO: check: in timers
    this.db.put(`timer:${id}`, value, (err) => {
      if(err) return cb(err);
      else {
        this.listeners.forEach(e => {
          if(e.timerUpdated) e.timerUpdated(id, value);
        });
        return cb(null);
      }
    });
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
      timers[id] = { name, type };
      this.db.put('timers', timers, (err) => {
        if(err) return cb(err);
        this.db.put(`timer:${id}`, value, (err) => {
          if(err) return cb(err);
          else {
            this.listeners.forEach(e => {
              if(e.timerAdded) e.timerAdded(id, name, type, value);
            });
            return cb(null, id);
          }
        });
      });
    });
  }

  listTimer(cb) {
    this.db.get('timers', cb);
  }

  addListener(listener) {
    this.listeners.push(listener);
  }
}

module.exports = Conference;
