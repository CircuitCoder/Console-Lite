const crypto = require('crypto');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function _createDir(dir) {
  try {
    if(fs.statSync(dir).isDirectory()) return;
  } catch(e) { }

  const parentDir = path.dirname(dir);
  _createDir(parentDir);
  fs.mkdir(dir);
}

class Conference {
  constructor(name, db, fileRoot) {
    this.name = name;
    this.db = db;
    this.fileRoot = fileRoot;

    _createDir(fileRoot);

    this.listeners = [];
    this.runningTimers = new Map();
    this.timerValues = new Map();

    this.listTotal = new Map();
    this.listCurrent = new Map();

    /* Silently in the background */
    this.db.get('timers', (err, timers) => {
      if(err) {
        if(!err.notFound) console.error(err);
        return;
      }

      for(const t of timers) {
        if(t.type === 'list-total')
          this.listTotal.set(t.name, t.id);
        if(t.type === 'list-current')
          this.listCurrent.set(t.id, t.name);
      }
    });
  }

  setup(cb) {
    Promise.all([
      (resolve, reject) => this.db.put('timers', [], err => err ? reject(err) : resolve()),
      (resolve, reject) => this.db.put('seats', [], err => err ? reject(err) : resolve()),
      (resolve, reject) => this.db.put('files', [], err => err ? reject(err) : resolve()),
      (resolve, reject) => this.db.put('votes', [], err => err ? reject(err) : resolve()),
      (resolve, reject) => this.db.put('lists', [], err => err ? reject(err) : resolve()),
    ].map(e => new Promise(e))).then(() => cb(null)).catch(cb);
  }

  /* Timers */

  _startTimer(id, refkey, cb) {
    if(this.runningTimers.has(id)) return void cb('AlreadyStarted');

    this.runningTimers.set(id, 0); // To block following invokes

    this.db.get(refkey, (err, value) => {
      if(err) {
        this.runningTimers.delete(id);
        return void cb(err);
      }

      if(value === 0) return;

      this.timerValues.set(id, value);
      const intId = setInterval(() => {
        const t = this.timerValues.get(id) - 1;
        assert(t >= 0);
        this.timerValues.set(id, t);

        for(const l of this.listeners)
          if(l.timerTick) l.timerTick(id, t);

        if(t === 0) {
          clearInterval(intId);
          this.stopTimer(id, err => {
            if(err) console.error(err);
          });
        }
      }, 1000);

      this.runningTimers.set(id, intId);

      for(const l of this.listeners)
        if(l.timerStarted) l.timerStarted(id, value);

      if(this.listCurrent.has(id)) { // Never restart list-total timers
        const listId = this.listCurrent.get(id);
        if(this.listTotal.has(listId)) return void this.startTimer(this.listTotal.get(listId), cb);
      }

      cb(null);
    });
  }

  /**
   * You should never start list-total timers
   */
  startTimer(id, cb) {
    return this._startTimer(id, `timer:${id}:left`, cb);
  }

  restartTimer(id, cb) {
    return this._startTimer(id, `timer:${id}`, cb);
  }

  resetTimer(id, cb) {
    const _cb = () => {
      this.db.get(`timer:${id}`, (err, all) => {
        if(err) return void cb(err);

        this.db.put(`timer:${id}:left`, all, err => {
          if(err) return void cb(err);

          for(const l of this.listeners)
            if(l.timerReset) l.timerReset(id, all);

          cb();
        });
      });
    };

    if(this.runningTimers.has(id)) this.stopTimer(id, _cb);
    else _cb();
  }

  /**
   * You should never stop list-total timers
   */
  stopTimer(id, cb) {
    if(!this.runningTimers.has(id)) return void cb('AlreadyStopped');
    const intId = this.runningTimers.get(id);

    // TODO: if stopTimer is called right after startTimer, this.timerValues[id] may be undefined

    this.db.put(`timer:${id}:left`, this.timerValues.get(id), err => {
      if(err) return void cb(err);

      clearInterval(intId);
      this.runningTimers.delete(id);

      for(const l of this.listeners)
        if(l.timerStopped) l.timerStopped(id);

      if(this.listCurrent.has(id)) {
        const listId = this.listCurrent.get(id);
        if(this.listTotal.has(listId))
          return void this.stopTimer(this.listTotal.get(listId), err => {
            if(err === 'AlreadyStopped') return void cb(null);
            else return void cb(err);
          });
      }

      cb(null);
    });
  }

