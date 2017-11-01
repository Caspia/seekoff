/**
 * Elastic Search connector
 */
const elasticsearch = require('elasticsearch');
const limit = require('promise-limit')(100);
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars

/**
 * Create an elasticsearch client (new elasticsearch.Client())
 * @see https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html
 *
 * @param {Object} parms to override default values
 * @returns {ElasticClient} the created client 
 */
function makeClient(parms) {
  const defaults = {
    host: 'localhost:9200',
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
 * Elastic search mapping for different document types.
 * {ElasticType> key prefixes:
 *   se: Stack Exchange (like Stack Overflow)
 * @type {Object}
 * @property {Object} with all property keys as {ElasticType} strings.
 */
const typeMappings = {
  sepost: {
    properties: {
      Id: {type: 'integer'},
      PostTypeId: {type: 'integer'},
      AcceptedAnswerId: {type: 'integer'},
      ParentId: {type: 'integer'},
      Score: {type: 'integer'},
      ViewCount: {type: 'integer'},
      OwnerUserId: {type: 'integer'},
      LastEditorUserId: {type: 'integer'},
      AnswerCount: {type: 'integer'},
      CommentCount: {type: 'integer'},
      FavoriteCount: {type: 'integer'},
      Body: {type: 'text'},
      Title: {type: 'text'},
      OwnerDisplayName: {type: 'keyword'},
      CreationDate: {type: 'date'},
      DeletionDate: {type: 'date'},
      LastEditDate: {type: 'date'},
      LastActivityDate: {type: 'date'},
      ClosedDate: {type: 'date'},
      CommunityOwnedDate: {type: 'date'},
      Tag: {type: 'keyword'},
    },
  },
  secomment: {
    properties: {
      Id: {type: 'integer'},
      PostId: {type: 'integer'},
      Score: {type: 'integer'},
      UserId: {type: 'integer'},
      Text: {type: 'text'},
      UserDisplayName: {type: 'keyword'},
      CreationDate: {type: 'date'},
    },
  },
  seuser: {
    properties: {
      Id: {type: 'integer'},
      Reputation: {type: 'integer'},
      CreationDate: {type: 'date'},
      LastAccessDate: {type: 'date'},
      DisplayName: {type: 'keyword'},
      WebsiteUrl: {type: 'keyword'},
      Location: {type: 'keyword'},
      ProfileImageUrl: {type: 'keyword'},
      EmailHash: {type: 'keyword'},
      Views: {type: 'integer'},
      UpVotes: {type: 'integer'},
      DownVotes: {type: 'integer'},
      AccountId: {type: 'integer'},
      Age: {type: 'integer'},
      AboutMe: {type: 'text'},
    },
  },
  sepostlink: {
    properties: {
      Id: {type: 'integer'},
      CreationDate: {type: 'date'},
      PostId: {type: 'integer'},
      RelatedPostId: {type: 'integer'},
      LinkTypeId: {type: 'integer'},
    },
  },
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

let documentCount = 0;
let currentType = '';

/**
 * Add a document to an index
 * @param {ElasticIndex} index - to index document to
 * @param {ElasticType} type - of document
 * @param {Object} body - Content of the document
 * @return {Promise.<ElasticResponse>} response from the API
 */
function putDocument(client, index, type, body) {
  return limit(() => new Promise((resolve, reject) => {
    if (type != currentType) {
      currentType = type;
      documentCount = 0;
    }
    if ((documentCount++ % 100) == 0) {
      console.log('Indexing type ' + type + ' Count: ' + (documentCount - 1));
    }
    if (!typeMappings[type]) reject(new Error('Unsupported index type: ' + type));
    if (Number.isNaN(body.Id) || body.Id < 0) reject(new Error('Invalid Id: ' + body.Id));
    client.index({index: index, type: type, id: body.Id, body: body}, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  }));
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

async function answers(client, index, parentId, params) {
  const defaults = {
    index,
    body: {
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
      query: {
        bool: {
          must: [
            {
              query_string: {
                fields: ['Body', 'Title'],
                query: searchString,
              },
            },
          ],
        },
      },
      highlight: {
        fields: {
          Body: {},
          Title: {},
        },
      },
    },
  };
  //console.log('search object:\n' + prettyFormat(Object.assign(defaults, params)));
  return client.search(Object.assign(defaults, params));
}

module.exports = {
  client: defaultClient,
  createIndex,
  deleteIndex,
  makeClient,
  getIndicies,
  putDocument,
  getDocuments,
  search,
  typeMappings,
  answers,
  comments,
  links,
  related,
};
