const request = require('superagent');
const { config, header } = require('./config');
const { mockInitData, mockReqData } = require('./util/mockdata');

const fs = require('fs');
let session_id;
try {
  session_id = fs.readFileSync('.sessiondata', { encoding: 'utf8' });
} catch (e) {
  session_id = config.session_id;
}

const SCORE_URL = 'https://mp.weixin.qq.com/wxagame/wxagame_getfriendsscore';
const URL = 'https://mp.weixin.qq.com/wxagame/wxagame_settlement';

/**
 * 请求 getfriendsscore 主要是为了拿到当前游戏次数和当前最高分
 */
function getInfos() {
  const initData = mockInitData(session_id);
  return request
    .post(SCORE_URL)
    .set(header)
    .send(JSON.stringify(initData));
}

/**
 * 提交游戏分数
 */
function sendScore(times) {
  if (!session_id) {
     throw new Error('session_id must not be NULL!!');
  }
  const score = process.argv[2] ? process.argv[2] : config.score;
  const reqData = mockReqData(times, ~~score, session_id);
  const realScore = score ? score : config.score;
  const reqStr = JSON.stringify(reqData);
  const bakFile = `./__test__/${new Date().toISOString().substr(0, 10)}_${realScore}.bak`;
  fs.writeFile(bakFile, reqStr, 'utf8', onErr);
  return request
    .post(URL)
    .set(header)
    .send(reqStr);
}

/**
 * 解析 getInfos 请求
 */
function parseInfos(res) {
  const { my_user_info } = res.body;
  if (my_user_info) {
    // console.info(my_user_info);
    console.log(`当前周最高分: ${my_user_info.week_best_score}`);
    console.log(`当前游戏次数: ${my_user_info.times}`);
    return my_user_info.times + 1;
  }
  console.info('服务器端发现异常');
  throw new Error('oops something went wrong...');
}

/**
 * 解析 sendScore 请求
 */
function parseScoreRes(res) {
  // console.info(res.body);
  if (res.body.base_resp.errcode !== 0) {
    console.log('服务器端发现异常');
    throw new Error('oops something went wrong...');
  }
  console.log('成绩已成功提交至服务器');
}

function start() {
  return check()
    .then(send)
    .then(check);
}

function check() {
  return getInfos()
    .then(parseInfos);
}

function send(times) {
  return sendScore(times)
    .then(parseScoreRes);
}

function onErr(err) {
  err && console.info(err);
}

process.argv[2] === 'c' ? check() : start();