  updateTimer(id, value, cb) {
    if(this.runningTimers.has(id)) return void cb('TimerRunning');

    Promise.all([
      (resolve, reject) => this.db.put(`timer:${id}:left`, value, err => err ? reject(err) : resolve(err)),
      (resolve, reject) => this.db.put(`timer:${id}`, value, err => err ? reject(err) : resolve(err)),
    ].map(e => new Promise(e))).then(() => {
      for(const l of this.listeners)
        if(l.timerUpdated) l.timerUpdated(id, value);
      cb(null);
    }).catch(cb);
  }

  /**
   * Possible values for type:
   * - 'standalone': A standalone timer
   * - 'list-current', 'list-total': A timer for a speaker list,
   *       whose name must be identical to the list's id
   */

  addTimer(name, type, value, cb) {
    const id = crypto.randomBytes(16).toString('hex');

    this.db.get('timers', (err, timers) => {
      if(err) return void cb(err);
      timers.unshift({ id, name, type });
      Promise.all([
        (resolve, reject) => this.db.put('timers', timers, err ? reject(err) : resolve(err)),
        (resolve, reject) => this.db.put(`timer:${id}`, value, err ? reject(err) : resolve(err)),
        (resolve, reject) => this.db.put(`timer:${id}:left`, value, err ? reject(err) : resolve(err)),
      ].map(e => new Promise(e))).then(() => {
        if(type === 'list-current')
          this.listCurrent.set(id, name);
        else if(type === 'list-total')
          this.listTotal.set(name, id);

        for(const l of this.listeners)
          if(l.timerAdded) l.timerAdded(id, name, type, value);
        return void cb(null, id);
      }).catch(cb);
    });
  }

  listTimers() {
    return new Promise((resolve, reject) => this.db.get('timers', (err, timers) => {
      if(err) return void reject(err);

      for(const timer of timers)
        if(this.runningTimers.has(timer.id)) {
          timer.left = this.timerValues.get(timer.id);
          timer.active = true;
        }

      const promises = timers.map(timer => (resolve, reject) => {
        this.db.get(`timer:${timer.id}`, (err, value) => {
          if(err) return void reject(err);

          this.db.get(`timer:${timer.id}:left`, (err, left) => {
            if(err) return void reject(err);

            timer.value = value;
            if(!timer.left) timer.left = left; // Respect running timers
            if(!timer.active) timer.active = false;

            return void resolve(timer);
          });
        });
      }).map(e => new Promise(e));

      Promise.all(promises).then(resolve).catch(reject);
    }));
  }

  /* Seats */

  updateSeats(seats, cb) {
    this.db.put('seats', seats, err => {
      if(err) return void cb(err);
      for(const l of this.listeners)
        if(l.seatsUpdated) l.seatsUpdated(seats);
      return void cb();
    });
  }

  listSeats() {
    return new Promise((resolve, reject) => this.db.get('seats', (err, seats) => {
      if(err) return void reject(err);
      else return void resolve(seats);
    }));
  }

  /* Files */
  // TODO: add cache

  addFile(name, type, content, cb) {
    const id = crypto.randomBytes(16).toString('hex');

    Promise.all([
      (resolve, reject) => {
        this.db.get('files', (err, files) => {
          if(err) return void reject(err);
          files.unshift({ id, name, type });
          this.db.put('files', files, err ? reject(err) : resolve(err));
        });
      },
      (resolve, reject) =>
        fs.writeFile(`${this.fileRoot}/${id}`, content, err => err ? reject(err) : resolve()),
    ].map(e => new Promise(e))).then(() => {
      for(const l of this.listeners)
        if(l.fileAdded) l.fileAdded(id, name, type);
      return void cb(null, id);
    }).catch(err => {
      console.log(err);
      cb(err);
    });
  }

  editFile(id, content, cb) {
    return fs.writeFile(`${this.fileRoot}/${id}`, content, err => {
      if(err) return void cb(err);
      for(const l of this.listeners)
        if(l.fileEdited) l.fileEdited(id);
      return void cb();
    });
  }

  getFile(id, cb) {
    return fs.readFile(`${this.fileRoot}/${id}`, cb);
  }

  listFiles() {
    return new Promise((resolve, reject) => this.db.get('files', (err, files) => {
      if(err) return void reject(err);
      else return void resolve(files);
    }));
  }

  /* Votes */
  /**
   * vote:${id}:matrix -> vote can have the following values:
   * 0: pass / didn't vote
   * -1: abstained
   * -2: negative
   * 1: positive
   *
   * If vote is a substantive vote, target should be -1
   */

