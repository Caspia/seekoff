/**
 * Process requests from searchs page '/search'
 */

const path = require('path');
const libPath = path.join(__dirname, '..', '..', 'lib');
const elasticClient = require(path.join(libPath, 'elasticClient'));
const prettyjson = require('prettyjson'); // eslint-disable-line no-unused-vars
const moment = require('moment');

const client = elasticClient.client;

exports.questionGet = async function (req, res, next) {
  try {
    console.log('postid term is ' + req.params.id);
    const questionResults = await Promise.all([
      elasticClient.getDocuments(
        client,
        'stackexchange_' + 'sepost',
        'sepost',
        [req.params.id],
      ),
      elasticClient.answers(
        client,
        'stackexchange_' + 'sepost',
        req.params.id,
        {},
      ),
      elasticClient.comments(
        client,
        'stackexchange_' + 'secomment',
        req.params.id,
        {},
      ),
    ]);
    const [question, answers, questionComments] = questionResults;

    // Get comments on answers
    const answersComments = await Promise.all(
      answers.hits.hits.map((hit) => {
        return elasticClient.comments(
          client,
          'stackexchange_' + 'secomment',
          hit._source.Id,
          {},
        );
      }));

    // Get user display names for question, answers, and comments
    const userIds = [];
    userIds.push(question.docs[0]._source.OwnerUserId);
    answers.hits.hits.forEach((hit) => {
      if (!userIds.includes(hit._source.OwnerUserId)) {
        userIds.push(hit._source.OwnerUserId);
      }
    });
    questionComments.hits.hits.forEach((hit) => {
      if (!userIds.includes(hit._source.UserId)) {
        userIds.push(hit._source.UserId);
      }
    });
    answersComments.forEach((answerComments) => {
      answerComments.hits.hits.forEach((hit) => {
        if (!userIds.includes(hit._source.UserId)) {
          userIds.push(hit._source.UserId);
        }
      });
    });

    console.log('userIds is: ' + userIds);
    // now get all users
    const users = await elasticClient.getDocuments(
      client,
      'stackexchange_' + 'seuser',
      'seuser',
      userIds,
    );
    console.log('users:\n' + prettyjson.render(users));

    // Map user id to display name for lookup
    const nameMap = new Map();
    users.docs.forEach((user) => {
      nameMap.set(user._source.Id, user._source.DisplayName);
    });

    // Add DisplayName to questions, answers, and comments.
    question.docs[0]._source.DisplayName = nameMap.get(question.docs[0]._source.OwnerUserId);
    answers.hits.hits.forEach((hit) => {
      hit._source.DisplayName = nameMap.get(hit._source.OwnerUserId);
    });
    questionComments.hits.hits.forEach((hit) => {
      hit._source.DisplayName = nameMap.get(hit._source.UserId);
    });
    answersComments.forEach((answerComments) => {
      answerComments.hits.hits.forEach((hit) => {
        hit._source.DisplayName = nameMap.get(hit._source.UserId);
      });
    });

    // Format dates for display
    question.docs[0]._source.CreatedFormatted =
      moment(question.docs[0]._source.CreationDate).format('LL');
    answers.hits.hits.forEach((hit) => {
      hit._source.CreatedFormatted = moment(hit._source.CreationDate).format('LL');    
    });
    questionComments.hits.hits.forEach((hit) => {
      hit._source.CreatedFormatted = moment(hit._source.CreationDate).format('LL');
    });
    answersComments.forEach((answerComments) => {
      answerComments.hits.hits.forEach((hit) => {
        hit._source.CreatedFormatted = moment(hit._source.CreationDate).format('LL');     
      });
    });

    // move answer comments to the answer
    answers.hits.hits.forEach((hit, index) => {
      hit._source.Comments = answersComments[index].hits.hits;
    });
    console.log('question:\n' + prettyjson.render(question.docs[0]._source));
    console.log('answers:\n' + prettyjson.render(answers));
    console.log('questionComments:\n', prettyjson.render(questionComments));
    // console.log('answersComments:\n' + prettyjson.render(answersComments));
    res.render('question', {
      title: 'Stack Caspia question detail',
      question: question.docs[0]._source,
      answers: answers.hits.hits,
      questionComments: questionComments.hits.hits,
    });
  } catch (err) {
    console.log('Error in searchControl get: ' + err);
    res.render('question', {
      title: 'Stack Caspia question detail',
      errors: [err],
    });
  }
};
