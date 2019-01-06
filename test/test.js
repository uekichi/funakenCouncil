'use strict';
const request = require('supertest');
const assert = require('assert');
const app = require('../app');
const passportStub = require('passport-stub');
let User =require('../models/user');
let Title = require('../models/title');
let Strategy = require('../models/strategy');
let Aruaru = require('../models/aruaru');
let Comment = require('../models/comment');

describe('/login', () => {

  before(() => {
    passportStub.install(app);
    passportStub.login({ username: 'testuser'});
  });

  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });
  
  it('ログインのためのリンクが含まれる', (done) => {
    request(app)
    .get('/login')
    .expect('Content-Type', 'text/html; charset=utf-8')
    .expect(/<a href="\/auth\/twitter"/)
    .expect(200, done);
  });

  it('ログイン時はユーザー名が表示される', (done) => {
    request(app)
    .get('/login')
    .expect(/testuser/)
    .expect(200, done);
  });

  it('ログアウト時にルートページにリダイレクトする', (done) => {
    request(app)
    .get('/logout')
    .expect('Location', '/')
    .expect(302, done);
  });

});

describe('/titles', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({id: 711460729061126100, username: 'testuser'});
  });

  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('予定が作成でき、表示される', (done) => {
    User.upsert({userId: 711460729061126100, username: 'testuser'}).then(() => {
      request(app)
      .post('/titles')
      .send({titleName: 'テスト予定１', memo: 'テストメモ１\r\nテストメモ２', strategies: 'テスト候補１\r\nテスト候補２\r\nテスト候補３'})
      .expect('Location', /titles/)
      .expect(302)
      .end((err, res) => {
        const createdTitlePath = res.headers.location;
        const titleId = createdTitlePath.split('/titles/')[1];
        request(app)
        .get(createdTitlePath)
        .expect(/テスト予定１/)
        .expect(/テストメモ１/)
        .expect(/テストメモ２/)
        .expect(/テスト候補１/)
        .expect(/テスト候補２/)
        .expect(/テスト候補３/)
        .expect(200)
        .end((err, res) => { deleteTitleAggregate(titleId, done, err);});
      });
    });
  });
});

describe('/titles/:titleId/users/:userId/strategies/strategyId', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 711460729061126100, username: 'testuser'});
  });

  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('あるあるが更新できる', (done) => {
    User.upsert({ userId: 711460729711460729, username: 'testuser' }).then(() => {
      request(app)
        .post('/titles')
        .send({ titleName: 'テストあるある更新予定1', memo: 'テストあるある更新メモ1', strategies: 'テストあるある戦略'})
        .end((err, res) => {
          const createdTitlePath = res.headers.location;
          const titleId = createdTitlePath.split('/titles/')[1];
          Strategy.findOne({
            where: { titleId: titleId}
          }).then((strategy) => {
            //更新がされることをテスト
            const userId = 711460729711460729;
            request(app)
              .post(`/titles/${titleId}/users/${userId}/strategies/${strategy.strategyId}`)
              .send({aruaru: 2}) // ないないに更新
              .expect('{"status":"OK","aruaru":2}') //空白ダメ
              .end((err, res) => {
                Aruaru.findAll({
                  where: {titleId: titleId}
                }).then((aruarus) => {
                  assert.equal(aruarus.length, 1);
                  assert.equal(aruarus[0].aruaru, 2);
                  deleteTitleAggregate(titleId, done, err);
                });
              });
          });
        });
    });
});

describe('/titles/:titleId/users/:userId/comments', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 711460729061126100, username: 'testuser'});
  });

  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('コメントが更新できる', (done) => {
    User.upsert({ userId: 711460729061126100, username: 'testuser'}).then(() => {
      request(app)
        .post('/titles')
        .send({ titleName: 'テストコメント更新予定1', memo: 'テストコメント更新メモ1', strategies: 'テストコメント更新候補1'})
        .end((err, res) => {
          const createdTitlePath = res.headers.location;
          const titleId = createdTitlePath.split('/titles/')[1];
          //更新されることをテスト
          const userId = 711460729061126100;
          request(app)
            .post(`/titles/${titleId}/users/${userId}/comments`)
            .send({ comment: 'testcomment' })
            .expect('{"status":"OK","comment":"testcomment"}')
            .end((err, res) => {
              Comment.findAll({
                where: { titleId: titleId }
              }).then((comments) => {
                assert.equal(comments.length, 1);
                assert.equal(comments[0].comment, 'testcomment');
                deleteTitleAggregate(titleId, done, err);
              });
            });
          });
        });
    });
});
});

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
    Title.findById(titleId).then((s) => { s.destroy(); });
    if (err) return done(err);
    done();
  });
}