  addVote(name, rounds, target, seats, cb) {
    const id = crypto.randomBytes(16).toString('hex');
    const matrix = seats.map(e => ({ name: e, vote: 0 }));

    Promise.all([
      (resolve, reject) => this.db.get('votes', (err, votes) => {
        if(err) return void reject(err);
        votes.unshift({ id, name, target, rounds });
        this.db.put('votes', votes, err => err ? reject(err) : resolve());
      }),
      (resolve, reject) => this.db.put(`vote:${id}:status`, { iteration: 0, running: false }, err => err ? reject(err) : resolve()),
      (resolve, reject) => this.db.put(`vote:${id}:matrix`, matrix, err => err ? reject(err) : resolve()),
    ].map(e => new Promise(e))).then(() => {
      for(const l of this.listeners)
        if(l.voteAdded) l.voteAdded(id, name, rounds, target, seats);
      return void cb(null, id);
    }).catch(cb);
  }

  updateVote(id, index, vote, cb) {
    this.db.get(`vote:${id}:matrix`, (err, matrix) => {
      if(err) return void cb(err);

      matrix[index].vote = vote;
      this.db.put(`vote:${id}:matrix`, matrix, err => {
        if(err) return void cb(err);

        for(const l of this.listeners)
          if(l.voteUpdated) l.voteUpdated(id, index, vote);
        return void cb(null);
      });
    });
  }

  iterateVote(id, status, cb) {
    this.db.put(`vote:${id}:status`, status, err => {
      if(err) return void cb(err);

      for(const l of this.listeners)
        if(l.voteIterated) l.voteIterated(id, status);
      return void cb(null);
    });
  }

  listVotes() {
    return new Promise((resolve, reject) => {
      this.db.get('votes', (err, votes) => {
        if(err) return void reject(err);

        const promises = votes.map(vote => Promise.all([
          new Promise((resolve, reject) => this.db.get(`vote:${vote.id}:status`, (err, status) => err ? reject(err) : resolve(status))),
          new Promise((resolve, reject) => this.db.get(`vote:${vote.id}:matrix`, (err, matrix) => err ? reject(err) : resolve(matrix))),
        ]).then(([status, matrix]) => ({
          id: vote.id,
          name: vote.name,
          rounds: vote.rounds,
          target: vote.target,
          status,
          matrix,
        })));

        Promise.all(promises).then(resolve).catch(reject);
      });
    });
  }

  /* Lists */

  addList(name, seats, cb) {
    const id = crypto.randomBytes(16).toString('hex');

    this.db.get('lists', (err, lists) => {
      if(err) return void cb(err);

      lists.unshift({ name, id });

      Promise.all([
        new Promise((resolve, reject) => this.db.put('lists', lists, err => err ? reject(err) : resolve())),
        new Promise((resolve, reject) => this.db.put(`list:${id}:seats`, seats, err => err ? reject(err) : resolve())),
        new Promise((resolve, reject) => this.db.put(`list:${id}:ptr`, 0, err => err ? reject(err) : resolve())),
      ]).then(() => {
        for(const l of this.listeners)
          if(l.listAdded) l.listAdded(id, name, seats);

        cb(null, id);
      }).catch(cb);
    });
  }

  updateList(id, seats, cb) {
    this.db.put(`list:${id}:seats`, seats, err => {
      if(err) return void cb(err);

      for(const l of this.listeners)
        if(l.listUpdated) l.listUpdated(id, seats);

      cb(null);
    });
  }

  iterateList(id, ptr, cb) {
    this.db.put(`list:${id}:ptr`, ptr, err => {
      if(err) return void cb(err);

      for(const l of this.listeners)
        if(l.listIterated) l.listIterated(id, ptr);

      cb(null);
    });
  }

  listLists() {
    return new Promise((resolve, reject) => this.db.get('lists', (err, lists) => {
      if(err) return void reject(err);
      else resolve(lists);
    })).then(lists =>
      Promise.all(lists.map(list => new Promise((resolve, reject) => Promise.all([
        (resolve, reject) => this.db.get(`list:${list.id}:seats`, (err, seats) => err ? reject(err) : resolve(seats)),
        (resolve, reject) => this.db.get(`list:${list.id}:ptr`, (err, ptr) => err ? reject(err) : resolve(ptr)),
      ].map(e => new Promise(e))).then(([seats, ptr]) => resolve({
        id: list.id,
        name: list.name,
        seats,
        ptr,
      })).catch(reject)))));
  }

  fetchAll(cb) {
    Promise.all([
      this.listTimers(),
      this.listSeats(),
      this.listFiles(),
      this.listVotes(),
      this.listLists(),
    ]).then(([timers, seats, files, votes, lists]) => {
      cb(null, { timers, seats, files, votes, lists });
    }).catch(cb);
  }

  addListener(listener) {
    this.listeners.push(listener);
  }
}

module.exports = Conference;
