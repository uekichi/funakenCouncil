'use strict';

const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const Aruaru = require('../models/aruaru');

router.post('/:titleId/users/:userId/strategies/:strategyId', authenticationEnsurer, (req, res, next) => {
  const titleId = req.params.titleId;
  const userId = req.params.userId;
  const strategyId = req.params.strategyId;
  let aruaru = req.body.aruaru;
  aruaru = aruaru ? parseInt(aruaru) : 0;

  Aruaru.upsert({
    titleId: titleId,
    userId: userId,
    strategyId: strategyId,
    aruaru: aruaru
  }).then(() => {
    res.json({status:'OK', aruaru: aruaru});
  });
});

module.exports = router;