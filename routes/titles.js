'use strict';

const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const Title = require('../models/title');
const Strategy = require('../models/strategy');

router.get('/new', authenticationEnsurer, (req, res, next) => {
  res.render('new', {user: req.user});
});

// '/'は URL  titles のこと
router.post('/', authenticationEnsurer, (req, res, next) => {
  const titleId = uuid.v4();
  const createdAt = new Date();
  Title.create({
    titleId: titleId,
    titleName: req.body.titleName.slice(0, 225),
    memo: req.body.memo,
    createdBy: req.user.id,
    createdAt: createdAt
  }).then((title) => {
    const strategyName = req.body.strategies.trim().split('\n').map((s) => s.trim().slice(0, 225)).filter((s) => s !== "");
    const strategies = strategyName.map((s) => {return {
      strategyName: s,
      titleId: title.titleId
    };});
    Strategy.bulkCreate(strategies).then(() => {
      res.redirect('/titles/' + title.titleId);
    });
  });
});

module.exports = router;