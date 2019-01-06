'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const Comment = require('../models/comment');

router.post('/:titleId/users/:userId/comments', authenticationEnsurer, (req, res, next) => {
  const titleId = req.params.titleId;
  const userId = req.params.userId;
  const comment = req.body.comment;

  Comment.upsert({
    titleId: titleId,
    userId: userId,
    comment: comment.slice(0, 225)
  }).then(() => {
    res.json({ status: 'OK', comment: comment });
  });
});

module.exports = router;