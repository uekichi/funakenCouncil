'use strict';

var express = require('express');
var router = express.Router();
var Title = require('../models/title');
const moment = require('moment-timezone');

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
      //東京時間に変更
      titles.forEach((title) => {
        title.formattedCreatedAt = moment(title.createdAt).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm');
      });
      res.render('index', {
        title: title,
        user: req.user,
        titles: titles
      });
    });
  } else {
    res.render('index', {title: title, user: req.user});
  }
});

module.exports = router;
