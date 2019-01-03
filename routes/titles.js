'use strict';

const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const Title = require('../models/title');
const Strategy = require('../models/strategy');
const User = require('../models/user');
const Aruaru = require('../models/aruaru');

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
        //データベースからそのタイトルの全てのあるあるデータを取得する
        Aruaru.findAll({
          include: [
            { model: User, attributes: ['userId', 'username']}
          ],
          where: { titleId: title.titleId },
          order: [[User, 'username', 'ASC'], ['"strategyId"', 'ASC']]
        }).then((aruarus) => {
          //あるあるMapMapを作成　key: userId, value: Map(key: strategyId, value: aruaru)
          const aruaruMapMap = new Map();
          aruarus.forEach((a) => {
            const map = aruaruMapMap.get(a.user.userId) || new Map();
            map.set(a.strategyId, a.aruaru);
            aruaruMapMap.set(a.user.userId, map);
          });

          //閲覧ユーザーと戦略に返信してくれたユーザーから　ユーザーMapを作る　key: userId, value: User
          const userMap = new Map();
          userMap.set(parseInt(req.user.id), {
            isSelf: true,
            userId: parseInt(req.user.id),
            username: req.user.username
          });
          aruarus.forEach((a) => {
            userMap.set(a.user.userId, {
              isSelf: parseInt(req.user.id) === a.user.userId, // 閲覧者===あるあるテーブルのuserId
              userId: a.user.userId,
              username: a.user.username
            });
          });

          // 全ユーザー、全候補で二重ループしてそれぞれの戦略返信がない場合には「？」を設定する
          const users = Array.from(userMap).map((keyValue) => keyValue[1]);
          users.forEach((u) => {
            strategies.forEach((s) => {
              const map = aruaruMapMap.get(u.userId) || new Map();
              const a = map.get(s.strategyId) || 0; //データベースにあるあるがあればaに入れなければデフォルト値0
              map.set(s.strategyId, a);
              aruaruMapMap.set(u.userId, map);  //あるあるを使える状態にした
            });
          });
          
          res.render('title', {
            user: req.user,
            title: title,
            strategies: strategies,
            users: users,
            aruaruMapMap: aruaruMapMap
          });
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