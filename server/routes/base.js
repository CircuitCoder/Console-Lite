const express = require('express');
const router = express.Router();

const backend = require('../backend/main');

router.get('/ping', (req, res, next) => {
  return res.send({ authorized: req.consoleAuthorized });
});

router.get('/list', (req, res, next) => {
  return res.send(backend.list);
});

router.post('/create', (req, res, next) => {
  // TODO: TBI
});

module.exports = router;
