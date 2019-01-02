'use strict';

var express = require('express');
var router = express.Router();
var Title = require('../models/title');

/* GET home page.  title はデータベースのテーブル名とpugで使う表示があるので混同しないように*/ 
router.get('/', (req, res, next) => {
  const title = '舟券評議会';
  if (req.user) {
    Title.findAll({
      where: {
        createdBy: req.user.id
      },
      order: [['"createdAt"', 'DESC']]
    }).then((titles) => {
      res.render('index', {
        title: title,
        user: req.user,
        titles: titles
      });
    });
  } else {
    res.render('index', {title: title});
  }
});

module.exports = router;
