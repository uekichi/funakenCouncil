'use strict';

const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const Title = require('../models/title');
const Strategy = require('../models/strategy');
const User = require('../models/user');

router.get('/new', authenticationEnsurer, (req, res, next) => {
  res.render('new', {user: req.user});
});

router.get('/:titleId', authenticationEnsurer, (req, res, next) => {
  Title.findOne({
    include: [
      {
        model: User,
        attributes: ['userId', 'username']
      }],
    where: {
      titleId: req.params.titleId
    },
    order: [['"createdAt"', 'DESC']]
  }).then((title) => {
    if (title) {
      Strategy.findAll({
        where: {titleId: title.titleId},
        order: [['"strategyId"', 'ASC']]
      }).then((strategies) => {
        res.render('title', {
          user: res.user, title: title, strategies: strategies, users: [req.user]
        });
      });
    } else {
      const err = new Error('指定したタイトルは見つかりませんでした');
      err.status = 404;
      next(err);
    }
  });
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