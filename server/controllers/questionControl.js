/**
 * Process requests from questions page '/question'
 */

const path = require('path');
const libPath = path.join(__dirname, '..', '..', 'lib');
const elasticClient = require(path.join(libPath, 'elasticClient'));
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
const moment = require('moment');
const {parameters} = require(path.join(libPath, 'parameters'));

const client = elasticClient.client;
const indexPrefix = parameters.indexPrefix;
// Get database results that only depend on question id
exports.questionGet = async function (req, res, next) {
  try {
    const questionResults = await Promise.all([
      elasticClient.getDocuments(
        client,
        indexPrefix + 'sepost',
        'sepost',
        [req.params.id],
      ),
      elasticClient.answers(
        client,
        indexPrefix + 'sepost',
        req.params.id,
        {},
      ),
      elasticClient.comments(
        client,
        indexPrefix + 'secomment',
        req.params.id,
        {},
      ),
      elasticClient.links(
        client,
        indexPrefix + 'sepostlink',
        req.params.id,
        {},
      ),
      elasticClient.related(
        client,
        indexPrefix + 'sepostlink',
        req.params.id,
        {},
      ),
    ]);
    const [question, answers, questionComments, linked, related] = questionResults;

    // Get comments on answers
    const answersComments = await Promise.all(
      answers.hits.hits.map((hit) => {
        return elasticClient.comments(
          client,
          indexPrefix + 'secomment',
          hit._source.Id,
          {},
        );
      }));

    // Get linked posts
    const linkedPosts = linked.hits.hits.length
      ? await Promise.all(
        linked.hits.hits.map((hit) => {
          return elasticClient.getDocuments(
            client,
            indexPrefix + 'sepost',
            'sepost',
            [hit._source.RelatedPostId],
          );
        }))
      : [];

    // Process linked posts, removing not found posts
    const linkedPostsValues = [];
    linkedPosts.forEach((post) => {
      if (post.docs[0]._source) {
        linkedPostsValues.push({
          Id: Number(post.docs[0]._id),
          Title: post.docs[0]._source.Title,
        });
      }
    });

    // Get related posts
    const relatedPosts = related.hits.hits.length
      ? await Promise.all(
        related.hits.hits.map((hit) => {
          return elasticClient.getDocuments(
            client,
            indexPrefix + 'sepost',
            'sepost',
            [hit._source.PostId],
          );
        }))
      : [];

    // Process related posts, removing not found posts
    const relatedPostsValues = [];
    relatedPosts.forEach((post) => {
      if (post.docs[0]._source) {
        relatedPostsValues.push({
          Id: Number(post.docs[0]._id),
          Title: post.docs[0]._source.Title,
        });
      }
    });

    // Get user display names for question, answers, and comments
    const userIds = [];
    if (question.docs[0]._source.OwnerUserId) {
      userIds.push(question.docs[0]._source.OwnerUserId);
    }
    answers.hits.hits.forEach((hit) => {
      if (hit._source.OwnerUserId && !userIds.includes(hit._source.OwnerUserId)) {
        userIds.push(hit._source.OwnerUserId);
      }
    });
    questionComments.hits.hits.forEach((hit) => {
      if (hit._source.UserId && !userIds.includes(hit._source.UserId)) {
        userIds.push(hit._source.UserId);
      }
    });
    answersComments.forEach((answerComments) => {
      answerComments.hits.hits.forEach((hit) => {
        if (hit._source.UserId && !userIds.includes(hit._source.UserId)) {
          userIds.push(hit._source.UserId);
        }
      });
    });

    // now get all users
    const users = await elasticClient.getDocuments(
      client,
      indexPrefix + 'seuser',
      'seuser',
      userIds,
    );

    // Map user id to display name for lookup
    const nameMap = new Map();
    users.docs.forEach((user) => {
      if (user._source) {
        nameMap.set(user._source.Id, user._source.DisplayName);
      }
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

    // show the result
    res.render('question', {
      title: 'Stack Caspia question detail',
      question: question.docs[0]._source,
      answers: answers.hits.hits,
      questionComments: questionComments.hits.hits,
      linkedPostsValues,
      relatedPostsValues,
    });
  } catch (err) {
    console.log('Error in questionControl get: ' + err);
    res.render('question', {
      title: 'Stack Caspia question detail',
      errors: [err],
    });
  }
};
