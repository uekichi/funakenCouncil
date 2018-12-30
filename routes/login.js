'use strict';

const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  res.render('login', { title: '舟券評議会', user: req.user});
});

module.exports = router;