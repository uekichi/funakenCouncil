'use strict';

const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const Title = require('../models/title');
const Strategy = require('../models/strategy');
const User = require('../models/user');
const Aruaru = require('../models/aruaru');
const Comment = require('../models/comment');

router.get('/new', authenticationEnsurer, (req, res, next) => {
  res.render('new', { user: req.user });
});

router.get('/:titleId', authenticationEnsurer, (req, res, next) => {
  let storedTitle = null;
  let storedStrategies = null;
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
      storedTitle = title;
      return Strategy.findAll({
        where: { titleId: title.titleId },
        order: [['"strategyId"', 'ASC']]
      });
    } else {
      const err = new Error('指定された予定は見つかりません');
      err.status = 404;
      next(err);
    }
  }).then((strategies) => {
    //データベースからそのタイトルの全てのあるあるデータを取得する
    storedStrategies = strategies;
    return Aruaru.findAll({
      include: [
        { model: User, attributes: ['userId', 'username'] }
      ],
      where: { titleId: storedTitle.titleId },
      order: [[User, 'username', 'ASC'], ['"strategyId"', 'ASC']]
    });
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
      storedStrategies.forEach((s) => {
        const map = aruaruMapMap.get(u.userId) || new Map();
        const a = map.get(s.strategyId) || 0; //データベースにあるあるがあればaに入れなければデフォルト値0
        map.set(s.strategyId, a);
        aruaruMapMap.set(u.userId, map);  //あるあるを使える状態にした
      });
    });
    // コメント取得
    return Comment.findAll({
      where: { titleId: storedTitle.titleId }
    }).then((comments) => {
      const commentMap = new Map(); //key: userId, value: comment
      comments.forEach((comment) => {
        commentMap.set(comment.userId, comment.comment);
      });
      res.render('title', {
        user: req.user,
        title: storedTitle,
        strategies: storedStrategies,
        users: users,
        aruaruMapMap: aruaruMapMap,
        commentMap: commentMap
      });
    });
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
    createStrategiesAndRedirect(parseStrategyNames(req), titleId, res);
  });
});

router.get('/:titleId/edit', authenticationEnsurer, (req, res, next) => {
  Title.findOne({
    where: {
      titleId: req.params.titleId
    }
  }).then((title) => {
    if (isMine(req, title)) { // 作成者のみが編集フォームを開ける
      Strategy.findAll({
        where: { titleId: title.titleId },
        order: [['"strategyId"', 'ASC']]
      }).then((strategies) => {
        res.render('edit', {
          user: req.user,
          title: title,
          strategies: strategies
        });
      });
    } else {
      const err = new Error('指定されたタイトルがない、または、予定する権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

function isMine(req, title) {
  return title && parseInt(title.createdBy) === parseInt(req.user.id);
}

router.post('/:titleId', authenticationEnsurer, (req, res, next) => {
  Title.findOne({
    where: {
      titleId: req.params.titleId
    }
  }).then((title) => {
    if (title && isMine(req, title)) {
      if (parseInt(req.query.edit) === 1) {
        // 更新日なし
        title.update({
          titleId: title.titleId,
          titleName: req.body.titleName.slice(0, 255),
          memo: req.body.memo,
          createdBy: req.user.id,
        }).then((title) => {
          Strategy.findAll({
            where: { titleId: title.titleId },
            order: [['"strategyId"', 'ASC']]
          }).then((strategies) => {
            // 追加されているかチェック
            const strategyNames = parseStrategyNames(req);
            if (strategyNames) {
              createStrategiesAndRedirect(strategyNames, title.titleId, res);
            } else {
              res.redirect('/titles/' + title.titleId);
            }
          });
        });
      } else　if (parseInt(req.query.delete) === 1) {
        deleteTitleAggregate(req.params.titleId, () => {
          res.redirect('/');
        });
      } else {
        const err = new Error('不正なリクエストです');
        err.status = 400;
        next(err);
      }
    } else {
      const err = new Error('指定されたタイトルがない、または、編集する権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

function createStrategiesAndRedirect(strategyNames, titleId, res) {
  const strategies = strategyNames.map((s) => {
    return {
      strategyName: s,
      titleId: titleId
    };
  });
  Strategy.bulkCreate(strategies).then(() => {
    res.redirect('/titles/' + titleId);
  });
}

function parseStrategyNames(req) {
  return req.body.strategies.trim().split('\n').map((s) => s.trim()).filter((s) => s !== "");
}

function deleteTitleAggregate(titleId, done, err){
  const promiseCommentDestroy = Comment.findAll({
    where: {titleId: titleId}
  }).then((comments) => {
    return Promise.all(comments.map((c) => { return c.destroy(); }));
  });
  Aruaru.findAll({
    where: { titleId: titleId }
  }).then((aruarus) => {
    const promises = aruarus.map((a) => { return a.destroy(); });
    return Promise.all(promises);
  }).then(() => {
    return Strategy.findAll({
        where: { titleId: titleId }
    });
  }).then((strategies) => {
    const promises = strategies.map((c) => { return c.destroy(); });
    promises.push(promiseCommentDestroy);
    return Promise.all(promises);
  }).then(() => {
    return Title.findById(titleId).then((s) => { return s.destroy(); });
  }).then(() => {
    if (err) return done(err);
    done();
  });
}

router.deleteTitleAggregate = deleteTitleAggregate;

module.exports = router;