const Vue = require('vue/dist/vue.common.js');
const fs = require('fs');

function normalizeInt(val, upper = 60) {
  val = parseInt(val, 10);
  if(Number.isNaN(val)) return 0;
  val = Math.floor(val);
  if(val < 0) val = 0;
  if(val >= upper) val = upper - 1;
  return val;
}

const TimerInput = Vue.extend({
  template: fs.readFileSync(`${__dirname}/timer-input.html`).toString('utf-8'),
  props: {
    value: {
      type: Number,
      validator: val => Number.isInteger(val),
      required: true,
    },
  },

  data: () => ({
    second: null,
    minute: null,
    hour: null,
  }),

  created() {
    this.downsync();
  },

  methods: {
    downsync() {
      let v = this.value;
      this.second = v % 60;
      v = Math.floor(v / 60);
      this.minute = v % 60;
      v = Math.floor(v / 60);
      this.hour = v;
    },

    upsync() {
      const hour = normalizeInt(this.hour, 24);
      this.hour = hour;

      const minute = normalizeInt(this.minute);
      this.minute = minute;

      const second = normalizeInt(this.second);
      this.second = second;

      const value = (hour * 3600)
        + (minute * 60)
        + second;

      if(value !== this.value)
        this.$emit('input', value);
    },
  },

  watch: {
    value() {
      this.downsync();
    },

    hour() {
      this.upsync();
    },

    minute() {
      this.upsync();
    },

    second() {
      this.upsync();
    },
  },
});

module.exports = Vue.component('timer-input', TimerInput);
