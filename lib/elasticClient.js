/**
 * Elastic Search connector
 */
const elasticsearch = require('elasticsearch');
const limit = require('promise-limit')(100);
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
const typeMappings = require('./typeMappings');
const {parameters} = require('../lib/parameters');

const MAX_READ_LINES = 25;
/**
 * Create an elasticsearch client (new elasticsearch.Client())
 * @see https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html
 *
 * @param {Object} parms to override default values
 * @returns {ElasticClient} the created client 
 */
function makeClient(parms) {
  const defaults = {
    host: parameters.elasticHost,
    log: 'error',
  };
  return new elasticsearch.Client(Object.assign(defaults, parms));
}

/**
 * The default value of client
 * @type {ElasticClient}
 */
const defaultClient = makeClient({});

/**
 * Standard stack exchange file names by index type
 * @type {Object.<ElasticType, string>} = mapping of type to filename
 */
const nameMappings = {
  sepost: 'Posts.xml',
  secomment: 'Comments.xml',
  seuser: 'Users.xml',
  sepostlink: 'PostLinks.xml',
};

/**
 * Create an index in an Elastic Search store with a single type
 *
 * @param {ElasticClient} client
 * @param {ElasticIndex} index - name to create
 * @param {ElasticType} type - of the stored documents
 * @returns {Promise.<{ElasticResponse}>} Resolves to response body
 */
function createIndex(client, index, type) {
  return client.indices.create({
    index,
    body: {
      settings: {
        number_of_shards: 1,
        analysis: {
          filter: {
            english_stop: {
              type: 'stop',
              stopwords: '_english_',
            },
            english_stemmer: {
              type: 'stemmer',
              language: 'english',
            },
            english_possessive_stemmer: {
              type: 'stemmer',
              language: 'possessive_english',
            },
          },
          analyzer: {
            default: {
              tokenizer: 'standard',
              char_filter: ['html_strip'],
              filter: [
                'standard',
                'lowercase',
                'english_possessive_stemmer',
                'english_stop',
                'english_stemmer',
              ],
            },
          },
        },
      },
      mappings: {
        [type]: typeMappings[type],
      },
    },
  });
}

/**
 * deletes an existing index
 * 
 * @param {ElasticClient} client
 * @param {ElasticIndex} index - to delete
 * @returns {ElasticResponse} with property 'acknowledged' === true for success
 */
function deleteIndex(client, name) {
  return client.indices.delete({
    index: name,
  });
}

/**
 * List all indicies on a client.
 *
 * @async
 * @param {ElasticClient} client 
 * @returns {ElasticIndex[]} list of all indicies on the elastic search host 
 */
async function getIndicies(client) {
  const res = await client.indices.get({index: '*'});
  let indicies = [];
  for (const prop in res) {
    indicies.push(prop);
  }
  return indicies;
}

/**
 * Add a document to an index
 * @param {ElasticIndex} index - to index document to
 * @param {ElasticType} type - of document
 * @param {Object} body - Content of the document
 * @return {Promise.<ElasticResponse>} response from the API
 */
function putDocument(client, index, type, body) {
  return limit(() => promisePutDocument(client, index, type, body));
}

function promisePutDocument(client, index, type, body) {
  return new Promise((resolve, reject) => {
    if (!typeMappings[type]) reject(new Error('Unsupported index type: ' + type));
    if (Number.isNaN(body.Id) || body.Id < 0) reject(new Error('Invalid Id: ' + body.Id));

    const timer = setTimeout(() => reject(new Error('putDocument timeout')), parameters.indexTimeout);
    client.index({index: index, type: type, id: body.Id, body: body}, (error, response) => {
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(response);
    });
  });
}

function promiseRefreshIndex(client, index) {
  return new Promise((resolve, reject) => {
    client.indices.refresh({index}, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
}

/**
 * Get document contents from an array of Ids.
 * 
 * @param {ElasticClient} client 
 * @param {ElasticIndex} index 
 * @param {ElasticType} type 
 * @param {string[]} ids 
 * @returns {ElasticResponse} an array of documents, with content in .docs[n]._source
 */
async function getDocuments(client, index, type, ids) {
  return client.mget({
    index,
    type,
    body: { ids },
  });
}

/**
 * Get document contents from a single id.
 *
 * @param {ElasticClient} client
 * @param {ElasticIndex} index
 * @param {ElasticType} type
 * @param {string} id
 * @returns {ElasticResponse}
 */
async function getDocument(client, index, type, id) {
  return client.get({index, type, id});
}

async function getAllDocuments(client, index) {
  return client.search({
    index,
    body: {
      size: 1000,
      query: {
        match_all: {},
      },
    },
  });
}

async function answers(client, index, parentId, params) {
  const defaults = {
    index,
    body: {
      sort: [
        { VoteCount: { order: 'desc' } },
      ],
      query: {
        term: {
          ParentId: parentId,
        },
      },
    },
  };
  return client.search(Object.assign(defaults, params));
}

// This can also be used for links
async function comments(client, index, postId, params) {
  const defaults = {
    index,
    body: {
      query: {
        term: {
          PostId: postId,
        },
      },
    },
  };
  return client.search(Object.assign(defaults, params));
}

async function links(client, index, postId, params) {
  return comments(client, index, postId, params);
}

async function related(client, index, postId, params) {
  const defaults = {
    index,
    body: {
      query: {
        term: {
          RelatedPostId: postId,
        },
      },
    },
  };
  return client.search(Object.assign(defaults, params));
}

function makeQuery(searchString) {
  // tokenize allowing spaces and quotes
  const tokens = searchString.match(/'[^']+'|'[^']+'|\S+/g);
  const query =
    {
      function_score: {
        boost_mode: 'multiply',
        max_boost: 4,
        query: {
          bool: {
            must: [],
            must_not: [
              { range:
                {
                  VoteCount: {
                    lt: 0,
                  },
                },
              },
              { range:
                {
                  Score: {
                    lt: 0,
                  },
                },
              },
            ],
          },
        },
        functions: [
          {
            field_value_factor: {
              field: 'VoteCount',
              modifier: 'log1p',
              missing: 1,
            },
          },
          {
            field_value_factor: {
              field: 'Score',
              modifier: 'log1p',
              missing: 1,
            },
          },
          // prefer questions over answers
          {
            filter: { match: { PostTypeId: 1 } },
            weight: 1.5,
          },
        ],
      },
    };
  tokens.forEach(token => {
    query.function_score.query.bool.must.push({
      multi_match: {
        query: token,
        fields: ['Title', 'Body', 'Tags'],
      },
    });
  });
  //console.log('query is\n' + prettyFormat(query));
  return query;
}

/**
 * 
 * 
 * @param {ElasticClient} client 
 * @param {ElasticIndex} index 
 * @param {string} searchString 
 * @param {Object} params Overide of default search query
 * @returns 
 */
async function search(client, index, searchString, params) {
  const defaults = {
    index,
    body: {
      query: makeQuery(searchString),
      highlight: {
        fields: {
          Tags: {},
          Title: {},
          Body: {},
        },
      },
    },
  };
  //console.log('search query\n', prettyFormat(defaults));
  return client.search(Object.assign(defaults, params));
}

async function explain(client, index, searchString, type, id, params) {
  const defaults = {
    index,
    id,
    type,
    body: {
      query: makeQuery(searchString),
    },
  };
  return client.explain(Object.assign(defaults, params));
}

/**
 * This class is used to consolidate requests to client.exists, because too many
 * single requests seem to be overwhelming Window's ability to handle TCP/IP ports.
 */
const multiNeeded = {
  // Default timeout before sending request (milliseconds)
  TIMEOUT: 1000,
  // Number of id exists requests to batch before sending a request. This is
  // set as a fraction of the active lines so that pausing the input buffer does
  // not result inadequate flow of data to fill a batch here.
  BATCH_COUNT: MAX_READ_LINES / 4,
  // Main object holding pending requests per client
  pendingRequests: new Map(),
  /**
   * Is a particular _id needed in an index?
   * @param {ElasticClient} client
   * @param {ElasticIndex} index
   * @param {ElasticType} type
   * @param {string} id - Is this _id needed in the index?
   * @returns {boolean} - true if id exists
   */
  promiseNeeded: async function (client, indexPrefix, type, id) {
    return new Promise((resolve, reject) => {
      // clientEntry stores all requests for a single client
      let clientEntry = this.pendingRequests.get(client);
      if (!clientEntry) {
        clientEntry = {};
        this.pendingRequests.set(client, clientEntry);
      }
      // Although currently each index only has a single type, that might not be true in the future. So
      // each batch of calls is collected by the concatentation of index name with type name.
      let indexEntry = clientEntry[indexPrefix + type];
      if (!indexEntry) {
        // Start a timeout timer to make sure that this flushes eventually.
        const timer = setTimeout(() => {
          console.log('timeout in multiNeeded for type ' + type + ' Id ' + id);
          this.flushRequests(client, indexPrefix, type);
        }, this.TIMEOUT);
        indexEntry = {indexPrefix, type, idRequests: [], timer};
        clientEntry[indexPrefix + type] = indexEntry;
      }
      indexEntry.idRequests.push({id, resolve, reject});

      // If we have reached the batch size, issue the request.
      if (indexEntry.idRequests.length >= this.BATCH_COUNT) {
        this._issueRequest(client, indexPrefix, type, indexEntry);
      }
    });
  },
  /**
   * Process immediately queued requests
   */
  flushRequests: async function (client, indexPrefix, type) {
    try {
      const clientEntry = this.pendingRequests.get(client);
      const indexEntry = clientEntry ? clientEntry[indexPrefix + type] : null;
      if (!indexEntry) {
        // nothing to do`
        return;
      }
      return this._issueRequest(client, indexPrefix, type, indexEntry);
    } catch (err) {
      console.log('Error in flushRequests: ' + err);
      throw err;
    }
  },
  /**
   * Issue the request for a batch of related ids
   */
  _issueRequest: async function (client, indexPrefix, type, indexEntry) {
    if (this.pendingRequests.get(client)[indexPrefix + type]) {
      delete this.pendingRequests.get(client)[indexPrefix + type];
    } else {
      // This request has already been processed?
      return;
    }
    try {
      clearTimeout(indexEntry.timer);
    } catch (err) {
      console.log('error clearing timeout:' + err);
    }

    // Consolidate any duplicate ids
    const maybeDuplicateIds = indexEntry.idRequests.map(request => request.id);
    const noDuplicateIds = maybeDuplicateIds.filter((element, index, array) => array.indexOf(element) == index);

    // The type of request that we make depends on the type. For 'sepost', we simple need to know
    // if the post exists. For 'seuser', we need to search both sepost as well as secomment to see
    // if the user is used.
    const foundIds = new Set();
    if (type == 'sepost') {
      const request = {
        index: indexPrefix + type,
        type,
        body: {ids: noDuplicateIds},
        _source: false,
      };
      const response = await client.mget(request);

      /* response is:
        Object {
          'docs': Array [
            Object {
              '_id': '1',
              '_index': 'testindex_sepost',
              '_type': 'sepost',
              '_version': 1,
              'found': true,
            },
            ... etc
          ],
        }
      */

      response.docs.forEach((value) => {
        if (value.found) {
          foundIds.add(Number(value._id));
        }
      });
    } else if (type == 'seuser') {
      const postSearch = client.search({
        index: indexPrefix + 'sepost',
        type: 'sepost',
        _source: 'OwnerUserId',
        body: {
          query: {
            terms: {OwnerUserId: noDuplicateIds},
          },
        },
      });
      const commentSearch = client.search({
        index: indexPrefix + 'secomment',
        type: 'secomment',
        _source: 'UserId',
        body: {
          query: {
            terms: {UserId: noDuplicateIds},
            //match_all: {},
          },
        },
      });
      const [postResponses, commentResponses] = await Promise.all([postSearch, commentSearch]);
      /* responses is:
      Array [
        Object {
          ...
          'hits': Object {
            'hits': Array [
              Object {
                ...
                '_source': Object {
                  'OwnerUserId': '21',
                },
                ...,
              },
              ... etc
            ],
          },
        },
        Object {
          ...
          'hits': Object {
            'hits': Array [
              Object {
                ...
                '_source': Object {
                  'UserId': '21',
                },
              },
              ... etc
            ]
          },
        },
      ]
      */
      //console.log('postResponses is\n' + prettyFormat(postResponses));
      //console.log('commentResponses is\n' + prettyFormat(commentResponses));
      postResponses.hits.hits.forEach(hit => foundIds.add(hit._source.OwnerUserId));
      commentResponses.hits.hits.forEach(hit => foundIds.add(hit._source.UserId));
      //foundIds.forEach(id => console.log('found id ' + id));
    } else {
      throw Error('Invalid type ' + type);
    }
    // Issue responses for all saved promises
    indexEntry.idRequests.forEach(request => request.resolve(foundIds.has(request.id)));
  },
};

module.exports = {
  answers,
  client: defaultClient,
  comments,
  createIndex,
  deleteIndex,
  explain,
  getAllDocuments,
  getDocument,
  getDocuments,
  getIndicies,
  links,
  makeClient,
  multiNeeded,
  nameMappings,
  promiseRefreshIndex,
  promisePutDocument,
  putDocument,
  related,
  search,
  typeMappings,
};
